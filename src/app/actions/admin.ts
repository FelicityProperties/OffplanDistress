"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { files, inquiries, listings, offers, passwordResets, sellerLeads, sessions, users, type Source } from "@/db/schema";
import { dirOf, isLocale, LOCALES } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { ATTESTATION_VERSION, BULK_ATTESTATION, LISTING_ATTESTATION, PERMIT_ATTESTATION } from "@/lib/attestation";
import { audit, changes } from "@/lib/audit";
import { findUserByEmail, getCurrentUser, hashPassword, isOwnerEmail } from "@/lib/auth";
import { claimPath, isPlaceholderEmail, issueClaimToken, placeholderEmail } from "@/lib/claim";
import { addNote, openDeal, saveDealFile, stageGate, syncSaleValue, type DealFileState, type GateNeed } from "@/lib/deals";
import { COMMUNITIES, DEVELOPERS, LISTING_STATUS, PUBLIC_STATUSES, type ListingStatusKey } from "@/lib/config";
import { emailEnabled, sendEmail } from "@/lib/email";
import { awaitingOwnerSql, isImportOwner } from "@/lib/import";
import { IMPORT_KEY_RE } from "@/lib/import-format";
import { formatDate, formatNumber, refCode } from "@/lib/format";
import { notifyInquiryReceived } from "@/lib/inquiries";
import { isUuid } from "@/lib/utils";
import { whatsappNumber } from "@/lib/leads";
import { renderTemplate } from "@/lib/notification-templates";
import { notify, notifyPriceDrop } from "@/lib/notify";
import { cancelAcceptedOffers, closeOpenOffers, DEAL_STATUSES, reopenUnit } from "@/lib/offers";
import { dubaiToday, expiryDateBounds, isAdvertised, isDldPermitUrl, publishBlocker } from "@/lib/permits";
import { siteUrl } from "@/lib/site-url";
import { scrubTypedName } from "@/lib/typed-names";
import type { FormState } from "./auth";
import { parseListingFields } from "./listings";

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

type ListingForNotice = {
  id: string;
  sellerId: string;
  projectName: string;
  refNo: number;
  isSample: boolean;
  createdByStaff: boolean;
  ownershipConfirmedAt: Date | null;
};

const sellerHref = (id: string) => `/dashboard/listings/${id}`;

/**
 * Sample listings belong to placeholder sellers, so their "seller" never gets in-app rows or emails. Nor does the
 * account a listing our team entered is filed under, until its seller has confirmed it (awaitsSellerConfirmation): it
 * may not be the seller's, and the listing isn't on its dashboard yet. Our team reaches that seller through the claim
 * link or WhatsApp.
 */
async function notifySeller(l: ListingForNotice, key: Parameters<typeof notify>[1], params: Parameters<typeof notify>[2]) {
  if (!l.isSample && !awaitsSellerConfirmation(l)) await notify([l.sellerId], key, params, sellerHref(l.id));
}

/**
 * Seller and buyer hear about each step of the transfer. The buyer is the deal file's (linked by our team on a deal set
 * by hand, or the accepted offer's), else the accepted offer's. A buyer our team added who can't sign in yet (no
 * password) is reached by our team instead, as a seller before claiming: the deal shows on their dashboard once they can.
 */
async function notifyDealStep(l: ListingForNotice, key: "deal.noc_in_progress" | "deal.transferred") {
  const params = { project: l.projectName, ref: refCode(l.refNo) };
  const deal = await openDeal(l.id);
  const [accepted] = deal?.buyerId
    ? [{ buyerId: deal.buyerId }]
    : await db
        .select({ buyerId: offers.buyerId })
        .from(offers)
        .where(and(eq(offers.listingId, l.id), eq(offers.status, "accepted")))
        .orderBy(desc(offers.updatedAt))
        .limit(1);
  await notifySeller(l, key, params);
  if (!accepted) return;
  const [buyer] = await db
    .select({ canSignIn: sql<boolean>`${users.passwordHash} is not null` })
    .from(users)
    .where(eq(users.id, accepted.buyerId))
    .limit(1);
  if (buyer?.canSignIn) await notify([accepted.buyerId], key, params, "/dashboard/offers?tab=sent");
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
  permitAttestedAt: listings.permitAttestedAt,
  askingPrice: listings.askingPrice,
  publicPrice: listings.publicPrice,
  publishedAt: listings.publishedAt,
  createdByStaff: listings.createdByStaff,
  ownershipConfirmedAt: listings.ownershipConfirmedAt,
};

/**
 * A listing our team entered from the seller's documents stays unpublished until the seller has confirmed, through
 * their claim link, that they own the unit or may sell it (src/lib/claim.ts). Listings sellers submit themselves
 * confirm it on the sell form; samples aren't adverts.
 */
function awaitsSellerConfirmation(l: { isSample: boolean; createdByStaff: boolean; ownershipConfirmedAt: Date | null }) {
  return !l.isSample && l.createdByStaff && l.ownershipConfirmedAt == null;
}

/** Why such a listing can't be published yet: still under an import's placeholder (set the owner first), or unconfirmed. */
async function unconfirmedMessage(sellerId: string) {
  const [seller] = await db.select({ email: users.email, passwordHash: users.passwordHash }).from(users).where(eq(users.id, sellerId)).limit(1);
  return seller && isImportOwner(seller) ? (await getT("intake"))("approve.setOwnerFirst") : (await getT("errors"))("listing.ownershipUnconfirmed");
}

/** "Before “NOC in progress”, the deal file needs the date Form F … and the buyer's KYC verified." */
function gateMessage(t: T, next: ListingStatusKey, missing: GateNeed[]) {
  const items = missing.map((k) => t(`deal.need.${k}`));
  const list = items.length > 1 ? `${items.slice(0, -1).join(t("deal.need.sep"))}${t("deal.need.lastSep")}${items.at(-1)}` : items[0];
  return t(next === "transferred" ? "deal.gate.transfer" : "deal.gate.noc", { items: list });
}

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
  const me = await assertAdmin();
  const [before] = await db.select(listingNoticeColumns).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!before) return { error: (await getT("errors"))("listing.notFound") };
  // Only a listing waiting for review: a page opened before the seller withdrew it (or another admin published or
  // rejected it) mustn't advertise it again without its owner.
  if (before.status !== "pending_review") return reviewedMeanwhile();
  if (awaitsSellerConfirmation(before)) return { error: await unconfirmedMessage(before.sellerId) };
  // RERA: no property advert without a current DLD (Trakheesi) permit and Form A. Sample listings aren't adverts.
  const blocker = publishBlocker(before);
  if (blocker) return { error: (await getT("errors"))(blocker) };
  const now = new Date();
  const verified = before.verified || (await hasVerificationDocs(listingId));
  const [approved] = await db
    .update(listings)
    .set({
      status: "live",
      verified,
      publicPrice: before.askingPrice,
      publishedAt: before.publishedAt ?? now,
      rejectionReason: null,
      updatedAt: now,
    })
    // …and the same if it changes between the read above and this write.
    .where(and(eq(listings.id, listingId), eq(listings.status, "pending_review")))
    .returning({ id: listings.id });
  if (!approved) return reviewedMeanwhile();
  await audit({
    actorId: me.id,
    action: "listing.approve",
    entityType: "listing",
    entityId: listingId,
    diff: changes(before, { status: "live", verified, publicPrice: before.askingPrice }),
  });
  await notifySeller(before, "listing.approved", { project: before.projectName, ref: refCode(before.refNo) });
  // Back on the market: no deal agreed earlier stays accepted on it (see reopenUnit).
  await reopenUnit(before, before.status);
  // A seller's price cut waits for re-approval; watchers hear about it once it is public again.
  if (!before.isSample && before.publicPrice != null) await notifyPriceDrop(before, before.publicPrice, before.askingPrice);
  refresh();
  return { ok: true };
}

/** The review buttons' listing isn't waiting for review any more: the page is refreshed to show what it is now. */
async function reviewedMeanwhile() {
  refresh();
  return { error: (await getT("errors"))("listing.statusChanged") };
}

export async function rejectListing(listingId: string, reason: string) {
  const me = await assertAdmin();
  const [before] = await db
    .select({ ...listingNoticeColumns, rejectionReason: listings.rejectionReason })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!before) return { error: (await getT("errors"))("listing.notFound") };
  // Like Approve: only while it waits for review (a stale page mustn't reject a listing published since, ending its
  // offers). A listing already out there is taken down from the listing editor.
  if (before.status !== "pending_review") return reviewedMeanwhile();
  const clean = reason.trim().slice(0, 1000);
  const [rejected] = await db
    .update(listings)
    .set({ status: "rejected", rejectionReason: clean || null, updatedAt: new Date() })
    .where(and(eq(listings.id, listingId), eq(listings.status, "pending_review")))
    .returning({ id: listings.id });
  if (!rejected) return reviewedMeanwhile();
  await audit({
    actorId: me.id,
    action: "listing.reject",
    entityType: "listing",
    entityId: listingId,
    // The reason as it was before (a listing rejected again keeps its earlier one until now).
    diff: changes(before, { status: "rejected", rejectionReason: clean || null }),
  });
  await notifySeller(before, "listing.rejected", {
    project: before.projectName,
    reason: clean || { t: "errors", key: "notify.rejectedFallback" },
  });
  // Off the market: buyers with an open offer on it are told it is no longer available, and a deal agreed on it ends
  // (as in the listing editor below).
  await closeOpenOffers(before, "unavailable");
  await cancelAcceptedOffers(before, "rejected", "withdrawn_by_team");
  refresh();
  return { ok: true };
}

const statuses = Object.keys(LISTING_STATUS) as [ListingStatusKey, ...ListingStatusKey[]];

/** The largest whole number a Postgres integer column holds. */
const INT4_MAX = 2_147_483_647;

/**
 * A permit or Form A expiry: a real calendar date (z.iso.date checks the day exists in that month) no more than a year
 * back or three years ahead (expiryDateBounds), so a typo in the year is a field error rather than a database error.
 * The date already stored on the listing (`stored`) is accepted as it is, however old.
 */
type ExpiryRange = { min: string; max: string; stored?: string | null };

const expiryDate = (t: T, range: ExpiryRange, rangeMessage: string) =>
  z.iso
    .date(t("field.date"))
    .refine((d) => d === range.stored || (d >= range.min && d <= range.max), rangeMessage)
    .optional();

const adminEditSchema = (t: T, range: ExpiryRange, rangeMessage: string, stored: { dld: string | null; formA: string | null }) =>
  z.object({
    listingId: z.uuid(),
    status: z.enum(statuses),
    verified: z.boolean(),
    nocEligible: z.boolean(),
    // The account owner's attestation that Felicity holds the permit, in place of its number (src/lib/attestation.ts).
    permitAttested: z.boolean(),
    // int4 columns, like the penalty below: a typo with extra zeros is a field error, not a failed save.
    launchPrice: z.coerce.number().int(t("field.wholeDirhams")).nonnegative().max(INT4_MAX, t("field.amountTooLarge")).optional(),
    askingPrice: z.coerce.number().int(t("field.wholeDirhams")).nonnegative().max(INT4_MAX, t("field.amountTooLarge")),
    // Paid to the developer to date, corrected from its statement of account (at most the SPA price, checked below).
    // Empty or left out = unchanged.
    amountPaid: z.coerce.number().int(t("field.wholeDirhams")).nonnegative().optional(),
    // Arrears from the developer's statement of account; both empty = not known. See arrearsUpdate below.
    overdueAmount: z.coerce.number().int(t("field.wholeDirhams")).nonnegative().optional(),
    // An int4 column: a typo with extra zeros is a field error, not a failed save. (The overdue amount is capped by
    // the remaining balance below.)
    overduePenalty: z.coerce.number().int(t("field.wholeDirhams")).nonnegative().max(INT4_MAX, t("field.amountTooLarge")).optional(),
    arrearsCheckedAt: z.iso
      .date(t("field.date"))
      .refine((d) => d >= "2000-01-01" && d <= dubaiToday(), t("field.arrearsCheckedAt"))
      .optional(),
    adminNotes: z.string().trim().max(4000).optional(),
    dldPermit: z.string().trim().max(40).optional(),
    dldPermitExpiresAt: expiryDate(t, { ...range, stored: stored.dld }, rangeMessage),
    // Stored as the parsed link, so the QR code encodes exactly what the check passed and a browser opens (the raw
    // text may hold a "\" or a tab that other URL parsers, such as a phone's QR scanner, read differently).
    dldPermitUrl: z
      .string()
      .trim()
      .max(500)
      .refine(isDldPermitUrl, t("field.dldPermitUrl"))
      .transform((u) => new URL(u).href)
      .optional(),
    formAExpiresAt: expiryDate(t, { ...range, stored: stored.formA }, rangeMessage),
    images: z.array(z.string().max(500)).max(20),
    // Mapping a seller's "Other" to a listed name (or correcting it). Left out = unchanged.
    developer: z.string().max(80).optional(),
    community: z.string().max(80).optional(),
    // Shown publicly: links, emails and phone numbers are taken out here too (a seller's name saved back as it was).
    developerOther: z.string().trim().max(80).transform(scrubbedName).optional(),
    communityOther: z.string().trim().max(80).transform(scrubbedName).optional(),
  });

const scrubbedName = (v: string) => scrubTypedName(v).name || undefined;

/**
 * The unit's sale went through at DLD: it is transferred, or was taken down (withdrawn) after that with its completed
 * deal file still open (a withdrawal from any earlier stage closes the file).
 */
async function transferCompleted(l: { id: string; status: ListingStatusKey }) {
  if (l.status === "transferred") return true;
  if (l.status !== "withdrawn") return false;
  return (await openDeal(l.id))?.transferredAt != null;
}

export async function adminUpdateListing(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await assertAdmin();
  const [t, locale] = await Promise.all([getT("errors"), getLocale()]);
  const range = expiryDateBounds();
  const rangeMessage = t("field.expiryRange", { from: formatDate(range.min, locale), to: formatDate(range.max, locale) });
  // A date already on the listing may be saved back unchanged even once it is more than a year old: the range catches
  // typing mistakes, and mustn't make an old listing uneditable (or force its history to be wiped) a year on.
  const id = z.uuid().safeParse(formData.get("listingId"));
  const [stored = { dld: null, formA: null }] = id.success
    ? await db
        .select({ dld: listings.dldPermitExpiresAt, formA: listings.formAExpiresAt })
        .from(listings)
        .where(eq(listings.id, id.data))
        .limit(1)
    : [];
  const parsed = adminEditSchema(t, range, rangeMessage, stored).safeParse(
    {
      listingId: formData.get("listingId"),
      status: formData.get("status"),
      verified: formData.get("verified") === "on",
      nocEligible: formData.get("nocEligible") === "on",
      permitAttested: formData.get("permitAttested") === "on",
      launchPrice: formData.get("launchPrice") || undefined,
      askingPrice: formData.get("askingPrice"),
      amountPaid: formData.get("amountPaid") || undefined,
      overdueAmount: formData.get("overdueAmount") || undefined,
      overduePenalty: formData.get("overduePenalty") || undefined,
      arrearsCheckedAt: formData.get("arrearsCheckedAt") || undefined,
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
    .select({
      ...listingNoticeColumns,
      developer: listings.developer,
      community: listings.community,
      originalPrice: listings.originalPrice,
      amountPaid: listings.amountPaid,
      overdueAmount: listings.overdueAmount,
      overduePenalty: listings.overduePenalty,
      arrearsCheckedAt: listings.arrearsCheckedAt,
      // For the audit trail's diff of what this save changed.
      rejectionReason: listings.rejectionReason,
      pausedByAdmin: listings.pausedByAdmin,
      nocEligible: listings.nocEligible,
      launchPrice: listings.launchPrice,
      adminNotes: listings.adminNotes,
      dldPermitUrl: listings.dldPermitUrl,
      developerOther: listings.developerOther,
      communityOther: listings.communityOther,
      images: listings.images,
    })
    .from(listings)
    .where(eq(listings.id, v.listingId))
    .limit(1);
  if (!current) return { error: t("listing.notFound") };
  // The amount paid as corrected here (the seller paid an instalment since listing, say), or as it was.
  const amountPaid = v.amountPaid ?? current.amountPaid;
  if (amountPaid > current.originalPrice) {
    return { error: t("form.checkFields"), fieldErrors: { amountPaid: [t("field.amountPaidMax")] } };
  }
  // Overdue instalments are part of the balance still owed to the developer, so they can't be more than it.
  const remainingBalance = Math.max(current.originalPrice - amountPaid, 0);
  // The sale value (asking price + that balance) is worked out in integers too (deal file, fees, the market figures).
  if (v.askingPrice + remainingBalance > INT4_MAX) {
    return { error: t("form.checkFields"), fieldErrors: { askingPrice: [t("field.amountTooLarge")] } };
  }
  if (v.overdueAmount != null && v.overdueAmount > remainingBalance) {
    return {
      error: t("form.checkFields"),
      fieldErrors: { overdueAmount: [t("field.overdueMax", { amount: formatNumber(remainingBalance) })] },
    };
  }
  // Arrears, only when the form has the fields (another form posting here leaves them as they are). Both amounts empty
  // = not known, and the check date goes with them. Otherwise the check date is the one the admin typed, or today when
  // the amounts changed, and stays as it was when nothing changed: saving the form for something else never marks a
  // seller's own figure as checked.
  let arrearsUpdate: { overdueAmount: number | null; overduePenalty: number | null; arrearsCheckedAt: string | null } | null = null;
  if (formData.has("overdueAmount") || formData.has("overduePenalty")) {
    const overdueAmount = v.overdueAmount ?? null;
    const overduePenalty = v.overduePenalty ?? null;
    const known = overdueAmount != null || overduePenalty != null;
    const changed = overdueAmount !== current.overdueAmount || overduePenalty !== current.overduePenalty;
    const typed = v.arrearsCheckedAt && v.arrearsCheckedAt !== current.arrearsCheckedAt ? v.arrearsCheckedAt : null;
    arrearsUpdate = {
      overdueAmount,
      overduePenalty,
      arrearsCheckedAt: !known ? null : (typed ?? (changed ? dubaiToday() : current.arrearsCheckedAt)),
    };
  }
  // An editor opened before the status changed (say the seller accepted an offer since) would put the old status
  // back: the unit would go live again with an accepted offer, and its backup bidders be told the deal fell through.
  const statusWas = formData.get("statusWas");
  if (typeof statusWas === "string" && statusWas !== current.status) return { error: t("listing.statusChanged") };
  // A unit transferred at DLD is sold: its deal completed, the buyer owns it and our fee is earned. It may be taken down
  // (withdrawn, its deal file kept) and shown as transferred again, never put back on the market or into an earlier
  // stage, which would close the completed deal as fallen through and tell the buyer so.
  if (v.status !== current.status && v.status !== "transferred" && v.status !== "withdrawn" && (await transferCompleted(current))) {
    const message = (await getT("admin"))("edit.transferredFinal");
    return { error: message, fieldErrors: { status: [message] } };
  }
  // A listed name, or the one already stored (older rows may hold a name that has since left the list).
  const developer = v.developer ?? current.developer;
  const community = v.community ?? current.community;
  if (!DEVELOPERS.includes(developer) && developer !== current.developer) {
    return { error: t("form.checkFields"), fieldErrors: { developer: [t("field.developer")] } };
  }
  if (!COMMUNITIES.includes(community) && community !== current.community) {
    return { error: t("form.checkFields"), fieldErrors: { community: [t("field.community")] } };
  }
  // The attestation as saved: ticked and no number entered, it stands (recorded now if new); a number entered replaces
  // it (the number is then the record, with the expiry rules below), and unticking withdraws it. Never on a sample:
  // it isn't an advert, so there is no permit to hold (the editor hides the box).
  const attested = !current.isSample && !v.dldPermit && v.permitAttested;
  const saving = {
    status: v.status,
    isSample: current.isSample,
    dldPermit: v.dldPermit || null,
    dldPermitExpiresAt: v.dldPermitExpiresAt ?? null,
    formAExpiresAt: v.formAExpiresAt ?? null,
    permitAttestedAt: attested ? (current.permitAttestedAt ?? new Date()) : null,
  };
  // A unit with an agreed deal may stay in (or move between) under offer and NOC in progress once its permit or Form A
  // has run out: the daily job leaves it so for our team to renew or decide (src/lib/permits.ts), and no public page
  // shows it as an advert until a current date is entered. It still needs its permit number and expiry date.
  const isDeal = (s: ListingStatusKey) => (DEAL_STATUSES as readonly string[]).includes(s);
  const dealGoesOn = isDeal(current.status) && isDeal(v.status) && saving.dldPermit != null && saving.dldPermitExpiresAt != null;
  const blocker = PUBLIC_STATUSES.includes(v.status) && !dealGoesOn ? publishBlocker(saving) : null;
  // Whether the public sees the listing as an advert once saved (a deal whose permit ran out isn't one).
  const advertised = isAdvertised(saving);
  if (blocker) {
    const field = { "listing.permitRequired": "dldPermit", "listing.permitExpiry": "dldPermitExpiresAt", "listing.formAExpired": "formAExpiresAt" }[blocker];
    return { error: t("form.checkFields"), fieldErrors: { [field]: [t(blocker)] } };
  }
  // Publishing from the editor is an approval too: not before the seller has confirmed a listing our team entered.
  if (PUBLIC_STATUSES.includes(v.status) && awaitsSellerConfirmation(current)) {
    const message = await unconfirmedMessage(current.sellerId);
    return { error: message, fieldErrors: { status: [message] } };
  }
  // Stage gates (src/lib/deals.ts): moving on to the NOC or the transfer needs the deal file to have what that step
  // needs. Only a change of status made now is checked, so a deal already in a stage can still be saved as it is.
  if (v.status !== current.status) {
    const gate = await stageGate(current, v.status);
    if (!gate.ok) {
      const message = gate.noDeal ? t("deal.gate.noDeal") : gateMessage(t, v.status, gate.missing);
      return { error: message, fieldErrors: { status: [message] } };
    }
  }
  const now = new Date();
  const values = {
    status: v.status,
    pausedByAdmin: v.status === "paused",
    verified: v.verified,
    nocEligible: v.nocEligible,
    launchPrice: v.launchPrice ?? null,
    askingPrice: v.askingPrice,
    amountPaid,
    ...(arrearsUpdate ?? {}),
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
    publicPrice: advertised ? v.askingPrice : current.publicPrice,
    images: v.images.filter((u) => /^https:\/\//.test(u) || u.startsWith("/api/files/")),
    publishedAt: current.publishedAt ?? (v.status === "live" ? now : null),
    // Rejected here, with no reason typed: not the reason of an earlier rejection (the seller's page shows it).
    ...(v.status === "rejected" && current.status !== "rejected" ? { rejectionReason: null } : {}),
  };
  // A new attestation is recorded with this admin as its author; one withdrawn (unticked, or replaced by the number)
  // is cleared with its author, as part of this save's diff.
  const attestNow = attested && !current.permitAttestedAt;
  const unattest = !attested && current.permitAttestedAt != null;
  const attestation = attestNow ? { permitAttestedAt: now, permitAttestedBy: me.id } : unattest ? { permitAttestedAt: null, permitAttestedBy: null } : {};
  const [saved] = await db
    .update(listings)
    .set({ ...values, ...attestation, updatedAt: now })
    // …and the same if it changes between the read above and this write.
    .where(and(eq(listings.id, v.listingId), eq(listings.status, current.status)))
    .returning({ id: listings.id });
  if (!saved) return { error: t("listing.statusChanged") };
  const diff = changes(current, { ...values, ...(unattest ? { permitAttestedAt: null } : {}) });
  if (Object.keys(diff).length) await audit({ actorId: me.id, action: "listing.update", entityType: "listing", entityId: v.listingId, diff });
  // The statement itself, with its exact text and version, is its own event (src/lib/attestation.ts).
  if (attestNow) {
    await audit({
      actorId: me.id,
      action: "listing.permit_attested",
      entityType: "listing",
      entityId: v.listingId,
      diff: { via: "owner_attestation", statement: PERMIT_ATTESTATION, version: ATTESTATION_VERSION },
    });
  }
  // The balance owed to the developer changed, so the open deal's sale value (and our fee on it) follows.
  if (amountPaid !== current.amountPaid) await syncSaleValue(me.id, v.listingId);

  const statusChanged = v.status !== current.status;
  // Going live for the first time is an approval, whichever control the admin used.
  if (statusChanged && v.status === "live" && !current.publishedAt) {
    await notifySeller(current, "listing.approved", { project: current.projectName, ref: refCode(current.refNo) });
  }
  // Rejected from the editor (a listing already out there, say): the seller is told, as from the Reject button.
  if (statusChanged && v.status === "rejected") {
    await notifySeller(current, "listing.rejected", { project: current.projectName, reason: { t: "errors", key: "notify.rejectedFallback" } });
  }
  if (statusChanged && v.status === "noc_in_progress") await notifyDealStep(current, "deal.noc_in_progress");
  // (Not again for a sold unit shown as transferred once more after being taken down.)
  if (statusChanged && v.status === "transferred" && current.status !== "withdrawn") await notifyDealStep(current, "deal.transferred");
  // The bidders: a sold unit closes the open offers, and so does one taken off the market. A unit back on the market
  // has no deal any more: the accepted offer is closed (that buyer told) and the backups are active again. So has one
  // our team takes off the market while in a deal (as when the seller withdraws): its file is closed with the reason
  // and the accepted offer declined. Never a transferred unit's: that deal completed.
  if (statusChanged && v.status === "transferred") await closeOpenOffers(current, "sold");
  if (statusChanged && (v.status === "withdrawn" || v.status === "rejected")) {
    await closeOpenOffers(current, "unavailable");
    if (current.status !== "transferred") await cancelAcceptedOffers(current, v.status, "withdrawn_by_team");
  }
  if (statusChanged && v.status === "live") await reopenUnit(current, current.status);
  // Watchers only hear about drops on deals they can open (and never on sample listings): not while the permit or
  // Form A of a unit in a deal has run out, and the drop is announced from the last public price once it is renewed.
  if (!current.isSample && advertised) {
    await notifyPriceDrop(current, current.publicPrice ?? current.askingPrice, v.askingPrice);
  }

  refresh();
  return { ok: true };
}

export async function setKycStatus(userId: string, status: "not_started" | "pending" | "verified") {
  const me = await assertAdmin();
  const [before] = await db.select({ kycStatus: users.kycStatus }).from(users).where(eq(users.id, userId)).limit(1);
  // Who verified the person, and when (the deal file shows it; the NOC stage needs both parties verified).
  const verifiedNow = status === "verified" && before?.kycStatus !== "verified";
  await db
    .update(users)
    .set({
      kycStatus: status,
      ...(verifiedNow ? { kycVerifiedBy: me.id, kycVerifiedAt: new Date() } : status !== "verified" ? { kycVerifiedBy: null, kycVerifiedAt: null } : {}),
    })
    .where(eq(users.id, userId));
  if (before && before.kycStatus !== status) {
    await audit({ actorId: me.id, action: "user.kyc", entityType: "user", entityId: userId, diff: { kycStatus: [before.kycStatus, status] } });
  }
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
  const [target] = await db.select({ email: users.email, role: users.role }).from(users).where(eq(users.id, userId));
  if (target && isOwnerEmail(target.email) && role !== "admin") return { error: t("admin.ownerAlwaysAdmin") };
  await db.update(users).set({ role }).where(eq(users.id, userId));
  if (target && target.role !== role) {
    await audit({ actorId: me.id, action: "user.role", entityType: "user", entityId: userId, diff: { role: [target.role, role] } });
  }
  refresh();
  return { ok: true };
}

/** Admins can hand a temporary password to a user directly (e.g. when email isn't set up). */
export async function resetUserPassword(userId: string) {
  const me = await assertAdmin();
  const t = await getT("errors");
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!target) return { error: t("admin.userNotFound") };
  if (isOwnerEmail(target.email)) return { error: t("admin.ownerPassword") };
  const temp = randomBytes(9).toString("base64url");
  await db.update(users).set({ passwordHash: await hashPassword(temp) }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  // That it happened, never the password.
  await audit({ actorId: me.id, action: "user.password_reset", entityType: "user", entityId: userId });
  return { ok: true, password: temp };
}

export async function setInquiryHandled(id: string, handled: boolean) {
  const me = await assertAdmin();
  const [before] = await db.select({ handled: inquiries.handled }).from(inquiries).where(eq(inquiries.id, id)).limit(1);
  await db.update(inquiries).set({ handled }).where(eq(inquiries.id, id));
  if (before && before.handled !== handled) {
    await audit({ actorId: me.id, action: "inquiry.handled", entityType: "inquiry", entityId: id, diff: { handled: [before.handled, handled] } });
  }
  refresh();
  return { ok: true };
}

/**
 * "Spam" on an inbox row, "Not spam" on the Spam tab of /admin/inquiries. A message the content score caught
 * (src/lib/spam.ts) notified nobody; moved back to the inbox, the team gets the "inquiry.received" notice it skipped.
 */
export async function setInquirySpam(id: string, spam: boolean) {
  const me = await assertAdmin();
  if (!isUuid(id)) return { error: (await getT("errors"))("field.invalid") };
  const [q] = await db
    .select({ inquiry: inquiries, projectName: listings.projectName, refNo: listings.refNo })
    .from(inquiries)
    .leftJoin(listings, eq(listings.id, inquiries.listingId))
    .where(eq(inquiries.id, id))
    .limit(1);
  if (!q) return { error: (await getT("errors"))("field.invalid") };
  if (q.inquiry.spam !== spam) {
    // A row marked by hand keeps the score's reason if it had one; the reason only shows on the Spam tab.
    const spamReason = spam ? (q.inquiry.spamReason ?? "marked by the team") : q.inquiry.spamReason;
    await db.update(inquiries).set({ spam, spamReason }).where(eq(inquiries.id, id));
    await audit({
      actorId: me.id,
      action: spam ? "inquiry.spam" : "inquiry.not_spam",
      entityType: "inquiry",
      entityId: id,
      diff: { spam: [q.inquiry.spam, spam] },
    });
    if (!spam) {
      const listing = q.refNo != null && q.projectName ? { projectName: q.projectName, refNo: q.refNo } : null;
      await notifyInquiryReceived({ ...q.inquiry, listing });
    }
  }
  refresh();
  return { ok: true };
}

export async function deleteSampleListings() {
  const me = await assertAdmin();
  // Samples don't take offers, but any open one left on them (from before that rule) is closed and its buyer told
  // before the offers go with the listings.
  const withOpenOffers = await db
    .selectDistinct({ id: listings.id, projectName: listings.projectName })
    .from(listings)
    .innerJoin(offers, eq(offers.listingId, listings.id))
    .where(and(eq(listings.isSample, true), inArray(offers.status, ["pending", "countered"])));
  for (const unit of withOpenOffers) await closeOpenOffers(unit, "unavailable");
  const deleted = await db.delete(listings).where(eq(listings.isSample, true)).returning({ id: listings.id });
  await audit({ actorId: me.id, action: "samples.delete", entityType: "listing", entityId: "samples", diff: { deleted: deleted.length } });
  refresh();
  return { ok: true };
}

// ---- Staff-assisted intake: a listing entered by our team from the documents a seller sent (src/lib/claim.ts) ----

/**
 * What the staff forms' person checks say, worded for the form: the intake form's seller, or the Owner card's owner
 * (an imported unit's owner may not be the one selling it to the buyer, and staff are entering someone else's name).
 */
type PersonMessages = { name: string; contact: string; phone: string; isStaff: string; phoneShared: string; phoneHasAccount: string };

function sellerMessages(t: T): PersonMessages {
  return {
    name: t("field.fullName"),
    contact: t("admin.sellerContact"),
    phone: t("admin.sellerPhone"),
    isStaff: t("admin.sellerIsStaff"),
    phoneShared: t("admin.phoneShared"),
    phoneHasAccount: t("admin.phoneHasAccount"),
  };
}

async function ownerMessages(): Promise<PersonMessages> {
  const ti = await getT("intake");
  return {
    name: ti("owner.error.name"),
    contact: ti("owner.error.contact"),
    phone: ti("owner.error.phone"),
    isStaff: ti("owner.error.isStaff"),
    phoneShared: ti("owner.error.phoneShared"),
    phoneHasAccount: ti("owner.error.phoneHasAccount"),
  };
}

const staffSellerSchema = (t: T, m: PersonMessages = sellerMessages(t)) =>
  z.object({
    sellerName: z.string().trim().min(2, m.name).max(120),
    sellerEmail: z.string().trim().max(200).pipe(z.email(t("field.email"))).optional(),
    sellerPhone: z.string().trim().max(30).optional(),
    sellerLocale: z.enum(LOCALES).catch("en"),
    leadId: z.uuid().optional(),
  });

export type StaffListingState = FormState & { listingId?: string };

type StaffSeller = z.output<ReturnType<typeof staffSellerSchema>>;
type FieldErrors = Record<string, string[] | undefined>;

/**
 * The seller fields of a staff form (adminCreateListing, adminSetListingOwner): who the seller is, and a way to reach
 * them for the claim link — a mobile number, an email, or both.
 */
function readStaffSeller(formData: FormData, t: T, m: PersonMessages = sellerMessages(t)) {
  const opt = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v : undefined;
  };
  const seller = staffSellerSchema(t, m).safeParse(
    {
      sellerName: formData.get("sellerName") ?? "",
      sellerEmail: opt("sellerEmail"),
      sellerPhone: opt("sellerPhone"),
      sellerLocale: formData.get("sellerLocale"),
      leadId: opt("leadId"),
    },
    { error: fallbackErrors(t) },
  );
  const fieldErrors: FieldErrors = seller.success ? {} : z.flattenError(seller.error).fieldErrors;
  const typedPhone = opt("sellerPhone")?.trim();
  const phoneDigits = typedPhone ? whatsappNumber(typedPhone) : null;
  if (!fieldErrors.sellerPhone) {
    if (!typedPhone && !opt("sellerEmail")) fieldErrors.sellerPhone = [m.contact];
    else if (typedPhone && !phoneDigits) fieldErrors.sellerPhone = [m.phone];
  }
  return { seller: seller.success ? seller.data : null, fieldErrors, phoneDigits };
}

/**
 * The seller's account for a staff-created listing. With an email: the account with that email, if any. Without one:
 * the only account whose mobile number is this one (several → staff must give the email). Staff accounts never sell.
 */
async function staffListingSeller(email: string | undefined, phoneDigits: string | null) {
  if (email) {
    const user = await findUserByEmail(email);
    if (user) return { user: { id: user.id, role: user.role, email: user.email, phone: user.phone } };
    return { user: null };
  }
  if (!phoneDigits) return { user: null };
  // Phones are stored as typed; the last 9 digits narrow it down, then the full number is compared normalised.
  const rows = await db
    .select({
      id: users.id,
      role: users.role,
      email: users.email,
      phone: users.phone,
      hasPassword: sql<boolean>`${users.passwordHash} is not null`,
    })
    .from(users)
    .where(sql`regexp_replace(${users.phone}, '[^0-9]', '', 'g') like ${`%${phoneDigits.slice(-9)}`}`)
    .limit(50);
  const matches = rows.filter((u) => u.phone && whatsappNumber(u.phone) === phoneDigits);
  // A staff account is refused by the caller, with its own message.
  const staff = matches.find((u) => u.role === "admin" || isOwnerEmail(u.email));
  if (staff) return { user: staff };
  if (matches.length > 1) return { error: "admin.phoneShared" as const };
  // Nobody verifies the mobile number on an account, so one that someone registered (it has a password) is only used
  // when staff give the email it logs in with: a typo or a recycled number mustn't hand a seller's listing and
  // documents to a stranger's account. Accounts our team added (no password) are matched by number.
  if (matches[0]?.hasPassword) return { error: "admin.phoneHasAccount" as const };
  return { user: matches[0] ?? null };
}

/**
 * The account a staff-created listing is filed under: the seller's (staffListingSeller), or a new one without a
 * password. Staff accounts and our own placeholder addresses are refused, as field errors. `created` when none matched.
 */
async function staffSellerAccount(
  t: T,
  s: StaffSeller,
  phoneDigits: string | null,
  source: Source | null,
  m: PersonMessages = sellerMessages(t),
): Promise<{ id: string; created: boolean } | { error: string; fieldErrors?: FieldErrors }> {
  if (s.sellerEmail && isOwnerEmail(s.sellerEmail)) {
    return { error: t("form.checkFields"), fieldErrors: { sellerEmail: [m.isStaff] } };
  }
  // .invalid addresses are our own placeholders (phone-only sellers, imports' placeholder owners, the sample listings'
  // seller), never a seller's.
  if (s.sellerEmail && isPlaceholderEmail(s.sellerEmail)) {
    return { error: t("form.checkFields"), fieldErrors: { sellerEmail: [t("field.email")] } };
  }
  const found = await staffListingSeller(s.sellerEmail, phoneDigits);
  if (found.error) {
    return { error: t("form.checkFields"), fieldErrors: { sellerPhone: [found.error === "admin.phoneShared" ? m.phoneShared : m.phoneHasAccount] } };
  }
  if (found.user && (found.user.role === "admin" || isOwnerEmail(found.user.email))) {
    return { error: t("form.checkFields"), fieldErrors: { [s.sellerEmail ? "sellerEmail" : "sellerPhone"]: [m.isStaff] } };
  }
  if (found.user) {
    if (!found.user.phone && s.sellerPhone) {
      await db.update(users).set({ phone: s.sellerPhone }).where(eq(users.id, found.user.id));
    }
    return { id: found.user.id, created: false };
  }
  // No password: the seller sets one (and their email, if we only have a phone number) with the claim link.
  const email = s.sellerEmail?.toLowerCase() ?? placeholderEmail(phoneDigits!);
  const [created] = await db
    .insert(users)
    .values({
      email,
      fullName: s.sellerName,
      phone: s.sellerPhone ?? null,
      passwordHash: null,
      intent: "sell",
      locale: s.sellerLocale,
      source,
    })
    .onConflictDoNothing()
    .returning({ id: users.id });
  // Created at the same moment by someone else (a sign-up with this email): use that account.
  const id = created?.id ?? (await findUserByEmail(email))?.id;
  if (!id) return { error: t("form.fixDetails") };
  return { id, created: Boolean(created) };
}

export async function adminCreateListing(_prev: StaffListingState, formData: FormData): Promise<StaffListingState> {
  const me = await assertAdmin();
  const t = await getT("errors");
  const { seller, fieldErrors: sellerErrors, phoneDigits } = readStaffSeller(formData, t);
  const fields = await parseListingFields(formData);
  const fieldErrors: FieldErrors = { ...(fields.ok ? {} : fields.fieldErrors), ...sellerErrors };
  if (!fields.ok && !("fieldErrors" in fields)) return { error: fields.error };
  if (!seller || !fields.ok || Object.keys(fieldErrors).length) return { error: t("form.checkFields"), fieldErrors };
  const s = seller;
  const v = fields.data;

  const lead = s.leadId
    ? (await db.select({ id: sellerLeads.id, source: sellerLeads.source }).from(sellerLeads).where(eq(sellerLeads.id, s.leadId)).limit(1))[0]
    : undefined;
  if (s.leadId && !lead) return { error: t("admin.leadNotFound") };

  const account = await staffSellerAccount(t, s, phoneDigits, lead?.source ?? null);
  if ("error" in account) return account;
  const sellerId = account.id;

  // The account is made just before the listing (no transactions over Neon's HTTP driver): if the listing can't be
  // stored, the account made for it goes too, rather than being left behind with no listing, in neither Users tab.
  const insertListing = () => db
    .insert(listings)
    .values({
      sellerId,
      projectName: v.projectName,
      developer: v.developer,
      community: v.community,
      developerOther: v.developer === "Other" ? (v.developerOther ?? null) : null,
      communityOther: v.community === "Other" ? (v.communityOther ?? null) : null,
      unitType: v.unitType,
      sizeSqft: v.sizeSqft,
      floor: v.floor ?? null,
      view: v.view ?? null,
      originalPrice: v.originalPrice,
      amountPaid: v.amountPaid,
      askingPrice: v.askingPrice,
      handoverDate: v.handoverDate,
      nextInstalmentDate: v.nextInstalmentDate,
      nextInstalmentAmount: v.nextInstalmentAmount ?? null,
      motivation: v.motivation,
      description: v.description ?? null,
      paymentPlan: v.paymentPlan,
      source: lead?.source ?? null,
      createdByStaff: true,
      ownershipConfirmedAt: null,
      leadId: lead?.id ?? null,
    })
    .returning({ id: listings.id, refNo: listings.refNo });
  let row: Awaited<ReturnType<typeof insertListing>>[number];
  try {
    [row] = await insertListing();
  } catch (err) {
    console.error("[admin] staff listing insert failed", err);
    if (account.created) {
      await db
        .delete(users)
        .where(and(eq(users.id, sellerId), isNull(users.passwordHash), sql`not exists (select 1 from ${listings} l where l.seller_id = ${sellerId}::uuid)`))
        .catch(() => {});
    }
    return { error: t("form.fixDetails") };
  }

  // From a seller lead: the lead becomes this listing's (unless it already has one) and this seller's.
  if (lead) {
    await db
      .update(sellerLeads)
      .set({
        listingId: row.id,
        userId: sql`coalesce(${sellerLeads.userId}, ${sellerId}::uuid)`,
        status: "converted",
        updatedAt: new Date(),
      })
      .where(and(eq(sellerLeads.id, lead.id), sql`${sellerLeads.listingId} is null`));
  }
  await audit({
    actorId: me.id,
    action: "listing.create",
    entityType: "listing",
    entityId: row.id,
    diff: {
      status: [null, "pending_review"],
      projectName: [null, v.projectName],
      originalPrice: [null, v.originalPrice],
      amountPaid: [null, v.amountPaid],
      askingPrice: [null, v.askingPrice],
      newSellerAccount: [null, account.created],
      ...(lead ? { leadRef: [null, lead.id] } : {}),
    },
  });
  refresh();
  return { ok: true, listingId: row.id };
}

/**
 * A claim link for a staff-created listing: emailed to the seller (via "email"), or returned for the admin to send on
 * WhatsApp (via "copy"), with a wa.me link to the seller's number carrying the same words as the email. Each new link
 * replaces the previous one. The raw token is in the link only: it is never stored, logged or kept in this response
 * beyond the admin's screen.
 */
export async function claimLink(listingId: string, via: "email" | "copy") {
  const me = await assertAdmin();
  const t = await getT("errors");
  if (!z.uuid().safeParse(listingId).success) return { error: t("listing.notFound") };
  const [l] = await db
    .select({
      id: listings.id,
      sellerId: listings.sellerId,
      refNo: listings.refNo,
      projectName: listings.projectName,
      isSample: listings.isSample,
      createdByStaff: listings.createdByStaff,
      ownershipConfirmedAt: listings.ownershipConfirmedAt,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      locale: users.locale,
      role: users.role,
      passwordHash: users.passwordHash,
    })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!l) return { error: t("listing.notFound") };
  if (!awaitsSellerConfirmation(l)) return { error: t("admin.claim.notNeeded") };
  if (l.role === "admin" || isOwnerEmail(l.email)) return { error: t("admin.sellerIsStaff") };
  // Imported and still filed under the network's placeholder owner: nobody to send it to yet.
  if (isImportOwner(l)) return { error: (await getT("intake"))("claim.setOwnerFirst") };
  if (via === "email" && isPlaceholderEmail(l.email)) return { error: t("admin.claim.noEmail") };
  if (via === "email" && !emailEnabled()) return { error: t("admin.claim.emailOff") };

  const locale = isLocale(l.locale) ? l.locale : "en";
  const msg = renderTemplate("listing.claim", locale, { name: l.fullName, project: l.projectName, ref: refCode(l.refNo) });
  const token = await issueClaimToken(l.sellerId, l.id);
  // How it was sent, never the link or its token.
  await audit({ actorId: me.id, action: "listing.claim_link", entityType: "listing", entityId: l.id, diff: { via } });
  if (via === "email") {
    const { sent } = await sendEmail({
      to: l.email,
      subject: msg.title,
      heading: msg.title,
      body: msg.body,
      cta: { label: msg.cta, href: claimPath(token, locale) },
      locale,
      dir: dirOf(locale),
    });
    return sent ? { ok: true as const, emailed: true } : { error: t("admin.claim.emailFailed") };
  }
  // In the seller's language, like the message: /ar/reset-password… for an Arabic seller.
  const url = `${siteUrl()}${claimPath(token, locale)}`;
  const wa = l.phone ? whatsappNumber(l.phone) : null;
  const text = `${msg.title}\n\n${msg.body}\n\n${url}`;
  return { ok: true as const, url, whatsapp: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : null };
}

/** Unused claim links of a listing: they went to the account it was filed under, or are no longer needed. */
async function cancelClaimLinks(listingId: string) {
  const gone = await db
    .delete(passwordResets)
    .where(and(eq(passwordResets.listingId, listingId), eq(passwordResets.purpose, "claim"), isNull(passwordResets.usedAt)))
    .returning({ id: passwordResets.id });
  return gone.length;
}

/**
 * The Owner card of a listing our team entered (an imported one under its placeholder owner, or one filed under the
 * wrong account): files it under the owner staff give, by the intake form's rules (staffSellerAccount). Only until
 * ownership is confirmed; any claim link already sent stops working, and the change is audited (account ids only).
 */
export async function adminSetListingOwner(_prev: StaffListingState, formData: FormData): Promise<StaffListingState> {
  const me = await assertAdmin();
  const [t, ti] = await Promise.all([getT("errors"), getT("intake")]);
  const id = z.uuid().safeParse(formData.get("listingId"));
  if (!id.success) return { error: t("listing.notFound") };
  const m = await ownerMessages();
  const { seller, fieldErrors, phoneDigits } = readStaffSeller(formData, t, m);
  if (!seller || Object.keys(fieldErrors).length) return { error: t("form.checkFields"), fieldErrors };
  const [l] = await db
    .select({
      id: listings.id,
      sellerId: listings.sellerId,
      isSample: listings.isSample,
      createdByStaff: listings.createdByStaff,
      ownershipConfirmedAt: listings.ownershipConfirmedAt,
    })
    .from(listings)
    .where(eq(listings.id, id.data))
    .limit(1);
  if (!l) return { error: t("listing.notFound") };
  if (!l.createdByStaff || l.isSample) return { error: ti("owner.notStaff") };
  // A confirmed listing keeps its owner — unless it is still filed under an import's placeholder (ownership confirmed
  // on our team's record of the owner's authority, before the owner was entered): the real owner can still be set.
  const [current] = await db.select({ email: users.email, passwordHash: users.passwordHash }).from(users).where(eq(users.id, l.sellerId)).limit(1);
  const placeholder = current ? isImportOwner(current) : false;
  if (l.ownershipConfirmedAt && !placeholder) return { error: ti("owner.locked") };
  const account = await staffSellerAccount(t, seller, phoneDigits, null, m);
  if ("error" in account) return account;
  if (account.id === l.sellerId) return { error: ti("owner.same"), fieldErrors: { sellerName: [ti("owner.same")] } };
  const [moved] = await db
    .update(listings)
    .set({ sellerId: account.id, updatedAt: new Date() })
    // Not if it was confirmed (under a real owner), or re-filed by someone else, in the meantime.
    .where(and(eq(listings.id, l.id), eq(listings.sellerId, l.sellerId), placeholder ? undefined : isNull(listings.ownershipConfirmedAt)))
    .returning({ id: listings.id });
  if (!moved) return { error: ti("owner.locked") };
  const cancelled = await cancelClaimLinks(l.id);
  await audit({
    actorId: me.id,
    action: "listing.owner",
    entityType: "listing",
    entityId: l.id,
    // claimsCancelled: the unused claim links that stopped working (scrubDiff drops any key with "link" in it).
    diff: { sellerId: [l.sellerId, account.id], newSellerAccount: account.created, claimsCancelled: cancelled },
  });
  refresh();
  return { ok: true, listingId: l.id };
}

/**
 * Ownership confirmed by the owner's RERA Form A signed with us (co-broker stock: signed through the owner's broker),
 * instead of the claim link: staff tick that the signed Form A is uploaded (kind form_a) and checked. Only for a listing
 * our team entered that is filed under its real owner (not an import's placeholder). The approval gates stay as they
 * are: the Trakheesi permit is still required.
 */
export async function adminConfirmFormA(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await assertAdmin();
  const [t, ti] = await Promise.all([getT("errors"), getT("intake")]);
  const id = z.uuid().safeParse(formData.get("listingId"));
  if (!id.success) return { error: t("listing.notFound") };
  if (formData.get("formAChecked") !== "on") return { error: ti("formA.needCheck"), fieldErrors: { formAChecked: [ti("formA.needCheck")] } };
  const [l] = await db
    .select({
      id: listings.id,
      sellerId: listings.sellerId,
      isSample: listings.isSample,
      createdByStaff: listings.createdByStaff,
      ownershipConfirmedAt: listings.ownershipConfirmedAt,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
    })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(eq(listings.id, id.data))
    .limit(1);
  if (!l) return { error: t("listing.notFound") };
  if (!awaitsSellerConfirmation(l)) return { error: ti("formA.notNeeded") };
  if (isImportOwner(l)) return { error: ti("formA.needOwner") };
  if (l.role === "admin" || isOwnerEmail(l.email)) return { error: t("admin.sellerIsStaff") };
  const [doc] = await db
    .select({ id: files.id, filename: files.filename })
    .from(files)
    .where(and(eq(files.listingId, l.id), eq(files.kind, "form_a")))
    .orderBy(desc(files.createdAt))
    .limit(1);
  if (!doc) return { error: ti("formA.needDoc") };
  const now = new Date();
  const [confirmed] = await db
    .update(listings)
    .set({ ownershipConfirmedAt: now, updatedAt: now })
    .where(and(eq(listings.id, l.id), eq(listings.sellerId, l.sellerId), isNull(listings.ownershipConfirmedAt)))
    .returning({ id: listings.id });
  if (!confirmed) return { error: ti("formA.notNeeded") };
  // The claim link isn't needed any more (it would refuse a confirmed listing anyway).
  await cancelClaimLinks(l.id);
  // Which document it rests on, and who checked it (the actor): the record a dispute over the owner's authority needs.
  await audit({
    actorId: me.id,
    action: "listing.form_a_confirmed",
    entityType: "listing",
    entityId: l.id,
    diff: { ownershipConfirmedAt: [null, now], via: "form_a", fileId: doc.id, filename: doc.filename },
  });
  refresh();
  return { ok: true };
}

/** Why a unit of an import was left in review by adminPublishAttested. */
export type PublishSkipped = { hasPermit: number; formAExpired: number; changed: number };

/**
 * "Publish all N on Felicity's permits" on the Imported tab (src/components/admin/PublishAttested.tsx): on the account
 * owner's attestation (BULK_ATTESTATION in src/lib/attestation.ts) that Felicity holds a valid Trakheesi permit and the
 * owner's signed Form A for every unit of an import still in review under its placeholder owner, and that each is still
 * available, every such listing is attested, its ownership confirmed and it goes live at its asking price — what the
 * editor's checkbox, Form A and Approve do one by one, without the permit numbers (the real owner is still entered
 * afterwards from the Owner card; the placeholder is told nothing). One statement per listing, guarded by its status,
 * so two admins publishing at once can't publish or audit one twice. A unit with a permit number entered keeps the
 * number as its record (with the expiry rules) and is approved from its own page, like one whose Form A has run out.
 */
export async function adminPublishAttested(sourceKey: string) {
  const me = await assertAdmin();
  const t = await getT("errors");
  if (typeof sourceKey !== "string" || !IMPORT_KEY_RE.test(sourceKey)) return { error: t("listing.notFound") };
  const result = await publishAttested(me.id, sql`(${listings.source}->>'import') = ${sourceKey}`, BULK_ATTESTATION);
  refresh();
  return { ok: true as const, ...result };
}

/**
 * "Publish on Felicity's permits" on one imported unit's own admin page (src/components/admin/PublishAttested.tsx
 * with `listing`): the same statement, for that unit only (LISTING_ATTESTATION). Approve can't take it while it is
 * under the placeholder owner, so this is how a single unit goes live without its permit number.
 */
export async function adminPublishAttestedListing(listingId: string) {
  const me = await assertAdmin();
  const t = await getT("errors");
  if (!isUuid(listingId)) return { error: t("listing.notFound") };
  const result = await publishAttested(me.id, eq(listings.id, listingId), LISTING_ATTESTATION);
  refresh();
  return { ok: true as const, ...result };
}

/** The publish itself, for the units `where` names that the statement covers; `statement` goes in each audit row. */
async function publishAttested(actorId: string, where: SQL, statement: string) {
  const today = dubaiToday();
  // What the statement covers: units in review, real, entered by our team and still under the placeholder. Checked
  // again on each write below, so a unit re-filed under its real owner (adminSetListingOwner) in the meantime isn't
  // published, and its ownership confirmed, behind that owner's back.
  const inScope = and(
    where,
    eq(listings.status, "pending_review"),
    eq(listings.isSample, false),
    eq(listings.createdByStaff, true),
    awaitingOwnerSql,
  );
  const units = await db
    .select({
      id: listings.id,
      projectName: listings.projectName,
      isSample: listings.isSample,
      askingPrice: listings.askingPrice,
      publicPrice: listings.publicPrice,
      publishedAt: listings.publishedAt,
      ownershipConfirmedAt: listings.ownershipConfirmedAt,
      dldPermit: listings.dldPermit,
      dldPermitExpiresAt: listings.dldPermitExpiresAt,
      formAExpiresAt: listings.formAExpiresAt,
    })
    .from(listings)
    .where(inScope)
    .orderBy(listings.refNo);
  let published = 0;
  const skipped: PublishSkipped = { hasPermit: 0, formAExpired: 0, changed: 0 };
  for (const l of units) {
    if (l.dldPermit) {
      skipped.hasPermit++;
      continue;
    }
    const now = new Date();
    if (publishBlocker({ ...l, permitAttestedAt: now }, today)) {
      skipped.formAExpired++;
      continue;
    }
    const [done] = await db
      .update(listings)
      .set({
        permitAttestedAt: now,
        permitAttestedBy: actorId,
        ownershipConfirmedAt: l.ownershipConfirmedAt ?? now,
        status: "live",
        publicPrice: l.askingPrice,
        publishedAt: l.publishedAt ?? now,
        rejectionReason: null,
        updatedAt: now,
      })
      // Published, rejected, withdrawn or re-filed under its owner by someone else since the read above: left as they
      // made it.
      .where(and(eq(listings.id, l.id), inScope))
      .returning({ id: listings.id });
    if (!done) {
      skipped.changed++;
      continue;
    }
    const event = { actorId, entityType: "listing" as const, entityId: l.id };
    await audit({ ...event, action: "listing.permit_attested", diff: { via: "owner_attestation", statement, version: ATTESTATION_VERSION } });
    if (!l.ownershipConfirmedAt) {
      await audit({ ...event, action: "listing.ownership_confirmed", diff: { via: "owner_attestation", ownershipConfirmedAt: [null, now] } });
    }
    await audit({ ...event, action: "listing.approve", diff: { status: ["pending_review", "live"], publicPrice: [l.publicPrice, l.askingPrice] } });
    // Back on the market, as from Approve: no deal agreed on it earlier stays accepted (see reopenUnit).
    await reopenUnit(l, "pending_review");
    published++;
  }
  return { published, skipped };
}

// ---- The deal file (src/lib/deals.ts): contracts, NOC and transfer milestones of an agreed deal ----

/** Saves the deal file card on the admin listing page; the change goes in the audit trail. */
export async function updateDealFile(_prev: DealFileState, formData: FormData): Promise<DealFileState> {
  const me = await assertAdmin();
  const res = await saveDealFile(me.id, formData, await getT("errors"));
  if (res.ok) refresh();
  return res;
}

/** One note on the deal file. */
export async function addDealNote(_prev: DealFileState, formData: FormData): Promise<DealFileState> {
  const me = await assertAdmin();
  const res = await addNote(me.id, String(formData.get("dealId") ?? ""), String(formData.get("body") ?? ""), await getT("errors"));
  if (res.ok) refresh();
  return res;
}
