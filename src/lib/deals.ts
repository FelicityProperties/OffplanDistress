import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dealNotes, deals, listings, offers, users, type Deal } from "@/db/schema";
import type { TFn } from "@/i18n/translator";
import { audit, changes } from "./audit";
import { isOwnerEmail } from "./auth";
import { isPlaceholderEmail } from "./claim";
import { whatsappNumber } from "./leads";
import { dubaiToday } from "./permits";

// The deal file (deals table, see schema.ts): from the accepted offer to the DLD transfer. Opened when an offer is
// accepted (startDeal); a deal agreed before the table existed gets its file lazily, from its accepted offer, the
// first time our team opens it or moves it on (ensureDeal), so no deal under way is held up. The stage gates
// (stageGate) only check a status change our team makes from the listing editor.

/** Statuses in which a unit has (or had, once transferred) an agreed deal and so a deal file. */
export const FILE_STATUSES = ["under_offer", "noc_in_progress", "transferred"] as const;
type FileStatus = (typeof FILE_STATUSES)[number];
const FILE_STATUS_SQL = sql.raw(FILE_STATUSES.map((s) => `'${s}'`).join(", "));

export const DEPOSIT_HOLDERS = ["broker", "seller", "trustee", "developer", "other"] as const;
/** "withdrawn_by_team": our team withdrew or rejected the unit (listing editor, review queue) while it was in a deal. */
export const CANCEL_REASONS = ["relisted", "seller_withdrew", "superseded", "withdrawn_by_team"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

const INT_MAX = 2_147_483_647;

/** The unit's open deal, if it has one. */
export async function openDeal(listingId: string): Promise<Deal | null> {
  const [d] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.listingId, listingId), isNull(deals.cancelledAt)))
    .limit(1);
  return d ?? null;
}

/**
 * Inserts the open deal of each unit in a deal status that has none (`listingId`: just that one), from its accepted
 * offer when it has one (buyer, agreed price = the accepted amount) or empty otherwise (a status our team set by hand).
 * A unit our team paused while under offer keeps its accepted offer, so it gets its file too (a deal agreed before deal
 * files existed and paused since would otherwise read as "no deal" at the gates). The unique index on open deals makes
 * a concurrent second insert a no-op. Samples aren't deals.
 */
async function insertMissingDeals(listingId?: string, offerId?: string) {
  await db.execute(sql`
    insert into deals (listing_id, offer_id, buyer_id, seller_id, agreed_price, sale_value, form_a_expires_at)
    select l.id, o.id, o.buyer_id, l.seller_id, o.amount,
           least(o.amount::bigint + greatest(l.original_price - l.amount_paid, 0), ${INT_MAX})::int,
           l.form_a_expires_at
    from listings l
    left join lateral (
      select id, buyer_id, amount from offers
      where listing_id = l.id and status = 'accepted' ${offerId ? sql`and id = ${offerId}` : sql``}
      order by updated_at desc limit 1
    ) o on true
    where (l.status in (${FILE_STATUS_SQL}) or (l.status = 'paused' and o.id is not null)) and not l.is_sample
      ${listingId ? sql`and l.id = ${listingId}` : sql``}
      and not exists (select 1 from deals d where d.listing_id = l.id and d.cancelled_at is null)
    on conflict do nothing`);
}

/**
 * The deal file of a unit in a deal status (under offer, NOC in progress, transferred, or paused with an accepted
 * offer), created from its accepted offer if it has none yet; null for any other unit without an open deal, and for
 * samples.
 */
export async function ensureDeal(listingId: string): Promise<Deal | null> {
  const existing = await openDeal(listingId);
  if (existing) return existing;
  await insertMissingDeals(listingId);
  return openDeal(listingId);
}

/** Every deal under way gets its file (for the CSV export, which lists them all). */
export async function ensureAllDeals() {
  await insertMissingDeals();
}

/**
 * Right after `offerId` was accepted on the unit: its deal file. acceptOffer only accepts while the unit has no other
 * accepted offer, so a deal still open on it is left over from before and is closed as superseded. Never throws: the
 * acceptance is already saved, and the file is created lazily later if this fails.
 */
export async function startDeal(listingId: string, offerId: string) {
  try {
    const now = new Date();
    await db
      .update(deals)
      .set({ cancelledAt: now, cancelReason: "superseded", updatedAt: now })
      .where(and(eq(deals.listingId, listingId), isNull(deals.cancelledAt), or(isNull(deals.offerId), ne(deals.offerId, offerId))));
    await insertMissingDeals(listingId, offerId);
  } catch (err) {
    console.error(`[deals] opening the deal file for ${listingId} failed`, err);
  }
}

/**
 * The deal on the unit is off (it went back on the market, the seller withdrew or our team took it off the market):
 * its file is closed with the reason and kept. With `whileStatus`, only while the unit is still in that status, checked
 * in the same statement.
 */
export async function cancelOpenDeals(listingId: string, reason: CancelReason, whileStatus?: string) {
  const now = new Date();
  const still = whileStatus
    ? sql`exists (select 1 from ${listings} where ${listings.id} = ${listingId} and ${listings.status} = ${whileStatus})`
    : undefined;
  return db
    .update(deals)
    .set({ cancelledAt: now, cancelReason: reason, updatedAt: now })
    .where(and(eq(deals.listingId, listingId), isNull(deals.cancelledAt), still))
    .returning({ id: deals.id });
}

// ——— Stage gates ——————————————————————————————————————————————————————————————————————————————————————————

/** What a deal file still needs before the unit may move to `next`. */
export type GateNeed = "buyer" | "formF" | "sellerKyc" | "buyerKyc" | "agreedPrice" | "nocIssued" | "transferredAt";

export type GateResult = { ok: true } | { ok: false; noDeal: true } | { ok: false; noDeal?: false; missing: GateNeed[] };

/**
 * Moving a unit to "NOC in progress" needs Form F (the MOU) signed and both parties' KYC verified; to "transferred",
 * the NOC issue date, the DLD transfer date and the agreed price, and, when it skips the NOC stage (straight from under
 * offer, say), what that stage needs as well. Only for a status change made now (the caller checks the status
 * changes), and not for samples (they aren't deals). The file is created lazily if the deal predates it.
 */
export async function stageGate(
  listing: { id: string; sellerId: string; isSample: boolean; status: string },
  next: string,
): Promise<GateResult> {
  if (listing.isSample || (next !== "noc_in_progress" && next !== "transferred")) return { ok: true };
  const deal = await ensureDeal(listing.id);
  if (!deal) return { ok: false, noDeal: true };
  const missing: GateNeed[] = [];
  if (next === "noc_in_progress" || listing.status !== "noc_in_progress") {
    const ids = [listing.sellerId, deal.buyerId].filter((x): x is string => Boolean(x));
    const people = await db.select({ id: users.id, kycStatus: users.kycStatus }).from(users).where(inArray(users.id, ids));
    const kyc = (id: string | null) => people.find((p) => p.id === id)?.kycStatus;
    if (!deal.formFSignedAt) missing.push("formF");
    if (kyc(listing.sellerId) !== "verified") missing.push("sellerKyc");
    if (!deal.buyerId) missing.push("buyer");
    else if (kyc(deal.buyerId) !== "verified") missing.push("buyerKyc");
  }
  if (next === "transferred") {
    if (deal.agreedPrice == null) missing.push("agreedPrice");
    if (!deal.nocIssuedAt) missing.push("nocIssued");
    if (!deal.transferredAt) missing.push("transferredAt");
  }
  return missing.length ? { ok: false, missing } : { ok: true };
}

// ——— The deal file on the admin listing page ————————————————————————————————————————————————————————————————

const verifiers = alias(users, "kyc_verifier");
const authors = alias(users, "note_author");

const partyColumns = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  phone: users.phone,
  role: users.role,
  kycStatus: users.kycStatus,
  kycVerifiedAt: users.kycVerifiedAt,
  kycVerifiedBy: verifiers.fullName,
};

async function party(id: string | null) {
  if (!id) return null;
  const [p] = await db
    .select(partyColumns)
    .from(users)
    .leftJoin(verifiers, eq(verifiers.id, users.kycVerifiedBy))
    .where(eq(users.id, id))
    .limit(1);
  return p ?? null;
}

/** Everything the deal file card shows (admins only): the open deal, both parties, the accepted offer, the notes. */
export async function dealFileData(listing: { id: string; sellerId: string; isSample: boolean }) {
  if (listing.isSample) return null;
  const deal = await ensureDeal(listing.id);
  if (!deal) return null;
  const [buyer, seller, offer, notes, earlier] = await Promise.all([
    party(deal.buyerId),
    party(listing.sellerId),
    deal.offerId
      ? db
          .select({ amount: offers.amount, updatedAt: offers.updatedAt, status: offers.status })
          .from(offers)
          .where(eq(offers.id, deal.offerId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
    db
      .select({ id: dealNotes.id, body: dealNotes.body, createdAt: dealNotes.createdAt, author: authors.fullName })
      .from(dealNotes)
      .leftJoin(authors, eq(authors.id, dealNotes.authorId))
      .where(eq(dealNotes.dealId, deal.id))
      .orderBy(desc(dealNotes.createdAt))
      .limit(100),
    db
      .select({ id: deals.id, cancelledAt: deals.cancelledAt, cancelReason: deals.cancelReason, agreedPrice: deals.agreedPrice })
      .from(deals)
      .where(and(eq(deals.listingId, listing.id), sql`${deals.cancelledAt} is not null`))
      .orderBy(desc(deals.cancelledAt))
      .limit(10),
  ]);
  return { deal, buyer, seller, offer, notes, earlier };
}

export type DealFileData = NonNullable<Awaited<ReturnType<typeof dealFileData>>>;

// ——— Saving the deal file ——————————————————————————————————————————————————————————————————————————————————

type T = TFn<"errors">;

/** The editable fields, in form order. */
export const DEAL_TEXT_FIELDS = [
  "formANo",
  "formBNo",
  "formFNo",
  "cobrokerCompany",
  "cobrokerOrn",
  "cobrokerBrn",
  "cobrokerFormINo",
  "trusteeOffice",
  "invoiceNo",
] as const;
export const DEAL_MONEY_FIELDS = ["agreedPrice", "depositAmount", "nocFee"] as const;
/** Dates of something that has happened: today at the latest. */
export const DEAL_PAST_DATES = [
  "formASignedAt",
  "formBSignedAt",
  "formFSignedAt",
  "nocAppliedAt",
  "nocIssuedAt",
  "transferredAt",
  "commissionPaidAt",
] as const;
/** Dates that may be ahead: an expiry, an appointment. */
export const DEAL_ANY_DATES = ["formAExpiresAt", "nocValidUntil", "transferBookedFor"] as const;

const emptyToUndefined = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function dealFileSchema(t: T, today: string) {
  const text = (max: number) => z.string().trim().max(max, t("field.tooLong", { max })).optional();
  const money = z.coerce
    .number(t("field.number"))
    .int(t("field.wholeDirhams"))
    .nonnegative(t("field.notNegative"))
    .max(INT_MAX, t("field.amountTooLarge"))
    .optional();
  const date = z.iso.date(t("field.date")).refine((d) => d >= "2000-01-01" && d <= "2100-12-31", t("deal.field.dateRange")).optional();
  const past = z.iso
    .date(t("field.date"))
    .refine((d) => d >= "2000-01-01", t("deal.field.dateRange"))
    .refine((d) => d <= today, t("deal.field.future"))
    .optional();
  return z
    .object({
      dealId: z.uuid(),
      listingId: z.uuid(),
      updatedWas: z.string().max(40).optional(),
      agreedPrice: money,
      depositAmount: money,
      nocFee: money,
      depositHeldBy: z.enum(DEPOSIT_HOLDERS, t("field.invalid")).optional(),
      formANo: text(60),
      formBNo: text(60),
      formFNo: text(60),
      cobrokerCompany: text(120),
      cobrokerOrn: text(30),
      cobrokerBrn: text(30),
      cobrokerFormINo: text(60),
      cobrokerSplitPct: z.coerce.number(t("deal.field.splitPct")).int(t("deal.field.splitPct")).min(0, t("deal.field.splitPct")).max(100, t("deal.field.splitPct")).optional(),
      trusteeOffice: text(120),
      invoiceNo: text(60),
      formASignedAt: past,
      formBSignedAt: past,
      formFSignedAt: past,
      nocAppliedAt: past,
      nocIssuedAt: past,
      transferredAt: past,
      commissionPaidAt: past,
      formAExpiresAt: date,
      nocValidUntil: date,
      transferBookedFor: date,
      buyerEmail: z.string().trim().max(200).pipe(z.email(t("field.email"))).optional(),
      // Only for a buyer without an account (found off the platform): their account is created with these.
      buyerName: z.string().trim().min(2, t("deal.field.buyerName")).max(120, t("field.tooLong", { max: 120 })).optional(),
      buyerPhone: z
        .string()
        .trim()
        .max(30, t("field.tooLong", { max: 30 }))
        .refine((p) => whatsappNumber(p) != null, t("admin.sellerPhone"))
        .optional(),
    })
    .superRefine((v, ctx) => {
      if (v.nocValidUntil && v.nocIssuedAt && v.nocValidUntil < v.nocIssuedAt) {
        ctx.addIssue({ code: "custom", path: ["nocValidUntil"], message: t("deal.field.nocValidUntil") });
      }
      if (v.nocIssuedAt && v.nocAppliedAt && v.nocIssuedAt < v.nocAppliedAt) {
        ctx.addIssue({ code: "custom", path: ["nocIssuedAt"], message: t("deal.field.nocIssuedBeforeApplied") });
      }
      // Dates no real deal can have: a transfer before the NOC it needs, a Form A that expired before it was signed.
      if (v.transferredAt && v.nocIssuedAt && v.transferredAt < v.nocIssuedAt) {
        ctx.addIssue({ code: "custom", path: ["transferredAt"], message: t("deal.field.transferBeforeNoc") });
      }
      if (v.formAExpiresAt && v.formASignedAt && v.formAExpiresAt < v.formASignedAt) {
        ctx.addIssue({ code: "custom", path: ["formAExpiresAt"], message: t("deal.field.formAExpiresBeforeSigned") });
      }
    });
}

export type DealFileState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
};

const FORM_KEYS = [
  "dealId",
  "listingId",
  "updatedWas",
  ...DEAL_MONEY_FIELDS,
  "depositHeldBy",
  ...DEAL_TEXT_FIELDS,
  "cobrokerSplitPct",
  ...DEAL_PAST_DATES,
  ...DEAL_ANY_DATES,
  "buyerEmail",
  "buyerName",
  "buyerPhone",
] as const;

/**
 * Saves the deal file from the admin form (`actorId` is the admin, checked by the caller) and records the change in
 * the audit trail. Empty fields are cleared. A deal that fell through can't be changed, and a form opened before
 * someone else saved the file is refused rather than overwriting their change.
 */
export async function saveDealFile(actorId: string, formData: FormData, t: T): Promise<DealFileState> {
  const raw = Object.fromEntries(FORM_KEYS.map((k) => [k, emptyToUndefined(formData.get(k))]));
  const parsed = dealFileSchema(t, dubaiToday()).safeParse(raw, {
    error: (iss) => (iss.code === "invalid_type" && iss.expected === "number" ? t("field.number") : t("field.invalid")),
  });
  if (!parsed.success) return { error: t("form.checkFields"), fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const [row] = await db
    .select({
      deal: deals,
      originalPrice: listings.originalPrice,
      amountPaid: listings.amountPaid,
      sellerId: listings.sellerId,
    })
    .from(deals)
    .innerJoin(listings, eq(listings.id, deals.listingId))
    .where(and(eq(deals.id, v.dealId), eq(deals.listingId, v.listingId)))
    .limit(1);
  if (!row) return { error: t("deal.notFound") };
  const current = row.deal;
  if (current.cancelledAt) return { error: t("deal.cancelled") };
  if (v.updatedWas && v.updatedWas !== current.updatedAt.toISOString()) return { error: t("deal.changed") };

  const remaining = Math.max(row.originalPrice - row.amountPaid, 0);
  const agreedPrice = v.agreedPrice ?? null;
  if (agreedPrice != null && agreedPrice + remaining > INT_MAX) {
    return { error: t("form.checkFields"), fieldErrors: { agreedPrice: [t("field.amountTooLarge")] } };
  }

  // Linking the buyer's account: only for a deal without one (a status set by hand, with no accepted offer). A buyer
  // found off the platform (through a co-broker, say) may have none: given their name, our team creates it here, with
  // no password (they set one with "Forgot password") and never a staff role; their KYC is then verified on Admin →
  // Users as anyone's, and the stage gates are unchanged.
  let buyerId = current.buyerId;
  let newBuyerId: string | null = null;
  if (!current.buyerId && v.buyerEmail) {
    const email = v.buyerEmail.toLowerCase();
    const findBuyer = async () =>
      (
        await db
          .select({ id: users.id, role: users.role, email: users.email })
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1)
      )[0];
    // .invalid addresses are our own placeholders, never a buyer's.
    if (isPlaceholderEmail(email)) return { error: t("form.checkFields"), fieldErrors: { buyerEmail: [t("field.email")] } };
    let buyer = await findBuyer();
    // The owners' addresses are kept for their own (staff) accounts, even before those exist.
    if (!buyer && v.buyerName && !isOwnerEmail(email)) {
      const [created] = await db
        .insert(users)
        .values({ email, fullName: v.buyerName, phone: v.buyerPhone ?? null, passwordHash: null, intent: "buy" })
        .onConflictDoNothing()
        .returning({ id: users.id, role: users.role, email: users.email });
      // Signed up with this email at the same moment: that account is the one checked and linked below.
      buyer = created ?? (await findBuyer());
      if (created) {
        newBuyerId = created.id;
        await audit({
          actorId,
          action: "user.create",
          entityType: "user",
          entityId: created.id,
          diff: { email: [null, email], fullName: [null, v.buyerName], phone: [null, v.buyerPhone ?? null], dealId: current.id },
        });
      }
    }
    if (!buyer && !isOwnerEmail(email)) {
      return {
        error: t("form.checkFields"),
        fieldErrors: { buyerEmail: [t("deal.field.buyerNotFound")], buyerName: v.buyerName ? undefined : [t("deal.field.buyerName")] },
      };
    }
    if (!buyer || buyer.role === "admin" || isOwnerEmail(buyer.email) || buyer.id === row.sellerId) {
      return { error: t("form.checkFields"), fieldErrors: { buyerEmail: [t("deal.field.buyerInvalid")] } };
    }
    buyerId = buyer.id;
  }

  const values = {
    buyerId,
    agreedPrice,
    saleValue: agreedPrice == null ? null : agreedPrice + remaining,
    depositAmount: v.depositAmount ?? null,
    depositHeldBy: v.depositHeldBy ?? null,
    nocFee: v.nocFee ?? null,
    cobrokerSplitPct: v.cobrokerSplitPct ?? null,
    ...Object.fromEntries(DEAL_TEXT_FIELDS.map((k) => [k, v[k] ?? null])),
    ...Object.fromEntries([...DEAL_PAST_DATES, ...DEAL_ANY_DATES].map((k) => [k, v[k] ?? null])),
  } as Partial<Deal>;
  const diff = changes(current as unknown as Record<string, unknown>, values as Record<string, unknown>);
  if (!Object.keys(diff).length) return { ok: true };
  // The trail names the linked buyer's account by its email rather than an id nobody can read.
  if (diff.buyerId) {
    delete diff.buyerId;
    diff.buyerAccount = [null, v.buyerEmail?.toLowerCase() ?? null];
    if (newBuyerId) diff.newBuyerAccount = [null, true];
  }

  const [saved] = await db
    .update(deals)
    .set({ ...values, updatedAt: new Date() })
    // …and only while it is still open (a status change may have closed it since the read above).
    .where(and(eq(deals.id, current.id), isNull(deals.cancelledAt)))
    .returning({ id: deals.id });
  if (!saved) return { error: t("deal.cancelled") };
  await audit({ actorId, action: "deal.update", entityType: "deal", entityId: current.id, diff });
  return { ok: true };
}

/**
 * The open deal's sale value worked out again from the listing, after our team corrected the amount paid to the
 * developer in the listing editor: the agreed price + the balance still owed, as saveDealFile stores it (so the deal
 * file, our fee, the CSV and the fee KPIs follow). Recorded in the audit trail; nothing for a deal without an agreed
 * price.
 */
export async function syncSaleValue(actorId: string, listingId: string) {
  const [row] = await db
    .select({ deal: deals, originalPrice: listings.originalPrice, amountPaid: listings.amountPaid })
    .from(deals)
    .innerJoin(listings, eq(listings.id, deals.listingId))
    .where(and(eq(deals.listingId, listingId), isNull(deals.cancelledAt)))
    .limit(1);
  const agreedPrice = row?.deal.agreedPrice;
  if (!row || agreedPrice == null) return;
  const saleValue = Math.min(agreedPrice + Math.max(row.originalPrice - row.amountPaid, 0), INT_MAX);
  if (saleValue === row.deal.saleValue) return;
  const [saved] = await db
    .update(deals)
    .set({ saleValue, updatedAt: new Date() })
    // Only while open and at the agreed price it was worked out from (a deal-file save may have changed it since).
    .where(and(eq(deals.id, row.deal.id), isNull(deals.cancelledAt), eq(deals.agreedPrice, agreedPrice)))
    .returning({ id: deals.id });
  if (saved) {
    await audit({ actorId, action: "deal.update", entityType: "deal", entityId: row.deal.id, diff: { saleValue: [row.deal.saleValue, saleValue] } });
  }
}

/** Adds one note to the deal file (admins only, checked by the caller). */
export async function addNote(actorId: string, dealId: string, body: string, t: T): Promise<DealFileState> {
  const text = body.trim();
  if (!z.uuid().safeParse(dealId).success) return { error: t("deal.notFound") };
  if (!text) return { error: t("deal.note.empty"), fieldErrors: { body: [t("deal.note.empty")] } };
  if (text.length > 2000) return { error: t("field.tooLong", { max: 2000 }), fieldErrors: { body: [t("field.tooLong", { max: 2000 })] } };
  const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { error: t("deal.notFound") };
  await db.insert(dealNotes).values({ dealId, authorId: actorId, body: text });
  await audit({ actorId, action: "deal.note", entityType: "deal", entityId: dealId, diff: { note: text } });
  return { ok: true };
}

// ——— Milestones on the seller's and the buyer's dashboards ———————————————————————————————————————————————————

/**
 * The dates our team recorded on a deal, for its two parties only: never a name, a contact detail or a figure from
 * the other side.
 */
export type Milestones = {
  acceptedOn: string | null;
  formFSignedAt: string | null;
  nocAppliedAt: string | null;
  nocIssuedAt: string | null;
  transferBookedFor: string | null;
  transferredAt: string | null;
};

const milestoneColumns = {
  createdAt: deals.createdAt,
  formFSignedAt: deals.formFSignedAt,
  nocAppliedAt: deals.nocAppliedAt,
  nocIssuedAt: deals.nocIssuedAt,
  transferBookedFor: deals.transferBookedFor,
  transferredAt: deals.transferredAt,
};

// A moment (an offer accepted at 01:30 in Dubai) is the Dubai calendar day, never the UTC one (still the day before).
const isoDay = (d: Date | string | null) => (d == null ? null : typeof d === "string" ? d.slice(0, 10) : dubaiToday(d));

function toMilestones(d: { createdAt: Date | null; offerAt?: Date | null } & Omit<Milestones, "acceptedOn">): Milestones {
  return {
    acceptedOn: isoDay(d.offerAt ?? d.createdAt),
    formFSignedAt: d.formFSignedAt,
    nocAppliedAt: d.nocAppliedAt,
    nocIssuedAt: d.nocIssuedAt,
    transferBookedFor: d.transferBookedFor,
    transferredAt: d.transferredAt,
  };
}

/** The seller's view of their unit's deal (they must own the listing); null when it has no deal under way. */
export async function sellerMilestones(sellerId: string, listingId: string): Promise<Milestones | null> {
  const [d] = await db
    .select({ ...milestoneColumns, status: listings.status, offerAt: offers.updatedAt })
    .from(deals)
    .innerJoin(listings, eq(listings.id, deals.listingId))
    .leftJoin(offers, eq(offers.id, deals.offerId))
    .where(
      and(
        eq(deals.listingId, listingId),
        eq(listings.sellerId, sellerId),
        isNull(deals.cancelledAt),
        sql`${listings.status} in (${FILE_STATUS_SQL})`,
      ),
    )
    .limit(1);
  return d ? toMilestones(d) : null;
}

/**
 * The buyer's deals under way on units under offer, in NOC or transferred: their accepted offers, and deals our team
 * set by hand and linked to their account (no offer on record), with the milestone dates from the deal file once our
 * team has one for it. Only units whose deal is this buyer's.
 */
export async function buyerDeals(buyerId: string) {
  const rows = await db
    .select({
      offerId: offers.id,
      offerAt: offers.updatedAt,
      dealId: deals.id,
      refNo: listings.refNo,
      projectName: listings.projectName,
      status: listings.status,
      ...milestoneColumns,
    })
    .from(listings)
    .leftJoin(offers, and(eq(offers.listingId, listings.id), eq(offers.buyerId, buyerId), eq(offers.status, "accepted")))
    // The deal file's dates count only when the file is this buyer's (it always is, once linked to their offer).
    .leftJoin(deals, and(eq(deals.listingId, listings.id), isNull(deals.cancelledAt), eq(deals.buyerId, buyerId)))
    .where(and(or(sql`${offers.id} is not null`, sql`${deals.id} is not null`), sql`${listings.status} in (${FILE_STATUS_SQL})`))
    .orderBy(desc(sql`coalesce(${offers.updatedAt}, ${deals.createdAt})`))
    .limit(10);
  return rows.map((r) => ({
    /** The row's key: the accepted offer, or the deal file of a deal set up by hand. */
    id: (r.offerId ?? r.dealId) as string,
    offerId: r.offerId,
    refNo: r.refNo,
    projectName: r.projectName,
    status: r.status as FileStatus,
    milestones: toMilestones({ ...r, createdAt: r.createdAt ?? null }),
  }));
}

// ——— Export ————————————————————————————————————————————————————————————————————————————————————————————————

const sellerUsers = alias(users, "deal_seller");
const buyerUsers = alias(users, "deal_buyer");

/** Every deal file (open, transferred and fallen through), newest first, with both parties, for the CSV export. */
export async function dealsForExport() {
  return db
    .select({
      deal: deals,
      refNo: listings.refNo,
      projectName: listings.projectName,
      developer: listings.developer,
      developerOther: listings.developerOther,
      community: listings.community,
      communityOther: listings.communityOther,
      unitType: listings.unitType,
      listingStatus: listings.status,
      originalPrice: listings.originalPrice,
      amountPaid: listings.amountPaid,
      askingPrice: listings.askingPrice,
      overdueAmount: listings.overdueAmount,
      overduePenalty: listings.overduePenalty,
      arrearsCheckedAt: listings.arrearsCheckedAt,
      sellerName: sellerUsers.fullName,
      sellerEmail: sellerUsers.email,
      sellerPhone: sellerUsers.phone,
      sellerKyc: sellerUsers.kycStatus,
      buyerName: buyerUsers.fullName,
      buyerEmail: buyerUsers.email,
      buyerPhone: buyerUsers.phone,
      buyerKyc: buyerUsers.kycStatus,
    })
    .from(deals)
    .innerJoin(listings, eq(listings.id, deals.listingId))
    .leftJoin(sellerUsers, eq(sellerUsers.id, listings.sellerId))
    .leftJoin(buyerUsers, eq(buyerUsers.id, deals.buyerId))
    .where(eq(listings.isSample, false))
    .orderBy(desc(deals.createdAt))
    .limit(10_000);
}
