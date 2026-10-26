import "server-only";
import { and, asc, desc, eq, gt, inArray, isNotNull, lte, or, sql, type AnyColumn } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { files, inquiries, listings, offers, reminders, sellerLeads, users } from "@/db/schema";
import { emailOffReason } from "./email";
import { leadCode } from "./estimate";
import { refCode } from "./format";
import { notify, notifyAdmins, type TemplateParams } from "./notify";
import type { TemplateKey } from "./notification-templates";
import { addDays, dubaiToday } from "./permits";

// Follow-ups: sellers and buyers who stopped partway, and the deals and requests waiting on someone. Each rule below is
// one query, used twice so the numbers always agree:
//  - the Follow-ups section on /admin (src/components/admin/FollowUps.tsx) lists its rows, with call / WhatsApp buttons;
//  - the daily ops cron (sendFollowUps) sends the seller or buyer their own nudge, once (the `reminders` table), and the
//    admins one "ops.digest" notification a day with the count of each rule.
// Samples, staff accounts and the offers / inquiries they made are never counted. Nudges only go to people who can log
// in: never to a seller our team added who hasn't set a password through their claim link yet.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Rows read per rule; the section shows the first few, the counts are of these. */
const LIMIT = 500;

/** The thresholds. The admin copy (admin.ts "followups.*") and the templates name the same numbers. */
export const FOLLOW_UP = {
  /** A seller account with nothing listed is nudged at 24 h and at 72 h, and listed for our team for 30 days. */
  signupFirstHours: 24,
  signupSecondHours: 72,
  signupNudgeDays: 7,
  signupListDays: 30,
  /** Under review without the SPA / Oqood or the statement of account. */
  docsHours: 48,
  /** Older ones are listed for our team but no longer nudged (the first run after release would otherwise reach very old ones). */
  docsNudgeDays: 30,
  noOffersDays: 21,
  offerHours: 48,
  /** After this, an offer the seller still hasn't answered is flagged for our team to call. */
  offerEscalateHours: 72,
  counterHours: 48,
  leadHours: 24,
  reviewHours: 24,
  instalmentDays: 14,
  viewingHours: 4,
} as const;

export const FOLLOW_UP_KEYS = ["offers", "counters", "viewings", "instalments", "review", "docs", "leads", "signup", "noOffers"] as const;
export type FollowUpKey = (typeof FOLLOW_UP_KEYS)[number];

export type Contact = { name: string; phone: string | null; email: string | null };

type Nudge = {
  entityType: "user" | "listing" | "offer";
  kind: string;
  userId: string;
  template: TemplateKey;
  params: TemplateParams;
  href: string;
};

export type FollowUpItem = {
  /** The user, listing, offer, seller lead or inquiry this is about. */
  id: string;
  /** When the wait started. */
  since: Date;
  /** Project name, or the person's name for a sign-up or a seller lead. */
  title: string;
  /** OD-1234 or L-12. */
  ref: string | null;
  /** Where our team handles it. */
  href: string;
  /** Who our team calls: the seller, the buyer, the lead or the person who asked for a viewing. */
  contact: Contact;
  project?: string;
  amount?: number | null;
  /** Listing published (noOffers) or the instalment's due date (instalments), as a Dubai date. */
  date?: string | null;
  views?: number;
  missing?: ("spa" | "soa")[];
  /** An offer the seller hasn't answered for FOLLOW_UP.offerEscalateHours. */
  escalated?: boolean;
  /** An instalment whose due date has passed. */
  overdue?: boolean;
  /** Entered by our team; the seller hasn't confirmed ownership through their claim link yet. */
  awaitingSeller?: boolean;
  /** The seller's or buyer's own reminder, sent once; null when there is none (rules for our team only, or nobody to nudge). */
  nudge: Nudge | null;
};

export type FollowUps = Record<FollowUpKey, FollowUpItem[]>;

const sellers = alias(users, "seller");
const buyers = alias(users, "buyer");
const ago = (now: Date, ms: number) => new Date(now.getTime() - ms);
/** "No password yet" accounts are sellers our team added who haven't claimed their listing: they can't log in. */
const canLogIn = (passwordHash: AnyColumn) => sql<boolean>`(${passwordHash} is not null)`;
/** Placeholder addresses (…​.invalid) never receive email and mean nothing to our team either. */
const realEmail = (email: string | null) => (email && !email.toLowerCase().endsWith(".invalid") ? email : null);

function hasFile(kinds: string[]) {
  return sql<boolean>`exists (select 1 from ${files} f where f.listing_id = ${listings.id} and f.kind::text in (${sql.join(
    kinds.map((k) => sql`${k}`),
    sql`, `,
  )}))`;
}

/** Seller accounts (or sellers from the free estimate) with nothing listed, from 24 hours to 30 days after sign-up. */
async function signupRule(now: Date): Promise<FollowUpItem[]> {
  const rows = await db
    .select({ id: users.id, name: users.fullName, phone: users.phone, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(
      and(
        eq(users.role, "user"),
        isNotNull(users.passwordHash),
        or(inArray(users.intent, ["sell", "both"]), sql`exists (select 1 from ${sellerLeads} sl where sl.user_id = ${users.id})`),
        lte(users.createdAt, ago(now, FOLLOW_UP.signupFirstHours * HOUR)),
        gt(users.createdAt, ago(now, FOLLOW_UP.signupListDays * DAY)),
        sql`not exists (select 1 from ${listings} l where l.seller_id = ${users.id})`,
      ),
    )
    .orderBy(desc(users.createdAt))
    .limit(LIMIT);
  return rows.map((u) => {
    const age = now.getTime() - u.createdAt.getTime();
    const stage = age < FOLLOW_UP.signupSecondHours * HOUR ? "24h" : age < FOLLOW_UP.signupNudgeDays * DAY ? "72h" : null;
    return {
      id: u.id,
      since: u.createdAt,
      title: u.name,
      ref: null,
      href: `/admin/users#user-${u.id}`,
      contact: { name: u.name, phone: u.phone, email: realEmail(u.email) },
      nudge: stage
        ? { entityType: "user", kind: `finish_listing:${stage}`, userId: u.id, template: "seller.finish_listing", params: { name: u.name }, href: "/sell" }
        : null,
    };
  });
}

const sellerColumns = {
  sellerId: sellers.id,
  sellerName: sellers.fullName,
  sellerPhone: sellers.phone,
  sellerEmail: sellers.email,
  sellerCanLogIn: canLogIn(sellers.passwordHash),
};
type SellerRow = { sellerName: string; sellerPhone: string | null; sellerEmail: string };
const sellerContact = (r: SellerRow): Contact => ({ name: r.sellerName, phone: r.sellerPhone, email: realEmail(r.sellerEmail) });
/** A real listing of a real seller. */
const realListing = and(eq(listings.isSample, false), eq(sellers.role, "user"));

/** Under review for 48 hours without the SPA (or Oqood) or without the statement of account. */
async function docsRule(now: Date): Promise<FollowUpItem[]> {
  const spa = hasFile(["spa", "oqood"]);
  const soa = hasFile(["soa"]);
  const rows = await db
    .select({ id: listings.id, refNo: listings.refNo, project: listings.projectName, createdAt: listings.createdAt, hasSpa: spa, hasSoa: soa, ...sellerColumns })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(and(eq(listings.status, "pending_review"), realListing, lte(listings.createdAt, ago(now, FOLLOW_UP.docsHours * HOUR)), sql`(not ${spa} or not ${soa})`))
    .orderBy(asc(listings.createdAt))
    .limit(LIMIT);
  return rows.map((l) => {
    const missing = [...(l.hasSpa ? [] : ["spa" as const]), ...(l.hasSoa ? [] : ["soa" as const])];
    const which = missing.length === 2 ? "both" : missing[0];
    const ref = refCode(l.refNo);
    return {
      id: l.id,
      since: l.createdAt,
      title: l.project,
      ref,
      href: `/admin/listings/${l.id}`,
      contact: sellerContact(l),
      project: l.project,
      missing,
      nudge:
        l.sellerCanLogIn && l.createdAt > ago(now, FOLLOW_UP.docsNudgeDays * DAY)
          ? {
              entityType: "listing",
              kind: "upload_docs",
              userId: l.sellerId,
              template: "seller.upload_docs",
              params: { project: l.project, ref, missing: { t: "errors", key: `notify.reminder.missing.${which}` } },
              href: `/dashboard/listings/${l.id}`,
            }
          : null,
    };
  });
}

/** Live for 21 days without a single offer from a real buyer. */
async function noOffersRule(now: Date): Promise<FollowUpItem[]> {
  const liveSince = sql`coalesce(${listings.publishedAt}, ${listings.createdAt})`;
  const rows = await db
    .select({
      id: listings.id,
      refNo: listings.refNo,
      project: listings.projectName,
      views: listings.views,
      publishedAt: listings.publishedAt,
      createdAt: listings.createdAt,
      ...sellerColumns,
    })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(
      and(
        eq(listings.status, "live"),
        realListing,
        sql`${liveSince} <= ${ago(now, FOLLOW_UP.noOffersDays * DAY).toISOString()}::timestamptz`,
        sql`not exists (select 1 from ${offers} o join ${users} b on b.id = o.buyer_id where o.listing_id = ${listings.id} and b.role = 'user')`,
      ),
    )
    .orderBy(asc(liveSince))
    .limit(LIMIT);
  return rows.map((l) => {
    const since = l.publishedAt ?? l.createdAt;
    const ref = refCode(l.refNo);
    const date = dubaiToday(since);
    return {
      id: l.id,
      since,
      title: l.project,
      ref,
      href: `/admin/listings/${l.id}`,
      contact: sellerContact(l),
      project: l.project,
      date,
      views: l.views,
      nudge: l.sellerCanLogIn
        ? {
            entityType: "listing",
            kind: "no_offers",
            userId: l.sellerId,
            template: "seller.no_offers",
            params: { project: l.project, ref, since: { date }, views: l.views },
            href: `/dashboard/listings/${l.id}`,
          }
        : null,
    };
  });
}

/**
 * Open offers on live units, waiting for `status`'s side for `hours`: "pending" waits for the seller, "countered" for
 * the buyer. Only on live units: while a deal is agreed the other open offers are backups nobody can answer.
 */
function openOffers(now: Date, status: "pending" | "countered", hours: number) {
  return db
    .select({
      id: offers.id,
      amount: offers.amount,
      counterAmount: offers.counterAmount,
      updatedAt: offers.updatedAt,
      listingId: listings.id,
      refNo: listings.refNo,
      project: listings.projectName,
      ...sellerColumns,
      buyerId: buyers.id,
      buyerName: buyers.fullName,
      buyerPhone: buyers.phone,
      buyerEmail: buyers.email,
      buyerCanLogIn: canLogIn(buyers.passwordHash),
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .innerJoin(buyers, eq(buyers.id, offers.buyerId))
    .where(
      and(
        eq(offers.status, status),
        eq(listings.status, "live"),
        realListing,
        eq(buyers.role, "user"),
        lte(offers.updatedAt, ago(now, hours * HOUR)),
      ),
    )
    .orderBy(asc(offers.updatedAt))
    .limit(LIMIT);
}

/**
 * An offer the seller hasn't answered for 48 hours: the seller is reminded, and from 3 days our team is asked to call.
 * One reminder per wait: a revised offer (back to pending) starts a new one.
 */
async function offersRule(now: Date): Promise<FollowUpItem[]> {
  const rows = await openOffers(now, "pending", FOLLOW_UP.offerHours);
  return rows.map((o) => {
    const ref = refCode(o.refNo);
    return {
      id: o.id,
      since: o.updatedAt,
      title: o.project,
      ref,
      href: `/admin/listings/${o.listingId}`,
      contact: sellerContact(o),
      project: o.project,
      amount: o.amount,
      escalated: o.updatedAt <= ago(now, FOLLOW_UP.offerEscalateHours * HOUR),
      nudge: o.sellerCanLogIn
        ? {
            entityType: "offer",
            kind: `seller:${o.updatedAt.getTime()}`,
            userId: o.sellerId,
            template: "offer.reminder",
            params: { project: o.project, ref, amount: { aed: o.amount }, date: { date: dubaiToday(o.updatedAt) } },
            href: "/dashboard/offers?tab=received",
          }
        : null,
    };
  });
}

/** The seller's counter-offer, unanswered by the buyer for 48 hours: the buyer is reminded. */
async function countersRule(now: Date): Promise<FollowUpItem[]> {
  const rows = await openOffers(now, "countered", FOLLOW_UP.counterHours);
  return rows.map((o) => ({
    id: o.id,
    since: o.updatedAt,
    title: o.project,
    ref: refCode(o.refNo),
    href: `/admin/listings/${o.listingId}`,
    contact: { name: o.buyerName, phone: o.buyerPhone, email: realEmail(o.buyerEmail) },
    project: o.project,
    amount: o.counterAmount,
    nudge: o.buyerCanLogIn
      ? {
          entityType: "offer",
          kind: `buyer:${o.updatedAt.getTime()}`,
          userId: o.buyerId,
          template: "offer.counter_reminder",
          params: {
            project: o.project,
            amount: { aed: o.counterAmount },
            original: { aed: o.amount },
            date: { date: dubaiToday(o.updatedAt) },
          },
          href: "/dashboard/offers?tab=sent",
        }
      : null,
  }));
}

/** Free-estimate requests still "new" a day later. For our team only. */
async function leadsRule(now: Date): Promise<FollowUpItem[]> {
  const rows = await db
    .select({
      id: sellerLeads.id,
      refNo: sellerLeads.refNo,
      name: sellerLeads.name,
      phone: sellerLeads.phone,
      email: sellerLeads.email,
      project: sellerLeads.project,
      createdAt: sellerLeads.createdAt,
    })
    .from(sellerLeads)
    .leftJoin(users, eq(users.id, sellerLeads.userId))
    .where(
      and(
        eq(sellerLeads.status, "new"),
        lte(sellerLeads.createdAt, ago(now, FOLLOW_UP.leadHours * HOUR)),
        // An estimate our own team tried out isn't a lead.
        sql`(${users.id} is null or ${users.role} = 'user')`,
      ),
    )
    .orderBy(asc(sellerLeads.createdAt))
    .limit(LIMIT);
  return rows.map((l) => ({
    id: l.id,
    since: l.createdAt,
    title: l.name,
    ref: leadCode(l.refNo),
    href: `/admin/leads#lead-${l.refNo}`,
    contact: { name: l.name, phone: l.phone, email: l.email },
    project: l.project ?? undefined,
    nudge: null,
  }));
}

/** Waiting for our team's verification for a day (since it was sent, or sent back, for review). For our team only. */
async function reviewRule(now: Date): Promise<FollowUpItem[]> {
  const rows = await db
    .select({
      id: listings.id,
      refNo: listings.refNo,
      project: listings.projectName,
      updatedAt: listings.updatedAt,
      awaitingSeller: sql<boolean>`(${listings.createdByStaff} and ${listings.ownershipConfirmedAt} is null)`,
      ...sellerColumns,
    })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(and(eq(listings.status, "pending_review"), realListing, lte(listings.updatedAt, ago(now, FOLLOW_UP.reviewHours * HOUR))))
    .orderBy(asc(listings.updatedAt))
    .limit(LIMIT);
  return rows.map((l) => ({
    id: l.id,
    since: l.updatedAt,
    title: l.project,
    ref: refCode(l.refNo),
    href: `/admin/listings/${l.id}`,
    contact: sellerContact(l),
    project: l.project,
    awaitingSeller: l.awaitingSeller,
    nudge: null,
  }));
}

/**
 * Live or under-offer units whose next instalment falls due within 14 days or is already past: developers won't issue
 * the NOC while instalments are overdue, so our team agrees with the seller who pays it. For our team only.
 */
async function instalmentsRule(now: Date): Promise<FollowUpItem[]> {
  const today = dubaiToday(now);
  const rows = await db
    .select({
      id: listings.id,
      refNo: listings.refNo,
      project: listings.projectName,
      updatedAt: listings.updatedAt,
      date: listings.nextInstalmentDate,
      amount: listings.nextInstalmentAmount,
      ...sellerColumns,
    })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(
      and(
        inArray(listings.status, ["live", "under_offer"]),
        realListing,
        isNotNull(listings.nextInstalmentDate),
        lte(listings.nextInstalmentDate, addDays(today, FOLLOW_UP.instalmentDays)),
      ),
    )
    .orderBy(asc(listings.nextInstalmentDate))
    .limit(LIMIT);
  return rows.map((l) => ({
    id: l.id,
    since: l.updatedAt,
    title: l.project,
    ref: refCode(l.refNo),
    href: `/admin/listings/${l.id}`,
    contact: sellerContact(l),
    project: l.project,
    date: l.date,
    amount: l.amount,
    overdue: l.date != null && l.date < today,
    nudge: null,
  }));
}

/** Viewing requests nobody has handled for 4 hours. For our team only. */
async function viewingsRule(now: Date): Promise<FollowUpItem[]> {
  const rows = await db
    .select({
      id: inquiries.id,
      name: inquiries.name,
      phone: inquiries.phone,
      email: inquiries.email,
      createdAt: inquiries.createdAt,
      listingId: listings.id,
      refNo: listings.refNo,
      project: listings.projectName,
    })
    .from(inquiries)
    .leftJoin(listings, eq(listings.id, inquiries.listingId))
    .leftJoin(users, eq(users.id, inquiries.userId))
    .where(
      and(
        eq(inquiries.type, "viewing"),
        eq(inquiries.handled, false),
        lte(inquiries.createdAt, ago(now, FOLLOW_UP.viewingHours * HOUR)),
        sql`(${listings.id} is null or not ${listings.isSample})`,
        sql`(${users.id} is null or ${users.role} = 'user')`,
      ),
    )
    .orderBy(asc(inquiries.createdAt))
    .limit(LIMIT);
  return rows.map((i) => ({
    id: i.id,
    since: i.createdAt,
    title: i.project ?? i.name,
    ref: i.refNo != null ? refCode(i.refNo) : null,
    href: "/admin/inquiries",
    contact: { name: i.name, phone: i.phone, email: i.email },
    project: i.project ?? undefined,
    nudge: null,
  }));
}

const RULES: Record<FollowUpKey, (now: Date) => Promise<FollowUpItem[]>> = {
  offers: offersRule,
  counters: countersRule,
  viewings: viewingsRule,
  instalments: instalmentsRule,
  review: reviewRule,
  docs: docsRule,
  leads: leadsRule,
  signup: signupRule,
  noOffers: noOffersRule,
};

/** Every rule's open items right now: the Follow-ups section and the cron both read this. */
export async function followUps(now = new Date()): Promise<FollowUps> {
  const lists = await Promise.all(FOLLOW_UP_KEYS.map((k) => RULES[k](now)));
  return Object.fromEntries(FOLLOW_UP_KEYS.map((k, i) => [k, lists[i]])) as FollowUps;
}

/** How many items each rule has, plus the offers our team should call about; the digest's numbers. */
export function followUpCounts(f: FollowUps) {
  const counts = Object.fromEntries(FOLLOW_UP_KEYS.map((k) => [k, f[k].length])) as Record<FollowUpKey, number>;
  const escalated = f.offers.filter((o) => o.escalated).length;
  const total = FOLLOW_UP_KEYS.reduce((n, k) => n + counts[k], 0);
  return { counts, escalated, total };
}

/**
 * Records that `kind` went out for this entity and returns true, unless it was recorded already. The unique index on
 * (entity_type, entity_id, kind) makes this safe when two runs overlap: only one of them gets true.
 */
async function claim(entityType: string, entityId: string, kind: string) {
  const rows = await db.insert(reminders).values({ entityType, entityId, kind }).onConflictDoNothing().returning({ id: reminders.id });
  return rows.length > 0;
}

/**
 * The daily follow-up run (src/app/api/cron/ops-daily): each seller's and buyer's nudge that is due and hasn't gone out
 * yet, then, once per Dubai day, the admins' digest of every rule's count (only when there is something to follow up).
 * A failed nudge is counted and the run carries on.
 */
export async function sendFollowUps(now = new Date()) {
  const f = await followUps(now);
  let nudged = 0;
  let failed = 0;
  for (const key of FOLLOW_UP_KEYS) {
    for (const item of f[key]) {
      const n = item.nudge;
      if (!n) continue;
      try {
        if (!(await claim(n.entityType, item.id, n.kind))) continue;
        await notify([n.userId], n.template, n.params, n.href);
        nudged++;
      } catch (err) {
        failed++;
        console.error(`[reminders] ${n.kind} for ${n.entityType} ${item.id} failed`, err);
      }
    }
  }

  const { counts, escalated, total } = followUpCounts(f);
  let digest = false;
  if (total > 0) {
    try {
      const today = dubaiToday(now);
      if (await claim("digest", today, "ops")) {
        const line = (k: FollowUpKey) => (counts[k] ? { t: "admin" as const, key: `followups.digest.${k}` as const, vars: { n: counts[k] } } : "");
        await notifyAdmins(
          "ops.digest",
          {
            date: { date: today },
            total,
            signup: line("signup"),
            docs: line("docs"),
            noOffers: line("noOffers"),
            offers: escalated
              ? { t: "admin", key: "followups.digest.offersLate", vars: { n: counts.offers, late: escalated } }
              : line("offers"),
            counters: line("counters"),
            leads: line("leads"),
            review: line("review"),
            instalments: line("instalments"),
            viewings: line("viewings"),
            email: emailOffReason() ? { t: "admin", key: "followups.digest.emailOff" } : "",
          },
          "/admin#follow-ups",
        );
        digest = true;
      }
    } catch (err) {
      failed++;
      console.error("[reminders] the admins' digest failed", err);
    }
  }
  return { nudged, digest, followUps: total, failed };
}
