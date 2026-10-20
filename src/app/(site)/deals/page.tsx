import type { Metadata } from "next";
import Link from "next/link";
import { DealCard } from "@/components/DealCard";
import { DealsToolbar, FilterPanel, SaveSearchButton } from "@/components/deals/DealFilters";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { MOTIVATION, UNIT_TYPES } from "@/lib/config";
import { formatAEDCompact } from "@/lib/format";
import { PAGE_SIZE, parseFilters, searchDeals, watchedIds, type DealFilters } from "@/lib/listings";

export const metadata: Metadata = {
  title: "Browse distressed off-plan deals in Dubai",
  description:
    "Filter verified off-plan resale units by community, developer, upfront cash, % paid, handover and discount to launch price.",
};

function summarize(f: DealFilters) {
  const parts = [
    ...f.community,
    ...f.developer,
    ...f.type.map((t) => UNIT_TYPES[t]),
    ...f.motivation.map((m) => MOTIVATION[m as keyof typeof MOTIVATION].label),
    f.maxCash ? `≤ ${formatAEDCompact(f.maxCash)} upfront` : "",
    f.minDiscount ? `${f.minDiscount}%+ discount` : "",
    f.handoverBy ? `handover by ${f.handoverBy}` : "",
    f.q ? `“${f.q}”` : "",
  ].filter(Boolean);
  return parts.length ? parts.slice(0, 4).join(" · ") : "All deals";
}

export default async function DealsPage({ searchParams }: PageProps<"/deals">) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const user = await getCurrentUser();
  const [{ rows, total }, watched] = await Promise.all([searchDeals(filters), watchedIds(user?.id)]);
  const layout = raw.view === "list" ? "list" : "grid";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) {
      if (k === "page" || v == null) continue;
      for (const item of Array.isArray(v) ? v : [v]) p.append(k, item);
    }
    if (page > 1) p.set("page", String(page));
    return `/deals?${p.toString()}`;
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">Browse deals</h1>
      <p className="mt-1 text-muted-foreground">Verified off-plan units, priced below today&apos;s developer launch.</p>

      <DealsToolbar />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pe-2">
            <FilterPanel />
          </div>
        </aside>
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular">{total}</span> {total === 1 ? "deal" : "deals"} found
            </p>
            <SaveSearchButton summary={summarize(filters)} />
          </div>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              No deals match those filters. Try widening your budget, or save this search and we&apos;ll show you new
              matches on your dashboard.
            </div>
          ) : (
            <div className={layout === "grid" ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-4"}>
              {rows.map((d) => (
                <DealCard key={d.id} deal={d} layout={layout} watching={watched.has(d.id)} />
              ))}
            </div>
          )}
          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button asChild variant="outline" size="sm" className={filters.page <= 1 ? "pointer-events-none opacity-50" : ""}>
                <Link href={pageHref(filters.page - 1)}>Previous</Link>
              </Button>
              <span className="px-3 text-sm text-muted-foreground tabular">
                Page {filters.page} of {pages}
              </span>
              <Button asChild variant="outline" size="sm" className={filters.page >= pages ? "pointer-events-none opacity-50" : ""}>
                <Link href={pageHref(filters.page + 1)}>Next</Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
