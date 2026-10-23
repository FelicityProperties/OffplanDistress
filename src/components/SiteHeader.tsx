import Link from "next/link";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { LayoutDashboard, LogOut, Menu, ShieldCheck } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { NotificationBell, type BellItem } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

export async function SiteHeader() {
  const [user, t, tn] = await Promise.all([getCurrentUser(), getT("common"), getT("notifications")]);
  const bell = user ? await loadBell(user.id) : null;
  const firstName = user?.fullName.split(" ")[0];
  const nav = [
    { href: "/deals", label: t("browseDeals") },
    { href: "/sell", label: t("sellMyUnit") },
    { href: "/how-it-works", label: t("howItWorks") },
    { href: "/fees", label: t("fees") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="container-page flex h-[4.25rem] items-center justify-between gap-4">
        <Link href="/" aria-label={BRAND.name}>
          <Logo />
        </Link>
        <NavLinks
          items={nav}
          className="hidden items-center gap-0.5 rounded-full border border-border/70 bg-card/70 p-1 shadow-sm lg:flex"
          linkClassName="whitespace-nowrap rounded-full px-3 py-1.5 xl:px-4"
          activeClassName="bg-ink text-primary-foreground hover:bg-ink hover:text-primary-foreground"
        />
        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher />
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
              <Button asChild className="rounded-full px-5">
                <Link href="/signup">{t("getStarted")}</Link>
              </Button>
            </>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative lg:hidden"
              aria-label={
                bell && bell.unread > 0
                  ? `${t("openMenu")} (${tn("menu.hasUnread", { count: bell.unread })})`
                  : t("openMenu")
              }
            >
              <Menu />
              {bell && bell.unread > 0 && (
                <span aria-hidden className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="end" className="w-72">
            <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
            <div className="mt-8 flex flex-col gap-1 px-2">
              <NavLinks items={nav} className="flex flex-col gap-1" linkClassName="py-2.5 text-base" />
              <div className="mt-4 grid gap-2">
                {user ? (
                  <>
                    <Button asChild>
                      <Link href="/dashboard">{t("myAccount")}</Link>
                    </Button>
                    {bell && <NotificationBell variant="full" unread={bell.unread} items={bell.items} />}
                    {user.role === "admin" && (
                      <Button asChild variant="outline">
                        <Link href="/admin">{t("admin")}</Link>
                      </Button>
                    )}
                    <form action={logout} className="grid">
                      <Button variant="ghost">{t("logOut")}</Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline">
                      <Link href="/login">{t("logIn")}</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/signup">{t("getStarted")}</Link>
                    </Button>
                  </>
                )}
                <LocaleSwitcher full className="justify-start" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
