"use client";

import { useEffect } from "react";

/** localStorage: "1" registers the worker in an automated browser too (our own end-to-end tests of it). */
const FORCE_KEY = "od_force_sw";

/**
 * Registers public/sw.js (the offline page; it caches nothing else) once the page has loaded and the browser is idle,
 * in production only. NEXT_PUBLIC_SW=off is the kill switch: pages then unregister it and delete its cache (README,
 * "Installable app"). Not registered in automated browsers (navigator.webdriver) unless localStorage od_force_sw is
 * "1", so end-to-end suites see the site as it is, as with the visit statistics (od_force_track).
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    if (process.env.NEXT_PUBLIC_SW === "off") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const r of registrations) {
            const script = (r.active ?? r.waiting ?? r.installing)?.scriptURL;
            if (script && new URL(script).pathname === "/sw.js") void r.unregister();
          }
        })
        .catch(() => {});
      if (typeof caches !== "undefined") {
        void caches
          .keys()
          .then((keys) => Promise.all(keys.filter((k) => k.startsWith("od-")).map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return;
    }
    try {
      if (navigator.webdriver && localStorage.getItem(FORCE_KEY) !== "1") return;
    } catch {
      if (navigator.webdriver) return;
    }
    let idle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // update(): a new sw.js (or the kill switch) reaches every phone on its next visit, not a day later.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((r) => r.update())
        .catch(() => {});
    };
    const whenIdle = () => {
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(register, { timeout: 5000 });
      else timer = setTimeout(register, 1000);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      window.removeEventListener("load", whenIdle);
      if (idle) window.cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, []);
  return null;
}
