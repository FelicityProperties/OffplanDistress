"use client";

import { useTransition } from "react";
import { Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { setMyListingStatus } from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import type { ListingStatusKey } from "@/lib/config";

export function ListingActions({ id, status }: { id: string; status: ListingStatusKey }) {
  const [pending, start] = useTransition();
  const run = (action: "pause" | "resume" | "withdraw") =>
    start(async () => {
      if (action === "withdraw" && !confirm("Withdraw this listing? Buyers will no longer see it.")) return;
      const res = await setMyListingStatus(id, action);
      if (res.error) toast.error(res.error);
      else toast.success(action === "pause" ? "Listing paused" : action === "resume" ? "Listing resumed" : "Listing withdrawn");
    });

  return (
    <div className="flex gap-2">
      {status === "live" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("pause")}>
          <Pause /> Pause
        </Button>
      )}
      {status === "paused" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("resume")}>
          <Play /> Resume
        </Button>
      )}
      {!["transferred", "noc_in_progress", "withdrawn"].includes(status) && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("withdraw")}>
          <X /> Withdraw
        </Button>
      )}
    </div>
  );
}
