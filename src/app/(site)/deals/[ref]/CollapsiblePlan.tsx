"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The payment plan's box. On phones and tablets a long plan folds the rows marked
 * `group-data-[collapsed]/plan:max-lg:hidden` (all but the next instalments and the last one) behind "Show all", so
 * the cash timeline isn't several screens further down. From lg every row shows, as before, and there is no button.
 */
export function CollapsiblePlan({
  hidden,
  showAll,
  showFewer,
  className,
  children,
}: {
  /** How many rows fold away; with 0 there is no button. */
  hidden: number;
  showAll: string;
  showFewer: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div id={id} className={cn("group/plan", className)} data-collapsed={hidden > 0 && !open ? "" : undefined}>
        {children}
      </div>
      {hidden > 0 && (
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen(!open);
            // Folding the rows away moves the button up: bring it back under the finger.
            if (open) requestAnimationFrame(() => button.current?.scrollIntoView({ block: "nearest" }));
          }}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-4 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] lg:hidden"
        >
          {open ? showFewer : showAll}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      )}
    </>
  );
}
