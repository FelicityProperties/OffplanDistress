import Link from "next/link";
import { ArrowRight, BadgeCheck, FileSignature, Landmark, ShieldCheck } from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { FeeCalculator } from "@/components/FeeCalculator";
import { StepsCard } from "@/components/Steps";
import { SectionHeading } from "@/components/badges";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BUYER_STEPS, FAQS, HERO_IMAGE, SELLER_STEPS } from "@/lib/content";
import { formatAEDCompact } from "@/lib/format";
import { featuredDeals, marketStats, watchedIds } from "@/lib/listings";

const TRUST = [
  [Landmark, "rera"],
  [BadgeCheck, "spa"],
  [ShieldCheck, "settlement"],
  [FileSignature, "noc"],
] as const;

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

  const strip: [string, string][] = [
    [t("stats.live"), stats.live.toLocaleString("en-AE")],
    [t("stats.value"), stats.value ? formatAEDCompact(stats.value, locale) : "—"],
    [t("stats.discount"), stats.avgDiscount != null ? `${(stats.avgDiscount * 100).toFixed(1)}%` : "—"],
    [t("stats.fee"), t("stats.feeValue")],
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="container-page pb-20 pt-28 sm:pt-36">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" /> {t("hero.badge")}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] text-primary-foreground sm:text-6xl">
            {t("hero.titleStart")}
            <span className="text-gold">{t("hero.titleHighlight")}</span>
            {t("hero.titleEnd")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">{t("hero.sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gold">
              <Link href="/deals">
                {tc("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="heroOutline">
              <Link href="/sell">{tc("sellMyUnit")}</Link>
            </Button>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 bg-ink/60 backdrop-blur">
          <div className="container-page grid grid-cols-2 gap-6 py-6 md:grid-cols-4">
            {strip.map(([l, v]) => (
              <div key={l}>
                <p className="text-2xl font-semibold text-primary-foreground tabular sm:text-3xl">{v}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-foreground/60">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow={t("featured.eyebrow")} title={t("featured.title")} sub={t("featured.sub")} />
          <Button asChild variant="outline">
            <Link href="/deals">
              {t("featured.viewAll")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
        {featured.length ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((d) => (
              <DealCard key={d.id} deal={d} watching={watched.has(d.id)} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed bg-card p-10 text-center">
            <p className="font-display text-lg font-semibold">{t("featured.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("featured.emptyBody")}</p>
            <Button asChild className="mt-5">
              <Link href="/signup">{t("featured.emptyCta")}</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="bg-secondary py-20">
        <div className="container-page">
          <SectionHeading center eyebrow={tc("howItWorks")} title={t("how.title")} />
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <StepsCard title={t("how.sellers")} steps={SELLER_STEPS} />
            <StepsCard title={t("how.buyers")} steps={BUYER_STEPS} />
          </div>
        </div>
      </section>

      <section className="container-page grid items-center gap-12 py-20 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow={t("pricing.eyebrow")} title={t("pricing.title")} sub={t("pricing.sub")} />
          <Button asChild variant="link" className="mt-4 px-0">
            <Link href="/fees">
              {t("pricing.link")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
        <FeeCalculator />
      </section>

      <section className="bg-ink-gradient py-20 text-primary-foreground">
        <div className="container-page">
          <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">{t("trust.title")}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(([Icon, id]) => (
              <div key={id} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6">
                <Icon className="h-6 w-6 text-gold" />
                <p className="mt-4 font-semibold">{t(`trust.${id}.title`)}</p>
                <p className="mt-1 text-sm text-primary-foreground/70">{t(`trust.${id}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page max-w-3xl py-20">
        <SectionHeading center eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((id) => (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger className="text-start text-base">{t(`faq.${id}.q`)}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{t(`faq.${id}.a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
