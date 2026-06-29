const CACHE_NAME = "receipt-reader-v3";
const APP_SHELL = [
  "/",
  "/mobile",
  "/receipt-chat",
  "/products",
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg"
];

function isNextAsset(requestUrl) {
  return requestUrl.pathname.startsWith("/_next/");
}

function isStaticAsset(request) {
  return request.destination === "script" || request.destination === "style" || request.destination === "worker";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(APP_SHELL.map((entry) => cache.add(entry).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);

  // Always prefer the network for Next.js bundles so PWA does not keep serving stale app code.
  if (isNextAsset(requestUrl) || isStaticAsset(event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => undefined);
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match("/offline")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => undefined);
        return response;
      });
    })
  );
});
