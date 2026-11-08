"use client";

import { useTransition, type MouseEvent } from "react";
import { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, House, Search, ShieldCheck, Tag, UserRound, type LucideIcon } from "lucide-react";
import Link from "@/components/LocaleLink";
import { useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/paths";
import { cn } from "@/lib/utils";

export type TabRole = "visitor" | "user" | "admin";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** The tab's own page: tapped again there, it scrolls to the top, then refreshes. */
  root?: string;
  badge?: number;
};

const under = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
const AUTH = /^\/(?:login|signup|forgot-password|reset-password)(?:\/|$)/;

/**
 * The room the bar takes below lg (globals.css, the app shell): set while it is on the page, from the first paint on,
 * as plain rules on the root (an html:has([data-tabbar]) rule cost a whole-page restyle on every attribute change).
 * A deal page's action bar outranks it (DealActionBar.tsx).
 */
const ROOM =
  "@media screen and (max-width:1023.98px){:root{--app-bottom:calc(var(--app-tabbar-h) + var(--app-safe-b));--app-bottom-reserve:var(--app-bottom)}}";

/** The pill above the label: dark when current, and while the page it opens is on its way (nothing else shows a tap). */
function TabIcon({ icon: Icon, active, busy, badge }: { icon: LucideIcon; active: boolean; busy: boolean; badge?: number }) {
  const { pending } = useLinkStatus();
  const on = active || pending || busy;
  return (
    <span
      className={cn(
        "relative grid h-7 w-12 place-items-center rounded-full transition-colors",
        on && "bg-ink text-primary-foreground",
        (pending || busy) && "animate-pulse",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={on ? 2.25 : 2} aria-hidden />
      {!!badge && (
        <span
          aria-hidden
          dir="ltr"
          className="absolute -top-1 start-[calc(50%+0.375rem)] grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-xs font-bold leading-none text-gold-foreground ring-2 ring-background tabular"
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </span>
  );
}

/**
 * The bottom tab bar below lg, on every site page (rendered by src/components/SiteHeader.tsx). Visitor: Home, Deals,
 * Sell, Watchlist (via log in), Log in. Signed in: Watchlist, then Account with the unread count; an admin gets Admin
 * in place of Watchlist. It steps aside for the keyboard (globals.css) and for a deal page's action bar
 * (DealActionBar.tsx); the page keeps room for it at its end (ROOM). Tapping the current tab on its own page scrolls to
 * the top, and at the top refreshes it (an installed app has no reload button or pull-to-refresh).
 */
export function MobileTabBar({ role, unread }: { role: TabRole; unread: number }) {
  const t = useT("app");
  const tc = useT("common");
  const tn = useT("notifications");
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const path = stripLocale(usePathname() ?? "/");
  const watch = under(path, "/dashboard/watchlist") || under(path, "/dashboard/searches");

  const tabs: Tab[] = [
    { href: "/", root: "/", label: t("tabs.home"), icon: House, active: path === "/" },
    { href: "/deals", root: "/deals", label: t("tabs.deals"), icon: Search, active: under(path, "/deals") },
    { href: "/sell", root: "/sell", label: t("tabs.sell"), icon: Tag, active: under(path, "/sell") },
    role === "admin"
      ? { href: "/admin", root: "/admin", label: tc("admin"), icon: ShieldCheck, active: under(path, "/admin") }
      : role === "user"
        ? { href: "/dashboard/watchlist", root: "/dashboard/watchlist", label: t("tabs.watchlist"), icon: Heart, active: watch }
        : { href: "/login?next=%2Fdashboard%2Fwatchlist", label: t("tabs.watchlist"), icon: Heart, active: false },
    role === "visitor"
      ? { href: "/login", root: "/login", label: t("tabs.login"), icon: UserRound, active: AUTH.test(path) }
      : {
          href: "/dashboard",
          root: "/dashboard",
          label: t("tabs.account"),
          icon: UserRound,
          // An admin has no Watchlist tab: the whole account area is Account.
          active: under(path, "/dashboard") && (role === "admin" || !watch),
          badge: unread,
        },
  ];

  const again = (e: MouseEvent, tab: Tab) => {
    // ⌘/ctrl/shift-click opens a new tab or window; deeper in a section (an offer), the tab opens its first page.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || tab.root !== path) return;
    e.preventDefault(); // also keeps the filters of /deals?…
    if (window.scrollY > 8) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    } else {
      startRefresh(() => router.refresh());
    }
  };

  return (
    <>
      <style>{ROOM}</style>
      <nav
        data-tabbar
        aria-label={t("tabs.label")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl backdrop-saturate-150 transition-[transform,visibility] duration-200 lg:hidden print:hidden"
        style={{
          paddingBottom: "var(--app-safe-b, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        {/* With the 1px border, the bar is exactly --app-tabbar-h tall (what --app-bottom counts on). */}
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-1" style={{ height: "calc(var(--app-tabbar-h, 3.5rem) - 1px)" }}>
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                onClick={(e) => again(e, tab)}
                className="flex h-full select-none flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium leading-none text-muted-foreground active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-[current=page]:font-semibold aria-[current=page]:text-foreground rtl:text-xs [&:lang(zh)]:text-xs"
              >
                <TabIcon icon={tab.icon} active={tab.active} busy={tab.active && refreshing} badge={tab.badge} />
                <span data-tab-label className="max-w-full truncate px-0.5">
                  {tab.label}
                </span>
                {!!tab.badge && <span className="sr-only"> ({tn("menu.hasUnread", { count: tab.badge })})</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
