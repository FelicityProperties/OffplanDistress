import Link from "next/link";
import { ArrowLeft, Download, Search } from "lucide-react";
import { AdminChips } from "@/components/admin/AdminTabs";
import { PHONE_BUTTON, PHONE_LINK } from "@/components/admin/phone";
import { PageTitle } from "@/components/Kpi";
import { SampleBadge, StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLocale, getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { LISTING_STATUS, type ListingStatusKey } from "@/lib/config";
import { adminListings } from "@/lib/admin";
import { formatAEDCompact, parseRefCode, refCode } from "@/lib/format";
import { cn } from "@/lib/utils";

// Every status has its column, withdrawn included (a withdrawn unit can be put back on the market from its page).
const COLUMNS: ListingStatusKey[] = ["pending_review", "live", "under_offer", "noc_in_progress", "transferred", "paused", "rejected", "withdrawn"];
/** Cards per column on the board (newest first), and per page of a column's or a search's full list. */
const COLUMN_MAX = 50;
const PAGE_SIZE = 60;

type Row = Awaited<ReturnType<typeof adminListings>>[number];

/** "OD-1234", "od 1234" or "1234" (the reference as shown, refCode): that listing's ref_no; null for anything else. */
function refQuery(q: string) {
  const m = /^(?:od[\s-]*)?(\d{1,10})$/i.exec(q.trim());
  return m ? parseRefCode(`OD-${m[1]}`) : null;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Typed by hand (not PageProps<"/admin/pipeline">), as /admin/users, so it compiles before Next regenerates route types.
export default async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [all, t, tc, ti, locale] = await Promise.all([adminListings(), getT("admin"), getT("common"), getT("intake"), getLocale()]);
  const statusParam = one(sp.status);
  // Own keys only: ?status=toString (or constructor, __proto__) is no stage.
  const stage = statusParam && Object.hasOwn(LISTING_STATUS, statusParam) ? (statusParam as ListingStatusKey) : null;
  const q = (one(sp.q) ?? "").trim().slice(0, 80);
  const byStage = new Map(COLUMNS.map((col) => [col, all.filter((l) => l.status === col)]));
  // Phones (below md): the stages as chips with their counts, the current one marked (the board's eight 240 px columns
  // showed one and a half on a phone, the rest off-screen); from md, the board.
  const stageChips = (current: ListingStatusKey | null) => (
    <AdminChips
      label={t("pipeline.stages")}
      current={current}
      className="md:hidden"
      chips={COLUMNS.map((col) => ({
        key: col,
        href: `/admin/pipeline?status=${col}`,
        label: tc(`listing.${col}`),
        count: byStage.get(col)?.length ?? 0,
      }))}
    />
  );

  const card = (l: Row) => (
    <Link key={l.id} href={`/admin/listings/${l.id}`} className="block rounded-lg border bg-card p-3 text-sm shadow-card hover:border-gold">
      <p dir="auto" className="line-clamp-1 font-medium">{l.projectName}</p>
      <p className="text-xs text-muted-foreground tabular">
        <bdi>{refCode(l.refNo)}</bdi> · {formatAEDCompact(l.askingPrice, locale)} · {tc(`unit.${l.unitType}`)}
      </p>
      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {t("pipeline.counts", { offers: l.offers, watchers: l.watchers })}
        {l.isSample && <SampleBadge />}
      </p>
      {/* Imported, still under its network's placeholder owner: nobody to review it with yet. */}
      {l.awaitingOwner && (
        <p className="mt-1">
          <StatusPill tone="warning">{ti("owner.badge")}</StatusPill>
        </p>
      )}
    </Link>
  );

  const search = (
    <form role="search" method="get" action="/admin/pipeline" className="flex w-full max-w-md items-end gap-2">
      {stage && <input type="hidden" name="status" value={stage} />}
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor="pipeline-q" className="text-sm font-medium">
          {t("pipeline.search")}
        </label>
        <Input
          id="pipeline-q"
          name="q"
          type="search"
          dir="auto"
          maxLength={80}
          defaultValue={q}
          placeholder={t("pipeline.searchPlaceholder")}
          className="max-lg:h-11"
        />
      </div>
      <Button type="submit" variant="outline" className="max-lg:h-11">
        <Search aria-hidden /> {t("pipeline.searchSubmit")}
      </Button>
    </form>
  );

  const title = (
    <PageTitle title={t("pipeline.title")} sub={t("pipeline.sub")}>
      {/* Every deal file with both parties, for our records and AML inspections (src/lib/deals.ts). */}
      <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
        <a href="/api/admin/export/deals.csv" download>
          <Download aria-hidden /> {t("dealFile.export")}
        </a>
      </Button>
    </PageTitle>
  );

  // One stage in full, or a search (in one stage, or across all of them): every match, a page at a time.
  if (stage || q) {
    const ref = q ? refQuery(q) : null;
    const needle = q.toLocaleLowerCase(locale);
    const matches = all.filter(
      (l) =>
        (!stage || l.status === stage) &&
        // A number that is no listing's reference (OD-0999, say) matches none rather than every project.
        (!q || (/^(?:od[\s-]*)?\d+$/i.test(q) ? l.refNo === ref : l.projectName.toLocaleLowerCase(locale).includes(needle))),
    );
    const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    const pageParam = Number(one(sp.page));
    const page = Number.isInteger(pageParam) && pageParam >= 1 ? Math.min(pageParam, pages) : 1;
    const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const href = (p: number) => {
      const qs = new URLSearchParams();
      if (stage) qs.set("status", stage);
      if (q) qs.set("q", q);
      if (p > 1) qs.set("page", String(p));
      return `/admin/pipeline?${qs}`;
    };
    const heading = q
      ? t("pipeline.results", { q, count: matches.length })
      : t("pipeline.stageList", { stage: tc(`listing.${stage!}`), count: matches.length });
    return (
      <div className="space-y-6">
        {title}
        <div className="flex flex-wrap items-end justify-between gap-4">
          {search}
          <Link href="/admin/pipeline" className={cn("inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground", PHONE_LINK)}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden /> {t("pipeline.backToBoard")}
          </Link>
        </div>
        {/* One stage: the others a tap away on a phone. */}
        {stage && !q && stageChips(stage)}
        <section aria-labelledby="pipeline-list" className="space-y-3" data-testid="pipeline-list">
          <h2 id="pipeline-list" className="font-sans text-lg font-semibold wrap-anywhere">
            {stage && q ? `${tc(`listing.${stage}`)} · ${heading}` : heading}
          </h2>
          {shown.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shown.map(card)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">{q ? t("pipeline.noResults", { q }) : t("pipeline.empty")}</p>
          )}
          {pages > 1 && (
            <nav aria-label={t("pipeline.page", { page, pages })} className="flex flex-wrap items-center gap-3 text-sm">
              {page > 1 && (
                <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
                  <Link href={href(page - 1)}>{t("pipeline.prev")}</Link>
                </Button>
              )}
              <span className="text-muted-foreground tabular">{t("pipeline.page", { page, pages })}</span>
              {page < pages && (
                <Button asChild size="sm" variant="outline" className={PHONE_BUTTON}>
                  <Link href={href(page + 1)}>{t("pipeline.next")}</Link>
                </Button>
              )}
            </nav>
          )}
        </section>
      </div>
    );
  }

  // On a phone the board opens on its first stage with listings in it (usually those under review).
  const first = COLUMNS.find((col) => (byStage.get(col)?.length ?? 0) > 0) ?? null;
  const firstItems = first ? (byStage.get(first) ?? []) : [];
  return (
    <div className="space-y-6">
      {title}
      {search}
      <div className="space-y-4 md:hidden" data-testid="pipeline-phone">
        {stageChips(first)}
        {first && (
          <section aria-labelledby="pipeline-phone-stage" className="space-y-3">
            <h2 id="pipeline-phone-stage" className="font-sans text-lg font-semibold">
              {t("pipeline.stageList", { stage: tc(`listing.${first}`), count: firstItems.length })}
            </h2>
            <div className="grid gap-2">{firstItems.slice(0, COLUMN_MAX).map(card)}</div>
            {firstItems.length > COLUMN_MAX && (
              <Link href={`/admin/pipeline?status=${first}`} className={cn("text-sm font-medium underline-offset-4 hover:underline", PHONE_LINK)}>
                {t("pipeline.showAll", { count: firstItems.length })}
              </Link>
            )}
          </section>
        )}
      </div>
      <div className="hidden gap-4 overflow-x-auto pb-4 md:flex">
        {COLUMNS.map((col) => {
          const items = byStage.get(col) ?? [];
          return (
            <div key={col} className="w-60 shrink-0 rounded-xl bg-secondary p-3" data-stage={col}>
              <p className="mb-3 flex items-center justify-between text-sm font-semibold">
                {tc(`listing.${col}`)}
                <span className="text-xs text-muted-foreground tabular">{items.length}</span>
              </p>
              <div className="space-y-2">
                {items.slice(0, COLUMN_MAX).map(card)}
                {items.length > COLUMN_MAX && (
                  <Link
                    href={`/admin/pipeline?status=${col}`}
                    className="block rounded-lg px-1 py-1.5 text-sm font-medium underline-offset-4 hover:underline"
                    data-testid="pipeline-show-all"
                  >
                    {t("pipeline.showAll", { count: items.length })}
                  </Link>
                )}
                {items.length === 0 && <p className="px-1 text-xs text-muted-foreground">{t("pipeline.empty")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
