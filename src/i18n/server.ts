import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeFromTag, type Locale } from "./config";
import type { Namespace } from "./messages";
import { isLocalizedPath, LOCALE_HEADER, PATH_HEADER, SAVED_HEADER } from "./paths";
import { translator } from "./translator";

/** The first (preferred) tag of an Accept-Language header, lower-cased; "" when there is none or it is "*". */
function preferredTag(accept: string | null) {
  const first = (accept ?? "").split(",")[0].split(";")[0].trim().toLowerCase();
  return first === "*" ? "" : first;
}

/**
 * The request's language. A public page's address decides it (src/proxy.ts sets x-od-locale: "ar" under /ar, "zh"
 * under /zh, "en" on the plain address), so search engines see each address in one language. Only the consoles
 * (/dashboard, /admin), API routes and anything else the proxy doesn't see use the visitor's saved choice (od_locale),
 * else their browser's preference (Arabic or Chinese), else English.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const h = await headers();
  const fromAddress = h.get(LOCALE_HEADER);
  if (isLocale(fromAddress)) return fromAddress;
  const path = h.get(PATH_HEADER);
  if (path && isLocalizedPath(path)) return DEFAULT_LOCALE;
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromTag(preferredTag(h.get("accept-language")));
});

/**
 * The page's path without the language prefix ("/deals" on /ar/deals), from the proxy; null outside page requests
 * (API routes) or when the proxy didn't run.
 */
export const getPagePath = cache(async (): Promise<string | null> => {
  const path = (await headers()).get(PATH_HEADER);
  return path && path.startsWith("/") ? path : null;
});

/**
 * The other language to offer on a public page (src/components/LanguageBar.tsx), or null: when the browser's preferred
 * language (Accept-Language: Arabic or Chinese, anything else = English) is not the page's, and the visitor hasn't
 * settled on the page's language (od_locale). Never a redirect: the address keeps deciding the language.
 */
export async function offeredLocale(): Promise<Locale | null> {
  const [path, locale, h, c] = await Promise.all([getPagePath(), getLocale(), headers(), cookies()]);
  if (!path || !isLocalizedPath(path)) return null;
  // The first (preferred) language tag. None or "*" (crawlers, scripts): nothing to suggest.
  const first = preferredTag(h.get("accept-language"));
  if (!first) return null;
  const prefers = localeFromTag(first);
  // The cookie as the browser sent it (the proxy's header): opening an /ar or /zh page sets it in the same response.
  const saved = h.get(SAVED_HEADER) ?? c.get(LOCALE_COOKIE)?.value;
  if (prefers === locale || saved === locale) return null;
  return prefers;
}

/** Translator for one namespace in the current request's language (Server Components, actions, route handlers). */
export async function getT<N extends Namespace>(ns: N) {
  return translator(ns, await getLocale());
}

/** Translator for a specific locale — for emails and other output not tied to the current request. */
export function tFor<N extends Namespace>(ns: N, locale: Locale) {
  return translator(ns, locale);
}
