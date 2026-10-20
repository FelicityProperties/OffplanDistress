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
import { useT } from "@/i18n/client";
import { LISTING_STATUS, type ListingStatusKey } from "@/lib/config";

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
            await approveListing(listingId);
            toast.success(t("review.approved"));
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
  adminNotes: string | null;
  images: string[];
};

export function AdminListingForm(p: EditProps) {
  const t = useT("admin");
  const tc = useT("common");
  const [state, action] = useActionState(adminUpdateListing, {});
  useEffect(() => {
    if (state.ok) toast.success(t("form.saved"));
  }, [state, t]);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="listingId" value={p.listingId} />
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
      <Field
        label={t("form.launchPrice")}
        htmlFor="launchPrice"
        error={fe.launchPrice}
        hint={t("form.launchPriceHint")}
      >
        <Input id="launchPrice" name="launchPrice" type="number" min={0} defaultValue={p.launchPrice ?? ""} />
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
