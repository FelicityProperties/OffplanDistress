"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Archive, ArchiveRestore, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminSetVisibility,
  adminUpdateListing,
  approveListing,
  deleteSampleListings,
  rejectListing,
  resetUserPassword,
  setInquiryHandled,
  setInquirySpam,
  setKycStatus,
  setUserRole,
} from "@/app/actions/admin";
import { PHONE_BUTTON, PHONE_OUTLINED, PHONE_SAVE_BAR, PHONE_SAVE_BAR_STYLE, PHONE_SHELL } from "@/components/admin/phone";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/i18n/client";
import { COMMUNITIES, DEVELOPERS, LISTING_STATUS, type ListingStatusKey } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { communityName, developerName } from "@/lib/place-names";
import { cn } from "@/lib/utils";

/**
 * Hide / Show on site / Archive / Restore (adminSetVisibility): what the listing editor's status does for each, in one
 * tap. Hide keeps the offers and tells nobody; Archive takes the unit off the market (offers closed, buyers told), so
 * it asks first. Which buttons show follows the status: a unit in a deal or sold has none (the editor handles those).
 */
export function VisibilityButtons({
  listingId,
  savedAt,
  status,
  pausedByAdmin,
  refCode,
}: {
  listingId: string;
  savedAt: string;
  status: ListingStatusKey;
  pausedByAdmin: boolean;
  refCode: string;
}) {
  const t = useT("admin");
  const tc = useT("common");
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const archiveButton = useRef<HTMLButtonElement>(null);
  const run = (action: "hide" | "show" | "archive" | "restore") =>
    start(async () => {
      const res = await adminSetVisibility(listingId, action, savedAt);
      if ("error" in res && res.error) toast.error(res.error);
      else toast.success(t(`visibility.done.${action}`));
    });
  const canHide = status === "live" || status === "pending_review";
  const canShow = status === "paused" && pausedByAdmin;
  const canArchive = canHide || status === "paused" || status === "rejected";
  const canRestore = status === "withdrawn";
  if (!canHide && !canShow && !canArchive && !canRestore) return null;
  const outlined = cn(PHONE_BUTTON, PHONE_OUTLINED);
  return (
    <div className="flex flex-wrap justify-end gap-2 max-sm:justify-start" data-testid="visibility-buttons">
      {canHide && (
        <Button size="sm" variant="outline" className={PHONE_BUTTON} disabled={pending} onClick={() => run("hide")} title={t("visibility.hint.hide")}>
          <EyeOff /> {t("visibility.hide")}
        </Button>
      )}
      {canShow && (
        <Button size="sm" variant="success" className={PHONE_BUTTON} disabled={pending} onClick={() => run("show")} title={t("visibility.hint.show")}>
          <Eye /> {t("visibility.show")}
        </Button>
      )}
      {canRestore && (
        <Button size="sm" variant="outline" className={PHONE_BUTTON} disabled={pending} onClick={() => run("restore")} title={t("visibility.hint.restore")}>
          <ArchiveRestore /> {t("visibility.restore")}
        </Button>
      )}
      {canArchive && (
        <Button
          ref={archiveButton}
          size="sm"
          variant="ghost"
          className={cn(outlined, "text-destructive hover:text-destructive")}
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          <Archive /> {t("visibility.archive")}
        </Button>
      )}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            archiveButton.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("visibility.archiveTitle", { ref: refCode })}</AlertDialogTitle>
            <AlertDialogDescription>{t("visibility.archiveBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0 max-lg:h-11">{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }), "max-lg:h-11")} onClick={() => run("archive")}>
              <Archive /> {t("visibility.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Approve / Reject. `savedAt` is the listing's updated_at as this page shows it: Approve is refused once the listing has
 * changed since (the seller's new price, say), and the page then shows it as it is now. `refCode` and `project` name
 * the listing in the confirmation a phone asks for: there Approve is a big button under the thumb, and it publishes the
 * advert and tells the seller at once.
 */
export function ReviewButtons({ listingId, savedAt, refCode, project }: { listingId: string; savedAt: string; refCode: string; project: string }) {
  const t = useT("admin");
  const tc = useT("common");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const approveButton = useRef<HTMLButtonElement>(null);
  const rejectButton = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");
  const approve = () =>
    start(async () => {
      const res = await approveListing(listingId, savedAt);
      if ("error" in res && res.error) toast.error(res.error);
      else toast.success(t("review.approved"));
    });
  return (
    // One unit, never wrapped: the queue's table would shrink its column to one button and stack them. The listing
    // page's header row wraps around it instead. Phones (below md): a row of its own, the two buttons sharing it 12 px
    // apart (the queue shows each listing as a card there).
    <div className="flex justify-end gap-1 max-lg:gap-2 max-md:grid max-md:w-full max-md:grid-cols-2 max-md:gap-3">
      <Button
        ref={approveButton}
        size="sm"
        variant="success"
        className={PHONE_BUTTON}
        disabled={pending}
        onClick={() => (window.matchMedia(PHONE_SHELL).matches ? setConfirming(true) : approve())}
      >
        <Check /> {t("review.approve")}
      </Button>
      <Button ref={rejectButton} size="sm" variant="ghost" className={cn(PHONE_BUTTON, PHONE_OUTLINED)} disabled={pending} onClick={() => setOpen(true)}>
        <X /> {t("review.reject")}
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        {/* Opened from a button outside it: closed, focus goes back to that button (while it is still on the page). */}
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            approveButton.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("review.confirmTitle", { ref: refCode })}</AlertDialogTitle>
            <AlertDialogDescription>{t("review.confirmBody", { project })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="mt-0 max-lg:h-11">{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction className={cn(buttonVariants({ variant: "success" }), "max-lg:h-11")} onClick={approve}>
              <Check /> {t("review.approve")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Opened from a button outside it (not a DialogTrigger): closed, focus goes back to that button. */}
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            rejectButton.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("review.rejectTitle")}</DialogTitle>
            <DialogDescription>{t("review.rejectDesc")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("review.rejectPlaceholder")}
            rows={4}
          />
          {/* Below lg a Cancel button too (a phone has no Escape key, and the corner X is small). */}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="max-lg:h-11 lg:hidden">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="max-lg:h-11"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await rejectListing(listingId, reason);
                  setOpen(false);
                  if ("error" in res && res.error) toast.error(res.error);
                  else toast(t("review.rejected"));
                })
              }
            >
              {t("review.rejectSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type EditProps = {
  listingId: string;
  /** When the listing was last saved (its updated_at): the form starts again from the stored values when it changes. */
  savedAt: string;
  status: ListingStatusKey;
  verified: boolean;
  nocEligible: boolean;
  launchPrice: number | null;
  askingPrice: number;
  /** Paid to the developer so far: corrected here from its statement of account (only shown, and saved, when given). */
  amountPaid?: number;
  developer: string;
  developerOther: string | null;
  community: string;
  communityOther: string | null;
  adminNotes: string | null;
  dldPermit: string | null;
  dldPermitExpiresAt: string | null;
  dldPermitUrl: string | null;
  formAExpiresAt: string | null;
  /** When the account owner attested that Felicity holds the permit in place of its number (src/lib/attestation.ts), ISO. */
  permitAttestedAt?: string | null;
  /** A sample listing isn't an advert: no permit to attest to (the server ignores the box too). */
  isSample?: boolean;
  /** The range the permit and Form A dates may take (expiryDateBounds in src/lib/permits.ts); the server checks it too. */
  expiryBounds?: { min: string; max: string };
  images: string[];
  /**
   * Arrears with the developer (schema.ts overdue_amount, overdue_penalty, arrears_checked_at) and today's Dubai date.
   * The fields only appear (and are only saved) when this is given.
   */
  arrears?: { overdueAmount: number | null; overduePenalty: number | null; checkedAt: string | null; today: string };
};

/**
 * Developer or community select for the listing editor. When the seller picked "Other", the name they typed is shown
 * (and editable) under it; choosing the matching name from the list maps the listing and clears the typed name.
 */
function NamePicker({
  kind,
  label,
  otherLabel,
  hint,
  all,
  value,
  other,
  errors,
}: {
  kind: "developer" | "community";
  label: string;
  otherLabel: string;
  hint: string;
  all: string[];
  value: string;
  other: string | null;
  errors: (string[] | undefined)[];
}) {
  const tc = useT("common");
  const locale = useLocale();
  const [picked, setPicked] = useState(value);
  const name = (v: string) => (kind === "developer" ? developerName(tc, v) : communityName(tc, v));
  const collator = new Intl.Collator(locale);
  // A stored name that is no longer in config.ts stays selectable, so saving the form doesn't change it.
  const options = [...new Set([...all, value])]
    .filter((v) => v !== "Other")
    .sort((a, b) => collator.compare(name(a), name(b)));
  const otherName = `${kind}Other`;
  return (
    <div className="space-y-3">
      <Field label={label} htmlFor={kind} error={errors[0]}>
        <select id={kind} name={kind} value={picked} onChange={(e) => setPicked(e.target.value)} className={selectClass}>
          {options.map((v) => (
            <option key={v} value={v}>
              {name(v)}
            </option>
          ))}
          <option value="Other">{tc(kind === "developer" ? "developer.Other" : "community.Other")}</option>
        </select>
      </Field>
      {picked === "Other" && (
        <Field label={otherLabel} htmlFor={otherName} error={errors[1]} hint={other ? hint : undefined}>
          <Input id={otherName} name={otherName} dir="auto" maxLength={80} defaultValue={other ?? ""} />
        </Field>
      )}
    </div>
  );
}

export function AdminListingForm(p: EditProps) {
  const t = useT("admin");
  const tc = useT("common");
  const locale = useLocale();
  const [state, action] = useActionState(adminUpdateListing, {});
  const [pending, start] = useTransition();
  useEffect(() => {
    if (state.ok) toast.success(t("form.saved"));
    // Only on a new save result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};
  return (
    // noValidate: the server checks every field and answers in the page's language, next to the field (the browser's
    // own bubbles follow the browser's language); min/max on the dates still limit the date picker.
    // Submitted from onSubmit once the page is interactive: React resets a form after its `action`, putting the selects
    // and checkboxes back to the values the page was first loaded with (a save after that would write them back) and
    // clearing what was typed when a save is refused; a submit React sees prevented runs no reset. (`action` stays for
    // a Save clicked before the scripts have loaded: the browser posts it to the server action.) Keyed on the listing
    // as saved, so once a save (here or in another card, such as an accepted offer) changes it, the fields show what is
    // stored, never an older status to be saved back.
    <form
      key={p.savedAt}
      action={action}
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      aria-label={t("listing.manage")}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
      <input type="hidden" name="listingId" value={p.listingId} />
      {/* The status this form was loaded with: saving after it changed (e.g. an offer was accepted) is refused. */}
      <input type="hidden" name="statusWas" value={p.status} />
      {/* …and the listing as saved then: any other change since (the seller's price or photo, another admin's save) too. */}
      <input type="hidden" name="savedAt" value={p.savedAt} />
      <Field label={t("form.status")} htmlFor="status" error={fe.status}>
        <select id="status" name="status" defaultValue={p.status} className={selectClass}>
          {(Object.keys(LISTING_STATUS) as ListingStatusKey[]).map((k) => (
            <option key={k} value={k}>
              {tc(`listing.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      {/* inputMode: a phone's number pad, as on the staff form and the deal file (whole dirhams). */}
      <Field label={t("form.askingPrice")} htmlFor="askingPrice" error={fe.askingPrice}>
        <Input id="askingPrice" name="askingPrice" type="number" inputMode="numeric" min={0} defaultValue={p.askingPrice} />
      </Field>
      <NamePicker
        kind="developer"
        label={t("form.developer")}
        otherLabel={t("form.developerOther")}
        hint={t("form.otherHint")}
        all={DEVELOPERS}
        value={p.developer}
        other={p.developerOther}
        errors={[fe.developer, fe.developerOther]}
      />
      <NamePicker
        kind="community"
        label={t("form.community")}
        otherLabel={t("form.communityOther")}
        hint={t("form.otherHint")}
        all={COMMUNITIES}
        value={p.community}
        other={p.communityOther}
        errors={[fe.community, fe.communityOther]}
      />
      <Field
        label={t("form.launchPrice")}
        htmlFor="launchPrice"
        error={fe.launchPrice}
        hint={t("form.launchPriceHint")}
      >
        <Input id="launchPrice" name="launchPrice" type="number" inputMode="numeric" min={0} defaultValue={p.launchPrice ?? ""} />
      </Field>
      {p.amountPaid != null && (
        <Field label={t("form.amountPaid")} htmlFor="amountPaid" error={fe.amountPaid} hint={t("form.amountPaidHint")}>
          <Input
            id="amountPaid"
            name="amountPaid"
            type="number"
            inputMode="numeric"
            min={0}
            aria-invalid={fe.amountPaid ? true : undefined}
            defaultValue={p.amountPaid}
          />
        </Field>
      )}
      {p.arrears && (
        <fieldset className="grid gap-4 rounded-xl border border-border/80 p-4 sm:col-span-2 sm:grid-cols-3">
          <legend className="px-1 text-sm font-semibold">{t("form.arrears")}</legend>
          <p className="text-xs text-muted-foreground sm:col-span-3">{t("form.arrearsHint")}</p>
          {(p.arrears.overdueAmount != null || p.arrears.overduePenalty != null) && p.arrears.checkedAt == null && (
            <p className="rounded-lg bg-gold-soft px-3 py-2 text-xs text-gold-foreground sm:col-span-3">{t("form.arrearsSellerFigure")}</p>
          )}
          <Field label={t("form.overdueAmount")} htmlFor="overdueAmount" error={fe.overdueAmount} hint={t("form.overdueAmountHint")}>
            <Input
              id="overdueAmount"
              name="overdueAmount"
              type="number"
              inputMode="numeric"
              min={0}
              aria-invalid={fe.overdueAmount ? true : undefined}
              defaultValue={p.arrears.overdueAmount ?? ""}
            />
          </Field>
          <Field label={t("form.overduePenalty")} htmlFor="overduePenalty" error={fe.overduePenalty} hint={t("form.overduePenaltyHint")}>
            <Input
              id="overduePenalty"
              name="overduePenalty"
              type="number"
              inputMode="numeric"
              min={0}
              aria-invalid={fe.overduePenalty ? true : undefined}
              defaultValue={p.arrears.overduePenalty ?? ""}
            />
          </Field>
          <Field
            label={t("form.arrearsCheckedAt")}
            htmlFor="arrearsCheckedAt"
            error={fe.arrearsCheckedAt}
            hint={t("form.arrearsCheckedAtHint")}
          >
            <Input
              id="arrearsCheckedAt"
              name="arrearsCheckedAt"
              type="date"
              max={p.arrears.today}
              aria-invalid={fe.arrearsCheckedAt ? true : undefined}
              defaultValue={p.arrears.checkedAt ?? ""}
            />
          </Field>
        </fieldset>
      )}
      <Field label={t("form.dldPermit")} htmlFor="dldPermit" error={fe.dldPermit} hint={t("form.dldPermitHint")}>
        <Input id="dldPermit" name="dldPermit" dir="ltr" maxLength={40} defaultValue={p.dldPermit ?? ""} />
      </Field>
      <Field
        label={t("form.dldPermitExpiresAt")}
        htmlFor="dldPermitExpiresAt"
        error={fe.dldPermitExpiresAt}
        hint={t("form.dldPermitExpiresAtHint")}
      >
        <Input
          id="dldPermitExpiresAt"
          name="dldPermitExpiresAt"
          type="date"
          min={p.expiryBounds?.min}
          max={p.expiryBounds?.max}
          aria-invalid={fe.dldPermitExpiresAt ? true : undefined}
          defaultValue={p.dldPermitExpiresAt ?? ""}
        />
      </Field>
      <Field label={t("form.dldPermitUrl")} htmlFor="dldPermitUrl" error={fe.dldPermitUrl} hint={t("form.dldPermitUrlHint")}>
        <Input
          id="dldPermitUrl"
          name="dldPermitUrl"
          type="url"
          dir="ltr"
          maxLength={500}
          placeholder="https://…dubailand.gov.ae/…"
          defaultValue={p.dldPermitUrl ?? ""}
        />
      </Field>
      <Field label={t("form.formAExpiresAt")} htmlFor="formAExpiresAt" error={fe.formAExpiresAt} hint={t("form.formAExpiresAtHint")}>
        <Input
          id="formAExpiresAt"
          name="formAExpiresAt"
          type="date"
          min={p.expiryBounds?.min}
          max={p.expiryBounds?.max}
          aria-invalid={fe.formAExpiresAt ? true : undefined}
          defaultValue={p.formAExpiresAt ?? ""}
        />
      </Field>
      {/* In place of the number: the account owner's statement that Felicity holds the permit (src/lib/attestation.ts).
          A number entered replaces it; unticking withdraws it. Not for a sample, which is never an advert. */}
      {!p.isSample && (
        <div className="sm:col-span-2">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox name="permitAttested" defaultChecked={Boolean(p.permitAttestedAt)} className="mt-0.5" data-testid="permit-attested" />
            <span>{t("form.permitAttested")}</span>
          </label>
          <p className="mt-1 ps-6 text-xs text-muted-foreground">
            {t("form.permitAttestedHint")}
            {p.permitAttestedAt && ` ${t("form.permitAttestedSince", { date: formatDate(p.permitAttestedAt, locale) })}`}
          </p>
        </div>
      )}
      {/* Below lg each line is a 40 px target (the label toggles its box). */}
      <div className="flex flex-col justify-center gap-3 pt-5 max-lg:gap-1 max-sm:pt-0">
        <label className="flex items-center gap-2 text-sm max-lg:min-h-10">
          <Checkbox name="verified" defaultChecked={p.verified} /> {t("form.verified")}
        </label>
        <label className="flex items-center gap-2 text-sm max-lg:min-h-10">
          <Checkbox name="nocEligible" defaultChecked={p.nocEligible} /> {t("form.nocEligible")}
        </label>
      </div>
      <Field label={t("form.images")} htmlFor="images" error={fe.images} className="sm:col-span-2" hint={t("form.imagesHint")}>
        <Textarea id="images" name="images" rows={3} dir="ltr" defaultValue={p.images.join("\n")} />
      </Field>
      <Field label={t("form.notes")} htmlFor="adminNotes" error={fe.adminNotes} className="sm:col-span-2">
        <Textarea id="adminNotes" name="adminNotes" rows={3} defaultValue={p.adminNotes ?? ""} placeholder={t("form.notesPlaceholder")} />
      </Field>
      {/* Below lg the form is several screens long: its Save row stays in reach at the bottom (PHONE_SAVE_BAR). */}
      <div className={cn("flex items-center gap-3 sm:col-span-2", PHONE_SAVE_BAR)} style={PHONE_SAVE_BAR_STYLE}>
        <Button type="submit" className="max-lg:h-11" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? tc("saving") : t("form.save")}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/**
 * A select whose every change is saved straight away (`save` answers an error message, or null). It shows the value as
 * saved: the choice while it is being saved, the one before it when the save is refused (or fails), and the stored
 * value again whenever the page brings a new one. A choice made before the page's scripts had loaded (a big table on a
 * slow connection) never reached onChange: it is saved once they have, rather than left on screen unsaved.
 */
function SavedSelect<V extends string>({
  value,
  label,
  options,
  save,
  className,
}: {
  value: V;
  label: string;
  options: [V, string][];
  save: (next: V) => Promise<string | null>;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useState(value);
  const [stored, setStored] = useState(value);
  if (stored !== value) {
    setStored(value);
    setShown(value);
  }
  const ref = useRef<HTMLSelectElement>(null);
  const checked = useRef(false);
  // The choice being saved: the same choice seen twice (React replaying the early change event, and the check below)
  // is saved once.
  const saving = useRef<V | null>(null);
  const change = (next: V) => {
    if (next === saving.current) return;
    saving.current = next;
    setShown(next);
    start(async () => {
      const error = await save(next);
      if (saving.current === next) saving.current = null;
      // Refused: back to what is saved (the value the page was given when the choice was made).
      if (error) setShown(value);
    });
  };
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const el = ref.current;
    if (el && el.value !== value && options.some(([v]) => v === el.value)) change(el.value as V);
    // Once, on the first render in the browser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <select
      ref={ref}
      aria-label={label}
      value={shown}
      // Never refilled by the browser: on Back (or Firefox's reload) it would put an earlier choice back in the select,
      // which the check above would then save over what is stored now (a KYC or role someone has changed since).
      autoComplete="off"
      disabled={pending}
      // Below md 44 px with 16 px text: iOS zooms into a smaller field when it is tapped.
      className={cn("h-11 rounded-md border border-input bg-background px-2 text-base md:h-8 md:text-xs", className)}
      onChange={(e) => change(e.target.value as V)}
    >
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}

/** `label`: the select's accessible name where several are on one page (the deal file's seller and buyer). */
export function KycSelect({
  userId,
  value,
  label,
  className,
}: {
  userId: string;
  value: "not_started" | "pending" | "verified";
  label?: string;
  className?: string;
}) {
  const t = useT("admin");
  const tc = useT("common");
  return (
    <SavedSelect
      value={value}
      className={className}
      label={label ?? t("kyc.label")}
      options={[
        ["not_started", tc("kyc.not_started")],
        ["pending", tc("kyc.pending")],
        ["verified", tc("kyc.verified")],
      ]}
      save={async (next) => {
        // Refused (the session ended, say): its message, and the select back on what is saved.
        const res = await setKycStatus(userId, next).catch(() => ({ error: t("kyc.failed") }));
        if ("error" in res && res.error) {
          toast.error(res.error);
          return res.error;
        }
        toast.success(t("kyc.updated"));
        return null;
      }}
    />
  );
}

export function RoleSelect({ userId, value, className }: { userId: string; value: "user" | "admin"; className?: string }) {
  const t = useT("admin");
  return (
    <SavedSelect
      value={value}
      className={className}
      label={t("role.label")}
      options={[
        ["user", t("role.user")],
        ["admin", t("role.admin")],
      ]}
      // A refused change (your own access, an owner account) leaves the role as it was, and the select shows it.
      save={async (next) => {
        const res = await setUserRole(userId, next).catch(() => ({ error: t("role.failed") }));
        const error = "error" in res ? res.error : null;
        if (error) toast.error(error);
        else toast.success(t("role.updated"));
        return error;
      }}
    />
  );
}

export function HandledToggle({ id, handled }: { id: string; handled: boolean }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={handled ? "ghost" : "outline"}
      className={cn(PHONE_BUTTON, handled && PHONE_OUTLINED)}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setInquiryHandled(id, !handled);
          if ("error" in res && res.error) toast.error(res.error);
        })
      }
    >
      {handled ? t("inquiry.reopen") : t("inquiry.markHandled")}
    </Button>
  );
}

/**
 * "Spam" on an inbox row, "Not spam" on the Spam tab (src/lib/spam.ts caught it; the team is notified once it is back,
 * unless it already had the notice).
 */
export function SpamToggle({ id, spam }: { id: string; spam: boolean }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={spam ? "outline" : "ghost"}
      className={cn(PHONE_BUTTON, !spam && PHONE_OUTLINED)}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setInquirySpam(id, !spam);
          if ("error" in res && res.error) toast.error(res.error);
          else if (!spam) toast.success(t("inquiry.spamMarked"));
          else toast.success("notified" in res && res.notified ? t("inquiry.spamCleared") : t("inquiry.spamClearedQuiet"));
        })
      }
    >
      {spam ? t("inquiry.notSpam") : t("inquiry.markSpam")}
    </Button>
  );
}

export function DeleteSamplesButton({ count }: { count: number }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  if (!count) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className={PHONE_BUTTON}
      disabled={pending}
      onClick={() => {
        if (!confirm(t("samples.confirm", { count }))) return;
        start(async () => {
          const res = await deleteSampleListings();
          if ("error" in res && res.error) toast.error(res.error);
          else toast.success(t("samples.removed"));
        });
      }}
    >
      <Trash2 /> {t("samples.remove", { count })}
    </Button>
  );
}

export function ResetPasswordButton({ userId, name, className }: { userId: string; name: string; className?: string }) {
  const t = useT("admin");
  const tc = useT("common");
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const copy = async () => {
    if (!temp) return;
    try {
      await navigator.clipboard.writeText(temp);
      toast.success(t("reset.copied"));
    } catch {
      toast.error(t("wa.copyFailed"));
    }
  };
  return (
    <>
      <Button
        ref={resetButton}
        size="sm"
        variant="ghost"
        className={cn(PHONE_BUTTON, PHONE_OUTLINED, className)}
        disabled={pending}
        title={t("reset.title")}
        onClick={() => {
          if (!confirm(t("reset.confirm", { name }))) return;
          start(async () => {
            const res = await resetUserPassword(userId);
            if ("error" in res && res.error) toast.error(res.error);
            else if ("password" in res && res.password) setTemp(res.password);
          });
        }}
      >
        <KeyRound /> {t("reset.button")}
      </Button>
      <Dialog open={!!temp} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            resetButton.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("reset.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("reset.dialogDesc", { name })}</DialogDescription>
          </DialogHeader>
          <Input readOnly dir="ltr" value={temp ?? ""} className="font-mono" onFocus={(e) => e.currentTarget.select()} />
          {/* Below lg: on a phone copying from a field takes a long press, so a button copies it; and one closes. */}
          <DialogFooter className="gap-2 lg:hidden">
            <DialogClose asChild>
              <Button variant="outline" className="h-11">
                {tc("close")}
              </Button>
            </DialogClose>
            <Button className="h-11" onClick={copy}>
              <Copy aria-hidden /> {t("reset.copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
