import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/i18n/config";
import type { TFn, TKey } from "@/i18n/translator";
import { DUBAI_TZ } from "@/lib/market";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Arabic/English community name; names outside the list are shown as entered. */
export function communityLabel(tc: TFn<"common">, name: string) {
  const key = `community.${name}` as TKey<"common">;
  const label = tc(key);
  return label === key ? name : label;
}

export function developerLabel(tc: TFn<"common">, name: string) {
  return name === "Other" ? tc("developer.Other") : name;
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
  return v < 0 ? `⁦−${formatPct(-v, digits)}⁩` : formatPct(v, digits);
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
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-foreground/70 rtl:text-xs">{eyebrow}</p>}
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
