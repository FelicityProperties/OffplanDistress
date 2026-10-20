import type { Metadata } from "next";
import Link from "next/link";
import { DealCard } from "@/components/DealCard";
import { DealsToolbar, FilterPanel, SaveSearchButton } from "@/components/deals/DealFilters";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import type { TFn, TKey } from "@/i18n/translator";
import { getCurrentUser } from "@/lib/auth";
import type { MOTIVATION } from "@/lib/config";
import { formatAEDCompact } from "@/lib/format";
import { PAGE_SIZE, parseFilters, searchDeals, watchedIds, type DealFilters } from "@/lib/listings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("deals");
  return { title: t("meta.title"), description: t("meta.description") };
}

/** Arabic/English community name; unknown names are shown as entered. */
function communityName(tc: TFn<"common">, name: string) {
  const key = `community.${name}` as TKey<"common">;
  const label = tc(key);
  return label === key ? name : label;
}

/** Short human name for the current filters, used as the saved search's name (in the visitor's language). */
function summarize(f: DealFilters, t: TFn<"deals">, tc: TFn<"common">, locale: Locale) {
  const parts = [
    ...f.community.map((c) => communityName(tc, c)),
    ...f.developer.map((d) => (d === "Other" ? tc("developer.Other") : d)),
    ...f.type.map((u) => tc(`unit.${u}`)),
    ...f.motivation.map((m) => tc(`motivation.${m as keyof typeof MOTIVATION}`)),
    f.maxCash ? t("summary.maxCash", { amount: formatAEDCompact(f.maxCash, locale) }) : "",
    f.minDiscount ? t("summary.minDiscount", { pct: f.minDiscount }) : "",
    f.handoverBy ? t("summary.handoverBy", { year: f.handoverBy }) : "",
    f.q ? t("summary.query", { q: f.q }) : "",
  ].filter(Boolean);
  return parts.length ? parts.slice(0, 4).join(" · ") : t("summary.all");
}

export default async function DealsPage({ searchParams }: PageProps<"/deals">) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const user = await getCurrentUser();
  const [{ rows, total }, watched, t, tc, locale] = await Promise.all([
    searchDeals(filters),
    watchedIds(user?.id),
    getT("deals"),
    getT("common"),
    getLocale(),
  ]);
  const layout = raw.view === "list" ? "list" : "grid";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Keep the count bold inside the translated sentence: split the template around {count}.
  const [countBefore, countAfter = ""] = t(total === 1 ? "results.one" : "results.many").split("{count}");

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
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

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
              {countBefore}
              <span className="font-semibold text-foreground tabular">{total}</span>
              {countAfter}
            </p>
            <SaveSearchButton summary={summarize(filters, t, tc, locale)} />
          </div>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">{t("empty")}</div>
          ) : (
            <div className={layout === "grid" ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-4"}>
              {rows.map((d) => (
                <DealCard key={d.id} deal={d} layout={layout} watching={watched.has(d.id)} />
              ))}
            </div>
          )}
          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label={t("pagination.label")}>
              <Button asChild variant="outline" size="sm" className={filters.page <= 1 ? "pointer-events-none opacity-50" : ""}>
                <Link href={pageHref(filters.page - 1)}>{t("pagination.previous")}</Link>
              </Button>
              <span className="px-3 text-sm text-muted-foreground tabular">
                {t("pagination.page", { page: filters.page, pages })}
              </span>
              <Button asChild variant="outline" size="sm" className={filters.page >= pages ? "pointer-events-none opacity-50" : ""}>
                <Link href={pageHref(filters.page + 1)}>{t("pagination.next")}</Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
