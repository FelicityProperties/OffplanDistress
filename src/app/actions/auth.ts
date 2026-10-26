"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sellerLeads, users } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { sourceFromForm } from "@/lib/attribution";
import { clear, clientIp, hit, MINUTE } from "@/lib/throttle";
import {
  createSession,
  destroySession,
  findUserByEmail,
  hashPassword,
  isOwnerEmail,
  safeNext,
  verifyPassword,
} from "@/lib/auth";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
  /** Saved, but the change sends the listing back to our team for review. */
  review?: boolean;
};

type T = TFn<"errors">;

/** Messages for checks that don't carry their own, in the request's language. */
function fallbackErrors(t: T): z.core.$ZodErrorMap {
  return (iss) => {
    if (iss.code === "too_big" && iss.origin === "string") return t("field.tooLong", { max: Number(iss.maximum) });
    return t("field.invalid");
  };
}

const signupSchema = (t: T, ta: TFn<"auth">) =>
  z.object({
    fullName: z.string(t("field.fullName")).trim().min(2, t("field.fullName")),
    email: z.string(t("field.email")).trim().pipe(z.email(t("field.email"))),
    phone: z.string().trim().max(30).optional(),
    password: z.string(t("field.passwordMin")).min(8, t("field.passwordMin")),
    intent: z.enum(["buy", "sell", "both"]),
    // The "I agree to the Terms of Use and Privacy Policy" checkbox; unticked boxes aren't submitted at all.
    acceptTerms: z.literal("on", ta("signup.acceptTerms.error")),
  });

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const [t, ta] = await Promise.all([getT("errors"), getT("auth")]);
  const parsed = signupSchema(t, ta).safeParse(
    {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      password: formData.get("password"),
      intent: formData.get("intent") || "both",
      acceptTerms: formData.get("acceptTerms"),
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { fullName, email, phone, password, intent } = parsed.data;
  if (!(await hit(`signup-ip:${await clientIp()}`, 10, 60 * MINUTE))) return { error: t("tooMany") };

  if (isOwnerEmail(email)) {
    return { fieldErrors: { email: [t("signup.reserved")] } };
  }
  if (await findUserByEmail(email)) {
    return { fieldErrors: { email: [t("signup.exists")] } };
  }

  const [user] = await db
    .insert(users)
    .values({
      fullName,
      email: email.toLowerCase(),
      phone: phone || null,
      passwordHash: await hashPassword(password),
      intent,
      // Notifications and emails go out in the language the account was created in.
      locale: await getLocale(),
      termsAcceptedAt: new Date(),
      source: sourceFromForm(formData),
    })
    .returning({ id: users.id });

  // Signed up from the free estimate's thank-you link: that lead is now this account's (if nobody claimed it yet),
  // and the sell form starts from its numbers.
  const lead = await claimLead(formData.get("lead"), user.id, email);

  await createSession(user.id);
  const fallback = lead ? `/sell?lead=${lead}` : intent === "sell" ? "/sell" : "/dashboard";
  redirect(safeNext(formData.get("next"), fallback));
}

/**
 * The free estimate's thank-you link carries the lead's id through sign-up or log-in. The account takes the lead over
 * only while nobody has claimed it; a malformed id is ignored. Returns the well-formed id (the sell form checks again
 * whose lead it is before using its numbers).
 */
async function claimLead(raw: FormDataEntryValue | null, userId: string, email: string) {
  const lead = z.uuid().safeParse(raw);
  if (!lead.success) return null;
  await db
    .update(sellerLeads)
    .set({ userId, email: sql`coalesce(${sellerLeads.email}, ${email.toLowerCase()})`, updatedAt: new Date() })
    .where(and(eq(sellerLeads.id, lead.data), isNull(sellerLeads.userId)));
  return lead.data;
}

const loginSchema = (t: T) =>
  z.object({
    email: z.string(t("field.email")).trim().pipe(z.email(t("field.email"))),
    password: z.string(t("field.password")).min(1, t("field.password")),
  });

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT("errors");
  const parsed = loginSchema(t).safeParse(
    { email: formData.get("email"), password: formData.get("password") },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  // Throttle before bcrypt: 10 tries per account and 50 per IP every 15 minutes.
  const emailKey = `login:${parsed.data.email.toLowerCase()}`;
  const [okEmail, okIp] = await Promise.all([
    hit(emailKey, 10, 15 * MINUTE),
    hit(`login-ip:${await clientIp()}`, 50, 15 * MINUTE),
  ]);
  if (!okEmail || !okIp) return { error: t("tooMany") };

  const user = await findUserByEmail(parsed.data.email);
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: t("login.invalid") };
  }
  await clear(emailKey);
  // Emails follow the language the user last used on the site.
  const locale = await getLocale();
  if (user.locale !== locale) await db.update(users).set({ locale }).where(eq(users.id, user.id));

  // Logged in from the free estimate's thank-you link (its sign-up page links here): same as signing up, the lead
  // becomes this account's if nobody has claimed it yet.
  const lead = await claimLead(formData.get("lead"), user.id, user.email);

  // Admin rights come from the database only — owners get theirs from scripts/migrate.mjs.
  await createSession(user.id);
  redirect(safeNext(formData.get("next"), lead ? `/sell?lead=${lead}` : user.role === "admin" ? "/admin" : "/dashboard"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
