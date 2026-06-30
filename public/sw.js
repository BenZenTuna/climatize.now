// Minimal service worker: network-first for same-origin GETs (so content stays
// fresh online), falling back to the cache when offline. Cross-origin requests
// (e.g. live weather from Open-Meteo) always go to the network. No personal data
// is cached beyond the app shell already in your browser.
const CACHE = "baseheat-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // weather/geocoding → network only
  if (url.pathname.includes("hot-update") || url.pathname.startsWith("/_next/webpack")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match("/"))),
  );
});
