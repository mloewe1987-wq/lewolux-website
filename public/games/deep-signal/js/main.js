// Deep Signal – game flow, input, HUD and menus
(function (DS) {
'use strict';
const T = DS.T, R = DS.R, A = DS.A, M = DS.M;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const fmt = DS.fmt;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const Q = new URLSearchParams(location.search);
DS.hooks = DS.hooks || {ads: () => false, midgame: cb => cb(false), rewarded: (k, cb) => cb(false), happy: () => {}, playing: () => {}};

// ---------- icons (inline SVG, one consistent line style) ----------
const P = {
  hull: '<path d="M4 13c0-4 3.6-7 8-7s8 3 8 7v3H4z"/><path d="M8 10.5h8M7 16v3m10-3v3"/>',
  oxy: '<rect x="8" y="5" width="8" height="15" rx="4"/><path d="M10 3h4M12 5V3M10 11h4"/>',
  cargo: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
  drill: '<path d="M3 12h7M10 8h4l7 4-7 4h-4z"/><path d="M14 8l2 8M17 9.5l1.5 5"/>',
  engine: '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9V16h-7v-2.1A6 6 0 0 1 12 3z"/>',
  sonar: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  decoder: '<path d="M3 12h3l2-6 3 12 3-9 2 3h5"/>',
  magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/><path d="M6 8h4M14 8h4"/>',
  drones: '<rect x="8" y="9" width="8" height="6" rx="2"/><path d="M8 12H4M20 12h-4M5 8h-2M21 8h-2M4 8v4M20 8v4M12 15v3"/>',
  buoy: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 4v4.5M12 15.5V20M4 12h4.5M15.5 12H20"/>',
  charge: '<circle cx="11" cy="14" r="6"/><path d="M15 9l3-3M17 4l2 2M19 3l1.5 1.5"/>',
  core: '<path d="M3 13c0-3 4-6 9-6 4 0 7 2 8 4l1 2-1 2c-1 2-4 4-8 4-5 0-9-3-9-6z"/><circle cx="15" cy="12" r="2"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.5-.9-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 1.9 0 2.7 5.4 1.4 5.4 4.2 0 1.1-1.2 1.9-2.8 1.9-1.2 0-2.2-.5-2.7-1.4M12 6.5V8M12 16v1.5"/>',
  depth: '<path d="M12 3v15M7 13l5 5 5-5"/><path d="M5 21h14"/>',
  signal: '<path d="M2 12h3l2-5 3 10 3-12 3 9 2-2h4"/>',
  book: '<path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1z"/><path d="M12 6v14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  wave: '<path d="M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0M2 10c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0"/>',
  snd: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mus: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  lightoff: '<path d="M9 18h6M10 21h4"/><path d="M8.5 13.9A6 6 0 0 1 12 3a6 6 0 0 1 5.6 8.2M15.5 15.5V16h-7v-2.1"/><path d="M3 3l18 18"/>',
  lift: '<path d="M7 3v18M17 3v18"/><rect x="9" y="8" width="6" height="7" rx="1"/><path d="M12 3v5M10.5 18l1.5 2 1.5-2"/>',
  winch: '<circle cx="9" cy="12" r="5"/><circle cx="9" cy="12" r="1.5"/><path d="M14 12h4v8M16 20h4M4 7l-1-3"/>',
  silent: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
  flare: '<path d="M12 21c-3.5 0-6-2.4-6-5.6 0-3 2.3-4.6 3.2-7.4.4 1.6 1.5 2.5 2.3 2.8C11.2 7 13 4.5 15.5 3c-.5 3 2.5 5.6 2.5 9.6 0 5-2.7 8.4-6 8.4z"/>',
  filter: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M12 8l5.6-2.4M12 12h8M12 16l5.6 2.4"/>',
  tasks: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 9l1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17"/>',
  box: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M4 12h16M15 7l1-3"/><circle cx="16.3" cy="3.6" r=".9"/>',
  contract: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  fire: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-4.6 4.3-6.4 4.9-10.9 2.5 1.6 4 4 4.2 6.6.8-.7 1.4-1.7 1.6-2.9 1.6 1.6 2.3 3.7 2.3 6 0 4.4-2.6 7.3-6.5 7.3z"/>',
  noise: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4"/>',
  sndoff: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
  musoff: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
DS.ic = ic;

// ---------- state ----------
const KEY = 'deepsignal_save_v1';
const fresh = () => ({v: 3, money: 0, up: {}, rec: 0, sigN: 0, sigRead: 0, region: 0, src: false, book: {}, bestDive: 0, dives: 0, daily: {day: 0}, last: Date.now(), sessions: 0, set: {sfx: 1, mus: 1}, tut: 0, earned: 0, prest: 0,
  echoN: 0, tasks: null, tutL: 0, zSeen: {}, playT: 0, finale: {},
  // v3: specializations, average dive (drones/tasks), fragments of the other seas, unsold loot, interrupted dive, drone storage, login streak, contract
  spec: {}, avg: 0, sigR: {}, sigReadR: {}, pending: null, diving: null, drone: {at: Date.now(), bank: 0}, streak: {day: 0, n: 0, got: true}, contract: null, tasksSeen: 0, tutO2: 0});
const store = () => window.__store || (() => { try { return window.localStorage; } catch (_) { return null; } })();
let S = null, D = null;
const G = DS.G = {mode: 'boot', paused: false, sel: 'hull', extraO2: false, lastMid: Date.now(), sessionStart: Date.now(), firstSession: false, hitstop: 0};
let lastJson = null;
// ---------- two tabs: only the tab in use saves ----------
// Every tab has an id. The tab that was opened (or taken over with "Continue here") last writes its id to an owner key.
// Before each save a tab checks that key: only the owner saves, every other tab locks itself with an overlay that can only be
// left by reloading (which takes over and loads the newest state). Both tabs read the same key, so exactly one stays active
// (no race where both stop saving).
const OWN = 'deepsignal_owner', TAB = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const lsx = () => { try { return window.localStorage; } catch (_) { return null; } };
function claimTab() { const l = lsx(); if (!l) return; try { l.setItem(OWN, TAB + '|' + Date.now()); } catch (_) {} }
function tabOwner() { const l = lsx(); if (!l) return TAB; try { const v = l.getItem(OWN); return v ? v.split('|')[0] : TAB; } catch (_) { return TAB; } }
function isOwner() { return tabOwner() === TAB; }
function save() { if (!S || window.__noSave || G.otherTab) return; if (!isOwner()) { lockTab(); return; }
  S.last = Date.now(); try { const st = store(); lastJson = JSON.stringify(S); st && st.setItem(KEY, lastJson); } catch (_) {} }
function lockTab() { if (G.otherTab || !S) return;
  G.otherTab = true; if (G.mode === 'dive' && !G.paused) { G.paused = true; A.drill(false); DS.hooks.playing(false); }
  ovl.classList.add('hidden'); // replace whatever is open
  openOvl(`<h2>${ic('wave')} ${T('Open in another tab')}</h2><p>${T('Deep Signal is being played in another tab. This tab stopped saving so nothing gets overwritten.')}</p><div class="col"></div>`, {noClose: true, cls: 'tabp', lock: true});
  $('#ovlP .col').appendChild(btn('primary big', ic('play') + T('Continue here'), () => { claimTab(); location.reload(); })); }
addEventListener('storage', e => { if (!S || G.otherTab || (e.key !== KEY && e.key !== OWN)) return;
  if (!isOwner()) { lockTab(); return; }
  // still the owner, but another tab saved just before it noticed us: adopt that newer state if nothing was done here yet
  if (e.key === KEY && e.newValue && e.newValue !== lastJson && G.untouched && G.mode === 'hub' && store() === lsx()) { try { S = migrate(JSON.parse(e.newValue)); G.moneyShow = S.money; showHub(); } catch (_) {} } });
DS.tab = {claim: claimTab, owner: tabOwner, id: TAB, isOwner};
// v1 saves (before light/predators) are migrated: new fields get defaults, a finished region keeps its finale flag
function migrate(o) { const S2 = Object.assign(fresh(), o); if (!o.v || o.v < 2) { S2.v = 2; S2.echoN = 0; S2.tasks = null; S2.zSeen = {}; S2.finale = {}; if (o.src) S2.finale[o.region || 0] = 1; S2.up = Object.assign({}, o.up || {}); }
  // v2 -> v3: drones start storing from the last save (nothing earned while away is lost), the average dive comes from the best dive
  if (S2.v < 3) { S2.v = 3; S2.drone = {at: o.last || Date.now(), bank: 0}; S2.avg = Math.round(Math.min(o.bestDive || 0, 50000) * 0.5); S2.spec = {}; S2.sigR = {}; S2.sigReadR = {}; S2.streak = {day: 0, n: 0, got: true}; }
  for (const k of ['set', 'daily', 'book', 'zSeen', 'finale', 'spec', 'sigR', 'sigReadR', 'drone', 'streak']) if (!S2[k] || typeof S2[k] !== 'object') S2[k] = fresh()[k]; return S2; }
function load() { try { const st = store(); const s = st && st.getItem(KEY); return s ? migrate(JSON.parse(s)) : null; } catch (_) { return null; } }
DS.migrate = migrate;
DS.save = save; DS.S = () => S; DS.D = () => D;

// ---------- DOM ----------
const ui = $('#ui');
function el(tag, cls, html, attrs) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function btn(cls, html, fn, nav = true) { const b = el('button', 'btn ' + cls, html); if (nav) b.setAttribute('data-nav', ''); b.addEventListener('click', e => { A.init(); A.click(); fn && fn(e, b); }); return b; }
const money$ = v => `<span class="cash">${ic('coin')}<b>${fmt(v)}</b></span>`;
const upName = id => T('up_' + id), upDesc = id => T('upd_' + id);
const lang = DS.lang;
const L = o => o[lang] || o.en;

// HUD
const hud = el('div', 'hud hidden', `
  <div class="hud-l"><div class="o2box"><div class="o2top">${ic('oxy')}<span class="o2lbl">O<sub>2</sub></span><b id="o2t">30 s</b></div><div class="bar"><i id="o2f"></i><em id="o2n"></em></div></div><div id="cchip" class="cchip hidden"></div></div>
  <div class="hud-c"><div id="dep" class="dep">0 m</div><div id="zone" class="zone"></div><div class="meters"><div id="sigm" class="sigm">${ic('signal')}<span><i></i><i></i><i></i><i></i><i></i></span></div><div id="noisem" class="sigm noisem">${ic('noise')}<span><i></i><i></i><i></i><i></i><i></i></span></div></div></div>
  <div class="hud-r"><div class="holdbox">${ic('cargo')}<b id="hld">0/10</b><span id="hv" class="hv"></span></div><button id="bPause" class="iconbtn" aria-label="pause">${ic('pause')}</button></div>
  <div id="msg" class="msg"></div>
  <div id="hint" class="hint"></div>
  <div id="frag" class="frag"><div class="fh">${ic('signal')}<span id="fragH"></span></div><div id="fragT" class="ft"></div><div id="fragE" class="fe"></div></div>
  <button id="bUp" class="tb up"><svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/></svg>${ic('up')}<span class="ul">${T('Surface')}</span><span class="us">${T('UP')}</span><kbd>E</kbd><em>${T('hold')}</em></button>
  <div class="tctl">
    <div class="tcol"><button id="bCharge" class="tb charge hidden">${ic('charge')}<span id="nCharge">1</span><small class="tl">${T('CHARGE')}</small><kbd>C</kbd></button><button id="bFlare" class="tb flare hidden">${ic('flare')}<span id="nFlare">1</span><small class="tl">${T('FLARE')}</small><kbd>F</kbd></button></div>
    <button id="bLight" class="tb light on">${ic('light')}<span class="ln">${T('LIGHT')}</span><i class="lst">${T('on')}</i><kbd>L</kbd></button>
    <button id="bDrill" class="tb drill">${ic('drill')}<span>${T('DRILL')}</span></button>
  </div>
  <div id="cine" class="cine"><i class="lb t"></i><i class="lb b"></i><div id="cineT" class="ct"></div><button id="bSkip" class="btn skip">${T('Skip')}</button></div>
  <div id="joy" class="joy"><i></i></div>`);
ui.appendChild(hud);

// Hub
const hub = el('div', 'hub hidden', `
  <div class="topbar">
    <div class="pill money" id="hMoney"></div>
    <div class="pill" id="hRec"></div>
    <button class="pill btnp" id="hSig" data-nav></button>
    <button class="pill btnp" id="hBook" data-nav></button>
    <button class="pill btnp" id="hTask" data-nav></button>
    <div class="sp"></div>
    <button class="iconbtn" id="hSet" data-nav aria-label="settings">${ic('gear')}</button>
  </div>
  <div class="treebox" id="treeBox"><svg id="links"></svg><div id="nodes"></div><div class="region" id="hRegion"></div></div>
  <div class="side">
    <div class="det scroll" id="det"></div>
    <div class="buyb" id="buyb"></div>
    <div class="acts" id="acts"></div>
  </div>`);
ui.appendChild(hub);
if (window.ResizeObserver) new ResizeObserver(() => { if (G.mode === 'hub') layoutTree(); }).observe(hub.querySelector('#treeBox'));

// Results
const res = el('div', 'ovl results hidden', `<div class="panel"><h2 id="rTitle"></h2><div class="rsub" id="rSub"></div><div class="rlist" id="rList"></div><div class="rtot"><span>${T('Total')}</span><b id="rTot"></b></div><div class="racts" id="rActs"></div></div>`);
ui.appendChild(res);

// generic overlay
const ovl = el('div', 'ovl modal hidden', '<div class="panel" id="ovlP"></div>');
ui.appendChild(ovl);
const toastBox = el('div', 'toasts'); ui.appendChild(toastBox);
const arrow = {classList: {add() {}, remove() {}, toggle() {}}}; // (the floating hub arrow was replaced by an inline hint + pulse)

// ---------- layout scale ----------
function sizeUI() {
  const w = innerWidth, h = innerHeight, port = h > w;
  const u = port ? Math.min(w / 460, h / 820) : Math.min(w / 960, h / 540);
  document.documentElement.style.fontSize = clamp(16 * u, 11.5, 20) + 'px';
  document.body.classList.toggle('port', port);
  document.body.classList.toggle('tiny', !port && h < 400);
  document.body.classList.toggle('short', !port && h < 500);
  document.body.classList.toggle('small', Math.min(w, h) < 420);
  R.resize(); if (G.mode === 'hub') { const tn = document.body.classList.contains('short'); if (tn !== G.wasTiny) { G.wasTiny = tn; if (S) updActs(); } fitRegion(); fitDet(); layoutTree(); } setTimeout(safeRects, 0);
}
// screen areas covered by controls: the renderer keeps edge arrows out of them
function safeRects() { const out = [], ctl = []; for (const q of ['.tctl', '#bUp', '.hud-l', '.hud-r', '.hud-c']) { const e = $(q); if (!e || e.closest('.hidden')) continue; const r = e.getBoundingClientRect(); if (r.width) { const b = {l: r.left - 6, t: r.top - 6, r: r.right + 6, b: r.bottom + 6}; out.push(b); if (IS_TOUCH && (q === '.tctl' || q === '#bUp')) ctl.push(b); } }
  R.safe = out; R.ctl = ctl;
  // the sub always stays inside this area (below the HUD row and the message banner, away from the edges and the touch buttons)
  const W = innerWidth, H = innerHeight, fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, port = document.body.classList.contains('port'), m = $('#msg'), sr = 40 * Math.max(0.75, R.scale || 1);
  const mt = m ? m.offsetTop : 60; R.subZone = {l: Math.max(64, W * 0.12), r: W - Math.max(64, W * 0.12), t: mt + fs * (port ? 4.6 : 2.7) + sr, b: H - (IS_TOUCH ? Math.max(90, H * 0.2) : Math.max(60, H * 0.14)) - sr * 0.5}; }

// ---------- toasts / messages ----------
function toast(html, cls = '') { const t = el('div', 'toast ' + cls, html); toastBox.appendChild(t); while (toastBox.children.length > 3) toastBox.firstChild.remove(); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100); }
let msgT = 0, msgKey = '';
function msg(text, cls = '', dur = 1.6) { const m = $('#msg'); if (msgKey !== text) { m.innerHTML = text; m.className = 'msg show ' + cls; msgKey = text; } msgT = dur; }

// ---------- input ----------
const keys = new Set();
const inp = {mx: 0, my: 0, drill: false, surface: false, charge: false, light: false, flare: false};
const ptr = {x: 0, y: 0, active: 0, down: false, joy: null, drillId: null, inside: false, dev: ''};
const KEYMAP = {arrowleft: 'l', a: 'l', q: 'l', arrowright: 'r', d: 'r', arrowup: 'u', w: 'u', z: 'u', arrowdown: 'd', s: 'd'};
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); A.init(); G.untouched = false;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k) && (G.mode === 'dive' || k !== 'tab')) e.preventDefault();
  if (e.repeat && !KEYMAP[k]) return;
  keys.add(k); if (KEYMAP[k] || k === ' ') ptr.dev = 'keys';
  if (G.mode === 'dive') {
    if (G.cine) { if (G.cine.t > 1 && !G.cine.end) skipCine(); return; }
    // Esc is deliberately NOT used: on CrazyGames it leaves fullscreen (restricted key). Pause: P, the pause button or Start.
    if (k === 'p') togglePause();
    else if ((k === 'e' || k === 'shift') && !G.paused) inp.surface = true;
    else if (k === 'c' && !G.paused) inp.charge = true;
    else if (k === 'f' && !G.paused) inp.flare = true;
    else if (k === 'l' && !G.paused) inp.light = true;
    else if (G.paused && (k === 'enter' || k === ' ')) { const f = document.activeElement; if (f && f.matches('[data-nav]')) f.click(); }
    else if (G.paused && KEYMAP[k]) { navMove(...dirOf(KEYMAP[k])); }
  } else {
    if (KEYMAP[k] && k.startsWith('arrow')) { document.body.classList.add('pad'); navMove(...dirOf(KEYMAP[k])); }
    else if (k === 'enter' || k === ' ') { const f = document.activeElement; if (f && f.matches('[data-nav]') && document.body.classList.contains('pad')) { f.click(); e.preventDefault(); } else if (G.mode === 'hub' && topLayer() === hub) { startDive(); } }
    else if (k === 'backspace') back();
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); ptr.down = false; ptr.joy = null; inp.drill = false; });
const dirOf = c => c === 'l' ? [-1, 0] : c === 'r' ? [1, 0] : c === 'u' ? [0, -1] : [0, 1];

const cv = $('#cv');
addEventListener('pointerdown', () => { G.untouched = false; }, true);
function onDown(e) {
  A.init(); if (G.mode !== 'dive' || G.paused) return;
  if (G.cine) { if (G.cine.t > 1 && !G.cine.end) skipCine(); return; }
  if (e.pointerType === 'mouse') { ptr.inside = true; ptr.dev = 'mouse'; ptr.x = e.clientX; ptr.y = e.clientY; if (e.button === 0) { ptr.down = true; ptr.active = performance.now(); } else if (e.button === 2) inp.light = true; return; }
  if (!ptr.joy) { let ox = e.clientX, oy = e.clientY; const tr = $('.tctl').getBoundingClientRect();
    if (tr.width) { const cx = clamp(ox, tr.left, tr.right), cy = clamp(oy, tr.top, tr.bottom), d = Math.hypot(ox - cx, oy - cy); if (d < 82) { if (oy > tr.top - 82 && ox > tr.left - 82) { if (tr.left - ox < tr.top - oy) oy = Math.min(oy, tr.top - 82); else ox = Math.min(ox, tr.left - 82); } } }
    ox = clamp(ox, 76, innerWidth - 76); oy = clamp(oy, 76, innerHeight - 76);
    ptr.joy = {id: e.pointerId, ox, oy, x: e.clientX, y: e.clientY}; showJoy(); hideHint(1); dimFrag(); }
}
cv.addEventListener('pointerdown', onDown); $('#joy').addEventListener('pointerdown', onDown);
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { if (Math.abs(e.clientX - ptr.x) + Math.abs(e.clientY - ptr.y) > 2) ptr.dev = 'mouse'; ptr.x = e.clientX; ptr.y = e.clientY; ptr.inside = true; ptr.active = performance.now(); return; }
  if (ptr.joy && e.pointerId === ptr.joy.id) { ptr.joy.x = e.clientX; ptr.joy.y = e.clientY; const dx = ptr.joy.x - ptr.joy.ox, dy = ptr.joy.y - ptr.joy.oy, max = 70; const d = Math.hypot(dx, dy);
    if (d > max * 1.4) { ptr.joy.ox += dx / d * (d - max * 1.4); ptr.joy.oy += dy / d * (d - max * 1.4); } showJoy(); }
}, {passive: true});
const endPtr = e => { if (e.pointerType === 'mouse') { ptr.down = false; return; } if (ptr.joy && e.pointerId === ptr.joy.id) { ptr.joy = null; showJoy(); } };
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
document.addEventListener('mouseleave', () => { ptr.inside = false; ptr.down = false; }); document.addEventListener('mouseenter', () => { ptr.inside = true; });
// the signal box fades out while the thumb steers right next to it
function dimFrag() { const f = $('#frag'); if (!ptr.joy) { f.classList.remove('dim'); return; } const r = f.getBoundingClientRect(); f.classList.toggle('dim', ptr.joy.ox - 90 < r.right && ptr.joy.oy + 90 > r.top && ptr.joy.oy - 90 < r.bottom); }
function showJoy() { const j = $('#joy'); dimFrag(); if (!ptr.joy) { j.classList.remove('on'); return; } j.classList.add('on'); j.style.left = ptr.joy.ox + 'px'; j.style.top = ptr.joy.oy + 'px';
  const dx = ptr.joy.x - ptr.joy.ox, dy = ptr.joy.y - ptr.joy.oy, d = Math.hypot(dx, dy), k = Math.min(1, 70 / Math.max(d, 1)); j.firstChild.style.transform = `translate(${dx * k}px,${dy * k}px)`; }
// big touch buttons (hold to drill)
const hold = (b, on, off) => { b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.init(); try { b.setPointerCapture(e.pointerId); } catch (_) {} b.classList.add('down'); on(e); });
  const up = e => { b.classList.remove('down'); off && off(e); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up); };
let drillBtn = false;
hold($('#bDrill'), () => { drillBtn = true; hideHint(2); }, () => { drillBtn = false; });
// surfacing ends the dive, so the button must be held (0.6 s, ring fills up) – no accidental taps next to DRILL
const UP_HOLD = 0.6; let upHold = -1;
hold($('#bUp'), () => { if (G.mode === 'dive' && !G.paused && D && D.phase === 'dive') upHold = 0; }, () => { upHold = -1; setRing(0); });
function setRing(k) { const c = $('#bUp .ring circle'); c.style.strokeDashoffset = (289 * (1 - k)).toFixed(1); $('#bUp').classList.toggle('holding', k > 0); }
hold($('#bCharge'), () => { if (G.mode === 'dive' && !G.paused) inp.charge = true; });
hold($('#bFlare'), () => { if (G.mode === 'dive' && !G.paused) inp.flare = true; });
hold($('#bLight'), () => { if (G.mode === 'dive' && !G.paused) inp.light = true; });
$('#bSkip').addEventListener('click', () => { if (G.cine && !G.cine.end) skipCine(); });
$('#bPause').addEventListener('click', () => { A.init(); togglePause(); });
['contextmenu', 'gesturestart', 'dblclick'].forEach(t => addEventListener(t, e => e.preventDefault(), {passive: false}));
document.addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('.scroll')) return; e.preventDefault(); }, {passive: false});

// gamepad
const pad = {prev: [], navT: 0, used: false};
function readPad(dt) {
  const gps = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const g of gps) if (g && g.connected) { gp = g; break; }
  if (!gp) return null;
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), was = i => !!pad.prev[i];
  const pr = i => b(i) && !was(i);
  let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; if (Math.hypot(ax, ay) < 0.22) ax = ay = 0;
  if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
  const any = gp.buttons.some(x => x.pressed) || ax || ay; if (any) { pad.used = true; A.init(); }
  const out = {ax, ay, drill: b(0) || b(7) || b(5)};
  if (G.mode === 'dive' && G.cine) { if (pr(0) || pr(1) || pr(9)) { if (G.cine.t > 1 && !G.cine.end) skipCine(); } }
  else if (G.mode === 'dive' && !G.paused) { if (pr(1)) inp.surface = true; if (pr(2)) inp.charge = true; if (pr(3)) inp.light = true; if (pr(4)) inp.flare = true; if (pr(9) || pr(8)) togglePause(); }
  else {
    pad.navT -= dt; if ((ax || ay) && pad.navT <= 0) { document.body.classList.add('pad'); navMove(Math.abs(ax) > Math.abs(ay) ? Math.sign(ax) : 0, Math.abs(ay) >= Math.abs(ax) ? Math.sign(ay) : 0); pad.navT = 0.22; } if (!ax && !ay) pad.navT = 0;
    if (pr(0)) { document.body.classList.add('pad'); const f = document.activeElement; if (f && f.matches('[data-nav]') && !f.disabled) f.click(); else navMove(0, 0); }
    if (pr(1)) back();
    if ((pr(9)) && G.mode === 'dive' && G.paused) togglePause();
    if (pr(9) && G.mode === 'hub' && topLayer() === hub) startDive();
  }
  pad.prev = gp.buttons.map(x => x.pressed);
  return out;
}
// spatial navigation for menus (keyboard arrows + gamepad)
function topLayer() { if (!ovl.classList.contains('hidden')) return ovl; if (G.paused) return $('#pauseP') ? ovl : hub; if (!res.classList.contains('hidden')) return res; if (!hub.classList.contains('hidden')) return hub; return document.body; }
function navMove(dx, dy) {
  const root = topLayer(); const items = $$('[data-nav]', root).filter(e => e.offsetParent !== null && !e.closest('.hidden'));
  if (!items.length) return; const cur = document.activeElement;
  if (!items.includes(cur) || (!dx && !dy)) { const f = root.querySelector('[data-nav].primary') || items[0]; f.focus({preventScroll: true}); f.scrollIntoView({block: 'nearest'}); return; }
  const r0 = cur.getBoundingClientRect(), c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
  let best = null, bs = 1e9;
  for (const it of items) { if (it === cur) continue; const r = it.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2], vx = c[0] - c0[0], vy = c[1] - c0[1];
    const along = vx * dx + vy * dy; if (along <= 4) continue; const perp = Math.abs(vx * dy - vy * dx); const s = along + perp * 2.2; if (s < bs) { bs = s; best = it; } }
  if (best) { best.focus({preventScroll: true}); best.scrollIntoView({block: 'nearest'}); A.tick(); if (best.dataset.up) selectUp(best.dataset.up); }
}
function back() { if (G.otherTab) return; if (!ovl.classList.contains('hidden')) { const c = $('#ovlP [data-back]'); if (c) c.click(); else closeOvl(); } else if (G.paused) togglePause(); }

function gatherInput(dt) {
  const gp = readPad(dt);
  if (DS.botInput && D) { const b = DS.botInput(D); inp.mx = b.mx; inp.my = b.my; inp.drill = b.drill; if (b.surface) inp.surface = true; if (b.charge) inp.charge = true; if (b.light) inp.light = true; if (b.flare) inp.flare = true; return; }
  let mx = 0, my = 0;
  if (keys.has('l') || [...keys].some(k => KEYMAP[k] === 'l')) mx -= 1;
  if ([...keys].some(k => KEYMAP[k] === 'r')) mx += 1;
  if ([...keys].some(k => KEYMAP[k] === 'u')) my -= 1;
  if ([...keys].some(k => KEYMAP[k] === 'd')) my += 1;
  let drill = keys.has(' ') || keys.has('j') || drillBtn || ptr.down;
  if (gp) { if (gp.ax || gp.ay) { mx = gp.ax; my = gp.ay; } drill = drill || gp.drill; }
  if (ptr.joy) { const dx = ptr.joy.x - ptr.joy.ox, dy = ptr.joy.y - ptr.joy.oy, d = Math.hypot(dx, dy); if (d > 8) { const k = Math.min(1, (d - 8) / 55); mx = dx / d * k; my = dy / d * k; } }
  else if (!mx && !my && D && ptr.dev === 'mouse' && (ptr.inside || ptr.down) && !IS_TOUCH) {
    // the sub keeps following the mouse as long as the pointer is in the window (no time-out)
    const [sx, sy] = R.toScreen(D.sub.x, D.sub.y), dx = ptr.x - sx, dy = ptr.y - sy, d = Math.hypot(dx, dy);
    if (d > 34) { const k = Math.min(1, (d - 34) / 150); mx = dx / d * k; my = dy / d * k; }
  }
  inp.mx = mx; inp.my = my; inp.drill = drill;
  if (drill) hideHint(2);
}

// ---------- hint (single on-screen hint during the first dives) ----------
let hintStage = 0;
function showHint() { const h = $('#hint'); hintStage = 1;
  h.innerHTML = IS_TOUCH ? `<span class="hk">${T('Drag to steer')}</span><span class="dot">·</span><span class="hk">${T('Hold DRILL near wrecks')}</span>`
    : `<span class="hk"><kbd>WASD</kbd>/${T('Mouse')}: ${T('steer')}</span><span class="dot">·</span><span class="hk">${T('Hold')} <kbd>${T('Space')}</kbd>/${T('Click')}: ${T('drill')}</span>`;
  h.classList.add('show'); }
function hideHint(stage) { if (!hintStage) return; if (stage >= 2 && D && D.drillAt) { $('#hint').classList.remove('show'); hintStage = 0; } }

// ---------- dive ----------
function startDive(opt = {}) {
  if (G.mode === 'dive' || G.otherTab) return;
  closeOvl(); arrow.classList.add('hidden');
  const daily = !!opt.daily;
  const contract = !daily && S.dives >= 2 ? ensureContract() : null; if (contract) contract.reward = DS.contractReward(S, contract);
  D = DS.newDive(S, {daily, seed: daily ? DS.hash(DS.dayKey(), 4242) : undefined, extraO2: G.extraO2, contract});
  // the dive is on record from the start: a reload or a closed tab mid-dive counts as an emergency ascent next time
  S.diving = {v: 0, keep: D.st.keep, m: 0, s: Math.round(D.startY / M), daily, t: Date.now()}; save(); G.divSave = 0;
  G.diveExtra = G.extraO2; G.extraO2 = false; G.mode = 'dive'; G.paused = false; G.recShown = false; G.rec0 = S.rec; G.fragQ = []; G.lastPickPop = 0; clearInterval(G.fragI); clearTimeout(G.fragTo); G.fragOn = false;
  R.clearFx(); DS.FX.clear(); R.setCam(0, -R.vh * 0.18);
  hub.classList.add('hidden'); res.classList.add('hidden'); hud.classList.remove('hidden'); document.body.classList.remove('inhub');
  hud.classList.toggle('touch', IS_TOUCH);
  $('#bCharge').classList.toggle('hidden', !D.charges); $('#nCharge').textContent = D.charges;
  $('#bFlare').classList.toggle('hidden', !D.flares); $('#nFlare').textContent = D.flares;
  updLightBtn(); $('#bLight').classList.toggle('hidden', !lightUnlocked()); upHold = -1; setRing(0); G.cine = null; G.menu = false; G.zoneI = -1; G.hintT = 0; G.slow = 0; G.o2Tip = false; G.heardMsg = false; G.hotMsg = false; G.ambMsg = 0;
  $('#noisem').classList.toggle('hidden', D.st.lure === 'light'); $('#cchip').dataset.k = ''; updChip(); setTimeout(safeRects, 0);
  $('#cine').classList.remove('on'); hud.classList.remove('cinemode');
  R.storm = D.event === 'storm'; R.stLit = S.finale[S.region] ? 1 : 0.3; R.eyeOpen = S.finale[S.region] ? 1 : 0.15;
  $('#frag').classList.remove('show'); $('#msg').className = 'msg'; msgKey = '';
  if (S.dives < 2 && S.tut < 2) showHint(); else { $('#hint').classList.remove('show'); hintStage = 0; }
  if (S.tut === 1) S.tut = 2;
  A.setDepth(0, false);
  DS.hooks.playing(true);
}
// the light button appears from the third dive (the first predator encounter comes then), or once the twilight zone is reached
function lightUnlocked() { return S.region > 0 || S.rec >= 200 || S.dives >= 2; }
function ensureContract() { if (!S.contract) S.contract = DS.makeContract(S, DS.hash(S.dives, S.region || 0, S.prest || 0)); return S.contract; }
function contractText(c, short) { const k = 'ct_' + c.id + (short ? '_s' : ''); return T(k, {n: c.n, d: DS.fmtM(c.m)}); }
// how to do it, in one short line (shown in the hub card and when the dive starts)
function contractHow(c) { return c.id === 'dark' ? (IS_TOUCH ? T('cth_dark_touch') : T('cth_dark')) : T('cth_' + c.id); }
// a dive counts as real for the contract after 20 s under water, 3 pieces of loot or a deep enough run –
// measured from where the elevator dropped you (a drop + instant surfacing never re-rolls the contract)
function realDive(t, m, n, start = 0) { return t >= 20 || n >= 3 || (m - start) >= Math.max(60, (S.rec || 0) * 0.5); }
function contractGoal(c) { return c.id === 'box' || c.id === 'deep' ? 1 : c.n; }
function updChip() { const ch = $('#cchip'), C = D && D.contract; ch.classList.toggle('hidden', !C); if (!C) return;
  const goal = contractGoal(C), pr = Math.min(goal, C.prog), key = C.id + pr + C.done; if (ch.dataset.k === key) return; ch.dataset.k = key;
  ch.className = 'cchip' + (C.done ? ' done' : ''); ch.innerHTML = `${ic(C.done ? 'check' : 'contract')}<span>${contractText(C, true)}</span>` + (goal > 1 ? `<b>${pr}/${goal}${C.id === 'dark' ? '\u00a0s' : ''}</b>` : ''); }
function togglePause() {
  if (G.mode !== 'dive' || G.otherTab) return; G.paused = !G.paused; A.drill(false);
  if (G.paused) {
    openOvl(`<h2 id="pauseP">${T('Paused')}</h2>
      <div class="col"></div>`, {noClose: true});
    const c = $('#ovlP .col');
    c.appendChild(btn('primary big', ic('play') + T('Resume'), () => togglePause()));
    if (D.phase === 'dive') c.appendChild(btn('', ic('up') + T('Surface now'), () => { inp.surface = true; togglePause(); }));
    c.appendChild(soundRow());
    $('#ovlP .primary').focus({preventScroll: true});
  } else closeOvl(true);
  DS.hooks.playing(!G.paused);
}
function soundRow() {
  const r = el('div', 'row2');
  // the buttons show their state clearly: icon (struck through when off) + "On"/"Off"
  const lab = (k, icon, label) => ic(S.set[k] ? icon : icon + 'off') + `<span>${label}</span><small class="st">${T(S.set[k] ? 'On' : 'Off')}</small>`;
  const mk = (k, icon, label) => { const b = btn('tog' + (S.set[k] ? ' on' : ''), lab(k, icon, label), (e, bb) => { S.set[k] = S.set[k] ? 0 : 1; bb.classList.toggle('on', !!S.set[k]); bb.innerHTML = lab(k, icon, label); bb.setAttribute('aria-pressed', S.set[k] ? 'true' : 'false'); applyAudio(); save(); }); b.setAttribute('aria-pressed', S.set[k] ? 'true' : 'false'); return b; };
  r.appendChild(mk('sfx', 'snd', T('Sound'))); r.appendChild(mk('mus', 'mus', T('Music'))); return r;
}
function applyAudio() { A.sfx = S.set.sfx; A.mus = S.set.mus; A.apply(); }
DS.applyAudio = applyAudio;

let lastDrillSpark = 0;
function diveFrame(dt) {
  if (G.paused) { R.render(D, 0); return; }
  if (!G.cine) gatherInput(dt); else { inp.mx = inp.my = 0; inp.drill = false; }
  if (upHold >= 0) { if (D.phase !== 'dive') { upHold = -1; setRing(0); } else { upHold += dt; setRing(Math.min(1, upHold / UP_HOLD)); if (upHold >= UP_HOLD) { inp.surface = true; upHold = -1; setRing(0); } } }
  if (G.cine) updCine(dt);
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.15; }
  // first predator: time slows down while it coils up, so the light switch can be learned calmly
  if (G.slow > 0) { G.slow -= dt; dt *= 0.45; }
  // predators only start a strike inside the visible area (no bites from off screen without a warning)
  D.view = {x: R.cam.x, y: R.cam.y, hw: Math.max(60, R.vw / 2 - 24), hh: Math.max(60, R.vh / 2 - 24)};
  DS.step(D, dt, inp);
  G.divSave += dt; if (G.divSave > 3 && S.diving) { G.divSave = 0; storeDiving(); }
  inp.surface = false; inp.charge = false;
  for (const e of D.ev) handleEv(e);
  D.ev.length = 0;
  // drilling feedback
  if (D.drillAt) { const o = D.drillObj; A.drill(true, o ? 1 - o.hp / o.hpMax : 0); R.shake(1.6); lastDrillSpark -= dt;
    if (lastDrillSpark <= 0) { lastDrillSpark = 0.03; R.burst(D.drillAt.x, D.drillAt.y, 3, {sp: 260, col: Math.random() < 0.5 ? '#ffd27a' : '#fff4d0', life: 0.35, size: 3}); if (Math.random() < 0.3) R.bubbles(D.drillAt.x, D.drillAt.y, 1, 50); }
  } else A.drill(false);
  if (!D.done) R.follow(D, dt, G.cine ? G.cine.cam : null);
  R.render(D, dt);
  A.setDepth(Math.max(0, D.sub.y / M), false);
  updHud(dt);
  if (D.done) endDive();
}
function handleEv(e) {
  const s = D.sub;
  switch (e.type) {
    case 'splashdown': A.splash(); R.bubbles(s.x, s.y, 30, 90); R.burst(s.x, -2, 18, {a: -Math.PI / 2, spread: 1.6, sp: 220, col: '#dff8ff', life: 0.7, g: 300, type: 'debris', size: 4}); R.shake(4); diveIntro(); break;
    case 'lift': A.lift(); R.bubbles(s.x, s.y, 20, 80); msg(`<b>${T('ELEVATOR')}</b> ${T('Lowering you to {d}', {d: DS.fmtM(D.startY / M)})}`, '', 2); break;
    case 'liftdone': A.splash(); R.bubbles(s.x, s.y, 24, 90); R.shake(3); diveIntro(); break;
    case 'chunk': A.chunk(); R.burst(e.x, e.y, 10, {sp: 200, col: '#ffcf7a', life: 0.5}); R.burst(e.x, e.y, 4, {sp: 120, col: '#55606a', type: 'debris', g: 80, life: 1.2, size: 5}); R.shake(3); break;
    case 'break': { const o = e.o, big = o.t === 'bigwreck' || o.t === 'wreck' || o.t === 'whale', col = o.t === 'ore' ? DS.MAT[o.mat].col : o.t === 'whale' ? '#e7dfcb' : '#5a6870';
      A.crack(big); R.burst(o.x, o.y, big ? 40 : 22, {sp: big ? 360 : 260, col: '#ffd27a', life: 0.6, size: 3.5}); R.burst(o.x, o.y, big ? 22 : 12, {sp: 220, col, type: 'debris', g: 60, life: 1.6, size: big ? 8 : 6, drag: 1.5});
      R.burst(o.x, o.y, big ? 8 : 5, {sp: 60, col: 'rgba(200,220,230,1)', type: 'dust', size: big ? 40 : 22, life: 1.2, drag: 2}); parts.push({x: o.x, y: o.y, vx: 0, vy: 0, life: 0, max: 0.6, size: big ? 200 : 110, col: 'rgba(255,220,150,0.9)', type: 'ring', drag: 0, g: 0});
      R.bubbles(o.x, o.y, big ? 24 : 12, 80); R.shake(big ? 9 : 5); G.hitstop = big ? 0.07 : 0.04; if (big) task('wrecks', 1); break; }
    case 'pick': { A.pick(e.find, e.gold);
      R.pop(s.x, s.y - 34, '+' + fmt(e.v), {col: '#ffe6a8', size: 15, key: 'loot', val: e.v});
      if (e.find) { const F = DS.FIND[e.find], isNew = !S.book[e.find], gNew = e.gold && !(S.book[e.find] || {}).g;
        S.book[e.find] = S.book[e.find] || {n: 0}; S.book[e.find].n++; if (e.gold) S.book[e.find].g = 1; task('finds', 1); if (e.gold) task('gold', 1);
        toast(`${ic('star', e.gold ? 'gold' : '')}<div><small>${isNew ? T('New find!') : gNew ? T('Golden variant!') : T('Find')}</small><b>${L(F.name)}${e.gold ? ' ★' : ''}</b></div>`, e.gold ? 'gold' : 'find');
        R.burst(s.x, s.y, 16, {sp: 160, col: e.gold ? '#ffd34a' : '#7af7ff', life: 0.8}); }
      break; }
    case 'full': A.full(); R.pop(e.x, e.y - 10, T('HOLD FULL'), {col: '#ff8a8a', size: 14, key: 'full'}); break;
    case 'warn': A.warn();
      // the very first oxygen warning is explained once (the most common reason for early losses)
      if (!S.tutO2 && !G.o2Tip && S.region === 0) { G.o2Tip = true; S.tutO2 = 1; tipHint(`${ic('oxy')} ${T('Oxygen low! The white line shows what you need to get back up.')}`, IS_TOUCH ? T('Hold the Surface button') : T('Press {k} to surface', {k: '<kbd>E</kbd>'}), 5); } break;
    case 'creak': A.creak(); R.shake(4); msg(`<b>${T('HULL LIMIT')}</b> ${T('Upgrade the hull to dive deeper')}`, 'red', 2.2); break;
    case 'sting': A.sting(); R.shake(6); R.pop(s.x, s.y - 30, '−3 s O2', {col: '#ff9ad9', size: 14}); R.burst(e.x, e.y, 12, {sp: 160, col: '#ff7ad9', life: 0.5}); break;
    case 'bump': A.bump(); R.shake(3); R.bubbles(s.x, s.y, 4); break;
    case 'ascent': A.ascent(); R.bubbles(s.x, s.y, 26, 100); msg(T('Surfacing…'), '', 1.4); break;
    case 'emergency': A.alarm(); R.flash(0.22, '#ff2030'); R.shake(8); msg(`<b>${T('OUT OF OXYGEN')}</b> ${T('Emergency ascent')}`, 'red', 3);
      for (const it of e.lost) D.pieces.push({x: s.x, y: s.y, vx: (Math.random() - .5) * 200, vy: 60 + Math.random() * 80, v: it.v, mat: it.mat || 'scrap', find: null, gold: false, age: 10, st: 0, nopick: 99, m: 0}); break;
    case 'ping': A.ping(e.str); break;
    case 'blast': A.blast(); R.flash(0.25, '#fff2c0'); R.shake(14); G.hitstop = 0.1; for (let i = 0; i < 3; i++) R.parts.push({x: e.x, y: e.y, vx: 0, vy: 0, life: -i * 0.08, max: 0.8, size: 330, col: '#ffd27a', type: 'ring', drag: 0, g: 0}); R.bubbles(e.x, e.y, 40, 160); $('#nCharge').textContent = D.charges; if (!D.charges) $('#bCharge').classList.add('hidden'); break;
    case 'signal': onSignal(e.i, e.region || 0); break;
    case 'cprog': A.tick(); updChip(); R.pop(s.x, s.y - 48, contractText(e.c, true) + ' ' + Math.min(e.c.prog, contractGoal(e.c)) + '/' + contractGoal(e.c), {col: '#9ff8ff', size: 13}); break;
    case 'cdone': A.task(); updChip(); msg(`<b>${T('CONTRACT DONE')}</b> +${fmt(e.c.reward)} · ${T('Bring it home')}`, 'gold', 2.6); R.burst(s.x, s.y, 18, {sp: 180, col: '#ffd36a', life: 0.7}); break;
    case 'sample': A.pick(false, false); R.burst(e.x, e.y, 12, {sp: 120, col: '#ff9ad9', life: 0.6}); R.pop(e.x, e.y - 30, T('SAMPLE'), {col: '#ffb8e8', size: 14}); break;
    case 'locked': A.deny(); R.pop(e.o.x, e.o.y - e.o.h / 2 - 22, T('LOCKED · Drill Lv {n}', {n: e.o.req}), {col: '#ffb070', size: 14, key: 'lock'}); msg(`<b>${T('LOCKED VAULT')}</b> ${T('Upgrade your drill to level {n} to crack it', {n: e.o.req})}`, 'org', 2.2); break;
    case 'rarenear': A.record(); msg(e.r === 'vault' ? `<b>${T('LOCKED VAULT')}</b> ${T('A sealed vault in a wreck nearby')}` : `<b>${T('GLOWING TREASURE')}</b> ${T('Something valuable glitters nearby')}`, 'gold', 2.6); break;
    case 'rareopen': A.cache(); R.burst(e.o.x, e.o.y, 30, {sp: 240, col: '#ffd36a', life: 0.9}); toast(`${ic('star', 'gold')}<div><small>${T(e.o.t === 'vault' ? 'Vault cracked!' : 'Treasure!')}</small><b>${T(e.o.t === 'vault' ? 'LOCKED VAULT' : 'GLOWING TREASURE')}</b></div>`, 'gold'); break;
    case 'ice': A.bump(); A.crack(false); R.shake(e.hard ? 7 : 4); R.burst(e.x, e.y, 10, {sp: 160, col: '#dff8ff', life: 0.5, size: 3}); R.pop(s.x, s.y - 36, T('CRACK!') + (e.hard ? ' −1 s O2' : ''), {col: '#cff8ff', size: 14, key: 'ice'});
      parts.push({x: s.x, y: s.y, vx: 0, vy: 0, life: 0, max: 0.8, size: 260, col: 'rgba(200,240,255,0.8)', type: 'ring', drag: 0, g: 0}); break;
    case 'source': onSource(); break;
    // light vs. safety
    case 'light': A.light(e.on); updLightBtn(); R.burst(s.x + s.face * 28, s.y - 6, e.on ? 8 : 4, {sp: 90, col: e.on ? '#fff2c8' : '#5a6a70', life: 0.3, size: 2});
      if (!e.on && !S.tutL) { const tp = D.preds.some(p => p.tut && (p.st === 'stalk' || p.st === 'wind')); S.tutL = 1; G.slow = 0; if (G.lightHint) { $('#hint').classList.remove('show'); G.lightHint = false; }
        if (tp) { toast(`${ic('check')}<div><small>${T('Well done')}</small><b>${T('In the dark it loses you')}</b></div>`, 'find'); } } break;
    case 'pstalk': if (!S.tutL && !G.lightHint && D.st.lure !== 'sound') lightHint(e.p.tut);
      else if (e.dark && D.st.lure === 'light' && !G.heardMsg) { G.heardMsg = true; A.growl(0.8); msg(`<b>${T('IT HEARD YOU!')}</b> ${T('Stop drilling and move slowly')}`, 'org', 2.6); }
      else if (Math.random() < 0.5) A.growl(0.5); break;
    case 'pwind': A.growl(1); if (e.p.tut && D.light && !S.tutL) { G.slow = 1.8; msg(`<b>${T('IT COILS UP!')}</b> ${T('Switch the light OFF now')}`, 'red', 2.2); } break;
    case 'hunter': if (Math.random() < 0.6) A.growl(0.35); break;
    case 'plunge': A.lunge(); break;
    case 'pabort': case 'pmiss': task('dodge', 1); R.pop(e.p.x, e.p.y - 30, e.type === 'pabort' ? T('LOST YOU') : T('DODGED'), {col: '#9ff8ff', size: 14}); break;
    case 'phit': A.bite(e.kind); R.shake(9); G.hitstop = 0.05; R.burst(s.x, s.y, 14, {sp: 220, col: '#ff8a6a', life: 0.45, size: 3}); R.bubbles(s.x, s.y, 14, 120);
      if (e.kind === 'bite') { R.pop(s.x, s.y - 40, '−' + Math.round(e.dmg) + ' s O2', {col: '#ff8a8a', size: 16}); msg(`<b>${T('BITTEN!')}</b> ${D.st.lure === 'sound' ? T('Stop drilling and moving when they coil up') : T('Switch the light off when they coil up')}${e.lost ? ' · ' + T('Loot knocked loose') : ''}`, 'red', 2.2); }
      else if (e.kind === 'steal') { if (e.n) { R.pop(s.x, s.y - 40, T('LOOT STOLEN') + ' ×' + e.n, {col: '#ffb070', size: 15}); msg(`<b>${T('LOOT STOLEN!')}</b> ${T('Grab it back before it sinks')}`, 'org', 2.4); } } // an empty hold: nothing to steal, nothing to show
      else { msg(`<b>${T('GRABBED!')}</b> ${D.st.lure === 'sound' ? T('Hold still – it lets go soon') : T('Switch the light off to break free')}`, 'red', 2.4); }
      break;
    case 'release': A.bump(); R.bubbles(s.x, s.y, 16, 120); break;
    case 'flare': A.flare(); task('flare', 1); $('#nFlare').textContent = D.flares; if (!D.flares) $('#bFlare').classList.add('hidden'); R.burst(s.x, s.y + 10, 12, {sp: 140, col: '#ff8a5a', life: 0.5}); break;
    case 'cacheopen': A.cache(); task('cache', 1); R.burst(e.x, e.y, 24, {sp: 200, col: '#7af7ff', life: 0.8}); R.glitch = 0.35;
      if (e.echo >= 0) { S.echoN = Math.max(S.echoN || 0, e.echo + 1); queueFrag({echo: e.echo}); } else toast(`${ic('box')}<div><small>${T('Signal cache')}</small><b>${T('Opened!')}</b></div>`, 'find'); break;
    case 'collapse': A.rumble(0.6); msg(`<b>${T('COLLAPSE!')}</b> ${T('Rocks are falling – move away')}`, 'org', 2); break;
    case 'rock': A.bump(); R.shake(8); R.pop(s.x, s.y - 34, '−3 s O2', {col: '#ff8a8a', size: 14}); R.burst(e.x, e.y, 14, {sp: 180, col: '#6a7076', type: 'debris', g: 120, life: 1, size: 5}); break;
    case 'vent': A.vent(); R.shake(5); if (e.hot) { R.pop(s.x, s.y - 34, '−' + DS.num(e.dmg, 1) + ' s O2', {col: '#ffb070', size: 14}); R.burst(s.x, s.y, 12, {sp: 160, col: '#ff8a4a', life: 0.5}); if (!G.hotMsg) { G.hotMsg = true; msg(`<b>${T('HOT VENT!')}</b> ${T('The glowing jets burn oxygen – wait until they calm down')}`, 'org', 2.6); } } break;
    case 'ambush': if (!G.ambMsg || D.t - G.ambMsg > 8) { G.ambMsg = D.t; A.growl(0.9); msg(`<b>${T('EYES BELOW!')}</b> ${T('Something waits in your path – brake or steer aside')}`, 'red', 2.4); } break;
    case 'lurk': A.growl(0.9); msg(`<b>${T('SOMETHING CIRCLES YOU')}</b> ${IS_TOUCH ? T('It likes the dark – tap LIGHT to scare it off') : T('It likes the dark – switch the light on (L) to scare it off')}`, 'org', 3.2); break;
    case 'lurkflee': A.growl(0.4); R.pop(e.p.x, e.p.y - 30, T('SCARED OFF'), {col: '#9ff8ff', size: 14}); break;
    case 'wavewarn': A.rumble(1); R.shake(3); msg(`<b>${T('PRESSURE WAVE')}</b> ${T('Hold DRILL on a wreck to brace!')}`, 'org', 1.8); break;
    case 'wave': R.waveFx = 0.9; if (e.braced) { A.rumble(0.4); R.shake(5); R.pop(s.x, s.y - 34, T('BRACED'), {col: '#9ff8ff', size: 15}); } else { A.wave(); R.shake(12); R.pop(s.x, s.y - 34, '−2 s O2', {col: '#ff8a8a', size: 14}); R.bubbles(s.x, s.y, 30, 160); } break;
    case 'intfwarn': A.static(0.6); msg(`<b>${T('INTERFERENCE')}</b> ${T('The signal is scrambling your controls')}`, 'org', 1.6); break;
    case 'intf': A.static(1); R.glitch = 0.8; break;
    case 'intfend': break;
    case 'evreach': A.record(); msg(`<b>${T(EVN[e.e])}</b> ${T(EVD[e.e])}`, 'gold', 2.6); break;
  }
}
const EVN = {shoal: 'TREASURE SHOAL', whalefall: 'WHALE FALL', storm: 'STORM ABOVE'}, EVD = {shoal: 'Crates everywhere – grab what you can!', whalefall: 'Lots of loot … and hungry visitors', storm: 'Wrecks washed down · loot +25 %'};
// shown when a dive really starts (after the splash or the elevator)
function diveIntro() {
  if (D.intro) { setTimeout(() => { if (D && G.mode === 'dive') { msg(`<b>${T('RADIO')}</b> ${T('Meridian Station went silent 30 years ago. Its signal still calls from below.')}`, 'gold', 3.6); A.signal(); } }, 500); return; }
  if (D.contract) setTimeout(() => { if (D && G.mode === 'dive' && !D.event) msg(`<b>${T('CONTRACT')}</b> ${contractText(D.contract)} · ${contractHow(D.contract)}`, 'gold', 3.6); }, 400);
  if (D.event) { const d = D.event === 'storm' ? '' : ' · ~' + DS.fmtM(Math.round(D.evY / M / 10) * 10); setTimeout(() => { if (D && G.mode === 'dive') msg(`<b>${T(EVN[D.event])}</b> ${T(EVD[D.event])}${d}`, 'gold', 3.2); A.record(); }, 600); }
  else if (D.region > 0 && D.t < 3 && !G.twistShown) { G.twistShown = true; setTimeout(() => { if (D && G.mode === 'dive') msg(`<b>${T(D.st.lure === 'sound' ? 'ICE SEA' : 'EMBER VENTS')}</b> ${T(D.st.lure === 'sound' ? 'Predators here hunt by sound – drill and move quietly' : 'Predators here hunt by light and sound')}`, 'org', 3.4); }, 3800); }
}
const ZTIP = [null, ['TWILIGHT ZONE', 'Your light attracts predators'], ['MIDNIGHT ZONE', 'Currents and pressure vents push you around'], ['THE ABYSS', 'Pressure waves and collapsing wrecks'], ['HADAL TRENCH', 'The signal scrambles your controls']];
function lightHint(tut) {
  G.lightHint = true; const h = $('#hint'); hintStage = 3; $('#bLight').classList.remove('hidden');
  h.innerHTML = `<span class="hk">${ic('lightoff')} ${T('Something is drawn to your light!')}</span><span class="dot">·</span><span class="hk">${IS_TOUCH ? T('Tap LIGHT to switch it off') : T('Press {k} or right-click to switch it off', {k: '<kbd>L</kbd>'})}</span>`;
  h.classList.add('show'); $('#bLight').classList.add('pulse'); A.growl(0.8);
  setTimeout(() => { if (G.lightHint) { h.classList.remove('show'); G.lightHint = false; } $('#bLight').classList.remove('pulse'); }, tut ? 9000 : 6500);
}
// a short two-part tip in the hint bar (used for the first oxygen warning)
function tipHint(a, b, sec) { const h = $('#hint'); hintStage = 3; h.innerHTML = `<span class="hk">${a}</span><span class="dot">·</span><span class="hk">${b}</span>`; h.classList.add('show'); $('#bUp').classList.add('pulse');
  clearTimeout(G.tipTo); G.tipTo = setTimeout(() => { if (hintStage === 3) { h.classList.remove('show'); hintStage = 0; } }, sec * 1000); }
// the light button shows its state clearly: bright bulb + "LIGHT ON" or struck-through bulb + "LIGHT OFF"
// (label "LIGHT" + a small status tag "on" / "off": it reads as a state, not as a command)
function updLightBtn() { const b = $('#bLight'); if (!D) return; const on = D.light; b.classList.toggle('on', on); b.querySelector('svg').innerHTML = P[on ? 'light' : 'lightoff']; b.querySelector('.lst').textContent = T(on ? 'on' : 'off'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', T(on ? 'Light is on' : 'Light is off')); }
const parts = R.parts;

// signal fragments
function scramble(t) { const g = '▒░▓#%&@$¤§'; return t.replace(/[^\s.,…—-]/g, () => g[Math.floor(Math.random() * g.length)]); }
function onSignal(i, region) {
  if (DS.noFrag) return;
  if (region >= DS.REGIONS.length) { DS.hooks.happy(); return; } // endless mode: same fragments as before, nothing new to show
  if (region) { S.sigR[region] = Math.max(S.sigR[region] || 0, i + 1); save(); const SL = DS.sigList(region);
    if (i === SL.d.length - 1 && !S.finale[S.region]) { DS.hooks.happy(); return; } queueFrag({i, ok: true, need: 0, region}); DS.hooks.happy(); return; }
  S.sigN = Math.max(S.sigN, i + 1); save();
  const need = DS.sigNeed(i), ok = (S.up.decoder || 0) >= need;
  // the very last fragment is told by the finale sequence instead
  if (i === 19 && !S.finale[S.region]) { DS.hooks.happy(); return; }
  queueFrag({i, ok, need});
  DS.hooks.happy();
}
// fragments queue up and show one after another in a compact box at the screen edge (never over the sub)
function queueFrag(f) { G.fragQ.push(f); if (!G.fragOn) nextFrag(); }
function nextFrag() {
  // on the very first dive the radio intro line plays first
  if (D && D.intro && D.t < 3.6 && G.fragQ.length) { G.fragOn = true; clearTimeout(G.fragTo); G.fragTo = setTimeout(nextFrag, 400); return; }
  const f = G.fragQ.shift(); if (!f || G.cine) { G.fragOn = false; $('#frag').classList.remove('show'); return; }
  G.fragOn = true; A.signal(); R.glitch = 0.5; R.shake(3);
  const box = $('#frag'); box.classList.add('show'); box.classList.remove('alt'); box.classList.toggle('echo', f.echo != null);
  let full, txt;
  if (f.echo != null) { $('#fragH').textContent = T('ECHO') + ' ' + String(f.echo + 1).padStart(2, '0') + '/' + DS.ECHOES.length; full = txt = L(DS.ECHOES[f.echo]); $('#fragE').innerHTML = ''; }
  else { const SL = DS.sigList(f.region || 0); $('#fragH').textContent = T('SIGNAL FRAGMENT') + ' ' + String(f.i + 1).padStart(2, '0') + '/' + SL.d.length; full = L(SL.t[f.i]); txt = f.ok ? full : scramble(full);
    $('#fragE').innerHTML = f.ok ? '' : `${ic('lock')} ${T('Encrypted – needs Signal Decoder Lv {n}', {n: f.need})}`; }
  const t = $('#fragT'); t.textContent = ''; let k = 0; const hold = 2200 + txt.length * 22;
  clearInterval(G.fragI); G.fragI = setInterval(() => { k += 2; t.textContent = txt.slice(0, k); if (k >= txt.length) { clearInterval(G.fragI); G.fragTo = setTimeout(nextFrag, G.fragQ.length ? 1600 : hold); } }, 26);
}
function onSource() {
  DS.hooks.happy();
  if (S.finale[S.region]) { S.src = true; save(); toast(`${ic('signal')}<div><small>${T('Station {n}', {n: L(DS.regionOf(S.region).station)})}</small><b>${T('The station hums quietly.')}</b></div>`, 'gold'); return; }
  startCine();
}

// ---------- finale at Meridian Station: approach, lights up, last message, reveal ----------
function startCine() {
  const fy = DS.FLOOR_M * M;
  G.cine = {t: 0, line: -1, cam: {x: 40, y: fy - 230}}; D.phase = 'cine'; D.cineX = -330; D.cineY = fy - 300; D.light = true; D.grab = null;
  const clearY = fy - 1300; D.objs = D.objs.filter(o => o.broken || o.y < clearY); D.jellies = D.jellies.filter(j => j.y < clearY); D.preds = D.preds.filter(p => p.y < clearY - 400); D.rocks = []; D.ice = D.ice.filter(b => b.y < clearY);
  for (const p of D.preds) { p.st = 'wander'; p.int = 0; }
  upHold = -1; setRing(0); clearInterval(G.fragI); clearTimeout(G.fragTo); G.fragQ.length = 0; G.fragOn = false; $('#frag').classList.remove('show');
  $('#hint').classList.remove('show'); $('#msg').classList.remove('show'); msgKey = '';
  hud.classList.add('cinemode'); $('#cine').classList.add('on'); $('#cineT').innerHTML = ''; $('#bSkip').classList.remove('show');
  A.drill(false); A.finale();
}
const CINE_LINES = [1.6, 4.6, 8.0], CINE_END = 11.6;
function updCine(dt) {
  const c = G.cine; if (c.end) return; c.t += dt; const t = c.t;
  R.stLit = Math.max(0.3, Math.min(1, (t - 1.2) / 2.6)); R.eyeOpen = Math.max(0.15, Math.min(1, (t - 5.2) / 2.6));
  c.cam.y = DS.FLOOR_M * M - 230 - Math.min(1, t / 4) * 40; R.zoomT = t < 7 ? 0.8 : 0.8 - Math.min(0.1, (t - 7) * 0.04); R.eyeLook = t > 8.6 ? Math.min(1, (t - 8.6) / 1.4) : 0;
  if (t > 1) $('#bSkip').classList.add('show');
  const st0 = DS.regionOf(S.region).station, SL = DS.sigList(S.region);
  const endless = S.region >= DS.REGIONS.length, last = S.region === DS.REGIONS.length - 1;
  const lines = S.region === 0 ? DS.FINALE : [{en: 'STATION ' + st0.en.toUpperCase() + ' · POWER RESTORED', de: 'STATION ' + st0.de.toUpperCase() + ' · STROM WIEDERHERGESTELLT'}, endless ? {en: 'The hum is calm. The station is still listening.', de: 'Das Summen ist ruhig. Die Station hört noch immer zu.'} : SL.t[SL.t.length - 1],
    last ? {en: 'Three stations, one song. Thank you for listening.', de: 'Drei Stationen, ein Lied. Danke, dass du zugehört hast.'} : endless ? {en: 'Another endless run complete.', de: 'Wieder ein Endlos-Lauf geschafft.'} : {en: 'The signal moves on. So do you.', de: 'Das Signal zieht weiter. Du auch.'}];
  for (let i = 0; i < 3; i++) if (t >= CINE_LINES[i] && c.line < i) { c.line = i; const el2 = $('#cineT'); el2.innerHTML = `<p class="${i === 0 ? 'h' : ''}">${L(lines[i])}</p>`; el2.classList.remove('in'); void el2.offsetWidth; el2.classList.add('in');
    if (i === 0) A.record(); else if (i === 1) A.signal(); else A.finale(true); }
  if (t > 3 && t < 3.1) R.shake(3);
  if (t >= CINE_END) endCine();
}
function skipCine() { const c = G.cine; if (!c || c.end) return; c.t = CINE_END; R.stLit = 1; R.eyeOpen = 1; endCine(); }
function endCine() {
  const c = G.cine; c.end = true; G.menu = true; R.zoomT = null; R.eyeLook = 1; DS.hooks.playing();
  S.finale[S.region] = 1; S.src = true; save();
  $('#cine').classList.remove('on'); $('#bSkip').classList.remove('show');
  const golden = Object.values(S.book).filter(b => b.g).length, mins = Math.round((S.playT || 0) / 60);
  const nReg = DS.REGIONS.length, lastSea = S.region === nReg - 1, endless = S.region >= nReg, empty = !D.hold.length;
  const txt = S.region === 0 ? T('You reached Meridian Station and heard its last message. The signal now points to a new sea.') : S.region === 1 ? T('Boreas answered. Its signal turns toward the fire – one more sea.')
    : lastSea ? T('You answered all three stations – Meridian, Boreas and Caldera. That is the whole story of Deep Signal.') : T('Another endless run complete. No new story here – just deeper numbers.');
  const next = lastSea || endless ? `${T('Next')}: <b>${T('Endless mode')}</b> · ${T('the Ember Vents again with loot ×{m} – no new story, just bigger numbers', {m: xm(nextMult())})}`
    : `${T('Next')}: <b>${regionName(S.region + 1)}</b> · ${T(DS.lureOf(S.region + 1) === 'sound' ? 'Predators here hunt by sound – drill and move quietly' : 'Predators here hunt by light and sound')}`;
  openOvl(`<div class="rc"><div class="rck">${ic('signal')} ${lastSea ? T('The end') : endless ? T('Endless mode') : T('Region complete')}</div><h2>${lastSea ? T('Thank you for playing!') : regionName(S.region)}</h2>
    <p>${txt}</p>
    <div class="rcs"><span>${ic('depth')}<b>${DS.fmtM(DS.SOURCE_M)}</b><small>${T('Depth')}</small></span><span>${ic('up')}<b>${S.dives + 1}</b><small>${T('Dives')}</small></span><span>${ic('book')}<b>${Object.keys(S.book).length}/60</b><small>${T('Finds')}</small></span><span>${ic('star')}<b>${golden}</b><small>${T('Golden')}</small></span><span>${ic('signal')}<b>${S.echoN || 0}/${DS.ECHOES.length}</b><small>${T('Echoes')}</small></span><span>${ic('cal')}<b>${mins} ${T('min')}</b><small>${T('Time')}</small></span></div>
    ${lastSea ? `<p class="endl">${T('A game by Lewolux Studio')}</p>` : ''}<p class="rcn">${ic('wave')} ${next}</p>
    <div class="col"></div></div>`, {noClose: true, cls: 'rcp' + (lastSea ? ' endp' : '')});
  $('#ovlP .col').appendChild(btn('primary big', empty ? ic('play') + T('Continue') : ic('coin') + T('Collect your loot'), () => { closeOvl(); G.menu = false; G.cine = null; hud.classList.remove('cinemode'); G.autoPrest = true; D.phase = 'done'; D.done = true; }));
  A.record(); // (no coin rain here: it would fly through the text)
}

// HUD update
function updHud(dt) {
  const m = Math.max(0, D.sub.y / M);
  $('#dep').textContent = DS.fmtM(m);
  const z = DS.ZONES[DS.zoneAt(m)]; $('#zone').textContent = L(z.name);
  const o2 = Math.max(0, D.o2), fr = o2 / D.o2max; $('#o2t').textContent = Math.ceil(o2) + ' s';
  const f = $('#o2f'); f.style.width = (fr * 100) + '%'; const low = D.phase === 'dive' && (o2 < D.o2max * 0.25 || o2 < (D.warnAt || 0));
  f.className = fr < 0.25 || low ? 'red' : fr < 0.5 ? 'org' : '';
  $('#o2n').style.left = clamp((D.need || 0) / D.o2max * 100, 0, 100) + '%';
  if (D.contract && (D.contract.id === 'haul' || D.contract.id === 'dark')) updChip();
  $('#hld').textContent = D.hold.length + '/' + D.cap; $('#hv').innerHTML = fmt(DS.holdValue(D)); $('.holdbox').classList.toggle('full', D.hold.length >= D.cap);
  if (D.phase === 'dive') {
    if (low && D.hold.length) msg(`<b>${T('LOW OXYGEN')}</b> ${T('Surface now!')}`, 'red', 0.5);
    else if (D.hold.length >= D.cap) msg(`<b>${T('HOLD FULL')}</b> ${T('Surface to sell your loot')}`, 'org', 0.5);
  }
  $('#bUp').classList.toggle('pulse', D.phase === 'dive' && (low || D.hold.length >= D.cap));
  $('#bUp').disabled = D.phase !== 'dive';
  // signal meter (strength toward the nearest signal cache)
  const sm = $('#sigm'), on = D.sig.str > 0 && D.phase === 'dive'; sm.classList.toggle('on', on);
  if (on) { const n = Math.ceil(D.sig.str * 5); $$('#sigm i').forEach((b, i) => b.classList.toggle('lit', i < n)); }
  // danger pulse only where light really draws predators (not in the Ice Sea – there the noise meter warns)
  $('#bLight').classList.toggle('danger', D.st.lure !== 'sound' && !!D.threat && D.light && D.threat > 0.6);
  if (!lightUnlocked() && !G.lightHint) $('#bLight').classList.add('hidden');
  if (D.st.lure !== 'light') { const nm = $('#noisem'), k = clamp((D.lure || 0) / 1.2, 0, 1), n = Math.ceil(k * 5); nm.classList.toggle('on', D.phase === 'dive'); nm.classList.toggle('loud', k > 0.6); $$('#noisem i').forEach((b, i) => b.classList.toggle('lit', i < n)); }
  // zone tips: each zone brings one new mechanic
  const zi = DS.zoneAt(m); if (zi !== G.zoneI && D.phase === 'dive') { if (zi > G.zoneI && G.zoneI >= 0 && ZTIP[zi] && (S.zSeen[zi] || 0) < 3 && !G.fragOn) { S.zSeen[zi] = (S.zSeen[zi] || 0) + 1; msg(`<b>${T(ZTIP[zi][0])}</b> ${T(zi === 1 && D.st.lure === 'sound' ? 'Predators hunt the noise of your drill' : ZTIP[zi][1])}`, 'org', 3); } G.zoneI = zi; }
  if (!G.recShown && G.rec0 > 30 && m > G.rec0 + 1) { G.recShown = true; A.record(); R.pop(D.sub.x, D.sub.y - 50, T('NEW RECORD!'), {col: '#7af7ff', size: 20, max: 1.6}); }
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) { $('#msg').classList.remove('show'); msgKey = ''; } }
  { const mm = $('#msg'); if (msgT > 0) { const r = mm.getBoundingClientRect(); R.avoid = r.width ? [{l: r.left - 8, t: r.top - 6, r: r.right + 8, b: r.bottom + 6}] : []; } else R.avoid = []; }
  fragAvoid(); G.hintChk = (G.hintChk || 0) - dt; if (G.hintChk <= 0) { G.hintChk = 0.25; hintAvoid(); }
}
// the control hint never hides loot: it moves to its second spot (landscape) or fades while something lies under it
function hintAvoid() { const h = $('#hint'); if (!h.classList.contains('show') || !D) { h.classList.remove('alt', 'dim'); return; }
  const over = r => { const pad = 8; for (const o of D.objs) { if (o.broken) continue; const [x, y] = R.toScreen(o.x, o.y), hw = o.w * R.scale / 2 + pad, hh = o.h * R.scale / 2 + pad; if (x + hw > r.left && x - hw < r.right && y + hh > r.top && y - hh < r.bottom) return true; }
    for (const p of D.pieces) { const [x, y] = R.toScreen(p.x, p.y); if (x + 12 > r.left && x - 12 < r.right && y + 12 > r.top && y - 12 < r.bottom) return true; } return false; };
  if (!over(h.getBoundingClientRect())) { h.classList.remove('dim'); return; }
  if (!IS_TOUCH && !document.body.classList.contains('port')) { h.classList.toggle('alt'); if (!over(h.getBoundingClientRect())) { h.classList.remove('dim'); return; } h.classList.toggle('alt'); }
  h.classList.add('dim'); }
// the signal box never covers the sub: it switches sides (or fades when there is no free side)
function fragAvoid() { const f = $('#frag'); if (!G.fragOn || !f.classList.contains('show') || !D) { f.classList.remove('dimsub'); return; }
  const [sx, sy] = R.toScreen(D.sub.x, D.sub.y), pad = 46 * Math.max(0.7, R.scale), hit = r => sx + pad > r.left && sx - pad < r.right && sy + pad > r.top && sy - pad < r.bottom;
  let r = f.getBoundingClientRect(); if (!r.width) return;
  if (hit(r) && !document.body.classList.contains('port')) { const alt = !f.classList.contains('alt'); f.classList.toggle('alt', alt); r = f.getBoundingClientRect(); if (hit(r)) f.classList.toggle('alt', !alt); r = f.getBoundingClientRect(); }
  f.classList.toggle('dimsub', hit(r)); }

// ---------- results ----------
function endDive() {
  A.drill(false); G.mode = 'results'; document.body.classList.remove('inhub'); DS.hooks.playing(false); R.setCam(0, -R.vh * 0.1); R.clearFx();
  hud.classList.add('hidden'); clearInterval(G.fragI); clearTimeout(G.fragTo); G.fragOn = false; G.fragQ = []; upHold = -1; setRing(0);
  const daily = D.daily, items = D.hold.slice();
  S.rec = Math.max(S.rec, D.maxM); S.dives++; S.echoN = Math.max(S.echoN || 0, D.echoN || 0);
  if (D.darkMax > 0) task('dark', D.darkMax, true); if (D.event && D.evDone) task('event', 1);
  const C = D.contract, cpay = DS.contractPay(D), kept = C && !cpay && !realDive(D.diveT || 0, D.maxM, D.hold.length, D.startY / M);
  if (C) { S.contract = kept ? Object.assign({}, C, {prog: 0, done: false}) : null; if (!kept) S.cLast = C.id; if (cpay) task('contract', 1); }
  // group
  const rows = {}; let total = 0;
  for (const it of items) { const k = it.find ? 'f:' + it.find + (it.gold ? 'g' : '') : 'm:' + it.mat; const r = rows[k] || (rows[k] = {n: 0, v: 0, it}); r.n++; r.v += it.v; }
  for (const k in rows) { rows[k].v = Math.round(rows[k].v); total += rows[k].v; }
  let bonus = 0; if (daily && !D.emergency) bonus = Math.round(total * 0.25 + 40);
  if (daily) { S.daily = {day: DS.dayKey(), done: true}; }
  G.res = {total: Math.round(total), bonus: bonus + cpay, cpay, emergency: D.emergency, lost: D.lost, depth: D.maxM, daily, doubled: false};
  // the result is stored right away: closing the tab on this screen no longer loses the loot (credited on the next start)
  S.pending = {v: G.res.total + G.res.bonus, total: G.res.total, daily}; S.diving = null;
  save();
  res.classList.remove('hidden');
  $('#rTitle').textContent = G.autoPrest ? T('Region complete') : D.emergency ? T('Emergency ascent') : daily ? T('Expedition complete') : T('Back on the surface');
  $('#rSub').innerHTML = D.emergency ? T('The rescue buoy saved {p}% of your loot', {p: Math.round(D.st.keep * 100)}) : T('Max depth') + ': <b>' + DS.fmtM(D.maxM) + '</b>';
  const list = $('#rList'); list.innerHTML = '';
  const keys2 = Object.keys(rows).sort((a, b) => rows[b].v - rows[a].v);
  if (!keys2.length) list.appendChild(el('div', 'rrow empty', G.autoPrest ? T('The station is yours. Nothing else to salvage down here – the signal points on.') : T('Nothing salvaged this time. Hold DRILL near wrecks, crates and crystals.')));
  keys2.forEach((k, i) => { const r = rows[k], it = r.it; let name, cls = '', dot;
    if (it.find) { const F = DS.FIND[it.find]; name = L(F.name) + (it.gold ? ' ★' : ''); cls = it.gold ? 'gold' : 'find'; dot = it.gold ? '#ffd34a' : '#7af7ff'; } else { name = L(DS.matName(it.mat, D.region)); dot = DS.MAT[it.mat].col; }
    const row = el('div', 'rrow ' + cls, `<i style="background:${dot}"></i><span class="rn">${name}</span><span class="rc">×${r.n}</span><b>${fmt(r.v)}</b>`); row.style.animationDelay = (0.08 + i * 0.07) + 's'; list.appendChild(row); });
  if (D.emergency && D.lost > 0) list.appendChild(el('div', 'rrow lost', `<i></i><span class="rn">${T('Lost in the emergency ascent')}</span><span class="rc"></span><b>−${fmt(Math.round(D.lost))}</b>`));
  if (bonus) list.appendChild(el('div', 'rrow bonus', `<i style="background:#ffd34a"></i><span class="rn">${T('Expedition bonus')}</span><span class="rc"></span><b>+${fmt(bonus)}</b>`));
  if (C) list.appendChild(el('div', 'rrow cres ' + (cpay ? 'bonus' : kept ? 'kept' : 'lost'), `<i style="background:${cpay ? '#ffd34a' : '#556'}"></i><span class="rn">${T('Contract')}: ${contractText(C)}</span><span class="rc">${cpay ? ic('check') : kept ? '' : ic('x')}</span><b>${cpay ? '+' + fmt(cpay) : kept ? T('still open') : T('missed')}</b>`));
  { ensureTasks(); const n = tasksReady(); if (n) list.appendChild(el('div', 'rrow rtask', `${ic('tasks')}<span class="rn">${T(n > 1 ? '{n} daily tasks ready – claim them in the harbour (Tasks)' : 'A daily task is ready – claim it in the harbour (Tasks)', {n})}</span>`)); }
  // count up total (starts at 0, so an empty hold never shows the previous total)
  const tot = $('#rTot'); const target = G.res.total + G.res.bonus; let shown = 0; tot.innerHTML = money$(0); const t0 = performance.now(), dur = Math.min(1400, 400 + keys2.length * 120);
  const cnt = () => { const k = Math.min(1, (performance.now() - t0) / dur); const v = Math.round(target * (1 - Math.pow(1 - k, 3))); if (v !== shown) { shown = v; tot.innerHTML = money$(v); if (Math.random() < 0.5) A.tick(); } if (k < 1 && G.mode === 'results') requestAnimationFrame(cnt); };
  cnt();
  const acts = $('#rActs'); acts.innerHTML = '';
  const sell = btn('primary big', G.autoPrest && !target ? ic('play') + T('Continue') : ic('coin') + T('Sell'), () => doSell(false));
  acts.appendChild(sell);
  if (!G.autoPrest && S.tut >= 2 && S.dives >= 2) { const ag = btn('again', ic('play') + `<span>${T('Dive again')}</span>`, () => doSell(false, true)); ag.id = 'bAgain'; acts.appendChild(ag); }
  if (DS.hooks.ads() && target > 0) { const b2 = btn('ad', ic('film') + `<span>${T('Double loot')}</span><small>+${fmt(target)}</small>`, (e, b) => { b.disabled = true; DS.hooks.rewarded('double', ok => { if (ok) { G.res.doubled = true; doSell(true); } else { b.innerHTML = T('No ad available right now'); } }); }); acts.appendChild(b2); }
  setTimeout(() => { if (document.body.classList.contains('pad')) sell.focus({preventScroll: true}); }, 50);
  A.setDepth(0, true);
}
function doSell(doubled, again) {
  if (G.mode !== 'results') return;
  const r = G.res; let v = r.total + r.bonus; if (doubled) v *= 2;
  S.money += v; S.earned += v; S.bestDive = Math.max(S.bestDive || 0, v); S.pending = null;
  // the average dive (drones, tasks, contracts) only counts normal loot – no ads, no expedition, no contract reward
  if (!r.daily && !r.emergency) S.avg = S.avg ? Math.round(S.avg * 0.75 + r.total * 0.25) : r.total;
  if (S.tut === 0) S.tut = 1;
  task('sell', v);
  save();
  // money rain + coins to the counter
  const tb = $('#rTot').getBoundingClientRect(); DS.FX.coins(tb.left + tb.width / 2, tb.top + tb.height / 2, v > 0 ? 18 : 0);
  for (let i = 0; i < 10; i++) setTimeout(() => A.coin(i), i * 55);
  res.classList.add('hidden');
  showHub();
  // the money rain falls over the upgrade tree only (never over the detail panel and its numbers)
  { const tr = $('#treeBox').getBoundingClientRect(); DS.FX.rain(v > 0 ? clamp(Math.log10(v + 1) * 10, 10, 45) : 0, tr.left, tr.right); }
  const mid = !G.firstSession && Date.now() - G.lastMid > 180000 && S.dives >= 2;
  // "Dive again": sold, then straight into the next dive (after the break ad, if one is due)
  if (again) { G.moneyShow = S.money; if (mid) { G.lastMid = Date.now(); DS.hooks.midgame(() => { if (G.mode === 'hub') startDive(); }); } else startDive(); return; }
  if (mid) { G.lastMid = Date.now(); DS.hooks.midgame(() => {}); }
  if (doubled) toast(`${ic('check')}<div><small>${T('Loot doubled')}</small><b>+${fmt(v)}</b></div>`, 'gold');
  if (G.autoPrest) { G.autoPrest = false; setTimeout(() => { if (G.mode === 'hub') prestigeOvl(); }, (mid ? 900 : 700) + (v > 0 ? 1200 : 0)); }
  // count-up of the money pill
  G.moneyShow = S.money - v;
}

// ---------- hub ----------
function showHub() {
  G.mode = 'hub'; document.body.classList.add('inhub'); hub.classList.remove('hidden'); hud.classList.add('hidden'); D = null; R.clearFx(); R.setCam(0, -R.vh * 0.1);
  if (G.moneyShow == null) G.moneyShow = S.money;
  droneTick(); streakTick(); if (S.dives >= 2) ensureContract();
  buildTree(); updHub(); A.setDepth(0, true); DS.hooks.playing(false);
  tutorial();
}
function buildTree() {
  const nodes = $('#nodes'); nodes.innerHTML = '';
  const core = el('div', 'node core', '<canvas width="120" height="120"></canvas>'); nodes.appendChild(core); drawCore(core.firstChild);
  for (const u of DS.UPG) { const n = el('button', 'node', `${ic(u.icon)}<span class="lv"></span><span class="nm">${upName(u.id)}</span>`, {'data-nav': '', 'data-up': u.id});
    n.addEventListener('click', e => { A.init(); A.click(); const keyb = e.detail === 0 && document.body.classList.contains('pad');
      if (keyb && G.sel === u.id && !n.classList.contains('locked') && performance.now() - (G.selAt || 0) > 350) buyUI(u.id); else selectUp(u.id); });
    // focus only selects when the keyboard / gamepad navigates (a mouse or touch focus must never turn the next click into a purchase)
    n.addEventListener('focus', () => { if (document.body.classList.contains('pad')) selectUp(u.id); }); nodes.appendChild(n); }
  layoutTree();
}
function drawCore(c) { const g = c.getContext('2d'); g.clearRect(0, 0, 120, 120); g.save(); g.translate(58, 64); g.scale(1.25, 1.25); R.drawSub(g, 0.4, {prop: 0}); g.restore(); }
function layoutTree() {
  const box = $('#treeBox'); if (!box) return; const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
  const nd = $('#nodes .node[data-up]'), ns = nd && nd.offsetWidth ? nd.offsetWidth : parseFloat(getComputedStyle(document.documentElement).fontSize) * 3.4; // node size
  // keep a strip at the bottom for the region / goal line, and room for the labels under the outer nodes
  const rb = $('#hRegion'), rh = rb ? rb.offsetHeight + 10 : 0, hh = h - rh;
  const cx = w / 2, cy = hh / 2, ax = Math.max(40, w / 2 - ns * 0.8), ay = Math.max(40, hh / 2 - ns * 1.08);
  const pos = {};
  pos.core = [cx, cy];
  const r1 = Math.min(0.62, Math.max(0.5, (ns * 1.25) / ay));
  for (const u of DS.UPG) { const a = u.ang * Math.PI / 180, r = u.ring === 1 ? r1 : 0.98; pos[u.id] = [cx + Math.cos(a) * ax * r, cy + Math.sin(a) * ay * r]; }
  // labels of nodes in the upper half sit above the node, so they never run into the centre
  const els = $$('#nodes .node'), R2 = [];
  els.forEach(n => { const id = n.dataset.up || 'core', up = id !== 'core' && pos[id][1] < cy - ns * 0.4; n.classList.toggle('up', up);
    const nm = n.querySelector('.nm'), lw = nm ? nm.offsetWidth : 0, lh = nm ? nm.offsetHeight + 5 : 0, cs = n.offsetWidth || ns;
    R2.push({id, w: Math.max(cs, lw) + 6, h: cs + lh + 4, oy: (up ? -1 : 1) * lh / 2, fixed: id === 'core'}); });
  // relax: push overlapping node+label boxes apart (keeps the radial look, guarantees no overlaps on small screens)
  for (let it = 0; it < 80; it++) { let moved = false;
    for (let i = 0; i < R2.length; i++) for (let j = i + 1; j < R2.length; j++) { const A2 = R2[i], B2 = R2[j], pa = pos[A2.id], pb = pos[B2.id];
      const dx = (pb[0]) - (pa[0]), dy = (pb[1] + B2.oy) - (pa[1] + A2.oy), ox = (A2.w + B2.w) / 2 - Math.abs(dx), oy = (A2.h + B2.h) / 2 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue; moved = true; const k = A2.fixed ? [0, 1] : B2.fixed ? [1, 0] : [0.5, 0.5];
      if (ox < oy) { const m2 = (ox + 1) * (dx >= 0 ? 1 : -1); pa[0] -= m2 * k[0]; pb[0] += m2 * k[1]; } else { const m2 = (oy + 1) * (dy >= 0 ? 1 : -1); pa[1] -= m2 * k[0]; pb[1] += m2 * k[1]; } }
    for (const r of R2) { if (r.fixed) continue; const q = pos[r.id]; q[0] = clamp(q[0], r.w / 2 + 2, w - r.w / 2 - 2); q[1] = clamp(q[1], r.h / 2 - r.oy + 2, hh - r.h / 2 - r.oy - 2); }
    if (!moved) break; }
  els.forEach(n => { const id = n.dataset.up || 'core'; const [x, y] = pos[id]; n.style.left = x + 'px'; n.style.top = y + 'px'; });
  // links
  const svg = $('#links'); svg.setAttribute('viewBox', `0 0 ${w} ${h}`); let s = '';
  for (const u of DS.UPG) { const p = u.req ? Object.keys(u.req)[0] : 'core'; const a = pos[p], b = pos[u.id]; const on = DS.reqOk(S, u) && (S.up[u.id] || 0) > 0;
    const unl = DS.reqOk(S, u); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${on ? 'on' : unl ? 'unl' : ''}"/>`; }
  svg.innerHTML = s;
}
function updHub() {
  $('#hMoney').innerHTML = money$(Math.round(G.moneyShow));
  $('#hRec').innerHTML = ic('depth') + `<span>${T('Record')}</span><b>${DS.fmtM(S.rec)}</b>`;
  const dec = DS.SIGNALS.filter((_, i) => i < S.sigN && (S.up.decoder || 0) >= DS.sigNeed(i)).length;
  if (S.region >= DS.REGIONS.length) $('#hSig').innerHTML = ic('signal') + `<span>${T('Signal')}</span><b>${ic('check')}</b>`;
  else if (S.region > 0) { const SL = DS.sigList(S.region), n = S.sigR[S.region] || 0; $('#hSig').innerHTML = ic('signal') + `<span>${T('Signal')}</span><b>${n}/${SL.d.length}</b>` + ((S.sigReadR[S.region] || 0) < n ? '<em class="dotnew"></em>' : ''); }
  else $('#hSig').innerHTML = ic('signal') + `<span>${T('Signal')}</span><b>${Math.min(S.sigN, 20)}/20</b>` + (S.sigRead < dec ? '<em class="dotnew"></em>' : '');
  const found = Object.keys(S.book).length; $('#hBook').innerHTML = ic('book') + `<span>${T('Finds')}</span><b>${found}/60</b>`;
  // badge on the task pill: new tasks today (not looked at yet) or a reward ready to claim
  ensureTasks(); const td = S.tasks.list.filter(x => x.claimed).length, rdy = tasksReady(), tc = rdy > 0, tn = S.tasksSeen !== S.tasks.day && S.dives >= 1;
  $('#hTask').innerHTML = ic('tasks') + `<span>${T('Tasks')}</span>` + (tc ? `<b class="rdy">${T('{n} ready', {n: rdy})}</b>` : `<b>${td}/3</b>`) + (tc || tn ? '<em class="dotnew"></em>' : ''); $('#hTask').classList.toggle('ready', tc);
  const gk = Math.min(1, S.rec / DS.SOURCE_M), stn = L(DS.regionOf(S.region).station);
  // "come back" teaser: the next signal fragment and its depth
  const SLn = DS.sigList(S.region), nI = S.region ? (S.sigR[S.region] || 0) : S.sigN, nD = nI < SLn.d.length && S.region < DS.REGIONS.length ? SLn.d[nI] : 0;
  $('#hRegion').innerHTML = `${ic('wave')}<span>${regionName(S.region)}</span>` + (S.region ? `<b>×${xm(DS.regionMult(S))}</b>` : '') + `<span class="goal">${ic('signal')}${stn} <b>${DS.fmtM(S.rec)}</b> / ${DS.fmtM(DS.SOURCE_M)}<i><u style="width:${(gk * 100).toFixed(1)}%"></u></i></span>` + (nD ? `<span class="nsig">${T('Next signal')}: <b>${DS.fmtM(nD)}</b></span>` : '');
  for (const n of $$('#nodes .node[data-up]')) { const u = DS.U[n.dataset.up], l = S.up[u.id] || 0, c = DS.costOf(S, u), ok = DS.reqOk(S, u);
    n.classList.toggle('specp', DS.specPending(S, u.id));
    n.classList.toggle('locked', !ok && !l); n.classList.toggle('max', l >= u.max); n.classList.toggle('afford', DS.reqNext(S, u) && l < u.max && S.money >= c); n.classList.toggle('sel', G.sel === u.id);
    n.querySelector('.lv').textContent = ok || l ? l + '/' + u.max : ''; }
  updDet(); updActs(); fitRegion(); layoutTree();
}
// the detail panel drops its least important lines until everything fits (nothing is ever cut off)
function fitDet() { const d = $('#det'); if (!d || !d.clientHeight) return; d.classList.remove('f1', 'f2', 'f3', 'f4'); for (const c of ['f1', 'f2', 'f3', 'f4']) { if (d.scrollHeight <= d.clientHeight + 1) break; d.classList.add(c); } }
function fitRegion() { const r = $('#hRegion'), box = $('#treeBox'); if (!r || !box || !box.clientWidth) return; r.classList.remove('c1', 'c2'); const max = box.clientWidth - 22;
  if (r.scrollWidth > max) r.classList.add('c1'); if (r.scrollWidth > max) r.classList.add('c2'); }
function regionName(r) { const R0 = DS.REGIONS[Math.min(r, DS.REGIONS.length - 1)]; return L(R0.name) + (r >= DS.REGIONS.length ? ' · ' + T('Endless') + ' ' + (r - DS.REGIONS.length + 1) : ''); }
function selectUp(id) { if (G.sel === id) return; G.sel = id; G.selAt = performance.now(); $$('#nodes .node').forEach(n => n.classList.toggle('sel', n.dataset.up === id)); updDet(); }
function updDet() {
  if (!DS.U[G.sel]) G.sel = 'hull';
  const u = DS.U[G.sel], l = S.up[u.id] || 0, ok = DS.reqOk(S, u), c = DS.costOf(S, u);
  const det = $('#det'), sc = det.scrollTop;
  let body = `<div class="dh">${ic(u.icon)}<div><h3>${upName(u.id)}</h3><div class="dl">${T('Level')} ${l}/${u.max}</div></div></div><p>${upDesc(u.id)}</p>`;
  const okN = DS.reqNext(S, u), rq = DS.reqOf(S, u);
  if (!okN) { const req = Object.keys(rq).map(k => `${upName(k)} ${T('Lv')} ${rq[k]}`).join(', '); body += `<div class="dv lockd">${ic('lock')} ${T('Requires')}: ${req}</div>`; }
  if (u.id === 'drones' && l && !ok) body += `<div class="dv">${u.fmt(u.val(l))}</div>`;
  else if (l >= u.max) body += `<div class="dv">${u.fmt(u.val(l))} <span class="mx">${T('MAX')}</span></div>`;
  else body += `<div class="dv">${u.fmt(u.val(l))} <span class="ar">→</span> <b>${u.fmt(u.val(l + 1))}</b></div>`;
  if (ok) body += `<div class="pips">${Array.from({length: u.max}, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>`;
  const st = DS.stats(S);
  // specialization: at a certain level the upgrade asks for one of two modules
  const SP = DS.SPECS[u.id];
  if (SP) { if (l >= SP.at) { const cur = DS.specOf(S, u.id);
      body += `<button class="btn specb${cur ? '' : ' pend'}" id="bSpec" data-nav>${ic('star', cur ? '' : 'gold')}<span>${cur ? `<small>${T('Module')}</small><b>${T('sp_' + cur)}</b>` : `<b>${T('Choose a module')}</b>`}</span><em>${cur ? T('Change') : ''}</em></button>`; }
    else if (l >= SP.at - 2 && ok) body += `<div class="spec soon">${ic('star')} ${T('Level {n}: choose a module', {n: SP.at})}</div>`; }
  const avg = Math.round(DS.avgDive(S));
  body += `<div class="stats">${avg ? `<span class="avgs">${ic('coin')}${T('Ø {v} per dive', {v: fmt(avg)})}</span>` : ''}<span>${ic('hull')}${DS.fmtM(st.hullM)}</span><span>${ic('oxy')}${st.o2}\u00a0s</span><span>${ic('cargo')}${st.cap}</span><span>${ic('drill')}×${DS.num(st.dps, 1)}</span><span>${ic('engine')}${Math.round(st.descent / M)}\u00a0m/s</span><span>${ic('light')}${Math.round(st.light / M)}\u00a0m</span></div>`;
  det.innerHTML = body; det.classList.toggle('hasSpec', !!(SP && l >= SP.at));
  const sb = $('#bSpec'); if (sb) sb.addEventListener('click', () => { A.init(); A.click(); specOvl(u.id); });
  // the buy button lives below the panel, so it is never cut off on small screens
  const bb = $('#buyb'); bb.innerHTML = '';
  if (ok && l < u.max) { const can = S.money >= c && DS.reqNext(S, u);
    // how far away is it? missing money + "≈ N dives" from the average dive (Ø)
    if (S.money < c) { const nd = avg ? Math.max(1, Math.ceil((c - S.money) / avg)) : 0; bb.appendChild(el('div', 'need', `${T('You need {x} more', {x: money$(c - S.money)})}` + (nd && nd < 100 ? `<span class="nd"> · ${nd === 1 ? T('≈ 1 dive') : T('≈ {n} dives', {n: nd})} <small>(Ø\u00a0${fmt(avg)})</small></span>` : ''))); }
    const b = btn('primary buy' + (can ? '' : ' poor'), `${T('Upgrade')} ${money$(c)}`, () => buyUI(u.id)); b.id = 'bBuy'; b.setAttribute('aria-disabled', can ? 'false' : 'true'); bb.appendChild(b); }
  det.scrollTop = sc; fitDet();
}
function chooseSpec(id, o) {
  const cur = DS.specOf(S, id); if (cur === o) { A.click(); return; }
  const fee = cur ? DS.specFee(S, id) : 0; if (S.money < fee) { A.deny(); toast(T('You need {x} more', {x: money$(fee - S.money)})); return; }
  S.money -= fee; G.moneyShow = S.money; S.spec[id] = o; A.buy(); save();
  if (G.specOpen) { G.specOpen = null; closeOvl(); }
  toast(`${ic('star', 'gold')}<div><small>${upName(id)} · ${T('Module')}</small><b>${T('sp_' + o)}</b></div>`, 'gold'); updHub();
}
// module choice: its own popup – large, readable cards, closable, works with keyboard and controller
function specOvl(id) {
  const SP = DS.SPECS[id]; if (!SP || (S.up[id] || 0) < SP.at) return; const cur = DS.specOf(S, id), fee = DS.specFee(S, id);
  G.specOpen = id; G.specAt = performance.now();
  openOvl(`<h2>${ic(DS.U[id].icon)} ${upName(id)} · ${T(cur ? 'Module' : 'Choose a module')}</h2><div class="sub">${cur ? T('Switching costs {x}', {x: money$(fee)}) : T('Pick one – the first choice is free. You can switch later.')}</div>
    <div class="specg">${SP.opts.map(o => `<button class="sopt big${cur === o ? ' on' : ''}" data-nav data-spec="${o}"><b>${T('sp_' + o)}</b><span>${T('spd_' + o)}</span><em>${cur === o ? ic('check') + T('Active') : cur ? money$(fee) : T('Free')}</em></button>`).join('')}</div>`, {cls: 'specp'});
  $$('#ovlP [data-spec]').forEach(b => b.addEventListener('click', () => { A.init(); if (performance.now() - G.specAt < 400) return; chooseSpec(id, b.dataset.spec); }));
}
function updActs() {
  const a = $('#acts'); const keep = document.activeElement && a.contains(document.activeElement) ? document.activeElement.id : null; a.innerHTML = '';
  const row = el('div', 'arow');
  // daily expedition
  const today = DS.dayKey(), done = S.daily && S.daily.day === today && S.daily.done;
  const sk = S.streak, skReady = sk && sk.n && !sk.got;
  const dly = btn('daily' + (done ? ' done' : ''), `${ic(done ? 'check' : 'cal')}<span><b>${T('Daily Expedition')}</b><small>${done ? T('Done – new one in {t}', {t: untilMidnight()}) : T('Loot ×1.5 + golden cache')}</small></span>`, () => { if (!done) startDive({daily: true}); else A.deny(); });
  dly.id = 'bDaily'; row.appendChild(dly);
  // login streak: a compact button (claimable once per day)
  if (sk && sk.n) { const sc = btn('streak' + (skReady ? ' ready' : ''), `${ic('fire')}<span><b><i class="sdw">${T('Day')} </i>${sk.n}</b><small>${skReady ? '+' + fmt(DS.streakReward(S, sk.n)) : ic('check')}</small></span>`, () => { if (skReady) claimStreak(); else { A.deny(); toast(`${ic('fire')}<div><small>${T('Day {n} streak', {n: sk.n})}</small><b>${T('Tomorrow: day {n}', {n: sk.n + 1})} · +${fmt(DS.streakReward(S, sk.n + 1))}</b></div>`); } });
    sc.id = 'bStreak'; sc.setAttribute('aria-label', T('Day {n} streak', {n: sk.n})); G.streakBtn = sc; } else G.streakBtn = null;
  if (S.src) { const pr = btn('prest', `${ic('wave')}<span><b>${S.region + 1 >= DS.REGIONS.length ? T('Endless mode') : T('New Sea')}</b><small>${regionName(S.region + 1)} · ×${xm(nextMult())}</small></span>`, prestigeOvl); pr.id = 'bPrest'; row.appendChild(pr); }
  a.appendChild(row);
  // contract for the next dive
  if (S.contract) { S.contract.reward = DS.contractReward(S, S.contract); const info = el('div', 'arow info'); info.appendChild(el('div', 'card contract', `${ic('contract')}<span><small>${T('Contract for the next dive')}</small><b>${contractText(S.contract)}</b><em class="how">${contractHow(S.contract)}</em></span><span class="rw">+${money$(S.contract.reward)}</span>`)); a.appendChild(info); }
  const row2 = el('div', 'arow');
  if (G.streakBtn) row2.appendChild(G.streakBtn);
  if (DS.hooks.ads()) { const ox = btn('ad small' + (G.extraO2 ? ' on' : ''), G.extraO2 ? ic('check') + `<span>${T('+50% oxygen ready')}</span>` : ic('film') + `<span>${T('Extra oxygen')}</span><small>+50%</small>`, (e, b) => { if (G.extraO2) return; b.disabled = true; DS.hooks.rewarded('oxygen', ok => { if (ok) { G.extraO2 = true; A.buy(); } else toast(T('No ad available right now')); updActs(); }); }); ox.id = 'bO2'; row2.appendChild(ox); }
  const dv = btn('primary dive', `${ic('play')}<span>${T('DIVE')}</span>`, () => startDive()); dv.id = 'bDive'; row2.appendChild(dv);
  a.appendChild(row2);
  const dr = DS.droneRate(S); if (dr) { const bank = Math.floor(S.drone.bank || 0), full = bank >= dr * DS.DRONE_CAP_H - 1, canC = bank >= Math.max(1, Math.min(dr / 12, 50));
    if (document.body.classList.contains('short')) { // small landscape screens: the drones sit as a compact button next to DIVE
      const cb = btn('drn' + (full ? ' full' : ''), `${ic('drones')}<span><b>${fmt(bank)}</b><small>+${fmt(dr)}/${T('h')}</small></span>`, () => { if (canC) collectDrones(cb); else A.deny(); }); cb.id = 'bDrones'; cb.title = T('Drones'); row2.insertBefore(cb, row2.firstChild); }
    else { const dd = el('div', 'drones' + (full ? ' full' : ''), `${ic('drones')}<span class="dr1"><i class="drl">${T('Drones')}</i> <b>+${fmt(dr)}</b>/${T('h')}</span><span class="dr2">${full ? T('full') + ' · ' : ''}${money$(bank)}</span>`);
      dd.title = T('Drones') + (full ? ' · ' + T('Storage full ({h} h)', {h: DS.DRONE_CAP_H}) : ''); if (canC) { const cb = btn('small collect', T('Collect'), () => collectDrones(cb)); cb.id = 'bDrones'; dd.appendChild(cb); } a.appendChild(dd); } }
  if (keep && $('#' + keep)) $('#' + keep).focus({preventScroll: true});
}
function fmtDur(secs) { const h = Math.floor(secs / 3600), mi = Math.floor(secs % 3600 / 60); return h ? (mi ? `${h} ${T('h')} ${mi} ${T('min')}` : `${h} ${T('h')}`) : `${Math.max(1, mi)} ${T('min')}`; }
function untilMidnight() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const s = (m - n) / 1000; const h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60); return h ? `${h} ${T('h')} ${mi} ${T('min')}` : `${mi} ${T('min')}`; }
const xm = v => DS.num(v, v % 1 ? 1 : 0);
function nextMult() { const s2 = Object.assign({}, S, {region: S.region + 1}); return DS.regionMult(s2); }
// purchases from the UI: never two in a row from one double tap (350 ms), and a module choice opens its popup right away
function buyUI(id) { const now = performance.now(); if (now - (G.buyAt || 0) < 350) return; const l0 = S.up[id] || 0; buy(id);
  if ((S.up[id] || 0) > l0) { G.buyAt = now; if (DS.specPending(S, id) && (S.up[id] || 0) === DS.SPECS[id].at) setTimeout(() => { if (G.mode === 'hub' && topLayer() === hub) specOvl(id); }, 450); } }
function buy(id) {
  const u = DS.U[id]; if (!DS.reqNext(S, u)) { A.deny(); return; } const c = DS.costOf(S, u);
  if (!isFinite(c)) { A.deny(); return; }
  if (S.money < c) { A.deny(); const b = $('#bBuy'); if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } return; }
  S.money -= c; G.moneyShow = S.money; S.up[id] = (S.up[id] || 0) + 1; A.buy(); save();
  const n = $(`#nodes .node[data-up="${id}"]`); if (n) { const r = n.getBoundingClientRect(); DS.FX.sparkle(r.left + r.width / 2, r.top + r.height / 2); n.classList.remove('bought'); void n.offsetWidth; n.classList.add('bought'); }
  if (id === 'decoder') { const dec = DS.SIGNALS.filter((_, i) => i < S.sigN && S.up.decoder >= DS.sigNeed(i)).length; if (dec > S.sigRead) toast(`${ic('signal')}<div><small>${T('Signal Decoder')}</small><b>${T('New fragments decoded!')}</b></div>`); }
  updHub(); tutorial();
}

// hub tutorial (first upgrade, then dive): a small inline hint in the panel + a pulse on the target – never on top of the tree.
// The ✕ dismisses it for good.
function tutorial() {
  $$('.tutpulse').forEach(e => e.classList.remove('tutpulse')); const old = $('#tutHint'); if (old) old.remove();
  if (G.mode !== 'hub' || S.tut !== 1 || topLayer() !== hub) return;
  let target = null, text = '', where = null;
  if ((S.up.hull || 0) === 0) { selectUp('hull'); target = $('#bBuy'); where = target; text = T('Upgrade the hull to dive deeper'); const nd = $('#nodes .node[data-up="hull"]'); if (nd) nd.classList.add('tutpulse'); }
  else { target = $('#bDive'); where = target && target.parentNode; text = T('Dive deeper!'); }
  if (!target || !where) return;
  target.classList.add('tutpulse');
  const h = el('div', 'tuthint', `${ic('up')}<span>${text}</span>`); h.id = 'tutHint';
  const x = el('button', 'tx', ic('x'), {'aria-label': 'close'}); x.addEventListener('click', e => { e.stopPropagation(); A.click(); S.tut = 2; save(); tutorial(); }); h.appendChild(x);
  where.parentNode.insertBefore(h, where);
}

// ---------- daily tasks (3 per day) ----------
function ensureTasks() {
  const day = DS.dayKey(); if (S.tasks && S.tasks.day === day && S.tasks.list && S.tasks.list.length === 3) {
    // rewards follow the current average dive (a task picked right after a new sea started is not stuck at a tiny amount)
    const rw = DS.taskReward(S); for (const t of S.tasks.list) if (!t.claimed && rw > t.reward) t.reward = rw; return; }
  const r = DS.rng(DS.hash(day, 777, S.region || 0)), pool = DS.TASKS.filter(t => t.ok(S)), list = [];
  while (list.length < 3 && pool.length) { const t = pool.splice(Math.floor(r() * pool.length), 1)[0]; list.push({id: t.id, n: t.n(S), prog: 0, claimed: false, reward: DS.taskReward(S)}); }
  S.tasks = {day, list, bonus: false}; save();
}
function tasksReady() { return S && S.tasks && S.tasks.list ? S.tasks.list.filter(x => x.prog >= x.n && !x.claimed).length : 0; }
function taskText(t) { return T('task_' + t.id, {n: t.n, d: DS.fmtM(t.n), v: fmt(t.n)}); }
// ---------- login streak, drone storage, unsold loot, interrupted dives ----------
const dayBefore = k => { const d = new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100); d.setDate(d.getDate() - 1); return DS.dayKey(d); };
function streakTick() { const today = DS.dayKey(), sk = S.streak; if (sk.day === today) return false;
  const cont = sk.day && sk.day === dayBefore(today); if (!cont && sk.day && sk.n > 1) sk.lost = sk.n; else sk.lost = 0;
  sk.n = cont ? sk.n + 1 : 1; sk.day = today; sk.got = false; save(); return true; }
function claimStreak() { const sk = S.streak; if (sk.got) return; const v = DS.streakReward(S, sk.n); sk.got = true; S.money += v; S.earned += v; G.moneyShow = S.money - v; A.buy(); save();
  const b = $('#bStreak'); if (b) { const r = b.getBoundingClientRect(); DS.FX.coins(r.left + r.width / 2, r.top + r.height / 2, 12); }
  toast(`${ic('fire')}<div><small>${T('Day {n} streak', {n: sk.n})}</small><b>+${fmt(v)}</b></div>`, 'gold'); if (G.mode === 'hub') updHub(); }
// drones fill a storage bank by real time (game open or closed), up to 8 hours of income – nothing is lost while the tab stays open
function droneTick() { if (!S) return 0; const now = Date.now(), d = S.drone, rate = DS.droneRate(S); if (!d.at || d.at > now) d.at = now;
  const add = rate * (now - d.at) / 3600000; d.at = now; if (rate > 0) d.bank = Math.min(rate * DS.DRONE_CAP_H, (d.bank || 0) + add); return add; }
function collectDrones(b) { droneTick(); const v = Math.floor(S.drone.bank || 0); if (v < 1) return; S.drone.bank -= v; S.money += v; S.earned += v; G.moneyShow = S.money - v; A.buy(); save();
  const r = (b || $('#hMoney')).getBoundingClientRect(); DS.FX.coins(r.left + r.width / 2, r.top + r.height / 2, 12); if (G.mode === 'hub') updHub(); }
DS.droneTick = droneTick;
function storeDiving() { if (!S.diving || !D) return; S.diving.v = Math.round(DS.holdValue(D)); S.diving.m = Math.round(D.maxM); S.diving.dt = Math.round(D.diveT || 0); S.diving.n = D.hold.length; save(); }
// on start: credit what an earlier session left behind (unsold results, a dive interrupted by reload/closing = emergency ascent)
function recoverSession() {
  if (S.diving) { const d = S.diving, v = DS.abortValue(d.v || 0, d.keep || 0.35); S.diving = null; S.dives++; S.rec = Math.max(S.rec, d.m || 0); S.money += v; S.earned += v; if (realDive(d.dt || 0, d.m || 0, d.n || 0, d.s || 0) && S.contract) { S.cLast = S.contract.id; S.contract = null; } if (d.daily) S.daily = {day: DS.dayKey(), done: true};
    toast(`${ic('buoy')}<div><small>${T('Last dive interrupted – emergency ascent')}</small><b>+${fmt(v)}</b></div>`, 'find'); }
  if (S.pending) { const v = S.pending.v || 0; S.money += v; S.earned += v; S.bestDive = Math.max(S.bestDive || 0, v); if (!S.pending.daily && S.pending.total) S.avg = S.avg ? Math.round(S.avg * 0.75 + S.pending.total * 0.25) : S.pending.total; S.pending = null;
    if (S.tut === 0) S.tut = 1; toast(`${ic('coin')}<div><small>${T('Unsold loot from your last dive')}</small><b>+${fmt(v)}</b></div>`, 'gold'); }
}
// welcome back: drones only after a real absence (at least 10 minutes away – not after a quick reload) and the login streak
// (a new day) – always closable
const AWAY_MIN = 10 * 60 * 1000;
function welcomeCheck(away = Date.now() - (S.last || Date.now())) {
  droneTick(); const rate = DS.droneRate(S), bank = Math.floor(S.drone.bank || 0), sk = S.streak;
  const dronesOk = rate > 0 && away >= AWAY_MIN && bank >= Math.max(1, rate / 6), streakOk = sk.n && !sk.got && S.dives >= 1;
  if ((!dronesOk && !streakOk) || topLayer() !== hub) return;
  welcomeOvl(dronesOk ? bank : 0, dronesOk ? fmtDur(Math.min(away / 1000, DS.DRONE_CAP_H * 3600, bank / rate * 3600 + 60)) : '', dronesOk && bank >= rate * DS.DRONE_CAP_H - 1, streakOk);
}
function task(id, v, isMax) {
  if (!S) return; ensureTasks(); const t = S.tasks.list.find(x => x.id === id); if (!t || t.prog >= t.n) return;
  t.prog = isMax ? Math.max(t.prog, Math.floor(v)) : t.prog + v; if (t.prog >= t.n) { t.prog = t.n; A.task(); toast(`${ic('tasks')}<div><small>${T('Daily task done!')}</small><b>${taskText(t)}</b></div>`, 'gold'); if (G.mode === 'hub') updHub(); }
}
DS.task = task;
function tasksOvl() {
  ensureTasks(); const tk = S.tasks; if (S.tasksSeen !== tk.day) { S.tasksSeen = tk.day; save(); }
  let h = `<h2>${ic('tasks')} ${T('Daily Tasks')}</h2><div class="sub">${T('New tasks in {t}', {t: untilMidnight()})}</div><div class="tasks">`;
  tk.list.forEach((t, i) => { const k = Math.min(1, t.prog / t.n), done = t.prog >= t.n; const pv = t.id === 'dark' ? DS.fmtM(t.prog) + ' / ' + DS.fmtM(t.n) : t.id === 'sell' ? fmt(t.prog) + ' / ' + fmt(t.n) : t.prog + ' / ' + t.n;
    h += `<div class="trow ${done ? 'done' : ''} ${t.claimed ? 'claimed' : ''}"><div class="tt2"><b>${taskText(t)}</b><span class="tp"><i style="width:${(k * 100).toFixed(0)}%"></i></span><small>${pv}</small></div><div class="tr" id="tr${i}"></div></div>`; });
  const all = tk.list.every(t => t.claimed);
  h += `</div><div class="tbonus ${tk.bonus ? 'got' : ''}">${ic('star', 'gold')} ${T('All 3 done: bonus chest')} ${money$(tk.list[0] ? tk.list[0].reward * 2 : 0)}</div>`;
  openOvl(h, {cls: 'taskp'});
  tk.list.forEach((t, i) => { const c = $('#tr' + i); if (t.claimed) { c.innerHTML = ic('check'); return; }
    const b = btn(t.prog >= t.n ? 'primary small' : 'small', t.prog >= t.n ? T('Claim') + ' ' + money$(t.reward) : money$(t.reward), (e, bb) => { if (t.prog < t.n || t.claimed) { A.deny(); return; }
      t.claimed = true; S.money += t.reward; S.earned += t.reward; G.moneyShow = S.money; A.buy(); const r = bb.getBoundingClientRect(); DS.FX.coins(r.left + r.width / 2, r.top + r.height / 2, 10);
      if (S.tasks.list.every(x => x.claimed) && !S.tasks.bonus) { S.tasks.bonus = true; const bv = t.reward * 2; S.money += bv; S.earned += bv; G.moneyShow = S.money; DS.FX.rain(24); toast(`${ic('star', 'gold')}<div><small>${T('Bonus chest')}</small><b>+${fmt(bv)}</b></div>`, 'gold'); }
      save(); tasksOvl(); });
    if (t.prog < t.n) b.disabled = true; c.appendChild(b); });
}

// ---------- overlays ----------
function openOvl(html, o = {}) {
  if (G.otherTab && !o.lock) return; // the tab lock stays on top of everything
  const p = $('#ovlP'); p.className = 'panel ' + (o.cls || ''); p.innerHTML = html;
  if (!o.noClose) { const x = btn('iconbtn close', ic('x'), () => closeOvl()); x.setAttribute('data-back', ''); x.setAttribute('aria-label', 'close'); p.appendChild(x); }
  ovl.classList.remove('hidden'); arrow.classList.add('hidden');
  setTimeout(() => { if (document.body.classList.contains('pad')) navMove(0, 0); }, 30);
}
function closeOvl(silent) { if (ovl.classList.contains('hidden') || G.otherTab) return; ovl.classList.add('hidden'); G.specOpen = null; $('#ovlP').innerHTML = ''; if (G.mode === 'hub') { updHub(); tutorial(); if (document.body.classList.contains('pad')) navMove(0, 0); } }
DS.closeOvl = closeOvl;
function bookOvl() {
  let h = `<h2>${ic('book')} ${T('Collection Book')}</h2><div class="sub">${Object.keys(S.book).length}/60 ${T('found')} · ${Object.values(S.book).filter(b => b.g).length} ${T('golden_n')}</div><div class="scroll book">`;
  DS.ZONES.forEach((z, zi) => { h += `<h4>${L(z.name)}</h4><div class="grid">`;
    DS.FINDS.filter(f => f.z === zi).forEach(f => { const b = S.book[f.id];
      h += b ? `<div class="card ${b.g ? 'g' : ''} r${f.r}" data-nav tabindex="0"><div class="ch">${ic('star')}<b>${L(f.name)}</b></div><p>${L(f.log)}</p><span class="cn">×${b.n}</span></div>`
        : `<div class="card unk r${f.r}" data-nav tabindex="0"><div class="ch">${ic('star')}<b>???</b></div><p>${[T('Common'), T('Uncommon'), T('Rare')][f.r]}</p></div>`; });
    h += '</div>'; });
  openOvl(h + '</div>', {cls: 'wide'});
}
function logOvl() {
  let h = `<h2>${ic('signal')} ${T('Signal Log')}</h2><div class="sub">${T('Fragments are received at new depth records.')}</div><div class="scroll log">`;
  // the other seas: their own fragments, newest sea first
  for (let r = Math.min(S.region, 2); r >= 1; r--) { const SL = DS.sigList(r), n = S.sigR[r] || 0; h += `<h4>${regionName(r)} · ${L(DS.regionOf(r).station)}</h4>`;
    for (let i = 0; i < SL.d.length; i++) h += `<div class="frow ${i < n ? '' : 'unk'}" data-nav tabindex="0"><span class="fi">${String(i + 1).padStart(2, '0')}</span><div>${i < n ? `<p>${L(SL.t[i])}</p>` : `<p>${T('Reach {d} to receive this fragment.', {d: DS.fmtM(SL.d[i])})}</p>`}</div></div>`;
    S.sigReadR[r] = n; }
  if (S.region > 0) h += `<h4>${regionName(0)} · Meridian</h4>`;
  for (let i = 0; i < 20; i++) { const got = i < S.sigN, ok = got && (S.up.decoder || 0) >= DS.sigNeed(i);
    h += `<div class="frow ${got ? '' : 'unk'}" data-nav tabindex="0"><span class="fi">${String(i + 1).padStart(2, '0')}</span><div>${got ? (ok ? `<p>${L(DS.SIGNALS[i])}</p>` : `<p class="enc">${scramble(L(DS.SIGNALS[i]))}</p><small>${ic('lock')} ${T('Encrypted – needs Signal Decoder Lv {n}', {n: DS.sigNeed(i)})}</small>`) : `<p>${T('Reach {d} to receive this fragment.', {d: DS.fmtM(DS.SIG_DEPTH[i])})}</p>`}</div></div>`; }
  openOvl(h + '</div>', {cls: 'wide'});
  S.sigRead = DS.SIGNALS.filter((_, i) => i < S.sigN && (S.up.decoder || 0) >= DS.sigNeed(i)).length; save();
}
function setOvl() {
  openOvl(`<h2>${ic('gear')} ${T('Settings')}</h2><div class="col"></div>
    <div class="ctl"><h4>${T('Controls')}</h4>
    <p><b>${T('Steer')}</b> ${T('WASD / arrow keys / mouse / drag on touch screens')}</p>
    <p><b>${T('Drill')}</b> ${T('Hold Space, left mouse button or the DRILL button')}</p>
    <p><b>${T('Light')}</b> ${T('L, right mouse button or the LIGHT button')} · <b>${T('Decoy flare')}</b> F</p>
    <p><b>${T('Surface')}</b> ${T('E or hold the Surface button')} · <b>${T('Depth charge')}</b> C</p>
    <p><b>${T('Controller')}</b> ${T('Stick: steer · A: drill · B: surface · Y: light · X: depth charge · LB: flare · Start: pause')}</p>
    <p><b>${T('Pause')}</b> ${T('P or the pause button')}</p></div>
    <div class="cred">${T('A game by Lewolux Studio')}</div>`);
  $('#ovlP .col').appendChild(soundRow());
  const lr = el('div', 'row2 langr'); lr.appendChild(el('span', 'll', ic('wave') + `<span>${T('Language')}</span>`));
  for (const [k, nm] of [['en', 'English'], ['de', 'Deutsch']]) { const b = btn('tog lang' + (lang === k ? ' on' : ''), `<span>${nm}</span>`, () => { if (lang === k) return; S.set.lang = k; save(); try { localStorage.setItem('deepsignal_lang', k); } catch (_) {} try { const st = store(); st && st !== window.localStorage && st.setItem('deepsignal_lang', k); } catch (_) {} location.reload(); }); b.setAttribute('aria-pressed', lang === k ? 'true' : 'false'); b.dataset.lang = k; lr.appendChild(b); }
  $('#ovlP .col').appendChild(lr);
}
function prestigeOvl() {
  const endless = S.region + 1 >= DS.REGIONS.length;
  openOvl(`<h2>${ic('wave')} ${endless ? T('Endless mode') : T('New Sea') + ': ' + regionName(S.region + 1)}</h2>
    <p>${endless ? T('You have seen every sea and every station. Keep diving in the Ember Vents for bigger numbers – there is no new story.') : T('The signal points to a new sea. Travel there to keep exploring.')}</p>
    <ul class="pl"><li>${ic('check')} ${T('All loot is worth ×{m} forever', {m: xm(nextMult())})}</li><li>${ic('check')} ${T('Your Collection Book and Signal Log stay')}</li>${endless ? '' : `<li class="tw">${ic('lightoff')} ${T('Twist')}: ${T(DS.lureOf(S.region + 1) === 'sound' ? 'Predators here hunt by sound – drill and move quietly' : 'Predators here hunt by light and sound')}</li><li>${ic('signal')} ${T('{n} new signal fragments, new hazards and loot', {n: DS.sigList(S.region + 1).d.length})}</li>`}${(S.up.drones || 0) ? `<li>${ic('drones')} ${T('Half of your drones come along')}</li>` : ''}<li>${ic('x')} ${T('Money, stored drone money and upgrades start over')}</li></ul>
    <div class="col"></div>`);
  $('#ovlP .col').appendChild(btn('primary big', ic('wave') + T('Set sail'), () => {
    // half of the drones (rounded up) travel along – the idle income does not vanish
    droneTick(); const keepDr = Math.ceil((S.up.drones || 0) / 2);
    S.region++; S.money = 150 * DS.regionMult(S); S.up = keepDr ? {drones: keepDr} : {}; S.spec = {}; S.rec = 0; S.src = false; S.prest = (S.prest || 0) + 1; S.bestDive = 0; S.avg = 0; S.contract = null;
    S.drone = {at: Date.now(), bank: 0}; S.pending = null; save();
    S.tasks = null; G.twistShown = false; DS.hooks.happy(); closeOvl(); G.moneyShow = S.money; R.flash(0.3, '#cff8ff'); toast(`${ic('wave')}<div><small>${T('New Sea')}</small><b>${L(DS.regionOf(S.region).welcome)}</b></div>`, 'gold'); showHub();
  }));
}
function welcomeOvl(v, hrs, full, streak) {
  const sk = S.streak, sv = streak ? DS.streakReward(S, sk.n) : 0;
  const wd = DS.streakWeekDay(sk.n), chest = wd === 7;
  const week = streak ? `<div class="wweek">${Array.from({length: 7}, (_, i) => `<i class="${i < wd ? 'on' : ''}${i === 6 ? ' chest' : ''}">${i === 6 ? ic('star') : i + 1}</i>`).join('')}</div>` : '';
  openOvl(`<h2>${T('Welcome back!')}</h2>` + (v ? `<p>${T('Your salvage drones worked for {h} while you were away.', {h: hrs})}</p><div class="wb">${money$(v)}</div>` + (full ? `<p class="full">${ic('drones')} ${T('Full drone storage – {h} h of salvage were waiting for you.', {h: DS.DRONE_CAP_H})}</p>` : '') : '') +
    (streak && sk.lost ? `<p class="slost">${ic('fire')} ${T('Streak lost (you were on day {n}) – it starts again at day 1.', {n: sk.lost})}</p>` : '') +
    (streak ? week + `<div class="wstreak">${ic('fire')}<span><b>${T('Day {n} streak', {n: sk.n})}</b><small class="${chest ? 'wchest' : ''}">${chest ? T('Day 7: bonus chest – double reward!') : (7 - wd === 1 ? T('Tomorrow: bonus chest!') : T('{k} more days to the bonus chest', {k: 7 - wd}))}</small></span>${money$(sv)}</div>` : '') + `<div class="col"></div>`);
  $('#ovlP .col').appendChild(btn('primary big', ic('coin') + T('Collect') + (v && sv ? ' ' + money$(v + sv) : ''), () => { if (v) collectDrones($('#ovlP .wb')); if (streak) { claimStreak(); sk.lost = 0; } DS.FX.rain(20); closeOvl(); }));
}
$('#hSig').addEventListener('click', () => { A.init(); A.click(); logOvl(); });
$('#hBook').addEventListener('click', () => { A.init(); A.click(); bookOvl(); });
$('#hSet').addEventListener('click', () => { A.init(); A.click(); setOvl(); });
$('#hTask').addEventListener('click', () => { A.init(); A.click(); tasksOvl(); });

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (!(dt > 0)) dt = 0; dt = Math.min(dt, 0.1);
  if (S && !document.hidden) S.playT = (S.playT || 0) + dt;
  if (G.mode === 'dive') diveFrame(dt);
  else {
    readPad(dt);
    R.render(null, dt, {hub: true, region: S ? S.region : 0, skin: null});
    if (G.mode === 'hub' && G.moneyShow != null && Math.abs(G.moneyShow - S.money) > 0.5) { G.moneyShow += (S.money - G.moneyShow) * (1 - Math.exp(-6 * dt)); if (Math.abs(G.moneyShow - S.money) < 1) G.moneyShow = S.money; $('#hMoney').innerHTML = money$(Math.round(G.moneyShow)); $$('#nodes .node[data-up]').forEach(n => { const u = DS.U[n.dataset.up]; n.classList.toggle('afford', DS.reqNext(S, u) && (S.up[u.id] || 0) < u.max && G.moneyShow >= DS.costOf(S, u)); }); }
  }
  A.tick16(dt);
  DS.FX.frame(dt);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { G.hiddenAt = Date.now(); if (G.mode === 'dive') storeDiving(); droneTick(); save(); if (G.mode === 'dive' && !G.paused) togglePause(); }
  else if (S) { const away = Date.now() - (G.hiddenAt || S.drone.at || Date.now()); G.hiddenAt = 0; droneTick(); if (G.mode === 'hub') { const nd = streakTick(); updHub(); if (nd || away >= AWAY_MIN) welcomeCheck(away); } } });
addEventListener('pagehide', () => { if (G.mode === 'dive') storeDiving(); droneTick(); save(); });
addEventListener('resize', sizeUI);
// drones keep working while the game is open: the bank grows by real time and the hub shows it (a new day also starts a new streak day)
setInterval(() => { if (!S) return; droneTick(); if (G.mode === 'hub') { if (streakTick()) { updHub(); welcomeCheck(0); } else if (topLayer() === hub) { updActs(); tutorial(); } } if (G.mode !== 'dive') save(); }, 15000);

// ---------- boot ----------
DS.start = function () {
  R.init(cv); sizeUI(); claimTab(); G.untouched = true;
  const bt = document.getElementById('boot'); if (bt) { bt.classList.add('out'); setTimeout(() => bt.remove(), 300); }
  S = load(); const first = !S; if (!S) S = fresh(); const away0 = Date.now() - (S.last || Date.now());
  S.sessions = (S.sessions || 0) + 1; G.firstSession = S.sessions <= 1;
  applyAudio();
  if (Q.get('reset')) { S = fresh(); S.sessions = 1; }
  if (first) { S.streak = {day: DS.dayKey(), n: 1, got: true}; save(); startDive(); }
  else {
    recoverSession(); droneTick();
    showHub(); welcomeCheck(away0);
    save();
  }
  requestAnimationFrame(t => { last = t; frame(t); });
};
// test/debug hooks
DS.debug = {frame: t => frame(t), sizeUI, startDive, recoverSession, welcomeCheck, streakTick, claimStreak, collectDrones, chooseSpec, storeDiving, tutorial, endDive: () => { if (D) { D.phase = 'done'; D.done = true; } }, showHub, buy, toast, setMoney: v => { S.money = v; G.moneyShow = v; if (G.mode === 'hub') updHub(); }, state: () => S, dive: () => D, inp, togglePause, bookOvl, logOvl, setOvl, prestigeOvl, welcomeOvl, tasksOvl, ensureTasks, task, specOvl, buyUI, startCine, skipCine, fresh, save, load, doSell, G, upHold: () => upHold};
})(window.DS);
