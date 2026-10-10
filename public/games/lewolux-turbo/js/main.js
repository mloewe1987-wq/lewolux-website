// Lewolux Turbo – Prototyp: Spielablauf, Fahrphysik, KI, Items, Kamera, Anzeige
import * as THREE from './three.module.min.js';
import { makeTrack, buildTrackMeshes, HALF, WALL } from './track.js';
import { DRIVERS, buildRacer, toon, sanitize, paintColor } from './karts.js';
import { buildScenery } from './scenery.js';
import { createItems, ITEMS } from './items.js';
import { TRACKS, CUPS, trackById } from './tracks.js';
import * as PG from './progress.js';
import { input, touch, pollInput, setupTouch, enableTilt, rumble } from './input.js';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './jsm/postprocessing/OutputPass.js';
import { initAudio, sfx, voice, engineStart, engineUpdate, engineStop, musicStart, musicStop, setMuted, audio, playMusic, pauseMusic, stopMusic, say as sayClip, preloadVoices } from './audio.js';

const Q = new URLSearchParams(location.search);
const AUTO = Q.has('auto');
const SIM = +Q.get('sim') || 1;
const MOBILE = touch.on;
const $ = s => document.querySelector(s);
const LAPS = 3;
const CLASSES = [{ id: 'gem', name: 'Gemütlich', base: 25, ai: 0.86 }, { id: 'flott', name: 'Flott', base: 30, ai: 0.94 }, { id: 'turbo', name: 'Turbo', base: 36, ai: 1.0 }, { id: 'spiegel', name: 'Spiegel', base: 36, ai: 1.0, mirror: true }];
// ---------- Grundgerüst ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
let pr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2); renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 2000);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 0.8); composer.addPass(bloom);
composer.addPass(new OutputPass());
let assist = false; try { assist = localStorage.getItem('turboAssist') === '1'; } catch (_) {}
let useBloom = !Q.has('nobloom');
let gfx = 'auto'; try { gfx = localStorage.getItem('turboGfx') || 'auto'; } catch (_) {}
const MAXPR = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
function applyGfx() {
  if (gfx === 'high') { pr = MAXPR; useBloom = true; }
  else if (gfx === 'mid') { pr = Math.min(MAXPR, 1); useBloom = true; }
  else if (gfx === 'low') { pr = 0.75; useBloom = false; }
  else { pr = MAXPR; useBloom = !Q.has('nobloom'); }
  bloom.strength = gfx === 'high' ? 0.7 : 0.6;
  const sh = gfx === 'low' ? 0 : gfx === 'mid' ? 1024 : gfx === 'high' ? 2048 : (MOBILE ? 1024 : 2048);
  if (env && env.sun) { const on = sh > 0; if (renderer.shadowMap.enabled !== on) { renderer.shadowMap.enabled = on; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); }
    if (on && env.sun.shadow.mapSize.x !== sh) { env.sun.shadow.mapSize.set(sh, sh); if (env.sun.shadow.map) { env.sun.shadow.map.dispose(); env.sun.shadow.map = null; } } }
  renderer.setPixelRatio(pr); resize();
  document.querySelectorAll('[data-gfx]').forEach(x => x.classList.toggle('on', x.dataset.gfx === gfx));
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 85 : 70; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

let tr = null, env = null, world = null, items = null, curDef = null;
const newStats = () => ({ hits: 0, tricks: 0, items: 0, coins: 0, drifts: 0, maxLvl: 0 });
let stats = newStats();
window.__nanLog = [];
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
const wrapA = a => { while (a > Math.PI) a -= Math.PI*2; while (a < -Math.PI) a += Math.PI*2; return a; };
const tmpV3 = new THREE.Vector3();
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const trackAngle = i => Math.atan2(tr.T[i].x, tr.T[i].z);

// ---------- Partikel ----------
class Particles {
  constructor(max, size, additive) {
    this.max = max; this.n = 0; this.p = new Float32Array(max*3); this.v = new Float32Array(max*3); this.c = new Float32Array(max*3); this.life = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.pa = new THREE.BufferAttribute(this.p, 3); this.ca = new THREE.BufferAttribute(this.c, 3);
    g.setAttribute('position', this.pa); g.setAttribute('color', this.ca);
    const dot = document.createElement('canvas'); dot.width = dot.height = 32; const x = dot.getContext('2d');
    const r = x.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 32, 32);
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    this.pts.frustumCulled = false; scene.add(this.pts); this.i = 0;
  }
  emit(x, y, z, vx, vy, vz, col, life) {
    const i = this.i; this.i = (this.i + 1) % this.max;
    this.p.set([x, y, z], i*3); this.v.set([vx, vy, vz], i*3); this.c.set([col.r, col.g, col.b], i*3); this.life[i] = life;
  }
  update(dt, grav) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.p[i*3+1] = -999; continue; }
      this.life[i] -= dt; const k = i*3;
      this.v[k+1] -= grav*dt; this.p[k] += this.v[k]*dt; this.p[k+1] += this.v[k+1]*dt; this.p[k+2] += this.v[k+2]*dt;
      if (this.life[i] < 0.25) { this.c[k] *= 0.9; this.c[k+1] *= 0.9; this.c[k+2] *= 0.9; }
    }
    this.pa.needsUpdate = true; this.ca.needsUpdate = true;
  }
}
const sparks = new Particles(MOBILE ? 400 : 800, 0.55, true);
const smoke = new Particles(MOBILE ? 200 : 400, 1.6, false);
const COL = { blue: new THREE.Color(0x3ad0ff), orange: new THREE.Color(0xff8a1a), purple: new THREE.Color(0xd04bff), dust: new THREE.Color(0x6a8a5a), white: new THREE.Color(0xffffff), yellow: new THREE.Color(0xfff36b), smoke: new THREE.Color(0x8a80a0) };
const LVLCOL = [null, COL.blue, COL.orange, COL.purple]; COL.water = new THREE.Color(0xd8f6ff); const dustCol = new THREE.Color();

// ---------- Comic-Effekte: Schriftzüge und Ringe ----------
const fx = [];
const POPS = ['BAM!', 'POW!', 'BONK!', 'ZACK!', 'WUMM!', 'KRACH!'];
const popTex = {};
function popTexture(txt, col) { const k = txt + col; if (popTex[k]) return popTex[k]; const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.translate(128, 64); g.fillStyle = col; g.beginPath(); for (let i = 0; i < 18; i++) { const r = i % 2 ? 46 : 62, a = i/18*Math.PI*2; g.lineTo(Math.cos(a)*r*1.8, Math.sin(a)*r); } g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = '#150a24'; g.stroke();
  g.font = '900 54px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeText(txt, 0, 4); g.fillStyle = '#fff'; g.fillText(txt, 0, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return popTex[k] = t; }
function comicPop(pos, txt) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: popTexture(txt || POPS[Math.random()*POPS.length | 0], ['#ffe14a', '#ff5a8a', '#29f0ff', '#ff8a3c'][Math.random()*4 | 0]), depthTest: false, transparent: true }));
  s.position.set(pos.x, pos.y + 3.5, pos.z); s.scale.set(0.1, 0.05, 1); s.renderOrder = 10; scene.add(s); fx.push({ o: s, t: 0, life: 0.9, kind: 'pop' });
}
const ringGeo = new THREE.RingGeometry(0.8, 1.2, 32); ringGeo.rotateX(-Math.PI/2);
function ring(pos, col, size = 6, y = 0.3) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.position.set(pos.x, pos.y + y, pos.z); scene.add(m); fx.push({ o: m, t: 0, life: 0.45, kind: 'ring', size }); }
function fxTick(dt) {
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const k = f.t/f.life;
    if (f.kind === 'pop') { const s = k < 0.2 ? k/0.2*1.2 : 1.2 - (k - 0.2)*0.25; f.o.scale.set(5*s, 2.5*s, 1); f.o.position.y += dt*1.5; f.o.material.opacity = k > 0.7 ? 1 - (k - 0.7)/0.3 : 1; }
    else { const s = 1 + k*f.size; f.o.scale.set(s, 1, s); f.o.material.opacity = 0.9*(1 - k); }
    if (k >= 1) { scene.remove(f.o); f.o.material.dispose(); fx.splice(i, 1); } }
}

// ---------- Turbo-Felder und Glitzer-Sterne ----------
const pads = [], ramps = [];
const chevTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ff7a1a'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#fff36b';
  for (let y = 0; y < 128; y += 64) { g.beginPath(); g.moveTo(4, y + 50); g.lineTo(32, y + 14); g.lineTo(60, y + 50); g.lineTo(60, y + 64); g.lineTo(32, y + 28); g.lineTo(4, y + 64); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); return t; })(); // Pfeile zeigen in Fahrtrichtung
function buildPads(def) { pads.length = 0;
for (const [f, lat] of def.pads) {
  const i = Math.round(f*tr.N); const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), new THREE.MeshBasicMaterial({ map: chevTex, transparent: true, opacity: 0.95 }));
  m.rotation.x = -Math.PI/2; const h = new THREE.Group(); h.add(m);
  h.position.copy(tr.P[i]).addScaledVector(tr.R[i], lat); h.position.y += 0.08; h.rotation.y = trackAngle(i); world.add(h);
  pads.push({ i, lat });
} }
// ---------- Sprungschanzen ----------
const glowMat = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c) });
function rampTexFor(def) { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'); const [a, b] = def.ramp || ['#29f0ff', '#ff3fd0'];
  g.fillStyle = a; g.fillRect(0, 0, 128, 256); g.fillStyle = b; for (let y = 0; y < 256; y += 64) { g.beginPath(); g.moveTo(14, y + 52); g.lineTo(64, y + 12); g.lineTo(114, y + 52); g.lineTo(114, y + 62); g.lineTo(64, y + 26); g.lineTo(14, y + 62); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 8, 256); g.fillRect(120, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); return t; }
function buildRamps(def) { ramps.length = 0; const rampTex = rampTexFor(def);
for (const [f, lat, w] of def.ramps) {
  const i0 = Math.round(f*tr.N), len = 9, i1 = i0 + len, H = 1.9;
  const pos = [], idx = []; const add = (p) => pos.push(p.x, p.y, p.z);
  for (let k = 0; k <= len; k++) { const i = (i0 + k) % tr.N, p = tr.P[i], r = tr.R[i], h = H*(k/len)**1.4;
    for (const l of [lat - w/2, lat + w/2]) add(new THREE.Vector3(p.x + r.x*l, p.y + h + 0.03, p.z + r.z*l)); }
  for (let k = 0; k < len; k++) { const a = k*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const last = len*2; const pe = tr.P[i1 % tr.N], re = tr.R[i1 % tr.N];
  for (const l of [lat - w/2, lat + w/2]) add(new THREE.Vector3(pe.x + re.x*l, pe.y + 0.03, pe.z + re.z*l));
  idx.push(last, last + 2, last + 1, last + 1, last + 2, last + 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = []; for (let k = 0; k <= len; k++) uv.push(0, k/len, 1, k/len); uv.push(0, 1, 1, 1); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: rampTex, side: THREE.DoubleSide, emissive: 0x150a20 })); m.receiveShadow = true; m.castShadow = true; world.add(m);
  // Seitenwände + Kante
  const sideMat = toon(new THREE.Color(def.ramp ? def.ramp[0] : '#29f0ff').multiplyScalar(0.55).getHex());
  for (const l of [lat - w/2, lat + w/2]) { const sp = [], si = []; for (let k = 0; k <= len; k++) { const i = (i0 + k) % tr.N, p = tr.P[i], r = tr.R[i], hh = H*(k/len)**1.4; sp.push(p.x + r.x*l, p.y, p.z + r.z*l, p.x + r.x*l, p.y + hh + 0.03, p.z + r.z*l); if (k < len) { const a = k*2; si.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); sg.computeVertexNormals(); const sm = new THREE.Mesh(sg, sideMat); sm.material.side = THREE.DoubleSide; world.add(sm); }
  const pe2 = tr.P[i1 % tr.N], re2 = tr.R[i1 % tr.N]; const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 0.35), glowMat(def.ramp ? def.ramp[1] : '#ff3fd0')); edge.position.set(pe2.x + re2.x*lat, pe2.y + H*0.98, pe2.z + re2.z*lat); edge.rotation.y = Math.atan2(re2.x, re2.z) + Math.PI/2; world.add(edge);
  ramps.push({ i0, i1, lat, w, H });
} }

// ---------- Fahrer ----------
let racers = [], player = null, cls = CLASSES[1], selIdx = 3;
function makeKart(def, isPlayer, gridPos, cfg) {
  cfg = cfg || (isPlayer ? { ...PG.drv(def.id) } : aiCfg(def));
  const st = PG.stats(def, cfg);
  const model = buildRacer(def.id, cfg); scene.add(model.root);
  const row = Math.floor(gridPos / 2), side = gridPos % 2 ? 1 : -1;
  const i = (tr.N - 14 - row*10 + tr.N) % tr.N;
  const pos = tr.P[i].clone().addScaledVector(tr.R[i], side*5);
  const k = { def, model, isPlayer, pos, h: trackAngle(i), speed: 0, y: tr.P[i].y, hop: 0, vy: 0, hint: i, loc: {}, lap: 0, cp: false, prevS: i,
    prog: i - tr.N, finished: false, fTime: 0, place: gridPos + 1, slide: 0, drifting: false, driftDir: 0, driftT: 0, lvl: 0,
    boost: 0, star: 0, stun: 0, spinA: 0, bubble: 0, ink: 0, shrink: 0, item: null, roll: 0, rollItem: null, wrongT: 0, bumpCd: 0,
    max: cls.base + st.speed*0.9, acc: 10 + st.accel*2.4, turn: 1.5 + st.handling*0.12, weight: 1 + st.weight*0.25, offroadPlus: st.offroad, cfg,
    ai: { lane: (Math.random() - 0.5)*8, laneT: Math.random()*10, skill: cls.ai*(0.95 + Math.random()*0.08), useAt: 0, driftOn: false, mistake: 0 },
    auto: !isPlayer || AUTO, startBoost: 0 };
  tr.locate(pos, i, k.loc);
  model.root.position.copy(pos); model.root.rotation.y = k.h;
  return k;
}

// ---------- Items ----------
const near = k => k.isPlayer || (player && k.pos.distanceTo(player.pos) < 45);
const itemCtx = { toon, sparks, COL, sfx, near,
  getRacers: () => racers,
  say: (k, w) => say(k, w), ann: i => ann(i), showWarn: t => showWarn(t), showMsg: (t, d) => showMsg(t, d), inkScreen: t => inkScreen(t),
  onItemUsed: k => { if (k.isPlayer) { updateItemBox(); if (!k.auto) stats.items++; } },
  onCoins: (n, gained) => { if (gained) stats.coins++; const el = $('#coins'); el.textContent = '🪙 ' + n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },
  onHit: (k, by) => {
    if (near(k)) comicPop(k.model.root.position);
    if (k.isPlayer && !k.auto) { say(k, 'ouch'); if (by && by !== k && !by.isPlayer && Math.random() < 0.7) setTimeout(() => say(by, 'hit'), 1300); shake = 0.5; rumble(0.9, 350); }
    else if (by && by.isPlayer && by !== k) say(by, 'hit');
    if (by && by !== k && by.isPlayer) stats.hits++;
  },
};
const hitKart = (...a) => items.hitKart(...a);

// ---------- Strecke laden ----------
function disposeTree(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); const ms = c.material ? [].concat(c.material) : []; for (const m of ms) if (m.map && m.map.isCanvasTexture) m.map.dispose(); }); }
function buildDecals() {
  const draws = [
    (g, w, h) => { g.lineWidth = 8; for (let i = 0; i < 6; i++) g.strokeRect(w*0.35, 10 + i*40, 70, 40); g.font = '28px sans-serif'; g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) g.fillText(String(6 - i), w*0.35 + 26, 40 + i*40); },
    (g, w, h) => { g.lineWidth = 9; g.beginPath(); g.arc(w/2, h/2, 90, 0, 7); g.stroke(); g.beginPath(); g.arc(w/2 - 34, h/2 - 25, 10, 0, 7); g.arc(w/2 + 34, h/2 - 25, 10, 0, 7); g.fill(); g.beginPath(); g.arc(w/2, h/2 + 5, 50, 0.3, Math.PI - 0.3); g.stroke(); },
    (g, w, h) => { g.lineWidth = 8; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 40 : 100, a = k/10*Math.PI*2 - Math.PI/2; g.lineTo(w/2 + Math.cos(a)*r, h/2 + Math.sin(a)*r); } g.closePath(); g.stroke(); },
    (g, w, h) => { g.font = '900 64px system-ui'; g.textAlign = 'center'; g.fillText('TOOR!', w/2, h/2); g.font = '80px sans-serif'; g.fillText('⚽', w/2, h/2 + 90); },
    (g, w, h) => { g.lineWidth = 8; g.beginPath(); g.arc(w/2, h/2 - 20, 60, Math.PI, 0); g.stroke(); for (let i = 0; i < 7; i++) { g.strokeStyle = ['#ff5a5a', '#ffb23c', '#ffe14a', '#46e07a', '#29a0ff', '#7a5cff', '#ff8ad0'][i]; g.beginPath(); g.arc(w/2, h/2 + 60, 110 - i*10, Math.PI, 0); g.stroke(); } },
  ];
  for (let n = 0; n < 12; n++) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.strokeStyle = g.fillStyle = ['rgba(255,255,255,.85)', 'rgba(255,190,220,.85)', 'rgba(190,230,255,.85)', 'rgba(255,240,160,.85)'][n % 4];
    draws[n % draws.length](g, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })); m.rotation.x = -Math.PI/2;
    const i = Math.round((n + 0.3)/12*tr.N + Math.random()*40) % tr.N, l = (Math.random() - 0.5)*12; const h = new THREE.Group(); h.add(m); h.position.copy(tr.P[i]).addScaledVector(tr.R[i], l); h.position.y += 0.04; h.rotation.y = trackAngle(i) + (Math.random() - 0.5)*0.6; m.receiveShadow = true; world.add(h);
  }
}
const MIRROR = {};
function mirrorOf(def) { // Spiegel-Klasse: Strecke seitenverkehrt
  return MIRROR[def.id] ||= { ...def, mirrored: true, cp: def.cp.map(([x, z, y]) => [-x, z, y]), pads: def.pads.map(([f, l]) => [f, -l]), ramps: def.ramps.map(([f, l, w]) => [f, -l, w]), coins: def.coins.map(([f, l]) => [f, -l]) };
}
function loadTrack(def, race = false) {
  if (race && cls.mirror && session.mode !== 'time' && !def.mirrored) def = mirrorOf(def);
  if (curDef === def) return;
  if (world) { scene.remove(world); disposeTree(world); }
  world = new THREE.Group(); scene.add(world);
  tr = makeTrack(def);
  buildTrackMeshes(tr, world, toon, def.style);
  env = buildScenery(world, tr, toon, MOBILE ? 0.6 : 1, def);
  scene.fog = world.fog; world.fog = null;
  buildPads(def); buildRamps(def);
  items = createItems({ ...itemCtx, scene: world, tr, def });
  sanitize(world);
  buildMini();
  { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < SKIDN; i++) skids.setMatrixAt(i, z); skids.instanceMatrix.needsUpdate = true; }
  curDef = def; applyGfx();
  bloom.strength = (def.bloom || [0.6, 0.8])[0]*(gfx === 'high' ? 1.15 : 1); bloom.threshold = (def.bloom || [0.6, 0.8])[1]; renderer.toneMappingExposure = def.exposure || 1.1;
  if (def.style.decals) buildDecals();
}

// ---------- Anzeige ----------
const hud = $('#hud'), msgEl = $('#msg'), sayEl = $('#say'), warnEl = $('#warn');
let msgT = 0, sayT = 0, warnT = 0, shake = 0;
function showMsg(t, dur = 1.2, cls = '') { msgEl.textContent = t; msgEl.className = 'show ' + cls; msgT = dur; }
function showWarn(t) { warnEl.textContent = t; warnEl.classList.add('show'); warnT = 2.2; }
const SAY_IDX = { start: 0, hit: 1, ouch: 2, pass: 3, win: 4, item: 5, lose: 6, trick: 7, hit2: 8, ouch2: 9, roar: 10 };
const ALT = { start: 'Los!', lose: 'Nächstes Mal!', trick: 'Juhu!', hit2: 'Erwischt!', ouch2: 'Aua!', roar: 'ROOOAAAR!' };
function say(k, what) {
  if ((what === 'hit' || what === 'ouch') && Math.random() < 0.4) what += '2';
  const line = k.def.say[what] || ALT[what]; if (!line) return;
  sayEl.innerHTML = `<b style="background:${k.def.color}">${k.def.icon}</b><span><i>${k.def.short || k.def.name}</i>${line}</span>`;
  sayEl.classList.add('show'); sayT = 2.4;
  if (!sayClip(k.def.id, SAY_IDX[what] ?? 0)) voice(k.def.pitch, 4 + (line.length / 6 | 0));
}
const ann = i => sayClip('ann', i), ann2 = i => sayClip('ann2', i);
const TRACK_ANN = { dschungel: 2, schulhof: 3, teich: 4, wueste: 5, schulhof_nacht: 3, wueste_abend: 5 };
const HUNT_T = 120;
const MUS_ALIAS = {};
const musicFor = () => curDef ? (MUS_ALIAS[curDef.theme] || curDef.theme) : 'menu';
function inkScreen(t) {
  const el = $('#ink'); el.innerHTML = '';
  const cols = [['#c23cff', '#5a128a'], ['#ff3fd0', '#7a0a5a'], ['#7a5cff', '#2a1a7a']];
  for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.className = 'blob'; const s = 15 + Math.random()*12, c = cols[i % 3];
    d.style.cssText = `left:${8 + Math.random()*72}%;top:${6 + Math.random()*45}%;width:${s}vmin;height:${s*0.85}vmin;--a:${c[0]};--b:${c[1]};transform:rotate(${Math.random()*360}deg)`;
    for (let k = 0; k < 3; k++) { const dr = document.createElement('i'); dr.style.cssText = `left:${15 + k*30 + Math.random()*10}%;height:${30 + Math.random()*60}%;animation-delay:${Math.random()*0.6}s`; d.appendChild(dr); }
    el.appendChild(d); }
  el.style.transition = 'none'; el.style.opacity = 0.93;
  setTimeout(() => { el.style.transition = `opacity ${t*0.55}s ease-in`; el.style.opacity = 0; }, t*450);
}
function updateItemBox() {
  const ib = $('#itemIcon'); const k = player;
  if (k.roll > 0) return;
  ib.textContent = k.item ? ITEMS[k.item].icon : ''; $('#itemN').textContent = k.item && k.itemN > 1 ? '×' + k.itemN : ''; $('#itemName').textContent = k.item ? ITEMS[k.item].name : ''; $('#itemBox').classList.toggle('full', !!k.item);
  $('#tItem').classList.toggle('ready', !!k.item); { const ti = $('#tItemIc'), v = k.item ? ITEMS[k.item].icon : 'LX'; if (ti.textContent !== v) ti.textContent = v; }
}
const fmt = t => { const m = Math.floor(t / 60), s = t - m*60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };

// Minikarte
const mini = $('#mini'), mctx = mini.getContext('2d');
let mb, mScale; const mBase = document.createElement('canvas'); mBase.width = mini.width; mBase.height = mini.height;
const mx = x => 12 + (x - mb.x0)*mScale + ((mini.width - 24) - (mb.x1 - mb.x0)*mScale) / 2, mz = z => 12 + (z - mb.z0)*mScale + ((mini.height - 24) - (mb.z1 - mb.z0)*mScale) / 2;
function buildMini() {
  mb = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }; for (const p of tr.P) { mb.x0 = Math.min(mb.x0, p.x); mb.x1 = Math.max(mb.x1, p.x); mb.z0 = Math.min(mb.z0, p.z); mb.z1 = Math.max(mb.z1, p.z); }
  mScale = Math.min((mini.width - 24) / (mb.x1 - mb.x0), (mini.height - 24) / (mb.z1 - mb.z0));
  const g = mBase.getContext('2d'); g.clearRect(0, 0, mBase.width, mBase.height); g.lineJoin = 'round';
  for (const [w, c] of [[11, 'rgba(10,4,30,.75)'], [6, '#c9b8ff']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); tr.P.forEach((p, i) => i ? g.lineTo(mx(p.x), mz(p.z)) : g.moveTo(mx(p.x), mz(p.z))); g.closePath(); g.stroke(); }
  g.fillStyle = '#fff'; g.fillRect(mx(tr.P[0].x) - 4, mz(tr.P[0].z) - 4, 8, 8);
}
function drawMini() {
  mctx.clearRect(0, 0, mini.width, mini.height); mctx.drawImage(mBase, 0, 0);
  for (const e of items.ents) if (e.type === 'cloud') { const k = e.target; mctx.font = '16px sans-serif'; mctx.fillText('⛈️', mx(k.pos.x) - 8, mz(k.pos.z) - 8); }
  const list = [...racers].sort((a, b) => a.isPlayer - b.isPlayer);
  for (const k of list) { mctx.beginPath(); mctx.arc(mx(k.pos.x), mz(k.pos.z), k.isPlayer ? 7 : 5, 0, 7); mctx.fillStyle = k.def.color; mctx.fill(); mctx.lineWidth = k.isPlayer ? 3 : 1.5; mctx.strokeStyle = k.isPlayer ? '#fff' : '#150a24'; mctx.stroke(); }
}

// ---------- Spielzustand ----------
let state = 'title', stateT = 0, raceT = 0, countN = 0, paused = false, results = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

const SCREENS = ['title', 'menu', 'select', 'setup', 'trackSel', 'garage', 'quests', 'help', 'pause', 'results', 'standings', 'podium'];
const MENU = new Set(['title', 'menu', 'select', 'setup', 'trackSel', 'garage', 'quests', 'help', 'standings']);
function setScreen(s) {
  for (const id of SCREENS) $('#' + id).classList.toggle('show', s === id);
  document.querySelectorAll('.walletN').forEach(e => e.textContent = PG.state().wallet);
  focusFirst();
  hud.classList.toggle('show', s === 'race' || s === 'pause' || s === 'results');
  $('#touch').classList.toggle('show', MOBILE && (s === 'race'));
}

// ---------- Fahrphysik ----------
function control(k, dt) {
  // liefert {steer, gas, brake, drift, item}
  if (!k.auto) {
    let steer = input.steer;
    if (assist && state === 'race' && k.stun <= 0) { // Lenkhilfe: lenkt sanft zurück, wenn man an den Rand oder falsch herum fährt
      const L = k.loc, j = (L.i + 10) % tr.N, lane = clamp(L.lat*0.3, -HALF + 4, HALF - 4);
      const tx = tr.P[j].x + tr.R[j].x*lane - k.pos.x, tz = tr.P[j].z + tr.R[j].z*lane - k.pos.z;
      const cs = clamp(-wrapA(Math.atan2(tx, tz) - k.h)*3, -1, 1);
      let w = clamp((Math.abs(L.lat) - (HALF - 3.5))/3, 0, 0.9);
      if (k.speed > 3) w = Math.max(w, clamp((Math.abs(wrapA(trackAngle(L.i) - k.h)) - 0.6)/0.8, 0, 0.9));
      if (k.drifting) w *= 0.5;
      steer = steer*(1 - w) + cs*w;
    }
    return { steer, gas: input.gas, brake: input.brake, drift: input.drift, item: input.item };
  }
  const a = k.ai, i = k.loc.i;
  a.laneT += dt*0.35; let lane = a.lane + Math.sin(a.laneT)*3;
  // Fallen ausweichen
  for (const e of items.ents) if (e.type === 'bubble' || e.type === 'creme' || e.type === 'plakat' || (e.type === 'cloud' && e.target === k && e.phase === 'charge')) {
    const d = tmpV.set(e.pos ? e.pos.x : k.pos.x, 0, e.pos ? e.pos.z : k.pos.z).sub(k.pos);
    if (e.type === 'cloud') { lane = e.lat > 0 ? -7 : 7; continue; }
    if (d.lengthSq() < 30*30 && d.x*Math.sin(k.h) + d.z*Math.cos(k.h) > 0) { const l = tr.locate(e.pos, k.loc.i); lane = l.lat > k.loc.lat ? l.lat - 5 : l.lat + 5; }
  }
  if (session.mode === 'coins' && (a.hunter ??= Math.random() < 0.55)) { let best = 1e9; for (const c of items.coins) { if (!c.m.visible || c.t > 0) continue; let d = c.i - i; if (d < 0) d += tr.N; if (d > 8 && d < 60 && d < best) { best = d; lane = c.lat + a.lane*0.7; } } }
  lane = clamp(lane, -HALF + 2, HALF - 2);
  const look = 10 + Math.round(Math.max(0, k.speed)*0.35);
  const j = (i + look) % tr.N; const tp = tr.P[j], tl = tr.R[j];
  const tx = tp.x + tl.x*lane - k.pos.x, tz = tp.z + tl.z*lane - k.pos.z;
  const diff = wrapA(Math.atan2(tx, tz) - k.h);
  let steer = clamp(-diff*2.6, -1, 1);
  if (a.mistake > 0) { a.mistake -= dt; steer = clamp(steer + Math.sin(raceT*7)*0.8, -1, 1); }
  else if (Math.random() < dt*0.02*(1.1 - a.skill)*3) a.mistake = 0.6;
  const curv = tr.C[(i + 8) % tr.N];
  const want = k.max*(1 - Math.min(0.42, curv*0.55));
  let gas = k.speed < want + 2 ? 1 : 0;
  // driften in langen Kurven
  if (!a.driftOn && curv > 0.45 && k.speed > 18 && Math.abs(steer) > 0.35 && Math.random() < 0.6*a.skill) a.driftOn = true;
  if (a.driftOn && (curv < 0.22 || k.speed < 12)) a.driftOn = false;
  // Items
  const item = items.aiWants(k, raceT);
  return { steer, gas, brake: 0, drift: a.driftOn, item };
}

function physics(k, dt) {
  const c = (state === 'race' || state === 'finished') ? control(k, dt) : { steer: 0, gas: 0, brake: 0, drift: false, item: false };
  if (k.finished && !k.isPlayer) { c.gas = 0.6; }
  k.steerIn = c.steer; k.accIn = (k.speed - (k.prevSpeed ?? k.speed)) / Math.max(dt, 1e-3); k.prevSpeed = k.speed;
  k.bumpCd -= dt;
  // Zeiten runterzählen
  for (const key of ['boost', 'star', 'ink', 'shrink']) if (k[key] > 0) k[key] -= dt;
  if (k.roll > 0) { k.roll -= dt; if (k.isPlayer) { if (Math.random() < 0.35) { const iv = Object.values(ITEMS); $('#itemIcon').textContent = iv[Math.random()*iv.length | 0].icon; sfx('tick'); } }
    if (k.roll <= 0) { k.item = k.rollItem; k.itemN = ITEMS[k.item].n || 1; if (k.isPlayer) { updateItemBox(); sfx('got'); if (Math.random() < 0.35) say(k, 'item'); } } }
  if (c.item && k.item && k.stun <= 0 && k.bubble <= 0) items.use(k);

  const offroad = Math.abs(k.loc.lat) > HALF + 1.2;
  let top = k.max*(k.auto && !k.isPlayer ? k.ai.skill : 1);
  if (!k.isPlayer && player) { const gap = k.prog - player.prog; top *= gap > 120 ? 0.93 : gap < -150 ? 1.08 : 1; }
  if (offroad) top *= k.boost > 0 || k.star > 0 ? 0.9 : 0.55 + (k.offroadPlus || 0);
  top *= 1 + 0.008*(k.coins || 0);
  if (k.boost > 0) top *= 1.3; if (k.star > 0) top *= 1.2; if (k.shrink > 0) top *= 0.72; if (k.ink > 0) top *= 0.9;
  if (k.startBoost > 0) { k.startBoost -= dt; }

  if (k.bubble > 0) {
    k.bubble -= dt; k.speed = approach(k.speed, 4, 30*dt); k.hop = Math.min(2.5, k.hop + dt*6); k.vy = 0;
    if (k.bubble <= 0 && near(k)) sfx('pop');
  } else if (k.stun > 0) {
    k.stun -= dt; k.speed = approach(k.speed, 0, 26*dt); k.spinA += dt*14;
  } else {
    k.spinA = approach(k.spinA % (Math.PI*2), 0, dt*8);
    if (c.gas > 0) {
      if (k.speed < top) k.speed += k.acc*c.gas*dt*(1 - 0.55*Math.max(0, k.speed) / top) + (k.speed < 0 ? 20*dt : 0);
      else k.speed = approach(k.speed, top, 22*dt);
    } else if (c.brake > 0) {
      k.speed = k.speed > 0 ? k.speed - 34*dt : Math.max(-10, k.speed - 12*dt);
    } else k.speed = approach(k.speed, 0, 8*dt);
    if (k.speed > top && c.gas > 0) k.speed = approach(k.speed, top, 22*dt);
    if (k.boost > 0) k.speed = Math.max(k.speed, approach(k.speed, top, 55*dt));

    // Lenken und Driften
    const sp = Math.abs(k.speed), grip = clamp(sp / 10, 0, 1)*(k.hop > 0.6 ? 0.45 : 1);
    if (c.drift && !k.drifting && Math.abs(c.steer) > 0.3 && k.speed > 13 && k.hop <= 0.05) {
      k.drifting = true; k.driftDir = Math.sign(c.steer); k.driftT = 0; k.lvl = 0; k.vy = 5.5; if (near(k)) sfx('hop');
    }
    let yaw;
    if (k.drifting) {
      const x = c.steer*k.driftDir; // -1 … 1
      yaw = -k.driftDir*k.turn*(0.48 + 0.5*(x + 1)/2)*1.25;
      k.driftT += dt*(0.8 + 0.6*Math.max(0, x));
      const lvl = k.driftT > 3.3 ? 3 : k.driftT > 2.0 ? 2 : k.driftT > 0.9 ? 1 : 0;
      if (lvl > k.lvl && k.isPlayer) sfx('tick');
      k.lvl = lvl;
      if (!c.drift || k.speed < 10 || offroad && k.boost <= 0) {
        k.drifting = false;
        if (k.lvl > 0 && !offroad) { k.boost = Math.max(k.boost, [0, 0.6, 1.05, 1.6][k.lvl]); if (near(k)) { sfx('mini'); ring(k.pos, LVLCOL[k.lvl].getHex(), 3 + k.lvl, 0.5); if (k.isPlayer) rumble(0.25 + 0.15*k.lvl, 160); if (k.lvl === 3 && k.isPlayer) ann(10); } if (k.isPlayer && !k.auto) { stats.drifts++; if (k.lvl === 3) stats.purple = (stats.purple || 0) + 1; } }
        k.lvl = 0;
      }
    } else {
      yaw = -c.steer*k.turn*grip*(1 - 0.28*clamp(sp / k.max, 0, 1))*(k.speed < 0 ? -1 : 1);
    }
    k.h = wrapA(k.h + yaw*dt);
  }
  const slideT = k.drifting ? k.driftDir*0.42 : 0;
  k.slide += (slideT - k.slide)*Math.min(1, dt*8);

  // Bewegen
  k.pos.x += Math.sin(k.h)*k.speed*dt; k.pos.z += Math.cos(k.h)*k.speed*dt;
  const L = tr.locate(k.pos, k.loc.i, k.loc);
  // Bande
  const lim = WALL - 1.4;
  if (Math.abs(L.lat) > lim) {
    const s = Math.sign(L.lat), over = Math.abs(L.lat) - lim, R = tr.R[L.i];
    k.pos.x -= R.x*over*s; k.pos.z -= R.z*over*s;
    const into = (Math.sin(k.h)*R.x + Math.cos(k.h)*R.z)*s;
    if (into > 0) {
      k.speed *= 1 - 0.55*into;
      const ta = trackAngle(L.i); const toward = Math.abs(wrapA(ta - k.h)) < Math.PI/2 ? ta : wrapA(ta + Math.PI);
      k.h = wrapA(k.h + wrapA(toward - k.h)*0.35);
      if (k.bumpCd <= 0 && into > 0.25 && Math.abs(k.speed) > 6) { if (k.isPlayer) { sfx('bump'); shake = 0.25; rumble(0.5, 120); } k.bumpCd = 0.4;
        for (let n = 0; n < 6; n++) sparks.emit(k.pos.x + R.x*s*1.2, k.y + 0.6, k.pos.z + R.z*s*1.2, (Math.random() - .5)*6, 3 + Math.random()*3, (Math.random() - .5)*6, COL.white, 0.4); }
    }
    tr.locate(k.pos, L.i, k.loc);
  }
  // Schanzen
  for (const r of ramps) {
    const ds = k.loc.s - r.i0, inLat = Math.abs(k.loc.lat - r.lat) < r.w/2 + 0.5;
    if (ds >= 0 && ds <= r.i1 - r.i0 && inLat && k.vy <= 0.5) { const h = r.H*(ds/(r.i1 - r.i0))**1.4; if (k.hop < h) { k.hop = h; k.vy = 0; } k.onRamp = r; }
    else if (k.onRamp === r && (ds > r.i1 - r.i0 || !inLat)) { k.onRamp = null; if (ds > r.i1 - r.i0 - 1 && k.speed > 12) { k.vy = 5 + k.speed*0.16; k.air = true; k.trickOk = 0.7; k.trick = 0; if (near(k)) sfx('ramp'); } }
  }
  if (k.air && k.trickOk > 0) { k.trickOk -= dt; const want = k.auto ? Math.random() < dt*3 : (c.drift && !k.lastDrift); if (want && !k.trick) { k.trick = 1; if (near(k)) sfx('trick'); } }
  k.lastDrift = c.drift;
  // Höhe, Sprung
  if (k.bubble <= 0) { k.vy -= 28*dt; k.hop += k.vy*dt; if (k.hop <= 0) { if (k.air) { k.air = false; if (k.trick) { k.boost = Math.max(k.boost, 1.0); k.trick = 0; if (near(k)) sfx('mini'); if (k.isPlayer && !k.auto) { showWarn('Trick-Turbo!'); stats.tricks++; if (Math.random() < 0.5) ann(10); else say(k, 'trick'); } } } if (k.vy < -4) { k.sv = (k.sv || 0) - 3.5; if (k.vy < -7 && near(k)) { ring(k.pos, 0xffffff, 4, 0.2); for (let n = 0; n < 10; n++) smoke.emit(k.pos.x + (Math.random() - .5)*3, k.y + 0.3, k.pos.z + (Math.random() - .5)*3, (Math.random() - .5)*6, 1.5, (Math.random() - .5)*6, dustCol.setHex(curDef.dust || 0x8a80a0), 0.8); } if (near(k) && k.vy < -6) sfx('land'); } k.hop = 0; k.vy = 0; } }
  const groundY = k.loc.y + (Math.abs(k.loc.lat) > WALL ? -1 : 0);
  k.y += (groundY - k.y)*Math.min(1, dt*14);

  // Runden
  const s = k.loc.s, N = tr.N;
  if (s > N*0.45 && s < N*0.55) k.cp = true;
  if (k.prevS > N*0.8 && s < N*0.2) { if (k.cp || k.lap === 0) { k.lap++; k.cp = false; onLap(k); } }
  else if (k.prevS < N*0.2 && s > N*0.8) { if (k.lap > 0) { k.lap--; k.cp = true; } }
  k.prevS = s; k.prog = k.lap*N + s - N;

  // Turbo-Felder
  for (const p of pads) { let d = Math.abs(s - p.i); d = Math.min(d, N - d); if (d < 5 && Math.abs(k.loc.lat - p.lat) < 3.6 && k.boost < 1.0) { k.boost = 1.2; if (near(k)) sfx('boost'); } }
  // Windschatten: dicht hinter einem Gegner sammeln, dann kurzer Schub
  let inDraft = false;
  if (k.speed > 16 && k.boost <= 0 && k.hop < 0.3 && !offroad && state === 'race') for (const o of racers) { if (o === k) continue; let ds = o.loc.s - s; if (ds < -N/2) ds += N; else if (ds > N/2) ds -= N; if (ds > 2 && ds < 15 && Math.abs(o.loc.lat - k.loc.lat) < 2.4 && o.speed > 12) { inDraft = true; break; } }
  k.draftT = inDraft ? (k.draftT || 0) + dt : Math.max(0, (k.draftT || 0) - dt*2);
  if (inDraft && k.draftT > 0.35 && near(k) && Math.random() < 0.6) { const a = Math.random()*6.28; sparks.emit(k.pos.x + Math.cos(a)*1.4 + Math.sin(k.h)*2, k.y + 0.8 + Math.sin(a)*0.8, k.pos.z + Math.cos(k.h)*2, -Math.sin(k.h)*14, 0, -Math.cos(k.h)*14, COL.white, 0.25); }
  if (k.draftT > 1.4) { k.draftT = 0; k.boost = Math.max(k.boost, 0.9); if (near(k)) { sfx('boost'); ring(k.pos, 0xffffff, 3, 0.6); } if (k.isPlayer && !k.auto) showWarn('Windschatten!'); }
  items.checkPickup(k); items.checkCoins(k);
  // Falsche Richtung
  if (k.isPlayer && state === 'race') {
    const dot = Math.sin(k.h)*tr.T[k.loc.i].x + Math.cos(k.h)*tr.T[k.loc.i].z;
    k.wrongT = dot < -0.3 && k.speed > 4 ? k.wrongT + dt : 0;
    if (k.wrongT > 1.2 && msgT <= 0) { showMsg('↺ Falsche Richtung!', 1.0, 'warn'); if (k.wrongT < 1.3) ann(12); }
  }
}
function onLap(k) {
  if (k.finished || session.mode === 'coins') return;
  if (k.lap > LAPS) {
    k.finished = true; k.fTime = raceT;
    if (k.isPlayer) finishPlayer();
    return;
  }
  if (k.isPlayer && k.lap > 1) {
    if (k.lap === LAPS) { showMsg('Letzte Runde!', 1.8, 'big'); sfx('final'); ann(6); playMusic(musicFor(), true); } else { showMsg(`Runde ${k.lap}`, 1.3); sfx('lap'); ann(5); }
  }
}
let fwQueue = 0, huntWarn = false;
function fireworks(n) { fwQueue += n; }
function fireworkTick(dt) {
  if (fwQueue <= 0 || !player || Math.random() > dt*6) return; fwQueue--;
  const fx = Math.sin(player.h), fz = Math.cos(player.h), x = player.pos.x + fx*30 + (Math.random() - .5)*30, z = player.pos.z + fz*30 + (Math.random() - .5)*30, y = player.y + 18 + Math.random()*10;
  const c = [COL.blue, COL.orange, COL.purple, COL.yellow, COL.white][Math.random()*5 | 0];
  for (let i = 0; i < 40; i++) { const a = Math.random()*Math.PI*2, b = Math.acos(Math.random()*2 - 1), v = 9 + Math.random()*3; sparks.emit(x, y, z, Math.sin(b)*Math.cos(a)*v, Math.cos(b)*v, Math.sin(b)*Math.sin(a)*v, c, 1.4); }
  if (Math.random() < 0.6) sfx('firework', 0.6);
}
function finishPlayer() {
  if (session.mode === 'time') { finishTime(); return; }
  state = 'finished'; stateT = 0; player.auto = true;
  sfx('finish'); showMsg(player.place === 1 ? 'SIEG!' : 'ZIEL!', 2.5, 'big'); ann(player.place === 1 ? 8 : 7); fireworks(player.place <= 3 ? 20 : 6);
  if (player.place === 1) setTimeout(() => say(player, 'win'), 600);
  else { const w = racers.find(r => r.place === 1); if (w) setTimeout(() => say(w, 'win'), 600); }
}

function collide() {
  for (let a = 0; a < racers.length; a++) for (let b = a + 1; b < racers.length; b++) {
    const A = racers[a], B = racers[b]; const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z, d2 = dx*dx + dz*dz;
    if (d2 > 2.4*2.4 || d2 < 1e-6 || Math.abs(A.hop - B.hop) > 2) continue;
    const d = Math.sqrt(d2), o = 2.4 - d, nx = dx / d, nz = dz / d, wa = B.weight / (A.weight + B.weight);
    A.pos.x -= nx*o*wa; A.pos.z -= nz*o*wa; B.pos.x += nx*o*(1 - wa); B.pos.z += nz*o*(1 - wa);
    if (A.star > 0 && B.star <= 0) hitKart(B, A, 1.2); else if (B.star > 0 && A.star <= 0) hitKart(A, B, 1.2);
    else if ((A.isPlayer || B.isPlayer) && (A.bumpCd <= 0 && B.bumpCd <= 0)) { sfx('bump'); A.bumpCd = B.bumpCd = 0.35; }
  }
}

// ---------- Darstellung der Fahrer ----------
const skidGeo = new THREE.PlaneGeometry(0.42, 1.1); skidGeo.rotateX(-Math.PI/2);
const SKIDN = 900, skids = new THREE.InstancedMesh(skidGeo, new THREE.MeshBasicMaterial({ color: 0x07030f, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SKIDN);
skids.count = SKIDN; skids.frustumCulled = false; { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < SKIDN; i++) skids.setMatrixAt(i, z); } scene.add(skids);
let skidI = 0; const sm4 = new THREE.Matrix4(), sq = new THREE.Quaternion(), sv3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), yAx = new THREE.Vector3(0, 1, 0);
function addSkid(x, y, z, h) { sm4.compose(sv3.set(x, y + 0.04, z), sq.setFromAxisAngle(yAx, h), one); skids.setMatrixAt(skidI, sm4); skidI = (skidI + 1) % SKIDN; skids.instanceMatrix.needsUpdate = true; }

function animKart(k, dt, t) {
  const M = k.model;
  M.root.position.set(k.pos.x, k.y + k.hop, k.pos.z);
  M.root.visible = k.isPlayer || camera.position.distanceToSquared(M.root.position) > 3.2*3.2;
  const yaw = k.h - k.slide + k.spinA; M.root.rotation.y = yaw;
  const i = k.loc.i, nx = tr.P[(i + 3) % tr.N], pv = tr.P[(i - 3 + tr.N) % tr.N];
  const pitch = Math.atan2(nx.y - pv.y, 6*tr.seg);
  // Federung
  k.sv = (k.sv || 0) + (-(k.sy || 0)*220 - (k.sv || 0)*13)*dt; k.sy = (k.sy || 0) + k.sv*dt;
  if (Math.abs(k.loc.lat) > HALF + 1.2 && Math.abs(k.speed) > 6) k.sv += (Math.random() - 0.5)*dt*60;
  k.steerVis = (k.steerVis || 0) + ((k.stun > 0 ? 0 : k.steerIn || 0) - (k.steerVis || 0))*Math.min(1, dt*10);
  k.accVis = (k.accVis || 0) + (clamp(k.accIn || 0, -40, 40) - (k.accVis || 0))*Math.min(1, dt*5);
  const st = k.steerVis, spd = clamp(k.speed / k.max, -1, 1.3);
  M.susp.position.y = k.sy;
  M.susp.rotation.z += ((k.drifting ? -k.driftDir*0.1 : st*0.07*spd) + (M.lean || (k.def.id === 'kritzel' && k.cfg.vehicle === 'sig') ? -st*0.35*spd : 0) - M.susp.rotation.z)*Math.min(1, dt*8);
  M.susp.rotation.x = -pitch - k.accVis*0.0025;
  if (k.tumble > 0) { k.tumble = Math.max(0, k.tumble - dt*1.3); M.susp.rotation.x -= (1 - k.tumble)*Math.PI*2; if (k.tumble === 0) M.susp.rotation.x = -pitch; }
  if (k.trick) { k.trickA = (k.trickA || 0) + dt*14; M.susp.rotation.z = Math.sin(k.trickA)*0.5; M.driver.rotation.y = Math.sin(k.trickA*0.5)*0.8; } else if (k.trickA) { k.trickA = 0; M.driver.rotation.y = 0; }
  M.body.scale.y = 1 + clamp(k.sy*0.6, -0.12, 0.12); M.body.scale.x = M.body.scale.z = 1 - clamp(k.sy*0.3, -0.06, 0.06);
  for (const f of M.fronts) f.rotation.y = -st*0.45;
  if (M.steer) M.steer.rotation.z = st*1.5;
  M.driver.rotation.z = st*0.12*Math.max(0, spd); M.driver.position.y = Math.sin(t*14 + k.def.pitch*9)*0.03*clamp(k.speed / 20, 0, 1);
  if (M.head) M.head.rotation.y += ((k.stun > 0 ? Math.sin(t*20)*0.6 : -st*0.35) - M.head.rotation.y)*Math.min(1, dt*6);
  for (const w of M.wheels) w.rotation.x += k.speed*dt/0.45;
  if (M.scarf) M.scarf.rotation.x = -1.25 + Math.sin(t*14)*0.15 - spd*0.2;
  if (M.flag) M.flag.rotation.y = Math.sin(t*9)*0.35;
  if (M.umbrella) M.umbrella.rotation.y += dt*(0.5 + spd*3);
  if (M.bobble) M.bobble.rotation.z = Math.sin(t*11)*0.35*(0.2 + Math.abs(spd));
  if (M.glow) M.glow.material.opacity = 0.6 + Math.sin(t*6)*0.15;
  if (M.hover) M.body.position.y = 0.25 + Math.sin(t*3 + k.def.pitch)*0.12;
  if (M.orb) M.orb.rotation.y += dt*3;
  if (M.tray) M.tray.rotation.z = Math.sin(t*5)*0.08 - st*0.15;
  if (M.halo) M.halo.rotation.z += dt;
  if (M.tail) M.tail.rotation.y = Math.sin(t*6)*0.25;
  const sc = k.shrink > 0 ? 0.6 : 1; M.root.scale.setScalar(M.root.scale.x + (sc - M.root.scale.x)*Math.min(1, dt*6));
  const fl = k.boost > 0 || k.star > 0;
  for (const f of M.flames) { f.visible = fl; if (fl) f.scale.set(1, 1, 0.8 + Math.random()*0.7 + (k.boost > 1 ? 0.4 : 0)); }
  if (M.flameMats) M.flameMats[0].color.setHex(k.star > 0 ? 0xff5af0 : k.lvl >= 3 || k.boost > 1.2 ? 0xc04bff : 0xff7a1a);
  if (k.star > 0) { const c = new THREE.Color().setHSL((t*2) % 1, 1, 0.6); if (Math.random() < 0.7) sparks.emit(k.pos.x + (Math.random() - .5)*2.4, k.y + 0.5 + Math.random()*2.5, k.pos.z + (Math.random() - .5)*2.4, 0, 2, 0, c, 0.5); }
  // Drift-Funken + Reifenspuren
  const bx = -Math.sin(yaw), bz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  if (k.drifting && k.hop <= 0.1) {
    const col = LVLCOL[k.lvl], onRoad = Math.abs(k.loc.lat) < HALF + 1;
    for (const s of [-1, 1]) {
      const px = k.pos.x + bx*1.1 + rx*s*1.0, pz = k.pos.z + bz*1.1 + rz*s*1.0;
      if (col) for (let n = 0; n < (k.lvl >= 2 ? 3 : 2); n++) sparks.emit(px, k.y + 0.3, pz, bx*5 + rx*s*2 + (Math.random() - .5)*4, 2 + Math.random()*4, bz*5 + rz*s*2 + (Math.random() - .5)*4, col, 0.3 + Math.random()*0.2);
      if (Math.random() < 0.5) smoke.emit(px, k.y + 0.4, pz, bx*2, 1.2, bz*2, COL.smoke, 0.7);
      if (onRoad && near(k)) { const key = s < 0 ? 'skA' : 'skB'; const last = k[key]; if (!last || (last.x - px)**2 + (last.z - pz)**2 > 0.7) { addSkid(px, k.y, pz, yaw); k[key] = { x: px, z: pz }; } }
    }
  } else { k.skA = k.skB = null; }
  if (k.boost > 0 && Math.random() < 0.6) for (const [ex, ey, ez] of M.exhaust || []) { const wx = k.pos.x + rx*ex + bx*(-ez + 0.8), wz = k.pos.z + rz*ex + bz*(-ez + 0.8); sparks.emit(wx, k.y + ey, wz, bx*8, 1, bz*8, COL.orange, 0.25); }
  if (Math.abs(k.loc.lat) > HALF + 1.2 && Math.abs(k.speed) > 8 && Math.random() < 0.7) {
    if (curDef.splash) { for (let n = 0; n < 2; n++) sparks.emit(k.pos.x + bx + (Math.random() - .5)*2, k.y + 0.3, k.pos.z + bz + (Math.random() - .5)*2, (Math.random() - .5)*5 + bx*3, 4 + Math.random()*4, (Math.random() - .5)*5 + bz*3, COL.water, 0.6); }
    else smoke.emit(k.pos.x + bx, k.y + 0.3, k.pos.z + bz, (Math.random() - .5)*3, 2, (Math.random() - .5)*3, dustCol.setHex(curDef.dust || 0x6a8a5a), 0.8); }
  if (curDef.theme === 'desert' && Math.abs(k.speed) > 18 && Math.random() < 0.25) smoke.emit(k.pos.x + bx*1.5, k.y + 0.3, k.pos.z + bz*1.5, (Math.random() - .5)*2, 1.2, (Math.random() - .5)*2, dustCol.setHex(0xe0b070), 0.9);
  if (k.stun > 0 && Math.random() < 0.5) sparks.emit(k.pos.x + Math.cos(t*10)*1.2, k.y + 3.2, k.pos.z + Math.sin(t*10)*1.2, 0, 0.5, 0, COL.yellow, 0.3);
}

// ---------- Hauptschleife ----------
const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, fpsCheck = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt0 = Math.min(0.05, clock.getDelta());
  pollInput();
  for (let n = 0; n < SIM; n++) update(SIM > 1 ? 1/30 : dt0, clock.elapsedTime + n/30);
  render(dt0);
}
function update(dt, t) {
  env.update(t, dt); if (world && world.userData.waterTex) world.userData.waterTex.offset.y += dt*0.15;
  chevTex.offset.y += dt*1.5;

  if (MENU.has(state)) { menuTick(dt, t); } else if (state === 'podium') { podiumTick(dt, t); }
  else if (!paused) {
    if (input.pause && state !== 'finished') { togglePause(true); }
    stateT += dt;
    if (state === 'intro') {
      const a = player.h + Math.PI*(1 - Math.min(1, stateT / 2.6)), r = 14 - 5*Math.min(1, stateT / 2.6);
      camPos.set(player.pos.x + Math.sin(a)*r, player.y + 3 + stateT*0.3, player.pos.z + Math.cos(a)*r); camLook.set(player.pos.x, player.y + 1.4, player.pos.z);
      if (stateT > 2.6 || AUTO) { state = 'count'; stateT = 0; }
    } else if (state === 'count') {
      const n = 3 - Math.floor(stateT);
      if (n !== countN && n >= 1) { countN = n; showMsg(String(n), 0.9, 'big'); sfx('beep'); ann(4 - n); }
      // Turbo-Start: Gas genau bei "1" drücken
      if (input.gas > 0 && !player.gasT) player.gasT = stateT;
      if (input.gas <= 0) player.gasT = 0;
      if (stateT >= 3 || AUTO) {
        state = 'race'; stateT = 0; showMsg('LOS!', 1.0, 'big go'); sfx('go'); ann(4); playMusic(musicFor());
        if (player.gasT && player.gasT > 1.9 && !MOBILE) { player.boost = 1.1; showWarn('Turbo-Start!'); sfx('boost'); setTimeout(() => ann(9), 700); }
        for (const r of racers) if (r !== player && Math.random() < 0.5) r.boost = 0.6 + Math.random()*0.5;
        setTimeout(() => say(player, 'start'), 900);
      }
      chaseCam(dt);
    } else {
      if (state === 'race' || state === 'finished') raceT += dt;
      for (const k of racers) physics(k, dt);
      collide(); items.update(dt, t); ghostTick(dt); fireworkTick(dt); fxTick(dt);
      // Platzierung
      const before = player.place;
      (session.mode === 'coins' ? [...racers].sort((a, b) => ((b.hunt || 0) - (a.hunt || 0)) || (b.prog - a.prog)) : [...racers].sort((a, b) => (b.finished - a.finished) || (a.finished ? a.fTime - b.fTime : b.prog - a.prog))).forEach((k, i) => k.place = i + 1);
      if (session.mode === 'coins' && state === 'race') { const left = HUNT_T - raceT;
        if (left < 10.5 && !huntWarn) { huntWarn = true; showMsg('Noch 10 Sekunden!', 1.6, 'big'); sfx('final'); playMusic(musicFor(), true); }
        if (left <= 0) { for (const k of racers) { k.finished = true; k.fTime = raceT; } finishPlayer(); } }
      if (state === 'race' && player.place === 1 && before > 1 && raceT > 5) say(player, 'pass');
      chaseCam(dt);
      if (state === 'finished' && stateT > 3.2 && !results) { if (session.mode === 'time') showTimeResults(); else showResults(); }
    }
    for (const k of racers) animKart(k, dt, t);
    sparks.update(dt, 9); smoke.update(dt, -1.5);
    if (player) engineUpdate(clamp(Math.abs(player.speed) / 40, 0, 1), player.boost > 0, player.drifting, player.lvl, state !== 'finished' || stateT < 2);
    hudTick(dt);
  }
  if (window.__traceFn) window.__traceFn();
}
function render(dt) {
  // Kamera anwenden
  if (!MENU.has(state) && state !== 'podium') {
    if (window.__camHook) window.__camHook(camPos, camLook, player, racers);
    camera.position.copy(camPos);
    if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - .5)*shake; camera.position.y += (Math.random() - .5)*shake; }
    camera.lookAt(camLook);
    if (player) camera.rotateZ(player.slide*0.05 + (player.steerVis || 0)*-0.015);
    camera.clearViewOffset();
    const fov = (camera.aspect < 1 ? 85 : 70) + (player && player.boost > 0 ? 8 : 0);
    camera.fov += (fov - camera.fov)*Math.min(1, dt*4); camera.updateProjectionMatrix();
  }
  env.follow(podium.group ? podium.group.position : player && !MENU.has(state) ? player.pos : tr.P[6]);
  // Gegner, die direkt vor der Kamera kleben, ausblenden (sonst verdecken sie das Bild)
  if (player && !MENU.has(state) && state !== 'podium') for (const k of racers) if (k !== player) k.model.root.visible = camera.position.distanceToSquared(tmpV3.set(k.pos.x, k.y + 1, k.pos.z)) > 3.2*3.2;
  $('#speed').classList.toggle('on', !!(player && (player.boost > 0 || player.star > 0) && (state === 'race')));
  if (useBloom) composer.render(); else renderer.render(scene, camera);
  if (window.__shotCb) { const cb = window.__shotCb; window.__shotCb = null; cb(canvas.toDataURL('image/jpeg', 0.85)); }
  // Qualität anpassen
  fpsAcc += dt; fpsN++; fpsCheck += dt;
  if (fpsCheck > 3) { const fps = fpsN / fpsAcc; if (fps < 42 && !AUTO && gfx === 'auto') { if (pr > 1) { pr = Math.max(1, pr - 0.25); renderer.setPixelRatio(pr); resize(); } else if (useBloom && fps < 34) useBloom = false; else if (pr > 0.75) { pr = 0.75; renderer.setPixelRatio(pr); resize(); } } fpsAcc = fpsN = fpsCheck = 0; window.__fps = fps; }
}
function chaseCam(dt) {
  const k = player, bh = k.h - k.slide*0.35, back = 6.9 + (k.boost > 0 ? 1.2 : 0), up = 2.75;
  tmpV.set(k.pos.x - Math.sin(bh)*back, k.y + k.hop*0.5 + up, k.pos.z - Math.cos(bh)*back);
  camPos.lerp(tmpV, 1 - Math.exp(-dt*8));
  const minY = tr.locate(camPos, k.loc.i).y + 1.2; if (camPos.y < minY) camPos.y = minY;
  tmpV2.set(k.pos.x + Math.sin(k.h)*7, k.y + 1.7, k.pos.z + Math.cos(k.h)*7);
  camLook.lerp(tmpV2, 1 - Math.exp(-dt*12));
}
function hudTick(dt) {
  if (!player) return;
  $('#pos').innerHTML = `${player.place}<small>.</small><span>/${racers.length}</span>`;
  $('#pos').style.color = ['#ffe14a', '#e6e6ff', '#ffb27a'][player.place - 1] || '#fff';
  if (session.mode === 'coins') { $('#lap').textContent = `🪙 ${player.hunt || 0} Münzen`; $('#time').textContent = fmt(Math.max(0, HUNT_T - raceT)); }
  else { $('#lap').textContent = `Runde ${clamp(player.lap, 1, LAPS)}/${LAPS}`; $('#time').textContent = fmt(raceT); }
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.className = ''; }
  if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove('show'); }
  if (warnT > 0) { warnT -= dt; if (warnT <= 0) warnEl.classList.remove('show'); }
  const ib = $('#itemBox'); ib.classList.toggle('rolling', player.roll > 0);
  $('#driftBar').style.setProperty('--c', ['#888', '#3ad0ff', '#ff8a1a', '#d04bff'][player.lvl]);
  $('#driftBar').classList.toggle('show', player.drifting);
  drawMini();
}

// ---------- Spielmodi, Grand Prix, Zeitfahren ----------
PG.load();
const POINTS = [10, 8, 6, 4, 2, 1];
let session = { mode: 'single', track: TRACKS[0], cup: null, idx: 0, points: {}, order: null };
const allDrivers = () => DRIVERS.filter(d => !d.locked || PG.state().unlockedDrivers.includes(d.id));
function aiCfg(def) {
  const paints = ['p1', 'p1', 'p1', 'p2', 'p3', 'p4'], veh = ['sig', 'sig', 'sig', 'sig', 'kart', 'bike'];
  return { paint: paints[Math.random()*paints.length | 0], vehicle: cls.id === 'gem' ? 'sig' : veh[Math.random()*veh.length | 0], wheels: 'std', outfit: Math.random() < 0.25 ? ['party', 'phones', 'shades', 'tophat'][Math.random()*4 | 0] : 'none' };
}
let ghost = null, ghostRec = [], ghostT = 0;
function startRace() {
  initAudio();
  const def = allDrivers()[selIdx] || DRIVERS[0];
  loadTrack(session.track, true);
  for (const r of racers) scene.remove(r.model.root);
  if (ghost) { scene.remove(ghost.root); ghost = null; }
  racers = []; stats = newStats();
  if (session.mode === 'time') {
    player = makeKart(def, true, 2); racers.push(player); player.item = 'troete3'; player.itemN = 3;
    for (const p of items.pickups) { p.t = 1e9; p.g.visible = false; }
    const g = PG.state().ghosts[session.track.id];
    if (g) { ghost = buildRacer(g.d, g.cfg || {}); ghost.root.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; o.material.depthWrite = false; } }); ghost.data = g; scene.add(ghost.root); }
    ghostRec = []; ghostT = 0;
  } else {
    let order;
    if (session.mode === 'gp' && session.order) order = session.order.filter(d => d.id !== def.id);
    else order = allDrivers().filter(d => d !== def).sort(() => Math.random() - 0.5).slice(0, 5);
    if (session.mode === 'gp' && !session.order) session.order = order;
    // Grand Prix: Führende starten hinten
    const grid = session.mode === 'gp' && session.idx > 0 ? [...order].sort((a, b) => (session.points[a.id] || 0) - (session.points[b.id] || 0)) : order;
    grid.forEach((d, i) => racers.push(makeKart(d, false, i, session.cfgs?.[d.id])));
    if (session.mode === 'gp') { session.cfgs ||= {}; for (const r of racers) session.cfgs[r.def.id] = r.cfg; }
    const pPos = session.mode === 'gp' && session.idx > 0 ? Math.max(0, 5 - [...grid, def].sort((a, b) => (session.points[b.id] || 0) - (session.points[a.id] || 0)).findIndex(d => d === def)) : 5;
    player = makeKart(def, true, Math.min(5, pPos)); racers.push(player);
    if (pPos < 5) { // Startplätze tauschen
      const other = racers.find(r => r !== player && Math.abs(r.pos.distanceTo(player.pos)) < 0.5); void other;
      racers.filter(r => r !== player).forEach((r, i) => { const gp = i >= pPos ? i + 1 : i; const row = Math.floor(gp / 2), side = gp % 2 ? 1 : -1, ii = (tr.N - 14 - row*10 + tr.N) % tr.N; r.pos.copy(tr.P[ii]).addScaledVector(tr.R[ii], side*5); r.y = tr.P[ii].y; r.prevS = ii; r.prog = ii - tr.N; tr.locate(r.pos, ii, r.loc); });
    }
  }
  items.setHunt(session.mode === 'coins'); huntWarn = false; for (const r of racers) r.hunt = 0;
  items.reset(); preview.group.visible = false; $('#coins').textContent = '🪙 0';
  if (session.mode === 'time') for (const p of items.pickups) { p.t = 1e9; p.g.visible = false; }
  state = 'intro'; stateT = 0; raceT = 0; countN = 4; results = null; paused = false;
  setScreen('race'); updateItemBox(); $('#ink').style.opacity = 0;
  $('#trackName').textContent = session.track.icon + ' ' + session.track.name + (session.mode === 'gp' ? `  ·  Rennen ${session.idx + 1}/4` : session.mode === 'time' ? '  ·  Zeitfahren' : session.mode === 'coins' ? '  ·  Münzjagd: 2 Minuten' : '');
  $('#trackName').classList.add('show'); setTimeout(() => $('#trackName').classList.remove('show'), 3500);
  $('#ghostNote').textContent = session.mode === 'time' ? (PG.state().best[session.track.id] ? '👻 Bestzeit ' + fmt(PG.state().best[session.track.id]) : '') : '';
  if (MOBILE) { input.mode = 'touch'; $('#touch').classList.toggle('tilt', input.touchMode === 'tilt'); }
  engineStart(); stopMusic(); preloadVoices(['ann', 'ann2', ...racers.map(r => r.def.id)]);
  setTimeout(() => { if (state === 'intro') { const a = session.mode === 'time' ? 6 : TRACK_ANN[session.track.id]; if (a !== undefined) ann2(a); } }, 400);
  camPos.copy(player.pos).add(new THREE.Vector3(Math.sin(player.h)*14, 4, Math.cos(player.h)*14));
}
// Geist aufnehmen/abspielen (Zeitfahren)
function ghostTick(dt) {
  if (session.mode !== 'time' || state !== 'race') return;
  ghostT += dt;
  if (ghostT >= 0.1) { ghostT -= 0.1; ghostRec.push([+player.pos.x.toFixed(2), +(player.y + player.hop).toFixed(2), +player.pos.z.toFixed(2), +(player.h - player.slide).toFixed(3)]); }
  if (ghost) { const f = ghost.data.f, k = raceT/0.1, i = Math.min(f.length - 2, Math.floor(k)), a = k - i; if (i >= 0 && f[i + 1]) { const A = f[i], B = f[i + 1];
    ghost.root.position.set(A[0] + (B[0] - A[0])*a, A[1] + (B[1] - A[1])*a, A[2] + (B[2] - A[2])*a); ghost.root.rotation.y = A[3] + wrapA(B[3] - A[3])*a; for (const w of ghost.wheels) w.rotation.x += dt*60; } }
}
function finishTime() {
  state = 'finished'; stateT = 0; player.auto = true; sfx('finish');
  const rec = PG.setBest(session.track.id, player.fTime, { d: player.def.id, cfg: player.cfg, f: ghostRec });
  showMsg(rec ? 'NEUE BESTZEIT!' : 'ZIEL!', 2.5, 'big'); session.newRecord = rec; ann(rec ? 13 : 7); fireworks(rec ? 16 : 4);
  PG.event('time'); PG.event('race');
}
function showTimeResults() {
  results = true; setScreen('results'); playMusic('menu'); engineStop();
  const best = PG.state().best[session.track.id];
  $('#resTitle').textContent = session.newRecord ? 'Neue Bestzeit! ⏱️' : 'Zeitfahren';
  $('#resSub').textContent = session.track.icon + ' ' + session.track.name;
  $('#resList').innerHTML = `<li class="me"><b>⏱️</b><span style="background:${player.def.color}">${player.def.icon}</span><em>Deine Zeit</em><i>${fmt(player.fTime)}</i></li><li><b>🏅</b><span>👻</span><em>Bestzeit</em><i>${fmt(best)}</i></li>`;
  awardXP(30, []);
  $('#btnAgain').textContent = 'Nochmal fahren'; $('#btnAgain').onclick = () => startRace();
}
function raceXP(k) { return 25 + (7 - k.place)*12 + stats.hits*3 + stats.tricks*3 + (k.place === 1 ? 25 : 0) + (cls.id === 'turbo' ? 15 : cls.id === 'flott' ? 5 : 0); }
function awardXP(xp, extra) {
  const d = player.def, before = { ...PG.drv(d.id) };
  const got = PG.addXP(d.id, xp);
  PG.addCoins(stats.coins);
  const done = PG.claim();
  const after = PG.drv(d.id);
  const pct = l => after.lvl >= PG.MAXLVL ? 100 : Math.round(100*after.xp/PG.need(after.lvl));
  const box = $('#resXP');
  box.innerHTML = `<div class="xpLine"><span>${d.icon} ${d.name} · Level ${after.lvl}</span><span>+${xp} EP · +${stats.coins} 🪙</span></div><div class="xpBar"><i style="width:${before.lvl < after.lvl ? 0 : Math.round(100*before.xp/PG.need(before.lvl))}%"></i></div>`;
  setTimeout(() => { const i = box.querySelector('.xpBar i'); if (i) i.style.width = pct() + '%'; }, 100);
  const rewards = [...extra];
  for (const r of got) rewards.push(r.type === 'level' ? `⭐ Level ${r.lvl} erreicht!` : `${PG.rewardIcon(r)} Neu freigeschaltet: ${PG.rewardName(r)}`);
  for (const x of done) rewards.push(x.kind === 'quest' ? `📜 Aufgabe geschafft: ${x.q.text} (+${x.q.coins} 🪙)` : `🏅 Erfolg: ${x.a.text}${x.a.unlock ? ' – neuer Fahrer freigeschaltet!' : ''}`);
  rewards.forEach((t, i) => { const el = document.createElement('div'); el.className = 'reward'; el.style.animationDelay = (0.4 + i*0.25) + 's'; el.textContent = t; box.appendChild(el); });
  if (got.length) setTimeout(() => sfx('lap'), 600);
  updateQuestHint();
}
function showResults() {
  results = true; setScreen('results'); playMusic('menu'); engineStop();
  const list = [...racers].sort((a, b) => a.place - b.place);
  const avg = Math.max(1, player.prog) / Math.max(1, player.fTime);
  const gp = session.mode === 'gp';
  if (gp) list.forEach(k => { session.points[k.def.id] = (session.points[k.def.id] || 0) + POINTS[k.place - 1]; });
  $('#resList').innerHTML = list.map(k => {
    const time = k.finished ? k.fTime : raceT + (LAPS*tr.N - k.prog) / avg;
    return `<li class="${k.isPlayer ? 'me' : ''}"><b>${k.place}.</b><span style="background:${k.def.color}">${k.def.icon}</span><em>${k.def.name}</em><i>${session.mode === 'coins' ? '🪙 ' + (k.hunt || 0) : (k.finished ? '' : '≈ ') + fmt(time)}</i>${gp ? `<i class="pts">+${POINTS[k.place - 1]}</i>` : ''}</li>`;
  }).join('');
  $('#resTitle').textContent = player.place === 1 ? 'Gewonnen! 🏆' : player.place <= 3 ? `Platz ${player.place} – Podest!` : `Platz ${player.place}`;
  $('#resSub').textContent = session.track.icon + ' ' + session.track.name + (gp ? ` · Rennen ${session.idx + 1}/4` : session.mode === 'coins' ? ` · Münzjagd · ${player.hunt || 0} Münzen` : '');
  // Ereignisse für Aufgaben
  PG.event('race'); if (player.place <= 3) PG.event('podium');
  if (session.mode === 'coins') { if (player.place === 1) PG.event('huntWin'); if ((player.hunt || 0) >= 40) PG.event('hunt30'); stats.coins = Math.round((player.hunt || 0)/3); }
  if (player.place === 1) { PG.event('win'); PG.event('win:' + player.def.id); PG.event('win@' + session.track.id); PG.trackWin(session.track.id, TRACKS.map(t => t.id)); }
  PG.event('hit', stats.hits); PG.event('trick', stats.tricks); PG.event('coin', stats.coins); PG.event('item', stats.items); PG.event('mini', stats.drifts); PG.event('purple', stats.purple || 0);
  awardXP(raceXP(player), []);
  if (gp) { $('#btnAgain').textContent = 'Weiter'; $('#btnAgain').onclick = showStandings; $('#btnChange').textContent = 'Grand Prix abbrechen'; }
  else { $('#btnAgain').textContent = 'Nochmal fahren'; $('#btnAgain').onclick = () => startRace(); $('#btnChange').textContent = 'Zum Menü'; }
}
function standingsList() { const ids = [player.def, ...session.order]; return ids.map(d => ({ d, p: session.points[d.id] || 0 })).sort((a, b) => b.p - a.p); }
function showStandings() {
  ann2(session.idx >= 3 ? 12 : 12);
  state = 'standings'; setScreen('standings'); for (const r of racers) r.model.root.visible = false;
  const last = session.idx >= 3;
  $('#stTitle').textContent = last ? 'Endstand' : 'Zwischenstand';
  $('#stSub').textContent = `${session.cup.icon} ${session.cup.name} · nach Rennen ${session.idx + 1}/4`;
  $('#stList').innerHTML = standingsList().map((x, i) => `<li class="${x.d === player.def ? 'me' : ''}"><b>${i + 1}.</b><span style="background:${x.d.color}">${x.d.icon}</span><em>${x.d.name}</em><i class="pts">${x.p} Punkte</i></li>`).join('');
  $('#btnNext').textContent = last ? 'Zur Siegerehrung 🏆' : `Nächstes Rennen: ${trackById(session.cup.tracks[session.idx + 1]).name}`;
}
$('#btnNext').onclick = () => {
  if (session.idx >= 3) { startPodium(); return; }
  session.idx++; session.track = trackById(session.cup.tracks[session.idx]); startRace();
};
// ---------- Siegerehrung ----------
const podium = { group: null, t: 0 };
function startPodium() {
  state = 'podium'; setScreen('podium'); playMusic('podium'); setTimeout(() => sfx('crowd'), 300);
  for (const r of racers) scene.remove(r.model.root);
  const top = standingsList().slice(0, 3);
  const place = top.findIndex(x => x.d === player.def) + 1;
  const g = new THREE.Group(); podium.group = g; podium.t = 0; scene.add(g);
  const p = tr.P[30], T = tr.T[30], R = tr.R[30]; g.position.copy(p); g.rotation.y = Math.atan2(T.x, T.z) + Math.PI;
  const cols = [0xffc928, 0xc8d0e0, 0xd08a4a], hs = [3.2, 2.2, 1.5], xs = [0, -5, 5];
  top.forEach((x, i) => {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, hs[i], 24), toon(cols[i])); ped.position.set(xs[i], hs[i]/2, 0); ped.castShadow = true; g.add(ped);
    const num = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const q = c.getContext('2d'); q.fillStyle = '#fff'; q.beginPath(); q.arc(64, 64, 62, 0, 7); q.fill(); q.fillStyle = '#150a24'; q.font = '900 90px system-ui'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(i + 1), 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
    num.position.set(xs[i], hs[i]/2, 2.62); g.add(num);
    const cfg = x.d === player.def ? PG.drv(x.d.id) : (session.cfgs?.[x.d.id] || {});
    const m = buildRacer(x.d.id, cfg); m.root.position.set(xs[i], hs[i], 0); m.root.rotation.y = 0; g.add(m.root); x.m = m;
  });
  const cup = new THREE.Group(); cup.position.set(0, hs[0] + 7.2, 0.5); g.add(cup); podium.cup = cup;
  const gold = new THREE.MeshToonMaterial({ color: 0xffc928, emissive: 0x553300 });
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2), gold); bowl.material.side = THREE.DoubleSide; bowl.scale.set(1, 1.2, 1); cup.add(bowl);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 12), gold); stem.position.y = -1.7; cup.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.4, 16), gold); base.position.y = -2.4; cup.add(base);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 8, 16, Math.PI), gold); h.position.set(s*1.05, -0.4, 0); h.rotation.z = s > 0 ? -Math.PI/2 : Math.PI/2; cup.add(h); }
  podium.top = top; podium.cam = { p, R };
  $('#podTitle').textContent = place === 1 ? '🏆 Gold-Pokal!' : place === 2 ? '🥈 Silber!' : place === 3 ? '🥉 Bronze!' : `Platz ${standingsList().findIndex(x => x.d === player.def) + 1}`;
  $('#podSub').textContent = `${session.cup.name} · ${cls.name}`;
  ann2(13); setTimeout(() => { if (place >= 1 && place <= 3) ann2(6 + place); }, 1800);
  // Belohnungen
  PG.event('gp'); if (place === 1) { PG.event('gpWin'); if (cls.id === 'turbo') PG.event('gpWinTurbo'); }
  PG.cupResult(session.cup.id, cls.id, place || 9);
  if (CUPS.every(c => Object.entries(PG.state().cups).some(([k, v]) => k.startsWith(c.id + ':') && v === 1))) PG.event('allcups');
  const bonus = place === 1 ? 120 : place === 2 ? 80 : place === 3 ? 50 : 20, coinBonus = place === 1 ? 100 : place === 2 ? 60 : place === 3 ? 30 : 10;
  PG.addCoins(coinBonus);
  const got = PG.addXP(player.def.id, bonus); const done = PG.claim();
  const R2 = $('#podRewards'); R2.innerHTML = '';
  const list = [`🎁 Pokal-Bonus: +${bonus} EP · +${coinBonus} 🪙`, ...got.map(r => r.type === 'level' ? `⭐ Level ${r.lvl}!` : `${PG.rewardIcon(r)} ${PG.rewardName(r)} freigeschaltet`), ...done.map(x => x.kind === 'quest' ? `📜 ${x.q.text} (+${x.q.coins} 🪙)` : `🏅 ${x.a.text}${x.a.unlock ? ' – neuer Fahrer!' : ''}`)];
  list.forEach((t, i) => { const el = document.createElement('div'); el.className = 'reward'; el.style.animationDelay = (1 + i*0.3) + 's'; el.textContent = t; R2.appendChild(el); });
  sfx('finish'); if (top[0]) setTimeout(() => say({ def: top[0].d }, 'win'), 900);
  session.mode = 'done';
}
function podiumTick(dt, t) {
  podium.t += dt; const g = podium.group; if (!g) return;
  const a = Math.sin(t*0.3)*0.5, c = podium.cam;
  const fw = new THREE.Vector3(0, 0, -1).applyEuler(g.rotation);
  camera.position.set(g.position.x - fw.x*19 + Math.cos(a)*3, g.position.y + 6.5, g.position.z - fw.z*19 + Math.sin(a)*3);
  camera.lookAt(g.position.x, g.position.y + 2.6, g.position.z); camera.clearViewOffset(); camera.fov = camera.aspect < 1 ? 75 : 55; camera.updateProjectionMatrix();
  podium.cup.rotation.y += dt*1.2;
  podium.top.forEach((x, i) => { if (!x.m) return; x.m.driver.position.y = Math.abs(Math.sin(t*(i ? 4 : 6) + i))*(i ? 0.25 : 0.5); if (x.m.head) x.m.head.rotation.y = Math.sin(t*2 + i)*0.4; });
  if (Math.random() < 0.8) { const cc = [COL.blue, COL.orange, COL.purple, COL.yellow][Math.random()*4 | 0]; sparks.emit(g.position.x + (Math.random() - .5)*16, g.position.y + 14, g.position.z + (Math.random() - .5)*8, (Math.random() - .5)*2, -2, (Math.random() - .5)*2, cc, 3); }
  sparks.update(dt, 1.2);
  void c; void dt;
}
$('#btnPodDone').onclick = () => { if (podium.group) { scene.remove(podium.group); podium.group = null; } goMenu(); };

// ---------- Menüs ----------
const preview = { group: new THREE.Group(), model: null, key: null };
scene.add(preview.group);
let navCd = 0, garDrv = null, garTab = 'vehicle';
function previewDriver() { return state === 'garage' ? garDrv : allDrivers()[selIdx]; }
function menuTick(dt, t) {
  const i = 6, p = tr.P[i];
  const d = previewDriver();
  if (d) { const cfg = PG.drv(d.id), key = d.id + JSON.stringify(cfg);
    if (preview.key !== key) { if (preview.model) preview.group.remove(preview.model.root); preview.model = buildRacer(d.id, cfg); preview.group.add(preview.model.root); preview.key = key; } }
  preview.group.position.set(p.x, p.y, p.z); preview.group.rotation.y = window.__fixRot ?? t*0.7;
  const showKart = state === 'select' || state === 'garage';
  preview.group.visible = showKart;
  if (preview.model) { preview.model.driver.position.y = preview.model.driver.position.y*0.9 + 0.1*Math.abs(Math.sin(t*3))*0.15; if (preview.model.halo) preview.model.halo.rotation.z += dt; }
  const a = t*0.08, r = showKart ? 8.5 : 60, q2 = showKart ? p : tr.P[Math.round(tr.N*0.12)];
  const look = showKart ? tmpV.set(p.x, p.y + (camera.aspect < 1 ? 2.6 : 1.1), p.z) : tmpV.set(q2.x, q2.y + 4, q2.z);
  camera.position.set(q2.x + Math.sin(a)*r, q2.y + (showKart ? 3.3 : 28), q2.z + Math.cos(a)*r);
  camera.lookAt(look); camera.fov = camera.aspect < 1 ? 70 : 50;
  const panel = state === 'garage' ? $('.garPanel') : $('.selPanel');
  if (showKart && camera.aspect >= 1) { const pw = (panel || {}).offsetWidth || innerWidth*0.45; camera.setViewOffset(innerWidth, innerHeight, pw*0.5, -innerHeight*0.04, innerWidth, innerHeight); } else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  sparks.update(dt, 9);
  menuNav(dt);
}
// Steuerung der Menüs mit Controller/Tastatur: Richtung bewegt den Fokus, A/Enter klickt, B/Esc geht zurück
let lastDir = '', dirT = 0;
function focusables() { const scr = document.querySelector('.scr.show'); if (!scr) return []; return [...scr.querySelectorAll('button, .card, .tsCard, .gItem')].filter(e => e.offsetParent && !e.disabled); }
function focusFirst() { setTimeout(() => { const f = focusables(); const pref = f.find(e => e.classList.contains('sel') || e.id === 'btnGo' || e.id === 'btnSetGo' || e.id === 'btnNext' || e.id === 'btnAgain' || e.id === 'btnPodDone') || f[0]; if (pref && (input.mode === 'pad' || input.mode === 'keys')) pref.focus({ preventScroll: false }); }, 50); }
function menuNav(dt) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  let dx = 0, dy = 0, ok = false, back = false;
  for (const p of pads) { const ax = p.axes[0] || 0, ay = p.axes[1] || 0; if (Math.abs(ax) > 0.55) dx = Math.sign(ax); if (Math.abs(ay) > 0.55) dy = Math.sign(ay);
    if (p.buttons[14]?.pressed) dx = -1; if (p.buttons[15]?.pressed) dx = 1; if (p.buttons[12]?.pressed) dy = -1; if (p.buttons[13]?.pressed) dy = 1;
    if (p.buttons[0]?.pressed) ok = true; if (p.buttons[1]?.pressed || p.buttons[8]?.pressed) back = true; }
  const dir = dx ? (dx > 0 ? 'r' : 'l') : dy ? (dy > 0 ? 'd' : 'u') : '';
  dirT -= dt;
  if (dir && (dir !== lastDir || dirT <= 0)) { moveFocus(dx, dy); dirT = dir === lastDir ? 0.16 : 0.38; }
  lastDir = dir;
  if (ok && !menuNav.ok) { const a = document.activeElement; if (a && focusables().includes(a)) a.click(); else focusFirst(); }
  if (back && !menuNav.back) goBack();
  menuNav.ok = ok; menuNav.back = back;
}
function moveFocus(dx, dy) {
  const f = focusables(); if (!f.length) return; input.mode = 'pad';
  const cur = document.activeElement; if (!f.includes(cur)) { focusFirst(); return; }
  const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width/2, cy = r0.top + r0.height/2;
  let best = null, bs = 1e9;
  for (const e of f) { if (e === cur) continue; const r = e.getBoundingClientRect(), x = r.left + r.width/2 - cx, y = r.top + r.height/2 - cy;
    const along = dx ? x*dx : y*dy, side = dx ? Math.abs(y) : Math.abs(x); if (along <= 4) continue; const sc = along + side*2.2; if (sc < bs) { bs = sc; best = e; } }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); sfx('tick'); }
}
addEventListener('keydown', e => { if (!MENU.has(state) && state !== 'podium' && state !== 'results' && !paused) return;
  const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (m) { e.preventDefault(); input.mode = 'keys'; moveFocus(...m); }
  else if (e.key === 'Escape' || e.key === 'Backspace') { if (MENU.has(state)) goBack(); } });
function goBack() {
  const b = document.querySelector('.scr.show [data-back]'); if (b) { b.click(); return; }
  if (state === 'menu') { state = 'title'; setScreen('title'); }
}
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { const to = b.dataset.back; sfx('click'); if (to === 'menu') goMenu(); else if (to === 'select') goSelect(session.mode); else if (to === 'setup') openSetup(); }));

function goMenu() {
  initAudio(); paused = false; engineStop(); playMusic('menu');
  for (const r of racers) scene.remove(r.model.root); racers = []; player = null;
  if (ghost) { scene.remove(ghost.root); ghost = null; }
  state = 'menu'; setScreen('menu'); updateQuestHint();
}
function updateQuestHint() { const q = PG.quests(); const n = q.filter(x => x.p >= x.n).length; $('#questHint').textContent = `${q.length} offen` + (n ? ` · ${n} fertig!` : ''); }
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { sfx('click'); const m = b.dataset.mode;
  if (m === 'garage') openGarage(); else if (m === 'quests') openQuests(); else if (m === 'help') { state = 'help'; setScreen('help'); } else goSelect(m); });
function goSelect(mode) { initAudio(); markMirror(); if (mode === 'gp') ann2(0); else if (mode === 'time') ann2(6); else ann(14); session.mode = mode; state = 'select'; setScreen('select'); renderCards(); $('#btnGo').textContent = 'Weiter'; }
function renderCards() {
  const wrap = $('#cards'); wrap.innerHTML = ''; const list = allDrivers(); if (selIdx >= list.length) selIdx = 0;
  wrap.style.gridTemplateColumns = `repeat(${list.length},1fr)`;
  list.forEach((d, i) => {
    const el = document.createElement('button'); el.className = 'card' + (i === selIdx ? ' sel' : ''); el.style.setProperty('--c', d.color);
    el.innerHTML = `<b>${d.icon}</b><span>${d.short || d.name}</span><small>Lv ${PG.drv(d.id).lvl}</small>`;
    el.onclick = () => { if (selIdx === i && (input.mode === 'pad' || input.mode === 'keys')) { $('#btnGo').click(); return; } selIdx = i; renderCards(); sfx('click'); voice(d.pitch, 4); wrap.children[i].focus(); };
    wrap.appendChild(el);
  });
  const d = list[selIdx], cfg = PG.drv(d.id), st = PG.stats(d, cfg);
  const bar = (n, v) => `<div class="sb"><em>${n}</em><u>${[1, 2, 3, 4, 5, 6].map(k => `<i class="${k <= Math.round(v) ? 'on' : ''}"></i>`).join('')}</u></div>`;
  const ride = cfg.vehicle === 'sig' ? d.ride : PG.VEHICLES[cfg.vehicle].name;
  $('#info').innerHTML = `<div class="nameplate" style="--c:${d.color}"><span class="np-i">${d.icon}</span><div><h2>${d.name}<span class="lvl">LV ${cfg.lvl}</span></h2><p>${ride}</p></div></div>
    <div class="facts"><span>🎮 Aus „${d.from}“</span>${d.age ? `<span>🎂 Alter: ${d.age}</span>` : ''}${d.trait ? `<span>⭐ ${d.trait}</span>` : ''}</div>
    ${d.bio ? `<p class="bio">${d.bio}</p>` : ''}
    <div class="stats">${bar('Tempo', st.speed)}${bar('Beschleunigung', st.accel)}${bar('Handling', st.handling)}${bar('Gewicht', st.weight)}</div>`;
  document.querySelectorAll('[data-cls]').forEach(x => x.classList.toggle('on', x.dataset.cls === cls.id));
}
$('#btnGo').onclick = () => { sfx('click'); openSetup(); };
function openSetup() { state = 'setup'; setScreen('setup'); markMirror(); markAssist(); document.querySelectorAll('[data-cls]').forEach(x => x.classList.toggle('on', x.dataset.cls === cls.id)); }
$('#btnSetGo').onclick = async () => {
  if (MOBILE) {
    try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch (_) {}
    if (input.touchMode === 'tilt' && !touch.tiltOK) { const ok = await enableTilt(); if (!ok) { input.touchMode = 'stick'; markCtl(); } }
  }
  sfx('click'); openTrackSel();
};
$('#btnGarage').onclick = () => { garDrv = allDrivers()[selIdx]; openGarage(true); };
function openTrackSel() {
  state = 'trackSel'; const L = $('#tsList'); L.innerHTML = '';
  if (session.mode === 'gp') {
    $('#tsTitle').textContent = 'Cup wählen';
    for (const c of CUPS) { const best = PG.state().cups[c.id + ':' + cls.id]; const el = document.createElement('button'); el.className = 'tsCard'; el.style.setProperty('--bg', '#7a2cff');
      el.innerHTML = `<b>${c.icon}</b><span>${c.name}</span><i>${c.tracks.map(id => trackById(id).icon).join(' ')}</i><i>${best === 1 ? '🏆 Gold' : best === 2 ? '🥈 Silber' : best === 3 ? '🥉 Bronze' : 'Noch kein Pokal'} (${cls.name})</i>`;
      el.onclick = () => { session = { mode: 'gp', cup: c, idx: 0, points: {}, order: null, track: trackById(c.tracks[0]) }; startRace(); }; L.appendChild(el); }
  } else {
    $('#tsTitle').textContent = session.mode === 'time' ? 'Zeitfahren: Strecke wählen' : session.mode === 'coins' ? 'Münzjagd: Strecke wählen' : 'Strecke wählen';
    const bg = { jungle: '#4a1a7a', school: '#2a7ad6', pond: '#d0604a', desert: '#d08a3a', market: '#e52a2a', sky: '#2a1a6a' };
    for (const t of TRACKS) { const best = PG.state().best[t.id]; const el = document.createElement('button'); el.className = 'tsCard'; el.style.setProperty('--bg', bg[t.theme]);
      el.innerHTML = `<b>${t.icon}</b><span>${t.name}</span><i>${best ? '⏱️ ' + fmt(best) : PG.state().wins[t.id] ? '🏁 Gewonnen' : '&nbsp;'}</i>`;
      el.onclick = () => { session.track = t; startRace(); }; L.appendChild(el); }
  }
  setScreen('trackSel');
}
// ---------- Garage ----------
function openGarage(fromSelect) {
  garDrv = garDrv || allDrivers()[selIdx]; state = 'garage'; garage.from = fromSelect ? 'select' : 'menu';
  $('#garage [data-back]').dataset.back = garage.from; setScreen('garage'); renderGarage();
}
const garage = { from: 'menu' };
document.querySelectorAll('[data-gtab]').forEach(b => b.onclick = () => { garTab = b.dataset.gtab; sfx('click'); renderGarage(); });
function renderGarage() {
  const D = $('#gDrivers'); D.innerHTML = '';
  allDrivers().forEach(d => { const el = document.createElement('button'); el.className = 'card' + (d === garDrv ? ' sel' : ''); el.style.setProperty('--c', d.color); el.innerHTML = `<b>${d.icon}</b><span>Lv ${PG.drv(d.id).lvl}</span>`; el.onclick = () => { garDrv = d; sfx('click'); renderGarage(); }; D.appendChild(el); });
  const cfg = PG.drv(garDrv.id);
  const next = PG.LEVEL_REWARDS.find(r => r.lvl > cfg.lvl);
  $('#gLevel').innerHTML = `<div class="xpLine"><span>${garDrv.icon} ${garDrv.name} · Level ${cfg.lvl}/${PG.MAXLVL}</span><span>${cfg.lvl >= PG.MAXLVL ? 'MAX' : cfg.xp + '/' + PG.need(cfg.lvl) + ' EP'}</span></div><div class="xpBar"><i style="width:${cfg.lvl >= PG.MAXLVL ? 100 : Math.round(100*cfg.xp/PG.need(cfg.lvl))}%"></i></div>${next ? `<small>Nächste Belohnung (Level ${next.lvl}): ${PG.rewardIcon(next)} ${PG.rewardName(next)}</small>` : ''}`;
  document.querySelectorAll('[data-gtab]').forEach(x => x.classList.toggle('on', x.dataset.gtab === garTab));
  const G = $('#gItems'); G.innerHTML = '';
  const opts = garTab === 'vehicle' ? Object.keys(PG.VEHICLES) : garTab === 'wheels' ? Object.keys(PG.WHEELS) : garTab === 'paint' ? PG.PAINTS : Object.keys(PG.OUTFITS);
  const type = garTab;
  for (const key of opts) {
    const r = PG.LEVEL_REWARDS.find(x => x.type === type && x.id === key);
    const has = PG.has(garDrv.id, type, key), on = cfg[type] === key;
    const name = type === 'vehicle' ? (key === 'sig' ? garDrv.ride : PG.VEHICLES[key].name) : type === 'wheels' ? PG.WHEELS[key].name : type === 'paint' ? PG.PAINT_NAMES[key] : PG.OUTFITS[key].name;
    const icon = type === 'vehicle' ? PG.VEHICLES[key].icon : type === 'wheels' ? PG.WHEELS[key].icon : type === 'paint' ? `<i style="display:inline-block;width:28px;height:28px;border-radius:50%;border:3px solid #150a24;background:#${paintColor(garDrv.id, key).toString(16).padStart(6, '0')}"></i>` : PG.OUTFITS[key].icon;
    const mod = type === 'vehicle' ? PG.VEHICLES[key].mod : type === 'wheels' ? PG.WHEELS[key].mod : null;
    const modTxt = mod ? Object.entries(mod).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${{ speed: 'Tempo', accel: 'Beschl.', handling: 'Handling', weight: 'Gewicht' }[k]}`).join(', ') : '';
    const el = document.createElement('button'); el.className = 'gItem' + (on ? ' on' : '') + (has ? '' : ' locked');
    el.innerHTML = `<b>${icon}</b>${name}${modTxt ? `<em>${modTxt}</em>` : ''}${has ? (on ? '<small>✔ gewählt</small>' : '') : `<small>🔒 Level ${r.lvl} · oder 🪙 ${PG.priceOf(r)}</small>`}`;
    el.onclick = () => {
      if (has) { PG.equip(garDrv.id, type, key); sfx('got'); }
      else if (PG.buy(garDrv.id, r)) { PG.equip(garDrv.id, type, key); sfx('coin'); toast(`${PG.rewardIcon(r)} ${name} gekauft!`); }
      else { sfx('bump'); toast(`Noch gesperrt: ab Level ${r.lvl} oder für 🪙 ${PG.priceOf(r)}`); }
      renderGarage(); document.querySelectorAll('.walletN').forEach(e => e.textContent = PG.state().wallet);
    };
    G.appendChild(el);
  }
  const st = PG.stats(garDrv, cfg); const bar = (n, v) => `<div class="st"><em>${n}</em><i style="--v:${v/6*100}%"></i></div>`;
  $('#gStats').innerHTML = bar('Tempo', st.speed) + bar('Beschleunigung', st.accel) + bar('Handling', st.handling) + bar('Gewicht', st.weight);
}
let toastT = null;
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }
// ---------- Aufgaben ----------
function openQuests() {
  state = 'quests'; const done = PG.claim(); for (const x of done) if (x.kind === 'quest') toast(`📜 ${x.q.text}: +${x.q.coins} 🪙`);
  const L = $('#qList'); L.innerHTML = '';
  for (const q of PG.quests()) { const li = document.createElement('li'); li.innerHTML = `<div class="qTop"><span>${q.text}</span><span>🪙 ${q.coins}</span></div><div class="xpBar"><i style="width:${Math.round(100*q.p/q.n)}%"></i></div><small>${q.p}/${q.n}</small>`;
    const b = document.createElement('button'); b.textContent = '🔄 Tauschen (10 🪙)'; b.onclick = () => { if (PG.rerollQuest(q.id)) { sfx('coin'); openQuests(); } else toast('Nicht genug Münzen'); }; li.appendChild(b); L.appendChild(li); }
  const A = $('#aList'); A.innerHTML = PG.ACHIEVEMENTS.map(a => `<li class="${PG.state().ach[a.id] ? 'done' : ''}">${a.icon} ${a.text}${a.unlock ? ' <b>(neuer Fahrer!)</b>' : ''}</li>`).join('');
  setScreen('quests'); updateQuestHint();
}
function togglePause(on) {
  paused = on; setScreen(on ? 'pause' : 'race'); if (on) { engineUpdate(0, false, false, 0, false); pauseMusic(); } else { clock.getDelta(); if (state === 'race') playMusic(musicFor(), player.lap === LAPS); }
}

// Knöpfe
$('#btnStart').onclick = () => { sfx('click'); goMenu(); setTimeout(() => ann(0), 300); };
const markMirror = () => { const b = document.querySelector('[data-cls=spiegel]'); if (!b) return; const ok = !!PG.state().ach.cupturbo || Q.has('mirror'); b.disabled = !ok; const t = b.querySelector('i'); if (t) t.textContent = ok ? 'Strecken seitenverkehrt' : '🔒 GP auf Turbo gewinnen'; else b.textContent = ok ? 'Spiegel' : '🔒 Spiegel'; b.title = ok ? '' : 'Gewinne einen Grand Prix auf Turbo'; };
markMirror();
document.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => { cls = CLASSES.find(c => c.id === b.dataset.cls); document.querySelectorAll('[data-cls]').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); });
document.querySelectorAll('[data-ctl]').forEach(b => b.onclick = () => { input.touchMode = b.dataset.ctl; markCtl(); sfx('click'); });
function markCtl() { document.querySelectorAll('[data-ctl]').forEach(x => x.classList.toggle('on', x.dataset.ctl === input.touchMode)); $('#invRow').style.display = input.touchMode === 'tilt' ? '' : 'none'; }
$('#inv').onchange = e => { input.invertTilt = e.target.checked; };
$('#btnResume').onclick = () => togglePause(false);
$('#btnRestart').onclick = () => { togglePause(false); if (session.mode === 'gp') { for (const k of racers) session.points[k.def.id] = session.points[k.def.id] || 0; } startRace(); };
$('#btnMenu').onclick = () => goMenu();
$('#btnChange').onclick = () => goMenu();
$('#tPause').addEventListener('click', () => togglePause(true));
$('#btnSound').onclick = () => { setMuted(!audio.muted); $('#btnSound').textContent = audio.muted ? '🔇' : '🔊'; PG.state().muted = audio.muted; PG.save(); };
const markAssist = () => document.querySelectorAll('[data-assist]').forEach(x => x.classList.toggle('on', (x.dataset.assist === '1') === assist));
document.querySelectorAll('[data-assist]').forEach(b => b.onclick = () => { assist = b.dataset.assist === '1'; try { localStorage.setItem('turboAssist', assist ? '1' : '0'); } catch (_) {} markAssist(); sfx('click'); });
markAssist();
document.querySelectorAll('[data-gfx]').forEach(b => b.onclick = () => { gfx = b.dataset.gfx; try { localStorage.setItem('turboGfx', gfx); } catch (_) {} applyGfx(); sfx('click'); });
setupTouch($('#touch'));
if (!MOBILE) document.querySelectorAll('.mobileOnly').forEach(e => e.style.display = 'none');
markCtl();
addEventListener('gamepadconnected', () => { showPadNote(); input.mode = 'pad'; focusFirst(); });
function showPadNote() { const n = $('#padNote'); if (n) { n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 3000); } }
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'race' && !paused) togglePause(true); });
if (PG.state().muted) { setMuted(true); $('#btnSound').textContent = '🔇'; }

loadTrack(TRACKS[Q.has('track') ? Math.max(0, TRACKS.findIndex(t => t.id === Q.get('track'))) : 0]);
setScreen('title');
if (AUTO) { selIdx = 3; if (Q.get('cls')) cls = CLASSES.find(c => c.id === Q.get('cls')) || cls; session.track = trackById(Q.get('track') || 'dschungel'); if (Q.get('mode')) session.mode = Q.get('mode'); if (Q.has('gp')) { session = { mode: 'gp', cup: CUPS[+Q.get('cup') || 0], idx: 0, points: {}, order: null, track: trackById(CUPS[+Q.get('cup') || 0].tracks[0]) }; } startRace(); }
window.__qa = (i, side = 0, back = 8, up = 3.2) => { const p = tr.P[i], T = tr.T[i], R = tr.R[i]; camera.clearViewOffset(); camera.position.set(p.x - T.x*back + R.x*side, p.y + up, p.z - T.z*back + R.z*side); camera.lookAt(p.x + T.x*10, p.y + 1.5, p.z + T.z*10); camera.fov = 70; camera.updateProjectionMatrix(); env.follow(p); env.update(clock.elapsedTime, 0.016); if (useBloom) composer.render(); else renderer.render(scene, camera); return canvas.toDataURL('image/jpeg', 0.7); };
window.__loadTrack = id => loadTrack(trackById(id));
window.__R = renderer; window.__CMP = composer; window.__S = scene; window.__C = camera; window.__THREE = THREE;
window.__T = { get state() { return state; }, get assist() { return assist; }, get racers() { return racers; }, get raceT() { return raceT; }, get fps() { return window.__fps; }, get ents() { return items.ents; }, get items() { return items; }, get session() { return session; }, PG, startRace, showStandings, startPodium, goMenu };
loop();
