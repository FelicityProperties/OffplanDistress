"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { AlertTriangle, Check, ExternalLink, FileUp, History, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createListing, type CreateListingState } from "@/app/actions/listings";
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
import { listSeparator } from "@/i18n/config";
import { readAttribution } from "@/lib/attribution";
import { COMMUNITIES, DEVELOPERS, FEES, FILE_KINDS, FORM_UNIT_TYPES, MAX_UPLOAD_BYTES, MOTIVATION, UNIT_TYPES, type UnitTypeKey } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAED, formatPct, formatQuarter, timeAgo } from "@/lib/format";
import { communityName, developerName, searchKey } from "@/lib/place-names";
import { cn } from "@/lib/utils";
import { nextFieldOnEnter, revealFirstError, syncEnterKeyHints } from "./form-ux";
import { readSellDraft, removeSellDraft, writeSellDraft, type SellDraft } from "./sell-draft";

const STEPS = ["step.unit", "step.payment", "step.price", "step.documents", "step.review"] as const;
const DOCS: (keyof typeof FILE_KINDS)[] = ["spa", "oqood", "soa", "id"];
/** The document formats the upload route takes (src/app/api/listings/[id]/files/route.ts): not every image. */
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const DOC_ACCEPT = [...DOC_TYPES, ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].join(",");
/** The server's limits (listingSchema in src/lib/listing-schema.ts), so the boxes stop where it would refuse. */
const MAX_LEN = { floor: 40, view: 80, description: 3000, milestone: 80 };
/** Dates the date inputs take: a year typed with a digit too many or too few is caught at the field. */
const DATE_RANGE = { min: "2000-01-01", max: "9999-12-31" };
// A bulk deal is not offered: it needs its number of units, which only the partner import carries.
const UNIT_KEYS: readonly UnitTypeKey[] = FORM_UNIT_TYPES;
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

const EMPTY_STATE: State = {
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
};
/** What the saved draft keeps (./sell-draft.ts): every answer but the phone number. */
const DRAFT_FIELDS = (Object.keys(EMPTY_STATE) as (keyof State)[]).filter((k) => k !== "phone");

/** A saved draft's answers, with choices that no longer exist (a handover quarter now past, a renamed list entry) dropped. */
function stateFromDraft(saved: Record<string, string>, handoverQuarters: string[]): Partial<State> {
  const out: Partial<State> = { ...saved };
  if (out.developer && !DEVELOPERS.includes(out.developer)) out.developer = "";
  if (out.community && !COMMUNITIES.includes(out.community)) out.community = "";
  if (out.unitType && !UNIT_KEYS.includes(out.unitType as UnitTypeKey)) out.unitType = "";
  if (out.handoverDate && !handoverQuarters.includes(out.handoverDate)) out.handoverDate = "";
  if (out.arrears && !["none", "one", "more"].includes(out.arrears)) out.arrears = "none";
  if (out.motivation && !(out.motivation in MOTIVATION)) out.motivation = "motivated";
  return out;
}

/**
 * The props that tie a control to its Field with the same `id`: named by the label, described by the error or hint
 * line (`hint`: the Field shows one), marked invalid with an error.
 */
function control(id: string, error?: string, hint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-msg` : undefined,
  } as const;
}

/**
 * `id` labels the control with that id; its label is `${id}-label` and the error / hint `${id}-msg`. `after` comes
 * under the error / hint line.
 */
function Field({
  label,
  error,
  hint,
  children,
  className,
  id,
  after,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  after?: React.ReactNode;
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
      {after}
    </div>
  );
}

/** A file name, with line-break chances after "_", "-" and "." (a scan's name is often one long word). */
function breakable(name: string) {
  return name.split(/([_.-])/).map((part, i) => (i % 2 ? [part, <wbr key={i} />] : part));
}

/**
 * Below lg the "Your numbers" card sits under the whole form, two screens away from the fields: these lines repeat the
 * figures that follow from the field above them, as they are typed.
 */
function LiveNumbers({ rows, note }: { rows: [string, string][]; note?: React.ReactNode }) {
  return (
    <div className="lg:hidden">
      <dl className="space-y-1 rounded-xl bg-ink-gradient px-3.5 py-2.5 text-sm text-primary-foreground">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-primary-foreground/70">{k}</dt>
            <dd className="ms-auto font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>
      {note}
    </div>
  );
}

/** `userId`: the signed-in seller, whose answers are saved in this browser as they go (./sell-draft.ts). */
export function SellForm({ needsPhone, initial, userId }: { needsPhone: boolean; initial?: SellPrefill; userId?: string }) {
  const { leadId, ...prefill } = initial ?? {};
  const t = useT("sell");
  const tc = useT("common");
  const tl = useT("legal");
  const te = useT("errors");
  const locale = useLocale();
  const dir = useDir();
  const [step, setStep] = useState(0);
  const [s, setS] = useState<State>(() => ({ ...EMPTY_STATE, ...prefill }));
  const [plan, setPlan] = useState<Plan[]>([]);
  const [docs, setDocs] = useState<Partial<Record<keyof typeof FILE_KINDS, File>>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  /** Photos are resized when picked (see preparePhoto), so problems show up now rather than at submit. */
  const [preparing, setPreparing] = useState(false);
  /** Final step: "I own this unit or am authorised to sell it… and I agree to the Terms of Use". */
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  /** The listing created, and the files that didn't upload with why (the route's reason, say a format it doesn't take). */
  const [done, setDone] = useState<{ id: string; failed: { name: string; error: string }[] } | null>(null);
  const qs = useMemo(quarters, []);

  // Saved draft: restored after the first render (the server has no localStorage, so restoring in useState would not
  // match the server's HTML), saved on every change from then on, removed once the listing is created.
  const [draftReady, setDraftReady] = useState(false);
  /** The estimate lead a restored draft was started from, when this visit's link doesn't carry one. */
  const [draftLeadId, setDraftLeadId] = useState<string>();
  /** When the restored draft was last saved; shows the "Continue where you left off · Start over" banner. */
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const submitted = useRef(false);
  /** A saved draft of another unit, not restored because this visit's link brings an estimate (see below). */
  const otherDraft = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepList = useRef<HTMLOListElement>(null);
  /** Bumped when a step fails its checks: the first field to fix is then shown and focused (./form-ux.ts). */
  const [reveal, setReveal] = useState(0);
  /** Bumped by Continue / Back: on a phone the new step is brought into view (see below). */
  const [moved, setMoved] = useState(0);

  useEffect(() => {
    if (reveal) revealFirstError(formRef.current);
  }, [reveal]);

  // The keyboard's action key: "next" from field to field, "go" (Continue) on the step's last one.
  useEffect(() => syncEnterKeyHints(formRef.current, "go"));

  // Phones (below lg): Continue is at the end of a long step, so the next one would open scrolled past its start: its
  // heading comes back into view, and takes focus so a screen reader reads the new step. Desktop is left as it was.
  useEffect(() => {
    const h = headingRef.current;
    if (!moved || !h || !window.matchMedia("(max-width: 1023.98px)").matches) return;
    // Above the screen or under the sticky header (which the page's scroll-padding-top clears).
    const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (h.getBoundingClientRect().top < header) h.scrollIntoView({ block: "start" });
    h.focus({ preventScroll: true });
  }, [moved]);

  // From sm the steps are listed in a row that can be wider than the screen (up to lg): keep the current one in view.
  useEffect(() => {
    const ol = stepList.current;
    const li = ol?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!ol || !li || ol.scrollWidth <= ol.clientWidth) return;
    const o = ol.getBoundingClientRect();
    const r = li.getBoundingClientRect();
    ol.scrollBy({ left: r.left + r.width / 2 - (o.left + o.width / 2) });
  }, [step]);

  const goTo = (i: number) => {
    setStep(i);
    setMoved((n) => n + 1);
  };

  const applyDraft = (d: SellDraft) => {
    setS({ ...EMPTY_STATE, ...stateFromDraft(d.state, qs) });
    setPlan(d.plan);
    setStep(Math.min(Math.max(d.step, 0), STEPS.length - 1));
    setDraftLeadId(d.leadId);
  };

  useEffect(() => {
    const d = userId ? readSellDraft(userId, DRAFT_FIELDS) : null;
    // The estimate's "Continue to full listing" link (?lead=) opens on that estimate's numbers, as it promises. A draft
    // begun from another estimate, or from none, is about another unit: restoring it would show that unit and then link
    // this estimate to its listing. It is left saved, untouched, until this form is changed.
    if (d && leadId && d.leadId !== leadId) otherDraft.current = true;
    else if (d) {
      applyDraft(d);
      setRestoredAt(d.savedAt);
    }
    setDraftReady(true);
    // Once, on mount: a later change of the props doesn't bring an older draft back over what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId || !draftReady || submitted.current) return;
    const fresh: State = { ...EMPTY_STATE, ...prefill };
    const untouched = step === 0 && plan.length === 0 && DRAFT_FIELDS.every((k) => s[k] === fresh[k]);
    // Nothing typed yet (or the seller started over): nothing to keep, nor to save over another unit's draft.
    if (untouched) {
      if (!otherDraft.current) removeSellDraft(userId);
    } else {
      otherDraft.current = false;
      writeSellDraft(userId, {
        step,
        state: Object.fromEntries(DRAFT_FIELDS.map((k) => [k, s[k]])),
        plan,
        leadId: leadId ?? draftLeadId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, draftReady, s, plan, step]);

  const focusForm = () => requestAnimationFrame(() => headingRef.current?.focus());

  function startOver() {
    if (!userId) return;
    const kept = readSellDraft(userId, DRAFT_FIELDS);
    setS({ ...EMPTY_STATE, ...prefill });
    setPlan([]);
    // The documents, photos and ownership tick went with the earlier answers: never onto another unit. (Undo brings
    // back the answers only, as the banner says of documents and photos.)
    setDocs({});
    setPhotos([]);
    setConfirmed(false);
    setStep(0);
    setErrors({});
    setDraftLeadId(undefined);
    setRestoredAt(null);
    focusForm();
    toast(t("draft.cleared"), kept ? { action: { label: t("draft.undo"), onClick: () => applyDraft(kept) } } : undefined);
  }

  const set = (k: keyof State) => (v: string) => setS((prev) => ({ ...prev, [k]: v }));
  // Arabic-Indic / Persian digits (an Arabic phone keyboard types them) count as digits, "٫" as the decimal point;
  // otherwise "٩٠٬٠٠٠" would be read, checked and sent as 0.
  const num = (v: string) =>
    Number(
      v
        .replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10))
        .replace(/٫/g, ".")
        .replace(/[^\d.]/g, ""),
    ) || 0;
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

  /**
   * Documents are checked when picked: a file over the limit, or in a format the upload route refuses (GIF, TIFF, BMP,
   * AVIF…), is refused straight away, not after the listing exists. A type the browser can't name (a HEIC outside
   * Apple devices) is left to the route.
   */
  function pickDoc(k: keyof typeof FILE_KINDS, input: HTMLInputElement) {
    const f = input.files?.[0];
    const refused = !f
      ? null
      : f.size > MAX_UPLOAD_BYTES
        ? t("error.docTooLarge", { name: f.name })
        : f.type && !DOC_TYPES.includes(f.type)
          ? t("upload.badType", { name: f.name })
          : null;
    if (refused) {
      input.value = "";
      setDocs((d) => ({ ...d, [k]: undefined }));
      setErrors((e) => ({ ...e, [k]: refused }));
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
    const names = failed.map((f) => f.name).join(listSeparator(locale));
    setErrors(({ photos: _, ...rest }) =>
      failed.length ? { ...rest, photos: t(failed.some(isHeic) ? "photo.heic" : "photo.unreadable", { name: names }) } : rest,
    );
  }

  const preview = analyzeDeal({
    originalPrice: num(s.originalPrice),
    amountPaid: num(s.amountPaid),
    askingPrice: num(s.askingPrice),
    launchPrice: null,
    lotUnits: null,
  });

  // The description as sent: the seller's text, then our note on missed instalments. The server's 3,000 characters
  // cover both, so the box leaves room for the note.
  const arrearsNote = s.arrears === "one" ? t("arrears.note.one") : s.arrears === "more" ? t("arrears.note.more") : "";
  const description = [s.description.trim(), arrearsNote].filter(Boolean).join("\n\n");
  const descriptionRoom = MAX_LEN.description - (arrearsNote ? arrearsNote.length + 2 : 0);

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
      // Longer than the box allows: a restored draft, or missed instalments reported after the text was typed.
      if (description.length > MAX_LEN.description) e.description = te("field.tooLong", { max: descriptionRoom });
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
        setReveal((n) => n + 1);
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
    const lead = leadId ?? draftLeadId;
    if (lead) fd.set("leadId", lead);
    fd.set("source", readAttribution());
    fd.set("description", description);
    fd.set(
      "paymentPlan",
      JSON.stringify(
        plan
          .filter((p) => p.label.trim() && num(p.amount))
          .map((p) => ({ label: p.label.trim(), dueDate: p.dueDate || null, amount: Math.round(num(p.amount)) })),
      ),
    );

    // A server error (or the connection dropping) mustn't leave the button on "Saving your listing…" for good.
    const res = await createListing({}, fd).catch((): CreateListingState => ({ error: t("error.checkDetails") }));
    if (!res.ok || !res.listingId) {
      setBusy(null);
      const fe = Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0] ?? t("error.invalid")]));
      setErrors(fe);
      const first = Math.min(...Object.keys(fe).map((k) => FIELD_STEP[k] ?? STEPS.length - 1));
      if (Number.isFinite(first)) setStep(first);
      setReveal((n) => n + 1);
      toast.error(res.error ?? t("error.checkDetails"));
      return;
    }
    // The listing exists now: its draft goes, so a refresh during the uploads can't offer to submit it again.
    submitted.current = true;
    if (userId) removeSellDraft(userId);

    const failed: { name: string; error: string }[] = [];
    const uploads: [File, keyof typeof FILE_KINDS][] = [
      ...(Object.entries(docs).filter(([, f]) => f) as [keyof typeof FILE_KINDS, File][]).map(([k, f]) => [f, k] as [File, keyof typeof FILE_KINDS]),
      ...photos.map((f) => [f, "photo"] as [File, keyof typeof FILE_KINDS]),
    ];
    for (const [i, [file, kind]] of uploads.entries()) {
      setBusy(t("submit.uploading", { i: i + 1, n: uploads.length }));
      try {
        await uploadListingFile(res.listingId, file, kind, locale);
      } catch (e) {
        failed.push({ name: file.name, error: e instanceof Error && e.message ? e.message : t("uploader.failed") });
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
          // wrap-anywhere: file names are often one long word.
          <div className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-start text-sm text-warning wrap-anywhere">
            <p>{t("done.failed")}</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-4">
              {done.failed.map((f, i) => (
                <li key={i}>
                  {/* Most messages already name the file (as in the dashboard's uploader); the others get it in front. */}
                  {f.error.includes(f.name) ? f.error : t("uploader.fileError", { name: f.name, error: f.error })}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
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
      {restoredAt != null && (
        <div
          role="status"
          data-testid="sell-draft"
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold-soft/60 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-gold-foreground" aria-hidden />
            <p className="min-w-0">{t("draft.body", { when: timeAgo(new Date(restoredAt), locale) })}</p>
          </div>
          {/* Phones: the two choices share the width (each on its own line when one doesn't fit). */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="max-sm:grow"
              onClick={() => {
                setRestoredAt(null);
                focusForm();
              }}
            >
              {t("draft.continue")}
            </Button>
            {/* Not while photos are being prepared: they would land in the cleared form once ready. */}
            <Button type="button" size="sm" variant="outline" className="max-sm:grow" onClick={startOver} disabled={preparing}>
              {t("draft.startOver")}
            </Button>
          </div>
        </div>
      )}
      <ol ref={stepList} className={cn("hidden gap-2 overflow-x-auto pb-2 sm:flex", restoredAt != null ? "mt-5" : "mt-8")}>
        {STEPS.map((key, i) => (
          <li key={key} aria-current={i === step ? "step" : undefined} className="flex min-w-fit items-center gap-2">
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
      {/* Phones: the five steps don't fit in a row, so "Step 2 of 5" over a progress bar (the form names the step). */}
      <div className={cn("sm:hidden", restoredAt != null && "mt-5")}>
        <p className="text-sm font-medium text-muted-foreground tabular">{t("step.progress", { n: step + 1, total: STEPS.length })}</p>
        <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* grid-cols-1 (minmax(0, 1fr)): a long name or a wide button row can't make the form wider than a phone. */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <form
          ref={formRef}
          className="rounded-2xl border bg-card p-6 shadow-card sm:p-8"
          onKeyDown={nextFieldOnEnter}
          onSubmit={(e) => {
            e.preventDefault();
            if (busy || preparing) return;
            if (step < STEPS.length - 1) {
              if (validate(step)) goTo(step + 1);
              else setReveal((n) => n + 1);
            } else void submit();
          }}
        >
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            {t(STEPS[step])}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                <Field id="projectName" label={t("field.projectName")} error={errors.projectName}>
                  <Input
                    {...control("projectName", errors.projectName)}
                    value={s.projectName}
                    onChange={(e) => set("projectName")(e.target.value)}
                    placeholder={t("field.projectName.placeholder")}
                  />
                </Field>
                <Field id="unitType" label={t("field.unitType")} error={errors.unitType}>
                  <Select dir={dir} value={s.unitType} onValueChange={set("unitType")}>
                    <SelectTrigger {...control("unitType", errors.unitType)} aria-label={t("field.unitType")}>
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
                <Field id="sizeSqft" label={t("field.size")} error={errors.sizeSqft}>
                  <Input
                    {...control("sizeSqft", errors.sizeSqft)}
                    inputMode="numeric"
                    value={s.sizeSqft}
                    onChange={(e) => set("sizeSqft")(e.target.value)}
                    placeholder="1,180"
                  />
                </Field>
                <Field id="floor" label={t("field.floor")} error={errors.floor}>
                  <Input
                    {...control("floor", errors.floor)}
                    maxLength={MAX_LEN.floor}
                    value={s.floor}
                    onChange={(e) => set("floor")(e.target.value)}
                    placeholder="24"
                  />
                </Field>
                <Field id="view" label={t("field.view")} error={errors.view} className="sm:col-span-2">
                  <Input
                    {...control("view", errors.view)}
                    maxLength={MAX_LEN.view}
                    value={s.view}
                    onChange={(e) => set("view")(e.target.value)}
                    placeholder={t("field.view.placeholder")}
                  />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                {/* Money fields: autoComplete off, so a phone doesn't offer earlier entries (a phone number) as a price. */}
                <Field id="originalPrice" label={t("field.originalPrice")} error={errors.originalPrice} hint={t("field.originalPrice.hint")}>
                  <Input
                    {...control("originalPrice", errors.originalPrice, true)}
                    inputMode="numeric"
                    autoComplete="off"
                    value={s.originalPrice}
                    onChange={(e) => set("originalPrice")(e.target.value)}
                    placeholder="2,350,000"
                  />
                </Field>
                <Field
                  id="amountPaid"
                  label={t("field.amountPaid")}
                  error={errors.amountPaid}
                  after={
                    num(s.originalPrice) > 0 && (
                      <LiveNumbers
                        rows={[
                          [t("numbers.paid"), formatPct(preview.paidPct)],
                          [t("numbers.takesOver"), aed(preview.remaining)],
                        ]}
                        note={
                          preview.paidPct < FEES.nocMinPaidPct && (
                            <p className="mt-2 flex gap-2 text-xs leading-relaxed text-warning">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                              {t("nocWarning")}
                            </p>
                          )
                        }
                      />
                    )
                  }
                >
                  <Input
                    {...control("amountPaid", errors.amountPaid)}
                    inputMode="numeric"
                    autoComplete="off"
                    value={s.amountPaid}
                    onChange={(e) => set("amountPaid")(e.target.value)}
                    placeholder="940,000"
                  />
                </Field>
                <Field id="nextInstalmentDate" label={t("field.nextDate")} error={errors.nextInstalmentDate}>
                  <Input
                    {...control("nextInstalmentDate", errors.nextInstalmentDate)}
                    type="date"
                    {...DATE_RANGE}
                    value={s.nextInstalmentDate}
                    onChange={(e) => set("nextInstalmentDate")(e.target.value)}
                  />
                </Field>
                <Field id="nextInstalmentAmount" label={t("field.nextAmount")} error={errors.nextInstalmentAmount}>
                  <Input
                    {...control("nextInstalmentAmount", errors.nextInstalmentAmount)}
                    inputMode="numeric"
                    autoComplete="off"
                    value={s.nextInstalmentAmount}
                    onChange={(e) => set("nextInstalmentAmount")(e.target.value)}
                    placeholder="117,500"
                  />
                </Field>
                <Field id="handoverDate" label={t("field.handover")} error={errors.handoverDate}>
                  <Select dir={dir} value={s.handoverDate} onValueChange={set("handoverDate")}>
                    <SelectTrigger {...control("handoverDate", errors.handoverDate)} aria-label={t("field.handover")}>
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
                <Field id="arrears" label={t("field.arrears")}>
                  <Select dir={dir} value={s.arrears} onValueChange={set("arrears")}>
                    <SelectTrigger id="arrears" aria-label={t("field.arrears.aria")}>
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
                      autoComplete="off"
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
                  {/* The server's answer for the rows (an amount past what it can store, say): shown here, not just a toast. */}
                  {errors.paymentPlan && (
                    <p id="paymentPlan-msg" data-error className="text-xs font-medium text-destructive">
                      {errors.paymentPlan}
                    </p>
                  )}
                  {plan.map((p, i) => (
                    // Phones: the milestone, then the date, each on its own line (a date needs about 140px), then the
                    // amount beside the remove button; from sm one line.
                    <div
                      key={i}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:border-0 sm:pb-0"
                    >
                      <Input aria-label={t("plan.milestone")} maxLength={MAX_LEN.milestone} className="col-span-2 sm:col-span-1" value={p.label} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                      <Input aria-label={t("plan.dueDate")} type="date" {...DATE_RANGE} className="col-span-2 min-w-0 sm:col-span-1 sm:w-40" value={p.dueDate} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x)))} />
                      <Input aria-label={t("plan.amount")} inputMode="numeric" autoComplete="off" className="min-w-0 sm:w-32" placeholder={t("plan.amount.placeholder")} value={p.amount} onChange={(e) => setPlan((all) => all.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
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
                  id="askingPrice"
                  label={t("field.asking")}
                  error={errors.askingPrice}
                  hint={num(s.amountPaid) ? t("field.asking.paid", { amount: aed(num(s.amountPaid)) }) : t("field.asking.hint")}
                  after={
                    s.askingPrice !== "" && (
                      <LiveNumbers
                        rows={[
                          [t("numbers.saleValue"), aed(preview.saleValue)],
                          [t("numbers.youReceive"), aed(preview.sellerNet)],
                        ]}
                      />
                    )
                  }
                >
                  <Input
                    {...control("askingPrice", errors.askingPrice, true)}
                    inputMode="numeric"
                    autoComplete="off"
                    value={s.askingPrice}
                    onChange={(e) => set("askingPrice")(e.target.value)}
                    placeholder="770,000"
                  />
                </Field>
                {needsPhone && (
                  <Field id="phone" label={t("field.phone")} error={errors.phone} hint={t("field.phone.hint")}>
                    <Input
                      {...control("phone", errors.phone, true)}
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      // The account's phone: the profile and sign-up take 30 characters at most (createListing checks).
                      maxLength={30}
                      className="rtl:text-end"
                      value={s.phone}
                      onChange={(e) => set("phone")(e.target.value)}
                      placeholder="+971 5X XXX XXXX"
                    />
                  </Field>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label id="motivation-label">{t("field.motivation")}</Label>
                  <RadioGroup
                    dir={dir}
                    value={s.motivation}
                    onValueChange={set("motivation")}
                    aria-labelledby="motivation-label"
                    className="grid gap-2 sm:grid-cols-3"
                  >
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
                <Field id="description" label={t("field.description")} error={errors.description} className="sm:col-span-2">
                  <Textarea
                    {...control("description", errors.description)}
                    maxLength={descriptionRoom}
                    value={s.description}
                    onChange={(e) => set("description")(e.target.value)}
                    placeholder={t("field.description.placeholder")}
                  />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                {DOCS.map((k) => (
                  <label
                    key={k}
                    className={cn(
                      // The file input inside is visually hidden: the tile shows its keyboard focus.
                      "flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition hover:border-gold hover:bg-gold-soft/40 focus-within:border-gold focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background max-sm:p-4",
                      docs[k] && "border-success bg-success-soft/40",
                    )}
                  >
                    {docs[k] ? <Check className="h-6 w-6 text-success" /> : <FileUp className="h-6 w-6 text-muted-foreground" />}
                    <span className="text-sm font-medium">{tc(`file.${k}`)}</span>
                    {/* A file name is often one long word: it breaks anywhere, over two lines at most, inside the tile. */}
                    <span dir="auto" className="line-clamp-2 w-full text-xs text-muted-foreground wrap-anywhere">
                      {docs[k] ? breakable(docs[k].name) : t("docs.tileHint")}
                    </span>
                    {errors[k] && (
                      <span id={`doc-${k}-msg`} className="w-full text-xs font-medium text-destructive wrap-anywhere">
                        {errors[k]}
                      </span>
                    )}
                    <input
                      type="file"
                      accept={DOC_ACCEPT}
                      className="sr-only"
                      aria-invalid={errors[k] ? true : undefined}
                      aria-describedby={errors[k] ? `doc-${k}-msg` : undefined}
                      onChange={(e) => pickDoc(k, e.currentTarget)}
                    />
                  </label>
                ))}
                <label
                  className={cn(
                    "flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition hover:border-gold hover:bg-gold-soft/40 focus-within:border-gold focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background max-sm:p-4 sm:col-span-2",
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
                  {errors.photos && (
                    <span id="photos-msg" className="w-full max-w-prose text-xs font-medium text-destructive wrap-anywhere">
                      {errors.photos}
                    </span>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    disabled={preparing}
                    aria-invalid={errors.photos ? true : undefined}
                    aria-describedby={errors.photos ? "photos-msg" : undefined}
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
                    // A value too long to share the line goes under its label; a long name (one word, typed under
                    // "Other") breaks anywhere rather than widen the page.
                    <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                      <dt className="min-w-0 text-muted-foreground">{k}</dt>
                      <dd className="ms-auto min-w-0 text-end font-medium tabular wrap-anywhere">{v}</dd>
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
            <Button type="button" variant="ghost" className="shrink-0" disabled={step === 0 || !!busy} onClick={() => goTo(step - 1)}>
              {tc("back")}
            </Button>
            {/* Phones: Continue takes the rest of the row, a big target; its label (or "Uploading… 2/5") may wrap. */}
            <Button
              type="submit"
              disabled={!!busy || preparing}
              className="max-sm:h-auto max-sm:min-h-11 max-sm:min-w-0 max-sm:flex-1 max-sm:whitespace-normal max-sm:py-2"
            >
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
