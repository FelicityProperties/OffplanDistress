import { getLocale, getT } from "@/i18n/server";
import { formatNumber } from "@/lib/format";
import type { DistressIndex } from "@/lib/market";
import { cn } from "@/lib/utils";
import { monthLabel, Panel, PanelHeader } from "./shared";

/** New listings per Dubai calendar month: CSS column chart for sighted users, a table for screen readers. */
export async function MonthlyBars({ index }: { index: DistressIndex }) {
  const [t, locale] = await Promise.all([getT("market"), getLocale()]);
  const months = index.supply.monthly;
  const max = Math.max(1, ...months.map((m) => m.count));
  const total = months.reduce((s, m) => s + m.count, 0);
  const last = months.length - 1;

  return (
    <Panel className="flex flex-col">
      <PanelHeader id="monthly-title" eyebrow={t("monthly.eyebrow")} title={t("monthly.title")} sub={t("monthly.sub")}>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold tabular">{t("monthly.total", { n: formatNumber(total) })}</span>
      </PanelHeader>
      <div className="flex flex-1 flex-col justify-end p-5 sm:p-8">
        <div aria-hidden className="flex flex-1 flex-col">
          <div className="relative min-h-56 flex-1 pt-7">
            {/* guide lines at the top and middle of the plot; the axis is the labels' top border */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-7 flex flex-col justify-between">
              <span className="border-t border-dashed border-border/80" />
              <span className="border-t border-dashed border-border/80" />
              <span />
            </div>
            <div className="relative grid h-full grid-cols-6 gap-2 sm:gap-4">
              {months.map((m, i) => (
                <div key={m.month} className="flex h-full items-end justify-center">
                  <div
                    className={cn(
                      "relative w-full max-w-[3.25rem] rounded-t-xl",
                      m.count === 0 ? "bg-border" : i === last ? "bg-gold shadow-gold" : "bg-primary/85",
                    )}
                    style={{ height: m.count === 0 ? "3px" : `${(m.count / max) * 100}%` }}
                  >
                    <span className="absolute inset-x-0 bottom-full mb-1.5 text-center text-sm font-semibold tabular">{formatNumber(m.count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2 border-t border-border pt-2.5 sm:gap-4">
            {months.map((m, i) => (
              <div key={m.month} className="min-w-0 text-center">
                <span className={cn("block truncate text-xs font-medium", i === last ? "text-foreground" : "text-muted-foreground")}>
                  {monthLabel(m.month, locale, "short")}
                </span>
                {i === last && <span className="block truncate text-[10px] text-muted-foreground">{t("monthly.toDate")}</span>}
              </div>
            ))}
          </div>
        </div>
        <table className="sr-only" aria-labelledby="monthly-title">
          <thead>
            <tr>
              <th scope="col">{t("monthly.col.month")}</th>
              <th scope="col">{t("monthly.col.count")}</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => (
              <tr key={m.month}>
                <th scope="row">
                  {monthLabel(m.month, locale, "long")}
                  {i === last ? ` (${t("monthly.toDate")})` : ""}
                </th>
                <td>{formatNumber(m.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
