"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { respondToOffer } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatAED } from "@/lib/format";

type Status = "pending" | "accepted" | "declined" | "countered" | "withdrawn";

/** Seller-side controls for an offer on their listing. */
export function SellerOfferActions({ offerId, status, amount }: { offerId: string; status: Status; amount: number }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [counter, setCounter] = useState(String(Math.round(amount * 1.05)));

  const run = (action: "accept" | "decline" | "counter", value?: number) =>
    start(async () => {
      const res = await respondToOffer(offerId, action, value);
      if (res.error) toast.error(res.error);
      else {
        toast.success(action === "accept" ? "Offer accepted — our team will start the NOC" : action === "counter" ? "Counter-offer sent" : "Offer declined");
        setOpen(false);
      }
    });

  if (status !== "pending") return null;
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="success" disabled={pending} onClick={() => run("accept")}>
        <Check /> Accept
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        Counter
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("decline")}>
        Decline
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Counter-offer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">The buyer offered {formatAED(amount)} for your equity.</p>
          <Input type="number" min={0} step={1000} value={counter} onChange={(e) => setCounter(e.target.value)} aria-label="Counter amount in AED" />
          <DialogFooter>
            <Button disabled={pending} onClick={() => run("counter", Number(counter))}>
              Send counter of {formatAED(Number(counter) || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Buyer-side controls for an offer they made. */
export function BuyerOfferActions({ offerId, status, counterAmount }: { offerId: string; status: Status; counterAmount: number | null }) {
  const [pending, start] = useTransition();
  const run = (action: "accept_counter" | "decline" | "withdraw") =>
    start(async () => {
      const res = await respondToOffer(offerId, action);
      if (res.error) toast.error(res.error);
      else toast.success(action === "accept_counter" ? "Counter accepted — our team will be in touch" : action === "withdraw" ? "Offer withdrawn" : "Counter declined");
    });

  if (status === "countered") {
    return (
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="success" disabled={pending} onClick={() => run("accept_counter")}>
          <Check /> Accept {counterAmount ? formatAED(counterAmount) : ""}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("decline")}>
          Decline
        </Button>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("withdraw")}>
          Withdraw
        </Button>
      </div>
    );
  }
  return null;
}
