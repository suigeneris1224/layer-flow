// LayerFlow service worker.
//
// Scope, per docs/offline-sync.md: offline is for recording, not browsing.
// Actual recording while offline is lib/offline/'s job (an IndexedDB queue),
// not this file's -- this only makes the app SHELL (the static JS/CSS bundle
// and PWA metadata) available with no connection, so the app can open at all
// and the queue's own UI can render. Every other request -- every page
// navigation, every RSC payload, every /api/* call -- is network-only here:
// caching a farmer's numbers and serving them back stale later is worse than
// an error, per the doc's explicit warning.
//
// Bump CACHE_VERSION whenever the shell-caching strategy itself changes; the
// old versioned cache is deleted on the next activate.
const CACHE_VERSION = "v1";
const SHELL_CACHE = `layerflow-shell-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("layerflow-shell-") && name !== SHELL_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

function isShellRequest(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Server Actions are always POST. Never intercept, cache, or retry them
  // here -- that is lib/offline/'s job exclusively, already built.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!isShellRequest(url)) {
    // Network-only, no cache read or write: never serve a stale page, RSC
    // payload, or API response.
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })()
  );
});
