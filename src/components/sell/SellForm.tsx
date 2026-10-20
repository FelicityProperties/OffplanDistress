"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, FileUp, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createListing } from "@/app/actions/listings";
import { uploadListingFile } from "@/components/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COMMUNITIES, DEVELOPERS, FILE_KINDS, MAX_UPLOAD_BYTES, MOTIVATION, UNIT_TYPES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAED, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = ["Unit details", "Payment status", "Price & timeline", "Documents", "Review"];
const DOCS: (keyof typeof FILE_KINDS)[] = ["spa", "oqood", "soa", "id"];

function quarters() {
  const out: { label: string; value: string }[] = [];
  const now = new Date();
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3) + 1;
  for (let i = 0; i < 20; i++) {
    const end = new Date(Date.UTC(y, q * 3, 0)).toISOString().slice(0, 10);
    out.push({ label: `Q${q} ${y}`, value: end });
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
  askingPrice: string;
  motivation: string;
  description: string;
  phone: string;
};

function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SellForm({ needsPhone }: { needsPhone: boolean }) {
  const [step, setStep] = useState(0);
  const [s, setS] = useState<State>({
    developer: "",
    community: "",
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
    askingPrice: "",
    motivation: "motivated",
    description: "",
    phone: "",
  });
  const [plan, setPlan] = useState<Plan[]>([]);
  const [docs, setDocs] = useState<Partial<Record<keyof typeof FILE_KINDS, File>>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; failed: string[] } | null>(null);
  const qs = useMemo(quarters, []);

  const set = (k: keyof State) => (v: string) => setS((prev) => ({ ...prev, [k]: v }));
  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

  const preview = analyzeDeal({
    originalPrice: num(s.originalPrice),
    amountPaid: num(s.amountPaid),
    askingPrice: num(s.askingPrice),
    launchPrice: null,
  });

  function validate(i: number) {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!s.developer) e.developer = "Pick a developer";
      if (!s.community) e.community = "Pick a community";
      if (s.projectName.trim().length < 2) e.projectName = "Enter the project name";
      if (!s.unitType) e.unitType = "Pick a unit type";
      if (!num(s.sizeSqft)) e.sizeSqft = "Enter the size";
    }
    if (i === 1) {
      if (!num(s.originalPrice)) e.originalPrice = "Enter the SPA price";
      if (num(s.amountPaid) > num(s.originalPrice)) e.amountPaid = "Can't exceed the purchase price";
      if (!s.handoverDate) e.handoverDate = "Pick the expected handover";
    }
    if (i === 2) {
      if (s.askingPrice === "") e.askingPrice = "Enter your asking price";
      if (needsPhone && s.phone.trim().length < 7) e.phone = "We need a number to reach you";
    }
    if (i === 3) {
      for (const [k, f] of Object.entries(docs)) if (f && f.size > MAX_UPLOAD_BYTES) e[k] = "Larger than 4 MB";
      for (const f of photos) if (f.size > MAX_UPLOAD_BYTES) e.photos = `${f.name} is larger than 4 MB`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    for (let i = 0; i < 4; i++) {
      if (!validate(i)) {
        setStep(i);
        return;
      }
    }
    setBusy("Saving your listing…");
    const fd = new FormData();
    const numeric = new Set(["sizeSqft", "originalPrice", "amountPaid", "askingPrice", "nextInstalmentAmount"]);
    for (const [k, v] of Object.entries(s)) {
      if (k === "arrears") continue;
      fd.set(k, numeric.has(k) && v !== "" ? String(Math.round(num(v))) : v);
    }
    const arrearsNote =
      s.arrears === "one" ? "Seller reports one missed instalment." : s.arrears === "more" ? "Seller reports more than one missed instalment." : "";
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
      const fe = Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0] ?? "Invalid"]));
      setErrors(fe);
      toast.error(res.error ?? "Please check your details");
      return;
    }

    const failed: string[] = [];
    const uploads: [File, keyof typeof FILE_KINDS][] = [
      ...(Object.entries(docs).filter(([, f]) => f) as [keyof typeof FILE_KINDS, File][]).map(([k, f]) => [f, k] as [File, keyof typeof FILE_KINDS]),
      ...photos.map((f) => [f, "photo"] as [File, keyof typeof FILE_KINDS]),
    ];
    for (const [i, [file, kind]] of uploads.entries()) {
      setBusy(`Uploading documents (${i + 1}/${uploads.length})…`);
      try {
        await uploadListingFile(res.listingId, file, kind);
      } catch {
        failed.push(file.name);
      }
    }
    setBusy(null);
    setDone({ id: res.listingId, failed });
    toast.success("Listing submitted for verification");
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold">Submitted for verification</h2>
        <p className="mt-3 text-muted-foreground">
          Our transactions team will check your SPA and payment history with the developer, usually within 1–2 working
          days. You&apos;ll see the status update in your dashboard.
        </p>
        {done.failed.length > 0 && (
          <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
            Some files didn&apos;t upload ({done.failed.join(", ")}). You can add them from your listing page.
          </p>
        )}
        <div className="mt-8 flex justify-center gap-2">
          <Button asChild>
            <Link href={`/dashboard/listings/${done.id}`}>View my listing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/listings">All my listings</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ol className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex min-w-fit items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold tabular transition",
                i < step && "border-success bg-success text-success-foreground",
                i === step && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("text-sm", i === step ? "font-semibold" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form
          className="rounded-2xl border bg-card p-6 shadow-card sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            if (step < STEPS.length - 1) {
              if (validate(step)) setStep(step + 1);
            } else void submit();
          }}
        >
          <h2 className="text-xl font-semibold">{STEPS[step]}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {step === 0 && (
              <>
                <Field label="Developer" error={errors.developer}>
                  <Select value={s.developer} onValueChange={set("developer")}>
                    <SelectTrigger aria-label="Developer">
                      <SelectValue placeholder="Select developer" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVELOPERS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Community" error={errors.community}>
                  <Select value={s.community} onValueChange={set("community")}>
                    <SelectTrigger aria-label="Community">
                      <SelectValue placeholder="Select community" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMUNITIES.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Project name" error={errors.projectName}>
                  <Input value={s.projectName} onChange={(e) => set("projectName")(e.target.value)} placeholder="e.g. Creek Edge Tower 2" />
                </Field>
                <Field label="Unit type" error={errors.unitType}>
                  <Select value={s.unitType} onValueChange={set("unitType")}>
                    <SelectTrigger aria-label="Unit type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIT_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Size (sqft)" error={errors.sizeSqft}>
                  <Input inputMode="numeric" value={s.sizeSqft} onChange={(e) => set("sizeSqft")(e.target.value)} placeholder="1,180" />
                </Field>
                <Field label="Floor">
                  <Input value={s.floor} onChange={(e) => set("floor")(e.target.value)} placeholder="24" />
                </Field>
                <Field label="View" className="sm:col-span-2">
                  <Input value={s.view} onChange={(e) => set("view")(e.target.value)} placeholder="Creek & Downtown skyline" />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Original purchase price (AED)" error={errors.originalPrice} hint="The price on your SPA">
                  <Input inputMode="numeric" value={s.originalPrice} onChange={(e) => set("originalPrice")(e.target.value)} placeholder="2,350,000" />
                </Field>
                <Field label="Amount paid to developer so far (AED)" error={errors.amountPaid}>
                  <Input inputMode="numeric" value={s.amountPaid} onChange={(e) => set("amountPaid")(e.target.value)} placeholder="940,000" />
                </Field>
                <Field label="Next instalment date">
                  <Input type="date" value={s.nextInstalmentDate} onChange={(e) => set("nextInstalmentDate")(e.target.value)} />
                </Field>
                <Field label="Next instalment amount (AED)">
                  <Input inputMode="numeric" value={s.nextInstalmentAmount} onChange={(e) => set("nextInstalmentAmount")(e.target.value)} placeholder="117,500" />
                </Field>
                <Field label="Expected handover" error={errors.handoverDate}>
                  <Select value={s.handoverDate} onValueChange={set("handoverDate")}>
                    <SelectTrigger aria-label="Expected handover">
                      <SelectValue placeholder="Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {qs.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Any missed instalments?">
                  <Select value={s.arrears} onValueChange={set("arrears")}>
                    <SelectTrigger aria-label="Missed instalments">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No, fully up to date</SelectItem>
                      <SelectItem value="one">Yes, one instalment</SelectItem>
                      <SelectItem value="more">Yes, more than one</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="space-y-3 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Remaining instalments (optional)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPlan((p) => [...p, { label: p.length ? `Instalment ${p.length + 1}` : "Next instalment", dueDate: "", amount: "" }])}
                    >
                      <Plus /> Add
                    </Button>
                  </div>
                  {plan.length === 0 && (
                    <p className="text-xs text-muted-foreground">Buyers trust listings with a full schedule. Copy it from your statement of account.</p>
                  )}
                  {plan.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                      <Input aria-label="Milestone" value={p.label} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                      <Input aria-label="Due date" type="date" className="w-40" value={p.dueDate} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x)))} />
                      <Input aria-label="Amount (AED)" inputMode="numeric" className="w-32" placeholder="AED" value={p.amount} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                      <Button type="button" size="icon" variant="ghost" aria-label="Remove" onClick={() => setPlan((all) => all.filter((_, j) => j !== i))}>
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
                  label="Asking price for your equity (AED)"
                  error={errors.askingPrice}
                  hint={num(s.amountPaid) ? `You've paid ${formatAED(num(s.amountPaid))} so far` : "What the buyer pays you now"}
                >
                  <Input inputMode="numeric" value={s.askingPrice} onChange={(e) => set("askingPrice")(e.target.value)} placeholder="770,000" />
                </Field>
                {needsPhone && (
                  <Field label="Mobile / WhatsApp" error={errors.phone} hint="So our team can reach you about offers">
                    <Input type="tel" value={s.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+971 5X XXX XXXX" />
                  </Field>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label>How quickly do you need to sell?</Label>
                  <RadioGroup value={s.motivation} onValueChange={set("motivation")} className="grid gap-2 sm:grid-cols-3">
                    {Object.entries(MOTIVATION).map(([k, m]) => (
                      <label key={k} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary">
                        <RadioGroupItem value={k} className="mt-0.5" />
                        <span>
                          <span className="font-medium">{m.label}</span>
                          <span className="block text-xs text-muted-foreground">{m.hint}</span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <Field label="Anything buyers should know?" className="sm:col-span-2">
                  <Textarea value={s.description} onChange={(e) => set("description")(e.target.value)} placeholder="Upgraded layout, corner unit, reason for selling…" />
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
                    <span className="text-sm font-medium">{FILE_KINDS[k]}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{docs[k]?.name ?? "PDF or image, up to 4 MB"}</span>
                    {errors[k] && <span className="text-xs font-medium text-destructive">{errors[k]}</span>}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="sr-only"
                      onChange={(e) => setDocs((d) => ({ ...d, [k]: e.target.files?.[0] }))}
                    />
                  </label>
                ))}
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition hover:border-gold hover:bg-gold-soft/40 sm:col-span-2">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Photos or developer renders (optional)</span>
                  <span className="text-xs text-muted-foreground">{photos.length ? `${photos.length} selected` : "JPG or PNG, up to 4 MB each"}</span>
                  {errors.photos && <span className="text-xs font-medium text-destructive">{errors.photos}</span>}
                  <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} />
                </label>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Documents are only visible to you and our transactions team. You can also upload them later from your
                  dashboard.
                </p>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4 text-sm sm:col-span-2">
                <p className="text-muted-foreground">
                  Please confirm the details are accurate. Our team verifies them against the developer&apos;s records
                  before your listing goes live.
                </p>
                <dl className="divide-y rounded-xl border">
                  {[
                    ["Unit", `${s.projectName || "—"} · ${UNIT_TYPES[s.unitType as keyof typeof UNIT_TYPES] ?? "—"} · ${s.community || "—"}`],
                    ["Developer", s.developer || "—"],
                    ["Purchase price", formatAED(num(s.originalPrice))],
                    ["Paid so far", `${formatAED(num(s.amountPaid))} (${formatPct(preview.paidPct)})`],
                    ["Your asking price", formatAED(num(s.askingPrice))],
                    ["Documents attached", `${Object.values(docs).filter(Boolean).length} of 4${photos.length ? ` · ${photos.length} photos` : ""}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-end font-medium tabular">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" disabled={step === 0 || !!busy} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button type="submit" disabled={!!busy}>
              {busy ? (
                <>
                  <Loader2 className="animate-spin" /> {busy}
                </>
              ) : step === STEPS.length - 1 ? (
                "Submit for verification"
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-ink-gradient p-6 text-primary-foreground">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
              <Wallet className="h-4 w-4" />
              Your numbers
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-primary-foreground/70">Paid to developer</dt>
                <dd className="tabular">{formatPct(preview.paidPct)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-primary-foreground/70">Buyer takes over</dt>
                <dd className="tabular">{formatAED(preview.remaining)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-primary-foreground/70">Sale value</dt>
                <dd className="tabular">{formatAED(preview.saleValue)}</dd>
              </div>
              <div className="flex justify-between border-t border-primary-foreground/15 pt-2 text-base font-semibold">
                <dt>You receive</dt>
                <dd className="tabular">{formatAED(preview.sellerNet)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-primary-foreground/60">
              Listing is free. The buyer pays our 2% + VAT when the transfer completes.
            </p>
          </div>
          {num(s.originalPrice) > 0 && preview.paidPct < 0.3 && (
            <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Many developers only issue a resale NOC after 30–40% is paid. We&apos;ll check your developer&apos;s policy
              and tell you your options.
            </div>
          )}
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <p className="font-semibold">What happens next</p>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              {[
                "We verify your SPA & payments (1–2 working days)",
                "Your listing goes live with a verified badge",
                "You review offers in your dashboard",
                "We secure the developer NOC & book the DLD transfer",
                "You're paid at the trustee office on transfer day",
              ].map((x, i) => (
                <li key={x} className="flex gap-3">
                  <span className="font-semibold text-foreground tabular">{i + 1}.</span>
                  {x}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
