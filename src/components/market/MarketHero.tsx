import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { formatAEDCompact, formatNumber, formatPct } from "@/lib/format";
import { MIN_LIVE, type DistressIndex } from "@/lib/market";
import { formatAsOf, isoPct } from "./shared";

/** Report cover: title, as-of time stamp (Dubai), one-line summary and the headline figure. */
export async function MarketHero({ index }: { index: DistressIndex }) {
  const [t, tc, locale] = await Promise.all([getT("market"), getT("common"), getLocale()]);
  const s = index.supply;
  const count = formatNumber(index.live);
  const available = formatNumber(s.available);
  const md = s.medianDiscount;

  const summary = !index.ready
    ? t("hero.summaryPending")
    : md == null
      ? t("hero.summaryValue", { count, available, value: formatAEDCompact(s.saleValue, locale) })
      : md >= 0
        ? t("hero.summary", { count, available, pct: isoPct(formatPct(md, 1)) })
        : t("hero.summaryPremium", { count, available, pct: isoPct(formatPct(-md, 1)) });

  return (
    <section className="relative isolate overflow-hidden bg-ink text-primary-foreground">
      <div aria-hidden className="absolute inset-0 -z-10 bg-ink-gradient" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-50 mask-fade-b" />
      <div aria-hidden className="absolute -end-40 -top-40 -z-10 h-[36rem] w-[36rem] bg-glow-gold opacity-40" />
      <div className="container-page grid items-center gap-10 pb-28 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 lg:pb-36 lg:pt-24">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
              {t("hero.eyebrow")}
            </p>
            {index.ready ? (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-success/70 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                {t("hero.live")}
              </p>
            ) : (
              <p className="inline-flex items-center rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">{t("pending.badge")}</p>
            )}
          </div>
          <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.05] text-primary-foreground sm:text-6xl lg:text-[4.25rem]">
            {t("hero.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-primary-foreground/80">{summary}</p>
          <p className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-primary-foreground/70">
            <Clock className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            <time dateTime={index.asOf.toISOString()} className="tabular">
              {t("hero.asOf", { date: formatAsOf(index.asOf, locale) })}
            </time>
            <span aria-hidden>·</span>
            <span>{t("hero.updates")}</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gold">
              <Link href="/deals">
                {tc("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="heroOutline">
              <a href="#methodology">{t("hero.method")}</a>
            </Button>
          </div>
        </div>

        <HeadlineCard index={index} />
      </div>
    </section>
  );
}

async function HeadlineCard({ index }: { index: DistressIndex }) {
  const [t, tc, locale] = await Promise.all([getT("market"), getT("common"), getLocale()]);
  const s = index.supply;
  const md = s.medianDiscount;
  const publisher = (
    <p className="mt-6 border-t border-primary-foreground/10 pt-4 text-xs text-primary-foreground/60">
      {t("hero.publishedBy", { company: locale === "ar" ? BRAND.companyAr : BRAND.company })}
      <span aria-hidden> · </span>
      <span className="whitespace-nowrap tabular">{tc("reraOrn", { orn: BRAND.orn })}</span>
    </p>
  );

  if (!index.ready) {
    const pct = Math.min(index.live / MIN_LIVE, 1) * 100;
    return (
      <div className="glass-dark relative rounded-3xl p-6 sm:p-8">
        <p className="text-sm font-medium text-primary-foreground/75" id="index-progress-label">
          {t("pending.progressLabel")}
        </p>
        <p className="mt-3 text-6xl font-semibold leading-none tabular sm:text-7xl">
          <span className="text-gradient-gold">{formatNumber(index.live)}</span>
          <span className="text-3xl text-primary-foreground/50 sm:text-4xl"> / {MIN_LIVE}</span>
        </p>
        <div
          role="progressbar"
          aria-labelledby="index-progress-label"
          aria-valuemin={0}
          aria-valuemax={MIN_LIVE}
          aria-valuenow={Math.min(index.live, MIN_LIVE)}
          aria-valuetext={t("pending.progress", { n: index.live, min: MIN_LIVE })}
          className="mt-6 h-2 overflow-hidden rounded-full bg-primary-foreground/10"
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">{t("pending.hint")}</p>
        {publisher}
      </div>
    );
  }

  const headline =
    md != null
      ? { label: md >= 0 ? t("hero.headline") : t("hero.headlinePremium"), value: formatPct(Math.abs(md), 1), basis: t("hero.headlineBasis", { n: s.withLaunch }) }
      : { label: t("hero.headlineUnits"), value: formatNumber(index.live), basis: null };

  // Demand next to the supply headline (the KPI strip below repeats the supply totals).
  const side: [string, string][] = [
    [t("hero.watching"), formatNumber(index.demand.buyersWatching)],
    [t("hero.offers30d"), formatNumber(index.demand.offers30d)],
  ];

  return (
    <div className="glass-dark relative rounded-3xl p-6 sm:p-8">
      <p className="text-sm font-medium text-primary-foreground/75">{headline.label}</p>
      <p className="mt-3 text-6xl font-semibold leading-none tabular sm:text-7xl lg:text-8xl">
        <span className="text-gradient-gold">{headline.value}</span>
      </p>
      {headline.basis && <p className="mt-3 text-sm text-primary-foreground/60 tabular">{headline.basis}</p>}
      <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-primary-foreground/10 pt-5">
        {side.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-primary-foreground/60">{k}</dt>
            <dd className="mt-1 text-xl font-semibold tabular sm:text-2xl">{v}</dd>
          </div>
        ))}
      </dl>
      {publisher}
    </div>
  );
}
