import "server-only";
import { after } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users, watchlist } from "@/db/schema";
import { dirOf, isLocale, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { OWNER_EMAILS } from "./config";
import { sendEmail } from "./email";
import { refCode } from "./format";
import { renderTemplate, type TemplateKey, type TemplateParams } from "./notification-templates";

export type { TemplateParam, TemplateParams } from "./notification-templates";

type Ids = (string | null | undefined)[];

/**
 * In-app notification for each user (in their language), plus an email when Resend is configured.
 * Params are rendered per recipient: { aed: n } becomes "AED 1,250,000" / "1,250,000 درهم",
 * { t: "errors", key: "…" } is translated. Emails go out after the response so the triggering action stays fast.
 * Never throws — a failed notification must not break the action that triggered it. Resolves true once the in-app
 * notifications are stored (the emails follow), false when nothing was stored (no such user, or a failure, logged), for
 * callers that record a notice as sent (src/lib/reminders.ts).
 */
export async function notify(userIds: Ids, key: TemplateKey, params: TemplateParams, href: string | null): Promise<boolean> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return false;
  let stored = false;
  try {
    const recipients = await db
      .select({ id: users.id, email: users.email, locale: users.locale })
      .from(users)
      .where(inArray(users.id, ids));
    if (!recipients.length) return false;

    const rendered = recipients.map((r) => {
      const locale = asLocale(r.locale);
      return { r, locale, msg: renderTemplate(key, locale, params) };
    });
    await db.insert(notifications).values(
      rendered.map(({ r, msg }) => ({ userId: r.id, type: key, title: msg.title, body: msg.body, href })),
    );
    stored = true;

    after(async () => {
      await Promise.all(
        rendered
          .filter(({ r }) => !r.email.endsWith(".invalid"))
          .map(({ r, locale, msg }) =>
            sendEmail({
              to: r.email,
              subject: msg.title,
              heading: msg.title,
              body: msg.body,
              // A public page (a deal, /sell) in the recipient's language; dashboard links have one address. The
              // in-app notice keeps the plain path: the bell opens it in the language of the page it is clicked on.
              cta: href ? { label: msg.cta, href: localePath(href, locale) } : undefined,
              locale,
              dir: dirOf(locale),
            }),
          ),
      );
    });
  } catch (err) {
    console.error(`[notify] ${key} failed`, err);
  }
  return stored;
}

/**
 * Everyone with the admin role, except `except` (usually the admin who triggered the event).
 * Falls back to emailing the owner addresses, in English, if no admin account exists yet.
 * Resolves false when the notice couldn't be stored or sent (logged), true otherwise.
 */
export async function notifyAdmins(
  key: TemplateKey,
  params: TemplateParams,
  href: string | null,
  opts: { except?: Ids } = {},
): Promise<boolean> {
  try {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    if (admins.length) {
      const skip = new Set(opts.except?.filter(Boolean));
      return await notify(
        admins.map((a) => a.id).filter((id) => !skip.has(id)),
        key,
        params,
        href,
      );
    }
    const msg = renderTemplate(key, "en", params);
    after(() =>
      Promise.all(
        OWNER_EMAILS.map((to) =>
          sendEmail({ to, subject: msg.title, heading: msg.title, body: msg.body, cta: href ? { label: msg.cta, href } : undefined }),
        ),
      ),
    );
    return true;
  } catch (err) {
    console.error(`[notify] admins ${key} failed`, err);
    return false;
  }
}

/** Tells everyone watching a deal (except its seller) that the asking price fell. */
export async function notifyPriceDrop(
  listing: { id: string; projectName: string; refNo: number; sellerId: string },
  from: number,
  to: number,
) {
  if (!(to < from)) return;
  try {
    const watchers = await db
      .select({ userId: watchlist.userId })
      .from(watchlist)
      .where(eq(watchlist.listingId, listing.id));
    await notify(
      watchers.map((w) => w.userId).filter((id) => id !== listing.sellerId),
      "watch.price_drop",
      { project: listing.projectName, from: { aed: from }, to: { aed: to } },
      `/deals/${refCode(listing.refNo)}`,
    );
  } catch (err) {
    console.error("[notify] price drop failed", err);
  }
}

function asLocale(v: string | null | undefined): Locale {
  return isLocale(v) ? v : "en";
}
