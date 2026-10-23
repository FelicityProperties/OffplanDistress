import { SectionHeading } from "@/components/badges";
import { getT } from "@/i18n/server";
import type { DistressIndex } from "@/lib/market";
import { CashBands } from "./CashBands";
import { CommunityTable } from "./CommunityTable";
import { DemandPanel } from "./DemandPanel";
import { DeveloperTable } from "./DeveloperTable";
import { KpiStrip } from "./KpiStrip";
import { MonthlyBars } from "./MonthlyBars";
import { SellerProfile } from "./SellerProfile";

/** The published index (enough real listings): KPI strip, supply breakdowns, then demand. */
export async function DistressReport({ index }: { index: DistressIndex }) {
  const t = await getT("market");
  return (
    <>
      <KpiStrip index={index} />

      <section className="container-page pt-20 reveal sm:pt-24">
        <SectionHeading eyebrow={t("supply.eyebrow")} title={t("supply.title")} sub={t("supply.sub")} />
        <div className="mt-10">
          <CommunityTable index={index} />
        </div>
      </section>

      <div className="container-page grid gap-6 pt-6 reveal lg:grid-cols-2">
        <CashBands index={index} />
        <DeveloperTable index={index} />
      </div>

      <div className="container-page grid gap-6 pb-20 pt-6 reveal sm:pb-24 lg:grid-cols-2">
        <MonthlyBars index={index} />
        <SellerProfile index={index} />
      </div>

      <div className="pb-20 sm:pb-24">
        <DemandPanel index={index} />
      </div>
    </>
  );
}
