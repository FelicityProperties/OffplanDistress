import type { Metadata } from "next";
import { ArrowLeftRight, Building2, Check, Landmark, ShieldCheck, Wallet, X } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { FeeCalculator } from "@/components/FeeCalculator";
import { SectionHeading } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { BRAND, FEES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAED } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("marketing");
  return { title: t("fees.metaTitle"), description: t("fees.metaDescription") };
}

// The worked example: a unit bought for AED 2M with AED 600K paid; the seller accepts AED 500K for the equity.
const EXAMPLE = { originalPrice: 2_000_000, amountPaid: 600_000, askingPrice: 500_000, launchPrice: null };

export default async function FeesPage() {
  const [t, tc, th, locale] = await Promise.all([getT("marketing"), getT("common"), getT("home"), getLocale()]);
  const a = analyzeDeal(EXAMPLE);
  const aed = (v: number) => formatAED(v, locale);

  // Where the money goes, on the worked example's sale value (DLD and developer figures are estimates).
  const toUs = a.commission + a.vat;
  const toDld = a.dld + a.dldAdmin;
  const toDeveloper = a.noc;
  const split = toUs + toDld + toDeveloper;
  const compare = [
    { key: "us", icon: Wallet, label: t("fees.compare.us", { brand: BRAND.name }), note: t("fees.compare.usNote"), value: toUs, bar: "bg-gold", estimate: false },
    { key: "dld", icon: Landmark, label: t("fees.compare.dld"), note: t("fees.compare.dldNote"), value: toDld, bar: "bg-primary", estimate: true },
    {
      key: "developer",
      icon: Building2,
      label: t("fees.compare.developer"),
      note: t("fees.compare.developerNote"),
      value: toDeveloper,
      bar: "bg-muted-foreground/45",
      estimate: true,
    },
  ] as const;

  const included = [
    FEES.payer === "buyer" ? t("fees.freeForSellers") : t("fees.freeForBuyers"),
    t("fees.noUpfront"),
    t("fees.nocIncluded"),
    t("fees.trusteeIncluded"),
  ];

  const third = [
    [t("fees.third.dld"), t("fees.table.paidTo.dld"), t("fees.third.dldValue")],
    [t("fees.third.noc"), t("fees.table.paidTo.developer"), t("fees.third.nocValue")],
    [t("fees.third.trustee"), t("fees.table.paidTo.trustee"), t("fees.third.trusteeValue")],
  ] as const;

  return (
    <>
      {/* Hero: the statement and the live calculator */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light mask-fade-b" />
        <div aria-hidden className="absolute -end-40 top-0 -z-10 h-[34rem] w-[34rem] bg-glow-gold opacity-40" />
        <div className="container-page grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
              {tc("fees")}
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">{t("fees.title")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("fees.sub")}</p>
            <p className="mt-8 flex max-w-xl items-start gap-3 rounded-2xl border border-success/20 bg-success-soft/70 p-4 text-sm leading-relaxed text-foreground">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success text-success-foreground">
                <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{th("pricing.title")}</span>
                <span className="text-muted-foreground">{th("pricing.sub")}</span>
              </span>
            </p>
          </div>
          <div className="relative">
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-glow-gold opacity-50" />
            <FeeCalculator className="shadow-lift" />
          </div>
        </div>
      </section>

      {/* Comparison strip: paid to us vs paid to DLD / the developer */}
      <section className="container-page py-20 reveal">
        <SectionHeading
          eyebrow={t("fees.compare.eyebrow")}
          title={t("fees.compare.title")}
          sub={t("fees.compare.sub", { value: aed(a.saleValue) })}
        />
        <div aria-hidden className="mt-10 flex h-2.5 gap-1 overflow-hidden rounded-full">
          {compare.map((c) => (
            <span key={c.key} className={cn("h-full rounded-full", c.bar)} style={{ width: `${(c.value / split) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {compare.map((c) => {
            const ours = c.key === "us";
            return (
              <li
                key={c.key}
                className={cn(
                  "relative isolate overflow-hidden rounded-3xl p-6 sm:p-7",
                  ours ? "bg-ink-gradient text-primary-foreground shadow-lift" : "border border-border/70 bg-card shadow-card",
                )}
              >
                {ours && <div aria-hidden className="absolute -end-16 -top-16 -z-10 h-48 w-48 bg-glow-gold opacity-50" />}
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl",
                      ours ? "bg-primary-foreground/10 text-gold" : "bg-secondary text-foreground",
                    )}
                  >
                    <c.icon className="h-5 w-5" aria-hidden />
                  </span>
                  {c.estimate && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {t("fees.compare.estimate")}
                    </span>
                  )}
                </div>
                <p className={cn("mt-6 flex items-center gap-2 text-sm font-medium", ours ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", c.bar)} aria-hidden />
                  {c.label}
                </p>
                <p className={cn("mt-1 text-3xl font-semibold tabular", ours && "text-gradient-gold")}>
                  {c.estimate ? "≈ " : ""}
                  {aed(c.value)}
                </p>
                <p className={cn("mt-3 text-sm leading-relaxed", ours ? "text-primary-foreground/70" : "text-muted-foreground")}>{c.note}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Worked example + what's included */}
      <section className="container-page grid gap-6 pb-20 reveal lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
          <div className="border-b border-border/70 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">{t("fees.example.title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("fees.example.body", {
                price: aed(EXAMPLE.originalPrice),
                paid: aed(EXAMPLE.amountPaid),
                equity: aed(EXAMPLE.askingPrice),
              })}
            </p>
          </div>
          <dl className="divide-y divide-border/70 text-sm">
            {(
              [
                [t("fees.example.buyerPays"), aed(EXAMPLE.askingPrice), false],
                [t("fees.example.remaining"), aed(a.remaining), false],
                [t("fees.example.saleValue"), aed(a.saleValue), true],
                [t("fees.example.fee", { brand: BRAND.name }), aed(a.commission), false],
                [t("fees.example.vat"), aed(a.vat), false],
              ] as const
            ).map(([k, v, strong]) => (
              <div key={k} className={cn("flex justify-between gap-4 px-6 py-4 sm:px-8", strong && "bg-secondary/60")}>
                <dt className={cn("min-w-0", strong ? "font-semibold" : "text-muted-foreground")}>{k}</dt>
                <dd className={cn("shrink-0 whitespace-nowrap tabular", strong ? "font-semibold" : "font-medium")}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-2xl font-semibold">{t("fees.included.title")}</h2>
          <ul className="mt-6 space-y-4 text-sm">
            {included.map((x) => (
              <li key={x} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="pt-0.5 leading-relaxed">{x}</span>
              </li>
            ))}
            <li className="flex items-start gap-3 border-t border-border/70 pt-4 text-muted-foreground">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted">
                <X className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="pt-0.5 leading-relaxed">{t("fees.noDealNoFee")}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Who pays what */}
      <section className="container-page pb-4 reveal">
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
          <div className="border-b border-border/70 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">{t("fees.third.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("fees.third.sub")}</p>
            {/* The table is wider than a phone: say so, since the last column starts off-screen. */}
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground md:hidden">
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
              {t("fees.table.scrollHint")}
            </p>
          </div>
          <div
            className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            role="region"
            aria-label={t("fees.third.title")}
            tabIndex={0}
          >
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-6 py-3 text-start font-semibold sm:px-8">
                    {t("fees.table.cost")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-start font-semibold">
                    {t("fees.table.paidTo")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-start font-semibold sm:px-8">
                    {t("fees.table.amount")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {third.map(([cost, to, how]) => (
                  <tr key={cost}>
                    <th scope="row" className="px-6 py-4 text-start font-medium sm:px-8">
                      {cost}
                    </th>
                    <td className="px-6 py-4 text-muted-foreground">{to}</td>
                    <td className="px-6 py-4 text-muted-foreground sm:px-8">{how}</td>
                  </tr>
                ))}
                <tr className="bg-gold-soft/40">
                  <th scope="row" className="px-6 py-4 text-start font-semibold sm:px-8">
                    {t("fees.example.fee", { brand: BRAND.name })}
                  </th>
                  <td className="px-6 py-4 font-medium">{BRAND.name}</td>
                  <td className="px-6 py-4 font-medium sm:px-8">{t("fees.third.oursValue")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
