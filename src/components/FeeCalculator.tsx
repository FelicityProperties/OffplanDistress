"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useDir, useLocale, useT } from "@/i18n/client";
import { platformFee } from "@/lib/deal-math";
import { formatAED } from "@/lib/format";

export function FeeCalculator() {
  const t = useT("marketing");
  const locale = useLocale();
  const dir = useDir();
  const [value, setValue] = useState(2_500_000);
  const f = platformFee(value);
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">{t("calc.saleValue")}</p>
        <p className="text-xl font-semibold tabular">{formatAED(value, locale)}</p>
      </div>
      <Slider
        className="mt-4"
        dir={dir}
        min={300_000}
        max={20_000_000}
        step={50_000}
        value={[value]}
        onValueChange={(v) => setValue(v[0] ?? value)}
        aria-label={t("calc.saleValue")}
      />
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("calc.commission")}</dt>
          <dd className="tabular">{formatAED(f.commission, locale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("calc.vat")}</dt>
          <dd className="tabular">{formatAED(f.vat, locale)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <dt>{t("calc.total")}</dt>
          <dd className="tabular">{formatAED(f.total, locale)}</dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">
        {t("calc.zero", { amount: formatAED(0, locale) })}
      </p>
    </div>
  );
}
