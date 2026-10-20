import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { WatchButton } from "@/components/WatchButton";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { PUBLIC_STATUSES, UNIT_TYPES } from "@/lib/config";
import { myWatchlist } from "@/lib/dashboard";
import { formatAED, formatAEDCompact, formatDate, refCode } from "@/lib/format";

export default async function WatchlistPage() {
  const user = await requireUser("/dashboard/watchlist");
  const items = await myWatchlist(user.id);

  return (
    <div className="space-y-6">
      <PageTitle title="Watchlist" sub="Deals you're tracking. We highlight any price drop since you saved them." />
      {items.length === 0 ? (
        <EmptyState title="Your watchlist is empty" sub="Tap the heart on any deal to keep an eye on its price.">
          <Button asChild>
            <Link href="/deals">Browse deals</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((d) => {
            const drop = d.savedPrice - d.askingPrice;
            const available = PUBLIC_STATUSES.includes(d.status);
            return (
              <div key={d.id} className="relative flex gap-4 rounded-xl border bg-card p-3 shadow-card card-lift">
                <Link href={`/deals/${refCode(d.refNo)}`} className="flex min-w-0 flex-1 gap-4">
                  <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg">
                    <DealImage src={d.images[0]} alt={d.projectName} />
                  </div>
                  <div className="min-w-0 flex-1 pe-8">
                    <p className="truncate font-semibold">{d.projectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {UNIT_TYPES[d.unitType]} · {d.community}
                    </p>
                    <p className="mt-2 font-semibold tabular">{formatAED(d.askingPrice)}</p>
                    {!available ? (
                      <StatusPill tone="muted">No longer available</StatusPill>
                    ) : drop > 0 ? (
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <TrendingDown className="h-3.5 w-3.5" />
                        Price dropped {formatAEDCompact(drop)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Saved {formatDate(d.savedAt)}</p>
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
