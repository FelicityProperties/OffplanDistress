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
import { analyzeDeal, isReady } from "@/lib/deal-math";
import { discountPct } from "@/lib/discount-labels";
import { formatAEDCompact, formatPct, refCode } from "@/lib/format";
import { watchedIds } from "@/lib/listings";
import { dubaiToday } from "@/lib/permits";
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
  projectsT,
  projectTitle,
  type Project,
} from "@/lib/projects";
import { alternatesFor, openGraphBase } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

/**
 * The project an address names. Another spelling of an existing project's slug ("/projects/Volta", "/projects/Bluewaters
 * Bay - Building 2") moves for good to the slug's own address, in the page's language; anything else (no such project,
 * or none of its units is available any more) is a 404.
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

/**
 * "2 resale units available in Volta. By DAMAC in Downtown Dubai. Handover Q1 2028 – Q2 2028. Up to 17% below the original
 * price." Only the available units count; a developer the listings don't name is left out (In Palm Jumeirah.).
 */
function describe(project: Project, locale: Locale, t: TFn<"projects">) {
  const developer = projectDevelopers(project, locale, undefined, true);
  const community = projectCommunities(project, locale);
  const pct = projectBestPct(project);
  return [
    t(project.liveCount === 1 ? "meta.units.one" : "meta.units.many", { count: project.liveCount, project: project.name }),
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
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const t = projectsT(locale);
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
  const [deals, watched, tc] = await Promise.all([projectDeals(project), watchedIds(user?.id), getT("common")]);
  const t = projectsT(locale);
  // The available units, then those under offer (backup offers are still possible), apart.
  const available = deals.filter((d) => d.status === "live");
  const reserved = deals.filter((d) => d.status !== "live");
  // Its last available unit went under offer or came down between the two queries.
  if (!available.length) notFound();

  const title = projectTitle(project, locale);
  const developer = projectDeveloperInSentence(project, locale);
  const best = projectBestPct(project);
  // The rates as the site writes them ("2%", "5%", "4%"), from FEES.
  const rates = { commission: formatPct(FEES.commissionRate), vat: formatPct(FEES.vatRate), dld: formatPct(FEES.dldRate) };
  const buyerPays = FEES.payer === "buyer";
  // Sentences of one paragraph (Chinese runs them together).
  const join = (...parts: (string | null)[]) => parts.filter(Boolean).join(locale === "zh" ? "" : " ");

  // What the units listed have in common, for the copy: fully paid (nothing left to take over) and handed over (a title
  // deed rather than an Oqood), each for all of them, some or none, as the cards and the deal pages decide it.
  const today = dubaiToday();
  const paid = deals.filter((d) => d.originalPrice - d.amountPaid <= 0).length;
  const ready = deals.filter((d) => isReady(d, today)).length;
  const allPaid = paid === deals.length;
  const share = (all: boolean, some: boolean) => (all ? "all" : some ? "some" : "none");
  const paidState = share(allPaid, paid > 0);
  const readyState = share(ready === deals.length, ready > 0);

  // The handover range breaks only between its two ends ("Q1 2028 –" / "Q2 2028"), never inside a quarter.
  const handover = projectHandoverRange(project, locale, today);
  const handoverRange = handover.from !== handover.to;
  const developers = projectDevelopers(project, locale) || "—";
  const communities = projectCommunities(project, locale) || "—";
  const underOffer = project.dealCount - project.liveCount;
  // `wide`: a value that needs the whole row on a phone (a name too long for two lines of half a card, a range, a Chinese
  // quarter, which half a 320px card would split before its last character). The buyer's reason to look comes first, and
  // stays clear of the floating buttons in the bottom corner.
  const facts: { key: string; label: string; value: React.ReactNode; icon: typeof Building2; wide?: boolean; good?: boolean }[] = [
    ...(best != null
      ? [{ key: "below", label: t("facts.belowOriginal"), value: t("facts.upTo", { pct: best }), icon: TrendingDown, good: true }]
      : []),
    {
      key: "units",
      label: t("facts.units"),
      value: (
        <>
          {project.liveCount}
          {underOffer > 0 && (
            <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{t("facts.reserved", { count: underOffer })}</span>
          )}
        </>
      ),
      icon: Layers,
    },
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
      wide: handoverRange || (locale === "zh" && /\d/.test(handover.from)),
    },
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
    allPaid
      ? { key: "plan", title: t("how.paid.title"), body: t("how.paid.body", { developer }) }
      : {
          key: "plan",
          title: t("how.plan.title"),
          body: join(t("how.plan.body", { developer }), paidState === "some" ? t("how.plan.mixed") : null),
        },
    { key: "noc", title: t("how.noc.title"), body: t(allPaid ? "how.noc.bodyPaid" : "how.noc.body", { developer }) },
    {
      key: "transfer",
      title: t("how.transfer.title"),
      body: t(
        readyState === "all" ? "how.transfer.bodyReady" : readyState === "some" ? "how.transfer.bodyMixed" : "how.transfer.body",
        rates,
      ),
    },
    { key: "fee", title: t("how.fee.title", rates), body: t(buyerPays ? "how.fee.body" : "how.fee.bodySeller", rates) },
  ];

  // The project's own figures for the FAQ, from its available units as their cards show them (analyzeDeal).
  const n = available.length;
  const named = { project: project.name, count: n };
  const analyses = available.map((d) => analyzeDeal(d));
  const spread = (key: "faq.cash" | "faq.fee", amounts: number[]) => {
    const min = formatAEDCompact(Math.min(...amounts), locale);
    const max = formatAEDCompact(Math.max(...amounts), locale);
    if (n === 1) return t(`${key}.one` as const, { ...named, amount: min });
    return min === max ? t(`${key}.each` as const, { ...named, amount: min }) : t(`${key}.many` as const, { ...named, min, max });
  };
  const pcts = analyses.map((a) => discountPct(a.discountVsOriginal)).filter((p): p is number => p != null && p >= 1);
  const below = !pcts.length
    ? t(n === 1 ? "faq.below.oneNone" : "faq.below.manyNone", named)
    : n === 1
      ? t("faq.below.one", { ...named, pct: pcts[0] })
      : t(pcts.length === n ? "faq.below.all" : pcts.length === 1 ? "faq.below.manyOne" : "faq.below.many", {
          ...named,
          below: pcts.length,
          pct: Math.max(...pcts),
        });
  // Shown as they are and repeated word for word in the FAQPage data. Each question names the project and each answer
  // ends on its figures, so no two project pages carry the same questions and answers.
  const faqs = [
    {
      q: t("faq.cash.q", named),
      a: join(
        t(buyerPays ? "faq.cash.a" : "faq.cash.aSeller", { ...rates, developer }),
        spread("faq.cash", analyses.map((a) => a.cashToClose)),
      ),
    },
    allPaid
      ? { q: t("faq.paid.q", named), a: t("faq.paid.a", { ...named, developer }) }
      : { q: t("faq.plan.q", named), a: join(t("faq.plan.a", { developer }), paidState === "some" ? t("how.plan.mixed") : null) },
    {
      q: t("faq.time.q", named),
      a: t(readyState === "all" ? "faq.time.aReady" : readyState === "some" ? "faq.time.aMixed" : "faq.time.a", { developer }),
    },
    {
      q: t("faq.fee.q", named),
      a: buyerPays
        ? join(t("faq.fee.a", rates), spread("faq.fee", analyses.map((a) => a.commission + a.vat)))
        : t("faq.fee.aSeller", rates),
    },
    { q: t("faq.below.q", named), a: join(t("faq.below.a"), below) },
  ];

  // Structured data: absolute addresses in the page's language. The trail is the one shown above the title (Browse
  // deals › Projects), ending on this project; /projects and the deal pages use the same one.
  const base = siteUrl();
  const url = (path: string) => `${base}${localePath(path, locale)}`;
  const pageUrl = url(projectPath(project));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: BRAND.name, item: url("/") },
      { "@type": "ListItem", position: 2, name: tc("browseDeals"), item: url("/deals") },
      { "@type": "ListItem", position: 3, name: t("projects"), item: url("/projects") },
      { "@type": "ListItem", position: 4, name: project.name, item: pageUrl },
    ],
  };
  // Every card, in the order shown: the available units, then those under offer.
  const listed = [...available, ...reserved];
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: listed.length,
    itemListElement: listed.map((d, i) => ({
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
  const grid = "grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3";

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
          {/* A sentence, so a size down on phones (3-4 lines for a long name). wrap-anywhere: a project name can be one long
              word, wider than a phone at this size. Chinese breaks between words (转售 stays whole), at the spaces and
              after the punctuation; 28px under 360px keeps its longest run of characters on one line. */}
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-[1.1] text-balance wrap-anywhere max-[359px]:text-[1.75rem] sm:text-5xl sm:leading-[1.08] [&:lang(zh)]:break-keep">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground sm:text-lg">
            {t(allPaid ? "introPaid" : paidState === "some" || readyState !== "none" ? "introMixed" : "intro", { project: project.name })}
          </p>
          <dl className={cn("mt-8 grid grid-cols-2 gap-3", facts.length > 4 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2 md:grid-cols-4")}>
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
        {/* The units: the /deals cards in the /deals order, the available ones first and those under offer apart */}
        <section aria-labelledby="project-deals" className="pt-10 sm:pt-12">
          <h2 id="project-deals" className="text-2xl font-semibold text-balance wrap-anywhere sm:text-3xl">
            {t("deals.title", { project: project.name })}
          </h2>
          <WhatsAppCommunity locale={locale} variant="compact" className="mt-5" />
          <div className={cn("mt-6", grid)}>
            {available.map((d, i) => (
              <DealCard key={d.id} deal={d} watching={watched.has(d.id)} priority={i < 3} />
            ))}
          </div>
          {reserved.length > 0 && (
            <div className="mt-14" data-reserved>
              <h3 className="font-sans text-xl font-semibold sm:text-2xl">{t("deals.reservedTitle", { count: reserved.length })}</h3>
              <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{t("deals.reservedNote")}</p>
              <div className={cn("mt-6", grid)}>
                {reserved.map((d) => (
                  <DealCard key={d.id} deal={d} watching={watched.has(d.id)} />
                ))}
              </div>
            </div>
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
                  {/* No one-word last line; Chinese keeps its words whole (收取 rather than 收 / 取). */}
                  <h3 className="min-w-0 pt-1 font-sans text-base font-semibold leading-snug text-pretty wrap-anywhere sm:text-lg sm:leading-snug [&:lang(zh)]:break-keep">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The FAQ, every answer visible; on desktop the heading stays in view beside them */}
        <section aria-labelledby="project-faq" className="mt-16 grid gap-6 sm:mt-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <h2 id="project-faq" className="text-2xl font-semibold text-balance wrap-anywhere sm:text-3xl lg:sticky lg:top-28 lg:self-start">
            {t("faq.title", { project: project.name })}
          </h2>
          <dl className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card">
            {faqs.map((f) => (
              <div key={f.q} className="px-5 py-5 sm:px-7">
                {/* Balanced: a question naming a long project never ends on a word or two (a lone 思？ in Chinese). */}
                <dt className="font-semibold leading-snug text-balance">{f.q}</dt>
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
                <p className="mt-3 max-w-xl text-primary-foreground/75">{t("cta.body", { brand: BRAND.name })}</p>
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
