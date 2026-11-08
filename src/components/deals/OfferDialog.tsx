"use client";

import { useActionState, useEffect, useId, useState, useTransition } from "react";
import Link from "@/components/LocaleLink";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { makeOffer } from "@/app/actions/market";
import { useAmountField } from "@/components/amount-field";
import { Field, FormMessage } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { richText } from "@/content/legal/rich-text";
import { useLocale, useT } from "@/i18n/client";
import { formatAED } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The price card's full-width button; on a phone a long label ("Sign in to make an offer") fits the card or wraps. */
const CARD_TRIGGER = "w-full max-sm:h-auto max-sm:min-h-12 max-sm:whitespace-normal max-sm:px-4 max-sm:leading-tight";
/** The deal page's action bar on phones (src/components/deals/DealActionBar.tsx): a compact gold button (narrower
 * still below 360 px, where the price beside it needs the room). */
const BAR_TRIGGER = "h-11 rounded-xl px-4 text-sm font-semibold active:scale-[0.98] max-[359px]:px-3";

/**
 * The offer in whole dirhams, shown with thousands separators while it is typed ("1,723,000") and the caret kept after
 * the same digit; typed fils show but never count (useAmountField). The form sends the digits alone, under `name`. A
 * text field with the number pad rather than type="number" (no separators, spinner arrows, a scroll wheel that changes
 * the figure). On a phone the keyboard's Done key closes the keyboard, as the financing and the message come next; a
 * desktop Enter still sends the offer.
 */
function AmountInput({
  name,
  defaultValue,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "defaultValue" | "value" | "onChange"> & { defaultValue: number }) {
  const [digits, setDigits] = useState(String(defaultValue));
  const field = useAmountField(digits, setDigits, 10);
  return (
    <>
      <Input
        ref={field.ref}
        {...props}
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        autoComplete="off"
        dir="ltr"
        value={field.text}
        onKeyDown={(e) => {
          field.onKeyDown(e);
          if (e.key === "Enter" && window.matchMedia("(pointer: coarse)").matches) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        onChange={field.onChange}
        onBlur={field.onBlur}
        className={cn("tabular rtl:text-end", className)}
      />
      {name && <input type="hidden" name={name} value={digits} />}
    </>
  );
}

export function OfferDialog({
  listingId,
  project,
  asking,
  signedIn,
  loginHref,
  disabledReason,
  variant = "card",
}: {
  listingId: string;
  project: string;
  asking: number;
  signedIn: boolean;
  loginHref: string;
  disabledReason?: string;
  /** "card": the price card's full-width button; "bar": the phone action bar's compact one (nothing when disabled). */
  variant?: "card" | "bar";
}) {
  const t = useT("deal");
  const tc = useT("common");
  const tl = useT("legal");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(makeOffer, {});
  const [pending, start] = useTransition();
  // Names the financing radio group.
  const financingLabel = useId();
  const bar = variant === "bar";

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success(t("offer.sent"), { description: t("offer.sentDescription") });
    }
    // Only on a new result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (disabledReason) {
    if (bar) return null;
    return (
      <Button size="lg" variant="gold" className={CARD_TRIGGER} disabled>
        {disabledReason}
      </Button>
    );
  }

  if (!signedIn) {
    // The bar has room for the short label; the login page says why.
    return (
      <Button asChild size={bar ? undefined : "lg"} variant="gold" className={bar ? BAR_TRIGGER : CARD_TRIGGER}>
        <Link href={loginHref}>{t(bar ? "offer.cta" : "offer.signIn")}</Link>
      </Button>
    );
  }

  const fe = state.fieldErrors ?? {};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={bar ? undefined : "lg"} variant="gold" className={bar ? BAR_TRIGGER : CARD_TRIGGER}>
          {t("offer.cta")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("offer.title")}</DialogTitle>
          <DialogDescription>{t("offer.description", { project, amount: formatAED(asking, locale) })}</DialogDescription>
        </DialogHeader>
        {/* Submitted from onSubmit (not the form's action), so a field that needs fixing doesn't clear what was typed. */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            // The amount goes as whole dirhams, digits only (AmountInput's hidden field).
            const fd = new FormData(e.currentTarget);
            start(() => action(fd));
          }}
        >
          <input type="hidden" name="listingId" value={listingId} />
          <Field label={t("offer.amount")} htmlFor="amount" error={fe.amount} hint={t("offer.amountHint")}>
            {/* Any whole dirham: the asking price itself needn't be a round thousand. 95% is only a suggestion. */}
            <AmountInput id="amount" name="amount" defaultValue={Math.round((asking * 0.95) / 1000) * 1000} required className="max-md:h-11" />
          </Field>
          <div className="space-y-2">
            <Label id={financingLabel}>{t("offer.financing")}</Label>
            <RadioGroup name="financing" defaultValue="cash" aria-labelledby={financingLabel} className="grid grid-cols-2 gap-2">
              {(
                [
                  ["cash", tc("financing.cash")],
                  ["mortgage", t("offer.mortgage")],
                ] as const
              ).map(([v, l]) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value={v} />
                  {l}
                </label>
              ))}
            </RadioGroup>
          </div>
          <Field label={t("offer.message")} htmlFor="message" error={fe.message} hint={t("offer.messageHint")}>
            {/* The return key starts a new line: the message may run to several. */}
            <Textarea id="message" name="message" placeholder={t("offer.placeholder")} />
          </Field>
          <FormMessage state={state} />
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? tc("sending") : t("offer.submit")}
            </Button>
          </DialogFooter>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {richText(t("offer.legal"), {
              // New tab, so reading the terms doesn't lose the offer being typed.
              terms: (
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("offer.legal.terms")}
                  <ExternalLink className="size-3 rtl:-scale-x-100" aria-hidden />
                  <span className="sr-only">{tl("newTab")}</span>
                </Link>
              ),
            })}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
