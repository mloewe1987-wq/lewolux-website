// lewolux.de – liefert die statische Website aus ./public.
// Einzige Aufgabe des Workers: große Downloads (> 25 MB, Cloudflare-Grenze pro Datei)
// liegen in Teilen unter /downloads/teile/ und werden hier wieder zu einer Datei zusammengesetzt.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/downloads\/([^/]+\.exe)$/);
    if (m) {
      const man = await (await env.ASSETS.fetch(new URL("/downloads/teile/manifest.json", url))).json().catch(() => ({}));
      const f = man[decodeURIComponent(m[1])];
      if (f) {
        const headers = {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${m[1]}"`,
          "Content-Length": String(f.size),
          "Cache-Control": "public, max-age=86400",
          "X-Robots-Tag": "noindex",
        };
        if (req.method === "HEAD") return new Response(null, { headers });
        const { readable, writable } = new FixedLengthStream(f.size);
        (async () => {
          try {
            for (let i = 0; i < f.parts.length; i++) {
              const r = await env.ASSETS.fetch(new URL("/downloads/teile/" + f.parts[i], url));
              await r.body.pipeTo(writable, { preventClose: i < f.parts.length - 1 });
            }
          } catch (e) { try { await writable.abort(e); } catch (_) {} }
        })();
        return new Response(readable, { headers });
      }
    }
    return env.ASSETS.fetch(req);
  },
};
