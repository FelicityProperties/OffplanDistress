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

const DAY = 24 * 60 * 60 * 1000;

/** Delete attempt records older than a day (also run from the daily cron, in case nobody logs in for a while). */
export async function purgeOldAttempts() {
  await db.delete(authAttempts).where(lt(authAttempts.createdAt, new Date(Date.now() - DAY)));
}

/** Forget attempts for `key`, e.g. after a successful login. */
export async function clear(key: string) {
  await db.delete(authAttempts).where(eq(authAttempts.key, key));
}

export const MINUTE = 60 * 1000;
