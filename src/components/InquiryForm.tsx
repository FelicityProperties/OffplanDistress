"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { createInquiry } from "@/app/actions/market";
import { AttributionField } from "@/components/Attribution";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { SpamGuard } from "@/components/SpamGuard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { richText } from "@/content/legal/rich-text";
import { useT } from "@/i18n/client";

type Defaults = { name?: string; email?: string; phone?: string | null };

export function InquiryFields({
  listingId,
  type,
  defaults,
  onDone,
  submitLabel,
  messagePlaceholder,
  formToken,
}: {
  listingId?: string;
  type: "info" | "viewing" | "contact";
  defaults?: Defaults;
  onDone?: () => void;
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
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (state.ok) {
      toast.success(t("inquiry.sentTitle"), { description: t("inquiry.sentBody") });
      done.current?.();
    } else if (state.error || state.fieldErrors) {
      setAttempt((n) => n + 1);
    }
    // `t` only changes with the locale; the toast should fire once per submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fe = state.fieldErrors ?? {};

  if (state.ok && !onDone) {
    return <p className="rounded-lg bg-success-soft px-4 py-3 text-sm font-medium text-success">{t("inquiry.thanks")}</p>;
  }

  return (
    <form action={action} className="relative space-y-4">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      <input type="hidden" name="type" value={type} />
      <AttributionField />
      <SpamGuard token={formToken} resetKey={attempt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("inquiry.name")} htmlFor="inq-name" error={fe.name}>
          <Input id="inq-name" name="name" defaultValue={defaults?.name} required autoComplete="name" />
        </Field>
        <Field label={t("inquiry.phone")} htmlFor="inq-phone" error={fe.phone}>
          <Input
            id="inq-phone"
            name="phone"
            type="tel"
            dir="ltr"
            className="rtl:text-end"
            defaultValue={defaults?.phone ?? ""}
            autoComplete="tel"
          />
        </Field>
      </div>
      <Field label={t("inquiry.email")} htmlFor="inq-email" error={fe.email}>
        <Input
          id="inq-email"
          name="email"
          type="email"
          dir="ltr"
          className="rtl:text-end"
          defaultValue={defaults?.email}
          required
          autoComplete="email"
        />
      </Field>
      <Field label={t("inquiry.message")} htmlFor="inq-message" error={fe.message}>
        <Textarea id="inq-message" name="message" rows={4} placeholder={messagePlaceholder} />
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
          onDone={() => setOpen(false)}
          messagePlaceholder={t("inquiry.dialogPlaceholder")}
          formToken={formToken}
        />
      </DialogContent>
    </Dialog>
  );
}
