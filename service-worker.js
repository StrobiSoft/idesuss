const CACHE_NAME = "idesuss-root-v17";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/visual-polish.css?v=20260921-byn1",
  "/manifest.webmanifest",
  "/eula/",
  "/favicon.png",
  "/fx-rates.css?v=20260921-byn1",
  "/js/fx-rates.js?v=20260921-byn1",\n  "/js/home-runtime.js?v=20260926-commonhome1",\n  "/js/lang/home-language.js?v=20260926-commonhome1",
  "/js/menu/menu-core.js?v=20260925-brightness1",
  "/js/menu/settings.js?v=20260925-brightness1",
  "/js/site-stats.js?v=20260926-shared-supabase1",
  "/js/online-users.js?v=20260924-vip-presence1",
  "/js/anonymous-presence.js?v=20260926-common-presence1",
  "/js/shared/presence-policy.js",
  "/js/shared/supabase-client.js",
  "/js/shared/user-badges.js",
  "/radio/",
  "/radio/index.html",
  "/radio/radio-skins.css",
  "/radio/radio-app.js?v=20260923-media-session1",
  "/radio/radio-engine.js",
  "/radio/radio-entitlements.js",
  "/radio/radio-policy.js",
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
