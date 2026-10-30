import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { isLocalizedPath, LOCALE_HEADER, localeOfPath, localePath, PATH_HEADER, QUERY_HEADER, SAVED_HEADER, stripLocale } from "@/i18n/paths";
import { canonicalSiteUrl } from "@/lib/site-url";

// Runs before every page (not the API, Next's files or static files; see `config` below).
//
// - /ar/… and /zh/… are the Arabic and Chinese versions of a public page: rewritten to the page itself, with
//   x-od-locale: ar (or zh) and x-od-path (the path without the prefix) on the request, so getLocale()
//   (src/i18n/server.ts) and the metadata know. Opening one remembers that language in the od_locale cookie.
// - A plain public address is English. A visitor whose od_locale cookie says Arabic or Chinese gets a 307 to the /ar
//   or /zh address, so links in emails, WhatsApp shares and old bookmarks open in their language. The browser's
//   Accept-Language never redirects anyone (a crawler has no cookie, so it sees each address in its own language).
// - /en/… remembers English and redirects to the plain address: the language menu's link without JavaScript.
// - /dashboard and /admin have one address in every language and follow the cookie (/ar/dashboard → /dashboard).
// - In production, another host name (the *.vercel.app address) gets a 308 to the site's own domain, so search engines
//   index one copy: NEXT_PUBLIC_SITE_URL when set, else the domain assigned to the project on Vercel (canonicalSiteUrl).

const COOKIE = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

/** Next's generated share images: the same image in every language, never redirected. */
const METADATA_IMAGE = /\/(?:opengraph-image|twitter-image)(?:-[\w-]+)?$/;

/** A page load the visitor asked for, as opposed to Next's background fetches (link prefetches, client navigation). */
function isDocumentRequest(request: NextRequest) {
  const dest = request.headers.get("sec-fetch-dest");
  return dest == null || dest === "document";
}

function remember(response: NextResponse, request: NextRequest, locale: Locale) {
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) response.cookies.set(LOCALE_COOKIE, locale, COOKIE);
  return response;
}

/**
 * 308 to the site's own domain (canonicalSiteUrl in src/lib/site-url.ts), for page loads on any other host name.
 * Production deployments only, only to a domain Vercel serves production on (never previews, local or development
 * servers). www and the bare domain are left to the hosting's domain settings: redirecting between them here could loop
 * against a redirect configured there.
 */
function canonicalHost(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") return null;
  const site = canonicalSiteUrl();
  if (!site) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const target = new URL(site);
  // A local address copied into the production settings by mistake must not send every visitor away from the site.
  if (target.hostname === "localhost" || /^[\d.]+$|^\[/.test(target.hostname)) return null;
  // Only to a domain Vercel serves this project's production on (VERCEL_PROJECT_PRODUCTION_URL, its shortest production
  // domain): an address that isn't connected yet must not send every visitor, permanently, to a host that doesn't answer.
  const bare = (h: string) => h.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!production || bare(production) !== bare(target.hostname)) return null;
  const host = (request.headers.get("host") ?? request.nextUrl.host).toLowerCase();
  if (!host || host === target.host) return null;
  if (host.replace(/^www\./, "") === target.host.replace(/^www\./, "")) return null;
  // Path and query set on the site's own address, never resolved against it: a path like "//evil.com" would otherwise
  // name another host.
  const to = new URL(target.origin);
  to.pathname = request.nextUrl.pathname;
  to.search = request.nextUrl.search;
  return NextResponse.redirect(to, 308);
}

export function proxy(request: NextRequest) {
  const elsewhere = canonicalHost(request);
  if (elsewhere) return elsewhere;

  const { pathname } = request.nextUrl;
  const read = request.method === "GET" || request.method === "HEAD";
  // Our own headers only: whatever the browser sent under these names is dropped.
  const headers = new Headers(request.headers);
  headers.delete(LOCALE_HEADER);
  headers.delete(PATH_HEADER);
  headers.delete(QUERY_HEADER);
  headers.delete(SAVED_HEADER);
  headers.set(QUERY_HEADER, request.nextUrl.search);
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;

  // The language the address names: /ar/…, /zh/… (a page in that language) or /en/… (the switch back to English).
  const prefix: Locale | null = localeOfPath(pathname);
  if (prefix) {
    const path = stripLocale(pathname);
    const plain = request.nextUrl.clone();
    plain.pathname = path;
    if (prefix === DEFAULT_LOCALE || !isLocalizedPath(path)) {
      // "/en/…" (switch to English) or "/ar/dashboard" (the consoles have one address): remember the language and go
      // to the plain address. Anything but a page load of such an address is not a page.
      if (!read && prefix !== DEFAULT_LOCALE) return NextResponse.next();
      return remember(NextResponse.redirect(plain, 307), request, prefix);
    }
    headers.set(LOCALE_HEADER, prefix);
    headers.set(PATH_HEADER, path);
    headers.set(SAVED_HEADER, saved ?? "");
    const response = NextResponse.rewrite(plain, { request: { headers } });
    // Only a page load the visitor asked for sets the cookie: a link prefetch from an English page must not.
    return read && isDocumentRequest(request) ? remember(response, request, prefix) : response;
  }

  if (isLocalizedPath(pathname)) {
    // A saved Arabic or Chinese choice opens the plain address in that language (/ar/…, /zh/…).
    if (read && isLocale(saved) && saved !== DEFAULT_LOCALE && !METADATA_IMAGE.test(pathname)) {
      const localized = request.nextUrl.clone();
      localized.pathname = localePath(pathname, saved);
      return NextResponse.redirect(localized, 307);
    }
    headers.set(LOCALE_HEADER, DEFAULT_LOCALE);
    headers.set(SAVED_HEADER, saved ?? "");
  }
  headers.set(PATH_HEADER, pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Every page: not /api, Next's own files (/_next, /__nextjs…) or anything with a file extension.
  matcher: ["/((?!api|_|.*\\..*).*)"],
};
