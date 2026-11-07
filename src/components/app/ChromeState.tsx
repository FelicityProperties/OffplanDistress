"use client";

import { useEffect } from "react";

const TEXT_ENTRY =
  'input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"], [type="color"], [type="button"], [type="submit"], [type="reset"], [type="image"], [type="hidden"]), textarea, select, [contenteditable]';

/**
 * How the phone is held. Not the (orientation) media query: that follows the page's own shape, and a keyboard that
 * shrinks the page (Android) can make it "landscape".
 */
function heldAs() {
  return screen.orientation?.type ?? String((window as { orientation?: number }).orientation ?? "");
}

/** Typing goes on in this element: a text field (not read-only or disabled), a select, an editable region. */
function takesText(el: Element | null) {
  if (!(el instanceof HTMLElement) || !el.matches(TEXT_ENTRY)) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLSelectElement) return !el.disabled;
  return el.isContentEditable;
}

/**
 * Sets html[data-keyboard] while the on-screen keyboard is up, so the bottom bars and floating buttons step aside
 * (globals.css). Up means: a touch screen, focus in a field, and the visible area at least 150px shorter than the
 * tallest the window has been, held this way up. That holds whether the browser shrinks the page (Android,
 * interactive-widget) or only the visual viewport (iOS), and a hardware keyboard leaves the bars alone. Re-checked on
 * focus changes and visual viewport resizes, which also catches Android's back key closing the keyboard without a blur.
 */
export function ChromeState() {
  useEffect(() => {
    const root = document.documentElement;
    const coarse = window.matchMedia("(pointer: coarse)");
    const vv = window.visualViewport;
    const tallest = new Map<string, number>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const held = heldAs();
      const full = Math.max(tallest.get(held) ?? 0, window.innerHeight);
      tallest.set(held, full);
      const shrunk = !vv || full - vv.height * vv.scale > 150;
      root.toggleAttribute("data-keyboard", coarse.matches && takesText(document.activeElement) && shrunk);
    };
    // Focus leaving a field lands on the next one (or none) only after this event.
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(check);
    };
    check();
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", later);
    window.addEventListener("resize", check);
    vv?.addEventListener("resize", check);
    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", later);
      window.removeEventListener("resize", check);
      vv?.removeEventListener("resize", check);
      clearTimeout(timer);
      root.removeAttribute("data-keyboard");
    };
  }, []);
  return null;
}
