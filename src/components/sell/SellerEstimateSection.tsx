import { CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/components/badges";
import { getT } from "@/i18n/server";
import { BRAND, FEES } from "@/lib/config";
import { QuickEstimate } from "./QuickEstimate";

/** Home page seller column: the pitch above the free estimate, so an owner sees a number before any sign-up. */
export async function SellerEstimateSection({ signedIn }: { signedIn: boolean }) {
  const t = await getT("sell");
  const points = [
    t("estimate.home.point.account"),
    ...(FEES.payer === "buyer" ? [t("estimate.home.point.fee")] : []),
    ...(BRAND.orn ? [t("estimate.home.point.licensed", { orn: BRAND.orn })] : []),
  ];
  return (
    <section id="seller-estimate" className="container-page scroll-mt-24 py-24 reveal">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <SectionHeading eyebrow={t("estimate.home.eyebrow")} title={t("estimate.home.title")} sub={t("estimate.home.body")} />
        <ul className="space-y-3 text-sm">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-foreground" aria-hidden />
              <span>
                <bdi>{p}</bdi>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <QuickEstimate signedIn={signedIn} showHeader={false} className="mt-10" />
    </section>
  );
}
