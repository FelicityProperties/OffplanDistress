import "server-only";
import { and, eq, max, notInArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { listSeparator, type Locale } from "@/i18n/config";
import { translator, type TFn } from "@/i18n/translator";
import type { ListingStatusKey } from "./config";
import { isReady } from "./deal-math";
import { formatQuarter } from "./format";
import { belowOriginalPctSql, dealsInProjects, planRowsSql } from "./listings";
import { advertisedSql, dubaiToday } from "./permits";
import { communityName, developerName, developerNotStated } from "./place-names";

// Project pages (/projects and /projects/<slug>): one page per project with at least one available unit (a real advert,
// status live), built from the public set /deals and the sitemap use (advertisedSql, no samples). Its units under offer
// (backup offers are still possible) are listed after the available ones, but nothing the page claims (the title, the
// unit count, "up to X% below the original price") counts them. A project is the listings' project name; spellings that
// differ only in case, accents or punctuation ("Sls Residences The Palm", "SLS Residences the Palm") share one page
// through projectSlug.

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
  /** The earliest and the latest handover date of its units not handed over yet ("YYYY-MM-DD"); null when none has one. */
  handoverFrom: string | null;
  handoverTo: string | null;
  /** Units already handed over (isReady: shown as "Ready" on the cards). */
  readyCount: number;
  /** Units with nothing left to pay the developer. */
  paidCount: number;
  /** Every unit its page lists: the available ones and those under offer. */
  dealCount: number;
  /** The available units (status live): what the title, the facts, the meta description and /llms.txt count. */
  liveCount: number;
  /** Available units whose chip says 1% or more below the original price (belowOriginalPct: the cards' whole percentage). */
  belowOriginalCount: number;
  /** The highest of the available units' percentages (0 or less when none is below); null when none has an original price. */
  bestBelowOriginalPct: number | null;
  /**
   * When one of its units last changed, including one that left the page (sold, withdrawn, paused): the sitemap's
   * lastmod, which then moves forward when the page loses a card.
   */
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
  status: ListingStatusKey;
  /** Handed over (isReady in src/lib/deal-math.ts: the date today or past, or none but fully paid with no plan rows). */
  ready: boolean;
  /** Nothing left to pay the developer (the amount paid reaches the original price), as the deal page decides it. */
  paid: boolean;
};

/** When a listing with this project name last changed, whatever its status now (liveProjects' second query). */
export type ProjectTouch = { name: string; updatedAt: Date | null };

/** The seller's own name only counts for "Other" (it may be left over from before our team mapped the listing). */
const place = (name: string, other: string | null): Place => ({ name, other: name === "Other" ? other?.trim() || null : null });
const placeKey = (p: Place) => `${p.name}\u0000${(p.other ?? "").toLowerCase()}`;
const named = (p: Place) => p.name !== "Other" || p.other != null;

/**
 * Distinct values, the most frequent first; a tie: the most recently updated first, then the first met. The rows arrive
 * newest first (groupProjects sorts them), so that last rule, and the spelling kept for a value met in several (the
 * seller's "ROYA" and "Roya"), never depend on the order the database returned them in.
 */
function ranked<T>(rows: ProjectRow[], pick: (r: ProjectRow) => T, key: (v: T) => string): T[] {
  const seen = new Map<string, { value: T; count: number; latest: number; first: number }>();
  rows.forEach((r, i) => {
    const value = pick(r);
    const k = key(value);
    const time = r.updatedAt.getTime();
    const entry = seen.get(k);
    if (entry) {
      entry.count++;
      entry.latest = Math.max(entry.latest, time);
    } else seen.set(k, { value, count: 1, latest: time, first: i });
  });
  return [...seen.values()].sort((a, b) => b.count - a.count || b.latest - a.latest || a.first - b.first).map((e) => e.value);
}

function summarize(slug: string, rows: ProjectRow[], touched: number): Project {
  const live = rows.filter((r) => r.status === "live");
  // A Postgres numeric (floor() of one) arrives as a string from both drivers.
  const pcts = live
    .map((r) => (r.belowOriginalPct == null ? null : Number(r.belowOriginalPct)))
    .filter((p): p is number => p != null && Number.isFinite(p));
  const dates = rows
    .filter((r) => !r.ready)
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
    readyCount: rows.filter((r) => r.ready).length,
    paidCount: rows.filter((r) => r.paid).length,
    dealCount: rows.length,
    liveCount: live.length,
    belowOriginalCount: pcts.filter((p) => p >= 1).length,
    bestBelowOriginalPct: pcts.length ? Math.max(...pcts) : null,
    lastModified: new Date(Math.max(touched, ...rows.map((r) => r.updatedAt.getTime()))),
    refNos: rows.map((r) => r.refNo).sort((a, b) => a - b),
  };
}

/**
 * Adverts grouped into projects by projectSlug (a name without one has no page). Only a project with an available unit
 * has a page; the most available units first, then the most units, then by name. `touched`: when each project name last
 * changed at all (its units that left the page included), for lastModified.
 */
export function groupProjects(rows: ProjectRow[], touched: ProjectTouch[] = []): Project[] {
  const groups = new Map<string, ProjectRow[]>();
  const newestFirst = [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.refNo - a.refNo);
  for (const r of newestFirst) {
    const slug = projectSlug(r.name);
    if (!slug) continue;
    const group = groups.get(slug);
    if (group) group.push(r);
    else groups.set(slug, [r]);
  }
  const lastTouched = new Map<string, number>();
  for (const t of touched) {
    const slug = projectSlug(t.name);
    if (slug && t.updatedAt) lastTouched.set(slug, Math.max(lastTouched.get(slug) ?? 0, t.updatedAt.getTime()));
  }
  return [...groups]
    .map(([slug, group]) => summarize(slug, group, lastTouched.get(slug) ?? 0))
    .filter((p) => p.liveCount > 0)
    .sort((a, b) => b.liveCount - a.liveCount || b.dealCount - a.dealCount || a.name.localeCompare(b.name, "en"));
}

/**
 * Every project with an available unit: one query over the public set the sitemap and /deals use (advertisedSql, no
 * samples), grouped by groupProjects, and one for when each project name last changed. Cached for the request (the deal
 * page, the project page and its metadata share it).
 */
export const liveProjects = cache(async (): Promise<Project[]> => {
  const today = dubaiToday();
  const [rows, touched] = await Promise.all([
    db
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
        status: listings.status,
        originalPrice: listings.originalPrice,
        amountPaid: listings.amountPaid,
        planRows: planRowsSql,
      })
      .from(listings)
      .where(and(advertisedSql(today), eq(listings.isSample, false))),
    // A unit sold, withdrawn or paused leaves the page (and moves its updated_at): its project's page changed too. Only a
    // listing that never went public (pending review, rejected) can't have been on a page.
    db
      .select({ name: listings.projectName, updatedAt: max(listings.updatedAt) })
      .from(listings)
      .where(and(eq(listings.isSample, false), notInArray(listings.status, ["pending_review", "rejected"])))
      .groupBy(listings.projectName),
  ]);
  return groupProjects(
    rows.map(({ originalPrice, amountPaid, planRows, ...r }) => ({
      ...r,
      ready: isReady({ handoverDate: r.handoverDate, originalPrice, amountPaid, planRows: Number(planRows) }, today),
      paid: originalPrice - amountPaid <= 0,
    })),
    touched,
  );
});

/** The project with this exact slug, or null (none, or no available unit left). */
export async function getProject(slug: string) {
  return (await liveProjects()).find((p) => p.slug === slug) ?? null;
}

/** Every unit the project's page lists, the /deals cards: the available ones first, then those under offer. */
export function projectDeals(project: Project) {
  return dealsInProjects(project.names);
}

/** A project's place in an address: "/projects/volta" (localePath adds /ar or /zh). */
export function projectPath(project: Pick<Project, "slug">) {
  return `/projects/${project.slug}`;
}

// What a project page, a project card and /llms.txt say about a project, in a given language.

/** A space between two Chinese characters (the glossary allows none). */
const HAN_GAP = /(?<=\p{Script=Han}) (?=\p{Script=Han})/gu;

/**
 * The "projects" copy in a language. The Chinese strings space a placeholder from the characters around it, as a Latin
 * name ("向 {developer} 支付") or a number needs; when it holds Chinese ("开发商", "2028 年第一季度"), that space goes.
 */
export function projectsT(locale: Locale): TFn<"projects"> {
  const t = translator("projects", locale);
  return locale === "zh" ? (key, vars) => t(key, vars).replace(HAN_GAP, "") : t;
}

/** The developers a sentence or a list of facts can name: without the partner sync's "Not stated" placeholder. */
function statedDevelopers(project: Pick<Project, "developers">) {
  return project.developers.filter((d) => !developerNotStated(d.name, d.other));
}

/**
 * Its developers, as the cards name them ("Emaar", "إعمار", the seller's own name for "Other"), in a list written out in
 * the language ("DAMAC, Emaar", "داماك، إعمار"); "" when none. `stated`: leave out a developer the listing doesn't name
 * (the partner sync's placeholder, which the facts card shows as "Developer not stated"), for a sentence or a summary.
 */
export function projectDevelopers(project: Pick<Project, "developers">, locale: Locale, separator = listSeparator(locale), stated = false) {
  const tc = translator("common", locale);
  return (stated ? statedDevelopers(project) : project.developers).map((d) => developerName(tc, d.name, d.other)).join(separator);
}

/** Its communities, likewise; "" when none is named. */
export function projectCommunities(project: Pick<Project, "communities">, locale: Locale, separator = listSeparator(locale)) {
  const tc = translator("common", locale);
  return project.communities.map((c) => communityName(tc, c.name, c.other)).join(separator);
}

/**
 * The developer as a sentence names it: its name when the project has exactly one (and it is stated), else "the
 * developer". The copy never starts a sentence with it.
 */
export function projectDeveloperInSentence(project: Pick<Project, "developers">, locale: Locale) {
  const [only, ...more] = project.developers;
  if (!only || more.length || developerNotStated(only.name, only.other)) return translator("projects", locale)("theDeveloper");
  return developerName(translator("common", locale), only.name, only.other);
}

type Handover = Pick<Project, "handoverFrom" | "handoverTo" | "readyCount">;

/**
 * The two ends of its handover, as the cards write each unit's (isReady in src/lib/deal-math.ts): "Ready" when one of
 * its units is handed over, else the earliest unit's quarter ("Q4 2027"); then the latest quarter still to come, or the
 * same value again when there is none. "TBC" when no unit is ready or dated.
 */
export function projectHandoverRange(project: Handover, locale: Locale, today = dubaiToday()) {
  const tc = translator("common", locale);
  const label = (d: string | null) => (d && d <= today ? tc("handoverReady") : formatQuarter(d, locale));
  const from = project.readyCount > 0 ? tc("handoverReady") : label(project.handoverFrom);
  return { from, to: project.handoverTo ? label(project.handoverTo) : from };
}

/** Its handover as text: one value ("Q4 2027", "Ready"), or the range ("Q4 2027 – Q2 2028", "Ready – Q2 2028"). */
export function projectHandover(project: Handover, locale: Locale, today = dubaiToday()) {
  const { from, to } = projectHandoverRange(project, locale, today);
  return from === to ? from : projectsT(locale)("range", { from, to });
}

/**
 * The page's title and H1: "below the original price" only when one of its available units is; otherwise the neutral
 * title, which says "off-plan" only when none of its units is handed over.
 */
export function projectTitle(project: Pick<Project, "name" | "belowOriginalCount" | "readyCount">, locale: Locale) {
  const key = project.belowOriginalCount >= 1 ? "titleBelow" : project.readyCount > 0 ? "titleNeutralReady" : "titleNeutral";
  return projectsT(locale)(key, { project: project.name });
}

/** The best whole percentage below the original price among its available units, when it is 1% or more (null otherwise). */
export function projectBestPct(project: Pick<Project, "bestBelowOriginalPct">) {
  return project.bestBelowOriginalPct != null && project.bestBelowOriginalPct >= 1 ? project.bestBelowOriginalPct : null;
}
