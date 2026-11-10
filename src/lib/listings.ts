import "server-only";
import { and, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { listings, offers, users, watchlist } from "@/db/schema";
import { messages } from "@/i18n/messages";
import { cleanText } from "./clean-text";
import { COMMUNITIES, DEVELOPERS, FEES, UNIT_TYPES, type UnitTypeKey } from "./config";
import { FEE_BP, FIXED_FEES_ESTIMATE } from "./deal-math";
// Every list and figure here shows adverts only: a public status, and for a real listing a permit and Form A that
// haven't run out (advertisedSql), whether or not the daily job has paused it yet.
import { advertisedSql } from "./permits";
import { searchKey } from "./place-names";

const remaining = sql<number>`(${listings.originalPrice} - ${listings.amountPaid})`;
// bigint, as transferSaleValue below: asking + SPA price can pass the int4 limit (each fits) and would fail the query.
const saleValue = sql<number>`(${listings.askingPrice}::bigint + ${listings.originalPrice} - ${listings.amountPaid})`;

/**
 * Cash at transfer: the same definition as analyzeDeal's cashToClose in src/lib/deal-math.ts (see the comment there),
 * so the /deals transfer-day filters and the "cash" sort always agree with the cards and the deal page:
 *   asking + (commission + VAT on it, when the buyer pays our fee) + DLD transfer fee + FIXED_FEES_ESTIMATE
 *   + overdue instalments + late fees.
 * Percentages are whole basis points rounded half up on numerics (applyBp), matching Math.round on the JS side.
 */
const transferSaleValue = sql`(${listings.askingPrice}::bigint + greatest(${listings.originalPrice} - ${listings.amountPaid}, 0))`;
const bpOf = (amount: SQL, rateBp: number) => sql`round((${amount})::numeric * ${sql.raw(String(rateBp))} / 10000)`;
const commissionSql = bpOf(transferSaleValue, FEE_BP.commission);
const cashToClose = sql<number>`(${listings.askingPrice}::numeric${
  FEES.payer === "buyer" ? sql` + ${commissionSql} + ${bpOf(commissionSql, FEE_BP.vat)}` : sql``
} + ${bpOf(transferSaleValue, FEE_BP.dld)} + ${sql.raw(String(FIXED_FEES_ESTIMATE))} + greatest(coalesce(${
  listings.overdueAmount
}, 0), 0) + greatest(coalesce(${listings.overduePenalty}, 0), 0))::bigint`;
const discount = sql<number | null>`case when ${listings.launchPrice} > 0 then 1 - (${saleValue})::float / ${listings.launchPrice} end`;
/** How far below the original SPA price the unit sells for (negative when above it); null without an original price. */
const belowOriginal = sql<number | null>`case when ${listings.originalPrice} > 0 then 1 - (${saleValue})::float / ${listings.originalPrice} end`;
/**
 * The same as the whole percentage the cards' chip shows (discountPct in src/components/DiscountBadges.tsx): exact
 * numeric arithmetic rounded half up, so "15%+" finds every unit whose chip says 15% or more.
 */
const belowOriginalPct = sql<number | null>`case when ${listings.originalPrice} > 0 then floor((${listings.originalPrice} - ${saleValue})::numeric * 100 / ${listings.originalPrice} + 0.5) end`;
const paidPct = sql<number>`case when ${listings.originalPrice} > 0 then ${listings.amountPaid}::float / ${listings.originalPrice} else 0 end`;
/** The paid share as the whole percentage the deal page shows ("40% paid", wholePct in src/lib/format.ts), likewise. */
const paidWholePct = sql<number>`case when ${listings.originalPrice} > 0 then floor(${listings.amountPaid}::numeric * 100 / ${listings.originalPrice} + 0.5) else 0 end`;
const planRows = sql<number>`(case when jsonb_typeof(${listings.paymentPlan}) = 'array' then jsonb_array_length(${listings.paymentPlan}) else 0 end)`;
/**
 * No handover date, but fully paid with no plan rows: a ready unit (isReady in src/lib/deal-math.ts, which also counts a
 * handover date today or past). "Handover by" includes it and "Handover soonest" puts it first.
 */
const readyUndated = sql`(${listings.handoverDate} is null and ${listings.originalPrice} > 0 and ${listings.amountPaid} >= ${listings.originalPrice} and ${planRows} = 0)`;
const watchers = sql<number>`(select count(*)::int from ${watchlist} w where w.listing_id = ${listings.id})`;
// Qualified: in a select from listings alone Drizzle writes ${listings.id} as a bare "id", which inside the subquery
// would be the offer's own id (and the count always 0).
const offerCount = sql<number>`(select count(*)::int from ${offers} o where o.listing_id = ${sql.raw(`"listings"."id"`)})`;

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
  overdueAmount: listings.overdueAmount,
  overduePenalty: listings.overduePenalty,
  handoverDate: listings.handoverDate,
  planRows,
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
  /** Arrears (see schema.ts): part of the cash at transfer. */
  overdueAmount: number | null;
  overduePenalty: number | null;
  handoverDate: string | null;
  /** How many rows the listed payment plan has (isReady in src/lib/deal-math.ts). */
  planRows: number;
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
  /** Upfront cash to the seller (the asking price, equity) — what saved searches and /market links have always meant. */
  minCash?: number;
  maxCash?: number;
  /** Cash needed on transfer day (cashToCloseSql: equity + estimated fees + arrears). */
  minTransfer?: number;
  maxTransfer?: number;
  minPaid?: number;
  handoverBy?: number;
  /** Min. % below the original (SPA) price, as the whole percentage the cards' main chip shows (belowOriginalPct). */
  minDiscount?: number;
  verified?: boolean;
  sort: "discount" | "cash" | "handover" | "newest";
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

/** Repeated keys (type=1br&type=2br), comma-joined values (type=1br,2br) or both; DealFilters' panel reads them alike. */
function list(v: string | string[] | undefined) {
  if (v == null) return [];
  return (Array.isArray(v) ? v : [v])
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
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
  // Cash at transfer can exceed an int4 (equity + fees + arrears); a bigint bound is still a whole number.
  const minTransfer = num(params.minTransfer, 0, Number.MAX_SAFE_INTEGER);
  const maxTransfer = num(params.maxTransfer, 0, Number.MAX_SAFE_INTEGER);
  const handoverBy = num(params.handoverBy, 1900, 2200);
  return {
    // Hand-edited links can hold anything: a NUL byte in the search would make Postgres refuse the query (a 500).
    q: (q == null ? "" : cleanText(q)).trim().slice(0, 100) || undefined,
    community: list(params.community).filter((c) => COMMUNITIES.includes(c)),
    developer: list(params.developer).filter((d) => DEVELOPERS.includes(d)),
    // Own keys only: "toString" or "constructor" is `in` every object, and Postgres refuses it as a unit type (a 500).
    type: list(params.type).filter((t): t is UnitTypeKey => Object.hasOwn(UNIT_TYPES, t)),
    motivation: list(params.motivation).filter((m) => ["urgent", "motivated", "flexible"].includes(m)),
    minCash: !minCash ? undefined : Math.ceil(minCash), // price >= 1.5 ⇔ price >= 2
    maxCash: !maxCash ? undefined : Math.floor(maxCash), // 0 would match nothing: treat as "no limit"
    minTransfer: !minTransfer ? undefined : Math.ceil(minTransfer),
    maxTransfer: !maxTransfer ? undefined : Math.floor(maxTransfer),
    // 0 (or a negative value, clamped to 0) is no filter for these two, as the panel and the chips read it: "0%+ below
    // original" would otherwise hide the units priced above their original price, with no chip saying so.
    minPaid: num(params.minPaid, 0, 100) || undefined,
    minDiscount: num(params.minDiscount, 0, 100) || undefined,
    handoverBy: handoverBy == null ? undefined : Math.floor(handoverBy),
    verified: params.verified === "1" ? true : undefined,
    sort: ["discount", "cash", "handover", "newest"].includes(sort) ? sort : "discount",
    page: Math.floor(num(params.page, 1, 10_000) ?? 1),
  };
}

export const PAGE_SIZE = 12;

/**
 * The listed developers or communities (stored by their English name, config.ts) whose name in either language
 * contains the search text, matched as the pickers match (searchKey: case, accents, Arabic letter variants). Arabic
 * visitors see "إعمار" and "مرسى خور دبي" on every card, so that is what they type.
 */
function namedMatching(prefix: "developer" | "community", names: string[], q: string) {
  const needle = searchKey(q);
  if (!needle) return [];
  const en = messages.common.en as Record<string, string>;
  const ar = messages.common.ar as Record<string, string>;
  return names.filter(
    (name) => name !== "Other" && [name, en[`${prefix}.${name}`], ar[`${prefix}.${name}`]].some((label) => label && searchKey(label).includes(needle)),
  );
}

/** WHERE conditions for a set of deal filters: public listings matching every filter (sort/page ignored). */
function dealConditions(f: DealFilters): SQL[] {
  const where: SQL[] = [advertisedSql()];
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const developers = namedMatching("developer", DEVELOPERS, f.q);
    const communities = namedMatching("community", COMMUNITIES, f.q);
    where.push(
      or(
        ilike(listings.projectName, like),
        ilike(listings.developer, like),
        ilike(listings.community, like),
        ilike(listings.developerOther, like),
        ilike(listings.communityOther, like),
        ilike(listings.view, like),
        developers.length ? inArray(listings.developer, developers) : undefined,
        communities.length ? inArray(listings.community, communities) : undefined,
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
  // Bound as text with an explicit cast: both drivers (Neon HTTP, node-postgres) send it the same way.
  if (f.minTransfer != null) where.push(sql`${cashToClose} >= ${String(f.minTransfer)}::bigint`);
  if (f.maxTransfer != null) where.push(sql`${cashToClose} <= ${String(f.maxTransfer)}::bigint`);
  if (f.minPaid != null) where.push(sql`${paidWholePct} >= ${f.minPaid}`);
  // A unit handed over (a past date, or none but fully paid: readyUndated) is ready by any of the years offered.
  if (f.handoverBy != null) where.push(or(lte(listings.handoverDate, `${f.handoverBy}-12-31`), readyUndated)!);
  if (f.minDiscount != null) where.push(sql`${belowOriginalPct} >= ${f.minDiscount}`);
  // sample listings are illustrations: never "verified", whatever the column says
  if (f.verified) where.push(eq(listings.verified, true), eq(listings.isSample, false));
  return where;
}

/** The ORDER BY of a /deals sort; the caller adds the newest first as the last tiebreak. */
function dealOrder(sort: DealFilters["sort"]): SQL[] {
  return sort === "cash"
    ? [sql`${cashToClose} asc`]
    : sort === "handover"
      ? [sql`${readyUndated} desc`, sql`${listings.handoverDate} asc nulls last`]
      : sort === "newest"
        ? [desc(sql`coalesce(${listings.publishedAt}, ${listings.createdAt})`)]
        : // The default view: sellers who need out now come first, then the furthest below the original price.
          [sql`(${listings.motivation} = 'urgent') desc`, sql`${belowOriginal} desc nulls last`];
}

export async function searchDeals(f: DealFilters) {
  const where = dealConditions(f);
  const condition = and(...where);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(cardColumns)
      .from(listings)
      .where(condition)
      .orderBy(...dealOrder(f.sort), desc(listings.createdAt))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(listings).where(condition),
  ]);
  return { rows: rows as ListingCard[], total };
}

/**
 * Every real advert (no samples) of the given project names, the same cards as /deals: the available units first (status
 * live), then those under offer, each in the /deals default order (sort=discount). A project's page (projectDeals in
 * src/lib/projects.ts) lists them all.
 */
export async function dealsInProjects(names: string[]) {
  if (!names.length) return [];
  const rows = await db
    .select(cardColumns)
    .from(listings)
    .where(and(advertisedSql(), eq(listings.isSample, false), inArray(listings.projectName, names)))
    .orderBy(sql`(${listings.status} = 'live') desc`, ...dealOrder("discount"), desc(listings.createdAt));
  return rows as ListingCard[];
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
 * no later than `until` — newest first, plus how many there are in total. Used by saved-search alerts, which list each
 * deal with its permit line (permitLine in src/lib/notification-templates.ts), hence the two permit columns.
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
      .select({ ...cardColumns, dldPermit: listings.dldPermit, permitAttestedAt: listings.permitAttestedAt })
      .from(listings)
      .where(condition)
      .orderBy(desc(publishedOrCreated), desc(listings.createdAt))
      .limit(opts.limit ?? 10),
    db.select({ total: sql<number>`count(*)::int` }).from(listings).where(condition),
  ]);
  return { rows: rows as (ListingCard & { dldPermit: string | null; permitAttestedAt: Date | null })[], total };
}

/**
 * For the saved-searches page: how many adverts match the filters, and how many of those went public after `since`
 * (when the search was saved), both counted in SQL rather than on a page of results.
 */
export async function searchCounts(f: DealFilters, since: Date) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      fresh: sql<number>`(count(*) filter (where ${publishedOrCreated} > ${since.toISOString()}::timestamptz))::int`,
    })
    .from(listings)
    .where(and(...dealConditions(f)));
  return row;
}

export async function featuredDeals(limit = 6) {
  const rows = await db
    .select(cardColumns)
    .from(listings)
    .where(and(eq(listings.status, "live"), advertisedSql()))
    // The home strip and the hero card: furthest below the original price first (every unit has one), the launch
    // discount as the tiebreak.
    .orderBy(sql`${belowOriginal} desc nulls last`, sql`${discount} desc nulls last`)
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
      // How far below what the seller paid the developer (the SPA price) the unit sells for: known for every real
      // listing, unlike today's launch price, so the home page can always show it.
      belowOriginal: sql<number | null>`avg(${belowOriginal}) filter (where ${onMarket})`,
      withOriginal: sql<number>`count(${belowOriginal}) filter (where ${onMarket})::int`,
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
    belowOriginal: row.belowOriginal == null ? null : Number(row.belowOriginal),
    withOriginal: row.withOriginal,
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
    .orderBy(sql`${belowOriginal} desc nulls last`, sql`${discount} desc nulls last`)
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
  cashToClose as cashToCloseSql,
  remaining as remainingSql,
  discount as discountSql,
  belowOriginalPct as belowOriginalPctSql,
  paidPct as paidPctSql,
  planRows as planRowsSql,
};
