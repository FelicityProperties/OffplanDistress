"use server";

import { redirect } from "next/navigation";
import { localePath } from "@/i18n/paths";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { canEmail } from "@/lib/email";
import { confirm, isNewsletterSource, normalizeEmail, subscribe } from "@/lib/newsletter";
import { clientIp } from "@/lib/throttle";

export type NewsletterFormState = { ok?: boolean; error?: string; email?: string };

/**
 * The sign-up forms (src/components/NewsletterForm.tsx). The reply is "check your inbox" whatever the address's state
 * (only something that isn't an address is refused), so the site never says whether an address is subscribed. `website`
 * is the honeypot: people never see the field, so a filled one is a bot, answered the same way with nothing stored.
 * Without a working sender (src/lib/email.ts) no confirmation could arrive, so the form says so instead.
 */
export async function subscribeAction(_prev: NewsletterFormState, formData: FormData): Promise<NewsletterFormState> {
  const t = await getT("newsletter");
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { error: t("form.invalid") };
  if (formData.get("website")) return { ok: true, email };
  if (!canEmail(email)) return { error: t("form.emailOff") };
  const source = formData.get("source");
  const [locale, user, ip] = await Promise.all([getLocale(), getCurrentUser(), clientIp()]);
  await subscribe({ email, locale, source: isNewsletterSource(source) ? source : "footer", userId: user?.id, ip });
  return { ok: true, email };
}

/**
 * "Confirm my subscription" on the page the confirmation email links to (src/app/(site)/newsletter/confirm/page.tsx):
 * only this button confirms an address, never opening the link, which a mail gateway scanning the links of an email
 * on delivery would do for an address nobody confirmed. Back on that page, in its language: "you're in", or the form
 * again for a link that no longer works.
 */
export async function confirmSubscriptionAction(formData: FormData) {
  const token = String(formData.get("t") ?? "").trim();
  const [result, locale] = await Promise.all([confirm(token), getLocale()]);
  const page =
    result.status === "invalid"
      ? "/newsletter/confirm"
      : `/newsletter/confirm?t=${token}${result.status === "confirmed" ? "&done=1" : ""}`;
  redirect(localePath(page, locale));
}
