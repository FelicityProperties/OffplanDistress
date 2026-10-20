"use client";

import { useTransition } from "react";
import { Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { setMyListingStatus } from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { ListingStatusKey } from "@/lib/config";

export function ListingActions({ id, status }: { id: string; status: ListingStatusKey }) {
  const t = useT("dashboard");
  const tc = useT("common");
  const [pending, start] = useTransition();
  const run = (action: "pause" | "resume" | "withdraw") =>
    start(async () => {
      if (action === "withdraw" && !confirm(t("listingAction.confirmWithdraw"))) return;
      const res = await setMyListingStatus(id, action);
      if (res.error) toast.error(res.error);
      else
        toast.success(
          t(
            action === "pause"
              ? "listingAction.paused"
              : action === "resume"
                ? "listingAction.resumed"
                : "listingAction.withdrawn",
          ),
        );
    });

  return (
    <div className="flex gap-2">
      {status === "live" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("pause")}>
          <Pause /> {tc("pause")}
        </Button>
      )}
      {status === "paused" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("resume")}>
          <Play /> {tc("resume")}
        </Button>
      )}
      {!["transferred", "noc_in_progress", "withdrawn"].includes(status) && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("withdraw")}>
          <X /> {tc("withdraw")}
        </Button>
      )}
    </div>
  );
}
