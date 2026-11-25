// Deep Signal – canvas renderer (world, sub, objects, particles, light, post effects)
(function (DS) {
'use strict';
const M = DS.M;
const R = DS.R = {};
let cv, cx, W = 0, H = 0, dpr = 1, scale = 1, vw = 960, vh = 540;
let lightC, lx, lightScale = 0.5;
const cam = R.cam = {x: 0, y: -200, shake: 0, sx: 0, sy: 0, zoom: 1};
const parts = R.parts = [], pops = R.pops = [];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
let T = 0; // render time

// ---------- colours ----------
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const WATER = {
  rift: [[0, '#2b9cc2'], [80, '#1b7aa3'], [200, '#0f4f76'], [600, '#0a3352'], [1000, '#08223b'], [2500, '#05152a'], [4000, '#040c1a'], [6000, '#030812'], [7200, '#02050c']],
  ice: [[0, '#8fe3f0'], [80, '#5cc6e0'], [200, '#2f8fbf'], [600, '#1c5f8f'], [1000, '#133f68'], [2500, '#0c2a4c'], [4000, '#081d38'], [6000, '#061428'], [7200, '#040c1c']],
  vent: [[0, '#2f7f8f'], [80, '#245f70'], [200, '#183f50'], [600, '#162a38'], [1000, '#1a1a26'], [2500, '#1d1218'], [4000, '#1c0c10'], [6000, '#16080a'], [7200, '#0e0405']],
};
for (const k in WATER) WATER[k] = WATER[k].map(([m, c]) => [m, hex(c)]);
function waterAt(reg, m) { const L = WATER[reg]; if (m <= L[0][0]) return L[0][1]; for (let i = 1; i < L.length; i++) if (m <= L[i][0]) return mix(L[i - 1][1], L[i][1], (m - L[i - 1][0]) / (L[i][0] - L[i - 1][0])); return L[L.length - 1][1]; }
const ROCK = {rift: [hex('#1c3a4a'), hex('#0b1824'), hex('#0a0f16')], ice: [hex('#c6e6f0'), hex('#5a86a3'), hex('#2a4560')], vent: [hex('#4a3530'), hex('#2e1a14'), hex('#1e0d09')]};
function rockAt(reg, m) { const r = ROCK[reg]; return m < 600 ? mix(r[0], r[1], m / 600) : mix(r[1], r[2], clamp((m - 600) / 3000, 0, 1)); }
const RIM = {rift: hex('#3ff2d8'), ice: hex('#bff6ff'), vent: hex('#ff7a3c')};
// small screens (phones) get a slightly brighter floor in the deep, so loot and predators stay readable outdoors
// phones get a brighter floor in the deep (small screens, often outdoors): from ~1,600 m on it stays readable
const ambientAt = m => m < 0 ? 1 : clamp(1 - Math.pow(m / 700, 0.8), R.small ? (m > 1200 ? 0.15 + 0.07 * clamp((m - 1200) / 600, 0, 1) : 0.15) : 0.075, 1);
R.regKey = r => ['rift', 'ice', 'vent'][Math.min(r, 2)];

// ---------- sprites ----------
const glowCache = {};
function glow(col, size = 64) {
  const k = col + size; if (glowCache[k]) return glowCache[k];
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const cc = hex(col); gr.addColorStop(0, rgb(cc, 1)); gr.addColorStop(0.25, rgb(cc, 0.55)); gr.addColorStop(1, rgb(cc, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return glowCache[k] = c;
}
let noiseC = null;
function noiseTex() { if (noiseC) return noiseC; noiseC = document.createElement('canvas'); noiseC.width = noiseC.height = 160; const g = noiseC.getContext('2d'); const id = g.createImageData(160, 160);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return noiseC; }

R.init = canvas => { cv = canvas; cx = cv.getContext('2d'); lightC = document.createElement('canvas'); lx = lightC.getContext('2d'); R.resize(); };
R.resize = () => {
  const w = innerWidth, h = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, w * h > 1.2e6 ? 1.5 : 2);
  W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
  setScale();
  lightScale = (w * h > 1.5e6) ? 0.35 : 0.5;
  lightC.width = Math.ceil(w * lightScale); lightC.height = Math.ceil(h * lightScale);
  R.vw = vw; R.vh = vh; R.scale = scale; R.W = W; R.H = H; R.small = Math.min(w, h) < 520;
};
// keep screen-edge markers out of the areas covered by buttons / HUD boxes (R.safe is set by the UI)
R.safe = [];
function avoidSafe(x, y) {
  for (const r of R.safe) { if (x < r.l || x > r.r || y < r.t || y > r.b) continue;
    const c = [[x, r.t - 14, r.t - 14 > 20], [x, r.b + 14, r.b + 14 < H - 20], [r.l - 14, y, r.l - 14 > 20], [r.r + 14, y, r.r + 14 < W - 20]].filter(q => q[2]);
    c.sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y)); if (c[0]) { x = c[0][0]; y = c[0][1]; } }
  return [x, y];
}
let lastZT = 1;
function setScale() { const short = Math.min(W, H); lastZT = R.zoomT || 1; scale = short / (W < H ? 560 : 520) * (R.zoom || 1) * lastZT; vw = W / scale; vh = H / scale; R.vw = vw; R.vh = vh; R.scale = scale; }
const toScreen = (x, y) => [(x - cam.x) * scale + W / 2 + cam.sx, (y - cam.y) * scale + H / 2 + cam.sy];
R.toScreen = toScreen;

// ---------- particles ----------
R.burst = (x, y, n, o = {}) => { for (let i = 0; i < n; i++) { const a = o.a != null ? o.a + (Math.random() - .5) * (o.spread || 1) : Math.random() * TAU, sp = (o.sp || 120) * (0.3 + Math.random() * 0.9);
  parts.push({x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: (o.life || 0.6) * (0.6 + Math.random() * 0.8), size: (o.size || 3) * (0.6 + Math.random() * 0.8), col: o.col || '#ffd27a', type: o.type || 'spark', g: o.g || 0, drag: o.drag || 3}); } };
R.bubbles = (x, y, n, sp = 40) => { for (let i = 0; i < n; i++) parts.push({x: x + (Math.random() - .5) * 10, y: y + (Math.random() - .5) * 10, vx: (Math.random() - .5) * sp, vy: -20 - Math.random() * sp, life: 0, max: 1.2 + Math.random() * 1.4, size: 1.5 + Math.random() * 3.5, type: 'bubble', ph: Math.random() * 6, drag: 1, g: -40}); };
R.pop = (x, y, text, o = {}) => {
  // merge running loot numbers into one counter instead of piling them up
  if (o.key) { const q = pops.find(p => p.key === o.key && p.life < p.max * 0.7); if (q) { q.val += o.val; q.text = (o.prefix || '+') + DS.fmt(q.val); q.life = Math.min(q.life, 0.15); q.bump = 0.18; q.x = x; q.y0 = y; q.y = Math.min(q.y, y); return q; } }
  // otherwise stack above recent popups so texts never overlap
  for (const q of pops) if (q.life < 0.5 && Math.abs(q.x - x) < 70 && Math.abs(q.y - y) < 22) y = q.y - 24;
  const p = {x, y, y0: y, text, life: 0, max: o.max || 1.1, col: o.col || '#ffd27a', size: o.size || 15, vy: o.vy || -55, key: o.key, val: o.val || 0, bump: 0}; pops.push(p); return p;
};
// popup texts never sit on the sub, on the HUD boxes (contract chip …) or the message banner, and never on each other:
// each one is pushed above the sub / the box it would cover (or below the sub when there is no room above)
function layoutPops(g, D, dt) {
  const boxes = [...(R.safe || []), ...(R.avoid || [])], placed = [];
  let sub = null; if (D && D.sub.y > 0) { const [x, y] = toScreen(D.sub.x, D.sub.y), r = 46 * Math.max(0.75, scale); sub = {l: x - r * 1.25, r: x + r * 1.25, t: y - r * 0.85, b: y + r * 0.75}; }
  const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  for (const p of pops) { const [sx0, sy0] = toScreen(p.x, p.y);
    const sc = (p.life < 0.12 ? 0.6 + p.life / 0.12 * 0.5 : 1.1 - Math.min(0.1, (p.life - 0.12))) + (p.bump > 0 ? p.bump * 1.4 : 0);
    p.font = `700 ${Math.round(p.size * sc * Math.max(0.85, scale))}px Poppins, sans-serif`; g.font = p.font;
    const tw = g.measureText(p.text).width / 2 + 5, th = p.size * Math.max(0.85, scale) * 0.62 + 3;
    const rect = (x, y) => ({l: x - tw, r: x + tw, t: y - th, b: y + th});
    const blocker = rc => { if (rc.t < 2 || rc.b > H - 2) return {t: 2 - th, b: H}; if (sub && hit(rc, sub)) return sub; for (const q of placed) if (hit(rc, q)) return q; for (const q of boxes) if (hit(rc, q)) return q; return null; };
    const solve = (x, y, dir) => { for (let i = 0; i < 16; i++) { const ob = blocker(rect(x, y)); if (!ob) return y; y = dir < 0 ? ob.t - th - 2 : ob.b + th + 2; if (y - th < 2 || y + th > H - 2) return null; } return null; };
    // above the sub first, then below it, then beside it
    let sx = clamp(sx0, tw + 4, W - tw - 4), y = solve(sx, sy0, -1);
    if (y == null) y = solve(sx, sub ? sub.b + th + 2 : sy0, 1);
    for (const dx of [1, -1, 2, -2]) { if (y != null) break; const x2 = clamp(sx0 + dx * (tw + (sub ? sub.r - sub.l : 60) * 0.6), tw + 4, W - tw - 4); y = solve(x2, sy0, -1); if (y == null) y = solve(x2, sy0, 1); if (y != null) sx = x2; }
    if (y == null) y = sy0;
    // smooth the correction so a text does not jump when another one disappears (but never into something)
    const off = y - sy0; p.off = p.off == null ? off : p.off + (off - p.off) * Math.min(1, dt * 14 || 1);
    let yy = sy0 + p.off; if (blocker(rect(sx, yy))) { yy = y; p.off = off; }
    p.sx = sx; p.sy = clamp(yy, th + 2, H - th - 2); placed.push(rect(p.sx, p.sy)); }
}
R.shake = v => { cam.shake = Math.min(14, Math.max(cam.shake, v)); };
R.flash = (a, col = '#ffffff') => { R.fl = {a, col}; };
R.fl = null;
function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; if (p.life >= p.max) { parts.splice(i, 1); continue; }
    const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy = p.vy * k + p.g * dt; if (p.type === 'bubble') p.vx += Math.sin(T * 6 + p.ph) * 30 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life += dt; if (p.bump > 0) p.bump -= dt; p.y += p.vy * dt * (1 - p.life / p.max); if (p.life >= p.max) pops.splice(i, 1); }
  if (parts.length > 900) parts.splice(0, parts.length - 900);
}

// ---------- ambient life (render only) ----------
const fish = [], snow = [];
for (let i = 0; i < 90; i++) snow.push({x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, s: Math.random()});
function ambientFish(D, m) {
  if (fish.length < 3 && m < 900 && Math.random() < 0.02) {
    const n = 5 + Math.floor(Math.random() * 7), dir = Math.random() < .5 ? -1 : 1, y = cam.y + (Math.random() - .3) * vh * 0.8;
    const x = cam.x - dir * (vw / 2 + 80), col = m < 200 ? '#9fe6ff' : '#5ab0c8';
    fish.push({x, y, dir, n, col, ph: Math.random() * 6, sp: 50 + Math.random() * 40, off: Array.from({length: n}, () => [Math.random() * 60 - 30, Math.random() * 30 - 15, Math.random()])});
  }
}

// ---------- drawing helpers ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
R.rr = rr;

// The submarine (local units, facing right). Used by the HUD/menus too.
R.drawSub = function (g, t, o = {}) {
  const drill = o.drill || 0, gold = o.skin === 'gold';
  // propeller
  g.save(); g.translate(-33, 2); g.fillStyle = '#2a1c14'; rr(g, -4, -4, 8, 8, 3); g.fill();
  const pa = t * (o.prop || 14); g.fillStyle = 'rgba(210,190,160,0.85)';
  for (let i = 0; i < 2; i++) { const s = Math.sin(pa + i * Math.PI); g.beginPath(); g.ellipse(-3, s * 7, 2.6, Math.abs(s) * 7 + 1, 0, 0, TAU); g.fill(); } g.restore();
  // tail fins
  g.fillStyle = gold ? '#b8862a' : '#b4561a'; g.beginPath(); g.moveTo(-26, -6); g.lineTo(-36, -15); g.lineTo(-31, -4); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-26, 9); g.lineTo(-36, 17); g.lineTo(-31, 7); g.closePath(); g.fill();
  // tower
  const top = g.createLinearGradient(0, -22, 0, -10); top.addColorStop(0, gold ? '#ffe7a0' : '#ffc46b'); top.addColorStop(1, gold ? '#d9a840' : '#e2832c');
  g.fillStyle = top; rr(g, -11, -21, 20, 12, 5); g.fill(); g.fillStyle = '#2a1608'; g.fillRect(-3, -26, 2, 6); g.fillStyle = '#ff5050'; g.globalAlpha = (Math.sin(t * 4) > 0.3) ? 1 : 0.25; g.fillRect(-3.5, -28, 3, 3); g.globalAlpha = 1;
  // body
  const bg = g.createLinearGradient(0, -14, 0, 14); bg.addColorStop(0, gold ? '#fff0b8' : '#ffc25e'); bg.addColorStop(0.5, gold ? '#f0c24a' : '#f39a34'); bg.addColorStop(1, gold ? '#a87a1c' : '#b9561a');
  g.fillStyle = bg; g.beginPath(); g.moveTo(-28, -10); g.quadraticCurveTo(-30, 0, -28, 11); g.lineTo(14, 13); g.quadraticCurveTo(30, 12, 30, 0); g.quadraticCurveTo(30, -12, 14, -13); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,18,6,0.85)'; g.lineWidth = 1.6; g.stroke();
  // stripe + rivets
  g.fillStyle = 'rgba(40,20,8,0.55)'; g.fillRect(-18, -11.5, 4, 23.5);
  g.fillStyle = 'rgba(255,240,210,0.6)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-8 + i * 6, 8, 0.9, 0, TAU); g.fill(); }
  // highlight
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(-2, -8, 16, 2.6, 0, 0, TAU); g.fill();
  // window
  const wg = g.createRadialGradient(15, -4, 1, 14, -2, 9); wg.addColorStop(0, '#e9fffb'); wg.addColorStop(0.35, '#57f3dc'); wg.addColorStop(1, '#0d5e63');
  g.fillStyle = '#2a1608'; g.beginPath(); g.arc(14, -2, 8.6, 0, TAU); g.fill(); g.fillStyle = wg; g.beginPath(); g.arc(14, -2, 7, 0, TAU); g.fill();
  // drill arm + bit
  g.fillStyle = '#4d3a2c'; rr(g, 24, 3, 12, 6, 2); g.fill();
  g.save(); g.translate(36, 6);
  const db = g.createLinearGradient(0, -6, 0, 6); db.addColorStop(0, '#e8eef2'); db.addColorStop(1, '#7c8a94'); g.fillStyle = db;
  g.beginPath(); g.moveTo(0, -6); g.lineTo(17, 0); g.lineTo(0, 6); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,50,60,0.8)'; g.lineWidth = 1.2; const off = (t * (drill ? 60 : 6)) % 5;
  for (let i = -1; i < 4; i++) { const x = i * 5 + off; if (x < 0 || x > 15) continue; const hh = 6 * (1 - x / 17); g.beginPath(); g.moveTo(x, -hh); g.lineTo(x + 3, hh); g.stroke(); }
  g.restore();
  // headlight
  g.fillStyle = o.lightOff ? '#3a3020' : o.red ? '#ffb0a0' : '#fff6d8'; g.beginPath(); g.arc(27, -6, 2.4, 0, TAU); g.fill();
};

// ---------- objects ----------
function drawWreck(g, o, rk, rim, amb) {
  const big = o.t === 'bigwreck', z = o.z, w = o.w, h = o.h;
  const dmg = 1 - Math.max(0, o.hp) / o.hpMax;
  const base = mix(hex('#4c5a60'), rk, 0.35), dark = mix(base, [0, 0, 0], 0.45), rust = hex(z < 2 ? '#7a4a2a' : '#5a4a46');
  const fillG = g.createLinearGradient(0, -h / 2, 0, h / 2); fillG.addColorStop(0, rgb(mix(base, [255, 255, 255], 0.08))); fillG.addColorStop(1, rgb(dark));
  g.fillStyle = fillG; g.strokeStyle = rgb(mix(dark, [0, 0, 0], 0.4)); g.lineWidth = 1.5;
  const kind = z >= 3 ? 'module' : z === 2 ? (o.v % 2 ? 'sub' : 'module') : (big ? 'ship' : 'boat');
  if (kind === 'boat' || kind === 'ship') {
    // hull
    g.beginPath(); g.moveTo(-w / 2, -h * 0.05); g.lineTo(w / 2 - 6, -h * 0.05); g.quadraticCurveTo(w / 2 + 6, -h * 0.05, w / 2 + 2, -h * 0.35);
    g.lineTo(w / 2 - 10, h / 2); g.lineTo(-w / 2 + 14, h / 2); g.quadraticCurveTo(-w / 2, h / 2, -w / 2, -h * 0.05); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = rgb(rust, 0.55); g.fillRect(-w / 2 + 6, h * 0.12, w - 20, h * 0.08);
    // deck house
    g.fillStyle = fillG; const dw = w * (big ? 0.3 : 0.36), dx = -w * (big ? 0.28 : 0.12);
    rr(g, dx, -h * 0.5, dw, h * 0.46, 3); g.fill(); g.stroke();
    if (big) { rr(g, w * 0.12, -h * 0.32, w * 0.24, h * 0.27, 2); g.fill(); g.stroke(); g.fillRect(w * 0.3, -h * 0.85, 4, h * 0.55); }
    g.fillStyle = '#0d1418'; for (let i = 0; i < (big ? 4 : 2); i++) { g.beginPath(); g.arc(dx + 8 + i * 9, -h * 0.3, 2.6, 0, TAU); g.fill(); }
    // mast
    g.strokeStyle = rgb(dark); g.lineWidth = 2.5; g.beginPath(); g.moveTo(dx + dw * 0.5, -h * 0.5); g.lineTo(dx + dw * 0.5 + 6, -h * 1.15); g.stroke();
  } else if (kind === 'sub') {
    g.beginPath(); g.ellipse(0, 4, w / 2, h * 0.36, 0, 0, TAU); g.fill(); g.stroke();
    rr(g, -w * 0.12, -h * 0.42, w * 0.22, h * 0.34, 4); g.fill(); g.stroke();
    g.fillStyle = '#0d1418'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-w * 0.32 + i * w * 0.16, 4, 2.4, 0, TAU); g.fill(); }
  } else {
    // research module: cylinder with windows
    rr(g, -w / 2, -h * 0.42, w, h * 0.84, h * 0.4); g.fill(); g.stroke();
    g.strokeStyle = rgb(dark); g.lineWidth = 2; for (let i = 1; i < 4; i++) { const x = -w / 2 + w * i / 4; g.beginPath(); g.moveTo(x, -h * 0.42); g.lineTo(x, h * 0.42); g.stroke(); }
    const lit = (Math.sin(T * 0.7 + o.ph) > 0.2);
    for (let i = 0; i < 4; i++) { const x = -w / 2 + w * (i + 0.5) / 4; g.fillStyle = (lit && i === (o.v % 4)) ? '#ffd58a' : '#0c1a22'; g.beginPath(); g.arc(x, -2, 4, 0, TAU); g.fill(); }
    g.fillStyle = rgb(dark); g.fillRect(-4, -h * 0.75, 3, h * 0.35);
  }
  // marine growth (shallow) / crust (deep)
  g.fillStyle = z < 2 ? 'rgba(90,150,90,0.55)' : 'rgba(150,140,170,0.35)';
  for (let i = 0; i < 6; i++) { const x = -w / 2 + ((o.id * 37 + i * 53) % w), y = h * 0.3 + ((i * 7) % 6); g.beginPath(); g.arc(x, y, 2 + (i % 3), 0, TAU); g.fill(); }
  // rim light (soft, from above)
  g.strokeStyle = rgb(rim, 0.18 + 0.25 * (1 - amb)); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-w / 2 + 4, -h * 0.05); g.lineTo(w / 2 - 6, -h * 0.05); g.stroke();
  // damage cracks
  if (dmg > 0.05) { g.strokeStyle = 'rgba(255,190,110,' + (0.35 + dmg * 0.5) + ')'; g.lineWidth = 1.4;
    const n = Math.ceil(dmg * 6); for (let i = 0; i < n; i++) { const sx = -w * 0.4 + ((i * 61 + o.id * 13) % (w * 0.8)), sy = -h * 0.2 + ((i * 17) % (h * 0.5));
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 6 - (i % 3) * 5, sy + 7); g.lineTo(sx + 2, sy + 13); g.stroke(); } }
}
function drawCrate(g, o) {
  const w = o.w, h = o.h, metal = o.z >= 2;
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
  if (o.t === 'cache') { gr.addColorStop(0, '#ffe9a0'); gr.addColorStop(1, '#a8741c'); }
  else if (metal) { gr.addColorStop(0, '#7f97a6'); gr.addColorStop(1, '#3a4a55'); } else { gr.addColorStop(0, '#b98a52'); gr.addColorStop(1, '#6a4524'); }
  g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, 3); g.fill(); g.strokeStyle = 'rgba(20,12,6,0.85)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = o.t === 'cache' ? '#6a4310' : metal ? '#2a353d' : '#4a2f18'; g.fillRect(-w / 2, -2, w, 4); g.fillRect(-w * 0.18, -h / 2, 4, h);
  if (o.t === 'cache') { g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 2);
}
function drawBarrel(g, o) {
  const w = o.w, h = o.h; const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  const c = o.z >= 2 ? ['#3c5a6c', '#86a8b8', '#25394a'] : ['#8a2f22', '#e0644a', '#5a1a12'];
  gr.addColorStop(0, c[0]); gr.addColorStop(0.4, c[1]); gr.addColorStop(1, c[2]);
  g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, 5); g.fill(); g.strokeStyle = 'rgba(20,10,6,0.85)'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-w / 2, -h * 0.22, w, 2.5); g.fillRect(-w / 2, h * 0.2, w, 2.5);
  g.fillStyle = '#ffd34a'; g.beginPath(); g.moveTo(0, -5); g.lineTo(5, 4); g.lineTo(-5, 4); g.closePath(); g.fill();
}
function drawOre(g, o, col) {
  // crystals sticking out of the wall, pointing inward (+x after rotation)
  const c = hex(col); const n = 4 + (o.v % 2);
  g.drawImage(glow(col, 64), -10, -o.h, o.h * 2, o.h * 2);
  for (let i = 0; i < n; i++) {
    const a = -0.7 + i * 1.4 / (n - 1) + Math.sin(o.id + i) * 0.15, L = (o.w * 0.5) * (0.6 + ((i * 7 + o.id) % 5) / 10), wd = 5 + (i % 2) * 2;
    if (o.hp <= 0) continue;
    const vis = 1 - (o.rel / Math.max(1, o.np)) * 0.4 * ((i % 3) / 2);
    g.save(); g.rotate(a); const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, rgb(mix(c, [0, 0, 0], 0.5))); gr.addColorStop(1, rgb(mix(c, [255, 255, 255], 0.35)));
    g.fillStyle = gr; g.globalAlpha = vis; g.beginPath(); g.moveTo(0, -wd); g.lineTo(L * 0.8, -wd * 0.7); g.lineTo(L, 0); g.lineTo(L * 0.8, wd * 0.7); g.lineTo(0, wd); g.closePath(); g.fill();
    g.strokeStyle = rgb(mix(c, [255, 255, 255], 0.6), 0.7); g.lineWidth = 1; g.stroke(); g.restore();
  }
  g.globalAlpha = 1;
}

// ---------- world ----------
let lastD = null;
R.render = function (D, dt, opt = {}) {
  T += dt; updParts(dt); if ((R.zoomT || 1) !== lastZT) setScale();
  const g = cx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const reg = R.regKey(D ? D.region : (opt.region || 0));
  // camera
  if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt * 30); const s = cam.shake; cam.sx = (Math.random() - .5) * s * 2; cam.sy = (Math.random() - .5) * s * 2; } else { cam.sx = cam.sy = 0; }
  const camM = cam.y / M;
  const top = cam.y - vh / 2, bot = cam.y + vh / 2, left = cam.x - vw / 2, right = cam.x + vw / 2;
  // background water gradient
  const wTop = waterAt(reg, Math.max(0, top / M)), wBot = waterAt(reg, Math.max(0, bot / M));
  let bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, rgb(wTop)); bgG.addColorStop(1, rgb(wBot)); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
  if (top < 40) drawSky(g, reg, top);
  // god rays in shallow water
  const amb = ambientAt(camM);
  if (camM < 420) drawRays(g, reg, clamp(1 - camM / 420, 0, 1));
  // distant parallax ridges
  drawFar(g, reg, camM);
  // marine snow
  g.fillStyle = 'rgba(200,230,255,0.5)';
  for (const s of snow) { const px = ((s.x * W - cam.x * scale * s.z * 0.5) % W + W) % W, py = ((s.y * H - cam.y * scale * s.z * 0.5 - T * 8 * s.z) % H + H) % H;
    g.globalAlpha = (0.15 + s.z * 0.35) * (camM < 0 ? 0 : 1); g.fillRect(px, py, 1 + s.z * 1.5, 1 + s.z * 1.5); }
  g.globalAlpha = 1;

  g.save(); g.translate(W / 2 + cam.sx, H / 2 + cam.sy); g.scale(scale, scale); g.translate(-cam.x, -cam.y);
  if (top < 60) drawShip(g, reg, D);
  // ambient fish
  if (D) ambientFish(D, camM);
  for (let i = fish.length - 1; i >= 0; i--) { const f = fish[i]; f.x += f.dir * f.sp * dt; if (D) { const s = D.sub; const dx = f.x - s.x, dy = f.y - s.y; if (dx * dx + dy * dy < 140 * 140) { f.y += Math.sign(dy || 1) * 60 * dt; f.sp = Math.min(160, f.sp + 200 * dt); } }
    if (Math.abs(f.x - cam.x) > vw + 300 || f.y < 20) { fish.splice(i, 1); continue; }
    g.fillStyle = f.col; for (const [ox, oy, k] of f.off) { const x = f.x + ox, y = f.y + oy + Math.sin(T * 3 + k * 6) * 3; g.save(); g.translate(x, y); g.scale(f.dir, 1); g.globalAlpha = 0.75; g.beginPath(); g.ellipse(0, 0, 6, 2.4, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-5, 0); g.lineTo(-10, -3); g.lineTo(-10, 3); g.closePath(); g.fill(); g.restore(); } }
  g.globalAlpha = 1;
  if (D) {
    drawWalls(g, D, reg, top, bot, amb);
    drawVents(g, D, top, bot);
    drawSource(g, D, top, bot);
    if (D.event === 'shoal' && Math.abs(D.evY - cam.y) < vh) drawShoal(g, D);
    // objects
    const rim = RIM[reg];
    for (const o of D.objs) {
      if (o.broken || o.y < top - 200 || o.y > bot + 200 || o.x < left - 260 || o.x > right + 260) continue;
      let ox = o.x, oy = o.y; if (o.float) { oy += Math.sin(T * 1.1 + o.ph) * 4; }
      if (o.shake > 0) { ox += (Math.random() - .5) * 3; oy += (Math.random() - .5) * 3; }
      g.save(); g.translate(ox, oy);
      if (o.t === 'ore') { g.rotate(o.rot || 0); drawOre(g, o, DS.MAT[o.mat].col); }
      else { if (o.float) g.rotate(Math.sin(T * 0.8 + o.ph) * 0.08); else if (o.side) g.rotate(o.side * 0.04 * ((o.v % 3) - 1));
        if (o.t === 'wreck' || o.t === 'bigwreck') drawWreck(g, o, rockAt(reg, o.m), rim, amb); else if (o.t === 'barrel') drawBarrel(g, o); else if (o.t === 'sigcache') drawBlackBox(g, o); else if (o.t === 'whale') drawWhale(g, o);
        else if (o.t === 'amphora') drawAmphora(g, o); else if (o.t === 'pod') drawPod(g, o); else if (o.t === 'treasure') drawTreasure(g, o); else if (o.t === 'vault') drawVault(g, o, rockAt(reg, o.m), rim, amb, D); else if (o.t === 'recorder') drawRecorder(g, o);
        else if (o.t === 'clam') { g.rotate(o.rot || 0); drawClam(g, o); } else drawCrate(g, o); }
      g.restore();
      // treasure hint: finds glimmer inside
      if (o.find && !o.broken && Math.sin(T * 2 + o.id) > 0.6) { g.globalCompositeOperation = 'lighter'; g.drawImage(glow(o.gold ? '#ffd34a' : '#7af7ff', 32), o.x - 12, o.y - 12, 24, 24); g.globalCompositeOperation = 'source-over'; }
      if (o.t === 'cache' || o.t === 'treasure') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = o.t === 'treasure' ? 0.75 + 0.25 * Math.sin(T * 3) : 1; g.drawImage(glow('#ffc84a', 128), o.x - 70, o.y - 70, 140, 140); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      if (o.t === 'recorder') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.5 * Math.max(0, Math.sin(T * 4)); g.drawImage(glow('#ffd36a', 64), o.x - 40, o.y - 56, 80, 80); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    }
    // hull limit line
    const ly = D.limY - 30; if (!R.cover && ly > top - 20 && ly < bot + 20 && D.limY / M < DS.FLOOR_M - 10) {
      g.strokeStyle = 'rgba(255,90,90,' + (0.35 + 0.25 * Math.sin(T * 4)) + ')'; g.lineWidth = 2 / scale * 1.5; g.setLineDash([14, 10]);
      g.beginPath(); g.moveTo(left, ly + 40); g.lineTo(right, ly + 40); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(120,0,10,0.18)'; g.fillRect(left, ly + 40, vw, bot - ly);
      g.font = '700 13px Poppins, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,140,140,0.85)'; g.fillText(DS.T('HULL LIMIT') + ' · ' + DS.fmtM(D.limY / M), cam.x, ly + 60);
    }
    // jellyfish
    for (const j of D.jellies) { if (j.cy == null || j.taken || j.cy < top - 80 || j.cy > bot + 80) continue; drawJelly(g, j); }
    for (const b of D.ice) { if (b.y < top - 120 || b.y > bot + 120) continue; drawIce(g, b); }
    for (const p of D.preds) { if (p.y < top - 200 || p.y > bot + 200 || p.x < left - 220 || p.x > right + 220) continue; drawPred(g, p, D); }
    drawRocks(g, D, dt);
    for (const f of D.flaresOut) { g.save(); g.translate(f.x, f.y); g.rotate(T * 3); g.fillStyle = '#ffdcc8'; rr(g, -3, -8, 6, 16, 2); g.fill(); g.fillStyle = '#ff4a2a'; rr(g, -3, 2, 6, 6, 2); g.fill(); g.restore(); if (Math.random() < 0.5) R.burst(f.x, f.y, 1, {sp: 60, col: '#ff8a5a', life: 0.5, size: 2.5}); }
    // loot pieces
    g.globalCompositeOperation = 'lighter';
    for (const p of D.pieces) { const col = p.find ? (p.gold ? '#ffd34a' : '#7af7ff') : DS.MAT[p.mat].col; const s = p.find ? 34 : 22; const a = p.age > 13 ? (16 - p.age) / 3 : 1; g.globalAlpha = clamp(a, 0, 1);
      g.drawImage(glow(col, 64), p.x - s / 2, p.y - s / 2, s, s); }
    g.globalCompositeOperation = 'source-over';
    for (const p of D.pieces) { const col = p.find ? (p.gold ? '#ffe680' : '#d8fffb') : DS.MAT[p.mat].col; const a = p.age > 13 ? (16 - p.age) / 3 : 1; g.globalAlpha = clamp(a, 0, 1);
      g.save(); g.translate(p.x, p.y); g.rotate(p.age * 2 + p.x); g.fillStyle = col;
      if (p.find) { g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 7; g.lineTo(Math.cos(i * Math.PI / 4) * r, Math.sin(i * Math.PI / 4) * r); } g.closePath(); g.fill(); }
      else { g.fillRect(-3.5, -3.5, 7, 7); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(-3.5, -3.5, 7, 2); }
      g.restore(); }
    g.globalAlpha = 1;
  } else if (opt.hub) {
    drawWalls(g, null, reg, top, bot, amb);
    drawHubSub(g, opt);
  }
  // particles
  for (const p of parts) {
    if (p.life < 0) continue;
    const a = 1 - p.life / p.max;
    if (p.type === 'bubble') { g.strokeStyle = 'rgba(200,240,255,' + (a * 0.7) + ')'; g.lineWidth = 0.9; g.beginPath(); g.arc(p.x, p.y, p.size, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,255,255,' + a * 0.5 + ')'; g.fillRect(p.x - p.size * 0.4, p.y - p.size * 0.5, 1.2, 1.2); }
    else if (p.type === 'spark') { g.globalCompositeOperation = 'lighter'; g.strokeStyle = p.col; g.globalAlpha = a; g.lineWidth = p.size * 0.6; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); g.stroke(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    else if (p.type === 'debris') { g.fillStyle = p.col; g.globalAlpha = Math.min(1, a * 2); g.save(); g.translate(p.x, p.y); g.rotate(p.life * 5 + p.size); g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7); g.restore(); g.globalAlpha = 1; }
    else if (p.type === 'dust') { g.fillStyle = p.col; g.globalAlpha = a * 0.25; g.beginPath(); g.arc(p.x, p.y, p.size * (1 + p.life / p.max * 2), 0, TAU); g.fill(); g.globalAlpha = 1; }
    else if (p.type === 'ring') { g.strokeStyle = p.col; g.globalAlpha = a; g.lineWidth = 3 * a + 0.5; g.beginPath(); g.arc(p.x, p.y, Math.max(0, p.size * (p.life / p.max)), 0, TAU); g.stroke(); g.globalAlpha = 1; }
    else if (p.type === 'glow') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.drawImage(glow(p.col, 64), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  }
  g.restore();

  // darkness + lights
  drawLight(g, D, reg, amb, opt);
  drawLeviathan(g, D, camM);
  drawStationGlow(g, D, camM, opt);
  if (D) drawAfterDark(g, D, dt, camM);
  if (reg === 'vent' && camM > 150) drawEmbers(g, camM);
  // the sub is drawn after the darkness so it always reads clearly
  if (D) { g.save(); g.translate(W / 2 + cam.sx, H / 2 + cam.sy); g.scale(scale, scale); g.translate(-cam.x, -cam.y); drawSubWorld(g, D, dt); g.restore(); }
  // popups (screen space, above the darkness)
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  layoutPops(g, D, dt);
  for (const p of pops) { if (p.sx == null) continue; const a = p.life < 0.12 ? p.life / 0.12 : 1 - Math.max(0, (p.life - p.max * 0.6) / (p.max * 0.4));
    g.globalAlpha = clamp(a, 0, 1); g.font = p.font;
    g.lineWidth = 4; g.strokeStyle = 'rgba(2,10,20,0.85)'; g.strokeText(p.text, p.sx, p.sy); g.fillStyle = p.col; g.fillText(p.text, p.sx, p.sy); }
  g.restore(); g.globalAlpha = 1;
  // sonar marks (screen)
  if (D && D.phase !== 'cine' && !R.cover) drawSonar(g, D);
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,4,10,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // low oxygen pulse
  if (D && D.phase === 'dive' && (D.o2 < D.o2max * 0.25 || D.o2 < D.warnAt)) { const a = 0.18 + 0.14 * Math.sin(T * 7); const rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); rg.addColorStop(0, 'rgba(255,0,30,0)'); rg.addColorStop(1, 'rgba(255,30,50,' + a + ')'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
  if (D && D.emergency && D.phase === 'ascent') { g.fillStyle = 'rgba(255,40,40,' + (0.1 + 0.08 * Math.sin(T * 10)) + ')'; g.fillRect(0, 0, W, H); }
  if (R.fl) { g.fillStyle = R.fl.col; g.globalAlpha = R.fl.a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; R.fl.a -= dt * 2.5; if (R.fl.a <= 0) R.fl = null; }
  if (R.glitch > 0) { drawGlitch(g, dt); }
};

function drawSky(g, reg, top) {
  const [, wy] = toScreen(0, 0); if (wy <= 0) return;
  const sky = g.createLinearGradient(0, 0, 0, wy);
  if (reg === 'ice') { sky.addColorStop(0, '#071428'); sky.addColorStop(0.6, '#163b5c'); sky.addColorStop(1, '#8fd6e0'); }
  else if (reg === 'vent') { sky.addColorStop(0, '#120708'); sky.addColorStop(0.6, '#4a1a12'); sky.addColorStop(1, '#ff7a3c'); }
  else if (R.storm) { sky.addColorStop(0, '#0b1018'); sky.addColorStop(0.6, '#2a3240'); sky.addColorStop(1, '#5a6a78'); }
  else { sky.addColorStop(0, '#0a1630'); sky.addColorStop(0.55, '#3a3a6a'); sky.addColorStop(0.85, '#d9785a'); sky.addColorStop(1, '#ffb070'); }
  g.fillStyle = sky; g.fillRect(0, 0, W, wy + 2);
  if (R.storm) { g.strokeStyle = 'rgba(190,210,230,0.35)'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 70; i++) { const x = ((i * 97.13 + T * 260) % (W + 60)) - 30, y = ((i * 57.7 + T * 900) % (wy + 40)) - 20; g.moveTo(x, y); g.lineTo(x - 6, y + 16); } g.stroke();
    if (Math.sin(T * 0.9) > 0.985) { g.fillStyle = 'rgba(220,235,255,0.18)'; g.fillRect(0, 0, W, wy); } return; }
  // sun / aurora
  if (reg === 'ice') { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(80,255,190,${0.08 + i * 0.03})`; g.lineWidth = 30 * scale - i * 8 * scale; g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, wy * (0.25 + i * 0.08) + Math.sin(x * 0.006 + T * 0.4 + i) * 22 * scale); g.stroke(); } g.globalCompositeOperation = 'source-over'; }
  else { const [sx] = toScreen(380, 0); g.globalCompositeOperation = 'lighter'; g.drawImage(glow(reg === 'vent' ? '#ff6a2a' : '#ffcf7a', 128), sx - 160 * scale, wy - 120 * scale, 320 * scale, 240 * scale); g.globalCompositeOperation = 'source-over';
    g.fillStyle = reg === 'vent' ? '#ff9a5a' : '#fff1c4'; g.beginPath(); g.arc(sx, wy - 26 * scale, 22 * scale, Math.PI, 0); g.fill(); }
  // stars
  g.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 40; i++) { const x = (i * 197.3 % 1) * W, y = ((i * 71.7) % 1) * wy * 0.55; g.globalAlpha = 0.3 + 0.3 * Math.sin(T + i); g.fillRect((i * 0.6180339 * W * 7) % W, (i * 0.38196 * wy * 3) % (wy * 0.6), 1.5, 1.5); }
  g.globalAlpha = 1;
  // far islands / icebergs / volcano
  g.fillStyle = reg === 'ice' ? '#cfeef6' : reg === 'vent' ? '#2a0f0c' : '#1a1f3a';
  const [ix] = toScreen(-380, 0);
  g.beginPath(); g.moveTo(ix - 200 * scale, wy); g.quadraticCurveTo(ix - 120 * scale, wy - (reg === 'vent' ? 70 : 34) * scale, ix - 40 * scale, wy - (reg === 'vent' ? 80 : 20) * scale); g.quadraticCurveTo(ix + 20 * scale, wy - 26 * scale, ix + 90 * scale, wy); g.fill();
  if (reg === 'vent') { g.fillStyle = 'rgba(80,60,60,0.5)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(ix - 40 * scale + Math.sin(T * 0.3 + i) * 10, wy - (90 + i * 26) * scale, (14 + i * 7) * scale, 0, TAU); g.fill(); } }
}
function drawRays(g, reg, k) {
  g.save(); g.globalCompositeOperation = 'lighter'; const [, wy] = toScreen(0, 0); const y0 = Math.max(0, wy);
  for (let i = 0; i < 6; i++) { const x = ((i * 0.19 + Math.sin(T * 0.1 + i) * 0.05) % 1) * W * 1.3 - W * 0.1, w = (40 + i * 13 % 50) * scale;
    const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, `rgba(180,240,255,${0.10 * k})`); gr.addColorStop(1, 'rgba(180,240,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + w, y0); g.lineTo(x + w * 2.2 + 120 * scale, H); g.lineTo(x + 120 * scale, H); g.closePath(); g.fill(); }
  g.restore();
}
function drawFar(g, reg, camM) {
  if (camM < -50) return;
  const c = waterAt(reg, Math.max(0, camM + 80)); const fc = mix(c, [0, 0, 0], 0.35);
  g.fillStyle = rgb(fc, 0.6); const par = 0.35; const [, wl] = toScreen(0, 0); g.save(); if (wl > 0) { g.beginPath(); g.rect(0, wl, W, H); g.clip(); }
  for (const side of [-1, 1]) { g.beginPath(); const x0 = side < 0 ? 0 : W; g.moveTo(x0, H);
    for (let sy = 0; sy <= H + 20; sy += 20) { const wy = (cam.y * par + (sy - H / 2) / scale); const n = Math.sin(wy * 0.004 + side * 3) * 60 + Math.sin(wy * 0.013 + side) * 25; const x = side < 0 ? (90 + n) * scale * 0.6 : W - (90 + n) * scale * 0.6; g.lineTo(x, sy); }
    g.lineTo(x0, -10); g.closePath(); g.fill(); }
  g.restore();
}
function drawLeviathan(g, D, camM) {
  if (camM < 2400 || R.noLev) return;
  const k = (R.levOpt && R.levOpt.k) || clamp((camM - 2400) / 800, 0, 1) * (camM > 6500 ? clamp((6900 - camM) / 400, 0, 1) : 1);
  if (k <= 0) return;
  // slow pass across the background (one every 48 s), parallax against the camera
  const lo = R.levOpt || {}; const cyc = lo.t != null ? lo.t : ((T + 20) % 48) / 48, x = W / 2 + lerp(1.6, -1.6, cyc) * W, y = H * (lo.y || 0.66) + Math.sin(T * 0.13) * 24 * scale - (lo.y ? 0 : cam.y * 0.02 % 40);
  const L = Math.max(W, H) * 1.3 * (lo.L || 1), h = L * 0.09;
  if (lo.back) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = lo.back; g.drawImage(glow('#1fa8a0', 128), x - L * 0.75, y - h * 3, L * 1.5, h * 6.5); g.restore(); g.globalAlpha = 1; }
  g.save(); g.translate(x, y); g.rotate(-0.04 + Math.sin(T * 0.2) * 0.02);
  const sw = Math.sin(T * 0.8) * h * 0.25; // tail sway
  const body = () => { g.beginPath(); g.moveTo(L * 0.5, 0);
    g.bezierCurveTo(L * 0.47, -h * 0.9, L * 0.3, -h * 1.15, L * 0.1, -h * 1.05);
    g.bezierCurveTo(-L * 0.15, -h * 0.95, -L * 0.35, -h * 0.45, -L * 0.52, -h * 0.12 + sw);
    g.lineTo(-L * 0.62, -h * 0.85 + sw); g.quadraticCurveTo(-L * 0.68, -h * 0.75 + sw, -L * 0.6, sw * 1.2); g.quadraticCurveTo(-L * 0.69, h * 0.7 + sw, -L * 0.63, h * 0.78 + sw); g.lineTo(-L * 0.52, h * 0.14 + sw);
    g.bezierCurveTo(-L * 0.35, h * 0.4, -L * 0.12, h * 0.95, L * 0.15, h * 0.92);
    g.bezierCurveTo(L * 0.3, h * 0.9, L * 0.4, h * 0.6, L * 0.44, h * 0.35); g.quadraticCurveTo(L * 0.5, h * 0.2, L * 0.5, 0); g.closePath(); };
  const extras = () => { g.beginPath(); g.moveTo(L * 0.16, h * 0.65); g.quadraticCurveTo(L * 0.1, h * 1.7, L * 0.0, h * 1.75); g.quadraticCurveTo(L * 0.04, h * 1.1, L * 0.02, h * 0.7); g.closePath();
    for (let i = 0; i < 5; i++) { const px = L * (0.18 - i * 0.09), py = -h * (1.05 - i * 0.1); g.moveTo(px - L * 0.02, py + h * 0.08); g.lineTo(px, py - h * 0.32); g.lineTo(px + L * 0.025, py + h * 0.06); g.closePath(); } };
  g.fillStyle = `rgba(0,2,5,${Math.min(0.92, 0.32 * k)})`; extras(); g.fill(); body(); g.fill();
  g.strokeStyle = `rgba(63,242,216,${Math.min(0.42, 0.13 * k)})`; g.lineWidth = 2; g.stroke();
  // mouth line
  g.strokeStyle = `rgba(63,242,216,${Math.min(0.25, 0.08 * k)})`; g.beginPath(); g.moveTo(L * 0.49, h * 0.08); g.quadraticCurveTo(L * 0.38, h * 0.3, L * 0.26, h * 0.22); g.stroke();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) { const t = i / 15, px = lerp(-L * 0.48, L * 0.36, t), py = -h * 0.55 * Math.sin(t * Math.PI * 0.9 + 0.2) + h * 0.15; g.globalAlpha = Math.min(1, 0.5 * k) * (0.5 + 0.5 * Math.sin(T * 1.3 + i * 0.7)); g.drawImage(glow('#3ff2d8', 32), px - 7, py - 7, 14, 14); }
  for (let i = 0; i < 9; i++) { const t = i / 8, px = lerp(-L * 0.3, L * 0.3, t), py = h * (0.55 + 0.2 * Math.sin(t * 3)); g.globalAlpha = Math.min(0.7, 0.3 * k) * (0.5 + 0.5 * Math.sin(T * 1.7 + i)); g.drawImage(glow('#7ab8ff', 32), px - 5, py - 5, 10, 10); }
  g.globalAlpha = Math.min(1, 0.75 * k); g.drawImage(glow('#9ff8ff', 64), L * 0.38 - 20, -h * 0.32 - 20, 40, 40);
  g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function drawEmbers(g, camM) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) { const sx = ((i * 0.618034 * 7.3) % 1) * W, sp = 20 + (i % 5) * 9, sy = H - ((T * sp + i * 97 - cam.y * scale * 0.3) % (H + 40) + H + 40) % (H + 40);
    g.globalAlpha = 0.35 + 0.3 * Math.sin(T * 3 + i); g.drawImage(glow('#ff7a3c', 32), sx + Math.sin(T + i) * 14 - 5, sy - 5, 10, 10); }
  g.restore(); g.globalAlpha = 1;
}
function drawShip(g, reg, D) {
  // sea surface + support ship
  const left = cam.x - vw / 2 - 20, right = cam.x + vw / 2 + 20;
  g.fillStyle = reg === 'ice' ? 'rgba(200,245,255,0.35)' : 'rgba(180,230,255,0.28)';
  g.beginPath(); g.moveTo(left, 0); for (let x = left; x <= right; x += 16) g.lineTo(x, Math.sin(x * 0.02 + T * 1.6) * 3 + Math.sin(x * 0.05 - T) * 1.5); g.lineTo(right, 8); g.lineTo(left, 8); g.closePath(); g.fill();
  if (reg === 'ice') { g.fillStyle = '#e6f8ff'; for (const [bx, bw, bh] of [[-470, 120, 60], [330, 160, 46], [560, 90, 70]]) { g.beginPath(); g.moveTo(bx, 2); g.lineTo(bx + bw * 0.2, -bh); g.lineTo(bx + bw * 0.6, -bh * 0.8); g.lineTo(bx + bw, 2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(150,220,240,0.35)'; g.beginPath(); g.moveTo(bx, 2); g.lineTo(bx + bw * 0.5, bh * 1.4); g.lineTo(bx + bw, 2); g.fill(); g.fillStyle = '#e6f8ff'; } }
  const bob = Math.sin(T * 1.2) * 2.5;
  g.save(); g.translate(-150, bob);
  // hull
  const hg = g.createLinearGradient(0, -40, 0, 22); hg.addColorStop(0, '#2c3b4c'); hg.addColorStop(1, '#141c26');
  g.fillStyle = hg; g.beginPath(); g.moveTo(-170, -30); g.lineTo(150, -30); g.lineTo(130, 18); g.lineTo(-150, 18); g.closePath(); g.fill();
  g.fillStyle = '#ff8a3a'; g.fillRect(-160, -30, 305, 5);
  g.fillStyle = '#e8eef2'; rr(g, -120, -78, 90, 48, 4); g.fill(); rr(g, -100, -100, 50, 24, 3); g.fill();
  g.fillStyle = '#16303d'; for (let i = 0; i < 5; i++) g.fillRect(-112 + i * 16, -66, 10, 8);
  g.fillStyle = '#ffd58a'; g.globalAlpha = 0.9; g.fillRect(-112, -66, 10, 8); g.fillRect(-64, -66, 10, 8); g.globalAlpha = 1;
  g.fillStyle = '#2c3b4c'; g.fillRect(-80, -128, 4, 30); g.fillStyle = Math.sin(T * 3) > 0 ? '#ff4040' : '#5a1010'; g.fillRect(-81, -131, 6, 4);
  // crane (A-frame reaching over the stern)
  g.strokeStyle = '#ffb04a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(90, -30); g.lineTo(150, -120); g.lineTo(150, -120); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(110, -30); g.lineTo(150, -120); g.stroke();
  g.restore();
  // cable to the sub while hanging
  const hang = !D || D.phase === 'launch' && D.t < 0.01;
  if (!D) { g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -120 + bob); g.lineTo(0, -78 + Math.sin(T * 1.3) * 3); g.stroke(); }
}
function drawHubSub(g, opt) {
  g.save(); g.translate(0, -60 + Math.sin(T * 1.3) * 3); g.rotate(Math.sin(T * 0.9) * 0.03); g.scale(1.25, 1.25); R.drawSub(g, T, {prop: 2, skin: opt.skin}); g.restore();
}
function drawWalls(g, D, reg, top, bot, amb) {
  const y0 = Math.max(4, top - 30), y1 = bot + 30; if (y1 < 0) return;
  const step = 10, rim = RIM[reg];
  const hwf = D ? D.hw : hubHW;
  for (const side of [-1, 1]) {
    const mMid = Math.max(0, (y0 + y1) / 2 / M), rc = rockAt(reg, mMid);
    const gr = g.createLinearGradient(side * 300, 0, side * 520, 0); gr.addColorStop(0, rgb(mix(rc, [255, 255, 255], 0.05))); gr.addColorStop(1, rgb(mix(rc, [0, 0, 0], 0.5)));
    g.fillStyle = gr; g.beginPath(); g.moveTo(side * 2400, y0);
    for (let y = y0; y <= y1; y += step) g.lineTo(side * hwf(side, y), y);
    g.lineTo(side * 2400, y1); g.closePath(); g.fill();
    // rim light on inner edge
    g.strokeStyle = rgb(rim, 0.22 + 0.2 * (1 - amb)); g.lineWidth = 2.2; g.beginPath(); for (let y = y0; y <= y1; y += step) g.lineTo(side * hwf(side, y), y); g.stroke();
    // texture blobs
    g.fillStyle = 'rgba(0,0,0,0.22)';
    const s0 = Math.floor(y0 / 46); for (let i = s0; i * 46 < y1; i++) { const h = DS.hash(i, side + 5); const yy = i * 46 + (h % 30); const dx = 10 + (h >>> 5) % 60; const r = 4 + (h >>> 11) % 9; g.beginPath(); g.ellipse(side * (hwf(side, yy) + dx), yy, r * 1.6, r, 0, 0, TAU); g.fill(); }
    // flora
    for (let i = s0; i * 46 < y1; i++) { const h = DS.hash(i, side + 99); if (h % 3) continue; const yy = i * 46 + (h % 40), m = yy / M, x = side * hwf(side, yy);
      if (m < 220) { // kelp
        g.strokeStyle = reg === 'vent' ? 'rgba(120,90,40,0.8)' : 'rgba(60,140,80,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, yy); const L = 30 + (h >>> 4) % 50; g.quadraticCurveTo(x - side * L * 0.6 + Math.sin(T + i) * 8, yy - L * 0.5, x - side * L * 0.4 + Math.sin(T * 1.3 + i) * 12, yy - L); g.stroke();
      } else if (m < 1200) { // sea fan
        g.strokeStyle = 'rgba(200,90,110,0.55)'; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x - side * (10 + k * 5), yy - 10 - k * 6 + Math.sin(T + k) * 2); g.stroke(); }
      } else { // glowing tube worms / pale stalks
        g.fillStyle = 'rgba(230,230,240,0.45)'; for (let k = 0; k < 3; k++) { g.fillRect(x - side * (4 + k * 6) - 1.5, yy - 14 - k * 4, 3, 14 + k * 4); }
        g.fillStyle = reg === 'vent' ? '#ff6a3a' : '#ff5a8a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - side * (4 + k * 6), yy - 15 - k * 4, 2.5, 0, TAU); g.fill(); } }
    }
  }
  // sea floor at the very bottom
  if (D && y1 > DS.FLOOR_M * M - 60) { const fy = DS.FLOOR_M * M; g.fillStyle = rgb(rockAt(reg, 7000)); g.beginPath(); g.moveTo(-2400, fy + 400); for (let x = -2400; x <= 2400; x += 40) g.lineTo(x, fy - Math.abs(Math.sin(x * 0.01)) * 20); g.lineTo(2400, fy + 400); g.fill(); }
}
const L0s = o => o[DS.lang] || o.en;
function hubHW(side, y) { return 455 + Math.sin(y * 0.01 + side) * 30; }
function drawSource(g, D, top, bot) {
  const fy = DS.FLOOR_M * M; if (bot < fy - 900 || top > fy + 100) return;
  g.save(); g.translate(40, fy);
  // every sea has its own station look: Meridian (teal), Boreas (frost), Caldera (glowing, hot)
  const ember = !!D && D.region >= 2, EC = ember ? ['#ff8a4a', '#fff0d0', '#ff8a4a', '#6a2a0a', '#1c0802', 'rgba(255,200,150,0.35)', 'rgba(255,140,70,'] : ['#3ff2d8', '#d9fffb', '#3ff2d8', '#0c5a5a', '#021a1c', 'rgba(160,255,245,0.35)', 'rgba(63,242,216,'];
  // the eye: something enormous resting in the trench behind the station (opens during the finale)
  const lit = R.stLit == null ? 1 : R.stLit, eo = R.eyeOpen == null ? 1 : R.eyeOpen;
  const op = (0.55 + 0.45 * Math.sin(T * 0.25)) * (0.15 + 0.85 * eo);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(-20, -250, 560, 260, 0, Math.PI, 0); g.fill();
  { const ex = -20, ey = -330, ew = 230, eh = 8 + 82 * eo, lk = R.eyeLook || 0;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2 + 0.6 * eo; g.drawImage(glow(EC[0], 128), ex - 340, ey - 190, 680, 380); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.save(); g.beginPath(); g.moveTo(ex - ew, ey); g.quadraticCurveTo(ex, ey - eh * 1.25, ex + ew, ey); g.quadraticCurveTo(ex, ey + eh * 1.25, ex - ew, ey); g.closePath();
    const ig = g.createRadialGradient(ex, ey - lk * 30, 4, ex, ey, ew * 0.8); ig.addColorStop(0, EC[1]); ig.addColorStop(0.25, EC[2]); ig.addColorStop(0.7, EC[3]); ig.addColorStop(1, EC[4]);
    g.fillStyle = ig; g.globalAlpha = 0.25 + 0.75 * eo; g.fill(); g.clip();
    g.fillStyle = 'rgba(0,8,10,0.95)'; g.beginPath(); g.ellipse(ex, ey - lk * 34, 13 + 6 * (1 - eo), eh * 0.9, 0, 0, TAU); g.fill();
    g.strokeStyle = EC[5]; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; g.beginPath(); g.moveTo(ex + Math.cos(a) * 30, ey - lk * 30 + Math.sin(a) * 22); g.lineTo(ex + Math.cos(a) * 110, ey + Math.sin(a) * 80); g.stroke(); }
    g.restore(); g.globalAlpha = 1;
    g.strokeStyle = EC[6] + (0.25 + 0.5 * eo) + ')'; g.lineWidth = 3; g.beginPath(); g.moveTo(ex - ew, ey); g.quadraticCurveTo(ex, ey - eh * 1.25, ex + ew, ey); g.quadraticCurveTo(ex, ey + eh * 1.25, ex - ew, ey); g.stroke(); }
  // station legs
  g.strokeStyle = '#1a262e'; g.lineWidth = 10; for (const x of [-250, -90, 90, 250]) { g.beginPath(); g.moveTo(x, -40); g.lineTo(x + (x > 0 ? 20 : -20), 0); g.stroke(); }
  const steel = g.createLinearGradient(0, -220, 0, -20); steel.addColorStop(0, ember ? '#3e2a22' : '#2c3e4a'); steel.addColorStop(1, ember ? '#170b07' : '#0e171d');
  const rim = ember ? 'rgba(255,140,70,0.5)' : 'rgba(63,242,216,0.4)';
  g.fillStyle = steel; g.strokeStyle = rim; g.lineWidth = 2;
  // side module + tube
  rr(g, -470, -100, 140, 60, 26); g.fill(); g.stroke(); g.fillRect(-335, -80, 40, 18);
  // main module
  rr(g, -300, -130, 600, 96, 44); g.fill(); g.stroke();
  // observation dome
  g.beginPath(); g.arc(-170, -128, 84, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
  const ow = g.createRadialGradient(-170, -150, 4, -170, -140, 70); ow.addColorStop(0, 'rgba(255,220,150,0.95)'); ow.addColorStop(1, 'rgba(120,70,20,0.4)');
  g.fillStyle = ow; g.beginPath(); g.arc(-170, -128, 62, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(20,30,36,0.9)'; g.lineWidth = 3; for (let i = 1; i < 4; i++) { const a = Math.PI + i * Math.PI / 4; g.beginPath(); g.moveTo(-170, -128); g.lineTo(-170 + Math.cos(a) * 62, -128 + Math.sin(a) * 62); g.stroke(); }
  // tower + antenna
  g.fillStyle = steel; g.strokeStyle = rim; g.lineWidth = 2; rr(g, 140, -240, 90, 112, 12); g.fill(); g.stroke();
  g.fillRect(180, -470, 8, 232); g.fillRect(150, -420, 70, 5); g.fillRect(160, -380, 50, 4);
  g.fillStyle = Math.sin(T * 2.2) > 0 ? '#ff5050' : '#3a0a0a'; g.beginPath(); g.arc(184, -476, 7, 0, TAU); g.fill();
  // windows
  for (let i = 0; i < 9; i++) { const on = lit >= 1 ? Math.sin(T * 0.5 + i * 1.7) > -0.4 : lit * 9 > i + 0.5 || (lit < 0.4 && Math.sin(T * 0.9 + i * 2.3) > 0.92); g.fillStyle = on ? '#ffd58a' : '#16222a'; g.beginPath(); g.arc(-240 + i * 58, -82, 8, 0, TAU); g.fill(); }
  for (let i = 0; i < 3; i++) { g.fillStyle = (lit > 0.6 + i * 0.1) && Math.sin(T * 0.7 + i) > -0.2 ? '#9ff8ff' : '#16222a'; g.fillRect(156 + i * 22, -212, 12, 16); }
  const stn = DS.regionOf(D ? D.region : 0).station, ice = D && D.region === 1;
  if (ice) { // frost on the roof and icicles along the main module
    g.fillStyle = 'rgba(225,248,255,0.85)'; rr(g, -300, -134, 600, 12, 6); g.fill(); rr(g, -470, -104, 140, 10, 5); g.fill(); rr(g, 140, -244, 90, 9, 4); g.fill();
    g.fillStyle = 'rgba(190,235,255,0.75)'; for (let i = 0; i < 17; i++) { const x = -285 + i * 35, l = 14 + ((i * 7) % 5) * 6; g.beginPath(); g.moveTo(x - 5, -34); g.lineTo(x + 5, -34); g.lineTo(x, -34 + l); g.closePath(); g.fill(); } }
  if (ember) { // glowing cracks in the hull and a bed of embers under the station
    g.strokeStyle = `rgba(255,${120 + 40 * Math.sin(T * 2) | 0},50,0.85)`; g.lineWidth = 2.5; g.lineCap = 'round';
    for (const [x, y, l] of [[-250, -60, 50], [-60, -120, 40], [90, -70, 60], [210, -40, 35], [-420, -70, 30], [175, -200, 30]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * 0.4, y + 9); g.lineTo(x + l * 0.7, y + 3); g.lineTo(x + l, y + 12); g.stroke(); }
    g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 9; i++) { g.globalAlpha = 0.35 + 0.25 * Math.sin(T * 1.6 + i * 1.3); g.drawImage(glow('#ff6a2a', 64), -360 + i * 85, -40, 90, 60); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  g.font = '700 22px Poppins, sans-serif'; g.fillStyle = ember ? `rgba(255,200,150,${0.3 + 0.45 * lit})` : ice ? `rgba(220,248,255,${0.3 + 0.4 * lit})` : `rgba(200,240,240,${0.25 + 0.35 * lit})`; g.textAlign = 'center'; g.fillText(L0s(stn).toUpperCase(), 0, -100);
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2 + 0.7 * lit; g.drawImage(glow(ember ? '#ff9a5a' : '#ffd58a', 128), -330, -260, 640, 300); g.globalAlpha = 0.8; g.drawImage(glow('#ff5050', 32), 164, -496, 40, 40); g.globalAlpha = 1;
  g.restore(); g.globalCompositeOperation = 'source-over';
}
function drawJelly(g, j) {
  const x = j.cx, y = j.cy, s = j.s * 18, pulse = 1 + Math.sin(T * 2.4 + j.ph) * 0.12; const col = j.sample ? '#b8ff7a' : j.hue < 0.5 ? '#ff7ad9' : '#7ab8ff';
  if (j.sample) { g.save(); g.strokeStyle = `rgba(184,255,122,${0.35 + 0.25 * Math.sin(T * 3 + j.ph)})`; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.arc(x, y + s * 0.4, s * 2.2, 0, TAU); g.stroke(); g.setLineDash([]); g.restore(); }
  g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(glow(col, 64), -s * 2, -s * 2, s * 4, s * 4); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.strokeStyle = col; g.globalAlpha = 0.55; g.lineWidth = 1.2; for (let i = 0; i < 5; i++) { g.beginPath(); const tx = (i - 2) * s * 0.3; g.moveTo(tx, 0); g.quadraticCurveTo(tx + Math.sin(T * 2 + i) * 6, s * 1.2, tx + Math.sin(T * 1.5 + i) * 4, s * 2.2); g.stroke(); }
  g.globalAlpha = 0.75; g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, s * pulse, s * 0.7 / pulse, 0, Math.PI, 0); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.3, -s * 0.35, s * 0.25, s * 0.12, 0, 0, TAU); g.fill();
  g.restore(); g.globalAlpha = 1;
}
let bubT = 0;
function drawSubWorld(g, D, dt) {
  const s = D.sub;
  // trail bubbles
  bubT -= dt; const sp = Math.hypot(s.vx, s.vy);
  if (s.y > 6 && bubT <= 0) { bubT = sp > 200 ? 0.03 : 0.08; R.bubbles(s.x - s.face * 34, s.y + 2, 1, 30); }
  // light beam haze (drawn before sub)
  const m = s.y / M, amb = ambientAt(m);
  if (amb < 0.9 && D.light) { g.save(); g.translate(s.x, s.y); g.scale(s.face, 1); g.rotate(s.tilt * s.face + 0.12); g.globalCompositeOperation = 'lighter';
    const L = D.st.light * 1.35, lc = D.st.filter > 0 ? '255,130,110' : '255,226,160'; const bg = g.createLinearGradient(30, 0, L, 0); bg.addColorStop(0, `rgba(${lc},${0.05 * (1 - amb)})`); bg.addColorStop(1, `rgba(${lc},0)`);
    g.fillStyle = bg; for (const sp of [0.12, 0.17, 0.22, 0.27, 0.32, 0.38, 0.44]) { g.beginPath(); g.moveTo(28, -7); g.lineTo(L, -L * sp); g.lineTo(L, L * sp); g.lineTo(28, 1); g.closePath(); g.fill(); } g.restore(); }
  g.save(); g.translate(s.x, s.y); g.scale(s.face, 1); g.rotate(s.tilt * s.face);
  if (D.drillAt) g.translate((Math.random() - .5) * 1.6, (Math.random() - .5) * 1.6);
  R.drawSub(g, T, {drill: D.drillAt ? 1 : 0, prop: 6 + Math.min(20, sp / 15), skin: D.S.skin, lightOff: !D.light, red: D.st.filter > 0});
  g.restore();
  // emergency buoy
  if (D.emergency && D.phase === 'ascent') { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(s.x, s.y - 20); g.lineTo(s.x, s.y - 90); g.stroke(); g.fillStyle = '#ff4040'; g.beginPath(); g.arc(s.x, s.y - 100, 12, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(s.x - 12, s.y - 102, 24, 4); }
  // drill target bar
  const o = D.drillObj; if (o && !o.broken && !R.cover) { const bw = Math.min(90, o.w), x = o.x - bw / 2, y = o.y - o.h / 2 - 16;
    g.fillStyle = 'rgba(2,10,20,0.75)'; rr(g, x - 2, y - 2, bw + 4, 9, 4); g.fill(); g.fillStyle = '#ffb347'; rr(g, x, y, Math.max(3, bw * o.hp / o.hpMax), 5, 2.5); g.fill(); }
}
function drawLight(g, D, reg, amb, opt) {
  // light off: the sea gets much darker, only sonar echoes and bioluminescence remain
  if (D && !D.light) amb *= R.small ? 0.7 : 0.45;
  const dark = 1 - amb; if (dark < 0.02) return;
  const L = lx, ls = lightScale; L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, lightC.width, lightC.height);
  L.fillStyle = reg === 'vent' ? 'rgba(6,1,0,1)' : 'rgba(0,3,8,1)'; L.globalAlpha = Math.min(0.97, dark) * (R.coverK || 1); L.fillRect(0, 0, lightC.width, lightC.height); L.globalAlpha = 1;
  L.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a = 1) => { const [sx, sy] = toScreen(x, y); const rr2 = r * scale * ls; if (sx * ls + rr2 < 0 || sy * ls + rr2 < 0 || sx * ls - rr2 > lightC.width || sy * ls - rr2 > lightC.height) return;
    const gr = L.createRadialGradient(sx * ls, sy * ls, 0, sx * ls, sy * ls, rr2); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gr; L.fillRect(sx * ls - rr2, sy * ls - rr2, rr2 * 2, rr2 * 2); };
  if (D) {
    const s = D.sub, lr = D.st.light;
    if (D.light) {
      hole(s.x, s.y, lr * 0.75, 1);
      // cone ahead
      const [sx, sy] = toScreen(s.x, s.y); L.save(); L.translate(sx * ls, sy * ls); L.scale(s.face, 1); L.rotate(s.tilt * s.face + 0.12);
      const cl = lr * 1.5 * scale * ls; const cg = L.createLinearGradient(0, 0, cl, 0); cg.addColorStop(0, 'rgba(0,0,0,0.3)'); cg.addColorStop(0.55, 'rgba(0,0,0,0.16)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = cg; for (const sp of [0.16, 0.21, 0.26, 0.31, 0.36, 0.42, 0.48, 0.54]) { L.beginPath(); L.moveTo(0, -8 * scale * ls); L.lineTo(cl, -cl * sp); L.lineTo(cl, cl * sp); L.lineTo(0, 8 * scale * ls); L.closePath(); L.fill(); } L.restore();
    } else hole(s.x, s.y, 70, 0.75);
    for (const p of D.pieces) hole(p.x, p.y, p.find ? 46 : 28, 0.8);
    for (const o of D.objs) { if (o.broken) continue; if (o.t === 'ore') hole(o.x, o.y, 70, 0.75); else if (o.t === 'cache' || o.t === 'treasure') hole(o.x, o.y, 130, 1); else if (o.t === 'whale') hole(o.x, o.y, 170, 0.55);
      else if (o.t === 'recorder') hole(o.x, o.y, 70, 0.7); else if (o.t === 'vault') hole(o.x + (o.side || 1) * -10, o.y, 60, 0.6); else if (o.t === 'pod' && Math.sin(T * 2 + o.ph) > 0) hole(o.x, o.y, 50, 0.5);
      else if (o.t === 'sigcache' && Math.sin(T * 5) > 0.2) hole(o.x, o.y - 14, 40, 0.7);
      if (o.rev > 0) hole(o.x, o.y, Math.max(o.w, 60) * 0.9, 0.55 * Math.min(1, o.rev)); }
    for (const j of D.jellies) if (j.cy != null && !j.taken) hole(j.cx, j.cy, 60 * j.s * (j.sample ? 1.3 : 1), 0.7);
    for (const b of D.ice) if (Math.abs(b.y - s.y) < 900) hole(b.x, b.y, b.r * 1.6, 0.35);
    for (const f of D.flaresOut) hole(f.x, f.y, 240 * Math.min(1, f.t / 1.5), 0.95);
    for (const r of D.rocks) if (r.t < r.warn) hole(r.x, r.y + 60, 50, 0.5);
    for (const v of D.vents) if ((v.warn || v.on) && Math.abs(v.y - s.y) < 900) hole(v.side * D.hw(v.side, v.y), v.y, v.on ? 160 : 70, 0.6);
    if (DS.FLOOR_M * M - s.y < 1600) { const k = R.stLit == null ? 0.75 : 0.45 + 0.5 * R.stLit; hole(40, DS.FLOOR_M * M - 120, 420 + 160 * (R.stLit || 0), k); hole(224, DS.FLOOR_M * M - 476, 60, 0.8); }
    for (const p of parts) if (p.type === 'spark' || p.type === 'glow') hole(p.x, p.y, p.type === 'glow' ? p.size * 1.5 : 26, 0.5 * (1 - p.life / p.max));
  }
  L.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(lightC, 0, 0, cv.width, cv.height); g.restore();
}
function drawSonar(g, D) {
  const s = D.sub, [sx, sy] = toScreen(s.x, s.y);
  // expanding ping wavefront (soft, with a bright leading edge)
  const pt = 5 - D.pingT; if (pt < 1.5) { const k = pt / 1.5, r = k * D.st.sonar * scale, fade = (1 - k) * clamp(1 - r / (Math.min(W, H) * 0.75), 0, 1); if (fade > 0.01) { g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(63,242,216,${0.5 * fade})`; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.stroke();
    g.strokeStyle = `rgba(63,242,216,${0.14 * fade})`; g.lineWidth = 14; g.beginPath(); g.arc(sx, sy, Math.max(0, r - 9), 0, TAU); g.stroke(); g.restore(); } }
  // signal compass: chevrons around the sub point toward the nearest signal cache, brighter when close
  if (D.sig.str > 0 && D.phase === 'dive') { const k = D.sig.str, a = D.sig.ang, pk = pt < 1.2 ? 1 - pt / 1.2 : 0; g.save(); g.translate(sx, sy); g.rotate(a); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const r = (64 + i * 15) * Math.max(0.85, scale), al = (0.3 + 0.6 * k) * (0.45 + 0.55 * pk) * (1 - i * 0.22) * (0.75 + 0.25 * Math.sin(T * 5 - i));
      g.strokeStyle = `rgba(122,247,255,${al})`; g.lineWidth = 3.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(r - 9, -12); g.lineTo(r, 0); g.lineTo(r - 9, 12); g.stroke(); }
    g.restore(); }
  // echoes: corner brackets on revealed things (on screen), edge arrows for the best ones off screen
  g.save();
  const offs = [];
  const brk = s.y / M > 160;
  for (const o of D.objs) { if (o.broken || !(o.rev > 0) || (!brk && !o.sig)) continue; const [ox, oy] = toScreen(o.x, o.y); const a = Math.min(1, o.rev);
    if (!(ox > 30 && ox < W - 30 && oy > 60 && oy < H - 30)) { offs.push(o); continue; }
    const hw = Math.max(12, o.w * scale * 0.5 + 6), hh = Math.max(10, o.h * scale * 0.5 + 6), c = Math.min(10, hw * 0.5), col = o.sig ? '122,247,255' : '63,242,216';
    g.strokeStyle = `rgba(${col},${(o.sig ? 0.9 : 0.6) * a})`; g.lineWidth = 2; g.beginPath();
    for (const [qx, qy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x0 = ox + qx * hw, y0 = oy + qy * hh; g.moveTo(x0, y0 - qy * c); g.lineTo(x0, y0); g.lineTo(x0 - qx * c, y0); }
    g.stroke(); }
  const sc = o => o.value * (o.sig ? 4 : 1) / (1 + Math.hypot(o.x - s.x, o.y - s.y) / 400); offs.sort((a, b) => sc(b) - sc(a));
  for (const o of offs.slice(0, 3)) { const [ox, oy] = toScreen(o.x, o.y); const a = Math.min(1, o.rev);
    const ang = Math.atan2(oy - sy, ox - sx), [ex, ey] = avoidSafe(clamp(ox, 26, W - 26), clamp(oy, 70, H - 26));
    g.translate(ex, ey); g.rotate(ang); g.fillStyle = o.sig ? `rgba(122,247,255,${a})` : `rgba(63,242,216,${0.85 * a})`; g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  g.restore();
  drawContractMarks(g, D, sx, sy);
}
// contract targets: a small gold marker above each thing the contract asks for, a gold arrow at the edge toward the nearest one
function drawContractMarks(g, D, sx, sy) {
  const C = D.contract, s = D.sub; if (!C || C.done || D.phase !== 'dive') return;
  const want = C.id === 'wrecks' ? (o => o.t === 'wreck' || o.t === 'bigwreck' || o.t === 'whale' || o.t === 'vault') : C.id === 'ore' ? (o => o.t === 'ore') : C.id === 'box' ? (o => o.recorder) : null;
  const tg = [];
  if (want) for (const o of D.objs) { if (o.broken || !want(o)) continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < 1800) tg.push([o.x, o.y - o.h / 2 - 8, d]); }
  if (C.id === 'jelly') for (const j of D.jellies) if (j.sample && !j.taken && j.cx != null) { const d = Math.hypot(j.cx - s.x, j.cy - s.y); if (d < 1800) tg.push([j.cx, j.cy - 34, d]); }
  if (C.id === 'box' && !D.boxPlaced && C.y > s.y) tg.push([s.x, C.y, C.y - s.y]);
  if (!tg.length) return;
  let near = null; g.save();
  for (const t of tg) { const [x, y] = toScreen(t[0], t[1]);
    if (x > 24 && x < W - 24 && y > 60 && y < H - 24) { const b = Math.sin(T * 5) * 3; g.fillStyle = 'rgba(255,211,106,0.95)'; g.strokeStyle = 'rgba(40,24,0,0.9)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - 8, y - 14 + b); g.lineTo(x + 8, y - 14 + b); g.lineTo(x, y - 3 + b); g.closePath(); g.stroke(); g.fill(); }
    else if (!near || t[2] < near[2]) near = [x, y, t[2]]; }
  if (near && !tg.some(t => { const [x, y] = toScreen(t[0], t[1]); return x > 24 && x < W - 24 && y > 60 && y < H - 24; })) {
    const ang = Math.atan2(near[1] - sy, near[0] - sx), [ex, ey] = avoidSafe(clamp(near[0], 30, W - 30), clamp(near[1], 76, H - 30));
    g.translate(ex, ey); g.rotate(ang); g.fillStyle = `rgba(255,211,106,${0.75 + 0.25 * Math.sin(T * 6)})`; g.strokeStyle = 'rgba(40,24,0,0.9)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(13, 0); g.lineTo(-7, -10); g.lineTo(-2, 0); g.lineTo(-7, 10); g.closePath(); g.stroke(); g.fill(); }
  g.restore();
}
function drawGlitch(g, dt) {
  R.glitch -= dt; const k = Math.min(1, R.glitch / 0.8);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const n = Math.floor(1 + Math.random() * 3 * k);
  for (let i = 0; i < n; i++) { const y = Math.random() * cv.height, h = (3 + Math.random() * 14) * dpr, off = (Math.random() - .5) * 26 * k * dpr; try { g.drawImage(cv, 0, y, cv.width, h, off, y, cv.width, h); } catch (_) {} }
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.05 * k; g.drawImage(noiseTex(), Math.random() * 100 - 100, Math.random() * 100 - 100, cv.width + 200, cv.height + 200);
  g.globalAlpha = 0.12 * k; g.fillStyle = '#3ff2d8'; g.fillRect(0, (T * 500 % cv.height), cv.width, 2 * dpr);
  g.restore(); g.globalAlpha = 1;
}
R.glitch = 0;


// ---------- new things in the deep ----------
function drawBlackBox(g, o) {
  // orange flight-recorder style box with antenna and a teal beacon
  const w = o.w, h = o.h; const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#ffb05a'); gr.addColorStop(1, '#c2561a');
  g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, 5); g.fill(); g.strokeStyle = 'rgba(40,14,4,0.9)'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = 'rgba(30,10,4,0.75)'; g.fillRect(-w / 2, -h * 0.12, w, h * 0.24);
  g.fillStyle = '#ffe6c4'; for (let i = 0; i < 4; i++) g.fillRect(-w / 2 + 5 + i * 8, -h * 0.07, 4, h * 0.14);
  g.strokeStyle = '#2a1608'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.28, -h / 2); g.lineTo(w * 0.34, -h / 2 - 16); g.stroke();
  const on = Math.sin(T * 5) > 0.2; g.fillStyle = on ? '#bffcff' : '#1b4d55'; g.beginPath(); g.arc(w * 0.34, -h / 2 - 17, 3.4, 0, TAU); g.fill();
  if (on) { g.globalCompositeOperation = 'lighter'; g.drawImage(glow('#7af7ff', 64), w * 0.34 - 22, -h / 2 - 39, 44, 44); g.globalCompositeOperation = 'source-over'; }
}
function drawWhale(g, o) {
  // whale fall: skull, spine and ribs resting on a ledge
  const w = o.w, h = o.h, dmg = 1 - Math.max(0, o.hp) / o.hpMax, dir = o.side > 0 ? -1 : 1;
  g.save(); g.scale(dir, 1);
  g.strokeStyle = '#e7dfcb'; g.fillStyle = '#e7dfcb'; g.lineCap = 'round';
  g.lineWidth = 7; g.beginPath(); g.moveTo(-w * 0.32, h * 0.18); for (let i = 0; i <= 10; i++) g.lineTo(-w * 0.32 - i * w * 0.016, h * 0.18 - Math.sin(i * 0.4) * 4 + i); g.stroke();
  g.beginPath(); g.moveTo(-w * 0.32, h * 0.18); g.quadraticCurveTo(w * 0.05, h * 0.05, w * 0.3, h * 0.12); g.stroke();
  g.lineWidth = 4.5; const nr = Math.round(9 * (1 - dmg * 0.6));
  for (let i = 0; i < nr; i++) { const x = -w * 0.26 + i * w * 0.058, hh = h * (0.75 - Math.abs(i - 4) * 0.06); g.beginPath(); g.moveTo(x, h * 0.12); g.quadraticCurveTo(x + 10, h * 0.12 - hh, x + 22, h * 0.12 - hh * 0.9); g.stroke(); }
  // skull
  g.beginPath(); g.moveTo(w * 0.26, h * 0.2); g.quadraticCurveTo(w * 0.36, -h * 0.25, w * 0.5, -h * 0.05); g.quadraticCurveTo(w * 0.52, h * 0.15, w * 0.38, h * 0.3); g.closePath(); g.fill();
  g.fillStyle = '#20302f'; g.beginPath(); g.ellipse(w * 0.36, h * 0.02, 6, 4.5, 0, 0, TAU); g.fill();
  // tiny bone-eating worms (soft pink glow)
  g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) { g.globalAlpha = 0.5 + 0.4 * Math.sin(T * 2 + i); g.drawImage(glow('#ff8ab8', 32), -w * 0.25 + i * w * 0.08 - 6, h * 0.05 - 6 - (i % 3) * 6, 12, 12); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.restore();
}
function drawShoal(g, D) {
  // a glittering school circling the treasure shoal
  const cx = 0, cy = D.evY; g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) { const a = T * (0.5 + (i % 5) * 0.06) + i * 2.4, r = 110 + (i * 37 % 120), x = cx + Math.cos(a) * r * 1.6, y = cy + Math.sin(a * 1.3) * r * 0.5;
    g.globalAlpha = 0.55 + 0.45 * Math.sin(T * 6 + i); g.fillStyle = i % 4 ? '#cfefff' : '#ffe08a';
    g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, 0, 5, 1.8, 0, 0, TAU); g.fill(); g.restore(); }
  g.restore(); g.globalAlpha = 1;
}
function drawVents(g, D, top, bot) {
  for (const v of D.vents) { if (v.y < top - 120 || v.y > bot + 120) continue; const x0 = v.side * D.hw(v.side, v.y);
    g.save(); g.translate(x0, v.y); g.scale(-v.side, 1);
    const vg = g.createLinearGradient(0, -30, 0, 30); vg.addColorStop(0, '#3a3530'); vg.addColorStop(1, '#16110e'); g.fillStyle = vg;
    g.beginPath(); g.moveTo(-8, -40); g.quadraticCurveTo(14, -34, 22, -16); g.lineTo(34, -12); g.quadraticCurveTo(40, 0, 34, 12); g.lineTo(22, 16); g.quadraticCurveTo(14, 34, -8, 40); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.ellipse(8, -22, 10, 4, 0.4, 0, TAU); g.fill();
    const k = v.on ? 1 : v.warn ? 0.5 + 0.5 * Math.sin(T * 18) : 0.12; g.fillStyle = `rgba(255,${110 + 90 * k | 0},50,${0.3 + 0.6 * k})`; g.beginPath(); g.ellipse(35, 0, 5, 11, 0, 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,150,80,${0.15 + 0.5 * k})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(22, -16); g.lineTo(34, -12); g.quadraticCurveTo(40, 0, 34, 12); g.lineTo(22, 16); g.stroke();
    g.restore();
    if (v.on && Math.random() < 0.9) { const dx = -v.side; R.burst(x0 + dx * 30, v.y, 2, {a: dx > 0 ? 0 : Math.PI, spread: 0.35, sp: 520, col: '#ffb070', life: 0.55, size: 3}); R.bubbles(x0 + dx * (40 + Math.random() * 200), v.y + (Math.random() - 0.5) * 40, 1, 80); }
    else if (v.warn && Math.random() < 0.4) R.bubbles(x0 - v.side * 30, v.y, 1, 30); }
}
function predPath(g, p, P, k) {
  // body silhouettes (local space, facing +x). k: 0..1 coil (telegraph) amount
  const L = P.len, sw = Math.sin(T * 6 + p.ph) * 0.18 * (p.st === 'lunge' ? 0.3 : 1);
  if (p.type === 'eel') {
    // gulper eel: huge hinged mouth, ribbon tail with a glowing tip
    g.beginPath(); g.moveTo(L * 0.5, -L * 0.02); g.quadraticCurveTo(L * 0.36, -L * 0.24, L * 0.12, -L * 0.13);
    for (let i = 1; i <= 8; i++) { const x = L * 0.12 - i * L * 0.105 * (1 - k * 0.35), y = Math.sin(i * 0.9 + T * 5 + p.ph) * L * 0.07 * (i / 8) + sw * i * 3; g.lineTo(x, y - L * 0.085 * (1 - i / 9.5)); }
    for (let i = 8; i >= 1; i--) { const x = L * 0.12 - i * L * 0.105 * (1 - k * 0.35), y = Math.sin(i * 0.9 + T * 5 + p.ph) * L * 0.07 * (i / 8) + sw * i * 3; g.lineTo(x, y + L * 0.075 * (1 - i / 9.5)); }
    g.lineTo(L * 0.15, L * 0.14); const jaw = 0.18 + 0.25 * k; g.quadraticCurveTo(L * 0.35, L * (0.1 + jaw), L * 0.52, L * (0.02 + jaw * 0.5)); g.lineTo(L * 0.3, L * 0.03); g.closePath();
  } else if (p.type === 'viper') {
    const jaw = 0.12 + 0.22 * k;
    g.beginPath(); g.moveTo(L * 0.5, -L * 0.04); g.quadraticCurveTo(L * 0.3, -L * 0.2, 0, -L * 0.14); g.quadraticCurveTo(-L * 0.35, -L * 0.1, -L * 0.5, 0);
    g.lineTo(-L * 0.68, -L * 0.15 + sw * 14); g.lineTo(-L * 0.62, 0); g.lineTo(-L * 0.68, L * 0.15 + sw * 14); g.lineTo(-L * 0.5, L * 0.03);
    g.quadraticCurveTo(-L * 0.2, L * 0.15, L * 0.2, L * 0.12); g.quadraticCurveTo(L * 0.42, L * (0.14 + jaw), L * 0.54, L * (0.04 + jaw * 0.6)); g.lineTo(L * 0.32, L * 0.03); g.closePath();
  } else if (p.type === 'angler') {
    g.beginPath(); g.moveTo(L * 0.5, -L * 0.05); g.quadraticCurveTo(L * 0.35, -L * 0.42, -L * 0.1, -L * 0.32); g.quadraticCurveTo(-L * 0.4, -L * 0.2, -L * 0.45, 0);
    g.lineTo(-L * 0.68, -L * 0.2 + sw * 20); g.lineTo(-L * 0.62, 0); g.lineTo(-L * 0.68, L * 0.2 + sw * 20); g.lineTo(-L * 0.45, L * 0.04);
    g.quadraticCurveTo(-L * 0.3, L * 0.38, L * 0.15, L * 0.36); const jaw = 0.1 + 0.2 * k; g.quadraticCurveTo(L * 0.45, L * (0.3 + jaw), L * 0.56, L * (0.05 + jaw)); g.lineTo(L * 0.3, L * 0.06); g.closePath();
  } else {
    // giant squid: long mantle with fins, trailing arms (drawn separately)
    g.beginPath(); g.moveTo(-L * 0.55, 0); g.lineTo(-L * 0.7, -L * 0.12); g.lineTo(-L * 0.45, -L * 0.07); g.quadraticCurveTo(-L * 0.1, -L * 0.17, L * 0.12, -L * 0.1);
    g.quadraticCurveTo(L * 0.2, 0, L * 0.12, L * 0.1); g.quadraticCurveTo(-L * 0.1, L * 0.17, -L * 0.45, L * 0.07); g.lineTo(-L * 0.7, L * 0.12); g.closePath();
  }
}
function drawPred(g, p, D) {
  const P = p.P, k = p.st === 'wind' ? Math.min(1, (P.wind - p.t) / P.wind) : 0;
  g.save(); g.translate(p.x, p.y); g.rotate(p.ang); if (Math.cos(p.ang) < 0) g.scale(1, -1);
  if (p.st === 'wind') g.translate((Math.random() - 0.5) * 2 * k, (Math.random() - 0.5) * 2 * k);
  const body = p.type === 'eel' ? '#14303e' : p.type === 'angler' ? '#2c2238' : p.type === 'viper' ? '#16301c' : '#40202f', rimc = p.type === 'squid' ? 'rgba(255,140,190,0.8)' : p.type === 'angler' ? 'rgba(255,214,120,0.7)' : p.type === 'viper' ? 'rgba(184,255,154,0.8)' : 'rgba(140,238,255,0.8)';
  if (p.type === 'squid') { // arms
    g.strokeStyle = body; g.lineCap = 'round'; for (let i = 0; i < 8; i++) { const sp = (i - 3.5) * 0.09, len = P.len * (0.55 + (i % 2) * 0.25) * (1 - k * 0.3);
      g.lineWidth = 5 - (i % 3); g.beginPath(); g.moveTo(P.len * 0.1, sp * 40); g.quadraticCurveTo(P.len * 0.3 + len * 0.4, sp * 70 + Math.sin(T * 3 + i + p.ph) * 12, P.len * 0.12 + len, sp * 110 + Math.sin(T * 2.4 + i * 1.3 + p.ph) * 22); g.stroke(); } }
  const bgr = g.createLinearGradient(0, -P.len * 0.3, 0, P.len * 0.3); bgr.addColorStop(0, body); bgr.addColorStop(1, p.type === 'eel' ? '#3f7a8c' : p.type === 'angler' ? '#4a3c58' : p.type === 'viper' ? '#3f6a40' : '#6a3048');
  predPath(g, p, P, k); g.fillStyle = bgr; g.fill(); g.strokeStyle = rimc; g.lineWidth = 2.2; g.stroke();
  if (p.type === 'angler') { g.fillStyle = '#f2efe6'; for (let i = 0; i < 5; i++) { const x = P.len * (0.28 + i * 0.05), y = P.len * (0.08 + (0.1 + 0.2 * k) * 0.5 * i / 4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2.5, y - 5); g.lineTo(x + 5, y); g.fill(); }
    g.strokeStyle = '#3a3040'; g.lineWidth = 2; g.beginPath(); g.moveTo(P.len * 0.2, -P.len * 0.32); g.quadraticCurveTo(P.len * 0.45, -P.len * 0.75, P.len * 0.66, -P.len * 0.48); g.stroke(); }
  if (p.type === 'viper') { g.fillStyle = '#f2efe6'; for (let i = 0; i < 3; i++) { const x = P.len * (0.36 + i * 0.06), jw = (0.12 + 0.22 * k); g.beginPath(); g.moveTo(x, P.len * 0.02); g.lineTo(x + 2, P.len * (0.1 + jw * 0.5) + 6); g.lineTo(x + 4, P.len * 0.02); g.fill(); } }
  if (p.type === 'eel') { g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.ellipse(L0(P) * 0.32, L0(P) * 0.08, L0(P) * 0.12, L0(P) * 0.05, 0.4, 0, TAU); g.fill(); }
  g.restore();
}
const L0 = P => P.len;
function predGlows(g, p) {
  // eyes / lures: visible even in total darkness – that is the scary part
  const P = p.P, k = p.st === 'wind' ? Math.min(1, (P.wind - p.t) / P.wind) : p.st === 'lunge' ? 1 : 0, fl = Math.cos(p.ang) < 0 ? -1 : 1;
  const loc = (lx2, ly2) => { const c = Math.cos(p.ang), sn = Math.sin(p.ang), y = ly2 * fl; return toScreen(p.x + lx2 * c - y * sn, p.y + lx2 * sn + y * c); };
  const L = P.len, eye = p.type === 'eel' ? [L * 0.36, -L * 0.07] : p.type === 'angler' ? [L * 0.3, -L * 0.16] : p.type === 'viper' ? [L * 0.34, -L * 0.06] : [L * 0.02, -L * 0.05];
  const [ex, ey] = loc(eye[0], eye[1]), base = p.type === 'squid' ? '#ff7ab0' : p.type === 'angler' ? '#d8ff9a' : p.type === 'viper' ? '#b8ff9a' : '#8fe9ff';
  const a = 0.35 + 0.65 * Math.max(k, p.int * 0.6), sz = (10 + 18 * k) * Math.max(0.8, scale);
  g.globalAlpha = a; g.drawImage(glow(k > 0.2 ? '#ff6a4a' : base, 64), ex - sz, ey - sz, sz * 2, sz * 2);
  g.globalAlpha = Math.min(1, a + 0.2); g.fillStyle = k > 0.2 ? '#fff0e0' : '#e8ffff'; g.beginPath(); g.arc(ex, ey, 2.2 * Math.max(0.8, scale), 0, TAU); g.fill();
  if (p.type === 'angler') { const [lx3, ly3] = loc(L * 0.66, -L * 0.48), s2 = (16 + 6 * Math.sin(T * 4 + p.ph)) * Math.max(0.8, scale); g.globalAlpha = 0.9; g.drawImage(glow('#ffd36a', 64), lx3 - s2, ly3 - s2, s2 * 2, s2 * 2); }
  if (p.type === 'viper') { const [vx2, vy2] = loc(-L * 0.05, -L * 0.2), s2 = 7 * Math.max(0.8, scale); g.globalAlpha = 0.6 + 0.35 * Math.sin(T * 4 + p.ph); g.drawImage(glow('#b8ff9a', 32), vx2 - s2, vy2 - s2, s2 * 2, s2 * 2); }
  if (p.type === 'eel') { const [tx2, ty2] = loc(-L * 0.75, Math.sin(T * 5 + p.ph) * L * 0.07), s2 = 9 * Math.max(0.8, scale); g.globalAlpha = 0.5 + 0.4 * Math.sin(T * 3 + p.ph); g.drawImage(glow('#ff7ad9', 32), tx2 - s2, ty2 - s2, s2 * 2, s2 * 2); }
  if (p.type === 'squid') { const [e2x, e2y] = loc(eye[0] - 10, eye[1] + 14); g.globalAlpha = a * 0.8; g.drawImage(glow(k > 0.2 ? '#ff6a4a' : base, 64), e2x - sz * 0.8, e2y - sz * 0.8, sz * 1.6, sz * 1.6); }
  g.globalAlpha = 1;
}
function drawRocks(g, D, dt) {
  for (const r of D.rocks) {
    if (r.t < r.warn) { if (Math.random() < 0.5) R.burst(r.x + (Math.random() - 0.5) * 16, r.y, 1, {a: Math.PI / 2, spread: 0.4, sp: 90, col: 'rgba(190,190,180,1)', type: 'debris', g: 200, life: 0.7, size: 2.5}); continue; }
    g.save(); g.translate(r.x, r.y); g.rotate(r.rot); g.fillStyle = '#3d4247'; g.strokeStyle = 'rgba(255,190,120,0.55)'; g.lineWidth = 1.5;
    g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr3 = r.r * (0.75 + ((i * 37) % 10) / 30); g.lineTo(Math.cos(a) * rr3, Math.sin(a) * rr3); } g.closePath(); g.fill(); g.stroke(); g.restore();
  }
}
function drawStationGlow(g, D, camM, opt) {
  // Meridian Station is always visible as a faint pulse far below – the goal never leaves the screen
  if (R.noGoal) return;
  const fy = DS.FLOOR_M * M - 150, [sx0, sy] = toScreen(40, fy); if (sy < H + 40 && D) return;
  const depth = D ? Math.max(0, D.sub.y / M) : 0, k = 0.22 + 0.55 * clamp(depth / 6000, 0, 1), pulse = 0.65 + 0.35 * Math.sin(T * 1.65);
  const x = clamp(sx0, W * 0.2, W * 0.8), y = H + 30;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = k * pulse * (opt && opt.hub ? 0.7 : 1);
  const r = Math.max(W, H) * 0.32; g.drawImage(glow(D && D.region === 1 ? '#bff6ff' : D && D.region >= 2 ? '#ffb070' : '#3ff2d8', 128), x - r, y - r * 0.55, r * 2, r * 1.1);
  g.globalAlpha = k * pulse * 0.9; g.drawImage(glow('#ffd58a', 64), x - 18, H - 26, 36, 36);
  g.restore(); g.globalAlpha = 1;
}
const plank = []; for (let i = 0; i < 46; i++) plank.push({x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.6, c: Math.random() < 0.7 ? '#5ff8e0' : Math.random() < 0.5 ? '#7ab8ff' : '#ff8ad8', ph: Math.random() * 9});
function drawAfterDark(g, D, dt, camM) {
  const s = D.sub;
  g.save(); g.globalCompositeOperation = 'lighter';
  // bioluminescent plankton (fills the black deep with life)
  if (camM > 350) { const k = clamp((camM - 350) / 600, 0, 1);
    for (const p of plank) { const px = ((p.x * W - cam.x * scale * p.z * 0.6 + Math.sin(T * 0.3 + p.ph) * 20) % W + W) % W, py = ((p.y * H - cam.y * scale * p.z * 0.6 - T * 6 * p.z) % H + H) % H;
      g.globalAlpha = k * (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(T * 1.7 + p.ph))) * p.z; const sz = 6 + p.z * 6; g.drawImage(glow(p.c, 32), px - sz / 2, py - sz / 2, sz, sz); } }
  // currents: streaming lines
  for (const c of D.currents) { const [, cy] = toScreen(0, c.y); const hh = c.h * scale / 2; if (cy + hh < 0 || cy - hh > H) continue;
    g.strokeStyle = 'rgba(140,230,255,0.22)'; g.lineWidth = 1.6;
    for (let i = 0; i < 16; i++) { const yy = cy + ((i * 0.618) % 1 - 0.5) * hh * 1.7, len = (40 + (i * 23) % 50) * scale, sp = c.str * scale * 1.8;
      const xx = ((c.dir * T * sp + i * 173 + c.ph * 50) % (W + 200) + W + 200) % (W + 200) - 100; g.globalAlpha = 0.5 + 0.5 * Math.sin(i + T); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx - c.dir * len, yy); g.stroke(); } }
  g.globalAlpha = 1;
  // vent glow
  for (const v of D.vents) { if (!(v.warn || v.on)) continue; const [vx, vy] = toScreen(v.side * D.hw(v.side, v.y), v.y); if (vy < -100 || vy > H + 100) continue; const sz = (v.on ? 90 : 40) * scale; g.globalAlpha = v.on ? 0.8 : 0.4 + 0.3 * Math.sin(T * 18); g.drawImage(glow('#ff8a4a', 64), vx - sz, vy - sz, sz * 2, sz * 2); }
  // flares
  for (const f of D.flaresOut) { const [fx, fy] = toScreen(f.x, f.y), sz = (60 + 10 * Math.sin(T * 30)) * scale * Math.min(1, f.t / 1.5); g.globalAlpha = 0.9; g.drawImage(glow('#ff6a3a', 128), fx - sz, fy - sz, sz * 2, sz * 2); }
  g.globalAlpha = 1;
  // predator eyes and lures
  for (const p of D.preds) { const [px, py] = toScreen(p.x, p.y); if (px < -100 || px > W + 100 || py < -100 || py > H + 100) continue; predGlows(g, p); }
  g.globalCompositeOperation = 'source-over';
  // telegraph: a dashed strike line while a predator coils up
  for (const p of D.preds) { if (p.st !== 'wind') continue; const P = p.P, k = Math.min(1, (P.wind - p.t) / P.wind);
    const [ax, ay] = toScreen(p.x, p.y), [bx, by] = toScreen(p.tx, p.ty); g.strokeStyle = `rgba(255,96,72,${0.25 + 0.55 * k})`; g.lineWidth = 2 + 2 * k; g.setLineDash([10, 8]); g.lineDashOffset = -T * 60;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + (bx - ax) * (0.4 + 0.6 * k), ay + (by - ay) * (0.4 + 0.6 * k)); g.stroke(); g.setLineDash([]); }
  // grab: arms wrapped around the sub
  if (D.grab) { const p = D.grab.p, [ax, ay] = toScreen(p.x, p.y), [bx, by] = toScreen(s.x, s.y); g.strokeStyle = '#5a2a3e'; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { g.lineWidth = 5 * scale; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2 + Math.sin(T * 4 + i) * 30, (ay + by) / 2 + (i - 1.5) * 18 * scale, bx + Math.cos(i * 1.6) * 22 * scale, by + Math.sin(i * 1.6) * 14 * scale); g.stroke(); } }
  // threats off screen: red chevrons at the screen edge
  // (a pulsing red marker with two glowing eyes: something is coming from there)
  if (!R.cover) for (const p of D.preds) { if (!(p.st === 'stalk' || p.st === 'wind' || p.st === 'lunge' || p.ambush || p.lurk)) continue; if (p.st === 'retreat' || p.st === 'grab') continue; const [px, py] = toScreen(p.x, p.y); if (px > 30 && px < W - 30 && py > 30 && py < H - 30) continue;
    if (Math.hypot(p.x - s.x, p.y - s.y) > 1500) continue;
    const hot = p.st === 'wind' || p.st === 'lunge', [sx, sy] = toScreen(s.x, s.y), a = Math.atan2(py - sy, px - sx), [ex, ey] = avoidSafe(clamp(px, 30, W - 30), clamp(py, 84, H - 30)), k = Math.max(0.85, scale);
    g.save(); g.translate(ex, ey); const al = hot ? 0.7 + 0.3 * Math.sin(T * 16) : 0.55 + 0.25 * Math.sin(T * 5);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = al * 0.8; g.drawImage(glow('#ff3a2a', 64), -26 * k, -26 * k, 52 * k, 52 * k); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.rotate(a); g.fillStyle = `rgba(255,${hot ? 70 : 120},${hot ? 60 : 80},${al})`; g.strokeStyle = 'rgba(30,0,0,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(17 * k, 0); g.lineTo(-6 * k, -12 * k); g.lineTo(-1 * k, 0); g.lineTo(-6 * k, 12 * k); g.closePath(); g.stroke(); g.fill();
    g.rotate(-a); g.fillStyle = hot ? '#fff0e0' : '#ffd0c0'; for (const ox of [-4, 4]) { g.beginPath(); g.arc(ox * k - Math.cos(a) * 12 * k, -Math.sin(a) * 12 * k, 2.4 * k, 0, TAU); g.fill(); }
    g.restore(); }
  // pressure wave: a bright front sweeping upward
  if (R.waveFx > 0) { R.waveFx -= dt; const k = 1 - R.waveFx / 0.9, y = H * (1.05 - k * 1.2); const gr = g.createLinearGradient(0, y - 40, 0, y + 60); gr.addColorStop(0, 'rgba(160,220,255,0)'); gr.addColorStop(0.5, `rgba(160,220,255,${0.22 * (1 - k)})`); gr.addColorStop(1, 'rgba(160,220,255,0)'); g.fillStyle = gr; g.fillRect(0, y - 40, W, 100); }
  if (D.waveWarn) { const gw = g.createLinearGradient(0, H * 0.7, 0, H); gw.addColorStop(0, 'rgba(120,170,255,0)'); gw.addColorStop(1, `rgba(120,170,255,${0.13 + 0.06 * Math.sin(T * 9)})`); g.fillStyle = gw; g.fillRect(0, H * 0.7, W, H * 0.3); }
  // trench interference: static and colour shifts
  if (D.intf > 0 || D.intfWarn) { const k = D.intf > 0 ? 1 : 0.35; g.save(); g.globalAlpha = 0.06 * k; g.globalCompositeOperation = 'lighter'; g.drawImage(noiseTex(), Math.random() * 100 - 100, Math.random() * 100 - 100, W + 200, H + 200); g.restore();
    if (D.intf > 0) { g.fillStyle = 'rgba(0,4,10,0.35)'; g.fillRect(0, 0, W, H); R.glitch = Math.max(R.glitch, 0.25); } }
  g.restore(); g.globalAlpha = 1;
}

// ---------- update: zone objects, rare spawns, contract recorder, ice ----------
function drawAmphora(g, o) {
  const w = o.w, h = o.h, gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, '#7a3e22'); gr.addColorStop(0.45, '#c7774a'); gr.addColorStop(1, '#5a2a16');
  g.fillStyle = gr; g.beginPath(); g.moveTo(-w * 0.18, -h / 2); g.lineTo(w * 0.18, -h / 2); g.lineTo(w * 0.16, -h * 0.34); g.quadraticCurveTo(w * 0.62, -h * 0.2, w * 0.36, h * 0.28); g.lineTo(0, h / 2); g.lineTo(-w * 0.36, h * 0.28); g.quadraticCurveTo(-w * 0.62, -h * 0.2, -w * 0.16, -h * 0.34); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,10,4,0.85)'; g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = '#8a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w * 0.16, -h * 0.4); g.quadraticCurveTo(-w * 0.55, -h * 0.42, -w * 0.32, -h * 0.12); g.moveTo(w * 0.16, -h * 0.4); g.quadraticCurveTo(w * 0.55, -h * 0.42, w * 0.32, -h * 0.12); g.stroke();
  g.fillStyle = 'rgba(255,220,180,0.25)'; g.fillRect(-w * 0.3, -h * 0.05, w * 0.6, 2); g.fillStyle = 'rgba(90,150,90,0.6)'; g.beginPath(); g.arc(w * 0.2, h * 0.2, 2.5, 0, TAU); g.fill();
}
function drawClam(g, o) {
  // giant clam on the wall, opening a little to show a glowing pearl
  const w = o.w, h = o.h, op = 0.15 + 0.12 * Math.max(0, Math.sin(T * 0.8 + o.ph)) + (o.rel / Math.max(1, o.np)) * 0.3;
  const sh = (sgn) => { g.save(); g.scale(1, sgn); g.rotate(-op * sgn * 0); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#4a5a6a'); gr.addColorStop(1, '#9fb0c0'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w * 0.35, -h * (0.55 + op), w, -h * 0.05); g.lineTo(0, 0); g.closePath(); g.fill(); g.strokeStyle = 'rgba(20,28,36,0.9)'; g.lineWidth = 1.3; g.stroke();
    g.strokeStyle = 'rgba(220,235,245,0.35)'; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(w * 0.05, 0); g.lineTo(w * i / 5, -h * (0.5 + op) * Math.sin(Math.PI * i / 5)); g.stroke(); } g.restore(); };
  sh(1); sh(-1);
  if (o.find || true) { g.globalCompositeOperation = 'lighter'; g.drawImage(glow(o.find ? '#7af7ff' : '#ffd8f0', 32), w * 0.42 - 10, -10, 20, 20); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#f4f0ff'; g.beginPath(); g.arc(w * 0.42, 0, 3.4, 0, TAU); g.fill(); }
}
function drawPod(g, o) {
  // research sample pod: capsule with a blinking status light
  const w = o.w, h = o.h, gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#d8e2ea'); gr.addColorStop(1, '#6a7a88');
  g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, h / 2); g.fill(); g.strokeStyle = 'rgba(20,28,36,0.9)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#ff8a2a'; g.fillRect(-w * 0.18, -h / 2, w * 0.36, h); g.fillStyle = 'rgba(20,28,36,0.85)'; g.font = '700 7px Poppins, sans-serif'; g.textAlign = 'center'; g.fillText('M-7', 0, 3);
  const on = Math.sin(T * 2 + o.ph) > 0; g.fillStyle = on ? '#7af7ff' : '#1b4d55'; g.beginPath(); g.arc(w * 0.36, -h * 0.1, 2.6, 0, TAU); g.fill();
}
function drawTreasure(g, o) {
  const w = o.w, h = o.h; const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#ffe9a0'); gr.addColorStop(1, '#b07a1c');
  g.fillStyle = '#5a3412'; rr(g, -w / 2, -h * 0.1, w, h * 0.6, 4); g.fill(); g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h * 0.45, 8); g.fill();
  g.strokeStyle = 'rgba(40,20,4,0.9)'; g.lineWidth = 1.6; rr(g, -w / 2, -h / 2, w, h, 6); g.stroke();
  g.fillStyle = '#ffd34a'; g.fillRect(-w / 2, -h * 0.12, w, 3); g.fillRect(-w * 0.32, -h / 2, 3, h); g.fillRect(w * 0.29, -h / 2, 3, h);
  g.fillStyle = '#fff6c8'; rr(g, -4, -h * 0.18, 8, 9, 2); g.fill();
  g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = T * 2 + i * 2.1, x = Math.cos(a) * w * 0.45, y = -h * 0.55 + Math.sin(a * 1.3) * 6; g.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i); g.drawImage(glow('#ffe680', 32), x - 6, y - 6, 12, 12); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function drawVault(g, o, rk, rim, amb, D) {
  // a wreck with a heavy round vault door – a lock symbol while the drill is too weak
  drawWreck(g, Object.assign({}, o, {t: 'wreck', w: o.w, h: o.h, z: Math.max(2, o.z)}), rk, rim, amb);
  const locked = D && o.req && D.st.drillLv < o.req, r = o.h * 0.36, dx = (o.side || 1) * -o.w * 0.18;
  g.save(); g.translate(dx, 2);
  const vg = g.createRadialGradient(-3, -3, 2, 0, 0, r); vg.addColorStop(0, '#d8c8a0'); vg.addColorStop(1, '#6a5a3a'); g.fillStyle = vg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = '#2a2010'; g.lineWidth = 2.5; g.stroke(); g.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + T * (locked ? 0 : 0.6); g.beginPath(); g.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); g.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); g.stroke(); }
  if (locked) { g.fillStyle = 'rgba(10,8,4,0.6)'; g.beginPath(); g.arc(0, 0, r * 0.32, 0, TAU); g.fill(); g.strokeStyle = '#ffb070'; g.lineWidth = 1.8; rr(g, -5, -1, 10, 8, 2); g.stroke(); g.beginPath(); g.arc(0, -1, 3.5, Math.PI, 0); g.stroke(); }
  g.restore();
}
function drawRecorder(g, o) {
  // the contract's flight recorder: yellow-black striped box with a beacon
  const w = o.w, h = o.h; g.fillStyle = '#f2c230'; rr(g, -w / 2, -h / 2, w, h, 4); g.fill();
  g.save(); rr(g, -w / 2, -h / 2, w, h, 4); g.clip(); g.fillStyle = '#1a1a1a'; for (let i = -4; i < 6; i++) { g.beginPath(); g.moveTo(-w / 2 + i * 9, h / 2); g.lineTo(-w / 2 + i * 9 + 5, h / 2); g.lineTo(-w / 2 + i * 9 + 5 + h, -h / 2); g.lineTo(-w / 2 + i * 9 + h, -h / 2); g.closePath(); g.fill(); } g.restore();
  g.fillStyle = 'rgba(10,10,10,0.85)'; g.fillRect(-w * 0.32, -h * 0.2, w * 0.64, h * 0.4); g.fillStyle = '#ffd36a'; g.font = '700 7px Poppins, sans-serif'; g.textAlign = 'center'; g.fillText('REC', 0, 3);
  g.strokeStyle = 'rgba(20,10,0,0.9)'; g.lineWidth = 1.5; rr(g, -w / 2, -h / 2, w, h, 4); g.stroke();
  const on = Math.sin(T * 4) > 0; g.fillStyle = on ? '#ff5a3a' : '#4a1a10'; g.beginPath(); g.arc(w * 0.3, -h / 2 - 5, 3.2, 0, TAU); g.fill();
}
function drawIce(g, b) {
  // drifting ice block: pale facets, a bright rim, cracks after a hit
  g.save(); g.translate(b.x, b.y); g.rotate(b.rot + Math.sin(T * 0.3 + b.ph) * 0.05);
  const n = 7, pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, rr3 = b.r * (0.78 + ((i * 37 + b.v * 11) % 10) / 40); pts.push([Math.cos(a) * rr3 * 1.25, Math.sin(a) * rr3 * 0.85]); }
  const gr = g.createLinearGradient(0, -b.r, 0, b.r); gr.addColorStop(0, 'rgba(235,252,255,0.95)'); gr.addColorStop(1, 'rgba(120,180,210,0.85)'); g.fillStyle = gr;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.6; g.stroke();
  g.strokeStyle = 'rgba(80,140,170,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[1][0] * 0.5, pts[1][1] * 0.5); g.lineTo(0, 0); g.lineTo(pts[4][0] * 0.6, pts[4][1] * 0.6); g.moveTo(0, 0); g.lineTo(pts[6][0] * 0.4, pts[6][1] * 0.4); g.stroke();
  if (b.hit > 0) { g.strokeStyle = `rgba(255,255,255,${b.hit})`; g.lineWidth = 2; g.beginPath(); g.moveTo(-b.r * 0.6, -4); g.lineTo(-b.r * 0.1, 3); g.lineTo(b.r * 0.4, -6); g.stroke(); }
  g.restore();
}

// camera follow
R.follow = (D, dt, cc) => {
  if (R.camLock) return;
  if (cc) { cam.y += (cc.y - cam.y) * (1 - Math.exp(-1.6 * dt)); cam.x += (cc.x - cam.x) * (1 - Math.exp(-1.6 * dt)); return; }
  const s = D.sub; const ahead = D.phase === 'ascent' ? -0.18 : D.phase === 'launch' ? -0.05 : 0.14;
  const ty = s.y + vh * ahead + (D.phase === 'launch' ? -40 : 0);
  const maxX = Math.max(0, 470 - vw / 2);
  const tx = clamp(s.x * 0.85, -maxX, maxX);
  // touch: if a crate, wreck or predator close to the sub would sit under the DRILL / LIGHT / UP buttons, nudge the camera
  // (measured against the camera without this offset, so it does not swing back and forth)
  let wx = 0, wy = 0; const co = R.camOff || (R.camOff = {x: 0, y: 0});
  if (R.ctl && R.ctl.length && D.phase === 'dive') {
    const bx = cam.x - co.x, by = cam.y - co.y, need = (x, y) => { const sx = (x - bx) * scale + W / 2, sy = (y - by) * scale + H / 2;
      for (const r of R.ctl) { if (sx < r.l - 18 || sx > r.r + 18 || sy < r.t - 18 || sy > r.b + 18) continue; const up = (sy - (r.t - 30)) / scale, lf = (sx - (r.l - 30)) / scale;
        if (up <= lf || r.l < W * 0.5) wy = Math.max(wy, up); else wx = Math.max(wx, lf); } };
    for (const o of D.objs) { if (o.broken || Math.abs(o.y - s.y) > 420 || Math.hypot(o.x - s.x, o.y - s.y) > 420) continue; need(o.x, o.y); }
    for (const p of D.preds) { if (Math.hypot(p.x - s.x, p.y - s.y) < 650) need(p.x, p.y); }
    wy = Math.min(wy, vh * 0.24); wx = Math.min(wx, vw * 0.2); }
  const kk = 1 - Math.exp(-2.2 * dt); co.x += (wx - co.x) * kk; co.y += (wy - co.y) * kk;
  const ty2 = ty + co.y;
  cam.y += (ty2 - cam.y) * (1 - Math.exp(-5 * dt)); cam.x += (tx + co.x - cam.x) * (1 - Math.exp(-4 * dt));
  // hard limit: whatever the nudge does, the sub stays well inside the screen (below the HUD and messages, away from the edges)
  const z = R.subZone; if (z && s.y > 0 && D.phase !== 'cine') { const sx = (s.x - cam.x) * scale + W / 2, sy = (s.y - cam.y) * scale + H / 2;
    if (z.r > z.l) { if (sx < z.l) cam.x -= (z.l - sx) / scale; else if (sx > z.r) cam.x += (sx - z.r) / scale; }
    if (z.b > z.t) { if (sy < z.t) cam.y -= (z.t - sy) / scale; else if (sy > z.b) cam.y += (sy - z.b) / scale; } }
};
R.setCam = (x, y) => { cam.x = x; cam.y = y; R.camOff = {x: 0, y: 0}; };
R.clearFx = () => { parts.length = 0; pops.length = 0; fish.length = 0; };
})(window.DS);
