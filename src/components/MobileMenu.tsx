"use client";

import { useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * The header's menu below lg: a sheet from the end edge, its content rendered by src/components/SiteHeader.tsx. The
 * header outlives in-app navigation, so the sheet closes itself when a page opens from it: on another address, and on
 * a plain click on any of its links or a form sent from it, for the page already shown, a language chosen on the
 * consoles, which re-render in place (src/components/LocaleSwitcher.tsx), and logging out. It scrolls on its own, so
 * every item stays reachable on a short screen (a phone held sideways).
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
    if (e.target instanceof Element && e.target.closest("a[href]")) setOpenOn(null);
  };
  return (
    <Sheet open={openOn !== null} onOpenChange={(open) => setOpenOn(open ? pathname : null)}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11 lg:hidden [&_svg]:size-5" aria-label={label}>
          <Menu />
          {unread && <span aria-hidden className="absolute end-2 top-2 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="end"
        className="w-72 overflow-y-auto"
        onClick={closeOnLink}
        onSubmit={() => setOpenOn(null)}
        onCloseAutoFocus={(e) => {
          // "Install the app" opened the install card, which took focus (src/components/app/InstallPrompt.tsx): it stays.
          if (document.activeElement?.closest("[data-install-card]")) e.preventDefault();
        }}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
