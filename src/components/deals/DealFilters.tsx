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
import { COMMUNITIES, DEVELOPERS, MOTIVATION, UNIT_TYPES } from "@/lib/config";
import { formatAEDCompact } from "@/lib/format";

const MAX_BUDGET = 8_000_000;
const YEARS = [2026, 2027, 2028, 2029];

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
  const { params, update } = useParamsUpdater();
  const min = Number(params.get("minCash") ?? 0);
  const max = Number(params.get("maxCash") ?? MAX_BUDGET);
  const [value, setValue] = useState<[number, number]>([min, max]);
  useEffect(() => setValue([min, max]), [min, max]);
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">Upfront cash to seller</p>
      <p className="mb-3 text-xs text-muted-foreground tabular">
        {formatAEDCompact(value[0])} – {value[1] >= MAX_BUDGET ? "Any" : formatAEDCompact(value[1])}
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
        aria-label="Upfront cash budget"
      />
    </div>
  );
}

export function FilterPanel() {
  const { params, update } = useParamsUpdater();
  const handoverBy = params.get("handoverBy") ?? "any";
  return (
    <div className="space-y-6">
      <BudgetFilter />
      <CheckGroup label="Community" name="community" options={COMMUNITIES.filter((c) => c !== "Other").map((c) => [c, c])} />
      <CheckGroup label="Developer" name="developer" options={DEVELOPERS.filter((d) => d !== "Other").map((d) => [d, d])} />
      <CheckGroup label="Unit type" name="type" options={Object.entries(UNIT_TYPES)} />
      <RangeFilter label="Min. % paid to developer" name="minPaid" max={60} step={5} format={(v) => `${v}%+`} />
      <RangeFilter label="Min. discount vs launch" name="minDiscount" max={30} step={1} format={(v) => `${v}%+`} />
      <div>
        <p className="mb-2 text-sm font-semibold">Handover by</p>
        <Select
          value={handoverBy}
          onValueChange={(v) => update((p) => (v === "any" ? p.delete("handoverBy") : p.set("handoverBy", v)))}
        >
          <SelectTrigger aria-label="Handover by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any time</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                End of {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <CheckGroup
        label="Seller motivation"
        name="motivation"
        options={Object.entries(MOTIVATION).map(([k, v]) => [k, v.label])}
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <Checkbox
          checked={params.get("verified") === "1"}
          onCheckedChange={(on) => update((p) => (on ? p.set("verified", "1") : p.delete("verified")))}
        />
        Verified listings only
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
        Reset filters
      </Button>
    </div>
  );
}

export function DealsToolbar() {
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
          placeholder="Search project, developer or community"
          className="h-11 ps-9"
          aria-label="Search deals"
        />
      </div>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 lg:hidden">
              <SlidersHorizontal />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="start" className="overflow-y-auto p-6">
            <SheetTitle>Filters</SheetTitle>
            <div className="mt-6">
              <FilterPanel />
            </div>
          </SheetContent>
        </Sheet>
        <Label className="sr-only" htmlFor="sort">
          Sort
        </Label>
        <Select value={sort} onValueChange={(v) => update((p) => p.set("sort", v))}>
          <SelectTrigger id="sort" className="h-11 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="discount">Biggest discount</SelectItem>
            <SelectItem value="cash">Lowest upfront cash</SelectItem>
            <SelectItem value="handover">Handover soonest</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && update((p) => (v === "list" ? p.set("view", "list") : p.delete("view")))}
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

export function SaveSearchButton({ summary }: { summary: string }) {
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
            toast("Sign in to save searches and get alerts.");
            router.push(`/login?next=${encodeURIComponent(`/deals?${params.toString()}`)}`);
          } else toast.success("Search saved to your dashboard");
        })
      }
    >
      <Bell /> Save search
    </Button>
  );
}
