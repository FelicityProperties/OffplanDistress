import Link from "@/components/LocaleLink";
import { ArrowRight, BellRing, Eye, HandCoins, KeyRound, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/lib/format";
import { MIN_LIVE, MIN_SAMPLE, type DistressIndex } from "@/lib/market";

/** Shown instead of the report while fewer than MIN_LIVE real listings are on the market: the counts that exist + next steps. */
export async function IndexPending({ index }: { index: DistressIndex }) {
  const [t, tc] = await Promise.all([getT("market"), getT("common")]);
  // The live count and its progress towards MIN_LIVE are on the hero card; these are the other counts that exist today.
  // With one or two real listings, watchers and offers would be those listings' private figures, so they wait.
  const perListing = index.live >= MIN_SAMPLE;
  const counts = [
    { icon: Eye, label: t("demand.watching"), value: perListing ? index.demand.buyersWatching : null },
    { icon: BellRing, label: t("demand.alerts"), value: index.demand.alertSearches },
    { icon: HandCoins, label: t("demand.offers30d"), value: perListing ? index.demand.offers30d : null },
    { icon: KeyRound, label: t("demand.transferred"), value: index.completed.transferred },
  ];

  return (
    <div className="container-page relative z-10 -mt-16 sm:-mt-20">
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-lift sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
              {t("pending.badge")}
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">{t("pending.title", { min: MIN_LIVE })}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t("pending.body")}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 self-start">
            {counts.map((c) => (
              <div key={c.label} className="rounded-2xl border border-border/70 bg-secondary/40 p-4 sm:p-5">
                <dt className="flex items-start gap-2 text-xs leading-snug text-muted-foreground sm:text-sm">
                  <c.icon className="mt-px h-4 w-4 shrink-0" aria-hidden />
                  {c.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold tabular sm:text-3xl">{c.value == null ? "—" : formatNumber(c.value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 grid gap-4 border-t border-border/70 pt-8 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-border/70 p-5 sm:p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-foreground">
              <Tag className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-sans text-lg font-semibold">{t("pending.owners.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("pending.owners.body")}</p>
            <div className="mt-5">
              <Button asChild>
                <Link href="/sell">
                  {tc("sellMyUnit")} <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col rounded-2xl border border-gold/30 bg-gold-soft/50 p-5 sm:p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-gold-foreground">
              <Search className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-sans text-lg font-semibold">{t("pending.buyers.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("pending.buyers.body")}</p>
            <div className="mt-5">
              <Button asChild variant="gold">
                <Link href="/deals">
                  {tc("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
