import { cn } from "@/lib/utils";

type Props = {
  variant?: "full" | "mark";
  tone?: "dark" | "light";
  className?: string;
};

/** Mark: a Dubai Frame doorway with a gold threshold — a smart way in. */
export function LogoMark({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string | undefined }) {
  const bg = tone === "dark" ? "var(--ink)" : "var(--primary-foreground)";
  const fg = tone === "dark" ? "var(--primary-foreground)" : "var(--ink)";
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={bg} />
      <path d="M8 25V7h16v18h-4.2V11.2h-7.6V25z" fill={fg} />
      <rect x="12.2" y="20.6" width="7.6" height="2.6" rx="0.5" fill="var(--gold)" />
    </svg>
  );
}

export function Logo({ variant = "full", tone = "dark", className }: Props) {
  if (variant === "mark") return <LogoMark tone={tone} className={className} />;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} dir="ltr">
      <LogoMark tone={tone} />
      <span
        className={cn(
          "font-display text-xl tracking-[-0.03em]",
          tone === "dark" ? "text-foreground" : "text-primary-foreground",
        )}
      >
        <span className="font-semibold">Offplan</span>
        <span className="font-normal opacity-80">Distress</span>
      </span>
    </span>
  );
}
