"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin gold bar along the top while an in-app navigation loads. Pages render per request and have no loading screen,
 * so without it a tap shows nothing until the next page arrives. Started by src/instrumentation-client.ts
 * (od:navstart), finished when the address changes. It appears only after 150 ms, so quick ones (back to a cached page)
 * never flash it, and gives up after 12 s. Reduced motion: globals.css makes its transitions instant.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const bar = useRef<HTMLDivElement>(null);
  const finish = useRef(() => {});

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let show: ReturnType<typeof setTimeout> | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    let reset: ReturnType<typeof setTimeout> | undefined;
    let shown = false;
    const paint = (transform: string, opacity: number, transition = "none") => {
      el.style.transition = transition;
      el.style.transform = transform;
      el.style.opacity = String(opacity);
    };
    const stop = (done: boolean) => {
      clearTimeout(show);
      clearTimeout(giveUp);
      if (!shown) return;
      shown = false;
      // Done: fill up, then fade. Given up: just fade.
      if (done) paint("scaleX(1)", 0, "transform 200ms ease-out, opacity 200ms ease-out 100ms");
      else paint(el.style.transform, 0, "opacity 200ms ease-out");
      clearTimeout(reset);
      reset = setTimeout(() => paint("scaleX(0)", 0), 350);
    };
    const start = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (!url) return;
      let to: URL;
      try {
        to = new URL(url, window.location.href);
      } catch {
        return;
      }
      // A #section of this page, or this page again: nothing to wait for (and no address change would end the bar).
      const here = window.location;
      if (to.origin === here.origin && to.pathname === here.pathname && to.search === here.search) return;
      clearTimeout(show);
      clearTimeout(giveUp);
      if (!shown) {
        show = setTimeout(() => {
          shown = true;
          clearTimeout(reset);
          paint("scaleX(0.1)", 1);
          void el.offsetWidth; // start growing from there
          paint("scaleX(0.8)", 1, "transform 8s cubic-bezier(0.1, 0.7, 0.3, 1)");
        }, 150);
      }
      giveUp = setTimeout(() => stop(false), 12000);
    };
    finish.current = () => stop(true);
    window.addEventListener("od:navstart", start);
    return () => {
      window.removeEventListener("od:navstart", start);
      clearTimeout(show);
      clearTimeout(giveUp);
      clearTimeout(reset);
      finish.current = () => {};
    };
  }, []);

  // A new address: the navigation has landed.
  useEffect(() => {
    finish.current();
  }, [pathname, search]);

  return (
    <div
      ref={bar}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gold opacity-0 rtl:origin-right"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
