import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings, offers } from "@/db/schema";
import { OFFERS } from "./config";
import { cancelOpenDeals } from "./deals";
import { notify } from "./notify";
import type { TemplateKey } from "./notification-templates";

// What happens to the bidders on a unit as its deal moves on: the others kept as backups when the seller accepts one
// offer, told when the unit comes back on the market (and the accepted one closed, as that deal is off), and closed
// once it is sold or leaves the market. None of these throw: the change that triggered them is already saved.

type Unit = { id: string; projectName: string };

const OPEN_STATUSES: ("pending" | "countered")[] = ["pending", "countered"];
const BUYER_HREF = "/dashboard/offers?tab=sent";

/** Statuses in which a unit has an agreed deal; its other open offers are backups. */
export const DEAL_STATUSES = ["under_offer", "noc_in_progress"] as const;

/** After the seller accepted `acceptedOfferId`, the unit's other open offers stay as backups or close (OFFERS.keepBackups). */
export async function settleOtherOffers(unit: Unit, acceptedOfferId: string) {
  if (!OFFERS.keepBackups) return closeOpenOffers(unit, "sold", acceptedOfferId);
  try {
    await tell(unit, await openOffers(unit.id, acceptedOfferId), "offer.backup", BUYER_HREF);
  } catch (err) {
    console.error(`[offers] telling the backup bidders on ${unit.id} failed`, err);
  }
}

/** The unit is back on the market after its deal fell through: the backup offers are active again. */
export async function reopenBackups(unit: Unit) {
  try {
    await tell(unit, await openOffers(unit.id), "offer.backup_reopened", BUYER_HREF);
  } catch (err) {
    console.error(`[offers] telling the backup bidders on ${unit.id} it is back failed`, err);
  }
}

/**
 * Declines the unit's open offers (all but `exceptOfferId`) and tells each buyer why: it went to someone else ("sold":
 * transferred, or accepted when backups aren't kept) or it left the market ("unavailable": withdrawn, rejected,
 * removed).
 */
export async function closeOpenOffers(unit: Unit, why: "sold" | "unavailable", exceptOfferId?: string) {
  try {
    // Only the rows this update moved are told, so a concurrent run can't notify anyone twice.
    const closed = await db
      .update(offers)
      .set({ status: "declined", updatedAt: new Date() })
      .where(openOn(unit.id, exceptOfferId))
      .returning({ buyerId: offers.buyerId, amount: offers.amount });
    await tell(unit, closed, why === "sold" ? "offer.unit_sold" : "offer.unit_unavailable", "/deals");
  } catch (err) {
    console.error(`[offers] closing the open offers on ${unit.id} failed`, err);
  }
}

/**
 * The unit is back on the market, so whatever deal was agreed on it is off: its accepted offer is declined and the
 * buyer told (offer.deal_cancelled). Call it whenever a listing goes live from another status, so a live unit never
 * carries an accepted offer (acceptOffer in src/app/actions/market.ts refuses a second one while one exists).
 * Returns how many accepted offers it closed.
 */
export async function cancelAcceptedOffers(unit: Unit, whileStatus: "live" | "withdrawn" = "live") {
  try {
    // Only while the unit is still in that status: if the seller accepted a new offer in the moment since it went live,
    // that offer is the deal now and stays accepted. ("withdrawn": the seller pulled out of the agreed deal.)
    const stillLive = sql`exists (select 1 from ${listings} where ${listings.id} = ${unit.id} and ${listings.status} = ${whileStatus})`;
    // Its deal file first, kept with the reason (src/lib/deals.ts): until the accepted offer below is declined no new
    // offer can be accepted on the unit, so the file of a deal agreed in the meantime is never the one closed here.
    await cancelOpenDeals(unit.id, whileStatus === "live" ? "relisted" : "seller_withdrew", whileStatus);
    const cancelled = await db
      .update(offers)
      .set({ status: "declined", updatedAt: new Date() })
      .where(and(eq(offers.listingId, unit.id), eq(offers.status, "accepted"), stillLive))
      .returning({ buyerId: offers.buyerId, amount: offers.amount });
    await tell(unit, cancelled, "offer.deal_cancelled", BUYER_HREF);
    return cancelled.length;
  } catch (err) {
    console.error(`[offers] closing the accepted offer on ${unit.id} failed`, err);
    return 0;
  }
}

/**
 * A listing went live from `was`: the deal agreed on it (if any) is off, and if there was one its other bidders hear
 * the unit is available again and their backup offers are active.
 */
export async function reopenUnit(unit: Unit, was: string) {
  const cancelled = await cancelAcceptedOffers(unit);
  if (cancelled > 0 || (DEAL_STATUSES as readonly string[]).includes(was)) await reopenBackups(unit);
}

function openOn(listingId: string, exceptOfferId?: string) {
  return and(
    eq(offers.listingId, listingId),
    inArray(offers.status, OPEN_STATUSES),
    exceptOfferId ? ne(offers.id, exceptOfferId) : undefined,
  );
}

async function openOffers(listingId: string, exceptOfferId?: string) {
  return db.select({ buyerId: offers.buyerId, amount: offers.amount }).from(offers).where(openOn(listingId, exceptOfferId));
}

/** One notice per buyer, each with their own offer amount. */
async function tell(unit: Unit, rows: { buyerId: string; amount: number }[], key: TemplateKey, href: string) {
  await Promise.all(rows.map((o) => notify([o.buyerId], key, { project: unit.projectName, amount: { aed: o.amount } }, href)));
}
