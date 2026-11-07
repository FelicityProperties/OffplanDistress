"use client";

import { useActionState, useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "@/components/LocaleLink";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { makeOffer } from "@/app/actions/market";
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
import { formatAED, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The price card's full-width button; on a phone a long label ("Sign in to make an offer") fits the card or wraps. */
const CARD_TRIGGER = "w-full max-sm:h-auto max-sm:min-h-12 max-sm:whitespace-normal max-sm:px-4 max-sm:leading-tight";
/** The deal page's action bar on phones (src/components/deals/DealActionBar.tsx): a compact gold button (narrower
 * still below 360 px, where the price beside it needs the room). */
const BAR_TRIGGER = "h-11 rounded-xl px-4 text-sm font-semibold active:scale-[0.98] max-[359px]:px-3";

/** Arabic-Indic and Persian digits typed on an Arabic keyboard → Latin. */
const latinDigits = (s: string) => s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));

/**
 * The offer in whole dirhams, shown with thousands separators while it is typed ("1,723,000") and the caret kept after
 * the same digit; the form sends the digits alone. A text field with the number pad rather than type="number" (no
 * separators, spinner arrows, a scroll wheel that changes the figure). On a phone the keyboard's Done key closes the
 * keyboard, as the financing and the message come next; a desktop Enter still sends the offer.
 */
function AmountInput({ defaultValue, className, ...props }: Omit<React.ComponentProps<"input">, "defaultValue" | "value" | "onChange"> & { defaultValue: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [digits, setDigits] = useState(String(defaultValue));
  const digitsBeforeCaret = useRef<number | null>(null);
  const lastKey = useRef<string | null>(null);
  const text = digits ? formatNumber(Number(digits)) : "";

  useLayoutEffect(() => {
    const el = ref.current;
    const want = digitsBeforeCaret.current;
    if (!el || want == null || document.activeElement !== el) return;
    let pos = 0;
    for (let seen = 0; pos < text.length && seen < want; pos++) if (/\d/.test(text[pos])) seen++;
    el.setSelectionRange(pos, pos);
    digitsBeforeCaret.current = null;
  }, [text]);

  return (
    <Input
      ref={ref}
      {...props}
      type="text"
      inputMode="numeric"
      enterKeyHint="done"
      autoComplete="off"
      dir="ltr"
      value={text}
      onKeyDown={(e) => {
        lastKey.current = e.key;
        if (e.key === "Enter" && window.matchMedia("(pointer: coarse)").matches) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onChange={(e) => {
        // A pasted "1,723,000.00" keeps 1,723,000, not 172,300,000.
        const raw = latinDigits(e.target.value).replace(/[.٫]\d{0,2}$/, "");
        const caret = Math.min(e.target.selectionStart ?? raw.length, raw.length);
        let before = raw.slice(0, caret).replace(/\D/g, "").length;
        let next = raw.replace(/\D/g, "");
        // Backspace / Delete on a thousands comma removes the digit next to it.
        if (next === digits && raw.length < text.length) {
          if (lastKey.current === "Backspace" && before > 0) {
            next = next.slice(0, before - 1) + next.slice(before);
            before -= 1;
          } else if (lastKey.current === "Delete") {
            next = next.slice(0, before) + next.slice(before + 1);
          }
        }
        digitsBeforeCaret.current = before;
        setDigits(next.replace(/^0+(?=\d)/, "").slice(0, 10));
      }}
      className={cn("tabular rtl:text-end", className)}
    />
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
            const fd = new FormData(e.currentTarget);
            // The amount field shows thousands separators: the server reads whole dirhams.
            fd.set("amount", String(fd.get("amount") ?? "").replace(/\D/g, ""));
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
