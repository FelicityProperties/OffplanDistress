"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Check, Info, Loader2, MessageCircle, TriangleAlert, X } from "lucide-react";
import { createSellerLead } from "@/app/actions/leads";
import { Aed, AedRange } from "@/components/exit/Aed";
import { quickSalePct } from "@/components/exit/exit-math";
import { ltr } from "@/components/exit/ltr";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { richText } from "@/content/legal/rich-text";
import { useDir, useLocale, useT } from "@/i18n/client";
import { readAttribution } from "@/lib/attribution";
import { BRAND, DEVELOPERS, FEES } from "@/lib/config";
import { nextQuarters, sellerEstimate, type EstimatePrefill } from "@/lib/estimate";
import { formatAED, formatNumber, formatPct, formatQuarter } from "@/lib/format";
import { developerName, searchKey } from "@/lib/place-names";
import { cn } from "@/lib/utils";

type Missed = "none" | "one" | "more";

/** Server field names → the fields here, so a rejected submit highlights the right box (and opens step 1). */
const SERVER_FIELD: Record<string, string> = {
  spaPrice: "spa",
  amountPaid: "paid",
  handoverQuarter: "handover",
  developer: "developer",
  developerOther: "developerOther",
  name: "name",
  phone: "phone",
};
const STEP1 = new Set(["spa", "paid", "handover", "developer", "developerOther"]);

/** Arabic-Indic and Persian digits typed on an Arabic keyboard → Latin. */
function latinDigits(s: string) {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/** Whole-dirham input that shows thousands separators while you type and keeps the caret after the same digit. */
function MoneyInput({
  id,
  value,
  onValue,
  placeholder,
  invalid,
  describedBy,
}: {
  id: string;
  value: number | null;
  onValue: (v: number | null) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const digitsBeforeCaret = useRef<number | null>(null);
  const lastKey = useRef<string | null>(null);
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

  return (
    <Input
      ref={ref}
      id={id}
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      value={text}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onKeyDown={(e) => {
        lastKey.current = e.key;
      }}
      onChange={(e) => {
        // A statement's "540,000.00" keeps 540,000, not 54,000,000.
        const raw = latinDigits(e.target.value).replace(/[.٫]\d{0,2}$/, "");
        const caret = Math.min(e.target.selectionStart ?? raw.length, raw.length);
        let before = raw.slice(0, caret).replace(/\D/g, "").length;
        let digits = raw.replace(/\D/g, "");
        // Backspace / Delete on a thousands comma removes the digit next to it.
        if (digits === text.replace(/\D/g, "") && raw.length < text.length) {
          if (lastKey.current === "Backspace" && before > 0) {
            digits = digits.slice(0, before - 1) + digits.slice(before);
            before -= 1;
          } else if (lastKey.current === "Delete") {
            digits = digits.slice(0, before) + digits.slice(before + 1);
          }
        }
        digitsBeforeCaret.current = before;
        digits = digits.replace(/^0+(?=\d)/, "").slice(0, 10);
        onValue(digits ? Number(digits) : null);
      }}
      className={cn("tabular rtl:text-end", invalid && "border-destructive/60")}
    />
  );
}

function Field({ id, label, error, hint, className, children }: { id: string; label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Free seller estimate, no account needed. Step 1 shows straight away what a buyer would take over and what the seller
 * would likely receive, on the exit calculator's assumptions (src/lib/estimate.ts); step 2 asks only for a name and a
 * mobile number and records a seller lead for our team. `initial` carries the exit calculator's numbers.
 */
export function QuickEstimate({
  initial,
  signedIn,
  showHeader = true,
  id,
  className,
}: {
  initial?: EstimatePrefill;
  signedIn: boolean;
  /** Off where the page already introduces it (home); the title stays for screen readers. */
  showHeader?: boolean;
  id?: string;
  className?: string;
}) {
  const t = useT("sell");
  const tc = useT("common");
  const tl = useT("legal");
  const locale = useLocale();
  const dir = useDir();
  const uid = useId();
  const fid = (k: string) => `${uid}-${k}`;
  const qs = useMemo(() => nextQuarters(), []);

  const [spa, setSpa] = useState<number | null>(initial?.spa ?? null);
  const [paid, setPaid] = useState<number | null>(initial?.paid ?? null);
  /** Today's price for a similar unit, only when it came from the exit calculator. */
  const [market, setMarket] = useState<number | null>(initial?.market ?? null);
  const [handover, setHandover] = useState(initial?.handover && qs.includes(initial.handover) ? initial.handover : "");
  const [developer, setDeveloper] = useState("");
  const [developerOther, setDeveloperOther] = useState("");
  const [project, setProject] = useState("");
  const [missed, setMissed] = useState<Missed>("none");
  const [notice, setNotice] = useState<"no" | "yes">("no");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ text: string; throttled?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; ref: string; urgent: boolean } | null>(null);
  // The submit button disappears with the form: move focus to the thank-you so keyboard and screen-reader users
  // land on it (a live region inserted together with its text is often not announced).
  const doneHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (done) doneHeading.current?.focus();
  }, [done]);

  const developerOptions = useMemo<ComboboxOption[]>(() => {
    const collator = new Intl.Collator(locale);
    return DEVELOPERS.filter((n) => n !== "Other")
      .map((n) => ({ value: n, label: developerName(tc, n) }))
      .sort((a, b) => collator.compare(a.label, b.label));
  }, [locale, tc]);

  const paidOver = spa != null && paid != null && paid > spa;
  const est = spa && !paidOver ? sellerEstimate(spa, paid ?? 0, market) : null;
  const money = (v: number) => <Aed value={v} locale={locale} />;
  const clearError = (...keys: string[]) =>
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))));
  const projectLabel = () => project.trim() || developerName(tc, developer, developerOther) || "—";

  function validate(s: 1 | 2) {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!spa) e.spa = t("error.originalPrice");
      if (paidOver) e.paid = t("error.amountPaid");
      if (!developer) e.developer = t("error.developer");
      else if (developer === "Other" && developerOther.trim().length < 2) e.developerOther = t("error.developerOther");
      if (!handover) e.handover = t("error.handover");
    } else {
      if (name.trim().length < 2) e.name = t("estimate.error.name");
      if (phone.replace(/\D/g, "").length < 7) e.phone = t("error.phone");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate(1)) return setStep(1);
    if (!validate(2)) return;
    const fd = new FormData();
    fd.set("spaPrice", String(spa ?? 0));
    fd.set("amountPaid", String(paid ?? 0));
    if (market) fd.set("marketPrice", String(market));
    fd.set("handoverQuarter", handover);
    fd.set("developer", developer);
    fd.set("developerOther", developer === "Other" ? developerOther : "");
    fd.set("project", project);
    fd.set("missed", missed);
    fd.set("defaultNotice", notice);
    fd.set("name", name);
    fd.set("phone", phone);
    fd.set("source", readAttribution());
    setBusy(true);
    setFormError(null);
    try {
      const res = await createSellerLead({}, fd);
      if (res.ok && res.id && res.ref) {
        setDone({ id: res.id, ref: res.ref, urgent: !!res.urgent });
        return;
      }
      const fe: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) fe[SERVER_FIELD[k] ?? k] = v[0];
      setErrors(fe);
      if (Object.keys(fe).some((k) => STEP1.has(k))) setStep(1);
      setFormError({ text: res.error ?? t("error.checkDetails"), throttled: res.throttled });
    } catch {
      setFormError({ text: t("error.checkDetails") });
    } finally {
      setBusy(false);
    }
  }

  // Prefilled with the lead's reference once there is one, so our team can match the chat to it.
  const waText = done ? t("estimate.wa.text", { ref: done.ref, project: projectLabel(), paid: formatAED(paid ?? 0, locale) }) : null;
  const waHref = BRAND.whatsapp ? `https://wa.me/${BRAND.whatsapp}${waText ? `?text=${encodeURIComponent(waText)}` : ""}` : null;
  const link =
    "font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      id={id}
      className={cn(
        "grid scroll-mt-24 gap-6 rounded-3xl border border-border/80 bg-card p-5 shadow-lift sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-8",
        className,
      )}
    >
      <div className="min-w-0">
        {showHeader ? (
          <>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/60 px-3 py-1 text-xs font-semibold text-gold-foreground">
              <Calculator className="h-3.5 w-3.5" aria-hidden />
              {t("estimate.eyebrow")}
            </p>
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">{t("estimate.title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("estimate.sub")}</p>
          </>
        ) : (
          <h3 className="sr-only">{t("estimate.title")}</h3>
        )}

        {done ? (
          <div className={cn("text-center sm:text-start", showHeader ? "mt-8" : "mt-2")} role="status">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success sm:mx-0">
              <Check className="h-6 w-6" aria-hidden />
            </div>
            {/* wrap-anywhere: the name as typed can be one long word, wider than a phone */}
            <h3 ref={doneHeading} tabIndex={-1} className="mt-4 text-xl font-semibold wrap-anywhere focus:outline-none">
              {t("estimate.done.title", { name: name.trim() })}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {richText(t("estimate.done.body"), {
                ref: (
                  <bdi dir="ltr" className="font-semibold text-foreground">
                    {done.ref}
                  </bdi>
                ),
                phone: (
                  <bdi dir="ltr" className="whitespace-nowrap font-medium text-foreground">
                    {phone.trim()}
                  </bdi>
                ),
              })}
            </p>
            {done.urgent && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-start text-sm font-medium text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t("estimate.done.urgent")}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <Link href={signedIn ? `/sell?lead=${done.id}` : `/signup?intent=sell&lead=${done.id}`}>
                  {t("estimate.done.continue")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                </Link>
              </Button>
              {waHref && (
                <Button asChild size="lg" variant="outline">
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden /> {t("estimate.done.whatsapp")}
                  </a>
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("estimate.done.continueHint")}</p>
          </div>
        ) : (
          <form
            noValidate
            className={showHeader ? "mt-6" : undefined}
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              if (step === 1) {
                if (!validate(1)) return;
                setStep(2);
                requestAnimationFrame(() => document.getElementById(fid("name"))?.focus());
              } else void submit();
            }}
          >
            {step === 1 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id={fid("spa")} label={t("estimate.field.spa")} error={errors.spa}>
                  <MoneyInput
                    id={fid("spa")}
                    value={spa}
                    onValue={(v) => {
                      setSpa(v);
                      clearError("spa", "paid");
                    }}
                    placeholder="2,000,000"
                    invalid={!!errors.spa}
                    describedBy={errors.spa ? `${fid("spa")}-msg` : undefined}
                  />
                </Field>
                <Field id={fid("paid")} label={t("estimate.field.paid")} error={errors.paid ?? (paidOver ? t("error.amountPaid") : undefined)}>
                  <MoneyInput
                    id={fid("paid")}
                    value={paid}
                    onValue={(v) => {
                      setPaid(v);
                      clearError("paid");
                    }}
                    placeholder="540,000"
                    invalid={!!errors.paid || paidOver}
                    describedBy={errors.paid || paidOver ? `${fid("paid")}-msg` : undefined}
                  />
                </Field>
                <Field id={fid("developer")} label={t("estimate.field.developer")} error={errors.developer ?? errors.developerOther}>
                  <Combobox
                    id={fid("developer")}
                    labelledBy={`${fid("developer")}-label`}
                    value={developer}
                    onChange={(value, typed) => {
                      setDeveloper(value);
                      // "Other" after typing a name that isn't listed keeps that name as the typed one (as in SellForm);
                      // the word "Other" itself, in either language, is not a name.
                      const n = typed.trim().slice(0, 80);
                      const isOtherWord = [tc("developer.Other"), "Other"].some((w) => searchKey(n) === searchKey(w));
                      if (value === "Other" && !developerOther && n && !isOtherWord) setDeveloperOther(n);
                      clearError("developer", "developerOther");
                    }}
                    options={developerOptions}
                    pinned={{ value: "Other", label: tc("developer.Other") }}
                    placeholder={t("field.developer.placeholder")}
                    noMatchText={t("combobox.noMatch")}
                    resultsText={(n) => t("combobox.results", { n })}
                    invalid={!!errors.developer}
                    describedBy={errors.developer ? `${fid("developer")}-msg` : undefined}
                  />
                  {developer === "Other" && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor={fid("developerOther")} className="text-xs text-muted-foreground">
                        {t("field.developerOther")}
                      </Label>
                      <Input
                        id={fid("developerOther")}
                        dir="auto"
                        maxLength={80}
                        value={developerOther}
                        onChange={(e) => {
                          setDeveloperOther(e.target.value);
                          clearError("developerOther");
                        }}
                        placeholder={t("field.developerOther.placeholder")}
                        aria-invalid={errors.developerOther ? true : undefined}
                        // Its error is shown under the developer field.
                        aria-describedby={errors.developerOther ? `${fid("developer")}-msg` : undefined}
                        className={cn(errors.developerOther && "border-destructive/60")}
                      />
                    </div>
                  )}
                </Field>
                <Field id={fid("handover")} label={t("estimate.field.handover")} error={errors.handover}>
                  <Select
                    dir={dir}
                    value={handover}
                    onValueChange={(v) => {
                      setHandover(v);
                      clearError("handover");
                    }}
                  >
                    <SelectTrigger
                      id={fid("handover")}
                      aria-labelledby={`${fid("handover")}-label`}
                      aria-invalid={errors.handover ? true : undefined}
                      className={cn(errors.handover && "border-destructive/60")}
                    >
                      <SelectValue placeholder={t("field.handover.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {qs.map((q) => (
                        <SelectItem key={q} value={q}>
                          {formatQuarter(q, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id={fid("project")} label={t("estimate.field.project")}>
                  <Input
                    id={fid("project")}
                    maxLength={120}
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    placeholder={t("estimate.field.project.placeholder")}
                  />
                </Field>
                <Field id={fid("missed")} label={t("field.arrears")}>
                  <Select dir={dir} value={missed} onValueChange={(v) => setMissed(v as Missed)}>
                    <SelectTrigger id={fid("missed")} aria-labelledby={`${fid("missed")}-label`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("arrears.none")}</SelectItem>
                      <SelectItem value="one">{t("arrears.one")}</SelectItem>
                      <SelectItem value="more">{t("arrears.more")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <fieldset className="space-y-2.5 sm:col-span-2" aria-describedby={`${fid("notice")}-hint`}>
                  <legend className="text-sm font-medium leading-snug">{t("estimate.field.notice")}</legend>
                  <RadioGroup dir={dir} value={notice} onValueChange={(v) => setNotice(v as "no" | "yes")} className="flex flex-wrap gap-2 pt-2.5">
                    {(["no", "yes"] as const).map((v) => (
                      <label
                        key={v}
                        className="flex min-w-24 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/60"
                      >
                        <RadioGroupItem value={v} />
                        {t(`estimate.notice.${v}`)}
                      </label>
                    ))}
                  </RadioGroup>
                  <p id={`${fid("notice")}-hint`} className="text-xs leading-relaxed text-muted-foreground">
                    {ltr(t("estimate.field.notice.hint"))}
                  </p>
                </fieldset>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold">{t("estimate.contact.title")}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("estimate.contact.sub")}</p>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Field id={fid("name")} label={t("estimate.field.name")} error={errors.name}>
                    <Input
                      id={fid("name")}
                      autoComplete="name"
                      maxLength={120}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearError("name");
                      }}
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? `${fid("name")}-msg` : undefined}
                      className={cn(errors.name && "border-destructive/60")}
                    />
                  </Field>
                  <Field id={fid("phone")} label={t("estimate.field.phone")} error={errors.phone}>
                    <Input
                      id={fid("phone")}
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      maxLength={30}
                      value={phone}
                      onChange={(e) => {
                        // Digits typed on an Arabic keyboard count (and reach our team) as Latin digits.
                        setPhone(latinDigits(e.target.value));
                        clearError("phone");
                      }}
                      placeholder="+971 5X XXX XXXX"
                      aria-invalid={errors.phone ? true : undefined}
                      aria-describedby={errors.phone ? `${fid("phone")}-msg` : undefined}
                      className={cn("rtl:text-end", errors.phone && "border-destructive/60")}
                    />
                  </Field>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {richText(t("estimate.consent"), {
                    privacy: (
                      <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={link}>
                        {t("estimate.consent.privacy")}
                        <span className="sr-only"> {tl("newTab")}</span>
                      </Link>
                    ),
                  })}
                </p>
              </div>
            )}

            {formError && (
              <p role="alert" className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError.text}
                {formError.throttled && waHref && (
                  <>
                    {" "}
                    <a href={waHref} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                      {t("estimate.done.whatsapp")}
                    </a>
                  </>
                )}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {step === 2 && (
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep(1)}>
                  {tc("back")}
                </Button>
              )}
              <Button type="submit" size="lg" disabled={busy} className="flex-1 sm:flex-none">
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden /> {t("estimate.submitting")}
                  </>
                ) : step === 1 ? (
                  <>
                    {t("estimate.next")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                  </>
                ) : (
                  t("estimate.submit")
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* The estimate, live as the numbers change */}
      <aside
        aria-label={t("estimate.result.title")}
        className="relative isolate self-start overflow-hidden rounded-2xl bg-ink-gradient p-5 text-primary-foreground shadow-card sm:p-6"
      >
        <div aria-hidden className="absolute -end-16 -top-16 -z-10 h-48 w-48 bg-glow-gold opacity-40" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{t("estimate.result.title")}</p>
        {est ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
              {richText(t("estimate.result.takeover"), { amount: <span className="font-semibold text-primary-foreground">{money(est.remaining)}</span> })}
            </p>
            <p className="mt-4 text-sm text-primary-foreground/75">{t("estimate.result.receive")}</p>
            <p aria-live="polite" className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">
              <span className="text-gradient-gold">
                <AedRange low={est.low} high={est.high} locale={locale} />
              </span>
            </p>
            {market != null && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-primary-foreground/70">
                <span>{richText(t("estimate.fromCalculator"), { amount: money(market) })}</span>
                {!done && (
                  <button
                    type="button"
                    onClick={() => setMarket(null)}
                    className="inline-flex items-center gap-1 rounded-md font-medium text-gold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <X className="h-3 w-3" aria-hidden /> {t("estimate.fromCalculator.clear")}
                  </button>
                )}
              </p>
            )}
            <ul className="mt-4 space-y-2 border-t border-primary-foreground/15 pt-4 text-xs leading-relaxed text-primary-foreground/70">
              <li className="flex items-start gap-2">
                <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                <span>
                  {ltr(t(est.hasMarket ? "estimate.result.basis.market" : "estimate.result.basis.spa", quickSalePct))}{" "}
                  {ltr(t(FEES.payer === "buyer" ? "estimate.result.fee.buyer" : "estimate.result.fee.seller"))}
                </span>
              </li>
              {est.low === 0 && (paid ?? 0) > 0 && (
                <li className="flex items-start gap-2">
                  <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                  {t("estimate.result.underwater")}
                </li>
              )}
              {est.belowNocThreshold && (paid ?? 0) > 0 && (
                <li className="flex items-start gap-2">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                  <span>{ltr(t("estimate.result.noc", { pct: formatPct(est.paidPct) }))}</span>
                </li>
              )}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">{t("estimate.result.empty")}</p>
        )}
      </aside>
    </div>
  );
}
