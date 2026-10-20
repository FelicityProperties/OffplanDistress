import type { Metadata } from "next";
import { and, eq, sql } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { db } from "@/db";
import { listings, offers } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const [counts] = await db
    .select({
      listings: sql<number>`count(distinct ${listings.id})::int`,
      pendingOffers: sql<number>`count(${offers.id}) filter (where ${offers.status} = 'pending')::int`,
    })
    .from(listings)
    .leftJoin(offers, eq(offers.listingId, listings.id))
    .where(and(eq(listings.sellerId, user.id)));

  return (
    <AppShell
      title={`Hi, ${user.fullName.split(" ")[0]}`}
      items={[
        { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
        { href: "/dashboard/listings", label: "My listings", icon: "listings", count: counts?.listings },
        { href: "/dashboard/offers", label: "Offers", icon: "offers", count: counts?.pendingOffers },
        { href: "/dashboard/watchlist", label: "Watchlist", icon: "watchlist" },
        { href: "/dashboard/searches", label: "Saved searches", icon: "searches" },
        { href: "/dashboard/profile", label: "Profile & KYC", icon: "profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
