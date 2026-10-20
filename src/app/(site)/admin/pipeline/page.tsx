import Link from "next/link";
import { PageTitle } from "@/components/Kpi";
import { SampleBadge } from "@/components/badges";
import { requireAdmin } from "@/lib/auth";
import { LISTING_STATUS, UNIT_TYPES, type ListingStatusKey } from "@/lib/config";
import { adminListings } from "@/lib/admin";
import { formatAEDCompact, refCode } from "@/lib/format";

const COLUMNS: ListingStatusKey[] = ["pending_review", "live", "under_offer", "noc_in_progress", "transferred", "paused", "rejected"];

export default async function PipelinePage() {
  await requireAdmin();
  const all = await adminListings();

  return (
    <div className="space-y-6">
      <PageTitle title="Deals pipeline" sub="Every listing by stage. Open one to move it forward." />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => {
          const items = all.filter((l) => l.status === stage);
          return (
            <div key={stage} className="w-60 shrink-0 rounded-xl bg-secondary p-3">
              <p className="mb-3 flex items-center justify-between text-sm font-semibold">
                {LISTING_STATUS[stage].label}
                <span className="text-xs text-muted-foreground tabular">{items.length}</span>
              </p>
              <div className="space-y-2">
                {items.slice(0, 50).map((l) => (
                  <Link key={l.id} href={`/admin/listings/${l.id}`} className="block rounded-lg border bg-card p-3 text-sm shadow-card hover:border-gold">
                    <p className="line-clamp-1 font-medium">{l.projectName}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {refCode(l.refNo)} · {formatAEDCompact(l.askingPrice)} · {UNIT_TYPES[l.unitType]}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {l.offers} offers · {l.watchers} watching
                      {l.isSample && <SampleBadge />}
                    </p>
                  </Link>
                ))}
                {items.length === 0 && <p className="px-1 text-xs text-muted-foreground">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
