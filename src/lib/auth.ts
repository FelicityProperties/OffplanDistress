import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { PATH_HEADER, QUERY_HEADER } from "@/i18n/paths";
import { OWNER_EMAILS } from "@/lib/config";

const COOKIE = "od_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "user" | "admin";
  intent: "buy" | "sell" | "both";
  kycStatus: "not_started" | "pending" | "verified";
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Owner emails are always admins, and their login is managed by ADMIN_PASSWORD (see scripts/migrate.mjs). */
export function isOwnerEmail(email: string) {
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  jar.delete(COOKIE);
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      intent: users.intent,
      kycStatus: users.kycStatus,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    // `next` with the page's own query string, or the page opened below it (requestedPage): the layout's and the page's
    // redirects run side by side, and either may be the one that wins.
    const back = next && !next.includes("?") ? await requestedPage(next) : next;
    // The plain login address: src/proxy.ts sends a visitor who chose Arabic (od_locale) on to /ar/login. A language
    // guessed from the browser alone must not, or it would become a saved choice for the whole site.
    redirect(back ? `/login?next=${encodeURIComponent(back)}` : "/login");
  }
  return user;
}

/**
 * The page being opened (path and query, from src/proxy.ts) when it is `section` or a page in it, else `section`:
 * where a login asked for on the way comes back to, e.g. an email's link to /dashboard/offers?tab=sent.
 */
export async function requestedPage(section: string): Promise<string> {
  const h = await headers();
  const path = h.get(PATH_HEADER);
  if (!path || (path !== section && !path.startsWith(`${section}/`))) return section;
  const query = new URLSearchParams(h.get(QUERY_HEADER) ?? "");
  query.delete("_rsc"); // Next's own cache-busting parameter on client navigations
  const qs = query.toString();
  return sameSitePath(qs ? `${path}?${qs}` : path) ?? section;
}

/** `next`: where login comes back to (default: the admin page being opened). */
export async function requireAdmin(next?: string): Promise<SessionUser> {
  const user = await requireUser(next ?? (await requestedPage("/admin")));
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

/** Same-site path for redirects after login, or null. */
export function sameSitePath(next: unknown): string | null {
  // Browsers drop tabs/newlines and treat "\" like "/", so "/<TAB>/evil.com" would become "//evil.com".
  if (typeof next !== "string" || /[\x00-\x1f\x7f\\]/.test(next) || !/^\/(?!\/)/.test(next)) return null;
  const base = "http://same-site.invalid";
  const u = new URL(next, base);
  const path = u.pathname + u.search + u.hash;
  // "/..//evil.com" normalises to "//evil.com" — re-check after normalising.
  return u.origin === base && /^\/(?!\/)/.test(path) ? path : null;
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: unknown, fallback = "/dashboard") {
  return sameSitePath(next) ?? fallback;
}
