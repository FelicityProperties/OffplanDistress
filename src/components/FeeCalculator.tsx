"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useDir, useLocale, useT } from "@/i18n/client";
import { platformFee } from "@/lib/deal-math";
import { formatAED, formatAEDCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const MIN = 300_000;
const MAX = 20_000_000;

/** Interactive 2% + VAT calculator: a frosted card, meant to sit on a soft backdrop (glow / grid). */
export function FeeCalculator({ className }: { className?: string }) {
  const t = useT("marketing");
  const locale = useLocale();
  const dir = useDir();
  const [value, setValue] = useState(2_500_000);
  const f = platformFee(value);
  return (
    <div className={cn("glass rounded-3xl p-6 sm:p-8", className)}>
      <p className="text-sm font-medium text-muted-foreground">{t("calc.saleValue")}</p>
      <p className="mt-1.5 font-display text-3xl font-semibold leading-tight tabular sm:text-4xl">{formatAED(value, locale)}</p>
      <Slider
        className={cn(
          "mt-6 py-2",
          // Larger, gold-edged thumb with a clear focus halo (the shared slider stays untouched).
          "[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-gold [&_[role=slider]]:shadow-gold",
          "[&_[role=slider]:focus-visible]:ring-4 [&_[role=slider]:focus-visible]:ring-gold/40",
        )}
        dir={dir}
        min={MIN}
        max={MAX}
        step={50_000}
        value={[value]}
        onValueChange={(v) => setValue(v[0] ?? value)}
        aria-label={t("calc.saleValue")}
      />
      <div aria-hidden className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground tabular">
        <span>{formatAEDCompact(MIN, locale)}</span>
        <span>{formatAEDCompact(MAX, locale)}</span>
      </div>
      <dl className="mt-6 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 py-3">
          <dt className="text-muted-foreground">{t("calc.commission")}</dt>
          <dd className="font-medium tabular">{formatAED(f.commission, locale)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-border/70 py-3">
          <dt className="text-muted-foreground">{t("calc.vat")}</dt>
          <dd className="font-medium tabular">{formatAED(f.vat, locale)}</dd>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-ink-gradient px-5 py-4 text-primary-foreground shadow-card">
          <dt className="text-sm text-primary-foreground/80">{t("calc.total")}</dt>
          <dd className="text-xl font-semibold tabular sm:text-2xl">{formatAED(f.total, locale)}</dd>
        </div>
      </dl>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-xs font-medium leading-relaxed text-success">
        <ShieldCheck className="mt-px h-4 w-4 shrink-0" aria-hidden />
        {t("calc.zero", { amount: formatAED(0, locale) })}
      </p>
    </div>
  );
}
