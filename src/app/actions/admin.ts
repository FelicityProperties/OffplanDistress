"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { files, inquiries, listings, offers, sessions, users } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { getCurrentUser, hashPassword, isOwnerEmail } from "@/lib/auth";
import { COMMUNITIES, DEVELOPERS, LISTING_STATUS, PUBLIC_STATUSES, type ListingStatusKey } from "@/lib/config";
import { formatDate, refCode } from "@/lib/format";
import { notify, notifyPriceDrop } from "@/lib/notify";
import { closeOpenOffers, reopenUnit } from "@/lib/offers";
import { expiryDateBounds, isDldPermitUrl, publishBlocker } from "@/lib/permits";
import { scrubTypedName } from "@/lib/typed-names";
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
  verified: listings.verified,
  dldPermit: listings.dldPermit,
  dldPermitExpiresAt: listings.dldPermitExpiresAt,
  formAExpiresAt: listings.formAExpiresAt,
  askingPrice: listings.askingPrice,
  publicPrice: listings.publicPrice,
  publishedAt: listings.publishedAt,
};

/**
 * "Verified" (Terms s.9) means we reviewed the SPA or Oqood plus the statement of account, so approving only sets
 * it when both are on file. Staff who checked documents received another way tick it in the listing editor.
 */
async function hasVerificationDocs(listingId: string) {
  const [row] = await db
    .select({
      title: sql<boolean>`coalesce(bool_or(${files.kind} in ('spa', 'oqood')), false)`,
      soa: sql<boolean>`coalesce(bool_or(${files.kind} = 'soa'), false)`,
    })
    .from(files)
    .where(eq(files.listingId, listingId));
  return Boolean(row?.title && row?.soa);
}

export async function approveListing(listingId: string) {
  await assertAdmin();
  const [before] = await db.select(listingNoticeColumns).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!before) return { error: (await getT("errors"))("listing.notFound") };
  // RERA: no property advert without a current DLD (Trakheesi) permit and Form A. Sample listings aren't adverts.
  const blocker = publishBlocker(before);
  if (blocker) return { error: (await getT("errors"))(blocker) };
  const now = new Date();
  const verified = before.verified || (await hasVerificationDocs(listingId));
  await db
    .update(listings)
    .set({
      status: "live",
      verified,
      publicPrice: before.askingPrice,
      publishedAt: before.publishedAt ?? now,
      rejectionReason: null,
      updatedAt: now,
    })
    .where(eq(listings.id, listingId));
  if (before.status !== "live") {
    await notifySeller(before, "listing.approved", { project: before.projectName, ref: refCode(before.refNo) });
    // Back on the market: no deal agreed earlier stays accepted on it (see reopenUnit).
    await reopenUnit(before, before.status);
  }
  // A seller's price cut waits for re-approval; watchers hear about it once it is public again.
  if (!before.isSample && before.publicPrice != null) await notifyPriceDrop(before, before.publicPrice, before.askingPrice);
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
    // Off the market: buyers with an open offer on it are told it is no longer available.
    await closeOpenOffers(before, "unavailable");
  }
  refresh();
  return { ok: true };
}

const statuses = Object.keys(LISTING_STATUS) as [ListingStatusKey, ...ListingStatusKey[]];

/**
 * A permit or Form A expiry: a real calendar date (z.iso.date checks the day exists in that month) no more than a year
 * back or three years ahead (expiryDateBounds), so a typo in the year is a field error rather than a database error.
 */
const expiryDate = (t: T, range: { min: string; max: string }, rangeMessage: string) =>
  z.iso
    .date(t("field.date"))
    .refine((d) => d >= range.min && d <= range.max, rangeMessage)
    .optional();

const adminEditSchema = (t: T, range: { min: string; max: string }, rangeMessage: string) =>
  z.object({
    listingId: z.uuid(),
    status: z.enum(statuses),
    verified: z.boolean(),
    nocEligible: z.boolean(),
    launchPrice: z.coerce.number().int(t("field.wholeDirhams")).nonnegative().optional(),
    askingPrice: z.coerce.number().int(t("field.wholeDirhams")).nonnegative(),
    adminNotes: z.string().trim().max(4000).optional(),
    dldPermit: z.string().trim().max(40).optional(),
    dldPermitExpiresAt: expiryDate(t, range, rangeMessage),
    // Stored as the parsed link, so the QR code encodes exactly what the check passed and a browser opens (the raw
    // text may hold a "\" or a tab that other URL parsers, such as a phone's QR scanner, read differently).
    dldPermitUrl: z
      .string()
      .trim()
      .max(500)
      .refine(isDldPermitUrl, t("field.dldPermitUrl"))
      .transform((u) => new URL(u).href)
      .optional(),
    formAExpiresAt: expiryDate(t, range, rangeMessage),
    images: z.array(z.string().max(500)).max(20),
    // Mapping a seller's "Other" to a listed name (or correcting it). Left out = unchanged.
    developer: z.string().max(80).optional(),
    community: z.string().max(80).optional(),
    // Shown publicly: links, emails and phone numbers are taken out here too (a seller's name saved back as it was).
    developerOther: z.string().trim().max(80).transform(scrubbedName).optional(),
    communityOther: z.string().trim().max(80).transform(scrubbedName).optional(),
  });

const scrubbedName = (v: string) => scrubTypedName(v).name || undefined;

export async function adminUpdateListing(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const [t, locale] = await Promise.all([getT("errors"), getLocale()]);
  const range = expiryDateBounds();
  const rangeMessage = t("field.expiryRange", { from: formatDate(range.min, locale), to: formatDate(range.max, locale) });
  const parsed = adminEditSchema(t, range, rangeMessage).safeParse(
    {
      listingId: formData.get("listingId"),
      status: formData.get("status"),
      verified: formData.get("verified") === "on",
      nocEligible: formData.get("nocEligible") === "on",
      launchPrice: formData.get("launchPrice") || undefined,
      askingPrice: formData.get("askingPrice"),
      adminNotes: formData.get("adminNotes") || undefined,
      dldPermit: formData.get("dldPermit") || undefined,
      dldPermitExpiresAt: formData.get("dldPermitExpiresAt") || undefined,
      dldPermitUrl: formData.get("dldPermitUrl") || undefined,
      formAExpiresAt: formData.get("formAExpiresAt") || undefined,
      developer: formData.get("developer") || undefined,
      community: formData.get("community") || undefined,
      developerOther: formData.get("developerOther") || undefined,
      communityOther: formData.get("communityOther") || undefined,
      images: String(formData.get("images") ?? "")
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { error: t("form.checkFields"), fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const [current] = await db
    .select({ ...listingNoticeColumns, developer: listings.developer, community: listings.community })
    .from(listings)
    .where(eq(listings.id, v.listingId))
    .limit(1);
  if (!current) return { error: t("listing.notFound") };
  // An editor opened before the status changed (say the seller accepted an offer since) would put the old status
  // back: the unit would go live again with an accepted offer, and its backup bidders be told the deal fell through.
  const statusWas = formData.get("statusWas");
  if (typeof statusWas === "string" && statusWas !== current.status) return { error: t("listing.statusChanged") };
  // A listed name, or the one already stored (older rows may hold a name that has since left the list).
  const developer = v.developer ?? current.developer;
  const community = v.community ?? current.community;
  if (!DEVELOPERS.includes(developer) && developer !== current.developer) {
    return { error: t("form.checkFields"), fieldErrors: { developer: [t("field.developer")] } };
  }
  if (!COMMUNITIES.includes(community) && community !== current.community) {
    return { error: t("form.checkFields"), fieldErrors: { community: [t("field.community")] } };
  }
  const blocker = PUBLIC_STATUSES.includes(v.status)
    ? publishBlocker({
        isSample: current.isSample,
        dldPermit: v.dldPermit || null,
        dldPermitExpiresAt: v.dldPermitExpiresAt ?? null,
        formAExpiresAt: v.formAExpiresAt ?? null,
      })
    : null;
  if (blocker) {
    const field = { "listing.permitRequired": "dldPermit", "listing.permitExpiry": "dldPermitExpiresAt", "listing.formAExpired": "formAExpiresAt" }[blocker];
    return { error: t("form.checkFields"), fieldErrors: { [field]: [t(blocker)] } };
  }
  const now = new Date();
  const [saved] = await db
    .update(listings)
    .set({
      status: v.status,
      pausedByAdmin: v.status === "paused",
      verified: v.verified,
      nocEligible: v.nocEligible,
      launchPrice: v.launchPrice ?? null,
      askingPrice: v.askingPrice,
      adminNotes: v.adminNotes ?? null,
      dldPermit: v.dldPermit || null,
      dldPermitExpiresAt: v.dldPermitExpiresAt ?? null,
      dldPermitUrl: v.dldPermitUrl || null,
      formAExpiresAt: v.formAExpiresAt ?? null,
      developer,
      community,
      // Only an "Other" keeps a typed name; mapping to a listed name clears it. Left out of the form = unchanged.
      ...(v.developer ? { developerOther: developer === "Other" ? (v.developerOther ?? null) : null } : {}),
      ...(v.community ? { communityOther: community === "Other" ? (v.communityOther ?? null) : null } : {}),
      publicPrice: PUBLIC_STATUSES.includes(v.status) ? v.askingPrice : current.publicPrice,
      images: v.images.filter((u) => /^https:\/\//.test(u) || u.startsWith("/api/files/")),
      publishedAt: current.publishedAt ?? (v.status === "live" ? now : null),
      updatedAt: now,
    })
    // …and the same if it changes between the read above and this write.
    .where(and(eq(listings.id, v.listingId), eq(listings.status, current.status)))
    .returning({ id: listings.id });
  if (!saved) return { error: t("listing.statusChanged") };

  const statusChanged = v.status !== current.status;
  // Going live for the first time is an approval, whichever control the admin used.
  if (statusChanged && v.status === "live" && !current.publishedAt) {
    await notifySeller(current, "listing.approved", { project: current.projectName, ref: refCode(current.refNo) });
  }
  if (statusChanged && v.status === "noc_in_progress") await notifyDealStep(current, "deal.noc_in_progress");
  if (statusChanged && v.status === "transferred") await notifyDealStep(current, "deal.transferred");
  // The bidders: a sold unit closes the open offers, and so does one taken off the market. A unit back on the market
  // has no deal any more: the accepted offer is closed (that buyer told) and the backups are active again.
  if (statusChanged && v.status === "transferred") await closeOpenOffers(current, "sold");
  if (statusChanged && (v.status === "withdrawn" || v.status === "rejected")) await closeOpenOffers(current, "unavailable");
  if (statusChanged && v.status === "live") await reopenUnit(current, current.status);
  // Watchers only hear about drops on deals they can open (and never on sample listings).
  if (!current.isSample && PUBLIC_STATUSES.includes(v.status)) {
    await notifyPriceDrop(current, current.publicPrice ?? current.askingPrice, v.askingPrice);
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
  // Samples don't take offers, but any open one left on them (from before that rule) is closed and its buyer told
  // before the offers go with the listings.
  const withOpenOffers = await db
    .selectDistinct({ id: listings.id, projectName: listings.projectName })
    .from(listings)
    .innerJoin(offers, eq(offers.listingId, listings.id))
    .where(and(eq(listings.isSample, true), inArray(offers.status, ["pending", "countered"])));
  for (const unit of withOpenOffers) await closeOpenOffers(unit, "unavailable");
  await db.delete(listings).where(eq(listings.isSample, true));
  refresh();
  return { ok: true };
}
