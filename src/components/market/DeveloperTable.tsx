import Link from "@/components/LocaleLink";
import { getT } from "@/i18n/server";
import { DEVELOPERS } from "@/lib/config";
import { formatNumber, formatPct } from "@/lib/format";
import type { DistressIndex } from "@/lib/market";
import { Bar, developerLabel, Panel, PanelHeader, share } from "./shared";

/** Units on the market by developer. */
export async function DeveloperTable({ index }: { index: DistressIndex }) {
  const [t, tc] = await Promise.all([getT("market"), getT("common")]);
  const rows = index.supply.developers;
  const total = index.supply.live;
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Panel className="flex flex-col">
      <PanelHeader id="developers-title" eyebrow={t("developers.eyebrow")} title={t("developers.title")} sub={t("developers.sub")} />
      <table className="w-full text-sm" aria-labelledby="developers-title">
        <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground rtl:text-xs">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold sm:px-8">
              {t("developers.col.developer")}
            </th>
            <th scope="col" className="px-2 py-3 text-end font-semibold">
              {t("developers.col.units")}
            </th>
            <th scope="col" className="w-[40%] py-3 pe-4 ps-2 text-start font-semibold sm:pe-8 sm:ps-4">
              {t("developers.col.share")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((r) => {
            const pct = share(r.count, total);
            return (
              <tr key={r.name} className="transition-colors hover:bg-secondary/40">
                <th scope="row" className="break-words px-4 py-3.5 text-start font-medium sm:px-8">
                  {DEVELOPERS.includes(r.name) ? (
                    <Link
                      href={`/deals?developer=${encodeURIComponent(r.name)}`}
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {developerLabel(tc, r.name)}
                    </Link>
                  ) : (
                    developerLabel(tc, r.name)
                  )}
                </th>
                <td className="px-2 py-3.5 text-end font-semibold tabular">{formatNumber(r.count)}</td>
                <td className="py-3.5 pe-4 ps-2 sm:pe-8 sm:ps-4">
                  <span className="flex items-center gap-3">
                    <Bar value={r.count} max={max} className="flex-1" />
                    <span className="w-10 shrink-0 text-end text-xs text-muted-foreground tabular">{pct == null ? "—" : formatPct(pct, 0)}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-auto border-t border-border/70 px-4 py-4 text-xs text-muted-foreground sm:px-8">
        <span className="font-medium text-foreground tabular">{t("developers.count", { n: formatNumber(rows.length) })}</span>
        <span aria-hidden> · </span>
        {t("developers.note")}
      </p>
    </Panel>
  );
}
