"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "@/components/LocaleLink";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { makeOffer } from "@/app/actions/market";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
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

export function OfferDialog({
  listingId,
  project,
  asking,
  signedIn,
  loginHref,
  disabledReason,
}: {
  listingId: string;
  project: string;
  asking: number;
  signedIn: boolean;
  loginHref: string;
  disabledReason?: string;
}) {
  const t = useT("deal");
  const tc = useT("common");
  const tl = useT("legal");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(makeOffer, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success(t("offer.sent"), { description: t("offer.sentDescription") });
    }
    // Only on a new result — not when the language (and so `t`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (disabledReason) {
    return (
      <Button size="lg" variant="gold" className="w-full" disabled>
        {disabledReason}
      </Button>
    );
  }

  if (!signedIn) {
    return (
      <Button asChild size="lg" variant="gold" className="w-full">
        <Link href={loginHref}>{t("offer.signIn")}</Link>
      </Button>
    );
  }

  const fe = state.fieldErrors ?? {};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="gold" className="w-full">
          {t("offer.cta")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("offer.title")}</DialogTitle>
          <DialogDescription>{t("offer.description", { project, amount: formatAED(asking, locale) })}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="listingId" value={listingId} />
          <Field label={t("offer.amount")} htmlFor="amount" error={fe.amount} hint={t("offer.amountHint")}>
            <Input id="amount" name="amount" type="number" min={0} step={1000} defaultValue={Math.round((asking * 0.95) / 1000) * 1000} required />
          </Field>
          <div className="space-y-2">
            <Label>{t("offer.financing")}</Label>
            <RadioGroup name="financing" defaultValue="cash" className="grid grid-cols-2 gap-2">
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
          <Field label={t("offer.message")} htmlFor="message" error={fe.message}>
            <Textarea id="message" name="message" placeholder={t("offer.placeholder")} />
          </Field>
          <FormMessage state={state} />
          <DialogFooter>
            <SubmitButton className="w-full" pendingText={tc("sending")}>
              {t("offer.submit")}
            </SubmitButton>
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
