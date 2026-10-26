"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sellerLeads } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import type { TFn, TKey } from "@/i18n/translator";
import { sourceFromForm } from "@/lib/attribution";
import { getCurrentUser } from "@/lib/auth";
import { DEVELOPERS } from "@/lib/config";
import { leadCode, quarterEndOf, sellerEstimate } from "@/lib/estimate";
import { formatPct } from "@/lib/format";
import { notifyAdmins, type TemplateParam } from "@/lib/notify";
import { clientIp, hit, MINUTE } from "@/lib/throttle";
import type { FormState } from "./auth";

type T = TFn<"errors">;
type TS = TFn<"sell">;

/** Messages for checks that don't carry their own, in the request's language. */
function fallbackErrors(t: T): z.core.$ZodErrorMap {
  return (iss) => {
    if (iss.code === "too_big" && iss.origin === "string") return t("field.tooLong", { max: Number(iss.maximum) });
    if (iss.code === "invalid_type" && iss.expected === "number") return t("field.number");
    return t("field.invalid");
  };
}

// int4 columns; no off-plan unit comes close.
const MAX_AED = 2_000_000_000;

const leadSchema = (t: T, ts: TS) =>
  z
    .object({
      name: z.string(ts("estimate.error.name")).trim().min(2, ts("estimate.error.name")).max(120),
      phone: z
        .string(ts("error.phone"))
        .trim()
        // Arabic-Indic / Persian digits from an Arabic keyboard → Latin, so the number can be dialled and WhatsApped.
        .overwrite((v) => v.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10)))
        .max(30)
        .refine((v) => v.replace(/\D/g, "").length >= 7, ts("error.phone")),
      developer: z.string(t("field.developer")).refine((v) => DEVELOPERS.includes(v), t("field.developer")),
      developerOther: z.string().trim().max(80).optional(),
      project: z.string().trim().max(120).optional(),
      spaPrice: z.coerce.number(t("field.spaPrice")).int(t("field.wholeDirhams")).positive(t("field.spaPrice")).max(MAX_AED),
      amountPaid: z.coerce.number(t("field.number")).int(t("field.wholeDirhams")).nonnegative(t("field.notNegative")).max(MAX_AED),
      marketPrice: z.coerce.number().int().positive().max(MAX_AED).optional(),
      // A real quarter-end date ("2027-12-31"), as the picker offers: "2027-13-45" would show as "QNaN NaN" to our team.
      handoverQuarter: z
        .string(ts("error.handover"))
        .regex(/^20\d{2}-\d{2}-\d{2}$/, ts("error.handover"))
        .refine((v) => quarterEndOf(v) === v, ts("error.handover")),
      missed: z.enum(["none", "one", "more"]),
      defaultNotice: z.enum(["yes", "no"]),
    })
    .refine((v) => v.amountPaid <= v.spaPrice, { path: ["amountPaid"], message: t("field.amountPaidMax") })
    .refine((v) => v.developer !== "Other" || (v.developerOther ?? "").length >= 2, {
      path: ["developerOther"],
      message: t("field.developerOther"),
    });

export type SellerLeadState = FormState & { id?: string; ref?: string; urgent?: boolean; throttled?: boolean };

/** The free estimate's second step: no account needed. Five per IP per hour. */
export async function createSellerLead(_prev: SellerLeadState, formData: FormData): Promise<SellerLeadState> {
  const [t, ts] = await Promise.all([getT("errors"), getT("sell")]);
  const opt = (k: string) => {
    const v = formData.get(k);
    return v == null || v === "" ? undefined : String(v);
  };
  const parsed = leadSchema(t, ts).safeParse(
    {
      name: formData.get("name"),
      phone: formData.get("phone"),
      developer: formData.get("developer"),
      developerOther: opt("developerOther"),
      project: opt("project"),
      spaPrice: formData.get("spaPrice"),
      amountPaid: formData.get("amountPaid") || 0,
      marketPrice: opt("marketPrice"),
      handoverQuarter: formData.get("handoverQuarter"),
      missed: formData.get("missed") || "none",
      defaultNotice: formData.get("defaultNotice") || "no",
    },
    { error: fallbackErrors(t) },
  );
  if (!parsed.success) return { error: t("form.fixDetails"), fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await hit(`lead-ip:${await clientIp()}`, 5, 60 * MINUTE))) return { error: ts("estimate.error.tooMany"), throttled: true };

  const v = parsed.data;
  const user = await getCurrentUser();
  const developer = v.developer === "Other" ? v.developerOther! : v.developer;
  const defaultNotice = v.defaultNotice === "yes";
  const [row] = await db
    .insert(sellerLeads)
    .values({
      name: v.name,
      phone: v.phone,
      email: user?.email ?? null,
      locale: await getLocale(),
      developer,
      project: v.project ?? null,
      spaPrice: v.spaPrice,
      amountPaid: v.amountPaid,
      marketPrice: v.marketPrice ?? null,
      handoverQuarter: v.handoverQuarter,
      missed: v.missed,
      defaultNotice,
      source: sourceFromForm(formData),
      userId: user?.id ?? null,
    })
    .returning({ id: sellerLeads.id, refNo: sellerLeads.refNo });

  const urgent = defaultNotice || v.missed === "more";
  const est = sellerEstimate(v.spaPrice, v.amountPaid, v.marketPrice ?? null);
  const word = (key: TKey<"sell">, vars?: Record<string, number>): TemplateParam => ({ t: "sell", key, vars });
  const hd = new Date(v.handoverQuarter);
  const listed = DEVELOPERS.includes(developer) && developer !== "Other";
  await notifyAdmins(
    "lead.seller",
    {
      urgent: urgent ? word("estimate.notify.urgent") : "",
      ref: leadCode(row.refNo),
      // Project names read the same in both languages; without one, the developer's name in each admin's language.
      project: v.project ?? (listed ? { t: "common", key: `developer.${developer}` as TKey<"common"> } : developer),
      name: v.name,
      phone: v.phone,
      price: { aed: v.spaPrice },
      paid: { aed: v.amountPaid },
      pct: formatPct(est.paidPct),
      handover: Number.isNaN(hd.getTime())
        ? v.handoverQuarter
        : word(`estimate.notify.q${Math.floor(hd.getUTCMonth() / 3) + 1}` as TKey<"sell">, { year: hd.getUTCFullYear() }),
      missed: word(`estimate.notify.missed.${v.missed}`),
      notice: word(defaultNotice ? "estimate.notify.notice.yes" : "estimate.notify.notice.no"),
      low: { aed: est.low },
      high: { aed: est.high },
    },
    "/admin/leads",
    { except: [user?.id] },
  );
  return { ok: true, id: row.id, ref: leadCode(row.refNo), urgent };
}

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error((await getT("errors"))("auth.notAuthorised"));
  return user;
}

const STATUSES = ["new", "contacted", "converted", "lost"] as const;

export async function setLeadStatus(id: string, status: (typeof STATUSES)[number]) {
  await assertAdmin();
  if (!STATUSES.includes(status) || !z.uuid().safeParse(id).success) return { error: (await getT("errors"))("field.invalid") };
  await db.update(sellerLeads).set({ status, updatedAt: new Date() }).where(eq(sellerLeads.id, id));
  refresh();
  return { ok: true };
}

export async function saveLeadNotes(id: string, notes: string) {
  await assertAdmin();
  if (!z.uuid().safeParse(id).success) return { error: (await getT("errors"))("field.invalid") };
  await db
    .update(sellerLeads)
    .set({ notes: notes.trim().slice(0, 3000) || null, updatedAt: new Date() })
    .where(eq(sellerLeads.id, id));
  refresh();
  return { ok: true };
}
