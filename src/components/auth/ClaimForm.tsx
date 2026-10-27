"use client";

import { useActionState, useTransition } from "react";
import Link from "@/components/LocaleLink";
import { ExternalLink, Loader2 } from "lucide-react";
import { claimListing } from "@/app/actions/password";
import { Field, FormMessage } from "@/components/forms";
import { Button } from "@/components/ui/button";
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
  const [pending, start] = useTransition();
  const fe = state.fieldErrors ?? {};
  const ownershipError = fe.confirmOwnership?.[0];

  return (
    // Submitted from onSubmit (not the form's action) so a field that needs fixing doesn't clear the others.
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => action(fd));
      }}
    >
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
            {/* A new account also accepts the Privacy Policy, as the sign-up form asks; an existing one already has. */}
            {richText(existing ? ts("confirm.label") : t("claim.confirmNew"), {
              terms: <LegalLink href="/terms" label={ts("confirm.terms")} newTab={tl("newTab")} />,
              privacy: <LegalLink href="/privacy" label={t("claim.privacy")} newTab={tl("newTab")} />,
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
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? tc("saving") : existing ? t("claim.submitExisting") : t("claim.submit")}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">{t("claim.after")}</p>
    </form>
  );
}

/** Inline (not inline-flex), so the Arabic "و" typed before a link stays on the same line as it. */
function LegalLink({ href, label, newTab }: { href: string; label: string; newTab: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
      <ExternalLink className="ms-1 inline size-3.5 align-[-0.125em] rtl:-scale-x-100" aria-hidden />
      <span className="sr-only">{newTab}</span>
    </Link>
  );
}
