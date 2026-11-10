import "server-only";
import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { listSeparator, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/translator";
import { formatQuarter } from "./format";
import { belowOriginalPctSql, dealsInProjects } from "./listings";
import { advertisedSql, dubaiToday } from "./permits";
import { communityName, developerName, developerNotStated } from "./place-names";

// Project pages (/projects and /projects/<slug>): one page per project with at least one real advert, built from the
// public set /deals and the sitemap use (advertisedSql, no samples). A project is the listings' project name; spellings
// that differ only in case, accents or punctuation ("Sls Residences The Palm", "SLS Residences the Palm") share one
// page through projectSlug.

/** The most deals a project page lists. */
export const PROJECT_DEALS_LIMIT = 60;

/**
 * A project's address segment: "Bluewaters Bay - Building 2" → "bluewaters-bay-building-2", "Rashid Yachts & Marina"
 * → "rashid-yachts-and-marina", "Évora" → "evora". Empty for a name with no Latin letter or digit: no page then.
 */
export function projectSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** A developer or community as listings store it: the config.ts name, with the seller's own for "Other". */
export type Place = { name: string; other: string | null };

export type Project = {
  slug: string;
  /** The spelling most of its listings use (a tie: the most recently updated one). */
  name: string;
  /** Every spelling its listings use, for the query that lists its deals. */
  names: string[];
  /** Distinct, the most frequent first; an "Other" without the seller's name is left out (it names nothing). */
  developers: Place[];
  communities: Place[];
  /** The earliest and the latest handover date of its deals ("YYYY-MM-DD"); null when none has one. */
  handoverFrom: string | null;
  handoverTo: string | null;
  dealCount: number;
  /** Deals whose chip says 1% or more below the original price (belowOriginalPct: the cards' whole percentage). */
  belowOriginalCount: number;
  /** The highest of those percentages (0 or less when none is below); null when no deal has an original price. */
  bestBelowOriginalPct: number | null;
  /** When one of its deals last changed (the sitemap's lastmod). */
  lastModified: Date;
  refNos: number[];
};

/** One real advert as liveProjects reads it. */
export type ProjectRow = {
  name: string;
  developer: string;
  developerOther: string | null;
  community: string;
  communityOther: string | null;
  handoverDate: string | null;
  updatedAt: Date;
  refNo: number;
  belowOriginalPct: number | string | null;
};

/** The seller's own name only counts for "Other" (it may be left over from before our team mapped the listing). */
const place = (name: string, other: string | null): Place => ({ name, other: name === "Other" ? other?.trim() || null : null });
const placeKey = (p: Place) => `${p.name}\u0000${(p.other ?? "").toLowerCase()}`;
const named = (p: Place) => p.name !== "Other" || p.other != null;

/** Distinct values, the most frequent first (a tie: the most recently updated first). */
function ranked<T>(rows: ProjectRow[], pick: (r: ProjectRow) => T, key: (v: T) => string): T[] {
  const seen = new Map<string, { value: T; count: number; latest: number }>();
  for (const r of rows) {
    const value = pick(r);
    const k = key(value);
    const time = r.updatedAt.getTime();
    const entry = seen.get(k);
    if (entry) {
      entry.count++;
      entry.latest = Math.max(entry.latest, time);
    } else seen.set(k, { value, count: 1, latest: time });
  }
  return [...seen.values()].sort((a, b) => b.count - a.count || b.latest - a.latest).map((e) => e.value);
}

function summarize(slug: string, rows: ProjectRow[]): Project {
  // A Postgres numeric (floor() of one) arrives as a string from both drivers.
  const pcts = rows
    .map((r) => (r.belowOriginalPct == null ? null : Number(r.belowOriginalPct)))
    .filter((p): p is number => p != null && Number.isFinite(p));
  const dates = rows
    .map((r) => r.handoverDate)
    .filter((d): d is string => !!d)
    .sort();
  const names = ranked(
    rows,
    (r) => r.name,
    (n) => n,
  );
  return {
    slug,
    name: names[0].trim(),
    names,
    developers: ranked(rows, (r) => place(r.developer, r.developerOther), placeKey).filter(named),
    communities: ranked(rows, (r) => place(r.community, r.communityOther), placeKey).filter(named),
    handoverFrom: dates[0] ?? null,
    handoverTo: dates.at(-1) ?? null,
    dealCount: rows.length,
    belowOriginalCount: pcts.filter((p) => p >= 1).length,
    bestBelowOriginalPct: pcts.length ? Math.max(...pcts) : null,
    lastModified: new Date(Math.max(...rows.map((r) => r.updatedAt.getTime()))),
    refNos: rows.map((r) => r.refNo).sort((a, b) => a - b),
  };
}

/** Adverts grouped into projects by projectSlug (a name without one has no page), the most deals first, then by name. */
export function groupProjects(rows: ProjectRow[]): Project[] {
  const groups = new Map<string, ProjectRow[]>();
  for (const r of rows) {
    const slug = projectSlug(r.name);
    if (!slug) continue;
    const group = groups.get(slug);
    if (group) group.push(r);
    else groups.set(slug, [r]);
  }
  return [...groups]
    .map(([slug, group]) => summarize(slug, group))
    .sort((a, b) => b.dealCount - a.dealCount || a.name.localeCompare(b.name, "en"));
}

/**
 * Every project with at least one real advert: one query over the public set the sitemap and /deals use (advertisedSql,
 * no samples), grouped by groupProjects. Cached for the request (the deal page, the project page and its metadata share
 * it).
 */
export const liveProjects = cache(async (): Promise<Project[]> => {
  const rows: ProjectRow[] = await db
    .select({
      name: listings.projectName,
      developer: listings.developer,
      developerOther: listings.developerOther,
      community: listings.community,
      communityOther: listings.communityOther,
      handoverDate: listings.handoverDate,
      updatedAt: listings.updatedAt,
      refNo: listings.refNo,
      belowOriginalPct: belowOriginalPctSql,
    })
    .from(listings)
    .where(and(advertisedSql(), eq(listings.isSample, false)));
  return groupProjects(rows);
});

/** The project with this exact slug, or null (none, or no advert left). */
export async function getProject(slug: string) {
  return (await liveProjects()).find((p) => p.slug === slug) ?? null;
}

/** The project's deals as /deals shows them (the same cards, sort=discount), PROJECT_DEALS_LIMIT at most. */
export function projectDeals(project: Project) {
  return dealsInProjects(project.names, PROJECT_DEALS_LIMIT);
}

/** A project's place in an address: "/projects/volta" (localePath adds /ar or /zh). */
export function projectPath(project: Pick<Project, "slug">) {
  return `/projects/${project.slug}`;
}

// What a project page, a project card and /llms.txt say about a project, in a given language.

/**
 * Its developers, as the cards name them ("Emaar", "إعمار", the seller's own name for "Other"), in a list written out in
 * the language ("DAMAC, Emaar", "داماك، إعمار"); "" when none.
 */
export function projectDevelopers(project: Project, locale: Locale, separator = listSeparator(locale)) {
  const tc = translator("common", locale);
  return project.developers.map((d) => developerName(tc, d.name, d.other)).join(separator);
}

/** Its communities, likewise; "" when none is named. */
export function projectCommunities(project: Project, locale: Locale, separator = listSeparator(locale)) {
  const tc = translator("common", locale);
  return project.communities.map((c) => communityName(tc, c.name, c.other)).join(separator);
}

/**
 * The developer as a sentence names it: its name when the project has exactly one (and it is stated), else "the
 * developer". The copy never starts a sentence with it.
 */
export function projectDeveloperInSentence(project: Project, locale: Locale) {
  const [only, ...more] = project.developers;
  if (!only || more.length || developerNotStated(only.name, only.other)) return translator("projects", locale)("theDeveloper");
  return developerName(translator("common", locale), only.name, only.other);
}

/**
 * The two ends of its handover: the earliest and the latest deal's quarter ("Q4 2027", "Q2 2028"), the same quarter
 * twice when they agree. A date today or past reads "Ready", as on the cards (isReady in src/lib/deal-math.ts); "TBC"
 * when no deal has a date.
 */
export function projectHandoverRange(project: Pick<Project, "handoverFrom" | "handoverTo">, locale: Locale, today = dubaiToday()) {
  const tc = translator("common", locale);
  const label = (d: string | null) => (d && d <= today ? tc("handoverReady") : formatQuarter(d, locale));
  return { from: label(project.handoverFrom), to: label(project.handoverTo) };
}

/** Its handover as text: one quarter ("Q4 2027"), or the range ("Q4 2027 – Q2 2028"). */
export function projectHandover(project: Pick<Project, "handoverFrom" | "handoverTo">, locale: Locale) {
  const { from, to } = projectHandoverRange(project, locale);
  return from === to ? from : translator("projects", locale)("range", { from, to });
}

/** The page's title and H1: "below the original price" only when at least one of its deals is. */
export function projectTitle(project: Project, locale: Locale) {
  return translator("projects", locale)(project.belowOriginalCount >= 1 ? "titleBelow" : "titleNeutral", { project: project.name });
}

/** The best whole percentage below the original price, when it is 1% or more (null otherwise). */
export function projectBestPct(project: Project) {
  return project.bestBelowOriginalPct != null && project.bestBelowOriginalPct >= 1 ? project.bestBelowOriginalPct : null;
}
