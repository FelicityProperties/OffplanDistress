"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type RefObject } from "react";
import Link from "@/components/LocaleLink";
import { Building2, ExternalLink, KeyRound, Repeat } from "lucide-react";
import { login, signup, type FormState } from "@/app/actions/auth";
import { AttributionField } from "@/components/Attribution";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { richText } from "@/content/legal/rich-text";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Both forms are sent from onSubmit, so a refused try (a wrong password, an address that already has an account) keeps
 * what was typed: React empties a form once its own action has run. The action stays on the form for a submit before
 * the page's script has loaded, which then posts to the server as without script. SubmitButton still shows the
 * pending state (React marks the form pending for a transition its submit event started).
 */
function useSubmit(action: (fd: FormData) => void) {
  const [, start] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(() => action(fd));
  };
}

/** After a refusal, focus goes to the first field to fix, where a screen reader reads its error (Field). */
function useFocusFirstError(form: RefObject<HTMLFormElement | null>, state: FormState) {
  useEffect(() => {
    if (state.fieldErrors && Object.values(state.fieldErrors).some((e) => e?.length)) {
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [form, state]);
}

export function LoginForm({ next, lead }: { next?: string; lead?: string }) {
  const t = useT("auth");
  const tc = useT("common");
  const [state, action] = useActionState(login, {});
  const submit = useSubmit(action);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const fe = state.fieldErrors ?? {};
  const passwordError = fe.password?.[0];
  return (
    <form ref={formRef} action={action} onSubmit={submit} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {lead && <input type="hidden" name="lead" value={lead} />}
      {/* The keyboard's return key reads "next" on the address and "go" on the password (it submits from either). */}
      <Field label={t("field.email")} htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" dir="ltr" required autoComplete="email" enterKeyHint="next" />
      </Field>
      <div className="space-y-1.5 max-lg:space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">{t("field.password")}</Label>
          {/* Below lg a 44 px target with 14 px text (it was a 12 px link 6 px above the field). */}
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline max-lg:-me-2 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center max-lg:px-2 max-lg:text-sm"
          >
            {t("login.forgot")}
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          enterKeyHint="go"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-msg" : undefined}
        />
        {passwordError && (
          <p id="password-msg" className="text-xs font-medium text-destructive">
            {passwordError}
          </p>
        )}
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText={t("login.pending")}>
        {tc("logIn")}
      </SubmitButton>
    </form>
  );
}

const roles = [
  { v: "buy", icon: KeyRound },
  { v: "sell", icon: Building2 },
  { v: "both", icon: Repeat },
] as const;

export function SignupForm({ next, intent, lead }: { next?: string; intent?: string; lead?: string }) {
  const t = useT("auth");
  const tl = useT("legal");
  const [state, action] = useActionState(signup, {});
  const submit = useSubmit(action);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const [role, setRole] = useState<string>(roles.some((r) => r.v === intent) ? intent! : "buy");
  // Checked in the browser first so a forgotten tick doesn't cost a round trip; the server action enforces it too.
  const termsRef = useRef<HTMLInputElement>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const fe = state.fieldErrors ?? {};
  const acceptTermsError = termsError ?? fe.acceptTerms?.[0];
  const legalLink = "font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        if (termsRef.current && !termsRef.current.checked) {
          e.preventDefault();
          setTermsError(t("signup.acceptTerms.error"));
          termsRef.current.focus();
          return;
        }
        submit(e);
      }}
    >
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="intent" value={role} />
      {lead && <input type="hidden" name="lead" value={lead} />}
      <AttributionField />
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("signup.roleGroup")}>
        {roles.map((r) => (
          <button
            type="button"
            role="radio"
            aria-checked={role === r.v}
            key={r.v}
            onClick={() => setRole(r.v)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition",
              role === r.v ? "border-primary bg-accent" : "hover:bg-muted",
            )}
          >
            <r.icon className="h-5 w-5" />
            {t(`signup.role.${r.v}`)}
          </button>
        ))}
      </div>
      {/* The return key reads "next" down the form and "go" on the password, the last field typed in. */}
      <Field label={t("field.fullName")} htmlFor="fullName" error={fe.fullName}>
        <Input id="fullName" name="fullName" required maxLength={120} autoComplete="name" enterKeyHint="next" />
      </Field>
      <Field label={t("field.email")} htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" dir="ltr" required autoComplete="email" enterKeyHint="next" />
      </Field>
      <Field label={t("field.phone")} htmlFor="phone" error={fe.phone}>
        <Input id="phone" name="phone" type="tel" dir="ltr" autoComplete="tel" placeholder="+971 5X XXX XXXX" enterKeyHint="next" />
      </Field>
      <Field label={t("field.password")} htmlFor="password" error={fe.password} hint={t("field.passwordHint")}>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" enterKeyHint="go" />
      </Field>
      <div className="space-y-1.5">
        <label
          htmlFor="acceptTerms"
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-relaxed text-muted-foreground transition has-[:checked]:border-primary/40 has-[:checked]:bg-accent/60",
            acceptTermsError && "border-destructive/50",
          )}
        >
          <input
            ref={termsRef}
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            value="on"
            aria-required="true"
            aria-invalid={acceptTermsError ? true : undefined}
            aria-describedby={acceptTermsError ? "acceptTerms-error" : undefined}
            onChange={() => setTermsError(null)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <span>
            {richText(t("signup.acceptTerms"), {
              // New tab, so reading them doesn't wipe the form being filled in.
              terms: (
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className={legalLink}>
                  {t("signup.acceptTerms.terms")}
                  <ExternalLink className="ms-0.5 inline size-3 align-baseline rtl:-scale-x-100" aria-hidden />
                  <span className="sr-only">{tl("newTab")}</span>
                </Link>
              ),
              privacy: (
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={legalLink}>
                  {t("signup.acceptTerms.privacy")}
                  <ExternalLink className="ms-0.5 inline size-3 align-baseline rtl:-scale-x-100" aria-hidden />
                  <span className="sr-only">{tl("newTab")}</span>
                </Link>
              ),
            })}
          </span>
        </label>
        {acceptTermsError && (
          <p id="acceptTerms-error" className="text-xs font-medium text-destructive">
            {acceptTermsError}
          </p>
        )}
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText={t("signup.pending")}>
        {t("signup.submit")}
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">{t("signup.consent")}</p>
    </form>
  );
}
