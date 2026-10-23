import "server-only";
import { and, eq, inArray, isNotNull, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { listings, offers, savedSearches, watchlist } from "@/db/schema";
import { PUBLIC_STATUSES } from "./config";
import { saleValueSql } from "./listings";

// The Dubai Distress Index (/market): live statistics computed only from real listings and real activity.
// Sample listings (is_sample = true) are excluded from every figure, including the demand figures.

/** A median, average or share is published only when it rests on at least this many listings. */
export const MIN_SAMPLE = 3;
/** Below this many real listings on the market the page shows the "launching soon" state instead of the index. */
export const MIN_LIVE = 5;
export const DUBAI_TZ = "Asia/Dubai";

// Same definitions as src/lib/listings.ts, so the index agrees with the deal cards and the /deals filters:
// discount = 1 − sale value ÷ today's launch price (only when a launch price is set), sale value = asking + remaining plan,
// paid = amount paid to the developer ÷ original purchase price.
const discount = sql<number | null>`case when ${listings.launchPrice} > 0 then 1 - (${saleValueSql})::float / ${listings.launchPrice} end`;
const paidPct = sql<number>`case when ${listings.originalPrice} > 0 then ${listings.amountPaid}::float / ${listings.originalPrice} else 0 end`;

/** Real listings a buyer can see on the marketplace right now. */
const onMarket = and(inArray(listings.status, PUBLIC_STATUSES), eq(listings.isSample, false))!;

const count = sql<number>`count(*)::int`;
const median = (x: SQL | typeof listings.askingPrice) => sql<number | null>`percentile_cont(0.5) within group (order by ${x})`;
const countWhere = (cond: SQL) => sql<number>`(count(*) filter (where ${cond}))::int`;

/** Upfront cash = the asking price (what the buyer pays the seller); the bounds match the /deals budget filter. */
export const CASH_BANDS = [
  { key: "lt500k", min: null, max: 499_999 },
  { key: "500kTo1m", min: 500_000, max: 999_999 },
  { key: "1mTo2m", min: 1_000_000, max: 2_000_000 },
  { key: "gt2m", min: 2_000_001, max: null },
] as const;
export type CashBandKey = (typeof CASH_BANDS)[number]["key"];

function bandCondition(b: (typeof CASH_BANDS)[number]): SQL {
  const parts: SQL[] = [];
  if (b.min != null) parts.push(sql`${listings.askingPrice} >= ${sql.raw(String(b.min))}`);
  if (b.max != null) parts.push(sql`${listings.askingPrice} <= ${sql.raw(String(b.max))}`);
  return and(...parts)!;
}

const bandOf = sql<CashBandKey>`case ${sql.join(
  CASH_BANDS.map((b) => sql`when ${bandCondition(b)} then ${sql.raw(`'${b.key}'`)}`),
  sql` `,
)} end`;

/** Postgres returns bigint sums and some aggregates as strings; null stays null. */
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** A value that is only meaningful with enough listings behind it. */
function gated(v: unknown, n: number) {
  return n >= MIN_SAMPLE ? num(v) : null;
}

/** "YYYY-MM" for the Dubai calendar month `back` months before the current one. */
function dubaiMonthKey(now: Date, back: number) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: DUBAI_TZ, year: "numeric", month: "2-digit" }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value) - 1 - back;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const MONTHS = 6;

export type CommunityRow = {
  name: string;
  count: number;
  /** listings in the community with a launch price (the discount sample) */
  withLaunch: number;
  medianDiscount: number | null;
  medianPaid: number | null;
};

export type DistressIndex = Awaited<ReturnType<typeof getDistressIndex>>;

export async function getDistressIndex() {
  const asOf = new Date();

  const monthKey = sql<string>`to_char(date_trunc('month', ${listings.publishedAt} at time zone 'Asia/Dubai'), 'YYYY-MM')`;

  const [[supply], communities, developers, monthly, bands, [recentOffers], [watchers], [alerts], [completed]] =
    await Promise.all([
      db
        .select({
          live: count,
          available: countWhere(sql`${listings.status} = 'live'`),
          saleValue: sql<string>`coalesce(sum(${saleValueSql}), 0)::bigint`,
          upfront: sql<string>`coalesce(sum(${listings.askingPrice}), 0)::bigint`,
          withLaunch: sql<number>`count(${discount})::int`,
          medianDiscount: median(discount),
          avgDiscount: sql<number | null>`avg(${discount})`,
          medianPaid: median(paidPct),
          medianUpfront: median(listings.askingPrice),
          urgent: countWhere(sql`${listings.motivation} = 'urgent'`),
          motivated: countWhere(sql`${listings.motivation} = 'motivated'`),
          flexible: countWhere(sql`${listings.motivation} = 'flexible'`),
          noc: countWhere(sql`${listings.nocEligible}`),
          verified: countWhere(sql`${listings.verified}`),
          belowPaid: countWhere(sql`${listings.askingPrice} < ${listings.amountPaid}`),
        })
        .from(listings)
        .where(onMarket),
      db
        .select({
          name: listings.community,
          count,
          withLaunch: sql<number>`count(${discount})::int`,
          medianDiscount: median(discount),
          medianPaid: median(paidPct),
        })
        .from(listings)
        .where(onMarket)
        .groupBy(listings.community)
        .orderBy(sql`count(*) desc`, listings.community),
      db
        .select({ name: listings.developer, count })
        .from(listings)
        .where(onMarket)
        .groupBy(listings.developer)
        .orderBy(sql`count(*) desc`, listings.developer),
      // Listings that reached the market in each of the last six Dubai calendar months, whatever their status now
      // (only those never approved — still under review, or rejected — are left out).
      db
        .select({ month: monthKey, count })
        .from(listings)
        .where(
          and(
            eq(listings.isSample, false),
            isNotNull(listings.publishedAt),
            notInArray(listings.status, ["pending_review", "rejected"]),
            sql`${listings.publishedAt} >= (date_trunc('month', now() at time zone 'Asia/Dubai') - interval '${sql.raw(String(MONTHS - 1))} months') at time zone 'Asia/Dubai'`,
          ),
        )
        .groupBy(sql`1`),
      // Listings on the market by upfront-cash band, with the offers they have received.
      db
        .select({
          band: bandOf,
          listings: sql<number>`count(distinct ${listings.id})::int`,
          offers: sql<number>`count(${offers.id})::int`,
        })
        .from(listings)
        .leftJoin(offers, eq(offers.listingId, listings.id))
        .where(onMarket)
        .groupBy(sql`1`),
      db
        .select({ offers: count, buyers: sql<number>`count(distinct ${offers.buyerId})::int` })
        .from(offers)
        .innerJoin(listings, eq(offers.listingId, listings.id))
        .where(and(eq(listings.isSample, false), sql`${offers.createdAt} >= now() - interval '30 days'`)),
      db
        .select({ buyers: sql<number>`count(distinct ${watchlist.userId})::int` })
        .from(watchlist)
        .innerJoin(listings, eq(watchlist.listingId, listings.id))
        .where(onMarket),
      db.select({ n: count }).from(savedSearches).where(eq(savedSearches.alerts, true)),
      // Days from going public to transfer. updated_at is the last change to a transferred listing, normally the
      // transfer itself, so this is an approximation.
      db
        .select({
          transferred: count,
          withDates: sql<number>`count(${listings.publishedAt})::int`,
          medianDays: median(sql`extract(epoch from (${listings.updatedAt} - ${listings.publishedAt})) / 86400`),
        })
        .from(listings)
        .where(and(eq(listings.status, "transferred"), eq(listings.isSample, false))),
    ]);

  const live = supply.live;
  const byBand = new Map(bands.map((r) => [r.band, r]));
  const offersOnMarket = bands.reduce((sum, r) => sum + r.offers, 0);
  const byMonth = new Map(monthly.map((r) => [r.month, r.count]));

  return {
    asOf,
    live,
    ready: live >= MIN_LIVE,
    supply: {
      live,
      available: supply.available,
      underOffer: live - supply.available,
      saleValue: num(supply.saleValue) ?? 0,
      upfront: num(supply.upfront) ?? 0,
      withLaunch: supply.withLaunch,
      medianDiscount: gated(supply.medianDiscount, supply.withLaunch),
      avgDiscount: gated(supply.avgDiscount, supply.withLaunch),
      medianPaid: gated(supply.medianPaid, live),
      medianUpfront: gated(supply.medianUpfront, live),
      motivation: { urgent: supply.urgent, motivated: supply.motivated, flexible: supply.flexible },
      noc: supply.noc,
      verified: supply.verified,
      belowPaid: supply.belowPaid,
      cash: CASH_BANDS.map((b) => ({ ...b, count: byBand.get(b.key)?.listings ?? 0, offers: byBand.get(b.key)?.offers ?? 0 })),
      communities: communities.map(
        (c): CommunityRow => ({
          name: c.name,
          count: c.count,
          withLaunch: c.withLaunch,
          medianDiscount: gated(c.medianDiscount, c.withLaunch),
          medianPaid: gated(c.medianPaid, c.count),
        }),
      ),
      developers,
      monthly: Array.from({ length: MONTHS }, (_, i) => {
        const month = dubaiMonthKey(asOf, MONTHS - 1 - i);
        return { month, count: byMonth.get(month) ?? 0 };
      }),
    },
    demand: {
      offers30d: recentOffers.offers,
      bidders30d: recentOffers.buyers,
      buyersWatching: watchers.buyers,
      alertSearches: alerts.n,
      offersOnMarket,
      offersPerListing: live >= MIN_SAMPLE ? offersOnMarket / live : null,
    },
    completed: {
      transferred: completed.transferred,
      medianDaysToTransfer: gated(completed.medianDays, completed.withDates),
    },
  };
}
