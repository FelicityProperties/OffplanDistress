"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, KeyRound, Trash2, X } from "lucide-react";
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
import { Field, FormMessage, SubmitButton } from "@/components/forms";
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
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        <X /> {t("review.reject")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
                  await rejectListing(listingId, reason);
                  toast(t("review.rejected"));
                  setOpen(false);
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
  status: ListingStatusKey;
  verified: boolean;
  nocEligible: boolean;
  launchPrice: number | null;
  askingPrice: number;
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
  useEffect(() => {
    if (state.ok) toast.success(t("form.saved"));
    // Only on a new save result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};
  return (
    // noValidate: the server checks every field and answers in the page's language, next to the field (the browser's
    // own bubbles follow the browser's language); min/max on the dates still limit the date picker.
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2">
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
        <SubmitButton pendingText={tc("saving")}>{t("form.save")}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function KycSelect({ userId, value }: { userId: string; value: "not_started" | "pending" | "verified" }) {
  const t = useT("admin");
  const tc = useT("common");
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("kyc.label")}
      defaultValue={value}
      disabled={pending}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      onChange={(e) =>
        start(async () => {
          await setKycStatus(userId, e.target.value as typeof value);
          toast.success(t("kyc.updated"));
        })
      }
    >
      <option value="not_started">{tc("kyc.not_started")}</option>
      <option value="pending">{tc("kyc.pending")}</option>
      <option value="verified">{tc("kyc.verified")}</option>
    </select>
  );
}

export function RoleSelect({ userId, value }: { userId: string; value: "user" | "admin" }) {
  const t = useT("admin");
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("role.label")}
      defaultValue={value}
      disabled={pending}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      onChange={(e) =>
        start(async () => {
          const res = await setUserRole(userId, e.target.value as typeof value);
          if (res.error) toast.error(res.error);
          else toast.success(t("role.updated"));
        })
      }
    >
      <option value="user">{t("role.user")}</option>
      <option value="admin">{t("role.admin")}</option>
    </select>
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
  return (
    <>
      <Button
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
        <DialogContent>
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
