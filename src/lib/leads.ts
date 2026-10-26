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

/**
 * The numbers a signed-in seller brings from their estimate into the sell form. Only their own lead, or one nobody
 * has claimed yet (they followed the thank-you link and logged in rather than signed up); the id is an unguessable
 * UUID that only the person who sent the estimate was given. Contact details are not returned.
 */
export async function leadForSeller(leadId: string, userId: string) {
  // A strict UUID: anything else would make Postgres throw (a mangled link must not break /sell).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) return null;
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
