import { Activity, Calculator, Clock, Database, EyeOff, Info, Layers, Percent, Sigma, Timer, Wallet } from "lucide-react";
import { SectionHeading } from "@/components/badges";
import { getLocale, getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import { MIN_LIVE, MIN_SAMPLE } from "@/lib/market";

const ITEMS = [
  { id: "scope", icon: Layers },
  { id: "samples", icon: EyeOff },
  { id: "discount", icon: Calculator },
  { id: "paid", icon: Percent },
  { id: "upfront", icon: Wallet },
  { id: "medians", icon: Sigma },
  { id: "demand", icon: Activity },
  { id: "transfer", icon: Timer },
  { id: "frequency", icon: Clock },
  { id: "source", icon: Database },
] as const;

/** Methodology & definitions, then the "indicative only" disclaimer. Shown in both states of the page. */
export async function Methodology() {
  const [t, tc, locale] = await Promise.all([getT("market"), getT("common"), getLocale()]);
  return (
    <section id="methodology" className="scroll-mt-24 bg-secondary py-20 sm:py-24">
      <div className="container-page grid gap-10 reveal lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow={t("method.eyebrow")} title={t("method.title")} sub={t("method.sub")} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {ITEMS.map(({ id, icon: Icon }) => (
            <div key={id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
              <dt className="flex items-center gap-2.5 font-semibold">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {t(`method.${id}.title`)}
              </dt>
              <dd className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {t(`method.${id}.body`, { min: MIN_SAMPLE, live: MIN_LIVE })}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="container-page mt-10 reveal">
        <aside
          aria-labelledby="disclaimer-title"
          className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:flex-row sm:p-8"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-gradient text-gold">
            <Info className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="disclaimer-title" className="font-sans text-lg font-semibold">
              {t("disclaimer.title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("disclaimer.body", { brand: BRAND.name })}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("hero.publishedBy", { company: locale === "ar" ? BRAND.companyAr : BRAND.company })}
              <span aria-hidden> · </span>
              <span className="tabular">{tc("reraOrn", { orn: BRAND.orn })}</span>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
