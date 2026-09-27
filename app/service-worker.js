const CACHE_NAME = "idesuss-v6-release1";

const CORE_ASSETS = [
  "/app/",
  "/app/index.html",
  "/app/app-release.css",
  "/design-system.css",
  "/favicon.png",
  "/js/resolver.js",
  "/js/shared/share-intake.js",
  "/app/profile-bridge-entry.js",
  "/app/profile-bridge.js",
  "/app/hu.json.txt",
  "/app/en.json.txt",
  "/app/nl.json.txt",
  "/app/ro.json.txt",
  "/app/pl.json.txt",
  "/app/hr.json.txt",
  "/app/be.json.txt"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("idesuss-v") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (event.request.mode === "navigate") {
          return caches.match("/app/index.html");
        }

        throw new Error("Offline asset unavailable");
      })
  );
});
