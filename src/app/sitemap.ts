import type { MetadataRoute } from "next";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { PUBLIC_STATUSES } from "@/lib/config";
import { refCode } from "@/lib/format";
import { permitCurrentSql } from "@/lib/permits";
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
    // sample listings are noindex, so they stay out of the sitemap too, and so does an advert whose permit or Form A
    // has run out but which the daily ops cron hasn't paused yet
    .where(and(inArray(listings.status, PUBLIC_STATUSES), eq(listings.isSample, false), permitCurrentSql()));
  return [...pages, ...deals.map((d) => ({ url: `${base}/deals/${refCode(d.refNo)}`, lastModified: d.updatedAt }))];
}
