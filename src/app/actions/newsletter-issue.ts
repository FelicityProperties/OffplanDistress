"use server";

import { dirOf, intlLocale, isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { renderEmail, sendEmail } from "@/lib/email";
import { previewIssue } from "@/lib/newsletter-issue";

// The admin page's preview of today's newsletter issue and its test send (src/components/admin/NewsletterPreview.tsx).

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error((await getT("errors"))("auth.notAuthorised"));
  return user;
}

/** "29 Oct 2026, 09:00" in Dubai time, for the window line above the preview. */
function dubaiTime(d: Date, locale: Locale) {
  return d.toLocaleString(intlLocale(locale), { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** What today's issue would be in `locale`: the subject, the email as it would be sent (whole HTML document) and the counts. Admins only. */
export async function previewIssueAction(locale: unknown) {
  await assertAdmin();
  const l: Locale = isLocale(locale) ? locale : "en";
  const p = await previewIssue(new Date(), l);
  return {
    subject: p.subject,
    html: renderEmail({ subject: p.subject, heading: p.heading, html: p.html, text: p.text, locale: l, dir: dirOf(l) }).html,
    counts: p.counts,
    quiet: p.quiet,
    window: { since: dubaiTime(p.since, l), until: dubaiTime(p.until, l) },
  };
}

/** Sends today's issue in `locale` to the signed-in admin's own address, with "[Test]" in the subject. Admins only. */
export async function sendTestIssueAction(locale: unknown): Promise<{ ok: true; to: string } | { error: string }> {
  const me = await assertAdmin();
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
