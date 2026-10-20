import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { FeeCalculator } from "@/components/FeeCalculator";
import { SectionHeading } from "@/components/badges";
import { BRAND, FEES } from "@/lib/config";
import { formatAED } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fees: 2% + VAT, only on success",
  description:
    "A flat 2% of the sale value plus 5% VAT, charged only when the transfer completes. No listing or upfront fees.",
};

export default function FeesPage() {
  return (
    <div className="container-page py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Fees"
            title="2% + 5% VAT. Only when the transfer completes."
            sub="The sale value is the seller's asking price plus the remaining balance owed to the developer — the figure registered with DLD."
          />
          <ul className="mt-8 space-y-3">
            {[
              FEES.payer === "buyer" ? "Free for sellers — the buyer pays our fee" : "Free for buyers — the seller pays our fee",
              "No listing fee, no upfront or retainer fee",
              "Developer NOC application & DLD paperwork included",
              "Trustee office appointment and settlement coordination included",
            ].map((x) => (
              <li key={x} className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-success" />
                {x}
              </li>
            ))}
            <li className="flex items-center gap-3 text-muted-foreground">
              <X className="h-5 w-5 shrink-0" />
              No fee if the deal falls through
            </li>
          </ul>
        </div>
        <FeeCalculator />
      </div>

      <div className="mt-16 overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="border-b p-6">
          <h3 className="font-sans text-lg font-semibold">Worked example</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A unit bought for AED 2,000,000 with AED 600,000 paid. The seller accepts AED 500,000 for their equity.
          </p>
        </div>
        <dl className="divide-y text-sm">
          {(() => {
            const sale = 500_000 + 1_400_000;
            const fee = Math.round(sale * FEES.commissionRate);
            return [
              ["Buyer pays the seller", formatAED(500_000)],
              ["Buyer takes over the remaining plan", formatAED(1_400_000)],
              ["Sale value", formatAED(sale)],
              [`${BRAND.name} fee (2%)`, formatAED(fee)],
              ["VAT on fee (5%)", formatAED(Math.round(fee * FEES.vatRate))],
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
          <h3 className="font-sans text-lg font-semibold">Third-party costs (paid at transfer)</h3>
          <p className="mt-1 text-sm text-muted-foreground">Set by DLD and the developer, not by us. Confirmed when the NOC is issued.</p>
        </div>
        <dl className="divide-y text-sm">
          {[
            ["DLD transfer fee", "4% of the sale value (customarily paid by the buyer)"],
            ["Developer NOC / assignment fee", "Set by each developer — often a fixed admin fee, sometimes a % of price"],
            ["DLD trustee office & registration", "Fixed fees per transaction + VAT"],
            [BRAND.name, "2% of the sale value + 5% VAT"],
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
