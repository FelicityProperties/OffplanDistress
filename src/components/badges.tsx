"use client";

// Client module so the badges can read the visitor's language; every export takes plain, serialisable
// props, so Server Components keep rendering them as before.
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { MOTIVATION } from "@/lib/config";

type Motivation = keyof typeof MOTIVATION;

/** Seller-motivation chip. `label` overrides the translated text (optional, for callers that have their own). */
export function MotivationBadge({ m, label }: { m: Motivation; label?: string }) {
  const tc = useT("common");
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        m === "urgent" && "bg-warning-soft text-warning",
        m === "motivated" && "bg-gold-soft text-gold-foreground",
        m === "flexible" && "bg-muted text-muted-foreground",
      )}
    >
      {label ?? tc(`motivation.${m}`)}
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

export function SectionHeading({
  eyebrow,
  title,
  sub,
  center,
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && (
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
            dark ? "border-primary-foreground/15 bg-primary-foreground/5 text-gold" : "border-gold/30 bg-gold-soft/60 text-gold-foreground",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
          {eyebrow}
        </p>
      )}
      <h2 className={cn("mt-4 text-3xl font-semibold leading-tight sm:text-[2.6rem]", dark && "text-primary-foreground")}>{title}</h2>
      {sub && <p className={cn("mt-3 text-base leading-relaxed", dark ? "text-primary-foreground/70" : "text-muted-foreground")}>{sub}</p>}
    </div>
  );
}

const TONE_MAP = { success: "success", warning: "warning", accent: "gold", danger: "destructive", muted: "muted" } as const;

export function ToneStatus({ label, tone }: { label: string; tone: keyof typeof TONE_MAP }) {
  return <StatusPill tone={TONE_MAP[tone]}>{label}</StatusPill>;
}

/** "Sample" chip for illustrative listings. `label` overrides the translated text (optional). */
export function SampleBadge({ className, label }: { className?: string; label?: string }) {
  const tc = useT("common");
  return (
    <span
      title={tc("sampleHint")}
      className={cn("rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground", className)}
    >
      {label ?? tc("sample")}
    </span>
  );
}
