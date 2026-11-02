import type { TFn } from "@/i18n/translator";
import type { DealAnalysis } from "@/lib/deal-math";
import { wholePct } from "@/lib/format";

// The discount wording shared by the chips (src/components/DiscountBadges.tsx), the share image and the newsletter: kept
// out of the component so server code and scripts can use it without loading the icon library.

/**
 * A discount ratio as the whole percentage the chips show (0.196 → 20), rounded half up as belowOriginalPct does in SQL
 * (src/lib/listings.ts); null when it is unknown. The rounding is wholePct's (src/lib/format.ts), which the paid share
 * uses too.
 */
export function discountPct(ratio: number | null) {
  return wholePct(ratio);
}

/**
 * What the discount chips say for one deal, in the visitor's language — the one place deciding it, for the cards, the
 * deal page, the home hero and the newsletter rows:
 *   original: against the original (SPA) price the seller signed, known for every listing: "20% below original
 *             price", "At original price" or "5% above original price"; null without an original price.
 *   launch:   against the developer's launch price today, only when the listing carries one and the unit sells at
 *             least 1% below it.
 */
export function discountLabels(a: DealAnalysis, tc: TFn<"common">) {
  const original = discountPct(a.discountVsOriginal);
  const launch = discountPct(a.discountVsLaunch);
  return {
    original:
      original == null
        ? null
        : original >= 1
          ? tc("vsOriginal", { pct: original })
          : original === 0
            ? tc("atOriginal")
            : tc("aboveOriginal", { pct: -original }),
    /** The original chip is a saving (green); otherwise it is the neutral "at / above" chip. */
    originalIsDiscount: original != null && original >= 1,
    launch: launch != null && launch >= 1 ? tc("vsLaunch", { pct: launch }) : null,
  };
}
