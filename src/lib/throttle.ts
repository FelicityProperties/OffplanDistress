import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";

/** Best-effort client IP (Vercel sets x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Records one attempt for `key` and returns false once more than `limit` attempts happened within
 * `windowMs`. State lives in Postgres so it holds across serverless instances; inserting before
 * counting means a parallel burst can't slip past the limit.
 */
export async function hit(key: string, limit: number, windowMs: number): Promise<boolean> {
  await db.insert(authAttempts).values({ key });
  const since = new Date(Date.now() - windowMs);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(authAttempts)
    .where(and(eq(authAttempts.key, key), gt(authAttempts.createdAt, since)));
  after(purgeOldAttempts);
  return n <= limit;
}

/**
 * Like hit(), but for an allowance (a day's ceiling on spend) rather than a defence: an attempt it refuses isn't
 * counted, its row deleted again, so the allowance reopens as the attempts it let through age out of the window instead
 * of staying closed while demand stays above it. Inserting before counting still keeps a parallel burst within the
 * limit. Returns null when refused, else a function that gives the attempt back (a later check refused the request).
 */
export async function take(key: string, limit: number, windowMs: number): Promise<(() => Promise<void>) | null> {
  const [row] = await db.insert(authAttempts).values({ key }).returning({ id: authAttempts.id });
  const giveBack = async () => {
    await db.delete(authAttempts).where(eq(authAttempts.id, row.id));
  };
  const n = await attempts(key, windowMs);
  after(purgeOldAttempts);
  if (n <= limit) return giveBack;
  await giveBack();
  return null;
}

/** The attempts recorded for `key` within `windowMs` (records nothing itself). */
export async function attempts(key: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(authAttempts)
    .where(and(eq(authAttempts.key, key), gt(authAttempts.createdAt, since)));
  return n;
}

/** Records one attempt for `key` without checking a limit (e.g. a wrong password, counted only once it is wrong). */
export async function record(key: string) {
  await db.insert(authAttempts).values({ key });
  after(purgeOldAttempts);
}

export const DAY = 24 * 60 * 60 * 1000;

/** Delete attempt records older than a day (also run from the daily cron, in case nobody logs in for a while). */
export async function purgeOldAttempts() {
  await db.delete(authAttempts).where(lt(authAttempts.createdAt, new Date(Date.now() - DAY)));
}

/** Forget attempts for `key`, e.g. after a successful login. */
export async function clear(key: string) {
  await db.delete(authAttempts).where(eq(authAttempts.key, key));
}

export const MINUTE = 60 * 1000;
