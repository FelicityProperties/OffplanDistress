import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { AR_PREFIX, isLocalizedPath, LOCALE_HEADER, PATH_HEADER, SAVED_HEADER, stripLocale } from "@/i18n/paths";
import { configuredSiteUrl } from "@/lib/site-url";

// Runs before every page (not the API, Next's files or static files; see `config` below).
//
// - /ar/… is the Arabic version of a public page: rewritten to the page itself, with x-od-locale: ar and x-od-path
//   (the path without /ar) on the request, so getLocale() (src/i18n/server.ts) and the metadata know. Opening one
//   remembers Arabic in the od_locale cookie.
// - A plain public address is English. A visitor whose od_locale cookie says Arabic gets a 307 to the /ar address, so
//   links in emails, WhatsApp shares and old bookmarks open in their language. The browser's Accept-Language never
//   redirects anyone (a crawler has no cookie, so it sees each address in its own language).
// - /en/… remembers English and redirects to the plain address: the language switcher's link without JavaScript.
// - /dashboard and /admin have one address in both languages and follow the cookie (/ar/dashboard → /dashboard).
// - In production with NEXT_PUBLIC_SITE_URL set, another host name (a *.vercel.app address) gets a 308 to the site's
//   own address, so search engines index one copy.

const COOKIE = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

/** Next's generated share images: same image in both languages, never redirected. */
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
 * 308 to NEXT_PUBLIC_SITE_URL's host, for page loads on any other host name. Production deployments only, and only
 * when the operator set the address (never previews, local or development servers). www and the bare domain are left to
 * the hosting's domain settings: redirecting between them here could loop against a redirect configured there.
 */
function canonicalHost(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") return null;
  const site = configuredSiteUrl();
  if (!site) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const target = new URL(site);
  // A local address copied into the production settings by mistake must not send every visitor away from the site.
  if (target.hostname === "localhost" || /^[\d.]+$|^\[/.test(target.hostname)) return null;
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
  headers.delete(SAVED_HEADER);
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;

  const prefix = /^\/(ar|en)(?=\/|$)/.exec(pathname)?.[1] as Locale | undefined;
  if (prefix) {
    const path = stripLocale(pathname);
    const plain = request.nextUrl.clone();
    plain.pathname = path;
    if (prefix === "en" || !isLocalizedPath(path)) {
      // "/en/…" (switch to English) or "/ar/dashboard" (the consoles have one address): remember the language and go
      // to the plain address. Anything but a page load of such an address is not a page.
      if (!read && prefix === "ar") return NextResponse.next();
      return remember(NextResponse.redirect(plain, 307), request, prefix);
    }
    headers.set(LOCALE_HEADER, "ar");
    headers.set(PATH_HEADER, path);
    headers.set(SAVED_HEADER, saved ?? "");
    const response = NextResponse.rewrite(plain, { request: { headers } });
    // Only a page load the visitor asked for sets the cookie: a link prefetch from an English page must not.
    return read && isDocumentRequest(request) ? remember(response, request, "ar") : response;
  }

  if (isLocalizedPath(pathname)) {
    if (read && saved === "ar" && !METADATA_IMAGE.test(pathname)) {
      const arabic = request.nextUrl.clone();
      arabic.pathname = pathname === "/" ? AR_PREFIX : `${AR_PREFIX}${pathname}`;
      return NextResponse.redirect(arabic, 307);
    }
    headers.set(LOCALE_HEADER, "en");
    headers.set(SAVED_HEADER, saved ?? "");
  }
  headers.set(PATH_HEADER, pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Every page: not /api, Next's own files (/_next, /__nextjs…) or anything with a file extension.
  matcher: ["/((?!api|_|.*\\..*).*)"],
};
