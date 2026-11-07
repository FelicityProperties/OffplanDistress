// Links follow the page's language (/ar/deals on Arabic pages); /dashboard and /admin keep one address.
import Link from "@/components/LocaleLink";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { AutoHideHeader } from "@/components/app/AutoHideHeader";
import { ChromeState } from "@/components/app/ChromeState";
import { HeaderBack } from "@/components/app/HeaderBack";
import { InstallMenuItem } from "@/components/app/InstallMenuItem";
import { MobileTabBar } from "@/components/app/MobileTabBar";
import { NavProgress } from "@/components/app/NavProgress";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { MobileMenu } from "@/components/MobileMenu";
import { NavLinks } from "@/components/NavLinks";
import { NotificationBell, type BellItem } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";

const BELL_LIMIT = 8;

/** Unread count + latest notifications for the header bell. A failure hides the bell rather than the header. */
async function loadBell(userId: string): Promise<{ unread: number; items: BellItem[] } | null> {
  try {
    const [[count], latest] = await Promise.all([
      db
        .select({ unread: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
      db
        .select({
          id: notifications.id,
          title: notifications.title,
          body: notifications.body,
          href: notifications.href,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(BELL_LIMIT),
    ]);
    return {
      unread: count?.unread ?? 0,
      items: latest.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.error("Loading notifications for the header failed", err);
    return null;
  }
}

/** The signed-in user, or null. A database blip shows the logged-out header rather than the error page. */
async function loadUser() {
  try {
    return await getCurrentUser();
  } catch (err) {
    unstable_rethrow(err); // Next.js signals dynamic rendering by throwing from cookies(); let that through
    console.error("Loading the signed-in user for the header failed", err);
    return null;
  }
}

export async function SiteHeader() {
  const [user, t, tn] = await Promise.all([loadUser(), getT("common"), getT("notifications")]);
  const bell = user ? await loadBell(user.id) : null;
  const firstName = user?.fullName.split(" ")[0];
  const nav = [
    { href: "/deals", label: t("browseDeals") },
    { href: "/sell", label: t("sellMyUnit") },
    { href: "/how-it-works", label: t("howItWorks") },
    { href: "/fees", label: t("fees") },
    { href: "/market", label: t("marketIndex") },
  ];

  return (
    <>
      {/* Phones: 56px, nearly opaque (over dark sections a see-through bar turned grey), hides while reading down. */}
      <AutoHideHeader className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl backdrop-saturate-150 lg:bg-background/75">
        <div className="container-page flex h-14 items-center justify-between gap-4 lg:h-[4.25rem]">
          <div className="flex min-w-0 items-center gap-1">
            <HeaderBack />
            <Link href="/" aria-label={BRAND.name}>
              <Logo />
            </Link>
          </div>
          <NavLinks
            items={nav}
            label={t("menu")}
            className="hidden items-center gap-0.5 rounded-full border border-border/70 bg-card/70 p-1 shadow-sm lg:flex"
            linkClassName="whitespace-nowrap rounded-full px-2.5 py-1.5 xl:px-4"
            activeClassName="bg-ink text-primary-foreground hover:bg-ink hover:text-primary-foreground"
          />
          <div className="hidden items-center gap-2 lg:flex">
            {/* Signed in, the bar also holds the admin link, the bell and the account button: the language name waits for 2xl. */}
            <LocaleSwitcher compact dense={!!user} />
            {user ? (
              <>
                {user.role === "admin" && (
                  <Button asChild variant="ghost" className="rounded-full max-xl:px-2.5">
                    {/* icon-only below xl so the bar fits on one line at 1024–1279px */}
                    <Link href="/admin" aria-label={t("admin")} title={t("admin")}>
                      <ShieldCheck /> <span className="hidden xl:inline">{t("admin")}</span>
                    </Link>
                  </Button>
                )}
                {bell && <NotificationBell unread={bell.unread} items={bell.items} />}
                <Button asChild className="rounded-full max-xl:px-3">
                  <Link href="/dashboard" aria-label={t("myAccount")}>
                    <LayoutDashboard />
                    <span className="hidden xl:inline">{firstName ? t("accountOf", { name: firstName }) : t("myAccount")}</span>
                  </Link>
                </Button>
                <form action={logout}>
                  <Button variant="ghost" size="icon" aria-label={t("logOut")} title={t("logOut")}>
                    <LogOut className="rtl:-scale-x-100" />
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link href="/login">{t("logIn")}</Link>
                </Button>
                <Button asChild className="rounded-full px-4 xl:px-5">
                  <Link href="/signup">{t("getStarted")}</Link>
                </Button>
              </>
            )}
          </div>
          {/* Closes itself when a page opens from it (src/components/MobileMenu.tsx). */}
          <MobileMenu
            title={t("menu")}
            label={bell && bell.unread > 0 ? `${t("openMenu")} (${tn("menu.hasUnread", { count: bell.unread })})` : t("openMenu")}
            unread={!!bell && bell.unread > 0}
          >
            <div className="mt-8 flex flex-col gap-1 px-2">
              <NavLinks items={nav} label={t("menu")} className="flex flex-col gap-1" linkClassName="py-2.5 text-base" />
              {/* 44px rows; the bell is a row to the notifications page here (src/components/NotificationBell.tsx). */}
              <div className="mt-4 grid gap-2">
                {user ? (
                  <>
                    <Button asChild className="h-11">
                      <Link href="/dashboard">{t("myAccount")}</Link>
                    </Button>
                    {bell && <NotificationBell variant="full" unread={bell.unread} items={bell.items} />}
                    {user.role === "admin" && (
                      <Button asChild variant="outline" className="h-11">
                        <Link href="/admin">{t("admin")}</Link>
                      </Button>
                    )}
                    <form action={logout} className="grid">
                      <Button variant="ghost" className="h-11">
                        {t("logOut")}
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="h-11">
                      <Link href="/login">{t("logIn")}</Link>
                    </Button>
                    <Button asChild className="h-11">
                      <Link href="/signup">{t("getStarted")}</Link>
                    </Button>
                  </>
                )}
                <LocaleSwitcher full className="mt-2" />
                {/* Only where the browser can install the site (Chrome on Android, iOS Safari). */}
                <InstallMenuItem />
              </div>
            </div>
          </MobileMenu>
        </div>
      </AutoHideHeader>
      {/* Below lg: the bottom tab bar, the on-screen keyboard watch and, everywhere, the navigation progress bar. */}
      <MobileTabBar role={user?.role === "admin" ? "admin" : user ? "user" : "visitor"} unread={bell?.unread ?? 0} />
      <ChromeState />
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
    </>
  );
}
