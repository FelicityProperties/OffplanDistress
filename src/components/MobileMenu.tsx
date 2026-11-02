"use client";

import { useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * The header's menu below lg: a sheet from the end edge, its content rendered by src/components/SiteHeader.tsx. The
 * header outlives in-app navigation, so the sheet closes itself when a page opens from it: on another address (a link,
 * a notification chosen from the bell), and on a plain click on any of its links or a form sent from it, for the page
 * already shown, a language chosen on the consoles, which re-render in place (src/components/LocaleSwitcher.tsx), and
 * logging out; and when a notice is chosen from the bell, whatever page it opens.
 */
export function MobileMenu({
  title,
  label,
  unread,
  children,
}: {
  title: string;
  label: string;
  unread: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The address the menu was opened on; null while closed.
  const [openOn, setOpenOn] = useState<string | null>(null);
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const closeOnLink = (e: MouseEvent) => {
    // ⌘/ctrl/shift-click opens the link in another tab or window: this page and its menu stay.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = e.target instanceof Element ? e.target : null;
    if (el?.closest("a[href]")) {
      setOpenOn(null);
      return;
    }
    // A notice chosen from the bell (src/components/NotificationBell.tsx) opens its page from script, maybe this one
    // with another tab or #section, which the address doesn't always show: the bell's list closing says one was chosen
    // ("Mark all read" keeps the list, and this menu, open).
    const list = el?.closest('[role="menuitem"]')?.closest('[role="menu"]');
    if (list) setTimeout(() => (!list.isConnected || list.getAttribute("data-state") !== "open") && setOpenOn(null));
  };
  return (
    <Sheet open={openOn !== null} onOpenChange={(open) => setOpenOn(open ? pathname : null)}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative lg:hidden" aria-label={label}>
          <Menu />
          {unread && <span aria-hidden className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="end" className="w-72" onClick={closeOnLink} onSubmit={() => setOpenOn(null)}>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
