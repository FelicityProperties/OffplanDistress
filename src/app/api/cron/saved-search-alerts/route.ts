import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savedSearches, users } from "@/db/schema";
import { isLocale, type Locale } from "@/i18n/config";
import { tFor } from "@/i18n/server";
import type { TKey } from "@/i18n/translator";
import { COMMUNITIES } from "@/lib/config";
import { formatAEDCompact } from "@/lib/format";
import { filtersFromQuery, newDealsSince, type ListingCard } from "@/lib/listings";
import { notify } from "@/lib/notify";

// Daily saved-search alerts, run by Vercel Cron (see vercel.json): for every saved search with alerts on,
// tell its owner about deals that went live since the last run, in their language.

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
  if (!authorised(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // One cut-off for the whole run: each search covers (lastAlertedAt, runAt], so nothing published
  // while the run is in progress is alerted twice or skipped.
  const runAt = new Date();
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

  return Response.json({ searches: searches.length, notified, failed });
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
    const community = COMMUNITIES.includes(r.community) ? tc(`community.${r.community}` as TKey<"common">) : r.community;
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

/**
 * Vercel Cron sends "Authorization: Bearer $CRON_SECRET" once that variable is set. Fail closed without
 * it: a user agent is trivially spoofed, and each run sends emails.
 */
function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set — refusing to run saved-search alerts");
    return false;
  }
  return safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
