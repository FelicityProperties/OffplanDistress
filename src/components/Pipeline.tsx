"use client";

import { useT } from "@/i18n/client";
import { PIPELINE, type ListingStatusKey } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Pipeline({ status }: { status: ListingStatusKey }) {
  const tc = useT("common");
  const idx = PIPELINE.indexOf(status);
  return (
    <div>
      <div className="flex items-center gap-1">
        {PIPELINE.map((p, i) => (
          <div
            key={p}
            title={tc(`listing.${p}`)}
            className={cn("h-1.5 flex-1 rounded-full", idx >= 0 && i <= idx ? "bg-success" : "bg-muted")}
          />
        ))}
      </div>
      <div className="mt-1.5 hidden justify-between text-[10px] uppercase tracking-wide text-muted-foreground sm:flex">
        {PIPELINE.map((p, i) => (
          <span key={p} className={cn(i === idx && "font-semibold text-foreground")}>
            {tc(`listing.${p}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
