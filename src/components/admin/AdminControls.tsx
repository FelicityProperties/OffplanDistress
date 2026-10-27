"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Check, KeyRound, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminUpdateListing,
  approveListing,
  deleteSampleListings,
  rejectListing,
  resetUserPassword,
  setInquiryHandled,
  setKycStatus,
  setUserRole,
} from "@/app/actions/admin";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/i18n/client";
import { COMMUNITIES, DEVELOPERS, LISTING_STATUS, type ListingStatusKey } from "@/lib/config";
import { communityName, developerName } from "@/lib/place-names";

export function ReviewButtons({ listingId }: { listingId: string }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const rejectButton = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="success"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await approveListing(listingId);
            if ("error" in res && res.error) toast.error(res.error);
            else toast.success(t("review.approved"));
          })
        }
      >
        <Check /> {t("review.approve")}
      </Button>
      <Button ref={rejectButton} size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        <X /> {t("review.reject")}
      </Button>
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
          <DialogFooter>
            <Button
              variant="destructive"
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
      <Field label={t("form.status")} htmlFor="status" error={fe.status}>
        <select id="status" name="status" defaultValue={p.status} className={selectClass}>
          {(Object.keys(LISTING_STATUS) as ListingStatusKey[]).map((k) => (
            <option key={k} value={k}>
              {tc(`listing.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("form.askingPrice")} htmlFor="askingPrice" error={fe.askingPrice}>
        <Input id="askingPrice" name="askingPrice" type="number" min={0} defaultValue={p.askingPrice} />
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
        <Input id="launchPrice" name="launchPrice" type="number" min={0} defaultValue={p.launchPrice ?? ""} />
      </Field>
      {p.amountPaid != null && (
        <Field label={t("form.amountPaid")} htmlFor="amountPaid" error={fe.amountPaid} hint={t("form.amountPaidHint")}>
          <Input
            id="amountPaid"
            name="amountPaid"
            type="number"
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
      <div className="flex flex-col justify-center gap-3 pt-5">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="verified" defaultChecked={p.verified} /> {t("form.verified")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="nocEligible" defaultChecked={p.nocEligible} /> {t("form.nocEligible")}
        </label>
      </div>
      <Field label={t("form.images")} htmlFor="images" error={fe.images} className="sm:col-span-2" hint={t("form.imagesHint")}>
        <Textarea id="images" name="images" rows={3} dir="ltr" defaultValue={p.images.join("\n")} />
      </Field>
      <Field label={t("form.notes")} htmlFor="adminNotes" error={fe.adminNotes} className="sm:col-span-2">
        <Textarea id="adminNotes" name="adminNotes" rows={3} defaultValue={p.adminNotes ?? ""} placeholder={t("form.notesPlaceholder")} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
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
}: {
  value: V;
  label: string;
  options: [V, string][];
  save: (next: V) => Promise<string | null>;
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
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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

export function KycSelect({ userId, value }: { userId: string; value: "not_started" | "pending" | "verified" }) {
  const t = useT("admin");
  const tc = useT("common");
  return (
    <SavedSelect
      value={value}
      label={t("kyc.label")}
      options={[
        ["not_started", tc("kyc.not_started")],
        ["pending", tc("kyc.pending")],
        ["verified", tc("kyc.verified")],
      ]}
      save={async (next) => {
        try {
          await setKycStatus(userId, next);
          toast.success(t("kyc.updated"));
          return null;
        } catch {
          toast.error(t("kyc.failed"));
          return t("kyc.failed");
        }
      }}
    />
  );
}

export function RoleSelect({ userId, value }: { userId: string; value: "user" | "admin" }) {
  const t = useT("admin");
  return (
    <SavedSelect
      value={value}
      label={t("role.label")}
      options={[
        ["user", t("role.user")],
        ["admin", t("role.admin")],
      ]}
      // A refused change (your own access, an owner account) leaves the role as it was, and the select shows it.
      save={async (next) => {
        const res = await setUserRole(userId, next).catch(() => ({ error: t("role.failed") }));
        if (res.error) toast.error(res.error);
        else toast.success(t("role.updated"));
        return res.error ?? null;
      }}
    />
  );
}

export function HandledToggle({ id, handled }: { id: string; handled: boolean }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant={handled ? "ghost" : "outline"} disabled={pending} onClick={() => start(() => setInquiryHandled(id, !handled).then(() => {}))}>
      {handled ? t("inquiry.reopen") : t("inquiry.markHandled")}
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
      disabled={pending}
      onClick={() => {
        if (!confirm(t("samples.confirm", { count }))) return;
        start(async () => {
          await deleteSampleListings();
          toast.success(t("samples.removed"));
        });
      }}
    >
      <Trash2 /> {t("samples.remove", { count })}
    </Button>
  );
}

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={resetButton}
        size="sm"
        variant="ghost"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
