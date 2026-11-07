"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/paths";
import { BRAND } from "@/lib/config";
import { cn } from "@/lib/utils";

type Prefill = {
  key: "whatsapp.prefill.sell" | "whatsapp.prefill.exit" | "whatsapp.prefill.deal" | "whatsapp.prefill.default";
  ref?: string;
};

/**
 * The first message the chat opens with, by page: sellers on /sell say they want to sell, the exit calculator asks for
 * advice, a deal page names the deal. Copy: marketing `whatsapp.prefill.*`. The language segment (/ar/…, /zh/…) is
 * ignored, so every language's address picks the same message.
 */
export function whatsappPrefill(pathname: string): Prefill {
  const path = stripLocale(pathname);
  if (path === "/sell" || path.startsWith("/sell/")) return { key: "whatsapp.prefill.sell" };
  if (path === "/exit-calculator" || path.startsWith("/exit-calculator/")) return { key: "whatsapp.prefill.exit" };
  const deal = /^\/deals\/([^/]+)\/?$/.exec(path);
  if (deal) {
    let segment = deal[1];
    try {
      segment = decodeURIComponent(segment);
    } catch {}
    // The deal's reference (OD-1234), wherever it sits in the segment.
    const ref = /OD-\d+/i.exec(segment)?.[0]?.toUpperCase();
    if (ref) return { key: "whatsapp.prefill.deal", ref };
  }
  return { key: "whatsapp.prefill.default" };
}

/** Where a floating button shows: everywhere, from lg only (not on phones and tablets), or nowhere. */
export type FloatingPlace = "always" | "desktop" | "never";

/**
 * The floating buttons a page has (this one and the FeliBot launcher). The admin console has none: this one would
 * message the office itself, and the consoles never had the chat. Below lg an account's pages and the sign-in forms go
 * without too: their fields and buttons fill a phone's screen, and the footer still has WhatsApp.
 */
export function floatingPlaces(pathname: string): { whatsapp: FloatingPlace; assistant: FloatingPlace } {
  const path = stripLocale(pathname);
  if (/^\/admin(?:\/|$)/.test(path)) return { whatsapp: "never", assistant: "never" };
  if (/^\/dashboard(?:\/|$)/.test(path)) return { whatsapp: "desktop", assistant: "never" };
  if (/^\/(?:login|signup|forgot-password|reset-password)(?:\/|$)/.test(path)) return { whatsapp: "desktop", assistant: "desktop" };
  return { whatsapp: "always", assistant: "always" };
}

/**
 * Position and size come from the app shell's variables (globals.css: --fab-size, --fab-edge, --fab-gap, --fab-wa-slot,
 * --fab-base, which follow the tab bar, the deal bar and the safe areas). FAB_VARS repeats the shell's phone and sm
 * values as fallbacks, so the buttons sit right without it: 48 px, 16 px from the edges on phones; 56 px, 20 px from sm.
 */
export const FAB_VARS =
  "[--fab-fb-size:3rem] [--fab-fb-gap:0.75rem] [--fab-fb-edge:max(1rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] sm:[--fab-fb-size:3.5rem] sm:[--fab-fb-gap:1.25rem] sm:[--fab-fb-edge:max(1.25rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))]";
export const FAB = {
  size: "var(--fab-size, var(--fab-fb-size))",
  edge: "var(--fab-edge, var(--fab-fb-edge))",
  /** The line the buttons sit on: the top of the bottom bar on screen, else the safe area. */
  base: "var(--fab-base, env(safe-area-inset-bottom, 0px))",
  /** Room for the WhatsApp button under the launcher (0 where it is not shown). */
  waSlot: "var(--fab-wa-slot, calc(var(--fab-fb-size) + var(--fab-fb-gap)))",
};
/** Out of the way below lg (over a control, while typing, before the first look): faded out and not tappable. */
export const FAB_AWAY = "max-lg:pointer-events-none max-lg:invisible max-lg:translate-y-3 max-lg:scale-90 max-lg:opacity-0";

/** The phone shell (globals.css): below lg the floating buttons sit over the page and keep clear of its controls. */
export const PHONE_SHELL = "(max-width: 1023.98px)";

type Box = { left: number; top: number; right: number; bottom: number };

/** Anything a visitor taps or types in. */
const CONTROL =
  'a[href],button,input:not([type="hidden"]),select,textarea,summary,label,[role="button"],[role="link"],[role="combobox"],[role="tab"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[contenteditable="true"]';
const TEXT = "p,h1,h2,h3,h4,li,dt,dd,th,td,span";
const MEDIA = "img,svg,video,canvas,iframe";
/** Fixed chrome, never part of the page under a button: the floating elements themselves, the shell's bars and cards. */
const CHROME = "[data-fab],[data-assistant],[data-tabbar],[data-dealbar],[data-app-header],[data-install-card],[data-lang-bar]";

/** Whether `el` is what shows at (x, y): not under something else, not clipped away by a scrolling parent. */
function showsAt(el: Element, x: number, y: number) {
  for (const hit of document.elementsFromPoint(x, y)) {
    if (hit.closest(CHROME)) continue;
    // See-through: a link stretched over a card by its ::after (a hit outside its own box), a decorative layer.
    const r = hit.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    if (hit.getAttribute("aria-hidden") === "true" && !hit.contains(el)) continue;
    if (hit === el || el.contains(hit)) return true;
    // A disabled button lets taps through to its parent, but it is still on screen.
    return hit.contains(el) && getComputedStyle(el).pointerEvents === "none";
  }
  return false;
}

/**
 * Whether the page shows something under `zone`: a control, or a short text (a label, a figure, a badge) whose middle
 * would be hidden; with `content`, any text, picture or control laid out there at all (the hello, which rather waits).
 */
export function pageUnder(zone: Box, content = false): boolean {
  const under = (el: Element, r: { left: number; top: number; right: number; bottom: number }) => {
    const left = Math.max(zone.left, r.left);
    const right = Math.min(zone.right, r.right);
    const top = Math.max(zone.top, r.top);
    const bottom = Math.min(zone.bottom, r.bottom);
    if (right - left < 2 || bottom - top < 2 || el.closest(CHROME)) return false;
    if (content) return el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) ?? true;
    return showsAt(el, (left + right) / 2, (top + bottom) / 2);
  };
  for (const el of document.querySelectorAll(`:is(main, footer) :is(${CONTROL})`)) if (under(el, el.getBoundingClientRect())) return true;
  if (!content) {
    for (const el of document.querySelectorAll(`:is(main, footer) :is(${TEXT})`)) {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (x > zone.left && x < zone.right && y > zone.top && y < zone.bottom && !el.closest(CHROME) && showsAt(el, x, y)) return true;
    }
    return false;
  }
  for (const el of document.querySelectorAll(`:is(main, footer) :is(${MEDIA})`)) if (under(el, el.getBoundingClientRect())) return true;
  const range = document.createRange();
  for (const root of document.querySelectorAll("main, footer")) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue?.trim() || parent.closest(".sr-only")) continue;
      const p = parent.getBoundingClientRect();
      if (p.bottom <= zone.top || p.top >= zone.bottom || p.right <= zone.left || p.left >= zone.right) continue;
      range.selectNodeContents(node);
      for (const line of range.getClientRects()) if (under(parent, line)) return true;
    }
  }
  return false;
}

/** Where a floating element sits when shown (without the transforms that slide it away), `pad` px larger all round. */
export function restBox(el: HTMLElement, pad = 4): Box {
  const r = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  let dx = 0;
  let dy = 0;
  if (style.transform && style.transform !== "none") {
    const m = new DOMMatrixReadOnly(style.transform);
    dx += m.m41;
    dy += m.m42;
  }
  if (style.translate && style.translate !== "none") {
    const [x = "0", y = "0"] = style.translate.split(" ");
    dx += parseFloat(x) || 0;
    dy += parseFloat(y) || 0;
  }
  const cx = r.left + r.width / 2 - dx;
  const cy = r.top + r.height / 2 - dy;
  const w = el.offsetWidth / 2 + pad;
  const h = el.offsetHeight / 2 + pad;
  return { left: cx - w, right: cx + w, top: cy - h, bottom: cy + h };
}

/** Typing on a touch screen: the on-screen keyboard needs the room (select pickers and checkboxes raise none). */
export function typingOnTouch() {
  return window.matchMedia("(pointer: coarse)").matches && !!document.activeElement?.matches(":read-write");
}

// One watcher for every floating element: checks run once the page is still (after a scroll, a resize or a change to
// it), never while it moves, so nothing flickers.
const checks = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let firstChange = 0;
let lastScroll = 0;
let unwatch: (() => void) | undefined;

function run() {
  if (performance.now() - lastScroll < 150) {
    timer = setTimeout(run, 160);
    return;
  }
  firstChange = 0;
  for (const check of checks) check();
}

function changed(scroll = false) {
  const now = performance.now();
  if (scroll) lastScroll = now;
  firstChange ||= now;
  clearTimeout(timer);
  // A page that keeps changing (an animation) is still looked at every 800 ms; a scroll always waits for its end.
  timer = setTimeout(run, scroll ? 160 : Math.max(0, Math.min(160, 800 - (now - firstChange))));
}

/** Calls `check` whenever the page has settled after a scroll, a resize or a change to it; returns the unsubscribe. */
export function onSettled(check: () => void) {
  checks.add(check);
  if (!unwatch) {
    const onScroll = () => changed(true);
    const onChange = () => changed();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onChange);
    window.visualViewport?.addEventListener("resize", onChange);
    window.addEventListener("load", onChange);
    const sizes = new ResizeObserver(onChange);
    sizes.observe(document.body);
    const edits = new MutationObserver(onChange);
    const main = document.querySelector("main");
    if (main) {
      edits.observe(main, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["open", "hidden", "disabled", "data-state", "aria-expanded"],
      });
    }
    // The shell's state: header hidden on scroll, keyboard up, install card on screen.
    edits.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scroll", "data-keyboard", "data-install-prompt"] });
    unwatch = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onChange);
      window.visualViewport?.removeEventListener("resize", onChange);
      window.removeEventListener("load", onChange);
      sizes.disconnect();
      edits.disconnect();
      clearTimeout(timer);
    };
  }
  return () => {
    checks.delete(check);
    if (!checks.size) {
      unwatch?.();
      unwatch = undefined;
    }
  };
}

/**
 * Below lg: whether the floating element `ref` may show, i.e. it would cover none of the page's controls and nobody is
 * typing. False until the first look, so a phone never sees it over a button first. Always true from lg, where the
 * buttons stay as they were. `page` (the address) starts a new look on every page.
 */
export function useClearOfPage(ref: RefObject<HTMLElement | null>, page: string, enabled = true) {
  const [clear, setClear] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const phone = window.matchMedia(PHONE_SHELL);
    const check = () => {
      const el = ref.current;
      if (!phone.matches) setClear(true);
      else if (el?.offsetWidth) setClear(!typingOnTouch() && !pageUnder(restBox(el)));
    };
    // The keyboard is about to open: out of the way at once, not when the page settles.
    const onFocus = () => requestAnimationFrame(() => (typingOnTouch() ? setClear(false) : changed()));
    const stop = onSettled(check);
    const first = requestAnimationFrame(() => requestAnimationFrame(check));
    phone.addEventListener("change", check);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      stop();
      cancelAnimationFrame(first);
      phone.removeEventListener("change", check);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
    };
  }, [ref, page, enabled]);
  return clear;
}

/** Floating WhatsApp shortcut to the office number (BRAND.whatsapp; NEXT_PUBLIC_WHATSAPP overrides it). */
export function WhatsAppButton() {
  const t = useT("marketing");
  const pathname = usePathname() ?? "/";
  const ref = useRef<HTMLAnchorElement>(null);
  const place = floatingPlaces(pathname).whatsapp;
  const shown = Boolean(BRAND.whatsapp) && place !== "never";
  const clear = useClearOfPage(ref, pathname, shown && place === "always");
  if (!shown) return null;
  const label = t("contact.whatsapp");
  const prefill = whatsappPrefill(pathname);
  const text = t(prefill.key, { ref: prefill.ref });
  return (
    <a
      ref={ref}
      href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      data-prefill={prefill.key}
      data-wa="floating"
      data-fab=""
      className={cn(
        FAB_VARS,
        "fixed z-40 grid place-items-center rounded-full bg-[#25D366] text-white shadow-lift ring-4 ring-background/70 transition-[bottom,opacity,translate,scale,visibility] duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-ring motion-reduce:transition-none print:hidden",
        place === "desktop" ? "max-lg:hidden" : !clear && FAB_AWAY,
      )}
      style={{ insetInlineEnd: FAB.edge, bottom: `calc(${FAB.base} + ${FAB.edge})`, width: FAB.size, height: FAB.size }}
    >
      <svg viewBox="0 0 32 32" className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" fill="currentColor">
        <path d="M16.04 3C8.9 3 3.1 8.78 3.1 15.9c0 2.27.6 4.5 1.74 6.46L3 29l6.83-1.79a12.9 12.9 0 0 0 6.2 1.58h.01c7.13 0 12.93-5.79 12.93-12.9 0-3.45-1.35-6.69-3.79-9.12A12.83 12.83 0 0 0 16.04 3Zm0 23.6h-.01a10.7 10.7 0 0 1-5.46-1.5l-.39-.23-4.05 1.06 1.08-3.94-.25-.4a10.66 10.66 0 0 1-1.64-5.69c0-5.9 4.82-10.7 10.73-10.7 2.86 0 5.55 1.12 7.58 3.14a10.62 10.62 0 0 1 3.14 7.57c0 5.9-4.82 10.7-10.73 10.7Zm5.88-8.01c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.29.32-1.12 1.1-1.12 2.68s1.15 3.11 1.31 3.32c.16.21 2.26 3.45 5.47 4.83.77.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.91-.78 2.18-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
