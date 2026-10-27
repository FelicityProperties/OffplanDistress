"use server";

import { refresh } from "next/cache";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listings, sellerLeads, users } from "@/db/schema";
import { getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { LEGAL_UPDATED } from "@/content/legal/brand";
import { sourceFromForm } from "@/lib/attribution";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { ownListingSql } from "@/lib/dashboard";
import { refCode } from "@/lib/format";
import { fallbackErrors, listingSchema, money, optionalDate } from "@/lib/listing-schema";
import { notifyAdmins } from "@/lib/notify";
import { cancelAcceptedOffers, closeOpenOffers } from "@/lib/offers";
import { publishBlocker } from "@/lib/permits";
import type { FormState } from "./auth";

type T = TFn<"errors">;

function readListingForm(formData: FormData) {
  let plan: unknown = [];
  try {
    plan = JSON.parse(String(formData.get("paymentPlan") || "[]"));
  } catch {}
  const opt = (k: string) => {
    const v = formData.get(k);
    return v == null || v === "" ? undefined : String(v);
  };
  return {
    projectName: formData.get("projectName"),
    developer: formData.get("developer"),
    community: formData.get("community"),
    developerOther: opt("developerOther"),
    communityOther: opt("communityOther"),
    unitType: formData.get("unitType"),
    sizeSqft: formData.get("sizeSqft"),
    floor: opt("floor"),
    view: opt("view"),
    originalPrice: formData.get("originalPrice"),
    amountPaid: formData.get("amountPaid"),
    askingPrice: formData.get("askingPrice"),
    handoverDate: opt("handoverDate"),
    nextInstalmentDate: opt("nextInstalmentDate"),
    nextInstalmentAmount: opt("nextInstalmentAmount"),
    overdueAmount: opt("overdueAmount"),
    motivation: formData.get("motivation") || "motivated",
    description: opt("description"),
    paymentPlan: plan,
  };
}

export type CreateListingState = FormState & { listingId?: string; refNo?: number };

export async function createListing(_prev: CreateListingState, formData: FormData): Promise<CreateListingState> {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInToList") };

  const [{ pending }] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.sellerId, user.id), eq(listings.status, "pending_review")));
  if (pending >= 10) return { error: t("listing.tooManyPending") };

  const parsed = listingSchema(t).safeParse(readListingForm(formData), { error: fallbackErrors(t) });
  // Final step of the sell form: "I own this unit or am authorised to sell it, the documents are genuine,
  // and I agree to the Terms of Use". Enforced here too, not only in the browser.
  const ownershipConfirmed = formData.get("confirmOwnership") === "on";
  if (!parsed.success || !ownershipConfirmed) {
    const ts = await getT("sell");
    const fieldErrors: Record<string, string[] | undefined> = parsed.success
      ? {}
      : { ...z.flattenError(parsed.error).fieldErrors };
    if (!ownershipConfirmed) fieldErrors.confirmOwnership = [ts("error.confirmOwnership")];
    return { error: parsed.success ? ts("error.confirmOwnership") : t("form.fixDetails"), fieldErrors };
  }
  const v = parsed.data;

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone && !user.phone) {
    await db.update(users).set({ phone }).where(eq(users.id, user.id));
  }

  const [row] = await db
    .insert(listings)
    .values({
      sellerId: user.id,
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
      // The seller's figure, unchecked (arrears_checked_at stays empty until our team checks the statement).
      overdueAmount: v.overdueAmount ?? null,
      motivation: v.motivation,
      description: v.description ?? null,
      paymentPlan: v.paymentPlan,
      source: sourceFromForm(formData),
      // The seller ticked the ownership / authority / Terms confirmation above (checked on the server too).
      ownershipConfirmedAt: new Date(),
      termsVersion: LEGAL_UPDATED,
    })
    .returning({ id: listings.id, refNo: listings.refNo });

  // Started from the free estimate: the lead becomes this seller's and this listing's (theirs, or not yet claimed).
  const leadId = z.uuid().safeParse(formData.get("leadId"));
  if (leadId.success) {
    await db
      .update(sellerLeads)
      .set({ listingId: row.id, userId: user.id, status: "converted", updatedAt: new Date() })
      .where(
        and(
          eq(sellerLeads.id, leadId.data),
          isNull(sellerLeads.listingId),
          or(eq(sellerLeads.userId, user.id), isNull(sellerLeads.userId)),
        ),
      );
  }

  await notifyAdmins(
    "listing.submitted",
    { project: v.projectName, seller: user.fullName, ref: refCode(row.refNo) },
    `/admin/listings/${row.id}`,
    { except: [user.id] },
  );

  return { ok: true, listingId: row.id, refNo: row.refNo };
}

/**
 * Staff-assisted intake (adminCreateListing in ./admin.ts): the sell form's listing fields, checked by the same rules
 * (listingSchema in src/lib/listing-schema.ts), with errors in the request's language. Admins only, and it only
 * validates: nothing is saved.
 */
export async function parseListingFields(formData: FormData) {
  const [user, t] = await Promise.all([getCurrentUser(), getT("errors")]);
  if (user?.role !== "admin") return { ok: false as const, error: t("auth.notAuthorised") };
  const parsed = listingSchema(t).safeParse(readListingForm(formData), { error: fallbackErrors(t) });
  if (!parsed.success) {
    return { ok: false as const, error: t("form.fixDetails"), fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  return { ok: true as const, data: parsed.data };
}

const sellerEditSchema = (t: T) =>
  z.object({
    askingPrice: money(t),
    motivation: z.enum(["urgent", "motivated", "flexible"]),
    description: z.string().trim().max(3000).optional(),
    nextInstalmentDate: optionalDate(t),
    nextInstalmentAmount: z.coerce.number().int().nonnegative().optional(),
  });

export async function updateMyListing(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInAgain") };
  const id = String(formData.get("listingId") ?? "");

  const [existing] = await db
    .select({
      status: listings.status,
      sellerId: listings.sellerId,
      askingPrice: listings.askingPrice,
      projectName: listings.projectName,
      refNo: listings.refNo,
      isSample: listings.isSample,
      description: listings.description,
    })
    .from(listings)
    // Not one our team entered that its seller hasn't confirmed yet (see ownListingSql).
    .where(and(eq(listings.id, id), ownListingSql(user.id)))
    .limit(1);
  if (!existing || existing.sellerId !== user.id) return { error: t("listing.notFound") };
  if (existing.status === "transferred") return { error: t("listing.transferred") };

  const parsed = sellerEditSchema(t).safeParse(
    {
      askingPrice: formData.get("askingPrice"),
      motivation: formData.get("motivation"),
      description: formData.get("description") || undefined,
      nextInstalmentDate: formData.get("nextInstalmentDate") || undefined,
      nextInstalmentAmount: formData.get("nextInstalmentAmount") || undefined,
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  // The advertised price and text are what the DLD permit and our review cover (RERA). Changing them on a real
  // listing takes it back to review; with an accepted offer they are fixed. Price-drop alerts go out on re-approval.
  const description = parsed.data.description ?? null;
  const advertChanged = parsed.data.askingPrice !== existing.askingPrice || (description ?? "") !== (existing.description ?? "");
  if (!existing.isSample && advertChanged && (existing.status === "under_offer" || existing.status === "noc_in_progress")) {
    return { error: t("listing.lockedUnderOffer") };
  }
  const backToReview = !existing.isSample && advertChanged && (existing.status === "live" || existing.status === "paused");

  await db
    .update(listings)
    .set({
      askingPrice: parsed.data.askingPrice,
      motivation: parsed.data.motivation,
      description,
      nextInstalmentDate: parsed.data.nextInstalmentDate,
      nextInstalmentAmount: parsed.data.nextInstalmentAmount ?? null,
      ...(backToReview ? { status: "pending_review" as const, pausedByAdmin: false } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(listings.id, id), eq(listings.sellerId, user.id)));

  if (backToReview) {
    await notifyAdmins(
      "listing.changed",
      { project: existing.projectName, seller: user.fullName, ref: refCode(existing.refNo) },
      `/admin/listings/${id}`,
      { except: [user.id] },
    );
  }
  refresh();
  return { ok: true, review: backToReview };
}

/** Seller-side status changes: pause, resume, withdraw. Everything else is done by our team. */
export async function setMyListingStatus(listingId: string, action: "pause" | "resume" | "withdraw") {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInAgain") };
  const [l] = await db
    .select({
      status: listings.status,
      verified: listings.verified,
      sellerId: listings.sellerId,
      pausedByAdmin: listings.pausedByAdmin,
      isSample: listings.isSample,
      dldPermit: listings.dldPermit,
      dldPermitExpiresAt: listings.dldPermitExpiresAt,
      formAExpiresAt: listings.formAExpiresAt,
      projectName: listings.projectName,
      refNo: listings.refNo,
    })
    .from(listings)
    // Not one our team entered that its seller hasn't confirmed yet (see ownListingSql).
    .where(and(eq(listings.id, listingId), ownListingSql(user.id)))
    .limit(1);
  if (!l || l.sellerId !== user.id) return { error: t("listing.notFound") };

  let next: (typeof listings.$inferSelect)["status"] | null = null;
  if (action === "pause" && l.status === "live") next = "paused";
  // A pause by our team (e.g. during a document dispute) can only be lifted by our team.
  // Straight back to live only if its DLD advertising permit (with an expiry after today) and Form A are still current
  // (samples need none); otherwise review again.
  if (action === "resume" && l.status === "paused" && !l.pausedByAdmin) {
    next = l.verified && !publishBlocker(l) ? "live" : "pending_review";
  }
  if (action === "withdraw" && !["transferred", "noc_in_progress", "withdrawn"].includes(l.status)) next = "withdrawn";
  if (!next) return { error: t("listing.changeUnavailable") };

  // Only from the status checked above: if our team moved it on in the meantime (to NOC in progress or transferred, say),
  // a withdrawal mustn't overwrite that nor close its offers as "no longer available".
  const [changed] = await db
    .update(listings)
    .set({ status: next, pausedByAdmin: false, updatedAt: new Date() })
    .where(and(eq(listings.id, listingId), eq(listings.status, l.status)))
    .returning({ id: listings.id });
  if (!changed) {
    refresh();
    return { error: t("listing.changeUnavailable") };
  }
  await audit({ actorId: user.id, action: "listing.seller_status", entityType: "listing", entityId: listingId, diff: { status: [l.status, next] } });
  // Off the market: buyers with an open offer on it are told it is no longer available. Withdrawing a unit under
  // offer also ends the agreed deal: that buyer is told it did not go ahead, and our team hears about it.
  if (next === "withdrawn") {
    const unit = { id: listingId, projectName: l.projectName };
    await closeOpenOffers(unit, "unavailable");
    if (l.status === "under_offer" && (await cancelAcceptedOffers(unit, "withdrawn")) > 0) {
      await notifyAdmins(
        "deal.withdrawn.admin",
        { project: l.projectName, seller: user.fullName, ref: refCode(l.refNo) },
        `/admin/listings/${listingId}`,
        { except: [user.id] },
      );
    }
  }
  // A resume that can't go straight back live goes to our team (documents or the DLD permit are missing).
  const review = action === "resume" && next === "pending_review";
  if (review) {
    await notifyAdmins(
      "listing.submitted",
      { project: l.projectName, seller: user.fullName, ref: refCode(l.refNo) },
      `/admin/listings/${listingId}`,
      { except: [user.id] },
    );
  }
  refresh();
  return { ok: true, review };
}
