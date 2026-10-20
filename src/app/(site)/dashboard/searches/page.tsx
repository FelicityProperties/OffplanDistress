import type { Metadata } from "next";
import Link from "next/link";
import { AlertToggle } from "@/components/AlertToggle";
import { DeleteSearchButton } from "@/components/DeleteSearchButton";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { mySearches } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { filtersFromQuery, searchDeals } from "@/lib/listings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("searches");
  return { title: t("meta.title"), robots: { index: false } };
}

export default async function SearchesPage() {
  const user = await requireUser("/dashboard/searches");
  const [t, tc, locale, searches] = await Promise.all([getT("searches"), getT("common"), getLocale(), mySearches(user.id)]);
  const withCounts = await Promise.all(
    searches.map(async (s) => {
      const { rows, total } = await searchDeals({ ...filtersFromQuery(s.query), sort: "newest", page: 1 });
      const fresh = rows.filter((r) => (r.publishedAt ?? r.createdAt) > s.createdAt).length;
      return { ...s, total, fresh };
    }),
  );

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} sub={t("sub")}>
        <Button asChild variant="outline">
          <Link href="/deals">{t("newSearch")}</Link>
        </Button>
      </PageTitle>
      {withCounts.length === 0 ? (
        <EmptyState title={t("empty.title")} sub={t("empty.sub")}>
          <Button asChild>
            <Link href="/deals">{tc("browseDeals")}</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-card">
          {withCounts.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-2">
                <div>
                  <p dir="auto" className="font-semibold">
                    {s.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(s.total === 1 ? "matches.one" : "matches.other", { count: s.total })} ·{" "}
                    {t("savedOn", { date: formatDate(s.createdAt, locale) })}
                  </p>
                </div>
                <AlertToggle id={s.id} enabled={s.alerts} />
              </div>
              <div className="flex items-center gap-3">
                {s.fresh > 0 && <StatusPill tone="gold">{t("fresh", { count: s.fresh })}</StatusPill>}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/deals?${s.query}`}>{tc("open")}</Link>
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
