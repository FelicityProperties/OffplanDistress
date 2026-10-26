/**
 * Names a seller types for "Other" (developer, community) are shown on the public listing once it is approved, so
 * anything in them that looks like a way to reach someone — a link, an email address or @handle, a phone number — is
 * taken out on the server before they are stored. Arabic-Indic digits count as digits.
 */

/** Top-level domains seen in pasted links. Real-estate words (properties, homes, estate…) are left out on purpose:
 *  "Acme.Properties" is more likely a name than a link. */
const TLDS =
  "com|net|org|ae|io|co|me|info|biz|app|dev|xyz|online|site|website|store|shop|link|page|tech|ly|gl|ee|to|tv|ai|in|sa|qa|kw|bh|om|eg|jo|lb|pk|uk|eu|us|ru|cn|de|fr|realestate";
const WORD = String.raw`[\p{L}\p{N}](?:[\p{L}\p{N}_-]*[\p{L}\p{N}])?`;
const CONTACT = new RegExp(
  [
    // Links: with a scheme or www., or a bare domain ("acme.ae", "wa.me/971…", "bit.ly/x").
    String.raw`(?:https?:\/\/|www\.)\S*`,
    String.raw`${WORD}(?:\.${WORD})*\.(?:${TLDS})(?![\p{L}\p{N}])(?:[/?#:]\S*)?`,
    // Emails and @handles: any word with an @ in it.
    String.raw`\S*@\S*`,
    // Phone numbers: 7 or more digits, with spaces, dots, dashes, slashes or brackets between them.
    String.raw`(?:\+|00)?\p{Nd}(?:[\s().\-–/]{0,2}\p{Nd}){6,}`,
  ].join("|"),
  "giu",
);
/** Where something was taken out (a character no one types). */
const CUT = "\u0000";
/** "WhatsApp:", "call", "واتساب"… left in front of what was taken out. */
const CUE = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:whats\s?app|wa|call|tel|phone|mobile|mob|contact|e-?mail|mail|web\s?site|site|visit|واتس(?:اب)?|اتصل|اتصال|هاتف|جوال|موبايل|رقم|تواصل|[اإ]يميل|بريد|موقع)\s*[:\-–]?\s*${CUT}`,
  "giu",
);

/** The typed name with links, emails / handles and phone numbers taken out; `removed` says whether any were. */
export function scrubTypedName(raw: string) {
  const marked = raw.replace(CONTACT, CUT);
  if (!marked.includes(CUT)) return { name: raw, removed: false };
  const name = marked
    // "call 050… or 055…" → one cut, then the cue word in front of it.
    .replace(new RegExp(`${CUT}(?:\\s*(?:or|and|/|,|&|و|أو)\\s*${CUT})+`, "giu"), CUT)
    .replace(CUE, CUT)
    .replaceAll(CUT, " ")
    // Brackets emptied by the cut ("Acme ( )"), or left without their other half ("Acme (050) 123…" → "Acme (").
    .replace(/[([{]\s*[)\]}]/g, " ");
  return { name: tidy(dropUnmatched(name)), removed: true };
}

function tidy(s: string) {
  return s
    .replace(/\s+/g, " ")
    // Separators the cut left side by side ("Acme | | Group").
    .replace(/([|,;·•/–—-])(?:\s*[|,;·•/–—-])+/g, "$1")
    // Separators left dangling at either end ("Acme -", "| Acme"); a trailing full stop ("Co.") stays.
    .replace(/^[\s\-–—|,;:/.·•]+|[\s\-–—|,;:/·•]+$/gu, "");
}

/** Removes a "(" that is never closed and a ")" that was never opened. */
function dropUnmatched(s: string) {
  const out = [...s];
  const open: number[] = [];
  out.forEach((c, i) => {
    if (c === "(") open.push(i);
    else if (c === ")" && open.pop() === undefined) out[i] = "";
  });
  for (const i of open) out[i] = "";
  return out.join("");
}

/** What contactKinds can find in a text. */
export type ContactKind = "phone" | "email" | "link" | "handle";

// Longer texts (a listing's description and "view") are only checked, never changed: prices, sizes, plot and unit
// numbers are digits too, so a phone number is judged by its shape here, and stricter than in scrubTypedName.
const LONG_EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+|\b(?:gmail|hotmail|yahoo|outlook|icloud)\s*(?:\.|dot|نقطة)\s*com\b/giu;
/** wa.me / t.me links and @handles (Instagram, Telegram…) that aren't part of an email address. */
const HANDLE = new RegExp(
  String.raw`(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me)(?:\/\S*)?|(?<![\p{L}\p{N}._%+-])@[\p{L}\p{N}_.]{2,}`,
  "giu",
);
const LINK = new RegExp(
  [String.raw`(?:https?:\/\/|www\.)\S+`, String.raw`${WORD}(?:\.${WORD})*\.(?:${TLDS})(?![\p{L}\p{N}])(?:[/?#:]\S*)?`].join("|"),
  "giu",
);
/** 7+ digits with up to three spaces, dots, dashes, slashes or brackets between them ("050 - 123 - 4567"). */
const DIGIT_RUN = /(?:\+|00)?\p{Nd}(?:[\s().\-–/]{0,3}\p{Nd}){6,}/gu;
/** Zero of each digit block people type in: ASCII, Arabic-Indic, Extended Arabic-Indic (Persian/Urdu), Devanagari. */
const ZEROS = [0x30, 0x660, 0x6f0, 0x966];

function asciiDigits(s: string) {
  let out = "";
  for (const ch of s) {
    if (!/\p{Nd}/u.test(ch)) continue;
    const cp = ch.codePointAt(0)!;
    const zero = ZEROS.find((z) => cp >= z && cp <= z + 9);
    out += zero === undefined ? "1" : String(cp - zero);
  }
  return out;
}

/**
 * A run of digits shaped like a phone number: with a + or 00 in front, a local 0… number (050 123 4567, 04 123 4567),
 * a 971… number, a mobile without its 0 (50 123 4567), or 10 to 15 digits. Seven to nine digits that start otherwise
 * read as a price or a plot number (1250000, AED 1 250 000) and are left alone, as are 16+ digits (an IBAN).
 */
function looksLikePhone(run: string) {
  const d = asciiDigits(run);
  const n = d.length;
  if (n > 15) return false;
  if (run.startsWith("+") || d.startsWith("00")) return n >= 9;
  if (d.startsWith("971")) return n >= 11;
  if (d.startsWith("0")) return n >= 9 && n <= 12;
  if (n >= 10) return true;
  return n === 9 && d.startsWith("5");
}

/**
 * The kinds of contact details a longer text seems to hold (a phone number, an email address, a link, a WhatsApp link
 * or @handle), for a warning to our team: sellers must not give buyers a way around the platform. Empty when none.
 */
export function contactKinds(text: string | null | undefined): ContactKind[] {
  if (!text) return [];
  const found = new Set<ContactKind>();
  let rest = text;
  // Each kind is taken out once found, so an email's domain or a wa.me number isn't counted again as a link or phone.
  rest = rest.replace(LONG_EMAIL, () => (found.add("email"), " "));
  rest = rest.replace(HANDLE, () => (found.add("handle"), " "));
  rest = rest.replace(LINK, () => (found.add("link"), " "));
  for (const m of rest.matchAll(DIGIT_RUN)) {
    if (looksLikePhone(m[0])) found.add("phone");
  }
  return (["phone", "email", "link", "handle"] as const).filter((k) => found.has(k));
}
