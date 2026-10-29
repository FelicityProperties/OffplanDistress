"use server";

import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { canEmail } from "@/lib/email";
import { isNewsletterSource, normalizeEmail, subscribe } from "@/lib/newsletter";
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
