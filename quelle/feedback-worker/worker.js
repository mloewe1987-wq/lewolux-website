/* Lewolux Studio – Umfrage & Feedback API
   Cloudflare Worker + D1-Datenbank (Binding-Name: DB), Secret: ADMIN_KEY
   Läuft unter https://api.lewolux.de/                                       */

const ORIGINS = ["https://lewolux.de", "https://www.lewolux.de"];
const GAMES = ["mandat", "sternenwurf", "idle-legenden", "wrestling-tcg", "kritzelheld", "kasse-oder-zettel", "ordnungsgilde"];
const KINDS = ["wunsch", "idee", "bug", "lob"];
const POLL = "naechstes-spiel";

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS votes (poll TEXT, voter TEXT, choice TEXT, created INTEGER, PRIMARY KEY (poll, voter))"),
    db.prepare("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT, kind TEXT, name TEXT, text TEXT, status TEXT DEFAULT 'pending', reply TEXT, voter TEXT, created INTEGER)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_c ON comments (status, game, created)"),
  ]);
  ready = true;
}

function cors(req) {
  const o = req.headers.get("Origin") || "";
  const allow = ORIGINS.includes(o) || o.startsWith("http://localhost") ? o : ORIGINS[0];
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
           "Access-Control-Allow-Headers": "Content-Type,Authorization", "Vary": "Origin" };
}
const json = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(req) } });

// Pseudonym statt IP: gesalzener Hash, die IP selbst wird nie gespeichert
async function voterId(req, env) {
  const ip = req.headers.get("CF-Connecting-IP") || "0";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + (env.ADMIN_KEY || "salt")));
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}
const clean = (s, max) => String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

async function counts(db) {
  const { results } = await db.prepare("SELECT choice, COUNT(*) n FROM votes WHERE poll=? GROUP BY choice").bind(POLL).all();
  const c = {}; let total = 0; for (const r of results) { c[r.choice] = r.n; total += r.n }
  return { counts: c, total };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      await setup(env.DB);

      if (path === "/" ) return json(req, { ok: true, service: "lewolux-feedback" });

      // ---------- Umfrage ----------
      if (path === "/poll" && req.method === "GET") {
        const me = await voterId(req, env);
        const mine = await env.DB.prepare("SELECT choice FROM votes WHERE poll=? AND voter=?").bind(POLL, me).first();
        return json(req, { ...(await counts(env.DB)), mine: mine ? mine.choice : null });
      }
      if (path === "/poll" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        if (!GAMES.includes(b.choice)) return json(req, { error: "Ungültige Auswahl" }, 400);
        const me = await voterId(req, env);
        await env.DB.prepare("INSERT INTO votes (poll, voter, choice, created) VALUES (?,?,?,?) ON CONFLICT(poll, voter) DO UPDATE SET choice=excluded.choice, created=excluded.created")
          .bind(POLL, me, b.choice, Date.now()).run();
        return json(req, { ...(await counts(env.DB)), mine: b.choice });
      }

      // ---------- Kommentare (öffentlich: nur freigegebene) ----------
      if (path === "/comments" && req.method === "GET") {
        const g = url.searchParams.get("game");
        const q = g && GAMES.includes(g)
          ? env.DB.prepare("SELECT id, game, kind, name, text, reply, created FROM comments WHERE status='approved' AND game=? ORDER BY created DESC LIMIT 30").bind(g)
          : env.DB.prepare("SELECT id, game, kind, name, text, reply, created FROM comments WHERE status='approved' ORDER BY created DESC LIMIT 30");
        return json(req, { comments: (await q.all()).results });
      }
      if (path === "/comments" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        if (b.website) return json(req, { ok: true });                     // Honeypot: Bots bekommen „ok“, es wird nichts gespeichert
        const text = clean(b.text, 1000), name = clean(b.name, 40) || "Anonym";
        const game = GAMES.includes(b.game) ? b.game : "allgemein", kind = KINDS.includes(b.kind) ? b.kind : "idee";
        if (text.length < 5) return json(req, { error: "Bitte schreib mindestens ein paar Worte." }, 400);
        const me = await voterId(req, env);
        const recent = await env.DB.prepare("SELECT COUNT(*) n FROM comments WHERE voter=? AND created>?").bind(me, Date.now() - 3600e3).first();
        if (recent.n >= 5) return json(req, { error: "Danke für so viel Feedback! Bitte probier es in einer Stunde noch einmal." }, 429);
        await env.DB.prepare("INSERT INTO comments (game, kind, name, text, voter, created) VALUES (?,?,?,?,?,?)").bind(game, kind, name, text, me, Date.now()).run();
        return json(req, { ok: true });
      }

      // ---------- Verwaltung (nur mit ADMIN_KEY) ----------
      if (path.startsWith("/admin")) {
        const key = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json(req, { error: "Falscher Schlüssel" }, 401);
        if (path === "/admin/comments" && req.method === "GET") {
          const st = ["pending", "approved"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "pending";
          const { results } = await env.DB.prepare("SELECT id, game, kind, name, text, reply, status, created FROM comments WHERE status=? ORDER BY created DESC LIMIT 200").bind(st).all();
          return json(req, { comments: results, poll: await counts(env.DB) });
        }
        const m = path.match(/^\/admin\/comments\/(\d+)$/);
        if (m && req.method === "POST") {
          const b = await req.json().catch(() => ({})), id = +m[1];
          if (b.action === "delete") await env.DB.prepare("DELETE FROM comments WHERE id=?").bind(id).run();
          else if (b.action === "approve") await env.DB.prepare("UPDATE comments SET status='approved', reply=? WHERE id=?").bind(clean(b.reply, 1000) || null, id).run();
          else if (b.action === "reply") await env.DB.prepare("UPDATE comments SET reply=? WHERE id=?").bind(clean(b.reply, 1000) || null, id).run();
          else return json(req, { error: "Unbekannte Aktion" }, 400);
          return json(req, { ok: true });
        }
      }
      return json(req, { error: "Nicht gefunden" }, 404);
    } catch (err) {
      return json(req, { error: "Serverfehler", detail: String(err && err.message || err) }, 500);
    }
  }
};
