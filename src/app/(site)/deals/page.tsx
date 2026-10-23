import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, RotateCcw, SearchX, SlidersHorizontal, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("deals");
  return { title: t("meta.title"), description: t("meta.description") };
}

type RawParams = Awaited<PageProps<"/deals">["searchParams"]>;
type Chip = { key: string; label: string; href: string };

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

/** The current query string (minus the page number), as a fresh URLSearchParams. */
function baseParams(raw: RawParams) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (k === "page" || v == null) continue;
    for (const item of Array.isArray(v) ? v : [v]) p.append(k, item);
  }
  return p;
}

function dealsHref(p: URLSearchParams) {
  const s = p.toString();
  return s ? `/deals?${s}` : "/deals";
}

/** One removable chip per applied filter (and the search text), plus the link that clears them all. */
function activeChips(raw: RawParams, f: DealFilters, t: TFn<"deals">, tc: TFn<"common">, locale: Locale) {
  const href = (mutate: (p: URLSearchParams) => void) => {
    const p = baseParams(raw);
    mutate(p);
    return dealsHref(p);
  };
  const without = (name: string, value?: string) =>
    href((p) => {
      // values may arrive comma-joined (community=A,B), as parseFilters accepts both forms
      const rest =
        value == null ? [] : p.getAll(name).flatMap((v) => v.split(",")).map((v) => v.trim()).filter((v) => v && v !== value);
      p.delete(name);
      for (const v of rest) p.append(name, v);
    });

  const chips: Chip[] = [];
  if (f.q) chips.push({ key: "q", label: t("summary.query", { q: f.q }), href: without("q") });
  if (f.minCash || f.maxCash) {
    const min = f.minCash ? formatAEDCompact(f.minCash, locale) : null;
    const max = f.maxCash ? formatAEDCompact(f.maxCash, locale) : null;
    chips.push({
      key: "cash",
      label:
        min && max
          ? t("chips.cashRange", { min, max })
          : max
            ? t("summary.maxCash", { amount: max })
            : t("chips.cashFrom", { amount: min }),
      href: href((p) => {
        p.delete("minCash");
        p.delete("maxCash");
      }),
    });
  }
  for (const c of f.community) chips.push({ key: `community-${c}`, label: communityName(tc, c), href: without("community", c) });
  for (const d of f.developer)
    chips.push({ key: `developer-${d}`, label: d === "Other" ? tc("developer.Other") : d, href: without("developer", d) });
  for (const u of f.type) chips.push({ key: `type-${u}`, label: tc(`unit.${u}`), href: without("type", u) });
  if (f.minPaid) chips.push({ key: "minPaid", label: t("chips.minPaid", { pct: f.minPaid }), href: without("minPaid") });
  if (f.minDiscount)
    chips.push({ key: "minDiscount", label: t("summary.minDiscount", { pct: f.minDiscount }), href: without("minDiscount") });
  if (f.handoverBy) chips.push({ key: "handoverBy", label: t("chips.handoverBy", { year: f.handoverBy }), href: without("handoverBy") });
  for (const m of f.motivation)
    chips.push({ key: `motivation-${m}`, label: tc(`motivation.${m as keyof typeof MOTIVATION}`), href: without("motivation", m) });
  if (f.verified) chips.push({ key: "verified", label: t("filters.verifiedOnly"), href: without("verified") });

  const clearHref = href((p) => {
    for (const k of [...p.keys()]) if (!["sort", "view"].includes(k)) p.delete(k);
  });
  return { chips, clearHref };
}

/** Page numbers to show: all of them when few, otherwise first, last and the current page's neighbours. */
function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  keep.forEach((n, i) => {
    if (i > 0 && n - keep[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

const pill =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
  const { chips, clearHref } = activeChips(raw, filters, t, tc, locale);
  const filterCount = chips.filter((c) => c.key !== "q").length;
  const summary = summarize(filters, t, tc, locale);

  const pageHref = (page: number) => {
    const p = baseParams(raw);
    if (page > 1) p.set("page", String(page));
    return `/deals?${p.toString()}`;
  };

  return (
    <div className="relative isolate">
      {/* Compact page header */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light opacity-60 mask-fade-b" />
        <div aria-hidden className="absolute -top-40 end-[-6rem] -z-10 h-80 w-[28rem] bg-glow-gold opacity-50" />
        <div className="container-page flex flex-col gap-5 pb-8 pt-10 sm:flex-row sm:items-end sm:justify-between sm:pt-12">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-gold" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-5xl">{t("title")}</h1>
            <p className="mt-3 text-muted-foreground sm:text-lg">{t("subtitle")}</p>
          </div>
          <div className="inline-flex w-fit shrink-0 items-center gap-2.5 rounded-full border border-border/80 bg-card px-4 py-2 text-sm text-muted-foreground shadow-card">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {/* Plain inline text so the sentence reads (and copies) as one line: "32 deals found". */}
            <p aria-live="polite">
              {countBefore}
              <span className="font-semibold text-foreground tabular">{total}</span>
              {countAfter}
            </p>
          </div>
        </div>
      </div>

      <div className="container-page pb-20">
        <DealsToolbar activeCount={filterCount} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[16.25rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[10rem] flex max-h-[calc(100vh-11.5rem)] flex-col rounded-2xl border border-border/80 bg-card shadow-card">
              <div className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4">
                <h2 className="inline-flex items-center gap-2 font-sans text-sm font-semibold">
                  <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-gold-soft text-gold-foreground">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </span>
                  {t("filters.title")}
                </h2>
                {filterCount > 0 && (
                  <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground tabular">
                    {t("filters.active", { n: filterCount })}
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 [scrollbar-width:thin]">
                <FilterPanel />
                {/* Fades the last rows so it's clear the panel scrolls. */}
                <div aria-hidden className="pointer-events-none sticky bottom-0 -mx-5 mt-2 h-6 bg-gradient-to-t from-card to-transparent" />
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {(chips.length > 0 || rows.length > 0) && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                {chips.length > 0 ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline">
                      {t("chips.label")}
                    </span>
                    <ul aria-label={t("chips.label")} className="flex flex-wrap items-center gap-2">
                      {chips.map((c, i) => (
                        <li key={`${c.key}-${i}`}>
                          <Link
                            href={c.href}
                            scroll={false}
                            aria-label={t("chips.remove", { label: c.label })}
                            className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-ink/15 bg-card py-1 ps-3 pe-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span dir="auto" className="truncate">
                              {c.label}
                            </span>
                            <span
                              aria-hidden
                              className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-ink group-hover:text-primary-foreground"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          href={clearHref}
                          scroll={false}
                          className="rounded-full px-2 py-1 text-xs font-semibold text-foreground underline decoration-gold decoration-2 underline-offset-4 transition-colors hover:text-gold-foreground hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {t("chips.clearAll")}
                        </Link>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground tabular">
                    {t("results.showing", {
                      from: (filters.page - 1) * PAGE_SIZE + 1,
                      to: (filters.page - 1) * PAGE_SIZE + rows.length,
                      total,
                    })}
                  </p>
                )}
                {rows.length > 0 && <SaveSearchButton summary={summary} />}
              </div>
            )}

            {rows.length === 0 ? (
              <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-card/70 px-6 py-16 text-center shadow-card sm:px-12">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-28 mx-auto h-56 w-80 bg-glow-gold opacity-40" />
                <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-soft text-gold-foreground ring-8 ring-gold-soft/50">
                  <SearchX className="h-7 w-7" aria-hidden />
                </div>
                <h2 className="relative mt-6 text-2xl font-semibold">{t("empty.title")}</h2>
                <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t("empty")}</p>
                <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
                  {chips.length > 0 && (
                    <Button asChild variant="outline" className="rounded-full bg-card">
                      <Link href={clearHref} scroll={false}>
                        <RotateCcw />
                        {t("empty.clear")}
                      </Link>
                    </Button>
                  )}
                  <SaveSearchButton summary={summary} tone="cta" />
                </div>
              </div>
            ) : (
              <div
                className={
                  layout === "grid"
                    ? "grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid gap-5"
                }
              >
                {rows.map((d) => (
                  <DealCard key={d.id} deal={d} layout={layout} watching={watched.has(d.id)} />
                ))}
              </div>
            )}

            {rows.some((d) => d.isSample) && (
              <p className="mt-8 flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                {tc("sampleLegend")}
              </p>
            )}

            {pages > 1 && (
              <nav className="mt-14 flex flex-col items-center gap-3" aria-label={t("pagination.label")}>
                <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/80 bg-card p-1 shadow-card">
                  <Link
                    href={pageHref(filters.page - 1)}
                    aria-disabled={filters.page <= 1 || undefined}
                    tabIndex={filters.page <= 1 ? -1 : undefined}
                    className={cn(pill, "hover:bg-muted", filters.page <= 1 && "pointer-events-none opacity-40")}
                  >
                    <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                    {t("pagination.previous")}
                  </Link>
                  <ul className="hidden items-center gap-1 sm:flex">
                    {pageList(filters.page, pages).map((n, i) =>
                      n === "gap" ? (
                        <li key={`gap-${i}`} aria-hidden className="px-1 text-sm text-muted-foreground">
                          …
                        </li>
                      ) : (
                        <li key={n}>
                          <Link
                            href={pageHref(n)}
                            aria-label={t("pagination.goTo", { page: n })}
                            aria-current={n === filters.page ? "page" : undefined}
                            className={cn(
                              pill,
                              "px-0 tabular",
                              n === filters.page ? "bg-ink text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {n}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                  <Link
                    href={pageHref(filters.page + 1)}
                    aria-disabled={filters.page >= pages || undefined}
                    tabIndex={filters.page >= pages ? -1 : undefined}
                    className={cn(pill, "hover:bg-muted", filters.page >= pages && "pointer-events-none opacity-40")}
                  >
                    {t("pagination.next")}
                    <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground tabular">{t("pagination.page", { page: filters.page, pages })}</p>
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
