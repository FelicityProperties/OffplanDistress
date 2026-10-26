"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ExternalLink, FileUp, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createListing } from "@/app/actions/listings";
import { isHeic, preparePhoto, uploadListingFile } from "@/components/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { richText } from "@/content/legal/rich-text";
import { useDir, useLocale, useT } from "@/i18n/client";
import { readAttribution } from "@/lib/attribution";
import { COMMUNITIES, DEVELOPERS, FEES, FILE_KINDS, MAX_UPLOAD_BYTES, MOTIVATION, UNIT_TYPES, type UnitTypeKey } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAED, formatPct, formatQuarter } from "@/lib/format";
import { communityName, developerName, searchKey } from "@/lib/place-names";
import { cn } from "@/lib/utils";

const STEPS = ["step.unit", "step.payment", "step.price", "step.documents", "step.review"] as const;
const DOCS: (keyof typeof FILE_KINDS)[] = ["spa", "oqood", "soa", "id"];
const UNIT_KEYS = Object.keys(UNIT_TYPES) as UnitTypeKey[];
const MOTIVATION_KEYS = Object.keys(MOTIVATION) as (keyof typeof MOTIVATION)[];
/** Which step each server-side field error belongs to, so a rejected submit opens the right step. */
const FIELD_STEP: Record<string, number> = {
  developer: 0,
  developerOther: 0,
  community: 0,
  communityOther: 0,
  projectName: 0,
  unitType: 0,
  sizeSqft: 0,
  floor: 0,
  view: 0,
  originalPrice: 1,
  amountPaid: 1,
  nextInstalmentDate: 1,
  nextInstalmentAmount: 1,
  handoverDate: 1,
  overdueAmount: 1,
  paymentPlan: 1,
  askingPrice: 2,
  phone: 2,
  motivation: 2,
  description: 2,
  confirmOwnership: 4,
};

/** End dates of the next 20 quarters; labels come from formatQuarter in the viewer's language. */
function quarters() {
  const out: string[] = [];
  const now = new Date();
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3) + 1;
  for (let i = 0; i < 20; i++) {
    const end = new Date(Date.UTC(y, q * 3, 0)).toISOString().slice(0, 10);
    out.push(end);
    q++;
    if (q > 4) {
      q = 1;
      y++;
    }
  }
  return out;
}

type Plan = { label: string; dueDate: string; amount: string };

type State = {
  developer: string;
  community: string;
  /** The name typed when "Other" is picked. */
  developerOther: string;
  communityOther: string;
  projectName: string;
  unitType: string;
  sizeSqft: string;
  floor: string;
  view: string;
  originalPrice: string;
  amountPaid: string;
  nextInstalmentDate: string;
  nextInstalmentAmount: string;
  handoverDate: string;
  arrears: string;
  /** The missed instalments still unpaid, in AED (only asked, and only sent, when `arrears` isn't "none"). */
  overdueAmount: string;
  askingPrice: string;
  motivation: string;
  description: string;
  phone: string;
};

/** Where the form starts: the seller's free estimate (a seller lead) or the exit calculator's numbers. See /sell. */
export type SellPrefill = Partial<
  Pick<State, "developer" | "developerOther" | "projectName" | "originalPrice" | "amountPaid" | "handoverDate" | "arrears">
> & { leadId?: string };

/** `id` labels the control with that id; its label is `${id}-label` and the error / hint `${id}-msg`. */
function Field({
  label,
  error,
  hint,
  children,
  className,
  id,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const msgId = id && `${id}-msg`;
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} id={id && `${id}-label`}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={msgId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SellForm({ needsPhone, initial }: { needsPhone: boolean; initial?: SellPrefill }) {
  const { leadId, ...prefill } = initial ?? {};
  const t = useT("sell");
  const tc = useT("common");
  const tl = useT("legal");
  const locale = useLocale();
  const dir = useDir();
  const [step, setStep] = useState(0);
  const [s, setS] = useState<State>({
    developer: "",
    community: "",
    developerOther: "",
    communityOther: "",
    projectName: "",
    unitType: "",
    sizeSqft: "",
    floor: "",
    view: "",
    originalPrice: "",
    amountPaid: "",
    nextInstalmentDate: "",
    nextInstalmentAmount: "",
    handoverDate: "",
    arrears: "none",
    overdueAmount: "",
    askingPrice: "",
    motivation: "motivated",
    description: "",
    phone: "",
    ...prefill,
  });
  const [plan, setPlan] = useState<Plan[]>([]);
  const [docs, setDocs] = useState<Partial<Record<keyof typeof FILE_KINDS, File>>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  /** Photos are resized when picked (see preparePhoto), so problems show up now rather than at submit. */
  const [preparing, setPreparing] = useState(false);
  /** Final step: "I own this unit or am authorised to sell it… and I agree to the Terms of Use". */
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; failed: string[] } | null>(null);
  const qs = useMemo(quarters, []);

  const set = (k: keyof State) => (v: string) => setS((prev) => ({ ...prev, [k]: v }));
  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;
  const aed = (v: number | null | undefined) => formatAED(v, locale);
  const unitLabel = (u: string) => (u in UNIT_TYPES ? tc(`unit.${u as UnitTypeKey}`) : "—");

  // Developer and community pickers: names in the viewer's language, in their alphabetical order, "Other" last.
  const { developerOptions, communityOptions } = useMemo(() => {
    const collator = new Intl.Collator(locale);
    const options = (names: string[], label: (n: string) => string): ComboboxOption[] =>
      names
        .filter((n) => n !== "Other")
        .map((n) => ({ value: n, label: label(n) }))
        .sort((a, b) => collator.compare(a.label, b.label));
    return {
      developerOptions: options(DEVELOPERS, (d) => developerName(tc, d)),
      communityOptions: options(COMMUNITIES, (c) => communityName(tc, c)),
    };
  }, [locale, tc]);

  /** A pick in a combobox. "Other" after typing a name that isn't listed keeps that name as the typed one. */
  const pickName = (k: "developer" | "community") => (value: string, typed: string) => {
    const otherKey = k === "developer" ? "developerOther" : "communityOther";
    // Same 80-character cap as the name field and the server.
    const name = typed.trim().slice(0, 80);
    // The word "Other" itself, in either language (an Arabic page still matches the English "Other"), is not a name.
    const isOtherWord = [tc("developer.Other"), "Other"].some((w) => searchKey(name) === searchKey(w));
    setS((prev) => ({
      ...prev,
      [k]: value,
      [otherKey]: value === "Other" && !prev[otherKey] && name && !isOtherWord ? name : prev[otherKey],
    }));
    setErrors(({ [k]: _a, [otherKey]: _b, ...rest }) => rest);
    // Picked from the list (focus still in the box): go on to the name field it just revealed.
    if (value === "Other") {
      requestAnimationFrame(() => {
        if (document.activeElement?.id === k) document.getElementById(otherKey)?.focus();
      });
    }
  };

  /** Documents are checked when picked: a file over the limit is refused straight away, not at the last step. */
  function pickDoc(k: keyof typeof FILE_KINDS, input: HTMLInputElement) {
    const f = input.files?.[0];
    if (f && f.size > MAX_UPLOAD_BYTES) {
      input.value = "";
      setDocs((d) => ({ ...d, [k]: undefined }));
      setErrors((e) => ({ ...e, [k]: t("error.docTooLarge", { name: f.name }) }));
      return;
    }
    setDocs((d) => ({ ...d, [k]: f }));
    setErrors(({ [k]: _, ...rest }) => rest);
  }

  async function pickPhotos(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length) return;
    setPreparing(true);
    const ready: File[] = [];
    const failed: File[] = [];
    for (const f of files) {
      try {
        ready.push(await preparePhoto(f, locale));
      } catch {
        failed.push(f);
      }
    }
    setPhotos(ready);
    setPreparing(false);
    const names = failed.map((f) => f.name).join(locale === "ar" ? "، " : ", ");
    setErrors(({ photos: _, ...rest }) =>
      failed.length ? { ...rest, photos: t(failed.some(isHeic) ? "photo.heic" : "photo.unreadable", { name: names }) } : rest,
    );
  }

  const preview = analyzeDeal({
    originalPrice: num(s.originalPrice),
    amountPaid: num(s.amountPaid),
    askingPrice: num(s.askingPrice),
    launchPrice: null,
  });

  function validate(i: number) {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!s.developer) e.developer = t("error.developer");
      else if (s.developer === "Other" && s.developerOther.trim().length < 2) e.developerOther = t("error.developerOther");
      if (!s.community) e.community = t("error.community");
      else if (s.community === "Other" && s.communityOther.trim().length < 2) e.communityOther = t("error.communityOther");
      if (s.projectName.trim().length < 2) e.projectName = t("error.projectName");
      if (!s.unitType) e.unitType = t("error.unitType");
      if (!num(s.sizeSqft)) e.sizeSqft = t("error.size");
    }
    if (i === 1) {
      if (!num(s.originalPrice)) e.originalPrice = t("error.originalPrice");
      if (num(s.amountPaid) > num(s.originalPrice)) e.amountPaid = t("error.amountPaid");
      if (!s.handoverDate) e.handoverDate = t("error.handover");
      if (s.arrears !== "none" && num(s.overdueAmount) > Math.max(num(s.originalPrice) - num(s.amountPaid), 0)) {
        e.overdueAmount = t("error.overdueMax");
      }
    }
    if (i === 2) {
      if (s.askingPrice === "") e.askingPrice = t("error.asking");
      if (needsPhone && s.phone.trim().length < 7) e.phone = t("error.phone");
    }
    if (i === 3) {
      for (const [k, f] of Object.entries(docs)) if (f && f.size > MAX_UPLOAD_BYTES) e[k] = t("error.docTooLarge", { name: f.name });
      for (const f of photos) if (f.size > MAX_UPLOAD_BYTES) e.photos = t("error.photoTooLarge", { name: f.name });
    }
    if (i === 4 && !confirmed) e.confirmOwnership = t("error.confirmOwnership");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    for (let i = 0; i < STEPS.length; i++) {
      if (!validate(i)) {
        setStep(i);
        return;
      }
    }
    setBusy(t("submit.saving"));
    const fd = new FormData();
    const numeric = new Set(["sizeSqft", "originalPrice", "amountPaid", "askingPrice", "nextInstalmentAmount", "overdueAmount"]);
    for (const [k, v] of Object.entries(s)) {
      if (k === "arrears") continue;
      // Asked only after "Yes, …" to missed instalments; a figure typed before switching back to "No" isn't sent.
      if (k === "overdueAmount" && s.arrears === "none") continue;
      fd.set(k, numeric.has(k) && v !== "" ? String(Math.round(num(v))) : v);
    }
    fd.set("confirmOwnership", confirmed ? "on" : "");
    // Links the listing to the seller's free estimate, and records how they found us.
    if (leadId) fd.set("leadId", leadId);
    fd.set("source", readAttribution());
    const arrearsNote =
      s.arrears === "one" ? t("arrears.note.one") : s.arrears === "more" ? t("arrears.note.more") : "";
    fd.set("description", [s.description.trim(), arrearsNote].filter(Boolean).join("\n\n"));
    fd.set(
      "paymentPlan",
      JSON.stringify(
        plan
          .filter((p) => p.label.trim() && num(p.amount))
          .map((p) => ({ label: p.label.trim(), dueDate: p.dueDate || null, amount: Math.round(num(p.amount)) })),
      ),
    );

    const res = await createListing({}, fd);
    if (!res.ok || !res.listingId) {
      setBusy(null);
      const fe = Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0] ?? t("error.invalid")]));
      setErrors(fe);
      const first = Math.min(...Object.keys(fe).map((k) => FIELD_STEP[k] ?? STEPS.length - 1));
      if (Number.isFinite(first)) setStep(first);
      toast.error(res.error ?? t("error.checkDetails"));
      return;
    }

    const failed: string[] = [];
    const uploads: [File, keyof typeof FILE_KINDS][] = [
      ...(Object.entries(docs).filter(([, f]) => f) as [keyof typeof FILE_KINDS, File][]).map(([k, f]) => [f, k] as [File, keyof typeof FILE_KINDS]),
      ...photos.map((f) => [f, "photo"] as [File, keyof typeof FILE_KINDS]),
    ];
    for (const [i, [file, kind]] of uploads.entries()) {
      setBusy(t("submit.uploading", { i: i + 1, n: uploads.length }));
      try {
        await uploadListingFile(res.listingId, file, kind, locale);
      } catch {
        failed.push(file.name);
      }
    }
    setBusy(null);
    setDone({ id: res.listingId, failed });
    toast.success(t("submit.success"));
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold">{t("done.title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("done.body")}</p>
        {done.failed.length > 0 && (
          <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
            {t("done.failed", { files: done.failed.join(locale === "ar" ? "، " : ", ") })}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-2">
          <Button asChild>
            <Link href={`/dashboard/listings/${done.id}`}>{t("done.viewListing")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/listings">{t("done.allListings")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ol className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((key, i) => (
          <li key={key} className="flex min-w-fit items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold tabular transition",
                i < step && "border-success bg-success text-success-foreground",
                i === step && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("text-sm", i === step ? "font-semibold" : "text-muted-foreground")}>{t(key)}</span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form
          className="rounded-2xl border bg-card p-6 shadow-card sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy || preparing) return;
            if (step < STEPS.length - 1) {
              if (validate(step)) setStep(step + 1);
            } else void submit();
          }}
        >
          <h2 className="text-xl font-semibold">{t(STEPS[step])}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {step === 0 && (
              <>
                {(
                  [
                    ["developer", developerOptions, tc("developer.Other")],
                    ["community", communityOptions, tc("community.Other")],
                  ] as const
                ).map(([k, options, otherLabel]) => {
                  const otherKey = k === "developer" ? "developerOther" : "communityOther";
                  const error = errors[k] ?? errors[otherKey];
                  return (
                    <Field key={k} id={k} label={t(`field.${k}`)} error={error}>
                      <Combobox
                        id={k}
                        labelledBy={`${k}-label`}
                        value={s[k]}
                        onChange={pickName(k)}
                        options={options}
                        pinned={{ value: "Other", label: otherLabel }}
                        placeholder={t(`field.${k}.placeholder`)}
                        noMatchText={t("combobox.noMatch")}
                        resultsText={(n) => t("combobox.results", { n })}
                        invalid={!!errors[k]}
                        describedBy={errors[k] ? `${k}-msg` : undefined}
                      />
                      {s[k] === "Other" && (
                        <div className="space-y-1.5 pt-1">
                          <Label htmlFor={otherKey} className="text-xs text-muted-foreground">
                            {t(`field.${otherKey}`)}
                          </Label>
                          <Input
                            id={otherKey}
                            dir="auto"
                            maxLength={80}
                            value={s[otherKey]}
                            onChange={(e) => {
                              set(otherKey)(e.target.value);
                              if (errors[otherKey]) setErrors(({ [otherKey]: _, ...rest }) => rest);
                            }}
                            placeholder={t(`field.${otherKey}.placeholder`)}
                            aria-invalid={errors[otherKey] ? true : undefined}
                            aria-describedby={errors[otherKey] ? `${k}-msg` : undefined}
                            className={cn(errors[otherKey] && "border-destructive/60")}
                          />
                        </div>
                      )}
                    </Field>
                  );
                })}
                <Field label={t("field.projectName")} error={errors.projectName}>
                  <Input value={s.projectName} onChange={(e) => set("projectName")(e.target.value)} placeholder={t("field.projectName.placeholder")} />
                </Field>
                <Field label={t("field.unitType")} error={errors.unitType}>
                  <Select dir={dir} value={s.unitType} onValueChange={set("unitType")}>
                    <SelectTrigger aria-label={t("field.unitType")}>
                      <SelectValue placeholder={t("field.unitType.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {tc(`unit.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("field.size")} error={errors.sizeSqft}>
                  <Input inputMode="numeric" value={s.sizeSqft} onChange={(e) => set("sizeSqft")(e.target.value)} placeholder="1,180" />
                </Field>
                <Field label={t("field.floor")}>
                  <Input value={s.floor} onChange={(e) => set("floor")(e.target.value)} placeholder="24" />
                </Field>
                <Field label={t("field.view")} className="sm:col-span-2">
                  <Input value={s.view} onChange={(e) => set("view")(e.target.value)} placeholder={t("field.view.placeholder")} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label={t("field.originalPrice")} error={errors.originalPrice} hint={t("field.originalPrice.hint")}>
                  <Input inputMode="numeric" value={s.originalPrice} onChange={(e) => set("originalPrice")(e.target.value)} placeholder="2,350,000" />
                </Field>
                <Field label={t("field.amountPaid")} error={errors.amountPaid}>
                  <Input inputMode="numeric" value={s.amountPaid} onChange={(e) => set("amountPaid")(e.target.value)} placeholder="940,000" />
                </Field>
                <Field label={t("field.nextDate")}>
                  <Input type="date" value={s.nextInstalmentDate} onChange={(e) => set("nextInstalmentDate")(e.target.value)} />
                </Field>
                <Field label={t("field.nextAmount")}>
                  <Input inputMode="numeric" value={s.nextInstalmentAmount} onChange={(e) => set("nextInstalmentAmount")(e.target.value)} placeholder="117,500" />
                </Field>
                <Field label={t("field.handover")} error={errors.handoverDate}>
                  <Select dir={dir} value={s.handoverDate} onValueChange={set("handoverDate")}>
                    <SelectTrigger aria-label={t("field.handover")}>
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
                <Field label={t("field.arrears")}>
                  <Select dir={dir} value={s.arrears} onValueChange={set("arrears")}>
                    <SelectTrigger aria-label={t("field.arrears.aria")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("arrears.none")}</SelectItem>
                      <SelectItem value="one">{t("arrears.one")}</SelectItem>
                      <SelectItem value="more">{t("arrears.more")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {s.arrears !== "none" && (
                  <Field id="overdueAmount" label={t("field.overdue")} error={errors.overdueAmount} hint={t("field.overdue.hint")}>
                    <Input
                      id="overdueAmount"
                      inputMode="numeric"
                      value={s.overdueAmount}
                      onChange={(e) => {
                        set("overdueAmount")(e.target.value);
                        if (errors.overdueAmount) setErrors(({ overdueAmount: _, ...rest }) => rest);
                      }}
                      placeholder="117,500"
                      aria-invalid={errors.overdueAmount ? true : undefined}
                      aria-describedby="overdueAmount-msg"
                      className={cn(errors.overdueAmount && "border-destructive/60")}
                    />
                  </Field>
                )}
                <div className="space-y-3 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("plan.title")}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPlan((p) => [...p, { label: p.length ? t("plan.nth", { n: p.length + 1 }) : t("plan.next"), dueDate: "", amount: "" }])}
                    >
                      <Plus /> {t("plan.add")}
                    </Button>
                  </div>
                  {plan.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("plan.empty")}</p>
                  )}
                  {plan.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                      <Input aria-label={t("plan.milestone")} value={p.label} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                      <Input aria-label={t("plan.dueDate")} type="date" className="w-40" value={p.dueDate} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x)))} />
                      <Input aria-label={t("plan.amount")} inputMode="numeric" className="w-32" placeholder={t("plan.amount.placeholder")} value={p.amount} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                      <Button type="button" size="icon" variant="ghost" aria-label={tc("remove")} onClick={() => setPlan((all) => all.filter((_, j) => j !== i))}>
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <Field
                  label={t("field.asking")}
                  error={errors.askingPrice}
                  hint={num(s.amountPaid) ? t("field.asking.paid", { amount: aed(num(s.amountPaid)) }) : t("field.asking.hint")}
                >
                  <Input inputMode="numeric" value={s.askingPrice} onChange={(e) => set("askingPrice")(e.target.value)} placeholder="770,000" />
                </Field>
                {needsPhone && (
                  <Field label={t("field.phone")} error={errors.phone} hint={t("field.phone.hint")}>
                    <Input type="tel" dir="ltr" className="rtl:text-end" value={s.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+971 5X XXX XXXX" />
                  </Field>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("field.motivation")}</Label>
                  <RadioGroup dir={dir} value={s.motivation} onValueChange={set("motivation")} className="grid gap-2 sm:grid-cols-3">
                    {MOTIVATION_KEYS.map((k) => (
                      <label key={k} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary">
                        <RadioGroupItem value={k} className="mt-0.5" />
                        <span>
                          <span className="font-medium">{tc(`motivation.${k}`)}</span>
                          <span className="block text-xs text-muted-foreground">{tc(`motivation.${k}.hint`)}</span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <Field label={t("field.description")} className="sm:col-span-2">
                  <Textarea value={s.description} onChange={(e) => set("description")(e.target.value)} placeholder={t("field.description.placeholder")} />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                {DOCS.map((k) => (
                  <label
                    key={k}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition hover:border-gold hover:bg-gold-soft/40",
                      docs[k] && "border-success bg-success-soft/40",
                    )}
                  >
                    {docs[k] ? <Check className="h-6 w-6 text-success" /> : <FileUp className="h-6 w-6 text-muted-foreground" />}
                    <span className="text-sm font-medium">{tc(`file.${k}`)}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{docs[k]?.name ?? t("docs.tileHint")}</span>
                    {errors[k] && <span className="text-xs font-medium text-destructive">{errors[k]}</span>}
                    <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => pickDoc(k, e.currentTarget)} />
                  </label>
                ))}
                <label
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition hover:border-gold hover:bg-gold-soft/40 sm:col-span-2",
                    photos.length > 0 && !errors.photos && "border-success bg-success-soft/40",
                  )}
                >
                  {preparing ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : photos.length > 0 ? (
                    <Check className="h-6 w-6 text-success" />
                  ) : (
                    <FileUp className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{t("docs.photos")}</span>
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {preparing ? t("docs.preparing") : photos.length ? t("docs.photosSelected", { n: photos.length }) : t("docs.photosHint")}
                  </span>
                  {errors.photos && <span className="max-w-prose text-xs font-medium text-destructive">{errors.photos}</span>}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    disabled={preparing}
                    onChange={(e) => void pickPhotos(e.currentTarget)}
                  />
                </label>
                <p className="text-xs text-muted-foreground sm:col-span-2">{t("docs.privacy")}</p>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4 text-sm sm:col-span-2">
                <p className="text-muted-foreground">{t("review.intro")}</p>
                <dl className="divide-y rounded-xl border">
                  {[
                    [
                      t("review.unit"),
                      `${s.projectName || "—"} · ${unitLabel(s.unitType)} · ${s.community ? communityName(tc, s.community, s.communityOther) : "—"}`,
                    ],
                    [t("review.developer"), s.developer ? developerName(tc, s.developer, s.developerOther) : "—"],
                    [t("review.purchasePrice"), aed(num(s.originalPrice))],
                    [t("review.paid"), `${aed(num(s.amountPaid))} (\u2066${formatPct(preview.paidPct)}\u2069)`],
                    [t("review.asking"), aed(num(s.askingPrice))],
                    ...(s.arrears !== "none" && num(s.overdueAmount) > 0 ? [[t("review.overdue"), aed(num(s.overdueAmount))]] : []),
                    [
                      t("review.docs"),
                      `${t("review.docsCount", { n: Object.values(docs).filter(Boolean).length, total: DOCS.length })}${photos.length ? ` · ${t("review.photosCount", { n: photos.length })}` : ""}`,
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-end font-medium tabular">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmOwnership"
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 leading-relaxed transition has-[:checked]:border-primary/40 has-[:checked]:bg-accent/60",
                      errors.confirmOwnership && "border-destructive/50",
                    )}
                  >
                    <input
                      id="confirmOwnership"
                      name="confirmOwnership"
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => {
                        setConfirmed(e.target.checked);
                        setErrors(({ confirmOwnership: _, ...rest }) => rest);
                      }}
                      aria-required="true"
                      aria-invalid={errors.confirmOwnership ? true : undefined}
                      aria-describedby={errors.confirmOwnership ? "confirmOwnership-error" : undefined}
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <span>
                      {richText(t("confirm.label"), {
                        // New tab, so following the link doesn't throw away the form.
                        terms: (
                          <Link
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {t("confirm.terms")}
                            <ExternalLink className="size-3.5 rtl:-scale-x-100" aria-hidden />
                            <span className="sr-only">{tl("newTab")}</span>
                          </Link>
                        ),
                      })}
                    </span>
                  </label>
                  {errors.confirmOwnership && (
                    <p id="confirmOwnership-error" className="text-xs font-medium text-destructive">
                      {errors.confirmOwnership}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" disabled={step === 0 || !!busy} onClick={() => setStep(step - 1)}>
              {tc("back")}
            </Button>
            <Button type="submit" disabled={!!busy || preparing}>
              {busy ? (
                <>
                  <Loader2 className="animate-spin" /> {busy}
                </>
              ) : step === STEPS.length - 1 ? (
                t("submit.cta")
              ) : (
                tc("continue")
              )}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-ink-gradient p-6 text-primary-foreground">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
              <Wallet className="h-4 w-4" />
              {t("numbers.title")}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-primary-foreground/70">{t("numbers.paid")}</dt>
                <dd className="tabular">{formatPct(preview.paidPct)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-primary-foreground/70">{t("numbers.takesOver")}</dt>
                <dd className="tabular">{aed(preview.remaining)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-primary-foreground/70">{t("numbers.saleValue")}</dt>
                <dd className="tabular">{aed(preview.saleValue)}</dd>
              </div>
              <div className="flex justify-between border-t border-primary-foreground/15 pt-2 text-base font-semibold">
                <dt>{t("numbers.youReceive")}</dt>
                <dd className="tabular">{aed(preview.sellerNet)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-primary-foreground/60">{t("numbers.feeNote")}</p>
          </div>
          {num(s.originalPrice) > 0 && preview.paidPct < FEES.nocMinPaidPct && (
            <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t("nocWarning")}
            </div>
          )}
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <p className="font-semibold">{t("next.title")}</p>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              {(["next.1", "next.2", "next.3", "next.4", "next.5"] as const).map((key, i) => (
                <li key={key} className="flex gap-3">
                  <span className="font-semibold text-foreground tabular">{i + 1}.</span>
                  {t(key)}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
