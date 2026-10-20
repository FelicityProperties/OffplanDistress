import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings, offers, savedSearches, users, watchlist } from "@/db/schema";
import { cardColumns, offerCountSql, watchersSql, type ListingCard } from "./listings";

export async function myListings(userId: string) {
  return db
    .select({
      id: listings.id,
      refNo: listings.refNo,
      status: listings.status,
      verified: listings.verified,
      projectName: listings.projectName,
      community: listings.community,
      unitType: listings.unitType,
      askingPrice: listings.askingPrice,
      images: listings.images,
      views: listings.views,
      rejectionReason: listings.rejectionReason,
      createdAt: listings.createdAt,
      watchers: watchersSql,
      offers: offerCountSql,
      pendingOffers: sql<number>`(select count(*)::int from ${offers} o where o.listing_id = ${listings.id} and o.status = 'pending')`,
      docs: sql<number>`(select count(*)::int from ${files} f where f.listing_id = ${listings.id} and f.kind <> 'photo')`,
    })
    .from(listings)
    .where(eq(listings.sellerId, userId))
    .orderBy(desc(listings.createdAt));
}

export async function myListing(userId: string, id: string) {
  const [row] = await db
    .select({ listing: listings, watchers: watchersSql, offers: offerCountSql })
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.sellerId, userId)))
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
      buyerKyc: users.kycStatus,
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .innerJoin(users, eq(users.id, offers.buyerId))
    .where(eq(listings.sellerId, userId))
    .orderBy(desc(offers.updatedAt));
}

export async function offersSent(userId: string) {
  return db
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
      listingStatus: listings.status,
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .where(eq(offers.buyerId, userId))
    .orderBy(desc(offers.updatedAt));
}

export async function myWatchlist(userId: string) {
  const rows = await db
    .select({ ...cardColumns, savedPrice: watchlist.savedPrice, savedAt: watchlist.createdAt })
    .from(watchlist)
    .innerJoin(listings, eq(listings.id, watchlist.listingId))
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));
  return rows as (ListingCard & { savedPrice: number; savedAt: Date })[];
}

export async function mySearches(userId: string) {
  return db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.createdAt));
}

