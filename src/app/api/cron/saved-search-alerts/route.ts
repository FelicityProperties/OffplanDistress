import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savedSearches, users } from "@/db/schema";
import { isLocale, type Locale } from "@/i18n/config";
import { tFor } from "@/i18n/server";
import { runCron } from "@/lib/cron";
import { formatAEDCompact } from "@/lib/format";
import { filtersFromQuery, newDealsSince, type ListingCard } from "@/lib/listings";
import { sendIssue, type SendResult } from "@/lib/newsletter-issue";
import { notify } from "@/lib/notify";
import { communityName } from "@/lib/place-names";
import { purgeOldAttempts } from "@/lib/throttle";

// Daily saved-search alerts, run by Vercel Cron (see vercel.json) at 09:00 Dubai: for every saved search with alerts
// on, tell its owner about deals that went live since the last run, in their language. Then the newsletter's daily
// issue (src/lib/newsletter-issue.ts): the day's new adverts, price drops and units gone, to every confirmed
// subscriber, on days something changed. Each step fails on its own and is reported on its own in the run's summary.
// runCron checks CRON_SECRET and alerts the admins when a run fails; HEARTBEAT_URL (optional) is pinged after every
// clean run.

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
  lastAlertedAt: Date;
  locale: string;
};

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
      lastAlertedAt: savedSearches.lastAlertedAt,
      locale: users.locale,
    })
    .from(savedSearches)
    .innerJoin(users, eq(users.id, savedSearches.userId))
    .where(eq(savedSearches.alerts, true));

  let notified = 0;
  let failed = 0;
  for (let i = 0; i < searches.length; i += CONCURRENCY) {
    const batch = searches.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((s) => processSearch(s, runAt)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled") {
        if (r.value) notified++;
      } else {
        // Left unmarked, so the next run picks these matches up again.
        failed++;
        console.error(`[cron] saved search ${batch[j].id} failed`, r.reason);
      }
    });
  }

  return { searches: searches.length, notified, failed };
}

/** Alerts the owner if there are new matches; returns whether they were notified. */
async function processSearch(s: SearchRow, runAt: Date): Promise<boolean> {
  const { rows, total } = await newDealsSince(filtersFromQuery(s.query), s.lastAlertedAt, {
    until: runAt,
    limit: LIST_LINES,
  });
  if (total > 0) {
    const locale: Locale = isLocale(s.locale) ? s.locale : "en";
    await notify(
      [s.userId],
      "search.matches",
      { count: total, name: s.name, list: matchList(rows, total, locale) },
      dealsHref(s.query),
    );
  }
  // Also when nothing matched, so the next run only looks forward.
  await db.update(savedSearches).set({ lastAlertedAt: runAt }).where(eq(savedSearches.id, s.id));
  return total > 0;
}

/** "Project — Community — AED 1.2M" per deal, in the recipient's language, plus "+N more". */
function matchList(rows: ListingCard[], total: number, locale: Locale) {
  const tc = tFor("common", locale);
  const t = tFor("searches", locale);
  const lines = rows.slice(0, LIST_LINES).map((r) => {
    const community = communityName(tc, r.community, r.communityOther);
    return [r.projectName, community, formatAEDCompact(r.askingPrice, locale)].join(" — ");
  });
  if (total > lines.length) lines.push(t("alert.more", { count: total - lines.length }));
  return lines.join("\n");
}

/** The saved search on /deals, newest first so the new matches are at the top. */
function dealsHref(query: string) {
  const params = new URLSearchParams(query);
  params.delete("page");
  params.set("sort", "newest");
  return `/deals?${params.toString()}`;
}
