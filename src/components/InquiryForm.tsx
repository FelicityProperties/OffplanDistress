"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { createInquiry } from "@/app/actions/market";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Defaults = { name?: string; email?: string; phone?: string | null };

export function InquiryFields({
  listingId,
  type,
  defaults,
  onDone,
  submitLabel = "Send request",
  messagePlaceholder,
}: {
  listingId?: string;
  type: "info" | "viewing" | "contact";
  defaults?: Defaults;
  onDone?: () => void;
  submitLabel?: string;
  messagePlaceholder?: string;
}) {
  const [state, action] = useActionState(createInquiry, {});
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (state.ok) {
      toast.success("Request sent", { description: "Our team will get back to you shortly." });
      done.current?.();
    }
  }, [state]);
  const fe = state.fieldErrors ?? {};

  if (state.ok && !onDone) {
    return (
      <p className="rounded-lg bg-success-soft px-4 py-3 text-sm font-medium text-success">
        Thanks — we&apos;ve received your message and will be in touch shortly.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      <input type="hidden" name="type" value={type} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="inq-name" error={fe.name}>
          <Input id="inq-name" name="name" defaultValue={defaults?.name} required autoComplete="name" />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="inq-phone" error={fe.phone}>
          <Input id="inq-phone" name="phone" type="tel" defaultValue={defaults?.phone ?? ""} autoComplete="tel" />
        </Field>
      </div>
      <Field label="Email" htmlFor="inq-email" error={fe.email}>
        <Input id="inq-email" name="email" type="email" defaultValue={defaults?.email} required autoComplete="email" />
      </Field>
      <Field label="Message" htmlFor="inq-message" error={fe.message}>
        <Textarea id="inq-message" name="message" rows={4} placeholder={messagePlaceholder} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Sending…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function InquiryDialog({ listingId, project, defaults }: { listingId: string; project: string; defaults?: Defaults }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="ghost">
          <MessageSquare /> Request viewing / info
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request viewing or info</DialogTitle>
          <DialogDescription>{project} — an advisor will contact you about this unit.</DialogDescription>
        </DialogHeader>
        <InquiryFields
          listingId={listingId}
          type="viewing"
          defaults={defaults}
          onDone={() => setOpen(false)}
          messagePlaceholder="I'd like to see the payment history and visit the show apartment…"
        />
      </DialogContent>
    </Dialog>
  );
}
