import { TrendingDown } from "lucide-react";
import type { TFn } from "@/i18n/translator";
import type { DealAnalysis } from "@/lib/deal-math";
import { wholePct } from "@/lib/format";
import { cn } from "@/lib/utils";

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

/**
 * The discount chips, the same wherever a deal is shown: first the one against the original price — green with the
 * trend icon for a saving, a neutral dark-glass chip at or above it — then the outlined green one against today's
 * launch price when there is one. Server-safe: the caller passes its translator.
 */
export function DiscountBadges({
  a,
  tc,
  size = "sm",
  primaryOnly = false,
}: {
  a: DealAnalysis;
  tc: TFn<"common">;
  /** xs: the home hero card; sm: deal cards; md: the deal page's gallery. */
  size?: "xs" | "sm" | "md";
  /** The original-price chip alone, where there is room for one line only. */
  primaryOnly?: boolean;
}) {
  const { original, originalIsDiscount, launch } = discountLabels(a, tc);
  const chip = cn(
    "inline-flex items-center whitespace-nowrap rounded-full font-semibold tabular shadow-sm",
    size === "md" ? "gap-1.5 px-3 py-1 text-sm" : size === "sm" ? "gap-1 px-2.5 py-1 text-xs" : "gap-1 px-2.5 py-1 text-[11px]",
  );
  const icon = size === "md" ? "h-4 w-4" : size === "sm" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <>
      {original != null && (
        <span
          data-discount={originalIsDiscount ? "original" : "original-none"}
          className={cn(chip, originalIsDiscount ? "bg-success text-success-foreground" : "bg-ink/60 text-primary-foreground backdrop-blur")}
        >
          {originalIsDiscount && <TrendingDown className={icon} aria-hidden />}
          {original}
        </span>
      )}
      {!primaryOnly && launch != null && (
        <span data-discount="launch" className={cn(chip, "border border-success/60 bg-success-soft/90 text-success backdrop-blur")}>
          {launch}
        </span>
      )}
    </>
  );
}
