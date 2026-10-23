import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { eq, sql } from "drizzle-orm";
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarClock,
  Eye,
  FileCheck2,
  Info,
  Landmark,
  MapPin,
  Maximize2,
  Mountain,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingDown,
} from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { WatchButton } from "@/components/WatchButton";
import { MotivationBadge, SampleBadge, StatusPill } from "@/components/badges";
import { Gallery } from "@/components/deals/Gallery";
import { OfferDialog } from "@/components/deals/OfferDialog";
import { InquiryDialog } from "@/components/InquiryForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import type { TFn, TKey } from "@/i18n/translator";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, FEES, PUBLIC_STATUSES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAED, formatDate, formatPct, formatQuarter, parseRefCode, refCode } from "@/lib/format";
import { getListingByRef, similarDeals, watchedIds } from "@/lib/listings";

async function load(ref: string) {
  const refNo = parseRefCode(ref);
  if (!refNo) return null;
  return getListingByRef(refNo);
}

/** Arabic/English community name; unknown names are shown as entered. */
function communityName(tc: TFn<"common">, name: string) {
  const key = `community.${name}` as TKey<"common">;
  const label = tc(key);
  return label === key ? name : label;
}

function developerName(tc: TFn<"common">, name: string) {
  return name === "Other" ? tc("developer.Other") : name;
}

export async function generateMetadata({ params }: PageProps<"/deals/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  const [row, t, tc, locale] = await Promise.all([load(ref), getT("deal"), getT("common"), getLocale()]);
  if (!row || !PUBLIC_STATUSES.includes(row.listing.status)) return { title: t("meta.unavailable"), robots: { index: false } };
  const l = row.listing;
  const a = analyzeDeal(l);
  const vars = { unit: tc(`unit.${l.unitType}`), project: l.projectName };
  const title =
    a.discountVsLaunch && a.discountVsLaunch > 0
      ? t("meta.titleDiscount", { ...vars, pct: Math.round(a.discountVsLaunch * 100) })
      : t("meta.title", vars);
  const description = t("meta.description", {
    developer: developerName(tc, l.developer),
    community: communityName(tc, l.community),
    paid: formatPct(a.paidPct),
    handover: formatQuarter(l.handoverDate, locale),
    upfront: formatAED(l.askingPrice, locale),
  });
  return {
    title,
    description,
    // The share image is the generated card in ./opengraph-image.tsx (price, discount, saving).
    openGraph: { title, description },
  };
}

export default async function DealDetail({ params }: PageProps<"/deals/[ref]">) {
  const { ref } = await params;
  const [row, user] = await Promise.all([load(ref), getCurrentUser()]);
  if (!row) notFound();
  const l = row.listing;
  const isOwner = user?.id === l.sellerId;
  const isAdmin = user?.role === "admin";
  if (!PUBLIC_STATUSES.includes(l.status) && !isOwner && !isAdmin) notFound();

  if (!isOwner && !isAdmin) {
    after(() => db.update(listings).set({ views: sql`${listings.views} + 1` }).where(eq(listings.id, l.id)));
  }

  const [similar, watched, t, tc, td, locale] = await Promise.all([
    similarDeals(l),
    watchedIds(user?.id),
    getT("deal"),
    getT("common"),
    getT("deals"),
    getLocale(),
  ]);
  const a = analyzeDeal(l);
  const community = communityName(tc, l.community);
  const developer = developerName(tc, l.developer);
  const discountPct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const paidWidth = Math.min(100, Math.max(0, Math.round(a.paidPct * 100)));
  const plan = l.paymentPlan ?? [];
  // Sample listings are seeded with English copy; show Arabic visitors a translated version.
  const arSample = l.isSample && locale === "ar";
  const description = arSample
    ? t("sample.description", {
        unit: tc(`unit.${l.unitType}`),
        project: l.projectName,
        developer,
        community,
        paid: formatPct(a.paidPct),
      })
    : l.description;
  const milestoneLabel = (label: string) => {
    if (!arSample) return label;
    if (label === "On handover") return t("plan.sample.onHandover");
    const n = /^Construction milestone (\d+)$/.exec(label)?.[1];
    return n ? t("plan.sample.milestone", { n }) : label;
  };
  const loginHref = `/login?next=${encodeURIComponent(`/deals/${refCode(l.refNo)}`)}`;

  const cost: [string, number][] = [
    [t("cost.asking"), l.askingPrice],
    [t("cost.remaining"), a.remaining],
    ...(FEES.payer === "buyer"
      ? ([
          [t("cost.fee", { brand: BRAND.name, rate: formatPct(FEES.commissionRate) }), a.commission],
          [t("cost.vat", { rate: formatPct(FEES.vatRate) }), a.vat],
        ] as [string, number][])
      : []),
    [t("cost.dld", { rate: formatPct(FEES.dldRate) }), a.dld],
    [t("cost.dldAdmin"), a.dldAdmin],
    [t("cost.noc"), a.noc],
  ];

  const facts: [string, string, typeof Mountain][] = [
    [t("facts.view"), (!arSample && l.view) || "—", Mountain],
    [tc("handover"), formatQuarter(l.handoverDate, locale), CalendarClock],
    [t("facts.originalPrice"), formatAED(l.originalPrice, locale), Tag],
    [t("facts.launchPrice"), l.launchPrice ? formatAED(l.launchPrice, locale) : t("facts.beingAssessed"), Sparkles],
  ];

  return (
    <div className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-gradient-to-b from-gold-soft/60 via-background to-background" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-grid-light opacity-40 mask-fade-b" />

      <div className="container-page pb-20 pt-6 sm:pt-8">
        <Link
          href="/deals"
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          {t("back")}
        </Link>

        {l.status !== "live" && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              {PUBLIC_STATUSES.includes(l.status)
                ? t("banner.underOffer")
                : t("banner.private", { status: tc(`listing.${l.status}`) })}
            </p>
          </div>
        )}

        <Gallery
          images={l.images}
          alt={`${l.projectName}, ${community}`}
          badge={
            <div className="absolute start-4 top-4 flex flex-wrap items-center gap-2 sm:start-5 sm:top-5">
              {discountPct != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground shadow-sm tabular">
                  <TrendingDown className="h-4 w-4" aria-hidden />
                  {tc("vsLaunch", { pct: discountPct })}
                </span>
              )}
              {l.verified && !l.isSample && (
                <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-primary-foreground">
                  <BadgeCheck className="h-4 w-4 text-success" aria-hidden />
                  {tc("verified")}
                </span>
              )}
              {l.isSample && (
                <SampleBadge className="self-center bg-gold px-2.5 py-1 text-[11px] text-gold-foreground shadow-sm ring-1 ring-white/40" />
              )}
            </div>
          }
        />

        <div className="mt-8 grid gap-y-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_23.75rem] lg:gap-x-12">
          {/* Title block (+ sample notice) */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <p className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-7 bg-gold" />
              {developer}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl">{l.projectName}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground sm:gap-x-3">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <MapPin className="h-4 w-4 text-gold" aria-hidden />
                {community}
              </span>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-4 w-4" aria-hidden />
                {tc(`unit.${l.unitType}`)}
              </span>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 tabular">
                <Maximize2 className="h-4 w-4" aria-hidden />
                {tc("sqft", { n: l.sizeSqft.toLocaleString("en-AE") })}
              </span>
              {l.floor ? (
                <>
                  <span aria-hidden className="hidden text-border sm:inline">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular">
                    <Building2 className="h-4 w-4" aria-hidden />
                    {tc("floor", { n: l.floor })}
                  </span>
                </>
              ) : null}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {l.verified && !l.isSample && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {t("badge.verified")}
                </span>
              )}
              {l.nocEligible && (
                <StatusPill tone="gold">
                  <ShieldCheck className="me-1 h-3.5 w-3.5" aria-hidden />
                  {t("badge.nocEligible")}
                </StatusPill>
              )}
              <MotivationBadge m={l.motivation} />
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" aria-hidden />
                {t(row.watchers === 1 ? "watchers.one" : "watchers.many", { n: row.watchers })}
              </span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span>
                {t("ref")}{" "}
                <bdi className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground tabular">{refCode(l.refNo)}</bdi>
              </span>
            </p>

            {l.isSample && (
              <div role="note" className="mt-6 flex items-start gap-4 rounded-2xl border border-gold/50 bg-gold-soft p-4 shadow-card sm:p-5">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-gold-foreground shadow-sm ring-1 ring-gold/40"
                >
                  <Info className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <SampleBadge />
                  <p className="mt-2 text-sm leading-relaxed text-gold-foreground">{tc("sampleNotice")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Price & actions — right after the title on mobile, a sticky column on desktop */}
          <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lift lg:sticky lg:top-24">
              <div className="relative overflow-hidden bg-ink-gradient px-6 pb-6 pt-5 text-primary-foreground">
                <div aria-hidden className="absolute inset-0 bg-dots-dark opacity-70 mask-fade-b" />
                <div aria-hidden className="absolute -end-16 -top-20 h-48 w-48 bg-glow-gold opacity-60" />
                <div className="relative">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{t("side.payNow")}</p>
                  <p className="mt-2 font-display text-4xl font-semibold leading-none tabular sm:text-[2.6rem]">
                    {formatAED(l.askingPrice, locale)}
                  </p>
                  <p className="mt-3 text-sm text-primary-foreground/75">
                    {t("side.thenPlan", { amount: formatAED(a.remaining, locale), developer })}
                  </p>
                </div>
              </div>
              <div className="p-6">
                {l.nextInstalmentDate && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 text-sm font-medium text-gold-foreground">
                    <CalendarClock className="h-4 w-4" aria-hidden />
                    {t("side.nextInstalment", { date: formatDate(l.nextInstalmentDate, locale) })}
                  </p>
                )}
                <div className={l.nextInstalmentDate ? "mt-5 grid gap-2.5" : "grid gap-2.5"}>
                  <OfferDialog
                    listingId={l.id}
                    project={l.projectName}
                    asking={l.askingPrice}
                    signedIn={!!user}
                    loginHref={loginHref}
                    disabledReason={isOwner ? t("offer.ownListing") : l.isSample ? t("offer.sampleListing") : undefined}
                  />
                  <WatchButton listingId={l.id} watching={watched.has(l.id)} variant="full" className="h-12" />
                  <InquiryDialog
                    listingId={l.id}
                    project={l.projectName}
                    defaults={user ? { name: user.fullName, email: user.email, phone: user.phone } : undefined}
                    triggerClassName="h-12 text-muted-foreground hover:text-foreground"
                  />
                </div>
                <p className="mt-5 flex items-start gap-2.5 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
                  <FileCheck2 className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  {t("side.feeNote")}
                </p>
              </div>
            </div>
          </aside>

          {/* Details */}
          <div className="min-w-0 space-y-14 lg:col-start-1 lg:row-start-2">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(([k, v, Icon]) => (
                <div key={k} className="rounded-2xl border border-border/80 bg-card p-4 shadow-card">
                  <dt className="text-xs text-muted-foreground">
                    <span aria-hidden className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    {k}
                  </dt>
                  <dd dir="auto" className="mt-1 text-sm font-semibold leading-snug tabular sm:text-base">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>

            {description && (
              <section>
                <h2 className="text-2xl font-semibold sm:text-3xl">{td("detail.about")}</h2>
                <p dir="auto" className="mt-4 max-w-prose whitespace-pre-line leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-semibold sm:text-3xl">{t("plan.title")}</h2>
              <div className="mt-5 rounded-3xl border border-border/80 bg-card p-5 shadow-card sm:p-6">
                <div className="grid grid-cols-2 items-end gap-4">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-ink" />
                      {t("plan.paid")}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular sm:text-2xl">{formatAED(l.amountPaid, locale)}</p>
                  </div>
                  <div className="min-w-0 text-end">
                    <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted ring-1 ring-inset ring-border" />
                      {t("plan.remaining")}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground/80 tabular sm:text-2xl">{formatAED(a.remaining, locale)}</p>
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={paidWidth}
                  aria-label={t("plan.paidPct", { pct: formatPct(a.paidPct) })}
                  className="mt-5 h-3 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/70"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ink via-ink to-gold rtl:bg-gradient-to-l"
                    style={{ width: `${paidWidth}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground tabular">
                  <span className="font-semibold text-foreground">{t("plan.paidPct", { pct: formatPct(a.paidPct) })}</span>
                  {l.nextInstalmentDate &&
                    ` · ${
                      l.nextInstalmentAmount
                        ? t("plan.nextWithAmount", {
                            amount: formatAED(l.nextInstalmentAmount, locale),
                            date: formatDate(l.nextInstalmentDate, locale),
                          })
                        : t("plan.nextOn", { date: formatDate(l.nextInstalmentDate, locale) })
                    }`}
                </p>

                {plan.length > 0 && (
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-border/80">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-10 ps-4 text-xs font-semibold uppercase tracking-wide">{t("plan.milestone")}</TableHead>
                          <TableHead className="hidden h-10 text-xs font-semibold uppercase tracking-wide sm:table-cell">{t("plan.due")}</TableHead>
                          <TableHead className="h-10 pe-4 text-end text-xs font-semibold uppercase tracking-wide">{t("plan.amount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plan.map((s, i) => (
                          <TableRow key={`${s.label}-${i}`}>
                            <TableCell className="py-3 ps-4 font-medium">
                              <span className="flex items-center gap-3">
                                <span
                                  aria-hidden
                                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold-soft text-[11px] font-semibold text-gold-foreground tabular"
                                >
                                  {i + 1}
                                </span>
                                <span className="min-w-0">
                                  <span dir="auto" className="block">
                                    {milestoneLabel(s.label)}
                                  </span>
                                  {/* Phones: the due date sits under the label instead of in its own column. */}
                                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground tabular sm:hidden">
                                    {formatDate(s.dueDate, locale)}
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="hidden whitespace-nowrap py-3 text-muted-foreground tabular sm:table-cell">{formatDate(s.dueDate, locale)}</TableCell>
                            <TableCell className="whitespace-nowrap py-3 pe-4 text-end font-semibold tabular">{formatAED(s.amount, locale)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold sm:text-3xl">{t("cost.title")}</h2>
              <div className="mt-5 grid overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <dl className="divide-y divide-border/60 px-5 py-3 text-sm sm:px-6 sm:py-4">
                  {cost.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="shrink-0 whitespace-nowrap font-medium tabular">{formatAED(v, locale)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-col gap-5 border-t border-border/70 bg-muted/40 p-5 sm:p-6 md:border-s md:border-t-0">
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("cost.total")}</dt>
                      <dd className="mt-1 text-3xl font-semibold tabular">{formatAED(a.totalCost, locale)}</dd>
                    </div>
                    {a.launchAllIn != null && (
                      <div className="border-t border-border/70 pt-4">
                        <dt className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
                          <Landmark className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                          {t("cost.launchAllIn", { rate: formatPct(FEES.dldRate) })}
                        </dt>
                        <dd className="mt-1 ps-[1.375rem] text-base font-semibold text-muted-foreground tabular">{formatAED(a.launchAllIn, locale)}</dd>
                      </div>
                    )}
                  </dl>
                  {a.savingVsLaunch != null && a.savingVsLaunch > 0 && (
                    <div className="relative mt-auto overflow-hidden rounded-2xl bg-success-soft p-4 text-success ring-1 ring-inset ring-success/25">
                      <div aria-hidden className="absolute -end-10 -top-10 h-28 w-28 rounded-full bg-success/10" />
                      <p className="relative inline-flex items-center gap-2 text-sm font-semibold">
                        <TrendingDown className="h-5 w-5" aria-hidden />
                        {t("cost.saving")}
                      </p>
                      <p className="relative mt-1 text-3xl font-semibold tabular">{formatAED(a.savingVsLaunch, locale)}</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t("cost.disclaimer")}</p>
            </section>
          </div>
        </div>

        {similar.length > 0 && (
          <section className="reveal mt-20 border-t border-border/70 pt-14">
            <h2 className="text-2xl font-semibold sm:text-3xl">{t("similar")}</h2>
            <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <DealCard key={s.id} deal={s} watching={watched.has(s.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
