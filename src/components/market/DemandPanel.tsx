import { BellRing, CalendarClock, Eye, HandCoins, KeyRound, MessagesSquare } from "lucide-react";
import { SectionHeading } from "@/components/badges";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/lib/format";
import { MIN_SAMPLE, type DistressIndex } from "@/lib/market";
import { formatDecimal } from "./shared";

/** Demand and completions on an ink panel. */
export async function DemandPanel({ index }: { index: DistressIndex }) {
  const t = await getT("market");
  const d = index.demand;
  const c = index.completed;
  const insufficient = t("insufficient", { min: MIN_SAMPLE });

  const tiles = [
    { icon: HandCoins, label: t("demand.offers30d"), value: formatNumber(d.offers30d), hint: t("demand.offers30dHint", { n: formatNumber(d.bidders30d) }) },
    { icon: Eye, label: t("demand.watching"), value: formatNumber(d.buyersWatching), hint: t("demand.watchingHint") },
    { icon: BellRing, label: t("demand.alerts"), value: formatNumber(d.alertSearches), hint: t("demand.alertsHint") },
    {
      icon: MessagesSquare,
      label: t("demand.perListing"),
      // two decimals: a ratio such as 19 offers ÷ 20 units should read 0.95, not round up to "1.0"
      value: d.offersPerListing == null ? null : formatDecimal(d.offersPerListing, 2),
      hint: d.offersPerListing == null ? insufficient : t("demand.perListingHint"),
    },
    { icon: KeyRound, label: t("demand.transferred"), value: formatNumber(c.transferred), hint: t("demand.transferredHint") },
    {
      icon: CalendarClock,
      label: t("demand.days"),
      value: c.medianDaysToTransfer == null ? null : `≈ ${formatNumber(Math.round(c.medianDaysToTransfer))}`,
      hint: c.medianDaysToTransfer == null ? insufficient : t("demand.daysHint"),
    },
  ];

  return (
    <section className="container-page reveal">
      <div className="relative isolate overflow-hidden rounded-3xl bg-ink-gradient px-5 py-10 text-primary-foreground shadow-lift sm:px-10 sm:py-14">
        <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-50 mask-fade-b" />
        <div aria-hidden className="absolute -start-24 -top-24 -z-10 h-80 w-80 bg-glow-gold opacity-50" />
        <SectionHeading tone="dark" eyebrow={t("demand.eyebrow")} title={t("demand.title")} sub={t("demand.sub")} />
        <dl className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {tiles.map((k) => (
            // One term and its value per tile, straight under the <dl>: the icon sits in the term, above it on phones
            // and in the tile's start column from sm up (out of the flow, the tile's padding leaving it room).
            <div key={k.label} className="glass-dark relative min-w-0 rounded-2xl p-4 sm:p-5 sm:ps-[4.75rem]">
              <dt className="text-xs leading-snug text-primary-foreground/75 sm:text-sm">
                <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/10 text-gold ring-1 ring-primary-foreground/15 sm:absolute sm:start-5 sm:top-5 sm:mb-0 sm:h-10 sm:w-10">
                  <k.icon className="h-5 w-5" aria-hidden />
                </span>
                {k.label}
              </dt>
              <dd className="mt-1">
                <span className="block text-2xl font-semibold leading-tight tabular sm:text-3xl">
                  {/* without a value the hint below says why */}
                  {k.value ?? (
                    <span aria-hidden className="text-primary-foreground/50">
                      —
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-snug text-primary-foreground/60">{k.hint}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
