"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inquiries, listings, offers, sessions, users } from "@/db/schema";
import { getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { getCurrentUser, hashPassword, isOwnerEmail } from "@/lib/auth";
import { LISTING_STATUS, PUBLIC_STATUSES, type ListingStatusKey } from "@/lib/config";
import { refCode } from "@/lib/format";
import { notify, notifyPriceDrop } from "@/lib/notify";
import type { FormState } from "./auth";

type T = TFn<"errors">;

/** Messages for checks that don't carry their own, in the request's language. */
function fallbackErrors(t: T): z.core.$ZodErrorMap {
  return (iss) => {
    if (iss.code === "too_big" && iss.origin === "string") return t("field.tooLong", { max: Number(iss.maximum) });
    if (iss.code === "too_big" && iss.origin === "array") return t("field.tooMany", { max: Number(iss.maximum) });
    if (iss.code === "too_small" && iss.origin === "number") return t("field.notNegative");
    if (iss.code === "invalid_type" && iss.expected === "number") return t("field.number");
    return t("field.invalid");
  };
}

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error((await getT("errors"))("auth.notAuthorised"));
  return user;
}

type ListingForNotice = { id: string; sellerId: string; projectName: string; refNo: number; isSample: boolean };

const sellerHref = (id: string) => `/dashboard/listings/${id}`;

/** Sample listings belong to placeholder sellers, so their "seller" never gets in-app rows or emails. */
async function notifySeller(l: ListingForNotice, key: Parameters<typeof notify>[1], params: Parameters<typeof notify>[2]) {
  if (!l.isSample) await notify([l.sellerId], key, params, sellerHref(l.id));
}

/** Seller and the buyer whose offer was accepted hear about each step of the transfer. */
async function notifyDealStep(l: ListingForNotice, key: "deal.noc_in_progress" | "deal.transferred") {
  const params = { project: l.projectName, ref: refCode(l.refNo) };
  const [accepted] = await db
    .select({ buyerId: offers.buyerId })
    .from(offers)
    .where(and(eq(offers.listingId, l.id), eq(offers.status, "accepted")))
    .orderBy(desc(offers.updatedAt))
    .limit(1);
  await notifySeller(l, key, params);
  if (accepted) await notify([accepted.buyerId], key, params, "/dashboard/offers?tab=sent");
}

const listingNoticeColumns = {
  id: listings.id,
  sellerId: listings.sellerId,
  projectName: listings.projectName,
  refNo: listings.refNo,
  isSample: listings.isSample,
  status: listings.status,
  askingPrice: listings.askingPrice,
  publishedAt: listings.publishedAt,
};

export async function approveListing(listingId: string) {
  await assertAdmin();
  const [before] = await db.select(listingNoticeColumns).from(listings).where(eq(listings.id, listingId)).limit(1);
  const now = new Date();
  await db
    .update(listings)
    .set({ status: "live", verified: true, publishedAt: before?.publishedAt ?? now, rejectionReason: null, updatedAt: now })
    .where(eq(listings.id, listingId));
  if (before && before.status !== "live") {
    await notifySeller(before, "listing.approved", { project: before.projectName, ref: refCode(before.refNo) });
  }
  refresh();
  return { ok: true };
}

export async function rejectListing(listingId: string, reason: string) {
  await assertAdmin();
  const [before] = await db.select(listingNoticeColumns).from(listings).where(eq(listings.id, listingId)).limit(1);
  const clean = reason.trim().slice(0, 1000);
  await db
    .update(listings)
    .set({ status: "rejected", rejectionReason: clean || null, updatedAt: new Date() })
    .where(eq(listings.id, listingId));
  if (before) {
    await notifySeller(before, "listing.rejected", {
      project: before.projectName,
      reason: clean || { t: "errors", key: "notify.rejectedFallback" },
    });
  }
  refresh();
  return { ok: true };
}

const statuses = Object.keys(LISTING_STATUS) as [ListingStatusKey, ...ListingStatusKey[]];

const adminEditSchema = (t: T) =>
  z.object({
    listingId: z.uuid(),
    status: z.enum(statuses),
    verified: z.boolean(),
    nocEligible: z.boolean(),
    launchPrice: z.coerce.number().int(t("field.wholeDirhams")).nonnegative().optional(),
    askingPrice: z.coerce.number().int(t("field.wholeDirhams")).nonnegative(),
    adminNotes: z.string().trim().max(4000).optional(),
    images: z.array(z.string().max(500)).max(20),
  });

export async function adminUpdateListing(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const t = await getT("errors");
  const parsed = adminEditSchema(t).safeParse(
    {
      listingId: formData.get("listingId"),
      status: formData.get("status"),
      verified: formData.get("verified") === "on",
      nocEligible: formData.get("nocEligible") === "on",
      launchPrice: formData.get("launchPrice") || undefined,
      askingPrice: formData.get("askingPrice"),
      adminNotes: formData.get("adminNotes") || undefined,
      images: String(formData.get("images") ?? "")
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { error: t("form.checkFields"), fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const [current] = await db.select(listingNoticeColumns).from(listings).where(eq(listings.id, v.listingId)).limit(1);
  if (!current) return { error: t("listing.notFound") };
  const now = new Date();
  await db
    .update(listings)
    .set({
      status: v.status,
      verified: v.verified,
      nocEligible: v.nocEligible,
      launchPrice: v.launchPrice ?? null,
      askingPrice: v.askingPrice,
      adminNotes: v.adminNotes ?? null,
      images: v.images.filter((u) => /^https:\/\//.test(u) || u.startsWith("/api/files/")),
      publishedAt: current.publishedAt ?? (v.status === "live" ? now : null),
      updatedAt: now,
    })
    .where(eq(listings.id, v.listingId));

  const statusChanged = v.status !== current.status;
  // Going live for the first time is an approval, whichever control the admin used.
  if (statusChanged && v.status === "live" && !current.publishedAt) {
    await notifySeller(current, "listing.approved", { project: current.projectName, ref: refCode(current.refNo) });
  }
  if (statusChanged && v.status === "noc_in_progress") await notifyDealStep(current, "deal.noc_in_progress");
  if (statusChanged && v.status === "transferred") await notifyDealStep(current, "deal.transferred");
  // Watchers only hear about drops on deals they can open (and never on sample listings).
  if (!current.isSample && PUBLIC_STATUSES.includes(v.status)) {
    await notifyPriceDrop(current, current.askingPrice, v.askingPrice);
  }

  refresh();
  return { ok: true };
}

export async function setKycStatus(userId: string, status: "not_started" | "pending" | "verified") {
  await assertAdmin();
  const [before] = await db.select({ kycStatus: users.kycStatus }).from(users).where(eq(users.id, userId)).limit(1);
  await db.update(users).set({ kycStatus: status }).where(eq(users.id, userId));
  if (before && status === "verified" && before.kycStatus !== "verified") {
    await notify([userId], "kyc.verified", {}, "/dashboard/profile");
  }
  refresh();
  return { ok: true };
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const me = await assertAdmin();
  const t = await getT("errors");
  if (me.id === userId && role !== "admin") return { error: t("admin.ownAccess") };
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (target && isOwnerEmail(target.email) && role !== "admin") return { error: t("admin.ownerAlwaysAdmin") };
  await db.update(users).set({ role }).where(eq(users.id, userId));
  refresh();
  return { ok: true };
}

/** Admins can hand a temporary password to a user directly (e.g. when email isn't set up). */
export async function resetUserPassword(userId: string) {
  await assertAdmin();
  const t = await getT("errors");
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!target) return { error: t("admin.userNotFound") };
  if (isOwnerEmail(target.email)) return { error: t("admin.ownerPassword") };
  const temp = randomBytes(9).toString("base64url");
  await db.update(users).set({ passwordHash: await hashPassword(temp) }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return { ok: true, password: temp };
}

export async function setInquiryHandled(id: string, handled: boolean) {
  await assertAdmin();
  await db.update(inquiries).set({ handled }).where(eq(inquiries.id, id));
  refresh();
  return { ok: true };
}

export async function deleteSampleListings() {
  await assertAdmin();
  await db.delete(listings).where(eq(listings.isSample, true));
  refresh();
  return { ok: true };
}
