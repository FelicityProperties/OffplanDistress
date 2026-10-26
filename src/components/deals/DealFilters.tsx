"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Bell, LayoutGrid, List, Loader2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { saveSearch } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocale, useT } from "@/i18n/client";
import { COMMUNITIES, DEVELOPERS, MOTIVATION, UNIT_TYPES, type UnitTypeKey } from "@/lib/config";
import { formatAEDCompact } from "@/lib/format";
import { communityName, developerName } from "@/lib/place-names";
import { cn } from "@/lib/utils";

const MAX_BUDGET = 8_000_000;
const YEARS = [2026, 2027, 2028, 2029];

/** Communities and developers that have listings on the market (lib/listings dealFacets). */
export type Facets = { communities: string[]; developers: string[] };

function useParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function update(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }
  return { params, update, pending };
}

/** One block of the filter panel: a small uppercase header (with an optional value on the end) over its control. */
function FilterSection({ title, value, children }: { title: string; value?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/70 pt-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
        {value != null && <span className="text-xs font-semibold text-foreground tabular">{value}</span>}
      </div>
      {children}
    </section>
  );
}

function CheckGroup({ label, name, options }: { label: string; name: string; options: [string, string][] }) {
  const { params, update } = useParamsUpdater();
  const selected = params.getAll(name);
  const count = options.filter(([v]) => selected.includes(v)).length;
  return (
    <FilterSection
      title={label}
      value={
        count > 0 ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold-soft px-1.5 text-[11px] text-gold-foreground">
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
                "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border py-1.5 ps-2 pe-3 text-xs font-medium transition-colors",
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
                    const rest = p.getAll(name).filter((v) => v !== value);
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
  const current = Number(params.get(name) ?? 0);
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
        className="py-1.5"
      />
    </FilterSection>
  );
}

function BudgetFilter() {
  const t = useT("deals");
  const locale = useLocale();
  const { params, update } = useParamsUpdater();
  const min = Number(params.get("minCash") ?? 0);
  const max = Number(params.get("maxCash") ?? MAX_BUDGET);
  const [value, setValue] = useState<[number, number]>([min, max]);
  useEffect(() => setValue([min, max]), [min, max]);
  return (
    <FilterSection title={t("filters.budget")}>
      <p className="mb-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground tabular">
        {formatAEDCompact(value[0], locale)} – {value[1] >= MAX_BUDGET ? t("filters.any") : formatAEDCompact(value[1], locale)}
      </p>
      <Slider
        min={0}
        max={MAX_BUDGET}
        step={50_000}
        value={value}
        onValueChange={(v) => setValue([v[0] ?? 0, v[1] ?? MAX_BUDGET])}
        onValueCommit={(v) =>
          update((p) => {
            if (v[0]) p.set("minCash", String(v[0]));
            else p.delete("minCash");
            if (v[1] != null && v[1] < MAX_BUDGET) p.set("maxCash", String(v[1]));
            else p.delete("maxCash");
          })
        }
        aria-label={t("filters.budgetLabel")}
        className="py-1.5"
      />
    </FilterSection>
  );
}

export function FilterPanel({ facets }: { facets: Facets }) {
  const t = useT("deals");
  const tc = useT("common");
  const locale = useLocale();
  const { params, update } = useParamsUpdater();
  const handoverBy = params.get("handoverBy") ?? "any";
  // Only names with listings, so the panel stays short; a ticked one stays listed so it can be unticked.
  const choices = (name: string, all: string[], available: string[], label: (v: string) => string) => {
    const ticked = params.getAll(name).filter((v) => all.includes(v));
    const collator = new Intl.Collator(locale);
    return [...new Set([...available, ...ticked])]
      .map((v): [string, string] => [v, label(v)])
      .sort((a, b) => collator.compare(a[1], b[1]));
  };
  const communities = choices("community", COMMUNITIES, facets.communities, (c) => communityName(tc, c));
  const developers = choices("developer", DEVELOPERS, facets.developers, (d) => developerName(tc, d));
  return (
    <div className="space-y-5">
      <BudgetFilter />
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
          <SelectTrigger aria-label={t("filters.handoverBy")} className="h-10 rounded-xl bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t("filters.anyTime")}</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
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
      <Button
        variant="outline"
        className="w-full rounded-xl"
        onClick={() =>
          update((p) => {
            for (const k of [...p.keys()]) if (!["q", "sort", "view"].includes(k)) p.delete(k);
          })
        }
      >
        <RotateCcw />
        {t("filters.reset")}
      </Button>
    </div>
  );
}

/** Search, mobile filters sheet, sort and grid/list toggle — a sticky glass bar on desktop. */
export function DealsToolbar({ activeCount = 0, facets }: { activeCount?: number; facets: Facets }) {
  const t = useT("deals");
  const { params, update, pending } = useParamsUpdater();
  const paramQ = params.get("q") ?? "";
  const [q, setQ] = useState(paramQ);
  // The last query this box sent to the URL: lets a chip / "Clear all" link reset the box without
  // clobbering what the visitor is still typing while their own search loads.
  const pushed = useRef(paramQ);
  const sort = params.get("sort") ?? "discount";
  const view = params.get("view") === "list" ? "list" : "grid";

  useEffect(() => {
    if (paramQ !== pushed.current) {
      pushed.current = paramQ;
      setQ(paramQ);
    }
  }, [paramQ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = q.trim();
      if (paramQ !== next) {
        pushed.current = next;
        update((p) => (next ? p.set("q", next) : p.delete("q")));
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div
      data-sticky-toolbar
      className="z-30 mt-6 flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/85 p-2 shadow-card backdrop-blur-xl backdrop-saturate-150 sm:flex-row sm:items-center lg:sticky lg:top-20"
    >
      <div className="relative flex-1">
        {pending ? (
          <Loader2 className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gold" aria-hidden />
        ) : (
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          className="h-11 rounded-xl border-border/70 bg-background/80 ps-10 shadow-none focus-visible:ring-2"
          aria-label={t("search.label")}
        />
      </div>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 rounded-xl bg-background/80 shadow-none lg:hidden">
              <SlidersHorizontal />
              {t("filters.title")}
              {activeCount > 0 && (
                <span
                  aria-hidden
                  className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-primary-foreground tabular"
                >
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="start" className="overflow-y-auto p-6">
            <SheetTitle className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gold" aria-hidden />
              {t("filters.title")}
            </SheetTitle>
            <div className="mt-6">
              <FilterPanel facets={facets} />
            </div>
          </SheetContent>
        </Sheet>
        <Label className="sr-only" htmlFor="sort">
          {t("sort.label")}
        </Label>
        <Select value={sort} onValueChange={(v) => update((p) => p.set("sort", v))}>
          <SelectTrigger id="sort" className="h-11 min-w-0 flex-1 rounded-xl border-border/70 bg-background/80 shadow-none sm:w-52 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="discount">{t("sort.discount")}</SelectItem>
            <SelectItem value="cash">{t("sort.cash")}</SelectItem>
            <SelectItem value="handover">{t("sort.handover")}</SelectItem>
            <SelectItem value="newest">{t("sort.newest")}</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && update((p) => (v === "list" ? p.set("view", "list") : p.delete("view")))}
          className="hidden h-11 rounded-xl bg-muted/80 p-1 sm:flex"
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
  const [pending, start] = useTransition();
  return (
    <Button
      variant={tone === "cta" ? "default" : "outline"}
      size={tone === "cta" ? "default" : "sm"}
      className={cn("rounded-full", tone === "subtle" && "h-9 bg-card px-4 shadow-none")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await saveSearch(summary, params.toString());
          if (res.needsAuth) {
            toast(t("saveSearch.needsAuth"));
            router.push(`/login?next=${encodeURIComponent(`/deals?${params.toString()}`)}`);
          } else toast.success(t("saveSearch.saved"));
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Bell className={cn(tone === "subtle" && "text-gold")} />} {t("saveSearch.button")}
    </Button>
  );
}
