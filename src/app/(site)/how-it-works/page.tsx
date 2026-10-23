import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Building2,
  EyeOff,
  FileCheck2,
  FileSignature,
  Handshake,
  KeyRound,
  Landmark,
  ShieldCheck,
  Upload,
  UserCheck,
  Wallet,
} from "lucide-react";
import { StepsFlow } from "@/components/Steps";
import { SectionHeading } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { BUYER_STEPS, SELLER_STEPS } from "@/lib/content";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("marketing");
  return { title: t("how.metaTitle"), description: t("how.metaDescription") };
}

// Step copy: marketing `how.<id>.title` / `how.<id>.desc`.
const steps = [
  { icon: Upload, id: "submit" },
  { icon: BadgeCheck, id: "verify" },
  { icon: Building2, id: "live" },
  { icon: Handshake, id: "offers" },
  { icon: FileSignature, id: "noc" },
  { icon: Wallet, id: "settlement" },
  { icon: Landmark, id: "transfer" },
] as const;

// Bento copy: marketing `how.bento.<id>.title` / `.desc`. `wide` tiles span two columns; the first is the dark feature tile.
const bento = [
  { icon: FileCheck2, id: "spa", tag: "verify", wide: true },
  { icon: FileSignature, id: "resale", tag: "verify", wide: false },
  { icon: UserCheck, id: "kyc", tag: "verify", wide: false },
  { icon: Landmark, id: "settlement", tag: "get", wide: false },
  { icon: KeyRound, id: "oqood", tag: "get", wide: false },
  { icon: EyeOff, id: "private", tag: "get", wide: true },
] as const;

export default async function HowItWorks() {
  const [t, th, tc] = await Promise.all([getT("marketing"), getT("home"), getT("common")]);
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
        <div aria-hidden className="absolute inset-x-0 -top-40 -z-10 mx-auto h-[30rem] max-w-3xl bg-glow-gold opacity-40" />
        <div className="container-page py-20 text-center sm:py-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            {t("how.eyebrow")}
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">{t("how.title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t("how.sub")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {(
              [
                ["#sellers", th("how.sellers"), "bg-ink"],
                ["#buyers", th("how.buyers"), "bg-gold"],
              ] as const
            ).map(([href, label, dot]) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-2 text-sm font-medium shadow-card transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
                {label}
                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* The two journeys */}
      <section className="container-page py-20 reveal sm:py-24">
        <SectionHeading center eyebrow={t("how.journeys.eyebrow")} title={th("how.title")} sub={th("how.sub")} />
        <div className="mt-14 grid gap-6">
          <div id="sellers" className="scroll-mt-28">
            <StepsFlow title={th("how.sellers")} steps={SELLER_STEPS} tone="ink" />
          </div>
          <div id="buyers" className="scroll-mt-28">
            <StepsFlow title={th("how.buyers")} steps={BUYER_STEPS} tone="gold" />
          </div>
        </div>
      </section>

      {/* Step-by-step timeline (overflow-clip, not -hidden, so the heading can stay sticky) */}
      <section className="relative isolate overflow-clip bg-secondary py-20 sm:py-24">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light opacity-60 mask-fade-b" />
        <div className="container-page grid gap-12 reveal lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading eyebrow={t("how.timeline.eyebrow")} title={t("how.timeline.title")} sub={t("how.timeline.sub")} />
          </div>
          <div className="relative">
            {/* connector behind the icon squares, visible in the gaps between cards */}
            <div aria-hidden className="absolute bottom-10 start-[2.6rem] top-10 border-s border-dashed border-border sm:start-[2.85rem]" />
            <ol className="relative space-y-4">
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  className="relative flex gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-card transition-shadow duration-300 hover:shadow-lift sm:gap-5 sm:p-6"
                >
                  <span
                    className={cn(
                      "relative grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-4 ring-card",
                      i === steps.length - 1 ? "bg-ink-gradient text-gold" : "bg-gold-soft text-gold-foreground",
                    )}
                  >
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular">
                      {t("how.step", { n: i + 1 })}
                    </p>
                    <h3 className="mt-1 font-sans text-lg font-semibold">{t(`how.${s.id}.title`)}</h3>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{t(`how.${s.id}.desc`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* What we verify / what you get */}
      <section className="container-page py-20 reveal sm:py-24">
        <SectionHeading eyebrow={t("how.bento.eyebrow")} title={t("how.bento.title")} sub={t("how.bento.sub")} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bento.map((b, i) => {
            const feature = i === 0;
            return (
              <li
                key={b.id}
                className={cn(
                  "card-lift relative isolate flex flex-col overflow-hidden rounded-3xl p-6 sm:p-7",
                  b.wide && "sm:col-span-2",
                  feature
                    ? "bg-ink-gradient text-primary-foreground shadow-lift"
                    : b.id === "settlement"
                      ? "border border-gold/30 bg-gold-soft/60 shadow-card"
                      : "border border-border/70 bg-card shadow-card",
                )}
              >
                {feature && (
                  <>
                    <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-50 mask-fade-b" />
                    <div aria-hidden className="absolute -end-20 -top-20 -z-10 h-64 w-64 bg-glow-gold opacity-50" />
                  </>
                )}
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl",
                      feature ? "bg-primary-foreground/10 text-gold ring-1 ring-primary-foreground/15" : "bg-secondary text-foreground",
                      b.id === "settlement" && "bg-gold text-gold-foreground",
                    )}
                  >
                    <b.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      feature
                        ? "bg-primary-foreground/10 text-gold"
                        : b.tag === "verify"
                          ? "bg-muted text-muted-foreground"
                          : "bg-success-soft text-success",
                    )}
                  >
                    {t(`how.bento.tag.${b.tag}`)}
                  </span>
                </div>
                <h3 className={cn("mt-8 font-sans text-lg font-semibold", feature && "text-xl text-primary-foreground sm:text-2xl")}>
                  {t(`how.bento.${b.id}.title`)}
                </h3>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed",
                    feature ? "max-w-md text-primary-foreground/75" : "text-muted-foreground",
                  )}
                >
                  {t(`how.bento.${b.id}.desc`)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="container-page pb-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-ink-gradient px-6 py-12 text-primary-foreground shadow-lift sm:px-12 sm:py-14">
          <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-60 mask-fade-b" />
          <div aria-hidden className="absolute -end-24 -top-24 -z-10 h-80 w-80 bg-glow-gold opacity-60" />
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:gap-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/10 text-gold ring-1 ring-primary-foreground/15">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-2xl font-semibold leading-tight text-primary-foreground sm:text-3xl">{t("how.ctaTitle")}</h2>
                <p className="mt-3 max-w-xl text-primary-foreground/75">{t("how.cta")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild size="lg" variant="gold">
                <Link href="/sell">
                  {tc("sellMyUnit")} <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="heroOutline">
                <Link href="/deals">{tc("browseDeals")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
