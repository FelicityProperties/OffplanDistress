"use client";

import { useActionState } from "react";
import Link from "@/components/LocaleLink";
import { MailCheck, MailWarning } from "lucide-react";
import { requestPasswordReset, resetPassword } from "@/app/actions/password";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export function ForgotPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const t = useT("password");
  const tc = useT("common");
  const [state, action] = useActionState(requestPasswordReset, {});
  const fe = state.fieldErrors ?? {};
  // Keep the {email} slot so the address can be isolated from the surrounding (possibly RTL) text.
  const [sentBefore, sentAfter = ""] = t("forgot.sentBody").split("{email}");

  return (
    <div className="space-y-4">
      {state.ok && state.noEmail ? (
        <div role="status" className="flex gap-3 rounded-lg bg-warning-soft px-4 py-3 text-sm">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="font-medium">{t("forgot.noEmailTitle")}</p>
            <p className="text-muted-foreground">{t("forgot.noEmailBody")}</p>
            <Link href="/contact" className="inline-block font-medium text-foreground underline underline-offset-4">
              {tc("contactUs")}
            </Link>
          </div>
        </div>
      ) : state.ok ? (
        <div role="status" className="flex gap-3 rounded-lg bg-success-soft px-4 py-3 text-sm">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="space-y-1">
            <p className="font-medium text-success">{t("forgot.sentTitle")}</p>
            <p className="text-muted-foreground">
              {sentBefore}
              <bdi className="font-medium text-foreground">{state.email}</bdi>
              {sentAfter}
            </p>
          </div>
        </div>
      ) : null}
      <form action={action} className="space-y-4">
        <Field label={t("field.email")} htmlFor="email" error={fe.email}>
          <Input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            required
            autoComplete="email"
            defaultValue={state.email ?? defaultEmail}
          />
        </Field>
        <FormMessage state={state} />
        <SubmitButton className="w-full" size="lg" pendingText={tc("sending")}>
          {state.ok && !state.noEmail ? t("forgot.resend") : t("forgot.submit")}
        </SubmitButton>
      </form>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT("password");
  const tc = useT("common");
  const [state, action] = useActionState(resetPassword, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label={t("field.password")} htmlFor="password" error={fe.password} hint={t("field.passwordHint")}>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label={t("field.confirm")} htmlFor="confirm" error={fe.confirm}>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      {state.invalidToken ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{state.error}</p>
          <Link href="/forgot-password" className="mt-1 inline-block font-medium underline underline-offset-4">
            {t("reset.requestNew")}
          </Link>
        </div>
      ) : (
        <FormMessage state={state} />
      )}
      <SubmitButton className="w-full" size="lg" pendingText={tc("saving")}>
        {t("reset.submit")}
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">{t("reset.signOutNote")}</p>
    </form>
  );
}
