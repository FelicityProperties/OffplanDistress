"use client";

import { useTransition } from "react";
import Link from "@/components/LocaleLink";
import { Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { setMyListingStatus } from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { ListingStatusKey } from "@/lib/config";

/**
 * `pausedByAdmin`: our team paused it, and only our team can put it back (no Resume). `hasDeal`: a deal is agreed on
 * it (an accepted offer), which withdrawing ends for good, so the confirmation says so.
 */
export function ListingActions({
  id,
  status,
  pausedByAdmin = false,
  hasDeal = false,
}: {
  id: string;
  status: ListingStatusKey;
  pausedByAdmin?: boolean;
  hasDeal?: boolean;
}) {
  const t = useT("dashboard");
  const tc = useT("common");
  const [pending, start] = useTransition();
  const run = (action: "pause" | "resume" | "withdraw") =>
    start(async () => {
      if (action === "withdraw" && !confirm(t(hasDeal ? "listingAction.confirmWithdrawDeal" : "listingAction.confirmWithdraw"))) return;
      const res = await setMyListingStatus(id, action);
      if (res.error) toast.error(res.error);
      else
        toast.success(
          t(
            action === "pause"
              ? "listingAction.paused"
              : action === "resume"
                ? "review" in res && res.review
                  ? "listingAction.resumedReview"
                  : "listingAction.resumed"
                : "listingAction.withdrawn",
          ),
        );
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "live" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("pause")}>
          <Pause /> {tc("pause")}
        </Button>
      )}
      {status === "paused" && !pausedByAdmin && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("resume")}>
          <Play /> {tc("resume")}
        </Button>
      )}
      {status === "paused" && pausedByAdmin && (
        <p className="max-w-64 text-end text-xs text-muted-foreground">
          {t("listingAction.pausedByTeam")}{" "}
          <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">
            {t("listingAction.contactTeam")}
          </Link>
        </p>
      )}
      {!["transferred", "noc_in_progress", "withdrawn"].includes(status) && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("withdraw")}>
          <X /> {tc("withdraw")}
        </Button>
      )}
    </div>
  );
}
