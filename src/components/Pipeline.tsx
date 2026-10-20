import { LISTING_STATUS, PIPELINE, type ListingStatusKey } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Pipeline({ status }: { status: ListingStatusKey }) {
  const idx = PIPELINE.indexOf(status);
  return (
    <div>
      <div className="flex items-center gap-1">
        {PIPELINE.map((p, i) => (
          <div
            key={p}
            title={LISTING_STATUS[p].label}
            className={cn("h-1.5 flex-1 rounded-full", idx >= 0 && i <= idx ? "bg-success" : "bg-muted")}
          />
        ))}
      </div>
      <div className="mt-1.5 hidden justify-between text-[10px] uppercase tracking-wide text-muted-foreground sm:flex">
        {PIPELINE.map((p, i) => (
          <span key={p} className={cn(i === idx && "font-semibold text-foreground")}>
            {LISTING_STATUS[p].label}
          </span>
        ))}
      </div>
    </div>
  );
}
