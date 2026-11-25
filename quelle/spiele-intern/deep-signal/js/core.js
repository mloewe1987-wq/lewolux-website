// Deep Signal – core simulation (pure logic, no DOM). Used by the game and by the headless balance sim.
(function (DS) {
'use strict';
const M = DS.M, CH = 480; // chunk height in world units (120 m)
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const ease = (v, t, k, dt) => v + (t - v) * (1 - Math.exp(-k * dt));

// ---------- seeded value noise for the canyon walls ----------
function noise(seed) {
  const r = DS.rng(seed), T = new Float32Array(1024); for (let i = 0; i < 1024; i++) T[i] = r() * 2 - 1;
  return x => { const i = Math.floor(x), f = x - i, a = T[i & 1023], b = T[(i + 1) & 1023], u = f * f * (3 - 2 * f); return a + (b - a) * u; };
}

DS.newDive = function (S, opt = {}) {
  const st = DS.stats(S);
  if (opt.extraO2) st.o2 = Math.round(st.o2 * 1.5);
  // beginner protection: the rescue buoy keeps at least 75 % during the first three dives
  if ((S.dives || 0) < 3 && !(S.region || 0)) st.keep = Math.max(st.keep, 0.75);
  const seed = opt.seed != null ? opt.seed : (Math.random() * 1e9) | 0;
  const rs = DS.hash(911, S.region || 0);
  const nA = noise(rs), nB = noise(rs ^ 0x5bd1e995), nC = noise(rs ^ 0x1b873593);
  const er = DS.rng(seed ^ 0x9e3779b9);
  const limM = Math.min(st.hullM, DS.FLOOR_M);
  // elevator: start deeper on later dives (never deeper than 60 % of the record or of the hull, and always above the abyss –
  // pressure waves and interference cannot be skipped)
  let startM = Math.min(st.lift, (S.rec || 0) * 0.6, st.hullM * 0.6, 3800); if (startM < 100 || opt.noLift) startM = 0;
  // one random event per dive (from the 3rd dive on, not on the daily expedition)
  let event = null;
  if (opt.event) event = opt.event;
  else if (!opt.daily && opt.events !== false && (S.dives || 0) >= 2 && er() < 0.4) { const pool = ['shoal', 'storm']; if (limM >= 300) pool.push('whalefall', 'whalefall'); event = pool[Math.floor(er() * pool.length)]; }
  if (event === 'storm') st.mult *= 1.25;
  const D = {
    S, st, seed, daily: !!opt.daily, region: S.region || 0, t: 0, phase: 'launch', done: false,
    sub: {x: 0, y: -60, vx: 0, vy: 0, face: 1, tilt: 0},
    o2: st.o2, o2max: st.o2, hold: [], cap: st.cap, charges: st.charges, flares: st.flares,
    objs: [], pieces: [], jellies: [], ledges: {}, gen: -1, ev: [],
    preds: [], flaresOut: [], rocks: [], currents: [], vents: [], ice: [],
    light: true, grab: null, waveT: 9 + er() * 6, waveWarn: false, intfT: 7 + er() * 5, intf: 0, intfA: 0, intfWarn: false,
    sig: {str: 0, ang: 0, d: 1e9}, cnt: {wrecks: 0, caches: 0, dodges: 0, flares: 0, bites: 0, ores: 0, samples: 0}, darkMax: 0, darkT: 0,
    useCd: 0, lightCd: 0, huntT: 14 + er() * 8, noiseT: 0, lockT: 0, abyssIn: false, trenchIn: false, contract: null, rare: null,
    event, evY: 0, evDone: false, startY: startM * M, echoN: S.echoN || 0, first: !(S.dives || 0) && !(S.region || 0),
    maxM: 0, rec0: S.rec || 0, sigN: (S.region || 0) ? ((S.sigR || {})[S.region] || 0) : (S.sigN || 0), srcHit: false,
    drillAt: null, drillObj: null, drillT: 0, stingCd: 0, creakT: 0, warnT: 0, pingT: 2.5, fullT: 0, lost: 0,
    emergency: false, nid: 1, r: DS.rng(seed ^ 0x2545F491), limY: st.hullM * M,
    // fast auto-ascent: never more than ~15 s from the hull limit, the winch makes it faster
    ascent: Math.max(st.descent * 2.6, 250, Math.min(st.hullM, DS.FLOOR_M) * M / 18) * st.winch,
  };
  if (event) { const le = Math.min(limM, DS.SOURCE_M - 250), a = Math.max(startM + 60, le * 0.4), b = Math.max(a + 20, le - 40); D.evY = (a + (b - a) * er()) * M; if (event === 'storm') D.evY = 40 * M; }
  // contract (goal of this dive)
  if (opt.contract) { D.contract = Object.assign({}, opt.contract, {prog: 0, done: false}); if (D.contract.id === 'box') D.contract.y = D.contract.m * M; }
  // rare spawn: a glowing treasure or a wreck with a locked vault (not on the expedition, not in the first dives)
  if (!opt.daily && opt.rare !== false && (S.dives || 0) >= 2) { const q = er(); if (opt.rare || q < 0.16) D.rare = opt.rare || (limM >= 200 && q < 0.07 ? 'vault' : 'treasure');
    if (D.rare) { const lr = Math.min(limM, DS.SOURCE_M - 200), a = Math.max(startM + 50, lr * 0.35, 50), b = Math.max(a + 10, lr - 25); D.rareY = (a + (b - a) * er()) * M; } }
  // first predator: a scripted, slow and readable encounter in the sunlit zone (dives 3–8 until the player has used the light once)
  if (!(S.region || 0) && !opt.daily && (S.dives || 0) >= 2 && (S.dives || 0) <= 8 && !S.tutL && opt.tutPred !== false) D.tutY = Math.max(55, Math.min(limM - 30, limM * 0.62)) * M;
  // first dive: one short intro line
  D.intro = D.first;
  D.lurkOn = !!S.tutL && !opt.daily && opt.lurk !== false; D.lurkAt = 22 + er() * 10;
  // signal caches: the sonar ping points at them
  D.caches = [];
  const nc = ((S.dives || 0) >= 1 || opt.daily ? 1 : 0) + (limM > 2500 ? 1 : 0);
  for (let i = 0; i < nc; i++) { const lc = Math.min(limM, DS.SOURCE_M - 200), a = Math.max(startM + 80, lc * 0.3, 70), b = Math.max(a + 10, lc - 30); D.caches.push({y: (a + (b - a) * er()) * M, side: er() < 0.5 ? -1 : 1, placed: false}); }
  // wall half width (left side = -1, right side = 1) before ledges
  D.hwRaw = (side, y) => {
    const m = y / M, base = 455 - 95 * clamp((m - 900) / 5000, 0, 1);
    return base + nA(y * 0.0032 + (side > 0 ? 300 : 0)) * 70 + nB(y * 0.011 + (side > 0 ? 77 : 0)) * 22 + nC(y * 0.05 + side * 9) * 6;
  };
  D.hw = (side, y) => {
    let w = D.hwRaw(side, y);
    const c = Math.floor(y / CH);
    for (let k = c - 1; k <= c + 1; k++) { const L = D.ledges[k]; if (!L) continue;
      for (const l of L) { if (l.side !== side) continue; const t = (y - l.y) / l.h;
        if (t > -0.12 && t < 1) w -= t < 0 ? l.d * Math.sqrt(1 - (t / -0.12) ** 2) : l.d * (1 - Math.pow(t, 1.5)); } }
    return w;
  };
  genTo(D, Math.max(1600, D.startY + 1600));
  return D;
};

function pickFind(r, z, minR = 0) {
  const pool = DS.FINDS.filter(f => f.z === z && f.r >= minR); let tot = 0; pool.forEach(f => tot += DS.RAR_W[f.r]);
  let x = r() * tot; for (const f of pool) { x -= DS.RAR_W[f.r]; if (x <= 0) return f; } return pool[0];
}

function overlaps(D, x, y, w, h) {
  for (let i = D.objs.length - 1; i >= 0 && i >= D.objs.length - 40; i--) { const o = D.objs[i]; if (o.broken) continue;
    if (Math.abs(o.x - x) < (o.w + w) / 2 + 12 && Math.abs(o.y - y) < (o.h + h) / 2 + 12) return true; }
  return false;
}
function addObj(D, t, x, y, m, r, extra = {}, force = false) {
  const T = DS.OBJ[t], z = DS.zoneAt(m), daily = D.daily ? 1.15 : 1;
  // never spawn inside another object: nudge a few times, otherwise skip (forced ones are placed anyway)
  if (overlaps(D, x, y, T.w, T.h)) { let ok = false;
    if (extra.float || force) for (let k = 0; k < (force ? 16 : 6) && !ok; k++) { const nx = (k >= 6 ? x * 0.3 : x) + (k % 2 ? 1 : -1) * (T.w + 20) * (1 + ((k % 6) >> 1) * 0.5), ny = y + (r() - 0.5) * (k >= 6 ? 160 + k * 30 : 60);
      const hw = Math.min(D.hw(-1, ny), D.hw(1, ny)) - T.w / 2 - 20; if (Math.abs(nx) < hw && !overlaps(D, nx, ny, T.w, T.h)) { x = nx; y = ny; ok = true; } }
    if (!ok && !force) return null; }
  const np = T.pieces[0] + Math.floor(r() * (T.pieces[1] - T.pieces[0] + 1));
  const hp = T.hp * DS.hpAt(m) * (0.85 + r() * 0.3);
  const mats = DS.MATS.filter(q => q.z === z);
  const o = {id: D.nid++, t, x, y, w: T.w, h: T.h, hp, hpMax: hp, value: T.value * DS.valueAt(m) * D.st.mult * daily * (0.85 + r() * 0.3),
    np, rel: 0, mat: t === 'ore' ? DS.ORES[z] : mats[Math.floor(r() * mats.length)].id, find: null, gold: false, broken: false, shake: 0, rev: 0, v: Math.floor(r() * 4), ph: r() * 6.28, m, z, ...extra};
  const fc = T.fc;
  if (r() < fc) { o.find = pickFind(r, z, t === 'sigcache' || t === 'whale' || t === 'vault' ? 1 : 0).id; o.gold = r() < (t === 'treasure' ? 0.3 : t === 'sigcache' ? (D.daily ? 0.2 : 0.12) : D.daily ? 0.07 : 0.035); }
  if (t === 'vault') o.req = Math.max(1, DS.vaultReq(z) - D.st.vaultCut);
  D.objs.push(o); return o;
}

// big forced wall objects (whale fall, vault wreck) push ordinary objects out of their spot
function clearFor(D, t, x, y) { const T = DS.OBJ[t]; D.objs = D.objs.filter(o => o.broken || o.sig || o.recorder || o.rareObj || !(Math.abs(o.x - x) < (o.w + T.w) / 2 + 12 && Math.abs(o.y - y) < (o.h + T.h) / 2 + 12)); }
function addLedge(D, c, side, y, d, force) {
  const L = D.ledges[c] || (D.ledges[c] = []);
  if (!force) for (let k = c - 1; k <= c + 1; k++) for (const l of (D.ledges[k] || [])) if (l.side === side && Math.abs(l.y - y) < 150) return null;
  const l = {side, y, d, h: 70 + d * 0.5}; L.push(l); return l;
}

function genChunk(D, c) {
  const r = DS.rng(DS.hash(D.seed, c, 7));
  const y0 = c * CH, mMid = (y0 + CH / 2) / M;
  if (mMid > DS.FLOOR_M) return;
  const lim = D.limY + 600;
  if (y0 > lim) return;
  const dens = (D.daily ? 1.15 : 1) * (c === 0 ? 0.9 : 1);
  let n = Math.round((2.8 + r() * 0.9) * dens);
  const later = [], o0 = D.objs.length;
  for (let i = 0; i < n; i++) {
    let y = y0 + 40 + r() * (CH - 80); if (y < 150) y = 150 + r() * 200;
    const m = y / M, side = r() < 0.5 ? -1 : 1, q = r();
    if (m > DS.SOURCE_M - 80) continue;
    let t;
    const zz = DS.zoneAt(m);
    if (q < 0.26) t = 'crate'; else if (q < 0.42) t = 'ore'; else if (q < 0.53) t = 'barrel';
    else if (q < 0.66) t = zz === 0 ? 'amphora' : zz === 1 ? (r() < 0.6 ? 'clam' : 'amphora') : (r() < 0.5 ? 'clam' : 'pod');
    else t = (m > 260 && r() < 0.35) ? 'bigwreck' : 'wreck';
    if (t === 'ore' || t === 'barrel' || t === 'clam' || t === 'amphora' || t === 'pod' || (t === 'crate' && r() < 0.45)) { later.push([t, y, side]); continue; }
    const w = DS.OBJ[t].w, d = w * 0.8 + 26;
    const l = addLedge(D, c, side, y, d); if (!l) { if (t !== 'crate') later.push(['crate', y, side]); continue; }
    const x = side * (D.hwRaw(side, y) - d * 0.55);
    addObj(D, t, x, y - DS.OBJ[t].h / 2 + 4, m, r, {side, ledge: l, rot: 0});
  }
  // second pass: things that must not end up inside a rock shelf
  for (const [t, y0b, side] of later) {
    let y = y0b, ok = false;
    for (let k = 0; k < 6 && !ok; k++) { if (k) y = y0 + 40 + r() * (CH - 80); if (y < 150) y = 150 + r() * 200;
      ok = Math.abs(D.hw(side, y) - D.hwRaw(side, y)) < 4 && Math.abs(D.hw(side, y - 30) - D.hwRaw(side, y - 30)) < 4 && Math.abs(D.hw(side, y + 30) - D.hwRaw(side, y + 30)) < 4; }
    const m = y / M; if (m > DS.SOURCE_M - 80) continue;
    if (t === 'ore' || t === 'clam') { if (!ok) continue; addObj(D, t, side * (D.hwRaw(side, y) - (t === 'clam' ? 20 : 10)), y, m, r, {side, rot: side > 0 ? Math.PI : 0}); }
    else { const hw = Math.min(D.hw(-1, y), D.hw(1, y)); addObj(D, t, (r() * 2 - 1) * hw * 0.5, y, m, r, {float: true}); }
  }
  // every chunk holds about the same total value (types vary, the sum does not) – fewer lucky or empty dives
  { let sum = 0; const reg = D.objs.slice(o0); for (const o of reg) sum += o.value;
    if (reg.length && sum > 0) { const k = 66 * DS.valueAt(mMid) * D.st.mult * (D.daily ? 1.15 : 1) * (0.92 + r() * 0.16) / sum; for (const o of reg) o.value *= k; } }
  // first chunk: two easy crates straight below the launch point
  if (c === 0) { addObj(D, 'crate', -70 + r() * 40, 230, 57, r, {float: true}); addObj(D, 'crate', 60 + r() * 50, 345, 86, r, {float: true});
    // the very first dive: a few more easy pickups on the way down, so the first upgrade is always affordable
    if (D.first) { addObj(D, 'crate', 20 + r() * 30, 165, 41, r, {float: true}); addObj(D, 'barrel', -120 + r() * 40, 290, 72, r, {float: true}); addObj(D, 'crate', -20 + r() * 40, 420, 105, r, {float: true}); } }
  // jellyfish (gentle hazard) below 250 m – and sample jellies for the jellyfish contract
  if (mMid > 250) { const nj = r() < 0.6 ? 1 + (r() < 0.4 ? 1 : 0) : 0;
    for (let i = 0; i < nj; i++) D.jellies.push({x: (r() * 2 - 1) * 300, y: y0 + r() * CH, ph: r() * 6.28, s: 0.8 + r() * 0.5, hue: r()}); }
  if (D.contract && D.contract.id === 'jelly' && mMid > 35 && mMid < D.limY / M - 10 && c % 1 === 0 && r() < 0.75) D.jellies.push({x: (r() * 2 - 1) * 260, y: y0 + 30 + r() * (CH - 60), ph: r() * 6.28, s: 0.85 + r() * 0.3, hue: r(), sample: true});
  // contract: the flight recorder to recover
  if (D.contract && D.contract.id === 'box' && !D.boxPlaced && D.contract.y >= y0 && D.contract.y < y0 + CH) { D.boxPlaced = true; const side = r() < 0.5 ? -1 : 1, y = D.contract.y;
    D.boxObj = addObj(D, 'recorder', side * (Math.min(D.hw(-1, y), D.hw(1, y)) * 0.45), y, y / M, r, {float: true, recorder: true}, true); }
  // rare spawn
  if (D.rare && !D.rarePlaced && D.rareY >= y0 && D.rareY < y0 + CH) { D.rarePlaced = true; const y = D.rareY, m = y / M;
    if (D.rare === 'treasure') { const hw = Math.min(D.hw(-1, y), D.hw(1, y)); addObj(D, 'treasure', (r() * 2 - 1) * hw * 0.5, y, m, r, {float: true, rareObj: true}, true); }
    else { const side = r() < 0.5 ? -1 : 1, d = 150; addLedge(D, c, side, y + 30, d, true); clearFor(D, 'vault', side * (D.hwRaw(side, y) - d * 0.6), y - 10); addObj(D, 'vault', side * (D.hwRaw(side, y) - d * 0.6), y - 10, m, r, {side, rot: 0, rareObj: true}, true); } }
  // first predator encounter (scripted, gentle)
  if (D.tutY != null && !D.tutPlaced && D.tutY >= y0 && D.tutY < y0 + CH) { D.tutPlaced = true; const P = Object.assign({}, DS.PRED.eel, {speed: 95, wind: 1.7, lungeT: 0.5, dmg: 2, sense: 600, lunge: 520});
    D.preds.push({id: D.nid++, type: 'eel', P, x: (r() < 0.5 ? -1 : 1) * 200, y: D.tutY + 40, hx: 0, hy: D.tutY + 40, vx: 0, vy: 0, ang: 0, st: 'wander', t: 0, cd: 1, int: 0, ph: r() * 9, tx: 0, ty: 0, dir: 0, m: D.tutY / M, tut: true}); }
  // Ice Sea: drifting ice blocks – solid, and they crack loudly when you bump them (sound draws predators there)
  if (D.region === 1 && mMid > 30) { const ni = r() < 0.55 ? 1 + (r() < 0.35 ? 1 : 0) : 0;
    for (let i = 0; i < ni; i++) { const y = y0 + 40 + r() * (CH - 80), hw = Math.min(D.hw(-1, y), D.hw(1, y)); if (Math.abs(y - D.startY) < 200 || y < 160) continue; const x = (r() * 2 - 1) * hw * 0.6;
      if (overlaps(D, x, y, 110, 90)) continue; D.ice.push({x, y, x0: x, r: 26 + r() * 26, ph: r() * 9, rot: r() * 6, v: Math.floor(r() * 3), hit: 0}); } }
  // daily expedition cache
  if (D.daily && !D.cachePlaced) { const cm = Math.min(D.st.hullM * 0.72, DS.FLOOR_M - 300); const cy = cm * M;
    if (cy >= y0 && cy < y0 + CH) { D.cachePlaced = true; addObj(D, 'cache', 0, cy, cm, r, {float: true}, true); } }
  // signal caches (black boxes) – hidden near the walls, the sonar points the way
  for (const k of D.caches) if (!k.placed && k.y >= y0 && k.y < y0 + CH) { k.placed = true;
    const x = k.side * (D.hw(k.side, k.y) - 60); const o = addObj(D, 'sigcache', x, k.y, k.y / M, r, {float: true, sig: true}, true); k.o = o; }
  // random event content
  if (D.event && !D.evPlaced && D.evY >= y0 && D.evY < y0 + CH) { D.evPlaced = true; const em = D.evY / M;
    if (D.event === 'shoal') { for (let i = 0; i < 8; i++) { const y = D.evY + (r() - 0.5) * 260, hw = Math.min(D.hw(-1, y), D.hw(1, y)); const o = addObj(D, r() < 0.7 ? 'crate' : 'barrel', (r() * 2 - 1) * hw * 0.6, y, y / M, r, {float: true, shoal: true}); if (o && r() < 0.25) { o.find = pickFind(r, o.z).id; o.gold = r() < 0.05; } } }
    else if (D.event === 'whalefall') { const side = r() < 0.5 ? -1 : 1, d = 200; addLedge(D, c, side, D.evY + 40, d, true);
      clearFor(D, 'whale', side * (D.hwRaw(side, D.evY) - d * 0.62), D.evY); addObj(D, 'whale', side * (D.hwRaw(side, D.evY) - d * 0.62), D.evY, em, r, {side, rot: 0, whale: true}, true);
      for (let i = 0; i < 2 && em > 230; i++) addPred(D, r, (r() * 2 - 1) * 200, D.evY - 200 + r() * 400, em); }
    else if (D.event === 'storm') { for (let i = 0; i < 6; i++) { const y = 170 + r() * 420, hw = Math.min(D.hw(-1, y), D.hw(1, y)); addObj(D, 'crate', (r() * 2 - 1) * hw * 0.7, y, y / M, r, {float: true, storm: true}); } } }
  // predators: from the twilight zone down, more the deeper you go (not right where the elevator stops)
  if (mMid > 230) { const pr = mMid < 1000 ? 0.3 : mMid < 4000 ? 0.38 : 0.48;
    let n = (r() < pr ? 1 : 0) + (mMid > 1500 && r() < 0.15 ? 1 : 0);
    for (let i = 0; i < n; i++) { const y = y0 + r() * CH; if (Math.abs(y - D.startY) < 320) continue; addPred(D, r, (r() * 2 - 1) * 260, y, y / M); } }
  // midnight zone: currents and pressure vents
  if (mMid > 1000 && mMid < 4000 && r() < 0.42) D.currents.push({y: y0 + 60 + r() * (CH - 120), h: 130 + r() * 110, dir: r() < 0.5 ? -1 : 1, str: 55 + r() * 50, ph: r() * 9});
  const hot = D.region >= 2;
  if ((mMid > 1150 || (hot && mMid > 300)) && r() < (hot ? 0.5 : 0.45)) { const side = r() < 0.5 ? -1 : 1, y = y0 + 40 + r() * (CH - 80);
    if (Math.abs(D.hw(side, y) - D.hwRaw(side, y)) < 4) D.vents.push({side, y, per: 4.2 + r() * 2.2, ph: r() * 6, len: hot ? 300 : 320, hit: -1, hot}); }
}
function addPred(D, r, x, y, m, extra) {
  let type = 'eel'; const q = r();
  if (m >= 4000) type = q < 0.45 ? 'squid' : q < 0.8 ? 'angler' : 'eel'; else if (m >= 1050) type = q < 0.55 ? 'angler' : q < 0.7 ? 'viper' : 'eel'; else if (m >= 330) type = q < 0.45 ? 'viper' : 'eel';
  const P = DS.PRED[type];
  const p = {id: D.nid++, type, P, x, y, hx: x, hy: y, vx: 0, vy: 0, ang: r() < 0.5 ? 0 : Math.PI, st: 'wander', t: 0, cd: 1, int: 0, ph: r() * 9, tx: 0, ty: 0, dir: 0, m, ...(extra || {})};
  D.preds.push(p); return p;
}
// predators keep finding you: a hunter arrives from the dark every so often – far more often with the light on (or loud in the Ice Sea)
function hunt(D, dt, m0) {
  if (m0 < 240 || D.phase !== 'dive' || D.t < 4) return;
  const s = D.sub, lure = DS.lureK(D, !!D.drillAt);
  const dark = D.st.lure === 'light' && !D.light;
  // rushing straight down is risky: every few seconds of full-speed descent something may wait right in your path
  // (announced: a message, red eyes and an edge marker well before it strikes – steer aside or brake). Light on or off.
  if (s.vy > 300 && Math.hypot(s.vx, s.vy) > D.st.hspeed * 1.6 && m0 > 300) { D.rushT = (D.rushT || 0) + dt;
    if (D.rushT > (D.rushNext || 2) && (D.ambushN || 0) < 2) { D.rushNext = D.rushT + 7 + D.r() * 3; const y = s.y + s.vy * 2.4, hw = Math.min(D.hw(-1, y), D.hw(1, y)) - 40;
      if (D.r() < (dark ? 0.38 : 0.28) && y < D.limY - 60) { D.ambushN = (D.ambushN || 0) + 1; const p = addPred(D, D.r, clamp(s.x + (D.r() - 0.5) * 50, -hw, hw), y, y / M, {hunter: true, ambush: true}); p.int = 0.6; p.heard = 8; D.ev.push({type: 'hunter', p}); D.ev.push({type: 'ambush', p}); } } }
  // sitting still in the dark is not 100 % safe: after a while in the dark (twilight zone and deeper, light seas only)
  // something comes to look. It is announced, it can be scared off by switching the light on (or a flare), and it only bites.
  if (dark && D.lurkOn && m0 >= 200 && D.phase === 'dive') { D.darkRun = (D.darkRun || 0) + dt;
    if (D.darkRun > D.lurkAt && !D.preds.some(p => p.lurk)) { D.darkRun = 0; D.lurkAt = 26 + D.r() * 16;
      const side = D.r() < 0.5 ? -1 : 1, y = s.y + (D.r() - 0.5) * 160, hw = Math.min(D.hw(-1, y), D.hw(1, y)) - 40;
      if (y > 230 * M && y < D.limY - 40) { const p = addPred(D, D.r, clamp(s.x + side * 520, -hw, hw), y, y / M, {hunter: true, lurk: true}); p.int = 0.55; D.ev.push({type: 'lurk', p}); } } }
  else D.darkRun = Math.max(0, (D.darkRun || 0) - dt * 2);
  D.huntT -= dt * (lure > 0.5 ? 1 : lure > 0.3 ? (dark ? 1 : 0.5) : 0.18);
  if (D.huntT > 0) return;
  D.huntT = (m0 < 1000 ? 20 : m0 < 4000 ? 16 : 13) + D.r() * 8;
  let near = 0; for (const p of D.preds) if (Math.abs(p.y - s.y) < 900 && Math.abs(p.x - s.x) < 900 && p.st !== 'retreat') near++;
  if (near >= 1) return;
  // light off but loud (drilling, rushing): a hunter has heard you – it follows for a few seconds (announced, never instant)
  const heard = dark && lure > 0.3 && D.r() < 0.35;
  const side = D.r() < 0.5 ? -1 : 1, y = s.y + (D.r() < 0.6 ? 1 : -0.4) * (380 + D.r() * 180), hw = Math.min(D.hw(-1, y), D.hw(1, y)) - 40;
  if (y < 230 * M) return;
  const p = addPred(D, D.r, clamp(side * hw * 0.8, -hw, hw), y, y / M, {hunter: true}); p.int = heard ? 0.45 : 0.25; if (heard) p.heard = 6; D.ev.push({type: 'hunter', p});
}
function genTo(D, y) { const c1 = Math.floor(y / CH); while (D.gen < c1) { D.gen++; genChunk(D, D.gen); } }

// a single find is never worth more than about a third of a full hold at that depth (no luck spikes)
DS.findCap = (D, m) => 0.12 * D.cap * 5.5 * DS.valueAt(m) * D.st.mult * (D.daily ? 1.15 : 1);
function spawnPiece(D, o, fx, fy, find) {
  const a = D.r() * Math.PI * 2, sp = 60 + D.r() * 90;
  const base = o.value / o.np * D.st.lootK;
  let v = base, gold = false;
  if (find) { const F = DS.FIND[find]; v = base * 4 * DS.RAR_MULT[F.r] * (1 + 0.15 * D.st.decoder); gold = o.gold; if (gold) v *= 3; v = Math.min(v, DS.findCap(D, o.m) * (gold ? 1.25 : 1)); }
  D.pieces.push({x: fx, y: fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, v, mat: o.mat, find: find || null, gold, age: 0, st: 0, nopick: 0.25, m: o.m});
}
function breakObj(D, o, fx, fy) {
  while (o.rel < o.np) { o.rel++; spawnPiece(D, o, fx + (D.r() - .5) * o.w * .5, fy + (D.r() - .5) * o.h * .5); }
  if (o.find) spawnPiece(D, o, fx, fy, o.find);
  if (o.t === 'sigcache' || o.t === 'whale') for (let i = 0; i < 2; i++) spawnPiece(D, o, fx, fy);
  o.broken = true; o.hp = 0;
  if (o.t === 'wreck' || o.t === 'bigwreck' || o.t === 'whale' || o.t === 'vault') D.cnt.wrecks++;
  if (o.t === 'ore') D.cnt.ores++;
  if (o.t === 'recorder' && D.contract && D.contract.id === 'box') { D.contract.prog = 1; }
  if (o.t === 'vault' || o.t === 'treasure') D.ev.push({type: 'rareopen', o});
  if (o.t === 'sigcache') { D.cnt.caches++; let echo = -1; if (D.echoN < DS.ECHOES.length) echo = D.echoN++; D.ev.push({type: 'cacheopen', x: o.x, y: o.y, echo}); }
  // the abyss: big wrecks collapse – rocks rain down after a short dust warning
  if (o.m >= 4000 && (o.t === 'wreck' || o.t === 'bigwreck' || o.t === 'whale')) { const n = o.t === 'wreck' ? 3 : 4;
    for (let i = 0; i < n; i++) D.rocks.push({x: o.x + (D.r() - 0.5) * (o.w + 60), y: o.y - 230 - D.r() * 90, vy: 0, warn: 0.8 + i * 0.18, r: 9 + D.r() * 7, rot: D.r() * 6, t: 0, y0: o.y + 320}); D.ev.push({type: 'collapse', x: o.x, y: o.y}); }
  D.ev.push({type: 'break', x: o.x, y: o.y, o});
}
// closest point on an object's box
function closest(o, x, y) { return {x: clamp(x, o.x - o.w / 2, o.x + o.w / 2), y: clamp(y, o.y - o.h / 2, o.y + o.h / 2)}; }
DS.closest = closest;

DS.step = function (D, dt, inp) {
  // sub-step for frame-rate independence
  let n = Math.ceil(dt / (1 / 60) - 1e-6); if (n < 1) n = 1; const h = dt / n;
  for (let i = 0; i < n; i++) { step1(D, h, inp); inp.surface = false; inp.charge = false; inp.light = false; inp.flare = false; }
};
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

function step1(D, dt, inp) {
  const s = D.sub, st = D.st;
  D.t += dt;
  if (D.phase === 'done') return;
  genTo(D, s.y + 1700);
  let tx = 0, ty = 0, k = 3.2;
  let mx = clamp(inp.mx || 0, -1, 1), my = clamp(inp.my || 0, -1, 1);
  const m0 = Math.max(0, s.y / M);
  // trench: signal interference twists the controls for a moment
  if (D.intf > 0) { [mx, my] = rot(mx, my, D.intfA + Math.sin(D.t * 7) * 0.35); }
  D.drillAt = null; let drilling = false;
  if (D.useCd > 0) D.useCd -= dt; if (D.lightCd > 0) D.lightCd -= dt; if (D.noiseT > 0) D.noiseT -= dt; if (D.lockT > 0) D.lockT -= dt;
  if (inp.light && D.lightCd <= 0) { D.lightCd = 0.03; D.light = !D.light; D.ev.push({type: 'light', on: D.light}); if (!D.light && D.grab && st.lure !== 'sound') releaseGrab(D); }

  if (D.phase === 'launch') {
    ty = 220; tx = mx * st.hspeed * 0.5;
    if (s.y >= 10) { if (D.startY > 0) { D.phase = 'lift'; D.ev.push({type: 'lift'}); } else { D.phase = 'dive'; D.ev.push({type: 'splashdown'}); } }
  } else if (D.phase === 'lift') {
    // elevator cable: fast, no oxygen used
    const sp = Math.max(1500, D.startY / 2.2); ty = s.y < D.startY - 300 ? sp : Math.max(120, (D.startY - s.y) * 4); tx = mx * st.hspeed * 0.3; k = 5;
    if (s.y >= D.startY - 6) { D.phase = 'dive'; D.ev.push({type: 'liftdone'}); }
  } else if (D.phase === 'cine') {
    tx = ((D.cineX || 0) - s.x) * 0.9; ty = ((D.cineY || s.y) - s.y) * 0.9; k = 1.6;
  } else if (D.phase === 'dive') {
    D.o2 -= dt; D.diveT = (D.diveT || 0) + dt;
    tx = mx * st.hspeed;
    ty = my > 0 ? st.descent * (1 + 0.7 * my) : st.descent + my * (st.descent + st.hspeed * 0.85);
    // the abyss and the trench: crushing pressure slows every descent (fast builds cannot rush past the hazards)
    if (m0 >= 4000 && ty > 0) ty = Math.min(ty, Math.max(st.descent * 0.8, 70 * M));
    // jellyfish samples (contract): drilling right next to a sample jelly takes a sample, no sting
    if (inp.drill && D.contract && D.contract.id === 'jelly') for (const j of D.jellies) { if (!j.sample || j.taken || j.cx == null) continue;
      if (Math.hypot(j.cx - s.x, j.cy - s.y) < 75) { j.taken = true; D.contract.prog++; D.cnt.samples++; D.stingCd = Math.max(D.stingCd, 0.8); D.ev.push({type: 'sample', x: j.cx, y: j.cy}); } }
    // drilling
    if (inp.drill && !D.grab) {
      let best = null, bd = 1e9;
      const reach = D.limY + 10;
      for (const o of D.objs) { if (o.broken || Math.abs(o.y - s.y) > 260 || o.y - o.h / 2 > reach) continue;
        const p = closest(o, s.x, s.y); let d = Math.hypot(p.x - s.x, p.y - s.y);
        if (mx || my) d -= ((p.x - s.x) * mx + (p.y - s.y) * my) / Math.max(1, d) * 50; // prefer what the player steers toward
        if (d < bd) { bd = d; best = o; } }
      if (best) { const p = closest(best, s.x, s.y); bd = Math.hypot(p.x - s.x, p.y - s.y); }
      if (best && bd < 190) { D.anchor = 0.25;
        const p = closest(best, s.x, s.y), dx = p.x - s.x, dy = p.y - s.y, d = Math.max(1, Math.hypot(dx, dy));
        s.face = dx >= 0 ? 1 : -1;
        const want = 46;
        // gentle assist toward the target, the player can still pull away
        const ax = clamp((dx - dx / d * want) * 5, -st.hspeed, st.hspeed), ay = clamp((dy - dy / d * want) * 5, -st.hspeed, st.hspeed);
        const pull = 1 - 0.6 * Math.min(1, Math.hypot(mx, my));
        tx = tx * (1 - pull) + ax * pull; ty = (my * st.hspeed * 0.5) * (1 - pull) + ay * pull; k = 6;
        if (d < 62 && best.req && st.drillLv < best.req) { D.drillObj = best; if (D.lockT <= 0) { D.lockT = 1.4; D.ev.push({type: 'locked', o: best}); } }
        else if (d < 62) {
          drilling = true; D.drillAt = {x: p.x, y: p.y}; D.drillObj = best;
          best.hp -= st.dps * dt; best.shake = 0.15; D.drillT += dt;
          const want2 = Math.floor((1 - Math.max(0, best.hp) / best.hpMax) * (best.np - 1));
          while (best.rel < want2) { best.rel++; spawnPiece(D, best, p.x, p.y); D.ev.push({type: 'chunk', x: p.x, y: p.y}); }
          if (best.hp <= 0) breakObj(D, best, p.x, p.y);
        }
      }
    }
    if (!drilling && !(D.drillObj && D.drillObj.req && D.lockT > 0)) D.drillObj = null;
    // hull limit
    const lim = D.limY - 30;
    if (s.y > lim - 40 && ty > 0) ty = Math.min(ty, (lim - s.y) * 2.2);
    if (s.y > lim) { ty = Math.min(ty, -40); }
    if (s.y > lim - 8 && (my > 0.3 || !drilling) && st.hullM < DS.FLOOR_M) { D.creakT -= dt; if (D.creakT <= 0) { D.creakT = 1.6; D.ev.push({type: 'creak'}); } }
    // sea floor
    const floor = DS.FLOOR_M * M - 40; if (s.y > floor) ty = Math.min(ty, (floor - s.y) * 3);
    if (D.grab) { tx = 0; ty = 0; k = 9; }
    if (inp.surface) { D.phase = 'ascent'; releaseGrab(D); D.ev.push({type: 'ascent'}); }
    if (D.o2 <= 0) emergency(D);
    // sonar ping (every sub has a basic one; the upgrade widens it). It also points toward the nearest signal cache.
    if (m0 > 150 || D.sig.str > 0) D.pingT -= dt; if (D.pingT <= 0) { D.pingT = 5; for (const o of D.objs) { if (o.broken) continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < st.sonar || (o.sig && d < st.sonar * 1.6)) o.rev = o.sig ? 4.5 : 3.2; }
      D.ev.push({type: 'ping', str: D.sig.str}); }
    // depth charge
    if (inp.charge && D.charges > 0 && D.useCd <= 0) { D.charges--; D.useCd = 0.8; D.ev.push({type: 'blast', x: s.x, y: s.y});
      for (const o of D.objs) if (!o.broken && Math.hypot(o.x - s.x, o.y - s.y) < 330 && !(o.req && st.drillLv < o.req)) breakObj(D, o, o.x, o.y);
      for (const p of D.preds) if (Math.hypot(p.x - s.x, p.y - s.y) < 420 && p.st !== 'retreat') { p.st = 'retreat'; p.t = 2.5; p.int = 0; } }
    // decoy flare
    if (inp.flare && D.flares > 0 && D.useCd <= 0) { D.flares--; D.useCd = 0.8; D.cnt.flares++; D.flaresOut.push({x: s.x - s.face * 20, y: s.y + 12, vx: -s.face * 70, vy: 40, t: 7}); D.ev.push({type: 'flare'}); }
    if (!D.light) { D.darkMax = Math.max(D.darkMax, m0); if (m0 > 30) D.darkT += dt; }
    if (m0 >= 4000 && !D.abyssIn) { D.abyssIn = true; D.waveT = Math.min(D.waveT, 3.2 + D.r() * 2); }
    if (m0 >= 6000 && !D.trenchIn) { D.trenchIn = true; D.intfT = Math.min(D.intfT, 2.6 + D.r() * 2); }
    hunt(D, dt, m0);
    // abyss: pressure waves – hold on to a wreck (keep drilling) to brace
    if (m0 >= 4000 && D.t > 3) { D.waveT -= dt;
      if (D.waveT < 1.7 && !D.waveWarn) { D.waveWarn = true; D.ev.push({type: 'wavewarn'}); }
      if (D.waveT <= 0) { D.waveT = 11 + D.r() * 7; D.waveWarn = false;
        if (drilling) D.ev.push({type: 'wave', braced: true}); else { s.vy -= 560; s.vx += (D.r() - 0.5) * 260; D.push = 0.6; D.o2 = Math.max(Math.min(D.o2, 1), D.o2 - 2 * st.armor); D.ev.push({type: 'wave', braced: false, dmg: 2 * st.armor}); } } }
    // trench: signal interference
    if (m0 >= 6000 && D.t > 3) { if (D.intf > 0) { D.intf -= dt; if (D.intf <= 0) { D.intf = 0; D.ev.push({type: 'intfend'}); } }
      else { D.intfT -= dt; if (D.intfT < 1.4 && !D.intfWarn) { D.intfWarn = true; D.ev.push({type: 'intfwarn'}); }
        if (D.intfT <= 0) { D.intfT = 9 + D.r() * 6; D.intfWarn = false; D.intf = 2.3; D.intfA = (D.r() < 0.5 ? -1 : 1) * (0.9 + D.r() * 0.5); D.ev.push({type: 'intf'}); } } }
  } else if (D.phase === 'ascent') {
    // oxygen still runs during a normal ascent – running dry on the way up is an emergency too
    if (!D.emergency) { D.o2 -= dt; if (D.o2 <= 0) emergency(D); }
    tx = mx * st.hspeed; ty = -D.ascent * (D.emergency ? 1.5 : 1); k = 2.5;
    if (s.y <= 0) { D.phase = 'done'; D.done = true; s.y = 0; if (D.contract && D.contract.id === 'haul' && !D.contract.done && !D.emergency && D.hold.length >= D.contract.n) { D.contract.prog = D.hold.length; D.contract.done = true; D.ev.push({type: 'cdone', c: D.contract}); } D.ev.push({type: 'surfaced'}); return; }
  }
  // motion
  s.vx = ease(s.vx, tx, k, dt); s.vy = ease(s.vy, ty, k, dt);
  s.x += s.vx * dt; s.y += s.vy * dt;
  // a pressure wave keeps lifting the sub for a moment
  if (D.push > 0) { s.y -= 420 * (D.push / 0.6) * dt; D.push -= dt; }
  // never overshoot the waterline on the way up (the next step ends the dive)
  if (D.phase === 'ascent' && s.y < 0) { s.y = 0; if (s.vy < 0) s.vy = 0; }
  // midnight currents push the sub (and loose loot) sideways
  // (near a wreck the drill arm anchors the sub: currents push much less, so you can always reach what you drill)
  if (D.anchor > 0) D.anchor -= dt;
  if (D.phase === 'dive' || D.phase === 'ascent') for (const c of D.currents) { const f = 1 - Math.abs(s.y - c.y) / (c.h / 2); if (f > 0) s.x += c.dir * c.str * Math.min(1, f * 1.6) * dt * (D.anchor > 0 ? 0.3 : 1); }
  // steering up to the waterline counts as surfacing (after a real dive); never float above the water
  if (D.phase === 'dive' && s.y <= 0) {
    if ((D.maxM || 0) >= 20) { s.y = 0; s.vy = 0; D.phase = 'ascent'; releaseGrab(D); D.ev.push({type: 'ascent'}); }
    else { s.y = 0; if (s.vy < 0) s.vy = 0; }
  }
  if (!drilling && Math.abs(s.vx) > 12) s.face = s.vx > 0 ? 1 : -1;
  if (D.phase === 'cine') s.face = s.x < 40 ? 1 : -1;
  s.tilt = ease(s.tilt, clamp(s.vy / 900, -0.25, 0.25) * s.face + (drilling ? Math.sin(D.t * 60) * 0.02 : 0), 6, dt);
  // pressure vents (jets from the walls)
  if (D.phase === 'dive') for (const v of D.vents) { if (Math.abs(v.y - s.y) > 400) continue; const c = (D.t + v.ph) % v.per;
    v.warn = c > v.per - 1.2; v.on = c < 0.85;
    if (v.on) { const x0 = v.side * D.hw(v.side, v.y), dd = (x0 - s.x) * v.side; if (dd > 0 && dd < v.len && Math.abs(s.y - v.y) < 60) { const f = 1 - dd / v.len; s.x -= v.side * 520 * f * dt; s.vy += (s.y < v.y ? -1 : 1) * 120 * dt; if (v.hit !== Math.floor((D.t + v.ph) / v.per)) { v.hit = Math.floor((D.t + v.ph) / v.per); let dmg = 0; if (v.hot) { dmg = 1.5 * st.armor; D.o2 = Math.max(Math.min(D.o2, 1), D.o2 - dmg); } D.ev.push({type: 'vent', x: s.x, y: s.y, hot: v.hot, dmg}); } } } }
  // walls
  if (s.y > 0) for (const side of [-1, 1]) {
    const w = Math.min(D.hw(side, s.y - 14), D.hw(side, s.y), D.hw(side, s.y + 14)) - 34;
    if (side * s.x > w) { s.x = side * w; if (side * s.vx > 0) { if (Math.abs(s.vx) > 120) D.ev.push({type: 'bump'}); s.vx *= -0.3; } }
  }
  const m = Math.max(0, s.y / M);
  if (m > D.maxM) {
    D.maxM = m;
    const SL = DS.sigList(D.region); while (D.sigN < SL.d.length && D.maxM >= SL.d[D.sigN]) { D.ev.push({type: 'signal', i: D.sigN, region: D.region}); D.sigN++; }
    if (!D.srcHit && D.maxM >= DS.SOURCE_M - 20) { D.srcHit = true; D.ev.push({type: 'source'}); }
  }
  if (D.event && !D.evDone && D.evPlaced && Math.abs(s.y - D.evY) < 260 && D.phase === 'dive') { D.evDone = true; D.ev.push({type: 'evreach', e: D.event}); }
  if (D.rare && !D.rareSeen && D.rarePlaced && Math.abs(s.y - D.rareY) < 380 && D.phase === 'dive') { D.rareSeen = true; D.ev.push({type: 'rarenear', r: D.rare}); }
  // contract progress
  const C = D.contract; if (C && !C.done) { const p0 = C.prog;
    if (C.id === 'wrecks') C.prog = D.cnt.wrecks; else if (C.id === 'ore') C.prog = D.cnt.ores; else if (C.id === 'dark') C.prog = Math.floor(D.darkT);
    else if (C.id === 'deep') C.prog = D.maxM >= C.m ? 1 : 0; else if (C.id === 'haul') C.prog = D.hold.length;
    const goal = C.id === 'box' || C.id === 'deep' ? 1 : C.n;
    if (C.id !== 'haul' && C.prog >= goal) { C.done = true; D.ev.push({type: 'cdone', c: C}); } else if (C.prog > p0 && C.id !== 'dark' && C.id !== 'haul') D.ev.push({type: 'cprog', c: C}); }
  // ice blocks: solid, drift slowly, crack loudly when hit
  for (const b of D.ice) { if (Math.abs(b.y - s.y) > 600) continue; b.x = b.x0 + Math.sin(D.t * 0.25 + b.ph) * 40; const dx = s.x - b.x, dy = s.y - b.y, d = Math.hypot(dx, dy), rr = b.r + 26;
    if (d < rr && (D.phase === 'dive' || D.phase === 'ascent')) { const nx = dx / Math.max(d, 1), ny = dy / Math.max(d, 1), vn = s.vx * nx + s.vy * ny; s.x = b.x + nx * rr; s.y = b.y + ny * rr;
      if (vn < 0) { s.vx -= vn * nx * 1.4; s.vy -= vn * ny * 1.4; } if (D.phase === 'dive' && -vn > 90 && b.hit <= 0) { b.hit = 1; D.noiseT = 1.6; if (-vn > 220) D.o2 = Math.max(Math.min(D.o2, 1), D.o2 - 1 * st.armor); D.ev.push({type: 'ice', x: b.x, y: b.y, hard: -vn > 220}); } }
    if (b.hit > 0) b.hit -= dt; }
  // warnings
  // oxygen needed to surface from here: exact ascent time (see DS.ascentTime) + 3 % + 0.5 s safety margin
  D.needExact = DS.ascentTime(s.y, s.vy, D.ascent); const need = D.needExact * 1.03 + 0.5;
  D.need = need;
  // warning threshold: marker + 3 s reaction time + what nearby dangers could still cost before you react
  D.reserve = 3 + threatO2(D); D.warnAt = need + D.reserve;
  if (D.phase === 'dive') { const low = D.o2 < D.o2max * 0.25 || D.o2 < D.warnAt; if (low) { D.warnT -= dt; if (D.warnT <= 0) { D.warnT = D.o2 < D.o2max * 0.1 ? 0.5 : 1; D.ev.push({type: 'warn'}); } } }
  // objects
  for (const o of D.objs) { if (o.shake > 0) o.shake -= dt; if (o.rev > 0) o.rev -= dt; }
  // signal strength + direction to the nearest unopened cache
  let bd = 1e9, ba = 0; for (const c of D.caches) { const o = c.o; if (!o || o.broken) { if (!c.placed && c.y < D.limY) { const d = Math.abs(c.y - s.y) + 200; if (d < bd) { bd = d; ba = Math.atan2(c.y - s.y, c.side * 300 - s.x); } } continue; }
    const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bd) { bd = d; ba = Math.atan2(o.y - s.y, o.x - s.x); } }
  D.sig.d = bd; D.sig.ang = ba; D.sig.str = bd < 1e8 ? clamp(1 - bd / 3200, 0.05, 1) : 0;
  // jellyfish
  if (D.stingCd > 0) D.stingCd -= dt;
  for (const j of D.jellies) {
    const jx = j.x + Math.sin(D.t * 0.25 + j.ph) * 60, jy = j.y + Math.sin(D.t * 0.6 + j.ph) * 24;
    j.cx = jx; j.cy = jy;
    if (D.phase === 'dive' && D.stingCd <= 0 && !j.taken && Math.hypot(jx - s.x, jy - s.y) < 34 * j.s) {
      D.stingCd = 1.6; D.o2 = Math.max(0.1, D.o2 - 3 * st.armor); const a = Math.atan2(s.y - jy, s.x - jx); s.vx += Math.cos(a) * 260; s.vy += Math.sin(a) * 260;
      D.ev.push({type: 'sting', x: jx, y: jy});
    }
  }
  updPreds(D, dt, drilling);
  updRocks(D, dt);
  for (let i = D.flaresOut.length - 1; i >= 0; i--) { const f = D.flaresOut[i]; f.t -= dt; f.vx = ease(f.vx, 0, 1.5, dt); f.vy = ease(f.vy, 22, 1.2, dt); f.x += f.vx * dt; f.y += f.vy * dt; if (f.t <= 0) D.flaresOut.splice(i, 1); }
  // loot pieces
  const pickR = 40 + st.magnet;
  if (D.fullT > 0) D.fullT -= dt;
  for (let i = D.pieces.length - 1; i >= 0; i--) {
    const p = D.pieces[i]; p.age += dt; if (p.nopick > 0) p.nopick -= dt;
    const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
    if (p.st === 0) {
      p.vx = ease(p.vx, 0, 2.2, dt); p.vy = ease(p.vy, -6, 2.2, dt);
      if (d < pickR && p.nopick <= 0 && D.phase !== 'launch' && D.phase !== 'lift') {
        if (D.hold.length < D.cap) p.st = 1;
        else if (D.fullT <= 0) { D.fullT = 1.2; D.ev.push({type: 'full', x: p.x, y: p.y}); p.nopick = 1; }
      }
      if (p.age > 16) { D.pieces.splice(i, 1); continue; }
    } else {
      const sp = 380 + p.age * 60; p.vx = ease(p.vx, dx / Math.max(d, 1) * sp, 9, dt); p.vy = ease(p.vy, dy / Math.max(d, 1) * sp, 9, dt);
      if (d < 18) {
        D.pieces.splice(i, 1);
        if (D.hold.length < D.cap) { D.hold.push({v: p.v, mat: p.mat, find: p.find, gold: p.gold}); D.ev.push({type: 'pick', x: s.x, y: s.y, v: p.v, find: p.find, gold: p.gold}); }
        else { D.ev.push({type: 'full', x: s.x, y: s.y}); }
        continue;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

// ---------- oxygen / ascent maths ----------
// During the ascent the vertical speed follows v(t) = -A + (v0 + A)·e^(-k t) (k = 2.5, A = ascent speed incl. winch),
// so the depth is y(t) = y0 - A·t + (v0 + A)·(1 - e^(-k t)) / k. The ascent time T solves y(T) = 0 (Newton iteration).
// Nothing else can drain oxygen once you surface: predators, jellyfish, rocks, vents and pressure waves only act while diving,
// currents push sideways only, and a squid lets go the moment you surface.
DS.ascentTime = (y0, v0, A, k = 2.5) => {
  if (y0 <= 0) return 0; const c = v0 + A; let t = Math.max(0.05, y0 / A);
  for (let i = 0; i < 30; i++) { const e = Math.exp(-k * t), f = y0 - A * t + c * (1 - e) / k, df = -A + c * e; const nt = t - f / df; if (!(nt > 0)) { t /= 2; continue; } if (Math.abs(nt - t) < 1e-6) { t = nt; break; } t = nt; }
  return t;
};
// oxygen that dangers right next to the sub could still take before the player reacts (used for the warning only)
function threatO2(D) {
  const s = D.sub, m = s.y / M; let r = 0;
  for (const p of D.preds) { if (!(p.st === 'stalk' || p.st === 'wind' || p.st === 'grab')) continue; if (Math.hypot(p.x - s.x, p.y - s.y) > 700) continue;
    const P = p.P; r = Math.max(r, (P.hit === 'bite' ? P.dmg * (1 + Math.min(1, m / 5000)) : P.hit === 'grab' ? P.drain * P.grabT : 0) * D.st.armor); }
  if (D.waveWarn) r = Math.max(r, 2); if (D.rocks.length) r = Math.max(r, 3);
  for (const v of D.vents) if (v.hot && Math.abs(v.y - s.y) < 200) { r = Math.max(r, 1.5 * D.st.armor); break; }
  return r;
}
function emergency(D) {
  const st = D.st; D.o2 = 0; D.phase = 'ascent'; D.emergency = true; releaseGrab(D);
  const keepN = Math.round(D.hold.length * st.keep);
  // shuffle out the lost part
  const lostIt = [];
  while (D.hold.length > keepN) lostIt.push(D.hold.splice(Math.floor(D.r() * D.hold.length), 1)[0]);
  D.lost = lostIt.reduce((a, b) => a + b.v, 0);
  D.ev.push({type: 'emergency', lost: lostIt});
}

// ---------- predators ----------
function releaseGrab(D) { if (!D.grab) return; const p = D.grab.p; p.st = 'retreat'; p.t = 2.4; p.int = 0; p.cd = 4; D.grab = null; D.ev.push({type: 'release'}); }
// how strongly the sub draws predators (0..1 of their sense radius)
DS.lureK = (D, drilling, lightOnly) => {
  const s = D.sub, st = D.st, spd = Math.hypot(s.vx, s.vy);
  const light = D.light ? (1 - st.filter) * st.lightLure : 0, noise = Math.min(1.2, (drilling ? 0.62 : 0) + Math.min(1, spd / (st.hspeed * 1.5)) * 0.3 + (D.noiseT > 0 ? 0.7 : 0)) * (1 - st.silent) * st.noiseK;
  if (st.lure === 'sound') return Math.max(0.14, noise * 1.3, light * 0.22);
  if (st.lure === 'both') return Math.max(0.14, light * 0.85, noise * 1.1);
  if (lightOnly) return Math.max(0.14, light);
  // rushing (much faster than cruising) is loud: with the light off it still carries a small risk
  const rush = Math.min(1, Math.max(0, spd / st.hspeed - 1.15) / 0.9) * (1 - st.silent) * st.noiseK;
  return Math.max(0.14, light, noise * 0.6, rush * 0.5);
};
// a predator only starts its strike where the player can see it (the game sets D.view to the visible area; the sim has none)
const inView = (D, p) => !D.view || (Math.abs(p.x - D.view.x) < D.view.hw && Math.abs(p.y - D.view.y) < D.view.hh);
function updPreds(D, dt, drilling) {
  const s = D.sub, active = D.phase === 'dive' && !D.emergency;
  const lk = DS.lureK(D, drilling); D.lure = lk; const lkL = DS.lureK(D, drilling, true);
  let threat = 0;
  for (const p of D.preds) {
    if (Math.abs(p.y - s.y) > 1500) continue;
    const P = p.P; p.t -= dt; if (p.cd > 0) p.cd -= dt;
    const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
    // a decoy flare nearby is far more interesting than the sub
    let fl = null; for (const f of D.flaresOut) if (Math.hypot(f.x - p.x, f.y - p.y) < 950) { fl = f; break; }
    const lureR = (p.tut ? lkL : lk) * P.sense;
    if (active && !fl && d < lureR) p.int = Math.min(1, p.int + dt * (1.7 - d / lureR)); else p.int = Math.max(0, p.int - dt * (D.light ? 0.55 : 1.25) * (fl ? 3 : 1));
    if (p.heard > 0) { p.heard -= dt; if (active && !fl) p.int = Math.max(p.int, p.ambush ? 0.6 : 0.4); }
    // the lurker: drawn to a sub that hides in the dark; light (or a flare) scares it away
    if (p.lurk) { if (active && !fl && !D.light) p.int = Math.max(p.int, 0.6);
      else if (active && (D.light || fl) && d < 900 && p.st !== 'retreat') { p.lurk = false; p.st = 'retreat'; p.t = 3; p.int = 0; p.cd = 4; D.ev.push({type: 'lurkflee', p}); } }
    let tx = 0, ty = 0, kk = 2, sp = P.speed;
    if (p.st === 'wander') {
      const gx = (fl ? fl.x : p.hx) + Math.sin(D.t * 0.31 + p.ph) * (fl ? 70 : 170), gy = (fl ? fl.y : p.hy) + Math.sin(D.t * 0.53 + p.ph) * (fl ? 40 : 70);
      tx = clamp((gx - p.x) * 0.8, -sp * 0.6, sp * 0.6); ty = clamp((gy - p.y) * 0.8, -sp * 0.5, sp * 0.5);
      if (p.int > 0.35 && active) { p.st = 'stalk'; D.ev.push({type: 'pstalk', p, dark: !D.light}); }
    } else if (p.st === 'stalk' && p.ambush) {
      // ambush: holds its spot in your path and coils up so that it strikes just as you arrive
      tx = (p.hx - p.x) * 0.8; ty = (p.hy - p.y) * 0.8; const close = -(s.vx * dx + s.vy * dy) / Math.max(d, 1);
      if (p.int < 0.15 || !active || p.heard <= 0) { p.st = 'wander'; p.ambush = false; p.hx = p.x; p.hy = p.y; }
      else if (p.cd <= 0 && d < 1400 && (d < 240 || (close > 60 && d / close < P.wind + 0.12))) { p.st = 'wind'; p.t = P.wind; p.tx = s.x + s.vx * 0.3; p.ty = s.y + s.vy * 0.3; D.ev.push({type: 'pwind', p}); }
    } else if (p.st === 'stalk') {
      const v = sp * (0.55 + 0.65 * p.int); tx = dx / Math.max(d, 1) * v; ty = dy / Math.max(d, 1) * v;
      if (d < 150) { tx *= -0.3; ty *= -0.3; } // keep a little distance before striking
      if (p.int < 0.15 || !active) { p.st = 'wander'; p.hx = p.x; p.hy = p.y; }
      else if (d < 240 && p.cd <= 0 && p.int > 0.5 && inView(D, p)) { p.st = 'wind'; p.t = P.wind; p.tx = s.x + s.vx * 0.3; p.ty = s.y + s.vy * 0.3; D.ev.push({type: 'pwind', p}); }
    } else if (p.st === 'wind') {
      // telegraph: it coils back, eyes flare up. Light off now = it loses interest.
      p.tx = ease(p.tx, s.x + s.vx * 0.3, 3, dt); p.ty = ease(p.ty, s.y + s.vy * 0.3, 3, dt);
      const a = Math.atan2(p.ty - p.y, p.tx - p.x); tx = -Math.cos(a) * 40; ty = -Math.sin(a) * 40; kk = 5; p.ang = a;
      if ((p.int < 0.3 && !p.lurk) || !active) { p.st = 'wander'; p.hx = p.x; p.hy = p.y; p.cd = 2.5; D.cnt.dodges++; D.ev.push({type: 'pabort', p}); }
      else if (p.t <= 0) { p.st = 'lunge'; p.t = P.lungeT; p.dir = a; D.ev.push({type: 'plunge', p}); }
    } else if (p.st === 'lunge') {
      // the lunge tracks the sub a little during its first part (straight rushing is no longer safe)
      if (p.t > P.lungeT * 0.5) { const want = Math.atan2(s.y - p.y, s.x - p.x); let da = want - p.dir; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; p.dir += clamp(da, -1.6 * dt, 1.6 * dt); p.ang = p.dir; }
      tx = Math.cos(p.dir) * P.lunge; ty = Math.sin(p.dir) * P.lunge; kk = 14;
      const hx = p.x + Math.cos(p.dir) * P.len * 0.4, hy = p.y + Math.sin(p.dir) * P.len * 0.4;
      if (active && Math.hypot(s.x - hx, s.y - hy) < 36 + P.len * 0.08) hitSub(D, p);
      else if (p.t <= 0) { p.st = 'retreat'; p.t = 1.6; p.cd = 3; D.cnt.dodges++; D.ev.push({type: 'pmiss', p}); }
    } else if (p.st === 'grab') {
      tx = (s.x - Math.cos(p.ang) * 60 - p.x) * 6; ty = (s.y - Math.sin(p.ang) * 60 - p.y) * 6; kk = 10;
      if (D.grab && D.grab.p === p) { D.grab.t -= dt; D.o2 = Math.max(Math.min(D.o2, 1), D.o2 - P.drain * dt); if (D.grab.t <= 0 || !active) releaseGrab(D); } else { p.st = 'retreat'; p.t = 2; }
    } else if (p.st === 'retreat') {
      tx = -dx / Math.max(d, 1) * sp * 1.25; ty = -dy / Math.max(d, 1) * sp * 0.9;
      if (p.t <= 0) { p.st = 'wander'; p.hx = p.x; p.hy = p.y; p.int = 0; }
    }
    p.vx = ease(p.vx, tx, kk, dt); p.vy = ease(p.vy, ty, kk, dt); p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.st !== 'wind' && p.st !== 'lunge' && Math.hypot(p.vx, p.vy) > 12) p.ang = Math.atan2(p.vy, p.vx);
    if (p.y > 30) { const hw = Math.min(D.hw(-1, p.y), D.hw(1, p.y)) - 30; if (Math.abs(p.x) > hw) { p.x = Math.sign(p.x) * hw; p.vx *= -0.3; } }
    if (p.y < (p.tut ? 40 : 210) * M) p.y = (p.tut ? 40 : 210) * M;
    if ((p.st === 'stalk' || p.st === 'wind') && d < 900) threat = Math.max(threat, p.st === 'wind' ? 1 : p.int * 0.7);
  }
  D.threat = threat;
}
function hitSub(D, p) {
  const s = D.sub, P = p.P, m = s.y / M;
  p.st = 'retreat'; p.t = 2; p.cd = 3.5; p.int = 0.2; D.cnt.bites++; p.lurk = false; // a lurker has had its look: it leaves after one strike
  const ka = Math.atan2(s.y - p.y, s.x - p.x);
  if (P.hit === 'bite') { const dmg = P.dmg * (1 + Math.min(1, m / 5000)) * D.st.armor; D.o2 = Math.max(Math.min(D.o2, 1), D.o2 - dmg); s.vx += Math.cos(ka) * 380; s.vy += Math.sin(ka) * 380;
    // a bite also knocks one piece of loot loose (it can be picked up again)
    let lost = 0; if (D.hold.length && !p.tut && !P.nip) { const it = D.hold.splice(Math.floor(D.r() * D.hold.length), 1)[0]; lost = 1; const a = ka + Math.PI + (D.r() - 0.5) * 1.2, sp = 140; D.pieces.push({x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v: it.v, mat: it.mat || 'scrap', find: it.find, gold: it.gold, age: 4, st: 0, nopick: 0.9, m}); }
    D.ev.push({type: 'phit', p, kind: 'bite', dmg, lost}); }
  else if (P.hit === 'steal') { const n = Math.min(P.steal, D.hold.length), lost = [];
    for (let i = 0; i < n; i++) lost.push(D.hold.splice(Math.floor(D.r() * D.hold.length), 1)[0]);
    for (const it of lost) { const a = ka + Math.PI + (D.r() - 0.5) * 1.6, sp = 120 + D.r() * 120; D.pieces.push({x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v: it.v, mat: it.mat || 'scrap', find: it.find, gold: it.gold, age: 4, st: 0, nopick: 0.9, m}); }
    s.vx += Math.cos(ka) * 260; s.vy += Math.sin(ka) * 260; D.ev.push({type: 'phit', p, kind: 'steal', n}); }
  else { p.st = 'grab'; p.ang = Math.atan2(s.y - p.y, s.x - p.x); D.grab = {p, t: P.grabT}; D.ev.push({type: 'phit', p, kind: 'grab'}); }
}
function updRocks(D, dt) {
  const s = D.sub;
  for (let i = D.rocks.length - 1; i >= 0; i--) { const r = D.rocks[i]; r.t += dt;
    if (r.t < r.warn) continue;
    r.vy = Math.min(560, r.vy + 620 * dt); r.y += r.vy * dt; r.rot += dt * 3;
    if (D.phase === 'dive' && Math.hypot(s.x - r.x, s.y - r.y) < r.r + 22) { D.o2 = Math.max(Math.min(D.o2, 1), D.o2 - 3 * D.st.armor); s.vy += 260; s.vx += (s.x - r.x) * 6; D.ev.push({type: 'rock', x: r.x, y: r.y}); D.rocks.splice(i, 1); continue; }
    if (r.y > r.y0) D.rocks.splice(i, 1);
  }
}

DS.holdValue = D => D.hold.reduce((a, b) => a + b.v, 0);
DS.contractPay = D => D.contract && D.contract.done ? D.contract.reward : 0;
// value an interrupted dive keeps (reload / closed tab mid-dive counts as an emergency ascent)
DS.abortValue = (hold, keep) => Math.round(hold * keep);
})(typeof window !== 'undefined' ? window.DS : globalThis.DS);
