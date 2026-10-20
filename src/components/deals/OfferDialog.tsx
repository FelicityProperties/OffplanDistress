"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
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
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(makeOffer, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Offer sent", { description: "We'll present it to the seller and update you in your dashboard." });
    }
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
        <Link href={loginHref}>Sign in to make an offer</Link>
      </Button>
    );
  }

  const fe = state.fieldErrors ?? {};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="gold" className="w-full">
          Make an offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an offer</DialogTitle>
          <DialogDescription>
            {project} · Asking {formatAED(asking)} for the seller&apos;s equity
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="listingId" value={listingId} />
          <Field label="Your offer to the seller (AED)" htmlFor="amount" error={fe.amount} hint="You'll also take over the remaining payment plan.">
            <Input id="amount" name="amount" type="number" min={0} step={1000} defaultValue={Math.round((asking * 0.95) / 1000) * 1000} required />
          </Field>
          <div className="space-y-2">
            <Label>Financing</Label>
            <RadioGroup name="financing" defaultValue="cash" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["cash", "Cash"],
                  ["mortgage", "Mortgage at handover"],
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
          <Field label="Message to seller (optional)" htmlFor="message" error={fe.message}>
            <Textarea id="message" name="message" placeholder="I can complete within 3 weeks…" />
          </Field>
          <FormMessage state={state} />
          <DialogFooter>
            <SubmitButton className="w-full" pendingText="Sending…">
              Submit offer
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
