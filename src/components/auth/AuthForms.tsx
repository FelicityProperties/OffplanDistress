"use client";

import { useActionState, useState } from "react";
import { Building2, KeyRound, Repeat } from "lucide-react";
import { login, signup } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password}>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}

const roles = [
  { v: "buy", l: "I want to buy", icon: KeyRound },
  { v: "sell", l: "I want to sell", icon: Building2 },
  { v: "both", l: "Both", icon: Repeat },
] as const;

export function SignupForm({ next, intent }: { next?: string; intent?: string }) {
  const [state, action] = useActionState(signup, {});
  const [role, setRole] = useState<string>(roles.some((r) => r.v === intent) ? intent! : "buy");
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="intent" value={role} />
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="I want to">
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
            {r.l}
          </button>
        ))}
      </div>
      <Field label="Full name" htmlFor="fullName" error={fe.fullName}>
        <Input id="fullName" name="fullName" required autoComplete="name" />
      </Field>
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Mobile / WhatsApp (optional)" htmlFor="phone" error={fe.phone}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+971 5X XXX XXXX" />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password} hint="At least 8 characters">
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to be contacted by our team about your listings and offers.
      </p>
    </form>
  );
}
