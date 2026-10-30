"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Remembers a language choice (od_locale, and the account's language for emails): "en", "ar" or "zh", anything else
 * is ignored. On the consoles, which keep one address, the page re-renders in place; a public page passes
 * `rerender: false` and then opens its address in the chosen language (/ar/…, /zh/…). `account: false` (closing the
 * language bar: staying on this page's language, not choosing one for emails) only remembers it in this browser, as
 * opening an /ar or /zh page does.
 */
export async function setLocale(locale: Locale, rerender = true, account = true) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = account !== false ? await getCurrentUser() : null;
  // Remember it on the account so emails arrive in the same language.
  if (user) await db.update(users).set({ locale }).where(eq(users.id, user.id));
  if (rerender !== false) refresh();
}
