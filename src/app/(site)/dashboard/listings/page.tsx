import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Eye, FileText, Heart, MessageSquare, Pencil, Plus } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { ListingActions } from "@/components/ListingActions";
import { Pipeline } from "@/components/Pipeline";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translator";
import { requireUser } from "@/lib/auth";
import { COMMUNITIES, LISTING_STATUS } from "@/lib/config";
import { myListings } from "@/lib/dashboard";
import { formatAED, formatNumber, refCode } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("dashboard");
  return { title: t("listings.title"), robots: { index: false } };
}

export default async function MyListingsPage() {
  const user = await requireUser("/dashboard/listings");
  const [listings, t, tc, locale] = await Promise.all([myListings(user.id), getT("dashboard"), getT("common"), getLocale()]);
  const community = (c: string) => (COMMUNITIES.includes(c) ? tc(`community.${c}` as TKey<"common">) : c);

  return (
    <div className="space-y-6">
      <PageTitle title={t("listings.title")} sub={t("listings.sub")}>
        <Button asChild>
          <Link href="/sell">
            <Plus /> {t("listings.listUnit")}
          </Link>
        </Button>
      </PageTitle>

      {listings.length === 0 && (
        <EmptyState title={t("listings.emptyTitle")} sub={t("listings.emptySub")}>
          <Button asChild>
            <Link href="/sell">{t("listMyUnit")}</Link>
          </Button>
        </EmptyState>
      )}

      {listings.map((l) => (
        <div key={l.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:flex-row">
          <div className="h-32 w-full overflow-hidden rounded-lg sm:w-44 sm:shrink-0">
            <DealImage src={l.images[0]} alt={l.projectName} />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/dashboard/listings/${l.id}`} className="font-semibold hover:underline">
                  {l.projectName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  <bdi>{refCode(l.refNo)}</bdi> · {tc(`unit.${l.unitType}`)} · {community(l.community)} ·{" "}
                  {formatAED(l.askingPrice, locale)}
                </p>
              </div>
              <ToneStatus label={tc(`listing.${l.status}`)} tone={LISTING_STATUS[l.status].tone} />
            </div>
            <Pipeline status={l.status} />
            {l.status === "rejected" && l.rejectionReason && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {l.rejectionReason}
              </p>
            )}
            {l.status === "pending_review" && l.docs === 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" /> {t("listings.uploadDocs")}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-4 text-xs text-muted-foreground tabular">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {t(l.views === 1 ? "listings.views.one" : "listings.views.other", { n: formatNumber(l.views) })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {t(l.watchers === 1 ? "listings.watchers.one" : "listings.watchers.other", { n: l.watchers })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t(l.offers === 1 ? "listings.offers.one" : "listings.offers.other", { n: l.offers })}
                  {l.pendingOffers ? t("listings.newOffers", { n: l.pendingOffers }) : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/listings/${l.id}`}>
                    <Pencil /> {tc("manage")}
                  </Link>
                </Button>
                <ListingActions id={l.id} status={l.status} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
