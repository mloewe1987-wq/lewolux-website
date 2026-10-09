// lewolux.de – liefert die statische Website aus ./public.
// Zusätzlich: /api/stats – anonymer Besucherzähler (Durable Object, keine IPs, keine Cookies).
// /api/c/* – Community (Konten, Freunde, Chat, Favoriten, Spielzeit), siehe community.js und COMMUNITY-README.md.
// Einzige Aufgabe des Workers: große Downloads (> 25 MB, Cloudflare-Grenze pro Datei)
// liegen in Teilen unter /downloads/teile/ und werden hier wieder zu einer Datei zusammengesetzt.
export { Community } from "./community.js";

// Liste der Spiele, die bei der Community mitmachen (ohne Kinderspiele). Erzeugt build.py nach public/assets/community-games.json.
let gamesCache = { at: 0, ids: "" };
async function communityGames(env, url) {
  const now = Date.now();
  if (gamesCache.ids && now - gamesCache.at < 300e3) return gamesCache.ids;
  try {
    const r = await env.ASSETS.fetch(new URL("/assets/community-games.json", url));
    const j = r.ok ? await r.json() : null;
    const ids = Object.keys((j && j.games) || {}).filter(id => /^[a-z0-9-]{1,40}$/.test(id) && !(j.kids || []).includes(id));
    gamesCache = { at: now, ids: ids.join(",") };
  } catch (_) { gamesCache = { at: now - 240e3, ids: gamesCache.ids }; }
  return gamesCache.ids;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/c/")) {
      if (!env.COMMUNITY) return new Response('{"ok":false,"error":"disabled"}', { status: 503, headers: { "Content-Type": "application/json" } });
      const headers = new Headers(req.headers);
      headers.set("x-lx-games", await communityGames(env, url));
      return env.COMMUNITY.get(env.COMMUNITY.idFromName("global")).fetch(new Request(req, { headers }));
    }
    if (url.pathname === "/api/lions") {
      if (req.method !== "POST" && req.method !== "GET") return new Response("", { status: 405 });
      return env.STATS.get(env.STATS.idFromName("lions")).fetch(req);
    }
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

// Löwenfang: pro Spieler ein Zähler (zufällige ID im Browser), Rangliste der besten 3 mit selbst gewähltem Namen. (einmal pro Tab) und wer in den letzten 70 Sekunden aktiv war.
export class Stats {
  constructor(state) { this.state = state; this.online = new Map(); }
  async fetch(req) {
    if (new URL(req.url).pathname === "/api/lions") return this.lions(req);
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
  async lions(req) {
    const BAD = /(fick|fuck|nazi|hitler|hure|nutte|arsch|wichs|schlampe|penis|vagina|sex|porn|cock|dick|bitch|missgeburt|spast|neger|nigg|heil)/i;
    let top = (await this.state.storage.get("top")) || [];
    let pid = "", mine = 0, error = null;
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      pid = String(b.pid || "");
      if (/^[a-z0-9]{6,40}$/.test(pid)) {
        const key = "p:" + pid, now = Date.now();
        const p = (await this.state.storage.get(key)) || { n: "", c: 0, t: 0 };
        if (b.catch && now - p.t > 2500) { p.c++; p.t = now; }
        if (typeof b.name === "string") {
          const n = b.name.replace(/[^\p{L}\p{N} _.\-!]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);
          if (n.length >= 2 && !BAD.test(n.replace(/[^a-zäöüß]/gi, ""))) p.n = n; else if (b.name) error = "name";
        }
        await this.state.storage.put(key, p); mine = p.c;
        if (p.n && p.c > 0) {
          top = top.filter(x => x.pid !== pid); top.push({ pid, name: p.n, count: p.c });
          top.sort((a, b) => b.count - a.count); top = top.slice(0, 10);
          await this.state.storage.put("top", top);
        }
      }
    }
    const out = top.slice(0, 3).map(x => ({ name: x.name, count: x.count, me: x.pid === pid }));
    return new Response(JSON.stringify({ top: out, mine, error }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
}
