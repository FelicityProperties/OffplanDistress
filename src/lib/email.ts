import "server-only";
import { BRAND } from "./config";

/** Absolute base URL for links in emails. */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

type Email = { to: string; subject: string; heading: string; body?: string | null; cta?: { label: string; href: string }; dir?: "ltr" | "rtl" };

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function render({ heading, body, cta, dir = "ltr" }: Email) {
  const href = cta ? (cta.href.startsWith("http") ? cta.href : `${siteUrl()}${cta.href}`) : null;
  const html = `<!doctype html><html dir="${dir}"><body style="margin:0;background:#faf8f3;font-family:Inter,Segoe UI,Arial,sans-serif;color:#141c33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #ebe6dc;border-radius:14px" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:1px solid #ebe6dc;font-family:Georgia,serif;font-size:20px;font-weight:600" dir="ltr">Offplan<span style="font-weight:400;opacity:.8">Distress</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.35">${escape(heading)}</h1>
${body ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a5068;white-space:pre-line">${escape(body)}</p>` : ""}
${href && cta ? `<a href="${escape(href)}" style="display:inline-block;background:#141c33;color:#faf8f3;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">${escape(cta.label)}</a>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #ebe6dc;font-size:12px;color:#8a8fa3">${escape(BRAND.company)} · ${escape(BRAND.location)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, body, href ? `${cta!.label}: ${href}` : null].filter(Boolean).join("\n\n");
  return { html, text };
}

/**
 * Sends a transactional email through Resend when RESEND_API_KEY is set; otherwise logs and returns.
 * Never throws — a failed email must not break the action that triggered it.
 */
export async function sendEmail(email: Email): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] RESEND_API_KEY not set — skipped "${email.subject}" to ${email.to}`);
    return { sent: false };
  }
  const { html, text } = render(email);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${BRAND.name} <onboarding@resend.dev>`,
        to: [email.to],
        reply_to: BRAND.email || undefined,
        subject: email.subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${await res.text().catch(() => "")}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return { sent: false };
  }
}
