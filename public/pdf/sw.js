/* Lewolux PDF – Service Worker: Offline-Betrieb + Share-Target */
const VERSION = 'lpdf-v1.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = 'lpdf-runtime';
const SHARE_CACHE = 'lewolux-pdf-share';
const scope = self.registration.scope;
const u = (p) => new URL(p, scope).href;

const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'lib/pdfjs/pdf.min.js', 'lib/pdfjs/pdf.worker.min.js',
  'fonts/jakarta-400.woff2', 'fonts/jakarta-500.woff2', 'fonts/jakarta-600.woff2', 'fonts/jakarta-700.woff2', 'fonts/jakarta-800.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon-64.png', 'icons/lewolux-lion.webp',
].map(u);

// Standardschriften für PDFs ohne eingebettete Fonts – im Hintergrund vorladen
const EXTRA = [
  'FoxitDingbats.pfb', 'FoxitFixed.pfb', 'FoxitFixedBold.pfb', 'FoxitFixedBoldItalic.pfb', 'FoxitFixedItalic.pfb',
  'FoxitSerif.pfb', 'FoxitSerifBold.pfb', 'FoxitSerifBoldItalic.pfb', 'FoxitSerifItalic.pfb', 'FoxitSymbol.pfb',
  'LiberationSans-Bold.ttf', 'LiberationSans-BoldItalic.ttf', 'LiberationSans-Italic.ttf', 'LiberationSans-Regular.ttf',
].map((f) => u('lib/pdfjs/standard_fonts/' + f));

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(SHELL_CACHE);
    await c.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('lpdf-v') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Best effort, blockiert nichts
    const rc = await caches.open(RUNTIME_CACHE);
    for (const url of EXTRA) {
      if (!(await rc.match(url))) { try { const r = await fetch(url); if (r.ok) await rc.put(url, r); } catch {} }
    }
  })());
});

async function handleShare(request) {
  try {
    const form = await request.formData();
    const files = [...form.getAll('file'), ...form.getAll('files')].filter((f) => f && typeof f !== 'string');
    const file = files.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '')) || files[0];
    if (file) {
      const c = await caches.open(SHARE_CACHE);
      await c.put(u('__share__/file.pdf'), new Response(file, {
        headers: { 'Content-Type': 'application/pdf', 'X-Filename': encodeURIComponent(file.name || 'Geteilt.pdf') },
      }));
      return Response.redirect(u('./?share=1'), 303);
    }
  } catch (e) { /* fällt durch */ }
  return Response.redirect(u('./?share=error'), 303);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.href.split('?')[0] === u('share-target')) {
    event.respondWith(handleShare(req));
    return;
  }
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(scope)) return;

  // Navigation: App-Shell aus dem Cache (funktioniert offline, auch mit ?share=1)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const c = await caches.open(SHELL_CACHE);
      const hit = await c.match(u('./')) || await c.match(u('index.html'));
      if (hit) return hit;
      try { return await fetch(req); } catch { return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
    })());
    return;
  }

  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    // pdf.js-Ressourcen (CMaps/Schriften) für die Offline-Nutzung merken
    if (res.ok && url.pathname.includes('/lib/pdfjs/')) {
      const rc = await caches.open(RUNTIME_CACHE);
      rc.put(req, res.clone());
    }
    return res;
  })());
});
