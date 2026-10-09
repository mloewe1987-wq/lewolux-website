// Integrationstest für die Community-API (community.js) gegen einen lokalen Worker.
// Start (mit leerem Speicher, z. B. --persist-to in einen neuen Ordner):
//         wrangler dev --local --var DEV_FAKE_LOGIN:1 --var ADMIN_TOKEN:testadmin123
// Dann:   BASE=http://127.0.0.1:8787 WS_MODULE=/pfad/zu/node_modules/ws node test/community-test.mjs
// Läuft ca. 70 Sekunden (Spielzeit wird in echten 30-Sekunden-Schritten gezählt).
import { createRequire } from "node:module";
const BASE = process.env.BASE || "http://127.0.0.1:8787";
const ORIGIN = new URL(BASE).origin;
const WS = createRequire(import.meta.url)(process.env.WS_MODULE || "ws");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(cond, name, extra) { if (cond) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); } }

class Client {
  constructor(name) { this.name = name; this.cookie = ""; this.events = []; }
  async req(path, body, { method, headers = {}, raw = false } = {}) {
    const m = method || (body !== undefined ? "POST" : "GET");
    const h = { Origin: ORIGIN, "X-Lwx": "1", ...headers };
    if (this.cookie) h.Cookie = this.cookie;
    if (body !== undefined) h["Content-Type"] = "application/json";
    const r = await fetch(BASE + "/api/c" + path, { method: m, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = r.headers.get("set-cookie");
    if (sc) { const v = sc.split(";")[0]; this.cookie = /=$/.test(v) ? "" : v; this.lastSetCookie = sc; }
    if (raw) return r;
    const j = await r.json().catch(() => ({}));
    j.status = r.status;
    return j;
  }
  ws() {
    return new Promise((res, rej) => {
      const w = new WS(BASE.replace(/^http/, "ws") + "/api/c/ws", { headers: { Origin: ORIGIN, Cookie: this.cookie } });
      w.on("message", d => { const s = d.toString(); if (s !== "pong") this.events.push(JSON.parse(s)); });
      w.on("open", () => { this.sock = w; res(w); });
      w.on("unexpected-response", (_q, r) => rej(new Error("ws status " + r.statusCode)));
      w.on("error", rej);
    });
  }
  async waitFor(pred, ms = 3000) { const t = Date.now(); while (Date.now() - t < ms) { const e = this.events.find(pred); if (e) { this.events.splice(this.events.indexOf(e), 1); return e; } await sleep(50); } return null; }
}

async function signup(c, sub, nick, extra = {}) {
  const l = await c.req("/login", { credential: "dev:" + sub });
  const o = await c.req("/onboard", { nick, avatar: 3, public: false, newsletter: false, ...extra });
  return { l, o };
}

const run = Date.now().toString(36);
console.log("Community-Test gegen", BASE);

console.log("\n1. Schutz & Login");
const anon = new Client("anon");
{
  const r = await fetch(BASE + "/api/c/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: "{}" });
  ok(r.status === 403, "POST ohne X-Lwx-Header wird abgelehnt (CSRF)");
  const r2 = await fetch(BASE + "/api/c/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Lwx": "1", Origin: "https://evil.example" }, body: "{}" });
  ok(r2.status === 403, "POST mit fremdem Origin wird abgelehnt");
  const g = await anon.req("/login", { credential: "kein.echtes.token" });
  ok(g.status === 401, "Ungültiges Google-Token wird abgelehnt", g);
  const r3 = await fetch(BASE + "/api/c/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Lwx": "1", Origin: ORIGIN }, body: "x".repeat(9000) });
  ok(r3.status === 413, "Zu große Anfrage wird abgelehnt");
  await r3.text().catch(() => {}); await sleep(300);
  const me = await anon.req("/me");
  ok(me.ok && me.me === null && me.cfg.dev === true, "/me ohne Sitzung");
}

const A = new Client("anna"), B = new Client("ben"), C = new Client("cara");
let again;
console.log("\n2. Onboarding & Namensregeln");
{
  const l = await A.req("/login", { credential: "dev:anna" + run });
  ok(l.ok && l.pending && /HttpOnly/.test(A.lastSetCookie) && /Secure/.test(A.lastSetCookie) && /SameSite=Lax/.test(A.lastSetCookie) && /Path=\/api\/c/.test(A.lastSetCookie), "Login legt Sitzung an (HttpOnly, Secure, SameSite=Lax, Path=/api/c)", A.lastSetCookie);
  for (const bad of ["Admin1", "L3wolux_fan", "Moderator", "ab", "x".repeat(21), "hi there", "Unbekannter_Spieler", "fuck123"]) {
    const r = await A.req("/onboard", { nick: bad, avatar: 1 });
    ok(r.status === 400, `Name „${bad}“ abgelehnt: ${r.msg}`);
  }
  ok((await A.req("/onboard", { nick: "Anna" + run, avatar: 99 })).status === 400, "Ungültiges Profilbild abgelehnt");
  const n = await A.req("/nick", { nick: "Anna" + run });
  ok(n.ok, "Namensprüfung: frei");
  const o = await A.req("/onboard", { nick: "Anna" + run, avatar: 5, public: false, newsletter: true });
  ok(o.ok && o.me.nick === "Anna" + run && o.me.public === false && o.me.newsletter === "pending", "Konto erstellt (Statistik privat, Newsletter ausstehend)", o);
  await B.req("/login", { credential: "dev:ben" + run });
  const dup = await B.req("/onboard", { nick: ("anna" + run).toUpperCase(), avatar: 2 });
  ok(dup.status === 409, "Name ohne Rücksicht auf Groß-/Kleinschreibung eindeutig");
  const ob = await B.req("/onboard", { nick: "Ben" + run, avatar: 11, public: true });
  ok(ob.ok && ob.me.newsletter === "off", "Zweites Konto erstellt (ohne Newsletter)");
  await signup(C, "cara" + run, "Cara" + run, { public: true });
  again = new Client("anna2");
  const l2 = await again.req("/login", { credential: "dev:anna" + run });
  ok(l2.ok && l2.me && l2.me.nick === "Anna" + run, "Erneuter Login findet bestehendes Konto");
}

console.log("\n3. Freunde & Live-Benachrichtigungen");
await A.ws(); await B.ws();
{
  ok(!!(await A.waitFor(e => e.t === "hello")), "WebSocket verbunden (Cookie-Auth)");
  await B.waitFor(e => e.t === "hello");
  const bad = await new Promise(res => { const w = new WS(BASE.replace(/^http/, "ws") + "/api/c/ws", { headers: { Origin: "https://evil.example", Cookie: A.cookie } }); w.on("unexpected-response", (_q, r) => res(r.statusCode)); w.on("open", () => res(101)); w.on("error", () => res(0)); });
  ok(bad === 403, "WebSocket mit fremdem Origin abgelehnt", bad);
  const nf = await A.req("/friends/request", { nick: "gibtsnicht" + run });
  ok(nf.status === 404, "Anfrage an unbekannten Namen");
  const r = await A.req("/friends/request", { nick: ("ben" + run).toUpperCase() });
  ok(r.ok && r.state === "sent", "Anfrage gesendet");
  const ev = await B.waitFor(e => e.t === "notif" && e.n.kind === "freq");
  ok(ev && ev.n.from.nick === "Anna" + run, "Ben bekommt Live-Benachrichtigung");
  const fl = await B.req("/friends");
  ok(fl.incoming.length === 1 && fl.incoming[0].nick === "Anna" + run, "Ben sieht eingehende Anfrage");
  const me = await B.req("/me");
  ok(me.counts.requests === 1, "Zähler: 1 Anfrage");
  const acc = await B.req("/friends/respond", { id: fl.incoming[0].id, accept: true });
  ok(acc.ok, "Ben nimmt an");
  ok(!!(await A.waitFor(e => e.t === "notif" && e.n.kind === "facc")), "Anna wird über Annahme informiert");
  const fa = await A.req("/friends");
  ok(fa.friends.length === 1 && fa.friends[0].on === true && fa.friends[0].st === "online", "Anna sieht Ben online", fa.friends);
  // Cara -> Anna, Anna lehnt ab
  await C.req("/friends/request", { nick: "Anna" + run });
  const fa2 = await A.req("/friends");
  await A.req("/friends/respond", { id: fa2.incoming[0].id, accept: false });
  ok((await A.req("/friends")).incoming.length === 0, "Anfrage abgelehnt");
}

console.log("\n4. Status & „spielt gerade“");
{
  A.sock.send(JSON.stringify({ t: "act", game: "mandat" }));
  const p = await B.waitFor(e => e.t === "presence" && e.game === "mandat");
  ok(p && p.on && p.id, "Ben sieht live: Anna spielt Mandat");
  A.sock.send(JSON.stringify({ t: "act", game: "pandi" }));
  const p2 = await B.waitFor(e => e.t === "presence");
  ok(p2 && p2.game === null, "Kinderspiel wird nie als Aktivität angezeigt", p2);
  await A.req("/profile", { status: "busy" });
  const p3 = await B.waitFor(e => e.t === "presence" && e.st === "busy");
  ok(!!p3, "Status „beschäftigt“ live");
  await A.req("/profile", { status: "invisible" });
  const p4 = await B.waitFor(e => e.t === "presence" && e.on === false);
  ok(!!p4, "„Unsichtbar“ erscheint offline");
  await A.req("/profile", { status: "online" });
  await B.waitFor(e => e.t === "presence" && e.on === true);
  ok((await A.req("/profile", { status: "weg" })).status === 400, "Ungültiger Status abgelehnt");
}

console.log("\n5. Chat");
{
  const s = await A.req("/messages", { to: (await A.req("/friends")).friends[0].id, body: "Hallo Ben! Du Arschloch 😄" });
  ok(s.ok && s.m.body.includes("A*") && !/arschloch/i.test(s.m.body), "Nachricht gesendet, Wortfilter maskiert", s.m);
  const live = await B.waitFor(e => e.t === "msg");
  ok(live && live.from.nick === "Anna" + run && live.m.body === s.m.body, "Ben bekommt Nachricht live");
  const benId = (await A.req("/friends")).friends[0].id, annaId = (await B.req("/friends")).friends[0].id;
  ok((await A.req("/messages", { to: benId, body: "x".repeat(501) })).status === 400, "Mehr als 500 Zeichen abgelehnt");
  ok((await A.req("/messages", { to: benId, body: "   " })).status === 400, "Leere Nachricht abgelehnt");
  ok((await A.req("/messages", { to: (await C.req("/me")).me.id, body: "hi" })).status === 403, "Nur an Freunde");
  // Ben geht offline
  B.sock.close(); await sleep(400);
  const off = await A.waitFor(e => e.t === "presence" && e.id === benId && e.on === false);
  ok(!!off, "Anna sieht Ben offline, sobald seine Verbindung zu ist");
  await A.req("/messages", { to: benId, body: "Bist du da?" });
  const bm = await B.req("/me");
  ok(bm.counts.unread === 2, "Offline-Zustellung: 2 ungelesene Nachrichten", bm.counts);
  const hist = await B.req("/messages?with=" + annaId);
  ok(hist.ok && hist.messages.length === 2 && hist.messages[1].body === "Bist du da?", "Ben lädt den Verlauf");
  ok((await B.req("/me")).counts.unread === 0, "Danach gelesen");
  // Rate-Limit
  let limited = false;
  for (let i = 0; i < 10; i++) { const r = await A.req("/messages", { to: benId, body: "spam " + i }); if (r.status === 429) { limited = true; break; } }
  ok(limited, "Ratenbegrenzung greift");
  const rep = await B.req("/report", { msg: hist.messages[0].id });
  ok(rep.ok, "Nachricht melden");
  await B.ws(); await B.waitFor(e => e.t === "hello");
  ok(!!(await A.waitFor(e => e.t === "presence" && e.id === benId && e.on === true)), "Ben wieder online (Reconnect)");
}

console.log("\n6. Blockieren");
{
  const benId = (await A.req("/friends")).friends[0].id, annaId = (await B.req("/friends")).friends[0].id;
  await B.req("/friends/block", { id: annaId });
  ok((await A.req("/friends")).friends.length === 0, "Freundschaft durch Blockieren beendet");
  ok((await A.req("/messages", { to: benId, body: "hallo?" })).status === 403, "Blockierte Person kann nicht schreiben");
  const rq = await A.req("/friends/request", { nick: "Ben" + run });
  ok(rq.ok && (await B.req("/friends")).incoming.length === 0, "Anfrage einer blockierten Person kommt nicht an");
  ok((await B.req("/friends")).blocked.length === 1, "Ben sieht Blockliste");
  await B.req("/friends/unblock", { id: annaId });
  await A.req("/friends/request", { nick: "Ben" + run });
  const inc = (await B.req("/friends")).incoming;
  await B.req("/friends/respond", { id: inc[0].id, accept: true });
  ok((await A.req("/friends")).friends.length === 1, "Nach Freigabe wieder befreundet");
}

console.log("\n7. Favoriten");
{
  for (const g of ["mandat", "sternenwurf", "nervbert"]) await A.req("/fav", { game: g, on: true });
  ok((await A.req("/fav", { game: "pandi", on: true })).status === 400, "Kinderspiel kann kein Favorit werden");
  ok((await A.req("/fav", { game: "gibtsnicht", on: true })).status === 400, "Unbekanntes Spiel abgelehnt");
  const o = await A.req("/fav/order", { order: ["nervbert", "mandat", "sternenwurf"] });
  ok(JSON.stringify(o.favs) === '["nervbert","mandat","sternenwurf"]', "Reihenfolge gespeichert", o.favs);
  await A.req("/fav", { game: "mandat", on: false });
  ok(JSON.stringify((await A.req("/me")).me.favs) === '["nervbert","sternenwurf"]', "Entfernen funktioniert, Reihenfolge bleibt");
}

console.log("\n8. Einladung „Zusammen spielen“");
{
  const benId = (await A.req("/friends")).friends[0].id;
  ok((await A.req("/invite", { to: benId, game: "kritzelheld" })).status === 400, "Keine Einladung zu Kinderspielen");
  const r = await A.req("/invite", { to: benId, game: "sternenwurf" });
  ok(r.ok, "Einladung gesendet");
  const ev = await B.waitFor(e => e.t === "notif" && e.n.kind === "inv");
  ok(ev && ev.n.game === "sternenwurf", "Ben bekommt Einladung live");
  const an = await B.req("/invite/answer", { id: ev.n.id, accept: true });
  ok(an.ok && an.game === "sternenwurf", "Ben nimmt an");
  ok(!!(await A.waitFor(e => e.t === "notif" && e.n.kind === "inv_ok")), "Anna erfährt es");
}

console.log("\n9. Spielzeit & Statistik (dauert ~65 s)");
{
  ok((await A.req("/beat", { game: "pandi", vis: true })).credited === 0, "Kinderspiel wird nicht gezählt");
  const beatAll = () => Promise.all([A.req("/beat", { game: "mandat", vis: true }), B.req("/beat", { game: "mandat", vis: true })]);
  await beatAll();
  let s = await anon.req("/stats?game=mandat");
  ok(s.recent.length === 2, "Zuletzt gespielt: beide sofort sichtbar");
  ok(s.recent.some(x => x.anon) && s.recent.some(x => x.nick === "Ben" + run), "Anna (privat) erscheint als Unbekannter Spieler, Ben mit Namen", s.recent);
  ok(!JSON.stringify(s).includes("Anna" + run), "Name von Anna taucht nirgends auf");
  const spam = await A.req("/beat", { game: "mandat", vis: true });
  ok(spam.credited <= 1, "Schnelle Wiederholung bringt keine Extrazeit", spam);
  await sleep(30500); const r1 = await beatAll();
  ok(r1[0].credited >= 29 && r1[0].credited <= 30, "Nach 30 s: höchstens 30 s gutgeschrieben", r1[0]);
  await sleep(30500); await beatAll();
  s = await anon.req("/stats?game=mandat");
  ok(s.top.length === 2 && s.top[0].ms >= 59000 && s.top[0].ms <= 62000, "Meiste Spielzeit: beide mit ~1 Min", s.top);
  await A.req("/beat", { game: "mandat", vis: false });
  await sleep(1000);
  const hid = await A.req("/beat", { game: "mandat", vis: true });
  ok(hid.credited === 0, "Unsichtbarer Tab zählt nicht", hid);
  await A.req("/profile", { public: true });
  s = await anon.req("/stats?game=mandat");
  ok(s.recent.some(x => x.nick === "Anna" + run) && !s.recent.some(x => x.anon), "Privatsphäre an: Anna erscheint mit Namen");
  ok((await anon.req("/stats?game=pandi")).status === 404, "Keine Statistik für Kinderspiele");
}

console.log("\n10. Einstellungen, Newsletter, Export, Admin");
{
  const n1 = await B.req("/profile", { nick: "Benni" + run });
  ok(n1.ok && n1.me.nick === "Benni" + run, "Name geändert");
  const n2 = await B.req("/profile", { nick: "Benjamin" + run });
  ok(n2.status === 400 && n2.error === "nick_wait", "Zweite Änderung innerhalb 30 Tagen abgelehnt", n2);
  const nb = await B.req("/newsletter", { on: true });
  ok(nb.status === 400 && nb.error === "need_google", "Newsletter ohne gespeicherte Mail braucht Google-Bestätigung");
  const nb2 = await B.req("/newsletter", { on: true, credential: "dev:ben" + run });
  ok(nb2.ok && nb2.me.newsletter === "pending", "Newsletter nach Google-Bestätigung: ausstehend");
  const nb3 = await B.req("/newsletter", { on: true, credential: "dev:cara" + run });
  ok(nb3.ok, "(bereits angemeldet)");
  const adm0 = await fetch(BASE + "/api/c/admin/newsletter");
  ok(adm0.status === 401, "Admin-Export ohne Token gesperrt");
  const adm = await (await fetch(BASE + "/api/c/admin/newsletter", { headers: { Authorization: "Bearer testadmin123" } })).json();
  ok(adm.ok && adm.subscribers.some(s => s.email === "anna" + run + "@example.test" && s.status === "pending" && s.text_version), "Admin-Export mit Token: Einwilligung + Textversion", adm.subscribers);
  const csv = await (await fetch(BASE + "/api/c/admin/newsletter?format=csv", { headers: { Authorization: "Bearer testadmin123" } })).text();
  ok(csv.startsWith("email;nickname;einwilligung"), "CSV-Export");
  const reps = await (await fetch(BASE + "/api/c/admin/reports", { headers: { Authorization: "Bearer testadmin123" } })).json();
  ok(reps.ok && reps.reports.length >= 1, "Meldungen abrufbar");
  const D = new Client("dora"); await signup(D, "dora" + run, "Dora" + run);
  const delNo = await fetch(BASE + "/api/c/admin/delete-user", { method: "POST", headers: { Authorization: "Bearer falsch" }, body: JSON.stringify({ nick: "Dora" + run }) });
  ok(delNo.status === 401, "Admin-Löschen mit falschem Token abgelehnt");
  const del = await (await fetch(BASE + "/api/c/admin/delete-user", { method: "POST", headers: { Authorization: "Bearer testadmin123" }, body: JSON.stringify({ nick: "dora" + run }) })).json();
  ok(del.ok && (await D.req("/me")).me === null, "Admin kann ein Konto per Spielername löschen");
  await B.req("/newsletter", { on: false });
  const adm2 = await (await fetch(BASE + "/api/c/admin/newsletter", { headers: { Authorization: "Bearer testadmin123" } })).json();
  ok(!adm2.subscribers.some(s => s.email.startsWith("ben")), "Abmeldung löscht E-Mail aus der Liste");
  const exNo = await A.req("/export", undefined, { headers: { "X-Lwx": "" } });
  ok(exNo.status === 401, "Export nur mit eigenem Header");
  const ex = await A.req("/export");
  ok(ex.konto && ex.konto.nickname === "Anna" + run && ex.nachrichten.length >= 3 && ex.favoriten.length === 2 && ex.spielzeit.length >= 1, "Datenexport vollständig");
}

console.log("\n11. Konto löschen");
{
  const benId = (await A.req("/friends")).friends[0].id;
  ok((await A.req("/delete", { confirm: "falsch" })).status === 400, "Löschen braucht Namensbestätigung");
  const closed = new Promise(res => A.sock.on("close", code => res(code)));
  const d = await A.req("/delete", { confirm: ("anna" + run) });
  ok(d.ok, "Konto gelöscht");
  ok((await closed) === 4002, "Offene Verbindung wurde getrennt");
  ok(A.cookie === "", "Cookie gelöscht");
  ok((await again.req("/me")).me === null, "Auch andere Sitzungen sind ungültig");
  ok((await B.req("/friends")).friends.length === 0, "Ben hat Anna nicht mehr in der Liste");
  ok((await B.req("/messages?with=" + benId)).status === 403, "Chat weg");
  const s = await anon.req("/stats?game=mandat");
  ok(s.recent.length === 1 && s.top.length === 1, "Statistik-Einträge entfernt", s);
  const adm = await (await fetch(BASE + "/api/c/admin/newsletter", { headers: { Authorization: "Bearer testadmin123" } })).json();
  ok(!adm.subscribers.some(x => x.email.startsWith("anna" + run)), "Newsletter-Eintrag gelöscht");
  const relog = new Client("relog");
  const r = await relog.req("/login", { credential: "dev:anna" + run });
  ok(r.pending === true, "Neuer Login beginnt wieder beim Onboarding");
}

B.sock.close();
console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
