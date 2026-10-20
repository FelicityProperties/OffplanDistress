"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listings, users } from "@/db/schema";
import { getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translator";
import { getCurrentUser } from "@/lib/auth";
import { COMMUNITIES, DEVELOPERS, PUBLIC_STATUSES, UNIT_TYPES } from "@/lib/config";
import { refCode } from "@/lib/format";
import { notifyAdmins, notifyPriceDrop } from "@/lib/notify";
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

const money = (t: T) => z.coerce.number().int(t("field.wholeDirhams")).nonnegative();
const optionalDate = (t: T) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v), t("field.date"));

const instalment = z.object({
  label: z.string().trim().min(1).max(80),
  dueDate: z.string().nullable(),
  amount: z.number().int().nonnegative(),
});

const listingSchema = (t: T) =>
  z
    .object({
      projectName: z.string().trim().min(2, t("field.projectName")).max(120),
      developer: z.string().refine((v) => DEVELOPERS.includes(v), t("field.developer")),
      community: z.string().refine((v) => COMMUNITIES.includes(v), t("field.community")),
      unitType: z.enum(Object.keys(UNIT_TYPES) as [keyof typeof UNIT_TYPES, ...(keyof typeof UNIT_TYPES)[]], t("field.unitType")),
      sizeSqft: z.coerce.number(t("field.size")).int(t("field.size")).positive(t("field.size")),
      floor: z.string().trim().max(40).optional(),
      view: z.string().trim().max(80).optional(),
      originalPrice: money(t).positive(t("field.spaPrice")),
      amountPaid: money(t),
      askingPrice: money(t),
      handoverDate: optionalDate(t),
      nextInstalmentDate: optionalDate(t),
      nextInstalmentAmount: z.coerce.number().int().nonnegative().optional(),
      motivation: z.enum(["urgent", "motivated", "flexible"]),
      description: z.string().trim().max(3000).optional(),
      paymentPlan: z.array(instalment).max(60),
    })
    .refine((v) => v.amountPaid <= v.originalPrice, {
      path: ["amountPaid"],
      message: t("field.amountPaidMax"),
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
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInToList") };

  const parsed = listingSchema(t).safeParse(readListingForm(formData), { error: fallbackErrors(t) });
  if (!parsed.success) {
    return { error: t("form.fixDetails"), fieldErrors: z.flattenError(parsed.error).fieldErrors };
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

  await notifyAdmins(
    "listing.submitted",
    { project: v.projectName, seller: user.fullName, ref: refCode(row.refNo) },
    `/admin/listings/${row.id}`,
    { except: [user.id] },
  );

  return { ok: true, listingId: row.id, refNo: row.refNo };
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
    })
    .from(listings)
    .where(eq(listings.id, id))
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

  // Watchers only hear about drops on deals they can actually open (and never on sample listings).
  if (!existing.isSample && PUBLIC_STATUSES.includes(existing.status)) {
    await notifyPriceDrop({ id, projectName: existing.projectName, refNo: existing.refNo, sellerId: existing.sellerId }, existing.askingPrice, parsed.data.askingPrice);
  }
  refresh();
  return { ok: true };
}

/** Seller-side status changes: pause, resume, withdraw. Everything else is done by our team. */
export async function setMyListingStatus(listingId: string, action: "pause" | "resume" | "withdraw") {
  const t = await getT("errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("auth.signInAgain") };
  const [l] = await db
    .select({ status: listings.status, verified: listings.verified, sellerId: listings.sellerId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!l || l.sellerId !== user.id) return { error: t("listing.notFound") };

  let next: (typeof listings.$inferSelect)["status"] | null = null;
  if (action === "pause" && l.status === "live") next = "paused";
  if (action === "resume" && l.status === "paused") next = l.verified ? "live" : "pending_review";
  if (action === "withdraw" && !["transferred", "noc_in_progress", "withdrawn"].includes(l.status)) next = "withdrawn";
  if (!next) return { error: t("listing.changeUnavailable") };

  await db.update(listings).set({ status: next, updatedAt: new Date() }).where(eq(listings.id, listingId));
  refresh();
  return { ok: true };
}
