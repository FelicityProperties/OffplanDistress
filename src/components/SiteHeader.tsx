import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, ShieldCheck } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/app/actions/auth";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getT("common")]);
  const firstName = user?.fullName.split(" ")[0];
  const nav = [
    { href: "/deals", label: t("browseDeals") },
    { href: "/sell", label: t("sellMyUnit") },
    { href: "/how-it-works", label: t("howItWorks") },
    { href: "/fees", label: t("fees") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={BRAND.name}>
          <Logo />
        </Link>
        <NavLinks items={nav} className="hidden items-center gap-1 lg:flex" />
        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher />
          {user ? (
            <>
              {user.role === "admin" && (
                <Button asChild variant="ghost">
                  <Link href="/admin">
                    <ShieldCheck /> {t("admin")}
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/dashboard">
                  <LayoutDashboard /> {firstName ? t("accountOf", { name: firstName }) : t("myAccount")}
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
              <Button asChild variant="ghost">
                <Link href="/login">{t("logIn")}</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">{t("getStarted")}</Link>
              </Button>
            </>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
              <Menu />
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
