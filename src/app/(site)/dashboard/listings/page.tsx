import Link from "next/link";
import { AlertCircle, Eye, FileText, Heart, MessageSquare, Pencil, Plus } from "lucide-react";
import { DealImage } from "@/components/DealImage";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { ListingActions } from "@/components/ListingActions";
import { Pipeline } from "@/components/Pipeline";
import { ToneStatus } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { LISTING_STATUS, UNIT_TYPES } from "@/lib/config";
import { myListings } from "@/lib/dashboard";
import { formatAED, refCode } from "@/lib/format";

export default async function MyListingsPage() {
  const user = await requireUser("/dashboard/listings");
  const listings = await myListings(user.id);

  return (
    <div className="space-y-6">
      <PageTitle title="My listings" sub="Every unit you've listed with us and where it is in the process.">
        <Button asChild>
          <Link href="/sell">
            <Plus /> List a unit
          </Link>
        </Button>
      </PageTitle>

      {listings.length === 0 && (
        <EmptyState title="You haven't listed a unit yet" sub="Listing is free. You only pay if we sell it.">
          <Button asChild>
            <Link href="/sell">List my unit</Link>
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
                  {refCode(l.refNo)} · {UNIT_TYPES[l.unitType]} · {l.community} · {formatAED(l.askingPrice)}
                </p>
              </div>
              <ToneStatus {...LISTING_STATUS[l.status]} />
            </div>
            <Pipeline status={l.status} />
            {l.status === "rejected" && l.rejectionReason && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {l.rejectionReason}
              </p>
            )}
            {l.status === "pending_review" && l.docs === 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" /> Upload your SPA and statement of account so we can verify
                the unit.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-4 text-xs text-muted-foreground tabular">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {l.views.toLocaleString("en-AE")} views
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {l.watchers} watchers
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {l.offers} offers{l.pendingOffers ? ` (${l.pendingOffers} new)` : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/listings/${l.id}`}>
                    <Pencil /> Manage
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
