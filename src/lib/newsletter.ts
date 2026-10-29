import "server-only";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { and, count, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { newsletterIssues, newsletterSubscribers, users } from "@/db/schema";
import { dirOf, isLocale, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { tFor } from "@/i18n/server";
import { isPlaceholderEmail } from "./claim";
import { BRAND } from "./config";
import { sendEmail } from "./email";
import { hit } from "./throttle";

// The daily deals newsletter's subscriptions (the daily issue itself: src/lib/newsletter-issue.ts). Anyone can leave
// an address on the site, no account needed; it only gets issues once the link in the confirmation email was opened
// (double opt-in), and every issue carries a one-click unsubscribe link. One row per address: pending until confirmed,
// confirmed, or unsubscribed. The row's token is the secret in both links; it is rotated whenever a confirmation is
// sent again, so an older link stops working. The consent record (when, from which IP, where on the site) stays with
// the row, as the Privacy Policy says.

export const NEWSLETTER_SOURCES = ["home", "deals", "footer", "newsletter"] as const;
export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];
export type NewsletterStatus = "pending" | "confirmed" | "unsubscribed";

export function isNewsletterSource(v: unknown): v is NewsletterSource {
  return typeof v === "string" && (NEWSLETTER_SOURCES as readonly string[]).includes(v);
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Sign-ups per IP per hour, and per address per day; over them the form still says "check your inbox" but nothing is stored or sent. */
export const IP_LIMIT = 5;
export const EMAIL_LIMIT = 3;
/** A token is 32 random bytes, base64url (43 characters). */
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
/** Rows per page of the admin's list. */
export const PAGE_SIZE = 50;

const LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
/** Domains reserved for examples and placeholders (RFC 2606), among them our own .invalid accounts (src/lib/claim.ts). */
const RESERVED_DOMAIN = /(?:^|\.)(?:invalid|test|example|localhost)$|^example\.(?:com|net|org)$/;
/** Mailboxes nobody reads, and keyboard noise. */
const FAKE_LOCAL = /^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster|nobody|none|fake|test|asdf|qwerty|a+|x+)$/;

/**
 * The address as stored, trimmed and lower-cased; null when it isn't an address (one @, a dotted domain, at most 254
 * characters), is on a reserved domain or is an obvious fake.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || !LOCAL_RE.test(local) || !DOMAIN_RE.test(domain)) return null;
  if (RESERVED_DOMAIN.test(domain) || FAKE_LOCAL.test(local)) return null;
  return email;
}

/** A signed-in visitor's address for the forms, unless it is one of our placeholders (src/lib/claim.ts). */
export function prefillEmail(user: { email: string } | null | undefined) {
  return user && !isPlaceholderEmail(user.email) ? user.email : undefined;
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

/** "a***@example.com": enough for its owner to recognise the address, not enough for anyone else to use it. */
export function maskEmail(email: string) {
  const at = email.indexOf("@");
  return at < 1 ? "***" : `${email[0]}***${email.slice(at)}`;
}

/** The confirmation link's path, in the subscriber's language (/ar/… for Arabic); emails add the site's address. */
export function confirmPath(token: string, locale: Locale) {
  return localePath(`/newsletter/confirm?t=${token}`, locale);
}

/**
 * The unsubscribe page's path, in the subscriber's language: it shows the (masked) address and asks before
 * unsubscribing, so a mail client scanning the links of an issue can't unsubscribe anyone.
 */
export function unsubscribePath(token: string, locale: Locale) {
  return localePath(`/newsletter/unsubscribe?t=${token}`, locale);
}

/**
 * The one-click unsubscribe endpoint (src/app/api/newsletter/unsubscribe/route.ts): the List-Unsubscribe header of
 * every issue (RFC 8058, mail providers POST "List-Unsubscribe=One-Click" to it) and the unsubscribe page's form.
 */
export function unsubscribeApiPath(token: string) {
  return `/api/newsletter/unsubscribe?t=${token}`;
}

export type SubscribeInput = { email: string; locale: Locale; source: NewsletterSource; userId?: string | null; ip: string };
export type SubscribeResult = "sent" | "already" | "limited";

/**
 * A sign-up from one of the forms (`email` already normalised). A new address gets a pending row and the confirmation
 * email; a pending one gets a fresh token and the email again; an unsubscribed one goes back to pending with a fresh
 * token (a new consent) and the email; a confirmed one is left alone ("already"). Over the rate limits nothing is
 * stored or sent ("limited"). The forms say "check your inbox" in every case, so nobody can tell from the site whether
 * an address is subscribed. The email goes out after the response, as the other emails here do.
 */
export async function subscribe({ email, locale, source, userId, ip }: SubscribeInput): Promise<SubscribeResult> {
  if (!(await hit(`newsletter:${ip}`, IP_LIMIT, HOUR)) || !(await hit(`newsletter:${email}`, EMAIL_LIMIT, DAY))) return "limited";
  const now = new Date();
  const token = newToken();
  const consent = {
    token,
    locale,
    source,
    consentedAt: now,
    consentIp: ip && ip !== "unknown" ? ip.slice(0, 64) : null,
    updatedAt: now,
    // A signed-in subscriber is linked to their account (for the admin's view only); a later anonymous sign-up of
    // the same address keeps the link.
    ...(userId ? { userId } : {}),
  };
  // One row per address: a sign-up racing another for the same new address finds the row the other one made.
  const [inserted] = await db
    .insert(newsletterSubscribers)
    .values({ email, ...consent })
    .onConflictDoNothing({ target: newsletterSubscribers.email })
    .returning({ id: newsletterSubscribers.id });
  if (!inserted) {
    const [row] = await db
      .select({ id: newsletterSubscribers.id, status: newsletterSubscribers.status })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);
    if (!row || row.status === "confirmed") return "already";
    // Pending: a fresh link, the old one stops working. Unsubscribed: back to pending, as a new consent.
    await db
      .update(newsletterSubscribers)
      .set({ ...consent, status: "pending", confirmedAt: null, unsubscribedAt: null })
      .where(eq(newsletterSubscribers.id, row.id));
  }
  after(() => sendConfirmation(email, token, locale));
  return "sent";
}

/** The double opt-in email: what the newsletter is, how often, who sends it (RERA details), and the confirmation button. */
async function sendConfirmation(email: string, token: string, locale: Locale) {
  const t = tFor("newsletter", locale);
  const vars = { company: locale === "ar" ? BRAND.companyAr : BRAND.company, orn: BRAND.orn, brn: BRAND.broker.brn };
  await sendEmail({
    to: email,
    subject: t("email.confirm.subject"),
    heading: t("email.confirm.heading"),
    body: t("email.confirm.body", vars),
    cta: { label: t("email.confirm.cta"), href: confirmPath(token, locale) },
    dir: dirOf(locale),
  });
}

export type ConfirmResult = { status: "confirmed" | "already" | "invalid"; email: string | null };

/**
 * Opening a confirmation link: pending → confirmed. Idempotent: an address already confirmed says so ("already"); an
 * unknown token, one replaced by a newer email, or one whose address has unsubscribed since is "invalid".
 */
export async function confirm(token: string): Promise<ConfirmResult> {
  if (!TOKEN_RE.test(token)) return { status: "invalid", email: null };
  const now = new Date();
  const [done] = await db
    .update(newsletterSubscribers)
    .set({ status: "confirmed", confirmedAt: now, updatedAt: now })
    .where(and(eq(newsletterSubscribers.token, token), eq(newsletterSubscribers.status, "pending")))
    .returning({ email: newsletterSubscribers.email });
  if (done) return { status: "confirmed", email: done.email };
  const row = await subscriberByToken(token);
  return row?.status === "confirmed" ? { status: "already", email: row.email } : { status: "invalid", email: null };
}

export type UnsubscribeResult = "unsubscribed" | "already" | "invalid";

/** Unsubscribes the address behind a token (pending or confirmed). Idempotent: "already" when it was unsubscribed before. */
export async function unsubscribe(token: string): Promise<UnsubscribeResult> {
  if (!TOKEN_RE.test(token)) return "invalid";
  const now = new Date();
  const [done] = await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: now, updatedAt: now })
    .where(and(eq(newsletterSubscribers.token, token), ne(newsletterSubscribers.status, "unsubscribed")))
    .returning({ id: newsletterSubscribers.id });
  if (done) return "unsubscribed";
  return (await subscriberByToken(token)) ? "already" : "invalid";
}

/** The subscription behind a link's token (the unsubscribe page shows its masked address first), or null. */
export async function subscriberByToken(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const [row] = await db
    .select({
      id: newsletterSubscribers.id,
      email: newsletterSubscribers.email,
      status: newsletterSubscribers.status,
      locale: newsletterSubscribers.locale,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.token, token))
    .limit(1);
  return row ?? null;
}

/** Everyone who gets the daily issue, oldest sign-up first, with the token for their unsubscribe link. */
export async function confirmedSubscribers(): Promise<{ id: string; email: string; locale: Locale; token: string }[]> {
  const rows = await db
    .select({
      id: newsletterSubscribers.id,
      email: newsletterSubscribers.email,
      locale: newsletterSubscribers.locale,
      token: newsletterSubscribers.token,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "confirmed"))
    .orderBy(newsletterSubscribers.createdAt, newsletterSubscribers.id);
  return rows.map((r) => ({ ...r, locale: isLocale(r.locale) ? r.locale : "en" }));
}

/** Records that the issue sent at `at` went to these subscribers (lastSentAt). */
export async function markSent(ids: string[], at: Date): Promise<void> {
  for (let i = 0; i < ids.length; i += 500) {
    await db
      .update(newsletterSubscribers)
      .set({ lastSentAt: at, updatedAt: new Date() })
      .where(inArray(newsletterSubscribers.id, ids.slice(i, i + 500)));
  }
}

/** The admin page's and the sidebar's counts, and the analytics' newsletter line. */
export async function subscriberStats() {
  const [row] = await db
    .select({
      confirmed: sql<number>`count(*) filter (where ${newsletterSubscribers.status} = 'confirmed')::int`,
      pending: sql<number>`count(*) filter (where ${newsletterSubscribers.status} = 'pending')::int`,
      unsubscribed: sql<number>`count(*) filter (where ${newsletterSubscribers.status} = 'unsubscribed')::int`,
      confirmed7d: sql<number>`count(*) filter (where ${newsletterSubscribers.status} = 'confirmed'
        and ${newsletterSubscribers.confirmedAt} > now() - interval '7 days')::int`,
    })
    .from(newsletterSubscribers);
  return row;
}

export type SubscriberFilter = { q?: string; status?: NewsletterStatus; page?: number };

/** The admin's list, newest sign-ups first: a search on the address, a status filter, PAGE_SIZE rows a page. */
export async function adminSubscribers({ q, status, page = 1 }: SubscriberFilter) {
  const where = and(
    status ? eq(newsletterSubscribers.status, status) : undefined,
    // A typed % or _ is looked for as typed, not as a wildcard.
    q ? ilike(newsletterSubscribers.email, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: newsletterSubscribers.id,
        email: newsletterSubscribers.email,
        status: newsletterSubscribers.status,
        locale: newsletterSubscribers.locale,
        source: newsletterSubscribers.source,
        userId: newsletterSubscribers.userId,
        consentedAt: newsletterSubscribers.consentedAt,
        consentIp: newsletterSubscribers.consentIp,
        confirmedAt: newsletterSubscribers.confirmedAt,
        unsubscribedAt: newsletterSubscribers.unsubscribedAt,
        lastSentAt: newsletterSubscribers.lastSentAt,
        accountName: users.fullName,
      })
      .from(newsletterSubscribers)
      .leftJoin(users, eq(users.id, newsletterSubscribers.userId))
      .where(where)
      .orderBy(desc(newsletterSubscribers.createdAt), desc(newsletterSubscribers.id))
      .limit(PAGE_SIZE)
      .offset((Math.max(1, page) - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(newsletterSubscribers).where(where),
  ]);
  return { rows, total: Number(total) };
}

/** Every subscriber for the admin's CSV, oldest first, with the linked account's email. */
export async function subscribersForExport() {
  return db
    .select({
      email: newsletterSubscribers.email,
      status: newsletterSubscribers.status,
      locale: newsletterSubscribers.locale,
      source: newsletterSubscribers.source,
      consentedAt: newsletterSubscribers.consentedAt,
      consentIp: newsletterSubscribers.consentIp,
      confirmedAt: newsletterSubscribers.confirmedAt,
      unsubscribedAt: newsletterSubscribers.unsubscribedAt,
      lastSentAt: newsletterSubscribers.lastSentAt,
      accountEmail: users.email,
    })
    .from(newsletterSubscribers)
    .leftJoin(users, eq(users.id, newsletterSubscribers.userId))
    .orderBy(newsletterSubscribers.createdAt, newsletterSubscribers.id);
}

/** The last `limit` daily issues, newest first, for the admin page. */
export async function recentIssues(limit = 14) {
  return db.select().from(newsletterIssues).orderBy(desc(newsletterIssues.day)).limit(limit);
}

export type NewsletterIssue = Awaited<ReturnType<typeof recentIssues>>[number];
