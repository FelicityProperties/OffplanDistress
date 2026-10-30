export const LOCALES = ["en", "ar", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "od_locale";

/** Each language's name in itself, for the language menu and wherever a language is named (never translated). */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ar: "العربية", zh: "中文" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** BCP-47 tag for Intl formatting. Latin digits in every language, as on most UAE property sites. */
export function intlLocale(locale: Locale) {
  return locale === "ar" ? "ar-AE-u-nu-latn" : locale === "zh" ? "zh-CN" : "en-AE";
}

/** The tag for <html lang>, hreflang and JSON-LD inLanguage: the site's Chinese is Simplified, so "zh-CN". */
export function htmlLang(locale: Locale) {
  return locale === "zh" ? "zh-CN" : locale;
}

/** og:locale of the Open Graph tags. */
export function ogLocale(locale: Locale) {
  return locale === "ar" ? "ar_AE" : locale === "zh" ? "zh_CN" : "en_AE";
}

/** What separates the items of a list written out in prose: "a, b", "أ، ب", "甲、乙". */
export function listSeparator(locale: Locale) {
  return locale === "ar" ? "، " : locale === "zh" ? "、" : ", ";
}

/**
 * The site language a browser's language tag asks for ("ar-EG" → "ar", "zh-TW" → "zh", anything else → English). For
 * the Accept-Language header only; a saved choice goes through isLocale().
 */
export function localeFromTag(tag: string | null | undefined): Locale {
  const base = (tag ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}
