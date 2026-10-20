"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { and, count, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { dirOf, isLocale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { createSession, findUserByEmail, hashPassword, isOwnerEmail, safeNext } from "@/lib/auth";
import { emailEnabled, sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/notification-templates";

export type PasswordFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
  /** Echo of the address the request was made for (never says whether an account exists). */
  email?: string;
  /** Email delivery isn't configured, so the visitor should contact the team instead. */
  noEmail?: boolean;
  /** The reset token was missing, used or expired — show a "request a new link" path. */
  invalidToken?: boolean;
};

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

function sha256(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a token and emails the link — silently does nothing when the account can't or shouldn't be reset. */
async function issueReset(email: string) {
  const user = await findUserByEmail(email);
  // Owner passwords are managed by ADMIN_PASSWORD; placeholder (.invalid) accounts can't receive email.
  if (!user?.passwordHash || isOwnerEmail(user.email) || user.email.endsWith(".invalid")) return;

  const now = Date.now();
  const [recent] = await db
    .select({ n: count() })
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, user.id), gt(passwordResets.createdAt, new Date(now - TOKEN_TTL_MS))));
  if ((recent?.n ?? 0) >= MAX_REQUESTS_PER_HOUR) return;

  // Expired tokens were all created more than an hour ago, so dropping them doesn't affect the rate limit.
  await db.delete(passwordResets).where(and(eq(passwordResets.userId, user.id), lt(passwordResets.expiresAt, new Date(now))));

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({ id: sha256(token), userId: user.id, expiresAt: new Date(now + TOKEN_TTL_MS) });

  const locale = isLocale(user.locale) ? user.locale : "en";
  const msg = renderTemplate("password.reset", locale, {});
  await sendEmail({
    to: user.email,
    subject: msg.title,
    heading: msg.title,
    body: msg.body,
    cta: { label: msg.cta, href: `/reset-password?token=${token}` },
    dir: dirOf(locale),
  });
}

export async function requestPasswordReset(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const t = await getT("password");
  const parsed = z
    .object({ email: z.string().trim().pipe(z.email(t("errors.email"))) })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email } = parsed.data;

  if (!emailEnabled()) return { ok: true, noEmail: true, email };

  // The lookup, token and email run after the response, so the reply is identical — content and
  // timing — whether or not an account exists for this address.
  after(async () => {
    try {
      await issueReset(email);
    } catch (err) {
      console.error("[password] reset request failed", err);
    }
  });
  return { ok: true, email };
}

export async function resetPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const t = await getT("password");
  const token = formData.get("token");
  if (typeof token !== "string" || !TOKEN_RE.test(token)) {
    return { error: t("errors.invalidToken"), invalidToken: true };
  }

  const parsed = z
    .object({
      password: z.string().min(8, t("errors.passwordMin")),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, { message: t("errors.mismatch"), path: ["confirm"] })
    .safeParse({ password: formData.get("password") ?? "", confirm: formData.get("confirm") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const id = sha256(token);
  const [row] = await db
    .select({ userId: passwordResets.userId, email: users.email })
    .from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .where(and(eq(passwordResets.id, id), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .limit(1);
  if (!row || isOwnerEmail(row.email)) return { error: t("errors.invalidToken"), invalidToken: true };

  // Claim the token atomically so a double submit (or a leaked link) can only be used once.
  const [claimed] = await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.id, id), isNull(passwordResets.usedAt)))
    .returning({ id: passwordResets.id });
  if (!claimed) return { error: t("errors.invalidToken"), invalidToken: true };

  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, row.userId));
  await db.delete(passwordResets).where(and(eq(passwordResets.userId, row.userId), ne(passwordResets.id, id)));
  // Sign out everywhere (including whoever may have the old password), then sign this browser in.
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  await createSession(row.userId);
  redirect(safeNext(formData.get("next"), "/dashboard"));
}
