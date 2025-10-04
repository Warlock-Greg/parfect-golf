const CACHE_NAME = "parfect-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/training.html",
  "/manifest.json",
  "/assets/favicon.ico",
  "/assets/logo-stylised.svg",
  "/assets/icon-192-light.png",
  "/assets/icon-512-light.png",
  "/assets/icon-192-dark.png",
  "/assets/icon-512-dark.png"
];

// Installation du SW
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activation
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

// Fetch
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
