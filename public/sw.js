/*
 * OffplanDistress service worker, registered by src/components/app/ServiceWorker.tsx in production.
 *
 * Deliberately small. It never caches a page, a server action, an API answer or Next's own files (/_next): every page
 * is rendered per request and per user, and the browser's HTTP cache already keeps /_next/static (immutable). Its one
 * job: when loading a page fails because there is no network, show /offline.html instead of the browser's error.
 * HTTP errors (404, 500) are the site's own pages and pass through.
 *
 * Bump VERSION whenever public/offline.html changes (it is cached when the worker installs, and only then).
 *
 * KILL SWITCH (README, "Installable app"): copy scripts/sw-kill.js over this file and deploy with NEXT_PUBLIC_SW=off.
 * Browsers fetch this file past every cache (no-store in next.config.ts, updateViaCache "none"), on every page load.
 */
const VERSION = "2";
const CACHE = `od-offline-v${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("od-") && key !== CACHE) await caches.delete(key);
      // The page request starts while the worker boots, so a page is never slower for having a worker.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Page loads only: RSC and prefetch fetches, server actions (POST), images, scripts and the API go straight to the
  // network, without the worker.
  if (request.mode !== "navigate" || request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    // Opened in a tab but not a page (a document, a CSV export): the server's answer as it is, never the offline page.
    // Taken from the navigation preload already on its way: leaving the request to the browser would send it to the
    // server a second time (Chrome doesn't reuse the preload), and some of these record each view.
    event.respondWith((async () => (await event.preloadResponse) ?? fetch(request))());
    return;
  }
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(request);
      } catch {
        // No network (fetch only rejects then): the offline page.
        const offline = await caches.match(OFFLINE_URL, { cacheName: CACHE });
        return offline ?? Response.error();
      }
    })(),
  );
});
