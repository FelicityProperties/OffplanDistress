import "server-only";
import { and, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { toString as qrToString } from "qrcode";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { PUBLIC_STATUSES } from "./config";
import { refCode } from "./format";
import { notify, notifyAdmins } from "./notify";
import { hit } from "./throttle";

// RERA advertising rules: a real listing is only advertised with a current DLD (Trakheesi) permit, and only while the
// seller's Form A (their listing agreement with us) runs. Both expiry dates are Dubai calendar dates, valid through
// that day; the daily ops cron (src/app/api/cron/ops-daily) takes the advert down the morning after. Sample listings
// aren't adverts, so none of this applies to them.

/** The UAE is on UTC+4 all year (no daylight saving). */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Admins are reminded this many days before a permit or Form A runs out (errors.ts words for "in 7 days" etc.). */
const REMINDERS = { 7: "notify.expiry.week", 1: "notify.expiry.tomorrow" } as const;

/** Today in Dubai as "YYYY-MM-DD", the format Drizzle uses for date columns. */
export function dubaiToday(now = new Date()) {
  return new Date(now.getTime() + DUBAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-26" + 7 → "2026-11-02" */
export function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
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
};

/**
 * Why a listing can't be made public right now (an errors.ts key), or null when it can. The permit has to run past
 * today, since one that ends today comes down tomorrow morning. Form A is optional, but one that has run out (or
 * ends today) blocks the advert as well.
 */
export function publishBlocker(l: PermitFields, today = dubaiToday()) {
  if (l.isSample) return null;
  if (!l.dldPermit) return "listing.permitRequired" as const;
  if (!l.dldPermitExpiresAt || l.dldPermitExpiresAt <= today) return "listing.permitExpiry" as const;
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

const publicReal = and(inArray(listings.status, PUBLIC_STATUSES), eq(listings.isSample, false))!;

/**
 * Public real listings without a permit expiry date: published before the dates were recorded. They aren't paused
 * (nothing says their permit has lapsed), but the admin queue asks for the date.
 */
export async function listingsWithoutPermitExpiry() {
  return db
    .select({ id: listings.id, refNo: listings.refNo })
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

/**
 * The daily permit run: pauses public real listings whose permit or Form A has run out (as our team, so the seller
 * can't resume them; the seller is told why), then reminds the admins 7 days and 1 day before an expiry.
 */
export async function enforcePermitExpiry(today = dubaiToday()) {
  // Matching on the public statuses makes a second run harmless: a listing it already paused isn't picked up again.
  const paused = await db
    .update(listings)
    .set({ status: "paused", pausedByAdmin: true, updatedAt: new Date() })
    .where(and(publicReal, or(lt(listings.dldPermitExpiresAt, today), lt(listings.formAExpiresAt, today))))
    .returning({
      id: listings.id,
      sellerId: listings.sellerId,
      projectName: listings.projectName,
      refNo: listings.refNo,
      formAExpiresAt: listings.formAExpiresAt,
    });
  for (const l of paused) {
    // A lapsed Form A comes first: the seller has to sign a new one before the permit can be renewed, and that
    // message covers the permit too.
    const lapsed = l.formAExpiresAt != null && l.formAExpiresAt < today ? "formA" : "permit";
    await notify(
      [l.sellerId],
      "listing.paused_permit",
      { project: l.projectName, reason: { t: "errors", key: `notify.paused.${lapsed}`, vars: { ref: refCode(l.refNo) } } },
      `/dashboard/listings/${l.id}`,
    );
  }

  const ahead = (Object.keys(REMINDERS).map(Number) as (keyof typeof REMINDERS)[]).map((days) => ({
    days,
    date: addDays(today, days),
  }));
  const dates = ahead.map((a) => a.date);
  const soon = await db
    .select({
      id: listings.id,
      projectName: listings.projectName,
      refNo: listings.refNo,
      dldPermitExpiresAt: listings.dldPermitExpiresAt,
      formAExpiresAt: listings.formAExpiresAt,
    })
    .from(listings)
    .where(and(publicReal, or(inArray(listings.dldPermitExpiresAt, dates), inArray(listings.formAExpiresAt, dates))));

  let reminded = 0;
  let failed = 0;
  for (const l of soon) {
    for (const [doc, expiry] of [
      ["permit", l.dldPermitExpiresAt],
      ["formA", l.formAExpiresAt],
    ] as const) {
      const due = ahead.find((a) => a.date === expiry);
      if (!due) continue;
      try {
        // Once per listing, document and reminder: a retry or a manual run later the same day stays quiet.
        if (!(await hit(`permit-reminder:${l.id}:${doc}:${expiry}:${due.days}`, 1, DAY_MS))) continue;
        await notifyAdmins(
          "listing.permit_expiring",
          {
            project: l.projectName,
            ref: refCode(l.refNo),
            document: { t: "errors", key: `notify.doc.${doc}` },
            when: { t: "errors", key: REMINDERS[due.days] },
          },
          `/admin/listings/${l.id}`,
        );
        reminded++;
      } catch (err) {
        failed++;
        console.error(`[permits] reminder for listing ${l.id} failed`, err);
      }
    }
  }

  return { paused: paused.length, reminded, failed };
}
