"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inquiries, listings, sessions, users } from "@/db/schema";
import { getCurrentUser, hashPassword, isOwnerEmail } from "@/lib/auth";
import { LISTING_STATUS, type ListingStatusKey } from "@/lib/config";
import type { FormState } from "./auth";

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Not authorised");
  return user;
}

export async function approveListing(listingId: string) {
  await assertAdmin();
  const now = new Date();
  await db
    .update(listings)
    .set({ status: "live", verified: true, publishedAt: now, rejectionReason: null, updatedAt: now })
    .where(eq(listings.id, listingId));
  refresh();
  return { ok: true };
}

export async function rejectListing(listingId: string, reason: string) {
  await assertAdmin();
  await db
    .update(listings)
    .set({ status: "rejected", rejectionReason: reason.trim().slice(0, 1000) || null, updatedAt: new Date() })
    .where(eq(listings.id, listingId));
  refresh();
  return { ok: true };
}

const statuses = Object.keys(LISTING_STATUS) as [ListingStatusKey, ...ListingStatusKey[]];

const adminEditSchema = z.object({
  listingId: z.uuid(),
  status: z.enum(statuses),
  verified: z.boolean(),
  nocEligible: z.boolean(),
  launchPrice: z.coerce.number().int().nonnegative().optional(),
  askingPrice: z.coerce.number().int().nonnegative(),
  adminNotes: z.string().trim().max(4000).optional(),
  images: z.array(z.string().max(500)).max(20),
});

export async function adminUpdateListing(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const parsed = adminEditSchema.safeParse({
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
  });
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const [current] = await db.select({ publishedAt: listings.publishedAt }).from(listings).where(eq(listings.id, v.listingId));
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
      publishedAt: current?.publishedAt ?? (v.status === "live" ? now : null),
      updatedAt: now,
    })
    .where(eq(listings.id, v.listingId));
  refresh();
  return { ok: true };
}

export async function setKycStatus(userId: string, status: "not_started" | "pending" | "verified") {
  await assertAdmin();
  await db.update(users).set({ kycStatus: status }).where(eq(users.id, userId));
  refresh();
  return { ok: true };
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const me = await assertAdmin();
  if (me.id === userId && role !== "admin") return { error: "You can't remove your own admin access." };
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (target && isOwnerEmail(target.email) && role !== "admin") return { error: "Owner accounts are always admins." };
  await db.update(users).set({ role }).where(eq(users.id, userId));
  refresh();
  return { ok: true };
}

/** No email service yet, so admins hand a temporary password to the user directly. */
export async function resetUserPassword(userId: string) {
  await assertAdmin();
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!target) return { error: "User not found." };
  if (isOwnerEmail(target.email)) return { error: "The owner's password is set by ADMIN_PASSWORD in Vercel." };
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
