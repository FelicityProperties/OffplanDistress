"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** The header's own range: below lg, where it shows the menu button. */
const PHONE = "(max-width: 1023.98px)";

/** html[data-scroll="down"] slides the header (and the consoles' section row) out of view: globals.css. */
function setHidden(hidden: boolean) {
  if (hidden) document.documentElement.setAttribute("data-scroll", "down");
  else document.documentElement.removeAttribute("data-scroll");
}

/**
 * The site header. On phones it hides while the page is read downwards and comes back on the way up (12px either way,
 * after the first 96px), near the top, when focus enters it and on every new page. Jumps (a #section, a restored
 * scroll position) leave it as it is: their scroll padding counted on it. Scrolling is not judged while the on-screen
 * keyboard is up (iOS scrolls to the focused field) or at the very end of the page (iOS bounces there). From lg it
 * never moves, so no sticky offset below it needs to change.
 */
export function AutoHideHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    const root = document.documentElement;
    let lastY = window.scrollY;
    let turnY = lastY; // where the current direction began
    let down = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const step = y - lastY;
      if (!phone.matches || y < 64) setHidden(false);
      else if (Math.abs(step) > window.innerHeight || root.hasAttribute("data-keyboard") || y > root.scrollHeight - window.innerHeight - 24) {
        turnY = y;
      } else if (step !== 0) {
        if ((step > 0) !== down) {
          down = step > 0;
          turnY = lastY;
        }
        if (down && y > 96 && y - turnY >= 12) setHidden(true);
        else if (!down && turnY - y >= 12) setHidden(false);
      }
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      if (!phone.matches) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    phone.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      phone.removeEventListener("change", onResize);
      cancelAnimationFrame(frame);
      setHidden(false);
    };
  }, []);

  // A new page starts with the header in view.
  useEffect(() => setHidden(false), [pathname]);

  return (
    <header
      data-app-header
      className={cn(className, "transition-transform duration-200 ease-out motion-reduce:transition-none")}
      onFocusCapture={() => setHidden(false)}
    >
      {children}
    </header>
  );
}
