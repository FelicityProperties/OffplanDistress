"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { and, count, desc, eq, gt, isNull, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listings, passwordResets, sessions, users } from "@/db/schema";
import { dirOf, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { getLocale, getT } from "@/i18n/server";
import { LEGAL_UPDATED } from "@/content/legal/brand";
import { audit } from "@/lib/audit";
import { createSession, findUserByEmail, getCurrentUser, hashPassword, isOwnerEmail, safeNext } from "@/lib/auth";
import { claimPath, findClaim, isPlaceholderEmail, issueClaimToken } from "@/lib/claim";
import { canEmail, sendEmail } from "@/lib/email";
import { refCode } from "@/lib/format";
import { renderTemplate } from "@/lib/notification-templates";
import { notifyAdmins } from "@/lib/notify";
import { clientIp, hit, MINUTE } from "@/lib/throttle";

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

/**
 * Choosing a password here signs the account in, as logging in does (login in src/app/actions/auth.ts): the page's
 * language is remembered (od_locale), so the dashboard, which has one address, opens in the account's email language.
 */
async function rememberLocale(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/** Creates a token and emails the link — silently does nothing when the account can't or shouldn't be reset. */
async function issueReset(email: string) {
  const user = await findUserByEmail(email);
  // Owner passwords are managed by ADMIN_PASSWORD; placeholder (.invalid) accounts can't receive email.
  if (!user || isOwnerEmail(user.email) || user.email.endsWith(".invalid")) return;
  // No password yet: an account our team created. A seller's gets a new claim link instead (below) while one of its
  // staff-created listings still waits for the seller's confirmation; any other (a buyer our team added to a deal file)
  // gets the usual reset link, with which they choose their first password.
  if (!user.passwordHash && user.role !== "user") return;

  const now = Date.now();
  const [recent] = await db
    .select({ n: count() })
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, user.id), gt(passwordResets.createdAt, new Date(now - TOKEN_TTL_MS))));
  if ((recent?.n ?? 0) >= MAX_REQUESTS_PER_HOUR) return;

  // Expired tokens were all created more than an hour ago, so dropping them doesn't affect the rate limit.
  await db.delete(passwordResets).where(and(eq(passwordResets.userId, user.id), lt(passwordResets.expiresAt, new Date(now))));

  const locale = isLocale(user.locale) ? user.locale : "en";
  if (!user.passwordHash) {
    const [pending] = await db
      .select({ id: listings.id, projectName: listings.projectName, refNo: listings.refNo })
      .from(listings)
      .where(
        and(
          eq(listings.sellerId, user.id),
          eq(listings.createdByStaff, true),
          eq(listings.isSample, false),
          isNull(listings.ownershipConfirmedAt),
        ),
      )
      .orderBy(desc(listings.createdAt))
      .limit(1);
    if (pending) {
      const claimToken = await issueClaimToken(user.id, pending.id, { keepOthers: true });
      const claim = renderTemplate("listing.claim", locale, { name: user.fullName, project: pending.projectName, ref: refCode(pending.refNo) });
      await sendEmail({
        to: user.email,
        subject: claim.title,
        heading: claim.title,
        body: claim.body,
        cta: { label: claim.cta, href: claimPath(claimToken, locale) },
        locale,
        dir: dirOf(locale),
      });
      return;
    }
  }

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({ id: sha256(token), userId: user.id, expiresAt: new Date(now + TOKEN_TTL_MS) });

  const msg = renderTemplate("password.reset", locale, {});
  await sendEmail({
    to: user.email,
    subject: msg.title,
    heading: msg.title,
    body: msg.body,
    // In the account's language (/ar/reset-password…, /zh/reset-password…), like the email itself.
    cta: { label: msg.cta, href: localePath(`/reset-password?token=${token}`, locale) },
    locale,
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
  if (!(await hit(`reset-ip:${await clientIp()}`, 10, 60 * MINUTE))) return { error: (await getT("errors"))("tooMany") };

  if (!canEmail(email)) return { ok: true, noEmail: true, email };

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
    .where(
      and(
        eq(passwordResets.id, id),
        // A claim link (src/lib/claim.ts) only works on its own page, which also takes the ownership confirmation.
        eq(passwordResets.purpose, "reset"),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row || isOwnerEmail(row.email)) return { error: t("errors.invalidToken"), invalidToken: true };

  // Claim the token atomically so a double submit (or a leaked link) can only be used once.
  const [claimed] = await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.id, id), isNull(passwordResets.usedAt)))
    .returning({ id: passwordResets.id });
  if (!claimed) return { error: t("errors.invalidToken"), invalidToken: true };

  // Emails follow the language of the page the password was chosen on, as after a log-in.
  const locale = await getLocale();
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), locale }).where(eq(users.id, row.userId));
  // Other reset links go; a claim link our team sent stays (it now asks the seller to log in before confirming).
  await db
    .delete(passwordResets)
    .where(and(eq(passwordResets.userId, row.userId), ne(passwordResets.id, id), eq(passwordResets.purpose, "reset")));
  // Sign out everywhere (including whoever may have the old password), then sign this browser in.
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  await createSession(row.userId);
  await rememberLocale(locale);
  redirect(localePath(safeNext(formData.get("next"), "/dashboard"), locale));
}

/**
 * The claim link our team sends a seller whose listing they entered (src/lib/claim.ts): the seller confirms they own
 * the unit or may sell it, the documents are genuine and they accept the Terms (as on the sell form's last step).
 * - Account without a password (created by our team): the seller also chooses their login email and a password, and is
 *   signed in. The password is only ever set while the account has none, so a link can't replace an existing one.
 * - Account with a password: nothing about the account changes; only its owner, signed in, can confirm.
 * The token works once and for 7 days.
 */
export async function claimListing(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const [t, ts] = await Promise.all([getT("password"), getT("sell")]);
  // Before the token lookup and bcrypt: per IP, as generous as the log-in form's (a seller fixing a field submits a few
  // times; several people can share one mobile network's address).
  if (!(await hit(`claim-ip:${await clientIp()}`, 50, 15 * MINUTE))) return { error: (await getT("errors"))("tooMany") };
  const token = formData.get("token");
  const claim = typeof token === "string" ? await findClaim(token) : null;
  if (!claim || claim.role !== "user" || isOwnerEmail(claim.email) || claim.ownershipConfirmedAt) {
    return { error: t("claim.invalidBody"), invalidToken: true };
  }
  const confirmed = formData.get("confirmOwnership") === "on";
  // A new account's confirmation also covers the Privacy Policy (ClaimForm), so its message names it too.
  const ownershipError = confirmed
    ? {}
    : { confirmOwnership: [claim.hasPassword ? ts("error.confirmOwnership") : t("claim.errors.confirmNew")] };

  if (claim.hasPassword) {
    const me = await getCurrentUser();
    if (me?.id !== claim.userId) return { error: t("claim.errors.signIn") };
    if (!confirmed) return { error: ts("error.confirmOwnership"), fieldErrors: ownershipError };
    if (!(await spendClaimToken(claim.tokenId))) return { error: t("claim.invalidBody"), invalidToken: true };
    await confirmOwnership(claim);
    redirect(`/dashboard/listings/${claim.listingId}`);
  }

  const parsed = z
    .object({
      email: z.string().trim().max(200).pipe(z.email(t("errors.email"))),
      password: z.string().min(8, t("errors.passwordMin")),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, { message: t("errors.mismatch"), path: ["confirm"] })
    .safeParse({ email: formData.get("email") ?? "", password: formData.get("password") ?? "", confirm: formData.get("confirm") ?? "" });
  if (!parsed.success || !confirmed) {
    const fieldErrors = { ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors), ...ownershipError };
    return { fieldErrors };
  }
  const email = parsed.data.email.toLowerCase();
  if (isOwnerEmail(email) || isPlaceholderEmail(email)) return { fieldErrors: { email: [t("claim.errors.emailReserved")] } };
  const other = email === claim.email.toLowerCase() ? null : await findUserByEmail(email);
  if (other && other.id !== claim.userId) return { fieldErrors: { email: [t("claim.errors.emailTaken")] } };

  const passwordHash = await hashPassword(parsed.data.password);
  let updated: { id: string } | undefined;
  try {
    // Only while the account still has no password: this is what makes the link unable to take over an account (and
    // a double submit set it twice). The token is spent only once this has worked.
    [updated] = await db
      .update(users)
      .set({
        passwordHash,
        email,
        termsAcceptedAt: sql`coalesce(${users.termsAcceptedAt}, now())`,
        // Emails go out in the language the seller confirmed in.
        locale: await getLocale(),
      })
      .where(and(eq(users.id, claim.userId), isNull(users.passwordHash)))
      .returning({ id: users.id });
  } catch {
    // The email was taken by a sign-up in the meantime (unique index on lower(email)).
    return { fieldErrors: { email: [t("claim.errors.emailTaken")] } };
  }
  if (!updated || !(await spendClaimToken(claim.tokenId))) return { error: t("claim.invalidBody"), invalidToken: true };
  await confirmOwnership(claim);
  await db.delete(sessions).where(eq(sessions.userId, claim.userId));
  await createSession(claim.userId);
  await rememberLocale(await getLocale());
  redirect(`/dashboard/listings/${claim.listingId}`);
}

/** Marks a claim token used, atomically: false if it was used (or replaced) in the meantime. */
async function spendClaimToken(tokenId: string) {
  const [row] = await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.id, tokenId), eq(passwordResets.purpose, "claim"), isNull(passwordResets.usedAt)))
    .returning({ id: passwordResets.id });
  return Boolean(row);
}

/** The seller's confirmation on the listing (and the Terms on their account), then a heads-up to our team. */
async function confirmOwnership(claim: NonNullable<Awaited<ReturnType<typeof findClaim>>>) {
  const now = new Date();
  const confirmed = await db
    .update(listings)
    // The Terms version the seller agreed to with this confirmation (LEGAL_UPDATED), as on the sell form.
    .set({ ownershipConfirmedAt: now, termsVersion: LEGAL_UPDATED, updatedAt: now })
    .where(and(eq(listings.id, claim.listingId), eq(listings.sellerId, claim.userId), isNull(listings.ownershipConfirmedAt)))
    .returning({ id: listings.id });
  // The seller's own confirmation of their authority to sell, in the audit trail (src/lib/audit.ts): the record a
  // dispute over that authority needs. Never the token, the email or the password.
  if (confirmed.length) {
    await audit({
      actorId: claim.userId,
      action: "listing.claimed",
      entityType: "listing",
      entityId: claim.listingId,
      diff: { ownershipConfirmedAt: [null, now], termsVersion: [null, LEGAL_UPDATED], newAccount: !claim.hasPassword },
    });
  }
  await db
    .update(users)
    .set({
      // terms_accepted_at says when terms_version was agreed to: an agreement to a newer version is dated now, never
      // with the older sign-up date (which would pair a version with a day before it existed).
      termsAcceptedAt: sql`case when ${users.termsVersion} is not distinct from ${LEGAL_UPDATED}::text then coalesce(${users.termsAcceptedAt}, now()) else now() end`,
      termsVersion: LEGAL_UPDATED,
    })
    .where(eq(users.id, claim.userId));
  await notifyAdmins(
    "listing.claimed",
    { project: claim.projectName, seller: claim.fullName, ref: refCode(claim.refNo) },
    `/admin/listings/${claim.listingId}`,
  );
}
