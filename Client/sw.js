const V = "v20260703_04";
const STATIC = [
  "/driver-app/",
  "/driver-app/styles.css?v=20260703_2",
  "/driver-app/app.js?v=20260703_02",
  "/driver-app/js/api.js?v=20260703_01",
  "/driver-app/js/dom.js?v=20260703_01",
  "/driver-app/js/auth.js?v=20260703_01",
  "/driver-app/js/carSelector.js?v=20260703_01",
  "/driver-app/js/admin/locations.js?v=20260703_01",
  "/driver-app/Roboto-Medium.woff2?v=20260703_02",
  "/driver-app/assets/logo.webp?v=20260703",
  "/driver-app/assets/car-illustration.webp?v=20260703",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(V).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Пропускаем cross-origin запросы (шрифты CDN, Google Fonts и т.д.)
  if (url.origin !== self.location.origin) return;
  // Пропускаем API-запросы
  if (url.pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(V).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
