import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { listings, offers, users, watchlist } from "@/db/schema";
import { COMMUNITIES, DEVELOPERS, UNIT_TYPES, type UnitTypeKey } from "./config";
// Every list and figure here shows adverts only: a public status, and for a real listing a permit and Form A that
// haven't run out (advertisedSql), whether or not the daily job has paused it yet.
import { advertisedSql } from "./permits";

const remaining = sql<number>`(${listings.originalPrice} - ${listings.amountPaid})`;
const saleValue = sql<number>`(${listings.askingPrice} + ${listings.originalPrice} - ${listings.amountPaid})`;
const discount = sql<number | null>`case when ${listings.launchPrice} > 0 then 1 - (${saleValue})::float / ${listings.launchPrice} end`;
const paidPct = sql<number>`case when ${listings.originalPrice} > 0 then ${listings.amountPaid}::float / ${listings.originalPrice} else 0 end`;
const watchers = sql<number>`(select count(*)::int from ${watchlist} w where w.listing_id = ${listings.id})`;
const offerCount = sql<number>`(select count(*)::int from ${offers} o where o.listing_id = ${listings.id})`;

export const cardColumns = {
  id: listings.id,
  refNo: listings.refNo,
  status: listings.status,
  verified: listings.verified,
  projectName: listings.projectName,
  developer: listings.developer,
  community: listings.community,
  developerOther: listings.developerOther,
  communityOther: listings.communityOther,
  unitType: listings.unitType,
  sizeSqft: listings.sizeSqft,
  view: listings.view,
  originalPrice: listings.originalPrice,
  amountPaid: listings.amountPaid,
  askingPrice: listings.askingPrice,
  launchPrice: listings.launchPrice,
  handoverDate: listings.handoverDate,
  motivation: listings.motivation,
  images: listings.images,
  isSample: listings.isSample,
  publishedAt: listings.publishedAt,
  createdAt: listings.createdAt,
  watchers,
};

export type ListingCard = {
  id: string;
  refNo: number;
  status: (typeof listings.$inferSelect)["status"];
  verified: boolean;
  projectName: string;
  developer: string;
  community: string;
  /** The seller's own name when developer / community is "Other". */
  developerOther: string | null;
  communityOther: string | null;
  unitType: UnitTypeKey;
  sizeSqft: number;
  view: string | null;
  originalPrice: number;
  amountPaid: number;
  askingPrice: number;
  launchPrice: number | null;
  handoverDate: string | null;
  motivation: "urgent" | "motivated" | "flexible";
  images: string[];
  isSample: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  watchers: number;
};

export type DealFilters = {
  q?: string;
  community: string[];
  developer: string[];
  type: UnitTypeKey[];
  motivation: string[];
  minCash?: number;
  maxCash?: number;
  minPaid?: number;
  handoverBy?: number;
  minDiscount?: number;
  verified?: boolean;
  sort: "discount" | "cash" | "handover" | "newest";
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined) {
  if (v == null) return [];
  return (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
}

/** A number from the query string clamped to [min, max]; hand-edited links can hold anything. */
function num(v: string | string[] | undefined, min: number, max: number) {
  const s = Array.isArray(v) ? v[0] : v;
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : undefined;
}

const MAX_AED = 2_147_483_647; // prices are int4 columns

export function parseFilters(params: RawParams): DealFilters {
  const sort = (Array.isArray(params.sort) ? params.sort[0] : params.sort) as DealFilters["sort"];
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  // Whole numbers where the column is an integer (Postgres rejects "1.5" for int4); the bounds are integers.
  const minCash = num(params.minCash, 0, MAX_AED);
  const maxCash = num(params.maxCash, 0, MAX_AED);
  const handoverBy = num(params.handoverBy, 1900, 2200);
  return {
    q: q?.trim() || undefined,
    community: list(params.community).filter((c) => COMMUNITIES.includes(c)),
    developer: list(params.developer).filter((d) => DEVELOPERS.includes(d)),
    type: list(params.type).filter((t): t is UnitTypeKey => t in UNIT_TYPES),
    motivation: list(params.motivation).filter((m) => ["urgent", "motivated", "flexible"].includes(m)),
    minCash: !minCash ? undefined : Math.ceil(minCash), // price >= 1.5 ⇔ price >= 2
    maxCash: !maxCash ? undefined : Math.floor(maxCash), // 0 would match nothing: treat as "no limit"
    minPaid: num(params.minPaid, 0, 100),
    handoverBy: handoverBy == null ? undefined : Math.floor(handoverBy),
    minDiscount: num(params.minDiscount, 0, 100),
    verified: params.verified === "1" ? true : undefined,
    sort: ["discount", "cash", "handover", "newest"].includes(sort) ? sort : "discount",
    page: Math.floor(num(params.page, 1, 10_000) ?? 1),
  };
}

export const PAGE_SIZE = 12;

/** WHERE conditions for a set of deal filters: public listings matching every filter (sort/page ignored). */
function dealConditions(f: DealFilters): SQL[] {
  const where: SQL[] = [advertisedSql()];
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    where.push(
      or(
        ilike(listings.projectName, like),
        ilike(listings.developer, like),
        ilike(listings.community, like),
        ilike(listings.developerOther, like),
        ilike(listings.communityOther, like),
        ilike(listings.view, like),
      )!,
    );
  }
  if (f.community.length) where.push(inArray(listings.community, f.community));
  if (f.developer.length) where.push(inArray(listings.developer, f.developer));
  if (f.type.length) where.push(inArray(listings.unitType, f.type));
  if (f.motivation.length)
    where.push(inArray(listings.motivation, f.motivation as ("urgent" | "motivated" | "flexible")[]));
  if (f.minCash != null) where.push(gte(listings.askingPrice, f.minCash));
  if (f.maxCash != null) where.push(lte(listings.askingPrice, f.maxCash));
  if (f.minPaid != null) where.push(sql`${paidPct} >= ${f.minPaid / 100}`);
  if (f.handoverBy != null) where.push(lte(listings.handoverDate, `${f.handoverBy}-12-31`));
  if (f.minDiscount != null) where.push(sql`${discount} >= ${f.minDiscount / 100}`);
  // sample listings are illustrations: never "verified", whatever the column says
  if (f.verified) where.push(eq(listings.verified, true), eq(listings.isSample, false));
  return where;
}

export async function searchDeals(f: DealFilters) {
  const where = dealConditions(f);

  const order =
    f.sort === "cash"
      ? [asc(listings.askingPrice)]
      : f.sort === "handover"
        ? [sql`${listings.handoverDate} asc nulls last`]
        : f.sort === "newest"
          ? [desc(sql`coalesce(${listings.publishedAt}, ${listings.createdAt})`)]
          : [sql`${discount} desc nulls last`];

  const condition = and(...where);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(cardColumns)
      .from(listings)
      .where(condition)
      .orderBy(...order, desc(listings.createdAt))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(listings).where(condition),
  ]);
  return { rows: rows as ListingCard[], total };
}

/** Filters from a saved /deals query string ("community=Business+Bay&type=1br&type=2br"). */
export function filtersFromQuery(query: string): DealFilters {
  const grouped = new Map<string, string[]>();
  for (const [k, v] of new URLSearchParams(query)) grouped.set(k, [...(grouped.get(k) ?? []), v]);
  return parseFilters(Object.fromEntries([...grouped].map(([k, v]) => [k, v.length === 1 ? v[0] : v])));
}

const publishedOrCreated = sql`coalesce(${listings.publishedAt}, ${listings.createdAt})`;

/**
 * Live listings (no samples) matching the filters that went public after `since` — and, when given,
 * no later than `until` — newest first, plus how many there are in total. Used by saved-search alerts.
 */
export async function newDealsSince(f: DealFilters, since: Date, opts: { until?: Date; limit?: number } = {}) {
  const condition = and(
    ...dealConditions(f),
    eq(listings.status, "live"),
    eq(listings.isSample, false),
    // ISO strings + explicit cast: both database drivers (Neon HTTP, node-postgres) bind them the same way.
    sql`${publishedOrCreated} > ${since.toISOString()}::timestamptz`,
    opts.until ? sql`${publishedOrCreated} <= ${opts.until.toISOString()}::timestamptz` : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(cardColumns)
      .from(listings)
      .where(condition)
      .orderBy(desc(publishedOrCreated), desc(listings.createdAt))
      .limit(opts.limit ?? 10),
    db.select({ total: sql<number>`count(*)::int` }).from(listings).where(condition),
  ]);
  return { rows: rows as ListingCard[], total };
}

export async function featuredDeals(limit = 6) {
  const rows = await db
    .select(cardColumns)
    .from(listings)
    .where(and(eq(listings.status, "live"), advertisedSql()))
    .orderBy(sql`${discount} desc nulls last`)
    .limit(limit);
  return rows as ListingCard[];
}

/**
 * Home-page figures, defined like the Distress Index (/market): real listings only (samples are illustrations,
 * not market data), "on the market" = every advert a buyer can see, and staff accounts don't count as buyers.
 */
export async function marketStats() {
  const onMarket = advertisedSql();
  const [row] = await db
    .select({
      live: sql<number>`count(*) filter (where ${onMarket})::int`,
      value: sql<number>`coalesce(sum(${saleValue}) filter (where ${onMarket}), 0)::bigint`,
      avgDiscount: sql<number | null>`avg(${discount}) filter (where ${onMarket})`,
      withLaunch: sql<number>`count(${discount}) filter (where ${onMarket})::int`,
      transferred: sql<number>`count(*) filter (where ${listings.status} = 'transferred')::int`,
    })
    .from(listings)
    .where(eq(listings.isSample, false));
  const [{ buyers }] = await db
    .select({ buyers: sql<number>`count(distinct ${watchlist.userId})::int` })
    .from(watchlist)
    .innerJoin(listings, and(eq(listings.id, watchlist.listingId), eq(listings.isSample, false), onMarket))
    .innerJoin(users, and(eq(users.id, watchlist.userId), eq(users.role, "user")));
  return {
    live: row.live,
    value: Number(row.value),
    avgDiscount: row.avgDiscount == null ? null : Number(row.avgDiscount),
    withLaunch: row.withLaunch,
    transferred: row.transferred,
    buyers,
  };
}

export async function getListingByRef(refNo: number) {
  const [row] = await db
    .select({
      listing: listings,
      watchers,
      offerCount,
    })
    .from(listings)
    .where(eq(listings.refNo, refNo))
    .limit(1);
  return row ?? null;
}

export async function similarDeals(l: { id: string; community: string; developer: string }, limit = 3) {
  // "Other" is a bucket, not a place or a developer: two "Other" listings have nothing in common.
  const same = [
    l.community !== "Other" ? eq(listings.community, l.community) : undefined,
    l.developer !== "Other" ? eq(listings.developer, l.developer) : undefined,
  ].filter((c) => c != null);
  if (!same.length) return [];
  const rows = await db
    .select(cardColumns)
    .from(listings)
    .where(and(advertisedSql(), ne(listings.id, l.id), or(...same)))
    .orderBy(sql`${discount} desc nulls last`)
    .limit(limit);
  return rows as ListingCard[];
}

/**
 * Communities and developers from the lists in config.ts that have at least one listing a buyer can see, so the deals
 * filter panel only offers choices that find something.
 */
export async function dealFacets() {
  const onMarket = advertisedSql();
  const [communities, developers] = await Promise.all([
    db.selectDistinct({ name: listings.community }).from(listings).where(onMarket),
    db.selectDistinct({ name: listings.developer }).from(listings).where(onMarket),
  ]);
  return {
    communities: COMMUNITIES.filter((c) => c !== "Other" && communities.some((r) => r.name === c)),
    developers: DEVELOPERS.filter((d) => d !== "Other" && developers.some((r) => r.name === d)),
  };
}

export async function watchedIds(userId: string | undefined) {
  if (!userId) return new Set<string>();
  const rows = await db.select({ id: watchlist.listingId }).from(watchlist).where(eq(watchlist.userId, userId));
  return new Set(rows.map((r) => r.id));
}

export {
  watchers as watchersSql,
  offerCount as offerCountSql,
  saleValue as saleValueSql,
  remaining as remainingSql,
  discount as discountSql,
  paidPct as paidPctSql,
};
