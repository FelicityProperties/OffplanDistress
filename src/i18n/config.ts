export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "od_locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** BCP-47 tag for Intl formatting. Latin digits in both languages, as on most UAE property sites. */
export function intlLocale(locale: Locale) {
  return locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE";
}
