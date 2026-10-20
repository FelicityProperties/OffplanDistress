import Link from "next/link";
import { DeleteSearchButton } from "@/components/DeleteSearchButton";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { mySearches } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { parseFilters, searchDeals } from "@/lib/listings";

export default async function SearchesPage() {
  const user = await requireUser("/dashboard/searches");
  const searches = await mySearches(user.id);
  const withCounts = await Promise.all(
    searches.map(async (s) => {
      const { rows, total } = await searchDeals({ ...parseFilters(Object.fromEntries(groupParams(s.query))), sort: "newest", page: 1 });
      const fresh = rows.filter((r) => (r.publishedAt ?? r.createdAt) > s.createdAt).length;
      return { ...s, total, fresh };
    }),
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Saved searches" sub="Re-run your favourite filters in one click and see what's new since you saved them.">
        <Button asChild variant="outline">
          <Link href="/deals">New search</Link>
        </Button>
      </PageTitle>
      {withCounts.length === 0 ? (
        <EmptyState
          title="No saved searches yet"
          sub="Set your filters on the Browse deals page and tap “Save search” to keep them here."
        >
          <Button asChild>
            <Link href="/deals">Browse deals</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-card">
          {withCounts.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  {s.total} live {s.total === 1 ? "match" : "matches"} · saved {formatDate(s.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {s.fresh > 0 && <StatusPill tone="gold">{s.fresh} new</StatusPill>}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/deals?${s.query}`}>Open</Link>
                </Button>
                <DeleteSearchButton id={s.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupParams(query: string): [string, string | string[]][] {
  const out = new Map<string, string[]>();
  for (const [k, v] of new URLSearchParams(query)) out.set(k, [...(out.get(k) ?? []), v]);
  return [...out].map(([k, v]) => [k, v.length === 1 ? v[0] : v]);
}
