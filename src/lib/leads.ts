import "server-only";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings, sellerLeads, users } from "@/db/schema";

/**
 * A typed mobile number as wa.me wants it (country code, digits only). UAE numbers typed locally ("050 123 4567",
 * "50 123 4567") get 971; "00" prefixes are dropped. Null when it can't be a phone number.
 */
export function whatsappNumber(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (/^05\d{8}$/.test(d)) d = `971${d.slice(1)}`;
  else if (/^5\d{8}$/.test(d)) d = `971${d}`;
  // "+971 (0)50 123 4567": the local 0 kept after the country code (no UAE number starts with 0 after 971).
  if (d.startsWith("9710")) d = `971${d.slice(4)}`;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

/** Default notice, or more than one missed instalment: these sellers are called first. */
export const urgentLeadSql = sql<boolean>`(${sellerLeads.defaultNotice} or ${sellerLeads.missed} = 'more')`;

export async function leadStats() {
  const [row] = await db
    .select({
      newLeads: sql<number>`count(*) filter (where ${sellerLeads.status} = 'new')::int`,
      urgentNew: sql<number>`count(*) filter (where ${sellerLeads.status} = 'new' and ${urgentLeadSql})::int`,
    })
    .from(sellerLeads);
  return row;
}

/** Admin list: new ones first, urgent ones on top, then newest. */
export async function adminLeads() {
  return db
    .select({
      lead: sellerLeads,
      urgent: urgentLeadSql,
      userName: users.fullName,
      listingRef: listings.refNo,
    })
    .from(sellerLeads)
    .leftJoin(users, eq(users.id, sellerLeads.userId))
    .leftJoin(listings, eq(listings.id, sellerLeads.listingId))
    .orderBy(sql`${sellerLeads.status} = 'new' desc`, desc(urgentLeadSql), desc(sellerLeads.createdAt))
    .limit(500);
}

/** A strict UUID: anything else would make Postgres throw (a mangled link must not break a page). */
function isLeadId(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * The estimate lead the sign-up and log-in pages carry on (from the thank-you link): `?lead=`, or the lead in a
 * `?next=/sell?lead=…` target. Undefined unless it is a well-formed id.
 */
export function leadFromAuthParams(lead: unknown, next: unknown) {
  if (isLeadId(lead)) return lead;
  if (typeof next !== "string" || !next.startsWith("/sell?")) return undefined;
  const fromNext = new URLSearchParams(next.slice("/sell?".length)).get("lead");
  return isLeadId(fromNext) ? fromNext : undefined;
}

/** Link between the sign-up and log-in pages that keeps where to go next and the estimate's lead. */
export function authHref(path: "/login" | "/signup", next: string, lead?: string) {
  const q = new URLSearchParams();
  if (next) q.set("next", next);
  if (lead) {
    if (path === "/signup") q.set("intent", "sell");
    q.set("lead", lead);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * The numbers a signed-in seller brings from their estimate into the sell form. Only their own lead, or one nobody
 * has claimed yet (they followed the thank-you link and logged in rather than signed up); the id is an unguessable
 * UUID that only the person who sent the estimate was given. Contact details are not returned.
 */
export async function leadForSeller(leadId: string, userId: string) {
  if (!isLeadId(leadId)) return null;
  const [row] = await db
    .select({
      id: sellerLeads.id,
      developer: sellerLeads.developer,
      project: sellerLeads.project,
      spaPrice: sellerLeads.spaPrice,
      amountPaid: sellerLeads.amountPaid,
      handoverQuarter: sellerLeads.handoverQuarter,
      missed: sellerLeads.missed,
    })
    .from(sellerLeads)
    .where(
      and(
        eq(sellerLeads.id, leadId),
        isNull(sellerLeads.listingId),
        or(eq(sellerLeads.userId, userId), isNull(sellerLeads.userId)),
      ),
    )
    .limit(1);
  return row ?? null;
}
