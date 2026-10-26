import { analyzeExit } from "@/components/exit/exit-math";

// Shared by the free seller estimate (QuickEstimate), its server action, the /sell page and the admin leads page,
// so the number a seller saw and the number our team sees come from the same place.

/** Seller lead reference as shown to sellers and admins: L-123. */
export function leadCode(refNo: number) {
  return `L-${refNo}`;
}

/** End date of the calendar quarter a date falls in: "2027-11-05" → "2027-12-31". Null if it isn't a date. */
export function quarterEndOf(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 0)).toISOString().slice(0, 10);
}

/** End dates of the next `n` quarters, starting with the current one (the handover picker's choices). */
export function nextQuarters(n = 20): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    out.push(new Date(Date.UTC(now.getUTCFullYear(), (Math.floor(now.getUTCMonth() / 3) + 1 + i) * 3, 0)).toISOString().slice(0, 10));
  }
  return out;
}

/** The quarter end `months` from today, e.g. the exit calculator's "months to handover". */
export function quarterInMonths(months: number): string | null {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + Math.round(months));
  return quarterEndOf(d);
}

/**
 * The estimate itself: what the buyer takes over and the likely range the seller receives, straight from the exit
 * calculator's option 3 (same QUICK_SALE_DISCOUNT, same fee rule). Construction progress doesn't affect it.
 */
export function sellerEstimate(spa: number, paid: number, market: number | null) {
  const a = analyzeExit({ price: spa, paid, progress: 0, notStarted: false, marketPrice: market, months: null });
  return {
    remaining: a.remaining,
    low: a.netLow,
    high: a.netHigh,
    paidPct: a.paidPct,
    hasMarket: a.hasMarket,
    belowNocThreshold: a.belowNocThreshold,
  };
}

export type EstimatePrefill = { spa?: number; paid?: number; handover?: string; market?: number };

/** ?spa=&paid=&handover=&market= from the exit calculator's "List my unit" link; anything unusable is dropped. */
export function prefillFromParams(p: Record<string, string | string[] | undefined>): EstimatePrefill {
  const int = (k: string) => {
    const v = p[k];
    const n = typeof v === "string" && /^\d{1,10}$/.test(v) ? Number(v) : NaN;
    return Number.isSafeInteger(n) && n > 0 && n <= 2_000_000_000 ? n : undefined;
  };
  const handover = typeof p.handover === "string" ? quarterEndOf(p.handover) ?? undefined : undefined;
  const out: EstimatePrefill = { spa: int("spa"), paid: int("paid"), handover, market: int("market") };
  if (out.spa && out.paid && out.paid > out.spa) out.paid = out.spa;
  return out;
}
