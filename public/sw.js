/*
 * urpostcard service worker.
 *
 * Deliberately conservative. This app is almost entirely personal, signed-in
 * content, and a service worker that caches pages is a service worker that can
 * hand one person's postcards to whoever opens the app next on a shared
 * device. So:
 *
 *   - Build output under /_next/static is cached. It is content-hashed and
 *     immutable, and identical for everyone.
 *   - Navigations go to the network every time, and are never stored. If the
 *     network is gone, the offline page is shown instead.
 *   - Everything else — Supabase, map tiles, geocoding — is left alone.
 *
 * The result installs, opens standalone, survives a dropped connection, and
 * never serves anyone else's mail.
 */

const VERSION = "urpostcard-v1";
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !name.startsWith(VERSION))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build output: hashed filenames, safe to keep, same for everyone.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Pages. Network every time; the offline page only if there is no network.
  // The response itself is never cached — it is somebody's private post.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          return (
            cached ??
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
  }
});
