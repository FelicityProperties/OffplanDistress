import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { BRAND } from "./config";
import { normalizeEmail } from "./newsletter";
import { siteUrl } from "./site-url";

// Bot and spam defences for the public forms (the contact / viewing form, src/app/actions/market.ts, and the free
// seller estimate, src/app/actions/leads.ts). Three cheap checks that cost a visitor nothing, in the order the actions
// run them: a honeypot field nobody sees, a server-signed timestamp that says when the form was rendered (a script
// that posts straight to the action has none; one that fetched the page and posted at once is too quick), and, for
// messages, a small content score for the "get your site into Google's index" kind of submission. Caught messages are
// still stored (flagged, for the admin's Spam tab) but nobody is notified. Cloudflare Turnstile is the optional extra.

/** The honeypot (name="website") is off-screen and skipped by keyboards and screen readers: only a bot fills it. */
export function honeypotTripped(formData: FormData) {
  const v = formData.get("website");
  return typeof v === "string" && v.trim() !== "";
}

/** A form token is good for this long after the page was rendered. */
export const TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000;
/** Nobody reads a form and fills three fields in under this: a quicker submission is a script. */
export const TOKEN_MIN_AGE_MS = 3000;

function tokenKey() {
  return process.env.FORM_SECRET || process.env.CRON_SECRET || "offplandistress-dev-form-token";
}

function sign(issuedAt: string) {
  return createHmac("sha256", tokenKey()).update(issuedAt).digest("base64url");
}

/**
 * "<issued at, ms>.<HMAC>", put in the form by the server component that renders it, so it is there without JavaScript
 * too. The key is FORM_SECRET, else CRON_SECRET, else a fixed development string (a token is nothing worth forging
 * beyond getting a form past this check; the content score and the limits still apply).
 */
export function issueFormToken() {
  const issuedAt = String(Date.now());
  return `${issuedAt}.${sign(issuedAt)}`;
}

/** How long ago a token was issued, in ms; null when it is missing, forged or older than TOKEN_MAX_AGE_MS. */
export function formTokenAge(token: unknown): number | null {
  if (typeof token !== "string" || token.length > 120) return null;
  const [issuedAt, mac] = token.split(".");
  if (!/^\d{10,16}$/.test(issuedAt ?? "") || !mac) return null;
  const want = Buffer.from(sign(issuedAt));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const age = Date.now() - Number(issuedAt);
  return age < 0 || age > TOKEN_MAX_AGE_MS ? null : age;
}

/** Whether the form was rendered by us, recently, and not posted back within TOKEN_MIN_AGE_MS. */
export function formTokenOk(token: unknown) {
  const age = formTokenAge(token);
  return age != null && age >= TOKEN_MIN_AGE_MS;
}

/** A message that scores this much is spam (stored flagged, nobody notified). */
export const SPAM_THRESHOLD = 3;

/** The SEO / "we can index your site" pitch, in the words every one of them uses. Matched case-insensitively. */
export const SPAM_VOCABULARY = [
  "google's index",
  "into google",
  "index your site",
  "index your website",
  // "indexed" on its own is ordinary English (a payment plan indexed to handover): only its SEO uses count.
  "not indexed",
  "get indexed",
  "indexed by google",
  "indexed on google",
  "site indexed",
  "website indexed",
  "seo",
  "backlink",
  "domain authority",
  "page 1",
  "first page of google",
  "rank your",
  "ranking on google",
  "web traffic",
  "guest post",
  "link building",
  "keywords",
  "website design",
  "web design services",
  "we noticed your website",
  "your website is not",
  "free audit",
] as const;

/** A message shorter than this never scores on wording alone ("SEO?" is a question, not a pitch). */
const VOCABULARY_MIN_LENGTH = 20;
/** The off-topic rule only looks at messages longer than this. */
const OFF_TOPIC_MIN_LENGTH = 200;
/** What a real message about property mentions at least one of (Latin script; an Arabic message is never off-topic). */
const PROPERTY_WORDS = /\b(?:project|community|unit|off-?plan|dubai|aed|price|viewing|sell|buy|call|whatsapp)/i;
const ARABIC = /[؀-ۿ]/;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole words or phrases; the end tolerates a plural s ("backlinks", "keywords") but not "seoul", "indexeddb" or "page 10".
const VOCABULARY_RE = new RegExp(`(?<![a-z0-9])(?:${SPAM_VOCABULARY.map(escape).join("|")})s?(?![a-z0-9])`, "i");
// http(s)://host, www.host, or a bare host.tld/ with a path: the host is captured.
const LINK_RE = /(?:https?:\/\/|www\.)([a-z0-9.-]+\.[a-z]{2,})|(?<![\w@.-])([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})\//gi;

/** Our own hosts: a link to them is not a sales pitch. */
function ownHosts() {
  const hosts = [new URL(siteUrl()).hostname, BRAND.email.split("@")[1]].filter(Boolean) as string[];
  return hosts.map((h) => h.toLowerCase().replace(/^www\./, ""));
}

function isOwnHost(host: string) {
  const h = host.toLowerCase().replace(/^www\./, "");
  return h.endsWith(".vercel.app") || ownHosts().some((own) => h === own || h.endsWith(`.${own}`));
}

export type SpamInput = {
  name: string;
  email: string;
  /** Not scored today; accepted so a call site can pass the submission as it is. */
  phone?: string | null;
  message?: string | null;
  locale?: string;
};

/**
 * The content score and why: +3 for the SEO vocabulary, +2 per link to a host that isn't ours, +1 for a one-word
 * name or one with digits, +1 for an address on a reserved domain or an obvious fake (src/lib/newsletter.ts), +2 for a
 * long Latin-script message that mentions nothing about property. SPAM_THRESHOLD or more is spam.
 */
export function spamScore({ name, email, message }: SpamInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const text = (message ?? "").replace(/[‘’]/g, "'").trim();

  const words = text.length >= VOCABULARY_MIN_LENGTH ? VOCABULARY_RE.exec(text) : null;
  if (words) {
    score += 3;
    reasons.push(`wording: ${words[0].toLowerCase()}`);
  }
  for (const m of text.matchAll(LINK_RE)) {
    const host = m[1] ?? m[2];
    if (host && !isOwnHost(host)) {
      score += 2;
      reasons.push(`link: ${host.toLowerCase()}`);
    }
  }
  const n = name.trim();
  if (!/\s/.test(n) || /\d/.test(n)) {
    score += 1;
    reasons.push(/\d/.test(n) ? "name with digits" : "one-word name");
  }
  if (!normalizeEmail(email)) {
    score += 1;
    reasons.push("fake or reserved email address");
  }
  if (text.length > OFF_TOPIC_MIN_LENGTH && !ARABIC.test(text) && !PROPERTY_WORDS.test(text)) {
    score += 2;
    reasons.push("nothing about property");
  }
  return { score, reasons };
}

// Cloudflare Turnstile, optional: with NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY set the forms render
// the widget (src/components/SpamGuard.tsx) and the actions check its token here; with either missing nothing is
// rendered or checked.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5000;

export function turnstileEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

/**
 * True when Turnstile is off, or Cloudflare confirms the widget's token for this visitor. A missing token, a refused
 * one, or no answer within VERIFY_TIMEOUT_MS is false (the form says "please try again"). TURNSTILE_VERIFY_URL points
 * the check at a stub in tests.
 */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetch(process.env.TURNSTILE_VERIFY_URL || VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[spam] Turnstile verification failed", err);
    return false;
  }
}
