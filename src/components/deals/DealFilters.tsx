"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, LayoutGrid, List, Loader2, Search, SlidersHorizontal } from "lucide-react";
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
import type { TFn, TKey } from "@/i18n/translator";
import { COMMUNITIES, DEVELOPERS, MOTIVATION, UNIT_TYPES, type UnitTypeKey } from "@/lib/config";
import { formatAEDCompact } from "@/lib/format";

const MAX_BUDGET = 8_000_000;
const YEARS = [2026, 2027, 2028, 2029];

/** Arabic/English community name; unknown names are shown as entered. */
function communityName(tc: TFn<"common">, name: string) {
  const key = `community.${name}` as TKey<"common">;
  const label = tc(key);
  return label === key ? name : label;
}

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

function CheckGroup({ label, name, options }: { label: string; name: string; options: [string, string][] }) {
  const { params, update } = useParamsUpdater();
  const selected = params.getAll(name);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="space-y-2">
        {options.map(([value, text]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Checkbox
              checked={selected.includes(value)}
              onCheckedChange={(on) =>
                update((p) => {
                  const rest = p.getAll(name).filter((v) => v !== value);
                  p.delete(name);
                  for (const v of on ? [...rest, value] : rest) p.append(name, v);
                })
              }
            />
            {text}
          </label>
        ))}
      </div>
    </div>
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
    <div>
      <p className="mb-1 text-sm font-semibold">{label}</p>
      <p className="mb-3 text-xs text-muted-foreground tabular">{format(value)}</p>
      <Slider
        min={0}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => setValue(v[0] ?? 0)}
        onValueCommit={(v) => update((p) => (v[0] ? p.set(name, String(v[0])) : p.delete(name)))}
        aria-label={label}
      />
    </div>
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
    <div>
      <p className="mb-1 text-sm font-semibold">{t("filters.budget")}</p>
      <p className="mb-3 text-xs text-muted-foreground tabular">
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
      />
    </div>
  );
}

export function FilterPanel() {
  const t = useT("deals");
  const tc = useT("common");
  const { params, update } = useParamsUpdater();
  const handoverBy = params.get("handoverBy") ?? "any";
  return (
    <div className="space-y-6">
      <BudgetFilter />
      <CheckGroup
        label={t("filters.community")}
        name="community"
        options={COMMUNITIES.filter((c) => c !== "Other").map((c) => [c, communityName(tc, c)])}
      />
      <CheckGroup label={t("filters.developer")} name="developer" options={DEVELOPERS.filter((d) => d !== "Other").map((d) => [d, d])} />
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
      <div>
        <p className="mb-2 text-sm font-semibold">{t("filters.handoverBy")}</p>
        <Select
          value={handoverBy}
          onValueChange={(v) => update((p) => (v === "any" ? p.delete("handoverBy") : p.set("handoverBy", v)))}
        >
          <SelectTrigger aria-label={t("filters.handoverBy")}>
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
      </div>
      <CheckGroup
        label={t("filters.motivation")}
        name="motivation"
        options={(Object.keys(MOTIVATION) as (keyof typeof MOTIVATION)[]).map((k) => [k, tc(`motivation.${k}`)])}
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <Checkbox
          checked={params.get("verified") === "1"}
          onCheckedChange={(on) => update((p) => (on ? p.set("verified", "1") : p.delete("verified")))}
        />
        {t("filters.verifiedOnly")}
      </label>
      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          update((p) => {
            for (const k of [...p.keys()]) if (!["q", "sort", "view"].includes(k)) p.delete(k);
          })
        }
      >
        {t("filters.reset")}
      </Button>
    </div>
  );
}

export function DealsToolbar() {
  const t = useT("deals");
  const { params, update, pending } = useParamsUpdater();
  const [q, setQ] = useState(params.get("q") ?? "");
  const sort = params.get("sort") ?? "discount";
  const view = params.get("view") === "list" ? "list" : "grid";

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) update((p) => (q.trim() ? p.set("q", q.trim()) : p.delete("q")));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        {pending ? (
          <Loader2 className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          className="h-11 ps-9"
          aria-label={t("search.label")}
        />
      </div>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 lg:hidden">
              <SlidersHorizontal />
              {t("filters.title")}
            </Button>
          </SheetTrigger>
          <SheetContent side="start" className="overflow-y-auto p-6">
            <SheetTitle>{t("filters.title")}</SheetTitle>
            <div className="mt-6">
              <FilterPanel />
            </div>
          </SheetContent>
        </Sheet>
        <Label className="sr-only" htmlFor="sort">
          {t("sort.label")}
        </Label>
        <Select value={sort} onValueChange={(v) => update((p) => p.set("sort", v))}>
          <SelectTrigger id="sort" className="h-11 w-52">
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
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="grid" aria-label={t("view.grid")}>
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label={t("view.list")}>
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

export function SaveSearchButton({ summary }: { summary: string }) {
  const t = useT("deals");
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
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
      <Bell /> {t("saveSearch.button")}
    </Button>
  );
}
