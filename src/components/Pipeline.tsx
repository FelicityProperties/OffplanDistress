"use client";

import { useT } from "@/i18n/client";
import { PIPELINE, type ListingStatusKey } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Pipeline({ status }: { status: ListingStatusKey }) {
  const tc = useT("common");
  const idx = PIPELINE.indexOf(status);
  return (
    <div>
      <div aria-hidden className="flex items-center gap-1">
        {PIPELINE.map((p, i) => (
          <div
            key={p}
            title={tc(`listing.${p}`)}
            className={cn("h-1.5 flex-1 rounded-full", idx >= 0 && i <= idx ? "bg-success" : "bg-muted")}
          />
        ))}
      </div>
      {/* Phones have no room for the five stage names: the current one, and how far along it is. */}
      {idx >= 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground sm:hidden">
          {tc("pipeline.stage", { n: idx + 1, total: PIPELINE.length, stage: tc(`listing.${status}`) })}
        </p>
      )}
      <div className="mt-1.5 hidden justify-between text-[10px] uppercase tracking-wide text-muted-foreground sm:flex">
        {PIPELINE.map((p, i) => (
          <span key={p} aria-current={i === idx ? "step" : undefined} className={cn(i === idx && "font-semibold text-foreground")}>
            {tc(`listing.${p}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
