// Items, Wundertüten und Lewolux-Münzen
import * as THREE from './three.module.min.js';
import { RoundedBoxGeometry } from './jsm/geometries/RoundedBoxGeometry.js';
import { WALL } from './track.js';

export const ITEMS = {
  troete:  { icon: '📯', name: 'Turbo-Tröte', from: 'Nervbert' },
  troete3: { icon: '📯', name: '3× Turbo-Tröte', from: 'Nervbert', n: 3 },
  ball:    { icon: '⚽', name: 'Fußball', from: 'Schulhofkicker' },
  glove:   { icon: '🥊', name: 'Boxhandschuh-Rakete', from: 'Nervbert' },
  bubble:  { icon: '🫧', name: 'Seifenblase', from: 'Pandi' },
  ink:     { icon: '🖋️', name: 'Tintenklecks', from: 'Kritzelheld' },
  plakat:  { icon: '🪧', name: 'Wahlplakat-Wand', from: 'Mandat' },
  creme:   { icon: '🧴', name: 'Sonnencreme-Pfütze', from: 'House in the Desert' },
  roar:    { icon: '🦁', name: 'Löwengebrüll', from: 'Lewolux' },
  shield:  { icon: '🃏', name: 'Karten-Schild', from: 'Ring Legends' },
  star:    { icon: '🌠', name: 'Sternschnuppe', from: 'Sternenwurf' },
  cloud:   { icon: '⛈️', name: 'Gewitterwolke', from: '' },
};
const TABLE = [
  { ball: 25, bubble: 22, creme: 22, plakat: 15, shield: 10, ink: 6 },
  { ball: 22, glove: 15, bubble: 12, creme: 12, troete: 15, ink: 10, shield: 8, cloud: 6 },
  { glove: 20, ball: 15, troete: 20, roar: 12, ink: 12, cloud: 10, shield: 6, plakat: 5 },
  { troete: 22, glove: 20, roar: 15, cloud: 15, star: 10, ink: 10, troete3: 8 },
  { troete3: 22, glove: 15, star: 18, cloud: 18, roar: 15, ink: 12 },
  { troete3: 28, star: 28, cloud: 22, roar: 12, glove: 10 },
];
const BAD = new Set(['ball', 'glove', 'bubble', 'plakat', 'creme']);

function ctex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const outline = new THREE.MeshBasicMaterial({ color: 0x150a24, side: THREE.BackSide });
const withOutline = (m, s = 1.07) => { const o = new THREE.Mesh(m.geometry, outline); o.scale.setScalar(s); m.add(o); return m; };

export function createItems(ctx) {
  const { scene, tr, toon, sparks, COL, sfx } = ctx;
  const ents = [];
  const V = new THREE.Vector3();

  // ---------- Texturen ----------
  const bagT = ctex(256, 256, (g, w, h) => {
    const cols = ['#ff3fd0', '#ffe14a', '#29f0ff', '#7a5cff']; for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]; g.fillRect(i*32, 0, 32, h); }
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, w, h*0.25);
    g.beginPath(); g.arc(w/2, h*0.55, 70, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#150a24'; g.stroke();
    g.font = '900 96px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff3fd0'; g.fillText('L', w/2, h*0.56);
    g.fillStyle = '#ffe14a'; for (const [x, y] of [[40, 40], [216, 60], [60, 220], [200, 210]]) { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 15, a = k/10*Math.PI*2; g.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r); } g.fill(); }
  });
  const coinT = ctex(128, 128, (g, w, h) => { const r = g.createRadialGradient(50, 45, 5, 64, 64, 64); r.addColorStop(0, '#fff6b0'); r.addColorStop(.6, '#ffc928'); r.addColorStop(1, '#d08a10'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    g.lineWidth = 8; g.strokeStyle = '#b06a00'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); g.font = '72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🦁', 64, 68); });
  const ballT = ctex(256, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111';
    for (let i = 0; i < 9; i++) { const x = (i*61) % w, y = (i*37) % h; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k/5*Math.PI*2; g.lineTo(x + Math.cos(a)*16, y + Math.sin(a)*16); } g.fill(); } });
  const cardT = ['#ff5a3c', '#3a8ae0', '#ffe14a'].map((c, i) => ctex(128, 180, (g, w, h) => { g.fillStyle = '#ffe14a'; g.fillRect(0, 0, w, h); g.fillStyle = c; g.fillRect(8, 8, w - 16, h - 16);
    g.font = '64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['🤼', '💪', '🏆'][i], w/2, h*0.45); g.font = '900 18px system-ui'; g.fillStyle = '#fff'; g.fillText('RING LEGENDS', w/2, h - 26); }));
  const plakatT = ctex(256, 192, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e52a2a'; g.fillRect(0, 0, w, 50); g.fillStyle = '#1a4ae0'; g.fillRect(0, h - 40, w, 40);
    g.font = '900 34px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('WÄHLT MICH!', w/2, 38); g.font = '86px sans-serif'; g.fillText('🗳️', w/2, 130); g.font = '800 20px system-ui'; g.fillStyle = '#fff'; g.fillText('MANDAT', w/2, h - 13); });
  const cremeT = ctex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 5, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,240,1)'); r.addColorStop(.7, 'rgba(255,240,180,.95)'); r.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = r;
    g.beginPath(); for (let k = 0; k < 24; k++) { const a = k/24*Math.PI*2, rr = 48 + Math.sin(k*2.3)*10; g.lineTo(64 + Math.cos(a)*rr, 64 + Math.sin(a)*rr); } g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(48, 46, 14, 7, -0.5, 0, 7); g.fill(); });

  // ---------- Wundertüten ----------
  const bagGeo = new RoundedBoxGeometry(1.5, 1.7, 1.0, 3, 0.18);
  const bagMat = new THREE.MeshToonMaterial({ map: bagT, emissive: 0x2a1040 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff36b });
  const pickups = [];
  for (const f of ctx.def.pickups) {
    const i = Math.round(f*tr.N);
    for (let k = -2; k <= 2; k++) {
      const g = new THREE.Group();
      const bag = withOutline(new THREE.Mesh(bagGeo, bagMat)); g.add(bag);
      const top = withOutline(new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.35, 0.8, 2, 0.1), toon(0xffe14a)), 1.1); top.position.y = 1.0; top.rotation.z = 0.12; g.add(top);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 6, 32), ringMat); ring.rotation.x = Math.PI/2; g.add(ring);
      g.position.copy(tr.P[i]).addScaledVector(tr.R[i], k*3.8); g.position.y += 1.7; scene.add(g);
      pickups.push({ g, ring, i, base: g.position.y, t: 0, ph: Math.random()*6 });
    }
  }
  // ---------- Münzen ----------
  const coinGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.16, 24); coinGeo.rotateX(Math.PI/2);
  const coinMat = [new THREE.MeshToonMaterial({ color: 0xffc928, emissive: 0x6a3a00 }), new THREE.MeshToonMaterial({ map: coinT, emissive: 0x3a2000 })];
  const coins = [];
  let huntMode = false, extraCoins = [];
  const addRow = (f, lat, list) => { const i0 = Math.round(f*tr.N);
    for (let k = 0; k < 6; k++) { const i = (i0 + k*5) % tr.N; const m = withOutline(new THREE.Mesh(coinGeo, [coinMat[0], coinMat[1], coinMat[1]]), 1.1);
      m.position.copy(tr.P[i]).addScaledVector(tr.R[i], lat); m.position.y += 1.2; scene.add(m); const c = { m, t: 0, base: m.position.y, ph: k*0.5, i, lat }; coins.push(c); if (list) list.push(c); } };
  for (const [f, lat] of ctx.def.coins) addRow(f, lat);
  // Münzjagd: viele zusätzliche Münzreihen, schneller wieder da
  function setHunt(on) {
    huntMode = on;
    if (on && !extraCoins.length) { const taken = ctx.def.coins.map(c => c[0]); for (let f = 0.02; f < 0.98; f += 0.06) { if (taken.some(t => Math.abs(t - f) < 0.03)) continue; addRow(f, [-5, 0, 5, -2, 3][Math.round(f*100) % 5], extraCoins); } }
    for (const c of extraCoins) c.m.visible = on;
  }

  function reset() { for (const p of pickups) { p.t = 0; p.g.visible = true; } for (const c of coins) { c.t = 0; c.m.visible = huntMode || !extraCoins.includes(c); } for (const e of ents) scene.remove(e.m); ents.length = 0; }

  function roll(k) {
    const tab = TABLE[Math.max(0, Math.min(5, k.place - 1))]; let sum = 0; for (const v of Object.values(tab)) sum += v;
    let r = Math.random()*sum; for (const [it, v] of Object.entries(tab)) { r -= v; if (r <= 0) return it; } return 'troete';
  }
  const confCols = [COL.blue, COL.orange, COL.purple, COL.yellow, new THREE.Color(0x46e07a), new THREE.Color(0xff3fd0)];
  function checkPickup(k) {
    for (const p of pickups) if (p.t <= 0 && !k.item && k.roll <= 0) {
      const dx = p.g.position.x - k.pos.x, dz = p.g.position.z - k.pos.z;
      if (dx*dx + dz*dz < 2.8*2.8) { p.t = 2.6; p.g.visible = false; k.roll = k.isPlayer ? 1.4 : 1.0; k.rollItem = roll(k); if (ctx.near(k)) sfx('item');
        for (let n = 0; n < 30; n++) sparks.emit(p.g.position.x, p.g.position.y, p.g.position.z, (Math.random() - .5)*14, Math.random()*10 + 2, (Math.random() - .5)*14, confCols[n % 6], 0.9); return; }
    }
  }
  function checkCoins(k) {
    for (const c of coins) if (c.t <= 0 && c.m.visible) { const dx = c.m.position.x - k.pos.x, dz = c.m.position.z - k.pos.z;
      if (dx*dx + dz*dz < 2.2*2.2) { c.t = huntMode ? 7 : 9; c.m.visible = false; k.hunt = (k.hunt || 0) + 1; for (let n = 0; n < 8; n++) sparks.emit(c.m.position.x, c.m.position.y, c.m.position.z, (Math.random() - .5)*6, Math.random()*5, (Math.random() - .5)*6, COL.yellow, 0.4); if ((k.coins || 0) < 10) k.coins = (k.coins || 0) + 1; if (k.isPlayer) { sfx('coin'); ctx.onCoins(k.coins, true); } } }
  }
  function loseCoins(k, n = 3) { if (huntMode) k.hunt = Math.max(0, (k.hunt || 0) - 3); const lost = Math.min(k.coins || 0, n); k.coins = (k.coins || 0) - lost; if (lost && k.isPlayer) { ctx.onCoins(k.coins); }
    for (let i = 0; i < lost*4; i++) sparks.emit(k.pos.x, k.y + 1.5, k.pos.z, (Math.random() - .5)*10, 6 + Math.random()*4, (Math.random() - .5)*10, COL.yellow, 0.8); }

  // ---------- Treffer ----------
  function hitKart(k, by, t = 1.4, kind = 'spin') {
    if (k.star > 0 || k.stun > 0 || k.bubble > 0 || k.ghost > 0) return false;
    if (k.shield > 0) { k.shield--; sfx('pop'); for (let n = 0; n < 12; n++) sparks.emit(k.pos.x, k.y + 1.5, k.pos.z, (Math.random() - .5)*8, 4, (Math.random() - .5)*8, COL.yellow, 0.5); return 'blocked'; }
    if (kind === 'bubble') { k.bubble = 1.6; k.speed *= 0.3; }
    else if (kind === 'tumble') { k.stun = t; k.tumble = 1; k.vy = 7; k.speed *= 0.3; }
    else { k.stun = t; k.speed *= kind === 'slide' ? 0.6 : 0.35; }
    k.drifting = false; k.lvl = 0; k.driftT = 0; k.boost = 0; k.ghost = t + 0.6;
    loseCoins(k, 3);
    if (ctx.near(k)) sfx(kind === 'bubble' ? 'pop' : 'hit');
    for (let i = 0; i < 16; i++) sparks.emit(k.pos.x, k.y + 1.5, k.pos.z, (Math.random() - .5)*8, 4 + Math.random()*5, (Math.random() - .5)*8, COL.yellow, 0.7);
    ctx.onHit(k, by);
    return true;
  }

  // ---------- Erzeugen ----------
  const fwd = k => V.set(Math.sin(k.h), 0, Math.cos(k.h));
  function spawnAt(k, dist) { const f = fwd(k); return k.pos.clone().add(new THREE.Vector3(f.x*dist, 0, f.z*dist)); }
  function addEnt(e) { scene.add(e.m); ents.push(e); return e; }

  function use(k) {
    const it = k.item; if (!it) return;
    if (it === 'troete3') { k.itemN = (k.itemN || 3) - 1; if (k.itemN <= 0) { k.item = null; k.itemN = 0; } } else k.item = null;
    ctx.onItemUsed(k);
    const near = ctx.near(k);
    switch (it) {
      case 'troete': case 'troete3': k.boost = Math.max(k.boost, 1.5); if (near) { sfx('honk'); sfx('boost'); } break;
      case 'star': k.star = 7; if (near) sfx('star'); break;
      case 'shield': k.shield = 3; buildShield(k); if (near) sfx('got'); break;
      case 'ball': { const f = fwd(k), sp = Math.max(k.speed, 10) + 34; const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 14), new THREE.MeshToonMaterial({ map: ballT })); m.castShadow = true;
        addEnt({ type: 'ball', m, owner: k, pos: spawnAt(k, 3.2), vx: f.x*sp, vz: f.z*sp, life: 7, grace: 0.3, hint: k.loc.i, loc: {}, bounces: 0 }); if (near) sfx('kick'); break; }
      case 'glove': { const m = new THREE.Group(); const fist = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), toon(0xe52a2a))); fist.scale.set(1, 0.9, 1.15); m.add(fist);
        const th = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), toon(0xe52a2a))); th.position.set(0.55, 0.1, 0.3); m.add(th);
        const cuff = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.6, 14), toon(0xffffff))); cuff.rotation.x = Math.PI/2; cuff.position.z = -0.85; m.add(cuff);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 10), new THREE.MeshBasicMaterial({ color: 0xff8a1a, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); fl.rotation.x = -Math.PI/2; fl.position.z = -1.9; m.add(fl);
        const tgt = ctx.getRacers().filter(r => r !== k && !r.finished && r.prog > k.prog).sort((a, b) => a.prog - b.prog)[0] || null;
        addEnt({ type: 'glove', m, owner: k, target: tgt, pos: spawnAt(k, 3.5), h: k.h, sp: Math.max(k.speed, 20) + 30, life: 9, grace: 0.3, hint: k.loc.i, loc: {} }); if (near) sfx('boost'); break; }
      case 'bubble': { const m = new THREE.Mesh(new THREE.SphereGeometry(1.3, 22, 16), new THREE.MeshPhongMaterial({ color: 0xbff4ff, emissive: 0x2a4a8a, transparent: true, opacity: 0.55, shininess: 120, specular: 0xffffff }));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff8af0 })); m.add(ring);
        const pos = spawnAt(k, -3.4), L = tr.locate(pos, k.loc.i); addEnt({ type: 'bubble', m, owner: k, pos, y: L.y + 1.3, life: 40, grace: 0.6, t: 0, r: 2.3 }); if (near) sfx('bubble'); break; }
      case 'plakat': { const m = new THREE.Group(); const board = withOutline(new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.0, 0.2), [toon(0xffffff), toon(0xffffff), toon(0xffffff), toon(0xffffff), new THREE.MeshToonMaterial({ map: plakatT }), new THREE.MeshToonMaterial({ map: plakatT })]), 1.04); board.position.y = 2.4; board.castShadow = true; m.add(board);
        for (const s of [-1.6, 1.6]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), toon(0x8a5a2a)); leg.position.set(s, 0.8, 0); m.add(leg); }
        const pos = spawnAt(k, -3.8), L = tr.locate(pos, k.loc.i); m.position.set(pos.x, L.y, pos.z); m.rotation.y = k.h;
        addEnt({ type: 'plakat', m, owner: k, pos, life: 40, grace: 0.6, r: 2.4 }); if (near) sfx('bump'); break; }
      case 'creme': { const m = new THREE.Mesh(new THREE.CircleGeometry(2.3, 24), new THREE.MeshPhongMaterial({ map: cremeT, transparent: true, shininess: 90, specular: 0xffffff, depthWrite: false })); m.rotation.x = -Math.PI/2;
        const bottle = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.5, 4, 10), toon(0xffb23c))); bottle.rotation.x = Math.PI/2; bottle.position.set(0.8, 0.3, 0.6); m.add(bottle); bottle.rotation.set(0, 0, 1.2);
        const pos = spawnAt(k, -3.6), L = tr.locate(pos, k.loc.i); m.position.set(pos.x, L.y + 0.06, pos.z);
        addEnt({ type: 'creme', m, owner: k, pos, life: 35, grace: 0.6, r: 2.2 }); if (near) sfx('ink'); break; }
      case 'roar': { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffa53a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = Math.PI/2;
        m.position.set(k.pos.x, k.y + 1, k.pos.z); addEnt({ type: 'roar', m, owner: k, pos: k.pos.clone(), t: 0, hit: new Set() }); sfx('roar'); ctx.say(k, k.def.id === 'lux' ? 'roar' : 'item'); break; }
      case 'cloud': { const others = ctx.getRacers().filter(r => r !== k && !r.finished).sort((a, b) => b.prog - a.prog); const target = others[0]; if (!target) break;
        const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random()*0.8, 12, 10), toon(0x4a4a66)); s.position.set((i - 3)*1.0, Math.random()*0.6, (Math.random() - .5)*1.2); g.add(s); }
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 7, 5), new THREE.MeshBasicMaterial({ color: 0xfff36b })); bolt.position.y = -3.8; bolt.visible = false; g.add(bolt);
        addEnt({ type: 'cloud', m: g, bolt, owner: k, target, prog: k.prog, lat: k.loc.lat, phase: 'chase', t: 0 }); sfx('thunder');
        if (target.isPlayer && !target.auto) { ctx.showWarn('⛈️ Eine Gewitterwolke kommt! Gleich ausweichen!'); ctx.ann && ctx.ann(15); } break; }
      case 'ink': sfx('ink'); for (const r of ctx.getRacers()) if (r !== k && r.prog > k.prog && !r.finished) { if (r.isPlayer && !r.auto) ctx.inkScreen(4.5); else r.ink = 3.5; } if (k.isPlayer) ctx.say(k, 'hit'); break;
    }
  }
  function buildShield(k) {
    if (k.shieldG) k.model.root.remove(k.shieldG);
    const g = new THREE.Group(); k.shieldG = g; k.model.root.add(g);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.25), new THREE.MeshBasicMaterial({ map: cardT[i], side: THREE.DoubleSide })); c.userData.a = i/3*Math.PI*2; g.add(c); }
  }

  // ---------- Aktualisieren ----------
  function update(dt, t) {
    for (const p of pickups) { if (p.t > 0) { p.t -= dt; if (p.t <= 0) p.g.visible = true; } p.g.rotation.y += dt*1.6; p.g.position.y = p.base + Math.sin(t*2.4 + p.ph)*0.3; p.ring.rotation.z += dt*3; ringMat.color.setHSL((t*0.3) % 1, 1, 0.6); }
    for (const c of coins) { if (c.t > 0) { c.t -= dt; if (c.t <= 0) c.m.visible = huntMode || !extraCoins.includes(c); } c.m.rotation.y += dt*3; c.m.position.y = c.base + Math.sin(t*3 + c.ph)*0.15; }
    const racers = ctx.getRacers();
    for (const k of racers) {
      if (k.ghost > 0) k.ghost -= dt;
      if (k.shieldG) { k.shieldG.visible = k.shield > 0; k.shieldG.children.forEach((c, i) => { c.visible = i < k.shield; const a = c.userData.a + t*3; c.position.set(Math.cos(a)*2.2, 1.6 + Math.sin(t*4 + i)*0.2, Math.sin(a)*2.2); c.rotation.y = -a + Math.PI/2; }); }
      // Fallen am Boden
      for (const e of ents) if ((e.type === 'creme' || e.type === 'plakat') && (k !== e.owner || e.grace <= 0) && e.life > 0) {
        const dx = e.pos.x - k.pos.x, dz = e.pos.z - k.pos.z; if (dx*dx + dz*dz < e.r*e.r && k.hop < 1.2) { const res = hitKart(k, e.owner, e.type === 'creme' ? 1.1 : 1.3, e.type === 'creme' ? 'slide' : 'spin'); if (res || k.star > 0) { e.life = 0; if (e.type === 'plakat') burst(e.pos, 0xffffff); } }
      }
    }
    for (let n = ents.length - 1; n >= 0; n--) {
      const e = ents[n]; let dead = false;
      if (e.grace > 0) e.grace -= dt;
      if (e.type === 'ball') {
        e.life -= dt; e.pos.x += e.vx*dt; e.pos.z += e.vz*dt;
        const L = tr.locate(e.pos, e.hint, e.loc); e.hint = L.i;
        if (Math.abs(L.lat) > WALL - 1.2) { const R = tr.R[L.i], s = Math.sign(L.lat), dot = e.vx*R.x + e.vz*R.z;
          if (dot*s > 0) { e.vx -= 2*dot*R.x; e.vz -= 2*dot*R.z; e.bounces++; if (ctx.near({ pos: e.pos })) sfx('kick'); }
          const over = Math.abs(L.lat) - (WALL - 1.2); e.pos.x -= R.x*over*s; e.pos.z -= R.z*over*s; }
        e.m.position.set(e.pos.x, L.y + 0.8 + Math.abs(Math.sin(e.life*6))*0.6, e.pos.z); e.m.rotation.x += dt*12; e.m.rotation.z += dt*5;
        for (const k of racers) if ((k !== e.owner || e.grace <= 0) && k.pos.distanceToSquared(e.pos) < 2.3*2.3 && k.hop < 2) { hitKart(k, e.owner, 1.5, 'tumble'); dead = true; break; }
        if (e.life <= 0 || e.bounces > 7) dead = true;
      } else if (e.type === 'glove') {
        e.life -= dt;
        const L = tr.locate(e.pos, e.hint, e.loc); e.hint = L.i;
        // Zielrichtung: Strecke voraus, zum Ziel hin lenken
        let tx, tz; const ahead = (L.i + 14) % tr.N; tx = tr.P[ahead].x; tz = tr.P[ahead].z;
        if (e.target && !e.target.finished) { const d2 = e.target.pos.distanceToSquared(e.pos); if (d2 < 60*60) { tx = e.target.pos.x; tz = e.target.pos.z; } else { tx += tr.R[ahead].x*e.target.loc.lat; tz += tr.R[ahead].z*e.target.loc.lat; } }
        const want = Math.atan2(tx - e.pos.x, tz - e.pos.z); let d = want - e.h; while (d > Math.PI) d -= Math.PI*2; while (d < -Math.PI) d += Math.PI*2; e.h += Math.max(-4*dt, Math.min(4*dt, d));
        e.sp = Math.min(e.sp + dt*20, 75);
        e.pos.x += Math.sin(e.h)*e.sp*dt; e.pos.z += Math.cos(e.h)*e.sp*dt;
        if (Math.abs(L.lat) > WALL - 1.5) { const R = tr.R[L.i], s = Math.sign(L.lat); e.pos.x -= R.x*s*0.5; e.pos.z -= R.z*s*0.5; }
        e.m.position.set(e.pos.x, L.y + 1.3, e.pos.z); e.m.rotation.y = e.h; e.m.children[3].scale.z = 0.7 + Math.random()*0.6;
        if (Math.random() < 0.7) sparks.emit(e.pos.x - Math.sin(e.h)*2, L.y + 1.3, e.pos.z - Math.cos(e.h)*2, 0, 1, 0, COL.orange, 0.3);
        for (const k of racers) if ((k !== e.owner || e.grace <= 0) && k.pos.distanceToSquared(e.pos) < 2.4*2.4) { hitKart(k, e.owner, 1.6, 'tumble'); dead = true; break; }
        if (e.life <= 0) dead = true;
      } else if (e.type === 'bubble') {
        e.life -= dt; e.t += dt;
        e.m.position.set(e.pos.x, e.y + Math.sin(e.t*3)*0.25, e.pos.z); e.m.rotation.y += dt; const s = 1 + Math.sin(e.t*5)*0.04; e.m.scale.set(s, 1/s, s);
        for (const k of racers) if ((k !== e.owner || e.grace <= 0) && k.pos.distanceToSquared(e.pos) < e.r*e.r) { hitKart(k, e.owner, 1.6, 'bubble'); dead = true; break; }
        if (e.life <= 0) dead = true;
      } else if (e.type === 'creme' || e.type === 'plakat') {
        e.life -= dt; if (e.life <= 0) dead = true;
        if (e.type === 'plakat') e.m.children[0].rotation.z = Math.sin(t*3 + e.pos.x)*0.03;
      } else if (e.type === 'roar') {
        e.t += dt; const R = 1 + e.t*30; e.m.scale.set(R, R, 1 + e.t*4); e.m.material.opacity = Math.max(0, 0.9 - e.t*1.6); e.m.position.set(e.owner.pos.x, e.owner.y + 1, e.owner.pos.z);
        for (const k of racers) if (k !== e.owner && !e.hit.has(k) && k.pos.distanceTo(e.owner.pos) < Math.min(R, 15)) { e.hit.add(k); hitKart(k, e.owner, 1.1, 'spin'); }
        for (const o of ents) if (o !== e && BAD.has(o.type) && o.life > 0 && (o.pos.distanceTo(e.owner.pos) < Math.min(R, 15))) { o.life = 0; burst(o.pos, 0xffa53a); }
        if (e.t > 0.6) dead = true;
      } else if (e.type === 'cloud') {
        const tg = e.target; e.t += dt;
        if (e.phase === 'chase') {
          e.prog += Math.max(62, tg.speed + 20)*dt / tr.seg;
          if (e.prog >= tg.prog - 3) { e.phase = 'charge'; e.t = 0; e.lat = tg.loc.lat; if (tg.isPlayer && !tg.auto) ctx.showWarn('⚡ Weg da! Ausweichen!'); }
          const i = ((Math.round(e.prog) % tr.N) + tr.N) % tr.N; const p = tr.P[i];
          e.m.position.lerp(V.set(p.x + tr.R[i].x*e.lat, p.y + 9, p.z + tr.R[i].z*e.lat), Math.min(1, dt*6));
        } else {
          e.prog = tg.prog; const i = ((Math.round(e.prog) % tr.N) + tr.N) % tr.N; const p = tr.P[i];
          e.m.position.lerp(V.set(p.x + tr.R[i].x*e.lat, p.y + 7.5, p.z + tr.R[i].z*e.lat), Math.min(1, dt*10));
          e.m.children.forEach((c, j) => { if (c !== e.bolt) c.material = toon(Math.sin(e.t*20 + j) > 0.6 ? 0x8a8ab0 : 0x4a4a66); });
          if (e.t > 1.5 && !e.struck) { e.struck = true; e.bolt.visible = true; if (ctx.near(tg)) sfx('zap');
            if (Math.abs(tg.loc.lat - e.lat) < 3.2) { if (hitKart(tg, e.owner, 1.6, 'tumble') === true) tg.shrink = 4; }
            else if (tg.isPlayer && !tg.auto) { ctx.showMsg('Ausgewichen!', 1.0); ctx.ann && ctx.ann(11); } }
          if (e.t > 1.9) dead = true;
        }
      }
      if (dead || (e.life !== undefined && e.life <= 0 && e.type !== 'roar' && e.type !== 'cloud')) { scene.remove(e.m); ents.splice(n, 1); }
    }
    // Ball trifft Ball/Blase
    for (const a of ents) if (a.type === 'ball' || a.type === 'glove') for (const b of ents) if (b !== a && BAD.has(b.type) && b.type !== a.type && b.life > 0 && a.life > 0 && b.pos.distanceToSquared(a.pos) < 2.6*2.6) { a.life = 0; b.life = 0; burst(a.pos, 0xffffff); sfx('pop'); }
  }
  function burst(pos, col) { const c = new THREE.Color(col); for (let n = 0; n < 18; n++) sparks.emit(pos.x, pos.y + 1, pos.z, (Math.random() - .5)*10, Math.random()*8, (Math.random() - .5)*10, c, 0.6); }

  // KI: soll das Item jetzt benutzt werden?
  function aiWants(k, raceT) {
    const a = k.ai; if (!k.item) return false;
    if (!a.useAt) a.useAt = raceT + 0.5 + Math.random()*2.5;
    if (raceT < a.useAt) return false;
    const racers = ctx.getRacers(); const it = k.item; let go = true;
    if (it === 'ball') go = racers.some(r => r !== k && r.prog > k.prog && r.prog - k.prog < 45 && Math.abs(r.loc.lat - k.loc.lat) < 6) || raceT > a.useAt + 5;
    else if (it === 'glove') go = racers.some(r => r !== k && r.prog > k.prog && r.prog - k.prog < 250) || raceT > a.useAt + 5;
    else if (it === 'bubble' || it === 'creme' || it === 'plakat') go = racers.some(r => r !== k && r.prog < k.prog && k.prog - r.prog < 20) || raceT > a.useAt + 7;
    else if (it === 'roar') go = racers.some(r => r !== k && r.pos.distanceTo(k.pos) < 12) || ents.some(e => BAD.has(e.type) && e.owner !== k && e.pos && e.pos.distanceTo(k.pos) < 14) || raceT > a.useAt + 8;
    if (go) a.useAt = it === 'troete3' && (k.itemN || 3) > 1 ? raceT + 1.2 : 0;
    return go;
  }
  return { ents, pickups, coins, setHunt, get huntMode() { return huntMode; }, reset, roll, use, update, checkPickup, checkCoins, hitKart, aiWants };
}
