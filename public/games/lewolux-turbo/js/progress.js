// Fortschritt: Speicherstand, Fahrer-Level, Freischaltungen, Garage, Aufgaben
const KEY = 'lewoluxTurbo.v1';
export const MAXLVL = 20;
export const need = l => 60 + 30*l;                       // EP von Level l auf l+1

// Fahrzeuge und Räder sind TAUSCH, keine Verbesserung: die Summe der Werte bleibt 0
export const VEHICLES = {
  sig:  { name: 'Eigenes Fahrzeug', icon: '⭐', mod: {} },
  kart: { name: 'Turbo-Kart', icon: '🏎️', mod: { speed: 1, accel: -1 } },
  bike: { name: 'Flitzer-Moped', icon: '🛵', mod: { handling: 2, weight: -1, speed: -1 } },
  sofa: { name: 'Sofa-Mobil', icon: '🛋️', mod: { weight: 2, accel: 1, handling: -2, speed: -1 } },
};
export const WHEELS = {
  std:     { name: 'Standard', icon: '⚫', mod: {} },
  monster: { name: 'Monsterräder', icon: '🛞', mod: { weight: 1, speed: -1 }, offroad: 0.15 },
  slick:   { name: 'Rennreifen', icon: '🏁', mod: { speed: 1, handling: -1 } },
  glow:    { name: 'Leuchtfelgen', icon: '💡', mod: { accel: 1, speed: -1 } },
};
export const OUTFITS = { none: { name: 'Ohne', icon: '🚫' }, party: { name: 'Partyhut', icon: '🥳' }, phones: { name: 'Kopfhörer', icon: '🎧' }, tophat: { name: 'Zylinder', icon: '🎩' },
  shades: { name: 'Coole Brille', icon: '😎' }, viking: { name: 'Wikingerhelm', icon: '⛑️' }, crown: { name: 'Krone', icon: '👑' }, halo: { name: 'Heiligenschein', icon: '😇' } };
export const PAINTS = ['p1', 'p2', 'p3', 'p4', 'gold'];
export const PAINT_NAMES = { p1: 'Original', p2: 'Lackierung 2', p3: 'Lackierung 3', p4: 'Lackierung 4', gold: 'Gold' };
// Was man mit welchem Fahrer-Level bekommt
export const LEVEL_REWARDS = [
  { lvl: 2, type: 'paint', id: 'p2' }, { lvl: 3, type: 'outfit', id: 'party' }, { lvl: 4, type: 'wheels', id: 'monster' }, { lvl: 5, type: 'vehicle', id: 'kart' },
  { lvl: 6, type: 'outfit', id: 'phones' }, { lvl: 7, type: 'paint', id: 'p3' }, { lvl: 8, type: 'wheels', id: 'slick' }, { lvl: 9, type: 'outfit', id: 'tophat' },
  { lvl: 10, type: 'vehicle', id: 'bike' }, { lvl: 11, type: 'outfit', id: 'shades' }, { lvl: 12, type: 'outfit', id: 'viking' }, { lvl: 13, type: 'wheels', id: 'glow' },
  { lvl: 14, type: 'paint', id: 'p4' }, { lvl: 15, type: 'vehicle', id: 'sofa' }, { lvl: 17, type: 'outfit', id: 'crown' }, { lvl: 18, type: 'paint', id: 'gold' }, { lvl: 20, type: 'outfit', id: 'halo' },
];
export const rewardName = r => r.type === 'paint' ? PAINT_NAMES[r.id] : r.type === 'outfit' ? OUTFITS[r.id].name : r.type === 'wheels' ? WHEELS[r.id].name : VEHICLES[r.id].name;
export const rewardIcon = r => r.type === 'paint' ? (r.id === 'gold' ? '🥇' : '🎨') : r.type === 'outfit' ? OUTFITS[r.id].icon : r.type === 'wheels' ? WHEELS[r.id].icon : VEHICLES[r.id].icon;
export const priceOf = r => 40 + r.lvl*25;              // früher kaufen mit Münzen

// Aufgaben-Pool: ev = Ereignis, n = Ziel
const QUESTS = [
  { id: 'race3', text: 'Fahre 3 Rennen', ev: 'race', n: 3, coins: 40 },
  { id: 'hunt1', text: 'Gewinne eine Münzjagd', ev: 'huntWin', n: 1, coins: 70 },
  { id: 'hunt30', text: 'Sammle 40 Münzen in einer Münzjagd', ev: 'hunt30', n: 1, coins: 80 },
  { id: 'win1', text: 'Gewinne ein Rennen', ev: 'win', n: 1, coins: 60 },
  { id: 'podium3', text: 'Komm 3× aufs Podest', ev: 'podium', n: 3, coins: 60 },
  { id: 'hit5', text: 'Triff 5 Gegner mit Items', ev: 'hit', n: 5, coins: 50 },
  { id: 'hit15', text: 'Triff 15 Gegner mit Items', ev: 'hit', n: 15, coins: 100 },
  { id: 'trick5', text: 'Schaffe 5 Trick-Sprünge', ev: 'trick', n: 5, coins: 50 },
  { id: 'coin40', text: 'Sammle 40 Münzen', ev: 'coin', n: 40, coins: 50 },
  { id: 'purple3', text: 'Lade 3 lila Mini-Turbos', ev: 'purple', n: 3, coins: 60 },
  { id: 'items12', text: 'Benutze 12 Items', ev: 'item', n: 12, coins: 40 },
  { id: 'gp1', text: 'Fahre einen Grand Prix zu Ende', ev: 'gp', n: 1, coins: 80 },
  { id: 'gpwin', text: 'Gewinne einen Grand Prix', ev: 'gpWin', n: 1, coins: 150 },
  { id: 'time1', text: 'Fahre ein Zeitfahren', ev: 'time', n: 1, coins: 40 },
  { id: 'drift20', text: 'Lade 20 Mini-Turbos', ev: 'mini', n: 20, coins: 50 },
  { id: 'w_nervbert', text: 'Gewinne mit Nervbert', ev: 'win:nervbert', n: 1, coins: 80 },
  { id: 'w_kritzel', text: 'Gewinne mit Kritzel', ev: 'win:kritzel', n: 1, coins: 80 },
  { id: 'w_pandi', text: 'Gewinne mit Pandi', ev: 'win:pandi', n: 1, coins: 80 },
  { id: 'w_lux', text: 'Gewinne mit Lux', ev: 'win:lux', n: 1, coins: 80 },
  { id: 'w_kicker', text: 'Gewinne mit Kicker-Kid', ev: 'win:kicker', n: 1, coins: 80 },
  { id: 'w_sonni', text: 'Gewinne mit Sonni', ev: 'win:sonni', n: 1, coins: 80 },
  { id: 't_schulhof', text: 'Gewinne im Schulhof-Stadion', ev: 'win@schulhof', n: 1, coins: 70 },
  { id: 't_teich', text: 'Gewinne an Pandis Teich', ev: 'win@teich', n: 1, coins: 70 },
  { id: 't_wueste', text: 'Gewinne in der Wüsten-Hitze', ev: 'win@wueste', n: 1, coins: 70 },
  { id: 't_dschungel', text: 'Gewinne im Neon-Dschungel', ev: 'win@dschungel', n: 1, coins: 70 },
];
// Erfolge (bleiben für immer)
export const ACHIEVEMENTS = [
  { id: 'first', text: 'Erstes Rennen gefahren', ev: 'race', n: 1, icon: '🏁' },
  { id: 'firstwin', text: 'Erster Sieg', ev: 'win', n: 1, icon: '🥇' },
  { id: 'cup', text: 'Einen Grand Prix gewonnen', ev: 'gpWin', n: 1, icon: '🏆', unlock: 'goldfuchs' },
  { id: 'cupturbo', text: 'Einen Grand Prix auf „Turbo“ gewonnen (schaltet „Spiegel“ frei)', ev: 'gpWinTurbo', n: 1, icon: '🔥' },
  { id: 'hits50', text: '50 Treffer gelandet', ev: 'hit', n: 50, icon: '🎯' },
  { id: 'tricks50', text: '50 Trick-Sprünge', ev: 'trick', n: 50, icon: '🤸' },
  { id: 'coins500', text: '500 Münzen gesammelt', ev: 'coin', n: 500, icon: '🪙' },
  { id: 'lvl10', text: 'Einen Fahrer auf Level 10 gebracht', ev: 'lvl10', n: 1, icon: '⭐' },
  { id: 'lvl20', text: 'Einen Fahrer auf Level 20 gebracht', ev: 'lvl20', n: 1, icon: '🌟' },
  { id: 'allcups', text: 'Alle drei Cups gewonnen', ev: 'allcups', n: 1, icon: '👑' },
  { id: 'alltracks', text: 'Auf jeder Strecke gewonnen', ev: 'alltracks', n: 1, icon: '🗺️' },
];

function fresh() { return { v: 1, wallet: 0, drivers: {}, owned: {}, best: {}, ghosts: {}, quests: [], qDone: 0, ach: {}, achP: {}, cups: {}, wins: {}, unlockedDrivers: [], muted: false }; }
let S = fresh();
export function load() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.v === 1) S = Object.assign(fresh(), d); } catch (_) {} ensureQuests(); return S; }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} }
export const state = () => S;
export function drv(id) { return S.drivers[id] ||= { xp: 0, lvl: 1, vehicle: 'sig', wheels: 'std', outfit: 'none', paint: 'p1' }; }
export function owns(id, r) { const d = drv(id); return d.lvl >= r.lvl || !!(S.owned[id] && S.owned[id][r.type + ':' + r.id]); }
export function has(id, type, key) { if ((type === 'vehicle' && key === 'sig') || (type === 'wheels' && key === 'std') || (type === 'outfit' && key === 'none') || (type === 'paint' && key === 'p1')) return true;
  const r = LEVEL_REWARDS.find(x => x.type === type && x.id === key); return r ? owns(id, r) : false; }
export function buy(id, r) { const p = priceOf(r); if (S.wallet < p || owns(id, r)) return false; S.wallet -= p; (S.owned[id] ||= {})[r.type + ':' + r.id] = 1; save(); return true; }
export function equip(id, type, key) { if (!has(id, type, key)) return false; drv(id)[type] = key; save(); return true; }

// Werte eines Fahrers mit Fahrzeug + Rädern (begrenzt auf 1..6)
export function stats(def, cfg) {
  const st = { ...def.st }; const v = VEHICLES[cfg?.vehicle || 'sig'], w = WHEELS[cfg?.wheels || 'std'];
  for (const m of [v.mod, w.mod]) for (const k in m) st[k] = Math.max(1, Math.min(6, st[k] + m[k]));
  st.offroad = w.offroad || 0; return st;
}
// EP vergeben; Rückgabe: neue Freischaltungen
export function addXP(id, xp) {
  const d = drv(id), got = []; if (d.lvl >= MAXLVL) return got;
  d.xp += xp;
  while (d.lvl < MAXLVL && d.xp >= need(d.lvl)) { d.xp -= need(d.lvl); d.lvl++; for (const r of LEVEL_REWARDS) if (r.lvl === d.lvl) got.push(r); got.push({ type: 'level', lvl: d.lvl });
    if (d.lvl === 10) event('lvl10'); if (d.lvl === 20) event('lvl20'); }
  if (d.lvl >= MAXLVL) d.xp = 0;
  save(); return got;
}
// Aufgaben
function ensureQuests() { while (S.quests.length < 3) { const pool = QUESTS.filter(q => !S.quests.some(a => a.id === q.id) && q.id !== S.lastQ); const q = pool[Math.random()*pool.length | 0]; S.quests.push({ id: q.id, p: 0 }); } }
export const questDef = id => QUESTS.find(q => q.id === id);
export const quests = () => S.quests.map(a => ({ ...questDef(a.id), p: a.p }));
const doneLog = [];
export function event(ev, n = 1) {
  for (const a of S.quests) { const q = questDef(a.id); if (!q || a.p >= q.n) continue; if (q.ev === ev) { a.p = Math.min(q.n, a.p + n); if (a.p >= q.n) doneLog.push({ kind: 'quest', q }); } }
  for (const A of ACHIEVEMENTS) { if (S.ach[A.id] || A.ev !== ev) continue; S.achP[A.id] = (S.achP[A.id] || 0) + n; if (S.achP[A.id] >= A.n) { S.ach[A.id] = 1; doneLog.push({ kind: 'ach', a: A }); if (A.unlock && !S.unlockedDrivers.includes(A.unlock)) S.unlockedDrivers.push(A.unlock); } }
}
// abgeschlossene Aufgaben einlösen (Münzen) und ersetzen
export function claim() {
  const out = doneLog.splice(0);
  for (const d of out) if (d.kind === 'quest') { S.wallet += d.q.coins; S.qDone++; S.lastQ = d.q.id; S.quests = S.quests.filter(a => a.id !== d.q.id); }
  ensureQuests(); save(); return out;
}
export function rerollQuest(id) { if (S.wallet < 10) return false; S.wallet -= 10; S.lastQ = id; S.quests = S.quests.filter(a => a.id !== id); ensureQuests(); save(); return true; }
export function addCoins(n) { S.wallet += n; save(); }
export function setBest(track, t, ghost) { const b = S.best[track]; if (!b || t < b) { S.best[track] = t; if (ghost) S.ghosts[track] = ghost; save(); return true; } return false; }
export function cupResult(cup, cls, place) { const k = cup + ':' + cls; const prev = S.cups[k] || 9; if (place < prev) { S.cups[k] = place; save(); } }
export function trackWin(track, allIds) { S.wins[track] = 1; if (allIds.every(t => S.wins[t])) event('alltracks'); save(); }
