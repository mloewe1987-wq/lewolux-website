/* Fußball-Boss – Spiellogik (ohne Grafik). Läuft im Browser und in Node (für Balance-Tests). */
(function (root) {
"use strict";
const R = {
  rnd: Math.random,
  int(a, b) { return a + Math.floor(R.rnd() * (b - a + 1)); },
  pick(a) { return a[Math.floor(R.rnd() * a.length)]; },
  gauss() { let u = 0, v = 0; while (!u) u = R.rnd(); while (!v) v = R.rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
};

/* ---------- Grunddaten ---------- */
const LEAGUES = ["Bezirksliga", "Regionalliga", "Profiliga"];           // 0 = unten, 2 = oben
const LEAGUE_REP = [[38, 52], [52, 66], [66, 82]];                       // Stärke-Bereich der Vereine
// 24 Vereine, Wappen-Nummer = Bild crest_<n>
const CLUBS = [
  ["FC Löwenstadt", "Löwenstadt"], ["SV Adlerhorst", "Adlerhorst"], ["TSV Bärental", "Bärental"], ["SC Wolfsheim", "Wolfsheim"],
  ["VfB Haibucht", "Haibucht"], ["FC Stierhausen", "Stierhausen"], ["SV Fuchsau", "Fuchsau"], ["TuS Falkenhain", "Falkenhain"],
  ["Drachenfels 07", "Drachenfels"], ["SC Eichenau", "Eichenau"], ["FC Ankerhafen", "Ankerhafen"], ["Blitz Elektra", "Elektra"],
  ["FC Tigerau", "Tigerau"], ["SV Rossberg", "Rossberg"], ["TSV Hirschwald", "Hirschwald"], ["Eulenburg 1910", "Eulenburg"],
  ["SC Krokobucht", "Krokobucht"], ["FC Pantheron", "Pantheron"], ["SV Rabenstein", "Rabenstein"], ["Sternfeld United", "Sternfeld"],
  ["FC Königshof", "Königshof"], ["SV Leuchtenhafen", "Leuchtenhafen"], ["Wellenstrand 04", "Wellenstrand"], ["TSV Bergdorf", "Bergdorf"]
];
const FIRST = ["Lukas","Jonas","Leon","Finn","Paul","Ben","Elias","Noah","Luis","Felix","Max","Tim","Jan","Erik","Moritz","Tom","Niklas","David","Samuel","Milan","Emil","Anton","Oskar","Matteo","Leo","Julian","Marco","Sven","Kai","Ole","Malte","Hannes","Karim","Yusuf","Mehmet","Luca","Diego","Mateo","Andrej","Ivan","Pedro","Kofi","Amadou","Liam","Mats","Jannik","Fabian","Dominik","Rafael","Bruno","Timo","Henrik","Aaron","Joel","Adrian","Nico","Enzo","Sami","Theo","Vincent"];
const LAST = ["Müller","Schmidt","Becker","Wagner","Hoffmann","Schulz","Koch","Richter","Klein","Wolf","Neumann","Schwarz","Krüger","Braun","Zimmermann","Hartmann","Lange","Werner","Krause","Lehmann","Köhler","Maier","Brandt","Vogel","Sommer","Berger","Fuchs","Jäger","Kaya","Yilmaz","Silva","Rossi","Novak","Petrović","Hansen","Jensen","Diallo","Mensah","Costa","Haas","Roth","Engel","Pohl","Seidel","Winter","Frank","Kraft","Stein","Böhm","Arndt","Lindner","Kuhn","Peters","Otto","Albrecht","Ziegler","Sauer","Kessler","Graf","Busch"];
const POS = ["TW", "AB", "MF", "ST"];
const POS_NAME = { TW: "Torwart", AB: "Abwehr", MF: "Mittelfeld", ST: "Sturm" };
// Formationen: Plätze von unten (eigenes Tor) nach oben; x/y in % (y=100 eigenes Tor)
const FORMATIONS = {
  "4-4-2":   [["TW",50,92],["AB",14,74],["AB",38,77],["AB",62,77],["AB",86,74],["MF",14,50],["MF",38,53],["MF",62,53],["MF",86,50],["ST",38,24],["ST",62,24]],
  "4-3-3":   [["TW",50,92],["AB",14,74],["AB",38,77],["AB",62,77],["AB",86,74],["MF",28,52],["MF",50,56],["MF",72,52],["ST",18,26],["ST",50,21],["ST",82,26]],
  "3-5-2":   [["TW",50,92],["AB",26,76],["AB",50,78],["AB",74,76],["MF",10,50],["MF",32,54],["MF",50,46],["MF",68,54],["MF",90,50],["ST",38,23],["ST",62,23]],
  "5-3-2":   [["TW",50,92],["AB",10,70],["AB",30,76],["AB",50,78],["AB",70,76],["AB",90,70],["MF",28,52],["MF",50,55],["MF",72,52],["ST",38,25],["ST",62,25]],
  "4-2-3-1": [["TW",50,92],["AB",14,74],["AB",38,77],["AB",62,77],["AB",86,74],["MF",36,60],["MF",64,60],["MF",18,40],["MF",50,38],["MF",82,40],["ST",50,20]]
};
// Wie gut spielt jemand auf einer fremden Position?
const FIT = { TW: { TW: 1, AB: .35, MF: .3, ST: .3 }, AB: { TW: .3, AB: 1, MF: .82, ST: .65 }, MF: { TW: .3, AB: .82, MF: 1, ST: .85 }, ST: { TW: .3, AB: .6, MF: .82, ST: 1 } };
// Stadion
const STADIUM = {
  stand: { name: "Tribüne", levels: [2000, 5000, 12000, 25000, 45000], cost: [0, 300000, 1500000, 6000000, 18000000] },
  light: { name: "Flutlicht", cost: 250000 }, heat: { name: "Rasenheizung", cost: 400000 }, shop: { name: "Fanshop", cost: 300000 }
};
const TICKET = [9, 18, 35];
const SPONSOR_BASE = [180000, 700000, 3200000];
const WIN_BONUS = [12000, 45000, 180000];
const CAL = ["L","L","C","L","L","L","C","L","L","L","C","L","L","L","C","L","L","L","C"]; // 14 Liga + 5 Pokal
const CUP_NAMES = ["1. Runde", "Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"];

/* ---------- Hilfen ---------- */
function value(p) { // Marktwert in €
  const af = p.age < 22 ? 1.35 : p.age < 30 ? 1 : p.age < 33 ? .65 : .35;
  return Math.round(18000 * Math.pow(1.085, p.str - 30) * af / 1000) * 1000;
}
function wage(p) { return Math.round(value(p) * .0028 / 10) * 10; } // pro Woche
function stars(str) { return Math.max(.5, Math.min(5, Math.round((str - 25) / 13 * 2) / 2)); }
function money(n) {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(".", ",") + " Mio €";
  if (a >= 1e3) return s + Math.round(a / 1e3) + " Tsd €";
  return s + Math.round(a) + " €";
}

/* ---------- Neues Spiel ---------- */
let NEXT = 1;
function makePlayer(pos, base, age) {
  const a = age || R.int(18, 34);
  const str = Math.max(20, Math.min(95, Math.round(base + R.gauss() * 5.5)));
  const pot = a < 24 ? Math.min(97, str + R.int(4, 20)) : str + R.int(0, 3);
  return { id: NEXT++, fn: R.pick(FIRST), ln: R.pick(LAST), age: a, pos, str, pot, form: 0, fit: 100, face: R.int(0, 47), team: null, inj: 0, sus: 0, yel: 0, goals: 0, apps: 0, sg: 0, sa: 0, num: 0 };
}
function newGame(myIdx) {
  NEXT = 1;
  const G = { v: 1, season: 1, step: 0, me: myIdx, money: 500000, players: {}, teams: [], market: [], formation: "4-4-2", tactic: 1, lineup: [], training: "mix",
    stadium: { stand: 0, light: 0, heat: 0, shop: 0 }, sponsor: null, sponsorOffers: [], history: [], trophies: [], inbox: [], tut: 0, cup: null, results: [], fin: [] };
  // Ligen: Vereine 0–7 unten, 8–15 Mitte, 16–23 oben (gemischt)
  const order = R.shuffle([...Array(24).keys()]);
  CLUBS.forEach((c, i) => {
    const lg = Math.floor(order.indexOf(i) / 8);
    const [a, b] = LEAGUE_REP[lg]; const rep = R.int(a, b);
    G.teams.push({ id: i, name: c[0], short: c[1], crest: i, league: lg, rep, budget: 0, squad: [] });
  });
  // eigener Verein startet unten in der Bezirksliga, eher schwach
  const me = G.teams[myIdx];
  if (me.league !== 0) { const other = G.teams.find(t => t.league === 0); other.league = me.league; me.league = 0; other.rep = me.rep; }
  me.rep = 46;
  G.teams.forEach(t => {
    const plan = [["TW", 2], ["AB", 6], ["MF", 6], ["ST", 4]];
    plan.forEach(([pos, n]) => { for (let k = 0; k < n; k++) addTo(G, makePlayer(pos, t.rep + (k < (pos === "TW" ? 1 : n - 2) ? 2 : -6)), t.id); });
    numberSquad(G, t);
  });
  refillMarket(G, 40);
  G.lineup = bestXI(G, G.me, G.formation);
  newSeasonSetup(G);
  return G;
}
function addTo(G, p, tid) { p.team = tid; G.players[p.id] = p; if (tid != null) G.teams[tid].squad.push(p.id); }
function removeFrom(G, p) { if (p.team != null) { const t = G.teams[p.team]; t.squad = t.squad.filter(i => i !== p.id); } p.team = null; }
function numberSquad(G, t) {
  const used = new Set(); const ps = t.squad.map(i => G.players[i]);
  ps.forEach(p => { if (p.num && !used.has(p.num)) used.add(p.num); else p.num = 0; });
  const pref = { TW: [1, 12, 22, 30], AB: [2, 3, 4, 5, 15, 16, 24, 26], MF: [6, 8, 10, 14, 18, 20, 21, 23], ST: [7, 9, 11, 17, 19, 27, 29] };
  ps.forEach(p => { if (p.num) return; let n = pref[p.pos].find(x => !used.has(x)); if (!n) { n = 31; while (used.has(n)) n++; } p.num = n; used.add(n); });
}
function refillMarket(G, n) {
  const lg = G.teams[G.me].league;
  while (G.market.length < n) {
    const pos = R.pick(["TW", "AB", "AB", "MF", "MF", "MF", "ST", "ST"]);
    const tier = R.rnd();
    const base = tier < .5 ? LEAGUE_REP[lg][0] + 4 : tier < .85 ? LEAGUE_REP[Math.min(2, lg + 1)][0] + 2 : LEAGUE_REP[Math.min(2, lg + 1)][1];
    const p = makePlayer(pos, base); G.players[p.id] = p; G.market.push(p.id);
  }
}

/* ---------- Aufstellung ---------- */
function eff(p, slotPos) { // effektive Stärke eines Spielers auf einem Platz
  const f = FIT[p.pos][slotPos];
  return p.str * f * (.82 + .18 * p.fit / 100) * (1 + p.form * .025);
}
function available(p) { return !p.inj && !p.sus; }
function bestXI(G, tid, formation) {
  const slots = FORMATIONS[formation]; const pool = G.teams[tid].squad.map(i => G.players[i]).filter(available);
  const xi = new Array(slots.length).fill(null); const used = new Set();
  // erst passende Positionen, stärkste zuerst; dann Lücken mit bester Ersatzlösung
  for (const pass of [1, 0]) {
    const order = slots.map((s, i) => i).sort((a, b) => (slots[a][0] === "TW" ? -1 : 0) - (slots[b][0] === "TW" ? -1 : 0));
    for (const i of order) {
      if (xi[i]) continue;
      let best = null, bv = -1;
      for (const p of pool) { if (used.has(p.id)) continue; if (pass && p.pos !== slots[i][0]) continue; const v = eff(p, slots[i][0]); if (v > bv) { bv = v; best = p; } }
      if (best) { xi[i] = best.id; used.add(best.id); }
    }
  }
  return xi;
}
function teamPower(G, tid, xi, formation, tactic, home) {
  const slots = FORMATIONS[formation]; let d = [], m = [], a = [], k = 30;
  xi.forEach((id, i) => { const p = id && G.players[id]; const pos = slots[i][0]; const v = p ? eff(p, pos) : 15;
    if (pos === "TW") k = v; else if (pos === "AB") d.push(v); else if (pos === "MF") m.push(v); else a.push(v); });
  const avg = x => x.length ? x.reduce((s, v) => s + v, 0) / x.length : 20;
  // Anzahl je Reihe zählt ein bisschen mit (mehr Stürmer = mehr Druck)
  let def = avg(d) * (1 + (d.length - 4) * .045), mid = avg(m) * (1 + (m.length - 4) * .045), att = avg(a) * (1 + (a.length - 2) * .05);
  if (tactic === 2) { att *= 1.08; mid *= 1.02; def *= .93; } else if (tactic === 0) { att *= .92; def *= 1.08; }
  const h = home ? 1.03 + (home === 2 ? .02 : 0) : 1;
  return { def: def * h, mid: mid * h, att: att * h, keep: k * h };
}

/* ---------- Spiel-Simulation (Minute für Minute) ---------- */
function newMatch(G, hid, aid, comp, opts) {
  const lineupOf = tid => tid === G.me ? G.lineup.slice() : bestXI(G, tid, aiFormation(G, tid));
  const M = { h: hid, a: aid, comp, min: 0, gh: 0, ga: 0, ev: [], xi: [lineupOf(hid), lineupOf(aid)], form: [hid === G.me ? G.formation : aiFormation(G, hid), aid === G.me ? G.formation : aiFormation(G, aid)],
    tac: [hid === G.me ? G.tactic : 1, aid === G.me ? G.tactic : 1], subs: [0, 0], subbed: [[], []], played: [new Set(), new Set()], poss: 0, ball: 50, red: [0, 0], ko: !!(opts && opts.ko), done: false, pens: null, scorers: [] };
  M.xi.forEach((xi, s) => xi.forEach(id => id && M.played[s].add(id)));
  return M;
}
function aiFormation(G, tid) { const f = ["4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "5-3-2"]; return f[tid % f.length]; }
function power(G, M, s) {
  const tid = s ? M.a : M.h; const home = s ? 0 : (M.comp === "C" && M.cupNeutral ? 0 : (G.me === M.h && G.stadium.light ? 2 : 1));
  const P = teamPower(G, tid, M.xi[s], M.form[s], M.tac[s], home);
  const red = M.red[s]; if (red) { P.def *= 1 - .07 * red; P.mid *= 1 - .07 * red; P.att *= 1 - .05 * red; }
  return P;
}
function pickScorer(G, M, s) {
  const slots = FORMATIONS[M.form[s]]; const w = { TW: 0, AB: .12, MF: .35, ST: 1 }; let tot = 0; const c = [];
  M.xi[s].forEach((id, i) => { if (!id) return; const p = G.players[id]; const x = w[slots[i][0]] * (.5 + p.str / 100); tot += x; c.push([id, x]); });
  let r = R.rnd() * tot; for (const [id, x] of c) { r -= x; if (r <= 0) return id; } return c.length ? c[c.length - 1][0] : null;
}
// ein Spielminute; gibt Ereignisse dieser Minute zurück
function step(G, M) {
  if (M.done) return [];
  M.min++; const out = [];
  const P = [power(G, M, 0), power(G, M, 1)];
  // Ballbesitz
  const ph = Math.pow(P[0].mid, 2.2) / (Math.pow(P[0].mid, 2.2) + Math.pow(P[1].mid, 2.2));
  const s = R.rnd() < ph ? 0 : 1; const o = 1 - s; M.poss = s;
  if (R.rnd() < .2) {
    const pShot = Math.min(.9, .55 * Math.pow(P[s].att / P[o].def, 1.7));
    if (R.rnd() < pShot) {
      const shooter = pickScorer(G, M, s); const sp = shooter ? G.players[shooter] : null;
      const pGoal = Math.min(.7, .25 * Math.pow((sp ? sp.str : 40) / Math.max(20, P[o].keep), 1.3));
      if (R.rnd() < pGoal) {
        if (s) M.ga++; else M.gh++;
        if (sp) { sp.goals++; sp.sg++; M.scorers.push([s, shooter, M.min]); }
        out.push({ t: "goal", s, p: shooter, min: M.min });
      } else out.push({ t: R.rnd() < .5 ? "save" : "miss", s, p: shooter, min: M.min });
    } else if (R.rnd() < .25) out.push({ t: "chance", s, min: M.min });
  }
  // Karten und Verletzungen
  for (const side of [0, 1]) {
    if (R.rnd() < .0045) { const id = R.pick(M.xi[side].filter(Boolean)); if (id) { const p = G.players[id]; p.yel++; out.push({ t: "yellow", s: side, p: id, min: M.min }); if (p.yel >= 5) { p.sus = 1; p.yel = 0; } } }
    if (R.rnd() < .00035) { const xs = M.xi[side].map((id, i) => [id, i]).filter(([id, i]) => id && i > 0); if (xs.length) { const [id, i] = R.pick(xs); G.players[id].sus = 2; M.xi[side][i] = null; M.red[side]++; out.push({ t: "red", s: side, p: id, min: M.min }); } }
    const injP = .0016 * (G.stadium.heat && (side ? M.a : M.h) === G.me ? .6 : 1);
    if (R.rnd() < injP) { const xs = M.xi[side].map((id, i) => [id, i]).filter(([id]) => id); const [id, i] = R.pick(xs); const p = G.players[id]; p.inj = R.int(1, 4); out.push({ t: "inj", s: side, p: id, slot: i, min: M.min }); autoSub(G, M, side, i); }
  }
  // KI wechselt in der 2. Halbzeit müde Spieler aus
  for (const side of [0, 1]) { const tid = side ? M.a : M.h; if (tid !== G.me && M.min >= 60 && M.min % 10 === 0 && M.subs[side] < 3) { autoSub(G, M, side, -1); } }
  if (M.min === 45) out.push({ t: "half", min: 45 });
  if (M.min >= 90) {
    if (M.ko && M.gh === M.ga) { M.pens = penalties(G, M); out.push({ t: "pens", min: 90, res: M.pens }); }
    M.done = true; out.push({ t: "end", min: 90 });
  }
  M.ev.push(...out);
  return out;
}
function penalties(G, M) {
  let a = 0, b = 0; const kh = power(G, M, 0).keep, ka = power(G, M, 1).keep;
  for (let i = 0; i < 5; i++) { if (R.rnd() < .76 - (ka - 50) * .003) a++; if (R.rnd() < .76 - (kh - 50) * .003) b++; }
  while (a === b) { if (R.rnd() < .72) a++; if (R.rnd() < .72) b++; }
  return [a, b];
}
function bench(G, M, s) { const tid = s ? M.a : M.h; return G.teams[tid].squad.filter(id => !M.xi[s].includes(id) && !M.subbed[s].includes(id) && available(G.players[id]) && !(M.played[s].has(id))).map(id => G.players[id]); }
function doSub(G, M, s, slot, inId) {
  if (M.subs[s] >= 3) return false; const outId = M.xi[s][slot]; if (!outId) return false;
  M.xi[s][slot] = inId; M.subbed[s].push(outId); M.played[s].add(inId); M.subs[s]++;
  M.ev.push({ t: "sub", s, p: inId, o: outId, min: M.min }); return true;
}
function autoSub(G, M, s, slot) {
  if (M.subs[s] >= 3) { if (slot >= 0) M.xi[s][slot] = null; return; }
  const slots = FORMATIONS[M.form[s]];
  if (slot < 0) { // müdesten Feldspieler wählen
    let w = -1, wf = 999; M.xi[s].forEach((id, i) => { if (!id || i === 0) return; const p = G.players[id]; const f = p.fit - M.min * .5; if (f < wf) { wf = f; w = i; } });
    if (w < 0 || wf > 55) return; slot = w;
  }
  const pos = slots[slot][0]; const b = bench(G, M, s).sort((x, y) => eff(y, pos) - eff(x, pos));
  if (!b.length) { M.xi[s][slot] = null; return; }
  doSub(G, M, s, slot, b[0].id);
}
function simFull(G, M) { while (!M.done) step(G, M); return M; }
function finishMatch(G, M) {
  // Fitness, Form, Einsätze
  for (const s of [0, 1]) {
    const tid = s ? M.a : M.h;
    M.played[s].forEach(id => { const p = G.players[id]; if (!p) return; p.apps++; p.sa++; p.fit = Math.max(25, p.fit - R.int(12, 22)); });
    const won = s ? M.ga > M.gh : M.gh > M.ga, lost = s ? M.ga < M.gh : M.gh < M.ga;
    G.teams[tid].squad.forEach(id => { const p = G.players[id]; if (M.played[s].has(id)) p.form = Math.max(-2, Math.min(2, p.form + (won ? 1 : lost ? -1 : 0) * (R.rnd() < .6 ? 1 : 0))); });
  }
  if (M.pens) { M.winner = M.pens[0] > M.pens[1] ? M.h : M.a; } else M.winner = M.gh > M.ga ? M.h : M.ga > M.gh ? M.a : null;
  return M;
}

/* ---------- Saison ---------- */
function roundRobin(ids) {
  const n = ids.length, arr = ids.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const rd = []; for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; rd.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(rd); arr.splice(1, 0, arr.pop());
  }
  return rounds.concat(rounds.map(rd => rd.map(([a, b]) => [b, a])));
}
function newSeasonSetup(G) {
  G.step = 0; G.leagues = [0, 1, 2].map(lg => {
    const ids = R.shuffle(G.teams.filter(t => t.league === lg).map(t => t.id));
    return { lg, ids, fixtures: roundRobin(ids), table: Object.fromEntries(ids.map(id => [id, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }])) };
  });
  // Pokal: 16 Vereine aus Liga 0+1 in Runde 1, Profiliga steigt im Achtelfinale ein
  const low = R.shuffle(G.teams.filter(t => t.league < 2).map(t => t.id));
  G.cup = { round: 0, alive: G.teams.map(t => t.id), ties: [], byes: G.teams.filter(t => t.league === 2).map(t => t.id), draw: [], history: [] };
  G.cup.draw = pairs(low);
  Object.values(G.players).forEach(p => { p.sg = 0; p.sa = 0; p.yel = 0; });
  G.sponsorOffers = sponsorOffers(G); G.sponsor = null;
}
function pairs(ids) { const out = []; for (let i = 0; i < ids.length; i += 2) out.push([ids[i], ids[i + 1]]); return out; }
function sponsorOffers(G) {
  const lg = G.teams[G.me].league, b = SPONSOR_BASE[lg];
  const names = ["Bäckerei Sonnenschein", "Autohaus Flink", "Elektro Funke", "Getränke Spritzig", "Bauhof Stark", "Reisebüro Fernweh", "Eiscafé Venezia", "Sportwelt Sprint", "Gärtnerei Grünfink", "Brillen Klarblick"];
  const n = R.shuffle(names.slice());
  return [
    { name: n[0], base: Math.round(b * 1.0 / 1000) * 1000, win: Math.round(b * .02 / 1000) * 1000, kind: "Sicher" },
    { name: n[1], base: Math.round(b * .7 / 1000) * 1000, win: Math.round(b * .06 / 1000) * 1000, kind: "Pro Sieg mehr" },
    { name: n[2], base: Math.round(b * .55 / 1000) * 1000, win: 0, title: Math.round(b * 1.2 / 1000) * 1000, kind: "Meister-Bonus" }
  ];
}
function nextEvent(G) { return G.step < CAL.length ? CAL[G.step] : null; }
function leagueRound(G) { return CAL.slice(0, G.step).filter(x => x === "L").length; } // 0-basiert: nächster Spieltag
function myLeague(G) { return G.leagues[G.teams[G.me].league]; }
function nextFixture(G) {
  const ev = nextEvent(G); if (!ev) return null;
  if (ev === "L") { const lg = myLeague(G), r = leagueRound(G); const f = lg.fixtures[r].find(x => x.includes(G.me)); return { comp: "L", h: f[0], a: f[1], round: r }; }
  const tie = G.cup.draw.find(x => x.includes(G.me));
  return tie ? { comp: "C", h: tie[0], a: tie[1], round: G.cup.round } : { comp: "C", none: true, round: G.cup.round };
}
function applyResult(G, lgObj, M) {
  const th = lgObj.table[M.h], ta = lgObj.table[M.a];
  th.p++; ta.p++; th.gf += M.gh; th.ga += M.ga; ta.gf += M.ga; ta.ga += M.gh;
  if (M.gh > M.ga) { th.w++; ta.l++; th.pts += 3; } else if (M.gh < M.ga) { ta.w++; th.l++; ta.pts += 3; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
}
function standings(G, lgObj) {
  return lgObj.ids.slice().sort((x, y) => { const a = lgObj.table[x], b = lgObj.table[y]; return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || G.teams[x].name.localeCompare(G.teams[y].name); });
}
// Spielt alle anderen Spiele dieses Ereignisses (das eigene Spiel M ist schon fertig, falls vorhanden)
function playRound(G, myM) {
  const ev = nextEvent(G); const res = [];
  if (ev === "L") {
    const r = leagueRound(G);
    G.leagues.forEach(lg => lg.fixtures[r].forEach(([h, a]) => {
      let M = (myM && myM.h === h && myM.a === a) ? myM : finishMatch(G, simFull(G, newMatch(G, h, a, "L")));
      applyResult(G, lg, M); res.push(M);
    }));
  } else {
    const winners = [];
    G.cup.draw.forEach(([h, a]) => {
      let M = (myM && myM.h === h && myM.a === a) ? myM : finishMatch(G, simFull(G, newMatch(G, h, a, "C", { ko: true })));
      winners.push(M.winner); res.push(M);
    });
    G.cup.history.push(res.map(M => ({ h: M.h, a: M.a, gh: M.gh, ga: M.ga, pens: M.pens, w: M.winner })));
    const mine = res.find(M => M.h === G.me || M.a === G.me); if (mine && mine.winner !== G.me && G.cup.myOut == null) G.cup.myOut = G.cup.round;
    G.cup.round++;
    let next = winners.slice(); if (G.cup.round === 1) next = next.concat(G.cup.byes);
    if (next.length >= 2) G.cup.draw = pairs(R.shuffle(next).sort((x, y) => G.teams[x].league - G.teams[y].league)); else { G.cup.draw = []; G.cup.winner = next[0]; }
    if (G.cup.round < 5 && next.length >= 2) { // niedrigere Liga hat Heimrecht
      G.cup.draw = pairs(R.shuffle(next)).map(([a, b]) => G.teams[a].league <= G.teams[b].league ? [a, b] : [b, a]);
    }
  }
  // Woche: Erholung, Verletzungen, Sperren, Training, Finanzen
  weekly(G, ev, myM);
  G.step++;
  return res;
}
function weekly(G, ev, myM) {
  const tr = G.training;
  Object.values(G.players).forEach(p => {
    if (p.team == null) return;
    const mine = p.team === G.me;
    p.fit = Math.min(100, p.fit + 16 + (mine && tr === "fit" ? 8 : 0));
    if (p.inj) p.inj--; if (p.sus && ev === "L") p.sus--;
    // Entwicklung: junge Spieler werden besser (eigenes Training hilft)
    if (p.str < p.pot && p.age < 30) {
      let ch = .06 + (p.age < 23 ? .05 : 0);
      if (mine) { if ((tr === "att" && (p.pos === "ST" || p.pos === "MF")) || (tr === "def" && (p.pos === "AB" || p.pos === "TW")) || (tr === "tech" && p.pos === "MF")) ch += .07; if (tr === "mix") ch += .03; }
      if (R.rnd() < ch) p.str++;
    }
    if (R.rnd() < .08) p.form = Math.max(-2, Math.min(2, p.form + (R.rnd() < .5 ? -1 : 1)));
  });
  // Geld nur für meinen Verein
  const me = G.teams[G.me]; const lg = me.league; const fin = { week: G.step, items: [] };
  const wages = me.squad.reduce((s, id) => s + wage(G.players[id]), 0); fin.items.push(["Gehälter", -wages]);
  if (myM && myM.h === G.me) { const cap = STADIUM.stand.levels[G.stadium.stand]; const fill = Math.min(1, .55 + .1 * standingPos(G) + (myM.comp === "C" ? .2 : 0) + (G.stadium.light ? .08 : 0)); const fans = Math.round(cap * fill); const inc = fans * TICKET[lg] * (myM.comp === "C" ? 1.3 : 1); fin.items.push(["Zuschauer (" + fans.toLocaleString("de-DE") + ")", Math.round(inc)]); if (G.stadium.shop) fin.items.push(["Fanshop", Math.round(fans * 2.5)]); myM.fans = fans; }
  if (myM && myM.winner === G.me) { fin.items.push(["Siegprämie", WIN_BONUS[lg] * (myM.comp === "C" ? 2 : 1)]); if (G.sponsor && G.sponsor.win) fin.items.push(["Sponsor-Bonus", G.sponsor.win]); }
  if (G.sponsor && ev === "L") fin.items.push(["Sponsor", Math.round(G.sponsor.base / 14)]);
  const sum = fin.items.reduce((s, x) => s + x[1], 0); G.money += sum; fin.sum = sum; G.fin.unshift(fin); G.fin = G.fin.slice(0, 20);
  // Transfermarkt wechselt etwas
  if (G.market.length) { for (let k = 0; k < 4; k++) { const id = G.market.shift(); if (G.players[id] && G.players[id].team == null) delete G.players[id]; } }
  refillMarket(G, 40);
  // KI-Vereine: Lücken schließen
  G.teams.forEach(t => { if (t.id === G.me) return; while (t.squad.length < 18) { const pos = ["TW", "AB", "MF", "ST"].find(ps => t.squad.filter(i => G.players[i].pos === ps).length < { TW: 2, AB: 6, MF: 6, ST: 4 }[ps]) || "MF"; addTo(G, makePlayer(pos, t.rep - 2), t.id); numberSquad(G, t); } });
}
function standingPos(G) { const lg = myLeague(G); const pos = standings(G, lg).indexOf(G.me); return (7 - pos) / 7 * 3; }

/* ---------- Saisonende ---------- */
function seasonEnd(G) {
  const sum = { season: G.season, league: G.teams[G.me].league, table: [], up: [], down: [], champion: [], cupWinner: G.cup.winner, prize: 0, retired: [], youth: [] };
  const moves = [];
  G.leagues.forEach(lg => {
    const st = standings(G, lg); sum.champion[lg.lg] = st[0];
    if (lg.lg === G.teams[G.me].league) { sum.table = st; sum.pos = st.indexOf(G.me) + 1; }
    if (lg.lg < 2) st.slice(0, 2).forEach(id => moves.push([id, +1]));
    if (lg.lg > 0) st.slice(6).forEach(id => moves.push([id, -1]));
  });
  moves.forEach(([id, d]) => { const t = G.teams[id]; t.league += d; if (id === G.me) { if (d > 0) sum.up.push(id); else sum.down.push(id); } if (id !== G.me) { const [a, b] = LEAGUE_REP[t.league]; t.rep = Math.max(a, Math.min(b, t.rep + d * 4)); } });
  const meLg = sum.league; const pos = sum.pos;
  sum.prize = Math.round([[250000, 160000, 110000, 80000, 60000, 45000, 30000, 20000], [900000, 650000, 450000, 320000, 240000, 180000, 120000, 80000], [5000000, 3500000, 2500000, 1800000, 1300000, 900000, 600000, 400000]][meLg][pos - 1]);
  if (G.sponsor && G.sponsor.title && pos === 1) sum.prize += G.sponsor.title;
  if (sum.cupWinner === G.me) sum.prize += [300000, 900000, 3000000][meLg];
  G.money += sum.prize;
  if (pos === 1) G.trophies.push({ kind: "L" + meLg, season: G.season });
  if (sum.cupWinner === G.me) G.trophies.push({ kind: "C", season: G.season });
  G.history.push({ season: G.season, league: meLg, pos, cup: G.cup.myOut == null ? 5 : G.cup.myOut, cupWin: sum.cupWinner === G.me });
  // Altern, Abbau, Karriereende
  Object.values(G.players).forEach(p => {
    if (p.team == null) return; p.age++;
    if (p.age >= 31) p.str = Math.max(20, p.str - R.int(0, p.age >= 33 ? 4 : 2));
    if (p.age >= 35 && R.rnd() < .6) { if (p.team === G.me) sum.retired.push(p.fn + " " + p.ln); removeFrom(G, p); delete G.players[p.id]; }
    else { p.fit = 100; p.inj = 0; p.sus = 0; }
  });
  // Jugend: 2 Talente für mich
  for (let k = 0; k < 2; k++) { const p = makePlayer(R.pick(["AB", "MF", "ST", "MF"]), LEAGUE_REP[G.teams[G.me].league][0] - 4, 17); p.pot = Math.min(95, p.str + R.int(18, 32)); addTo(G, p, G.me); sum.youth.push(p.id); }
  numberSquad(G, G.teams[G.me]);
  G.teams.forEach(t => { if (t.id !== G.me) { // KI frischt Kader auf
    t.squad.slice().map(id => G.players[id]).sort((a, b) => a.str - b.str).slice(0, 2).forEach(p => { removeFrom(G, p); delete G.players[p.id]; });
    while (t.squad.length < 18) addTo(G, makePlayer(["TW", "AB", "MF", "ST"].find(ps => t.squad.filter(i => G.players[i].pos === ps).length < { TW: 2, AB: 6, MF: 6, ST: 4 }[ps]) || "MF", t.rep), t.id);
    numberSquad(G, t);
  } });
  G.market.forEach(id => { if (G.players[id] && G.players[id].team == null) delete G.players[id]; }); G.market = []; refillMarket(G, 40);
  G.season++;
  newSeasonSetup(G);
  G.lineup = fixLineup(G);
  return sum;
}
function fixLineup(G) { const xi = G.lineup.map(id => (id && G.players[id] && G.players[id].team === G.me && available(G.players[id])) ? id : null); if (xi.length !== FORMATIONS[G.formation].length || xi.filter(Boolean).length < 11) return bestXI(G, G.me, G.formation); return xi; }

/* ---------- Transfers ---------- */
function buyPrice(G, p) { return Math.round(value(p) * (p.team == null ? 1.0 : 1.25) / 1000) * 1000; }
function sellPrice(G, p) { return Math.round(value(p) * .9 / 1000) * 1000; }
function buy(G, pid) {
  const p = G.players[pid]; const price = buyPrice(G, p); const me = G.teams[G.me];
  if (G.money < price) return "money"; if (me.squad.length >= 26) return "full";
  G.money -= price; if (p.team != null) removeFrom(G, p); G.market = G.market.filter(i => i !== pid);
  addTo(G, p, G.me); p.num = 0; numberSquad(G, me); p.form = 1;
  G.fin.unshift({ week: G.step, items: [["Kauf " + p.ln, -price]], sum: -price });
  return "ok";
}
function sell(G, pid) {
  const p = G.players[pid]; const me = G.teams[G.me]; if (me.squad.length <= 14) return "few";
  const price = sellPrice(G, p); G.money += price;
  // landet bei einem passenden KI-Verein
  const tgt = G.teams.filter(t => t.id !== G.me && Math.abs(t.rep - p.str) < 12); const t = tgt.length ? R.pick(tgt) : null;
  removeFrom(G, p); G.lineup = G.lineup.map(id => id === pid ? null : id);
  if (t) { addTo(G, p, t.id); numberSquad(G, t); } else { G.players[pid] = p; G.market.push(pid); }
  G.fin.unshift({ week: G.step, items: [["Verkauf " + p.ln, price]], sum: price });
  return "ok";
}
function upgrade(G, what) {
  if (what === "stand") { const l = G.stadium.stand; if (l >= 4) return "max"; const c = STADIUM.stand.cost[l + 1]; if (G.money < c) return "money"; G.money -= c; G.stadium.stand++; G.fin.unshift({ week: G.step, items: [["Tribüne ausgebaut", -c]], sum: -c }); return "ok"; }
  if (G.stadium[what]) return "max"; const c = STADIUM[what].cost; if (G.money < c) return "money"; G.money -= c; G.stadium[what] = 1; G.fin.unshift({ week: G.step, items: [[STADIUM[what].name + " gebaut", -c]], sum: -c }); return "ok";
}

const API = { R, LEAGUES, CLUBS, POS, POS_NAME, FORMATIONS, FIT, STADIUM, CAL, CUP_NAMES, value, wage, stars, money, newGame, bestXI, eff, available, teamPower, newMatch, step, simFull, finishMatch, bench, doSub, autoSub, playRound, nextEvent, nextFixture, leagueRound, myLeague, standings, seasonEnd, buy, sell, buyPrice, sellPrice, upgrade, fixLineup, numberSquad, sponsorOffers, setNext(n) { NEXT = n; }, getNext() { return NEXT; } };
if (typeof module !== "undefined") module.exports = API; else root.FB = API;
})(this);
