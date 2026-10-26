import type { Metadata } from "next";
import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { WatchButton } from "@/components/WatchButton";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { isAdvertised } from "@/lib/permits";
import { myWatchlist } from "@/lib/dashboard";
import { formatAED, formatAEDCompact, formatDate, refCode } from "@/lib/format";
import { communityName } from "@/lib/place-names";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("dashboard");
  return { title: t("watchlist.title"), robots: { index: false } };
}

export default async function WatchlistPage() {
  const user = await requireUser("/dashboard/watchlist");
  const [items, t, tc, locale] = await Promise.all([myWatchlist(user.id), getT("dashboard"), getT("common"), getLocale()]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("watchlist.title")} sub={t("watchlist.sub")} />
      {items.length === 0 ? (
        <EmptyState title={t("watchlist.emptyTitle")} sub={t("watchlist.emptySub")}>
          <Button asChild>
            <Link href="/deals">{tc("browseDeals")}</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((d) => {
            const drop = d.savedPrice - d.askingPrice;
            // Off the market, or no longer an advert because its DLD permit or Form A ran out.
            const available = isAdvertised(d);
            return (
              <div key={d.id} className="relative flex gap-4 rounded-xl border bg-card p-3 shadow-card card-lift">
                <Link href={`/deals/${refCode(d.refNo)}`} className="flex min-w-0 flex-1 gap-4">
                  <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg">
                    <DealImage src={d.images[0]} alt={d.projectName} />
                  </div>
                  <div className="min-w-0 flex-1 pe-8">
                    <p className="truncate font-semibold">{d.projectName}</p>
                    {/* A typed community name can be one long word, or Arabic in an English line. */}
                    <p className="truncate text-xs text-muted-foreground">
                      {tc(`unit.${d.unitType}`)} · <bdi>{communityName(tc, d.community, d.communityOther)}</bdi>
                    </p>
                    <p className="mt-2 font-semibold tabular">{formatAED(d.askingPrice, locale)}</p>
                    {!available ? (
                      <StatusPill tone="muted">{t("watchlist.unavailable")}</StatusPill>
                    ) : drop > 0 ? (
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {t("watchlist.priceDropped", { amount: formatAEDCompact(drop, locale) })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("watchlist.saved", { date: formatDate(d.savedAt, locale) })}
                      </p>
                    )}
                  </div>
                </Link>
                <WatchButton listingId={d.id} watching className="absolute end-3 top-3" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
