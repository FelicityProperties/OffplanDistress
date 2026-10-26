import "server-only";
import { translator } from "@/i18n/translator";
import { BRAND } from "./config";
import { siteUrl } from "./site-url";

/** Resend's shared test sender: it only delivers to the Resend account owner's own address, never to our users. */
const TEST_SENDER = "onboarding@resend.dev";

/** The address in EMAIL_FROM ("OffplanDistress <deals@example.com>" or a bare address), lower-cased; null if none. */
function senderAddress() {
  const from = (process.env.EMAIL_FROM ?? "").trim();
  const address = (/<([^<>]+)>\s*$/.exec(from)?.[1] ?? from).trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) ? address : null;
}

/** EMAIL_FROM is a sender on a domain of our own (verified in Resend), so emails can reach any user. */
function hasOwnSender() {
  const address = senderAddress();
  return address != null && !address.endsWith("@resend.dev");
}

/**
 * Whether sendEmail sends at all. Production needs RESEND_API_KEY and an EMAIL_FROM on our own domain: from Resend's
 * test sender, emails would reach only the Resend account owner, so the owner would see admin mail arrive while
 * sellers never heard about their offers. Development only needs the key (it falls back to the test sender).
 */
export function emailEnabled() {
  if (!process.env.RESEND_API_KEY) return false;
  return process.env.NODE_ENV !== "production" || hasOwnSender();
}

/**
 * Why users don't get emails right now, for the admin banner and the daily digest: "key" (RESEND_API_KEY not set),
 * "sender" (EMAIL_FROM unset, malformed or Resend's test sender: in production nothing is sent, in development only
 * the Resend account owner gets them), or null when emails reach users.
 */
export function emailOffReason(): "key" | "sender" | null {
  if (!process.env.RESEND_API_KEY) return "key";
  return hasOwnSender() ? null : "sender";
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
  if (!emailEnabled()) {
    // Production without a sender on our own domain: nothing is sent (the admin console shows a banner). Logged once
    // per instance, without the recipient.
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
      // Production always has its own sender here (emailEnabled); development may fall back to Resend's test sender.
      from: process.env.EMAIL_FROM?.trim() || `${BRAND.name} <${TEST_SENDER}>`,
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
        errors?: { index: number; message: string }[];
      } | null;
      if (res.ok) {
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
      return payloads.map(() => false);
    }
  } catch (err) {
    console.error(`[email] send of ${payloads.length} email(s) failed`, err);
    return payloads.map(() => false);
  }
}
