"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { requestKyc, updateProfile } from "@/app/actions/market";
import { Field, FormMessage } from "@/components/forms";
import { selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export function ProfileForm({ fullName, phone, intent }: { fullName: string; phone: string | null; intent: string }) {
  const t = useT("dashboard");
  const tc = useT("common");
  const [state, action] = useActionState(updateProfile, {});
  const [pending, start] = useTransition();
  useEffect(() => {
    if (state.ok) toast.success(t("profile.saved"));
    // Only on a new save result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};
  return (
    // Submitted from onSubmit (not the form's action), so a field that needs fixing doesn't reset what was typed.
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
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
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? tc("saving") : t("profile.save")}
      </Button>
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
