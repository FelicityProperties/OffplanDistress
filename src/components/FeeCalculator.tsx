"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { platformFee } from "@/lib/deal-math";
import { formatAED } from "@/lib/format";

export function FeeCalculator() {
  const [value, setValue] = useState(2_500_000);
  const f = platformFee(value);
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">Sale value</p>
        <p className="text-xl font-semibold tabular">{formatAED(value)}</p>
      </div>
      <Slider
        className="mt-4"
        min={300_000}
        max={20_000_000}
        step={50_000}
        value={[value]}
        onValueChange={(v) => setValue(v[0] ?? value)}
        aria-label="Sale value"
      />
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Brokerage fee (2%)</dt>
          <dd className="tabular">{formatAED(f.commission)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">VAT (5% of fee)</dt>
          <dd className="tabular">{formatAED(f.vat)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <dt>Total, paid on transfer</dt>
          <dd className="tabular">{formatAED(f.total)}</dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">
        AED 0 if the transfer doesn&apos;t complete.
      </p>
    </div>
  );
}
