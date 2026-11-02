"use server";

import { dirOf, intlLocale, isLocale, type Locale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { renderEmail, sendEmail } from "@/lib/email";
import { previewIssue } from "@/lib/newsletter-issue";

// The admin page's preview of today's newsletter issue and its test send (src/components/admin/NewsletterPreview.tsx).

/** The signed-in admin, or null: the action then answers refused() and does nothing. */
async function currentAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "admin" ? user : null;
}

/** Once the admin's session has ended: a message the preview card shows, rather than an error that replaces the page. */
async function refused() {
  const t = await getT("errors");
  return { error: t((await getCurrentUser()) ? "auth.notAuthorised" : "auth.signInAgain") };
}

/** "29 Oct 2026, 09:00" in Dubai time, for the window line above the preview. */
function dubaiTime(d: Date, locale: Locale) {
  return d.toLocaleString(intlLocale(locale), { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * What today's issue would be in `locale`: the subject, the email as it would be sent (whole HTML document) and the
 * counts. The window it covers goes in a line of the admin's own language, so its dates are written in that language
 * too (not the issue's). Admins only.
 */
export async function previewIssueAction(locale: unknown) {
  if (!(await currentAdmin())) return refused();
  const l: Locale = isLocale(locale) ? locale : "en";
  const [p, ui] = await Promise.all([previewIssue(new Date(), l), getLocale()]);
  return {
    locale: l,
    subject: p.subject,
    html: renderEmail({ subject: p.subject, heading: p.heading, html: p.html, text: p.text, locale: l, dir: dirOf(l) }).html,
    counts: p.counts,
    quiet: p.quiet,
    window: { since: dubaiTime(p.since, ui), until: dubaiTime(p.until, ui) },
  };
}

/** Sends today's issue in `locale` to the signed-in admin's own address, with "[Test]" in the subject. Admins only. */
export async function sendTestIssueAction(locale: unknown): Promise<{ ok: true; to: string } | { error: string }> {
  const me = await currentAdmin();
  if (!me) return refused();
  const l: Locale = isLocale(locale) ? locale : "en";
  const p = await previewIssue(new Date(), l);
  const { sent } = await sendEmail({
    to: me.email,
    subject: `[Test] ${p.subject}`,
    heading: p.heading,
    html: p.html,
    text: p.text,
    locale: l,
    dir: dirOf(l),
  });
  await audit({
    actorId: me.id,
    action: "newsletter.test_send",
    entityType: "user",
    entityId: me.id,
    diff: { locale: l, ...p.counts, sent },
  });
  if (!sent) return { error: (await getT("newsletter"))("preview.testFailed") };
  return { ok: true, to: me.email };
}
