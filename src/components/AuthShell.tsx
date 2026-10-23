import type { ReactNode } from "react";
import { BadgeCheck, FileSignature, Landmark, Wallet } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { getT } from "@/i18n/server";
import { AUTH_IMAGE } from "@/lib/content";

// Trust bullets on the image panel. Copy: home `hero.point.<id>`.
const POINTS = [
  [Landmark, "rera"],
  [BadgeCheck, "spa"],
  [FileSignature, "dld"],
] as const;

/**
 * Split layout for the log-in, sign-up and password pages: the form on the cream background, and on wide
 * screens a dark photo panel (sticky, so it stays in view beside long forms) with the value proposition.
 */
export async function AuthShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const [t, th] = await Promise.all([getT("auth"), getT("home")]);
  return (
    <div className="grid min-h-[calc(100svh-4.25rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Form side */}
      <div className="relative isolate flex items-center justify-center overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
        <div aria-hidden className="absolute -start-40 -top-40 -z-10 h-[26rem] w-[26rem] bg-glow-gold opacity-25" />
        <div className="w-full max-w-sm">
          <LogoMark className="h-11 w-11 shadow-card" />
          <h1 className="mt-7 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      {/* Image panel (wide screens only) */}
      <div className="hidden p-3 lg:block">
        <div className="sticky top-[calc(4.25rem+0.75rem)] isolate flex h-[calc(100svh-4.25rem-1.5rem)] min-h-[32rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-ink p-10 text-primary-foreground shadow-lift xl:p-12">
          <div aria-hidden className="absolute inset-0 -z-30 bg-cover bg-center" style={{ backgroundImage: `url(${AUTH_IMAGE})` }} />
          <div aria-hidden className="absolute inset-0 -z-20 bg-hero-overlay" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-40 mask-fade-b" />
          <div aria-hidden className="absolute -end-24 -top-24 -z-10 h-80 w-80 bg-glow-gold opacity-40" />

          <div className="glass-dark max-w-xs rounded-2xl p-5">
            <p className="font-display text-4xl font-semibold leading-none text-gradient-gold tabular">{th("trust.stat.value")}</p>
            <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">{th("trust.stat.label")}</p>
            <p className="mt-4 flex items-center gap-2 border-t border-primary-foreground/10 pt-3 text-xs text-primary-foreground/65">
              <Wallet className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
              {t("shell.point.fee")}
            </p>
          </div>

          <div className="max-w-md">
            <p className="font-display text-3xl font-semibold leading-snug text-primary-foreground">{t("shell.headline")}</p>
            <ul className="mt-7 space-y-3 text-sm text-primary-foreground/85">
              {POINTS.map(([Icon, id]) => (
                <li key={id} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/30">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {th(`hero.point.${id}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
