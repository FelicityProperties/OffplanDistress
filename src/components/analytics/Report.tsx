import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { Bar, isoPct } from "@/components/market/shared";
import { StatusPill } from "@/components/badges";
import { intlLocale, type Locale } from "@/i18n/config";
import type { TFn } from "@/i18n/translator";
import type { LeadJourney, LiveSession, SeriesPoint } from "@/lib/analytics-report";
import { formatNumber, formatPct, refCode, timeAgo } from "@/lib/format";
import { leadCode } from "@/lib/estimate";
import { cn } from "@/lib/utils";
import { RefreshButton, TableToggle } from "./AnalyticsControls";

// Building blocks of /admin/analytics, all server-rendered: stat tiles with the change against the previous period,
// CSS column charts (the style of src/components/market/MonthlyBars.tsx) with a table twin, ranked tables with share
// bars (the style of CashBands), the live panel and the leads' journeys. No chart library.

type TA = TFn<"analytics">;
const DUBAI_TZ = "Asia/Dubai";

// Series colours, validated with the dataviz palette checks against the white card (lightness band, chroma floor,
// colour-blind separation ΔE 24.8, normal-vision ΔE 28.5, contrast ≥ 3:1): site navy for visitors, deep gold for leads.
export const VISITORS_COLOR = "oklch(0.5 0.12 262)";
export const LEADS_COLOR = "oklch(0.64 0.13 70)";

/** "45s", "3m 05s", "1h 02m" (Arabic: "45 ث", "3 د 05 ث"); "—" without a value. */
export function formatDuration(ms: number | null | undefined, t: TA) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const total = Math.round(ms / 1000);
  if (total < 60) return t("dur.s", { s: total });
  if (total < 3600) return t("dur.ms", { m: Math.floor(total / 60), s: String(total % 60).padStart(2, "0") });
  return t("dur.hm", { h: Math.floor(total / 3600), m: String(Math.floor((total % 3600) / 60)).padStart(2, "0") });
}

/** A share or rate as a percentage that keeps its sign after the digits in Arabic too. */
export function pct(v: number | null | undefined, digits = 1) {
  return v == null ? "—" : isoPct(formatPct(v, digits));
}

/** A country's name in the page's language from its ISO code. */
export function countryName(code: string | null, locale: Locale, t: TA) {
  if (!code) return t("unknown");
  try {
    return new Intl.DisplayNames([intlLocale(locale)], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Card with its own h2: every block of the page. */
export function Section({
  id,
  title,
  sub,
  action,
  className,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("min-w-0 rounded-xl border bg-card shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export type Delta = { text: string; dir: "up" | "down" | "flat"; good: boolean | null; sr?: string };

/** Change of a count (or a duration) against the previous period, as a percentage. */
export function countDelta(cur: number, prev: number, prevLabel: string, t: TA, higherIsBetter = true): Delta {
  if (prev === 0) {
    return cur === 0
      ? { text: t("delta.same", { prev: prevLabel }), dir: "flat", good: null }
      : { text: t("delta.new"), dir: "up", good: higherIsBetter, sr: t(higherIsBetter ? "delta.better" : "delta.worse") };
  }
  const r = (cur - prev) / prev;
  if (Math.abs(r) < 0.0005) return { text: t("delta.same", { prev: prevLabel }), dir: "flat", good: null };
  const good = r > 0 === higherIsBetter;
  const change = isoPct(`${r > 0 ? "+" : "−"}${formatPct(Math.abs(r), Math.abs(r) < 0.1 ? 1 : 0)}`);
  return { text: t("delta.vs", { change, prev: prevLabel }), dir: r > 0 ? "up" : "down", good, sr: t(good ? "delta.better" : "delta.worse") };
}

/** Change of a rate in percentage points. Nothing when either period has no rate. */
export function rateDelta(cur: number | null, prev: number | null, t: TA, higherIsBetter = true): Delta | undefined {
  if (cur == null || prev == null) return undefined;
  const pts = (cur - prev) * 100;
  const prevLabel = pct(prev);
  if (Math.abs(pts) < 0.05) return { text: t("delta.same", { prev: prevLabel }), dir: "flat", good: null };
  const good = pts > 0 === higherIsBetter;
  const change = isoPct(t("delta.points", { n: `${pts > 0 ? "+" : "−"}${Math.abs(pts).toFixed(1)}` }));
  return { text: t("delta.vs", { change, prev: prevLabel }), dir: pts > 0 ? "up" : "down", good, sr: t(good ? "delta.better" : "delta.worse") };
}

export type Tile = { key: string; label: string; value: string; hint?: string; delta?: Delta };

/** The headline numbers: label, value, change against the previous period (icon + words, never colour alone), note. */
export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {tiles.map((k) => {
        const Icon = k.delta?.dir === "up" ? ArrowUpRight : k.delta?.dir === "down" ? ArrowDownRight : Minus;
        return (
          <div key={k.key} className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-card sm:p-5">
            <dt className="text-sm leading-snug text-muted-foreground">{k.label}</dt>
            <dd className="mt-2 flex flex-1 flex-col">
              <span className="break-words text-2xl font-semibold leading-tight sm:text-[1.75rem]" data-metric={k.key}>
                {k.value}
              </span>
              {k.delta && (
                <span
                  className={cn(
                    "mt-1.5 flex items-start gap-1 text-xs font-medium",
                    k.delta.good === true && "text-success",
                    k.delta.good === false && "text-destructive",
                    k.delta.good == null && "text-muted-foreground",
                  )}
                >
                  <Icon className="mt-px h-3.5 w-3.5 shrink-0 rtl:-scale-x-100" aria-hidden />
                  <span className="min-w-0">
                    {k.delta.text}
                    {k.delta.sr && <span className="sr-only"> ({k.delta.sr})</span>}
                  </span>
                </span>
              )}
              {k.hint && <span className="mt-auto pt-2 text-xs leading-snug text-muted-foreground">{k.hint}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** A clean scale top for a column chart: 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 or 10 × a power of ten (whole numbers only). */
function niceTop(max: number) {
  if (max <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= max && Number.isInteger(m * p)) return m * p;
  return 10 * p;
}

/**
 * Which buckets get an x-axis label: every one of a short range, otherwise four (the first, the last and two evenly
 * between), which still fit side by side on a phone.
 */
function labelled(n: number) {
  if (n <= 8) return new Set(Array.from({ length: n }, (_, i) => i));
  const step = Math.ceil((n - 1) / 3);
  const out = new Set<number>([n - 1]);
  for (let i = 0; i < n - 1; i += step) if (n - 1 - i >= step * 0.6) out.add(i);
  return out;
}

type ChartPoint = SeriesPoint & { short: string; week?: string; long: string };

/** One single-series column chart (a small multiple); decorative, the table below carries the numbers. */
function Columns({ points, field, title, color, t }: { points: ChartPoint[]; field: "visitors" | "leads"; title: string; color: string; t: TA }) {
  const values = points.map((p) => p[field]);
  const max = Math.max(0, ...values);
  const top = niceTop(max);
  const total = values.reduce((a, b) => a + b, 0);
  const n = points.length;
  const labels = labelled(n);
  const gap = n > 31 ? "gap-px" : "gap-0.5";
  // Tooltips near the edges open inwards so the card never clips them.
  const tipPlace = (i: number) => (i < n / 4 ? "start-0" : i >= (3 * n) / 4 ? "end-0" : "inset-x-0 mx-auto");
  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">
          {t("chart.total", { n: formatNumber(total) })} · {t("chart.peak", { n: formatNumber(max) })}
        </span>
      </figcaption>
      <div className="relative mt-3 h-36 sm:h-44">
        {/* Solid hairline grid: scale top, middle, baseline. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          <span className="relative border-t border-border/70">
            <span className="absolute end-0 top-0.5 text-[10px] leading-none text-muted-foreground tabular">{formatNumber(top)}</span>
          </span>
          <span className="relative border-t border-border/70">
            {top % 2 === 0 && (
              <span className="absolute end-0 top-0.5 text-[10px] leading-none text-muted-foreground tabular">{formatNumber(top / 2)}</span>
            )}
          </span>
          <span className="border-t border-border" />
        </div>
        {/* pe-8: a gutter for the scale labels, so no column runs under them. */}
        <div className={cn("relative flex h-full pe-8", gap)}>
          {points.map((p, i) => (
            <div key={p.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
              {/* The whole column is the hover target, not just the painted bar. */}
              <span className="absolute inset-0 rounded-sm transition-colors group-hover:bg-muted" />
              {p[field] > 0 && (
                <span
                  className="relative w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80"
                  style={{ height: `${(p[field] / top) * 100}%`, background: color }}
                />
              )}
              <span
                className={cn(
                  "pointer-events-none absolute top-1 z-10 hidden w-max max-w-52 rounded-lg border bg-popover px-2.5 py-2 text-xs shadow-lift group-hover:block",
                  tipPlace(i),
                )}
              >
                <span className="block font-medium text-muted-foreground">{p.long}</span>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: VISITORS_COLOR }} />
                  <span className="font-semibold tabular">{formatNumber(p.visitors)}</span> {t("chart.visitors")}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 ps-[1.125rem]">
                  <span className="font-semibold tabular">{formatNumber(p.views)}</span> {t("chart.views")}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: LEADS_COLOR }} />
                  <span className="font-semibold tabular">{formatNumber(p.leads)}</span> {t("chart.leads")}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={cn("mt-1.5 flex h-4 pe-8", gap)}>
        {points.map((p, i) => (
          <div key={p.key} className="relative min-w-0 flex-1">
            {labels.has(i) &&
              (n <= 8 ? (
                <span className="block truncate text-center text-[11px] text-muted-foreground">
                  {/* The weekday only where there is room for it (Arabic weekday names are long). */}
                  {p.week && <span className="hidden sm:inline">{p.week} </span>}
                  {p.short}
                </span>
              ) : (
                <span
                  className={cn(
                    "absolute top-0 w-max whitespace-nowrap text-[11px] text-muted-foreground",
                    i === 0 ? "start-0" : i === n - 1 ? "end-0" : "inset-x-0 mx-auto",
                  )}
                >
                  {p.short}
                </span>
              ))}
          </div>
        ))}
      </div>
    </figure>
  );
}

/** Visitors and leads per day (or per hour today) as two small multiples on their own scales, plus the table. */
export function DailyChart({ points, hourly, locale, t }: { points: SeriesPoint[]; hourly: boolean; locale: Locale; t: TA }) {
  const il = intlLocale(locale);
  const few = !hourly && points.length <= 8;
  const short = hourly
    ? new Intl.DateTimeFormat(il, { timeZone: DUBAI_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    : few
      ? new Intl.DateTimeFormat(il, { timeZone: DUBAI_TZ, day: "numeric" })
      : new Intl.DateTimeFormat(il, { timeZone: DUBAI_TZ, day: "numeric", month: "short" });
  const week = new Intl.DateTimeFormat(il, { timeZone: DUBAI_TZ, weekday: "short" });
  const long = hourly
    ? new Intl.DateTimeFormat(il, { timeZone: DUBAI_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    : new Intl.DateTimeFormat(il, { timeZone: DUBAI_TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const rows: ChartPoint[] = points.map((p) => ({
    ...p,
    short: short.format(p.start),
    week: few ? week.format(p.start) : undefined,
    long: long.format(p.start),
  }));
  return (
    <Section id="chart" title={t("chart.title")} sub={t(hourly ? "chart.sub.hours" : "chart.sub.days")}>
      <div aria-hidden className="space-y-6">
        <Columns points={rows} field="visitors" title={t("chart.visitors")} color={VISITORS_COLOR} t={t} />
        <Columns points={rows} field="leads" title={t("chart.leads")} color={LEADS_COLOR} t={t} />
      </div>
      <div className="mt-5">
        <TableToggle>
          <table className="w-full min-w-[320px] text-sm" aria-labelledby="chart-title">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-semibold">
                  {t(hourly ? "chart.col.hour" : "chart.col.day")}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">
                  {t("chart.visitors")}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">
                  {t("chart.views")}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">
                  {t("chart.leads")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((p) => (
                <tr key={p.key} data-bucket={p.key}>
                  <th scope="row" className="px-3 py-2 text-start font-medium">
                    {p.long}
                  </th>
                  <td className="px-3 py-2 text-end tabular">{formatNumber(p.visitors)}</td>
                  <td className="px-3 py-2 text-end tabular">{formatNumber(p.views)}</td>
                  <td className="px-3 py-2 text-end tabular">{formatNumber(p.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableToggle>
      </div>
    </Section>
  );
}

export type RankRow = { key: string; head: React.ReactNode; bar?: number; cells: React.ReactNode[] };

/**
 * A ranked table: the first column names the row (with a share bar under it when `bar` is given, scaled to the
 * largest row), the others are right-aligned numbers.
 */
export function RankTable({
  label,
  cols,
  rows,
  empty,
  testId,
}: {
  label: string;
  cols: string[];
  rows: RankRow[];
  empty: string;
  testId?: string;
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.bar ?? 0));
  return (
    <table className="w-full table-fixed text-sm" aria-label={label} data-table={testId}>
      <thead className="text-xs text-muted-foreground">
        <tr className="border-b border-border/70">
          {cols.map((c, i) => (
            <th
              key={c}
              scope="col"
              className={cn("pb-2 font-semibold", i === 0 ? "w-[46%] text-start" : "px-1 text-end", i === cols.length - 1 && "pe-0")}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {rows.map((r) => (
          <tr key={r.key} data-row={r.key}>
            <th scope="row" className="py-2.5 pe-2 text-start font-medium">
              <span className="block wrap-anywhere">{r.head}</span>
              {r.bar != null && <Bar value={r.bar} max={max} className="mt-1.5" />}
            </th>
            {r.cells.map((c, i) => (
              <td key={i} className={cn("px-1 py-2.5 text-end align-top tabular", i === r.cells.length - 1 && "pe-0")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A path as typed in the address bar, kept left-to-right inside Arabic text. */
export function PathText({ path }: { path: string }) {
  return (
    <bdi dir="ltr" className="font-mono text-[13px]">
      {path}
    </bdi>
  );
}

/** Who is on the site now, and the pages they are on. */
export function LivePanel({ sessions, minutes, generatedAt, locale, t }: { sessions: LiveSession[]; minutes: number; generatedAt: Date; locale: Locale; t: TA }) {
  const byPath = new Map<string, number>();
  const byCountry = new Map<string, number>();
  for (const s of sessions) {
    byPath.set(s.path, (byPath.get(s.path) ?? 0) + 1);
    const c = s.country ?? "";
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
  }
  const pages = [...byPath].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const countries = [...byCountry].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const time = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: DUBAI_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    generatedAt,
  );
  return (
    <Section id="live" title={t("live.title")} action={<RefreshButton />}>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-4xl font-semibold" data-metric="live">
          {formatNumber(sessions.length)}
        </span>
        <span className="text-sm text-muted-foreground">{t("live.label", { min: minutes })}</span>
      </p>
      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("live.empty")}</p>
      ) : (
        <div className="mt-4 space-y-4">
          <RankTable
            label={t("live.pages")}
            cols={[t("live.col.page"), t("live.col.visitors")]}
            rows={pages.map(([path, n]) => ({ key: path, head: <PathText path={path} />, bar: n, cells: [formatNumber(n)] }))}
            empty={t("live.empty")}
            testId="live"
          />
          <p className="text-sm">
            <span className="font-medium">{t("live.where")}:</span>{" "}
            {countries.map(([c, n], i) => (
              <span key={c}>
                {i > 0 && " · "}
                {countryName(c || null, locale, t)} (<span className="tabular">{formatNumber(n)}</span>)
              </span>
            ))}
          </p>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t("live.updated", { time })}</p>
    </Section>
  );
}

// Seller estimates in gold as on /admin/leads; the kind is always written out, so the tone only groups.
const LEAD_TONE = { seller: "gold", inquiry: "muted", signup: "muted", listing: "gold", offer: "muted" } as const;
const SHOWN_STEPS = 12;

function leadHref(l: LeadJourney) {
  switch (l.kind) {
    case "seller":
      return l.refNo != null ? `/admin/leads#lead-${l.refNo}` : "/admin/leads";
    case "inquiry":
      return "/admin/inquiries";
    case "signup":
      return `/admin/users#user-${l.linkId}`;
    case "listing":
      return `/admin/listings/${l.linkId}`;
    case "offer":
      return "/admin/offers";
  }
}

/** The latest leads: what they sent, how their visit arrived and the pages they viewed first. */
export function Journeys({ leads, locale, t, ta }: { leads: LeadJourney[]; locale: Locale; t: TA; ta: TFn<"admin"> }) {
  if (leads.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{t("journey.empty")}</p>;
  return (
    <ul className="divide-y divide-border/70">
      {leads.map((l) => {
        const src = l.source;
        const bits = [
          [src?.utm_source, src?.utm_medium, src?.utm_campaign].filter(Boolean).join(" / "),
          src?.ref ? ta("leads.source.ref", { ref: src.ref }) : "",
          src?.referrer_host ? ta("leads.source.from", { host: src.referrer_host }) : "",
          src?.landing ? ta("leads.source.landing", { path: src.landing }) : "",
        ].filter(Boolean);
        const ref =
          l.kind === "seller" && l.refNo != null ? leadCode(l.refNo) : l.refNo != null ? refCode(l.refNo) : null;
        const steps = l.steps ?? [];
        const hidden = Math.max(0, steps.length - SHOWN_STEPS);
        return (
          <li key={`${l.kind}-${l.id}`} className="py-4 first:pt-0 last:pb-0" data-lead={l.id}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <StatusPill tone={LEAD_TONE[l.kind]}>{t(`kind.${l.kind}`)}</StatusPill>
              <Link href={leadHref(l)} className="min-w-0 font-semibold wrap-anywhere underline-offset-4 hover:underline">
                {l.label || "—"}
              </Link>
              {ref && <bdi className="text-xs font-medium text-muted-foreground tabular">{ref}</bdi>}
              <span className="text-xs text-muted-foreground">{timeAgo(l.createdAt, locale)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">
              <span className="font-medium text-foreground">{ta("leads.source")}:</span>{" "}
              {bits.length
                ? bits.map((b, i) => (
                    <span key={i}>
                      {i > 0 && " · "}
                      <bdi>{b}</bdi>
                    </span>
                  ))
                : ta("leads.source.direct")}
            </p>
            {l.steps == null ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t(l.noTrail === "account" ? "journey.account" : l.noTrail === "noSid" ? "journey.noSid" : "journey.noSession")}
              </p>
            ) : steps.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{t("journey.noPages")}</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs font-medium" data-journey-stats>
                  {t("journey.stats", {
                    n: formatNumber(steps.length),
                    span: formatDuration(l.spanMs, t),
                    time: formatDuration(l.engagedMs, t),
                  })}
                </p>
                <ol aria-label={t("journey.steps")} className="flex flex-wrap items-center gap-1">
                  {hidden > 0 && <li className="text-xs text-muted-foreground">{t("journey.earlier", { n: formatNumber(hidden) })}</li>}
                  {steps.slice(-SHOWN_STEPS).map((s, i) => (
                    <li key={i} className="flex min-w-0 items-center gap-1">
                      {(i > 0 || hidden > 0) && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />}
                      <span className="min-w-0 rounded-md bg-secondary px-1.5 py-0.5 wrap-anywhere">
                        <PathText path={s.path} />
                        {s.durationMs != null && (
                          <span className="ms-1 text-[11px] text-muted-foreground">
                            <span className="sr-only">, </span>
                            {formatDuration(s.durationMs, t)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
