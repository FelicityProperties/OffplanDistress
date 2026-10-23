import { FEES } from "@/lib/config";
import { platformFee } from "@/lib/deal-math";

/*
 * What Dubai law lets a developer do when an off-plan buyer stops paying.
 *
 * Law No. (13) of 2008 Regulating the Interim Real Property Register in the Emirate of Dubai, Article 11,
 * amended by Law No. (9) of 2009 and Law No. (19) of 2017, and replaced in full by Law No. (19) of 2020:
 *   (a) The developer notifies the Dubai Land Department (DLD) of the buyer's breach on the prescribed form.
 *       DLD serves a 30-day notice on the buyer to perform (and may try to settle the matter). Once DLD
 *       confirms the developer followed the procedure, the developer may act without a court ruling or
 *       arbitration award, according to the completion percentage as determined by RERA:
 *       - completion exceeds 80%: keep the agreement, retain the amounts paid and claim the balance; OR ask DLD
 *         to sell the unit at public auction to recover the amounts owed; OR terminate unilaterally and retain
 *         up to 40% of the unit value stated in the off-plan sale agreement;
 *       - completion between 60% and 80%: terminate and retain up to 40% of the unit value;
 *       - works started, completion below 60%: terminate and retain up to 25% of the unit value;
 *       any excess is refunded within one year of termination or within 60 days of the unit's resale,
 *       whichever is earlier.
 *   (b) Where the developer has not commenced works for reasons beyond its control (without negligence), or
 *       RERA cancels the project, the developer must refund all amounts paid (WAM / Dubai Media Office,
 *       15 Dec 2020; Al Tamimi). For a RERA-cancelled project the refund runs through the escrow account under
 *       Law No. (8) of 2007; the page does not claim that route for the "not started" case. Before the 2020 law
 *       the "not started" case allowed up to 30% of the payments made by the purchaser to be retained (Law No.
 *       (9) of 2009 text on dlp.dubai.gov.ae); that is no longer the rule.
 *   The completion percentage is the one stated in DLD's official document, calculated under RERA's rules.
 *
 * Sources (checked October 2026):
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2020/Law%20No.%20(19)%20of%202020%20Amending%20Law%20No.%20(13)%20of%202008%20Regulating%20the%20Interim%20Real%20Property%20Register%20in%20the%20Emirate%20of%20Dubai.html
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2020/Law%20No.%20(19)%20of%202020%20Amending%20Law%20No.%20(13)%20of%202008%20Regulating%20the%20Interim%20Real%20Property%20Register%20in%20the%20Emirate%20of%20Dubai.pdf
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2018/Explanatory%20Notes%20on%20Article%20(11)%20of%20Law%20No.%20(19)%20of%202017.html
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2017/Law%20No.%20(19)%20of%202017%20Amending%20Law%20No.%20(13)%20of%202008%20Regulating%20the%20Interim%20Real%20Property%20Register%20in%20the%20Emirate%20of%20Dubai.pdf
 *   https://www.tamimi.com/law-update-articles/dubai-amends-interim-registration-law/  (2020 change: full refund if works not commenced)
 *   https://www.tamimi.com/law-update-articles/developers-dubai-can-terminate-without-court-order/
 *   https://afridi-angell.com/termination-of-off-plan-real-estate-sale-agreements-in-dubai/  (DLD notice, 30 days, compliance document)
 *   https://www.wam.ae/en/article/hszrbgis-mohammed-bin-rashid-issues-new-legislations  (2020: full refund if not started / RERA-cancelled)
 *   https://mediaoffice.ae/en/news/2020/december/15-12/mohammed-bin-rashid-issues-new-legislations
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2009/Law%20No.%20(9)%20of%202009.html  (pre-2020: up to 30% of payments made)
 *   https://bsalaw.com/insight/explained-dubais-new-off-plan-property-purchase-law/  (2017: 40% termination option above 80%)
 * Re-checked October 2026 through search results only: every host above is unreachable from the build environment,
 * so the full consolidated text of Article 11 has not been read here. Have it confirmed before relying on it.
 *
 * The statute speaks of "exceeds 80%" and "between 60% and 80%": exactly 80% and exactly 60% fall in the middle
 * tier here. Every percentage is a maximum ("up to"); the SPA may agree less.
 */

export type Tier = "notStarted" | "under60" | "from60to80" | "over80";

/** Maximum share of the unit's contract value the developer may retain on termination, per tier. */
export const RETENTION: Record<Tier, number> = {
  notStarted: 0,
  under60: 0.25,
  from60to80: 0.4,
  over80: 0.4,
};

export const TIERS: Tier[] = ["over80", "from60to80", "under60", "notStarted"];

/**
 * A quick sale usually has to be priced at or a little under what the position is worth. This range is our
 * assumption for illustration, not market data or a valuation.
 */
export const QUICK_SALE = { low: 0.85, high: 1 } as const;

/** The assumption as whole percentages, for copy: { low: 85, high: 100 }. */
export const quickSalePct = { low: Math.round(QUICK_SALE.low * 100), high: Math.round(QUICK_SALE.high * 100) };

export function tierFor(progress: number, notStarted: boolean): Tier {
  if (notStarted) return "notStarted";
  if (progress > 80) return "over80";
  if (progress >= 60) return "from60to80";
  return "under60";
}

export type ExitInputs = {
  price: number;
  paid: number;
  /** Construction progress, 0–100 */
  progress: number;
  notStarted: boolean;
  /** Today's price for a similar unit; null = not entered (treated as the purchase price). */
  marketPrice: number | null;
  /** Months until handover; null = not entered. */
  months: number | null;
};

export function analyzeExit(i: ExitInputs) {
  const price = Math.max(Math.round(i.price), 0);
  const paid = Math.min(Math.max(Math.round(i.paid), 0), price);
  const remaining = price - paid;
  const paidPct = price > 0 ? paid / price : 0;
  const hasMarket = i.marketPrice != null && i.marketPrice > 0;
  const market = hasMarket ? Math.round(i.marketPrice as number) : price;
  const months = i.months != null && i.months > 0 ? Math.round(i.months) : null;

  // 1 · Keep paying
  const paperGain = market - price;
  const perMonth = months ? Math.round(remaining / months) : null;

  // 2 · Stop paying
  const tier = tierFor(i.progress, i.notStarted);
  const rate = RETENTION[tier];
  const maxRetention = Math.round(price * rate);
  const atRisk = Math.min(maxRetention, paid);
  const refund = paid - atRisk;

  // 3 · Sell the contract: the buyer pays for the equity (paid in, adjusted for today's price) and takes over
  // the remaining instalments.
  const position = Math.max(paid + market - price, 0);
  const saleLow = Math.round(position * QUICK_SALE.low);
  const saleHigh = position;
  const sellerFee = (sale: number) => (FEES.payer === "seller" && sale > 0 ? platformFee(sale + remaining).total : 0);
  const feeLow = sellerFee(saleLow);
  const feeHigh = sellerFee(saleHigh);
  const netLow = Math.max(saleLow - feeLow, 0);
  const netHigh = Math.max(saleHigh - feeHigh, 0);

  // Selling vs. stopping payments: what the seller walks away with in each case.
  const edgeLow = netLow - refund;
  const edgeHigh = netHigh - refund;
  // "none": the price drop wipes out the equity and stopping payments could forfeit all of it too.
  const verdict: "sell" | "maybe" | "law" | "none" =
    edgeLow > 0 ? "sell" : edgeHigh > 0 ? "maybe" : netHigh === 0 && refund === 0 && paid > 0 ? "none" : "law";

  return {
    price,
    paid,
    remaining,
    paidPct,
    hasMarket,
    market,
    months,
    paperGain,
    perMonth,
    tier,
    rate,
    maxRetention,
    atRisk,
    refund,
    position,
    saleLow,
    saleHigh,
    feeLow,
    feeHigh,
    noc: FEES.nocEstimate,
    netLow,
    netHigh,
    edgeLow,
    edgeHigh,
    verdict,
  };
}

export type ExitAnalysis = ReturnType<typeof analyzeExit>;
