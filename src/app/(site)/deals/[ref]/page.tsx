import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { eq, sql } from "drizzle-orm";
import { ArrowLeft, BadgeCheck, CalendarClock, Eye, FileCheck2, TrendingDown } from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { WatchButton } from "@/components/WatchButton";
import { MotivationBadge, SampleBadge, StatusPill } from "@/components/badges";
import { Gallery } from "@/components/deals/Gallery";
import { OfferDialog } from "@/components/deals/OfferDialog";
import { InquiryDialog } from "@/components/InquiryForm";
import { Progress } from "@/components/ui/progress";
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
    openGraph: { title, description, images: l.images[0]?.startsWith("http") ? [l.images[0]] : undefined },
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

  const [similar, watched, t, tc, locale] = await Promise.all([
    similarDeals(l),
    watchedIds(user?.id),
    getT("deal"),
    getT("common"),
    getLocale(),
  ]);
  const a = analyzeDeal(l);
  const community = communityName(tc, l.community);
  const developer = developerName(tc, l.developer);
  const discountPct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const plan = l.paymentPlan ?? [];
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

  return (
    <div className="container-page py-8">
      <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>

      {l.status !== "live" && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
          {PUBLIC_STATUSES.includes(l.status)
            ? t("banner.underOffer")
            : t("banner.private", { status: tc(`listing.${l.status}`) })}
        </div>
      )}

      <Gallery
        images={l.images}
        alt={`${l.projectName}, ${community}`}
        badge={
          <div className="absolute start-4 top-4 flex gap-2">
            {discountPct != null && (
              <span className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground tabular">
                {tc("vsLaunch", { pct: discountPct })}
              </span>
            )}
            {l.isSample && <SampleBadge className="self-center" />}
          </div>
        }
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">{developer}</span>
            {l.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("badge.verified")}
              </span>
            )}
            {l.nocEligible && <StatusPill tone="gold">{t("badge.nocEligible")}</StatusPill>}
            <MotivationBadge m={l.motivation} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{l.projectName}</h1>
          <p className="mt-1 text-muted-foreground">
            {community} · {tc(`unit.${l.unitType}`)} · {tc("sqft", { n: l.sizeSqft.toLocaleString("en-AE") })}
            {l.floor ? ` · ${tc("floor", { n: l.floor })}` : ""}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            {t(row.watchers === 1 ? "watchers.one" : "watchers.many", { n: row.watchers })} · {t("ref")}{" "}
            <bdi className="tabular">{refCode(l.refNo)}</bdi>
          </p>

          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
            {[
              [t("facts.view"), l.view || "—"],
              [tc("handover"), formatQuarter(l.handoverDate, locale)],
              [t("facts.originalPrice"), formatAED(l.originalPrice, locale)],
              [t("facts.launchPrice"), l.launchPrice ? formatAED(l.launchPrice, locale) : t("facts.beingAssessed")],
            ].map(([k, v]) => (
              <div key={k} className="bg-card p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-1 text-sm font-semibold tabular">{v}</p>
              </div>
            ))}
          </div>

          {l.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-muted-foreground">{l.description}</p>}

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">{t("plan.title")}</h2>
            <div className="mt-4 rounded-xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {t("plan.paid")} <span className="font-semibold tabular">{formatAED(l.amountPaid, locale)}</span>
                </span>
                <span className="text-muted-foreground">
                  {t("plan.remaining")}{" "}
                  <span className="font-semibold text-foreground tabular">{formatAED(a.remaining, locale)}</span>
                </span>
              </div>
              <Progress value={Math.round(a.paidPct * 100)} className="mt-3 h-3" />
              <p className="mt-2 text-xs text-muted-foreground tabular">
                {t("plan.paidPct", { pct: formatPct(a.paidPct) })}
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
            </div>
            {plan.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("plan.milestone")}</TableHead>
                      <TableHead>{t("plan.due")}</TableHead>
                      <TableHead className="text-end">{t("plan.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.map((s, i) => (
                      <TableRow key={`${s.label}-${i}`}>
                        <TableCell className="font-medium">{s.label}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(s.dueDate, locale)}</TableCell>
                        <TableCell className="text-end tabular">{formatAED(s.amount, locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">{t("cost.title")}</h2>
            <div className="mt-4 rounded-xl border bg-card p-5 shadow-card">
              <dl className="space-y-2.5 text-sm">
                {cost.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="tabular">{formatAED(v, locale)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2.5 font-semibold">
                  <dt>{t("cost.total")}</dt>
                  <dd className="tabular">{formatAED(a.totalCost, locale)}</dd>
                </div>
                {a.launchAllIn != null && (
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <dt>{t("cost.launchAllIn", { rate: formatPct(FEES.dldRate) })}</dt>
                    <dd className="tabular">{formatAED(a.launchAllIn, locale)}</dd>
                  </div>
                )}
              </dl>
              {a.savingVsLaunch != null && a.savingVsLaunch > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-success-soft px-4 py-3 text-success">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <TrendingDown className="h-5 w-5" />
                    {t("cost.saving")}
                  </span>
                  <span className="text-xl font-semibold tabular">{formatAED(a.savingVsLaunch, locale)}</span>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {t("cost.disclaimer")}
              </p>
            </div>
          </section>
        </div>

        <aside>
          <div className="sticky top-24 rounded-2xl border bg-card p-6 shadow-lift">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("side.payNow")}</p>
            <p className="mt-1 text-3xl font-semibold tabular">{formatAED(l.askingPrice, locale)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("side.thenPlan", { amount: formatAED(a.remaining, locale), developer })}
            </p>
            {l.nextInstalmentDate && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <CalendarClock className="h-4 w-4 text-gold" />
                {t("side.nextInstalment", { date: formatDate(l.nextInstalmentDate, locale) })}
              </div>
            )}
            <div className="mt-6 grid gap-2">
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
              />
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <FileCheck2 className="h-4 w-4 shrink-0 text-gold" />
              {t("side.feeNote")}
            </p>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold">{t("similar")}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <DealCard key={s.id} deal={s} watching={watched.has(s.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
