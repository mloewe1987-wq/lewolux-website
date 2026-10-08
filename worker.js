// lewolux.de – liefert die statische Website aus ./public.
// Zusätzlich: /api/stats – anonymer Besucherzähler (Durable Object, keine IPs, keine Cookies).
// Einzige Aufgabe des Workers: große Downloads (> 25 MB, Cloudflare-Grenze pro Datei)
// liegen in Teilen unter /downloads/teile/ und werden hier wieder zu einer Datei zusammengesetzt.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/stats") {
      if (req.method !== "POST" && req.method !== "GET") return new Response("", { status: 405 });
      const stub = env.STATS.get(env.STATS.idFromName("lewolux"));
      return stub.fetch(req);
    }
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

// Besucherzähler: zählt Besuche (einmal pro Tab) und wer in den letzten 70 Sekunden aktiv war.
export class Stats {
  constructor(state) { this.state = state; this.online = new Map(); }
  async fetch(req) {
    const now = Date.now();
    for (const [k, t] of this.online) if (now - t > 70000) this.online.delete(k);
    const day = new Date(now + 2 * 3600e3).toISOString().slice(0, 10);
    let s = (await this.state.storage.get("s")) || { total: 0, day, today: 0 };
    if (s.day !== day) { s.day = day; s.today = 0; }
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const sid = String(b.sid || "");
      if (/^[a-z0-9]{6,40}$/.test(sid)) {
        if (this.online.size < 50000) this.online.set(sid, now);
        if (b.first === true) { s.total++; s.today++; await this.state.storage.put("s", s); }
      }
    }
    return new Response(JSON.stringify({ online: Math.max(1, this.online.size), today: s.today, total: s.total }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
}
