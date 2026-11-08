"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Toaster as Sonner, useSonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** The phone shell: below lg the header is the 56px bar with the menu button (src/components/SiteHeader.tsx). */
const SHELL = "(max-width: 1023.98px)";
const subscribeShell = (onChange: () => void) => {
  const query = window.matchMedia(SHELL);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
export const useShell = () => useSyncExternalStore(subscribeShell, () => window.matchMedia(SHELL).matches, () => false);

/**
 * Where a notice at the top of the screen (a toast, the offline notice) starts, so that it leaves the sticky header in
 * sight with its logo and menu button, and on phones the consoles' section row under it too (61px, sticky below lg:
 * src/components/AppShell.tsx), clear of the notch. `above`: how far down the header sits (the language bar of a first
 * visit is still above it at the top of a page).
 */
export function belowHeader(pathname: string | null, shell: boolean, above = 0) {
  const row = shell && /^\/(?:dashboard|admin)(?:\/|$)/.test(pathname ?? "") ? " + 3.8125rem" : "";
  return `calc(var(--app-safe-t, env(safe-area-inset-top, 0px)) + ${above}px + var(--app-header-h, 4.25rem)${row} + 0.5rem)`;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const pathname = usePathname();
  const shell = useShell();
  const showing = useSonner().toasts.length > 0;
  const [above, setAbove] = useState(0);
  // While toasts are up (and on a new page, where a toast from the previous one may still be): the header's top edge,
  // under the language bar at the top of a page, 0 once it sticks (or has slid away).
  useLayoutEffect(() => {
    if (!showing) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const header = document.querySelector("[data-app-header]") ?? document.querySelector("body header");
      setAbove(Math.max(0, Math.round(header?.getBoundingClientRect().top ?? 0)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [showing, pathname]);
  // Only used below lg (see the offsets below), hence the shell's geometry.
  const top = belowHeader(pathname, true, above);
  return (
    <Sonner
      className="toaster group"
      // Below lg toasts open under the header instead of over it: mobileOffset is sonner's up to 600px, offset above
      // that. From lg they stay where they were (24px from the top).
      mobileOffset={{ top }}
      offset={shell ? { top } : undefined}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          // Phones: a 36px button with 14px text (it was 24px, e.g. the sell form's Undo). sonner's own CSS is unlayered
          // and beats plain utilities, hence the important modifier.
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground max-lg:h-9! max-lg:px-3! max-lg:text-sm!",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground max-lg:h-9! max-lg:px-3! max-lg:text-sm!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
