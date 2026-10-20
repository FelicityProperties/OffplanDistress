import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import type { Namespace } from "./messages";
import { translator } from "./translator";

/** The visitor's language: their saved choice, else their browser's preference, else English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*ar\b/i.test(accept) ? "ar" : DEFAULT_LOCALE;
});

/** Translator for one namespace in the current request's language (Server Components, actions, route handlers). */
export async function getT<N extends Namespace>(ns: N) {
  return translator(ns, await getLocale());
}

/** Translator for a specific locale — for emails and other output not tied to the current request. */
export function tFor<N extends Namespace>(ns: N, locale: Locale) {
  return translator(ns, locale);
}
