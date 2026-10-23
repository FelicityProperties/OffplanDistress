import Link from "next/link";
import { getLocale, getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translator";
import { formatAEDCompact, formatNumber, formatPct } from "@/lib/format";
import { MIN_SAMPLE, type DistressIndex } from "@/lib/market";
import { Bar, Panel, PanelHeader, share } from "./shared";

/** Units on the market by upfront cash (the asking price), each band linking to /deals with the same budget. */
export async function CashBands({ index }: { index: DistressIndex }) {
  const [t, locale] = await Promise.all([getT("market"), getLocale()]);
  const s = index.supply;
  const max = Math.max(1, ...s.cash.map((b) => b.count));

  return (
    <Panel className="flex flex-col">
      <PanelHeader id="cash-title" eyebrow={t("cash.eyebrow")} title={t("cash.title")} sub={t("cash.sub")} />
      <table className="w-full text-sm" aria-labelledby="cash-title">
        <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground rtl:text-xs">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold sm:px-8">
              {t("cash.col.band")}
            </th>
            <th scope="col" className="px-2 py-3 text-end font-semibold">
              {t("cash.col.units")}
            </th>
            <th scope="col" className="w-[30%] px-2 py-3 text-start font-semibold sm:px-4">
              {t("cash.col.share")}
            </th>
            <th scope="col" className="py-3 pe-4 ps-2 text-end font-semibold sm:pe-8">
              {t("cash.col.offers")}
              <span className="sr-only"> ({t("cash.col.offersSr")})</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {s.cash.map((b) => {
            const q = new URLSearchParams();
            if (b.min != null) q.set("minCash", String(b.min));
            if (b.max != null) q.set("maxCash", String(b.max));
            const pct = share(b.count, s.live);
            return (
              <tr key={b.key} className="transition-colors hover:bg-secondary/40">
                <th scope="row" className="px-4 py-4 text-start font-medium sm:px-8">
                  <Link
                    href={`/deals?${q.toString()}`}
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t(`cash.band.${b.key}` as TKey<"market">)}
                  </Link>
                </th>
                <td className="px-2 py-4 text-end font-semibold tabular">{formatNumber(b.count)}</td>
                <td className="px-2 py-4 sm:px-4">
                  <span className="block text-xs text-muted-foreground tabular">{pct == null ? "—" : formatPct(pct, 0)}</span>
                  <Bar value={b.count} max={max} tone="gold" className="mt-1.5 h-2" />
                </td>
                {/* One or two units in a band would expose those listings' private offer counts. */}
                <td className="py-4 pe-4 ps-2 text-end tabular text-muted-foreground sm:pe-8">
                  {b.count === 0 || b.count >= MIN_SAMPLE ? formatNumber(b.offers) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/70 px-4 py-4 text-xs text-muted-foreground sm:px-8">
        {s.medianUpfront != null && s.live >= MIN_SAMPLE && (
          <span className="font-medium text-foreground tabular">{t("cash.medianUpfront", { value: formatAEDCompact(s.medianUpfront, locale) })}</span>
        )}
        <span>{t("cash.note")}</span>
      </div>
    </Panel>
  );
}
