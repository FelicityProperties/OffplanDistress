"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListOrdered } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The table of contents of the legal pages below lg (Terms, Privacy, Cookies: src/components/LegalDocument.tsx renders
 * it, with the links as children). The documents run to 17,000-21,000px on a phone, so the bar sticks under the header
 * while they are read and names the section on screen; its list drops down over the text and closes when a section is
 * picked (or on a tap outside, or Escape). From lg the sticky side column takes over.
 */
export function LegalToc({
  label,
  sections,
  children,
}: {
  label: string;
  sections: { id: string; heading: string }[];
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [current, setCurrent] = useState(-1);
  const [open, setOpen] = useState(false);

  // The section being read: the last heading that has passed the top fifth of the screen.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.2 + 80;
      let at = -1;
      sections.forEach((s, i) => {
        const h = document.getElementById(s.id);
        if (h && h.getBoundingClientRect().top < line) at = i;
      });
      setCurrent(at);
    };
    const later = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", later);
      window.removeEventListener("resize", later);
    };
  }, [sections]);

  // While open: a tap outside or Escape closes the list.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const el = ref.current;
      if (!el) return;
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        el.open = false;
        el.querySelector("summary")?.focus();
      } else if (!el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      data-legal-toc
      className="group sticky z-30 mb-8 rounded-2xl border bg-card/95 shadow-card backdrop-blur-xl motion-safe:transition-[top] motion-safe:duration-200 lg:hidden"
      // Under the header, which slides away while reading down (globals.css sets --app-header-offset to 0 here then, on
      // this element alone); 4.25rem = its height without the app shell's variables.
      style={{ top: "calc(var(--app-header-offset, 4.25rem) + 0.5rem)" }}
      onToggle={(e) => {
        const el = e.currentTarget;
        setOpen(el.open);
        if (!el.open) return;
        // Opened before the bar has stuck (near the top of the page): bring it up first, so the list has the screen.
        const list = el.querySelector<HTMLElement>("[data-toc-list]");
        if (list && list.getBoundingClientRect().bottom > window.innerHeight - 72) el.scrollIntoView({ block: "start" });
      }}
      onClick={(e) => {
        // A section picked: close before the browser jumps to it, so the jump lands on the page as it will be.
        if (e.target instanceof Element && e.target.closest('a[href^="#"]')) e.currentTarget.open = false;
      }}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <ListOrdered className="size-4 shrink-0 text-gold" aria-hidden />
          <span className="shrink-0">{label}</span>
          {current >= 0 && (
            <span aria-hidden className="min-w-0 truncate font-normal text-muted-foreground">
              · {pad(current + 1)} {sections[current].heading}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
      </summary>
      <div
        data-toc-list
        className="absolute inset-x-0 top-full mt-2 max-h-[min(28rem,calc(100dvh-13rem))] overflow-y-auto overscroll-contain rounded-2xl border bg-card p-2 shadow-lift"
      >
        {children}
      </div>
    </details>
  );
}
