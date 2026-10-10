// Lewolux Studio – Service Worker: macht die Seite installierbar und offline nutzbar.
// Seiten: erst Netz, sonst Zwischenspeicher. Bilder/Schriften/CSS: Zwischenspeicher zuerst. Spiele und Downloads werden nicht gespeichert.
const C = "lx-0d9e60a7";
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(["/", "/site.webmanifest", "/assets/img/icon-192.png", "/kids/", "/kids/kids.webmanifest"])).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || /^\/(downloads|games|api|admin)\//.test(u.pathname)) return;
  if (u.pathname.startsWith("/assets/")) { e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cl = res.clone(); caches.open(C).then(c => c.put(r, cl)); } return res; }))); return; }
  if (r.mode === "navigate") e.respondWith(fetch(r).then(res => { const cl = res.clone(); caches.open(C).then(c => c.put(r, cl)); return res; }).catch(() => caches.match(r).then(m => m || caches.match(u.pathname.startsWith("/kids/") ? "/kids/" : "/"))));
});
