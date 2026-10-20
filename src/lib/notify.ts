import "server-only";
import { after } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { OWNER_EMAILS } from "./config";
import { sendEmail } from "./email";
import { renderTemplate, type Locale, type TemplateKey } from "./notification-templates";

type Params = Record<string, string | number>;

/**
 * In-app notification for each user (in their language), plus an email when Resend is configured.
 * Emails go out after the response so the triggering action stays fast.
 */
export async function notify(userIds: string[], key: TemplateKey, params: Params, href: string | null) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const recipients = await db
    .select({ id: users.id, email: users.email, locale: users.locale })
    .from(users)
    .where(inArray(users.id, ids));
  if (!recipients.length) return;

  const rendered = recipients.map((r) => ({ r, msg: renderTemplate(key, asLocale(r.locale), params) }));
  await db.insert(notifications).values(
    rendered.map(({ r, msg }) => ({ userId: r.id, type: key, title: msg.title, body: msg.body, href })),
  );

  after(async () => {
    await Promise.all(
      rendered
        .filter(({ r }) => !r.email.endsWith(".invalid"))
        .map(({ r, msg }) =>
          sendEmail({
            to: r.email,
            subject: msg.title,
            heading: msg.title,
            body: msg.body,
            cta: href ? { label: msg.cta, href } : undefined,
            dir: r.locale === "ar" ? "rtl" : "ltr",
          }),
        ),
    );
  });
}

/** Everyone with the admin role. Falls back to emailing the owner addresses if no admin account exists yet. */
export async function notifyAdmins(key: TemplateKey, params: Params, href: string | null) {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  if (admins.length) return notify(admins.map((a) => a.id), key, params, href);
  const msg = renderTemplate(key, "en", params);
  after(() =>
    Promise.all(OWNER_EMAILS.map((to) => sendEmail({ to, subject: msg.title, heading: msg.title, body: msg.body, cta: href ? { label: msg.cta, href } : undefined }))),
  );
}

function asLocale(v: string | null | undefined): Locale {
  return v === "ar" ? "ar" : "en";
}
