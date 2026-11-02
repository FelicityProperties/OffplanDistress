// What an uploaded document or photo really is (src/app/api/listings/[id]/files/route.ts): read from its first bytes,
// never from its name or the type the uploader's browser gave it, which anyone can set. And the name it is stored and
// served under (src/app/api/files/[id]/route.ts): without the invisible characters that can disguise one (a
// right-to-left override, U+202E, shows "Statement<U+202E>fdp.exe" as "Statementexe.pdf"), with its type's extension.

/** How many bytes sniffType reads. */
export const SNIFF_BYTES = 1024;

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));

// The ftyp brands of a HEIC / HEIF still image (ISO/IEC 23008-12), at offset 8 after the box's size and "ftyp".
const HEIC_BRANDS = new Set(["heic", "heix"]);
const HEIF_BRANDS = new Set(["mif1", "msf1"]);

/**
 * The type the file's own signature shows, of those we store (PDF, JPEG, PNG, WebP, HEIC / HEIF), or null for anything
 * else (an executable, a web page, a GIF…). A PDF may start after a byte-order mark or blank lines, as readers allow.
 */
export function sniffType(head: Uint8Array): string | null {
  let i = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf ? 3 : 0;
  while (i < head.length && [0x09, 0x0a, 0x0d, 0x20].includes(head[i])) i++;
  if (ascii(head, i, 5) === "%PDF-") return "application/pdf";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (ascii(head, 0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP") return "image/webp";
  if (ascii(head, 4, 4) === "ftyp") {
    const brand = ascii(head, 8, 4);
    if (HEIC_BRANDS.has(brand)) return "image/heic";
    if (HEIF_BRANDS.has(brand)) return "image/heif";
  }
  return null;
}

/** The extensions each stored type is known by; the first is the one a name gets when it has none of them. */
const EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic", "heif"],
  "image/heif": ["heif", "heic"],
};

/**
 * A file name as typed, without control characters and the invisible formatting ones (bidi overrides and isolates,
 * marks, zero-width spaces; the joiners Persian and emoji need are kept), path separators or a NUL Postgres can't
 * store.
 */
export function cleanFileName(name: string) {
  return name
    .replace(/[\t\n\v\f\r\u0085\u2028\u2029]+/g, " ")
    .replace(/\p{Cc}/gu, "")
    .replace(/\p{Cf}/gu, (c) => (c === "\u200c" || c === "\u200d" ? c : ""))
    .replace(/[/\\]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The name a file of `mimeType` is stored and shown under: cleanFileName, ending in an extension of that type (one it
 * already has is kept, "IMG_0042.HEIC"; any other is replaced, "Statement.exe" → "Statement.pdf"), at most 200
 * characters. `fallback` names a file whose name is empty once cleaned.
 */
export function storedFileName(name: string, mimeType: string, fallback = "file") {
  const allowed = EXTENSIONS[mimeType];
  let base = cleanFileName(name);
  if (!allowed) return Array.from(base || fallback).slice(0, 200).join("");
  // An extension is a short run with a letter in it: "statement.2024" keeps its year.
  const ext = /\.([A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*)$/.exec(base);
  if (ext && ext[1].length <= 10 && allowed.includes(ext[1].toLowerCase())) {
    const stem = Array.from(base.slice(0, ext.index)).slice(0, 199 - ext[1].length);
    return `${stem.join("") || fallback}.${ext[1]}`;
  }
  if (ext && ext[1].length <= 10) base = base.slice(0, ext.index).trim();
  const stem = Array.from(base.replace(/\.+$/, "")).slice(0, 199 - allowed[0].length);
  return `${stem.join("") || fallback}.${allowed[0]}`;
}
