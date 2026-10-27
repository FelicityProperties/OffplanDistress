import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { ArrowRight, Building2, Heart, Search } from "lucide-react";
import { EmptyState, Kpi, PageTitle } from "@/components/Kpi";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { OFFER_STATUS } from "@/lib/config";
import { myListings, myWatchlist, offersReceived, offersSent } from "@/lib/dashboard";
import { formatAED, formatAEDCompact, formatNumber, refCode, timeAgo } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("dashboard");
  return { title: t("overview.title"), robots: { index: false } };
}

export default async function DashboardOverview() {
  const user = await requireUser("/dashboard");
  const [listings, received, sent, watch, t, tc, locale] = await Promise.all([
    myListings(user.id),
    offersReceived(user.id),
    offersSent(user.id),
    myWatchlist(user.id),
    getT("dashboard"),
    getT("common"),
    getLocale(),
  ]);

  const active = listings.filter((l) => ["live", "under_offer", "noc_in_progress"].includes(l.status)).length;
  const inReview = listings.filter((l) => l.status === "pending_review").length;
  const views = listings.reduce((s, l) => s + l.views, 0);
  const pending = received.filter((o) => o.status === "pending");
  const best = pending.reduce((m, o) => Math.max(m, o.amount), 0);
  const drops = watch.filter((w) => w.savedPrice > w.askingPrice);
  const dropTotal = drops.reduce((s, w) => s + (w.savedPrice - w.askingPrice), 0);
  const fresh = !listings.length && !sent.length && !watch.length;
  const offerStatus = (s: keyof typeof OFFER_STATUS) => ({ label: tc(`offer.${s}`), tone: OFFER_STATUS[s].tone });

  return (
    <div className="space-y-8">
      <PageTitle title={t("overview.title")} sub={t("overview.sub")} />

      {fresh ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card card-lift">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
              <Search className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-sans text-lg font-semibold">{t("overview.buyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("overview.buyBody")}</p>
            <Button asChild className="mt-4">
              <Link href="/deals">
                {tc("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card card-lift">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-gradient text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-sans text-lg font-semibold">{t("overview.sellTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("overview.sellBody")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/sell">
                {t("listMyUnit")} <ArrowRight className="rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label={t("kpi.activeListings")}
              value={String(active)}
              hint={inReview ? t("kpi.inReview", { count: inReview }) : undefined}
            />
            <Kpi label={t("kpi.views")} value={formatNumber(views)} />
            <Kpi
              label={t("kpi.offersToReview")}
              value={String(pending.length)}
              hint={best ? t("kpi.best", { amount: formatAED(best, locale) }) : undefined}
            />
            <Kpi
              label={t("kpi.watchlist")}
              value={String(watch.length)}
              hint={
                drops.length
                  ? t(drops.length === 1 ? "kpi.priceDrops.one" : "kpi.priceDrops.other", {
                      count: drops.length,
                      amount: formatAEDCompact(dropTotal, locale),
                    })
                  : undefined
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-lg font-semibold">{t("overview.latestOffers")}</h2>
                <Button asChild variant="link">
                  <Link href="/dashboard/offers">{t("viewAll")}</Link>
                </Button>
              </div>
              {received.length ? (
                <ul className="mt-2 divide-y">
                  {received.slice(0, 4).map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{o.projectName}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(o.updatedAt, locale)}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <ToneStatus {...offerStatus(o.status)} />
                        <span className="font-semibold tabular">{formatAED(o.amount, locale)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">{t("overview.noOffers")}</p>
              )}
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-lg font-semibold">{t("overview.yourWatchlist")}</h2>
                <Button asChild variant="link">
                  <Link href="/dashboard/watchlist">{t("viewAll")}</Link>
                </Button>
              </div>
              {watch.length ? (
                <ul className="mt-2 divide-y">
                  {watch.slice(0, 4).map((w) => (
                    <li key={w.id}>
                      <Link
                        href={`/deals/${refCode(w.refNo)}`}
                        className="flex items-center justify-between gap-3 py-3 text-sm hover:text-foreground"
                      >
                        <span className="min-w-0 truncate font-medium">{w.projectName}</span>
                        <span className="font-semibold tabular">{formatAED(w.askingPrice, locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4" /> {t("overview.watchlistHint")}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {sent.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-sans text-lg font-semibold">{t("overview.offersMade")}</h2>
          <ul className="mt-2 divide-y">
            {sent.slice(0, 4).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <Link href={`/deals/${refCode(o.refNo)}`} className="min-w-0 truncate font-medium hover:underline">
                  {o.projectName}
                </Link>
                <span className="flex items-center gap-3">
                  <ToneStatus {...offerStatus(o.status)} />
                  <span className="font-semibold tabular">{formatAED(o.amount, locale)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fresh && <EmptyState title={t("overview.emptyTitle")} sub={t("overview.emptySub")} />}
    </div>
  );
}
