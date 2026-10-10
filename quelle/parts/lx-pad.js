/* Lewolux Controller-Modul (lx-pad.js)
   Ergänzung für Spiele und Website: Xbox-/Standard-Controller per Gamepad-API.
   - Schläft, bis ein Controller benutzt wird. Maus, Touch und Tastatur bleiben unverändert.
   - Linker Stick / Steuerkreuz = Fokus bewegen, A = bestätigen, B = zurück, Start = Pause/Menü.
   - Leuchtende Fokus-Markierung nur im Controller-Modus.
   - Hinweis „🎮 Controller verbunden“.
   - Kleiner Vollbild-Knopf (nur mit Maus oder Controller sichtbar, nie am Handy).
   Spiele können sich einklinken (alles optional, jederzeit setzbar):
     LXPAD.game(p)     -> jedes Bild aufgerufen; true = Eingabe gehört dem Spiel (keine Menü-Navigation)
     LXPAD.back()      -> true, wenn B selbst behandelt wurde
     LXPAD.pause()     -> true, wenn Start selbst behandelt wurde
     LXPAD.root()      -> Element, auf das die Navigation beschränkt wird (z. B. offener Dialog)
     LXPAD.suspend()   -> true = Modul ruht komplett (z. B. Spiel läuft im iframe)
   p: { lx, ly, rx, ry (Sticks mit Totzone), dx, dy (-1/0/1 inkl. Steuerkreuz),
        down(n), hit(n) (gerade gedrückt), up(n) (gerade losgelassen), dt }
   Knopfnamen: a b x y lb rb lt rt back start ls rs up down left right
   Konfiguration vor dem Laden: window.LXPAD_CFG = { fs:false (kein Vollbild-Knopf), fsPos:'br'|'bl'|'tr'|'tl', site:true } */
(function(){
'use strict';
if (window.LXPAD) return;
var CFG = window.LXPAD_CFG || {};
var P = window.LXPAD = { active:false, pads:0, game:null, back:null, pause:null, root:null, suspend:null, focused:null };
var D = document, html = D.documentElement;
var NAMES = ['a','b','x','y','lb','rb','lt','rt','back','start','ls','rs','up','down','left','right','home'];
var DZ = 0.35;
var cur = {}, prev = {}, axes = [0,0,0,0], last = 0, raf = 0, rep = { dir:'', t:0, n:0 };
var ring, toastEl, fsBtn, styleEl, toastT, fsT, scrollAcc = 0;

/* ---------- Stil (nur im Controller-Modus sichtbar) ---------- */
function css(){
  if (styleEl) return;
  styleEl = D.createElement('style'); styleEl.id = 'lxPadCss';
  styleEl.textContent =
    '#lxPadRing{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483646;border-radius:14px;' +
      'box-shadow:0 0 0 4px #fff,0 0 0 8px #3be8ff,0 0 26px 10px rgba(59,232,255,.75);opacity:0;transition:opacity .15s,left .12s ease-out,top .12s ease-out,width .12s ease-out,height .12s ease-out}' +
    'html.lx-pad #lxPadRing.on{opacity:1;animation:lxPadGlow 1.4s ease-in-out infinite}' +
    '@keyframes lxPadGlow{50%{box-shadow:0 0 0 4px #fff,0 0 0 9px #ffd23b,0 0 34px 14px rgba(255,210,59,.7)}}' +
    '@media (prefers-reduced-motion:reduce){html.lx-pad #lxPadRing.on{animation:none;transition:opacity .15s}}' +
    'html.lx-pad,html.lx-pad *{cursor:none!important}' +
    '#lxPadToast{position:fixed;left:50%;top:max(14px,env(safe-area-inset-top,0px));transform:translate(-50%,-140%);z-index:2147483647;pointer-events:none;' +
      'background:rgba(17,20,38,.92);color:#fff;font:700 clamp(15px,1.6vw,26px)/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;padding:.6em 1.1em;border-radius:999px;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.35);transition:transform .35s cubic-bezier(.2,.9,.3,1.2);white-space:nowrap}' +
    '#lxPadToast.on{transform:translate(-50%,0)}' +
    '#lxFs{position:fixed;z-index:2147483645;width:44px;height:44px;border-radius:12px;border:0;padding:0;margin:0;display:none;align-items:center;justify-content:center;' +
      'background:rgba(17,20,38,.62);color:#fff;cursor:pointer;opacity:0;transition:opacity .3s;box-shadow:0 2px 10px rgba(0,0,0,.25)}' +
    '#lxFs svg{width:24px;height:24px}#lxFs:hover{opacity:1!important;background:rgba(17,20,38,.85)}' +
    '#lxFs.br{right:12px;bottom:12px}#lxFs.bl{left:12px;bottom:12px}#lxFs.tr{right:12px;top:12px}#lxFs.tl{left:12px;top:12px}' +
    '@media (pointer:fine){#lxFs{display:flex}}html.lx-pad #lxFs{display:flex}#lxFs.show{opacity:.8}' +
    'html.lx-fs #lxFs{display:none!important}';
  (D.head || html).appendChild(styleEl);
}
function ensureRing(){ if (!ring && D.body){ ring = D.createElement('div'); ring.id = 'lxPadRing'; ring.setAttribute('aria-hidden','true'); D.body.appendChild(ring); } }

/* ---------- Hinweis ---------- */
function toast(msg, ms){
  if (!D.body) return; css();
  if (!toastEl){ toastEl = D.createElement('div'); toastEl.id = 'lxPadToast'; toastEl.setAttribute('role','status'); D.body.appendChild(toastEl); }
  toastEl.textContent = msg; void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, ms || 2600);
}
P.toast = toast;

/* ---------- Vollbild ---------- */
function isFull(){ return !!(D.fullscreenElement || D.webkitFullscreenElement); }
function canFull(){ var e = html; return !!(e.requestFullscreen || e.webkitRequestFullscreen) && D.fullscreenEnabled !== false && D.webkitFullscreenEnabled !== false; }
function goFull(){
  try {
    if (isFull()) { (D.exitFullscreen || D.webkitExitFullscreen).call(D); return; }
    var r = (html.requestFullscreen || html.webkitRequestFullscreen).call(html, { navigationUI:'hide' });
    if (r && r.catch) r.catch(function(){ if (P.active) toast('Vollbild: bitte einmal mit Maus oder Fernbedienung auf ⛶ klicken', 3800); });
  } catch (e) {}
}
P.fullscreen = goFull;
function fsState(){ html.classList.toggle('lx-fs', isFull()); }
function showFs(){ if (!fsBtn) return; fsBtn.classList.add('show'); clearTimeout(fsT); fsT = setTimeout(function(){ if (!fsBtn.matches(':hover')) fsBtn.classList.remove('show'); }, 3500); }
function setupFs(){
  if (CFG.fs === false || fsBtn || !D.body || !canFull()) return;
  fsBtn = D.createElement('button'); fsBtn.id = 'lxFs'; fsBtn.type = 'button'; fsBtn.className = CFG.fsPos || 'br';
  fsBtn.setAttribute('aria-label','Vollbild'); fsBtn.title = 'Vollbild';
  fsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  fsBtn.addEventListener('click', function(e){ e.stopPropagation(); e.preventDefault(); goFull(); });
  ['pointerdown','mousedown','touchstart','pointerup','mouseup'].forEach(function(t){ fsBtn.addEventListener(t, function(e){ e.stopPropagation(); }); });
  D.body.appendChild(fsBtn); showFs();
  D.addEventListener('mousemove', function(e){ if (e.isTrusted) showFs(); }, { passive:true });
}
D.addEventListener('fullscreenchange', fsState); D.addEventListener('webkitfullscreenchange', fsState);

/* ---------- Controller-Modus an/aus ---------- */
function setActive(on){
  if (P.active === on) return;
  P.active = on; html.classList.toggle('lx-pad', on);
  if (on){ css(); ensureRing(); showFs(); } else if (ring) ring.classList.remove('on');
  try { window.dispatchEvent(new CustomEvent('lxpadmode', { detail:{ active:on } })); } catch (e) {}
}
function leave(e){ if (e.isTrusted && P.active) setActive(false); }
D.addEventListener('pointerdown', leave, true); D.addEventListener('touchstart', leave, { capture:true, passive:true });
D.addEventListener('mousemove', function(e){ if (e.isTrusted && P.active && (Math.abs(e.movementX) + Math.abs(e.movementY) > 6)) setActive(false); }, { capture:true, passive:true });

/* ---------- Gamepad lesen ---------- */
function pads(){ try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return []; } }
function read(){
  var list = pads(), st = {}, ax = [0,0,0,0], any = false, n = 0;
  for (var i = 0; i < (list ? list.length : 0); i++){
    var g = list[i]; if (!g || g.connected === false) continue; n++;
    var b = g.buttons || [];
    for (var k = 0; k < NAMES.length; k++){ var bb = b[k]; if (bb && (bb.pressed || bb.value > 0.5)) { st[NAMES[k]] = true; any = true; } }
    var a = g.axes || [];
    for (var j = 0; j < 4; j++){ var v = +a[j] || 0; if (Math.abs(v) > Math.abs(ax[j])) ax[j] = v; }
    // manche Controller melden das Steuerkreuz als Achse 9 (Hat-Switch)
    if (g.mapping !== 'standard' && a.length > 9 && Math.abs(a[9]) <= 1.01 && Math.abs(a[9]) > 0.05){
      var h = Math.round((a[9] + 1) * 3.5); if (h === 0 || h === 1 || h === 7) st.up = true; if (h >= 3 && h <= 5) st.down = true; if (h >= 5 && h <= 7) st.left = true; if (h >= 1 && h <= 3) st.right = true;
    }
  }
  for (var q = 0; q < 4; q++){ var vv = ax[q]; ax[q] = Math.abs(vv) < DZ ? 0 : (vv - Math.sign(vv) * DZ) / (1 - DZ); if (ax[q]) any = true; }
  P.pads = n; return { st:st, ax:ax, any:any };
}
var api = {
  down: function(n){ return !!cur[n]; },
  hit:  function(n){ return !!cur[n] && !prev[n]; },
  up:   function(n){ return !cur[n] && !!prev[n]; }
};
P.state = api;

function connected(e){
  if (P.suspend && P.suspend()) { start(); return; }
  var id = e && e.gamepad && e.gamepad.id || '';
  toast('🎮 Controller verbunden' + (/xbox|xinput|045e/i.test(id) ? '' : ''));
  start();
}
function start(){ if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
window.addEventListener('gamepadconnected', connected);
window.addEventListener('gamepaddisconnected', function(){ setTimeout(function(){ var l = pads(), n = 0; for (var i = 0; i < (l ? l.length : 0); i++) if (l[i]) n++; if (!n) { toast('🎮 Controller getrennt'); setActive(false); } }, 50); });
// Falls der Controller schon vor dem Laden verbunden war
var seen = false;
var probe = setInterval(function(){ var l = pads(); for (var i = 0; i < (l ? l.length : 0); i++) if (l[i]) { if (!seen) { seen = true; start(); } return; } }, 1000);

/* ---------- Haupt-Schleife ---------- */
function loop(t){
  raf = requestAnimationFrame(loop);
  var dt = Math.min(0.1, (t - last) / 1000); last = t;
  var r = read();
  prev = cur; cur = r.st; axes = r.ax;
  if (P.suspend && P.suspend()) { if (api.hit('back') && P.onSuspendBack) P.onSuspendBack(); hideRing(); return; }
  if (r.any && !P.active && !D.hidden) { setActive(true); if (!seen) { seen = true; toast('🎮 Controller verbunden'); } }
  var dx = (cur.left ? -1 : 0) + (cur.right ? 1 : 0), dy = (cur.up ? -1 : 0) + (cur.down ? 1 : 0);
  if (!dx && Math.abs(axes[0]) > 0.45) dx = Math.sign(axes[0]);
  if (!dy && Math.abs(axes[1]) > 0.45) dy = Math.sign(axes[1]);
  var p = { lx:axes[0], ly:axes[1], rx:axes[2], ry:axes[3], dx:dx, dy:dy, dt:dt, down:api.down, hit:api.hit, up:api.up, active:P.active };
  P.last = p;
  var took = false;
  if (typeof P.game === 'function') { try { took = !!P.game(p); } catch (e) { console.error(e); } }
  if (took) { hideRing(); rep.dir = ''; return; }
  if (!P.active) return;
  nav(p);
}

/* ---------- Menü-Navigation (DOM) ---------- */
var SEL = 'button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=menuitem],[role=option],[role=switch],[role=checkbox],[role=radio],[role=link],[tabindex]:not([tabindex="-1"]),[data-pad]';
var BTN = 'button,a[href],[role=button],[role=link],[role=tab],[role=menuitem],[role=option]';
function vis(el){
  if (!el || el.disabled || el.closest('[hidden],[inert],[aria-hidden="true"],[data-pad-skip]')) return null;
  if (el.id === 'lxFs' && !(D.fullscreenEnabled !== false)) return null;
  var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return null;
  var cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.08 || cs.pointerEvents === 'none' && !el.hasAttribute('data-pad')) return null;
  return r;
}
function onTop(el, r){
  var vw = innerWidth, vh = innerHeight;
  var x0 = Math.max(0, r.left), x1 = Math.min(vw, r.right), y0 = Math.max(0, r.top), y1 = Math.min(vh, r.bottom);
  if (x1 - x0 < 2 || y1 - y0 < 2) return null; // außerhalb des Bildschirms
  var pts = [[(x0 + x1) / 2, (y0 + y1) / 2], [x0 + (x1 - x0) * .2, y0 + (y1 - y0) * .3], [x0 + (x1 - x0) * .8, y0 + (y1 - y0) * .7]];
  for (var i = 0; i < pts.length; i++){
    var h = D.elementFromPoint(pts[i][0], pts[i][1]);
    if (h && (h === el || el.contains(h) || (h.contains(el) && h !== D.body && h !== html) || h === ring)) return true;
  }
  return false;
}
function modalRoot(){
  if (typeof P.root === 'function') { var rr = P.root(); if (rr) return rr; }
  var ms = D.querySelectorAll('dialog[open],[aria-modal="true"],[role="dialog"],[role="alertdialog"]'), best = null;
  for (var i = 0; i < ms.length; i++){ var m = ms[i]; if (vis(m) && !m.closest('[hidden]')) best = m; }
  return best;
}
function candidates(){
  var root = modalRoot(), scope = root || D, out = [], els = scope.querySelectorAll(SEL);
  for (var i = 0; i < els.length; i++){
    var el = els[i]; if (el === ring || el === toastEl) continue;
    if (!el.hasAttribute('data-pad')) {
      // verschachtelt: Knopf im Knopf -> der äußere zählt; Container mit tabindex um Knöpfe -> die inneren zählen
      if (el.matches(BTN) && el.parentElement && el.parentElement.closest(BTN)) continue;
      if (!el.matches(BTN + ',input,select,textarea,summary') && el.querySelector(SEL)) continue;
    }
    var r = vis(el); if (!r) continue;
    var top = onTop(el, r);
    if (top === false) continue;               // verdeckt
    if (top === null && !root && !inScroller(el)) continue; // außerhalb des Bildes und nicht scrollbar erreichbar
    out.push({ el:el, r:r });
  }
  return out;
}
function inScroller(el){
  for (var p = el.parentElement; p && p !== D.body; p = p.parentElement){
    var cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) return true;
    if (cs.position === 'fixed') return false;
  }
  return D.scrollingElement && D.scrollingElement.scrollHeight > innerHeight + 2;
}
function pickStart(list){
  var def = list.filter(function(c){ return c.el.matches('[data-pad-default],[autofocus]'); })[0];
  if (def) return def.el;
  var act = D.activeElement; if (act && act !== D.body) for (var i = 0; i < list.length; i++) if (list[i].el === act) return act;
  // größtes sichtbares Bedienelement (meist „Spielen“/„Los geht’s“)
  var best = null, ba = 0;
  list.forEach(function(c){ var r = c.r; if (r.bottom < 0 || r.top > innerHeight) return; var a = Math.min(r.width, innerWidth) * Math.min(r.height, innerHeight); if (c.el.matches('input,textarea,select')) a *= 0.3; if (a > ba) { ba = a; best = c.el; } });
  return best || (list[0] && list[0].el);
}
function move(dx, dy){
  var list = candidates(); if (!list.length) return;
  var f = P.focused, fr = f && list.filter(function(c){ return c.el === f; })[0];
  if (!fr) { focus(pickStart(list)); return; }
  var a = fr.r, ax = (a.left + a.right) / 2, ay = (a.top + a.bottom) / 2, best = null, bs = Infinity;
  list.forEach(function(c){
    if (c.el === f) return; var b = c.r, bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2, main, side, ovl;
    if (dx) {
      main = dx > 0 ? b.left - a.right : a.left - b.right; if ((dx > 0 ? bx <= ax + 1 : bx >= ax - 1)) return;
      ovl = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); side = ovl > 0 ? 0 : Math.abs(by - ay);
    } else {
      main = dy > 0 ? b.top - a.bottom : a.top - b.bottom; if ((dy > 0 ? by <= ay + 1 : by >= ay - 1)) return;
      ovl = Math.min(a.right, b.right) - Math.max(a.left, b.left); side = ovl > 0 ? 0 : Math.abs(bx - ax);
    }
    var s = Math.max(main, -8) + side * 2.2 + (ovl > 0 ? 0 : 30);
    if (s < bs) { bs = s; best = c.el; }
  });
  if (best) focus(best);
  else if (dy) scrollBy(dy * innerHeight * 0.35); // nichts mehr in der Richtung: ein Stück weiterscrollen
}
function scroller(el){
  for (var p = el && el.parentElement; p && p !== D.body; p = p.parentElement){
    var cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) return p;
  }
  return D.scrollingElement || html;
}
function scrollBy(px){ var s = scroller(P.focused); try { s.scrollBy({ top:px, behavior:'smooth' }); } catch (e) { s.scrollTop += px; } }
function focus(el){
  if (!el) return; P.focused = el;
  try { el.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' }); } catch (e) {}
  if (!el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select')) {
    try { el.focus({ preventScroll:true }); } catch (e) {}
  }
  try { el.dispatchEvent(new CustomEvent('lxpadfocus', { bubbles:true })); } catch (e) {}
  drawRing();
}
P.focus = focus;
function hideRing(){ if (ring) ring.classList.remove('on'); }
function drawRing(){
  ensureRing(); var f = P.focused; if (!ring) return;
  if (!f || !f.isConnected || !P.active) { hideRing(); return; }
  var r = f.getBoundingClientRect(); if (r.width < 2) { hideRing(); return; }
  var cs = getComputedStyle(f), rad = parseFloat(cs.borderTopLeftRadius) || 10, pad = 3;
  ring.style.left = (r.left - pad) + 'px'; ring.style.top = (r.top - pad) + 'px';
  ring.style.width = (r.width + pad * 2) + 'px'; ring.style.height = (r.height + pad * 2) + 'px';
  ring.style.borderRadius = Math.min(rad + pad, (r.height + pad * 2) / 2) + 'px';
  ring.classList.add('on');
}
function fire(el, type, x, y){
  var o = { bubbles:true, cancelable:true, composed:true, clientX:x, clientY:y, button:0, buttons:type.indexOf('down') > 0 ? 1 : 0, view:window };
  try {
    if (type.indexOf('pointer') === 0) { o.pointerId = 1; o.pointerType = 'mouse'; o.isPrimary = true; el.dispatchEvent(new PointerEvent(type, o)); }
    else el.dispatchEvent(new MouseEvent(type, o));
  } catch (e) {}
}
function activate(el){
  if (!el) return;
  if (el.matches('input[type=range]')) return;
  if (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset]),textarea,select')) {
    try { el.focus(); if (el.showPicker && el.tagName === 'SELECT') el.showPicker(); } catch (e) {}
    return;
  }
  var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  fire(el, 'pointerdown', x, y); fire(el, 'mousedown', x, y); fire(el, 'pointerup', x, y); fire(el, 'mouseup', x, y);
  if (el.click) el.click(); else fire(el, 'click', x, y);
}
P.activate = activate;
var BACK_RE = /^(zur(ü|ue)ck|back|schlie(ß|ss)en|close|abbrechen|cancel|beenden|menü|menu|hauptmenü|home|×|✕|✖|x|←|‹|⟵|◀|<|‹ zurück|← zurück)$/i;
var BACK_IN = /(zur(ü|ue)ck|schlie(ß|ss)en|close|back|abbrechen)/i;
function label(el){ return ((el.getAttribute('aria-label') || '') + ' ' + (el.title || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim(); }
function findBack(){
  var list = candidates(), best = null, bs = -1;
  list.forEach(function(c){
    var el = c.el, al = (el.getAttribute('aria-label') || el.title || '').trim(), tx = (el.textContent || '').replace(/\s+/g, ' ').trim(), s = 0;
    if (el.matches('[data-pad-back]')) s = 100;
    else if (BACK_RE.test(al) || BACK_RE.test(tx)) s = 60;
    else if (BACK_IN.test(al) || (tx.length < 24 && BACK_IN.test(tx))) s = 40;
    else if (/class="[^"]*(close|back|zurueck|zurück)/i.test(el.outerHTML.slice(0, 200))) s = 30;
    if (s > bs && s > 0) { bs = s; best = el; }
  });
  return best;
}
function key(k, code, kc){
  var t = D.activeElement && D.activeElement !== D.body ? D.activeElement : D;
  ['keydown','keyup'].forEach(function(type){ try { t.dispatchEvent(new KeyboardEvent(type, { key:k, code:code, keyCode:kc, which:kc, bubbles:true, cancelable:true })); } catch (e) {} });
}
P.key = key;
function back(){
  if (typeof P.back === 'function' && P.back()) return;
  var b = findBack(); if (b) { activate(b); return; }
  key('Escape', 'Escape', 27);
}
function pause(){
  if (typeof P.pause === 'function' && P.pause()) return;
  var list = candidates(), b = null;
  list.forEach(function(c){ var l = label(c.el); if (!b && /(^|\s)(pause|menü|menu|einstellungen|optionen)(\s|$)/i.test(l)) b = c.el; });
  if (b) { activate(b); return; }
  key('Escape', 'Escape', 27);
}
function nav(p){
  // Richtung mit Wiederholung beim Halten
  var dir = p.dx ? (p.dx > 0 ? 'R' : 'L') : p.dy ? (p.dy > 0 ? 'D' : 'U') : '';
  var now = performance.now();
  if (dir) {
    var f = P.focused;
    if (f && f.matches && f.matches('input[type=range]') && p.dx) {
      if (dir !== rep.dir || now > rep.t) { var st = parseFloat(f.step) || 1; f.value = (parseFloat(f.value) || 0) + p.dx * st; f.dispatchEvent(new Event('input', { bubbles:true })); f.dispatchEvent(new Event('change', { bubbles:true })); rep.t = now + (dir !== rep.dir ? 380 : 90); rep.dir = dir; }
    } else if (dir !== rep.dir) { rep.dir = dir; rep.t = now + 400; move(p.dx, p.dx ? 0 : p.dy); }
    else if (now > rep.t) { rep.t = now + 140; move(p.dx, p.dx ? 0 : p.dy); }
  } else rep.dir = '';
  if (p.hit('a')) { var c = P.focused && P.focused.isConnected && vis(P.focused) ? P.focused : null; if (c) activate(c); else move(0, 0); }
  if (p.hit('b')) back();
  if (p.hit('start')) pause();
  if (p.hit('back') && CFG.fs !== false && !CFG.site) goFull();
  // Rechter Stick oder Schultertasten: scrollen
  var sy = p.ry || 0; if (p.down('rt')) sy = 1; if (p.down('lt')) sy = -1;
  if (sy) { scrollAcc += sy * p.dt * 900; if (Math.abs(scrollAcc) >= 4) { var s = scroller(P.focused); s.scrollTop += scrollAcc; scrollAcc = 0; } }
  if (P.focused && (!P.focused.isConnected || !vis(P.focused) || onTop(P.focused, P.focused.getBoundingClientRect()) === false)) {
    // Fokus ist verschwunden (Dialog zu, Seite gewechselt): neu wählen
    P.focused = null; var list = candidates(); if (list.length) focus(pickStart(list)); else hideRing();
  } else if (!P.focused) { var l2 = candidates(); if (l2.length) focus(pickStart(l2)); }
  drawRing();
}

function init(){ css(); setupFs(); fsState(); }
// Spiele können vorab window.LXPAD_INIT = function(P){ P.game = ...; } setzen
if (typeof window.LXPAD_INIT === 'function') { try { window.LXPAD_INIT(P); } catch (e) { console.error(e); } }
if (D.body) init(); else D.addEventListener('DOMContentLoaded', init);
})();
