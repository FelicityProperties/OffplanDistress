"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { requestKyc, updateProfile } from "@/app/actions/market";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({ fullName, phone, intent }: { fullName: string; phone: string | null; intent: string }) {
  const [state, action] = useActionState(updateProfile, {});
  useEffect(() => {
    if (state.ok) toast.success("Profile saved");
  }, [state]);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="Full name" htmlFor="fullName" error={fe.fullName}>
        <Input id="fullName" name="fullName" defaultValue={fullName} required />
      </Field>
      <Field label="Mobile / WhatsApp" htmlFor="phone" error={fe.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} />
      </Field>
      <Field label="I'm here to" htmlFor="intent" error={fe.intent}>
        <select id="intent" name="intent" defaultValue={intent} className={selectClass}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
          <option value="both">Buy and sell</option>
        </select>
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function RequestKycButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          await requestKyc();
          toast.success("Verification requested — our team will contact you");
        })
      }
    >
      Request verification
    </Button>
  );
}
