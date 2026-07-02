// Zwicku Service-Worker: cacht nur unveränderliche Assets (Karten/Icons),
// alles andere kommt aus dem Netz -> keine veralteten App-Versionen.
const CACHE = "zwicku-assets-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const cacheable =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/cards/") ||
      url.pathname.startsWith("/icon-") ||
      url.pathname === "/apple-icon.png");
  if (!cacheable) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});
