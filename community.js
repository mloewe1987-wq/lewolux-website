// Lewolux Community – Konten (Login mit Google), Freunde, Chat, Favoriten, Spielzeit-Statistik.
// Gilt nur für den Erwachsenen-Bereich von lewolux.de. Der Kinderbereich (/kids/ und alle Kinderspiele) nutzt nichts davon.
//
// Aufbau: EIN Durable Object (SQLite) für alles ("global"). Für eine kleine Seite reicht das gut und hält alles einfach.
// WebSockets laufen über die Hibernation-API: offene Verbindungen kosten im Leerlauf nichts.
//
// Sicherheit:
//  - Sitzung = zufälliges Token im HttpOnly-Cookie (Secure, SameSite=Lax, Path=/api/c). Gespeichert wird nur der SHA-256-Hash.
//    Es wird kein Geheimschlüssel (Secret) gebraucht.
//  - Jede ändernde Anfrage braucht: POST + Header "X-Lwx: 1" + passenden Origin (CSRF-Schutz).
//  - Eingaben werden geprüft, Größen begrenzt, Raten pro Nutzer und pro IP begrenzt (IP nur im Arbeitsspeicher, nie gespeichert).
//  - Optionale Secrets: ADMIN_TOKEN (Newsletter-/Meldungs-Export). Fehlt es, sind die Admin-Endpunkte abgeschaltet.
//  - DEV_FAKE_LOGIN="1" erlaubt Test-Logins ohne Google ("dev:name"). NIE in der Produktion setzen.
import { DurableObject } from "cloudflare:workers";

const COOKIE = "lxs";
const SESSION_DAYS = 90;
const NL_TEXT_VERSION = "nl-2026-10-v1";
const NL_TEXT = "Ja, ich möchte den Lewolux-Newsletter mit Neuigkeiten zu Spielen per E-Mail erhalten. Abmeldung jederzeit in den Einstellungen.";
const MAX_BODY = 8192;
const MSG_MAX = 500, MSG_KEEP = 200;
const ONLINE_MS = 75e3;
const AVATARS = 24;
const NICK_DAYS = 30;
const INACTIVE_DAYS = 730;

// ---------------------------------------------------------------- Google-ID-Token prüfen (wie bei Ring Legends)
const CERTS = "https://www.googleapis.com/oauth2/v3/certs";
let keyCache = { at: 0, keys: null };
const b64urlDecode = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const parseJwtPart = s => JSON.parse(new TextDecoder().decode(b64urlDecode(s)));
async function googleKeys(now) {
  if (keyCache.keys && now - keyCache.at < 6 * 36e5) return keyCache.keys;
  const r = await fetch(CERTS);
  if (!r.ok) throw new Error("google_certs");
  keyCache = { at: now, keys: (await r.json()).keys };
  return keyCache.keys;
}
export async function verifyGoogleIdToken(token, audience, now) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || token.length > 4096) return { ok: false };
  let head, claims;
  try { head = parseJwtPart(parts[0]); claims = parseJwtPart(parts[1]); } catch { return { ok: false }; }
  if (head.alg !== "RS256") return { ok: false };
  const jwk = (await googleKeys(now)).find(k => k.kid === head.kid);
  if (!jwk) return { ok: false };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlDecode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!valid) return { ok: false };
  if (!["accounts.google.com", "https://accounts.google.com"].includes(claims.iss)) return { ok: false };
  if (claims.aud !== audience) return { ok: false };
  if (!(claims.exp * 1000 > now - 60e3)) return { ok: false, error: "expired" };
  if (!claims.sub) return { ok: false };
  return { ok: true, sub: String(claims.sub), email: claims.email_verified ? String(claims.email || "") : "" };
}

// ---------------------------------------------------------------- Namen & Wortfilter
const RESERVED_PART = ["admin", "lewolux", "moderator", "moderation", "support", "official", "offiziell", "sysop", "unbekannterspieler", "kundendienst", "helpdesk", "martinlowe", "martinloewe"];
const RESERVED_EXACT = ["mod", "mods", "team", "staff", "root", "owner", "system", "lux", "service", "server", "bot", "null", "undefined", "anonym", "anonymous", "unbekannt", "gast", "guest"];
const BAD = /(fick|fuck|fotze|nazi|hitler|nsdap|heil|hure|nutte|arschloch|wichs|wixx|schlampe|penis|vagina|pussy|porn|cock|dick|bitch|cunt|whore|slut|missgeburt|spast|neger|nigg|nigga|faggot|schwuchtel|kanake|judensau|vergewaltig|rape|retard|kinderschänd|pedo|paedo|titten|sperma)/;
const CHAT_BAD = /(fick\w*|fuck\w*|fotze\w*|hure\w*|nutte\w*|arschloch\w*|wichser\w*|schlampe\w*|missgeburt\w*|spast\w*|neger\w*|nigg\w*|faggot\w*|schwuchtel\w*|kanake\w*|judensau\w*|hitler\w*|cunt\w*|whore\w*|slut\w*|bitch\w*|retard\w*|vergewaltig\w*|kinderschänd\w*)/giu;
const normName = s => s.toLowerCase()
  .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
  .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/8/g, "b")
  .replace(/[_-]/g, "").replace(/(.)\1+/g, "$1");
export function checkNick(n) {
  if (typeof n !== "string") return "Bitte gib einen Namen ein.";
  n = n.trim();
  if (n.length < 3) return "Mindestens 3 Zeichen.";
  if (n.length > 20) return "Höchstens 20 Zeichen.";
  if (!/^[A-Za-z0-9ÄÖÜäöüß_-]+$/.test(n)) return "Nur Buchstaben, Ziffern, _ und - erlaubt.";
  if (!/[A-Za-zÄÖÜäöüß]/.test(n)) return "Mindestens ein Buchstabe, bitte.";
  const raw = n.toLowerCase().replace(/[_-]/g, ""), k = normName(n);
  if (RESERVED_PART.some(r => k.includes(r) || raw.includes(r))) return "Dieser Name ist reserviert.";
  if (RESERVED_EXACT.includes(k) || RESERVED_EXACT.includes(raw)) return "Dieser Name ist reserviert.";
  if (BAD.test(k) || BAD.test(raw)) return "Dieser Name ist nicht erlaubt.";
  return null;
}
export const cleanChat = s => s.replace(CHAT_BAD, m => m[0] + "*".repeat(Math.max(2, [...m].length - 1)));

// ---------------------------------------------------------------- Hilfen
const enc = new TextEncoder();
async function sha256(s) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map(b => b.toString(16).padStart(2, "0")).join(""); }
function randomToken() { const b = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function cookieOf(req, name) {
  const c = req.headers.get("cookie") || "";
  for (const part of c.split(";")) { const i = part.indexOf("="); if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim(); }
  return "";
}
const sessionCookie = (tok, url) => `${COOKIE}=${tok}; Path=/api/c; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
const clearCookie = () => `${COOKIE}=; Path=/api/c; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
const HDR = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function json(obj, status = 200, extra = {}) { return new Response(JSON.stringify(obj), { status, headers: { ...HDR, ...extra } }); }
const err = (status, error, msg) => json({ ok: false, error, msg }, status);
const int = v => (Number.isInteger(v) ? v : (typeof v === "string" && /^\d{1,12}$/.test(v) ? +v : NaN));
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(x, y);
}

// ---------------------------------------------------------------- Durable Object
export class Community extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.rl = new Map();
    ctx.blockConcurrencyWhile(async () => {
      this.migrate();
      if ((await ctx.storage.getAlarm()) == null) await ctx.storage.setAlarm(Date.now() + 3600e3);
    });
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong")); } catch (_) {}
  }

  migrate() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT, gsub TEXT UNIQUE NOT NULL, nick TEXT NOT NULL, nick_lc TEXT UNIQUE NOT NULL,
        avatar INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'online', public INTEGER NOT NULL DEFAULT 0,
        email TEXT, newsletter INTEGER NOT NULL DEFAULT 0, nl_at INTEGER, nl_ver TEXT, nl_state TEXT, nl_revoked_at INTEGER,
        nick_at INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, seen_at INTEGER NOT NULL DEFAULT 0,
        act_game TEXT, act_at INTEGER NOT NULL DEFAULT 0, hb_game TEXT, hb_at INTEGER NOT NULL DEFAULT 0, day TEXT, day_ms INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions(th TEXT PRIMARY KEY, uid INTEGER, psub TEXT, pmail TEXT, created INTEGER NOT NULL, expires INTEGER NOT NULL, seen INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid);
      CREATE TABLE IF NOT EXISTS friends(a INTEGER NOT NULL, b INTEGER NOT NULL, state TEXT NOT NULL, req INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(a,b));
      CREATE INDEX IF NOT EXISTS friends_b ON friends(b);
      CREATE TABLE IF NOT EXISTS blocks(blocker INTEGER NOT NULL, blocked INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(blocker,blocked));
      CREATE INDEX IF NOT EXISTS blocks_blocked ON blocks(blocked);
      CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, conv TEXT NOT NULL, sender INTEGER NOT NULL, rcpt INTEGER NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL, seen INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS messages_conv ON messages(conv, id);
      CREATE INDEX IF NOT EXISTS messages_rcpt ON messages(rcpt, seen);
      CREATE TABLE IF NOT EXISTS favorites(uid INTEGER NOT NULL, game TEXT NOT NULL, pos INTEGER NOT NULL, PRIMARY KEY(uid,game));
      CREATE TABLE IF NOT EXISTS plays(uid INTEGER NOT NULL, game TEXT NOT NULL, ms INTEGER NOT NULL DEFAULT 0, last_at INTEGER NOT NULL, PRIMARY KEY(uid,game));
      CREATE INDEX IF NOT EXISTS plays_recent ON plays(game, last_at);
      CREATE INDEX IF NOT EXISTS plays_top ON plays(game, ms);
      CREATE TABLE IF NOT EXISTS notifs(id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, kind TEXT NOT NULL, from_uid INTEGER, game TEXT, at INTEGER NOT NULL, expires INTEGER, seen INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS notifs_uid ON notifs(uid, seen);
      CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT, reporter INTEGER NOT NULL, reported INTEGER NOT NULL, msg_id INTEGER, body TEXT, reason TEXT, at INTEGER NOT NULL);
    `);
  }

  q(s, ...a) { return this.sql.exec(s, ...a).toArray(); }
  one(s, ...a) { return this.sql.exec(s, ...a).toArray()[0] || null; }
  run(s, ...a) { return this.sql.exec(s, ...a).rowsWritten; }

  // Einfache Ratenbegrenzung im Arbeitsspeicher (Zähler pro Zeitfenster). Wird nicht gespeichert.
  limit(key, max, windowMs) {
    const now = Date.now();
    let e = this.rl.get(key);
    if (!e || now > e.reset) { e = { n: 0, reset: now + windowMs }; this.rl.set(key, e); }
    e.n++;
    if (this.rl.size > 20000) for (const [k, v] of this.rl) if (now > v.reset) this.rl.delete(k);
    return e.n <= max;
  }

  games(req) {
    const raw = req.headers.get("x-lx-games");
    return raw ? new Set(raw.split(",").filter(Boolean)) : null;
  }

  // ------------------------------------------------------------ Sitzung
  async session(req) {
    const tok = cookieOf(req, COOKIE);
    if (!tok || tok.length > 100) return null;
    const th = await sha256(tok);
    const s = this.one("SELECT * FROM sessions WHERE th=?", th);
    const now = Date.now();
    if (!s || s.expires < now) { if (s) this.run("DELETE FROM sessions WHERE th=?", th); return null; }
    if (s.uid == null && now - s.created > 3600e3) { this.run("DELETE FROM sessions WHERE th=?", th); return null; }
    if (now - s.seen > 864e5) this.run("UPDATE sessions SET seen=?, expires=? WHERE th=?", now, now + SESSION_DAYS * 864e5, th);
    s.user = s.uid != null ? this.one("SELECT * FROM users WHERE id=?", s.uid) : null;
    if (s.uid != null && !s.user) { this.run("DELETE FROM sessions WHERE th=?", th); return null; }
    return s;
  }
  async newSession(req, fields) {
    const old = cookieOf(req, COOKIE);
    if (old && old.length <= 100) this.run("DELETE FROM sessions WHERE th=?", await sha256(old));
    const tok = randomToken(), now = Date.now();
    this.run("INSERT INTO sessions(th,uid,psub,pmail,created,expires,seen) VALUES(?,?,?,?,?,?,?)",
      await sha256(tok), fields.uid ?? null, fields.psub ?? null, fields.pmail ?? null, now, now + SESSION_DAYS * 864e5, now);
    if (fields.uid != null) {
      const many = this.q("SELECT th FROM sessions WHERE uid=? ORDER BY seen DESC", fields.uid);
      for (const s of many.slice(10)) this.run("DELETE FROM sessions WHERE th=?", s.th);
    }
    return tok;
  }

  // ------------------------------------------------------------ Darstellung
  meView(u) {
    const favs = this.q("SELECT game FROM favorites WHERE uid=? ORDER BY pos, game", u.id).map(r => r.game);
    return {
      id: u.id, nick: u.nick, avatar: u.avatar, status: u.status, public: !!u.public,
      newsletter: u.newsletter ? (u.nl_state || "pending") : "off", hasEmail: !!u.email,
      nickNext: u.nick_at ? u.nick_at + NICK_DAYS * 864e5 : 0, created: u.created, favs,
    };
  }
  counts(uid) {
    const unread = this.one("SELECT COUNT(*) n FROM messages WHERE rcpt=? AND seen=0", uid).n;
    const requests = this.one("SELECT COUNT(*) n FROM friends WHERE (a=? OR b=?) AND state='p' AND req<>?", uid, uid, uid).n;
    return { unread, requests };
  }
  online(u, now = Date.now()) {
    return this.ctx.getWebSockets("u" + u.id).some(s => s.readyState === 1) || now - u.seen_at < ONLINE_MS;
  }
  presence(u, now = Date.now()) {
    if (u.status === "invisible") return { on: false, st: "offline", game: null };
    const on = this.online(u, now);
    return { on, st: on ? u.status : "offline", game: on && now - u.act_at < ONLINE_MS ? u.act_game : null };
  }
  pub(u) { return { id: u.id, nick: u.nick, avatar: u.avatar }; }
  conv(a, b) { return a < b ? a + ":" + b : b + ":" + a; }
  pair(a, b) { return a < b ? [a, b] : [b, a]; }
  friendRow(a, b) { const [x, y] = this.pair(a, b); return this.one("SELECT * FROM friends WHERE a=? AND b=?", x, y); }
  isFriend(a, b) { const r = this.friendRow(a, b); return !!r && r.state === "f"; }
  blockedEither(a, b) { return !!this.one("SELECT 1 FROM blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)", a, b, b, a); }
  friendIds(uid) { return this.q("SELECT CASE WHEN a=? THEN b ELSE a END f FROM friends WHERE (a=? OR b=?) AND state='f'", uid, uid, uid).map(r => r.f); }

  // ------------------------------------------------------------ Live-Nachrichten
  push(uid, obj) {
    const s = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets("u" + uid)) { if (ws.readyState === 1) try { ws.send(s); } catch (_) {} }
  }
  broadcastPresence(uid) {
    const u = this.one("SELECT * FROM users WHERE id=?", uid);
    if (!u) return;
    const p = { t: "presence", id: uid, ...this.presence(u) };
    for (const f of this.friendIds(uid)) this.push(f, p);
  }
  notify(uid, kind, from, game = null, ttlMs = 0) {
    const now = Date.now();
    const id = this.one("INSERT INTO notifs(uid,kind,from_uid,game,at,expires) VALUES(?,?,?,?,?,?) RETURNING id", uid, kind, from, game, now, ttlMs ? now + ttlMs : null).id;
    const f = this.one("SELECT id,nick,avatar FROM users WHERE id=?", from);
    this.push(uid, { t: "notif", n: { id, kind, game, at: now, from: f ? this.pub(f) : null } });
    // höchstens 100 Benachrichtigungen pro Person aufheben
    this.run("DELETE FROM notifs WHERE uid=? AND id NOT IN (SELECT id FROM notifs WHERE uid=? ORDER BY id DESC LIMIT 100)", uid, uid);
    return id;
  }

  // ------------------------------------------------------------ HTTP
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/c/, "") || "/";
    const ip = req.headers.get("cf-connecting-ip") || "local";
    try {
      return await this.route(req, url, path, ip);
    } catch (e) {
      console.log("community error", path, String(e && e.message || e).slice(0, 200));
      return err(500, "server", "Da ist etwas schiefgelaufen. Bitte später noch einmal versuchen.");
    }
  }

  async route(req, url, path, ip) {
    {
      if (!this.limit("ip:" + ip, 600, 60e3)) return err(429, "rate", "Zu viele Anfragen. Bitte kurz warten.");
      if (path === "/ws") return this.ws(req, url);
      if (path.startsWith("/admin/")) return this.admin(req, path, ip, url);
      if (req.method === "GET") {
        if (path === "/stats") return this.stats(req, url);
        const s = await this.session(req);
        switch (path) {
          case "/me": return this.me(s);
          case "/sync": return this.sync(s);
          case "/friends": return s?.user ? this.friends(s.user) : err(401, "auth", "Bitte melde dich an.");
          case "/messages": return s?.user ? this.messages(s.user, url) : err(401, "auth", "Bitte melde dich an.");
          case "/plays": return s?.user ? json({ ok: true, plays: this.q("SELECT game, ms, last_at FROM plays WHERE uid=? ORDER BY ms DESC LIMIT 20", s.user.id), friends: this.friendIds(s.user.id).length }) : err(401, "auth", "Bitte melde dich an.");
          case "/export": return s?.user && req.headers.get("x-lwx") === "1" ? this.exportData(s.user) : err(401, "auth", "Bitte melde dich an.");
        }
        return err(404, "not_found");
      }
      if (req.method !== "POST") return err(405, "method");
      // CSRF-Schutz: eigener Header + gleiche Herkunft (zusätzlich zum SameSite-Cookie)
      const origin = req.headers.get("origin");
      if (req.headers.get("x-lwx") !== "1" || !origin || origin !== url.origin) return err(403, "csrf", "Anfrage abgelehnt.");
      const len = +(req.headers.get("content-length") || 0);
      if (len > MAX_BODY) return err(413, "too_large");
      const txt = await req.text();
      if (txt.length > MAX_BODY) return err(413, "too_large");
      let b = {};
      try { b = txt ? JSON.parse(txt) : {}; } catch { return err(400, "bad_json"); }
      if (!b || typeof b !== "object" || Array.isArray(b)) return err(400, "bad_json");
      if (path === "/login") return this.login(req, b, ip);
      if (path === "/nick") return this.nickCheck(req, b, ip);
      const s = await this.session(req);
      if (path === "/logout") return this.logout(s);
      if (path === "/onboard") return this.onboard(req, s, b);
      if (!s?.user) return err(401, "auth", "Bitte melde dich an.");
      const u = s.user, G = this.games(req);
      switch (path) {
        case "/profile": return this.profile(u, b);
        case "/newsletter": return this.newsletter(u, b);
        case "/beat": return this.beat(u, b, G);
        case "/fav": return this.fav(u, b, G);
        case "/fav/order": return this.favOrder(u, b);
        case "/friends/request": return this.friendRequest(u, b);
        case "/friends/respond": return this.friendRespond(u, b);
        case "/friends/remove": return this.friendRemove(u, b);
        case "/friends/block": return this.block(u, b);
        case "/friends/unblock": return this.unblock(u, b);
        case "/messages": return this.send(u, b);
        case "/messages/read": return this.markRead(u, b);
        case "/report": return this.report(u, b);
        case "/invite": return this.invite(u, b, G);
        case "/invite/answer": return this.inviteAnswer(u, b);
        case "/notifs/seen": return this.notifsSeen(u, b);
        case "/delete": return this.deleteAccount(u, b);
      }
      return err(404, "not_found");
    }
  }

  me(s) {
    const cfg = { gcid: this.env.GOOGLE_CLIENT_ID || "", dev: this.env.DEV_FAKE_LOGIN === "1" };
    if (!s) return json({ ok: true, me: null, cfg });
    if (!s.user) return json({ ok: true, me: null, pending: true, cfg, hasEmail: !!s.pmail });
    return json({ ok: true, me: this.meView(s.user), counts: this.counts(s.user.id), cfg });
  }

  sync(s) {
    if (!s?.user) return json({ ok: true, me: null });
    const u = s.user, now = Date.now();
    this.run("UPDATE users SET seen_at=? WHERE id=?", now, u.id);
    const notifs = this.q(`SELECT n.id,n.kind,n.game,n.at,u.id fid,u.nick,u.avatar FROM notifs n LEFT JOIN users u ON u.id=n.from_uid
      WHERE n.uid=? AND n.seen=0 AND (n.expires IS NULL OR n.expires>?) ORDER BY n.id DESC LIMIT 20`, u.id, now)
      .map(r => ({ id: r.id, kind: r.kind, game: r.game, at: r.at, from: r.fid ? { id: r.fid, nick: r.nick, avatar: r.avatar } : null }));
    return json({ ok: true, me: this.meView(u), counts: this.counts(u.id), notifs });
  }

  // ------------------------------------------------------------ Login & Onboarding
  async login(req, b, ip) {
    if (!this.limit("login:" + ip, 12, 60e3)) return err(429, "rate", "Zu viele Anmeldeversuche. Bitte kurz warten.");
    const cred = String(b.credential || "");
    let r;
    if (this.env.DEV_FAKE_LOGIN === "1" && cred.startsWith("dev:")) {
      const name = cred.slice(4);
      if (!/^[a-z0-9]{1,20}$/.test(name)) return err(400, "bad_token", "Ungültiger Test-Login.");
      r = { ok: true, sub: "dev-" + name, email: name + "@example.test" };
    } else {
      if (!this.env.GOOGLE_CLIENT_ID) return err(503, "config", "Die Anmeldung ist noch nicht eingerichtet (GOOGLE_CLIENT_ID fehlt).");
      try { r = await verifyGoogleIdToken(cred, this.env.GOOGLE_CLIENT_ID, Date.now()); }
      catch (_) { return err(503, "google", "Google ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen."); }
    }
    if (!r.ok) return err(401, "bad_token", "Die Anmeldung mit Google hat nicht geklappt. Bitte noch einmal versuchen.");
    const u = this.one("SELECT * FROM users WHERE gsub=?", r.sub);
    if (u) {
      const tok = await this.newSession(req, { uid: u.id });
      return json({ ok: true, me: this.meView(u), counts: this.counts(u.id) }, 200, { "Set-Cookie": sessionCookie(tok) });
    }
    const tok = await this.newSession(req, { psub: r.sub, pmail: r.email || null });
    return json({ ok: true, me: null, pending: true, hasEmail: !!r.email }, 200, { "Set-Cookie": sessionCookie(tok) });
  }

  nickFree(nick, exceptUid = 0) {
    const r = this.one("SELECT id FROM users WHERE nick_lc=?", nick.toLowerCase());
    return !r || r.id === exceptUid;
  }
  nickCheck(req, b, ip) {
    if (!this.limit("nick:" + ip, 60, 60e3)) return err(429, "rate", "Bitte kurz warten.");
    const n = String(b.nick || "").trim();
    const bad = checkNick(n);
    if (bad) return json({ ok: false, msg: bad });
    if (!this.nickFree(n, int(b.self) || 0)) return json({ ok: false, msg: "Dieser Name ist schon vergeben." });
    return json({ ok: true });
  }

  async onboard(req, s, b) {
    if (!s || s.uid != null || !s.psub) return err(400, "state", "Bitte melde dich zuerst mit Google an.");
    const nick = String(b.nick || "").trim(), bad = checkNick(nick);
    if (bad) return err(400, "nick", bad);
    const av = int(b.avatar);
    if (!(av >= 0 && av < AVATARS)) return err(400, "avatar", "Bitte wähle ein Profilbild.");
    if (!this.nickFree(nick)) return err(409, "nick_taken", "Dieser Name ist schon vergeben.");
    if (this.one("SELECT id FROM users WHERE gsub=?", s.psub)) return err(409, "exists", "Dieses Konto gibt es schon. Bitte neu anmelden.");
    const now = Date.now(), nl = b.newsletter === true && !!s.pmail;
    const id = this.one(`INSERT INTO users(gsub,nick,nick_lc,avatar,status,public,email,newsletter,nl_at,nl_ver,nl_state,created,seen_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
      s.psub, nick, nick.toLowerCase(), av, "online", b.public === true ? 1 : 0,
      nl ? s.pmail : null, nl ? 1 : 0, nl ? now : null, nl ? NL_TEXT_VERSION : null, nl ? "pending" : null, now, now).id;
    this.run("UPDATE sessions SET uid=?, psub=NULL, pmail=NULL WHERE th=?", id, s.th);
    const u = this.one("SELECT * FROM users WHERE id=?", id);
    return json({ ok: true, me: this.meView(u), counts: this.counts(id) });
  }

  logout(s) {
    if (s) {
      this.run("DELETE FROM sessions WHERE th=?", s.th);
      if (s.uid != null) {
        for (const ws of this.ctx.getWebSockets("u" + s.uid)) {
          const a = ws.deserializeAttachment() || {};
          if (a.th === s.th) try { ws.close(4001, "logout"); } catch (_) {}
        }
      }
    }
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  // ------------------------------------------------------------ Einstellungen
  profile(u, b) {
    const now = Date.now(), set = [], args = [];
    if (b.nick !== undefined && String(b.nick).trim() !== u.nick) {
      const nick = String(b.nick).trim(), bad = checkNick(nick);
      if (bad) return err(400, "nick", bad);
      if (u.nick_at && now < u.nick_at + NICK_DAYS * 864e5) {
        const d = new Date(u.nick_at + NICK_DAYS * 864e5);
        return err(400, "nick_wait", `Deinen Namen kannst du erst ab dem ${d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} wieder ändern.`);
      }
      if (!this.nickFree(nick, u.id)) return err(409, "nick_taken", "Dieser Name ist schon vergeben.");
      set.push("nick=?", "nick_lc=?", "nick_at=?"); args.push(nick, nick.toLowerCase(), now);
    }
    if (b.avatar !== undefined) {
      const av = int(b.avatar);
      if (!(av >= 0 && av < AVATARS)) return err(400, "avatar", "Ungültiges Profilbild.");
      set.push("avatar=?"); args.push(av);
    }
    let presence = false;
    if (b.status !== undefined) {
      if (!["online", "busy", "invisible"].includes(b.status)) return err(400, "status", "Ungültiger Status.");
      set.push("status=?"); args.push(b.status); presence = b.status !== u.status;
    }
    if (b.public !== undefined) { set.push("public=?"); args.push(b.public === true ? 1 : 0); }
    if (set.length) this.run(`UPDATE users SET ${set.join(",")} WHERE id=?`, ...args, u.id);
    const nu = this.one("SELECT * FROM users WHERE id=?", u.id);
    if (presence) this.broadcastPresence(u.id);
    if (nu.nick !== u.nick || nu.avatar !== u.avatar) for (const f of this.friendIds(u.id)) this.push(f, { t: "friends" });
    return json({ ok: true, me: this.meView(nu) });
  }

  async newsletter(u, b) {
    const now = Date.now();
    if (b.on === true) {
      let email = u.email;
      if (!email) {
        const cred = String(b.credential || "");
        let r = { ok: false };
        if (this.env.DEV_FAKE_LOGIN === "1" && cred.startsWith("dev:")) r = { ok: true, sub: "dev-" + cred.slice(4), email: cred.slice(4) + "@example.test" };
        else if (cred && this.env.GOOGLE_CLIENT_ID) r = await verifyGoogleIdToken(cred, this.env.GOOGLE_CLIENT_ID, now).catch(() => ({ ok: false }));
        if (!r.ok || r.sub !== u.gsub) return err(400, "need_google", "Bitte bestätige kurz mit Google, damit wir deine E-Mail-Adresse übernehmen können.");
        if (!r.email) return err(400, "no_email", "Google hat keine bestätigte E-Mail-Adresse übermittelt.");
        email = r.email;
      }
      this.run("UPDATE users SET email=?, newsletter=1, nl_at=?, nl_ver=?, nl_state='pending', nl_revoked_at=NULL WHERE id=?", email, now, NL_TEXT_VERSION, u.id);
    } else if (b.on === false) {
      this.run("UPDATE users SET email=NULL, newsletter=0, nl_at=NULL, nl_ver=NULL, nl_state=NULL, nl_revoked_at=? WHERE id=?", u.newsletter ? now : u.nl_revoked_at, u.id);
    } else return err(400, "bad");
    return json({ ok: true, me: this.meView(this.one("SELECT * FROM users WHERE id=?", u.id)) });
  }

  // ------------------------------------------------------------ Aktivität & Spielzeit
  // Der Browser meldet sich alle 30 s (solange ein Spiel offen und sichtbar ist bzw. ohne WebSocket).
  // Gutgeschrieben wird höchstens die echte Zeit seit dem letzten Signal (max. 30 s), höchstens 16 Std. pro Tag.
  beat(u, b, G) {
    if (!this.limit("beat:" + u.id, 12, 60e3)) return json({ ok: true, throttled: true });
    const now = Date.now();
    let game = typeof b.game === "string" ? b.game : null;
    if (game && (!G || !G.has(game))) game = null;
    const vis = b.vis !== false;
    const changed = (u.act_game || null) !== game || now - u.act_at > ONLINE_MS;
    let credit = 0;
    if (game && vis) {
      const elapsed = u.hb_game === game ? now - u.hb_at : Infinity;
      credit = elapsed <= 45e3 ? Math.min(elapsed, 30e3) : 0;
      const day = new Date(now + 2 * 3600e3).toISOString().slice(0, 10);
      const used = u.day === day ? u.day_ms : 0;
      credit = Math.max(0, Math.min(credit, 16 * 3600e3 - used));
      this.run("UPDATE users SET hb_game=?, hb_at=?, day=?, day_ms=? WHERE id=?", game, now, day, used + credit, u.id);
      this.run(`INSERT INTO plays(uid,game,ms,last_at) VALUES(?,?,?,?) ON CONFLICT(uid,game) DO UPDATE SET ms=ms+excluded.ms, last_at=excluded.last_at`, u.id, game, credit, now);
    } else if (u.hb_game) this.run("UPDATE users SET hb_game=NULL WHERE id=?", u.id);
    this.run("UPDATE users SET seen_at=?, act_game=?, act_at=? WHERE id=?", now, game, game ? now : 0, u.id);
    if (changed) this.broadcastPresence(u.id);
    return json({ ok: true, credited: Math.round(credit / 1000) });
  }

  stats(req, url) {
    const G = this.games(req), game = url.searchParams.get("game") || "";
    if (!G || !G.has(game)) return err(404, "game");
    const map = r => (r.public ? { nick: r.nick, avatar: r.avatar, ms: r.ms } : { anon: true, ms: r.ms });
    const recent = this.q("SELECT u.nick,u.avatar,u.public,p.ms FROM plays p JOIN users u ON u.id=p.uid WHERE p.game=? ORDER BY p.last_at DESC LIMIT 3", game).map(map);
    const top = this.q("SELECT u.nick,u.avatar,u.public,p.ms FROM plays p JOIN users u ON u.id=p.uid WHERE p.game=? AND p.ms>=60000 ORDER BY p.ms DESC LIMIT 3", game).map(map);
    return json({ ok: true, game, recent, top }, 200, { "Cache-Control": "public, max-age=15" });
  }

  // ------------------------------------------------------------ Favoriten
  fav(u, b, G) {
    const game = String(b.game || "");
    if (!G || !G.has(game)) return err(400, "game", "Unbekanntes Spiel.");
    if (b.on === true) {
      if (this.one("SELECT COUNT(*) n FROM favorites WHERE uid=?", u.id).n >= 60) return err(400, "max", "Maximal 60 Favoriten.");
      const pos = this.one("SELECT COALESCE(MAX(pos),-1)+1 p FROM favorites WHERE uid=?", u.id).p;
      this.run("INSERT OR IGNORE INTO favorites(uid,game,pos) VALUES(?,?,?)", u.id, game, pos);
    } else this.run("DELETE FROM favorites WHERE uid=? AND game=?", u.id, game);
    return json({ ok: true, favs: this.q("SELECT game FROM favorites WHERE uid=? ORDER BY pos, game", u.id).map(r => r.game) });
  }
  favOrder(u, b) {
    if (!Array.isArray(b.order) || b.order.length > 100) return err(400, "bad");
    const have = new Set(this.q("SELECT game FROM favorites WHERE uid=?", u.id).map(r => r.game));
    const seen = new Set(); let i = 0;
    for (const g of b.order) if (typeof g === "string" && have.has(g) && !seen.has(g)) { seen.add(g); this.run("UPDATE favorites SET pos=? WHERE uid=? AND game=?", i++, u.id, g); }
    for (const g of have) if (!seen.has(g)) this.run("UPDATE favorites SET pos=? WHERE uid=? AND game=?", i++, u.id, g);
    return json({ ok: true, favs: this.q("SELECT game FROM favorites WHERE uid=? ORDER BY pos, game", u.id).map(r => r.game) });
  }

  // ------------------------------------------------------------ Freunde
  friends(u) {
    const now = Date.now(), uid = u.id;
    const rows = this.q(`SELECT f.state, f.req, f.created, x.* FROM friends f JOIN users x ON x.id = CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE f.a=? OR f.b=?`, uid, uid, uid);
    const unread = new Map(this.q("SELECT sender, COUNT(*) n FROM messages WHERE rcpt=? AND seen=0 GROUP BY sender", uid).map(r => [r.sender, r.n]));
    const friends = [], incoming = [], outgoing = [];
    for (const r of rows) {
      if (r.state === "f") {
        const last = this.one("SELECT sender, body, at FROM messages WHERE conv=? ORDER BY id DESC LIMIT 1", this.conv(uid, r.id));
        friends.push({ ...this.pub(r), ...this.presence(r, now), unread: unread.get(r.id) || 0, last: last ? { mine: last.sender === uid, body: last.body.slice(0, 80), at: last.at } : null });
      } else if (r.req === uid) outgoing.push(this.pub(r));
      else incoming.push(this.pub(r));
    }
    const order = { online: 0, busy: 1, offline: 2 };
    friends.sort((a, b) => (a.game ? -1 : 0) - (b.game ? -1 : 0) || order[a.st] - order[b.st] || a.nick.localeCompare(b.nick, "de"));
    const blocked = this.q("SELECT x.id,x.nick,x.avatar FROM blocks b JOIN users x ON x.id=b.blocked WHERE b.blocker=? ORDER BY x.nick_lc", uid).map(r => this.pub(r));
    return json({ ok: true, friends, incoming, outgoing, blocked });
  }

  friendRequest(u, b) {
    if (!this.limit("freq:" + u.id, 20, 3600e3)) return err(429, "rate", "Du hast gerade sehr viele Anfragen verschickt. Bitte versuch es später noch einmal.");
    const nick = String(b.nick || "").trim();
    if (nick.length < 3 || nick.length > 20) return err(404, "not_found", "Diesen Spieler gibt es nicht.");
    const t = this.one("SELECT * FROM users WHERE nick_lc=?", nick.toLowerCase());
    if (!t) return err(404, "not_found", "Diesen Spieler gibt es nicht.");
    if (t.id === u.id) return err(400, "self", "Das bist du selbst. 🙂");
    if (this.one("SELECT 1 FROM blocks WHERE blocker=? AND blocked=?", u.id, t.id)) return err(400, "blocked", "Du hast diesen Spieler blockiert. Hebe die Blockierung zuerst auf.");
    // Wurde man selbst blockiert, sieht es für den Absender wie eine normale Anfrage aus (Schutz der blockierenden Person).
    if (this.one("SELECT 1 FROM blocks WHERE blocker=? AND blocked=?", t.id, u.id)) return json({ ok: true, state: "sent" });
    const row = this.friendRow(u.id, t.id);
    if (row?.state === "f") return err(400, "already", "Ihr seid schon befreundet.");
    if (row && row.req === u.id) return json({ ok: true, state: "sent" });
    const [a, c] = this.pair(u.id, t.id), now = Date.now();
    if (row && row.req === t.id) {
      this.run("UPDATE friends SET state='f' WHERE a=? AND b=?", a, c);
      this.notify(t.id, "facc", u.id);
      this.push(t.id, { t: "friends" }); this.push(u.id, { t: "friends" });
      return json({ ok: true, state: "friends" });
    }
    if (this.one("SELECT COUNT(*) n FROM friends WHERE a=? OR b=?", u.id, u.id).n >= 300) return err(400, "max", "Du hast die maximale Anzahl an Freunden und Anfragen erreicht.");
    this.run("INSERT INTO friends(a,b,state,req,created) VALUES(?,?,'p',?,?)", a, c, u.id, now);
    this.notify(t.id, "freq", u.id);
    this.push(t.id, { t: "friends" });
    return json({ ok: true, state: "sent" });
  }
  friendRespond(u, b) {
    const id = int(b.id), row = id > 0 ? this.friendRow(u.id, id) : null;
    if (!row || row.state !== "p" || row.req !== id) return err(404, "not_found", "Diese Anfrage gibt es nicht mehr.");
    const [a, c] = this.pair(u.id, id);
    if (b.accept === true) {
      this.run("UPDATE friends SET state='f' WHERE a=? AND b=?", a, c);
      this.notify(id, "facc", u.id);
      this.broadcastPresence(u.id); this.broadcastPresence(id);
    } else this.run("DELETE FROM friends WHERE a=? AND b=?", a, c);
    this.run("UPDATE notifs SET seen=1 WHERE uid=? AND kind='freq' AND from_uid=?", u.id, id);
    this.push(id, { t: "friends" }); this.push(u.id, { t: "friends" });
    return json({ ok: true });
  }
  friendRemove(u, b) {
    const id = int(b.id);
    if (!(id > 0)) return err(400, "bad");
    const [a, c] = this.pair(u.id, id);
    this.run("DELETE FROM friends WHERE a=? AND b=?", a, c);
    this.push(id, { t: "friends" }); this.push(u.id, { t: "friends" });
    return json({ ok: true });
  }
  block(u, b) {
    const id = int(b.id);
    if (!(id > 0) || id === u.id || !this.one("SELECT 1 FROM users WHERE id=?", id)) return err(400, "bad");
    const [a, c] = this.pair(u.id, id);
    this.run("INSERT OR IGNORE INTO blocks(blocker,blocked,created) VALUES(?,?,?)", u.id, id, Date.now());
    this.run("DELETE FROM friends WHERE a=? AND b=?", a, c);
    this.run("DELETE FROM notifs WHERE uid=? AND from_uid=?", u.id, id);
    this.push(id, { t: "friends" }); this.push(u.id, { t: "friends" });
    return json({ ok: true });
  }
  unblock(u, b) {
    const id = int(b.id);
    this.run("DELETE FROM blocks WHERE blocker=? AND blocked=?", u.id, id);
    return json({ ok: true });
  }

  // ------------------------------------------------------------ Chat
  messages(u, url) {
    const w = int(url.searchParams.get("with") || "");
    if (!(w > 0) || !this.isFriend(u.id, w)) return err(403, "not_friend", "Ihr seid nicht befreundet.");
    const before = int(url.searchParams.get("before") || "") || 0;
    const conv = this.conv(u.id, w);
    const rows = before > 0
      ? this.q("SELECT id,sender,body,at,seen FROM messages WHERE conv=? AND id<? ORDER BY id DESC LIMIT 50", conv, before)
      : this.q("SELECT id,sender,body,at,seen FROM messages WHERE conv=? ORDER BY id DESC LIMIT 50", conv);
    const n = this.run("UPDATE messages SET seen=1 WHERE conv=? AND rcpt=? AND seen=0", conv, u.id);
    if (n) this.push(w, { t: "read", id: u.id });
    return json({ ok: true, messages: rows.reverse().map(r => ({ id: r.id, mine: r.sender === u.id, body: r.body, at: r.at, seen: !!r.seen })), more: rows.length === 50 });
  }
  send(u, b) {
    const to = int(b.to);
    if (!(to > 0) || !this.isFriend(u.id, to) || this.blockedEither(u.id, to)) return err(403, "not_friend", "Nachrichten gehen nur an Freunde.");
    if (!this.limit("msg:" + u.id, 8, 10e3) || !this.limit("msgh:" + u.id, 300, 3600e3)) return err(429, "rate", "Nicht so schnell! Warte kurz, bevor du weiterschreibst.");
    let body = typeof b.body === "string" ? b.body : "";
    body = body.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (!body) return err(400, "empty", "Die Nachricht ist leer.");
    if ([...body].length > MSG_MAX) return err(400, "too_long", `Höchstens ${MSG_MAX} Zeichen.`);
    body = cleanChat(body);
    const now = Date.now(), conv = this.conv(u.id, to);
    const id = this.one("INSERT INTO messages(conv,sender,rcpt,body,at) VALUES(?,?,?,?,?) RETURNING id", conv, u.id, to, body, now).id;
    this.run("DELETE FROM messages WHERE conv=? AND id NOT IN (SELECT id FROM messages WHERE conv=? ORDER BY id DESC LIMIT ?)", conv, conv, MSG_KEEP);
    this.push(to, { t: "msg", from: this.pub(u), m: { id, mine: false, body, at: now, seen: false } });
    this.push(u.id, { t: "msg", to, m: { id, mine: true, body, at: now, seen: false } });
    return json({ ok: true, m: { id, mine: true, body, at: now, seen: false } });
  }
  markRead(u, b) {
    const w = int(b.with);
    if (!(w > 0)) return err(400, "bad");
    const n = this.run("UPDATE messages SET seen=1 WHERE conv=? AND rcpt=? AND seen=0", this.conv(u.id, w), u.id);
    if (n) this.push(w, { t: "read", id: u.id });
    return json({ ok: true });
  }
  report(u, b) {
    if (!this.limit("report:" + u.id, 10, 3600e3)) return err(429, "rate", "Du hast schon viele Meldungen geschickt. Danke! Bitte später wieder.");
    const mid = int(b.msg), reason = String(b.reason || "").slice(0, 200);
    let reported = int(b.id), body = null;
    if (mid > 0) {
      const m = this.one("SELECT * FROM messages WHERE id=? AND rcpt=?", mid, u.id);
      if (!m) return err(404, "not_found", "Diese Nachricht gibt es nicht mehr.");
      reported = m.sender; body = m.body;
    }
    if (!(reported > 0) || reported === u.id || !this.one("SELECT 1 FROM users WHERE id=?", reported)) return err(400, "bad");
    this.run("INSERT INTO reports(reporter,reported,msg_id,body,reason,at) VALUES(?,?,?,?,?,?)", u.id, reported, mid > 0 ? mid : null, body, reason, Date.now());
    return json({ ok: true });
  }

  // ------------------------------------------------------------ Einladungen ("Zusammen spielen", Vorbereitung für Mehrspieler)
  invite(u, b, G) {
    const to = int(b.to), game = String(b.game || "");
    if (!G || !G.has(game)) return err(400, "game", "Unbekanntes Spiel.");
    if (!(to > 0) || !this.isFriend(u.id, to) || this.blockedEither(u.id, to)) return err(403, "not_friend", "Einladungen gehen nur an Freunde.");
    if (!this.limit("inv:" + u.id, 10, 600e3) || !this.limit("inv:" + u.id + ":" + to, 3, 600e3)) return err(429, "rate", "Du hast schon eingeladen. Warte kurz auf eine Antwort.");
    this.notify(to, "inv", u.id, game, 15 * 60e3);
    return json({ ok: true });
  }
  inviteAnswer(u, b) {
    const id = int(b.id), n = id > 0 ? this.one("SELECT * FROM notifs WHERE id=? AND uid=? AND kind='inv'", id, u.id) : null;
    if (!n) return err(404, "not_found", "Diese Einladung gibt es nicht mehr.");
    this.run("UPDATE notifs SET seen=1 WHERE id=?", id);
    if (b.accept === true && n.from_uid && this.isFriend(u.id, n.from_uid) && (!n.expires || n.expires > Date.now())) this.notify(n.from_uid, "inv_ok", u.id, n.game, 15 * 60e3);
    return json({ ok: true, game: n.game });
  }
  notifsSeen(u, b) {
    if (b.all === true) this.run("UPDATE notifs SET seen=1 WHERE uid=?", u.id);
    else if (Array.isArray(b.ids)) for (const id of b.ids.slice(0, 50)) if (int(id) > 0) this.run("UPDATE notifs SET seen=1 WHERE id=? AND uid=?", int(id), u.id);
    return json({ ok: true });
  }

  // ------------------------------------------------------------ Datenexport & Löschen
  exportData(u) {
    const uid = u.id, nick = id => (this.one("SELECT nick FROM users WHERE id=?", id) || {}).nick || "(gelöscht)";
    const data = {
      hinweis: "Alle Daten, die Lewolux zu deinem Konto speichert (Export nach Art. 15/20 DSGVO).",
      exportiert: new Date().toISOString(),
      konto: {
        nickname: u.nick, profilbild: u.avatar, status: u.status, in_statistiken_sichtbar: !!u.public,
        google_kennung: u.gsub, erstellt: new Date(u.created).toISOString(), zuletzt_aktiv: u.seen_at ? new Date(u.seen_at).toISOString() : null,
        name_geaendert: u.nick_at ? new Date(u.nick_at).toISOString() : null,
        newsletter: u.newsletter ? { email: u.email, einwilligung: new Date(u.nl_at).toISOString(), text_version: u.nl_ver, text: NL_TEXT, status: u.nl_state === "confirmed" ? "bestätigt" : "Bestätigung ausstehend" } : null,
        newsletter_widerrufen: u.nl_revoked_at ? new Date(u.nl_revoked_at).toISOString() : null,
      },
      favoriten: this.q("SELECT game FROM favorites WHERE uid=? ORDER BY pos", uid).map(r => r.game),
      spielzeit: this.q("SELECT game, ms, last_at FROM plays WHERE uid=? ORDER BY ms DESC", uid).map(r => ({ spiel: r.game, sekunden: Math.round(r.ms / 1000), zuletzt: new Date(r.last_at).toISOString() })),
      freunde: this.q("SELECT * FROM friends WHERE a=? OR b=?", uid, uid).map(r => ({ name: nick(r.a === uid ? r.b : r.a), status: r.state === "f" ? "befreundet" : r.req === uid ? "Anfrage gesendet" : "Anfrage erhalten", seit: new Date(r.created).toISOString() })),
      blockiert: this.q("SELECT blocked FROM blocks WHERE blocker=?", uid).map(r => nick(r.blocked)),
      nachrichten: this.q("SELECT * FROM messages WHERE sender=? OR rcpt=? ORDER BY id", uid, uid).map(r => ({ von: r.sender === uid ? u.nick : nick(r.sender), an: r.rcpt === uid ? u.nick : nick(r.rcpt), text: r.body, zeit: new Date(r.at).toISOString() })),
      meldungen_von_dir: this.q("SELECT reported, body, reason, at FROM reports WHERE reporter=?", uid).map(r => ({ gemeldet: nick(r.reported), nachricht: r.body, grund: r.reason, zeit: new Date(r.at).toISOString() })),
      sitzungen: this.q("SELECT created, seen, expires FROM sessions WHERE uid=?", uid).map(r => ({ angemeldet: new Date(r.created).toISOString(), zuletzt: new Date(r.seen).toISOString(), laeuft_ab: new Date(r.expires).toISOString() })),
    };
    return new Response(JSON.stringify(data, null, 2), { headers: { ...HDR, "Content-Disposition": 'attachment; filename="lewolux-meine-daten.json"' } });
  }

  deleteUser(uid) {
    const friends = this.friendIds(uid);
    for (const s of ["DELETE FROM sessions WHERE uid=?", "DELETE FROM friends WHERE a=? OR b=?", "DELETE FROM blocks WHERE blocker=? OR blocked=?",
      "DELETE FROM messages WHERE sender=? OR rcpt=?", "DELETE FROM favorites WHERE uid=?", "DELETE FROM plays WHERE uid=?",
      "DELETE FROM notifs WHERE uid=? OR from_uid=?", "DELETE FROM reports WHERE reporter=? OR reported=?", "DELETE FROM users WHERE id=?"]) {
      const n = (s.match(/\?/g) || []).length;
      this.run(s, ...Array(n).fill(uid));
    }
    for (const ws of this.ctx.getWebSockets("u" + uid)) try { ws.close(4002, "deleted"); } catch (_) {}
    for (const f of friends) this.push(f, { t: "friends" });
  }
  deleteAccount(u, b) {
    if (String(b.confirm || "").trim().toLowerCase() !== u.nick.toLowerCase()) return err(400, "confirm", "Bitte gib zur Bestätigung deinen Namen genau ein.");
    this.deleteUser(u.id);
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  // ------------------------------------------------------------ Admin (nur mit Secret ADMIN_TOKEN)
  async admin(req, path, ip, url) {
    const tok = this.env.ADMIN_TOKEN;
    if (!tok) return err(404, "disabled", "Admin-Export ist abgeschaltet (Secret ADMIN_TOKEN fehlt).");
    if (!this.limit("admin:" + ip, 10, 60e3)) return err(429, "rate");
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ") || !(await safeEqual(auth.slice(7), tok))) return err(401, "auth");
    if (path === "/admin/delete-user" && req.method === "POST") {
      // Moderation: Konto per Spielername löschen (z. B. nach Meldungen). Body: {"nick":"Name"}
      const b = await req.json().catch(() => ({}));
      const u = this.one("SELECT id, nick FROM users WHERE nick_lc=?", String(b.nick || "").trim().toLowerCase());
      if (!u) return err(404, "not_found", "Spielername nicht gefunden.");
      this.deleteUser(u.id);
      return json({ ok: true, deleted: u.nick });
    }
    if (req.method !== "GET") return err(405, "method");
    if (path === "/admin/newsletter") {
      const rows = this.q("SELECT nick, email, nl_at, nl_ver, nl_state FROM users WHERE newsletter=1 AND email IS NOT NULL ORDER BY nl_at");
      if (url.searchParams.get("format") === "csv") {
        const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = "email;nickname;einwilligung;text_version;status\n" + rows.map(r => [r.email, r.nick, new Date(r.nl_at).toISOString(), r.nl_ver, r.nl_state].map(esc).join(";")).join("\n");
        return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="newsletter.csv"' } });
      }
      return json({ ok: true, text: NL_TEXT, count: rows.length, subscribers: rows.map(r => ({ email: r.email, nick: r.nick, consent_at: new Date(r.nl_at).toISOString(), text_version: r.nl_ver, status: r.nl_state })) });
    }
    if (path === "/admin/reports") {
      const rows = this.q(`SELECT r.id, r.at, r.body, r.reason, a.nick reporter, b.nick reported, b.id reported_id FROM reports r
        LEFT JOIN users a ON a.id=r.reporter LEFT JOIN users b ON b.id=r.reported ORDER BY r.id DESC LIMIT 200`);
      return json({ ok: true, reports: rows.map(r => ({ ...r, at: new Date(r.at).toISOString() })) });
    }
    return err(404, "not_found");
  }

  // ------------------------------------------------------------ WebSocket (Hibernation-API)
  async ws(req, url) {
    if (req.headers.get("upgrade") !== "websocket") return err(426, "upgrade");
    if (req.headers.get("origin") !== url.origin) return err(403, "origin");
    const s = await this.session(req);
    if (!s?.user) return err(401, "auth");
    const uid = s.user.id, tag = "u" + uid;
    const open = this.ctx.getWebSockets(tag).filter(w => w.readyState === 1);
    if (open.length >= 6) try { open[0].close(4003, "too_many"); } catch (_) {}
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [tag]);
    const G = this.games(req);
    server.serializeAttachment({ uid, th: s.th, games: G ? [...G] : [] });
    const now = Date.now();
    this.run("UPDATE users SET seen_at=? WHERE id=?", now, uid);
    server.send(JSON.stringify({ t: "hello", counts: this.counts(uid) }));
    if (open.length === 0 && s.user.status !== "invisible") this.broadcastPresence(uid);
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, msg) {
    if (typeof msg !== "string" || msg.length > 512) return;
    const a = ws.deserializeAttachment() || {};
    if (!a.uid) return;
    if (!this.limit("ws:" + a.uid, 60, 60e3)) return;
    let m; try { m = JSON.parse(msg); } catch { return; }
    if (m.t === "act") {
      const u = this.one("SELECT * FROM users WHERE id=?", a.uid);
      if (!u) { try { ws.close(4002, "deleted"); } catch (_) {} return; }
      const G = new Set(a.games || []);
      let game = typeof m.game === "string" ? m.game : null;
      if (game && !G.has(game)) game = null;
      const now = Date.now();
      this.run("UPDATE users SET seen_at=?, act_game=?, act_at=? WHERE id=?", now, game, game ? now : 0, a.uid);
      if ((u.act_game || null) !== game) this.broadcastPresence(a.uid);
    }
  }
  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye"); } catch (_) {}
    const a = ws.deserializeAttachment() || {};
    if (!a.uid) return;
    const rest = this.ctx.getWebSockets("u" + a.uid).filter(s => s !== ws && s.readyState === 1);
    if (!rest.length) {
      // Kurz offline markieren: seen_at zurücksetzen, damit die Freunde sofort "offline" sehen
      this.run("UPDATE users SET seen_at=?, act_game=NULL WHERE id=?", Date.now() - ONLINE_MS, a.uid);
      this.broadcastPresence(a.uid);
    }
  }
  async webSocketError(ws) { return this.webSocketClose(ws, 1006); }

  // ------------------------------------------------------------ Aufräumen (stündlich)
  async alarm() {
    const now = Date.now();
    this.run("DELETE FROM sessions WHERE expires<? OR (uid IS NULL AND created<?)", now, now - 3600e3);
    this.run("DELETE FROM notifs WHERE (expires IS NOT NULL AND expires<?) OR at<?", now - 864e5, now - 30 * 864e5);
    this.run("DELETE FROM reports WHERE at<?", now - 365 * 864e5);
    for (const u of this.q("SELECT id FROM users WHERE seen_at<? AND created<? LIMIT 200", now - INACTIVE_DAYS * 864e5, now - INACTIVE_DAYS * 864e5)) this.deleteUser(u.id);
    await this.ctx.storage.setAlarm(now + 3600e3);
  }
}
