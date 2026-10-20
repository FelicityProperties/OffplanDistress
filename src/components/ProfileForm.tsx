"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { requestKyc, updateProfile } from "@/app/actions/market";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export function ProfileForm({ fullName, phone, intent }: { fullName: string; phone: string | null; intent: string }) {
  const t = useT("dashboard");
  const tc = useT("common");
  const [state, action] = useActionState(updateProfile, {});
  useEffect(() => {
    if (state.ok) toast.success(t("profile.saved"));
    // Only on a new save result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label={t("profile.fullName")} htmlFor="fullName" error={fe.fullName}>
        <Input id="fullName" name="fullName" defaultValue={fullName} required dir="auto" />
      </Field>
      <Field label={t("profile.phone")} htmlFor="phone" error={fe.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} dir="ltr" />
      </Field>
      <Field label={t("profile.intent")} htmlFor="intent" error={fe.intent}>
        <select id="intent" name="intent" defaultValue={intent} className={selectClass}>
          <option value="buy">{t("profile.intent.buy")}</option>
          <option value="sell">{t("profile.intent.sell")}</option>
          <option value="both">{t("profile.intent.both")}</option>
        </select>
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText={tc("saving")}>{t("profile.save")}</SubmitButton>
    </form>
  );
}

export function RequestKycButton({ disabled }: { disabled?: boolean }) {
  const t = useT("dashboard");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await requestKyc();
          if (res.error) toast.error(res.error);
          else toast.success(t("profile.kycRequested"));
        })
      }
    >
      {t("profile.requestKyc")}
    </Button>
  );
}
