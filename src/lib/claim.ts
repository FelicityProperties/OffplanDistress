import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings, passwordResets, users } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";

// Staff-assisted intake: our team enters a listing from the documents a seller sent (often on WhatsApp), then sends the
// seller a claim link. Opening it (no login needed) the seller confirms they own the unit or may sell it, the documents
// are genuine and they accept the Terms, and chooses a password; only then can the listing be approved. The link is a
// password_resets row with purpose "claim": the raw token exists only in the link, the table holds its sha256; it works
// once and for 7 days. An account that already has a password is never taken over: its seller logs in to confirm.

export const CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const CLAIM_TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Login address for a seller our team added with only a phone number. `.invalid` addresses never receive email (see
 * src/lib/notify.ts); the seller chooses their real address when they claim the listing.
 */
export function placeholderEmail(phoneDigits: string) {
  return `wa-${phoneDigits}-${randomBytes(3).toString("hex")}@claim.offplandistress.invalid`;
}

export function isPlaceholderEmail(email: string) {
  return email.trim().toLowerCase().endsWith(".invalid");
}

/**
 * The claim link's path for a raw token (opened on this site; emails add the site's address). With the seller's
 * language, the link opens in it (/ar/reset-password… for Arabic) whatever the phone's settings; without one (a login
 * redirect's ?next=) it is the plain path, which the login turns into the page's language.
 */
export function claimPath(token: string, locale?: Locale) {
  const path = `/reset-password?claim=1&token=${token}`;
  return locale ? localePath(path, locale) : path;
}

/**
 * A new claim link for one listing. Earlier unused links for the same listing stop working (unless `keepOthers`: a
 * forgot-password request mustn't cancel the link our team sent), so only the latest one sent is live. Returns the raw
 * token: it is shown to the admin once (or emailed) and never stored or logged.
 */
export async function issueClaimToken(userId: string, listingId: string, { keepOthers = false } = {}) {
  if (!keepOthers) {
    await db
      .delete(passwordResets)
      .where(and(eq(passwordResets.listingId, listingId), eq(passwordResets.purpose, "claim"), isNull(passwordResets.usedAt)));
  }
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({
    id: tokenHash(token),
    userId,
    listingId,
    purpose: "claim",
    expiresAt: new Date(Date.now() + CLAIM_TTL_MS),
  });
  return token;
}

/** The unused, unexpired claim behind a raw token, with what the claim page shows; null otherwise. */
export async function findClaim(token: string) {
  if (!CLAIM_TOKEN_RE.test(token)) return null;
  const [row] = await db
    .select({
      tokenId: passwordResets.id,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      // Whether the account can already log in: such an account is never given a new password through a claim link.
      hasPassword: sql<boolean>`${users.passwordHash} is not null`,
      termsAcceptedAt: users.termsAcceptedAt,
      // The language our team chose for this seller (the claim message went out in it), offered on the claim page.
      locale: users.locale,
      listingId: listings.id,
      refNo: listings.refNo,
      projectName: listings.projectName,
      developer: listings.developer,
      developerOther: listings.developerOther,
      community: listings.community,
      communityOther: listings.communityOther,
      unitType: listings.unitType,
      sizeSqft: listings.sizeSqft,
      askingPrice: listings.askingPrice,
      // The figures buyers will see, so the seller confirms what our team entered (as on the sell form's review step).
      originalPrice: listings.originalPrice,
      amountPaid: listings.amountPaid,
      handoverDate: listings.handoverDate,
      createdByStaff: listings.createdByStaff,
      ownershipConfirmedAt: listings.ownershipConfirmedAt,
    })
    .from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .innerJoin(listings, eq(listings.id, passwordResets.listingId))
    .where(
      and(
        eq(passwordResets.id, tokenHash(token)),
        eq(passwordResets.purpose, "claim"),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
        // The listing must still be this account's.
        eq(listings.sellerId, passwordResets.userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type Claim = NonNullable<Awaited<ReturnType<typeof findClaim>>>;
