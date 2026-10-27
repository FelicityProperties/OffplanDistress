"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { localeOfPath, stripLocale } from "@/i18n/paths";
import { analyticsSessionId } from "@/lib/attribution";

// Anonymous visit statistics for /admin/analytics, mounted once in the site layout. On each page (a new path, or new
// campaign tags in the URL) it sends one small beacon to /api/a, and when the visitor leaves the page or hides the tab,
// the time the page was visible. No cookies: the only state is a random per-tab session id in sessionStorage
// (src/lib/attribution.ts) and, on staff devices, the "od_no_track" switch in localStorage. Beacons go after the
// page has rendered and never block anything. Not sent from automated browsers (navigator.webdriver; our own e2e tests
// opt in with localStorage od_force_track = "1"), from a device marked "ignore", on /admin and /dashboard, or for an
// admin (the server drops admins' beacons as well, on any device). Link prefetches render nothing here, so they
// never count.

const ENDPOINT = "/api/a";
const UNTRACKED = /^\/(admin|dashboard|api)(\/|$)/;
const CAMPAIGN = ["utm_source", "utm_medium", "utm_campaign", "ref"] as const;
export const NO_TRACK_KEY = "od_no_track";
const FORCE_TRACK_KEY = "od_force_track";
const FORGOT_KEY = "od_sid_forgot";

/** The referrer is only meaningful for the first page of a page load: client-side navigations keep the old one. */
let firstViewOfLoad = true;

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

export function PageViewTracker({ staff }: { staff: boolean }) {
  const address = usePathname();
  // The same page in both languages is one page in the report: "/ar/deals" is recorded as "/deals" with locale "ar".
  const pathname = address ? stripLocale(address) : address;
  const params = useSearchParams();
  const pageLocale = useLocale();
  const locale = (address && localeOfPath(address)) || pageLocale;
  // Read when a view is sent; switching language reloads the page's content but is not a new page view.
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);
  // Only campaign tags make a new page view: filters on /deals rewrite the query string on every change.
  const campaign = CAMPAIGN.map((k) => params.get(k) ?? "").join("\n");

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

  useEffect(() => {
    if (staff || !pathname || UNTRACKED.test(pathname) || !trackingAllowed()) return;
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
      viewId = newViewId();
      sessionId = sid;
      resume();
      const q = new URLSearchParams(location.search);
      const body: Record<string, unknown> = { t: "v", viewId, sessionId, path: pathname, locale: localeRef.current };
      for (const k of CAMPAIGN) if (q.get(k)) body[k] = q.get(k)!.slice(0, 200);
      if (firstViewOfLoad) body.referrer = externalReferrerHost();
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
    };
  }, [pathname, campaign, staff]);

  return null;
}
