import { DEFAULT_LOCALE, htmlLang, LOCALES, ogLocale, type Locale } from "@/i18n/config";
import { isLocalizedPath, localePath, NOINDEX_PATHS, stripLocale } from "@/i18n/paths";
import { translator } from "@/i18n/translator";
import { BRAND } from "@/lib/config";

// Search-engine metadata shared by the root layout and the pages that set their own: one canonical address per
// language, hreflang links between the English, Arabic and Chinese addresses, and the Open Graph basics (a page that
// sets openGraph replaces the layout's whole object, so it spreads openGraphBase()).

/** hreflang → address: "en", "ar", "zh-CN" (htmlLang) and "x-default". */
export type PageAlternates = { canonical: string; languages: Record<string, string> };

/**
 * Canonical + hreflang for a public page, in the page's language: canonical "/ar/deals" on the Arabic page, "/zh/deals"
 * on the Chinese one, "/deals" on the English one; each names all three (hreflang en, ar, zh-CN), and English is the
 * x-default. Relative to metadataBase. Undefined for the consoles and the never-indexed pages (login, sign-up,
 * password).
 */
export function alternatesFor(path: string, locale: Locale): PageAlternates | undefined {
  const bare = stripLocale(path.split(/[?#]/)[0] || "/");
  if (!isLocalizedPath(bare) || NOINDEX_PATHS.test(bare)) return undefined;
  const languages = Object.fromEntries(LOCALES.map((l) => [htmlLang(l), localePath(bare, l)]));
  languages["x-default"] = localePath(bare, DEFAULT_LOCALE);
  return { canonical: localePath(bare, locale), languages };
}

/**
 * og:site_name, og:type, the page's og:locale (with the other languages as og:locale:alternate) and the site's share
 * card (src/app/opengraph-image.tsx, 1200×630), described in the page's language. A segment's openGraph replaces the
 * layout's whole object, file-based image included, so the card comes with the basics. `siteImage: false` for a page
 * with its own opengraph-image file (a deal): any `images` here would replace that file's card.
 */
export function openGraphBase(locale: Locale, { siteImage = true }: { siteImage?: boolean } = {}) {
  const base = {
    siteName: BRAND.name,
    type: "website" as const,
    locale: ogLocale(locale),
    alternateLocale: LOCALES.filter((l) => l !== locale).map(ogLocale),
  };
  if (!siteImage) return base;
  const alt = translator("common", locale)("shareImageAlt");
  return { ...base, images: [{ url: "/opengraph-image", width: 1200, height: 630, type: "image/png", alt }] };
}
