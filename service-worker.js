const CACHE_NAME = "idesuss-root-v11";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/visual-polish.css?v=20260921-byn1",
  "/manifest.webmanifest",
  "/eula/",
  "/favicon.png",
  "/fx-rates.css?v=20260921-byn1",
  "/js/fx-rates.js?v=20260921-byn1",
  "/js/pwa-register.js?v=20260923-pwa1",
  "/js/menu/menu-core.js?v=20260923-media-pwa1",
  "/js/menu/settings.js?v=20260923-finalweb1",
  "/radio/",
  "/radio/index.html",
  "/radio/radio-skins.css",
  "/radio/radio-app.js?v=20260923-media-session1",
  "/radio/radio-engine.js",
  "/radio/radio-entitlements.js",
  "/radio/radio-stations.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(STATIC_ASSETS.map(asset => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("idesuss-root-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
