import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, Building2, CalendarClock, ChevronRight, Layers, MapPin, TrendingDown } from "lucide-react";
import Link from "@/components/LocaleLink";
import { richText } from "@/content/legal/rich-text";
import { DealCard } from "@/components/DealCard";
import { JsonLd } from "@/components/JsonLd";
import { WhatsAppCommunity } from "@/components/WhatsAppCommunity";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { getLocale, getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, FEES } from "@/lib/config";
import { formatPct, refCode } from "@/lib/format";
import { watchedIds } from "@/lib/listings";
import { communityName } from "@/lib/place-names";
import {
  getProject,
  projectBestPct,
  projectCommunities,
  projectDeals,
  projectDeveloperInSentence,
  projectDevelopers,
  projectHandover,
  projectHandoverRange,
  projectPath,
  projectSlug,
  projectTitle,
  type Project,
} from "@/lib/projects";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

/**
 * The project an address names. Another spelling of an existing project's slug ("/projects/Volta", "/projects/Bluewaters
 * Bay - Building 2") moves for good to the slug's own address, in the page's language; anything else (no such project,
 * or none of its units is an advert any more) is a 404.
 */
async function resolve(segment: string, locale: Locale): Promise<Project> {
  const project = await getProject(segment);
  if (project) return project;
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {}
  const slug = projectSlug(decoded);
  if (slug && slug !== segment && (await getProject(slug))) permanentRedirect(localePath(projectPath({ slug }), locale));
  notFound();
}

/** "3 resale units in Volta. By DAMAC in Downtown Dubai. Handover Q1 2028 – Q2 2028. Up to 17% below the original price." */
function describe(project: Project, locale: Locale, t: TFn<"projects">) {
  const developer = projectDevelopers(project, locale);
  const community = projectCommunities(project, locale);
  const pct = projectBestPct(project);
  return [
    t(project.dealCount === 1 ? "meta.units.one" : "meta.units.many", { count: project.dealCount, project: project.name }),
    developer && community
      ? t("meta.byIn", { developer, community })
      : developer
        ? t("meta.by", { developer })
        : community
          ? t("meta.in", { community })
          : null,
    t("meta.handover", { handover: projectHandover(project, locale) }),
    pct != null ? t("meta.upTo", { pct }) : null,
  ]
    .filter(Boolean)
    .join(locale === "zh" ? "" : " ");
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const [{ slug }, t, locale] = await Promise.all([params, getT("projects"), getLocale()]);
  const project = await getProject(slug);
  // Another spelling (the page moves it to the slug) or no such project (a 404): nothing to index here.
  if (!project) return { robots: { index: false }, alternates: null };
  const title = projectTitle(project, locale);
  const description = describe(project, locale, t);
  const alternates = alternatesFor(projectPath(project), locale);
  return {
    title,
    description,
    alternates,
    openGraph: { ...openGraphBase(locale), title, description, url: alternates?.canonical },
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const [{ slug }, locale, user] = await Promise.all([params, getLocale(), getCurrentUser()]);
  const project = await resolve(slug, locale);
  const [deals, watched, t, tc] = await Promise.all([projectDeals(project), watchedIds(user?.id), getT("projects"), getT("common")]);
  // Its last advert came down between the two queries.
  if (!deals.length) notFound();

  const title = projectTitle(project, locale);
  const developer = projectDeveloperInSentence(project, locale);
  const best = projectBestPct(project);
  // The rates as the site writes them ("2%", "5%", "4%"), from FEES.
  const rates = { commission: formatPct(FEES.commissionRate), vat: formatPct(FEES.vatRate), dld: formatPct(FEES.dldRate) };
  const buyerPays = FEES.payer === "buyer";

  // The handover range breaks only between its two ends ("Q1 2028 –" / "Q2 2028"), never inside a quarter.
  const handover = projectHandoverRange(project, locale);
  const handoverRange = handover.from !== handover.to;
  const developers = projectDevelopers(project, locale) || "—";
  const communities = projectCommunities(project, locale) || "—";
  // `wide`: a value that needs the whole row on a phone (a name too long for two lines of half a card, a range).
  const facts: { key: string; label: string; value: React.ReactNode; icon: typeof Building2; wide?: boolean; good?: boolean }[] = [
    // A name may be in Latin letters on an Arabic page: isolated, the card keeps its alignment.
    { key: "developer", label: t("facts.developer"), value: <bdi>{developers}</bdi>, icon: Building2, wide: developers.length > 24 },
    { key: "community", label: t("facts.community"), value: <bdi>{communities}</bdi>, icon: MapPin, wide: communities.length > 24 },
    {
      key: "handover",
      label: t("facts.handover"),
      value: handoverRange
        ? richText(t("range"), {
            from: <span className="whitespace-nowrap">{handover.from}</span>,
            to: <span className="whitespace-nowrap">{handover.to}</span>,
          })
        : handover.from,
      icon: CalendarClock,
      wide: handoverRange,
    },
    { key: "units", label: t("facts.units"), value: project.dealCount, icon: Layers },
    ...(best != null
      ? [{ key: "below", label: t("facts.belowOriginal"), value: t("facts.upTo", { pct: best }), icon: TrendingDown, good: true }]
      : []),
  ];
  // Phones (two columns): no card left alone in a row. One before a wide card, or the last one on its own, takes the row.
  const phoneRow = facts.map((f) => !!f.wide);
  let column = 0;
  phoneRow.forEach((wide, i) => {
    if (wide) {
      if (column === 1) phoneRow[i - 1] = true;
      column = 0;
    } else column = column === 0 ? 1 : 0;
  });
  if (column === 1) phoneRow[phoneRow.length - 1] = true;

  const steps = [
    { key: "plan", title: t("how.plan.title"), body: t("how.plan.body", { developer }) },
    { key: "noc", title: t("how.noc.title"), body: t("how.noc.body", { developer }) },
    { key: "transfer", title: t("how.transfer.title"), body: t("how.transfer.body", rates) },
    { key: "fee", title: t("how.fee.title", rates), body: t(buyerPays ? "how.fee.body" : "how.fee.bodySeller", rates) },
  ];

  // Shown as they are and repeated word for word in the FAQPage data.
  const faqs = [
    { q: t("faq.cash.q"), a: t(buyerPays ? "faq.cash.a" : "faq.cash.aSeller", { ...rates, developer }) },
    { q: t("faq.plan.q"), a: t("faq.plan.a", { developer }) },
    { q: t("faq.time.q"), a: t("faq.time.a", { developer }) },
    { q: t("faq.fee.q"), a: t(buyerPays ? "faq.fee.a" : "faq.fee.aSeller", rates) },
    { q: t("faq.below.q"), a: t("faq.below.a") },
  ];

  // Structured data: absolute addresses in the page's language.
  const base = siteUrl();
  const url = (path: string) => `${base}${localePath(path, locale)}`;
  const pageUrl = url(projectPath(project));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: BRAND.name, item: url("/") },
      { "@type": "ListItem", position: 2, name: tc("browseDeals"), item: url("/deals") },
      { "@type": "ListItem", position: 3, name: project.name, item: pageUrl },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: deals.length,
    itemListElement: deals.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: url(`/deals/${refCode(d.refNo)}`),
      // As the deal page names its listing.
      name: `${d.projectName} — ${tc(`unit.${d.unitType}`)}, ${communityName(tc, d.community, d.communityOther)}`,
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  const crumb =
    "rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:inline-flex max-lg:min-h-11 max-lg:items-center";

  return (
    <div className="relative isolate">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />
      <JsonLd data={faqLd} />

      {/* Header: the trail back, the title, what the project is */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light opacity-60 mask-fade-b" />
        <div aria-hidden className="absolute -top-40 end-[-6rem] -z-10 h-80 w-[28rem] bg-glow-gold opacity-50" />
        <div className="container-page pb-10 pt-6 sm:pb-12 sm:pt-10">
          <nav aria-label={t("breadcrumb")}>
            <ol className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <li>
                <Link href="/deals" className={crumb}>
                  {tc("browseDeals")}
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </li>
              <li>
                <Link href="/projects" className={crumb}>
                  {t("projects")}
                </Link>
              </li>
            </ol>
          </nav>
          {/* wrap-anywhere: a project name can be one long word, wider than a phone at this size. */}
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.08] text-balance wrap-anywhere sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground sm:text-lg">{t("intro", { project: project.name })}</p>
          <dl className={cn("mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3", facts.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
            {facts.map((f, i) => (
              <div
                key={f.key}
                data-fact={f.key}
                className={cn("min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-card", phoneRow[i] && "max-sm:col-span-2")}
              >
                <dt className="text-xs text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn(
                      "mb-3 grid h-9 w-9 place-items-center rounded-xl",
                      f.good ? "bg-success-soft text-success" : "bg-gold-soft text-gold-foreground",
                    )}
                  >
                    <f.icon className="h-4 w-4" />
                  </span>
                  {f.label}
                </dt>
                <dd className={cn("mt-1 text-sm font-semibold leading-snug tabular wrap-anywhere sm:text-base", f.good && "text-success")}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="container-page pb-20">
        {/* The units: the /deals cards, in the /deals order */}
        <section aria-labelledby="project-deals" className="pt-10 sm:pt-12">
          <h2 id="project-deals" className="text-2xl font-semibold text-balance wrap-anywhere sm:text-3xl">
            {t("deals.title", { project: project.name })}
          </h2>
          <WhatsAppCommunity locale={locale} variant="compact" className="mt-5" />
          <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {deals.map((d, i) => (
              <DealCard key={d.id} deal={d} watching={watched.has(d.id)} priority={i < 3} />
            ))}
          </div>
          {project.dealCount > deals.length && (
            <p className="mt-6 text-sm text-muted-foreground tabular">
              {t("deals.more", { shown: deals.length, total: project.dealCount })}{" "}
              <Link
                href={`/deals?q=${encodeURIComponent(project.name)}`}
                className="font-semibold text-foreground underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink"
              >
                {t("deals.moreLink")}
              </Link>
            </p>
          )}
        </section>

        {/* How buying a resale here works: four steps, the rates from FEES */}
        <section aria-labelledby="project-how" className="mt-16 sm:mt-20">
          <h2 id="project-how" className="text-2xl font-semibold text-balance wrap-anywhere sm:text-3xl">
            {t("how.title", { project: project.name })}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground sm:text-base">{t("how.sub")}</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.key} data-step={s.key} className="rounded-3xl border border-border/80 bg-card p-5 shadow-card sm:p-6">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-gold tabular"
                  >
                    {i + 1}
                  </span>
                  <h3 className="min-w-0 pt-1 font-sans text-base font-semibold leading-snug sm:text-lg sm:leading-snug">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The FAQ, every answer visible */}
        <section aria-labelledby="project-faq" className="mt-16 grid gap-6 sm:mt-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <h2 id="project-faq" className="text-2xl font-semibold text-balance sm:text-3xl">
            {t("faq.title")}
          </h2>
          <dl className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card">
            {faqs.map((f) => (
              <div key={f.q} className="px-5 py-5 sm:px-7">
                <dt className="font-semibold leading-snug">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Every other deal, and the other projects */}
        <section className="mt-16 sm:mt-20">
          <div className="relative isolate overflow-hidden rounded-3xl bg-ink-gradient px-5 py-10 text-primary-foreground shadow-lift sm:px-14 sm:py-14">
            <div aria-hidden className="absolute inset-0 -z-10 bg-dots-dark opacity-60 mask-fade-b" />
            <div aria-hidden className="absolute -end-24 -top-24 -z-10 h-80 w-80 bg-glow-gold opacity-70" />
            <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="text-3xl font-semibold leading-tight text-primary-foreground max-lg:text-balance">{t("cta.title")}</h2>
                <p className="mt-3 max-w-xl text-primary-foreground/75">{t("cta.body")}</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button asChild size="lg" variant="gold">
                  <Link href="/deals">
                    {tc("browseDeals")} <ArrowRight className="rtl:-scale-x-100" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="heroOutline">
                  <Link href="/projects">{t("cta.allProjects")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
