"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { localeOfPath, stripLocale } from "@/i18n/paths";
import { analyticsSessionId } from "@/lib/attribution";
import { isWhatsAppPlace, WHATSAPP_LINK } from "@/lib/whatsapp-places";

// Anonymous visit statistics for /admin/analytics, mounted once in the site layout. On each page (a new path, or new
// campaign tags in the URL) it sends one small beacon to /api/a, and when the visitor leaves the page or hides the tab,
// the time the page was visible. No cookies: the only state is a random per-tab session id in sessionStorage
// (src/lib/attribution.ts) and, on staff devices, the "od_no_track" switch in localStorage. Beacons go after the
// page has rendered and never block anything. Not sent from automated browsers (navigator.webdriver; our own e2e tests
// opt in with localStorage od_force_track = "1"), from a device marked "ignore", on /admin and /dashboard, or for an
// admin (the server drops admins' beacons as well, on any device). Link prefetches render nothing here, so they
// never count. A tap on a WhatsApp button sends its own beacon at once (WhatsApp usually takes the visitor off the
// page): which button (the link's data-wa), on which page, and on a deal page the deal's reference; never the message.

const ENDPOINT = "/api/a";
const UNTRACKED = /^\/(admin|dashboard|api)(\/|$)/;
const CAMPAIGN = ["utm_source", "utm_medium", "utm_campaign", "ref"] as const;
export const NO_TRACK_KEY = "od_no_track";
const FORCE_TRACK_KEY = "od_force_track";
const FORGOT_KEY = "od_sid_forgot";
/** sessionStorage: the page view a language switch carries over to the page's reload (keepPageView). */
const CARRY_KEY = "od_view_carry";
/** Cookie: the page a language switch is reloading, so its server render isn't counted as a new view. */
export const VIEW_CARRY_COOKIE = "od_view_carry";

/** The referrer is only meaningful for the first page of a page load: client-side navigations keep the old one. */
let firstViewOfLoad = true;

/** The page view being recorded in this tab, if any: what keepPageView() carries over. */
let current: { viewId: string; sessionId: string; path: string; visibleMs: () => number } | null = null;

/**
 * Called by the language switch (src/components/LocaleSwitcher.tsx) just before it loads the same page in another
 * language: that load goes on with this page view (same row, its time adding up, its language updated) instead of
 * counting a second one.
 */
export function keepPageView() {
  const view = current;
  if (!view) return;
  const { viewId, sessionId, path } = view;
  try {
    sessionStorage.setItem(CARRY_KEY, JSON.stringify({ viewId, sessionId, path, ms: Math.round(view.visibleMs()), at: Date.now() }));
  } catch {}
  // For the server too: a deal page reloaded in another language doesn't count its advert's view again (the cookie
  // names the page and lasts 30 seconds; src/app/(site)/deals/[ref]/page.tsx).
  document.cookie = `${VIEW_CARRY_COOKIE}=${encodeURIComponent(path)}; Max-Age=30; Path=/; SameSite=Lax`;
}

/** The page view a language switch handed to this load, when it is this page's, this visit's and recent; read once. */
function carriedView(path: string, sessionId: string): { viewId: string; ms: number } | null {
  try {
    const raw = sessionStorage.getItem(CARRY_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CARRY_KEY);
    const c = JSON.parse(raw);
    const fresh = typeof c?.at === "number" && Date.now() - c.at < 60_000;
    if (!fresh || c.path !== path || c.sessionId !== sessionId || typeof c.viewId !== "string") return null;
    return { viewId: c.viewId, ms: Math.max(0, Number(c.ms) || 0) };
  } catch {
    return null;
  }
}

function send(body: Record<string, unknown>) {
  const json = JSON.stringify(body);
  try {
    // A plain string goes as text/plain, which needs no CORS preflight and survives the page closing.
    if (navigator.sendBeacon?.(ENDPOINT, json)) return;
  } catch {}
  fetch(ENDPOINT, { method: "POST", body: json, keepalive: true, credentials: "same-origin" }).catch(() => {});
}

function trackingAllowed() {
  try {
    if (localStorage.getItem(NO_TRACK_KEY) === "1") return false;
    return !navigator.webdriver || localStorage.getItem(FORCE_TRACK_KEY) === "1";
  } catch {
    return !navigator.webdriver;
  }
}

function newViewId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Pages served over plain http outside localhost have no randomUUID: an RFC 4122 version-4 id by hand.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function externalReferrerHost() {
  try {
    const host = document.referrer ? new URL(document.referrer).host : "";
    return host && host !== location.host ? host : null;
  } catch {
    return null;
  }
}

/** The button a WhatsApp link without data-wa stands for, from the page it is on. */
function placeOfPage(path: string) {
  if (path === "/contact") return "contact";
  if (path === "/sell" || path.startsWith("/sell/")) return "sell";
  if (path === "/exit-calculator" || path.startsWith("/exit-calculator/")) return "exit";
  if (path.startsWith("/deals/")) return "deal";
  if (path.startsWith("/claim") || path === "/reset-password") return "claim";
  return "other";
}

export function PageViewTracker({ staff }: { staff: boolean }) {
  const address = usePathname();
  // The same page in every language is one page in the report: "/ar/deals" is recorded as "/deals" with locale "ar",
  // "/zh/deals" with locale "zh".
  const pathname = address ? stripLocale(address) : address;
  const params = useSearchParams();
  const pageLocale = useLocale();
  const locale = (address && localeOfPath(address)) || pageLocale;
  // Read when a view is sent. Switching language loads the page again but is not a new page view (keepPageView).
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);
  // Only campaign tags make a new page view: filters on /deals rewrite the query string on every change. Tags that only
  // go away (a "Clear all" that drops them with the filters) leave the page view as it is; new or other tags start one.
  // Compared tag by tag (a tag may hold any character, a newline too: a joined string would never match itself again
  // and re-render without end).
  const tags = CAMPAIGN.map((k) => params.get(k) ?? "");
  const [view, setView] = useState({ pathname, tags });
  if (view.pathname !== pathname || tags.some((v, i) => v !== "" && v !== view.tags[i])) setView({ pathname, tags });
  const campaign = JSON.stringify(view.tags);

  // An admin's tab: ask the server (which checks the session) to forget what this tab recorded before they signed in.
  useEffect(() => {
    if (!staff) return;
    const sid = analyticsSessionId();
    if (!sid) return;
    try {
      if (sessionStorage.getItem(FORGOT_KEY) === sid) return;
      sessionStorage.setItem(FORGOT_KEY, sid);
    } catch {}
    send({ t: "f", sessionId: sid });
  }, [staff]);

  // Taps on a WhatsApp button, anywhere on the public site.
  useEffect(() => {
    if (staff) return;
    const onTap = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || !WHATSAPP_LINK.test(a.getAttribute("href") ?? "")) return;
      const address = location.pathname;
      const path = stripLocale(address);
      if (UNTRACKED.test(path) || !trackingAllowed()) return;
      const sessionId = analyticsSessionId("touch");
      if (!sessionId) return;
      // The link says which button it is (data-wa); otherwise the page does.
      const place = a.getAttribute("data-wa") ?? placeOfPage(path);
      let dealRef: string | null = null;
      const deal = /^\/deals\/([^/]+)\/?$/.exec(path);
      if (deal) {
        let segment = deal[1];
        try {
          segment = decodeURIComponent(segment);
        } catch {}
        dealRef = /OD-\d{1,9}/i.exec(segment)?.[0]?.toUpperCase() ?? null;
      }
      send({ t: "w", sessionId, path: address, place: isWhatsAppPlace(place) ? place : "other", dealRef, locale: localeRef.current });
    };
    document.addEventListener("click", onTap, true);
    document.addEventListener("auxclick", onTap, true);
    return () => {
      document.removeEventListener("click", onTap, true);
      document.removeEventListener("auxclick", onTap, true);
    };
  }, [staff]);

  useEffect(() => {
    const path = view.pathname;
    if (staff || !path || UNTRACKED.test(path) || !trackingAllowed()) return;
    let viewId: string | null = null;
    let sessionId = "";
    let visibleMs = 0;
    let visibleSince: number | null = null;
    let sentMs = 0;

    const pause = () => {
      if (visibleSince != null) visibleMs += performance.now() - visibleSince;
      visibleSince = null;
    };
    const flush = () => {
      pause();
      const ms = Math.round(visibleMs);
      if (!viewId || ms <= sentMs) return;
      sentMs = ms;
      analyticsSessionId("touch");
      send({ t: "l", viewId, sessionId, durationMs: ms });
    };
    const resume = () => {
      if (visibleSince == null && document.visibilityState === "visible") visibleSince = performance.now();
    };

    const start = () => {
      const sid = analyticsSessionId("view");
      if (!sid) return; // storage blocked: no way to group pages into a visit
      // Loaded again by a language switch: the same page view goes on (the server gives its row this language).
      const carried = carriedView(path, sid);
      viewId = carried?.viewId ?? newViewId();
      sessionId = sid;
      visibleMs = sentMs = carried?.ms ?? 0;
      resume();
      current = { viewId, sessionId, path, visibleMs: () => visibleMs + (visibleSince == null ? 0 : performance.now() - visibleSince) };
      const q = new URLSearchParams(location.search);
      const body: Record<string, unknown> = { t: "v", viewId, sessionId, path, locale: localeRef.current };
      for (const k of CAMPAIGN) if (q.get(k)) body[k] = q.get(k)!.slice(0, 200);
      if (firstViewOfLoad && !carried) body.referrer = externalReferrerHost();
      firstViewOfLoad = false;
      send(body);
    };

    const onVisibility = () => (document.visibilityState === "hidden" ? flush() : resume());
    const onPageShow = (e: PageTransitionEvent) => e.persisted && resume();

    // A tick later: React's development double-run of effects and pages that redirect at once record nothing. A page
    // the browser prerenders in the background waits until it is actually shown.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const begin = () => {
      timer = setTimeout(start, 0);
    };
    const doc = document as Document & { prerendering?: boolean };
    if (doc.prerendering) document.addEventListener("prerenderingchange", begin, { once: true });
    else begin();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("prerenderingchange", begin);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("pageshow", onPageShow);
      flush(); // moving to another page closes this one
      current = null;
    };
  }, [view.pathname, campaign, staff]);

  return null;
}
