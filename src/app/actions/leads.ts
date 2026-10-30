"use server";

import { randomInt, randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sellerLeads } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import type { TFn, TKey } from "@/i18n/translator";
import { sourceFromForm } from "@/lib/attribution";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { DEVELOPERS } from "@/lib/config";
import { leadCode, quarterEndOf, sellerEstimate } from "@/lib/estimate";
import { formatPct } from "@/lib/format";
import { notifyAdmins, type TemplateParam } from "@/lib/notify";
import { formTokenExpired, formTokenOk, honeypotTripped, pitchIn, verifyTurnstile } from "@/lib/spam";
import { clientIp, DAY, hit, MINUTE } from "@/lib/throttle";
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
  // Bots first (src/lib/spam.ts): a filled honeypot or a bad form token gets the thank-you, with a reference that
  // exists nowhere, and nothing is stored or sent. A token of ours that ran out is a visitor's page left open for hours:
  // a clear error (the form fetches a fresh token for the retry), never the silent thank-you.
  const token = formData.get("formToken");
  const silent = (): SellerLeadState => ({ ok: true, id: randomUUID(), ref: leadCode(10_000 + randomInt(90_000)), urgent: false });
  if (honeypotTripped(formData)) return silent();
  if (formTokenExpired(token)) return { error: t("form.expired") };
  if (!formTokenOk(token)) return silent();
  const ip = await clientIp();
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), ip))) return { error: t("form.verifyFailed") };
  const v = parsed.data;
  // The SEO pitch, or a link, where the name or the project should be: the lead would reach the team's inbox as a
  // "new seller lead" notice, so it gets the bots' thank-you too.
  if (pitchIn([v.name, v.project, v.developerOther].filter(Boolean).join(" "))) return silent();
  // Per IP, then per number (a lead has no address of its own): the estimate is open to anyone, once in a while.
  const digits = v.phone.replace(/\D/g, "");
  if (!(await hit(`lead-ip:${ip}`, 5, 60 * MINUTE)) || !(await hit(`lead-phone:${digits}`, 3, DAY))) {
    return { error: ts("estimate.error.tooMany"), throttled: true };
  }

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

/** The lead's status and notes before an admin changes them, for the audit trail (src/lib/audit.ts). */
async function leadBefore(id: string) {
  const [row] = await db.select({ status: sellerLeads.status, notes: sellerLeads.notes }).from(sellerLeads).where(eq(sellerLeads.id, id)).limit(1);
  return row;
}

export async function setLeadStatus(id: string, status: (typeof STATUSES)[number]) {
  const me = await assertAdmin();
  if (!STATUSES.includes(status) || !z.uuid().safeParse(id).success) return { error: (await getT("errors"))("field.invalid") };
  const before = await leadBefore(id);
  await db.update(sellerLeads).set({ status, updatedAt: new Date() }).where(eq(sellerLeads.id, id));
  if (before && before.status !== status) {
    await audit({ actorId: me.id, action: "lead.status", entityType: "lead", entityId: id, diff: { status: [before.status, status] } });
  }
  refresh();
  return { ok: true };
}

export async function saveLeadNotes(id: string, notes: string) {
  const me = await assertAdmin();
  if (!z.uuid().safeParse(id).success) return { error: (await getT("errors"))("field.invalid") };
  const before = await leadBefore(id);
  const next = notes.trim().slice(0, 3000) || null;
  await db.update(sellerLeads).set({ notes: next, updatedAt: new Date() }).where(eq(sellerLeads.id, id));
  if (before && (before.notes ?? null) !== next) {
    // Who edited the notes and when, not what they say: audit rows are kept for good, while a lead that never became an
    // account or a listing is deleted after 24 months (src/lib/analytics.ts purgeExpiredData), notes included.
    await audit({
      actorId: me.id,
      action: "lead.notes",
      entityType: "lead",
      entityId: id,
      diff: { notesLength: [before.notes?.length ?? 0, next?.length ?? 0] },
    });
  }
  refresh();
  return { ok: true };
}
