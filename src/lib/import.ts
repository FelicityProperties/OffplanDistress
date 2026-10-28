import "server-only";
import { sql } from "drizzle-orm";

// Listings imported from a partner network's file (/admin/listings/import, src/lib/import-format.ts) are filed under one
// placeholder owner account per network until our team enters the real owner (adminSetListingOwner): no password, so
// nobody can sign in to it, and a `.invalid` address, so it never receives email (src/lib/notify.ts, password resets).
// While filed there, a listing has its own tab on /admin and is left out of the review backlog and the follow-ups
// (src/lib/reminders.ts); it can't get a claim link or be approved (its ownership isn't confirmed) — unless the account
// owner publishes the whole import at once on their attestation (adminPublishAttested, src/lib/attestation.ts), after
// which it is live and still under the placeholder until the real owner is entered.

/** The placeholder owner's address for a network's key (IMPORT_KEY_RE). */
export const importOwnerEmail = (key: string) => `owner-pending.${key}@offplandistress.invalid`;
/** The account's English name, e.g. "Owner to be added (DistressStock)"; admin pages show it in their language. */
export const importOwnerName = (sourceName: string) => `Owner to be added (${sourceName})`;

const OWNER_EMAIL_RE = /^owner-pending\.[a-z0-9-]+@offplandistress\.invalid$/i;

/** An import's placeholder owner (its address, and no password: never an account someone registered). */
export function isImportOwner(u: { email: string; passwordHash: string | null }) {
  return OWNER_EMAIL_RE.test(u.email.trim()) && u.passwordHash == null;
}

/**
 * SQL, true while the outer query's listing ("listings", unaliased) is filed under an import's placeholder owner:
 * imported, with no real owner entered yet.
 */
export const awaitingOwnerSql = sql<boolean>`exists (select 1 from users po where po.id = "listings"."seller_id" and lower(po.email) like 'owner-pending.%@offplandistress.invalid' and po.password_hash is null)`;
