import { FEES } from "@/lib/config";
import { platformFee } from "@/lib/deal-math";

/*
 * What Dubai law lets a developer do when an off-plan buyer stops paying.
 *
 * Article 11 of Law No. (13) of 2008 Regulating the Interim Real Property Register in the Emirate of Dubai was
 * replaced by Law No. (9) of 2009, again by Law No. (19) of 2017, and most recently by Law No. (19) of 2020
 * (issued 24 Nov 2020; Official Gazette No. 495, 13 Dec 2020; in force on publication). The 2020 text is in force;
 * no later amendment found (October 2026). It is public order: it applies whatever the SPA says.
 *   (a) The developer notifies the Dubai Land Department (DLD) of the buyer's breach on DLD's form. DLD serves a
 *       written notice giving the buyer 30 days to meet their contractual obligations and, where possible, tries an
 *       amicable settlement (recorded in a signed contract annex). If the buyer neither performs nor settles, DLD
 *       issues an official document confirming the procedure was followed and stating the completion percentage of
 *       the PROJECT, calculated under RERA's standards. The developer may then act without going to court or
 *       arbitration (the buyer may still go to either), according to that percentage:
 *       - exceeds 80%: keep the SPA, keep all amounts paid and claim the balance; OR ask DLD to sell the unit at
 *         public auction to recover what is owed, sale costs borne by the buyer; OR terminate and retain up to 40%
 *         of the unit value stated in the SPA (this third option is in every source that addresses it, but its
 *         exact sentence was only seen in search extracts);
 *       - between 60% and up to 80%: terminate and retain up to 40% of the unit value;
 *       - works commenced, less than 60%: terminate and retain up to 25% of the unit value;
 *       after terminating and retaining a share, the developer refunds the rest within one year of termination or
 *       within 60 days of reselling the unit, whichever is earlier. The caps are on the unit value, not on the
 *       amounts paid; whether the developer may claim a shortfall when less than the cap was paid is unsettled.
 *   (b) Where the developer has not commenced works for reasons beyond its control, without negligence or omission
 *       on its part, or RERA cancels the project by a final reasoned decision, the developer must refund all
 *       amounts paid, under the procedures of Law No. (8) of 2007 (escrow); the timing in (a) does not apply.
 *       Under Law No. (19) of 2017 (and Law No. (9) of 2009) the not-started case let the developer keep up to 30%
 *       of the AMOUNTS PAID; Law No. (19) of 2020 removed that.
 *
 * Boundaries (an inference, no ruling found): the 2020 text says "exceeds 80%" (تزيد على), "between 60% and up to
 * 80%" (تتراوح بين ... ولغاية) and "less than 60%" (تقل عن), so exactly 60% and exactly 80% fall in the middle tier.
 * The page says so when the input sits on a boundary. Every percentage is a ceiling ("up to" / "ما لا يزيد على").
 *
 * Sources (October 2026). Every host below was unreachable from the build environment, so the wording comes from
 * search-engine extracts of these pages; have the Arabic Gazette text of Article 11 read before relying on it.
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2020/Law%20No.%20(19)%20of%202020%20Amending%20Law%20No.%20(13)%20of%202008%20Regulating%20the%20Interim%20Real%20Property%20Register%20in%20the%20Emirate%20of%20Dubai.html
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2020/Law%20No.%20(19)%20of%202020%20Amending%20Law%20No.%20(13)%20of%202008%20Regulating%20the%20Interim%20Real%20Property%20Register%20in%20the%20Emirate%20of%20Dubai.pdf
 *   (Arabic, authoritative) https://dlp.dubai.gov.ae/Legislation%20Ar%20Reference/2020/ — Law No. (19) of 2020, linked from the page
 *   https://www.tamimi.com/law-update-articles/dubai-amends-interim-registration-law/  (2020 change: full refund if works not commenced)
 *   https://mediaoffice.ae/en/news/2020/December/15-12/Mohammed-bin-Rashid-issues-new-legislations  (Dubai Media Office, 15 Dec 2020)
 *   https://www.wam.ae/en/details/1395302895460  (WAM, Dec 2020)
 *   https://afridi-angell.com/wp-content/uploads/2026/09/inBrief-Termination-of-Off-Plan-Real-Estate-Sale-Agreements-in-Dubai.pdf  (Sep 2026: DLD notice, 30 days, no court needed)
 *   https://www.argaam.com/ar/article/articledetail/id/1225046  (Arabic text of the 2020 article, reproduced)
 *   Superseded 2017 text, for the history only:
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2017/Law%20No.%20(19)%20of%202017%20Amending%20Law%20No.%20(13)%20of%202008%20Regulating%20the%20Interim%20Real%20Property%20Register%20in%20the%20Emirate%20of%20Dubai.pdf  (old 30% of payments rule)
 *   https://dlp.dubai.gov.ae/Legislation%20Reference/2018/Explanatory%20Notes%20on%20Article%20(11)%20of%20Law%20No.%20(19)%20of%202017.html
 *   https://www.tamimi.com/law-update-articles/developers-dubai-can-terminate-without-court-order/
 *   https://bsalaw.com/insight/explained-dubais-new-off-plan-property-purchase-law/
 */

export type Tier = "notStarted" | "under60" | "from60to80" | "over80";

/** Maximum share of the unit's contract value the developer may retain if it terminates, per tier (a ceiling). */
export const RETENTION: Record<Tier, number> = {
  notStarted: 0,
  under60: 0.25,
  from60to80: 0.4,
  over80: 0.4,
};

export const TIERS: Tier[] = ["over80", "from60to80", "under60", "notStarted"];

/**
 * To buy quickly, a buyer wants a discount on the whole unit (the equity plus the plan they take over) against
 * today's price for a similar unit, and that discount comes out of the seller's equity. This range is our assumption
 * for illustration, not market data or a valuation.
 */
export const QUICK_SALE_DISCOUNT = { min: 0.05, max: 0.15 } as const;

/** The assumption as whole percentages, for copy: { low: 5, high: 15 }. */
export const quickSalePct = { low: Math.round(QUICK_SALE_DISCOUNT.min * 100), high: Math.round(QUICK_SALE_DISCOUNT.max * 100) };

/** Many developers only issue a resale NOC once this share of the price is paid (30–40%, the higher end). */
export const NOC_THRESHOLD = 0.4;

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

  // 3 · Sell the contract: the buyer pays for the equity and takes over the remaining instalments. At full value
  // the equity is what you've paid, adjusted for today's price; a quick sale knocks QUICK_SALE_DISCOUNT off the
  // whole unit, and all of it comes out of the equity.
  const position = Math.max(paid + market - price, 0);
  const saleLow = Math.max(Math.round(market * (1 - QUICK_SALE_DISCOUNT.max)) - remaining, 0);
  const saleHigh = Math.max(Math.round(market * (1 - QUICK_SALE_DISCOUNT.min)) - remaining, 0);
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
    /** Below most developers' resale threshold: a sale may need more paid first. */
    belowNocThreshold: paidPct < NOC_THRESHOLD,
  };
}

export type ExitAnalysis = ReturnType<typeof analyzeExit>;
