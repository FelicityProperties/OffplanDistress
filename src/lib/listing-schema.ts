import { z } from "zod";
import type { TFn } from "@/i18n/translator";
import { COMMUNITIES, DEVELOPERS, FORM_UNIT_TYPES } from "./config";
import { formatNumber } from "./format";
import { scrubTypedName } from "./typed-names";

// The listing fields and their rules, shared by the sell form (createListing), staff intake (parseListingFields) and the
// bulk import (src/app/actions/import.ts, and its preview in the browser). Plain module, not a "use server" file, so the
// import page can check a file's units with the same rules before anything is sent.

type T = TFn<"errors">;

/** Messages for checks that don't carry their own, in the request's language. */
export function fallbackErrors(t: T): z.core.$ZodErrorMap {
  return (iss) => {
    if (iss.code === "too_big" && iss.origin === "string") return t("field.tooLong", { max: Number(iss.maximum) });
    if (iss.code === "too_big" && iss.origin === "array") return t("field.tooMany", { max: Number(iss.maximum) });
    // A figure past what the column holds (INT4_MAX below): extra zeros typed by mistake.
    if (iss.code === "too_big" && iss.origin === "number") return t("field.amountTooLarge");
    if (iss.code === "too_small" && iss.origin === "number") return t("field.notNegative");
    if (iss.code === "invalid_type" && iss.expected === "number") return t("field.number");
    return t("field.invalid");
  };
}

/** The largest whole number the listing's columns (Postgres integer) hold: more is a typing mistake, not a refused save. */
const INT4_MAX = 2_147_483_647;

export const money = (t: T) => z.coerce.number().int(t("field.wholeDirhams")).nonnegative().max(INT4_MAX);

/**
 * The most instalments a listing's payment plan holds: ten years of monthly payments. Developers' post-handover plans
 * run long (1% a month to handover, then 0.5% a month for five more years is about 100 rows). The build-time import
 * (scripts/import-partner-stock.mjs checkListing) and the DistressStock sync (sync-distressstock.mjs) repeat the figure.
 */
export const PLAN_MAX_ROWS = 120;

/**
 * A listing's date as the sell form's date inputs take it (DATE_RANGE in src/components/sell/SellForm.tsx), checked
 * again here for a post that skipped the browser: YYYY-MM-DD, a real calendar day ("2027-02-31" is not) and a year
 * from 2000 to 9999 ("0277-03-15" is a typo).
 */
export function isListingDay(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m || v < "2000-01-01" || v > "9999-12-31") return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const day = new Date(Date.UTC(y, mo - 1, d));
  return day.getUTCFullYear() === y && day.getUTCMonth() === mo - 1 && day.getUTCDate() === d;
}

export const optionalDate = (t: T) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v == null || isListingDay(v), t("field.date"));

const instalment = (t: T) =>
  z.object({
    label: z.string().trim().min(1).max(80),
    // A day or none, as optionalDate: a date input lets a five-digit year through ("20277-03-15"), which would be
    // stored, then read as undated and shown as "Invalid Date".
    dueDate: z
      .string()
      .trim()
      .transform((v) => v || null)
      .refine((v) => v == null || isListingDay(v), t("field.planDueDate"))
      .nullable(),
    amount: z.number().int().nonnegative().max(INT4_MAX),
  });

export const listingSchema = (t: T) =>
  z
    .object({
      projectName: z.string().trim().min(2, t("field.projectName")).max(120),
      developer: z.string().refine((v) => DEVELOPERS.includes(v), t("field.developer")),
      community: z.string().refine((v) => COMMUNITIES.includes(v), t("field.community")),
      // The name the seller typed when they picked "Other": our team needs the developer for the NOC, and buyers
      // see it instead of "Other".
      developerOther: z.string().trim().max(80).optional(),
      communityOther: z.string().trim().max(80).optional(),
      // Not "bulk": a bulk deal comes only through the partner import, with its number of units (FORM_UNIT_TYPES).
      unitType: z.enum(FORM_UNIT_TYPES, t("field.unitType")),
      sizeSqft: z.coerce.number(t("field.size")).int(t("field.size")).positive(t("field.size")).max(INT4_MAX, t("field.size")),
      floor: z.string().trim().max(40).optional(),
      view: z.string().trim().max(80).optional(),
      originalPrice: money(t).positive(t("field.spaPrice")),
      amountPaid: money(t),
      askingPrice: money(t),
      handoverDate: optionalDate(t),
      nextInstalmentDate: optionalDate(t),
      nextInstalmentAmount: z.coerce.number().int().nonnegative().max(INT4_MAX).optional(),
      // The seller's own figure for instalments past due and unpaid (sell form, when they report missed ones). Our team
      // checks it against the statement of account; until then buyers see it as "being checked".
      overdueAmount: money(t).optional(),
      motivation: z.enum(["urgent", "motivated", "flexible"]),
      description: z.string().trim().max(3000).optional(),
      paymentPlan: z.array(instalment(t)).max(PLAN_MAX_ROWS),
    })
    .refine((v) => v.amountPaid <= v.originalPrice, {
      path: ["amountPaid"],
      message: t("field.amountPaidMax"),
    })
    // Overdue instalments are part of what is still owed to the developer.
    .superRefine((v, ctx) => {
      const owed = Math.max(v.originalPrice - v.amountPaid, 0);
      if (v.overdueAmount != null && v.overdueAmount > owed) {
        ctx.addIssue({ code: "custom", path: ["overdueAmount"], message: t("field.overdueMax", { amount: formatNumber(owed) }) });
      }
    })
    // Typed names go public once the listing is approved, so links, emails / handles and phone numbers in them are
    // taken out (the transform below). "Other" needs a name of 2+ characters left after that; a name that was nothing
    // but contact details is refused with a message that says why.
    .superRefine((v, ctx) => {
      for (const k of ["developer", "community"] as const) {
        const typed = scrubTypedName(v[`${k}Other`] ?? "");
        if (v[k] !== "Other" || typed.name.length >= 2) continue;
        const message = typed.removed
          ? t("field.otherNameContact")
          : t(k === "developer" ? "field.developerOther" : "field.communityOther");
        ctx.addIssue({ code: "custom", path: [`${k}Other`], message });
      }
    })
    .transform((v) => ({
      ...v,
      developerOther: v.developerOther && scrubTypedName(v.developerOther).name,
      communityOther: v.communityOther && scrubTypedName(v.communityOther).name,
    }));

export type ListingFields = z.output<ReturnType<typeof listingSchema>>;
