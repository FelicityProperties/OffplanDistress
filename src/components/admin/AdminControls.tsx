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
import { LISTING_STATUS } from "@/lib/config";

export function ReviewButtons({ listingId }: { listingId: string }) {
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
            toast.success("Listing approved and published");
          })
        }
      >
        <Check /> Approve
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        <X /> Reject
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject listing</DialogTitle>
            <DialogDescription>The seller sees this reason on their dashboard.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Statement of account doesn't match the developer's records."
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await rejectListing(listingId, reason);
                  toast("Listing rejected");
                  setOpen(false);
                })
              }
            >
              Reject listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type EditProps = {
  listingId: string;
  status: keyof typeof LISTING_STATUS;
  verified: boolean;
  nocEligible: boolean;
  launchPrice: number | null;
  askingPrice: number;
  adminNotes: string | null;
  images: string[];
};

export function AdminListingForm(p: EditProps) {
  const [state, action] = useActionState(adminUpdateListing, {});
  useEffect(() => {
    if (state.ok) toast.success("Listing saved");
  }, [state]);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="listingId" value={p.listingId} />
      <Field label="Status" htmlFor="status" error={fe.status}>
        <select id="status" name="status" defaultValue={p.status} className={selectClass}>
          {Object.entries(LISTING_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Asking price (AED)" htmlFor="askingPrice" error={fe.askingPrice}>
        <Input id="askingPrice" name="askingPrice" type="number" min={0} defaultValue={p.askingPrice} />
      </Field>
      <Field
        label="Current developer launch price (AED)"
        htmlFor="launchPrice"
        error={fe.launchPrice}
        hint="For an equivalent new unit today — drives the discount badge"
      >
        <Input id="launchPrice" name="launchPrice" type="number" min={0} defaultValue={p.launchPrice ?? ""} />
      </Field>
      <div className="flex flex-col justify-center gap-3 pt-5">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="verified" defaultChecked={p.verified} /> SPA & payment history verified
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="nocEligible" defaultChecked={p.nocEligible} /> Meets developer&apos;s resale (NOC) threshold
        </label>
      </div>
      <Field label="Image URLs (one per line)" htmlFor="images" error={fe.images} className="sm:col-span-2" hint="https:// links or uploaded photos (/api/files/…)">
        <Textarea id="images" name="images" rows={3} defaultValue={p.images.join("\n")} />
      </Field>
      <Field label="Internal notes" htmlFor="adminNotes" error={fe.adminNotes} className="sm:col-span-2">
        <Textarea id="adminNotes" name="adminNotes" rows={3} defaultValue={p.adminNotes ?? ""} placeholder="Only visible to admins" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText="Saving…">Save listing</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function KycSelect({ userId, value }: { userId: string; value: "not_started" | "pending" | "verified" }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="KYC status"
      defaultValue={value}
      disabled={pending}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      onChange={(e) =>
        start(async () => {
          await setKycStatus(userId, e.target.value as typeof value);
          toast.success("KYC updated");
        })
      }
    >
      <option value="not_started">Not started</option>
      <option value="pending">In review</option>
      <option value="verified">Verified</option>
    </select>
  );
}

export function RoleSelect({ userId, value }: { userId: string; value: "user" | "admin" }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Role"
      defaultValue={value}
      disabled={pending}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      onChange={(e) =>
        start(async () => {
          const res = await setUserRole(userId, e.target.value as typeof value);
          if (res.error) toast.error(res.error);
          else toast.success("Role updated");
        })
      }
    >
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
  );
}

export function HandledToggle({ id, handled }: { id: string; handled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant={handled ? "ghost" : "outline"} disabled={pending} onClick={() => start(() => setInquiryHandled(id, !handled).then(() => {}))}>
      {handled ? "Reopen" : "Mark handled"}
    </Button>
  );
}

export function DeleteSamplesButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  if (!count) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete all ${count} sample listings? This can't be undone.`)) return;
        start(async () => {
          await deleteSampleListings();
          toast.success("Sample listings removed");
        });
      }}
    >
      <Trash2 /> Remove {count} sample listings
    </Button>
  );
}

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        title="Reset password"
        onClick={() => {
          if (!confirm(`Reset ${name}'s password? They'll be signed out everywhere.`)) return;
          start(async () => {
            const res = await resetUserPassword(userId);
            if ("error" in res && res.error) toast.error(res.error);
            else if ("password" in res && res.password) setTemp(res.password);
          });
        }}
      >
        <KeyRound /> Reset
      </Button>
      <Dialog open={!!temp} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>Share this with {name} securely. They can sign in with it right away.</DialogDescription>
          </DialogHeader>
          <Input readOnly value={temp ?? ""} className="font-mono" onFocus={(e) => e.currentTarget.select()} />
        </DialogContent>
      </Dialog>
    </>
  );
}
