import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Vars } from "@/i18n/define";
import { notifyAdmins } from "./notify";
import { hit } from "./throttle";

// Shared wrapper for Vercel Cron routes (vercel.json → "crons"): checks the CRON_SECRET bearer header, runs the job,
// tells the admins when it fails and pings an optional heartbeat URL when it succeeds.

/** What a job returns; sent back as JSON. A numeric `failed` above 0 marks the run as partly failed. */
export type CronSummary = Record<string, unknown> & { failed?: number };

/** At most one alert per job and reason in this window, so a broken job (or anyone calling an unconfigured one) can't flood the admins. */
const ALERT_WINDOW_MS = 12 * 60 * 60 * 1000;
const HEARTBEAT_TIMEOUT_MS = 5000;

type Failure = "missingSecret" | "threw" | "partial";

/**
 * Runs `job` for the cron route `name` (the route's last path segment, e.g. "saved-search-alerts").
 *
 *   export async function GET(request: Request) {
 *     return runCron("daily-digest", request, async () => {
 *       // …do the work…
 *       return { sent, failed };
 *     }, { heartbeatUrl: process.env.DIGEST_HEARTBEAT_URL });
 *   }
 *
 * - 401 unless the request carries "Authorization: Bearer $CRON_SECRET", which Vercel Cron sends once that variable
 *   is set. Fails closed without CRON_SECRET (a user agent is trivially spoofed, and jobs send emails).
 * - 500 {error} when the job throws; otherwise 200 with the job's summary.
 * - Admins get an "ops.cron_failed" notice when CRON_SECRET is missing, the job throws, or its summary has failed > 0.
 * - After a clean run, `heartbeatUrl` (e.g. a Better Stack or Healthchecks.io check) gets a GET, so a job that stops
 *   running is noticed even when the database, and with it the in-app alert, is down. Give each job its own URL.
 */
export async function runCron(
  name: string,
  request: Request,
  job: () => Promise<CronSummary>,
  opts: { heartbeatUrl?: string } = {},
): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`[cron] CRON_SECRET is not set — refusing to run ${name}`);
    await alertAdmins(name, "missingSecret");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let summary: CronSummary;
  try {
    summary = await job();
  } catch (err) {
    console.error(`[cron] ${name} failed`, err);
    await alertAdmins(name, "threw", { error: firstLine(err) });
    return Response.json({ error: "Job failed" }, { status: 500 });
  }

  const failed = typeof summary.failed === "number" ? summary.failed : 0;
  if (failed > 0) await alertAdmins(name, "partial", { failed });
  else if (opts.heartbeatUrl) await ping(name, opts.heartbeatUrl);
  return Response.json(summary);
}

async function alertAdmins(name: string, reason: Failure, vars?: Vars) {
  try {
    if (!(await hit(`cron-alert:${name}:${reason}`, 1, ALERT_WINDOW_MS))) return;
    await notifyAdmins("ops.cron_failed", { job: name, reason: { t: "errors", key: `notify.cron.${reason}`, vars } }, null);
  } catch (err) {
    console.error(`[cron] alerting the admins about ${name} failed`, err);
  }
}

async function ping(name: string, url: string) {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(HEARTBEAT_TIMEOUT_MS) });
    if (!res.ok) console.error(`[cron] heartbeat for ${name} answered ${res.status}`);
  } catch (err) {
    console.error(`[cron] heartbeat for ${name} failed`, err);
  }
}

/** The error's first line, short enough for a notification (Drizzle puts the query parameters on later lines). */
function firstLine(err: unknown) {
  const line = (err instanceof Error ? err.message : String(err)).split("\n")[0].trim();
  return line.length > 200 ? `${line.slice(0, 199)}…` : line;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
