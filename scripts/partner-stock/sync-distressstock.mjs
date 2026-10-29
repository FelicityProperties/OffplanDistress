#!/usr/bin/env node
// The daily DistressStock sync (runbook: .claude/skills/distressstock-sync/SKILL.md). It reads the partner site and keeps
// scripts/partner-stock/distressstock.json — the offplandistress-import/1 file the production build imports
// (scripts/import-partner-stock.mjs) — in step with it, together with the payment plans the agent transcribes into
// scripts/partner-stock/distressstock-plans.json (each plan is an image on the site, read by a person or an agent with
// vision, never by code). Nothing here touches the database.
//
//   fetch --raw <dir>      logs in with DISTRESSSTOCK_PASSWORD, saves the index and every unit page under <dir>
//                          (index.html, units/<ref>.html, cookies.txt), parses them into <dir>/units.json, saves each
//                          payment-plan image under <dir>/plans/ (plus a PNG copy for the agent's image reader) and
//                          writes <dir>/delta.json against the committed manifest and plans file.
//   build --raw <dir> [--today YYYY-MM-DD] [--allow-mass-removal]
//                          rewrites the manifest from <dir>/units.json + the plans file + the previous manifest.
//                          Exit 2 when a unit still needs its plan transcribed (the file is written anyway),
//                          3 when the run would mark too many units removed (nothing written).
//   diff --raw <dir>       prints <dir>/delta.json's summary again.
//   delta --raw <dir>      recomputes <dir>/delta.json from the saved pages (no network: after editing the plans file).
//   parse --raw <dir>      re-parses the saved pages into <dir>/units.json (no network; what the tests use).
//
// Plain Node 22; sharp (already a dependency) is only used for the PNG copies. PARTNER_STOCK_DIR names another folder
// holding the manifest and the plans file (the tests work on copies that way).
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://distressonly.deals";
const HOST = new URL(SITE).hostname;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(path.dirname(HERE));
const STOCK_DIR = process.env.PARTNER_STOCK_DIR ? path.resolve(process.env.PARTNER_STOCK_DIR) : HERE;
const MANIFEST_PATH = path.join(STOCK_DIR, "distressstock.json");
const PLANS_PATH = path.join(STOCK_DIR, "distressstock-plans.json");
const IMPORT_FORMAT = "offplandistress-import/1";
const PLANS_FORMAT = "offplandistress-plans/1";
const SOURCE = { key: "distressstock", name: "DistressStock", url: SITE };
const USER_AGENT = "Mozilla/5.0 (compatible; OffplanDistress-sync/1.0)";
const REQUEST_GAP_MS = 200;
const FETCH_TIMEOUT_MS = 30_000;
/** A unit gone from the site stays in the manifest, marked removed, this long (the import withdraws it meanwhile). */
const REMOVED_KEEP_DAYS = 90;
/** The safety valve: more than this share of the listed units (and more than MASS_REMOVAL_MIN) gone at once is not believed. */
const MASS_REMOVAL_SHARE = 0.25;
const MASS_REMOVAL_MIN = 3;
/** The source spreadsheet rounds VAT per line, so its printed totals can be a dirham or two off the rows. */
const ROUNDING_AED = 2;
const INT_MAX = 2_147_483_647;
const UNIT_TYPES = ["studio", "1br", "2br", "3br", "4br", "5br", "townhouse", "villa", "penthouse"];
const NON_DUBAI = ["Saadiyat Island", "Yas Island", "Al Reem Island", "Abu Dhabi", "Sharjah", "Ras Al Khaimah", "Ajman"];

// Posted names → our lists (src/lib/config.ts); anything else becomes "Other" with the posted name (DEV_NAMES / COM_NAMES
// fix its spelling). Same tables as the first import.
const DEV_MAP = {
  damac: "DAMAC",
  "nakheel properties": "Nakheel",
  "binghatti developers": "Binghatti",
  "meydan group": "Meydan",
  "al habtoor group": "Al Habtoor",
  "marjid al futtaim": "Majid Al Futtaim",
};
const DEV_NAMES = { igo: "IGO", aqua: "Aqua Properties", ahs: "AHS", "r.evolution": "R.Evolution" };
const COM_MAP = {
  beachfront: "Emaar Beachfront",
  "maritime city": "Dubai Maritime City",
  "creek harbour": "Dubai Creek Harbour",
  "dubai hills": "Dubai Hills Estate",
  "dubai hills estates": "Dubai Hills Estate",
  "dubai land": "Dubailand",
  mbr: "Mohammed Bin Rashid City",
  "dubailand residence complex": "Dubai Land Residence Complex",
  "dubai land residences complex": "Dubai Land Residence Complex",
  jvt: "Jumeirah Village Triangle",
  jvc: "Jumeirah Village Circle",
  jlt: "Jumeirah Lake Towers",
  "damac hills": "DAMAC Hills",
  "damac hills ii": "DAMAC Hills 2",
};
const COM_NAMES = {
  "sobha hartland ii": "Sobha Hartland II",
  difc: "DIFC",
  jbr: "JBR",
  "damac sun city": "DAMAC Sun City",
  "damac islands": "DAMAC Islands",
  "port de la mer": "Port de La Mer",
  "rashid yachts & marina": "Rashid Yachts & Marina",
};
const FEATURE_KEYS = [
  "Balcony",
  "Parking",
  "2 Parking spaces",
  "Pool",
  "Pool on the Balcony",
  "Direct access to the Pool",
  "Private garden",
  "Fully furnished",
  "Semi furnished",
  "Fully Upgraded",
  "Study, Maid and Driver's room",
];
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const LISTING_KEYS = [
  "projectName",
  "developer",
  "developerOther",
  "community",
  "communityOther",
  "unitType",
  "sizeSqft",
  "floor",
  "view",
  "originalPrice",
  "amountPaid",
  "askingPrice",
  "handoverDate",
  "nextInstalmentDate",
  "nextInstalmentAmount",
  "paymentPlan",
  "motivation",
  "description",
];
const UNIT_KEYS = ["ref", "url", "posted", "listing", "photos", "notes", "removed"];

// ---------------------------------------------------------------------------------------------------------------------
// Small helpers. The parser and the builder were first written in Python and the committed manifest came from them, so
// the text handling keeps Python's semantics where JavaScript's differ: str.strip() / \s cover the characters of
// str.isspace() (not U+FEFF or U+2060, which trim() would eat), round() is half-to-even, slices count code points.

const PY_WS = "\\t\\n\\x0b\\x0c\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const PY_STRIP_RE = new RegExp(`^[${PY_WS}]+|[${PY_WS}]+$`, "g");
const pyStrip = (s) => String(s ?? "").replace(PY_STRIP_RE, "");
const FIELD_RE = new RegExp(`^([^–:]{2,60}?)[${PY_WS}]*[–:][${PY_WS}]*([^\\n]+)$`);
const MONEY_RE = new RegExp(`AED[${PY_WS}]*([\\d,${PY_WS}.]+)`);
const QUARTER_RE = new RegExp(`^Q([1-4])[${PY_WS}]*(\\d{4})`);
const cut = (s, n) => [...String(s ?? "")].slice(0, n).join("");
const pyRound = (x) => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};
const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const byRef = (a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0);
const rel = (p) => (p.startsWith(`${ROOT}${path.sep}`) ? path.relative(ROOT, p) : p);
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const dubaiToday = () => new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400e3);

export function isCalendarDay(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function die(message, code = 1) {
  console.error(`sync-distressstock: ${message}`);
  process.exit(code);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 1)}\n`);
}

const absoluteUrl = (src) => (/^https?:\/\//.test(src) ? src : SITE + (src.startsWith("/") ? "" : "/") + src);

// ---------------------------------------------------------------------------------------------------------------------
// The unit page parser.

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\xa0",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  deg: "°",
  euro: "€",
  pound: "£",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  minus: "−",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  sup2: "²",
  sup3: "³",
};

export function unescapeHtml(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const stripTags = (s) => s.replace(/<[^>]*>/g, "");
const text = (s) => pyStrip(unescapeHtml(stripTags(s)));

/** The refs the catalogue lists (href="/u/<ref>"), in page order, each once. */
export function indexRefs(html) {
  return [...new Set([...html.matchAll(/href="\/u\/([A-Za-z0-9_-]+)"/g)].map((m) => m[1]))];
}

/**
 * One unit page → {ref, url, title, posted, fields, extras, notes, sections}: the <li> lines as "Label – value" /
 * "Label: value" fields (the rest as extras), the <h3> headings with the images under each, the <p> paragraphs.
 */
export function parseUnitPage(html, ref) {
  const title = /<h1 class="v2-unit-title">([\s\S]*?)<\/h1>/.exec(html);
  const date = /<p class="v2-unit-date">([\s\S]*?)<\/p>/.exec(html);
  const start = html.indexOf('<div class="v2-unit-body">');
  const end = html.indexOf("</article>");
  if (!title || !date || start < 0 || end < start) throw new Error(`${ref}: not a unit page`);
  const body = html.slice(start, end);
  const fields = {};
  const extras = [];
  for (const m of body.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    const line = text(m[1]);
    if (!line) continue;
    const f = FIELD_RE.exec(line);
    if (f) fields[f[1]] = f[2];
    else extras.push(line);
  }
  const sections = [];
  let current = null;
  for (const m of body.matchAll(/<h3>([\s\S]*?)<\/h3>|<img[^>]*src="([^"]+)"/g)) {
    if (m[1] !== undefined) {
      current = { heading: text(m[1]), images: [] };
      sections.push(current);
    } else if (current) current.images.push(m[2]);
  }
  const notes = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter(Boolean);
  return { ref, url: `${SITE}/u/${ref}`, title: text(title[1]), posted: pyStrip(date[1]), fields, extras, notes, sections };
}

/** The payment plan's images (the section headed "PAYMENT PLAN"), as absolute URLs. */
const planImages = (u) =>
  u.sections.filter((s) => s.heading.toUpperCase().includes("PAYMENT PLAN")).flatMap((s) => s.images).map(absoluteUrl);

// ---------------------------------------------------------------------------------------------------------------------
// Our rules: the lists and limits the production import enforces, read from the TypeScript they live in so they can't
// drift (src/lib/config.ts, src/lib/import-format.ts; the field limits below mirror src/lib/listing-schema.ts and
// scripts/import-partner-stock.mjs checkListing, the stricter of the two where they differ).

async function repoRules() {
  const config = await readFile(path.join(ROOT, "src/lib/config.ts"), "utf8");
  const format = await readFile(path.join(ROOT, "src/lib/import-format.ts"), "utf8");
  const find = (source, file, pattern, name) => {
    const m = new RegExp(pattern).exec(source);
    if (!m) throw new Error(`${file}: ${name} not found — the sync script needs updating`);
    return m[1];
  };
  const list = (name) => {
    const body = find(config, "src/lib/config.ts", `export const ${name} = \\[([\\s\\S]*?)\\];`, name).replace(/\/\/.*$/gm, "");
    return [...new Set([...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]))];
  };
  const num = (name) => Number(find(format, "src/lib/import-format.ts", `export const ${name} = ([\\d_]+);`, name).replace(/_/g, ""));
  const re = (name) => new RegExp(find(format, "src/lib/import-format.ts", `export const ${name} = /(.*)/;`, name));
  return { DEV: list("DEVELOPERS"), COM: list("COMMUNITIES"), maxPhotos: num("IMPORT_MAX_PHOTOS"), maxNotes: num("IMPORT_MAX_NOTES"), refRe: re("IMPORT_REF_RE") };
}

/** Why the production import would refuse the entry, or nothing. */
export function validateEntry(e, rules) {
  const p = [];
  const l = isObject(e.listing) ? e.listing : {};
  const str = (v, max, label, min = 0) => {
    if (v == null) {
      if (min) p.push(`${label} missing`);
      return;
    }
    if (typeof v !== "string") return void p.push(`${label} not text`);
    const t = v.trim();
    if (t.length < min) p.push(`${label} shorter than ${min} characters`);
    if (t.length > max) p.push(`${label} longer than ${max} characters`);
  };
  const int = (v, label, { min = 0, max = INT_MAX, optional = false } = {}) => {
    if (v == null) return void (optional || p.push(`${label} missing`));
    if (!Number.isInteger(v) || v < min || v > max) p.push(`${label} not a whole number between ${min} and ${max}`);
  };
  const day = (v, label) => void (v == null || isCalendarDay(v) || p.push(`${label} not a calendar day`));
  const url = (v, label) => void (v == null || (typeof v === "string" && v.length <= 500 && /^https?:\/\/\S+$/.test(v)) || p.push(`${label} not a web address`));
  if (typeof e.ref !== "string" || !rules.refRe.test(e.ref)) p.push("ref");
  url(e.url, "url");
  day(e.posted, "posted");
  day(e.removed, "removed");
  str(e.notes, rules.maxNotes, "notes");
  if (!Array.isArray(e.photos) || e.photos.length > rules.maxPhotos) p.push(`photos: at most ${rules.maxPhotos}`);
  else {
    const stems = new Set();
    e.photos.forEach((ph, i) => {
      if (!isObject(ph) || typeof ph.filename !== "string" || !ph.filename.trim()) return void p.push(`photo ${i + 1} without a filename`);
      url(ph.url, `photo ${i + 1} url`);
      const stem = (ph.filename.trim().replace(/\.[^.]+$/, "") || "photo").toLowerCase();
      if (stems.has(stem)) p.push(`photo name ${stem} used twice`);
      stems.add(stem);
    });
  }
  str(l.projectName, 120, "projectName", 2);
  for (const [k, list] of [
    ["developer", rules.DEV],
    ["community", rules.COM],
  ]) {
    if (!list.includes(l[k])) p.push(`${k} "${l[k]}" not on our list`);
    else if (l[k] === "Other") str(l[`${k}Other`], 80, `${k}Other`, 2);
    else str(l[`${k}Other`], 80, `${k}Other`);
  }
  if (!UNIT_TYPES.includes(l.unitType)) p.push(`unitType "${l.unitType}"`);
  int(l.sizeSqft, "sizeSqft", { min: 1 });
  str(l.floor, 40, "floor");
  str(l.view, 80, "view");
  int(l.originalPrice, "originalPrice", { min: 1 });
  int(l.amountPaid, "amountPaid");
  int(l.askingPrice, "askingPrice");
  if (Number.isInteger(l.amountPaid) && Number.isInteger(l.originalPrice) && l.amountPaid > l.originalPrice) p.push("amountPaid above originalPrice");
  day(l.handoverDate, "handoverDate");
  day(l.nextInstalmentDate, "nextInstalmentDate");
  int(l.nextInstalmentAmount, "nextInstalmentAmount", { optional: true });
  if (!["urgent", "motivated", "flexible"].includes(l.motivation)) p.push("motivation");
  str(l.description, 3000, "description");
  if (!Array.isArray(l.paymentPlan) || l.paymentPlan.length > 60) p.push("paymentPlan: at most 60 rows");
  else {
    l.paymentPlan.forEach((r, i) => {
      str(r?.label, 60, `paymentPlan row ${i + 1} label`, 2);
      day(r?.dueDate, `paymentPlan row ${i + 1} dueDate`);
      int(r?.amount, `paymentPlan row ${i + 1} amount`);
    });
  }
  return p;
}

// ---------------------------------------------------------------------------------------------------------------------
// From a parsed page + its transcribed plan to a manifest entry.

/** Why the unit never goes in the manifest: a bulk deal, a shop, or not a Dubai (DLD / Trakheesi) unit. */
export function exclusion(u) {
  const type = pyStrip(u.fields.Type);
  const area = pyStrip(u.fields.Area);
  if (/^\d+\s+apartments?$/i.test(type) || /BULK DEAL/i.test(u.title)) return "bulk deal (one listing is one unit)";
  if (/retail/i.test(type)) return "retail unit (the marketplace lists homes only)";
  const outside = NON_DUBAI.find((a) => area.toLowerCase().includes(a.toLowerCase()));
  if (outside) return `outside Dubai (${area}; not a DLD / Trakheesi unit)`;
  return null;
}

/** A ready / fully paid plan has no remaining section: the whole price goes to the seller on transfer. */
const remainingOf = (p) => (p.totalRemaining == null && p.paymentToSeller === p.unitPrice ? 0 : p.totalRemaining);

/** The arithmetic every transcribed plan must satisfy (and the page's selling price it must match), as reasons. */
export function planProblems(p, unit = null) {
  const probs = [];
  const int = (v) => Number.isInteger(v);
  if (!int(p.unitPrice) || p.unitPrice <= 0) probs.push("unitPrice missing");
  if (!int(p.paymentToSeller) || p.paymentToSeller < 0) probs.push("paymentToSeller missing");
  const remaining = remainingOf(p);
  if (!int(remaining) || remaining < 0) probs.push("totalRemaining missing");
  if (probs.length) return probs;
  if (p.paymentToSeller + remaining !== p.unitPrice) probs.push(`seller ${p.paymentToSeller} + remaining ${remaining} ≠ unit price ${p.unitPrice}`);
  const rows = Array.isArray(p.instalments) ? p.instalments : [];
  rows.forEach((r, i) => {
    if (!isObject(r) || typeof r.label !== "string" || !pyStrip(r.label) || !int(r.amount) || r.amount < 0 || (r.dueDate != null && !isCalendarDay(r.dueDate))) {
      probs.push(`instalment ${i + 1} malformed (label, dueDate YYYY-MM-DD or null, whole amount)`);
    }
  });
  const sum = rows.reduce((a, r) => a + (int(r?.amount) ? r.amount : 0), 0);
  if (sum !== remaining) probs.push(`instalments sum ${sum} ≠ remaining ${remaining}`);
  for (const k of ["dldFee", "trusteeFee", "commission", "totalOnTransfer", "totalCosts"]) if (p[k] != null && !int(p[k])) probs.push(`${k} not a whole number`);
  const others = Array.isArray(p.otherOnTransfer) ? p.otherOnTransfer : [];
  if (p.totalOnTransfer != null && int(p.totalOnTransfer)) {
    const transfer = p.paymentToSeller + (p.dldFee ?? 0) + (p.trusteeFee ?? 0) + (p.commission ?? 0) + others.reduce((a, o) => a + (int(o?.amount) ? o.amount : 0), 0);
    if (Math.abs(transfer - p.totalOnTransfer) > ROUNDING_AED) probs.push(`transfer rows sum ${transfer} ≠ total on transfer ${p.totalOnTransfer}`);
    if (p.totalCosts != null && Math.abs(p.totalOnTransfer + remaining - p.totalCosts) > ROUNDING_AED) {
      probs.push(`total on transfer ${p.totalOnTransfer} + remaining ${remaining} ≠ total costs ${p.totalCosts}`);
    }
  }
  const selling = unit ? money(unit.fields["Selling price"]) : null;
  if (selling && selling !== p.unitPrice) probs.push(`the page's selling price ${selling} ≠ the plan's unit price ${p.unitPrice} (price changed?)`);
  return probs;
}

/** "AED 2,980,000" → 2980000; anything else (another currency, "AED 3.6M", a figure under five digits) is unreadable. */
function money(s) {
  const m = MONEY_RE.exec(s ?? "");
  if (!m) return null;
  const n = Number(m[1].replace(/[^\d]/g, ""));
  return n >= 10_000 ? n : null;
}

function canon(value, list, mapping, names) {
  const v = pyStrip(value);
  if (!v) return [null, null];
  const low = v.toLowerCase();
  for (const x of list) if (x.toLowerCase() === low) return [x, null];
  if (mapping[low]) return [mapping[low], null];
  return ["Other", names[low] ?? v];
}

function unitType(fields) {
  const t = (fields.Type ?? "").toLowerCase();
  const beds = (fields.Bedrooms ?? "").toUpperCase();
  if (t.includes("penthouse")) return "penthouse";
  if (t.includes("townhouse")) return "townhouse";
  if (t.includes("villa") || t.includes("mansion")) return "villa";
  if (beds.includes("STUDIO")) return "studio";
  const m = /^(\d+)/.exec(beds);
  if (m) return Number(m[1]) >= 5 ? "5br" : `${Number(m[1])}br`;
  return null;
}

/** "Q2 2028" → the quarter's last day, "2028" → Dec 31, "NOV 2027" / "JUNE 2028" → the month's last day, else null (ready / unknown). */
export function handover(s) {
  const v = pyStrip(s).toUpperCase();
  let m = QUARTER_RE.exec(v);
  if (m) return `${m[2]}-${["03-31", "06-30", "09-30", "12-31"][Number(m[1]) - 1]}`;
  m = /^(\d{4})$/.exec(v);
  if (m) return `${m[1]}-12-31`;
  m = /^([A-Z]{3,9})\s+(\d{4})$/.exec(v);
  const month = m ? MONTHS.findIndex((name) => name.startsWith(m[1])) : -1;
  if (month < 0) return null;
  const last = new Date(Date.UTC(Number(m[2]), month + 1, 0)).getUTCDate();
  return `${m[2]}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function size(fields) {
  for (const k of ["Size", "BUA"]) {
    const m = /([\d,]+)/.exec(fields[k] ?? "");
    if (m) return Number(m[1].replace(/,/g, "")) || null;
  }
  return null;
}

function description(u) {
  const f = u.fields;
  const feats = FEATURE_KEYS.filter((k) => ["✔", "✓"].includes(pyStrip(f[k])));
  const parts = [];
  if (feats.length) parts.push(`Features: ${feats.join(", ")}.`);
  if (f.Plot) parts.push(`Plot: ${f.Plot}.${f.BUA ? ` Built-up area: ${f.BUA}.` : ""}`);
  if (f["Rented for"]) parts.push(`Currently rented for ${f["Rented for"]} a year.`);
  return cut(parts.join(" "), 3000);
}

/** "April 18, 2026" → "2026-04-18", else null. */
function postedDay(s) {
  const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(pyStrip(s));
  const month = m ? MONTHS.indexOf(m[1].toUpperCase()) : -1;
  if (month < 0) return null;
  const day = `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return isCalendarDay(day) ? day : null;
}

/**
 * The manifest entry for a unit whose plan passed planProblems, or {skip} with the reason it can't be listed. Figures:
 * the original (SPA) price from the plan's DLD line (4% of OP + 40) or the posted "Original Price + DLD 4%" ÷ 1.04,
 * paid = original − remaining plan, asking = what the seller gets, next instalment = the first dated one from today.
 */
export function buildEntry(u, plan, today, rules) {
  const f = u.fields;
  const ref = u.ref;
  const p = { ...plan, totalRemaining: remainingOf(plan) };
  const ut = unitType(f);
  if (!ut) return { skip: `unit type not recognised (${f.Type ?? "—"}, ${f.Bedrooms ?? "—"})` };
  const sz = size(f);
  if (!sz) return { skip: "no size" };
  // The page's wording drifting (a changed label, "AED 3.6M", square metres, "Q2-2028") must not change a listed unit's
  // figures: a line that is there but can't be read as it was yesterday keeps the previous entry, or leaves a new unit out.
  const sizeText = pyStrip(f.Size ?? f.BUA);
  if (/sq\.?\s*m\b|m²|sqm/i.test(sizeText)) return { skip: `size not in sq ft (${sizeText})` };
  const origLine = pyStrip(f["Original Price + DLD 4%"]);
  const origDld = money(origLine);
  if (origLine && !origDld) return { skip: `the posted original price can't be read (${origLine})` };
  const sellingLine = pyStrip(f["Selling price"]);
  if (sellingLine && !money(sellingLine)) return { skip: `the posted selling price can't be read (${sellingLine})` };
  const handoverText = pyStrip(f.Handover);
  const handoverDate = handover(handoverText);
  if (!handoverDate && /\d{4}/.test(handoverText) && !/^READY/i.test(handoverText)) return { skip: `the posted handover can't be read (${handoverText})` };
  const ready = p.totalRemaining === 0;
  let op = null;
  if (ready) {
    // Fully paid: the DLD line is 4% of the sale price, so the original price comes only from the posted
    // "Original Price + DLD 4%" (else it's taken as the selling price).
    op = origDld ? pyRound(origDld / 1.04) : p.unitPrice;
  } else if (p.dldFee) op = pyRound((p.dldFee - 40) / 0.04);
  if (!ready && origDld && (op == null || Math.abs(op * 1.04 - origDld) > 0.01 * origDld)) op = op == null ? pyRound(origDld / 1.04) : op;
  if (!op) return { skip: "original price unknown" };
  if (op < p.totalRemaining) return { skip: `original price ${op} below the remaining plan ${p.totalRemaining}` };
  const paid = op - p.totalRemaining;
  const paymentPlan = (p.instalments ?? []).filter((i) => i.amount).map((i) => ({ label: cut(i.label, 60), dueDate: i.dueDate ?? null, amount: Math.trunc(i.amount) }));
  const dated = paymentPlan.filter((i) => i.dueDate);
  const next = dated.find((i) => i.dueDate >= today) ?? dated[dated.length - 1] ?? null;
  let [dev, devOther] = canon(f.Developer, rules.DEV, DEV_MAP, DEV_NAMES);
  if (dev == null) [dev, devOther] = ["Other", "Not stated"]; // the ready villas name no developer: our team fills it in before approval
  const [com, comOther] = canon(f.Area, rules.COM, COM_MAP, COM_NAMES);
  if (com == null) return { skip: "no area" };
  const floor = cut(pyStrip(f.Floor).replace(/^[() ]+|[() ]+$/g, ""), 40) || null;
  const viewText = pyStrip(f.View);
  const view = ["", "none", "-"].includes(viewText.toLowerCase()) ? null : cut(viewText, 80);
  const listing = {
    projectName: cut(f.Project ?? "", 120),
    developer: dev,
    developerOther: devOther,
    community: com,
    communityOther: comOther,
    unitType: ut,
    sizeSqft: sz,
    floor,
    view,
    originalPrice: op,
    amountPaid: paid,
    askingPrice: p.paymentToSeller,
    handoverDate,
    nextInstalmentDate: next ? next.dueDate : null,
    nextInstalmentAmount: next ? next.amount : null,
    paymentPlan,
    motivation: "motivated",
    description: description(u),
  };
  const notes = [`Posted on DistressStock ${u.posted}: ${u.title}. Figures are as posted — check the current statement of account with the listing broker before approval.`];
  if (p.notes && !/^(All checks pass|The image adds up|Ready unit|Ready\/full-payment)/.test(p.notes)) notes.push(`Payment plan reading: ${p.notes}`);
  if (origDld) notes.push(`Source: original price + DLD 4% = AED ${thousands(origDld)}; selling price AED ${thousands(p.unitPrice)}.`);
  const past = dated.filter((i) => i.dueDate < today);
  if (past.length) notes.push(`${past.length} instalment(s) in the posted plan fall before today (${past.map((i) => i.label).join(", ")}): confirm whether they were paid.`);
  if ((f.Handover ?? "").toUpperCase().startsWith("READY")) notes.push("Ready property (handover done).");
  const over = u.sections.filter((s) => s.heading.toUpperCase().includes("OVERVIE")).flatMap((s) => s.images);
  const keys = u.sections.filter((s) => s.heading.toUpperCase().includes("KEYPLAN")).flatMap((s) => s.images);
  const photos = [
    ...over.slice(0, 4).map((src, i) => ({ filename: `${ref}-o${i}.webp`, url: absoluteUrl(src) })),
    ...keys.slice(0, 1).map((src, i) => ({ filename: `${ref}-k${i}.webp`, url: absoluteUrl(src) })),
  ];
  return { entry: { ref, url: u.url, posted: postedDay(u.posted), listing, photos, notes: cut(notes.join(" "), 2000) } };
}

/** The entry with its keys in the manifest's order (unknown ones last), `removed` only when set. */
function normalizeEntry(e) {
  const pick = (obj, keys) => {
    const out = {};
    for (const k of keys) if (k in obj) out[k] = obj[k];
    for (const k of Object.keys(obj).sort()) if (!keys.includes(k)) out[k] = obj[k];
    return out;
  };
  const out = pick(e, UNIT_KEYS);
  if (isObject(out.listing)) out.listing = pick(out.listing, LISTING_KEYS);
  if (out.removed == null) delete out.removed;
  return out;
}

/** The fields that differ between two entries of the same unit (photos aside: the previous list is kept on purpose). */
function entryChanges(before, after) {
  const changes = {};
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  for (const k of ["posted", "notes"]) if (!same(before[k], after[k])) changes[k] = [before[k] ?? null, after[k] ?? null];
  for (const k of LISTING_KEYS) if (!same(before.listing?.[k], after.listing?.[k])) changes[k] = [before.listing?.[k] ?? null, after.listing?.[k] ?? null];
  return changes;
}

/**
 * What today's page means for the manifest, given the plan transcribed for it and the previous entry:
 *   excluded — never listed (bulk, retail, outside Dubai);
 *   flag     — the agent has to (re)read the plan image: none transcribed yet (new / not transcribed), the image on
 *              the page is another one (image changed), or the figures don't add up (inconsistent);
 *   skip     — can't be listed as posted (no plan image, plan marked illegible, no size, …);
 *   ok       — a fresh entry.
 */
export function assess(u, was, plans, rules, today) {
  const excluded = exclusion(u);
  if (excluded) return { kind: "excluded", reason: excluded };
  const images = planImages(u);
  const image = images[0] ?? null;
  if (!image) return { kind: "skip", reason: "no payment-plan image on the page", image };
  const plan = plans[u.ref];
  if (!plan) return { kind: "flag", reason: was ? "not transcribed" : "new", image, images };
  if (plan.image !== image) return { kind: "flag", reason: "image changed", image, images, detail: `the plans file was read from ${plan.image}` };
  if (plan.legible === false) return { kind: "skip", reason: `plan not legible${plan.notes ? ` — ${plan.notes}` : ""}`, image };
  const problems = planProblems(plan, u);
  if (problems.length) return { kind: "flag", reason: "inconsistent", image, images, detail: problems.join("; ") };
  const built = buildEntry(u, plan, today, rules);
  if (built.skip) return { kind: "skip", reason: built.skip, image };
  const refused = validateEntry(built.entry, rules);
  if (refused.length) return { kind: "skip", reason: `the import would refuse it: ${refused.join("; ")}`, image };
  return { kind: "ok", entry: built.entry, image };
}

// ---------------------------------------------------------------------------------------------------------------------
// The files.

async function readManifest() {
  let doc;
  try {
    doc = await readJson(MANIFEST_PATH);
  } catch (err) {
    if (err.code === "ENOENT") return { format: IMPORT_FORMAT, source: SOURCE, generatedAt: null, units: [] };
    throw new Error(`${rel(MANIFEST_PATH)}: ${err.message}`);
  }
  if (doc?.format !== IMPORT_FORMAT || doc.source?.key !== SOURCE.key || !Array.isArray(doc.units)) {
    throw new Error(`${rel(MANIFEST_PATH)}: not an ${IMPORT_FORMAT} file for ${SOURCE.key}`);
  }
  for (const e of doc.units) if (!isObject(e) || typeof e.ref !== "string") throw new Error(`${rel(MANIFEST_PATH)}: a unit without a ref`);
  return doc;
}

async function readPlans() {
  let doc;
  try {
    doc = await readJson(PLANS_PATH);
  } catch (err) {
    if (err.code !== "ENOENT") throw new Error(`${rel(PLANS_PATH)}: ${err.message}`);
    console.warn(`sync-distressstock: ${rel(PLANS_PATH)} is missing — every plan counts as not transcribed`);
    return {};
  }
  if (doc?.format !== PLANS_FORMAT || doc.source !== SOURCE.key || !isObject(doc.plans)) {
    throw new Error(`${rel(PLANS_PATH)}: not an ${PLANS_FORMAT} file for ${SOURCE.key}`);
  }
  for (const [ref, p] of Object.entries(doc.plans)) if (!isObject(p) || typeof p.image !== "string") throw new Error(`${rel(PLANS_PATH)}: plan ${ref} needs its image url`);
  return doc.plans;
}

async function readUnits(dir) {
  const file = path.join(dir, "units.json");
  let units;
  try {
    units = await readJson(file);
  } catch (err) {
    throw new Error(`${file}: ${err.message} (run fetch first)`);
  }
  if (!Array.isArray(units) || !units.length) throw new Error(`${file}: no units (run fetch first)`);
  for (const u of units) if (!isObject(u) || typeof u.ref !== "string" || !isObject(u.fields) || !Array.isArray(u.sections)) throw new Error(`${file}: not the parser's output`);
  return units.slice().sort(byRef);
}

/** A short name for a unit in the summaries. */
const label = (u) => (u?.title ? u.title : u?.listing ? `${u.listing.projectName} (${u.listing.unitType})` : "");

// ---------------------------------------------------------------------------------------------------------------------
// fetch

class CookieJar {
  constructor(file) {
    this.file = file;
    this.cookies = new Map();
  }

  async load() {
    let text;
    try {
      text = await readFile(this.file, "utf8");
    } catch {
      return;
    }
    for (const raw of text.split("\n")) {
      const httpOnly = raw.startsWith("#HttpOnly_");
      const line = httpOnly ? raw.slice("#HttpOnly_".length) : raw;
      if (!line.trim() || line.startsWith("#")) continue;
      const p = line.split("\t");
      if (p.length >= 7) this.cookies.set(p[5], { value: p[6], expires: Number(p[4]) || 0, httpOnly, secure: p[3] === "TRUE", path: p[2] || "/" });
    }
  }

  async save() {
    const lines = ["# Netscape HTTP Cookie File", "# The DistressStock session of scripts/partner-stock/sync-distressstock.mjs — never commit it.", ""];
    for (const [name, c] of this.cookies) lines.push(`${c.httpOnly ? "#HttpOnly_" : ""}${HOST}\tFALSE\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${c.expires}\t${name}\t${c.value}`);
    await writeFile(this.file, `${lines.join("\n")}\n`);
  }

  take(setCookies) {
    for (const sc of setCookies) {
      const [pair, ...attrs] = sc.split(";");
      const eq = pair.indexOf("=");
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const a = Object.fromEntries(
        attrs.map((x) => {
          const [k, ...v] = x.trim().split("=");
          return [k.toLowerCase(), v.join("=")];
        }),
      );
      let expires = 0;
      if (a["max-age"]) expires = Math.floor(Date.now() / 1000) + Number(a["max-age"]);
      else if (a.expires) expires = Math.floor(Date.parse(a.expires) / 1000) || 0;
      if (expires && expires < Date.now() / 1000) this.cookies.delete(name);
      else this.cookies.set(name, { value: pair.slice(eq + 1).trim(), expires, httpOnly: "httponly" in a, secure: "secure" in a, path: a.path || "/" });
    }
  }

  header() {
    const now = Date.now() / 1000;
    return [...this.cookies]
      .filter(([, c]) => !c.expires || c.expires > now)
      .map(([n, c]) => `${n}=${c.value}`)
      .join("; ");
  }
}

/** The site, politely: one request at a time, at least REQUEST_GAP_MS apart, cookies kept, one retry per page. */
class Site {
  constructor(jar) {
    this.jar = jar;
    this.last = 0;
    this.requests = 0;
  }

  async request(url, init = {}) {
    const wait = this.last + REQUEST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    this.last = Date.now();
    this.requests++;
    const headers = { "user-agent": USER_AGENT, ...init.headers };
    const cookie = this.jar.header();
    if (cookie) headers.cookie = cookie;
    const res = await fetch(url, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    this.jar.take(res.headers.getSetCookie?.() ?? []);
    return res;
  }

  /** GET, following redirects on this site, with one retry on a network error or a bad status. */
  async get(pathname) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await sleep(1000);
      try {
        let url = SITE + pathname;
        for (let hops = 0; hops < 4; hops++) {
          const res = await this.request(url);
          if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.get("location")) {
            await res.body?.cancel();
            const next = new URL(res.headers.get("location"), url);
            if (next.hostname !== HOST) throw new Error(`redirected off the site to ${next.hostname}`);
            url = next.href;
            continue;
          }
          if (res.status !== 200) {
            await res.body?.cancel();
            throw new Error(`HTTP ${res.status}`);
          }
          return res;
        }
        throw new Error("too many redirects");
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`${pathname}: ${lastError?.message ?? lastError} (after one retry)`);
  }

  async text(pathname) {
    return (await this.get(pathname)).text();
  }

  async login(password) {
    const res = await this.request(`${SITE}/`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: SITE, referer: `${SITE}/` },
      body: new URLSearchParams({ next: "/", password }).toString(),
    });
    await res.body?.cancel();
    return res.status;
  }
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    console.warn("sync-distressstock: sharp isn't available — the plan images are saved as served, without PNG copies.");
    return null;
  }
}

async function cmdFetch(opts) {
  const dir = path.resolve(needRaw(opts));
  // The pages and the session cookie never go near the (public) repository.
  if (dir === ROOT || dir.startsWith(`${ROOT}${path.sep}`)) die(`--raw ${dir} is inside the repository — use a folder outside it (the saved pages and cookies.txt must never be committed).`);
  const password = process.env.DISTRESSSTOCK_PASSWORD;
  if (!password) die("DISTRESSSTOCK_PASSWORD is not set — the partner site's password (ask the owner; never write it into the repo).");
  await mkdir(path.join(dir, "units"), { recursive: true });
  await mkdir(path.join(dir, "plans"), { recursive: true });
  const jar = new CookieJar(path.join(dir, "cookies.txt"));
  await jar.load();
  const site = new Site(jar);

  // The gate: a saved session may still be good; otherwise log in and look again.
  let index = await site.text("/");
  if (index.includes("v2-gate")) {
    const status = await site.login(password);
    index = await site.text("/");
    if (index.includes("v2-gate")) die(`the gate stays after logging in (POST / answered ${status}) — wrong DISTRESSSTOCK_PASSWORD, or the site changed its login.`);
  }
  await jar.save();
  const refs = indexRefs(index);
  if (!refs.length) die("the index lists 0 units — the site changed its layout, or the catalogue is really empty; nothing written.");
  await writeFile(path.join(dir, "index.html"), index);
  console.log(`index: ${refs.length} units`);

  const units = [];
  for (const ref of refs) {
    const html = await site.text(`/u/${ref}`);
    if (html.includes("v2-gate")) die(`/u/${ref}: the gate came back mid-way (session lost); run fetch again.`);
    await writeFile(path.join(dir, "units", `${ref}.html`), html);
    units.push(parseUnitPage(html, ref));
  }
  units.sort(byRef);
  await writeJson(path.join(dir, "units.json"), units);
  console.log(`pages: ${units.length} saved and parsed`);

  // The payment-plan images (served without login), plus PNG copies the agent's image reader can open.
  const sharp = await loadSharp();
  let images = 0;
  for (const u of units) {
    if (exclusion(u)) continue;
    const plans = planImages(u);
    for (const [i, url] of plans.entries()) {
      const suffix = i ? `-${i + 1}` : "";
      const ext = path.extname(new URL(url).pathname) || ".img";
      const res = await site.get(new URL(url).pathname);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(path.join(dir, "plans", `${u.ref}${suffix}${ext}`), buf);
      images++;
      if (sharp) {
        try {
          await sharp(buf).png().toFile(path.join(dir, "plans", `${u.ref}${suffix}.png`));
        } catch (err) {
          console.warn(`sync-distressstock: ${u.ref}: PNG copy failed (${err?.message ?? err}); open the ${ext} file instead.`);
        }
      }
    }
  }
  console.log(`plans: ${images} images saved under ${path.join(dir, "plans")} (${site.requests} requests in all)`);

  const delta = await computeDelta(units, dir, nowIso());
  await writeJson(path.join(dir, "delta.json"), delta);
  printDelta(delta);
}

const pngPath = (dir, ref, i = 0) => path.join(dir, "plans", `${ref}${i ? `-${i + 1}` : ""}.png`);

/** Today's pages against the committed manifest and plans file. */
async function computeDelta(units, dir, fetchedAt) {
  const [rules, plans, manifest] = await Promise.all([repoRules(), readPlans(), readManifest()]);
  const today = dubaiToday();
  const prev = new Map(manifest.units.map((e) => [e.ref, e]));
  const onSite = new Set(units.map((u) => u.ref));
  const delta = { fetchedAt, unitsOnSite: units.length, new: [], removed: [], restored: [], changed: [], needsPlan: [], excluded: [], labels: {} };
  for (const u of units) {
    const was = prev.get(u.ref);
    delta.labels[u.ref] = u.title;
    const a = assess(u, was, plans, rules, today);
    if (a.kind === "excluded" || a.kind === "skip") {
      delta.excluded.push({ ref: u.ref, reason: a.reason });
      if (a.kind === "excluded") continue;
    }
    if (!was) delta.new.push({ ref: u.ref, title: u.title, url: u.url });
    else if (was.removed) delta.restored.push(u.ref);
    if (a.kind === "flag") {
      const entry = { ref: u.ref, image: a.image, pngPath: pngPath(dir, u.ref), reason: a.reason };
      if (a.detail) entry.detail = a.detail;
      if (a.images.length > 1) entry.moreImages = a.images.slice(1).map((image, i) => ({ image, pngPath: pngPath(dir, u.ref, i + 1) }));
      delta.needsPlan.push(entry);
    }
    if (a.kind === "ok" && was) {
      const fields = entryChanges(was, a.entry);
      if (Object.keys(fields).length) delta.changed.push({ ref: u.ref, fields });
    }
  }
  for (const e of manifest.units) {
    if (onSite.has(e.ref) || e.removed) continue;
    delta.removed.push(e.ref);
    delta.labels[e.ref] = label(e);
  }
  return delta;
}

function printDelta(d) {
  const name = (ref) => (d.labels?.[ref] ? `  ${d.labels[ref]}` : "");
  console.log(
    `DistressStock ${d.fetchedAt.slice(0, 10)}: ${d.unitsOnSite} units on the site — ${d.new.length} new, ${d.removed.length} removed, ` +
      `${d.restored.length} back, ${d.changed.length} changed, ${d.needsPlan.length} need a plan read, ${d.excluded.length} excluded`,
  );
  for (const n of d.new) console.log(`  new        ${n.ref}  ${n.title}  ${n.url}`);
  for (const r of d.removed) console.log(`  removed    ${r}${name(r)}`);
  for (const r of d.restored) console.log(`  back       ${r}${name(r)}`);
  for (const c of d.changed) console.log(`  changed    ${c.ref}  ${Object.keys(c.fields).join(", ")}`);
  for (const p of d.needsPlan) console.log(`  plan       ${p.ref}  ${p.reason}${p.detail ? ` (${p.detail})` : ""}  → ${p.pngPath}${p.moreImages ? ` (+${p.moreImages.length} more)` : ""}`);
  for (const e of d.excluded) console.log(`  excluded   ${e.ref}  ${e.reason}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// build

async function cmdBuild(opts) {
  const dir = path.resolve(needRaw(opts));
  const today = opts.today ?? dubaiToday();
  if (!isCalendarDay(today)) die(`--today must be a calendar day (YYYY-MM-DD), not ${opts.today}`);
  const units = await readUnits(dir);
  const [rules, plans, manifest] = await Promise.all([repoRules(), readPlans(), readManifest()]);
  const prev = new Map(manifest.units.map((e) => [e.ref, e]));
  const onSite = new Set(units.map((u) => u.ref));
  const out = [];
  const s = { today, listed: 0, new: [], updated: [], removed: [], restored: [], dropped: [], flagged: [], skipped: [], excluded: [] };

  for (const u of units) {
    const was = prev.get(u.ref);
    const a = assess(u, was, plans, rules, today);
    if (a.kind === "excluded") {
      s.excluded.push({ ref: u.ref, title: u.title, reason: a.reason, wasListed: !!was });
      // Listed before and excluded now (re-posted as a bulk deal, say — or the page's wording drifted): kept as it was,
      // so a rule never withdraws it and it is still marked removed the day it really leaves the site; the summary says.
      if (was) out.push(normalizeEntry(was));
      continue;
    }
    if (a.kind === "flag" || a.kind === "skip") {
      const item = { ref: u.ref, title: u.title, reason: a.reason, kept: !!was };
      if (a.detail) item.detail = a.detail;
      if (a.kind === "flag") Object.assign(item, { image: a.image, pngPath: pngPath(dir, u.ref) });
      (a.kind === "flag" ? s.flagged : s.skipped).push(item);
      if (was) {
        const kept = normalizeEntry(was);
        if (kept.removed) {
          delete kept.removed; // it is on the site again, whatever its plan needs
          s.restored.push(u.ref);
        }
        out.push(kept);
      }
      continue;
    }
    const entry = a.entry;
    if (was) {
      if (Array.isArray(was.photos) && was.photos.length) entry.photos = was.photos; // the site reshuffles galleries; the import keys photos by name
      if (was.removed) s.restored.push(u.ref);
      const fields = Object.keys(entryChanges(was, entry));
      if (fields.length) s.updated.push({ ref: u.ref, title: u.title, fields });
    } else s.new.push({ ref: u.ref, title: u.title });
    out.push(normalizeEntry(entry));
  }

  for (const e of manifest.units) {
    if (onSite.has(e.ref)) continue;
    const kept = normalizeEntry(e);
    if (!kept.removed) {
      kept.removed = today;
      s.removed.push({ ref: e.ref, title: label(e) });
    } else if (daysBetween(kept.removed, today) > REMOVED_KEEP_DAYS) {
      s.dropped.push({ ref: e.ref, title: label(e), removed: kept.removed });
      continue;
    }
    out.push(kept);
  }

  const previouslyListed = manifest.units.filter((e) => !e.removed).length;
  if (s.removed.length > MASS_REMOVAL_MIN && s.removed.length > MASS_REMOVAL_SHARE * previouslyListed && !opts.allowMassRemoval) {
    console.error(
      `sync-distressstock: ${s.removed.length} of the ${previouslyListed} listed units are not on the site today (${s.removed.map((r) => r.ref).join(", ")}). ` +
        `That is more than ${Math.round(MASS_REMOVAL_SHARE * 100)}% at once — more likely a half-fetched index, a changed site or a wrong session than ${s.removed.length} sales. ` +
        "Nothing was written. Check the site by hand; if the units really are gone, run build again with --allow-mass-removal.",
    );
    process.exit(3);
  }

  out.sort(byRef);
  const refused = out.flatMap((e) => validateEntry(e, rules).map((why) => `${e.ref}: ${why}`));
  if (refused.length) die(`the manifest would be refused by the import — nothing written:\n  ${refused.join("\n  ")}`);
  // The production import has the same valve; a mass removal let through here is let through there by the file itself
  // (sync.allowMassRemoval), for this build only: the next day's build, run without the switch, drops the key.
  const sync = opts.allowMassRemoval && s.removed.length ? { allowMassRemoval: true } : null;
  const unchanged = JSON.stringify(out) === JSON.stringify(manifest.units.map(normalizeEntry).sort(byRef)) && JSON.stringify(sync) === JSON.stringify(manifest.sync ?? null);
  const doc = { format: IMPORT_FORMAT, source: SOURCE, generatedAt: unchanged && manifest.generatedAt ? manifest.generatedAt : nowIso(), ...(sync ? { sync } : {}), units: out };
  await writeJson(MANIFEST_PATH, doc);
  s.listed = out.filter((e) => !e.removed).length;
  s.needsTranscription = s.flagged.length > 0;
  await writeJson(path.join(dir, "build.json"), s);
  printBuild(s, previouslyListed, unchanged);
  process.exit(s.flagged.length ? 2 : 0);
}

function printBuild(s, previouslyListed, unchanged) {
  const n = (k) => s[k].length;
  console.log(
    `${rel(MANIFEST_PATH)} ${unchanged ? "unchanged" : "written"} for ${s.today}: ${s.listed} listed (${previouslyListed} before) — ${n("new")} new, ${n("updated")} updated, ` +
      `${n("removed")} removed, ${n("restored")} back, ${n("dropped")} dropped after ${REMOVED_KEEP_DAYS} days, ${n("flagged")} flagged, ${n("skipped")} skipped, ${n("excluded")} excluded`,
  );
  for (const x of s.new) console.log(`  new        ${x.ref}  ${x.title}`);
  for (const x of s.updated) console.log(`  updated    ${x.ref}  ${x.fields.join(", ")}  (${x.title})`);
  for (const x of s.removed) console.log(`  removed    ${x.ref}  ${x.title}  → "removed": "${s.today}"`);
  for (const x of s.restored) console.log(`  back       ${x}`);
  for (const x of s.dropped) console.log(`  dropped    ${x.ref}  ${x.title}  (removed ${x.removed})`);
  for (const x of s.flagged) console.log(`  flagged    ${x.ref}  ${x.reason}${x.detail ? ` (${x.detail})` : ""} — ${x.kept ? "previous entry kept" : "left out"}; read ${x.pngPath}`);
  for (const x of s.skipped) console.log(`  skipped    ${x.ref}  ${x.reason} — ${x.kept ? "previous entry kept" : "left out"}  (${x.title})`);
  for (const x of s.excluded) console.log(`  excluded   ${x.ref}  ${x.reason}${x.wasListed ? " — was in the manifest: previous entry kept, tell the user" : ""}  (${x.title})`);
  if (s.flagged.length) console.log(`${s.flagged.length} unit(s) need their payment plan transcribed into ${rel(PLANS_PATH)}; then run build again (exit 2).`);
}

// ---------------------------------------------------------------------------------------------------------------------
// diff, parse

async function cmdDiff(opts) {
  const file = path.join(path.resolve(needRaw(opts)), "delta.json");
  let delta;
  try {
    delta = await readJson(file);
  } catch (err) {
    die(`${file}: ${err.message} (run fetch first)`);
  }
  printDelta(delta);
}

async function cmdDelta(opts) {
  const dir = path.resolve(needRaw(opts));
  const delta = await computeDelta(await readUnits(dir), dir, nowIso());
  await writeJson(path.join(dir, "delta.json"), delta);
  printDelta(delta);
}

async function cmdParse(opts) {
  const dir = path.resolve(needRaw(opts));
  const names = (await readdir(path.join(dir, "units"))).filter((n) => n.endsWith(".html")).sort();
  const units = [];
  for (const name of names) units.push(parseUnitPage(await readFile(path.join(dir, "units", name), "utf8"), name.slice(0, -5)));
  units.sort(byRef);
  await writeJson(path.join(dir, "units.json"), units);
  console.log(`parsed ${units.length} pages into ${path.join(dir, "units.json")}`);
}

// ---------------------------------------------------------------------------------------------------------------------

function needRaw(opts) {
  if (!opts.raw) die("--raw <dir> is required");
  return opts.raw;
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { raw: null, today: null, allowMassRemoval: false };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--raw" && rest[i + 1]) opts.raw = rest[++i];
    else if (rest[i] === "--today" && rest[i + 1]) opts.today = rest[++i];
    else if (rest[i] === "--allow-mass-removal") opts.allowMassRemoval = true;
    else die(`unknown option ${rest[i]}`);
  }
  return { cmd, opts };
}

async function main() {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  const commands = { fetch: cmdFetch, build: cmdBuild, diff: cmdDiff, delta: cmdDelta, parse: cmdParse };
  if (!commands[cmd]) die("usage: sync-distressstock.mjs fetch|build|diff|delta|parse --raw <dir> [--today YYYY-MM-DD] [--allow-mass-removal]");
  // Node's fetch ignores HTTPS_PROXY unless told to (NODE_USE_ENV_PROXY): run the network command under it when a proxy is set.
  if (cmd === "fetch" && (process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(process.execPath, ["--disable-warning=UNDICI-EHPA", ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
    process.exit(r.status ?? 1);
  }
  await commands[cmd](opts);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => die(err?.message ?? String(err)));
}
