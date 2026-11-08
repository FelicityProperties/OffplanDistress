import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { AlertToggle } from "@/components/AlertToggle";
import { DeleteSearchButton } from "@/components/DeleteSearchButton";
import { EmptyState, PageTitle } from "@/components/Kpi";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { mySearches } from "@/lib/dashboard";
import { formatDate } from "@/lib/format";
import { filtersFromQuery, searchCounts } from "@/lib/listings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("searches");
  return { title: t("meta.title"), robots: { index: false } };
}

export default async function SearchesPage() {
  const user = await requireUser("/dashboard/searches");
  const [t, tc, locale, searches] = await Promise.all([getT("searches"), getT("common"), getLocale(), mySearches(user.id)]);
  const withCounts = await Promise.all(
    searches.map(async (s) => {
      // One search that can't be counted (an old or hand-made query) loses its counts, not the page and its delete
      // buttons.
      try {
        const { total, fresh } = await searchCounts(filtersFromQuery(s.query), s.createdAt);
        return { ...s, total: total as number | null, fresh };
      } catch (e) {
        console.error("saved search counts", s.id, e);
        return { ...s, total: null, fresh: 0 };
      }
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
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5 max-sm:gap-3 max-sm:p-4">
              <div className="space-y-2 max-sm:space-y-1">
                <div>
                  <p dir="auto" className="font-semibold">
                    {s.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.total != null && <>{t(s.total === 1 ? "matches.one" : "matches.other", { count: s.total })} · </>}
                    {t("savedOn", { date: formatDate(s.createdAt, locale) })}
                  </p>
                </div>
                <AlertToggle id={s.id} enabled={s.alerts} />
              </div>
              {/* Phones: Open fills the row beside the 44 px delete button. */}
              <div className="flex items-center gap-3 max-sm:w-full">
                {s.fresh > 0 && <StatusPill tone="gold">{t("fresh", { count: s.fresh })}</StatusPill>}
                <Button asChild size="sm" variant="outline" className="max-lg:h-11 max-lg:px-4 max-lg:text-sm max-sm:flex-1">
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
