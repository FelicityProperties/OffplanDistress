import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, files, inquiries, listings, offers, users } from "@/db/schema";
import { awaitingOwnerSql } from "./import";
import { offerCountSql, saleValueSql, watchersSql } from "./listings";

const docFlag = (kind: string) =>
  sql<boolean>`exists(select 1 from ${files} f where f.listing_id = ${listings.id} and f.kind = ${kind})`;

/**
 * What a deal is worth for our fee: the sale value in its deal file (agreed price + balance owed to the developer,
 * src/lib/deals.ts); for a deal whose file has none yet, the accepted offer + that balance; the asking price only when
 * neither exists (a status set by hand before deal files).
 */
const LISTING_ID = sql.raw(`"listings"."id"`); // qualified: inside the subqueries "id" would be their own row's
// A sale value only counts with the agreed price it was worked out from (a file opened for a status set by hand,
// before the fix in insertMissingDeals, could hold the integer limit instead of nothing).
const dealValueSql = sql<number>`coalesce(
  (select d.sale_value from deals d where d.listing_id = ${LISTING_ID} and d.cancelled_at is null and d.sale_value is not null
     and d.agreed_price is not null limit 1),
  (select o.amount::bigint from offers o where o.listing_id = ${LISTING_ID} and o.status = 'accepted' order by o.updated_at desc limit 1)
    + greatest(${listings.originalPrice} - ${listings.amountPaid}, 0),
  ${saleValueSql})`;
/**
 * Our share of the fee on that deal, in percent: 100 less the co-broker's share recorded in its open deal file (Form
 * I), as the deal file's "Our share after the co-broker's …%". Our fee is a flat rate, so weighting each deal's value
 * by it before the sum gives our share of the fees (to the dirham's rounding).
 */
const ourSharePctSql = sql<number>`(100 - coalesce(
  (select d.cobroker_split_pct from deals d where d.listing_id = ${LISTING_ID} and d.cancelled_at is null limit 1), 0))`;
const ourValueSql = sql<number>`(${dealValueSql}::bigint * ${ourSharePctSql} / 100.0)`;

export async function adminStats() {
  const [row] = await db
    .select({
      // Imported listings still under their network's placeholder owner are counted apart (their own tab on /admin):
      // nobody can review them before their owner is entered.
      pending: sql<number>`count(*) filter (where ${listings.status} = 'pending_review' and not ${awaitingOwnerSql})::int`,
      importedAwaitingOwner: sql<number>`count(*) filter (where ${listings.status} = 'pending_review' and ${awaitingOwnerSql})::int`,
      live: sql<number>`count(*) filter (where ${listings.status} = 'live')::int`,
      // Real deals only, as the fees shown with it (a sample under offer isn't a deal).
      inTransfer: sql<number>`count(*) filter (where ${listings.status} in ('under_offer', 'noc_in_progress') and not ${listings.isSample})::int`,
      // Fees are counted on agreed prices, never on samples (they aren't deals), and only our share of them when a
      // co-broker takes part (the deal values are weighted by it, see ourValueSql).
      pipelineValue: sql<number>`coalesce(round(sum(${ourValueSql}) filter (where ${listings.status} in ('under_offer', 'noc_in_progress') and not ${listings.isSample})), 0)::bigint`,
      // Sold units, also once taken down after the transfer (withdrawn, with their completed deal file still open).
      transferredValue: sql<number>`coalesce(round(sum(${ourValueSql}) filter (where (${listings.status} = 'transferred' or (${listings.status} = 'withdrawn'
        and exists (select 1 from deals d where d.listing_id = ${LISTING_ID} and d.cancelled_at is null and d.transferred_at is not null)))
        and not ${listings.isSample})), 0)::bigint`,
      samples: sql<number>`count(*) filter (where ${listings.isSample})::int`,
    })
    .from(listings);
  // The sidebar badge: what still needs an answer; messages caught as spam (src/lib/spam.ts) never count.
  const [{ openInquiries }] = await db
    .select({ openInquiries: sql<number>`count(*) filter (where not ${inquiries.handled} and not ${inquiries.spam})::int` })
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
      // Imported and still filed under the network's placeholder owner (src/lib/import.ts); `source` says from where.
      awaitingOwner: awaitingOwnerSql,
      source: listings.source,
      // The seller's own text, checked for contact details (src/lib/typed-names.ts contactKinds) beside "Approve".
      description: listings.description,
      view: listings.view,
      floor: listings.floor,
    })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(status ? eq(listings.status, status) : undefined)
    .orderBy(desc(listings.updatedAt));
}

/**
 * Listings published on the account owner's attestation (adminPublishAttested) and still filed under their import's
 * placeholder owner (src/lib/import.ts): out of review, with the real owner still to enter from the Owner card. Listed
 * on the Imported tab of /admin so they aren't lost once they leave it.
 */
export async function publishedAwaitingOwner() {
  return db
    .select({ id: listings.id, refNo: listings.refNo, projectName: listings.projectName, status: listings.status })
    .from(listings)
    .where(and(awaitingOwnerSql, notInArray(listings.status, ["pending_review", "rejected", "withdrawn"])))
    .orderBy(listings.refNo);
}

/** Whether ownership of a listing our team entered was confirmed from the owner's signed Form A (adminConfirmFormA). */
export async function confirmedByFormA(listingId: string) {
  return confirmedByAction(listingId, "listing.form_a_confirmed");
}

/** Ownership confirmed on our team's record of the owner's written authority (partner stock published from a file). */
export async function confirmedByBroker(listingId: string) {
  return confirmedByAction(listingId, "listing.ownership_confirmed");
}

async function confirmedByAction(listingId: string, action: string) {
  const [row] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(and(eq(auditEvents.entityType, "listing"), eq(auditEvents.entityId, listingId), eq(auditEvents.action, action)))
    .limit(1);
  return Boolean(row);
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

/** The inbox (open ones first) or, for the Spam tab, what the content score caught (src/lib/spam.ts), newest first. */
export async function adminInquiries(view: "inbox" | "spam" = "inbox") {
  return db
    .select({
      inquiry: inquiries,
      refNo: listings.refNo,
      projectName: listings.projectName,
    })
    .from(inquiries)
    .leftJoin(listings, eq(listings.id, inquiries.listingId))
    .where(eq(inquiries.spam, view === "spam"))
    .orderBy(inquiries.handled, desc(inquiries.createdAt))
    .limit(500);
}

/** The two tabs' counts on /admin/inquiries. */
export async function inquiryCounts() {
  const [row] = await db
    .select({
      inbox: sql<number>`count(*) filter (where not ${inquiries.spam})::int`,
      spam: sql<number>`count(*) filter (where ${inquiries.spam})::int`,
    })
    .from(inquiries);
  return row;
}

/** The outer query's user id inside a subquery (qualified, so it can't be read as the subquery's own "id"). */
const USER_ID = sql.raw(`"users"."id"`);

/**
 * No password yet, and a real listing our team entered still waiting for its seller's confirmation: a seller our team
 * added who hasn't claimed it. (Not a buyer our team added to a deal, who has no password either but no such listing.)
 */
const pendingClaimSql = sql`${users.passwordHash} is null and ${users.role} = 'user' and exists (select 1 from ${listings} l where l.seller_id = ${USER_ID} and l.created_by_staff and l.ownership_confirmed_at is null and not l.is_sample)
  and lower(${users.email}) not like 'owner-pending.%@offplandistress.invalid'`;

/** Accounts that can log in, and buyers our team added to a deal file (no password yet), whose KYC is checked here. */
const registeredSql = sql`(${users.passwordHash} is not null or exists (select 1 from deals d where d.buyer_id = ${USER_ID}))`;

/**
 * "registered": accounts that can log in, and buyers found off the platform that our team added to a deal
 * (saveDealFile in src/lib/deals.ts) until they set a password. "pending": sellers our team added (staff-assisted
 * intake, src/lib/claim.ts) who haven't set a password through their claim link yet (the sample seller, which has no
 * password either, owns only samples; an import's placeholder owner, src/lib/import.ts, is nobody's account).
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
      hasPassword: sql<boolean>`${users.passwordHash} is not null`,
      // USER_ID, not ${users.id}: in a select list Drizzle writes the column unqualified ("id"), which inside these
      // subqueries would mean the listing's / offer's own id (the counts were always 0).
      listings: sql<number>`(select count(*)::int from ${listings} l where l.seller_id = ${USER_ID})`,
      offers: sql<number>`(select count(*)::int from ${offers} o where o.buyer_id = ${USER_ID})`,
      // The newest listing still waiting for this seller's confirmation, for the "pending" tab's link.
      pendingListingId: sql<string | null>`(select l.id from ${listings} l where l.seller_id = ${USER_ID} and l.created_by_staff and l.ownership_confirmed_at is null and not l.is_sample order by l.created_at desc limit 1)`,
      pendingListingRef: sql<number | null>`(select l.ref_no from ${listings} l where l.seller_id = ${USER_ID} and l.created_by_staff and l.ownership_confirmed_at is null and not l.is_sample order by l.created_at desc limit 1)`,
    })
    .from(users)
    .where(tab === "pending" ? pendingClaimSql : registeredSql)
    .orderBy(desc(users.createdAt))
    .limit(1000);
}

/**
 * Which tab of /admin/users lists each of these accounts ("registered" or "pending"); an account in neither (an import's
 * placeholder owner, say) is left out.
 */
export async function userTabs(ids: string[]) {
  const tabs = new Map<string, "registered" | "pending">();
  if (!ids.length) return tabs;
  const rows = await db
    .select({ id: users.id, pending: sql<boolean>`(${pendingClaimSql})`, registered: sql<boolean>`(${registeredSql})` })
    .from(users)
    .where(inArray(users.id, ids));
  for (const r of rows) {
    if (r.pending) tabs.set(r.id, "pending");
    else if (r.registered) tabs.set(r.id, "registered");
  }
  return tabs;
}

/** How many sellers are in the "pending" tab of /admin/users. */
export async function pendingClaimCount() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(pendingClaimSql);
  return row?.n ?? 0;
}
