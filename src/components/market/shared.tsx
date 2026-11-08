import { ChevronRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/i18n/config";
import type { TFn, TKey } from "@/i18n/translator";
import { DUBAI_TZ } from "@/lib/market";
import { formatPct } from "@/lib/format";
import { developerName } from "@/lib/place-names";
import { cn } from "@/lib/utils";

/** Arabic/English community name; names outside the list are shown as entered. */
export function communityLabel(tc: TFn<"common">, name: string) {
  const key = `community.${name}` as TKey<"common">;
  const label = tc(key);
  return label === key ? name : label;
}

export function developerLabel(tc: TFn<"common">, name: string) {
  return developerName(tc, name);
}

/** Share of a total, or null when there is nothing to divide by. */
export function share(n: number, total: number) {
  return total > 0 ? n / total : null;
}

/**
 * Signed percentage with a typographic minus ("−3.2%"), for discount figures where negative = above launch.
 * A negative value is wrapped in a left-to-right isolate (LRI … PDI): in Arabic text the bidi algorithm would
 * otherwise put the minus sign on the far side of the digits ("3.2%−").
 */
export function signedPct(v: number | null, digits = 1) {
  if (v == null) return "—";
  return isoPct(v < 0 ? `−${formatPct(-v, digits)}` : formatPct(v, digits));
}

/**
 * A percentage inside a sentence, isolated left-to-right so the % stays after the digits in Arabic too
 * (otherwise "27.1%" after Arabic letters is drawn as "%27.1").
 */
export function isoPct(s: string) {
  return `\u2066${s}\u2069`;
}

/** "23 Oct 2026, 17:54" in Dubai time. */
export function formatAsOf(d: Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: DUBAI_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "2026-10" → "Oct" / "October 2026" (and the Arabic month names). */
export function monthLabel(key: string, locale: Locale, style: "short" | "long") {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "UTC",
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function formatDecimal(v: number, digits = 1) {
  return new Intl.NumberFormat("en-AE", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/** Decorative horizontal bar; the value it shows is always printed next to it. */
export function Bar({ value, max, className, tone = "ink" }: { value: number | null; max: number; className?: string; tone?: "ink" | "gold" | "success" }) {
  const pct = value == null || max <= 0 ? 0 : Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <span aria-hidden className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <span
        className={cn(
          "block h-full rounded-full",
          tone === "ink" && "bg-primary",
          tone === "gold" && "bg-gold",
          tone === "success" && "bg-success",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/**
 * The tables' header row. 12px below lg (11px on desktop as before; Arabic was 12px already), with normal tracking on
 * phones so the larger labels still fit their narrow columns.
 */
export const TABLE_HEAD =
  "bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground rtl:text-xs max-lg:text-xs max-sm:tracking-normal";

/** A table row that opens filtered deals: pressed state on phones (the whole row is the link there, see ROW_LINK). */
export const ROW_TAP = "transition-colors hover:bg-secondary/40 max-sm:active:bg-secondary/70";

/**
 * Phones, a row that opens deals is one tap target: its name cell is positioned (ROW_HEAD) and the link in it (ROW_LINK)
 * is a block filling the cell (the caller adds the cell's padding as negative margins) whose ::after covers the row's
 * full height from that cell to the panel's edge (clipped by the panel's overflow-hidden), above the row's other cells
 * (z-10: the last one is positioned for its chevron). A cell, not the <tr>: a positioned table row isn't a reliable
 * containing block in every browser.
 */
export const ROW_HEAD = "max-sm:relative";
export const ROW_LINK =
  "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:block max-sm:focus-visible:ring-inset max-sm:after:absolute max-sm:after:inset-y-0 max-sm:after:start-0 max-sm:after:z-10 max-sm:after:w-screen max-sm:after:content-['']";

/** The row's last cell on phones: its 16px end padding holds the row's chevron (RowChevron). */
export const ROW_END = "max-sm:relative";

/** Phones: the chevron at the end of a row that opens deals (inside a ROW_END cell; taps go through to the row link). */
export function RowChevron() {
  return (
    <ChevronRight
      aria-hidden
      className="pointer-events-none absolute end-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground/70 rtl:-scale-x-100 sm:hidden"
    />
  );
}

/** White report card used by every section. */
export function Panel({ className, children, ...rest }: React.ComponentProps<"div">) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

/** Card header: small uppercase eyebrow, title (h3) and an optional line under it. */
export function PanelHeader({ eyebrow, title, sub, id, children }: { eyebrow?: string; title: string; sub?: string; id?: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-border/70 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-foreground/70 rtl:text-xs max-lg:text-xs">{eyebrow}</p>
          )}
          <h3 id={id} className="mt-1 text-xl font-semibold sm:text-2xl">
            {title}
          </h3>
        </div>
        {children}
      </div>
      {sub && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** "—" for a statistic that doesn't have enough listings behind it yet, with the reason for screen readers. */
export function NotEnough({ label }: { label: string }) {
  return (
    <span title={label}>
      <span aria-hidden className="text-muted-foreground">
        —
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
