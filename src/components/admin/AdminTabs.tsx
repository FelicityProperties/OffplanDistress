import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab = readonly [key: string, href: string, label: string];

/**
 * The tabs atop an admin list (the queue's Waiting / Imported, Users' Registered / Pending claim, Inquiries' Inbox /
 * Spam, the newsletter's statuses): links, the current one marked. Below sm they share the width two to a row (a tab
 * never sits alone on a line), and below lg each is 40 px tall; from lg, the row of pills it always was.
 */
export function AdminTabs({
  label,
  current,
  tabs,
  testId,
  className,
}: {
  label: string;
  current: string;
  tabs: readonly Tab[];
  testId?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      data-testid={testId}
      className={cn("grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm max-sm:w-full sm:flex sm:flex-wrap", className)}
    >
      {tabs.map(([key, href, text]) => (
        <Link
          key={key}
          href={href}
          aria-current={current === key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:flex max-lg:min-h-10 max-lg:items-center max-lg:justify-center max-lg:text-center max-lg:leading-tight",
            current === key && "bg-card text-foreground shadow-card",
          )}
        >
          {text}
        </Link>
      ))}
    </nav>
  );
}

export type Chip = { key: string; href: string; label: string; count: number };

/**
 * Filter chips with their counts (an offer status, a pipeline stage), the current one marked: one row that scrolls
 * sideways on a phone (40 px chips, the row bleeding to the screen's edges), and that wraps from sm.
 */
export function AdminChips({ label, current, chips, className }: { label: string; current: string | null; chips: Chip[]; className?: string }) {
  return (
    <nav
      aria-label={label}
      className={cn("-mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0", className)}
    >
      {chips.map((c) => {
        const on = current === c.key;
        return (
          <Link
            key={c.key}
            href={c.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-transparent bg-ink-gradient text-primary-foreground" : "border-border/80 bg-card hover:border-gold",
            )}
          >
            {c.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular", on ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground")}>
              {c.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
