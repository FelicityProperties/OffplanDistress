/** A typed-in base URL as an origin ("example.com/" → "https://example.com"), or null when unusable. */
function originOf(raw: string | undefined) {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.hostname.includes(".") || url.hostname === "localhost") return url.origin;
  } catch {}
  return null;
}

/**
 * Absolute base URL of the site (no trailing slash), for metadata, the sitemap and links in emails.
 * NEXT_PUBLIC_SITE_URL is typed in by hand, so tolerate "example.com" or a trailing slash; an unusable
 * value falls back to the URL Vercel assigns rather than breaking every page.
 */
export function siteUrl() {
  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]) {
    const origin = originOf(raw);
    if (origin) return origin;
  }
  return "http://localhost:3000";
}

/**
 * The site's address as the operator set it in NEXT_PUBLIC_SITE_URL, or null when it isn't set (or is unusable).
 */
export function configuredSiteUrl() {
  return originOf(process.env.NEXT_PUBLIC_SITE_URL);
}

/**
 * The one address visitors on any other host name are sent to (src/proxy.ts): NEXT_PUBLIC_SITE_URL as the operator set
 * it, else the custom domain Vercel serves production on (VERCEL_PROJECT_PRODUCTION_URL, set by Vercel once a domain is
 * assigned to the project; a *.vercel.app address is never a target, since without a domain it is the only host there
 * is). Null when neither is usable.
 */
export function canonicalSiteUrl() {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!production || /\.vercel\.app$/i.test(production)) return null;
  return originOf(production);
}
