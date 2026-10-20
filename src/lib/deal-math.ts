import { FEES } from "./config";

export type DealNumbers = {
  originalPrice: number;
  amountPaid: number;
  askingPrice: number;
  launchPrice: number | null;
};

/**
 * In an off-plan assignment the buyer pays the seller for the equity already paid in
 * (the asking price) and takes over the remaining developer instalments. The sale value
 * registered with DLD is the sum of the two.
 */
export function analyzeDeal(d: DealNumbers) {
  const remaining = Math.max(d.originalPrice - d.amountPaid, 0);
  const paidPct = d.originalPrice > 0 ? d.amountPaid / d.originalPrice : 0;
  const saleValue = d.askingPrice + remaining;
  const commission = Math.round(saleValue * FEES.commissionRate);
  const vat = Math.round(commission * FEES.vatRate);
  const dld = Math.round(saleValue * FEES.dldRate);
  const buyerFees = (FEES.payer === "buyer" ? commission + vat : 0) + dld + FEES.dldAdminEstimate + FEES.nocEstimate;
  const totalCost = saleValue + buyerFees;
  const cashToClose = d.askingPrice + buyerFees;
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
    totalCost,
    cashToClose,
    sellerDiscount,
    discountVsLaunch,
    launchAllIn,
    savingVsLaunch,
    sellerNet,
  };
}

export type DealAnalysis = ReturnType<typeof analyzeDeal>;

export function platformFee(saleValue: number) {
  const commission = Math.round(saleValue * FEES.commissionRate);
  const vat = Math.round(commission * FEES.vatRate);
  return { commission, vat, total: commission + vat };
}
