import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarClock,
  Eye,
  FileCheck2,
  Flag,
  Info,
  Landmark,
  MapPin,
  Maximize2,
  MessageCircle,
  Mountain,
  Phone,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingDown,
} from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { JsonLd } from "@/components/JsonLd";
import { WatchButton } from "@/components/WatchButton";
import { MotivationBadge, SampleBadge, StatusPill } from "@/components/badges";
import { Gallery } from "@/components/deals/Gallery";
import { OfferDialog } from "@/components/deals/OfferDialog";
import { InquiryDialog } from "@/components/InquiryForm";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { listings, offers } from "@/db/schema";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { getLocale, getT } from "@/i18n/server";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, brandName, brokerName, FEES, PUBLIC_STATUSES } from "@/lib/config";
import { richText } from "@/content/legal/rich-text";
import { analyzeDeal, planSchedule } from "@/lib/deal-math";
import { formatAED, formatDate, formatPct, formatQuarter, formatUSDFromAED, parseRefCode, refCode } from "@/lib/format";
import { communityName, developerName } from "@/lib/place-names";
import { issueFormToken } from "@/lib/spam";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { getListingByRef, similarDeals, watchedIds } from "@/lib/listings";
import { dubaiToday, isAdvertised, permitQrSvg } from "@/lib/permits";

async function load(ref: string) {
  const refNo = parseRefCode(ref);
  if (!refNo) return null;
  return getListingByRef(refNo);
}

export async function generateMetadata({ params }: PageProps<"/deals/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  const [row, t, tc, locale] = await Promise.all([load(ref), getT("deal"), getT("common"), getLocale()]);
  // Not an advert (a private status, or a DLD permit / Form A that has run out): never indexed, nothing about the unit.
  if (!row || !isAdvertised(row.listing)) return { title: t("meta.unavailable"), robots: { index: false }, alternates: null };
  const l = row.listing;
  const a = analyzeDeal(l);
  const vars = { unit: tc(`unit.${l.unitType}`), project: l.projectName };
  const title =
    a.discountVsLaunch && a.discountVsLaunch > 0
      ? t("meta.titleDiscount", { ...vars, pct: Math.round(a.discountVsLaunch * 100) })
      : t("meta.title", vars);
  const description = t("meta.description", {
    developer: developerName(tc, l.developer, l.developerOther),
    community: communityName(tc, l.community, l.communityOther),
    paid: formatPct(a.paidPct),
    handover: formatQuarter(l.handoverDate, locale),
    upfront: formatAED(l.askingPrice, locale),
  });
  // One address per deal and language: "/deals/od-1001" and "/deals/OD-1001" are the same page, canonical OD-1001.
  const alternates = alternatesFor(`/deals/${refCode(l.refNo)}`, locale);
  return {
    title,
    description,
    alternates,
    // The share image is the generated card in ./opengraph-image.tsx (price, discount, saving), not the site's.
    openGraph: { ...openGraphBase(locale, { siteImage: false }), title, description, url: alternates?.canonical },
    // Sample listings are illustrations, not real adverts: keep them out of search results.
    ...(l.isSample ? { robots: { index: false }, alternates: null } : {}),
  };
}

export default async function DealDetail({ params }: PageProps<"/deals/[ref]">) {
  const { ref } = await params;
  const [row, user] = await Promise.all([load(ref), getCurrentUser()]);
  if (!row) notFound();
  const l = row.listing;
  // A listing our team entered has no seller-side owner until its seller confirms it (ownListingSql in
  // src/lib/dashboard.ts): the account it was filed under may not be theirs.
  const isOwner = user?.id === l.sellerId && !(l.createdByStaff && !l.ownershipConfirmedAt);
  const isAdmin = user?.role === "admin";
  // Only an advert is public. Anything else (including a live listing whose DLD permit or Form A ran out before the
  // daily job paused it) is a private page for its seller and our team: no offers, no listing markup.
  const advertised = isAdvertised(l);
  if (!advertised && !isOwner && !isAdmin) notFound();

  if (!isOwner && !isAdmin) {
    after(() => db.update(listings).set({ views: sql`${listings.views} + 1` }).where(eq(listings.id, l.id)));
  }

  const [similar, watched, t, tc, td, tl, locale, myAccepted] = await Promise.all([
    similarDeals(l),
    watchedIds(user?.id),
    getT("deal"),
    getT("common"),
    getT("deals"),
    getT("legal"),
    getLocale(),
    // The signed-in buyer holds the accepted offer: the deal is theirs (no backup offer from them, makeOffer agrees).
    user && !isOwner
      ? db
          .select({ id: offers.id })
          .from(offers)
          .where(and(eq(offers.listingId, l.id), eq(offers.buyerId, user.id), eq(offers.status, "accepted")))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const yourDeal = myAccepted.length > 0;
  const a = analyzeDeal(l);
  // The Trakheesi QR, drawn on our server from the stored dubailand.gov.ae link (samples have no permit; without a
  // number there is nothing to verify).
  const permitQr = l.isSample || !l.dldPermit ? null : await permitQrSvg(l.dldPermitUrl);
  // No number entered, but the account owner attested that Felicity holds the permit (src/lib/attestation.ts): the
  // advert says so, with no verification link. Nothing about the attestation itself is shown.
  const permitHeld = !l.isSample && !l.dldPermit && l.permitAttestedAt != null;
  const community = communityName(tc, l.community, l.communityOther);
  const developer = developerName(tc, l.developer, l.developerOther);
  const discountPct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const paidWidth = Math.min(100, Math.max(0, Math.round(a.paidPct * 100)));
  const plan = l.paymentPlan ?? [];
  // Sample listings are seeded with English copy; Arabic and Chinese visitors get a translated version.
  const translatedSample = l.isSample && locale !== DEFAULT_LOCALE;
  const description = translatedSample
    ? t("sample.description", {
        unit: tc(`unit.${l.unitType}`),
        project: l.projectName,
        developer,
        community,
        paid: formatPct(a.paidPct),
      })
    : l.description;
  const milestoneLabel = (label: string) => {
    // The sell form names new rows itself, in the seller's language ("Next instalment", "القسط 2", "第 2 期"): app
    // copy most sellers keep, shown in the visitor's language. Anything the seller typed stays as written.
    const trimmed = label.trim();
    if (/^(?:Next instalment|القسط التالي|下一期)$/i.test(trimmed)) return t("plan.defaultNext");
    const nth = /^(?:(?:Instalment|القسط) (\d{1,3})|第 ?(\d{1,3}) ?期)$/i.exec(trimmed);
    if (nth) return t("plan.defaultNth", { n: Number(nth[1] ?? nth[2]) });
    if (!translatedSample) return label;
    if (label === "On handover") return t("plan.sample.onHandover");
    const n = /^Construction milestone (\d+)$/.exec(label)?.[1];
    return n ? t("plan.sample.milestone", { n }) : label;
  };
  const loginHref = `/login?next=${encodeURIComponent(`/deals/${refCode(l.refNo)}`)}`;

  // Arrears with the developer (overdue instalments + late fees): cleared before the NOC, so paid on transfer day.
  // Known once our team checked the statement (arrearsCheckedAt) or the seller gave a figure; null amounts = unknown.
  const arrearsKnown = l.overdueAmount != null || l.overduePenalty != null;
  const arrearsChecked = arrearsKnown && l.arrearsCheckedAt != null;
  const checkedOn = formatDate(l.arrearsCheckedAt, locale);
  const arrearsRow: [string, number | null] =
    arrearsKnown && a.arrears > 0
      ? [arrearsChecked ? t("cost.arrears", { date: checkedOn }) : t("cost.arrearsSeller"), a.arrears]
      : arrearsChecked
        ? [t("cost.upToDate", { date: checkedOn }), 0]
        : [t("cost.arrearsUnknown"), null];
  // "Your cash timeline": the listed plan from today, in Dubai dates.
  const today = dubaiToday();
  const schedule = planSchedule(plan, l.handoverDate, today, {
    date: l.nextInstalmentDate,
    amount: l.nextInstalmentAmount,
  });
  // The seller's "next instalment" is only shown while it is ahead: once its date has passed (paid, or now overdue)
  // the next one is the first instalment of the listed plan still to come, as planSchedule reads it.
  const nextInstalment: { date: string; amount: number | null } | null = !l.nextInstalmentDate
    ? null
    : l.nextInstalmentDate >= today
      ? { date: l.nextInstalmentDate, amount: l.nextInstalmentAmount }
      : (plan
          .filter((p) => p.amount > 0 && p.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(p.dueDate) && p.dueDate >= today)
          .map((p) => ({ date: p.dueDate as string, amount: p.amount }))
          .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0))[0] ?? null);
  // The rest of the balance still owed after transfer that no listed future instalment covers.
  const unlisted = a.remainingAfterTransfer - schedule.future;
  // Part of that is usually listed instalments whose date has passed since the listing was made, beyond the overdue
  // amount on transfer day: paid since, or overdue. Those get their own step, so they don't read as balance the plan
  // pays later; only what is left is "schedule not listed".
  const pastDueOpen = Math.min(Math.max(schedule.pastDue.sum - a.overdue, 0), Math.max(unlisted, 0));
  const unscheduled = unlisted - pastDueOpen;
  const dueSoon = schedule.dueSoon;
  const dueSoonText = dueSoon
    ? richText(t(dueSoon.amount ? "side.dueSoon" : "side.dueSoonNoAmount"), {
        amount: <bdi className="font-semibold tabular">{formatAED(dueSoon.amount, locale)}</bdi>,
        date: <bdi className="font-semibold">{formatDate(dueSoon.dueDate, locale)}</bdi>,
      })
    : null;
  const instalments = (count: number) =>
    count === 1 ? t("timeline.instalments.one") : t("timeline.instalments.many", { count });
  const timeline: { key: string; title: string; when: string; amount: number; tag?: string }[] = [
    ...(pastDueOpen > 0
      ? [
          {
            key: "pastDue",
            title: t("timeline.pastDueStep"),
            when: arrearsChecked ? t("timeline.pastDueStepChecked", { date: checkedOn }) : t("timeline.pastDueStepHint"),
            amount: pastDueOpen,
          },
        ]
      : []),
    ...(schedule.preHandover.sum > 0
      ? [
          {
            key: "pre",
            title: t("timeline.pre"),
            when: [
              instalments(schedule.preHandover.count),
              schedule.preHandover.months != null && schedule.preHandover.months >= 2
                ? t("timeline.overMonths", { months: schedule.preHandover.months })
                : null,
            ]
              .filter(Boolean)
              .join(" · "),
            amount: schedule.preHandover.sum,
          },
        ]
      : []),
    ...(schedule.atHandover.sum > 0
      ? [
          {
            key: "handover",
            title: t("timeline.handover"),
            when: formatQuarter(l.handoverDate, locale),
            amount: schedule.atHandover.sum,
            tag: t("timeline.mortgage"),
          },
        ]
      : []),
    ...(schedule.postHandover.sum > 0
      ? [{ key: "post", title: t("timeline.post"), when: instalments(schedule.postHandover.count), amount: schedule.postHandover.sum }]
      : []),
    ...(schedule.undated.sum > 0
      ? [{ key: "undated", title: t("timeline.undated"), when: instalments(schedule.undated.count), amount: schedule.undated.sum }]
      : []),
    ...(unscheduled > 0
      ? [{ key: "unlisted", title: t("timeline.unlisted"), when: t("timeline.unlistedHint"), amount: unscheduled }]
      : []),
  ];

  const cost: [string, number | null][] = [
    [t("cost.asking"), l.askingPrice],
    arrearsRow,
    a.overdue > 0 ? [t("cost.remainingAfterArrears"), a.remainingAfterTransfer] : [t("cost.remaining"), a.remaining],
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
    [t("facts.view"), (!translatedSample && l.view) || "—", Mountain],
    [tc("handover"), formatQuarter(l.handoverDate, locale), CalendarClock],
    [t("facts.originalPrice"), formatAED(l.originalPrice, locale), Tag],
    [t("facts.launchPrice"), l.launchPrice ? formatAED(l.launchPrice, locale) : t("facts.beingAssessed"), Sparkles],
  ];

  // Structured data for search engines — real listings only (samples aren't for sale).
  // Only an available real advert gets listing markup. The price is the whole unit (equity + remaining plan),
  // not the equity payment, so search results never show the unit for less than it costs.
  const listingJsonLd =
    !l.isSample && l.status === "live" && advertised
      ? {
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: `${l.projectName} — ${tc(`unit.${l.unitType}`)}, ${community}`,
          url: `${siteUrl()}${localePath(`/deals/${refCode(l.refNo)}`, locale)}`,
          datePosted: (l.publishedAt ?? l.createdAt).toISOString(),
          // Uploaded photos are served from /api/files/… on this site: absolute addresses, which search engines need.
          image: l.images
            .filter((u) => u.startsWith("http") || (u.startsWith("/") && !u.startsWith("//")))
            .slice(0, 4)
            .map((u) => (u.startsWith("/") ? `${siteUrl()}${u}` : u)),
          description: l.description || undefined,
          offers: { "@type": "Offer", price: a.saleValue, priceCurrency: "AED", availability: "https://schema.org/InStock" },
          provider: { "@id": `${siteUrl()}/#organization` },
        }
      : null;

  return (
    <div className="relative isolate">
      {listingJsonLd && <JsonLd data={listingJsonLd} />}
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

        {(l.status !== "live" || !advertised) && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              {advertised
                ? yourDeal
                  ? richText(t("banner.yourOffer"), {
                      link: (
                        <Link
                          href="/dashboard/offers?tab=sent"
                          className="font-semibold underline decoration-gold-foreground/40 underline-offset-4 hover:decoration-gold-foreground"
                        >
                          {t("banner.yourOfferLink")}
                        </Link>
                      ),
                    })
                  : t("banner.underOffer")
                : PUBLIC_STATUSES.includes(l.status)
                  ? t("banner.permitLapsed")
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
            {/* wrap-anywhere: a developer or community name the seller typed for "Other" may be one long word. */}
            <p className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground wrap-anywhere">
              <span aria-hidden className="h-px w-7 shrink-0 bg-gold" />
              {developer}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl">{l.projectName}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground sm:gap-x-3">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground wrap-anywhere">
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
            {/* On a short desktop screen the card scrolls inside itself (like the /deals filter panel), so the permit,
                QR code and report link at its foot stay reachable while it is stuck. */}
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lift [scrollbar-width:thin] lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
              <div className="relative overflow-hidden bg-ink-gradient px-6 pb-6 pt-5 text-primary-foreground">
                <div aria-hidden className="absolute inset-0 bg-dots-dark opacity-70 mask-fade-b" />
                <div aria-hidden className="absolute -end-16 -top-20 h-48 w-48 bg-glow-gold opacity-60" />
                <div className="relative">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{t("side.payNow")}</p>
                  <p className="mt-2 font-display text-4xl font-semibold leading-none tabular sm:text-[2.6rem]">
                    {formatAED(l.askingPrice, locale)}
                  </p>
                  <p className="mt-1.5 text-xs text-primary-foreground/60 tabular">
                    {t("side.usd", { amount: formatUSDFromAED(l.askingPrice, locale) })}
                  </p>
                  <p className="mt-3 text-sm text-primary-foreground/75 wrap-anywhere">
                    {t("side.thenPlan", { amount: formatAED(a.remainingAfterTransfer, locale), developer })}
                  </p>
                  {/* Next to the equity figure (unchanged): what the buyer actually needs on the day, an estimate. */}
                  <div className="mt-4 border-t border-primary-foreground/15 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{t("side.cashAtTransfer")}</p>
                    <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="font-display text-2xl font-semibold leading-none tabular" data-cash-at-transfer={a.cashToClose}>
                        {t("side.approx", { amount: formatAED(a.cashToClose, locale) })}
                      </p>
                      <a
                        href="#cash-timeline"
                        className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-gold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        {t("side.timelineLink")}
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </div>
                    <p className="mt-1.5 text-xs text-primary-foreground/60">
                      {t(a.arrears > 0 ? "side.cashNoteArrears" : "side.cashNote")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {dueSoon ? (
                  // An instalment due within the transfer window: whoever pays it has to be agreed before the MOU.
                  <div
                    role="note"
                    data-due-soon={dueSoon.dueDate}
                    className="flex items-start gap-2.5 rounded-2xl border border-gold/50 bg-gold-soft px-3.5 py-2.5 text-sm text-gold-foreground"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {/* The transfer-window hint is in the timeline's copy of this note, to keep the card short. */}
                    <p className="min-w-0 font-medium leading-snug">{dueSoonText}</p>
                  </div>
                ) : (
                  nextInstalment && (
                    <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 text-sm font-medium text-gold-foreground">
                      <CalendarClock className="h-4 w-4" aria-hidden />
                      {t("side.nextInstalment", { date: formatDate(nextInstalment.date, locale) })}
                    </p>
                  )
                )}
                <div className={dueSoon || nextInstalment ? "mt-5 grid gap-2.5" : "grid gap-2.5"}>
                  {/* Offers only on an advert (the server refuses any other way too), and not from the buyer whose
                      offer was accepted: the deal is theirs, followed in their dashboard. */}
                  {advertised && yourDeal && (
                    <Link href="/dashboard/offers?tab=sent" className={buttonVariants({ variant: "gold", size: "lg", className: "w-full" })}>
                      {t("offer.yourDeal")}
                    </Link>
                  )}
                  {advertised && !yourDeal && (
                    <OfferDialog
                      listingId={l.id}
                      project={l.projectName}
                      asking={l.askingPrice}
                      signedIn={!!user}
                      loginHref={loginHref}
                      disabledReason={isOwner ? t("offer.ownListing") : l.isSample ? t("offer.sampleListing") : undefined}
                    />
                  )}
                  <WatchButton listingId={l.id} watching={watched.has(l.id)} variant="full" className="h-12" />
                  {/* A sample is an illustration, so nothing on it invites a viewing or an enquiry. */}
                  {!l.isSample && (
                    <InquiryDialog
                      listingId={l.id}
                      project={l.projectName}
                      defaults={user ? { name: user.fullName, email: user.email, phone: user.phone } : undefined}
                      triggerClassName="h-12 text-muted-foreground hover:text-foreground"
                      formToken={issueFormToken()}
                    />
                  )}
                  {!l.isSample && (BRAND.whatsapp || BRAND.phone) && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {BRAND.whatsapp && (
                        <a
                          href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(
                            t("side.waMessage", {
                              ref: refCode(l.refNo),
                              project: l.projectName,
                              url: `${siteUrl()}${localePath(`/deals/${refCode(l.refNo)}`, locale)}`,
                            }),
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ variant: "outline", className: "h-11 rounded-xl" })}
                        >
                          <MessageCircle className="text-[#1DA851]" aria-hidden /> {t("side.whatsapp")}
                        </a>
                      )}
                      {BRAND.phone && (
                        <a
                          href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
                          className={buttonVariants({ variant: "outline", className: cn("h-11 rounded-xl", !BRAND.whatsapp && "col-span-2") })}
                        >
                          <Phone aria-hidden /> {t("side.call")}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-5 flex items-start gap-2.5 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
                  <FileCheck2 className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  {t("side.feeNote")}
                </p>
                {/* RERA advertising rules: office ORN, broker BRN and the DLD permit on every listing */}
                <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-foreground/70">
                    <Landmark className="h-3.5 w-3.5 text-gold-foreground" aria-hidden />
                    {t(l.isSample ? "listedBy.titleSample" : "listedBy.title")}
                  </p>
                  <p className="mt-1.5">
                    <bdi>{t("listedBy.office", { company: brandName(locale), orn: BRAND.orn })}</bdi>
                  </p>
                  {!l.isSample && (
                    <p>{t("listedBy.broker", { name: brokerName(locale), brn: BRAND.broker.brn })}</p>
                  )}
                  <p className="tabular">
                    {l.isSample
                      ? t("listedBy.sample")
                      : l.dldPermit
                        ? t("listedBy.permit", { permit: l.dldPermit })
                        : permitHeld
                          ? t("listedBy.permitHeld", { company: brandName(locale), orn: BRAND.orn })
                          : null}
                  </p>
                  {!l.isSample && l.dldPermitExpiresAt && (
                    <p className="tabular">{t("listedBy.permitValid", { date: formatDate(l.dldPermitExpiresAt, locale) })}</p>
                  )}
                  {permitQr && l.dldPermitUrl && (
                    <a
                      href={l.dldPermitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group mt-3 flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* qrcode's SVG is path data only (nothing from the link appears as markup); white so it scans in dark mode too */}
                      <span
                        aria-hidden
                        className="block h-24 w-24 shrink-0 rounded-lg bg-white p-2 shadow-sm ring-1 ring-border [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: permitQr }}
                      />
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 group-hover:underline">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold-foreground" aria-hidden />
                        {t("listedBy.verify")}
                        <span className="sr-only"> {tl("newTab")}</span>
                      </span>
                    </a>
                  )}
                  {BRAND.email && !l.isSample && (
                    <a
                      href={`mailto:${BRAND.email}?subject=${encodeURIComponent(t("listedBy.reportSubject", { ref: refCode(l.refNo) }))}`}
                      className="mt-2 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:text-foreground hover:underline"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden /> {t("listedBy.report")}
                    </a>
                  )}
                </div>
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
                  {nextInstalment &&
                    ` · ${
                      nextInstalment.amount
                        ? t("plan.nextWithAmount", {
                            amount: formatAED(nextInstalment.amount, locale),
                            date: formatDate(nextInstalment.date, locale),
                          })
                        : t("plan.nextOn", { date: formatDate(nextInstalment.date, locale) })
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

            <section id="cash-timeline" aria-labelledby="cash-timeline-title" className="scroll-mt-28">
              <h2 id="cash-timeline-title" className="text-2xl font-semibold sm:text-3xl">
                {t("timeline.title")}
              </h2>
              <p className="mt-2 max-w-prose text-sm text-muted-foreground">{t("timeline.sub")}</p>
              {dueSoon && (
                <div
                  role="note"
                  className="mt-5 flex items-start gap-3 rounded-2xl border border-gold/50 bg-gold-soft p-4 text-sm text-gold-foreground"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{dueSoonText}</p>
                    <p className="mt-1 text-xs opacity-80">{t("side.dueSoonHint")}</p>
                  </div>
                </div>
              )}
              <div className="mt-5 rounded-3xl border border-border/80 bg-card p-5 shadow-card sm:p-6">
                <ol aria-label={t("timeline.label")} className="space-y-0">
                  {[
                    {
                      key: "transfer",
                      title: t("timeline.transfer"),
                      when: richText(t("timeline.transferWhen"), {
                        from: <bdi>{formatDate(schedule.transferDay.from, locale)}</bdi>,
                        to: <bdi>{formatDate(schedule.transferDay.to, locale)}</bdi>,
                      }),
                      amount: t("side.approx", { amount: formatAED(a.cashToClose, locale) }),
                      tag: undefined as string | undefined,
                      lead: true,
                    },
                    ...timeline.map((s) => ({ ...s, amount: formatAED(s.amount, locale), lead: false })),
                  ].map((s, i, all) => (
                    <li key={s.key} data-step={s.key} className="relative ps-10 pb-6 last:pb-0">
                      {/* The rail runs down the start side (right in Arabic), from one marker to the next. */}
                      {i < all.length - 1 && <span aria-hidden className="absolute start-[0.8125rem] top-7 bottom-0 w-px bg-border" />}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute start-0 top-0.5 grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold tabular ring-4 ring-card",
                          s.lead ? "bg-ink text-gold" : "bg-gold-soft text-gold-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <div className="min-w-0">
                          <h3 className="font-sans text-base font-semibold">{s.title}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground tabular">{s.when}</p>
                        </div>
                        {/* ms-auto: on a phone the amount wraps under the title and still lines up on the end side. */}
                        <p className={cn("ms-auto shrink-0 whitespace-nowrap font-semibold tabular", s.lead ? "text-lg" : "text-base")}>{s.amount}</p>
                      </div>
                      {s.tag && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                          <Landmark className="h-3.5 w-3.5" aria-hidden />
                          {s.tag}
                        </p>
                      )}
                      {s.lead && (
                        <dl className="mt-3 space-y-1.5 rounded-2xl bg-muted/50 px-4 py-3 text-xs">
                          {(
                            [
                              [t("timeline.transferEquity"), formatAED(l.askingPrice, locale)],
                              [t("timeline.transferFees"), t("side.approx", { amount: formatAED(a.buyerFees, locale) })],
                              ...(a.arrears > 0 ? [[t("timeline.transferArrears"), formatAED(a.arrears, locale)]] : []),
                            ] as [string, string][]
                          ).map(([k, v]) => (
                            <div key={k} className="flex items-baseline justify-between gap-4">
                              <dt className="text-muted-foreground">{k}</dt>
                              <dd className="shrink-0 whitespace-nowrap font-medium tabular">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  ))}
                </ol>
                {/* Past-due instalments the timeline doesn't already show as their own step (pastDueOpen). */}
                {schedule.pastDue.sum > 0 && pastDueOpen === 0 && (
                  <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      {richText(t(arrearsChecked ? "timeline.pastDueChecked" : "timeline.pastDue"), {
                        amount: <bdi className="font-medium text-foreground tabular">{formatAED(schedule.pastDue.sum, locale)}</bdi>,
                        date: <bdi>{checkedOn}</bdi>,
                      })}
                    </span>
                  </p>
                )}
                {unlisted < 0 && (
                  <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      {richText(t("timeline.mismatch"), {
                        amount: <bdi className="font-medium text-foreground tabular">{formatAED(-unlisted, locale)}</bdi>,
                      })}
                    </span>
                  </p>
                )}
                <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-border/70 pt-4">
                  <p className="text-sm font-semibold">{t("timeline.total")}</p>
                  <p className="shrink-0 whitespace-nowrap text-lg font-semibold tabular" data-timeline-total={a.totalCost}>
                    {t("side.approx", { amount: formatAED(a.totalCost, locale) })}
                  </p>
                </div>
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
                    <div className="border-t border-border/70 pt-4">
                      <dt className="text-xs leading-snug text-muted-foreground">{t("cost.transferDay")}</dt>
                      <dd className="mt-1 text-xl font-semibold tabular">{t("side.approx", { amount: formatAED(a.cashToClose, locale) })}</dd>
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
              <p className="mt-1.5 text-xs text-muted-foreground">{t("cost.arrearsNote")}</p>
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
