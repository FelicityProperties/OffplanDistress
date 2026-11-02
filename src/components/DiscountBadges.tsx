import { TrendingDown } from "lucide-react";
import type { TFn } from "@/i18n/translator";
import type { DealAnalysis } from "@/lib/deal-math";
import { discountLabels } from "@/lib/discount-labels";
import { cn } from "@/lib/utils";

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
