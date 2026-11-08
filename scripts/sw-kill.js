/*
 * The service worker's kill switch (never served from here). To take the worker off every browser: copy this file over
 * public/sw.js and deploy with NEXT_PUBLIC_SW=off (README, "Installable app"). Browsers that load a page unregister
 * the worker right away (src/components/app/ServiceWorker.tsx); any other one finds this file at its next update check
 * and removes itself and its cache. Pages it controls go back to the network on their next load.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("od-")) await caches.delete(key);
      await self.registration.unregister();
    })(),
  ),
);
