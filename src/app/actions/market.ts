"use server";

import { refresh } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inquiries, listings, offers, savedSearches, users, watchlist } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { PUBLIC_STATUSES } from "@/lib/config";
import type { FormState } from "./auth";

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

  const [l] = await db.select({ askingPrice: listings.askingPrice }).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!l) return { error: "This deal is no longer available." };
  await db.insert(watchlist).values({ userId: user.id, listingId, savedPrice: l.askingPrice }).onConflictDoNothing();
  refresh();
  return { watching: true };
}

const offerSchema = z.object({
  listingId: z.uuid(),
  amount: z.coerce.number().int().positive("Enter your offer in AED"),
  financing: z.enum(["cash", "mortgage"]),
  message: z.string().trim().max(1000).optional(),
});

export async function makeOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to make an offer." };

  const parsed = offerSchema.safeParse({
    listingId: formData.get("listingId"),
    amount: formData.get("amount"),
    financing: formData.get("financing") || "cash",
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const [l] = await db
    .select({ sellerId: listings.sellerId, status: listings.status })
    .from(listings)
    .where(eq(listings.id, v.listingId))
    .limit(1);
  if (!l || !PUBLIC_STATUSES.includes(l.status)) return { error: "This deal is no longer taking offers." };
  if (l.sellerId === user.id) return { error: "You can't make an offer on your own listing." };

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

  if (open) {
    await db
      .update(offers)
      .set({
        amount: v.amount,
        financing: v.financing,
        message: v.message ?? null,
        status: "pending",
        counterAmount: null,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, open.id));
  } else {
    await db.insert(offers).values({
      listingId: v.listingId,
      buyerId: user.id,
      amount: v.amount,
      financing: v.financing,
      message: v.message ?? null,
    });
  }
  refresh();
  return { ok: true };
}

type OfferAction = "accept" | "decline" | "counter" | "withdraw" | "accept_counter";

export async function respondToOffer(offerId: string, action: OfferAction, counterAmount?: number) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const [row] = await db
    .select({ offer: offers, sellerId: listings.sellerId, listingStatus: listings.status })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .where(eq(offers.id, offerId))
    .limit(1);
  if (!row) return { error: "Offer not found." };

  const { offer } = row;
  const isSeller = row.sellerId === user.id || user.role === "admin";
  const isBuyer = offer.buyerId === user.id;
  const now = new Date();

  if ((action === "accept" || action === "decline" || action === "counter") && isSeller && offer.status === "pending") {
    if (action === "counter") {
      if (!counterAmount || counterAmount <= 0) return { error: "Enter a counter amount." };
      await db
        .update(offers)
        .set({ status: "countered", counterAmount: Math.round(counterAmount), updatedAt: now })
        .where(eq(offers.id, offerId));
    } else {
      await db
        .update(offers)
        .set({ status: action === "accept" ? "accepted" : "declined", updatedAt: now })
        .where(eq(offers.id, offerId));
      if (action === "accept" && row.listingStatus === "live") {
        await db.update(listings).set({ status: "under_offer", updatedAt: now }).where(eq(listings.id, offer.listingId));
      }
    }
  } else if (action === "accept_counter" && isBuyer && offer.status === "countered" && offer.counterAmount) {
    await db
      .update(offers)
      .set({ status: "accepted", amount: offer.counterAmount, updatedAt: now })
      .where(eq(offers.id, offerId));
    if (row.listingStatus === "live") {
      await db.update(listings).set({ status: "under_offer", updatedAt: now }).where(eq(listings.id, offer.listingId));
    }
  } else if (action === "decline" && isBuyer && offer.status === "countered") {
    await db.update(offers).set({ status: "declined", updatedAt: now }).where(eq(offers.id, offerId));
  } else if (action === "withdraw" && isBuyer && ["pending", "countered"].includes(offer.status)) {
    await db.update(offers).set({ status: "withdrawn", updatedAt: now }).where(eq(offers.id, offerId));
  } else {
    return { error: "That action isn't available for this offer." };
  }

  refresh();
  return { ok: true };
}

const inquirySchema = z.object({
  listingId: z.uuid().optional(),
  type: z.enum(["info", "viewing", "contact"]),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function createInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const parsed = inquirySchema.safeParse({
    listingId: formData.get("listingId") || undefined,
    type: formData.get("type") || "info",
    name: formData.get("name") || user?.fullName,
    email: formData.get("email") || user?.email,
    phone: formData.get("phone") || user?.phone || undefined,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await db.insert(inquiries).values({ ...parsed.data, userId: user?.id ?? null });
  return { ok: true };
}

export async function saveSearch(name: string, query: string) {
  const user = await getCurrentUser();
  if (!user) return { needsAuth: true };
  const clean = new URLSearchParams(query);
  clean.delete("page");
  await db.insert(savedSearches).values({
    userId: user.id,
    name: name.trim().slice(0, 80) || "My search",
    query: clean.toString(),
  });
  refresh();
  return { ok: true };
}

export async function deleteSearch(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)));
  refresh();
  return { ok: true };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  phone: z.string().trim().max(30).optional(),
  intent: z.enum(["buy", "sell", "both"]),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    intent: formData.get("intent"),
  });
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
  if (!user) return { error: "Please sign in again." };
  if (user.kycStatus === "not_started") {
    await db.update(users).set({ kycStatus: "pending" }).where(eq(users.id, user.id));
  }
  refresh();
  return { ok: true };
}
