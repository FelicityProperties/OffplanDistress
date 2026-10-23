import { BadgeCheck, FileCheck2, FileSignature, Handshake, KeyRound, Search, Upload } from "lucide-react";
import { getT } from "@/i18n/server";
import { BUYER_STEPS, SELLER_STEPS } from "@/lib/content";
import { cn } from "@/lib/utils";

const ICONS = {
  upload: Upload,
  badge: BadgeCheck,
  handshake: Handshake,
  key: KeyRound,
  search: Search,
  file: FileCheck2,
  sign: FileSignature,
};

type Step = (typeof SELLER_STEPS)[number] | (typeof BUYER_STEPS)[number];

/**
 * A journey as a four-step flow: numbered discs joined by a line on wide screens, a stacked list on
 * phones. `tone` picks the disc colour so the seller and buyer journeys read as two tracks.
 */
export async function StepsFlow({ title, steps, tone = "ink" }: { title: string; steps: readonly Step[]; tone?: "ink" | "gold" }) {
  const t = await getT("home");
  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-3">
        <span className={cn("h-2.5 w-2.5 rounded-full", tone === "gold" ? "bg-gold" : "bg-ink")} aria-hidden />
        <h3 className="text-2xl font-semibold">{title}</h3>
      </div>
      <ol className="relative mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {/* connector, behind the discs */}
        <div aria-hidden className="absolute inset-x-6 top-6 hidden border-t border-dashed border-border lg:block" />
        {steps.map((s, i) => {
          const Icon = ICONS[s.icon];
          return (
            <li key={s.id} className="relative flex gap-4 lg:block">
              <span
                className={cn(
                  "relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-card ring-4 ring-card",
                  tone === "gold" ? "bg-gold text-gold-foreground" : "bg-ink-gradient text-primary-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="lg:mt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground tabular">0{i + 1}</p>
                <p className="mt-1 font-semibold">{t(`step.${s.id}.title`)}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`step.${s.id}.desc`)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** @deprecated Kept for older call sites; renders the flow layout. */
export const StepsCard = StepsFlow;
