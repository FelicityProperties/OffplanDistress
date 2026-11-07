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
 * Below lg the buttons are 44 px tall with 14 px labels (outlined: a ghost button that big reads as loose text); on a
 * phone they share a full-width row, two to a line, and one alone takes the line.
 */
const ACTION =
  "max-lg:h-11 max-lg:px-4 max-lg:text-sm max-lg:border max-lg:border-input max-lg:bg-background max-lg:shadow-sm max-sm:only:col-span-2";

/**
 * `pausedByAdmin`: our team paused it, and only our team can put it back (no Resume). `hasDeal`: a deal is agreed on
 * it (an accepted offer, or its open deal file), which withdrawing ends for good, so the confirmation says so. Both
 * pages that show these controls pass both (My listings reads them in myListings, src/lib/dashboard.ts).
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

  const canPause = status === "live";
  const canResume = status === "paused" && !pausedByAdmin;
  const heldByTeam = status === "paused" && pausedByAdmin;
  const canWithdraw = !["transferred", "noc_in_progress", "withdrawn"].includes(status);
  // Nothing to show: the empty item stays from sm as before (the row's spacing is unchanged); a phone drops it, or it
  // would add its gap under the buttons above it.
  if (!canPause && !canResume && !heldByTeam && !canWithdraw) return <div className="max-sm:hidden" />;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-2">
      {canPause && (
        <Button size="sm" variant="ghost" className={ACTION} disabled={pending} onClick={() => run("pause")}>
          <Pause /> {tc("pause")}
        </Button>
      )}
      {canResume && (
        <Button size="sm" variant="ghost" className={ACTION} disabled={pending} onClick={() => run("resume")}>
          <Play /> {tc("resume")}
        </Button>
      )}
      {heldByTeam && (
        <p className="max-w-64 text-end text-xs text-muted-foreground max-sm:col-span-2 max-sm:max-w-none max-sm:text-start">
          {t("listingAction.pausedByTeam")}{" "}
          <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">
            {t("listingAction.contactTeam")}
          </Link>
        </p>
      )}
      {canWithdraw && (
        <Button
          size="sm"
          variant="ghost"
          // Alone on its line when the note above takes the whole row.
          className={heldByTeam ? `${ACTION} max-sm:col-span-2` : ACTION}
          disabled={pending}
          onClick={() => run("withdraw")}
        >
          <X /> {tc("withdraw")}
        </Button>
      )}
    </div>
  );
}
