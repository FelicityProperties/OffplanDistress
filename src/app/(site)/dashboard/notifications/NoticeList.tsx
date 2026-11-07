"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** How many notices a phone shows at first, and how many each "Show more" adds. */
const STEP = 20;

/**
 * The notifications list. Below lg it shows the newest 20, and 20 more per "Show more": the page's 100 rows were about
 * 17,600 px on a 320 px phone. From lg every row shows, as before. The rows are rendered on the server; this only hides
 * the ones further down. `note` (the line under a full page) shows once every row is on screen.
 */
export function NoticeList({ children, note }: { children: ReactNode; note?: string }) {
  const t = useT("dashboard");
  const rows = Children.toArray(children);
  const [shown, setShown] = useState(STEP);
  const more = rows.length - shown;
  const list = useRef<HTMLUListElement>(null);
  const firstNew = useRef<number | null>(null);
  // Focus goes to the first notice just shown (keyboard and screen readers carry on from there); the page doesn't move.
  useEffect(() => {
    const i = firstNew.current;
    if (i == null) return;
    firstNew.current = null;
    list.current?.children[i]?.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true });
  }, [shown]);
  return (
    <>
      <ul ref={list} className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
        {rows.map((row, i) => (
          <li
            key={isValidElement(row) && row.key != null ? row.key : i}
            // The last row shown has no divider under it (the list's own border is there).
            className={cn(i >= shown && "max-lg:hidden", i === shown - 1 && more > 0 && "max-lg:border-b-0")}
          >
            {row}
          </li>
        ))}
      </ul>
      {more > 0 && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full lg:hidden"
          onClick={() => {
            firstNew.current = shown;
            setShown((n) => n + STEP);
          }}
        >
          {t("notices.more", { count: Math.min(STEP, more) })}
        </Button>
      )}
      {note && <p className={cn("text-center text-xs text-muted-foreground", more > 0 && "max-lg:hidden")}>{note}</p>}
    </>
  );
}
