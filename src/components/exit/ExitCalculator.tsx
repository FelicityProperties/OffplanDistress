"use client";

import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { ArrowDown, ArrowRight, CirclePause, Handshake, Info, MessageCircle, Scale, TriangleAlert, Wallet } from "lucide-react";
import { StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDir, useLocale, useT } from "@/i18n/client";
import { BRAND, FEES } from "@/lib/config";
import { formatAED, formatAEDCompact, formatNumber, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Aed, AedRange } from "./Aed";
import { analyzeExit, quickSalePct, type Tier } from "./exit-math";
import { ltr } from "./ltr";

const PRICE_MIN = 300_000;
const PRICE_MAX = 20_000_000;
const MONTHS_MAX = 60;
/** Inputs stop at 10 digits (just under AED 10 billion) — well past any unit, short of float trouble. */
const MAX_DIGITS = 10;

// Example inputs only (editable): an AED 2M unit with 27% paid, a third of the way built.
const DEFAULTS = { price: 2_000_000, paid: 540_000, progress: 35 };

/** Fill {placeholders} in a translated template with React nodes (formatted, bidi-isolated amounts). */
function rich(template: string, parts: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/).map((seg, i) => {
    const key = /^\{(\w+)\}$/.exec(seg)?.[1];
    return <Fragment key={i}>{key && key in parts ? parts[key] : ltr(seg)}</Fragment>;
  });
}

/** Arabic-Indic and Persian digits typed on an Arabic keyboard → Latin. */
function latinDigits(s: string) {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/** Numeric text input that shows thousands separators while you type and keeps the caret in place. */
function NumberInput({
  id,
  value,
  onValue,
  placeholder,
  describedBy,
  unit,
  unitFirst,
}: {
  id: string;
  value: number | null;
  onValue: (v: number | null) => void;
  placeholder?: string;
  describedBy?: string;
  unit: string;
  /** Unit before the number ("AED 1,000"); otherwise after it ("1,000 درهم", "18 months"). */
  unitFirst: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const digitsBeforeCaret = useRef<number | null>(null);
  const text = value == null ? "" : formatNumber(value);

  useLayoutEffect(() => {
    const el = ref.current;
    const want = digitsBeforeCaret.current;
    if (!el || want == null || document.activeElement !== el) return;
    let pos = 0;
    for (let seen = 0; pos < text.length && seen < want; pos++) if (/\d/.test(text[pos])) seen++;
    el.setSelectionRange(pos, pos);
    digitsBeforeCaret.current = null;
  }, [text]);

  const unitEl = (
    <span aria-hidden className="shrink-0 text-sm font-medium text-muted-foreground">
      {unit}
    </span>
  );
  return (
    <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 shadow-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
      {unitFirst && unitEl}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        value={text}
        placeholder={placeholder}
        aria-describedby={describedBy}
        onChange={(e) => {
          const raw = latinDigits(e.target.value);
          const caret = e.target.selectionStart ?? raw.length;
          digitsBeforeCaret.current = raw.slice(0, caret).replace(/\D/g, "").length;
          const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
          onValue(digits ? Number(digits) : null);
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold tabular outline-none placeholder:font-normal placeholder:text-muted-foreground/70 rtl:text-end"
      />
      {!unitFirst && unitEl}
    </div>
  );
}

/** Gold slider with a readable value for screen readers, mirrored in RTL. */
function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onValue,
  valueText,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValue: (v: number) => void;
  valueText: string;
  disabled?: boolean;
}) {
  const dir = useDir();
  return (
    <SliderPrimitive.Root
      dir={dir}
      min={min}
      max={max}
      step={step}
      value={[Math.min(Math.max(value, min), max)]}
      onValueChange={(v) => onValue(v[0] ?? value)}
      disabled={disabled}
      className="relative mt-3 flex h-6 w-full touch-none select-none items-center data-[disabled]:opacity-40"
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/12">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gold" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block h-5 w-5 cursor-grab rounded-full border-2 border-gold bg-background shadow-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40 active:cursor-grabbing data-[disabled]:cursor-not-allowed motion-safe:transition-shadow"
      />
    </SliderPrimitive.Root>
  );
}

function FieldHead({ htmlFor, label, aside }: { htmlFor?: string; label: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {aside}
    </div>
  );
}

/** A label / value pair inside a result card's <dl>; `note` becomes a second <dd> under the pair. */
function Row({
  label,
  value,
  note,
  strong,
  dark,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  strong?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3", dark ? "border-primary-foreground/10" : "border-border/70")}>
      <dt className={cn("min-w-0 text-sm", dark ? "text-primary-foreground/70" : "text-muted-foreground", strong && (dark ? "text-primary-foreground" : "font-medium text-foreground"))}>
        {label}
      </dt>
      <dd className={cn("ms-auto text-end font-semibold tabular", strong ? "text-lg sm:text-xl" : "text-sm sm:text-base")}>{value}</dd>
      {note && (
        <dd className={cn("basis-full text-xs leading-relaxed", dark ? "text-primary-foreground/55" : "text-muted-foreground")}>{note}</dd>
      )}
    </div>
  );
}

function OptionCard({
  n,
  icon: Icon,
  title,
  desc,
  children,
  aside,
  tone = "light",
}: {
  n: number;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  desc: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  tone?: "light" | "dark";
}) {
  const t = useT("exit");
  const dark = tone === "dark";
  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-3xl p-5 sm:p-6",
        dark ? "bg-ink-gradient text-primary-foreground shadow-lift" : "border border-border/80 bg-card shadow-card",
      )}
    >
      {dark && (
        <>
          <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-50 mask-fade-b" />
          <div aria-hidden className="absolute -end-20 -top-20 -z-10 h-56 w-56 bg-glow-gold opacity-50" />
        </>
      )}
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            dark ? "bg-primary-foreground/10 text-gold ring-1 ring-primary-foreground/15" : "bg-secondary text-foreground",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em] tabular", dark ? "text-gold" : "text-muted-foreground")}>
            {t("out.option", { n })}
          </p>
          <h3 className={cn("mt-0.5 font-sans text-lg font-semibold leading-snug", dark && "text-primary-foreground")}>{title}</h3>
          <p className={cn("mt-1 text-sm leading-relaxed", dark ? "text-primary-foreground/70" : "text-muted-foreground")}>{desc}</p>
        </div>
      </div>
      {aside}
      {children}
    </article>
  );
}

const TIER_TONE: Record<Tier, "success" | "gold" | "warning" | "destructive"> = {
  notStarted: "success",
  under60: "gold",
  from60to80: "warning",
  over80: "destructive",
};

export function ExitCalculator() {
  const t = useT("exit");
  /** Translated text with its numbers isolated (percentages, ranges) — for display, not attributes. */
  const tx = (...args: Parameters<typeof t>) => ltr(t(...args));
  const locale = useLocale();
  const plural = useMemo(() => new Intl.PluralRules(locale === "ar" ? "ar" : "en"), [locale]);
  const monthsText = (n: number) => t(`count.months.${plural.select(n)}`, { n });
  const ids = useId();
  const [price, setPrice] = useState<number | null>(DEFAULTS.price);
  const [paid, setPaid] = useState<number | null>(DEFAULTS.paid);
  const [progress, setProgress] = useState(DEFAULTS.progress);
  const [notStarted, setNotStarted] = useState(false);
  const [market, setMarket] = useState<number | null>(null);
  const [months, setMonths] = useState<number | null>(null);

  const a = useMemo(
    () => analyzeExit({ price: price ?? 0, paid: paid ?? 0, progress, notStarted, marketPrice: market, months }),
    [price, paid, progress, notStarted, market, months],
  );
  const ready = a.price > 0;
  const neutral = a.verdict === "law" || a.verdict === "none";
  const paidOver = price != null && paid != null && paid > price;
  const unit = locale === "ar" ? "درهم" : "AED";
  const unitFirst = locale !== "ar";
  const money = (v: number, o?: { signed?: boolean; approx?: boolean }) => <Aed value={v} locale={locale} {...o} />;
  const pctLabel = (v: number) => <bdi dir="ltr">{formatPct(v)}</bdi>;

  // Slider bounds that follow the purchase price.
  const priceForRanges = Math.max(a.price, PRICE_MIN);
  const paidStep = priceForRanges > 5_000_000 ? 10_000 : 5_000;
  const marketMin = Math.round((priceForRanges * 0.5) / 10_000) * 10_000;
  const marketMax = Math.round((priceForRanges * 1.6) / 10_000) * 10_000;

  const id = (k: string) => `${ids}-${k}`;
  const waText = t("wa.text", {
    brand: BRAND.name,
    price: formatAED(a.price, locale),
    paid: formatAED(a.paid, locale),
    progress: notStarted ? t("wa.notStarted") : t("wa.progress", { pct: progress }),
  });
  const waHref = BRAND.whatsapp ? `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(waText)}` : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
      {/* Inputs */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-lift sm:p-7 lg:sticky lg:top-24">
        <h2 className="font-sans text-xl font-semibold">{t("calc.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("calc.sub")}</p>

        <div className="mt-6 space-y-7">
          {/* Purchase price */}
          <div>
            <FieldHead htmlFor={id("price")} label={t("in.price")} />
            <NumberInput
              id={id("price")}
              value={price}
              onValue={setPrice}
              describedBy={id("price-hint")}
              unit={unit}
              unitFirst={unitFirst}
              placeholder="2,000,000"
            />
            <RangeSlider
              label={t("in.price")}
              value={price ?? PRICE_MIN}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={10_000}
              onValue={(v) => {
                setPrice(v);
                // Keep "paid" inside the new price.
                if (paid != null && paid > v) setPaid(v);
              }}
              valueText={formatAED(price ?? 0, locale)}
            />
            <div aria-hidden className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground tabular">
              <span>{formatAEDCompact(PRICE_MIN, locale)}</span>
              <span>{formatAEDCompact(PRICE_MAX, locale)}</span>
            </div>
            <p id={id("price-hint")} className="mt-1.5 text-xs text-muted-foreground">
              {t("in.price.hint")}
            </p>
          </div>

          {/* Paid so far */}
          <div>
            <FieldHead
              htmlFor={id("paid")}
              label={t("in.paid")}
              aside={
                ready && (
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-foreground tabular">
                    {rich(t("in.paid.hint"), { pct: pctLabel(a.paidPct) })}
                  </span>
                )
              }
            />
            <NumberInput
              id={id("paid")}
              value={paid}
              onValue={setPaid}
              describedBy={paidOver ? id("paid-over") : undefined}
              unit={unit}
              unitFirst={unitFirst}
              placeholder="540,000"
            />
            <RangeSlider
              label={t("in.paid")}
              value={paid ?? 0}
              min={0}
              max={priceForRanges}
              step={paidStep}
              onValue={setPaid}
              valueText={formatAED(paid ?? 0, locale)}
              disabled={!ready}
            />
            {paidOver && (
              <p id={id("paid-over")} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-warning">
                <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                {tx("in.paid.over")}
              </p>
            )}
          </div>

          {/* Construction progress */}
          <div>
            <FieldHead
              htmlFor={id("progress")}
              label={t("in.progress")}
              aside={
                <output htmlFor={id("progress")} className="font-display text-2xl font-semibold leading-none tabular">
                  {notStarted ? "—" : <bdi dir="ltr">{progress}%</bdi>}
                </output>
              }
            />
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <RangeSlider
                  label={t("in.progress")}
                  value={progress}
                  min={0}
                  max={100}
                  step={1}
                  onValue={setProgress}
                  valueText={`${progress}%`}
                  disabled={notStarted}
                />
              </div>
              <div className="mt-3 w-20 shrink-0">
                <div className="flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-2 shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
                  <input
                    id={id("progress")}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    dir="ltr"
                    disabled={notStarted}
                    value={progress}
                    aria-describedby={id("progress-hint")}
                    onChange={(e) => {
                      const v = Number(latinDigits(e.target.value));
                      setProgress(Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), 100) : 0);
                    }}
                    className="h-full w-full min-w-0 bg-transparent text-sm font-semibold tabular outline-none disabled:opacity-40 rtl:text-end [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span aria-hidden className="text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <Checkbox id={id("not-started")} checked={notStarted} onCheckedChange={(v) => setNotStarted(v === true)} className="h-5 w-5 rounded-md" />
              <label htmlFor={id("not-started")} className="cursor-pointer text-sm">
                {t("in.notStarted")}
              </label>
            </div>
            <p id={id("progress-hint")} className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {tx("in.progress.hint")}
            </p>
          </div>

          {/* Today's price */}
          <div>
            <FieldHead
              htmlFor={id("market")}
              label={t("in.market")}
              aside={
                market != null ? (
                  <button
                    type="button"
                    onClick={() => setMarket(null)}
                    className="rounded-md text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("in.market.clear")}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("calc.optional")}</span>
                )
              }
            />
            <NumberInput
              id={id("market")}
              value={market}
              onValue={setMarket}
              describedBy={id("market-hint")}
              unit={unit}
              unitFirst={unitFirst}
              placeholder={t("in.placeholder.optional")}
            />
            <RangeSlider
              label={t("in.market")}
              value={market ?? a.price}
              min={marketMin}
              max={marketMax}
              step={10_000}
              onValue={setMarket}
              valueText={formatAED(market ?? a.price, locale)}
              disabled={!ready}
            />
            <p id={id("market-hint")} className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t("in.market.hint")}
            </p>
          </div>

          {/* Months to handover */}
          <div>
            <FieldHead htmlFor={id("months")} label={t("in.months")} aside={<span className="text-xs text-muted-foreground">{t("calc.optional")}</span>} />
            <NumberInput
              id={id("months")}
              value={months}
              onValue={(v) => setMonths(v == null ? null : Math.min(v, 240))}
              describedBy={id("months-hint")}
              unit={t("in.months.unit")}
              unitFirst={false}
              placeholder={t("in.placeholder.optional")}
            />
            <RangeSlider
              label={t("in.months")}
              value={months ?? 0}
              min={0}
              max={MONTHS_MAX}
              step={1}
              onValue={(v) => setMonths(v > 0 ? v : null)}
              valueText={months ? monthsText(months) : t("in.placeholder.optional")}
            />
            <p id={id("months-hint")} className="mt-1.5 text-xs text-muted-foreground">
              {t("in.months.hint")}
            </p>
          </div>
        </div>
        {/* Phones: the results are below this long form */}
        <a
          href="#exit-results"
          className="mt-7 flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 text-sm font-semibold transition-colors hover:bg-accent lg:hidden"
        >
          {t("calc.seeResults")} <ArrowDown className="h-4 w-4" aria-hidden />
        </a>
      </div>

      {/* Results */}
      <div id="exit-results" className="min-w-0">
        <h2 className="sr-only">{t("out.title")}</h2>
        {!ready ? (
          <p className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">{t("out.empty")}</p>
        ) : (
          <div className="space-y-4">
            {/* Verdict: selling vs stopping payments */}
            <div
              aria-live="polite"
              className={cn(
                "rounded-3xl border p-5 sm:p-6",
                neutral ? "border-border/80 bg-secondary/70" : "border-success/25 bg-success-soft/70",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    neutral ? "bg-card text-foreground" : "bg-success text-success-foreground",
                  )}
                >
                  {neutral ? <Scale className="h-4.5 w-4.5" aria-hidden /> : <Handshake className="h-4.5 w-4.5" aria-hidden />}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{t(`verdict.${a.verdict}.title`)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {a.verdict === "sell"
                      ? Math.round(a.edgeLow) === Math.round(a.edgeHigh)
                        ? rich(t("verdict.sell.bodySingle"), { high: money(a.edgeHigh) })
                        : rich(t("verdict.sell.body"), { low: money(a.edgeLow), high: money(a.edgeHigh) })
                      : a.verdict === "maybe"
                        ? rich(t("verdict.maybe.body"), { high: money(a.edgeHigh) })
                        : t(`verdict.${a.verdict}.body`)}
                  </p>
                  {a.tier === "over80" && a.remaining > 0 && (
                    <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
                      {rich(t("verdict.over80"), { amount: money(a.remaining) })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 1 · Keep paying */}
            <OptionCard n={1} icon={Wallet} title={t("opt1.title")} desc={t("opt1.desc")}>
              <dl className="mt-4 divide-y divide-border/70 border-t border-border/70">
                <Row label={t("opt1.remaining")} value={money(a.remaining)} />
                {a.perMonth != null && a.months != null && (
                  <Row label={rich(t("opt1.perMonth"), { months: <bdi>{monthsText(a.months)}</bdi> })} value={money(a.perMonth)} note={t("opt1.perMonth.note")} />
                )}
                <Row
                  label={t("opt1.value")}
                  value={a.hasMarket ? money(a.market) : <span className="text-xs font-medium text-muted-foreground">{t("opt1.noMarket")}</span>}
                />
                {a.hasMarket && (
                  <Row
                    label={t("opt1.gain")}
                    value={
                      <span className={cn(a.paperGain > 0 && "text-success", a.paperGain < 0 && "text-destructive")}>
                        {money(a.paperGain, { signed: true })}
                      </span>
                    }
                  />
                )}
              </dl>
            </OptionCard>

            {/* 2 · Stop paying */}
            <OptionCard
              n={2}
              icon={CirclePause}
              title={t("opt2.title")}
              desc={t("opt2.desc")}
              aside={
                <div className="mt-4 rounded-2xl bg-secondary/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("opt2.rule")}</p>
                  <div className="mt-2">
                    <StatusPill tone={TIER_TONE[a.tier]}>{tx(`tier.${a.tier}`)}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{tx(`tier.${a.tier}.rule`)}</p>
                </div>
              }
            >
              <dl className="mt-3 divide-y divide-border/70">
                {a.tier !== "notStarted" && (
                  <Row label={rich(t("opt2.max"), { pct: pctLabel(a.rate) })} value={money(a.maxRetention)} />
                )}
                <Row
                  label={t("opt2.lose")}
                  value={<span className={cn(a.atRisk > 0 && "text-destructive")}>{money(a.atRisk)}</span>}
                  note={a.tier !== "notStarted" ? t("opt2.spa") : undefined}
                />
                <Row
                  label={t("opt2.refund")}
                  value={money(a.refund)}
                  strong
                  note={a.tier === "notStarted" ? t("opt2.refund.escrow") : a.refund > 0 ? tx("opt2.refund.note") : undefined}
                />
              </dl>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold-soft/70 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-gold-foreground">
                <Info className="mt-px h-4 w-4 shrink-0" aria-hidden />
                {tx("opt2.notice")}
              </p>
            </OptionCard>

            {/* 3 · Sell the contract */}
            <OptionCard n={3} icon={Handshake} title={t("opt3.title", { brand: BRAND.name })} desc={t("opt3.desc")} tone="dark">
              <dl className="mt-4 divide-y divide-primary-foreground/10 border-t border-primary-foreground/10">
                <Row dark label={t("opt3.position")} value={money(a.position)} note={t("opt3.position.formula")} />
                <Row
                  dark
                  label={t("opt3.range")}
                  value={<AedRange low={a.saleLow} high={a.saleHigh} locale={locale} />}
                  note={tx("opt3.range.note", quickSalePct)}
                />
                <Row
                  dark
                  label={t("opt3.fee")}
                  value={FEES.payer === "buyer" ? money(0) : <AedRange low={a.feeLow} high={a.feeHigh} locale={locale} />}
                  note={FEES.payer === "buyer" ? tx("opt3.fee.buyer") : tx("opt3.fee.seller")}
                />
                <Row dark label={t("opt3.noc")} value={money(a.noc, { approx: true })} note={t("opt3.noc.note")} />
                <Row
                  dark
                  strong
                  label={t("opt3.net")}
                  value={
                    <span className="text-gradient-gold">
                      <AedRange low={a.netLow} high={a.netHigh} locale={locale} />
                    </span>
                  }
                  note={a.remaining > 0 ? rich(t("opt3.takeover"), { amount: money(a.remaining) }) : undefined}
                />
              </dl>
              {(!a.hasMarket || a.position === 0 || a.paidPct < 0.4) && (
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-primary-foreground/75">
                  {!a.hasMarket && (
                    <li className="flex items-start gap-2">
                      <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                      {t("opt3.noMarket")}
                    </li>
                  )}
                  {a.position === 0 && a.paid > 0 && (
                    <li className="flex items-start gap-2">
                      <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                      {t("opt3.underwater")}
                    </li>
                  )}
                  {a.paidPct < 0.4 && (
                    <li className="flex items-start gap-2">
                      <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                      {tx("opt3.nocWarning")}
                    </li>
                  )}
                </ul>
              )}
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Button asChild variant="gold" size="lg" className="flex-1 sm:flex-none">
                  <Link href="/sell">
                    {t("cta.list")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                  </Link>
                </Button>
                {waHref && (
                  <Button asChild variant="heroOutline" size="lg" className="flex-1 sm:flex-none">
                    <a href={waHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden /> {t("cta.whatsapp")}
                    </a>
                  </Button>
                )}
              </div>
              <Link
                href="/how-it-works#sellers"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {t("cta.how")} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
              </Link>
            </OptionCard>
          </div>
        )}
      </div>
    </div>
  );
}
