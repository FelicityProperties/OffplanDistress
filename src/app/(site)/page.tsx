import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Calculator,
  ChartNoAxesColumn,
  CheckCircle2,
  FileSignature,
  Info,
  Landmark,
  MessageCircle,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { communityName, DealCard } from "@/components/DealCard";
import { DealImage } from "@/components/DealImage";
import { FeeCalculator } from "@/components/FeeCalculator";
import { StepsFlow } from "@/components/Steps";
import { SampleBadge, SectionHeading } from "@/components/badges";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, FEES } from "@/lib/config";
import { BUYER_STEPS, FAQS, HERO_IMAGE, SELLER_STEPS } from "@/lib/content";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAEDCompact, formatQuarter, refCode } from "@/lib/format";
import { featuredDeals, marketStats, watchedIds, type ListingCard } from "@/lib/listings";
import { MIN_LIVE, MIN_SAMPLE } from "@/lib/market";
import type { Locale } from "@/i18n/config";

const TRUST = [
  [Landmark, "rera"],
  [BadgeCheck, "spa"],
  [ShieldCheck, "settlement"],
  [FileSignature, "noc"],
] as const;

const HERO_POINTS = ["rera", "spa", "dld"] as const;

/** The floating "live deal" card in the hero: the deepest discount on the market right now. */
async function HeroDeal({ deal, locale }: { deal: ListingCard; locale: Locale }) {
  const [t, tc] = await Promise.all([getT("home"), getT("common")]);
  const a = analyzeDeal(deal);
  const pct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  return (
    <Link
      href={`/deals/${refCode(deal.refNo)}`}
      className="group relative block w-full max-w-sm rounded-3xl bg-card p-3 shadow-lift ring-1 ring-primary-foreground/25 transition-transform duration-300 hover:-translate-y-1 animate-float"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        <DealImage src={deal.images[0]} alt={deal.projectName} className="transition-transform duration-700 group-hover:scale-105" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        <div className="absolute start-3 top-3 flex gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-success" aria-hidden />
            {t("preview.eyebrow")}
          </span>
          {pct != null && (
            <span className="rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-success-foreground tabular">
              {tc("vsLaunch", { pct })}
            </span>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-primary-foreground">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{deal.projectName}</p>
            <p className="truncate text-xs text-primary-foreground/75">
              {communityName(tc, deal.community)} · {tc(`unit.${deal.unitType}`)}
            </p>
          </div>
          {deal.isSample && <SampleBadge />}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-2 pb-1 pt-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("preview.payNow")}</p>
          <p className="mt-0.5 text-2xl font-semibold leading-none text-foreground tabular">{formatAEDCompact(deal.askingPrice, locale)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("preview.remaining")}</p>
          <p className="mt-0.5 text-2xl font-semibold leading-none text-foreground/75 tabular">{formatAEDCompact(a.remaining, locale)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 px-2 pb-1 pt-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {t("preview.handover", { q: formatQuarter(deal.handoverDate, locale) })}
        </span>
        {a.savingVsLaunch != null && a.savingVsLaunch > 0 ? (
          <span className="inline-flex items-center gap-1 font-semibold text-success tabular">
            <TrendingDown className="h-3.5 w-3.5" />
            {formatAEDCompact(a.savingVsLaunch, locale)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            {t("preview.cta")} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const [featured, stats, watched, t, tc, locale] = await Promise.all([
    featuredDeals(6),
    marketStats(),
    watchedIds(user?.id),
    getT("home"),
    getT("common"),
    getLocale(),
  ]);

  // Live figures on the same terms as the Distress Index (enough real listings, averages from at least MIN_SAMPLE
  // units); until then the strip shows facts about the service instead of numbers from a handful of units.
  const liveData = stats.live >= MIN_LIVE;
  const strip: [string, string][] = liveData
    ? [
        [t("stats.live"), stats.live.toLocaleString("en-AE")],
        [t("stats.value"), stats.value ? formatAEDCompact(stats.value, locale) : "—"],
        [
          t("stats.discount"),
          stats.avgDiscount != null && stats.withLaunch >= MIN_SAMPLE ? `${(stats.avgDiscount * 100).toFixed(1)}%` : "—",
        ],
        [t("stats.fee"), t("stats.feeValue")],
      ]
    : [
        [t("stats.fee"), t("stats.feeValue")],
        ...(FEES.payer === "buyer" ? [[t("stats.sellerFee"), t("stats.sellerFeeValue")] as [string, string]] : []),
        [t("stats.verification"), t("stats.verificationValue")],
        ...(BRAND.orn ? [[t("stats.orn"), BRAND.orn] as [string, string]] : []),
      ];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-40 mask-fade-b" />
        <div aria-hidden className="absolute -start-40 top-10 -z-10 h-[28rem] w-[28rem] bg-glow-gold opacity-40" />
        <div className="container-page grid items-center gap-12 pb-28 pt-20 sm:pt-28 lg:grid-cols-[1.25fr_1fr] lg:pb-36">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> {t("hero.badge")}
            </p>
            <h1 className="mt-6 max-w-3xl text-[2.6rem] font-semibold leading-[1.04] text-primary-foreground sm:text-6xl lg:text-7xl">
              {t("hero.titleStart")}
              <span className="text-gradient-gold">{t("hero.titleHighlight")}</span>
              {t("hero.titleEnd")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/80">{t("hero.sub")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="gold">
                <Link href="/deals">
                  {tc("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="heroOutline">
                <Link href="/sell">{tc("sellMyUnit")}</Link>
              </Button>
            </div>
            <ul className="mt-9 flex flex-col gap-2.5 text-sm text-primary-foreground/80 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {HERO_POINTS.map((id) => (
                <li key={id} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
                  {t(`hero.point.${id}`)}
                </li>
              ))}
            </ul>
          </div>
          {featured[0] && (
            <div className="hidden justify-center lg:flex">
              <HeroDeal deal={featured[0]} locale={locale} />
            </div>
          )}
        </div>
      </section>

      {/* Market stats, overlapping the hero */}
      <div className="container-page relative z-10 -mt-14">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 shadow-lift md:grid-cols-4">
          {strip.map(([label, value]) => (
            <div key={label} className="bg-card px-5 py-5 sm:px-6">
              <p className="text-xl font-semibold tabular sm:text-3xl">{value}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {liveData && <span className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-success" aria-hidden />}
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured deals */}
      <section className="container-page py-24 reveal">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow={t("featured.eyebrow")} title={t("featured.title")} sub={t("featured.sub")} />
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/deals">
              {t("featured.viewAll")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
        {featured.length ? (
          <>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((d) => (
                <DealCard key={d.id} deal={d} watching={watched.has(d.id)} />
              ))}
            </div>
            {featured.some((d) => d.isSample) && (
              <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {tc("sampleLegend")}
              </p>
            )}
          </>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed bg-card p-12 text-center">
            <p className="font-display text-xl font-semibold">{t("featured.emptyTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("featured.emptyBody")}</p>
            <Button asChild className="mt-6">
              <Link href="/signup">{t("featured.emptyCta")}</Link>
            </Button>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="relative isolate overflow-hidden bg-secondary py-24">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
        <div className="container-page reveal">
          <SectionHeading center eyebrow={tc("howItWorks")} title={t("how.title")} sub={t("how.sub")} />
          <div className="mt-14 grid gap-6">
            <StepsFlow title={t("how.sellers")} steps={SELLER_STEPS} tone="ink" />
            <StepsFlow title={t("how.buyers")} steps={BUYER_STEPS} tone="gold" />
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button asChild variant="outline" className="rounded-full bg-card">
              <Link href="/exit-calculator">
                <Calculator aria-hidden /> {t("how.exitLink")}
              </Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/market">
                <ChartNoAxesColumn aria-hidden /> {t("how.indexLink")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container-page grid items-center gap-12 overflow-x-clip py-24 reveal lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow={t("pricing.eyebrow")} title={t("pricing.title")} sub={t("pricing.sub")} />
          <Button asChild variant="link" className="mt-6 px-0">
            <Link href="/fees">
              {t("pricing.link")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
        <div className="relative">
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-glow-gold opacity-40" />
          <FeeCalculator />
        </div>
      </section>

      {/* Trust */}
      <section className="relative isolate overflow-hidden bg-ink-gradient py-24 text-primary-foreground">
        <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-50 mask-fade-b" />
        <div aria-hidden className="absolute -end-40 -top-20 -z-10 h-96 w-96 bg-glow-gold opacity-30" />
        <div className="container-page reveal">
          <SectionHeading tone="dark" eyebrow={t("trust.eyebrow")} title={t("trust.title")} />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col justify-between rounded-3xl p-7 glass-dark md:row-span-2">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-gold-foreground shadow-gold">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div className="mt-10">
                <p className="text-5xl font-semibold text-gradient-gold tabular">{t("trust.stat.value")}</p>
                <p className="mt-3 text-lg font-semibold">{t("trust.stat.label")}</p>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">{t("trust.stat.body")}</p>
              </div>
            </div>
            {TRUST.map(([Icon, id]) => (
              <div key={id} className="rounded-3xl p-6 glass-dark transition-colors hover:bg-primary-foreground/[0.07]">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-foreground/10 text-gold">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-5 font-semibold">{t(`trust.${id}.title`)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/70">{t(`trust.${id}.desc`)}</p>
              </div>
            ))}
          </div>
          {/* The licence details behind "RERA-licensed", spelled out */}
          <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-primary-foreground/10 bg-primary-foreground/10 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [t("licence.company"), locale === "ar" ? BRAND.companyAr : BRAND.company],
                [t("licence.orn"), BRAND.orn],
                [t("licence.tradeLicence"), BRAND.licence],
                [t("licence.broker"), `${locale === "ar" ? BRAND.broker.nameAr : BRAND.broker.name} · ${BRAND.broker.brn}`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-ink/80 px-5 py-4">
                <dt className="text-xs uppercase tracking-wider text-primary-foreground/55">{k}</dt>
                <dd className="mt-1 font-semibold text-primary-foreground tabular">
                  <bdi>{v}</bdi>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page grid gap-12 py-24 reveal lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          <div className="mt-8 rounded-2xl border bg-card p-6 shadow-card">
            <p className="font-semibold">{t("faq.more")}</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link href="/contact">
                <MessageCircle /> {t("faq.contact")}
              </Link>
            </Button>
          </div>
        </div>
        <Accordion type="single" collapsible className="rounded-2xl border bg-card px-6 shadow-card">
          {FAQS.map((id) => (
            <AccordionItem key={id} value={id} className="last:border-b-0">
              <AccordionTrigger className="py-5 text-start text-base font-semibold">{t(`faq.${id}.q`)}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">{t(`faq.${id}.a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <CtaBand />
    </>
  );
}
