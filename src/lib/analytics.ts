import "server-only";
import { createHash } from "node:crypto";
import { userAgent } from "next/server";
import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { pageViews, sellerLeads } from "@/db/schema";

// First-party, cookieless visit statistics: what POST /api/a records (src/app/api/a/route.ts) and how long it is kept.
// The browser side is src/components/analytics/PageViewTracker.tsx; the report is src/lib/analytics-report.ts.
// Privacy Policy (src/content/legal/privacy.ts) describes exactly this: no cookies, no IP address or user agent stored,
// a visitor identifier that changes every day, 13 months' retention.

/** Longest time one page view can be credited with (a tab left open on one page). */
export const MAX_VIEW_MS = 30 * 60 * 1000;
/** page_views older than this many months are deleted by the daily ops cron. */
export const VIEW_RETENTION_MONTHS = 13;
/** Seller estimate requests not linked to an account or a listing, untouched for this long, are deleted too. */
export const LEAD_RETENTION_MONTHS = 24;

/** Pages never recorded: our own consoles and the API (the tracker skips them too). */
export const UNTRACKED_PATH = /^\/(admin|dashboard|api)(\/|$)/;

// Crawlers, link previews, uptime monitors, headless browsers and scripts. Next's userAgent().isBot catches more.
const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|lighthouse|pagespeed|gtmetrix|pingdom|uptime|statuscake|monitor|headless|phantomjs|puppeteer|playwright|selenium|webdriver|curl\/|wget|python|httpclient|okhttp|axios|node-fetch|undici|go-http|java\/|libwww|scrapy|feedfetcher|mediapartners|adsbot|petalbot|semrush|ahrefs|bytespider|gptbot|claudebot|ccbot|perplexity/i;

/** True for requests that are not a person with a browser. */
export function isBotRequest(headers: Headers) {
  const ua = headers.get("user-agent") ?? "";
  if (ua.length < 20 || BOT_UA.test(ua)) return true;
  return userAgent({ headers }).isBot;
}

/** Device class and browser family, the only things kept from the user agent. */
export function describeDevice(headers: Headers): { device: "mobile" | "tablet" | "desktop"; browser: string | null } {
  const { device, browser } = userAgent({ headers });
  const kind = device.type === "mobile" || device.type === "wearable" ? "mobile" : device.type === "tablet" ? "tablet" : "desktop";
  return { device: kind, browser: browserFamily(browser.name) };
}

function browserFamily(name: string | undefined) {
  if (!name) return null;
  if (/edge/i.test(name)) return "Edge";
  if (/samsung/i.test(name)) return "Samsung Internet";
  if (/opera|opr/i.test(name)) return "Opera";
  if (/firefox/i.test(name)) return "Firefox";
  if (/instagram|facebook|whatsapp|snapchat|tiktok|linkedin/i.test(name)) return name.split(" ")[0];
  if (/chrom/i.test(name)) return "Chrome";
  if (/safari|webkit/i.test(name)) return "Safari";
  return name.slice(0, 40);
}

/** Country (ISO code) and city from the hosting platform's IP geolocation headers; null locally. */
export function geoFrom(headers: Headers) {
  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  let city = headers.get("x-vercel-ip-city") ?? "";
  try {
    city = decodeURIComponent(city);
  } catch {}
  city = city.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
  return { country: /^[A-Z]{2}$/.test(country) ? country : null, city: city || null };
}

/** Best-effort client IP (Vercel sets x-forwarded-for). */
export function ipFrom(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/** Dubai calendar date (UTC+4 all year, no daylight saving), e.g. "2026-10-26". */
export function dubaiDate(at = new Date()) {
  return new Date(at.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

let salt: string | undefined;
function analyticsSalt() {
  if (salt) return salt;
  const own = process.env.ANALYTICS_SALT?.trim();
  if (own) return (salt = own);
  const secret = process.env.CRON_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) console.warn("[analytics] ANALYTICS_SALT (or CRON_SECRET / ADMIN_PASSWORD) is not set; visitor ids use a public salt");
  // A hash of an existing secret, never the secret itself.
  return (salt = createHash("sha256").update(`offplandistress-analytics:${secret ?? "public"}`).digest("hex"));
}

/**
 * Anonymous visitor id for one Dubai day: salted sha256 of the date, IP address and user agent (first 128 bits, hex).
 * The same browser gets a different id tomorrow, and neither the IP address nor the user agent is stored.
 */
export function visitorHash(ip: string, ua: string, day = dubaiDate()) {
  return createHash("sha256").update(`${analyticsSalt()}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

export type NewView = {
  viewId: string;
  sessionId: string;
  visitorHash: string;
  path: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  ref: string | null;
  country: string | null;
  city: string | null;
  device: string;
  browser: string | null;
  locale: string | null;
};

/** Records a page view; a repeated beacon for the same view id is ignored. */
export async function recordView(v: NewView) {
  await db.insert(pageViews).values(v).onConflictDoNothing({ target: pageViews.viewId });
}

/**
 * The time a page was visible, from the leave beacon: only for the view id + session that recorded it, within a day of
 * it, only ever increasing, and never more than MAX_VIEW_MS or than the time since the view was recorded (plus 10 s).
 */
export async function recordDuration(viewId: string, sessionId: string, durationMs: number) {
  const ms = Math.min(Math.max(0, Math.round(durationMs)), MAX_VIEW_MS);
  if (ms === 0) return;
  const sinceView = sql`(extract(epoch from (now() - ${pageViews.createdAt})) * 1000)::int + 10000`;
  await db
    .update(pageViews)
    .set({ durationMs: sql`greatest(coalesce(${pageViews.durationMs}, 0), least(${ms}, ${sinceView}))` })
    .where(
      and(
        eq(pageViews.viewId, viewId),
        eq(pageViews.sessionId, sessionId),
        gt(pageViews.createdAt, sql`now() - interval '1 day'`),
        or(isNull(pageViews.durationMs), lt(pageViews.durationMs, ms)),
      ),
    );
}

/** Forgets every view of one browser tab's session (a signed-in admin's tab, including the pages before logging in). */
export async function forgetSession(sessionId: string) {
  await db.delete(pageViews).where(eq(pageViews.sessionId, sessionId));
}

/**
 * Cheap per-instance guard against floods: at most `limit` beacons per IP per minute on this server instance. Kept in
 * memory (not in Postgres like src/lib/throttle.ts) so counting a page view never costs extra writes.
 */
const BEACONS_PER_MINUTE = 120;
const buckets = new Map<string, { start: number; n: number }>();
export function allowBeacon(ip: string, now = Date.now()) {
  const b = buckets.get(ip);
  if (!b || now - b.start >= 60_000) {
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (now - v.start >= 60_000) buckets.delete(k);
      if (buckets.size > 10_000) buckets.clear();
    }
    buckets.set(ip, { start: now, n: 1 });
    return true;
  }
  b.n++;
  return b.n <= BEACONS_PER_MINUTE;
}

const BATCH = 5000;
const LEAD_BATCH = 500;
const MAX_BATCHES = 40;

function monthsAgo(months: number, now = new Date()) {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

/**
 * Retention, run by the daily ops cron: deletes page views older than VIEW_RETENTION_MONTHS, and seller estimate requests
 * last updated more than LEAD_RETENTION_MONTHS ago that never became an account or a listing (as the Privacy Policy
 * promises). Deletes in batches so a large backlog never holds long locks; whatever is left goes in the next run.
 */
export async function purgeExpiredData(now = new Date()) {
  const viewCutoff = monthsAgo(VIEW_RETENTION_MONTHS, now);
  let views = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const batch = db.select({ id: pageViews.id }).from(pageViews).where(lt(pageViews.createdAt, viewCutoff)).limit(BATCH);
    const gone = await db.delete(pageViews).where(inArray(pageViews.id, batch)).returning({ id: pageViews.id });
    views += gone.length;
    if (gone.length < BATCH) break;
  }

  const leadCutoff = monthsAgo(LEAD_RETENTION_MONTHS, now);
  let leads = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const batch = db
      .select({ id: sellerLeads.id })
      .from(sellerLeads)
      .where(and(lt(sellerLeads.updatedAt, leadCutoff), isNull(sellerLeads.userId), isNull(sellerLeads.listingId)))
      .limit(LEAD_BATCH);
    const gone = await db.delete(sellerLeads).where(inArray(sellerLeads.id, batch)).returning({ id: sellerLeads.id });
    leads += gone.length;
    if (gone.length < LEAD_BATCH) break;
  }
  return { views, leads };
}
