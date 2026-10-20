import Link from "next/link";
import { ArrowRight, Building2, Heart, Search } from "lucide-react";
import { EmptyState, Kpi, PageTitle } from "@/components/Kpi";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { OFFER_STATUS } from "@/lib/config";
import { myListings, myWatchlist, offersReceived, offersSent } from "@/lib/dashboard";
import { formatAED, formatAEDCompact, refCode, timeAgo } from "@/lib/format";

export default async function DashboardOverview() {
  const user = await requireUser("/dashboard");
  const [listings, received, sent, watch] = await Promise.all([
    myListings(user.id),
    offersReceived(user.id),
    offersSent(user.id),
    myWatchlist(user.id),
  ]);

  const active = listings.filter((l) => ["live", "under_offer", "noc_in_progress"].includes(l.status)).length;
  const inReview = listings.filter((l) => l.status === "pending_review").length;
  const views = listings.reduce((s, l) => s + l.views, 0);
  const pending = received.filter((o) => o.status === "pending");
  const best = pending.reduce((m, o) => Math.max(m, o.amount), 0);
  const drops = watch.filter((w) => w.savedPrice > w.askingPrice);
  const dropTotal = drops.reduce((s, w) => s + (w.savedPrice - w.askingPrice), 0);
  const fresh = !listings.length && !sent.length && !watch.length;

  return (
    <div className="space-y-8">
      <PageTitle title="Overview" sub="Your listings, offers and watchlist in one place." />

      {fresh ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <Search className="h-6 w-6 text-gold" />
            <h2 className="mt-3 font-sans text-lg font-semibold">Looking to buy?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse verified distressed units, save the ones you like and make an offer. We handle the paperwork.
            </p>
            <Button asChild className="mt-4">
              <Link href="/deals">
                Browse deals <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <Building2 className="h-6 w-6 text-gold" />
            <h2 className="mt-3 font-sans text-lg font-semibold">Need to exit a unit?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              List your off-plan unit for free. We verify it, market it to our buyers and manage the transfer.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/sell">
                List my unit <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Active listings" value={String(active)} hint={inReview ? `${inReview} under review` : undefined} />
            <Kpi label="Listing views" value={views.toLocaleString("en-AE")} />
            <Kpi
              label="Offers to review"
              value={String(pending.length)}
              hint={best ? `Best: ${formatAED(best)}` : undefined}
            />
            <Kpi
              label="Watchlist"
              value={String(watch.length)}
              hint={drops.length ? `${drops.length} price drop${drops.length > 1 ? "s" : ""} · ${formatAEDCompact(dropTotal)}` : undefined}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-lg font-semibold">Latest offers received</h2>
                <Button asChild variant="link">
                  <Link href="/dashboard/offers">View all</Link>
                </Button>
              </div>
              {received.length ? (
                <ul className="mt-2 divide-y">
                  {received.slice(0, 4).map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{o.projectName}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(o.updatedAt)}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <ToneStatus {...OFFER_STATUS[o.status]} />
                        <span className="font-semibold tabular">{formatAED(o.amount)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No offers on your listings yet.</p>
              )}
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-lg font-semibold">Your watchlist</h2>
                <Button asChild variant="link">
                  <Link href="/dashboard/watchlist">View all</Link>
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
                        <span className="font-semibold tabular">{formatAED(w.askingPrice)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4" /> Tap the heart on any deal to track it here.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {sent.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-sans text-lg font-semibold">Offers you&apos;ve made</h2>
          <ul className="mt-2 divide-y">
            {sent.slice(0, 4).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <Link href={`/deals/${refCode(o.refNo)}`} className="min-w-0 truncate font-medium hover:underline">
                  {o.projectName}
                </Link>
                <span className="flex items-center gap-3">
                  <ToneStatus {...OFFER_STATUS[o.status]} />
                  <span className="font-semibold tabular">{formatAED(o.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fresh && <EmptyState title="Nothing here yet" sub="Your activity will show up here once you save a deal, make an offer or list a unit." />}
    </div>
  );
}
