import Link from "@/components/LocaleLink";
import { getT } from "@/i18n/server";
import { COMMUNITIES } from "@/lib/config";
import { formatNumber, formatPct } from "@/lib/format";
import { MIN_SAMPLE, type DistressIndex } from "@/lib/market";
import {
  Bar,
  communityLabel,
  NotEnough,
  Panel,
  PanelHeader,
  ROW_END,
  ROW_HEAD,
  ROW_LINK,
  ROW_TAP,
  RowChevron,
  signedPct,
  TABLE_HEAD,
} from "./shared";

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
        {/* Phones: a narrower units and discount column, so the name column fits the longest word ("Mohammed",
            "Beachfront"): names broke mid-word in 90px. */}
        <colgroup>
          <col />
          <col className="w-11 sm:w-28" />
          <col className="w-[28%] sm:w-[38%]" />
          <col className="w-14 sm:w-32" />
        </colgroup>
        <thead className={TABLE_HEAD}>
          <tr>
            <th scope="col" className="px-3 py-3 text-start font-semibold sm:px-8">
              {t("communities.col.community")}
            </th>
            <th scope="col" className="px-1.5 py-3 text-end font-semibold sm:px-4">
              {t("communities.col.units")}
            </th>
            <th scope="col" className="px-1.5 py-3 text-start font-semibold sm:px-4">
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
            const linked = COMMUNITIES.includes(r.name);
            return (
              <tr key={r.name} className={ROW_TAP}>
                <th scope="row" className={`${ROW_HEAD} break-words px-3 py-4 text-start font-medium sm:px-8`}>
                  {linked ? (
                    <Link
                      href={`/deals?community=${encodeURIComponent(r.name)}`}
                      className={`${ROW_LINK} max-sm:-mx-3 max-sm:-my-4 max-sm:px-3 max-sm:py-4`}
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </th>
                <td className="px-1.5 py-4 text-end tabular sm:px-4">{formatNumber(r.count)}</td>
                <td className="px-1.5 py-4 sm:px-4">
                  <span className="block font-semibold tabular">
                    {r.medianDiscount == null ? <NotEnough label={notEnough} /> : signedPct(r.medianDiscount)}
                  </span>
                  {r.medianDiscount != null && <Bar value={r.medianDiscount} max={maxDiscount} tone="success" className="mt-2 max-w-[14rem]" />}
                </td>
                {/* ps-1 on phones: "100%" fits beside the chevron. */}
                <td className={`${ROW_END} py-4 pe-4 ps-1 text-end tabular sm:pe-8 sm:ps-4`}>
                  {r.medianPaid == null ? <NotEnough label={notEnough} /> : formatPct(r.medianPaid, 0)}
                  {linked && <RowChevron />}
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
