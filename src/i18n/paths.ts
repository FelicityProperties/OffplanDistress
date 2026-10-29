import { DEFAULT_LOCALE, type Locale } from "./config";

// Language in the address. English pages are at their plain path (/deals); their Arabic twin is under /ar (/ar/deals),
// rewritten to the same page by src/proxy.ts. The signed-in consoles (/dashboard, /admin) and the API have one
// address for both languages: they follow the od_locale cookie. Pure functions, used on the server, in the browser
// and in the proxy.

/** Request headers src/proxy.ts sets on every page request (anything the browser sent under these names is dropped). */
export const LOCALE_HEADER = "x-od-locale";
/** The page's path without the language prefix ("/ar/deals" → "/deals"). */
export const PATH_HEADER = "x-od-path";
/** The page's query string ("?tab=sent", or ""): with PATH_HEADER, where a login asked for on the way comes back to. */
export const QUERY_HEADER = "x-od-query";
/**
 * The od_locale cookie as the browser sent it ("" when none). Opening an /ar page sets the cookie in the same response,
 * and Next shows cookies set by the proxy to the page, so the page can't tell a first visit from a saved choice.
 */
export const SAVED_HEADER = "x-od-saved";

/** Prefix of the Arabic pages. */
export const AR_PREFIX = "/ar";

/** Paths with one address in both languages: the consoles, the API and Next's own files. */
const SHARED = /^\/(?:dashboard|admin|api|_next)(?:\/|$)|^\/__/;
/** A file (robots.txt, icon.svg, …) rather than a page. */
const FILE = /\/[^/]*\.[A-Za-z0-9]+$/;
/** Leading language segment: /ar or /en, then / or the end. */
const PREFIX = /^\/(ar|en)(?=\/|$)/;

/**
 * Public pages, which have an English and an Arabic address. The path must be a site path ("/…", no query string);
 * a path that still carries a language prefix is judged without it.
 */
export function isLocalizedPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return false;
  const bare = stripLocale(path);
  return !SHARED.test(bare) && !FILE.test(bare);
}

/** The language the address itself names: "ar" under /ar, otherwise null (plain paths are English or cookie-based). */
export function localeOfPath(path: string): Locale | null {
  return PREFIX.exec(path)?.[1] === "ar" ? "ar" : null;
}

/**
 * The path without its language segment: "/ar/deals" → "/deals", "/ar" → "/", "/en/sell" → "/sell". Never a
 * protocol-relative address: "/ar//evil.com" (or "/ar/\evil.com") is "/evil.com", not "//evil.com", which a browser
 * would open as another site (a ?next= or a redirect built from it would leave the site).
 */
export function stripLocale(path: string) {
  return path.replace(PREFIX, "").replace(/^[/\\]{2,}/, "/") || "/";
}

/** Splits "/deals?x=1#top" into the path and the rest (query string and fragment). */
function splitHref(href: string): [string, string] {
  const i = href.search(/[?#]/);
  return i < 0 ? [href, ""] : [href.slice(0, i), href.slice(i)];
}

/**
 * A link on this site for a given language: public pages get the /ar prefix for Arabic and lose it for English; the
 * consoles, the API, files, other sites, mailto:/tel: and "#…" links are returned as they are (a stray /ar before a
 * console path is dropped, since /ar/dashboard is not a page). Never doubles a prefix.
 *
 *   localePath("/deals?sort=cash", "ar") → "/ar/deals?sort=cash"
 *   localePath("/", "ar")                → "/ar"
 *   localePath("/ar/deals", "en")        → "/deals"
 *   localePath("/dashboard", "ar")       → "/dashboard"
 */
export function localePath(href: string, locale: Locale) {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\")) return href;
  const [path, rest] = splitHref(href);
  const bare = stripLocale(path);
  if (!isLocalizedPath(bare)) return PREFIX.test(path) ? bare + rest : href;
  if (locale === DEFAULT_LOCALE) return bare + rest;
  return (bare === "/" ? AR_PREFIX : AR_PREFIX + bare) + rest;
}

/**
 * The link that switches a page to the other language without JavaScript: the Arabic address, or "/en/…" for
 * English, which the proxy answers by remembering English (od_locale) and redirecting to the plain address. The
 * language switcher uses it as its href (open in a new tab, no script), and navigates to localePath() itself.
 */
export function switchHref(href: string, to: Locale) {
  const [path, rest] = splitHref(href);
  const bare = stripLocale(path);
  if (!isLocalizedPath(bare)) return bare + rest;
  if (to === "ar") return localePath(bare + rest, "ar");
  return (bare === "/" ? "/en" : `/en${bare}`) + rest;
}

/**
 * Public pages that are never indexed (robots.txt keeps crawlers off the password pages; login and sign-up carry
 * noindex): no canonical or hreflang links for them.
 */
export const NOINDEX_PATHS = /^\/(?:login|signup|forgot-password|reset-password|newsletter\/(?:confirm|unsubscribe))(?:\/|$)/;
