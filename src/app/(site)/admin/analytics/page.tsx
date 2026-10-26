import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DeviceToggle } from "@/components/analytics/AnalyticsControls";
import {
  countDelta,
  countryName,
  DailyChart,
  formatDuration,
  Journeys,
  LivePanel,
  PathText,
  pct,
  RankTable,
  rateDelta,
  Section,
  StatTiles,
  type Tile,
} from "@/components/analytics/Report";
import { PageTitle } from "@/components/Kpi";
import { formatAsOf } from "@/components/market/shared";
import { getLocale, getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translator";
import { analyticsReport, isRange, LIVE_MINUTES, RANGES } from "@/lib/analytics-report";
import { requireAdmin } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// Owner's view of the anonymous visit statistics (src/lib/analytics.ts): who visits, how long they stay, where they come
// from and which visitors become leads. Admin-only, like every page under /admin (the layout checks too).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("analytics");
  return { title: t("meta.title"), robots: { index: false } };
}

// Typed by hand rather than PageProps<"/admin/analytics">, so type-checking doesn't depend on a fresh `next typegen`.
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const range = isRange(sp.range) ? sp.range : "7d";
  const [r, t, ta, locale] = await Promise.all([analyticsReport(range), getT("analytics"), getT("admin"), getLocale()]);
  const cur = r.current;
  const prev = r.previous;
  const n = formatNumber;
  const conv = (leads: number, visitors: number) => (visitors ? pct(leads / visitors) : "—");

  const tiles: Tile[] = [
    {
      key: "visitors",
      label: t("kpi.visitors"),
      value: n(cur.visitors),
      delta: countDelta(cur.visitors, prev.visitors, n(prev.visitors), t),
      hint: t("kpi.visitors.hint"),
    },
    {
      key: "sessions",
      label: t("kpi.sessions"),
      value: n(cur.sessions),
      delta: countDelta(cur.sessions, prev.sessions, n(prev.sessions), t),
      hint: t("kpi.sessions.hint"),
    },
    {
      key: "views",
      label: t("kpi.views"),
      value: n(cur.views),
      delta: countDelta(cur.views, prev.views, n(prev.views), t),
      hint: cur.sessions ? t("kpi.views.hint", { n: (cur.views / cur.sessions).toFixed(1) }) : undefined,
    },
    {
      key: "time",
      label: t("kpi.time"),
      value: cur.sessions ? formatDuration(cur.avgSessionMs, t) : "—",
      delta:
        cur.sessions && prev.sessions
          ? countDelta(Math.round(cur.avgSessionMs / 1000), Math.round(prev.avgSessionMs / 1000), formatDuration(prev.avgSessionMs, t), t)
          : undefined,
      hint: t("kpi.time.hint"),
    },
    {
      key: "bounce",
      label: t("kpi.bounce"),
      value: pct(cur.bounceRate, 0),
      delta: rateDelta(cur.bounceRate, prev.bounceRate, t, false),
      hint: t("kpi.bounce.hint"),
    },
    {
      key: "leads",
      label: t("kpi.leads"),
      value: n(cur.leads),
      delta: countDelta(cur.leads, prev.leads, n(prev.leads), t),
      hint: t("kpi.leads.hint", Object.fromEntries(Object.entries(cur.leadsByKind).map(([k, v]) => [k, n(v)]))),
    },
    {
      key: "conversion",
      label: t("kpi.conversion"),
      value: pct(cur.conversion),
      delta: rateDelta(cur.conversion, prev.conversion, t),
      hint: cur.conversionSince ? t("kpi.conversion.since", { date: formatAsOf(cur.conversionSince, locale) }) : t("kpi.conversion.hint"),
    },
  ];

  const share = (v: number) => (cur.visitors ? pct(v / cur.visitors, 0) : "—");
  const named = (prefix: "device" | "lang", key: string | null) => {
    if (!key) return t("unknown");
    const k = `${prefix}.${key}` as TKey<"analytics">;
    const label = t(k);
    return label === k ? key : label;
  };

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} sub={t("sub")} />

      <Section id="this-device" title={t("thisDevice.title")}>
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <span>{t("thisDevice.admins")}</span>
          </p>
          <p className="text-sm text-muted-foreground">{t("thisDevice.help")}</p>
          <DeviceToggle />
        </div>
      </Section>

      {/* One filter row; everything below follows it. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label={t("range.label")} className="inline-flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-card">
          {RANGES.map((k) => (
            <Link
              key={k}
              href={`/admin/analytics?range=${k}`}
              aria-current={k === range ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                k === range ? "bg-ink-gradient text-primary-foreground shadow-card" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t(`range.${k}`)}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">{t(range === "today" ? "compare.today" : "compare.period")}</p>
      </div>

      <StatTiles tiles={tiles} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DailyChart points={r.points} hourly={r.hourly} totals={{ visitors: cur.visitors, leads: cur.leads }} locale={locale} t={t} />
        <LivePanel sessions={r.live} minutes={LIVE_MINUTES} generatedAt={r.generatedAt} locale={locale} t={t} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="pages" title={t("pages.title")} sub={t("pages.sub")}>
          <RankTable
            label={t("pages.title")}
            testId="pages"
            cols={[t("pages.col.page"), t("pages.col.views"), t("pages.col.visitors"), t("pages.col.time")]}
            rows={r.pages.map((p) => ({
              key: p.path,
              head: <PathText path={p.path} />,
              bar: p.views,
              cells: [n(p.views), n(p.visitors), formatDuration(p.avgMs, t)],
            }))}
            empty={t("empty")}
          />
        </Section>
        <Section id="entries" title={t("entries.title")} sub={t("entries.sub")}>
          <RankTable
            label={t("entries.title")}
            testId="entries"
            cols={[t("pages.col.page"), t("entries.col.visits"), t("entries.col.bounce")]}
            rows={r.entries.map((p) => ({
              key: p.path,
              head: <PathText path={p.path} />,
              bar: p.sessions,
              cells: [n(p.sessions), pct(p.bounceRate, 0)],
            }))}
            empty={t("empty")}
          />
        </Section>
      </div>

      <Section id="sources" title={t("sources.title")} sub={t("sources.sub")}>
        <RankTable
          label={t("sources.title")}
          testId="sources"
          cols={[t("sources.col.source"), t("sources.col.visitors"), t("sources.col.leads"), t("sources.col.conversion")]}
          rows={r.sources.map((s) => ({
            key: s.channel,
            head: t(`channel.${s.channel}`),
            bar: s.visitors,
            cells: [n(s.visitors), n(s.leads), conv(s.leads, s.visitors)],
          }))}
          empty={t("empty")}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="campaigns" title={t("campaigns.title")} sub={t("campaigns.sub")}>
          <RankTable
            label={t("campaigns.title")}
            testId="campaigns"
            cols={[t("campaigns.col.campaign"), t("sources.col.visitors"), t("sources.col.leads"), t("sources.col.conversion")]}
            rows={r.campaigns.map((c) => ({
              key: `${c.source ?? ""}/${c.campaign ?? ""}`,
              head: (
                <bdi>
                  {c.source ?? t("campaigns.none")} / {c.campaign ?? t("campaigns.none")}
                </bdi>
              ),
              cells: [n(c.visitors), n(c.leads), conv(c.leads, c.visitors)],
            }))}
            empty={t("campaigns.empty")}
          />
        </Section>
        <Section id="refs" title={t("refs.title")} sub={t("refs.sub")}>
          <RankTable
            label={t("refs.title")}
            testId="refs"
            cols={[t("refs.col.ref"), t("sources.col.visitors"), t("sources.col.leads"), t("sources.col.conversion")]}
            rows={r.refs.map((x) => ({
              key: x.ref,
              head: <bdi>{x.ref}</bdi>,
              cells: [n(x.visitors), n(x.leads), conv(x.leads, x.visitors)],
            }))}
            empty={t("refs.empty")}
          />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="geo" title={t("geo.title")} sub={t("geo.sub")}>
          <div className="space-y-6">
            <RankTable
              label={t("geo.countries")}
              testId="countries"
              cols={[t("geo.countries"), t("col.visitors"), t("col.share")]}
              rows={r.countries.map((c) => ({
                key: c.key ?? "unknown",
                head: countryName(c.key, locale, t),
                bar: c.visitors,
                cells: [n(c.visitors), share(c.visitors)],
              }))}
              empty={t("empty")}
            />
            <RankTable
              label={t("geo.cities")}
              testId="cities"
              cols={[t("geo.cities"), t("col.visitors")]}
              rows={r.cities.map((c) => ({
                key: `${c.country}/${c.city}`,
                head: (
                  <>
                    <bdi>{c.city}</bdi>
                    <span className="text-muted-foreground">
                      {locale === "ar" ? "، " : ", "}
                      {countryName(c.country, locale, t)}
                    </span>
                  </>
                ),
                cells: [n(c.visitors)],
              }))}
              empty={t("empty")}
            />
          </div>
        </Section>
        <Section id="tech" title={t("tech.title")} sub={t("tech.sub")}>
          <div className="space-y-6">
            <RankTable
              label={t("tech.devices")}
              testId="devices"
              cols={[t("tech.devices"), t("col.visitors"), t("col.share")]}
              rows={r.devices.map((d) => ({
                key: d.key ?? "unknown",
                head: named("device", d.key),
                bar: d.visitors,
                cells: [n(d.visitors), share(d.visitors)],
              }))}
              empty={t("empty")}
            />
            <RankTable
              label={t("tech.languages")}
              testId="languages"
              cols={[t("tech.languages"), t("col.visitors"), t("col.share")]}
              rows={r.locales.map((d) => ({
                key: d.key ?? "unknown",
                head: named("lang", d.key),
                bar: d.visitors,
                cells: [n(d.visitors), share(d.visitors)],
              }))}
              empty={t("empty")}
            />
            <RankTable
              label={t("tech.browsers")}
              testId="browsers"
              cols={[t("tech.browsers"), t("col.visitors"), t("col.share")]}
              rows={r.browsers.map((d) => ({
                key: d.key ?? "unknown",
                head: d.key ? <bdi>{d.key}</bdi> : t("unknown"),
                bar: d.visitors,
                cells: [n(d.visitors), share(d.visitors)],
              }))}
              empty={t("empty")}
            />
          </div>
        </Section>
      </div>

      <Section id="journeys" title={t("journey.title")} sub={t("journey.sub")}>
        <Journeys leads={r.leads} locale={locale} t={t} ta={ta} />
      </Section>

      <p className="text-xs text-muted-foreground">{t("privacy")}</p>
    </div>
  );
}
