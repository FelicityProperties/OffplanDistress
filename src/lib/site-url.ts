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
 * The site's address as the operator set it in NEXT_PUBLIC_SITE_URL, or null when it isn't set (or is unusable):
 * only then is it safe to send visitors from another host name to it (src/proxy.ts).
 */
export function configuredSiteUrl() {
  return originOf(process.env.NEXT_PUBLIC_SITE_URL);
}
