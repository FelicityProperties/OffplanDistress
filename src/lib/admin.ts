import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, inquiries, listings, offers, users } from "@/db/schema";
import { offerCountSql, saleValueSql, watchersSql } from "./listings";

const docFlag = (kind: string) =>
  sql<boolean>`exists(select 1 from ${files} f where f.listing_id = ${listings.id} and f.kind = ${kind})`;

export async function adminStats() {
  const [row] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${listings.status} = 'pending_review')::int`,
      live: sql<number>`count(*) filter (where ${listings.status} = 'live')::int`,
      inTransfer: sql<number>`count(*) filter (where ${listings.status} in ('under_offer', 'noc_in_progress'))::int`,
      pipelineValue: sql<number>`coalesce(sum(${saleValueSql}) filter (where ${listings.status} in ('under_offer', 'noc_in_progress')), 0)::bigint`,
      transferredValue: sql<number>`coalesce(sum(${saleValueSql}) filter (where ${listings.status} = 'transferred'), 0)::bigint`,
      samples: sql<number>`count(*) filter (where ${listings.isSample})::int`,
    })
    .from(listings);
  const [{ openInquiries }] = await db
    .select({ openInquiries: sql<number>`count(*) filter (where not ${inquiries.handled})::int` })
    .from(inquiries);
  const [{ pendingOffers }] = await db
    .select({ pendingOffers: sql<number>`count(*) filter (where ${offers.status} = 'pending')::int` })
    .from(offers);
  return {
    ...row,
    pipelineValue: Number(row.pipelineValue),
    transferredValue: Number(row.transferredValue),
    openInquiries,
    pendingOffers,
  };
}

export async function adminListings(status?: (typeof listings.$inferSelect)["status"]) {
  return db
    .select({
      id: listings.id,
      refNo: listings.refNo,
      status: listings.status,
      verified: listings.verified,
      isSample: listings.isSample,
      projectName: listings.projectName,
      developer: listings.developer,
      community: listings.community,
      developerOther: listings.developerOther,
      communityOther: listings.communityOther,
      unitType: listings.unitType,
      askingPrice: listings.askingPrice,
      originalPrice: listings.originalPrice,
      amountPaid: listings.amountPaid,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      sellerName: users.fullName,
      sellerEmail: users.email,
      sellerPhone: users.phone,
      watchers: watchersSql,
      offers: offerCountSql,
      spa: docFlag("spa"),
      oqood: docFlag("oqood"),
      soa: docFlag("soa"),
      idDoc: docFlag("id"),
      // Entered by our team and still waiting for the seller's own confirmation (it can't be approved until then).
      awaitingSeller: sql<boolean>`(${listings.createdByStaff} and ${listings.ownershipConfirmedAt} is null and not ${listings.isSample})`,
    })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(status ? eq(listings.status, status) : undefined)
    .orderBy(desc(listings.updatedAt));
}

export async function adminListing(id: string) {
  const [row] = await db
    .select({ listing: listings, seller: users, watchers: watchersSql })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(eq(listings.id, id))
    .limit(1);
  return row ?? null;
}

const buyers = alias(users, "buyer");
const sellers = alias(users, "seller");

export async function adminOffers(listingId?: string) {
  return db
    .select({
      id: offers.id,
      amount: offers.amount,
      counterAmount: offers.counterAmount,
      financing: offers.financing,
      message: offers.message,
      status: offers.status,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      listingId: listings.id,
      refNo: listings.refNo,
      projectName: listings.projectName,
      askingPrice: listings.askingPrice,
      buyerName: buyers.fullName,
      buyerEmail: buyers.email,
      buyerPhone: buyers.phone,
      buyerKyc: buyers.kycStatus,
      sellerName: sellers.fullName,
      sellerEmail: sellers.email,
      sellerPhone: sellers.phone,
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .innerJoin(buyers, eq(buyers.id, offers.buyerId))
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(listingId ? eq(offers.listingId, listingId) : undefined)
    .orderBy(desc(offers.updatedAt))
    .limit(500);
}

export async function adminInquiries() {
  return db
    .select({
      inquiry: inquiries,
      refNo: listings.refNo,
      projectName: listings.projectName,
    })
    .from(inquiries)
    .leftJoin(listings, eq(listings.id, inquiries.listingId))
    .orderBy(inquiries.handled, desc(inquiries.createdAt))
    .limit(500);
}

/** The outer query's user id inside a subquery (qualified, so it can't be read as the subquery's own "id"). */
const USER_ID = sql.raw(`"users"."id"`);

/** No password yet, and a real listing: a seller our team added who hasn't claimed it. */
const pendingClaimSql = sql`${users.passwordHash} is null and ${users.role} = 'user' and exists (select 1 from ${listings} l where l.seller_id = ${USER_ID} and not l.is_sample)`;

/**
 * "registered": accounts that can log in. "pending": sellers our team added (staff-assisted intake, src/lib/claim.ts)
 * who haven't set a password through their claim link yet: no password and at least one real listing (the sample
 * seller, which has no password either, owns only samples).
 */
export async function adminUsers(tab: "registered" | "pending" = "registered") {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      intent: users.intent,
      kycStatus: users.kycStatus,
      createdAt: users.createdAt,
      // USER_ID, not ${users.id}: in a select list Drizzle writes the column unqualified ("id"), which inside these
      // subqueries would mean the listing's / offer's own id (the counts were always 0).
      listings: sql<number>`(select count(*)::int from ${listings} l where l.seller_id = ${USER_ID})`,
      offers: sql<number>`(select count(*)::int from ${offers} o where o.buyer_id = ${USER_ID})`,
      // The newest listing still waiting for this seller's confirmation, for the "pending" tab's link.
      pendingListingId: sql<string | null>`(select l.id from ${listings} l where l.seller_id = ${USER_ID} and l.created_by_staff and l.ownership_confirmed_at is null and not l.is_sample order by l.created_at desc limit 1)`,
      pendingListingRef: sql<number | null>`(select l.ref_no from ${listings} l where l.seller_id = ${USER_ID} and l.created_by_staff and l.ownership_confirmed_at is null and not l.is_sample order by l.created_at desc limit 1)`,
    })
    .from(users)
    .where(tab === "pending" ? pendingClaimSql : sql`${users.passwordHash} is not null`)
    .orderBy(desc(users.createdAt))
    .limit(1000);
}

/** How many sellers are in the "pending" tab of /admin/users. */
export async function pendingClaimCount() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(pendingClaimSql);
  return row?.n ?? 0;
}
