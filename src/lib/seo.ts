import type { Locale } from "@/i18n/config";
import { isLocalizedPath, localePath, NOINDEX_PATHS, stripLocale } from "@/i18n/paths";
import { BRAND } from "@/lib/config";

// Search-engine metadata shared by the root layout and the pages that set their own: one canonical address per
// language, hreflang links between the English and Arabic addresses, and the Open Graph basics (a page that sets
// openGraph replaces the layout's whole object, so it spreads openGraphBase()).

export type PageAlternates = { canonical: string; languages: { en: string; ar: string; "x-default": string } };

/**
 * Canonical + hreflang for a public page, in the page's language: canonical "/ar/deals" on the Arabic page, "/deals"
 * on the English one; both name each other, and English is the x-default. Relative to metadataBase. Undefined for the
 * consoles and the never-indexed pages (login, sign-up, password).
 */
export function alternatesFor(path: string, locale: Locale): PageAlternates | undefined {
  const bare = stripLocale(path.split(/[?#]/)[0] || "/");
  if (!isLocalizedPath(bare) || NOINDEX_PATHS.test(bare)) return undefined;
  const ar = localePath(bare, "ar");
  return { canonical: locale === "ar" ? ar : bare, languages: { en: bare, ar, "x-default": bare } };
}

/** og:site_name, og:type and the page's og:locale (with the other language as og:locale:alternate). */
export function openGraphBase(locale: Locale) {
  return {
    siteName: BRAND.name,
    type: "website" as const,
    locale: locale === "ar" ? "ar_AE" : "en_AE",
    alternateLocale: locale === "ar" ? "en_AE" : "ar_AE",
  };
}
