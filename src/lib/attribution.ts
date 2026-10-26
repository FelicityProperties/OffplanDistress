import type { Source } from "@/db/schema";

// First-touch attribution: the campaign tags, partner ?ref= code, landing page and referring site of the visit that
// brought someone here. Kept in sessionStorage for the tab's lifetime (not a cookie, so the Cookie Policy stays
// true), sent with the seller estimate, sign-up, listing and enquiry forms, and stored with each record.

export type { Source };

const KEY = "od_src";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "ref", "landing", "referrer_host"] as const;

/** Known keys only, trimmed strings up to 200 characters; null when nothing is left. Safe on untrusted input. */
export function sanitizeSource(v: unknown): Source | null {
  if (!v || typeof v !== "object") return null;
  const out: Source = {};
  for (const k of FIELDS) {
    const s = (v as Record<string, unknown>)[k];
    if (typeof s === "string" && s.trim()) out[k] = s.trim().slice(0, 200);
  }
  return Object.keys(out).length ? out : null;
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

/** Browser: the stored attribution as the JSON the forms send, or "" when there is none. */
export function readAttribution(): string {
  // A form's effect runs before the layout's, so on the landing page itself it would otherwise read nothing yet.
  captureAttribution();
  try {
    const src = sanitizeSource(JSON.parse(sessionStorage.getItem(KEY) || "null"));
    return src ? JSON.stringify(src) : "";
  } catch {
    return "";
  }
}
