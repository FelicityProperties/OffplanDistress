import { z } from "zod";
import type { TFn } from "@/i18n/translator";
import { COMMUNITIES, DEVELOPERS, UNIT_TYPES } from "./config";
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
    if (iss.code === "too_small" && iss.origin === "number") return t("field.notNegative");
    if (iss.code === "invalid_type" && iss.expected === "number") return t("field.number");
    return t("field.invalid");
  };
}

export const money = (t: T) => z.coerce.number().int(t("field.wholeDirhams")).nonnegative();
export const optionalDate = (t: T) =>
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
      // The seller's own figure for instalments past due and unpaid (sell form, when they report missed ones). Our team
      // checks it against the statement of account; until then buyers see it as "being checked".
      overdueAmount: money(t).optional(),
      motivation: z.enum(["urgent", "motivated", "flexible"]),
      description: z.string().trim().max(3000).optional(),
      paymentPlan: z.array(instalment).max(60),
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
