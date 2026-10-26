"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { claimListing } from "@/app/actions/password";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { richText } from "@/content/legal/rich-text";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The claim link's form (src/components/auth/ClaimView.tsx). The ownership / authority / Terms confirmation is the
 * sell form's own (sell `confirm.*`). A new account also chooses its login email and password; an existing account,
 * already signed in, only confirms.
 */
export function ClaimForm({ token, existing, email }: { token: string; existing: boolean; email: string }) {
  const t = useT("password");
  const ts = useT("sell");
  const tc = useT("common");
  const tl = useT("legal");
  const [state, action] = useActionState(claimListing, {});
  const fe = state.fieldErrors ?? {};
  const ownershipError = fe.confirmOwnership?.[0];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {!existing && (
        <>
          <Field label={t("claim.email")} htmlFor="email" error={fe.email} hint={t("claim.emailHint")}>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              defaultValue={email}
              aria-invalid={fe.email ? true : undefined}
            />
          </Field>
          <Field label={t("field.password")} htmlFor="password" error={fe.password} hint={t("field.passwordHint")}>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={fe.password ? true : undefined}
            />
          </Field>
          <Field label={t("field.confirm")} htmlFor="confirm" error={fe.confirm}>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={fe.confirm ? true : undefined}
            />
          </Field>
        </>
      )}
      <div className="space-y-1.5">
        <label
          htmlFor="confirmOwnership"
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-relaxed transition has-[:checked]:border-primary/40 has-[:checked]:bg-accent/60",
            ownershipError && "border-destructive/50",
          )}
        >
          <input
            id="confirmOwnership"
            name="confirmOwnership"
            type="checkbox"
            required
            aria-invalid={ownershipError ? true : undefined}
            aria-describedby={ownershipError ? "confirmOwnership-error" : undefined}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <span>
            {richText(ts("confirm.label"), {
              terms: (
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ts("confirm.terms")}
                  <ExternalLink className="size-3.5 rtl:-scale-x-100" aria-hidden />
                  <span className="sr-only">{tl("newTab")}</span>
                </Link>
              ),
            })}
          </span>
        </label>
        {ownershipError && (
          <p id="confirmOwnership-error" className="text-xs font-medium text-destructive">
            {ownershipError}
          </p>
        )}
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText={tc("saving")}>
        {existing ? t("claim.submitExisting") : t("claim.submit")}
      </SubmitButton>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">{t("claim.after")}</p>
    </form>
  );
}
