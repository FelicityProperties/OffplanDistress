import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { offers } from "@/db/schema";
import { OFFERS } from "./config";
import { notify } from "./notify";
import type { TemplateKey } from "./notification-templates";

// What happens to the other bidders on a unit as its deal moves on: kept as backups when the seller accepts one
// offer, told when the unit comes back on the market, and closed once it is sold. None of these throw: the deal
// change that triggered them is already saved.

type Unit = { id: string; projectName: string };

const OPEN_STATUSES: ("pending" | "countered")[] = ["pending", "countered"];
const BUYER_HREF = "/dashboard/offers?tab=sent";

/** After the seller accepted `acceptedOfferId`, the unit's other open offers stay as backups or close (OFFERS.keepBackups). */
export async function settleOtherOffers(unit: Unit, acceptedOfferId: string) {
  if (!OFFERS.keepBackups) return closeOpenOffers(unit, acceptedOfferId);
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

/** Declines the unit's open offers (all but `exceptOfferId`) and tells each buyer it went to someone else. */
export async function closeOpenOffers(unit: Unit, exceptOfferId?: string) {
  try {
    // Only the rows this update moved are told, so a concurrent run can't notify anyone twice.
    const closed = await db
      .update(offers)
      .set({ status: "declined", updatedAt: new Date() })
      .where(openOn(unit.id, exceptOfferId))
      .returning({ buyerId: offers.buyerId, amount: offers.amount });
    await tell(unit, closed, "offer.unit_sold", "/deals");
  } catch (err) {
    console.error(`[offers] closing the open offers on ${unit.id} failed`, err);
  }
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
