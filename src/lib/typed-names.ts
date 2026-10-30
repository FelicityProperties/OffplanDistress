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
/**
 * "WhatsApp:", "call", "واتساب", "微信："… left in front of what was taken out. The Chinese cues (WeChat, phone, mobile,
 * contact, add me, scan, tap) need no word boundary: Chinese is written without spaces.
 */
const CUE = new RegExp(
  String.raw`(?:(?<![\p{L}\p{N}])(?:whats\s?app|wa|call|tel|phone|mobile|mob|contact|e-?mail|mail|web\s?site|site|visit|vx|wx|qq|واتس(?:اب)?|اتصل|اتصال|هاتف|جوال|موبايل|رقم|تواصل|[اإ]يميل|بريد|موقع)|微信(?:号)?|威信|电话|手机(?:号)?|联系(?:方式|我|电话)?|加我|扫码|邮箱|网址|网站|点(?:击|此)?)\s*[:：\-–]?\s*${CUT}`,
  "giu",
);

/** The typed name with links, emails / handles and phone numbers taken out; `removed` says whether any were. */
export function scrubTypedName(raw: string) {
  const marked = raw.replace(CONTACT, CUT);
  if (!marked.includes(CUT)) return { name: raw, removed: false };
  const name = marked
    // "call 050… or 055…" → one cut, then the cue word in front of it.
    .replace(new RegExp(`${CUT}(?:\\s*(?:or|and|/|,|&|و|أو|或|和|、|，)\\s*${CUT})+`, "giu"), CUT)
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
/** "(at)", "[at]", "{at}" or a plain @; "(dot)", "[dot]" or " dot " / " نقطة " — the ways people spell an address out. */
const AT = String.raw`\s*(?:[(\[{]\s*at\s*[)\]}]|@)\s*`;
const DOT = String.raw`\s*(?:[(\[{]\s*dot\s*[)\]}]|\s(?:dot|نقطة)\s)\s*`;
const LONG_EMAIL = new RegExp(
  [
    String.raw`[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+`,
    String.raw`\b(?:gmail|hotmail|yahoo|outlook|icloud)\s*(?:\.|dot|نقطة)\s*com\b`,
    // "name(at)company(dot)ae", "name [at] company.com", "name at company dot ae".
    String.raw`[\p{L}\p{N}._%+-]+${AT}[\p{L}\p{N}-]+(?:${DOT}|\.)(?:${TLDS})(?![\p{L}\p{N}])`,
    String.raw`[\p{L}\p{N}._%+-]+\s+at\s+[\p{L}\p{N}-]+${DOT}(?:${TLDS})(?![\p{L}\p{N}])`,
  ].join("|"),
  "giu",
);
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
 * A digit run that is, or starts a stretch shaped like, a phone number. More digits typed straight after a number
 * ("050 123 4567 1450 sqft", "+971 50 123 4567 2") make the run as a whole too long to read as one, so its digit
 * groups are tried too — only stretches that begin the way a phone number does (+, 00, a 0 then a digit, 971, a 5),
 * so a price's "000" groups never start one.
 */
function hasPhone(run: string, { afterLabel = false } = {}) {
  const groups = run.split(/[\s().\-–/]+/u).filter(Boolean);
  // Typed straight after "permit", "plot", "unit"… (REFERENCE_LABEL) the first number is that reference, unless it is
  // written the way only phone numbers are (+…, 00…, 0…, 971…).
  const skipFirst = afterLabel && !run.startsWith("+") && !/^(?:0|971)/.test(asciiDigits(groups[0] ?? ""));
  if (!skipFirst && looksLikePhone(run)) return true;
  for (let i = skipFirst ? 1 : 0; i < groups.length; i++) {
    const start = asciiDigits(groups[i]);
    if (!groups[i].startsWith("+") && !/^(?:00[1-9]|0[1-9]|971|5)/.test(start)) continue;
    for (let j = i + 1; j <= groups.length; j++) {
      const stretch = groups.slice(i, j).join("");
      if (asciiDigits(stretch).length > 15) break;
      if (looksLikePhone(stretch)) return true;
    }
  }
  return false;
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
  rest = rest.replace(HANDLE, (m) => (isPriceAt(m) ? m : (found.add("handle"), " ")));
  rest = rest.replace(LINK, (m) => (isSentenceBreak(m) ? m : (found.add("link"), " ")));
  rest = maskGroupedNumbers(spelledDigits(rest));
  for (const m of rest.matchAll(DIGIT_RUN)) {
    const before = rest.slice(Math.max(0, m.index - 40), m.index);
    if (hasPhone(m[0], { afterLabel: REFERENCE_LABEL.test(before) })) found.add("phone");
  }
  return (["phone", "email", "link", "handle"] as const).filter((k) => found.has(k));
}

/** "@AED 1.2M", "@1.25M", "@ 950k": a price, not a handle. */
function isPriceAt(m: string) {
  const body = m.startsWith("@") ? m.slice(1) : null;
  return body != null && (/^(?:aed|dhs?|usd|eur|gbp)$/i.test(body) || /^[\p{Nd}.,]+[kmb]?$/iu.test(body));
}

/**
 * "Great view.In Q4" or "metro.Online payment": a full stop typed without its space before a capitalised English word
 * that is also a domain ending, not a link. "Example.Com" (not a word) is still a link.
 */
function isSentenceBreak(m: string) {
  if (/^(?:https?:\/\/|www\.)/i.test(m) || /[/?#:]/.test(m)) return false;
  const tld = m.slice(m.lastIndexOf(".") + 1);
  return /^\p{Lu}\p{Ll}+$/u.test(tld) && /^(?:in|to|me|us|co|online|site|website|store|shop|link|page|tech|info|app|dev)$/i.test(tld);
}

/**
 * Labels a reference number follows: a permit, plot, unit, contract or account number isn't a phone number. Only
 * right before the number ("Trakheesi 7123456789", "رقم التصريح ٧١٢٣٤٥٦٧٨٩").
 */
const REFERENCE_LABEL = new RegExp(
  String.raw`(?<![\p{L}\p{M}])(?:رقم\s*)?(?:ال)?(?:permit|trakheesi|rera|orn|brn|dld|plot|unit|apt|apartment|flat|villa|office|shop|ref(?:erence)?|oqood|contract|iban|account|a\/c|licen[cs]e|makani|تصريح|ترخيصي?|ريرا|قطعة|وحدة|شقة|فيلا|مكتب|مرجع|عقد|أوقود|رخصة|حساب|مكاني)\.?\s*(?:no\.?|nos?\.?|number|num|#|رقم)?\s*[:#.\-–]?\s*$`,
  "iu",
);

/**
 * A number written with thousands separators the same way throughout ("1 250 000", "1.250.000", "450 000") is a price
 * or a size: it is masked, so two of them typed side by side ("AED 2 500 000 (1 250 000 paid)") don't read as one long
 * phone number. Not when it starts with a 0 (a local number), or is a mobile number without its 0 in groups of three
 * ("501 234 567").
 */
const GROUPED_NUMBER = /(?<![+\p{Nd}]|\p{Nd}[   .,'’٬])\p{Nd}{1,3}([   .,'’٬])\p{Nd}{3}(?:\1\p{Nd}{3})?(?!\p{Nd}|\1\p{Nd})/gu;

function maskGroupedNumbers(s: string) {
  return s.replace(GROUPED_NUMBER, (m) => {
    const d = asciiDigits(m);
    if (d.startsWith("0") || (d.length === 9 && d.startsWith("5") && !d.endsWith("000"))) return m;
    return "#";
  });
}

/** Digits spelled out, so "zero five zero one two three…" is checked like 050 123…: English, Arabic, Russian, Hindi. */
const DIGIT_WORDS: [number, string][] = [
  [0, "zero|oh|صفر|ноль|нуль|शून्य"],
  [1, "one|واحد|один|одна|एक"],
  [2, "two|اثنان|اثنين|إثنان|إثنين|اتنين|два|две|दो"],
  [3, "three|ثلاثة|ثلاثه|ثلاث|три|तीन"],
  [4, "four|أربعة|اربعة|أربعه|اربعه|أربع|اربع|четыре|चार"],
  [5, "five|خمسة|خمسه|خمس|пять|पांच|पाँच"],
  [6, "six|ستة|سته|ست|шесть|छह|छः"],
  [7, "seven|سبعة|سبعه|سبع|семь|सात"],
  [8, "eight|ثمانية|ثمانيه|ثماني|ثمان|восемь|आठ"],
  [9, "nine|تسعة|تسعه|تسع|девять|नौ"],
];
const DIGIT_WORD = DIGIT_WORDS.map(([, w]) => w).join("|");
const NOT_LETTER_BEFORE = String.raw`(?<![\p{L}\p{M}])`;
const NOT_LETTER_AFTER = String.raw`(?![\p{L}\p{M}])`;
/** One spelled digit (optionally "double" / "triple" it), or digits. */
const DIGIT_TOKEN = String.raw`(?:${NOT_LETTER_BEFORE}(?:(?:double|triple)[\s-]+)?(?:${DIGIT_WORD})${NOT_LETTER_AFTER}|\p{Nd}+)`;
/** Three or more such tokens in a row, at least one of them a word. */
const SPELLED_RUN = new RegExp(String.raw`${DIGIT_TOKEN}(?:[\s,\-–]+${DIGIT_TOKEN}){2,}`, "giu");
const DIGIT_OF = new RegExp(String.raw`${NOT_LETTER_BEFORE}(?:(double|triple)[\s-]+)?(${DIGIT_WORD})${NOT_LETTER_AFTER}`, "giu");
/** An O typed for a zero next to digits ("05O 123 4567", "o5o1234567"). */
const LETTER_O = /(?<![\p{L}])[oO](?=[\s.\-]?\p{Nd})|(?<=\p{Nd})[oO](?![\p{L}])/gu;

function spelledDigits(s: string) {
  const digitOf = (word: string) => DIGIT_WORDS.find(([, w]) => new RegExp(`^(?:${w})$`, "iu").test(word))?.[0] ?? "";
  return s.replace(LETTER_O, "0").replace(SPELLED_RUN, (run) => {
    if (!/\p{L}/u.test(run)) return run;
    return run
      .replace(DIGIT_OF, (_, times: string | undefined, word: string) =>
        String(digitOf(word)).repeat(times ? (times.toLowerCase() === "double" ? 2 : 3) : 1),
      )
      .replace(/[\s,\-–]+/g, " ");
  });
}
