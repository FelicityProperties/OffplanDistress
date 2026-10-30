import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { CircleX, Sparkles, TrendingDown } from "lucide-react";
import { NewsletterForm } from "@/components/NewsletterForm";
import { richText } from "@/content/legal/rich-text";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, brandName } from "@/lib/config";
import { prefillEmail } from "@/lib/newsletter";
import { alternatesFor, openGraphBase } from "@/lib/seo";

// The daily deals newsletter's own page: what an issue contains, the sign-up form, a sample issue and the consent
// line (src/lib/newsletter.ts). Indexed, in every language.

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT("newsletter"), getLocale()]);
  const alternates = alternatesFor("/newsletter", locale);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates,
    openGraph: { ...openGraphBase(locale), title: t("meta.title"), description: t("meta.description"), url: alternates?.canonical },
  };
}

const POINTS = [
  [Sparkles, "new"],
  [TrendingDown, "drops"],
  [CircleX, "gone"],
] as const;
const SAMPLE_LINES = ["line1", "line2", "line3"] as const;

const legalLink =
  "font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition hover:decoration-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function NewsletterPage() {
  const [t, locale, user] = await Promise.all([getT("newsletter"), getLocale(), getCurrentUser()]);
  // Who sends the issues: the RERA details every advert (and every issue) carries.
  const vars = { company: brandName(locale), orn: BRAND.orn, brn: BRAND.broker.brn };
  return (
    <div className="relative isolate">
      <div className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light opacity-60 mask-fade-b" />
        <div aria-hidden className="absolute -top-40 end-[-6rem] -z-10 h-80 w-[28rem] bg-glow-gold opacity-50" />
        <div className="container-page pb-10 pt-10 sm:pt-12">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-gold" />
              {t("page.eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-5xl">{t("page.title")}</h1>
            <p className="mt-3 text-muted-foreground sm:text-lg">{t("page.sub")}</p>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-10 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-semibold">{t("page.formTitle")}</h2>
            <NewsletterForm variant="page" source="newsletter" defaultEmail={prefillEmail(user)} className="mt-5" />
          </div>

          <h2 className="mt-10 text-xl font-semibold">{t("page.contains")}</h2>
          <ul className="mt-5 space-y-5">
            {POINTS.map(([Icon, id]) => (
              <li key={id} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{t(`page.point.${id}.title`)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`page.point.${id}.body`)}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            {richText(t("page.privacy"), {
              privacy: (
                <Link href="/privacy" className={legalLink}>
                  {t("form.privacy")}
                </Link>
              ),
            })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <bdi>{t("page.advertiser", vars)}</bdi>
          </p>
        </div>

        {/* A static sample of an issue, so a visitor knows what to expect before leaving an address. */}
        <aside aria-labelledby="newsletter-sample-title" data-testid="newsletter-sample" className="min-w-0">
          <h2 id="newsletter-sample-title" className="text-xl font-semibold">
            {t("page.sampleTitle")}
          </h2>
          <div className="mt-5 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lift">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-secondary/60 px-5 py-3 text-xs text-muted-foreground">
              <span className="font-display text-base font-semibold text-foreground" dir="ltr">
                Offplan<span className="font-normal opacity-80">Distress</span>
              </span>
              <span>{t("band.eyebrow")}</span>
            </div>
            <div className="space-y-5 px-5 py-6 text-sm">
              <p className="text-base font-semibold">{t("page.sample.subject")}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("page.sample.new")}</p>
                <ul className="mt-2 space-y-1.5">
                  {SAMPLE_LINES.map((k) => (
                    <li key={k} className="flex gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <span>{t(`page.sample.${k}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("page.sample.drops")}</p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span>{t("page.sample.drop1")}</span>
                  </li>
                </ul>
              </div>
              <p className="text-muted-foreground">{t("page.sample.gone")}</p>
              <p className="border-t border-border/70 pt-4 text-xs text-muted-foreground">
                <bdi>{t("page.sample.footer", vars)}</bdi>
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("page.sampleNote")}</p>
        </aside>
      </div>
    </div>
  );
}
