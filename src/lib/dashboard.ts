import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings, offers, savedSearches, users, watchlist } from "@/db/schema";
import { cardColumns, offerCountSql, watchersSql, type ListingCard } from "./listings";
import { isAdvertised } from "./permits";

/**
 * The seller's own listings. One our team entered for them (src/lib/claim.ts) only joins their dashboard once they
 * have confirmed it through the claim link: until then the account it was filed under (matched by an email staff
 * typed) may not be the seller's, and mustn't see the unit's figures or documents, nor change it.
 */
export const ownListingSql = (userId: string) =>
  and(eq(listings.sellerId, userId), sql`not (${listings.createdByStaff} and ${listings.ownershipConfirmedAt} is null)`);

/** The outer listing's id inside a subquery (qualified, so it can't be read as the subquery's own "id"). */
const LISTING_ID = sql.raw(`"listings"."id"`);

export async function myListings(userId: string) {
  return db
    .select({
      id: listings.id,
      refNo: listings.refNo,
      status: listings.status,
      verified: listings.verified,
      projectName: listings.projectName,
      community: listings.community,
      communityOther: listings.communityOther,
      unitType: listings.unitType,
      askingPrice: listings.askingPrice,
      images: listings.images,
      views: listings.views,
      rejectionReason: listings.rejectionReason,
      createdAt: listings.createdAt,
      watchers: watchersSql,
      offers: offerCountSql,
      pendingOffers: sql<number>`(select count(*)::int from ${offers} o where o.listing_id = ${LISTING_ID} and o.status = 'pending')`,
      docs: sql<number>`(select count(*)::int from ${files} f where f.listing_id = ${LISTING_ID} and f.kind <> 'photo')`,
    })
    .from(listings)
    .where(ownListingSql(userId))
    .orderBy(desc(listings.createdAt));
}

export async function myListing(userId: string, id: string) {
  const [row] = await db
    .select({ listing: listings, watchers: watchersSql, offers: offerCountSql })
    .from(listings)
    .where(and(eq(listings.id, id), ownListingSql(userId)))
    .limit(1);
  return row ?? null;
}

export async function listingFiles(listingId: string) {
  return db
    .select({
      id: files.id,
      kind: files.kind,
      filename: files.filename,
      size: files.size,
      mimeType: files.mimeType,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(eq(files.listingId, listingId))
    .orderBy(desc(files.createdAt));
}

/** Offers on the seller's listings. Buyers stay anonymous to sellers; our team brokers the deal. */
export async function offersReceived(userId: string) {
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
      listingStatus: listings.status,
      buyerKyc: users.kycStatus,
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .innerJoin(users, eq(users.id, offers.buyerId))
    .where(eq(listings.sellerId, userId))
    .orderBy(desc(offers.updatedAt));
}

/**
 * The price a buyer may see: the asking price while the unit is an advert, otherwise the last one our team approved
 * for the advert (public_price). A seller's new price waits for review off the market (updateMyListing), and the
 * public must not see it until it is approved (RERA: the permit covers the advertised price).
 */
function buyerFacingPrice(l: Parameters<typeof isAdvertised>[0] & { askingPrice: number; publicPrice: number | null }) {
  return isAdvertised(l) ? l.askingPrice : (l.publicPrice ?? l.askingPrice);
}

export async function offersSent(userId: string) {
  const rows = await db
    .select({
      id: offers.id,
      amount: offers.amount,
      counterAmount: offers.counterAmount,
      financing: offers.financing,
      status: offers.status,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      refNo: listings.refNo,
      projectName: listings.projectName,
      askingPrice: listings.askingPrice,
      publicPrice: listings.publicPrice,
      listingStatus: listings.status,
      // whether its deal page is still public (isAdvertised), so the dashboard only links to one that is
      isSample: listings.isSample,
      dldPermitExpiresAt: listings.dldPermitExpiresAt,
      formAExpiresAt: listings.formAExpiresAt,
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .where(eq(offers.buyerId, userId))
    .orderBy(desc(offers.updatedAt));
  return rows.map((o) => {
    const unit = { status: o.listingStatus, isSample: o.isSample, dldPermitExpiresAt: o.dldPermitExpiresAt, formAExpiresAt: o.formAExpiresAt };
    return { ...o, askingPrice: buyerFacingPrice({ ...unit, askingPrice: o.askingPrice, publicPrice: o.publicPrice }), advertised: isAdvertised(unit) };
  });
}

export async function myWatchlist(userId: string) {
  const rows = await db
    .select({
      ...cardColumns,
      // the permit dates decide whether the deal is still an advert (isAdvertised in src/lib/permits.ts)
      dldPermitExpiresAt: listings.dldPermitExpiresAt,
      formAExpiresAt: listings.formAExpiresAt,
      publicPrice: listings.publicPrice,
      savedPrice: watchlist.savedPrice,
      savedAt: watchlist.createdAt,
    })
    .from(watchlist)
    .innerJoin(listings, eq(listings.id, watchlist.listingId))
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));
  // askingPrice is the price shown and compared with the saved one: never a cut still waiting for our review.
  return rows.map((r) => ({ ...r, askingPrice: buyerFacingPrice(r) })) as (ListingCard & {
    dldPermitExpiresAt: string | null;
    formAExpiresAt: string | null;
    savedPrice: number;
    savedAt: Date;
  })[];
}

export async function mySearches(userId: string) {
  return db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.createdAt));
}

