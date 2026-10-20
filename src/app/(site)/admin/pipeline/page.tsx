import Link from "next/link";
import { PageTitle } from "@/components/Kpi";
import { SampleBadge } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { type ListingStatusKey } from "@/lib/config";
import { adminListings } from "@/lib/admin";
import { formatAEDCompact, refCode } from "@/lib/format";

const COLUMNS: ListingStatusKey[] = ["pending_review", "live", "under_offer", "noc_in_progress", "transferred", "paused", "rejected"];

export default async function PipelinePage() {
  await requireAdmin();
  const [all, t, tc, locale] = await Promise.all([adminListings(), getT("admin"), getT("common"), getLocale()]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("pipeline.title")} sub={t("pipeline.sub")} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => {
          const items = all.filter((l) => l.status === stage);
          return (
            <div key={stage} className="w-60 shrink-0 rounded-xl bg-secondary p-3">
              <p className="mb-3 flex items-center justify-between text-sm font-semibold">
                {tc(`listing.${stage}`)}
                <span className="text-xs text-muted-foreground tabular">{items.length}</span>
              </p>
              <div className="space-y-2">
                {items.slice(0, 50).map((l) => (
                  <Link key={l.id} href={`/admin/listings/${l.id}`} className="block rounded-lg border bg-card p-3 text-sm shadow-card hover:border-gold">
                    <p className="line-clamp-1 font-medium">{l.projectName}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      <bdi>{refCode(l.refNo)}</bdi> · {formatAEDCompact(l.askingPrice, locale)} · {tc(`unit.${l.unitType}`)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {t("pipeline.counts", { offers: l.offers, watchers: l.watchers })}
                      {l.isSample && <SampleBadge />}
                    </p>
                  </Link>
                ))}
                {items.length === 0 && <p className="px-1 text-xs text-muted-foreground">{t("pipeline.empty")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
