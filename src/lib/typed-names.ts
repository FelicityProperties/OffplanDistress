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
