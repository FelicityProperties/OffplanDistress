"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, BadgeCheck, Bell, Check, LayoutGrid, List, Loader2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { saveSearch } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocale, useLocalePath, useT } from "@/i18n/client";
import { COMMUNITIES, DEVELOPERS, MOTIVATION, UNIT_TYPES, type UnitTypeKey } from "@/lib/config";
import { formatAEDCompact } from "@/lib/format";
import { communityName, developerName } from "@/lib/place-names";
import { cn } from "@/lib/utils";

const MAX_BUDGET = 8_000_000;
/** Cash at transfer adds roughly 7% in fees (and any arrears) to the equity, so its slider runs higher. */
const MAX_TRANSFER = 10_000_000;
const YEARS = [2026, 2027, 2028, 2029];

/** Communities and developers that have listings on the market (lib/listings dealFacets). */
export type Facets = { communities: string[]; developers: string[] };

/**
 * The toolbar's transition, shared with the filters sheet it opens: an update started in the sheet shows on the
 * sheet's "Show N deals" button and on the search box's spinner. The desktop column's panel keeps its own.
 */
const SharedTransition = createContext<ReturnType<typeof useTransition> | null>(null);

/** Every filter off (the search text, sort order and view stay). */
function clearFilters(p: URLSearchParams) {
  for (const k of [...p.keys()]) if (!["q", "sort", "view"].includes(k)) p.delete(k);
}

function useParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const lp = useLocalePath();
  const own = useTransition();
  const [pending, start] = useContext(SharedTransition) ?? own;

  function update(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    // Stays on /ar/deals on the Arabic page.
    start(() => router.replace(lp(`${pathname}?${next.toString()}`), { scroll: false }));
  }
  return { params, update, pending };
}

/** One block of the filter panel: a small uppercase header (with an optional value on the end) over its control. */
function FilterSection({ title, value, children }: { title: string; value?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/70 pt-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        {/* 12px below lg (phones and the filters sheet), 11px in the desktop column as before. */}
        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground max-lg:text-xs">{title}</h3>
        {value != null && <span className="text-xs font-semibold text-foreground tabular">{value}</span>}
      </div>
      {children}
    </section>
  );
}

/** A multi-value parameter as parseFilters reads it: repeated keys, comma-joined values (community=A,B) or both. */
function getList(params: URLSearchParams, name: string) {
  return params
    .getAll(name)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * A finite number from the query string, or null for a missing, malformed ("abc") or non-positive one: the server
 * ignores those (parseFilters), so the panel shows them as unset rather than "AED NaN".
 */
function positiveParam(params: URLSearchParams, name: string) {
  const n = Number(params.get(name) ?? "");
  return Number.isFinite(n) && n > 0 ? n : null;
}

function CheckGroup({ label, name, options }: { label: string; name: string; options: [string, string][] }) {
  const { params, update } = useParamsUpdater();
  const selected = getList(params, name);
  const count = options.filter(([v]) => selected.includes(v)).length;
  return (
    <FilterSection
      title={label}
      value={
        count > 0 ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold-soft px-1.5 text-[11px] text-gold-foreground max-lg:text-xs">
            {count}
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        {options.map(([value, text]) => {
          const on = selected.includes(value);
          return (
            <label
              key={value}
              className={cn(
                // 40px tall below lg: a finger-sized chip (the 8px gap keeps neighbours apart).
                "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border py-1.5 ps-2 pe-3 text-xs font-medium transition-colors max-lg:min-h-10 max-lg:py-2 max-lg:ps-2.5 max-lg:pe-3.5",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background",
                on
                  ? "border-ink bg-ink text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground",
              )}
            >
              <Checkbox
                checked={on}
                onCheckedChange={(next) =>
                  update((p) => {
                    // Written back as repeated keys, so a comma-joined link keeps its other values.
                    const rest = getList(p, name).filter((v) => v !== value);
                    p.delete(name);
                    for (const v of next ? [...rest, value] : rest) p.append(name, v);
                  })
                }
                className="size-3.5 rounded-full border-current shadow-none focus-visible:ring-0 data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-gold-foreground [&_svg]:size-2.5"
              />
              {text}
            </label>
          );
        })}
      </div>
    </FilterSection>
  );
}

function RangeFilter({
  label,
  name,
  max,
  step,
  format,
}: {
  label: string;
  name: string;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  const { params, update } = useParamsUpdater();
  const current = positiveParam(params, name) ?? 0;
  const [value, setValue] = useState(current);
  useEffect(() => setValue(current), [current]);
  return (
    <FilterSection title={label} value={format(value)}>
      <Slider
        min={0}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => setValue(v[0] ?? 0)}
        onValueCommit={(v) => update((p) => (v[0] ? p.set(name, String(v[0])) : p.delete(name)))}
        aria-label={label}
        valueText={format}
        className="py-1.5"
      />
    </FilterSection>
  );
}

/**
 * A min–max AED range on two query parameters. "minCash"/"maxCash" are the upfront cash to the seller (the asking
 * price, as saved searches and /market links have always meant it); "minTransfer"/"maxTransfer" the cash needed on
 * transfer day (src/lib/listings.ts cashToCloseSql).
 */
function BudgetFilter({
  title,
  label,
  hint,
  minName,
  maxName,
  ceiling,
}: {
  title: string;
  label: string;
  hint?: string;
  minName: string;
  maxName: string;
  ceiling: number;
}) {
  const t = useT("deals");
  const locale = useLocale();
  const { params, update } = useParamsUpdater();
  const min = positiveParam(params, minName) ?? 0;
  // 0 is "no limit" on the server too (parseFilters).
  const max = Math.min(positiveParam(params, maxName) ?? ceiling, ceiling);
  const [value, setValue] = useState<[number, number]>([min, max]);
  useEffect(() => setValue([min, max]), [min, max]);
  // The panel renders twice (desktop column, phone sheet), so the hint's id is unique per instance.
  const uid = useId();
  const hintId = hint ? `${uid}-hint` : undefined;
  return (
    <FilterSection title={title}>
      <p className="mb-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground tabular">
        <bdi>{formatAEDCompact(value[0], locale)}</bdi>
        <span aria-hidden className="px-1">
          –
        </span>
        <bdi>{value[1] >= ceiling ? t("filters.any") : formatAEDCompact(value[1], locale)}</bdi>
      </p>
      <Slider
        min={0}
        max={ceiling}
        step={50_000}
        value={value}
        onValueChange={(v) => setValue([v[0] ?? 0, v[1] ?? ceiling])}
        onValueCommit={(v) =>
          update((p) => {
            if (v[0]) p.set(minName, String(v[0]));
            else p.delete(minName);
            if (v[1] != null && v[1] < ceiling) p.set(maxName, String(v[1]));
            else p.delete(maxName);
          })
        }
        aria-label={label}
        thumbLabels={[t("filters.rangeMin", { label }), t("filters.rangeMax", { label })]}
        valueText={(v) => (v >= ceiling ? t("filters.any") : formatAEDCompact(v, locale))}
        aria-describedby={hintId}
        className="py-1.5"
      />
      {hint && (
        <p id={hintId} className="mt-3 text-[11px] leading-relaxed text-muted-foreground max-lg:text-xs">
          {hint}
        </p>
      )}
    </FilterSection>
  );
}

/** Below lg a select option is 44px tall (32px in the desktop column, as before). */
const OPTION = "max-lg:min-h-11";

/** `reset`: the "Reset filters" button at the end; the phone sheet has its own in its footer. */
export function FilterPanel({ facets, reset = true }: { facets: Facets; reset?: boolean }) {
  const t = useT("deals");
  const tc = useT("common");
  const locale = useLocale();
  const { params, update } = useParamsUpdater();
  const handoverBy = params.get("handoverBy") ?? "any";
  // Only names with listings, so the panel stays short; a ticked one stays listed so it can be unticked.
  const choices = (name: string, all: string[], available: string[], label: (v: string) => string) => {
    const ticked = getList(params, name).filter((v) => all.includes(v));
    const collator = new Intl.Collator(locale);
    return [...new Set([...available, ...ticked])]
      .map((v): [string, string] => [v, label(v)])
      .sort((a, b) => collator.compare(a[1], b[1]));
  };
  const communities = choices("community", COMMUNITIES, facets.communities, (c) => communityName(tc, c));
  const developers = choices("developer", DEVELOPERS, facets.developers, (d) => developerName(tc, d));
  return (
    <div className="space-y-5">
      <BudgetFilter
        title={t("filters.transfer")}
        label={t("filters.transferLabel")}
        hint={t("filters.transferHint")}
        minName="minTransfer"
        maxName="maxTransfer"
        ceiling={MAX_TRANSFER}
      />
      <BudgetFilter title={t("filters.budget")} label={t("filters.budgetLabel")} minName="minCash" maxName="maxCash" ceiling={MAX_BUDGET} />
      {communities.length > 0 && <CheckGroup label={t("filters.community")} name="community" options={communities} />}
      {developers.length > 0 && <CheckGroup label={t("filters.developer")} name="developer" options={developers} />}
      <CheckGroup
        label={t("filters.unitType")}
        name="type"
        options={(Object.keys(UNIT_TYPES) as UnitTypeKey[]).map((k) => [k, tc(`unit.${k}`)])}
      />
      <RangeFilter
        label={t("filters.minPaid")}
        name="minPaid"
        max={60}
        step={5}
        format={(v) => t("filters.atLeastPct", { v })}
      />
      <RangeFilter
        label={t("filters.minDiscount")}
        name="minDiscount"
        max={30}
        step={1}
        format={(v) => t("filters.atLeastPct", { v })}
      />
      <FilterSection title={t("filters.handoverBy")}>
        <Select
          value={handoverBy}
          onValueChange={(v) => update((p) => (v === "any" ? p.delete("handoverBy") : p.set("handoverBy", v)))}
        >
          <SelectTrigger aria-label={t("filters.handoverBy")} className="h-10 rounded-xl bg-background max-lg:h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any" className={OPTION}>
              {t("filters.anyTime")}
            </SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)} className={OPTION}>
                {t("filters.endOfYear", { year: y })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
      <CheckGroup
        label={t("filters.motivation")}
        name="motivation"
        options={(Object.keys(MOTIVATION) as (keyof typeof MOTIVATION)[]).map((k) => [k, tc(`motivation.${k}`)])}
      />
      <section className="border-t border-border/70 pt-5">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm font-semibold transition-colors hover:border-foreground/25 has-[[data-state=checked]]:border-success/40 has-[[data-state=checked]]:bg-success-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
          <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <span className="flex-1">{t("filters.verifiedOnly")}</span>
          <Checkbox
            checked={params.get("verified") === "1"}
            onCheckedChange={(on) => update((p) => (on ? p.set("verified", "1") : p.delete("verified")))}
            className="focus-visible:ring-0 data-[state=checked]:border-success data-[state=checked]:bg-success data-[state=checked]:text-success-foreground"
          />
        </label>
      </section>
      {reset && (
        <Button variant="outline" className="w-full rounded-xl" onClick={() => update(clearFilters)}>
          <RotateCcw />
          {t("filters.reset")}
        </Button>
      )}
    </div>
  );
}

const SORTS = ["discount", "cash", "handover", "newest"] as const;

/** The filters sheet's side padding: 20px, or more where a landscape phone's notch is (viewport-fit=cover). */
const GUTTER = "max(1.25rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))";

type ToolbarProps = {
  activeCount?: number;
  facets: Facets;
  /** Deals the current filters find: the filters sheet's "Show N deals" button. */
  total: number;
};

/**
 * Search, the filters sheet (below lg), sort and the grid/list toggle: one sticky glass bar on desktop, two rows below
 * lg (search on its own, so its hint fits).
 */
export function DealsToolbar(props: ToolbarProps) {
  const transition = useTransition();
  return (
    <SharedTransition.Provider value={transition}>
      <Toolbar {...props} />
    </SharedTransition.Provider>
  );
}

function Toolbar({ activeCount = 0, facets, total }: ToolbarProps) {
  const t = useT("deals");
  const { params, update, pending } = useParamsUpdater();
  const paramQ = params.get("q") ?? "";
  const [q, setQ] = useState(paramQ);
  // The last query this box sent to the URL: lets a chip / "Clear all" link reset the box without
  // clobbering what the visitor is still typing while their own search loads.
  const pushed = useRef(paramQ);
  const sort = params.get("sort") ?? "discount";
  const sortKey = (SORTS as readonly string[]).includes(sort) ? (sort as (typeof SORTS)[number]) : "discount";
  const view = params.get("view") === "list" ? "list" : "grid";

  function search(text: string) {
    const next = text.trim();
    // pushed: the search key and the debounce below can both send the same query before the URL has it.
    if (paramQ !== next && pushed.current !== next) {
      pushed.current = next;
      update((p) => (next ? p.set("q", next) : p.delete("q")));
    }
  }

  useEffect(() => {
    if (paramQ !== pushed.current) {
      pushed.current = paramQ;
      setQ(paramQ);
    }
  }, [paramQ]);

  useEffect(() => {
    const timer = setTimeout(() => search(q), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div
      data-sticky-toolbar
      className="z-30 mt-6 flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/85 p-2 shadow-card backdrop-blur-xl backdrop-saturate-150 lg:sticky lg:top-20 lg:flex-row lg:items-center"
    >
      {/* Enter (the phone keyboard's search key) runs the search at once; on a touch screen it also puts the keyboard
          away. */}
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          search(q);
          if (window.matchMedia("(pointer: coarse)").matches) (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        {pending ? (
          <Loader2 className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gold" aria-hidden />
        ) : (
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          inputMode="search"
          enterKeyHint="search"
          className="peer h-11 rounded-xl border-border/70 bg-background/80 ps-10 shadow-none focus-visible:ring-2 max-sm:placeholder:text-transparent"
          aria-label={t("search.label")}
        />
        {/* Phones: a shorter hint in the placeholder's place (the full one, cut off there, stays for screen readers). */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-10 end-3 hidden truncate text-base leading-[2.75rem] text-muted-foreground max-sm:peer-placeholder-shown:block"
        >
          {t("search.placeholderShort")}
        </span>
      </form>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 rounded-xl bg-background/80 shadow-none max-sm:flex-1 lg:hidden">
              <SlidersHorizontal />
              {t("filters.title")}
              {activeCount > 0 && (
                <span
                  aria-hidden
                  className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-xs font-semibold text-primary-foreground tabular"
                >
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          {/* A bottom sheet nearly the screen's height: the title row, the filters scrolling under it, and a footer
              that stays with the live count. Its own padding (and safe areas) move into those rows. */}
          <SheetContent
            side="bottom"
            className="flex h-[calc(100dvh-2.5rem)] flex-col gap-0 rounded-t-3xl p-0 sm:mx-auto sm:max-w-2xl"
            style={{ paddingBottom: 0, paddingInline: 0 }}
          >
            <div aria-hidden className="absolute inset-x-0 top-2 mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            {/* 60px tall: the sheet's close button sits on its end side, centred on the same line. */}
            <div className="flex h-15 shrink-0 items-center gap-2 border-b border-border/70 pe-16" style={{ paddingInlineStart: GUTTER }}>
              <SheetTitle className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-gold" aria-hidden />
                {t("filters.title")}
              </SheetTitle>
              {activeCount > 0 && (
                <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-primary-foreground tabular">
                  {t("filters.active", { n: activeCount })}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 pt-5" style={{ paddingInline: GUTTER }}>
              <FilterPanel facets={facets} reset={false} />
            </div>
            <div
              className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-border/70 bg-background pt-3"
              style={{ paddingInline: GUTTER, paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
            >
              {/* "Clear all" (the results' chip row word): shorter than "Reset filters", so the count fits at 320px. */}
              <Button variant="outline" className="h-12 rounded-xl" disabled={activeCount === 0} onClick={() => update(clearFilters)}>
                <RotateCcw />
                {t("chips.clearAll")}
              </Button>
              <SheetClose asChild>
                <Button className="h-12 min-w-0 rounded-xl">
                  {pending && <Loader2 className="animate-spin" aria-hidden />}
                  <span aria-live="polite" className="truncate">
                    {pending ? t("filters.updating") : t(total === 1 ? "filters.showOne" : "filters.showMany", { count: total })}
                  </span>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
        <Label className="sr-only" htmlFor="sort">
          {t("sort.label")}
        </Label>
        <Select value={sort} onValueChange={(v) => update((p) => p.set("sort", v))}>
          <SelectTrigger
            id="sort"
            className="h-11 min-w-0 flex-1 rounded-xl border-border/70 bg-background/80 shadow-none max-sm:justify-center max-sm:gap-2 sm:w-52 sm:flex-none"
          >
            {/* Phones: "Sort" and an icon, as the orders don't fit there (the current one is ticked in the list, and
                read out); from sm the current order, as before. */}
            <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
            <SelectValue>
              <span aria-hidden className="sm:hidden">
                {t("sort.label")}
              </span>
              <span className="max-sm:sr-only">{t(`sort.${sortKey}`)}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="discount" className={OPTION}>
              {t("sort.discount")}
            </SelectItem>
            <SelectItem value="cash" className={OPTION}>
              {t("sort.cash")}
            </SelectItem>
            <SelectItem value="handover" className={OPTION}>
              {t("sort.handover")}
            </SelectItem>
            <SelectItem value="newest" className={OPTION}>
              {t("sort.newest")}
            </SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && update((p) => (v === "list" ? p.set("view", "list") : p.delete("view")))}
          className="hidden h-11 rounded-xl bg-muted/80 p-1 sm:ms-auto sm:flex"
        >
          {(
            [
              ["grid", LayoutGrid, t("view.grid")],
              ["list", List, t("view.list")],
            ] as const
          ).map(([value, Icon, label]) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={label}
              title={label}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-card/70 hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

export function SaveSearchButton({ summary, tone = "subtle" }: { summary: string; tone?: "subtle" | "cta" }) {
  const t = useT("deals");
  const router = useRouter();
  const params = useSearchParams();
  const lp = useLocalePath();
  const [pending, start] = useTransition();
  // The filters just saved (or found saved already): the button says so rather than saving them, and alerting, twice.
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const saved = savedFor === params.toString();
  return (
    <Button
      variant={tone === "cta" ? "default" : "outline"}
      size={tone === "cta" ? "default" : "sm"}
      className={cn("rounded-full", tone === "subtle" && "h-9 bg-card px-4 shadow-none max-lg:h-11", tone === "cta" && "max-lg:h-11")}
      disabled={pending || saved}
      onClick={() =>
        start(async () => {
          const query = params.toString();
          const res = await saveSearch(summary, query);
          if (res.needsAuth) {
            toast(t("saveSearch.needsAuth"));
            router.push(lp(`/login?next=${encodeURIComponent(`/deals?${query}`)}`));
          } else if (res.error) toast.error(res.error);
          else {
            setSavedFor(query);
            toast.success(t(res.existing ? "saveSearch.already" : "saveSearch.saved"));
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : saved ? (
        <Check className={cn(tone === "subtle" && "text-gold")} />
      ) : (
        <Bell className={cn(tone === "subtle" && "text-gold")} />
      )}{" "}
      {t(saved ? "saveSearch.savedButton" : "saveSearch.button")}
    </Button>
  );
}
