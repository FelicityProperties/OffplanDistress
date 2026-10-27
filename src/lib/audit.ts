import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, users } from "@/db/schema";
import { clientIp } from "./throttle";

// The audit trail (audit_events): who changed what, from which IP, when. Ministry of Economy AML inspections and
// disputes over a seller's authority need it, so every admin action records one row, as do a seller's own status
// changes, offers our team answers on a seller's behalf, files our team uploads to a seller's listing and documents
// opened by someone other than their uploader.
// Rows are only ever inserted.

/** { field: [before, after] } for changes, or a few plain facts about the event ({ kind: "spa" }). */
export type AuditDiff = Record<string, unknown>;

/** Keys that never go in the log, whatever an action passes: credentials, tokens, links that carry one, file bytes. */
const SECRET_KEY = /pass(word)?|token|secret|hash|session|cookie|otp|api.?key|authori[sz]ation|^url$|link|data$|content|bytes/i;
const MAX_STRING = 500;

function clean(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (depth > 3) return null;
  if (Array.isArray(value)) return value.slice(0, 40).map((v) => clean(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!SECRET_KEY.test(k)) out[k] = clean(v, depth + 1);
    }
    return out;
  }
  return null;
}

/** The diff with every secret-looking key removed (at any depth) and long text cut short. Exported for tests. */
export function scrubDiff(diff: AuditDiff | null | undefined): AuditDiff | null {
  if (!diff) return null;
  const out = clean(diff) as AuditDiff;
  return Object.keys(out).length ? out : null;
}

const same = (a: unknown, b: unknown) => {
  const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v === undefined ? null : v);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
};

/**
 * The fields of `after` whose value differs from `before`, as { field: [before, after] }. Only the keys present in
 * `after` are compared, so a partial update lists just what it changed.
 */
export function changes(before: Record<string, unknown>, after: Record<string, unknown>): AuditDiff {
  const diff: AuditDiff = {};
  for (const [k, v] of Object.entries(after)) {
    if (v === undefined) continue;
    if (!same(before[k], v)) diff[k] = [before[k] ?? null, v];
  }
  return diff;
}

export type AuditEvent = {
  /** The signed-in user who did it; null for the system. */
  actorId: string | null;
  action: string;
  entityType: "listing" | "deal" | "offer" | "file" | "user" | "inquiry" | "lead" | "export";
  entityId: string;
  diff?: AuditDiff | null;
};

/**
 * Records one event. Never throws: the change it describes is already saved, so a failure here is logged (without the
 * diff) rather than turned into an error for the user. Call it from a request (server action or route handler): the IP
 * comes from its headers.
 */
export async function audit(e: AuditEvent) {
  try {
    const ip = await clientIp().catch(() => null);
    await db.insert(auditEvents).values({
      actorId: e.actorId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      diff: scrubDiff(e.diff),
      ip: ip && ip !== "unknown" ? ip.slice(0, 64) : null,
    });
  } catch (err) {
    console.error(`[audit] recording ${e.action} on ${e.entityType} ${e.entityId} failed`, err instanceof Error ? err.message : err);
  }
}

/** How many events the History panel shows. */
export const HISTORY_LIMIT = 200;

/**
 * The History panel of the admin listing page, newest first: events on the listing itself, its deal files, its offers
 * and its documents, and KYC changes of its seller and of its deals' buyers. Admins only (the page checks).
 */
const subjects = alias(users, "audit_subject");

export async function listingHistory(listingId: string) {
  const id = sql`${listingId}::uuid`;
  return db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      diff: auditEvents.diff,
      ip: auditEvents.ip,
      createdAt: auditEvents.createdAt,
      actorId: auditEvents.actorId,
      actorName: users.fullName,
      actorRole: users.role,
      // The person a "user" event is about (whose KYC changed).
      subjectName: subjects.fullName,
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorId))
    .leftJoin(subjects, sql`${auditEvents.entityType} = 'user' and ${subjects.id}::text = ${auditEvents.entityId}`)
    .where(
      sql`(${auditEvents.entityType} = 'listing' and ${auditEvents.entityId} = ${listingId})
        or (${auditEvents.entityType} = 'deal' and ${auditEvents.entityId} in (select d.id::text from deals d where d.listing_id = ${id}))
        or (${auditEvents.entityType} = 'offer' and ${auditEvents.entityId} in (select o.id::text from offers o where o.listing_id = ${id}))
        or (${auditEvents.entityType} = 'file' and ${auditEvents.entityId} in (select f.id::text from files f where f.listing_id = ${id}))
        or (${auditEvents.entityType} = 'user' and ${auditEvents.action} = 'user.kyc' and ${auditEvents.entityId} in (
              select l.seller_id::text from listings l where l.id = ${id}
              union select d.buyer_id::text from deals d where d.listing_id = ${id} and d.buyer_id is not null))`,
    )
    .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
    .limit(HISTORY_LIMIT);
}

export type HistoryEvent = Awaited<ReturnType<typeof listingHistory>>[number];
