import Link from "next/link";
import { getT } from "@/i18n/server";
import { COMMUNITIES } from "@/lib/config";
import { formatNumber, formatPct } from "@/lib/format";
import { MIN_SAMPLE, type DistressIndex } from "@/lib/market";
import { Bar, communityLabel, NotEnough, Panel, PanelHeader, signedPct } from "./shared";

/** Discount and % paid by community: a real table, with CSS bars beside the printed values. */
export async function CommunityTable({ index }: { index: DistressIndex }) {
  const [t, tc] = await Promise.all([getT("market"), getT("common")]);
  const rows = index.supply.communities;
  const maxDiscount = Math.max(0, ...rows.map((r) => r.medianDiscount ?? 0));
  const notEnough = t("notEnough");

  return (
    <Panel>
      <PanelHeader id="communities-title" eyebrow={t("communities.eyebrow")} title={t("communities.title")} sub={t("communities.sub")} />
      <table className="w-full table-fixed text-sm" aria-labelledby="communities-title">
        <colgroup>
          <col />
          <col className="w-12 sm:w-28" />
          <col className="w-[32%] sm:w-[38%]" />
          <col className="w-14 sm:w-32" />
        </colgroup>
        <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground rtl:text-xs">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold sm:px-8">
              {t("communities.col.community")}
            </th>
            <th scope="col" className="px-2 py-3 text-end font-semibold sm:px-4">
              {t("communities.col.units")}
            </th>
            <th scope="col" className="px-2 py-3 text-start font-semibold sm:px-4">
              {t("communities.col.discount")}
              <span className="sr-only"> ({t("communities.col.discountSr")})</span>
            </th>
            <th scope="col" className="py-3 pe-4 ps-2 text-end font-semibold sm:pe-8 sm:ps-4">
              {t("communities.col.paid")}
              <span className="sr-only"> ({t("communities.col.paidSr")})</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((r) => {
            const name = communityLabel(tc, r.name);
            return (
              <tr key={r.name} className="transition-colors hover:bg-secondary/40">
                <th scope="row" className="break-words px-4 py-4 text-start font-medium sm:px-8">
                  {COMMUNITIES.includes(r.name) ? (
                    <Link
                      href={`/deals?community=${encodeURIComponent(r.name)}`}
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </th>
                <td className="px-2 py-4 text-end tabular sm:px-4">{formatNumber(r.count)}</td>
                <td className="px-2 py-4 sm:px-4">
                  <span className="block font-semibold tabular">
                    {r.medianDiscount == null ? <NotEnough label={notEnough} /> : signedPct(r.medianDiscount)}
                  </span>
                  {r.medianDiscount != null && <Bar value={r.medianDiscount} max={maxDiscount} tone="success" className="mt-2 max-w-[14rem]" />}
                </td>
                <td className="py-4 pe-4 ps-2 text-end tabular sm:pe-8 sm:ps-4">
                  {r.medianPaid == null ? <NotEnough label={notEnough} /> : formatPct(r.medianPaid, 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-border/70 px-4 py-4 text-xs leading-relaxed text-muted-foreground sm:px-8">
        {t("communities.note", { min: MIN_SAMPLE })}
      </p>
    </Panel>
  );
}
