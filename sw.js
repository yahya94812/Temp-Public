// Service worker for Voice Wheelchair Control.
// Goal: after the very first (online) visit, the app — including this
// HTML shell and the TFJS / Speech Commands libraries — must load with
// zero network access, e.g. when a phone is connected only to the
// wheelchair's own ESP32 WiFi hotspot and has no path to the internet
// or to GitHub Pages at all.

const CACHE_VERSION = "wheelchair-shell-v1";

// Everything required to boot the page and get voice control running
// without hitting the network again. Paths are relative so this works
// whether the site is served from the domain root or a subpath (like
// GitHub Pages' /Temp-Public/).
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js",
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands@0.5.4/dist/speech-commands.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Cache each URL individually so a single failure (e.g. a flaky
      // CDN fetch) doesn't abort caching the rest of the shell.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("Precache failed for", url, err);
          })
        )
      );
    })
  );
  // Activate this version immediately instead of waiting for old tabs
  // to close, so the offline-ready shell is available as soon as possible.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for everything in scope: try cache, fall back to network,
// and if that also fails and it was a navigation request, fall back to
// the cached index.html so the app shell still comes up offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((networkResponse) => {
          // Opportunistically cache same-origin and CDN GETs we hadn't
          // pre-listed, so the offline set grows to cover whatever the
          // page actually used.
          const isOk = networkResponse && networkResponse.status === 200;
          if (isOk) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("./index.html");
          }
          return undefined;
        });
    })
  );
});
