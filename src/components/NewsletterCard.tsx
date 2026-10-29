import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The confirmation and unsubscribe pages' one card: an icon, a title, a line of text and what to do next. */
export function NewsletterCard({
  icon: Icon,
  tone = "success",
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  tone?: "success" | "muted" | "warning";
  title: string;
  body: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-72 bg-grid-light opacity-60 mask-fade-b" />
      <div className="container-page py-16 sm:py-24">
        <div className="mx-auto max-w-lg rounded-3xl border border-border/80 bg-card p-8 text-center shadow-card sm:p-10">
          <span
            className={cn(
              "mx-auto grid h-14 w-14 place-items-center rounded-full ring-8",
              tone === "success" && "bg-success-soft text-success ring-success-soft/50",
              tone === "muted" && "bg-muted text-muted-foreground ring-muted/60",
              tone === "warning" && "bg-gold-soft text-gold-foreground ring-gold-soft/50",
            )}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-6 text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground wrap-anywhere">{body}</p>
          {children && <div className="mt-7">{children}</div>}
        </div>
      </div>
    </div>
  );
}
