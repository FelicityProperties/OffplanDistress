"use server";

import { refresh } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inquiries, listings, offers, savedSearches, users, watchlist } from "@/db/schema";
import { getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { sourceFromForm } from "@/lib/attribution";
import { getCurrentUser } from "@/lib/auth";
import { PUBLIC_STATUSES } from "@/lib/config";
import { refCode } from "@/lib/format";
import { notify, notifyAdmins, type TemplateParams } from "@/lib/notify";
import { settleOtherOffers } from "@/lib/offers";
import { clientIp, hit, MINUTE } from "@/lib/throttle";
import type { FormState } from "./auth";

type T = TFn<"errors">;

/** Messages for checks that don't carry their own, in the request's language. */
function fallbackErrors(t: T): z.core.$ZodErrorMap {
  return (iss) => {
    if (iss.code === "too_big" && iss.origin === "string") return t("field.tooLong", { max: Number(iss.maximum) });
    if (iss.code === "too_big" && iss.origin === "array") return t("field.tooMany", { max: Number(iss.maximum) });
    if (iss.code === "invalid_type" && iss.expected === "number") return t("field.number");
    return t("field.invalid");
  };
}

export async function toggleWatch(listingId: string): Promise<{ watching?: boolean; needsAuth?: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { needsAuth: true };

  const [existing] = await db
    .select({ id: watchlist.listingId })
    .from(watchlist)
    .where(and(eq(watchlist.userId, user.id), eq(watchlist.listingId, listingId)))
    .limit(1);

  if (existing) {
    await db.delete(watchlist).where(and(eq(watchlist.userId, user.id), eq(watchlist.listingId, listingId)));
    refresh();
    return { watching: false };
  }

  const [l] = await db
    .select({ askingPrice: listings.askingPrice, status: listings.status })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!l || !PUBLIC_STATUSES.includes(l.status)) return { error: (await getT("errors"))("watch.unavailable") };
  await db.insert(watchlist).values({ userId: user.id, listingId, savedPrice: l.askingPrice }).onConflictDoNothing();
  refresh();
  return { watching: true };
}

const offerSchema = (t: T) =>
  z.object({
    listingId: z.uuid(),
    amount: z.coerce.number(t("field.offerAmount")).int(t("field.wholeDirhams")).positive(t("field.offerAmount")),
    financing: z.enum(["cash", "mortgage"]),
    message: z.string().trim().max(1000).optional(),
  });

export async function makeOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInToOffer") };

  const parsed = offerSchema(t).safeParse(
    {
      listingId: formData.get("listingId"),
      amount: formData.get("amount"),
      financing: formData.get("financing") || "cash",
      message: formData.get("message") || undefined,
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const [l] = await db
    .select({
      sellerId: listings.sellerId,
      status: listings.status,
      projectName: listings.projectName,
      askingPrice: listings.askingPrice,
      isSample: listings.isSample,
    })
    .from(listings)
    .where(eq(listings.id, v.listingId))
    .limit(1);
  // Sample listings are illustrations and cannot receive offers (Terms s.4), whatever calls this action.
  if (!l || !PUBLIC_STATUSES.includes(l.status) || l.isSample) return { error: t("offer.closed") };
  if (l.sellerId === user.id) return { error: t("offer.own") };

  // One open offer per buyer per listing: a new offer replaces the open one.
  const [open] = await db
    .select({ id: offers.id })
    .from(offers)
    .where(
      and(
        eq(offers.listingId, v.listingId),
        eq(offers.buyerId, user.id),
        inArray(offers.status, ["pending", "countered"]),
      ),
    )
    .limit(1);

  // Only while it is still open: if the seller accepted (or anyone closed) it since the read above, the revision is a
  // new offer rather than putting an accepted offer back to pending under a unit that is already under offer.
  const revised = open
    ? await db
        .update(offers)
        .set({
          amount: v.amount,
          financing: v.financing,
          message: v.message ?? null,
          status: "pending",
          counterAmount: null,
          updatedAt: new Date(),
        })
        .where(and(eq(offers.id, open.id), inArray(offers.status, ["pending", "countered"])))
        .returning({ id: offers.id })
    : [];
  if (!revised.length) {
    await db.insert(offers).values({
      listingId: v.listingId,
      buyerId: user.id,
      amount: v.amount,
      financing: v.financing,
      message: v.message ?? null,
    });
  }

  const params: TemplateParams = {
    project: l.projectName,
    amount: { aed: v.amount },
    asking: { aed: l.askingPrice },
    financing: { t: "errors", key: `notify.financing.${v.financing}` },
  };
  // Sample listings belong to placeholder sellers — only our team hears about offers on them.
  if (!l.isSample) await notify([l.sellerId], "offer.received", params, `/dashboard/listings/${v.listingId}`);
  await notifyAdmins("offer.received.admin", { ...params, buyer: user.fullName }, `/admin/listings/${v.listingId}`, {
    except: [user.id, l.sellerId],
  });

  refresh();
  return { ok: true };
}

type OfferAction = "accept" | "decline" | "counter" | "withdraw" | "accept_counter";
type ListingStatus = (typeof listings.$inferSelect)["status"];
type OfferStatus = (typeof offers.$inferSelect)["status"];

/** A deal is agreed (or done) on the unit, so no other offer on it can be accepted. */
const TAKEN_STATUSES: ListingStatus[] = ["under_offer", "noc_in_progress", "transferred"];

/**
 * Accepts the offer and takes its unit off the market in one SQL statement, which is atomic on both drivers
 * (neon-http has db.batch but no transactions, node-postgres the reverse). The offer row is locked first and must
 * still be as the user saw it: in `from`, at `amount` (the offer, or the seller's counter); the listing only moves
 * from live to under_offer if so; the offer is only accepted if the listing moved. Of two acceptances racing on one
 * unit, the second finds it no longer live and changes nothing. Returns whether this call accepted the offer.
 */
async function acceptOffer(offerId: string, listingId: string, from: "pending" | "countered", amount: number) {
  // A buyer revising their offer at the same moment must not be accepted at the old amount.
  const seen = from === "pending" ? sql`amount = ${amount}` : sql`counter_amount = ${amount}`;
  const { rows } = await db.execute<{ accepted: number }>(sql`
    with target as (
      select id from offers
      where id = ${offerId} and listing_id = ${listingId} and status = ${from} and ${seen}
      for update
    ), unit as (
      update listings set status = 'under_offer', updated_at = now()
      where id = ${listingId} and status = 'live' and exists (select 1 from target)
      returning id
    ), accepted as (
      update offers set status = 'accepted', amount = ${amount}, updated_at = now()
      where id in (select id from target) and exists (select 1 from unit)
      returning id
    )
    select count(*)::int as accepted from accepted`);
  return Number(rows[0]?.accepted) === 1;
}

export async function respondToOffer(offerId: string, action: OfferAction, counterAmount?: number) {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInAgain") };

  const [row] = await db
    .select({
      offer: offers,
      sellerId: listings.sellerId,
      listingStatus: listings.status,
      projectName: listings.projectName,
      isSample: listings.isSample,
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .where(eq(offers.id, offerId))
    .limit(1);
  if (!row) return { error: t("offer.notFound") };

  const { offer } = row;
  const isSeller = row.sellerId === user.id || user.role === "admin";
  const isBuyer = offer.buyerId === user.id;
  const now = new Date();

  const project = row.projectName;
  const buyerHref = "/dashboard/offers?tab=sent";
  const sellerHref = `/dashboard/listings/${offer.listingId}`;
  const adminHref = `/admin/listings/${offer.listingId}`;
  const toBuyer = (key: Parameters<typeof notify>[1], params: TemplateParams) => notify([offer.buyerId], key, params, buyerHref);
  // Sample sellers are placeholders, so they never get in-app rows or emails.
  const toSeller = async (key: Parameters<typeof notify>[1], params: TemplateParams) => {
    if (!row.isSample) await notify([row.sellerId], key, params, sellerHref);
  };
  const dealAgreed = async (amount: number) => {
    const people = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, [row.sellerId, offer.buyerId]));
    const name = (id: string) => people.find((p) => p.id === id)?.fullName ?? "—";
    await notifyAdmins(
      "deal.agreed.admin",
      { project, amount: { aed: amount }, seller: name(row.sellerId), buyer: name(offer.buyerId) },
      adminHref,
      { except: [user.id] },
    );
  };
  const unit = { id: offer.listingId, projectName: project };
  const unavailable = { error: t("offer.actionUnavailable") };
  // Accepting (or countering) needs a live unit: once a deal is agreed, the other offers are only backups.
  const notLive = (status: ListingStatus | undefined) => ({
    error: t(status && TAKEN_STATUSES.includes(status) ? "offer.unitTaken" : "offer.closed"),
  });
  /** Moves this offer out of `from`, unless something else (another tab, the other party) moved it first. */
  const move = async (from: OfferStatus[], set: Partial<typeof offers.$inferInsert>) => {
    const [moved] = await db
      .update(offers)
      .set({ ...set, updatedAt: now })
      .where(and(eq(offers.id, offerId), inArray(offers.status, from)))
      .returning({ id: offers.id });
    if (!moved) refresh(); // the page this came from is out of date: show the offer as it now is, next to the error
    return Boolean(moved);
  };
  /** null once accepted; otherwise the error for whoever lost the race (with the page refreshed to the unit's real state). */
  const accept = async (from: "pending" | "countered", amount: number) => {
    if (row.listingStatus !== "live") {
      refresh();
      return notLive(row.listingStatus);
    }
    if (await acceptOffer(offerId, offer.listingId, from, amount)) return null;
    refresh();
    const [latest] = await db.select({ status: listings.status }).from(listings).where(eq(listings.id, offer.listingId)).limit(1);
    // Still live: this offer itself changed in the meantime (withdrawn, declined, revised).
    return latest?.status === "live" ? unavailable : notLive(latest?.status);
  };

  if (action === "accept" && isSeller && offer.status === "pending") {
    const failed = await accept("pending", offer.amount);
    if (failed) return failed;
    await toBuyer("offer.accepted", { project, amount: { aed: offer.amount } });
    await dealAgreed(offer.amount);
    await settleOtherOffers(unit, offerId);
  } else if (action === "counter" && isSeller && offer.status === "pending") {
    if (!counterAmount || !Number.isFinite(counterAmount) || counterAmount <= 0) return { error: t("field.counterAmount") };
    // A counter is an acceptance waiting on the buyer, so a backup offer can't be countered either.
    if (row.listingStatus !== "live") return notLive(row.listingStatus);
    const counter = Math.round(counterAmount);
    if (!(await move(["pending"], { status: "countered", counterAmount: counter }))) return unavailable;
    await toBuyer("offer.countered", { project, original: { aed: offer.amount }, amount: { aed: counter } });
  } else if (action === "decline" && isSeller && offer.status === "pending") {
    if (!(await move(["pending"], { status: "declined" }))) return unavailable;
    await toBuyer("offer.declined", { project, amount: { aed: offer.amount } });
  } else if (action === "accept_counter" && isBuyer && offer.status === "countered" && offer.counterAmount) {
    const failed = await accept("countered", offer.counterAmount);
    if (failed) return failed;
    await toSeller("offer.counter_accepted", { project, amount: { aed: offer.counterAmount } });
    await dealAgreed(offer.counterAmount);
    await settleOtherOffers(unit, offerId);
  } else if (action === "decline" && isBuyer && offer.status === "countered") {
    if (!(await move(["countered"], { status: "declined" }))) return unavailable;
    await toSeller("offer.counter_declined", { project, amount: { aed: offer.counterAmount ?? offer.amount } });
  } else if (action === "withdraw" && isBuyer && (offer.status === "pending" || offer.status === "countered")) {
    if (!(await move(["pending", "countered"], { status: "withdrawn" }))) return unavailable;
    await toSeller("offer.withdrawn", { project, amount: { aed: offer.amount } });
  } else {
    return unavailable;
  }

  refresh();
  return { ok: true };
}

const inquirySchema = (t: T) =>
  z.object({
    listingId: z.uuid().optional(),
    type: z.enum(["info", "viewing", "contact"]),
    name: z.string().trim().min(2, t("field.name")).max(120),
    email: z.string().trim().pipe(z.email(t("field.email"))),
    phone: z.string().trim().max(30).optional(),
    message: z.string().trim().max(2000).optional(),
  });

export async function createInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT("errors");
  const user = await getCurrentUser();
  const parsed = inquirySchema(t).safeParse(
    {
      listingId: formData.get("listingId") || undefined,
      type: formData.get("type") || "info",
      name: formData.get("name") || user?.fullName,
      email: formData.get("email") || user?.email,
      phone: formData.get("phone") || user?.phone || undefined,
      message: formData.get("message") || undefined,
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await hit(`inquiry-ip:${await clientIp()}`, 10, 60 * MINUTE))) return { error: t("tooMany") };
  const v = parsed.data;
  await db.insert(inquiries).values({ ...v, userId: user?.id ?? null, source: sourceFromForm(formData) });

  // Project names and reference codes read the same in both languages, so the deal line can go in as-is.
  let about: string | null = null;
  if (v.listingId) {
    const [l] = await db
      .select({ projectName: listings.projectName, refNo: listings.refNo })
      .from(listings)
      .where(eq(listings.id, v.listingId))
      .limit(1);
    if (l) about = `${l.projectName} · ${refCode(l.refNo)}`;
  }
  await notifyAdmins(
    "inquiry.received",
    {
      kind: { t: "errors", key: `notify.inquiry.${v.type}` },
      name: v.name,
      contact: [v.email, v.phone].filter(Boolean).join(" · "),
      message: [about, v.message].filter(Boolean).join("\n"),
    },
    "/admin/inquiries",
    { except: [user?.id] },
  );
  return { ok: true };
}

export async function saveSearch(name: string, query: string) {
  const user = await getCurrentUser();
  if (!user) return { needsAuth: true };
  const t = await getT("errors");
  const clean = new URLSearchParams(query);
  clean.delete("page");
  await db.insert(savedSearches).values({
    userId: user.id,
    name: name.trim().slice(0, 80) || t("search.defaultName"),
    query: clean.toString(),
  });
  refresh();
  return { ok: true };
}

export async function deleteSearch(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: (await getT("errors"))("auth.signInAgain") };
  await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)));
  refresh();
  return { ok: true };
}

const profileSchema = (t: T) =>
  z.object({
    fullName: z.string().trim().min(2, t("field.fullName")).max(120),
    phone: z.string().trim().max(30).optional(),
    intent: z.enum(["buy", "sell", "both"]),
  });

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInAgain") };
  const parsed = profileSchema(t).safeParse(
    {
      fullName: formData.get("fullName"),
      phone: formData.get("phone") || undefined,
      intent: formData.get("intent"),
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await db
    .update(users)
    .set({ fullName: parsed.data.fullName, phone: parsed.data.phone ?? null, intent: parsed.data.intent })
    .where(eq(users.id, user.id));
  refresh();
  return { ok: true };
}

export async function requestKyc() {
  const user = await getCurrentUser();
  if (!user) return { error: (await getT("errors"))("auth.signInAgain") };
  if (user.kycStatus === "not_started") {
    await db.update(users).set({ kycStatus: "pending" }).where(eq(users.id, user.id));
    await notifyAdmins("kyc.requested.admin", { name: user.fullName, email: user.email }, "/admin/users", { except: [user.id] });
  }
  refresh();
  return { ok: true };
}
