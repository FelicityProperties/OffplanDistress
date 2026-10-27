import { z } from "zod";
import type { TFn, TKey } from "@/i18n/translator";
import { fallbackErrors, listingSchema, type ListingFields } from "./listing-schema";

// The bulk import file (/admin/listings/import): units a partner network shared with the owners' written permission,
// prepared by us as JSON. The page checks every unit in the browser for its preview, then sends them one at a time to
// adminImportListing (src/app/actions/import.ts), which checks them again with the same functions; photos follow one
// by one through the usual upload route. Plain module (no server-only code) so both sides use it.
//
// {
//   "format": "offplandistress-import/1",
//   "source": { "key": "distressstock", "name": "DistressStock", "url": "https://…" },
//   "generatedAt": "<ISO>",
//   "units": [{ "ref": "0G2Q5c", "url": "https://…/u/0G2Q5c", "posted": "2026-04-18" | null,
//               "listing": { …listingSchema's fields… }, "photos": [{ "filename", "type", "data": "<base64>" }],
//               "notes": "for our team only" }]
// }

export const IMPORT_FORMAT = "offplandistress-import/1";
export const IMPORT_MAX_PHOTOS = 6;
export const IMPORT_MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
export const IMPORT_MAX_NOTES = 4000;
/** Units one status check may ask about. */
export const IMPORT_MAX_REFS = 2000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMPORT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const IMPORT_REF_RE = /^[A-Za-z0-9_.-]{1,64}$/;

type TI = TFn<"intake">;
type TE = TFn<"errors">;

/** A real calendar day written YYYY-MM-DD. */
export function isCalendarDay(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function webAddress(v: unknown): string | null | undefined {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || v.length > 500) return undefined;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export type ImportSource = { key: string; name: string; url: string | null };

/** The file's source, or null when it isn't one. */
export function checkImportSource(v: unknown): ImportSource | null {
  if (!isObject(v)) return null;
  const key = typeof v.key === "string" ? v.key.trim() : "";
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const url = webAddress(v.url);
  if (!IMPORT_KEY_RE.test(key) || name.length < 1 || name.length > 80 || url === undefined) return null;
  return { key, name, url };
}

export type ImportFile = { source: ImportSource; generatedAt: string | null; units: unknown[] };

/** A whole file's text: its source and its (still unchecked) units, or why it can't be read. */
export function parseImportFile(text: string, ti: TI): { ok: true; file: ImportFile } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: ti("file.notJson") };
  }
  if (!isObject(json) || json.format !== IMPORT_FORMAT) return { ok: false, error: ti("file.format", { format: IMPORT_FORMAT }) };
  const source = checkImportSource(json.source);
  if (!source) return { ok: false, error: ti("file.source") };
  if (!Array.isArray(json.units)) return { ok: false, error: ti("file.units") };
  return { ok: true, file: { source, generatedAt: typeof json.generatedAt === "string" ? json.generatedAt : null, units: json.units } };
}

/** What we keep about a unit besides its listing fields (stored in listings.source, for our team only). */
export type UnitMeta = { ref: string; url: string | null; posted: string | null; notes: string | null };

export function checkUnitMeta(v: unknown, ti: TI): { ok: true; meta: UnitMeta } | { ok: false; error: string } {
  if (!isObject(v)) return { ok: false, error: ti("unit.notObject") };
  const ref = typeof v.ref === "string" ? v.ref.trim() : "";
  if (!IMPORT_REF_RE.test(ref)) return { ok: false, error: ti("unit.ref") };
  const url = webAddress(v.url);
  if (url === undefined) return { ok: false, error: ti("unit.url") };
  if (v.posted != null && !isCalendarDay(v.posted)) return { ok: false, error: ti("unit.posted") };
  if (v.notes != null && typeof v.notes !== "string") return { ok: false, error: ti("unit.notes", { max: IMPORT_MAX_NOTES }) };
  const notes = typeof v.notes === "string" ? v.notes.trim() : "";
  if (notes.length > IMPORT_MAX_NOTES) return { ok: false, error: ti("unit.notes", { max: IMPORT_MAX_NOTES }) };
  return { ok: true, meta: { ref, url, posted: (v.posted as string | null | undefined) ?? null, notes: notes || null } };
}

const FIELD_LABELS: Record<string, TKey<"intake">> = {
  projectName: "field.projectName",
  developer: "field.developer",
  developerOther: "field.developerOther",
  community: "field.community",
  communityOther: "field.communityOther",
  unitType: "field.unitType",
  sizeSqft: "field.sizeSqft",
  floor: "field.floor",
  view: "field.view",
  originalPrice: "field.originalPrice",
  amountPaid: "field.amountPaid",
  askingPrice: "field.askingPrice",
  handoverDate: "field.handoverDate",
  nextInstalmentDate: "field.nextInstalmentDate",
  nextInstalmentAmount: "field.nextInstalmentAmount",
  overdueAmount: "field.overdueAmount",
  motivation: "field.motivation",
  description: "field.description",
  paymentPlan: "field.paymentPlan",
};

/**
 * The unit's listing fields, by the sell form's rules (listingSchema: developer and community from our lists, or
 * "Other" with the typed name), with a reason naming each field that fails. The file writes "none" as null, the form
 * as an empty field, so nulls are read as left out. Dates must also be real days (the form's date inputs see to that).
 */
export function checkListing(v: unknown, ti: TI, te: TE): { ok: true; data: ListingFields } | { ok: false; error: string } {
  if (!isObject(v)) return { ok: false, error: ti("unit.listing") };
  const input = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === null ? undefined : x]));
  input.motivation ??= "motivated";
  input.paymentPlan ??= [];
  const parsed = listingSchema(te).safeParse(input, { error: fallbackErrors(te) });
  const issues: Record<string, string[] | undefined> = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
  if (parsed.success) {
    const d = parsed.data;
    for (const k of ["handoverDate", "nextInstalmentDate"] as const) if (d[k] != null && !isCalendarDay(d[k])) issues[k] = [te("field.date")];
    if (d.paymentPlan.some((p) => p.dueDate != null && !isCalendarDay(p.dueDate))) issues.paymentPlan = [te("field.date")];
  }
  const keys = Object.keys(issues).filter((k) => issues[k]?.length);
  if (!parsed.success || keys.length) {
    const reason = keys
      .map((k) => ti("unit.issue", { field: FIELD_LABELS[k] ? ti(FIELD_LABELS[k]) : k, message: issues[k]![0] }))
      .join(ti("unit.sep"));
    return { ok: false, error: reason || te("form.fixDetails") };
  }
  return { ok: true, data: parsed.data! };
}

export type ImportPhoto = { filename: string; type: string; data: string; bytes: number };

/** Decoded size of base64 text (without decoding it), or null when it isn't base64. */
function base64Bytes(data: string) {
  const clean = data.replace(/^data:[\w/+.-]+;base64,/, "").replace(/\s+/g, "");
  if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
  return { clean, bytes: (clean.length / 4) * 3 - (clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0) };
}

/** The unit's photos (0–6 JPEG, PNG or WebP of at most 1.5 MB each), checked in the browser before anything is sent. */
export function checkPhotos(v: unknown, ti: TI): { ok: true; photos: ImportPhoto[] } | { ok: false; error: string } {
  if (v == null) return { ok: true, photos: [] };
  if (!Array.isArray(v)) return { ok: false, error: ti("unit.photos") };
  if (v.length > IMPORT_MAX_PHOTOS) return { ok: false, error: ti("unit.photosMax", { max: IMPORT_MAX_PHOTOS }) };
  const photos: ImportPhoto[] = [];
  for (const [i, p] of v.entries()) {
    const n = i + 1;
    if (!isObject(p) || typeof p.filename !== "string" || !p.filename.trim()) return { ok: false, error: ti("unit.photoName", { n }) };
    if (typeof p.type !== "string" || !PHOTO_TYPES.includes(p.type)) return { ok: false, error: ti("unit.photoType", { n }) };
    const b64 = typeof p.data === "string" ? base64Bytes(p.data) : null;
    if (!b64) return { ok: false, error: ti("unit.photoData", { n }) };
    if (b64.bytes > IMPORT_MAX_PHOTO_BYTES) return { ok: false, error: ti("unit.photoSize", { n, max: IMPORT_MAX_PHOTO_BYTES / 1024 / 1024 }) };
    photos.push({ filename: p.filename.trim().slice(0, 200), type: p.type, data: b64.clean, bytes: b64.bytes });
  }
  return { ok: true, photos };
}

/** A photo's name without its extension: the upload re-encodes photos as JPEG, so "a.png" is stored as "a.jpg". */
export const photoStem = (filename: string) => filename.replace(/\.[^.]+$/, "").toLowerCase();
