import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";

const nav = [
  { href: "/deals", label: "Browse deals" },
  { href: "/sell", label: "Sell my unit" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/fees", label: "Fees" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const firstName = user?.fullName.split(" ")[0];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${BRAND.name} home`}>
          <Logo />
        </Link>
        <NavLinks items={nav} className="hidden items-center gap-1 lg:flex" />
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              {user.role === "admin" && (
                <Button asChild variant="ghost">
                  <Link href="/admin">
                    <ShieldCheck /> Admin
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/dashboard">
                  <LayoutDashboard /> {firstName ? `${firstName}'s account` : "My account"}
                </Link>
              </Button>
              <form action={logout}>
                <Button variant="ghost" size="icon" aria-label="Log out" title="Log out">
                  <LogOut />
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-8 flex flex-col gap-1 px-2">
              <NavLinks items={nav} className="flex flex-col gap-1" linkClassName="py-2.5 text-base" />
              <div className="mt-4 grid gap-2">
                {user ? (
                  <>
                    <Button asChild>
                      <Link href="/dashboard">My account</Link>
                    </Button>
                    {user.role === "admin" && (
                      <Button asChild variant="outline">
                        <Link href="/admin">Admin</Link>
                      </Button>
                    )}
                    <form action={logout} className="grid">
                      <Button variant="ghost">Log out</Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline">
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/signup">Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
