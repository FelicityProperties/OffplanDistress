import type { Metadata } from "next";
import { and, eq, isNull, sql } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { LocaleGuard } from "@/components/LocaleGuard";
import { db } from "@/db";
import { listings, notifications, offers } from "@/db/schema";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { ownListingSql } from "@/lib/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const tc = await getT("common");
  return { title: tc("myAccount"), robots: { index: false } };
}

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Signed out: login comes back to the page opened (an email's link to an offer, say), not the overview (requireUser).
  const user = await requireUser("/dashboard");
  const [[counts], [notif], t] = await Promise.all([
    db
      .select({
        listings: sql<number>`count(distinct ${listings.id})::int`,
        pendingOffers: sql<number>`count(${offers.id}) filter (where ${offers.status} = 'pending')::int`,
      })
      .from(listings)
      .leftJoin(offers, eq(offers.listingId, listings.id))
      // As in the listing pages: one our team entered counts once the seller has confirmed it.
      .where(ownListingSql(user.id)),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    getT("notifications"),
  ]);

  return (
    <AppShell
      title={t("shell.greeting", { name: user.fullName.split(" ")[0] })}
      items={[
        { href: "/dashboard", label: t("shell.overview"), icon: "overview", exact: true },
        { href: "/dashboard/listings", label: t("shell.listings"), icon: "listings", count: counts?.listings },
        { href: "/dashboard/offers", label: t("shell.offers"), icon: "offers", count: counts?.pendingOffers },
        { href: "/dashboard/notifications", label: t("shell.notifications"), icon: "bell", count: notif?.unread },
        { href: "/dashboard/watchlist", label: t("shell.watchlist"), icon: "watchlist" },
        { href: "/dashboard/searches", label: t("shell.searches"), icon: "searches" },
        { href: "/dashboard/profile", label: t("shell.profile"), icon: "profile" },
      ]}
    >
      {/* Reached in-app from a page in the other language: loaded again, whole, in this one. */}
      <LocaleGuard locale={await getLocale()} />
      {children}
    </AppShell>
  );
}
