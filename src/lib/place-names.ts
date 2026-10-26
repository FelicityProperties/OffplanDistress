import type { TFn, TKey } from "@/i18n/translator";

// Developers and communities are stored as their English name from config.ts; "Other" comes with the name the seller
// typed (listings.developer_other / community_other). These give the name to show, in the viewer's language.

function label(tc: TFn<"common">, prefix: "community" | "developer", name: string, other?: string | null) {
  if (name === "Other" && other?.trim()) return other.trim();
  const key = `${prefix}.${name}` as TKey<"common">;
  const text = tc(key);
  // Names outside the list (older rows, hand-edited data) are shown as entered.
  return text === key ? name : text;
}

/** Arabic/English community name, or the seller's own name for "Other". */
export function communityName(tc: TFn<"common">, name: string, other?: string | null) {
  return label(tc, "community", name, other);
}

/** Arabic/English developer name, or the seller's own name for "Other". */
export function developerName(tc: TFn<"common">, name: string, other?: string | null) {
  return label(tc, "developer", name, other);
}

/**
 * Lower-case, accent-free and Arabic-letter-normalised text for type-to-search matching, so "dubai hills", "Dubaï" and
 * "دبى هيلز" (alef / ya / ta marbuta variants, tashkeel) find the same entry.
 */
export function searchKey(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** "Jumeirah Village Triangle" → "jvt", "DAMAC Hills 2" → "dh2": lets sellers type the usual Dubai abbreviations. */
export function initials(s: string) {
  return s
    .split(/\s+/)
    .map((w) => (/^\d+$/.test(w) ? w : w[0] ?? ""))
    .join("")
    .toLowerCase();
}
