import type { Source } from "@/db/schema";

// First-touch attribution: the campaign tags, partner ?ref= code, landing page and referring site of the visit that
// brought someone here. Kept in sessionStorage for the tab's lifetime (not a cookie, so the Cookie Policy stays
// true), sent with the seller estimate, sign-up, listing and enquiry forms, and stored with each record.
// The forms also send the tab's anonymous analytics session id (`sid`, see analyticsSessionId below), so
// /admin/analytics can show which pages a lead viewed before sending the form.

export type { Source };

const KEY = "od_src";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "ref", "landing", "referrer_host"] as const;

/**
 * Control characters and invisible / bidirectional-formatting marks, never kept from untrusted text: Postgres refuses a
 * NUL inside jsonb (a link with "?utm_campaign=%00" would make every form in that tab fail), and the others could
 * disguise text on the admin pages.
 */
export const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

/** Shape of an analytics session id (page_views.session_id): what analyticsSessionId makes, checked on the server too. */
export const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Known keys only, trimmed strings up to 200 characters; null when nothing is left. Safe on untrusted input. */
export function sanitizeSource(v: unknown): Source | null {
  if (!v || typeof v !== "object") return null;
  const out: Source = {};
  for (const k of FIELDS) {
    const s = (v as Record<string, unknown>)[k];
    const clean = typeof s === "string" ? s.replace(UNSAFE_TEXT, "").trim() : "";
    if (clean) out[k] = clean.slice(0, 200);
  }
  const sid = (v as Record<string, unknown>).sid;
  if (typeof sid === "string" && SESSION_ID_RE.test(sid)) out.sid = sid;
  return Object.keys(out).length ? out : null;
}

const SID_KEY = "od_sid";
/** A page view after this long without one starts a new analytics session (the usual 30-minute rule). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Browser: this tab's anonymous analytics session id (random, kept in sessionStorage under "od_sid", never a cookie),
 * created when missing; null when storage is blocked.
 * - "view" (the page-view tracker, on each page view): starts a new session after SESSION_IDLE_MS without activity.
 * - "touch" (the tracker, when the visitor leaves a page): marks activity, so a long read keeps its session.
 * - no mode (the forms): reads the id as it is, so a form that took a long time still belongs to its visit.
 */
export function analyticsSessionId(mode?: "view" | "touch"): string | null {
  try {
    const now = Date.now();
    let saved: { id?: unknown; at?: unknown } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SID_KEY) || "null");
    } catch {}
    const id = typeof saved?.id === "string" && SESSION_ID_RE.test(saved.id) ? saved.id : null;
    const idle = typeof saved?.at !== "number" || now - saved.at > SESSION_IDLE_MS;
    if (id && !(mode === "view" && idle)) {
      if (mode) sessionStorage.setItem(SID_KEY, JSON.stringify({ id, at: now }));
      return id;
    }
    const fresh = randomId();
    sessionStorage.setItem(SID_KEY, JSON.stringify({ id: fresh, at: now }));
    return fresh;
  } catch {
    return null;
  }
}

/** The hidden `source` form field (JSON) as submitted, for server actions. */
export function sourceFromForm(formData: FormData): Source | null {
  try {
    return sanitizeSource(JSON.parse(String(formData.get("source") || "null")));
  } catch {
    return null;
  }
}

/** Browser: remember this visit's attribution unless the tab already has one (first touch wins). */
export function captureAttribution() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const q = new URLSearchParams(location.search);
    let referrer: string | null = null;
    try {
      const host = document.referrer ? new URL(document.referrer).host : "";
      referrer = host && host !== location.host ? host : null;
    } catch {}
    const src = sanitizeSource({
      utm_source: q.get("utm_source"),
      utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"),
      ref: q.get("ref"),
      // The path only: query strings can carry tokens (password-reset links).
      landing: location.pathname,
      referrer_host: referrer,
    });
    sessionStorage.setItem(KEY, JSON.stringify(src ?? {}));
  } catch {
    // Storage blocked (private mode, disabled site data): the forms simply send no attribution.
  }
}

/** Browser: the stored attribution, plus the tab's analytics session id, as the JSON the forms send ("" when none). */
export function readAttribution(): string {
  // A form's effect runs before the layout's, so on the landing page itself it would otherwise read nothing yet.
  captureAttribution();
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(KEY) || "null");
    const src = sanitizeSource({ ...(stored && typeof stored === "object" ? stored : {}), sid: analyticsSessionId() });
    return src ? JSON.stringify(src) : "";
  } catch {
    return "";
  }
}
