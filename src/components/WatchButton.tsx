"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleWatch } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(watching);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setOptimistic(!optimistic);
      const res = await toggleWatch(listingId);
      if (res.needsAuth) {
        toast("Create a free account to save deals to your watchlist.");
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
      } else if (res.error) {
        toast.error(res.error);
      } else if (res.watching) {
        toast.success("Added to your watchlist");
      }
    });
  }

  const label = optimistic ? "Remove from watchlist" : "Add to watchlist";

  if (variant === "full") {
    return (
      <Button type="button" variant="outline" onClick={onClick} disabled={pending} className={className}>
        <Heart className={cn(optimistic && "fill-destructive text-destructive")} />
        {optimistic ? "On your watchlist" : "Add to watchlist"}
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
        "grid h-9 w-9 place-items-center rounded-full bg-card/90 shadow-sm backdrop-blur transition hover:scale-110",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", optimistic ? "fill-destructive text-destructive" : "text-foreground")} />
    </button>
  );
}
