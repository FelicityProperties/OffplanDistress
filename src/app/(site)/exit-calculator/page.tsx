import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, BellRing, ChevronDown, CirclePause, ExternalLink, FileText, Gavel, Handshake, Hourglass, Lock, Scale, Wallet, Zap } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/badges";
import { ExitCalculator } from "@/components/exit/ExitCalculator";
import { quickSalePct, RETENTION, TIERS, type Tier } from "@/components/exit/exit-math";
import { ltr } from "@/components/exit/ltr";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { BRAND, FEES } from "@/lib/config";
import { cn } from "@/lib/utils";

// The law on the Dubai Legislation Portal (Law No. 19 of 2020, which replaced Article 11). Full source list:
// src/components/exit/exit-math.ts.
const LAW_URL =
  "https://dlp.dubai.gov.ae/Legislation%20Reference/2020/Law%20No.%20(19)%20of%202020%20Amending%20Law%20No.%20(13)%20of%202008%20Regulating%20the%20Interim%20Real%20Property%20Register%20in%20the%20Emirate%20of%20Dubai.html";
// The Arabic text (Official Gazette No. 495) is the authoritative one.
const LAW_URL_AR =
  "https://dlp.dubai.gov.ae/Legislation%20Ar%20Reference/2020/%D9%82%D8%A7%D9%86%D9%88%D9%86%20%D8%B1%D9%82%D9%85%20(19)%20%D9%84%D8%B3%D9%86%D8%A9%202020%20%D8%A8%D8%AA%D8%B9%D8%AF%D9%8A%D9%84%20%D8%A8%D8%B9%D8%B6%20%D8%A3%D8%AD%D9%83%D8%A7%D9%85%20%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%20%D8%B1%D9%82%D9%85%20(13)%20%D9%84%D8%B3%D9%86%D8%A9%202008%20%D8%A8%D8%B4%D8%A3%D9%86%20%D8%AA%D9%86%D8%B8%D9%8A%D9%85%20%D8%A7%D9%84%D8%B3%D8%AC%D9%84%20%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%B1%D9%8A%20%D8%A7%D9%84%D9%85%D8%A8%D8%AF%D8%A6%D9%8A%20%D9%81%D9%8A%20%D8%A5%D9%85%D8%A7%D8%B1%D8%A9%20%D8%AF%D8%A8%D9%8A.html";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("exit");
  const title = t("meta.title");
  const description = t("meta.description");
  return { title, description, openGraph: { title, description } };
}

const TIER_DOT: Record<Tier, string> = {
  over80: "bg-destructive",
  from60to80: "bg-warning",
  under60: "bg-gold",
  notStarted: "bg-success",
};

export default async function ExitCalculatorPage() {
  const [t, locale] = await Promise.all([getT("exit"), getLocale()]);

  const paths = [
    { id: "keep", icon: Wallet },
    { id: "stop", icon: CirclePause },
    { id: "sell", icon: Handshake },
  ] as const;

  const steps = [
    { id: "step1", icon: BellRing },
    { id: "step2", icon: Hourglass },
    { id: "step3", icon: Gavel },
  ] as const;

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3", quickSalePct) },
    { q: t("faq.q4", { brand: BRAND.name }), a: FEES.payer === "buyer" ? t("faq.a4.buyer") : t("faq.a4.seller") },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <JsonLd data={faqLd} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
        <div aria-hidden className="absolute -end-40 -top-20 -z-10 h-[34rem] w-[34rem] bg-glow-gold opacity-40" />
        <div className="container-page pb-28 pt-16 sm:pb-32 sm:pt-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">{t("hero.title")}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#calculator">
                  {t("hero.ctaCalc")} <ArrowDown aria-hidden />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#law">
                  <Scale aria-hidden /> {t("hero.ctaLaw")}
                </a>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2 text-sm">
              {(
                [
                  [FileText, t("hero.point.law")],
                  [Zap, t("hero.point.live")],
                  [Lock, t("hero.point.private")],
                ] as const
              ).map(([Icon, label]) => (
                <li key={label} className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-3 py-1.5 text-muted-foreground shadow-card">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gold-foreground" aria-hidden />
                  {ltr(label)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Calculator (pulled up over the hero's lower edge) */}
      <section id="calculator" aria-label={t("calc.title")} className="container-page relative -mt-16 scroll-mt-24 sm:-mt-20">
        <ExitCalculator />
      </section>

      {/* The three paths */}
      <section className="container-page py-20 reveal sm:py-24">
        <SectionHeading eyebrow={t("paths.eyebrow")} title={t("paths.title")} sub={t("paths.sub")} />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {paths.map((p, i) => {
            const ours = p.id === "sell";
            return (
              <li
                key={p.id}
                className={cn(
                  "relative isolate overflow-hidden rounded-3xl p-6 sm:p-7",
                  ours ? "bg-ink-gradient text-primary-foreground shadow-lift" : "border border-border/80 bg-card shadow-card",
                )}
              >
                {ours && <div aria-hidden className="absolute -end-16 -top-16 -z-10 h-48 w-48 bg-glow-gold opacity-50" />}
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl",
                      ours ? "bg-primary-foreground/10 text-gold ring-1 ring-primary-foreground/15" : "bg-secondary text-foreground",
                    )}
                  >
                    <p.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className={cn("font-display text-3xl font-semibold tabular", ours ? "text-gold" : "text-muted-foreground/40")} aria-hidden>
                    {i + 1}
                  </span>
                </div>
                <h3 className={cn("mt-6 font-sans text-lg font-semibold", ours && "text-primary-foreground")}>{t(`paths.${p.id}.title`)}</h3>
                <p className={cn("mt-2 text-sm leading-relaxed", ours ? "text-primary-foreground/75" : "text-muted-foreground")}>{ltr(t(`paths.${p.id}.body`))}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* The law */}
      <section id="law" className="relative isolate scroll-mt-24 overflow-hidden bg-secondary py-20 sm:py-24">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light opacity-60 mask-fade-b" />
        <div className="container-page reveal">
          <SectionHeading eyebrow={t("law.eyebrow")} title={t("law.title")} sub={t("law.sub")} />

          <div className="mt-6 flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border/80 bg-card p-4 text-sm shadow-card sm:p-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
              <Scale className="h-4.5 w-4.5" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 basis-60 font-medium leading-relaxed">{ltr(t("law.citation"))}</p>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("law.reviewed")}</span>
          </div>

          {/* Procedure */}
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.id} className="rounded-3xl border border-border/80 bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-gradient text-gold">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular">{t("law.step", { n: i + 1 })}</p>
                </div>
                <h3 className="mt-5 font-sans text-lg font-semibold">{ltr(t(`law.${s.id}.title`))}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ltr(t(`law.${s.id}.body`))}</p>
              </li>
            ))}
          </ol>

          {/* Tiers */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card">
            <h3 className="border-b border-border/70 px-6 py-5 font-sans text-lg font-semibold sm:px-8">{t("law.tiers.title")}</h3>
            <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] gap-6 bg-secondary/60 px-8 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid" aria-hidden>
              <span>{t("law.col.progress")}</span>
              <span>{t("law.col.options")}</span>
            </div>
            <dl className="divide-y divide-border/70">
              {TIERS.map((tier) => (
                <div key={tier} className="grid gap-2 px-6 py-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] md:gap-6 md:px-8">
                  <dt className="flex items-center gap-2.5 font-semibold">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TIER_DOT[tier])} aria-hidden />
                    {ltr(t(`tier.${tier}`))}
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">
                    {RETENTION[tier] > 0 && (
                      <span className="me-2 inline-flex rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-foreground tabular">
                        <bdi dir="ltr">≤ {Math.round(RETENTION[tier] * 100)}%</bdi>
                        {tier === "over80" && <>&nbsp;{t("law.badge.ifCancelled")}</>}
                      </span>
                    )}
                    {ltr(t(`tier.${tier}.rule`))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <ul className="mt-6 grid gap-3 text-sm leading-relaxed md:grid-cols-2">
            {(["law.refund", "law.base", "law.maximum", "law.before2020"] as const).map((k) => (
              <li key={k} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 p-4">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                <span>{ltr(t(k))}</span>
              </li>
            ))}
          </ul>

          <a
            href={locale === "ar" ? LAW_URL_AR : LAW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-md text-sm font-medium text-foreground underline underline-offset-4 hover:text-gold-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("law.source")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page grid gap-10 py-20 reveal sm:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
        <div className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-start font-medium transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-7 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">{f.q}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform" aria-hidden />
              </summary>
              <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground sm:px-7">{ltr(f.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="container-page">
        <div className="flex flex-col gap-3 rounded-3xl border border-warning/25 bg-warning-soft/60 p-6 sm:flex-row sm:gap-5 sm:p-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-warning shadow-card">
            <Scale className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-base font-semibold">{t("disclaimer.title")}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{ltr(t("disclaimer.body"))}</p>
            <Link
              href="/how-it-works#sellers"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("cta.how")} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
