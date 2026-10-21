/**
 * Absolute base URL of the site (no trailing slash), for metadata, the sitemap and links in emails.
 * NEXT_PUBLIC_SITE_URL is typed in by hand, so tolerate "example.com" or a trailing slash; an unusable
 * value falls back to the URL Vercel assigns rather than breaking every page.
 */
export function siteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (url.hostname.includes(".") || url.hostname === "localhost") return url.origin;
    } catch {}
  }
  return "http://localhost:3000";
}
