"use client";

import { useId, useLayoutEffect, useRef, useState, useTransition, type ComponentProps, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Info } from "lucide-react";
import { toast } from "sonner";
import { respondToOffer } from "@/app/actions/market";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs } from "@/components/ui/tabs";
import { useLocale, useT } from "@/i18n/client";
import type { ListingStatusKey } from "@/lib/config";
import { formatAED, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Status = "pending" | "accepted" | "declined" | "countered" | "withdrawn";

/**
 * Below lg (phones, tablets): 44 px buttons with 14 px labels, 8 px apart, that wrap instead of running off a narrow card;
 * on a phone the row takes the card's width and the buttons share it (three in a row where they fit, as at 390 px, else
 * two and one). From lg nothing changes. The caller gives the row a line of its own.
 */
const ROW = "flex items-center justify-end gap-1 max-lg:flex-wrap max-lg:gap-2 max-sm:w-full";
const ACTION = "max-lg:h-11 max-lg:px-3 max-lg:text-sm max-sm:flex-1";
/** A ghost button reads as loose text once it is that big: below lg it is outlined, like Counter. */
const OUTLINED = "max-lg:border max-lg:border-input max-lg:bg-background max-lg:shadow-sm";
/** The phone shell (globals.css), where answering an offer takes a confirmation. */
const PHONE = "(max-width: 1023.98px)";

/**
 * Only a live unit can take an offer. Once a deal is agreed on it, its other open offers are backups: they can be
 * declined or withdrawn, not accepted. The tag opens its explanation on a tap or click (no hover on a phone), as a
 * popover that Escape or a tap outside closes and screen readers announce as a labelled dialog.
 */
function BackupTag({ listingStatus }: { listingStatus: ListingStatusKey }) {
  const t = useT("dashboard");
  const titleId = useId();
  if (listingStatus !== "under_offer" && listingStatus !== "noc_in_progress") return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="me-1 inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:min-h-11"
        >
          {t("offerAction.backup")}
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-labelledby={titleId}
        className="w-72 max-w-[calc(100vw-2rem)] p-3 text-start text-sm leading-relaxed"
      >
        <p id={titleId} className="font-semibold">
          {t("offerAction.backup")}
        </p>
        <p className="mt-1 text-muted-foreground">{t("offerAction.backupHint")}</p>
      </PopoverContent>
    </Popover>
  );
}

type Ask = { title: string; body: string; label: string; positive?: boolean; go: () => void };

/**
 * On a phone an answer is a big button under the thumb, and it can't be taken back (the other side is told at once): it
 * is confirmed in a sheet first. From lg (a mouse) one click answers, as before: `confirm(e, …)` runs `go` straight
 * away there. `sheet` is rendered once by the component.
 */
function useConfirm() {
  const tc = useT("common");
  const [ask, setAsk] = useState<Ask | null>(null);
  const [open, setOpen] = useState(false);
  const from = useRef<HTMLElement | null>(null);
  const confirm = (e: MouseEvent<HTMLElement>, a: Ask) => {
    if (!window.matchMedia(PHONE).matches) return a.go();
    from.current = e.currentTarget;
    setAsk(a);
    setOpen(true);
  };
  const sheet = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent
        onCloseAutoFocus={(e) => {
          // Opened by a button outside it (no trigger): focus goes back there, while that button is still on the page.
          e.preventDefault();
          from.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
          <AlertDialogDescription>{ask?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="max-lg:h-11">{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(ask?.positive && buttonVariants({ variant: "success" }), "max-lg:h-11")}
            onClick={() => ask?.go()}
          >
            {ask?.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, sheet };
}

/** Arabic-Indic and Persian digits (typed on an Arabic keyboard) as Latin ones. */
function latinDigits(s: string) {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/**
 * A whole-dirham amount: the currency beside it ("AED" before it, "درهم" after it in Arabic, as formatAED writes them),
 * thousands separators as it is typed (the caret stays after the same digit) and the number pad on a phone. Controlled
 * (`value` / `onValue`, digits only) or, in a form, uncontrolled from `defaultValue`, with the digits sent under `name`:
 * the server reads a plain number, not "820,000".
 */
export function AedInput({
  id,
  name,
  value,
  defaultValue,
  onValue,
  className,
  ...rest
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: number | null;
  onValue?: (digits: string) => void;
  className?: string;
} & Pick<ComponentProps<"input">, "required" | "enterKeyHint" | "placeholder" | "aria-invalid" | "aria-describedby">) {
  const locale = useLocale();
  const [own, setOwn] = useState(defaultValue == null ? "" : String(defaultValue));
  const digits = value ?? own;
  const text = digits ? formatNumber(Number(digits)) : "";
  const ref = useRef<HTMLInputElement>(null);
  const digitsBeforeCaret = useRef<number | null>(null);
  const lastKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const want = digitsBeforeCaret.current;
    if (!el || want == null || document.activeElement !== el) return;
    digitsBeforeCaret.current = null;
    let pos = 0;
    for (let seen = 0; pos < text.length && seen < want; pos++) if (/\d/.test(text[pos])) seen++;
    el.setSelectionRange(pos, pos);
  }, [text]);

  const unit = (
    <span aria-hidden className="shrink-0 text-sm font-medium text-muted-foreground">
      {locale === "ar" ? "درهم" : "AED"}
    </span>
  );
  return (
    // Looks like the Input (src/components/ui/input.tsx): the field's border and focus ring are on this box.
    <div
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring max-lg:h-11",
        className,
      )}
    >
      {locale !== "ar" && unit}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        value={text}
        onKeyDown={(e) => {
          lastKey.current = e.key;
        }}
        onChange={(e) => {
          // Whole dirhams: a statement's "540,000.00" keeps 540,000, not 54,000,000.
          const raw = latinDigits(e.target.value).replace(/[.٫]\d{0,2}$/, "");
          const caret = Math.min(e.target.selectionStart ?? raw.length, raw.length);
          let before = raw.slice(0, caret).replace(/\D/g, "").length;
          let next = raw.replace(/\D/g, "");
          // Backspace / Delete on a thousands separator takes the digit beside it.
          if (next === digits && raw.length < text.length) {
            if (lastKey.current === "Backspace" && before > 0) {
              next = next.slice(0, before - 1) + next.slice(before);
              before -= 1;
            } else if (lastKey.current === "Delete") next = next.slice(0, before) + next.slice(before + 1);
          }
          const lead = next.length - next.replace(/^0+(?=\d)/, "").length;
          next = next.slice(lead, lead + 12);
          digitsBeforeCaret.current = Math.max(0, before - lead);
          if (onValue) onValue(next);
          else setOwn(next);
        }}
        // w-0: it fills the box (flex-1) but adds no width of its own; an input is 20 characters wide by default, 320 px
        // in the Arabic font, which pushed the counter dialog past a phone's screen.
        className="h-full w-0 min-w-0 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        {...rest}
      />
      {locale === "ar" && unit}
      {name && <input type="hidden" name={name} value={digits} />}
    </div>
  );
}

/**
 * Seller-side controls for an offer on their listing (also the admin console's, on the seller's behalf). `className`
 * places the row: on a phone it needs a line of its own (its buttons share the card's width).
 */
export function SellerOfferActions({
  offerId,
  status,
  amount,
  updatedAt,
  askingPrice,
  listingStatus,
  className,
}: {
  offerId: string;
  status: Status;
  amount: number;
  /** The offer's updated_at as this page shows it (ISO): a revision since (financing, message) refuses the answer. */
  updatedAt: string;
  /** The unit's asking price: the suggested counter never goes above it. */
  askingPrice?: number;
  listingStatus: ListingStatusKey;
  className?: string;
}) {
  const t = useT("dashboard");
  const tc = useT("common");
  const te = useT("errors");
  const locale = useLocale();
  const inputId = useId();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const counterButton = useRef<HTMLButtonElement>(null);
  const { confirm, sheet } = useConfirm();
  // Suggested: 5% over the offer, but no more than the seller's own asking price (rarely what a seller means to ask),
  // unless the offer already meets it: a counter is always above the offer. Until the seller types a figure the box
  // follows the offer shown, so after a buyer's revision (the page refreshes to it) the suggestion is made anew.
  const meetsAsking = askingPrice != null && amount >= askingPrice;
  const suggested = Math.round(amount * 1.05);
  const [typed, setTyped] = useState<string | null>(null);
  const counter = typed ?? String(askingPrice != null && !meetsAsking ? Math.min(askingPrice, suggested) : suggested);
  // Whole dirhams, as the server rounds it.
  const figure = Math.round(Number(counter));
  const aboveAsking = askingPrice != null && !meetsAsking && figure > askingPrice;
  // At or below the offer it isn't a counter (the server refuses it too): accepting gets the seller that price.
  const notAbove = !(figure > amount);
  const offered = formatAED(amount, locale);

  const run = (action: "accept" | "decline" | "counter", value?: number) =>
    start(async () => {
      // With the offer as this row shows it: should the buyer have changed it since, the server says so instead.
      const res = await respondToOffer(offerId, action, value, amount, updatedAt);
      if (res.error) toast.error(res.error);
      else {
        toast.success(
          t(
            action === "accept"
              ? "offerAction.accepted"
              : action === "counter"
                ? "offerAction.counterSent"
                : "offerAction.declined",
          ),
        );
        setOpen(false);
      }
    });

  if (status !== "pending") return null;
  // A counter is an acceptance waiting on the buyer, so it needs a live unit too.
  const live = listingStatus === "live";
  return (
    <div className={cn(ROW, className)}>
      <BackupTag listingStatus={listingStatus} />
      {live && (
        <>
          <Button
            size="sm"
            variant="success"
            className={ACTION}
            disabled={pending}
            onClick={(e) =>
              confirm(e, {
                title: t("offerAction.confirmAccept", { amount: offered }),
                body: t("offerAction.confirmAcceptBody"),
                label: tc("accept"),
                positive: true,
                go: () => run("accept"),
              })
            }
          >
            <Check /> {tc("accept")}
          </Button>
          <Button ref={counterButton} size="sm" variant="outline" className={ACTION} disabled={pending} onClick={() => setOpen(true)}>
            {tc("counter")}
          </Button>
        </>
      )}
      <Button
        size="sm"
        variant="ghost"
        className={cn(ACTION, OUTLINED)}
        disabled={pending}
        onClick={(e) =>
          confirm(e, {
            title: t("offerAction.confirmDecline", { amount: offered }),
            body: t("offerAction.confirmToBuyer"),
            label: tc("decline"),
            go: () => run("decline"),
          })
        }
      >
        {tc("decline")}
      </Button>
      {sheet}
      <Dialog open={open && live} onOpenChange={setOpen}>
        {/* Opened from a button outside it (not a DialogTrigger): closed, focus goes back to that button. */}
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            counterButton.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("offerAction.counterTitle")}</DialogTitle>
          </DialogHeader>
          {/* A form, so the keyboard's Send key sends it: on a phone the keyboard covers the button. */}
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pending && !notAbove) run("counter", figure);
            }}
          >
            <DialogDescription>{t("offerAction.buyerOffered", { amount: offered })}</DialogDescription>
            <div className="space-y-1.5">
              <Label htmlFor={inputId}>{t("offerAction.counterLabel")}</Label>
              <AedInput id={inputId} value={counter} onValue={setTyped} enterKeyHint="send" />
            </div>
            {meetsAsking && (
              <p className="text-xs text-muted-foreground">{t("offerAction.meetsAsking", { amount: formatAED(askingPrice, locale) })}</p>
            )}
            {counter !== "" && notAbove ? (
              <p role="status" className="text-xs text-warning">
                {te("field.counterNotAbove", { amount: offered })}
              </p>
            ) : (
              aboveAsking && (
                <p role="status" className="text-xs text-warning">
                  {t("offerAction.counterAboveAsking", { amount: formatAED(askingPrice, locale) })}
                </p>
              )
            )}
            <DialogFooter>
              <Button type="submit" className="max-lg:h-11" disabled={pending || notAbove}>
                {t("offerAction.sendCounter", { amount: formatAED(Number(counter) || 0, locale) })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The offers page's Received / Sent tabs, shown from the address (?tab=): a notice's link to ?tab=sent opens Sent even
 * while the page is already open on Received. A click on a tab writes it there too, without a reload.
 */
export function OffersTabs({ initial, children }: { initial: "received" | "sent"; children: React.ReactNode }) {
  const params = useSearchParams();
  const asked = params.get("tab");
  const tab = asked === "received" || asked === "sent" ? asked : initial;
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        next.set("tab", v);
        window.history.replaceState(null, "", `?${next}`);
      }}
    >
      {children}
    </Tabs>
  );
}

/** Buyer-side controls for an offer they made. `className` places the row (see SellerOfferActions). */
export function BuyerOfferActions({
  offerId,
  status,
  amount,
  counterAmount,
  updatedAt,
  listingStatus,
  className,
}: {
  offerId: string;
  status: Status;
  /** The buyer's own offer, named when they confirm withdrawing it on a phone. */
  amount: number;
  counterAmount: number | null;
  /** The offer's updated_at as this page shows it (ISO). */
  updatedAt: string;
  listingStatus: ListingStatusKey;
  className?: string;
}) {
  const t = useT("dashboard");
  const tc = useT("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const { confirm, sheet } = useConfirm();
  const run = (action: "accept_counter" | "decline" | "withdraw") =>
    start(async () => {
      // A counter is answered as shown (should the seller's counter have changed since, the server says so).
      const shown = action !== "withdraw";
      const res = await respondToOffer(
        offerId,
        action,
        undefined,
        shown ? (counterAmount ?? undefined) : undefined,
        shown ? updatedAt : undefined,
      );
      if (res.error) toast.error(res.error);
      else
        toast.success(
          t(
            action === "accept_counter"
              ? "offerAction.counterAccepted"
              : action === "withdraw"
                ? "offerAction.withdrawn"
                : "offerAction.counterDeclined",
          ),
        );
    });

  if (status === "countered") {
    const countered = formatAED(counterAmount ?? amount, locale);
    return (
      <div className={cn(ROW, className)}>
        <BackupTag listingStatus={listingStatus} />
        {listingStatus === "live" && (
          <Button
            size="sm"
            variant="success"
            className={ACTION}
            disabled={pending}
            onClick={(e) =>
              confirm(e, {
                title: t("offerAction.confirmAcceptCounter", { amount: countered }),
                body: t("offerAction.confirmAcceptCounterBody"),
                label: tc("accept"),
                positive: true,
                go: () => run("accept_counter"),
              })
            }
          >
            <Check />{" "}
            {counterAmount ? t("offerAction.acceptAmount", { amount: formatAED(counterAmount, locale) }) : tc("accept")}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className={cn(ACTION, OUTLINED)}
          disabled={pending}
          onClick={(e) =>
            confirm(e, {
              title: t("offerAction.confirmDeclineCounter", { amount: countered }),
              body: t("offerAction.confirmToSeller"),
              label: tc("decline"),
              go: () => run("decline"),
            })
          }
        >
          {tc("decline")}
        </Button>
        {sheet}
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className={cn(ROW, className)}>
        <BackupTag listingStatus={listingStatus} />
        <Button
          size="sm"
          variant="ghost"
          className={cn(ACTION, OUTLINED)}
          disabled={pending}
          onClick={(e) =>
            confirm(e, {
              title: t("offerAction.confirmWithdraw", { amount: formatAED(amount, locale) }),
              body: t("offerAction.confirmToSeller"),
              label: tc("withdraw"),
              go: () => run("withdraw"),
            })
          }
        >
          {tc("withdraw")}
        </Button>
        {sheet}
      </div>
    );
  }
  return null;
}
