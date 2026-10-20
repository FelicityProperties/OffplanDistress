import type { MetadataRoute } from "next";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { PUBLIC_STATUSES } from "@/lib/config";
import { refCode } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000"}`;
  const pages = ["", "/deals", "/sell", "/how-it-works", "/fees", "/contact"].map((p) => ({ url: `${base}${p}` }));
  const deals = await db
    .select({ refNo: listings.refNo, updatedAt: listings.updatedAt })
    .from(listings)
    .where(inArray(listings.status, PUBLIC_STATUSES));
  return [...pages, ...deals.map((d) => ({ url: `${base}/deals/${refCode(d.refNo)}`, lastModified: d.updatedAt }))];
}
