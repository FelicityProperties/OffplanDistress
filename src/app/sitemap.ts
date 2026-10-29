import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { localePath } from "@/i18n/paths";
import { refCode } from "@/lib/format";
import { advertisedSql } from "@/lib/permits";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/** Next writes sitemap values into the XML as they are: photo addresses carry "&" (and anything a seller's link had). */
function xml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Up to 4 of a listing's photos as absolute addresses (our uploads are /api/files/…, samples link to Unsplash). */
function photos(base: string, images: string[]) {
  return images
    .filter((u) => /^https:\/\//i.test(u) || u.startsWith("/api/files/"))
    .slice(0, 4)
    .map((u) => xml(u.startsWith("/") ? `${base}${u}` : u));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  // Every page twice, English and Arabic, each naming both (hreflang) with English as the default.
  const both = (path: string, extra: Omit<MetadataRoute.Sitemap[number], "url" | "alternates"> = {}) => {
    const en = `${base}${path === "/" ? "" : path}`;
    const ar = `${base}${localePath(path, "ar")}`;
    const alternates = { languages: { en, ar, "x-default": en } };
    return [
      { url: en, alternates, ...extra },
      { url: ar, alternates, ...extra },
    ];
  };
  const pages = [
    "/",
    "/deals",
    "/sell",
    "/how-it-works",
    "/fees",
    "/market",
    "/exit-calculator",
    "/contact",
    "/newsletter",
    "/terms",
    "/privacy",
    "/cookies",
  ].flatMap((p) => both(p));
  const deals = await db
    .select({ refNo: listings.refNo, updatedAt: listings.updatedAt, images: listings.images })
    .from(listings)
    // adverts only (so not one whose permit or Form A has run out, paused by the daily ops cron yet or not); sample
    // listings are noindex, so they stay out of the sitemap too
    .where(and(advertisedSql(), eq(listings.isSample, false)));
  return [
    ...pages,
    ...deals.flatMap((d) => {
      const images = photos(base, d.images ?? []);
      return both(`/deals/${refCode(d.refNo)}`, { lastModified: d.updatedAt, ...(images.length ? { images } : {}) });
    }),
  ];
}
