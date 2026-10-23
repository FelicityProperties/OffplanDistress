import { Building2, Coins, Percent, TrendingDown } from "lucide-react";
import { getLocale, getT } from "@/i18n/server";
import { formatAEDCompact, formatNumber, formatPct } from "@/lib/format";
import { MIN_SAMPLE, type DistressIndex } from "@/lib/market";
import { signedPct } from "./shared";

/** The four headline numbers, overlapping the bottom of the hero. */
export async function KpiStrip({ index }: { index: DistressIndex }) {
  const [t, locale] = await Promise.all([getT("market"), getLocale()]);
  const s = index.supply;
  const insufficient = t("insufficient", { min: MIN_SAMPLE });

  const discountValue =
    s.medianDiscount == null ? null : s.medianDiscount >= 0 ? formatPct(s.medianDiscount, 1) : t("premium", { pct: formatPct(-s.medianDiscount, 1) });

  const tiles = [
    {
      icon: Building2,
      label: t("kpi.live"),
      value: formatNumber(s.live),
      hint: t("kpi.liveHint", { available: formatNumber(s.available), underOffer: formatNumber(s.underOffer) }),
    },
    {
      icon: Coins,
      label: t("kpi.value"),
      value: formatAEDCompact(s.saleValue, locale),
      hint: t("kpi.valueHint", { upfront: formatAEDCompact(s.upfront, locale) }),
    },
    {
      icon: TrendingDown,
      label: t("kpi.discount"),
      value: discountValue,
      hint:
        s.avgDiscount == null
          ? insufficient
          : t("kpi.discountHint", { avg: signedPct(s.avgDiscount, 1), n: formatNumber(s.withLaunch) }),
      accent: true,
    },
    {
      icon: Percent,
      label: t("kpi.paid"),
      value: s.medianPaid == null ? null : formatPct(s.medianPaid, 0),
      hint: s.medianPaid == null ? insufficient : t("kpi.paidHint"),
    },
  ];

  return (
    <div className="container-page relative z-10 -mt-16 sm:-mt-20">
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((k) => (
          <div
            key={k.label}
            className="flex min-w-0 flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-lift sm:rounded-3xl sm:p-6"
          >
            <dt className="flex items-start gap-2.5 text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
              <span
                className={
                  k.accent
                    ? "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-success-soft text-success sm:h-8 sm:w-8"
                    : "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground sm:h-8 sm:w-8"
                }
              >
                <k.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="pt-1">{k.label}</span>
            </dt>
            <dd className="pt-4">
              <span className="block text-xl font-semibold leading-tight tabular sm:whitespace-nowrap sm:text-[1.75rem]">
                {/* without a value the hint below says why */}
                {k.value ?? (
                  <span aria-hidden className="text-muted-foreground">
                    —
                  </span>
                )}
              </span>
              <span className="mt-2 block text-xs leading-snug text-muted-foreground">{k.hint}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
