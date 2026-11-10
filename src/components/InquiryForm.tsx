"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { MessageSquare } from "lucide-react";
import { createInquiry } from "@/app/actions/market";
import { AttributionField } from "@/components/Attribution";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { SpamGuard } from "@/components/SpamGuard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppCommunity } from "@/components/WhatsAppCommunity";
import { richText } from "@/content/legal/rich-text";
import { useLocale, useT } from "@/i18n/client";

type Defaults = { name?: string; email?: string; phone?: string | null };

/**
 * On a phone the keyboard's Next key (enterKeyHint="next") moves on to the following field, as in an app, rather than
 * sending a half-filled form; Enter at a desktop keyboard still sends it.
 */
function nextFieldOnEnter(e: React.KeyboardEvent<HTMLFormElement>) {
  const field = e.target;
  if (e.key !== "Enter" || !(field instanceof HTMLInputElement) || field.enterKeyHint !== "next") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  // The visible fields in order: not the hidden ones nor the honeypot (tabIndex -1, inside aria-hidden).
  const fields = [...e.currentTarget.elements].filter(
    (el): el is HTMLInputElement | HTMLTextAreaElement =>
      ((el instanceof HTMLInputElement && el.type !== "hidden") || el instanceof HTMLTextAreaElement) &&
      el.tabIndex >= 0 &&
      !el.disabled &&
      !el.closest('[aria-hidden="true"]'),
  );
  const next = fields[fields.indexOf(field) + 1];
  if (!next) return;
  e.preventDefault();
  next.focus();
}

/**
 * In place of the form once it is sent (the contact page, the deal page's dialog): the thanks, then the WhatsApp deals
 * community to join while our team replies; in the dialog, a Close button. It is the only confirmation (no toast: one
 * would sit over it on a phone's screen, the join line included), announced as a status. Focus moves here from the
 * send button, which is gone, so a keyboard or a screen reader carries on from the message.
 */
function InquirySent({ inDialog }: { inDialog?: boolean }) {
  const t = useT("marketing");
  const tc = useT("common");
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sent from the foot of a long form, the shorter message can start above the screen or under the sticky header
    // (which the page's scroll-padding-top clears): it comes back into view. In the dialog it is always in view.
    const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (!inDialog && el.getBoundingClientRect().top < header) el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }, [inDialog]);
  return (
    <div ref={ref} tabIndex={-1} data-testid="inquiry-sent" className="space-y-3 outline-none">
      <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm font-medium text-success">
        {t("inquiry.thanks")}
      </p>
      <WhatsAppCommunity locale={locale} variant="compact" line="sent" />
      {inDialog && (
        <DialogClose asChild>
          <Button variant="outline" className="w-full max-sm:h-11">
            {tc("close")}
          </Button>
        </DialogClose>
      )}
    </div>
  );
}

export function InquiryFields({
  listingId,
  type,
  defaults,
  inDialog,
  submitLabel,
  messagePlaceholder,
  formToken,
}: {
  listingId?: string;
  type: "info" | "viewing" | "contact";
  defaults?: Defaults;
  /** Inside InquiryDialog: once sent, the dialog stays open on the "sent" message, with a Close button. */
  inDialog?: boolean;
  submitLabel?: string;
  messagePlaceholder?: string;
  /** issueFormToken() from the page that renders the form (src/lib/spam.ts). */
  formToken?: string;
}) {
  const t = useT("marketing");
  const tc = useT("common");
  const tl = useT("legal");
  const [state, action] = useActionState(createInquiry, {});
  // Counts refused submissions, so the anti-spam widget (if any) issues a fresh token for the next try.
  const [attempt, setAttempt] = useState(0);
  // What was typed, fed back as the fields' defaults: React resets a form once its action has answered, errors
  // included, and a reset puts the defaults back, so a message survives a "too many" or an expired form token.
  const [typed, setTyped] = useState<Record<string, string>>({});
  const keepTyped = (e: React.FormEvent<HTMLFormElement>) => {
    const el = e.target as HTMLInputElement;
    if (el.name && el.type !== "hidden") setTyped((v) => ({ ...v, [el.name]: el.value }));
  };
  useEffect(() => {
    if (!state.ok && (state.error || state.fieldErrors)) setAttempt((n) => n + 1);
  }, [state]);
  const fe = state.fieldErrors ?? {};

  if (state.ok) return <InquirySent inDialog={inDialog} />;

  return (
    <form action={action} onInput={keepTyped} onKeyDown={nextFieldOnEnter} className="relative space-y-4">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      <input type="hidden" name="type" value={type} />
      <AttributionField />
      <SpamGuard token={formToken} resetKey={attempt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("inquiry.name")} htmlFor="inq-name" error={fe.name}>
          {/* Phones: 44 px fields, a comfortable tap. */}
          <Input
            id="inq-name"
            name="name"
            className="max-md:h-11"
            defaultValue={typed.name ?? defaults?.name}
            required
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
          />
        </Field>
        <Field label={t("inquiry.phone")} htmlFor="inq-phone" error={fe.phone}>
          <Input
            id="inq-phone"
            name="phone"
            type="tel"
            dir="ltr"
            className="rtl:text-end max-md:h-11"
            defaultValue={typed.phone ?? defaults?.phone ?? ""}
            autoComplete="tel"
            enterKeyHint="next"
          />
        </Field>
      </div>
      <Field label={t("inquiry.email")} htmlFor="inq-email" error={fe.email}>
        <Input
          id="inq-email"
          name="email"
          type="email"
          dir="ltr"
          className="rtl:text-end max-md:h-11"
          defaultValue={typed.email ?? defaults?.email}
          required
          autoComplete="email"
          enterKeyHint="next"
        />
      </Field>
      <Field label={t("inquiry.message")} htmlFor="inq-message" error={fe.message}>
        {/* No "send" key here: in a message, return starts a new line. */}
        <Textarea id="inq-message" name="message" rows={4} placeholder={messagePlaceholder} defaultValue={typed.message} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText={tc("sending")}>
        {submitLabel ?? t("inquiry.submit")}
      </SubmitButton>
      {/* Privacy notice for the contact / viewing-request form. */}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {richText(tl("inquiry.privacy"), {
          privacy: (
            <Link
              href="/privacy"
              className="font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {tl("nav.privacy")}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}

export function InquiryDialog({
  listingId,
  project,
  defaults,
  triggerClassName,
  formToken,
}: {
  listingId: string;
  project: string;
  defaults?: Defaults;
  triggerClassName?: string;
  formToken?: string;
}) {
  const t = useT("marketing");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="ghost" className={triggerClassName}>
          <MessageSquare /> {t("inquiry.dialogTrigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("inquiry.dialogTitle")}</DialogTitle>
          <DialogDescription>
            <bdi>{project}</bdi> — {t("inquiry.dialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <InquiryFields
          listingId={listingId}
          type="viewing"
          defaults={defaults}
          inDialog
          messagePlaceholder={t("inquiry.dialogPlaceholder")}
          formToken={formToken}
        />
      </DialogContent>
    </Dialog>
  );
}
