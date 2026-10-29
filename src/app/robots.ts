import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Pages for signed-in people and one-time links: never crawled, in either language. */
const PRIVATE = ["/dashboard", "/admin", "/reset-password", "/forgot-password", "/newsletter/confirm", "/newsletter/unsubscribe"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Listing photos are served from /api/files/… (private documents there need a session, so crawlers get none);
        // the rest of the API is not for crawlers. Allow lines come first, for crawlers that take the first match; no
        // "Allow: /" (everything not disallowed is allowed anyway), which such a crawler would match before any Disallow.
        allow: ["/api/files/"],
        disallow: [...PRIVATE, ...PRIVATE.map((p) => `/ar${p}`), "/api/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
