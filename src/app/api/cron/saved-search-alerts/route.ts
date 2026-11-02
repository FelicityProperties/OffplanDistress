import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { savedSearches, users } from "@/db/schema";
import { isLocale, type Locale } from "@/i18n/config";
import { tFor } from "@/i18n/server";
import { runCron } from "@/lib/cron";
import { formatAEDCompact } from "@/lib/format";
import { filtersFromQuery, newDealsSince } from "@/lib/listings";
import { sendIssue, type SendResult } from "@/lib/newsletter-issue";
import { advertiserLines, permitLine } from "@/lib/notification-templates";
import { notify } from "@/lib/notify";
import { communityName } from "@/lib/place-names";
import { purgeOldAttempts } from "@/lib/throttle";

// Daily saved-search alerts, run by Vercel Cron (see vercel.json) at 09:00 Dubai: for every saved search with alerts
// on, tell its owner about deals that went live since the last run, in their language, each with its DLD permit line
// and the advertiser's ORN and BRN, as every advert carries. Then the newsletter's daily issue
// (src/lib/newsletter-issue.ts): the day's new adverts, price drops and units gone, to every confirmed subscriber, on
// days something changed. Each step fails on its own and is reported on its own in the run's summary. runCron checks
// CRON_SECRET and alerts the admins when a run fails; HEARTBEAT_URL (optional) is pinged after every clean run.

export const maxDuration = 60;

/** Deals listed by name in one alert; the rest are summed up as "+N more". */
const LIST_LINES = 5;
/** Saved searches processed at once — keeps the database pool and the email provider comfortable. */
const CONCURRENCY = 5;

type SearchRow = {
  id: string;
  userId: string;
  name: string;
  query: string;
  locale: string;
};

type AlertDeal = Awaited<ReturnType<typeof newDealsSince>>["rows"][number];

export async function GET(request: Request) {
  return runCron("saved-search-alerts", request, run, { heartbeatUrl: process.env.HEARTBEAT_URL });
}

/**
 * The alerts, then the newsletter issue, each in its own try/catch: a failure in one is counted (the admins are told
 * the run partly failed) and named in the summary, and the other still runs.
 */
async function run() {
  // One cut-off for the whole run: each search covers (lastAlertedAt, runAt], so nothing published while the run is
  // in progress is alerted twice or skipped; the newsletter's window ends at the same moment.
  const runAt = new Date();
  let alerts: Awaited<ReturnType<typeof sendAlerts>> | null = null;
  try {
    alerts = await sendAlerts(runAt);
  } catch (err) {
    console.error("[cron] saved-search alerts failed", err);
  }
  let newsletter: SendResult | null = null;
  try {
    newsletter = await sendIssue(runAt);
  } catch (err) {
    console.error("[cron] newsletter issue failed", err);
  }
  return {
    searches: alerts?.searches ?? 0,
    notified: alerts?.notified ?? 0,
    skipped: alerts?.skipped ?? 0,
    alertsFailed: alerts ? alerts.failed : 1,
    newsletter: newsletter ?? { error: true },
    failed: (alerts ? alerts.failed : 1) + (newsletter ? newsletter.failed : 1),
  };
}

async function sendAlerts(runAt: Date) {
  // Daily housekeeping: rate-limit records are kept for 24 hours (Privacy Policy), even on quiet days.
  await purgeOldAttempts().catch((err) => console.error("[cron] purging old auth attempts failed", err));

  const searches: SearchRow[] = await db
    .select({
      id: savedSearches.id,
      userId: savedSearches.userId,
      name: savedSearches.name,
      query: savedSearches.query,
      locale: users.locale,
    })
    .from(savedSearches)
    .innerJoin(users, eq(users.id, savedSearches.userId))
    .where(eq(savedSearches.alerts, true));

  let notified = 0;
  let skipped = 0;
  let failed = 0;
  for (let i = 0; i < searches.length; i += CONCURRENCY) {
    const batch = searches.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((s) => processSearch(s, runAt)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled") {
        if (r.value === "notified") notified++;
        else if (r.value === "skipped") skipped++;
      } else {
        // Its window was given back, so the next run picks these matches up again.
        failed++;
        console.error(`[cron] saved search ${batch[j].id} failed`, r.reason);
      }
    });
  }

  return { searches: searches.length, notified, skipped, failed };
}

/**
 * Alerts the owner about the deals that went live in the search's window, (lastAlertedAt, runAt]. The window is claimed
 * first, so of two runs at once (a cron event delivered twice, a manual run during the 09:00 one) only one alerts. It is
 * given back when the alert doesn't go out, so the next run picks those matches up again: a failure (the query, or a
 * notice that couldn't be stored) is thrown and counted. A stored query Postgres refuses outright (a value no column
 * can hold, from a forged request) can't succeed on any run: counting it would tell the admins the job failed, and hold
 * back its heartbeat, every day, so it is skipped with one log line instead.
 */
async function processSearch(s: SearchRow, runAt: Date): Promise<"notified" | "none" | "skipped"> {
  const since = await claimWindow(s.id, runAt);
  // Another run has this window, or alerts were switched off since the run read the search.
  if (!since) return "none";
  try {
    const { rows, total } = await newDealsSince(filtersFromQuery(s.query), since, { until: runAt, limit: LIST_LINES });
    // Nothing matched: the window stays claimed, so the next run only looks forward.
    if (!total) return "none";
    const locale: Locale = isLocale(s.locale) ? s.locale : "en";
    const stored = await notify(
      [s.userId],
      "search.matches",
      { count: total, name: unquoted(s.name), list: matchList(rows, total, locale), advertiser: advertiserLines(locale) },
      dealsHref(s.query),
    );
    // notify() logged why: not stored, so not sent.
    if (!stored) throw new Error("the alert couldn't be stored");
    return "notified";
  } catch (err) {
    await db
      .update(savedSearches)
      .set({ lastAlertedAt: since })
      // Unless a later run has moved it since.
      .where(and(eq(savedSearches.id, s.id), eq(savedSearches.lastAlertedAt, runAt)))
      .catch((e: unknown) => console.error(`[cron] giving saved search ${s.id} its window back failed`, e));
    const refused = dataException(err);
    if (!refused) throw err;
    console.warn(`[cron] saved search ${s.id} skipped: Postgres can't run its query "${s.query}" (${refused.message})`);
    return "skipped";
  }
}

/**
 * Moves the search's lastAlertedAt to runAt and returns where its window starts, in one statement that locks the row
 * first (atomic on both drivers; neon-http has no transactions): a second run at the same time waits for the first,
 * then finds the window already moved to the first run's cut-off and claims only what came after it, if anything.
 * Null when there is nothing to claim, or alerts were switched off meanwhile.
 */
async function claimWindow(id: string, runAt: Date): Promise<Date | null> {
  const at = runAt.toISOString();
  const { rows } = await db.execute<{ since: number }>(sql`
    with seen as (select id, last_alerted_at from ${savedSearches} where id = ${id} and alerts for update)
    update ${savedSearches} s set last_alerted_at = ${at}::timestamptz from seen
    where s.id = seen.id and seen.last_alerted_at < ${at}::timestamptz
    returning (extract(epoch from seen.last_alerted_at) * 1000)::float8 as since`);
  return rows.length ? new Date(Number(rows[0].since)) : null;
}

/**
 * The driver's error when Postgres refused the query's own values (SQLSTATE class 22, "data exception": an enum value
 * that doesn't exist, a number out of range), so no retry can succeed; null for anything else. Drizzle wraps it.
 */
function dataException(err: unknown): Error | null {
  let e = err;
  for (let depth = 0; e instanceof Error && depth < 4; depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && code.startsWith("22")) return e;
    e = e.cause;
  }
  return null;
}

/** The search's name without its own quotation marks: /deals quotes the search text in it ("“Creek Rise”"), and the alert's title quotes the whole name. */
function unquoted(name: string) {
  return name.replace(/["“”„«»]/g, "").trim() || name;
}

/**
 * Each deal as the newsletter lists it: "Project · Community — AED 1.2M to seller" (the equity, as the cards say it),
 * then its DLD permit line; in the recipient's language, plus "+N more". The template adds the advertiser's ORN and BRN.
 */
function matchList(rows: AlertDeal[], total: number, locale: Locale) {
  const tc = tFor("common", locale);
  const t = tFor("searches", locale);
  const deals = rows.slice(0, LIST_LINES).map((r) => {
    // In Arabic the (mostly Latin) project name is isolated, so "Creek Edge 2 · مرسى خور دبي" keeps its order.
    const name = locale === "ar" ? `⁨${r.projectName}⁩` : r.projectName;
    const price = tc("toSeller", { amount: formatAEDCompact(r.askingPrice, locale) });
    return `${name} · ${communityName(tc, r.community, r.communityOther)} — ${price}\n${permitLine(r, locale)}`;
  });
  if (total > deals.length) deals.push(t("alert.more", { count: total - deals.length }));
  return deals.join("\n\n");
}

/** The saved search on /deals, newest first so the new matches are at the top. */
function dealsHref(query: string) {
  const params = new URLSearchParams(query);
  params.delete("page");
  params.set("sort", "newest");
  return `/deals?${params.toString()}`;
}
