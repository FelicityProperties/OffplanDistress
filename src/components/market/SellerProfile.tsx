import { BadgeCheck, FileCheck2, TrendingDown } from "lucide-react";
import { getT } from "@/i18n/server";
import { formatNumber, formatPct } from "@/lib/format";
import type { DistressIndex } from "@/lib/market";
import { cn } from "@/lib/utils";
import { Bar, Panel, PanelHeader, share } from "./shared";

const MOTIVATIONS = [
  { key: "urgent", dot: "bg-warning" },
  { key: "motivated", dot: "bg-gold" },
  { key: "flexible", dot: "bg-muted-foreground/45" },
] as const;

/** Seller motivation split (stacked bar + legend) and three shares: NOC threshold, verified, asking below paid. */
export async function SellerProfile({ index }: { index: DistressIndex }) {
  const [t, tc] = await Promise.all([getT("market"), getT("common")]);
  const s = index.supply;
  const total = s.live;

  const checks = [
    { key: "noc", icon: FileCheck2, label: t("seller.noc"), n: s.noc, tone: "ink" as const },
    { key: "verified", icon: BadgeCheck, label: t("seller.verified"), n: s.verified, tone: "success" as const },
    { key: "belowPaid", icon: TrendingDown, label: t("seller.belowPaid"), n: s.belowPaid, tone: "gold" as const },
  ];

  return (
    <Panel className="flex flex-col">
      <PanelHeader eyebrow={t("seller.eyebrow")} title={t("seller.title")} sub={t("seller.sub")} />
      <div className="grid gap-8 p-5 sm:p-8">
        <div>
          <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground rtl:text-xs">{t("seller.motivation")}</h4>
          {/* Stacked share bar (decorative: every share is listed underneath). */}
          <div aria-hidden className="mt-4 flex h-3 gap-1 overflow-hidden rounded-full">
            {MOTIVATIONS.map((m) => {
              const n = s.motivation[m.key];
              return n > 0 ? <span key={m.key} className={cn("h-full rounded-full", m.dot)} style={{ width: `${(n / Math.max(total, 1)) * 100}%` }} /> : null;
            })}
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {MOTIVATIONS.map((m) => {
              const n = s.motivation[m.key];
              const pct = share(n, total);
              return (
                <li
                  key={m.key}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 p-4 sm:flex-col sm:justify-start sm:gap-0"
                >
                  {/* phones: label + hint | value; from sm the wrapper dissolves and the hint moves last */}
                  <div className="min-w-0 sm:contents">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", m.dot)} aria-hidden />
                      {tc(`motivation.${m.key}`)}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground sm:order-last sm:mt-2">{tc(`motivation.${m.key}.hint`)}</p>
                  </div>
                  <div className="shrink-0 text-end sm:mt-2 sm:text-start">
                    <p className="text-2xl font-semibold leading-tight tabular">{pct == null ? "—" : formatPct(pct, 0)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular">
                      {t("seller.ofUnits", { n: formatNumber(n), total: formatNumber(total) })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground rtl:text-xs">{t("seller.checks")}</h4>
          <ul className="mt-4 space-y-4">
            {checks.map((c) => {
              const pct = share(c.n, total);
              return (
                <li key={c.key}>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="flex min-w-0 items-start gap-2.5">
                      <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span>{c.label}</span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block font-semibold tabular">{pct == null ? "—" : formatPct(pct, 0)}</span>
                      <span className="block text-xs text-muted-foreground tabular">
                        {t("seller.ofUnits", { n: formatNumber(c.n), total: formatNumber(total) })}
                      </span>
                    </span>
                  </div>
                  <Bar value={c.n} max={total} tone={c.tone} className="mt-2" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
