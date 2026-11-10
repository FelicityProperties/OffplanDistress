"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocalePath, useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/paths";

/** The tab bar's own pages (src/components/app/MobileTabBar.tsx): nothing to go back to from there. */
const TAB_ROOTS = new Set(["/", "/deals", "/sell", "/dashboard", "/dashboard/watchlist", "/admin", "/login"]);

/** Where "back" leads when there is no history: the section's list, else home. */
function parentOf(path: string) {
  if (path.startsWith("/deals/")) return "/deals";
  if (path.startsWith("/projects/")) return "/projects";
  if (path.startsWith("/dashboard/listings/")) return "/dashboard/listings";
  if (path.startsWith("/dashboard/")) return "/dashboard";
  if (path.startsWith("/admin/")) return "/admin";
  return "/";
}

/**
 * A back button before the logo, in an installed app only (standalone: globals.css), below lg and off the tab pages:
 * a home-screen app has no browser back button, and iOS gives it no reliable back swipe. With nothing to go back to
 * (opened on this page from a link or a shortcut) it opens the section's list instead.
 */
export function HeaderBack() {
  const tc = useT("common");
  const router = useRouter();
  const lp = useLocalePath();
  const path = stripLocale(usePathname() ?? "/");
  if (TAB_ROOTS.has(path)) return null;
  const back = () => {
    const parent = () => router.push(lp(parentOf(path)));
    // history.length also counts entries ahead of this one; navigation.canGoBack (not in every browser) does not.
    const nav = (window as { navigation?: { canGoBack?: boolean } }).navigation;
    if (!(nav?.canGoBack ?? window.history.length > 1)) return parent();
    const from = window.location.href;
    router.back();
    // Nothing behind this page after all (only pages ahead of it): open the parent instead.
    window.setTimeout(() => window.location.href === from && parent(), 400);
  };
  return (
    <button
      type="button"
      data-header-back
      aria-label={tc("back")}
      title={tc("back")}
      onClick={back}
      className="-ms-2 hidden h-11 w-11 shrink-0 place-items-center rounded-full active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring standalone:max-lg:grid"
    >
      <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
    </button>
  );
}
