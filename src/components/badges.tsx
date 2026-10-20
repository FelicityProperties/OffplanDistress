import { cn } from "@/lib/utils";
import { MOTIVATION } from "@/lib/config";

type Motivation = keyof typeof MOTIVATION;

export function MotivationBadge({ m }: { m: Motivation }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        m === "urgent" && "bg-warning-soft text-warning",
        m === "motivated" && "bg-gold-soft text-gold-foreground",
        m === "flexible" && "bg-muted text-muted-foreground",
      )}
    >
      {MOTIVATION[m].label}
    </span>
  );
}

export function StatusPill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" | "gold" | "warning" | "destructive" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success-soft text-success",
        tone === "gold" && "bg-gold-soft text-gold-foreground",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, sub, center }: { eyebrow?: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-widest text-gold">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

const TONE_MAP = { success: "success", warning: "warning", accent: "gold", danger: "destructive", muted: "muted" } as const;

export function ToneStatus({ label, tone }: { label: string; tone: keyof typeof TONE_MAP }) {
  return <StatusPill tone={TONE_MAP[tone]}>{label}</StatusPill>;
}

export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      title="Illustrative listing to show how the marketplace works"
      className={cn("rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground", className)}
    >
      Sample
    </span>
  );
}
