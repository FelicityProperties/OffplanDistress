import { cn } from "@/lib/utils";

type Props = {
  variant?: "full" | "mark";
  tone?: "dark" | "light";
  className?: string;
};

/** Mark: a tower whose roofline breaks into a downward arrow — "below market" entry. */
export function LogoMark({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string | undefined }) {
  const bg = tone === "dark" ? "var(--ink)" : "var(--primary-foreground)";
  const fg = tone === "dark" ? "var(--primary-foreground)" : "var(--ink)";
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={bg} />
      <path d="M9 25V12l5-3v16z" fill={fg} />
      <path d="M16 25V7l7 4v14z" fill={fg} opacity="0.9" />
      <path d="M19.5 14.5v5.2m0 0-2.4-2.4m2.4 2.4 2.4-2.4" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="7" y="25" width="18" height="1.8" rx="0.9" fill="var(--gold)" />
    </svg>
  );
}

export function Logo({ variant = "full", tone = "dark", className }: Props) {
  if (variant === "mark") return <LogoMark tone={tone} className={className} />;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} />
      <span
        className={cn(
          "font-display text-xl font-semibold tracking-tight",
          tone === "dark" ? "text-foreground" : "text-primary-foreground",
        )}
      >
        Offplan<span className="text-gold">Distress</span>
      </span>
    </span>
  );
}
