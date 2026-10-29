"use client";

import { useActionState, useId } from "react";
import Link from "@/components/LocaleLink";
import { ArrowRight, MailCheck } from "lucide-react";
import { subscribeAction } from "@/app/actions/newsletter";
import { SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { richText } from "@/content/legal/rich-text";
import { useT } from "@/i18n/client";
import type { NewsletterSource } from "@/lib/newsletter";
import { cn } from "@/lib/utils";

type Variant = "band" | "inline" | "footer" | "page";

/**
 * The daily newsletter's sign-up form (src/lib/newsletter.ts), in the four places it appears: the home page band
 * (dark), the bar under the deals, the footer's first column (dark, with its own heading) and the /newsletter page.
 * "inline" and "footer" bring their own heading; "band" and "page" sit under the heading their section renders.
 * One email field, the consent line, a honeypot nobody sees; on success the form gives way to "check your inbox".
 */
export function NewsletterForm({
  variant,
  source,
  defaultEmail,
  className,
}: {
  variant: Variant;
  /** Where on the site the address is left; recorded with the consent. */
  source: NewsletterSource;
  /** A signed-in visitor's address. */
  defaultEmail?: string;
  className?: string;
}) {
  const t = useT("newsletter");
  const tc = useT("common");
  const [state, action] = useActionState(subscribeAction, {});
  const id = useId();
  const dark = variant === "band" || variant === "footer";
  const stacked = variant === "footer";
  // Keep the {email} slot so the address can be isolated from the surrounding (possibly RTL) text.
  const [sentBefore, sentAfter = ""] = t("form.successBody").split("{email}");

  const body = state.ok ? (
    <div
      role="status"
      data-testid="newsletter-done"
      className={cn("flex gap-3 rounded-xl px-4 py-3 text-sm", dark ? "glass-dark" : "bg-success-soft")}
    >
      <MailCheck className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-gold" : "text-success")} aria-hidden />
      <div className="min-w-0 space-y-1 wrap-anywhere">
        <p className={cn("font-medium", !dark && "text-success")}>{t("form.successTitle")}</p>
        <p className={dark ? "text-primary-foreground/70" : "text-muted-foreground"}>
          {sentBefore}
          <bdi dir="ltr" className={cn("font-medium", dark ? "text-primary-foreground" : "text-foreground")}>
            {state.email}
          </bdi>
          {sentAfter}
        </p>
      </div>
    </div>
  ) : (
    <form action={action} className="relative space-y-2.5" data-testid={`newsletter-form-${variant}`}>
      <input type="hidden" name="source" value={source} />
      {/* The honeypot: off-screen and skipped by keyboards and screen readers, so only a bot fills it. */}
      <div aria-hidden="true" className="absolute -start-[9999px] top-0 h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className={cn("flex flex-col gap-2.5", !stacked && "sm:flex-row")}>
        <Input
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          dir="ltr"
          aria-label={t("form.label")}
          placeholder={t("form.placeholder")}
          defaultValue={defaultEmail}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? `${id}-error` : undefined}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-lg bg-card rtl:text-end",
            dark &&
              "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-gold",
          )}
        />
        <SubmitButton
          variant={dark ? "gold" : "default"}
          className={cn("h-11 shrink-0 rounded-lg", stacked && "w-full")}
          pendingText={tc("sending")}
        >
          {t("form.submit")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
        </SubmitButton>
      </div>
      {state.error && (
        <p id={`${id}-error`} role="alert" className={cn("text-xs font-medium", dark ? "text-gold" : "text-destructive")}>
          {state.error}
        </p>
      )}
      <p className={cn("text-xs leading-relaxed", dark ? "text-primary-foreground/60" : "text-muted-foreground")}>
        {richText(t("form.consent"), {
          privacy: (
            <Link
              href="/privacy"
              className={cn(
                "font-medium underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dark ? "text-primary-foreground/85" : "text-foreground",
              )}
            >
              {t("form.privacy")}
            </Link>
          ),
        })}
      </p>
    </form>
  );

  if (variant === "inline") {
    return (
      <div
        data-testid="newsletter-inline"
        className={cn(
          "grid gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center",
          className,
        )}
      >
        <div>
          <h2 className="text-lg font-semibold leading-snug">{t("inline.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("inline.body")}</p>
        </div>
        {body}
      </div>
    );
  }
  if (variant === "footer") {
    return (
      <div data-testid="newsletter-footer" className={cn("max-w-sm", className)}>
        <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">{t("footer.title")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-primary-foreground/65">{t("footer.body")}</p>
        <div className="mt-4">{body}</div>
      </div>
    );
  }
  return <div className={className}>{body}</div>;
}
