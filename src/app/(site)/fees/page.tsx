import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { FeeCalculator } from "@/components/FeeCalculator";
import { SectionHeading } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { BRAND, FEES } from "@/lib/config";
import { formatAED } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("marketing");
  return { title: t("fees.metaTitle"), description: t("fees.metaDescription") };
}

export default async function FeesPage() {
  const [t, tc, locale] = await Promise.all([getT("marketing"), getT("common"), getLocale()]);
  return (
    <div className="container-page py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow={tc("fees")} title={t("fees.title")} sub={t("fees.sub")} />
          <ul className="mt-8 space-y-3">
            {[
              FEES.payer === "buyer" ? t("fees.freeForSellers") : t("fees.freeForBuyers"),
              t("fees.noUpfront"),
              t("fees.nocIncluded"),
              t("fees.trusteeIncluded"),
            ].map((x) => (
              <li key={x} className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-success" />
                {x}
              </li>
            ))}
            <li className="flex items-center gap-3 text-muted-foreground">
              <X className="h-5 w-5 shrink-0" />
              {t("fees.noDealNoFee")}
            </li>
          </ul>
        </div>
        <FeeCalculator />
      </div>

      <div className="mt-16 overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="border-b p-6">
          <h3 className="font-sans text-lg font-semibold">{t("fees.example.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("fees.example.body", {
              price: formatAED(2_000_000, locale),
              paid: formatAED(600_000, locale),
              equity: formatAED(500_000, locale),
            })}
          </p>
        </div>
        <dl className="divide-y text-sm">
          {(() => {
            const sale = 500_000 + 1_400_000;
            const fee = Math.round(sale * FEES.commissionRate);
            return [
              [t("fees.example.buyerPays"), formatAED(500_000, locale)],
              [t("fees.example.remaining"), formatAED(1_400_000, locale)],
              [t("fees.example.saleValue"), formatAED(sale, locale)],
              [t("fees.example.fee", { brand: BRAND.name }), formatAED(fee, locale)],
              [t("fees.example.vat"), formatAED(Math.round(fee * FEES.vatRate), locale)],
            ];
          })().map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-6 py-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium tabular">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="border-b p-6">
          <h3 className="font-sans text-lg font-semibold">{t("fees.third.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("fees.third.sub")}</p>
        </div>
        <dl className="divide-y text-sm">
          {[
            [t("fees.third.dld"), t("fees.third.dldValue")],
            [t("fees.third.noc"), t("fees.third.nocValue")],
            [t("fees.third.trustee"), t("fees.third.trusteeValue")],
            [BRAND.name, t("fees.third.oursValue")],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col justify-between gap-1 p-6 sm:flex-row">
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted-foreground sm:text-end">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
