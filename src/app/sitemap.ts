import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { refCode } from "@/lib/format";
import { advertisedSql } from "@/lib/permits";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = [
    "",
    "/deals",
    "/sell",
    "/how-it-works",
    "/fees",
    "/market",
    "/exit-calculator",
    "/contact",
    "/terms",
    "/privacy",
    "/cookies",
  ].map((p) => ({ url: `${base}${p}` }));
  const deals = await db
    .select({ refNo: listings.refNo, updatedAt: listings.updatedAt })
    .from(listings)
    // adverts only (so not one whose permit or Form A has run out, paused by the daily ops cron yet or not); sample
    // listings are noindex, so they stay out of the sitemap too
    .where(and(advertisedSql(), eq(listings.isSample, false)));
  return [...pages, ...deals.map((d) => ({ url: `${base}/deals/${refCode(d.refNo)}`, lastModified: d.updatedAt }))];
}
