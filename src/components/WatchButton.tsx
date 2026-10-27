"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleWatch } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { useLocalePath, useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/paths";
import { cn } from "@/lib/utils";

export function WatchButton({
  listingId,
  watching,
  variant = "icon",
  className,
}: {
  listingId: string;
  watching: boolean;
  variant?: "icon" | "full";
  className?: string;
}) {
  const tc = useT("common");
  const router = useRouter();
  const pathname = usePathname();
  const lp = useLocalePath();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(watching);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setOptimistic(!optimistic);
      const res = await toggleWatch(listingId);
      if (res.needsAuth) {
        toast(tc("watchlistNeedsAuth"));
        // Log in in the page's language, then back to this page (the login localises it again).
        router.push(lp(`/login?next=${encodeURIComponent(stripLocale(pathname))}`));
      } else if (res.error) {
        toast.error(res.error);
      } else if (res.watching) {
        toast.success(tc("watchlistAdded"));
      }
    });
  }

  const label = optimistic ? tc("removeFromWatchlist") : tc("addToWatchlist");

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={pending}
        className={cn(
          "rounded-xl border-border bg-card shadow-none hover:border-foreground/25 hover:bg-muted/60",
          optimistic && "border-destructive/30 bg-destructive/5 hover:bg-destructive/10",
          className,
        )}
      >
        <Heart className={cn("transition-transform", optimistic && "scale-110 fill-destructive text-destructive")} />
        {optimistic ? tc("onWatchlist") : tc("addToWatchlist")}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-card/90 shadow-sm ring-1 ring-ink/5 backdrop-blur transition hover:scale-110 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", optimistic ? "fill-destructive text-destructive" : "text-foreground")} />
    </button>
  );
}
