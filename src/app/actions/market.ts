"use server";

import { refresh } from "next/cache";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inquiries, listings, offers, savedSearches, users, watchlist } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { LEGAL_UPDATED } from "@/content/legal/brand";
import { sourceFromForm } from "@/lib/attribution";
import { audit, changes } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { cleanText, formText } from "@/lib/clean-text";
import { startDeal } from "@/lib/deals";
import { formatAED } from "@/lib/format";
import { notifyInquiryReceived } from "@/lib/inquiries";
import { filtersFromQuery, type DealFilters } from "@/lib/listings";
import { notify, notifyAdmins, type TemplateParams } from "@/lib/notify";
import { settleOtherOffers } from "@/lib/offers";
import { advertisedSql, isAdvertised } from "@/lib/permits";
import { formTokenExpired, formTokenOk, honeypotTripped, SPAM_THRESHOLD, spamScore, verifyTurnstile } from "@/lib/spam";
import { clientIp, DAY, hit, MINUTE } from "@/lib/throttle";
import { contactKinds } from "@/lib/typed-names";
import { isUuid } from "@/lib/utils";
import type { FormState } from "./auth";

type T = TFn<"errors">;

/** Offers and counters are int4 columns: a figure past that is a typo (extra zeros), answered with a field error. */
const INT4_MAX = 2_147_483_647;

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
  if (!isUuid(listingId)) return { error: (await getT("errors"))("watch.unavailable") };

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
    .select({
      askingPrice: listings.askingPrice,
      status: listings.status,
      isSample: listings.isSample,
      dldPermitExpiresAt: listings.dldPermitExpiresAt,
      formAExpiresAt: listings.formAExpiresAt,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!l || !isAdvertised(l)) return { error: (await getT("errors"))("watch.unavailable") };
  await db.insert(watchlist).values({ userId: user.id, listingId, savedPrice: l.askingPrice }).onConflictDoNothing();
  refresh();
  return { watching: true };
}

const offerSchema = (t: T) =>
  z.object({
    listingId: z.uuid(),
    amount: z.coerce
      .number(t("field.offerAmount"))
      .int(t("field.wholeDirhams"))
      .positive(t("field.offerAmount"))
      .max(INT4_MAX, t("field.amountTooLarge")),
    financing: z.enum(["cash", "mortgage"]),
    // The seller reads it as written. Buyers stay anonymous until the MOU and our team brokers every negotiation, so a
    // phone number, email address, link or handle in it is refused (the form says why and keeps the text to edit).
    message: z
      .string()
      .trim()
      .max(1000)
      .refine((m) => contactKinds(m).length === 0, t("field.offerMessageContact"))
      .optional(),
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
      message: formText(formData.get("message"), { multiline: true }) || undefined,
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  // Each offer (or revision) notifies the seller and our team: a loop mustn't flood them, nor the email quota.
  if (!(await hit(`offer:${user.id}`, 10, 60 * MINUTE))) return { error: t("tooMany") };
  const v = parsed.data;

  const [l] = await db
    .select({
      sellerId: listings.sellerId,
      status: listings.status,
      projectName: listings.projectName,
      askingPrice: listings.askingPrice,
      isSample: listings.isSample,
      dldPermitExpiresAt: listings.dldPermitExpiresAt,
      formAExpiresAt: listings.formAExpiresAt,
    })
    .from(listings)
    .where(eq(listings.id, v.listingId))
    .limit(1);
  // Sample listings are illustrations and cannot receive offers (Terms s.4), whatever calls this action; nor can a
  // listing that isn't an advert any more (its DLD permit or Form A ran out, even before the daily job paused it).
  if (!l || !isAdvertised(l) || l.isSample) return { error: t("offer.closed") };
  if (l.sellerId === user.id) return { error: t("offer.own") };

  // One open offer per buyer per listing: a new offer replaces the open one. A buyer whose offer the seller accepted
  // has the deal: a "backup" from them would compete with their own agreed deal.
  const mine = await db
    .select({ id: offers.id, status: offers.status, amount: offers.amount, financing: offers.financing, message: offers.message })
    .from(offers)
    .where(
      and(
        eq(offers.listingId, v.listingId),
        eq(offers.buyerId, user.id),
        inArray(offers.status, ["pending", "countered", "accepted"]),
      ),
    );
  if (mine.some((o) => o.status === "accepted")) return { error: t("offer.alreadyAccepted") };
  const open = mine.find((o) => o.status === "pending" || o.status === "countered");

  // The write only goes through while the unit is still an advert, checked in the same statement: if it was withdrawn,
  // rejected or sold since the check above, its open offers were (or are being) closed, and this one mustn't be left
  // open behind them. A revision is of a row the closing update locks and re-checks anyway; a new offer is a row that
  // update can't see, so it locks the listing row (FOR SHARE) and waits for a status change in flight. Only the insert
  // locks it: a revision waits on its offer row, which an acceptance locks before the listing, so the two would deadlock.
  const advertisedNow = (lock: boolean) =>
    sql`exists (select 1 from ${listings} where ${listings.id} = ${v.listingId} and ${advertisedSql()}${lock ? sql` for share` : sql``})`;
  // The same offer sent again (a double click, a second tab) changes nothing the seller hasn't heard: no new notices,
  // and the offer stays as the seller's open page shows it (its updated_at, which their Accept, Counter and Decline are
  // checked against, and the reminder clock), so only the Terms agreement is renewed — while the offer is still exactly
  // that pending one. A revision of a countered offer does change it: the seller's counter is set aside.
  const resent =
    open?.status === "pending" &&
    open.amount === v.amount &&
    open.financing === v.financing &&
    (open.message ?? null) === (v.message ?? null)
      ? await db
          .update(offers)
          .set({ termsAcceptedAt: new Date(), termsVersion: LEGAL_UPDATED })
          .where(
            and(
              eq(offers.id, open.id),
              eq(offers.status, "pending"),
              eq(offers.amount, v.amount),
              eq(offers.financing, v.financing),
              sql`${offers.message} is not distinct from ${v.message ?? null}`,
              advertisedNow(false),
            ),
          )
          .returning({ id: offers.id })
      : [];
  if (resent.length) {
    refresh();
    return { ok: true };
  }
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
          // Sending the offer agrees to the Terms (the line under the form): the version in force now.
          termsAcceptedAt: new Date(),
          termsVersion: LEGAL_UPDATED,
          updatedAt: new Date(),
        })
        .where(and(eq(offers.id, open.id), inArray(offers.status, ["pending", "countered"]), advertisedNow(false)))
        .returning({ id: offers.id })
    : [];
  if (!revised.length) {
    const { rows } = await db.execute<{ id: string }>(sql`
      insert into ${offers} (listing_id, buyer_id, amount, financing, message, terms_accepted_at, terms_version)
      select ${v.listingId}::uuid, ${user.id}::uuid, ${v.amount}::int, ${v.financing}::financing, ${v.message ?? null}::text,
        now(), ${LEGAL_UPDATED}::text
      where ${advertisedNow(true)}
      returning id`);
    // As when the check above refuses: the form says so (a refresh would replace the page with a 404 first).
    if (!rows.length) return { error: t("offer.closed") };
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
 * unit, the second finds it no longer live and changes nothing. Nor does an acceptance while the unit still carries an
 * accepted offer (one from a deal that fell through is closed as the unit goes live again, reopenUnit in
 * src/lib/offers.ts), so a unit never has two. Returns whether this call accepted the offer.
 */
async function acceptOffer(offerId: string, listingId: string, from: "pending" | "countered", amount: number, at: Date) {
  // A buyer revising their offer at the same moment must not be accepted at the old amount, nor at the old financing
  // or message: the row is still the one read (`at`, its updated_at).
  const seen = from === "pending" ? sql`amount = ${amount}` : sql`counter_amount = ${amount}`;
  const { rows } = await db.execute<{ accepted: number }>(sql`
    with target as (
      select id from offers
      where id = ${offerId} and listing_id = ${listingId} and status = ${from} and ${seen}
        and date_trunc('milliseconds', updated_at) = ${at.toISOString()}::timestamptz
      for update
    ), unit as (
      update listings set status = 'under_offer', updated_at = now()
      where id = ${listingId} and status = 'live' and exists (select 1 from target)
        and not exists (select 1 from offers where listing_id = ${listingId} and status = 'accepted')
      returning id
    ), accepted as (
      update offers set status = 'accepted', amount = ${amount}, updated_at = now()
      where id in (select id from target) and exists (select 1 from unit)
      returning id
    )
    select count(*)::int as accepted from accepted`);
  return Number(rows[0]?.accepted) === 1;
}

/**
 * `seen`: the figure the user's page showed with the button (the offer; for the buyer, the seller's counter), and
 * `seenAt`: the offer's updated_at as that page showed it (ISO, milliseconds). An answer is about the offer as shown:
 * if the other party has changed it since the page loaded (the figure, or the financing or message at the same
 * figure), nothing is decided and the page refreshes to show it.
 */
export async function respondToOffer(offerId: string, action: OfferAction, counterAmount?: number, seen?: number, seenAt?: string) {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInAgain") };
  if (!isUuid(offerId)) return { error: t("offer.notFound") };

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
    // The deal file our team completes from here to the transfer (src/lib/deals.ts), with the accepted amount.
    await startDeal(offer.listingId, offerId);
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
  /**
   * The error when the offer on file isn't the one the page showed (`seen`, `seenAt`), with the page refreshed to show
   * it: the figure changed, or something else did (a buyer's new financing or message at the same amount).
   */
  const changed = async (onFile: number | null, key: "offer.changed" | "offer.counterChanged") => {
    if ((seen == null || seen === onFile) && (seenAt == null || seenAt === offer.updatedAt.toISOString())) return null;
    refresh();
    return { error: t(key, { amount: formatAED(onFile, await getLocale()) }) };
  };
  /**
   * Moves this offer out of `from` (still at `amount`, when given: the figure the answer is about, and as read above),
   * unless something else (another tab, the other party) moved or revised it first.
   */
  const move = async (from: OfferStatus[], set: Partial<typeof offers.$inferInsert>, amount?: number) => {
    const asRead = sql`date_trunc('milliseconds', ${offers.updatedAt}) = ${offer.updatedAt.toISOString()}::timestamptz`;
    const [moved] = await db
      .update(offers)
      .set({ ...set, updatedAt: now })
      .where(and(eq(offers.id, offerId), inArray(offers.status, from), amount == null ? undefined : and(eq(offers.amount, amount), asRead)))
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
    const stale = await changed(amount, from === "pending" ? "offer.changed" : "offer.counterChanged");
    if (stale) return stale;
    if (await acceptOffer(offerId, offer.listingId, from, amount, offer.updatedAt)) return null;
    refresh();
    const [latest] = await db.select({ status: listings.status }).from(listings).where(eq(listings.id, offer.listingId)).limit(1);
    // Still live: this offer itself changed in the meantime (withdrawn, declined, revised).
    return latest?.status === "live" ? unavailable : notLive(latest?.status);
  };

  // An answer our team gives on the seller's behalf goes in the audit trail (src/lib/audit.ts).
  const onSellersBehalf = async (diff: Record<string, unknown>) => {
    if (user.role !== "admin" || row.sellerId === user.id) return;
    await audit({ actorId: user.id, action: "offer.respond", entityType: "offer", entityId: offerId, diff });
  };

  if (action === "accept" && isSeller && offer.status === "pending") {
    const failed = await accept("pending", offer.amount);
    if (failed) return failed;
    await onSellersBehalf({ status: ["pending", "accepted"], amount: offer.amount });
    await toBuyer("offer.accepted", { project, amount: { aed: offer.amount } });
    await dealAgreed(offer.amount);
    await settleOtherOffers(unit, offerId);
  } else if (action === "counter" && isSeller && offer.status === "pending") {
    if (!counterAmount || !Number.isFinite(counterAmount) || counterAmount <= 0) return { error: t("field.counterAmount") };
    if (Math.round(counterAmount) > INT4_MAX) return { error: t("field.amountTooLarge") };
    // A counter is an acceptance waiting on the buyer, so a backup offer can't be countered either.
    if (row.listingStatus !== "live") return notLive(row.listingStatus);
    const stale = await changed(offer.amount, "offer.changed");
    if (stale) return stale;
    const counter = Math.round(counterAmount);
    // A counter asks the buyer for more: at or below their own offer it could only cost the seller (accept it instead).
    if (counter <= offer.amount) return { error: t("field.counterNotAbove", { amount: formatAED(offer.amount, await getLocale()) }) };
    if (!(await move(["pending"], { status: "countered", counterAmount: counter }, offer.amount))) return unavailable;
    await onSellersBehalf({ status: ["pending", "countered"], amount: offer.amount, counterAmount: [null, counter] });
    await toBuyer("offer.countered", { project, original: { aed: offer.amount }, amount: { aed: counter } });
  } else if (action === "decline" && isSeller && offer.status === "pending") {
    const stale = await changed(offer.amount, "offer.changed");
    if (stale) return stale;
    if (!(await move(["pending"], { status: "declined" }, offer.amount))) return unavailable;
    await onSellersBehalf({ status: ["pending", "declined"], amount: offer.amount });
    await toBuyer("offer.declined", { project, amount: { aed: offer.amount } });
  } else if (action === "accept_counter" && isBuyer && offer.status === "countered" && offer.counterAmount) {
    const failed = await accept("countered", offer.counterAmount);
    if (failed) return failed;
    await toSeller("offer.counter_accepted", { project, amount: { aed: offer.counterAmount } });
    await dealAgreed(offer.counterAmount);
    await settleOtherOffers(unit, offerId);
  } else if (action === "decline" && isBuyer && offer.status === "countered") {
    const stale = await changed(offer.counterAmount, "offer.counterChanged");
    if (stale) return stale;
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
      // Without the control characters Postgres can't store (a NUL byte would be a server error).
      name: formText(formData.get("name")) || user?.fullName,
      email: formText(formData.get("email")) || user?.email,
      phone: formText(formData.get("phone")) || user?.phone || undefined,
      message: formText(formData.get("message"), { multiline: true }) || undefined,
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  // Bots first (src/lib/spam.ts): a filled honeypot, or a form token that is missing, forged or under three seconds
  // old, gets the normal thank-you with nothing stored, so a script learns nothing from the answer. A token of ours that
  // ran out is a visitor's tab left open for hours: a clear error, and the form fetches a fresh token for the retry.
  const token = formData.get("formToken");
  if (honeypotTripped(formData)) return { ok: true };
  if (formTokenExpired(token)) return { error: t("form.expired") };
  if (!formTokenOk(token)) return { ok: true };
  const ip = await clientIp();
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), ip))) return { error: t("form.verifyFailed") };
  const v = parsed.data;
  // Per IP, then per address: the contact form is the one scrapers find first, so it gets the lower limits; a buyer
  // asking about several deals in a day is not a bot.
  const contact = v.type === "contact";
  if (!(await hit(`inquiry-ip:${ip}`, contact ? 5 : 10, 60 * MINUTE))) return { error: t("tooMany") };
  if (!(await hit(`inquiry-email:${v.email.toLowerCase()}`, contact ? 3 : 10, DAY))) return { error: t("form.tooManyToday") };

  // A listing deleted while its page was open is no longer linked: the message itself is kept.
  let listing: { projectName: string; refNo: number } | null = null;
  let listingId: string | undefined;
  if (v.listingId) {
    const [l] = await db
      .select({ projectName: listings.projectName, refNo: listings.refNo })
      .from(listings)
      .where(eq(listings.id, v.listingId))
      .limit(1);
    if (l) {
      listing = l;
      listingId = v.listingId;
    }
  }
  // The SEO-pitch kind of message is stored flagged (the admin's Spam tab) and notifies nobody; the sender still sees
  // the thank-you, so there is no hint about what was caught.
  const { score, reasons } = spamScore({ ...v, locale: await getLocale() });
  const spam = score >= SPAM_THRESHOLD;
  await db.insert(inquiries).values({
    ...v,
    listingId,
    userId: user?.id ?? null,
    source: sourceFromForm(formData),
    spam,
    spamReason: spam ? reasons.join("; ") : null,
  });
  if (!spam) await notifyInquiryReceived({ ...v, listing }, [user?.id]);
  return { ok: true };
}

const LIST_FILTERS = ["community", "developer", "type", "motivation"] as const;
const NUMBER_FILTERS = ["minCash", "maxCash", "minTransfer", "maxTransfer", "minPaid", "handoverBy", "minDiscount"] as const;
const MAX_SAVED_SEARCHES = 50;

/**
 * A saved search's filters as a /deals query, rebuilt from what parseFilters (src/lib/listings.ts) accepted: a value it
 * drops (an unknown unit type, a NUL byte in the search text) is never stored. `canonical`: the same deals give the same
 * text (values sorted, the search text in lower case, as it matches), to find a search saved before.
 */
function filtersQuery(f: DealFilters, canonical = false) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", canonical ? f.q.toLowerCase() : f.q);
  for (const k of LIST_FILTERS) {
    const values = [...new Set<string>(f[k])];
    for (const v of canonical ? values.sort() : values) p.append(k, v);
  }
  for (const k of NUMBER_FILTERS) if (f[k] != null) p.set(k, String(f[k]));
  if (f.verified) p.set("verified", "1");
  return p;
}

export async function saveSearch(name: unknown, query: unknown) {
  const user = await getCurrentUser();
  if (!user) return { needsAuth: true };
  const t = await getT("errors");
  // Called from the page, but any signed-in user can call it with anything: the daily alerts job and the saved-searches
  // page run every saved query, so one Postgres can't run would fail them on every run. Only the filters parseFilters
  // accepts are kept, plus the sort and the view the visitor chose ("Open" brings them back).
  const raw = typeof query === "string" ? query.slice(0, 2000) : "";
  const f = filtersFromQuery(raw);
  const clean = filtersQuery(f);
  if (f.sort !== "discount") clean.set("sort", f.sort);
  if (new URLSearchParams(raw).get("view") === "list") clean.set("view", "list");
  // The same deals saved again (a second click, or the alert's own "See matches" page with its sort) would send each
  // daily alert twice: it is the search already saved, whatever its sort, view or page.
  const mine = await db.select({ query: savedSearches.query }).from(savedSearches).where(eq(savedSearches.userId, user.id));
  const key = filtersQuery(f, true).toString();
  if (mine.some((s) => filtersQuery(filtersFromQuery(s.query), true).toString() === key)) return { ok: true, existing: true };
  if (mine.length >= MAX_SAVED_SEARCHES) return { error: t("search.tooMany", { max: MAX_SAVED_SEARCHES }) };
  await db.insert(savedSearches).values({
    userId: user.id,
    name: cleanText(typeof name === "string" ? name : "").trim().slice(0, 80) || t("search.defaultName"),
    query: clean.toString(),
  });
  refresh();
  return { ok: true };
}

export async function deleteSearch(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: (await getT("errors"))("auth.signInAgain") };
  // Not an id: nothing of theirs to delete (as for an id that isn't theirs), not a database error.
  if (!isUuid(id)) return { ok: true };
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
      fullName: formText(formData.get("fullName")),
      phone: formText(formData.get("phone")) || undefined,
      intent: formData.get("intent"),
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  // Once our team has verified a person's identity (KYC), their name is the one it was checked against: the deal file,
  // the NOC stage and the AML export rely on it, so it isn't changed here (our team checks the documents again, setting
  // the KYC status back, and then it can be). Spacing alone isn't a change.
  const sameName = (a: string) => a.trim().replace(/\s+/g, " ") === parsed.data.fullName.replace(/\s+/g, " ");
  const nameLocked = () => {
    const message = t("profile.nameVerified");
    return { error: message, fieldErrors: { fullName: [message] } };
  };
  if (user.kycStatus === "verified" && !sameName(user.fullName)) return nameLocked();
  const values = { fullName: parsed.data.fullName, phone: parsed.data.phone ?? null, intent: parsed.data.intent };
  const [saved] = await db
    .update(users)
    .set(values)
    // …and the same if our team verified the account since it was read: a new name is saved only while it isn't.
    .where(and(eq(users.id, user.id), sameName(user.fullName) ? undefined : ne(users.kycStatus, "verified")))
    .returning({ id: users.id });
  if (!saved) return nameLocked();
  // The person's own change of name or phone, in the History of their listings and deals (src/lib/audit.ts).
  const diff = changes({ fullName: user.fullName, phone: user.phone }, { fullName: values.fullName, phone: values.phone });
  if (Object.keys(diff).length) await audit({ actorId: user.id, action: "user.profile", entityType: "user", entityId: user.id, diff });
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
