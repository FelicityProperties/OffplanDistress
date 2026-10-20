"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listings, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { COMMUNITIES, DEVELOPERS, UNIT_TYPES } from "@/lib/config";
import type { FormState } from "./auth";

const money = z.coerce.number().int("Whole dirhams only").nonnegative();
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date");

const instalment = z.object({
  label: z.string().trim().min(1).max(80),
  dueDate: z.string().nullable(),
  amount: z.number().int().nonnegative(),
});

const listingSchema = z
  .object({
    projectName: z.string().trim().min(2, "Project name is required").max(120),
    developer: z.string().refine((v) => DEVELOPERS.includes(v), "Pick a developer"),
    community: z.string().refine((v) => COMMUNITIES.includes(v), "Pick a community"),
    unitType: z.enum(Object.keys(UNIT_TYPES) as [keyof typeof UNIT_TYPES, ...(keyof typeof UNIT_TYPES)[]]),
    sizeSqft: z.coerce.number().int().positive("Enter the size in sqft"),
    floor: z.string().trim().max(40).optional(),
    view: z.string().trim().max(80).optional(),
    originalPrice: money.positive("Enter the SPA price"),
    amountPaid: money,
    askingPrice: money,
    handoverDate: optionalDate,
    nextInstalmentDate: optionalDate,
    nextInstalmentAmount: z.coerce.number().int().nonnegative().optional(),
    motivation: z.enum(["urgent", "motivated", "flexible"]),
    description: z.string().trim().max(3000).optional(),
    paymentPlan: z.array(instalment).max(60),
  })
  .refine((v) => v.amountPaid <= v.originalPrice, {
    path: ["amountPaid"],
    message: "Amount paid can't exceed the purchase price",
  });

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
    motivation: formData.get("motivation") || "motivated",
    description: opt("description"),
    paymentPlan: plan,
  };
}

export type CreateListingState = FormState & { listingId?: string; refNo?: number };

export async function createListing(_prev: CreateListingState, formData: FormData): Promise<CreateListingState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to list your unit." };

  const parsed = listingSchema.safeParse(readListingForm(formData));
  if (!parsed.success) {
    return { error: "Some details need fixing.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
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
    })
    .returning({ id: listings.id, refNo: listings.refNo });

  return { ok: true, listingId: row.id, refNo: row.refNo };
}

const sellerEditSchema = z.object({
  askingPrice: money,
  motivation: z.enum(["urgent", "motivated", "flexible"]),
  description: z.string().trim().max(3000).optional(),
  nextInstalmentDate: optionalDate,
  nextInstalmentAmount: z.coerce.number().int().nonnegative().optional(),
});

export async function updateMyListing(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const id = String(formData.get("listingId") ?? "");

  const [existing] = await db
    .select({ status: listings.status, sellerId: listings.sellerId })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!existing || existing.sellerId !== user.id) return { error: "Listing not found." };
  if (existing.status === "transferred") return { error: "This unit has already been transferred." };

  const parsed = sellerEditSchema.safeParse({
    askingPrice: formData.get("askingPrice"),
    motivation: formData.get("motivation"),
    description: formData.get("description") || undefined,
    nextInstalmentDate: formData.get("nextInstalmentDate") || undefined,
    nextInstalmentAmount: formData.get("nextInstalmentAmount") || undefined,
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await db
    .update(listings)
    .set({
      askingPrice: parsed.data.askingPrice,
      motivation: parsed.data.motivation,
      description: parsed.data.description ?? null,
      nextInstalmentDate: parsed.data.nextInstalmentDate,
      nextInstalmentAmount: parsed.data.nextInstalmentAmount ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(listings.id, id), eq(listings.sellerId, user.id)));
  refresh();
  return { ok: true };
}

/** Seller-side status changes: pause, resume, withdraw. Everything else is done by our team. */
export async function setMyListingStatus(listingId: string, action: "pause" | "resume" | "withdraw") {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const [l] = await db
    .select({ status: listings.status, verified: listings.verified, sellerId: listings.sellerId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!l || l.sellerId !== user.id) return { error: "Listing not found." };

  let next: (typeof listings.$inferSelect)["status"] | null = null;
  if (action === "pause" && l.status === "live") next = "paused";
  if (action === "resume" && l.status === "paused") next = l.verified ? "live" : "pending_review";
  if (action === "withdraw" && !["transferred", "noc_in_progress", "withdrawn"].includes(l.status)) next = "withdrawn";
  if (!next) return { error: "That change isn't available for this listing right now." };

  await db.update(listings).set({ status: next, updatedAt: new Date() }).where(eq(listings.id, listingId));
  refresh();
  return { ok: true };
}
