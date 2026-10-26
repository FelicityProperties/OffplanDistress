"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { respondToOffer } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/i18n/client";
import type { ListingStatusKey } from "@/lib/config";
import { formatAED } from "@/lib/format";

type Status = "pending" | "accepted" | "declined" | "countered" | "withdrawn";

/**
 * Only a live unit can take an offer. Once a deal is agreed on it, its other open offers are backups: they can be
 * declined or withdrawn, not accepted.
 */
function BackupTag({ listingStatus }: { listingStatus: ListingStatusKey }) {
  const t = useT("dashboard");
  if (listingStatus !== "under_offer" && listingStatus !== "noc_in_progress") return null;
  return (
    <span className="me-1 text-xs text-muted-foreground" title={t("offerAction.backupHint")}>
      {t("offerAction.backup")}
    </span>
  );
}

/** Seller-side controls for an offer on their listing. */
export function SellerOfferActions({
  offerId,
  status,
  amount,
  listingStatus,
}: {
  offerId: string;
  status: Status;
  amount: number;
  listingStatus: ListingStatusKey;
}) {
  const t = useT("dashboard");
  const tc = useT("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [counter, setCounter] = useState(String(Math.round(amount * 1.05)));

  const run = (action: "accept" | "decline" | "counter", value?: number) =>
    start(async () => {
      const res = await respondToOffer(offerId, action, value);
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
    <div className="flex items-center justify-end gap-1">
      <BackupTag listingStatus={listingStatus} />
      {live && (
        <>
          <Button size="sm" variant="success" disabled={pending} onClick={() => run("accept")}>
            <Check /> {tc("accept")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
            {tc("counter")}
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("decline")}>
        {tc("decline")}
      </Button>
      <Dialog open={open && live} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("offerAction.counterTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("offerAction.buyerOffered", { amount: formatAED(amount, locale) })}
          </p>
          <Input
            type="number"
            min={0}
            step={1000}
            value={counter}
            onChange={(e) => setCounter(e.target.value)}
            aria-label={t("offerAction.counterAria")}
          />
          <DialogFooter>
            <Button disabled={pending} onClick={() => run("counter", Number(counter))}>
              {t("offerAction.sendCounter", { amount: formatAED(Number(counter) || 0, locale) })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Buyer-side controls for an offer they made. */
export function BuyerOfferActions({
  offerId,
  status,
  counterAmount,
  listingStatus,
}: {
  offerId: string;
  status: Status;
  counterAmount: number | null;
  listingStatus: ListingStatusKey;
}) {
  const t = useT("dashboard");
  const tc = useT("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const run = (action: "accept_counter" | "decline" | "withdraw") =>
    start(async () => {
      const res = await respondToOffer(offerId, action);
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
    return (
      <div className="flex items-center justify-end gap-1">
        <BackupTag listingStatus={listingStatus} />
        {listingStatus === "live" && (
          <Button size="sm" variant="success" disabled={pending} onClick={() => run("accept_counter")}>
            <Check />{" "}
            {counterAmount ? t("offerAction.acceptAmount", { amount: formatAED(counterAmount, locale) }) : tc("accept")}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("decline")}>
          {tc("decline")}
        </Button>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center justify-end gap-1">
        <BackupTag listingStatus={listingStatus} />
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("withdraw")}>
          {tc("withdraw")}
        </Button>
      </div>
    );
  }
  return null;
}
