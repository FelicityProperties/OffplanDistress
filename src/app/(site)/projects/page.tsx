import type { Metadata } from "next";
import { ArrowRight, Building2, CalendarClock, MapPin, TrendingDown } from "lucide-react";
import Link from "@/components/LocaleLink";
import { JsonLd } from "@/components/JsonLd";
import { Button } from "@/components/ui/button";
import { localePath } from "@/i18n/paths";
import { getLocale, getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";
import {
  liveProjects,
  projectBestPct,
  projectCommunities,
  projectDevelopers,
  projectHandover,
  projectPath,
} from "@/lib/projects";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT("projects"), getLocale()]);
  const title = t("index.meta.title");
  const description = t("index.meta.description", { brand: BRAND.name });
  const alternates = alternatesFor("/projects", locale);
  return { title, description, alternates, openGraph: { ...openGraphBase(locale), title, description, url: alternates?.canonical } };
}

/** Every project with a resale unit on the site, the most units first: a card each, linking to its page. */
export default async function ProjectsPage() {
  const [projects, t, tc, locale] = await Promise.all([liveProjects(), getT("projects"), getT("common"), getLocale()]);
  const base = siteUrl();
  const url = (path: string) => `${base}${localePath(path, locale)}`;
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("index.title"),
    numberOfItems: projects.length,
    itemListElement: projects.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: url(projectPath(p)), name: p.name })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: BRAND.name, item: url("/") },
      { "@type": "ListItem", position: 2, name: t("projects"), item: url("/projects") },
    ],
  };
  // Keep the count bold inside the translated sentence: split the template around {count}.
  const [countBefore, countAfter = ""] = t(projects.length === 1 ? "index.count.one" : "index.count.many").split("{count}");

  return (
    <div className="relative isolate">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />

      {/* Compact page header, as on /deals */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light opacity-60 mask-fade-b" />
        <div aria-hidden className="absolute -top-40 end-[-6rem] -z-10 h-80 w-[28rem] bg-glow-gold opacity-50" />
        <div className="container-page flex flex-col gap-5 pb-8 pt-10 sm:flex-row sm:items-end sm:justify-between sm:pt-12">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-gold" />
              {t("index.eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl">{t("index.title")}</h1>
            <p className="mt-3 text-muted-foreground sm:text-lg">{t("index.subtitle")}</p>
          </div>
          {projects.length > 0 && (
            <p className="inline-flex w-fit shrink-0 items-center gap-2.5 rounded-full border border-border/80 bg-card px-4 py-2 text-sm text-muted-foreground shadow-card">
              <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
              <span>
                {countBefore}
                <span className="font-semibold text-foreground tabular">{projects.length}</span>
                {countAfter}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="container-page pb-20 pt-8 sm:pt-10">
        {projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center shadow-card">
            <p className="mx-auto max-w-md text-muted-foreground">{t("index.empty")}</p>
            <Button asChild className="mt-6 rounded-full">
              <Link href="/deals">{tc("browseDeals")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const developers = projectDevelopers(p, locale);
              const communities = projectCommunities(p, locale);
              const best = projectBestPct(p);
              return (
                <li key={p.slug} className="flex">
                  <article
                    className={
                      // The name's link stretches over the card; its focus ring is drawn on the card.
                      "group relative flex w-full flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-card card-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background"
                    }
                  >
                    <h2 className="text-lg font-semibold leading-snug wrap-anywhere">
                      <Link href={projectPath(p)} className="after:absolute after:inset-0 focus-visible:outline-none">
                        {p.name}
                      </Link>
                    </h2>
                    <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      {developers && (
                        <li className="flex items-start gap-2">
                          <Building2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold-foreground" />
                          <bdi className="min-w-0 wrap-anywhere">{developers}</bdi>
                        </li>
                      )}
                      {communities && (
                        <li className="flex items-start gap-2">
                          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold-foreground" />
                          <bdi className="min-w-0 wrap-anywhere">{communities}</bdi>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <CalendarClock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold-foreground" />
                        <span className="min-w-0">{t("card.handover", { when: projectHandover(p, locale) })}</span>
                      </li>
                    </ul>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground tabular">
                        {t(p.dealCount === 1 ? "card.units.one" : "card.units.many", { n: p.dealCount })}
                      </span>
                      {best != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success tabular">
                          <TrendingDown aria-hidden className="h-3.5 w-3.5" />
                          {t("card.upTo", { pct: best })}
                        </span>
                      )}
                      <span
                        aria-hidden
                        className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-gold-foreground transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                      >
                        {t("card.cta")}
                        <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                      </span>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {projects.length > 0 && (
          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" variant="outline" className="rounded-full bg-card">
              <Link href="/deals">
                {tc("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
