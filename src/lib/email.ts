import "server-only";
import { translator } from "@/i18n/translator";
import { BRAND, OWNER_EMAILS } from "./config";
import { siteUrl } from "./site-url";

/** Resend's shared test sender: it only delivers to the Resend account owner's own address, never to our users. */
const TEST_SENDER = "onboarding@resend.dev";

/**
 * EMAIL_FROM as Resend gets it: trimmed, without quotes around the whole value (as .env files and dashboards often
 * keep them: "OffplanDistress <deals@example.com>", or the curly quotes of a copied example) or a trailing ";".
 */
function senderFrom() {
  let from = (process.env.EMAIL_FROM ?? "").trim();
  for (let i = 0; i < 2; i++) {
    from = from.replace(/;+$/, "").trim();
    const q = /^(["'“”‘’])([\s\S]*)(["'“”‘’])$/.exec(from);
    if (q) from = q[2].trim();
  }
  return from;
}

/** The address in EMAIL_FROM ("OffplanDistress <deals@example.com>" or a bare address), lower-cased; null if none. */
function senderAddress() {
  const from = senderFrom();
  const address = (/<([^<>]+)>\s*$/.exec(from)?.[1] ?? from).trim().toLowerCase();
  return /^[^\s@<>"'“”;,]+@[^\s@<>"'“”;,]+\.[^\s@<>"'“”;,]+$/.test(address) ? address : null;
}

/** EMAIL_FROM is a sender on a domain of our own (verified in Resend), so emails can reach any user. */
function hasOwnSender() {
  const address = senderAddress();
  return address != null && !address.endsWith("@resend.dev");
}

/**
 * The last time Resend refused a send for a reason only the configuration can fix (an EMAIL_FROM domain not verified,
 * an invalid key): kept in this instance until a send goes through, so the admin banner can say so (the refusal is
 * otherwise only in the server log).
 */
let lastRefusal: { status: number; error: string } | null = null;

/**
 * Whether sendEmail sends at all. Production needs RESEND_API_KEY and an EMAIL_FROM on our own domain: from Resend's
 * test sender, emails would reach only the Resend account owner, so the owner would see admin mail arrive while
 * sellers never heard about their offers. Development only needs the key (it falls back to the test sender).
 */
export function emailEnabled() {
  if (!process.env.RESEND_API_KEY) return false;
  return process.env.NODE_ENV !== "production" || hasOwnSender();
}

export type EmailOff =
  | { reason: "key" }
  | { reason: "senderUnset" }
  | { reason: "senderUnreadable"; value: string }
  | { reason: "senderTest"; value: string }
  | { reason: "rejected"; value: string; status: number; error: string };

/**
 * Why users don't get emails right now, for the admin banner and the daily digest, or null when they do: RESEND_API_KEY
 * not set; EMAIL_FROM not set, set to something that isn't an address (`value`: what the server read, so the owner can
 * see why), or Resend's test sender (in production nothing is sent, in development only the Resend account owner gets
 * them); or Resend refusing the sends (a domain not verified there, a revoked key) since the last one that went through.
 */
export function emailOffReason(): EmailOff | null {
  if (!process.env.RESEND_API_KEY) return { reason: "key" };
  const raw = (process.env.EMAIL_FROM ?? "").trim();
  if (!raw) return { reason: "senderUnset" };
  const address = senderAddress();
  if (!address) return { reason: "senderUnreadable", value: raw.slice(0, 120) };
  if (!hasOwnSender()) return { reason: "senderTest", value: address };
  if (lastRefusal) return { reason: "rejected", value: address, ...lastRefusal };
  return null;
}

/**
 * Whether an email to `to` goes out: always when emailEnabled(); otherwise, with a key, only to the owner logins
 * (ADMIN_EMAILS), from Resend's test sender. That sender still reaches the Resend account owner, so the owner's
 * alerts keep arriving while emails to sellers and buyers are off.
 */
export function canEmail(to: string) {
  return emailEnabled() || (Boolean(process.env.RESEND_API_KEY) && OWNER_EMAILS.includes(to.trim().toLowerCase()));
}

let warnedSender = false;

type Email = { to: string; subject: string; heading: string; body?: string | null; cta?: { label: string; href: string }; dir?: "ltr" | "rtl" };

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function render({ heading, body, cta, dir = "ltr" }: Email) {
  const href = cta ? (cta.href.startsWith("http") ? cta.href : `${siteUrl()}${cta.href}`) : null;
  const location = translator("common", dir === "rtl" ? "ar" : "en")("location");
  const html = `<!doctype html><html dir="${dir}"><body style="margin:0;background:#faf8f3;font-family:Inter,Segoe UI,Arial,sans-serif;color:#141c33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #ebe6dc;border-radius:14px" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:1px solid #ebe6dc;font-family:Georgia,serif;font-size:20px;font-weight:600" dir="ltr">Offplan<span style="font-weight:400;opacity:.8">Distress</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.35">${escape(heading)}</h1>
${body ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a5068;white-space:pre-line">${escape(body)}</p>` : ""}
${href && cta ? `<a href="${escape(href)}" style="display:inline-block;background:#141c33;color:#faf8f3;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">${escape(cta.label)}</a>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #ebe6dc;font-size:12px;color:#8a8fa3">${escape(BRAND.company)} · ${escape(location)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, body, href ? `${cta!.label}: ${href}` : null].filter(Boolean).join("\n\n");
  return { html, text };
}

// Resend accepts about 2 requests a second per account, and notifications fan out (a daily alert run, a price
// drop with many watchers) with every after() callback starting at once. So sends in this instance share one
// queue: whatever is waiting goes out in a single batch request (up to 100 emails), requests are spaced out,
// and a 429 is retried after the delay Resend asks for. A 1,000-recipient alert run takes ~10 requests.
const BATCH_MAX = 100;
const REQUEST_GAP_MS = 600;
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

type Payload = { from: string; to: string[]; reply_to?: string; subject: string; html: string; text: string };
type Pending = { payload: Payload; resolve: (result: { sent: boolean }) => void };

const pending: Pending[] = [];
let draining = false;
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a transactional email through Resend when emailEnabled(); otherwise logs and returns.
 * Never throws — a failed email must not break the action that triggered it.
 */
export function sendEmail(email: Email): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] RESEND_API_KEY not set — skipped "${email.subject}" to ${email.to}`);
    return Promise.resolve({ sent: false });
  }
  if (!canEmail(email.to)) {
    // Production without a sender on our own domain: nothing reaches users (the admin console shows a banner). Logged
    // once per instance, without the recipient.
    if (!warnedSender) {
      warnedSender = true;
      console.error("[email] EMAIL_FROM is not a sender on a domain verified in Resend — emails are off; users only get in-app notices");
    }
    return Promise.resolve({ sent: false });
  }
  let payload: Payload;
  try {
    const { html, text } = render(email);
    payload = {
      // Our own sender when EMAIL_FROM is a usable address; otherwise Resend's test sender (development, or the
      // owner's alerts in production — see canEmail).
      from: senderAddress() ? senderFrom() : `${BRAND.name} <${TEST_SENDER}>`,
      to: [email.to],
      reply_to: BRAND.email || undefined,
      subject: email.subject,
      html,
      text,
    };
  } catch (err) {
    console.error("[email] could not render", err);
    return Promise.resolve({ sent: false });
  }
  return new Promise((resolve) => {
    pending.push({ payload, resolve });
    if (!draining) {
      draining = true;
      // Next macrotask, so the other emails queued by this burst join the first batch.
      setTimeout(() => void drain(key), 0);
    }
  });
}

async function drain(key: string) {
  try {
    while (pending.length) {
      const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      const batch = pending.splice(0, BATCH_MAX);
      lastRequestAt = Date.now();
      const sent = await post(batch.map((p) => p.payload), key);
      batch.forEach((p, i) => p.resolve({ sent: sent[i] }));
    }
  } finally {
    draining = false;
  }
}

/** One Resend request for the batch; returns, per email, whether Resend accepted it. */
async function post(payloads: Payload[], key: string): Promise<boolean[]> {
  const single = payloads.length === 1;
  try {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(`https://api.resend.com/emails${single ? "" : "/batch"}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          // One bad address must not sink the other 99 emails in the batch.
          ...(single ? {} : { "x-batch-validation": "permissive" }),
        },
        body: JSON.stringify(single ? payloads[0] : payloads),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = (await res.json().catch(() => null)) as {
        name?: string;
        message?: string;
        errors?: { index: number; message: string }[];
      } | null;
      if (res.ok) {
        lastRefusal = null;
        const failed = new Set((body?.errors ?? []).map((e) => e.index));
        for (const e of body?.errors ?? []) console.error(`[email] Resend rejected ${payloads[e.index]?.to[0]}: ${e.message}`);
        return payloads.map((_, i) => !failed.has(i));
      }
      // Rate limits clear in seconds; an exhausted daily/monthly quota doesn't, so don't hold the queue for it.
      if (res.status === 429 && attempt < MAX_ATTEMPTS && !/quota/i.test(body?.name ?? "")) {
        await sleep(Math.min(Number(res.headers.get("retry-after")) || 1, 10) * 1000);
        lastRequestAt = Date.now();
        continue;
      }
      console.error(`[email] Resend ${res.status} for ${payloads.length} email(s): ${JSON.stringify(body)}`);
      // Refusals no retry fixes: the key (401, or 403 "invalid_api_key"), a sender domain not verified (403), a "from"
      // Resend can't read (422 invalid_from_address). A single bad recipient (another 422) isn't one.
      if (res.status === 401 || res.status === 403 || (res.status === 422 && /from/i.test(`${body?.name ?? ""} ${body?.message ?? ""}`))) {
        lastRefusal = { status: res.status, error: String(body?.message ?? body?.name ?? res.statusText).slice(0, 300) };
      }
      return payloads.map(() => false);
    }
  } catch (err) {
    console.error(`[email] send of ${payloads.length} email(s) failed`, err);
    return payloads.map(() => false);
  }
}
