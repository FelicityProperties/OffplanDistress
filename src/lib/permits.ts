import "server-only";
import { and, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { toString as qrToString } from "qrcode";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { PUBLIC_STATUSES, type ListingStatusKey } from "./config";
import { refCode } from "./format";
import { notify, notifyAdmins, type TemplateParam } from "./notify";

// RERA advertising rules: a real listing is only advertised with a current DLD (Trakheesi) permit, and only while the
// seller's Form A (their listing agreement with us) runs. Both expiry dates are Dubai calendar dates, valid through
// that day. From the next day the listing stops showing as an advert on every public page (advertisedSql /
// isAdvertised below), and the daily ops cron (src/app/api/cron/ops-daily) pauses a live one; a unit with an agreed
// deal keeps its status and the admins decide. Sample listings aren't adverts, so none of this applies to them.
// Without a permit number, the account owner's recorded attestation that Felicity holds the permit (listings.
// permit_attested_at, src/lib/attestation.ts) lets the advert go live; it has no expiry to track, so it is never
// paused, and the admin queue asks for the number.

/** The UAE is on UTC+4 all year (no daylight saving). */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today in Dubai as "YYYY-MM-DD", the format Drizzle uses for date columns. */
export function dubaiToday(now = new Date()) {
  return new Date(now.getTime() + DUBAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-26" + 7 → "2026-11-02" */
export function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` ("YYYY-MM-DD"): "2026-10-26" → "2026-11-02" is 7. */
function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** "2026-10-26" + n years (29 February becomes 1 March in a common year). */
function addYears(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y + n, m - 1, d)).toISOString().slice(0, 10);
}

/**
 * The dates an admin may enter as a permit or Form A expiry: from a year ago (recording one that has already run out)
 * to three years ahead. Anything else is a typo, such as a five-digit year or 0000, which Postgres would reject.
 */
export function expiryDateBounds(today = dubaiToday()) {
  return { min: addYears(today, -1), max: addYears(today, 3) };
}

/** The permit's verification page: https on dubailand.gov.ae or one of its subdomains, and nothing else. */
export function isDldPermitUrl(value: string) {
  try {
    const u = new URL(value);
    const host = u.hostname;
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (host === "dubailand.gov.ae" || host.endsWith(".dubailand.gov.ae"))
    );
  } catch {
    return false;
  }
}

type PermitFields = {
  isSample: boolean;
  dldPermit: string | null;
  dldPermitExpiresAt: string | null;
  formAExpiresAt: string | null;
  /** The account owner's attestation that Felicity holds the permit, standing in for a number (src/lib/attestation.ts). */
  permitAttestedAt: Date | null;
};

/**
 * Why a listing can't be made public right now (an errors.ts key), or null when it can. The permit has to run past
 * today, since one that ends today comes down tomorrow morning. Without a number, the account owner's attestation
 * stands in for it (no expiry is tracked then; a number entered later takes over, with these rules). Form A is
 * optional, but one that has run out (or ends today) blocks the advert as well.
 */
export function publishBlocker(l: PermitFields, today = dubaiToday()) {
  if (l.isSample) return null;
  if (!l.dldPermit) {
    if (!l.permitAttestedAt) return "listing.permitRequired" as const;
  } else if (!l.dldPermitExpiresAt || l.dldPermitExpiresAt <= today) return "listing.permitExpiry" as const;
  if (l.formAExpiresAt && l.formAExpiresAt <= today) return "listing.formAExpired" as const;
  return null;
}

/** Neither the permit nor Form A has run out. A missing date doesn't count as expired (older listings have none). */
export function permitCurrentSql(today = dubaiToday()) {
  return and(
    or(isNull(listings.dldPermitExpiresAt), gte(listings.dldPermitExpiresAt, today)),
    or(isNull(listings.formAExpiresAt), gte(listings.formAExpiresAt, today)),
  )!;
}

type ExpiryFields = Pick<PermitFields, "isSample" | "dldPermitExpiresAt" | "formAExpiresAt">;

/**
 * A real listing whose permit or Form A ran out before today. It isn't an advert any more, even before the daily cron
 * has paused it. Samples aren't adverts; a listing without the dates is grandfathered (nothing says it has lapsed).
 */
export function permitLapsed(l: ExpiryFields, today = dubaiToday()) {
  if (l.isSample) return false;
  return (l.dldPermitExpiresAt != null && l.dldPermitExpiresAt < today) || (l.formAExpiresAt != null && l.formAExpiresAt < today);
}

/**
 * Whether the public sees this listing as an advert (its deal page, offers, the share card): a public status and, for a
 * real listing, no lapsed permit or Form A. Anything else is shown only to its seller and our team, as a private page.
 */
export function isAdvertised(l: ExpiryFields & { status: ListingStatusKey }, today = dubaiToday()) {
  return PUBLIC_STATUSES.includes(l.status) && !permitLapsed(l, today);
}

/** isAdvertised as a condition on `listings`, for every public list and figure: /deals, home, /market, the sitemap. */
export function advertisedSql(today = dubaiToday()) {
  return and(inArray(listings.status, PUBLIC_STATUSES), or(eq(listings.isSample, true), permitCurrentSql(today)))!;
}

const publicReal = and(inArray(listings.status, PUBLIC_STATUSES), eq(listings.isSample, false))!;

/**
 * Public real listings without a permit expiry date: published on the account owner's attestation without a number
 * (`attested`), or before the dates were recorded. They aren't paused (nothing says their permit has lapsed), but the
 * admin queue asks for the number, or the date, under its own wording for each.
 */
export async function listingsWithoutPermitExpiry() {
  return db
    .select({
      id: listings.id,
      refNo: listings.refNo,
      attested: sql<boolean>`(${listings.dldPermit} is null and ${listings.permitAttestedAt} is not null)`,
    })
    .from(listings)
    .where(and(publicReal, isNull(listings.dldPermitExpiresAt)))
    .orderBy(listings.refNo);
}

/** The verification link as an inline SVG QR code, drawn here so no outside QR service sees it; null without a valid link. */
export async function permitQrSvg(url: string | null) {
  if (!url || !isDldPermitUrl(url)) return null;
  try {
    return await qrToString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#141c33", light: "#ffffff" } });
  } catch (err) {
    console.error("[permits] QR code failed", err);
    return null;
  }
}

/** Admins hear about an expiry this many days ahead, and again the day before. */
const REMIND_DAYS = 7;

type Doc = "permit" | "formA";

/** Each document a listing has an expiry date for, with that date. */
function expiries(l: { dldPermitExpiresAt: string | null; formAExpiresAt: string | null }) {
  return (
    [
      ["permit", l.dldPermitExpiresAt],
      ["formA", l.formAExpiresAt],
    ] as [Doc, string | null][]
  ).filter((e): e is [Doc, string] => e[1] != null);
}

/**
 * Which reminder is due `daysLeft` days before an expiry: the week one from 7 days out, the last one from the day
 * before (on the day itself if the date was only entered then). Matching a window rather than an exact day means a
 * run that was missed is made up by the next one; expiryNotices (claimNotice) stops a second one going out.
 */
function reminderFor(daysLeft: number): { stage: "week" | "day"; when: TemplateParam } | null {
  if (daysLeft < 0 || daysLeft > REMIND_DAYS) return null;
  if (daysLeft <= 1) return { stage: "day", when: { t: "errors", key: daysLeft === 0 ? "notify.expiry.today" : "notify.expiry.tomorrow" } };
  return { stage: "week", when: daysLeft === 2 ? { t: "errors", key: "notify.expiry.twoDays" } : { t: "errors", key: "notify.expiry.days", vars: { n: daysLeft } } };
}

/**
 * Records that the admins got `notice` ("permit:2026-11-02:week") about this listing and returns true, unless it was
 * recorded already. Postgres re-checks the condition on the locked row, so of two runs at once only one gets true.
 * Notices about dates the listing no longer has (the permit was renewed since) are dropped on the way.
 */
async function claimNotice(listingId: string, notice: string) {
  const current = sql`array(select n from unnest(${listings.expiryNotices}) n where split_part(n, ':', 2) in (coalesce(${listings.dldPermitExpiresAt}::text, ''), coalesce(${listings.formAExpiresAt}::text, '')))`;
  const claimed = await db
    .update(listings)
    .set({ expiryNotices: sql`array_append(${current}, ${notice}::text)` })
    .where(and(eq(listings.id, listingId), sql`not (${notice}::text = any(${listings.expiryNotices}))`))
    .returning({ id: listings.id });
  return claimed.length > 0;
}

/**
 * The daily permit run:
 * 1. pauses live real listings whose permit or Form A has run out (as our team, so the seller can't resume them; the
 *    seller is told why);
 * 2. leaves a unit with an agreed deal (under offer, NOC in progress) as it is, and asks the admins to renew the
 *    document or decide, once per listing and expiry date (the public pages already stopped showing it);
 * 3. reminds the admins of an expiry within the next 7 days, then again the day before, each once.
 */
export async function enforcePermitExpiry(today = dubaiToday()) {
  const lapsedSql = or(lt(listings.dldPermitExpiresAt, today), lt(listings.formAExpiresAt, today));
  // Matching on "live" makes a second run harmless: a listing it already paused isn't picked up again.
  const paused = await db
    .update(listings)
    .set({ status: "paused", pausedByAdmin: true, updatedAt: new Date() })
    .where(and(eq(listings.status, "live"), eq(listings.isSample, false), lapsedSql))
    .returning({
      id: listings.id,
      sellerId: listings.sellerId,
      projectName: listings.projectName,
      refNo: listings.refNo,
      formAExpiresAt: listings.formAExpiresAt,
    });
  for (const l of paused) {
    // A lapsed Form A comes first: a new one is needed before the permit can be renewed.
    const lapsed = l.formAExpiresAt != null && l.formAExpiresAt < today ? "formA" : "permit";
    await notify(
      [l.sellerId],
      "listing.paused_permit",
      { project: l.projectName, reason: { t: "errors", key: `notify.paused.${lapsed}`, vars: { ref: refCode(l.refNo) } } },
      `/dashboard/listings/${l.id}`,
    );
  }

  const columns = {
    id: listings.id,
    status: listings.status,
    projectName: listings.projectName,
    refNo: listings.refNo,
    dldPermitExpiresAt: listings.dldPermitExpiresAt,
    formAExpiresAt: listings.formAExpiresAt,
  };
  let flagged = 0;
  let reminded = 0;
  let failed = 0;
  /** Sends one admin notice unless it already went out; a failure is counted and the run carries on. */
  const once = async (l: { id: string }, notice: string, send: () => Promise<unknown>) => {
    try {
      if (!(await claimNotice(l.id, notice))) return false;
      await send();
      return true;
    } catch (err) {
      failed++;
      console.error(`[permits] ${notice} for listing ${l.id} failed`, err);
      return false;
    }
  };

  const inDeal = await db
    .select(columns)
    .from(listings)
    .where(and(inArray(listings.status, ["under_offer", "noc_in_progress"]), eq(listings.isSample, false), lapsedSql));
  for (const l of inDeal) {
    for (const [doc, expiry] of expiries(l)) {
      if (expiry >= today) continue;
      const sent = await once(l, `${doc}:${expiry}:lapsed`, () =>
        notifyAdmins(
          "listing.permit_lapsed",
          {
            project: l.projectName,
            ref: refCode(l.refNo),
            document: { t: "errors", key: `notify.doc.${doc}` },
            date: { date: expiry },
            status: { t: "common", key: `listing.${l.status}` },
          },
          `/admin/listings/${l.id}`,
        ),
      );
      if (sent) flagged++;
    }
  }

  const horizon = addDays(today, REMIND_DAYS);
  const soon = await db
    .select(columns)
    .from(listings)
    .where(
      and(
        publicReal,
        or(
          and(gte(listings.dldPermitExpiresAt, today), lte(listings.dldPermitExpiresAt, horizon)),
          and(gte(listings.formAExpiresAt, today), lte(listings.formAExpiresAt, horizon)),
        ),
      ),
    );
  for (const l of soon) {
    for (const [doc, expiry] of expiries(l)) {
      const due = reminderFor(daysBetween(today, expiry));
      if (!due) continue;
      const sent = await once(l, `${doc}:${expiry}:${due.stage}`, () =>
        notifyAdmins(
          "listing.permit_expiring",
          {
            project: l.projectName,
            ref: refCode(l.refNo),
            document: { t: "errors", key: `notify.doc.${doc}` },
            when: due.when,
            // A live advert is paused once it runs out; a unit with an agreed deal only stops showing as an advert.
            then: { t: "errors", key: l.status === "live" ? "notify.expiry.thenPause" : "notify.expiry.thenHide" },
          },
          `/admin/listings/${l.id}`,
        ),
      );
      if (sent) reminded++;
    }
  }

  return { paused: paused.length, flagged, reminded, failed };
}
