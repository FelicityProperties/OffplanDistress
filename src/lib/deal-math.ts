import type { PlanInstalment } from "@/db/schema";
import { FEES } from "./config";

export type DealNumbers = {
  originalPrice: number;
  amountPaid: number;
  askingPrice: number;
  launchPrice: number | null;
  /**
   * Instalments past their due date and still unpaid on the developer's statement of account. They are part of the
   * remaining balance (original price − amount paid), but the developer wants them cleared before it issues the NOC,
   * so they are paid on transfer day instead of later. Null = not known.
   */
  overdueAmount?: number | null;
  /** Late-payment fees the developer has charged on those instalments: an extra cost, outside the sale value. */
  overduePenalty?: number | null;
};

/** A rate as whole basis points (0.02 → 200), so every fee below is integer arithmetic, in JS and in SQL alike. */
const bp = (rate: number) => Math.round(rate * 10_000);
export const FEE_BP = { commission: bp(FEES.commissionRate), vat: bp(FEES.vatRate), dld: bp(FEES.dldRate) } as const;

/**
 * `amount` × `rateBp` ÷ 10 000, rounded half up. The quotient of two integers is exact at .5, so this is the same as
 * round(numeric) in Postgres for amounts ≥ 0 (cashToCloseSql in src/lib/listings.ts builds on it).
 */
export function applyBp(amount: number, rateBp: number) {
  return Math.round((amount * rateBp) / 10_000);
}

/** Fees fixed per transfer whatever the price: DLD registration + trustee office, and the developer's NOC (estimates). */
export const FIXED_FEES_ESTIMATE = FEES.dldAdminEstimate + FEES.nocEstimate;

/**
 * In an off-plan assignment the buyer pays the seller for the equity already paid in (the asking price) and takes over
 * the remaining developer instalments. The sale value registered with DLD is the sum of the two.
 *
 * CASH AT TRANSFER (cashToClose) — one definition, mirrored in SQL by cashToCloseSql in src/lib/listings.ts, which the
 * /deals minTransfer/maxTransfer filters and the "cash" sort use; change both together:
 *   asking price (equity to the seller)
 *   + buyer fees: our commission + VAT on it (when FEES.payer is the buyer), the DLD transfer fee (FEES.dldRate of the
 *     sale value), DLD registration/trustee and developer NOC fees (FIXED_FEES_ESTIMATE). Everything but our fee is an
 *     estimate, so the figure is always shown as "≈".
 *   + arrears: overdue instalments + late fees (null counts as 0), which the developer wants cleared before the NOC.
 * The overdue instalments are already inside the remaining balance, so the all-in total (totalCost) adds only the
 * late fees; they move from the plan to transfer day, and the plan still to pay after transfer is remaining − overdue.
 */
export function analyzeDeal(d: DealNumbers) {
  const remaining = Math.max(d.originalPrice - d.amountPaid, 0);
  const paidPct = d.originalPrice > 0 ? d.amountPaid / d.originalPrice : 0;
  const saleValue = d.askingPrice + remaining;
  const commission = applyBp(saleValue, FEE_BP.commission);
  const vat = applyBp(commission, FEE_BP.vat);
  const dld = applyBp(saleValue, FEE_BP.dld);
  const buyerFees = (FEES.payer === "buyer" ? commission + vat : 0) + dld + FIXED_FEES_ESTIMATE;
  const overdue = Math.max(d.overdueAmount ?? 0, 0);
  const penalty = Math.max(d.overduePenalty ?? 0, 0);
  const arrears = overdue + penalty;
  const totalCost = saleValue + buyerFees + penalty;
  const cashToClose = d.askingPrice + buyerFees + arrears;
  // What is still paid to the developer after transfer, by the plan (the overdue part was cleared on transfer day).
  const remainingAfterTransfer = Math.max(remaining - overdue, 0);
  const sellerDiscount = d.amountPaid - d.askingPrice; // positive: seller takes a loss to exit
  const discountVsLaunch = d.launchPrice && d.launchPrice > 0 ? 1 - saleValue / d.launchPrice : null;
  // Buying new from the developer you'd also pay the 4% DLD fee on the launch price.
  const launchAllIn = d.launchPrice ? Math.round(d.launchPrice * (1 + FEES.dldRate)) : null;
  const savingVsLaunch = launchAllIn != null ? launchAllIn - totalCost : null;
  const sellerNet = d.askingPrice - (FEES.payer === "seller" ? commission + vat : 0);

  return {
    remaining,
    paidPct,
    saleValue,
    commission,
    vat,
    dld,
    dldAdmin: FEES.dldAdminEstimate,
    noc: FEES.nocEstimate,
    buyerFees,
    overdue,
    penalty,
    arrears,
    totalCost,
    cashToClose,
    remainingAfterTransfer,
    sellerDiscount,
    discountVsLaunch,
    launchAllIn,
    savingVsLaunch,
    sellerNet,
  };
}

export type DealAnalysis = ReturnType<typeof analyzeDeal>;

export function platformFee(saleValue: number) {
  const commission = applyBp(saleValue, FEE_BP.commission);
  const vat = applyBp(commission, FEE_BP.vat);
  return { commission, vat, total: commission + vat };
}

// ——— Cash timeline ———————————————————————————————————————————————————————————————————————————————————————————

/** From an agreed offer (MOU / Form F) to the DLD transfer usually takes two to five weeks. */
export const TRANSFER_WINDOW_DAYS = { from: 14, to: 35 } as const;
/** An instalment due within this many days of today may fall before the transfer completes: who pays it is agreed. */
export const DUE_SOON_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-26" + 14 → "2026-11-09" (calendar dates, no time zone involved). */
function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** First day of the calendar quarter holding `day`: "2027-06-30" → "2027-04-01". */
function quarterStart(day: string) {
  const [y, m] = day.split("-").map(Number);
  return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
}

// Sellers type milestone labels in English or Arabic. "Post-handover" / "after handover" are checked before "handover",
// and "completion" only counts when it isn't a construction milestone ("on 50% completion").
const POST_HANDOVER = /post[\s-]*hand\s*-?\s*over|after\s+hand\s*-?\s*over|بعد\s+(ال)?(تسليم|استلام)/i;
const PRE_HANDOVER = /pre[\s-]*hand\s*-?\s*over|before\s+hand\s*-?\s*over|قبل\s+(ال)?(تسليم|استلام)/i;
const HANDOVER_WORD = /hand\s*-?\s*over|تسليم|استلام/i;
const COMPLETION_WORD = /\bcompletion\b|إنجاز|إكمال/i;
const CONSTRUCTION = /construct|\d\s*%|٪|بناء|إنشاء/i;

function isHandoverLabel(label: string) {
  if (POST_HANDOVER.test(label) || PRE_HANDOVER.test(label)) return false;
  return HANDOVER_WORD.test(label) || (COMPLETION_WORD.test(label) && !CONSTRUCTION.test(label));
}

type Bucket = { sum: number; count: number };
const bucket = (): Bucket => ({ sum: 0, count: 0 });
const add = (b: Bucket, amount: number) => {
  b.sum += amount;
  b.count += 1;
};

export type PlanSchedule = ReturnType<typeof planSchedule>;

/**
 * The listed payment plan laid out from a buyer's point of view, for "Your cash timeline" on the deal page.
 * `today` and every date are Dubai calendar dates ("YYYY-MM-DD"). Each instalment lands in exactly one bucket:
 *   - pastDue: its due date is before today. The plan was entered when the listing was made, so these were either
 *     paid since or are overdue; the developer's statement says which (the listing's arrears fields).
 *   - preHandover: due from today up to handover (`months`: from today to the handover date).
 *   - atHandover: the handover payment, by its label ("On handover", "عند التسليم"…), or, when no label says so,
 *     an instalment dated in the handover quarter. A handover mortgage can finance it.
 *   - postHandover: due after the handover date, or labelled post-handover.
 *   - undated: no due date given.
 * transferDay is the usual window for the transfer if an offer is agreed today; dueSoon is the next instalment falling
 * due within DUE_SOON_DAYS (from the plan or from the listing's separately kept "next instalment", which sellers keep
 * up to date), so buyer and seller agree who pays it.
 */
export function planSchedule(
  paymentPlan: PlanInstalment[] | null | undefined,
  handoverDate: string | null,
  today: string,
  next?: { date: string | null; amount: number | null },
) {
  const plan = (paymentPlan ?? []).filter((p) => Number.isFinite(p.amount) && p.amount > 0);
  const handover = handoverDate && ISO_DAY.test(handoverDate) ? handoverDate : null;
  const dated = (p: PlanInstalment) => (p.dueDate && ISO_DAY.test(p.dueDate) ? p.dueDate : null);
  const labelledHandover = plan.some((p) => isHandoverLabel(p.label));
  const handoverQuarter = handover ? quarterStart(handover) : null;

  const pastDue = bucket();
  const pre = bucket();
  const at = bucket();
  const post = bucket();
  const undated = bucket();
  for (const p of plan) {
    const due = dated(p);
    if (due && due < today) add(pastDue, p.amount);
    else if ((due && handover && due > handover) || POST_HANDOVER.test(p.label)) add(post, p.amount);
    else if (isHandoverLabel(p.label)) add(at, p.amount);
    else if (!labelledHandover && due && handover && handoverQuarter && due >= handoverQuarter) add(at, p.amount);
    else if (due) add(pre, p.amount);
    else add(undated, p.amount);
  }
  const future = pre.sum + at.sum + post.sum + undated.sum;

  const days = handover ? Math.round((Date.parse(`${handover}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS) : null;
  const months = days == null ? null : Math.max(0, Math.round(days / 30.44));

  // The next instalment due in the next DUE_SOON_DAYS: from the plan, or the listing's own "next instalment" fields.
  const soonUntil = addDays(today, DUE_SOON_DAYS);
  const candidates: { dueDate: string; amount: number | null }[] = plan
    .filter((p) => {
      const due = dated(p);
      return due != null && due >= today && due <= soonUntil;
    })
    .map((p) => ({ dueDate: p.dueDate as string, amount: p.amount }));
  if (next?.date && ISO_DAY.test(next.date) && next.date >= today && next.date <= soonUntil) {
    const same = candidates.find((c) => c.dueDate === next.date);
    if (same) same.amount = next.amount && next.amount > 0 ? next.amount : same.amount;
    else candidates.push({ dueDate: next.date, amount: next.amount && next.amount > 0 ? next.amount : null });
  }
  candidates.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  const dueSoon = candidates[0] ?? null;

  return {
    transferDay: { from: addDays(today, TRANSFER_WINDOW_DAYS.from), to: addDays(today, TRANSFER_WINDOW_DAYS.to) },
    pastDue,
    preHandover: { ...pre, months },
    atHandover: { ...at, date: handover },
    postHandover: post,
    undated,
    /** Sum of the instalments still ahead (every bucket but pastDue). */
    future,
    dueSoon,
  };
}
