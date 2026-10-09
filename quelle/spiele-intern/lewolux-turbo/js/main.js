// Lewolux Turbo – Prototyp: Spielablauf, Fahrphysik, KI, Items, Kamera, Anzeige
import * as THREE from './three.module.min.js';
import { makeTrack, buildTrackMeshes, HALF, WALL } from './track.js';
import { DRIVERS, buildRacer, toon, sanitize } from './karts.js';
import { buildScenery } from './scenery.js';
import { createItems, ITEMS } from './items.js';
import { input, touch, pollInput, setupTouch, enableTilt } from './input.js';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './jsm/postprocessing/OutputPass.js';
import { initAudio, sfx, voice, engineStart, engineUpdate, engineStop, musicStart, musicStop, setMuted, audio } from './audio.js';

const Q = new URLSearchParams(location.search);
const AUTO = Q.has('auto');
const SIM = +Q.get('sim') || 1;
const MOBILE = touch.on;
const $ = s => document.querySelector(s);
const LAPS = 3;
const CLASSES = [{ id: 'gem', name: 'Gemütlich', base: 25, ai: 0.86 }, { id: 'flott', name: 'Flott', base: 30, ai: 0.94 }, { id: 'turbo', name: 'Turbo', base: 36, ai: 1.0 }];
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

const tr = makeTrack();
buildTrackMeshes(tr, scene, toon);
window.__nanLog = [];
const env = buildScenery(scene, tr, toon, MOBILE ? 0.6 : 1);
sanitize(scene);
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
const wrapA = a => { while (a > Math.PI) a -= Math.PI*2; while (a < -Math.PI) a += Math.PI*2; return a; };
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
const LVLCOL = [null, COL.blue, COL.orange, COL.purple];

// ---------- Turbo-Felder und Glitzer-Sterne ----------
const pads = [];
const chevTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ff7a1a'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#fff36b';
  for (let y = 0; y < 128; y += 64) { g.beginPath(); g.moveTo(4, y + 50); g.lineTo(32, y + 14); g.lineTo(60, y + 50); g.lineTo(60, y + 64); g.lineTo(32, y + 28); g.lineTo(4, y + 64); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); return t; })();
for (const [f, lat] of [[0.08, 0], [0.37, -5], [0.6, 5], [0.86, -4]]) {
  const i = Math.round(f*tr.N); const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), new THREE.MeshBasicMaterial({ map: chevTex, transparent: true, opacity: 0.95 }));
  m.rotation.x = -Math.PI/2; const h = new THREE.Group(); h.add(m);
  h.position.copy(tr.P[i]).addScaledVector(tr.R[i], lat); h.position.y += 0.08; h.rotation.y = trackAngle(i); scene.add(h);
  pads.push({ i, lat });
}
// ---------- Sprungschanzen ----------
const ramps = [];
const rampTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#29f0ff'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#ff3fd0'; for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 64, 14); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); return t; })();
for (const [f, lat, w] of [[0.115, 0, 12], [0.64, 3, 10]]) {
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
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: rampTex, side: THREE.DoubleSide, emissive: 0x220a40 })); m.receiveShadow = true; m.castShadow = true; scene.add(m);
  ramps.push({ i0, i1, lat, w, H });
}

// ---------- Fahrer ----------
let racers = [], player = null, cls = CLASSES[1], selIdx = 3;
function makeKart(def, isPlayer, gridPos) {
  const model = buildRacer(def.id); scene.add(model.root);
  const row = Math.floor(gridPos / 2), side = gridPos % 2 ? 1 : -1;
  const i = (tr.N - 14 - row*10 + tr.N) % tr.N;
  const pos = tr.P[i].clone().addScaledVector(tr.R[i], side*5);
  const k = { def, model, isPlayer, pos, h: trackAngle(i), speed: 0, y: tr.P[i].y, hop: 0, vy: 0, hint: i, loc: {}, lap: 0, cp: false, prevS: i,
    prog: i - tr.N, finished: false, fTime: 0, place: gridPos + 1, slide: 0, drifting: false, driftDir: 0, driftT: 0, lvl: 0,
    boost: 0, star: 0, stun: 0, spinA: 0, bubble: 0, ink: 0, shrink: 0, item: null, roll: 0, rollItem: null, wrongT: 0, bumpCd: 0,
    max: cls.base + def.st.speed*0.9, acc: 10 + def.st.accel*2.4, turn: 1.5 + def.st.handling*0.12, weight: 1 + def.st.weight*0.25,
    ai: { lane: (Math.random() - 0.5)*8, laneT: Math.random()*10, skill: cls.ai*(0.95 + Math.random()*0.08), useAt: 0, driftOn: false, mistake: 0 },
    auto: !isPlayer || AUTO, startBoost: 0 };
  tr.locate(pos, i, k.loc);
  model.root.position.copy(pos); model.root.rotation.y = k.h;
  return k;
}

// ---------- Items ----------
const near = k => k.isPlayer || (player && k.pos.distanceTo(player.pos) < 45);
const items = createItems({ scene, tr, toon, sparks, COL, sfx, near,
  getRacers: () => racers,
  say: (k, w) => say(k, w), showWarn: t => showWarn(t), showMsg: (t, d) => showMsg(t, d), inkScreen: t => inkScreen(t),
  onItemUsed: k => { if (k.isPlayer) updateItemBox(); },
  onCoins: n => { const el = $('#coins'); el.textContent = '🪙 ' + n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },
  onHit: (k, by) => {
    if (k.isPlayer && !k.auto) { say(k, 'ouch'); if (by && by !== k && !by.isPlayer && Math.random() < 0.7) setTimeout(() => say(by, 'hit'), 1300); shake = 0.5; }
    else if (by && by.isPlayer && by !== k) say(by, 'hit');
  },
});
const hitKart = items.hitKart;
const ents = items.ents;

// ---------- Anzeige ----------
const hud = $('#hud'), msgEl = $('#msg'), sayEl = $('#say'), warnEl = $('#warn');
let msgT = 0, sayT = 0, warnT = 0, shake = 0;
function showMsg(t, dur = 1.2, cls = '') { msgEl.textContent = t; msgEl.className = 'show ' + cls; msgT = dur; }
function showWarn(t) { warnEl.textContent = t; warnEl.classList.add('show'); warnT = 2.2; }
function say(k, what) {
  const line = k.def.say[what]; if (!line) return;
  sayEl.innerHTML = `<b style="background:${k.def.color}">${k.def.icon}</b><span><i>${k.def.name}</i>${line}</span>`;
  sayEl.classList.add('show'); sayT = 2.4; voice(k.def.pitch, 4 + (line.length / 6 | 0));
}
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
  $('#tItem').classList.toggle('ready', !!k.item);
}
const fmt = t => { const m = Math.floor(t / 60), s = t - m*60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };

// Minikarte
const mini = $('#mini'), mctx = mini.getContext('2d');
const mb = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }; for (const p of tr.P) { mb.x0 = Math.min(mb.x0, p.x); mb.x1 = Math.max(mb.x1, p.x); mb.z0 = Math.min(mb.z0, p.z); mb.z1 = Math.max(mb.z1, p.z); }
const mBase = document.createElement('canvas'); mBase.width = mini.width; mBase.height = mini.height;
const mScale = Math.min((mini.width - 24) / (mb.x1 - mb.x0), (mini.height - 24) / (mb.z1 - mb.z0));
const mx = x => 12 + (x - mb.x0)*mScale + ((mini.width - 24) - (mb.x1 - mb.x0)*mScale) / 2, mz = z => 12 + (z - mb.z0)*mScale + ((mini.height - 24) - (mb.z1 - mb.z0)*mScale) / 2;
{ const g = mBase.getContext('2d'); g.lineJoin = 'round';
  for (const [w, c] of [[11, 'rgba(10,4,30,.75)'], [6, '#c9b8ff']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); tr.P.forEach((p, i) => i ? g.lineTo(mx(p.x), mz(p.z)) : g.moveTo(mx(p.x), mz(p.z))); g.closePath(); g.stroke(); }
  g.fillStyle = '#fff'; g.fillRect(mx(tr.P[0].x) - 4, mz(tr.P[0].z) - 4, 8, 8); }
function drawMini() {
  mctx.clearRect(0, 0, mini.width, mini.height); mctx.drawImage(mBase, 0, 0);
  for (const e of ents) if (e.type === 'cloud') { const k = e.target; mctx.font = '16px sans-serif'; mctx.fillText('⛈️', mx(k.pos.x) - 8, mz(k.pos.z) - 8); }
  const list = [...racers].sort((a, b) => a.isPlayer - b.isPlayer);
  for (const k of list) { mctx.beginPath(); mctx.arc(mx(k.pos.x), mz(k.pos.z), k.isPlayer ? 7 : 5, 0, 7); mctx.fillStyle = k.def.color; mctx.fill(); mctx.lineWidth = k.isPlayer ? 3 : 1.5; mctx.strokeStyle = k.isPlayer ? '#fff' : '#150a24'; mctx.stroke(); }
}

// ---------- Spielzustand ----------
let state = 'title', stateT = 0, raceT = 0, countN = 0, paused = false, results = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

function startRace() {
  initAudio();
  for (const r of racers) scene.remove(r.model.root);
  racers = [];
  const def = DRIVERS[selIdx];
  const others = DRIVERS.filter(d => d !== def).sort(() => Math.random() - 0.5);
  others.forEach((d, i) => racers.push(makeKart(d, false, i)));
  player = makeKart(def, true, 5); racers.push(player);
  items.reset(); preview.group.visible = false; $('#coins').textContent = '🪙 0';
  state = 'intro'; stateT = 0; raceT = 0; countN = 4; results = null; paused = false;
  setScreen('race'); updateItemBox(); $('#ink').style.opacity = 0;
  if (MOBILE) { input.mode = 'touch'; $('#touch').classList.toggle('tilt', input.touchMode === 'tilt'); }
  engineStart(); musicStop();
  camPos.copy(player.pos).add(new THREE.Vector3(Math.sin(player.h)*14, 4, Math.cos(player.h)*14));
}

function setScreen(s) {
  for (const id of ['title', 'select', 'pause', 'results']) $('#' + id).classList.toggle('show', s === id);
  hud.classList.toggle('show', s === 'race' || s === 'pause' || s === 'results');
  $('#touch').classList.toggle('show', MOBILE && (s === 'race'));
}

// ---------- Fahrphysik ----------
function control(k, dt) {
  // liefert {steer, gas, brake, drift, item}
  if (!k.auto) return { steer: input.steer, gas: input.gas, brake: input.brake, drift: input.drift, item: input.item };
  const a = k.ai, i = k.loc.i;
  a.laneT += dt*0.35; let lane = a.lane + Math.sin(a.laneT)*3;
  // Fallen ausweichen
  for (const e of ents) if (e.type === 'bubble' || e.type === 'creme' || e.type === 'plakat' || (e.type === 'cloud' && e.target === k && e.phase === 'charge')) {
    const d = tmpV.set(e.pos ? e.pos.x : k.pos.x, 0, e.pos ? e.pos.z : k.pos.z).sub(k.pos);
    if (e.type === 'cloud') { lane = e.lat > 0 ? -7 : 7; continue; }
    if (d.lengthSq() < 30*30 && d.x*Math.sin(k.h) + d.z*Math.cos(k.h) > 0) { const l = tr.locate(e.pos, k.loc.i); lane = l.lat > k.loc.lat ? l.lat - 5 : l.lat + 5; }
  }
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
  if (offroad) top *= k.boost > 0 || k.star > 0 ? 0.9 : 0.55;
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
        if (k.lvl > 0 && !offroad) { k.boost = Math.max(k.boost, [0, 0.6, 1.05, 1.6][k.lvl]); if (near(k)) sfx('mini'); }
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
      if (k.bumpCd <= 0 && into > 0.25 && Math.abs(k.speed) > 6) { if (k.isPlayer) { sfx('bump'); shake = 0.25; } k.bumpCd = 0.4;
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
  if (k.bubble <= 0) { k.vy -= 28*dt; k.hop += k.vy*dt; if (k.hop <= 0) { if (k.air) { k.air = false; if (k.trick) { k.boost = Math.max(k.boost, 1.0); k.trick = 0; if (near(k)) sfx('mini'); if (k.isPlayer) showWarn('Trick-Turbo!'); } } if (k.vy < -4) { k.sv = (k.sv || 0) - 3.5; if (near(k) && k.vy < -6) sfx('land'); } k.hop = 0; k.vy = 0; } }
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
  items.checkPickup(k); items.checkCoins(k);
  // Falsche Richtung
  if (k.isPlayer && state === 'race') {
    const dot = Math.sin(k.h)*tr.T[k.loc.i].x + Math.cos(k.h)*tr.T[k.loc.i].z;
    k.wrongT = dot < -0.3 && k.speed > 4 ? k.wrongT + dt : 0;
    if (k.wrongT > 1.2 && msgT <= 0) showMsg('↺ Falsche Richtung!', 1.0, 'warn');
  }
}
function onLap(k) {
  if (k.finished) return;
  if (k.lap > LAPS) {
    k.finished = true; k.fTime = raceT;
    if (k.isPlayer) finishPlayer();
    return;
  }
  if (k.isPlayer && k.lap > 1) {
    if (k.lap === LAPS) { showMsg('Letzte Runde!', 1.8, 'big'); sfx('final'); musicStop(); musicStart(true); } else { showMsg(`Runde ${k.lap}`, 1.3); sfx('lap'); }
  }
}
function finishPlayer() {
  state = 'finished'; stateT = 0; player.auto = true;
  sfx('finish'); showMsg(player.place === 1 ? 'SIEG!' : 'ZIEL!', 2.5, 'big');
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
  M.susp.rotation.z += ((k.drifting ? -k.driftDir*0.1 : st*0.07*spd) + (k.def.id === 'kritzel' ? -st*0.35*spd : 0) - M.susp.rotation.z)*Math.min(1, dt*8);
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
  if (Math.abs(k.loc.lat) > HALF + 1.2 && Math.abs(k.speed) > 8 && Math.random() < 0.6) smoke.emit(k.pos.x + bx, k.y + 0.3, k.pos.z + bz, (Math.random() - .5)*3, 2, (Math.random() - .5)*3, COL.dust, 0.7);
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
  env.update(t, dt);
  chevTex.offset.y -= dt*1.5;

  if (state === 'title' || state === 'select') { menuTick(dt, t); }
  else if (!paused) {
    if (input.pause && state !== 'finished') { togglePause(true); }
    stateT += dt;
    if (state === 'intro') {
      const a = player.h + Math.PI*(1 - Math.min(1, stateT / 2.6)), r = 14 - 5*Math.min(1, stateT / 2.6);
      camPos.set(player.pos.x + Math.sin(a)*r, player.y + 3 + stateT*0.3, player.pos.z + Math.cos(a)*r); camLook.set(player.pos.x, player.y + 1.4, player.pos.z);
      if (stateT > 2.6 || AUTO) { state = 'count'; stateT = 0; }
    } else if (state === 'count') {
      const n = 3 - Math.floor(stateT);
      if (n !== countN && n >= 1) { countN = n; showMsg(String(n), 0.9, 'big'); sfx('beep'); }
      // Turbo-Start: Gas genau bei "1" drücken
      if (input.gas > 0 && !player.gasT) player.gasT = stateT;
      if (input.gas <= 0) player.gasT = 0;
      if (stateT >= 3 || AUTO) {
        state = 'race'; stateT = 0; showMsg('LOS!', 1.0, 'big go'); sfx('go'); musicStart();
        if (player.gasT && player.gasT > 1.9 && !MOBILE) { player.boost = 1.1; showWarn('Turbo-Start!'); sfx('boost'); }
        for (const r of racers) if (r !== player && Math.random() < 0.5) r.boost = 0.6 + Math.random()*0.5;
        setTimeout(() => say(player, 'start'), 900);
      }
      chaseCam(dt);
    } else {
      if (state === 'race' || state === 'finished') raceT += dt;
      for (const k of racers) physics(k, dt);
      collide(); items.update(dt, t);
      // Platzierung
      const before = player.place;
      [...racers].sort((a, b) => (b.finished - a.finished) || (a.finished ? a.fTime - b.fTime : b.prog - a.prog)).forEach((k, i) => k.place = i + 1);
      if (state === 'race' && player.place === 1 && before > 1 && raceT > 5) say(player, 'pass');
      chaseCam(dt);
      if (state === 'finished' && stateT > 3.2 && !results) showResults();
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
  if (state !== 'title' && state !== 'select') {
    camera.position.copy(camPos);
    if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - .5)*shake; camera.position.y += (Math.random() - .5)*shake; }
    camera.lookAt(camLook);
    if (player) camera.rotateZ(player.slide*0.05 + (player.steerVis || 0)*-0.015);
    camera.clearViewOffset();
    const fov = (camera.aspect < 1 ? 85 : 70) + (player && player.boost > 0 ? 8 : 0);
    camera.fov += (fov - camera.fov)*Math.min(1, dt*4); camera.updateProjectionMatrix();
  }
  env.follow(player && state !== 'select' && state !== 'title' ? player.pos : tr.P[6]);
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
  $('#lap').textContent = `Runde ${clamp(player.lap, 1, LAPS)}/${LAPS}`;
  $('#time').textContent = fmt(raceT);
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.className = ''; }
  if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove('show'); }
  if (warnT > 0) { warnT -= dt; if (warnT <= 0) warnEl.classList.remove('show'); }
  const ib = $('#itemBox'); ib.classList.toggle('rolling', player.roll > 0);
  $('#driftBar').style.setProperty('--c', ['#888', '#3ad0ff', '#ff8a1a', '#d04bff'][player.lvl]);
  $('#driftBar').classList.toggle('show', player.drifting);
  drawMini();
}

// ---------- Menüs ----------
const preview = { group: new THREE.Group(), model: null, id: null };
scene.add(preview.group);
let navCd = 0;
function menuTick(dt, t) {
  // Kamera kreist langsam über der Startgerade, Vorschau-Kart davor
  const i = 6, p = tr.P[i];
  if (preview.id !== DRIVERS[selIdx].id) {
    if (preview.model) preview.group.remove(preview.model.root);
    preview.model = buildRacer(DRIVERS[selIdx].id); preview.group.add(preview.model.root); preview.id = DRIVERS[selIdx].id;
  }
  preview.group.position.set(p.x, p.y, p.z); preview.group.rotation.y = window.__fixRot ?? t*0.7;
  preview.group.visible = state === 'select';
  const a = t*0.08, r = state === 'select' ? 8.5 : 30;
  const look = state === 'select' ? tmpV.set(p.x, p.y + (camera.aspect < 1 ? 2.6 : 1.1), p.z) : tmpV.set(p.x, p.y + 4, p.z);
  camera.position.set(p.x + Math.sin(a)*r, p.y + (state === 'select' ? 3.3 : 10), p.z + Math.cos(a)*r);
  camera.lookAt(look); camera.fov = camera.aspect < 1 ? 70 : 50;
  if (state === 'select' && camera.aspect >= 1) { const pw = ($('.selPanel') || {}).offsetWidth || innerWidth*0.45; camera.setViewOffset(innerWidth, innerHeight, pw*0.5, -innerHeight*0.04, innerWidth, innerHeight); } else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  // Controller/Tastatur im Menü
  navCd -= dt;
  if (state === 'select' && navCd <= 0 && Math.abs(input.steer) > 0.5) { selIdx = (selIdx + (input.steer > 0 ? 1 : -1) + DRIVERS.length) % DRIVERS.length; renderCards(); sfx('click'); navCd = 0.22; }
  if (input.item || (input.gas > 0.5 && input.mode === 'pad' && navCd <= 0)) {
    if (state === 'title') { goSelect(); navCd = 0.4; } else if (state === 'select' && navCd <= 0) startRace();
  }
}
function goSelect() { initAudio(); state = 'select'; setScreen('select'); renderCards(); sfx('click'); }
function renderCards() {
  const wrap = $('#cards'); wrap.innerHTML = '';
  DRIVERS.forEach((d, i) => {
    const el = document.createElement('button'); el.className = 'card' + (i === selIdx ? ' sel' : ''); el.style.setProperty('--c', d.color);
    el.innerHTML = `<b>${d.icon}</b><span>${d.name}</span>`;
    el.onclick = () => { selIdx = i; renderCards(); sfx('click'); voice(d.pitch, 4); };
    wrap.appendChild(el);
  });
  const d = DRIVERS[selIdx];
  const bar = (n, v) => `<div class="st"><em>${n}</em><i style="--v:${v*20}%"></i></div>`;
  $('#info').innerHTML = `<h2>${d.icon} ${d.name}</h2><p>${d.ride} · aus „${d.from}“</p>${bar('Tempo', d.st.speed)}${bar('Beschleunigung', d.st.accel)}${bar('Handling', d.st.handling)}${bar('Gewicht', d.st.weight)}`;
}
function togglePause(on) {
  paused = on; setScreen(on ? 'pause' : 'race'); if (on) { engineUpdate(0, false, false, 0, false); musicStop(); } else { clock.getDelta(); if (state === 'race') musicStart(player.lap === LAPS); }
}
function showResults() {
  results = true; setScreen('results'); musicStop(); engineStop();
  const list = [...racers].sort((a, b) => a.place - b.place);
  const avg = Math.max(1, player.prog) / Math.max(1, player.fTime);
  $('#resList').innerHTML = list.map(k => {
    const time = k.finished ? k.fTime : raceT + (LAPS*tr.N - k.prog) / avg;
    return `<li class="${k.isPlayer ? 'me' : ''}"><b>${k.place}.</b><span style="background:${k.def.color}">${k.def.icon}</span><em>${k.def.name}</em><i>${k.finished ? '' : '≈ '}${fmt(time)}</i></li>`;
  }).join('');
  $('#resTitle').textContent = player.place === 1 ? 'Gewonnen! 🏆' : player.place <= 3 ? `Platz ${player.place} – Podest!` : `Platz ${player.place}`;
}

// Knöpfe
$('#btnStart').onclick = goSelect;
$('#btnGo').onclick = async () => {
  if (MOBILE) {
    try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch (_) {}
    if (input.touchMode === 'tilt' && !touch.tiltOK) { const ok = await enableTilt(); if (!ok) { input.touchMode = 'stick'; markCtl(); } }
  }
  startRace();
};
$('#btnBack').onclick = () => { state = 'title'; setScreen('title'); };
document.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => { cls = CLASSES.find(c => c.id === b.dataset.cls); document.querySelectorAll('[data-cls]').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); });
document.querySelectorAll('[data-ctl]').forEach(b => b.onclick = () => { input.touchMode = b.dataset.ctl; markCtl(); sfx('click'); });
function markCtl() { document.querySelectorAll('[data-ctl]').forEach(x => x.classList.toggle('on', x.dataset.ctl === input.touchMode)); $('#invRow').style.display = input.touchMode === 'tilt' ? '' : 'none'; }
$('#inv').onchange = e => { input.invertTilt = e.target.checked; };
$('#btnResume').onclick = () => togglePause(false);
$('#btnRestart').onclick = () => { togglePause(false); startRace(); };
$('#btnMenu').onclick = () => { paused = false; engineStop(); musicStop(); for (const r of racers) scene.remove(r.model.root); racers = []; player = null; state = 'select'; setScreen('select'); renderCards(); };
$('#btnAgain').onclick = () => startRace();
$('#btnChange').onclick = () => { for (const r of racers) scene.remove(r.model.root); racers = []; player = null; state = 'select'; setScreen('select'); renderCards(); };
$('#tPause').addEventListener('click', () => togglePause(true));
$('#btnSound').onclick = () => { setMuted(!audio.muted); $('#btnSound').textContent = audio.muted ? '🔇' : '🔊'; };
$('#btnHelp').onclick = () => $('#help').classList.add('show');
$('#help').onclick = () => $('#help').classList.remove('show');
document.querySelectorAll('[data-gfx]').forEach(b => b.onclick = () => { gfx = b.dataset.gfx; try { localStorage.setItem('turboGfx', gfx); } catch (_) {} applyGfx(); sfx('click'); });
applyGfx();
setupTouch($('#touch'));
if (!MOBILE) document.querySelectorAll('.mobileOnly').forEach(e => e.style.display = 'none');
markCtl();
addEventListener('gamepadconnected', () => { showPadNote(); });
function showPadNote() { const n = $('#padNote'); if (n) { n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 3000); } }
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'race' && !paused) togglePause(true); });

setScreen('title');
if (AUTO) { selIdx = 3; startRace(); }
window.__R = renderer; window.__CMP = composer; window.__S = scene; window.__C = camera; window.__THREE = THREE; window.__T = { get state() { return state; }, get racers() { return racers; }, get raceT() { return raceT; }, get fps() { return window.__fps; }, ents, items };
loop();
