/* Lewolux PDF – kostenloser, werbefreier PDF-Leser (PWA). © Lewolux Studio – lewolux.de */
import * as pdfjsLib from './lib/pdfjs/pdf.min.js';

const APP_VERSION = '1.0.0';
const base = document.baseURI;
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('lib/pdfjs/pdf.worker.min.js', base).href;
const CMAP_URL = new URL('lib/pdfjs/cmaps/', base).href;
const FONT_URL = new URL('lib/pdfjs/standard_fonts/', base).href;
const SHARE_CACHE = 'lewolux-pdf-share';
const SHARE_KEY = new URL('__share__/file.pdf', base).href;

const CSS_UNITS = 96 / 72;
const ZOOM_MIN = 0.25, ZOOM_MAX = 6;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6];
const MAX_RECENTS = 30;

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = () => new Promise((r) => setTimeout(r, 0));
const isCoarse = matchMedia('(pointer:coarse)').matches;
const mqMobile = matchMedia('(max-width:767px)');
const isMobile = () => mqMobile.matches;
const MAX_CANVAS_PIXELS = isCoarse ? 8388608 : 16777216;
const dpr = () => Math.min(window.devicePixelRatio || 1, 3);

const el = {
  home: $('home'), viewer: $('viewer'), scroller: $('scroller'), pages: $('pages'), topbar: $('topbar'),
  thumbs: $('thumbs'), outline: $('outline'), sidebar: $('sidebar'), scrim: $('scrim'),
  pageInput: $('pageInput'), pageTotal: $('pageTotal'), bbPage: $('bbPage'), bbTotal: $('bbTotal'),
  zoomSelect: $('zoomSelect'), zoomCustom: $('zoomCustom'), docTitle: $('docTitle'),
  searchbar: $('searchbar'), searchInput: $('searchInput'), searchCount: $('searchCount'),
  menu: $('menu'), menuScrim: $('menuScrim'), pill: $('pagePill'), loading: $('loading'), loadingText: $('loadingText'),
  progress: $('loadProgress'), toast: $('toast'), fileInput: $('fileInput'), present: $('present'),
  presentStage: $('presentStage'), presentCount: $('presentCount'), scrub: $('scrub'), scrubThumb: $('scrubThumb'),
  scrubLabel: $('scrubLabel'), printArea: $('printArea'), dropOverlay: $('dropOverlay'), dropzone: $('dropzone'),
};

/* ---------------- Einstellungen ---------------- */
const prefs = Object.assign({ theme: 'dark', read: 'normal', sidebar: true }, (() => {
  try { return JSON.parse(localStorage.getItem('lpdf.prefs') || '{}'); } catch { return {}; }
})());
try { const t = localStorage.getItem('lpdf.theme'); if (t) prefs.theme = t; } catch {}
function savePrefs() {
  try { localStorage.setItem('lpdf.prefs', JSON.stringify(prefs)); localStorage.setItem('lpdf.theme', prefs.theme); } catch {}
}

/* ---------------- IndexedDB (lokaler Verlauf) ---------------- */
let dbPromise = null;
function openDB() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('no idb'));
  return dbPromise ||= new Promise((res, rej) => {
    const r = indexedDB.open('lewolux-pdf', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('data')) d.createObjectStore('data', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbPromise = null; rej(r.error); };
  });
}
async function idbReq(store, mode, fn) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    let out;
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const idb = {
  all: (s) => idbReq(s, 'readonly', (st) => st.getAll()),
  get: (s, id) => idbReq(s, 'readonly', (st) => st.get(id)),
  put: (s, v) => idbReq(s, 'readwrite', (st) => st.put(v)),
  del: (s, id) => idbReq(s, 'readwrite', (st) => st.delete(id)),
  clear: (s) => idbReq(s, 'readwrite', (st) => st.clear()),
};

/* ---------------- Zustand ---------------- */
const S = {
  token: 0, doc: null, task: null, blob: null, name: '', id: null,
  pages: [], num: 0, zoom: 1, mode: 'auto', rotation: 0, current: 1,
  queue: [], busy: false, live: new Set(), pageProm: new Map(),
  zoomingUntil: 0, texts: [], outlineLoaded: false,
  search: { q: '', token: 0, matches: [], byPage: new Map(), idx: -1, done: true },
  thumbQueue: [], thumbBusy: false, thumbObserver: null,
  chromeHidden: false, pwCancelled: false,
};

function getPage(n) {
  let p = S.pageProm.get(n);
  if (!p) { p = S.doc.getPage(n); S.pageProm.set(n, p); }
  return p;
}

/* ---------------- Hilfen ---------------- */
let toastTimer = 0;
function toast(msg, opts = {}) {
  const t = el.toast;
  t.replaceChildren(Object.assign(document.createElement('span'), { textContent: msg }));
  if (opts.action) {
    const b = document.createElement('button');
    b.textContent = opts.action;
    b.onclick = () => { t.hidden = true; opts.fn?.(); };
    t.append(b);
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, opts.ms || 3200);
}
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
}
function fmtAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'gerade eben';
  if (d < 3600) return `vor ${Math.round(d / 60)} Min.`;
  if (d < 86400) return `vor ${Math.round(d / 3600)} Std.`;
  if (d < 172800) return 'gestern';
  if (d < 604800) return `vor ${Math.round(d / 86400)} Tagen`;
  return new Date(ts).toLocaleDateString('de-DE');
}
function lowerKeepLength(s) {
  const lo = s.toLowerCase();
  if (lo.length === s.length) return lo;
  let out = '';
  for (const ch of s) { const l = ch.toLowerCase(); out += l.length === ch.length ? l : ch; }
  return out;
}
function canvasToBlob(c, type, q) {
  return new Promise((r) => c.toBlob(r, type, q));
}
const isCancel = (e) => e && (e.name === 'RenderingCancelledException' || e.name === 'AbortException');

/* ---------------- Design / Lesemodus ---------------- */
function applyTheme() {
  document.documentElement.dataset.theme = prefs.theme;
  document.querySelector('meta[name=theme-color]').content = prefs.theme === 'light' ? '#f3f4f8' : '#0b0c12';
  $('themeLabel').textContent = prefs.theme === 'light' ? 'Dunkles Design' : 'Helles Design';
  $('homeThemeBtn').querySelector('use').setAttribute('href', prefs.theme === 'light' ? '#i-moon' : '#i-sun');
}
function toggleTheme() { prefs.theme = prefs.theme === 'light' ? 'dark' : 'light'; savePrefs(); applyTheme(); }
function applyRead() {
  el.viewer.dataset.read = prefs.read;
  el.present.dataset.read = prefs.read;
  const night = prefs.read === 'night';
  $('nightBtn').setAttribute('aria-pressed', night);
  $('bbNightBtn').setAttribute('aria-pressed', night);
  el.menu.querySelectorAll('[data-read]').forEach((b) => b.setAttribute('aria-checked', b.dataset.read === prefs.read));
}
function setRead(mode) {
  prefs.read = mode; savePrefs(); applyRead();
  if (S.doc) toast(mode === 'night' ? 'Nachtmodus an' : mode === 'sepia' ? 'Sepia-Modus an' : 'Normale Darstellung', { ms: 1400 });
}
function toggleNight() { setRead(prefs.read === 'night' ? 'normal' : 'night'); }

/* ---------------- Öffnen ---------------- */
function looksLikePdf(f) {
  return f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '') || !f.type);
}
async function openBlob(blob, name) {
  if (!blob) return;
  await closeDocNow(true);
  const token = ++S.token;
  S.name = (name || 'Dokument.pdf').replace(/[\\/]/g, '_');
  S.blob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  showViewer();
  el.docTitle.textContent = S.name.replace(/\.pdf$/i, '');
  el.docTitle.title = S.name;
  document.title = `${S.name} – Lewolux PDF`;
  el.loading.hidden = false;
  el.loadingText.textContent = 'Wird geöffnet …';
  el.progress.classList.add('on');
  el.progress.firstElementChild.style.width = '8%';

  let data;
  try { data = new Uint8Array(await blob.arrayBuffer()); } catch {
    return failOpen('Die Datei konnte nicht gelesen werden.');
  }
  const task = pdfjsLib.getDocument({
    data, cMapUrl: CMAP_URL, cMapPacked: true, standardFontDataUrl: FONT_URL,
    isEvalSupported: false, enableXfa: false,
  });
  S.task = task;
  S.pwCancelled = false;
  task.onPassword = (update, reason) => {
    el.loading.hidden = true;
    askPassword(reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD).then((pw) => {
      if (pw == null) { S.pwCancelled = true; task.destroy(); }
      else { el.loading.hidden = false; update(pw); }
    });
  };
  task.onProgress = ({ loaded, total }) => {
    if (total) el.progress.firstElementChild.style.width = Math.round(10 + 80 * loaded / total) + '%';
  };
  let doc;
  try { doc = await task.promise; } catch (e) {
    if (token !== S.token) return;
    if (S.pwCancelled) { closeDoc(); return; }
    console.warn(e);
    return failOpen(e?.name === 'InvalidPDFException' ? 'Das ist leider keine gültige PDF-Datei.' : 'Die PDF konnte nicht geöffnet werden.');
  }
  if (token !== S.token) { doc.destroy(); return; }
  S.doc = doc;
  S.num = doc.numPages;
  S.id = doc.fingerprints.filter(Boolean).join('-') + ':' + S.blob.size;
  let meta = null;
  try { meta = await idb.get('meta', S.id); } catch {}
  await setupPages();
  if (token !== S.token) return;
  el.progress.firstElementChild.style.width = '100%';
  setTimeout(() => el.progress.classList.remove('on'), 400);

  const last = meta?.lastPage && meta.lastPage > 1 && meta.lastPage <= S.num ? meta.lastPage : 1;
  if (last > 1) {
    scrollToPage(last, { instant: true });
    toast(`Weiter auf Seite ${last}`, { action: 'Zum Anfang', fn: () => scrollToPage(1), ms: 4500 });
  }
  updateVisible();
  buildThumbs();
  buildOutline();
  el.scroller.focus({ preventScroll: true });
  saveRecent(meta).catch((e) => console.warn('Verlauf', e));
  measureAll(token);
}
function failOpen(msg) {
  toast(msg, { ms: 4500 });
  closeDoc();
}

function askPassword(wrong) {
  const dlg = $('pwDlg');
  $('pwErr').hidden = !wrong;
  $('pwText').textContent = `„${S.name}“ ist geschützt. Bitte gib das Passwort ein.`;
  $('pwInput').value = '';
  return new Promise((resolve) => {
    dlg.onclose = () => resolve(dlg.returnValue === 'ok' ? $('pwInput').value : null);
    dlg.returnValue = '';
    dlg.showModal();
    setTimeout(() => $('pwInput').focus(), 50);
  });
}

function showViewer() {
  el.home.hidden = true;
  el.viewer.hidden = false;
  if (history.state?.lpdf !== 'doc') history.pushState({ lpdf: 'doc' }, '');
  if (!isMobile() && prefs.sidebar) el.viewer.classList.add('sb-open');
  showChrome();
}

function closeDoc() {
  if (history.state?.lpdf === 'doc') history.back();
  else closeDocNow();
}
async function closeDocNow(keepViewer = false) {
  S.token++;
  S.search.token++;
  for (const p of S.pages) { try { p.task?.cancel(); } catch {} }
  S.thumbObserver?.disconnect();
  S.thumbObserver = null;
  S.queue = []; S.thumbQueue = []; S.live.clear(); S.busy = false; S.thumbBusy = false;
  S.pages = []; S.texts = []; S.pageProm.clear();
  S.search = { q: '', token: S.search.token, matches: [], byPage: new Map(), idx: -1, done: true };
  el.pages.replaceChildren(); el.thumbs.replaceChildren(); el.outline.replaceChildren();
  clearPrintArea();
  closeSearch(true);
  closeMenu();
  const d = S.doc, t = S.task;
  S.doc = null; S.task = null;
  if (!keepViewer) { S.blob = null; S.rotation = 0; }
  S.rotation = 0;
  try { if (d) await d.destroy(); else if (t) await t.destroy(); } catch {}
  if (!keepViewer) {
    el.viewer.hidden = true;
    el.home.hidden = false;
    el.viewer.classList.remove('sb-open');
    el.scrim.hidden = true;
    document.title = 'Lewolux PDF – kostenloser PDF-Leser ohne Werbung';
    renderRecents();
  }
}

/* ---------------- Seiten-Layout ---------------- */
async function setupPages() {
  const p1 = await getPage(1);
  const v = p1.getViewport({ scale: CSS_UNITS, rotation: (p1.rotate + S.rotation) % 360 });
  S.pages = Array.from({ length: S.num }, (_, i) => ({
    num: i + 1, w: v.width, h: v.height, el: null, canvas: null, task: null,
    rz: 0, rr: -1, textLayer: null, textDiv: null, textReady: false, textRot: -1, linkRot: -1, linkLayer: null,
    thumbDone: false, thumbEl: null, top: 0, ch: 0,
  }));
  const frag = document.createDocumentFragment();
  for (const p of S.pages) {
    const d = document.createElement('div');
    d.className = 'page';
    d.dataset.page = p.num;
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', `Seite ${p.num} von ${S.num}`);
    p.el = d;
    frag.append(d);
  }
  el.pages.append(frag);
  el.pageTotal.textContent = `/ ${S.num}`;
  el.bbTotal.textContent = `/ ${S.num}`;
  el.pageInput.style.width = Math.max(46, String(S.num).length * 10 + 26) + 'px';
  $('gotoInput').max = S.num;
  $('gotoHint').textContent = `Seite 1 – ${S.num}`;
  S.mode = isMobile() ? 'width' : 'auto';
  S.zoom = fitScale(S.mode);
  layout();
  S.current = 0;
  setCurrent(1);
  el.scroller.scrollTop = 0;
  el.scroller.scrollLeft = 0;
}

function layout() {
  const z = S.zoom;
  el.pages.style.setProperty('--scale-factor', z * CSS_UNITS);
  for (const p of S.pages) {
    p.cw = Math.floor(p.w * z);
    p.ch = Math.floor(p.h * z);
    p.el.style.width = p.cw + 'px';
    p.el.style.height = p.ch + 'px';
  }
  for (const p of S.pages) p.top = p.el.offsetTop;
  updateZoomUI();
}

function topInset() {
  return (isMobile() && S.chromeHidden) ? 0 : el.topbar.offsetHeight;
}
function bottomInset() {
  return isMobile() && !S.chromeHidden ? $('bottombar').offsetHeight : 0;
}

function fitScale(mode) {
  const p = S.pages[(S.current || 1) - 1] || S.pages[0];
  if (!p) return 1;
  const mob = isMobile();
  const padX = mob ? 16 : 40;
  const cw = el.scroller.clientWidth - padX;
  const tb = el.topbar.offsetHeight || 56;
  const ch = el.scroller.clientHeight - tb - (mob ? ($('bottombar').offsetHeight || 64) + 22 : 36);
  const zw = cw / p.w;
  const zp = Math.min(zw, ch / p.h);
  let z;
  if (mode === 'width') z = zw;
  else if (mode === 'page') z = zp;
  else z = p.w <= p.h ? Math.min(zw, 1.25) : Math.min(zw, zp * 1.0, 1.25);
  return clamp(z, ZOOM_MIN, ZOOM_MAX);
}

function pageAtY(y) {
  const P = S.pages;
  let lo = 0, hi = P.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (P[mid].top <= y) lo = mid; else hi = mid - 1;
  }
  return P[lo];
}

/* Zoom mit Ankerpunkt (bleibt unter Finger/Maus) */
function setZoom(z, opts = {}) {
  if (!S.doc || !S.pages.length) return;
  z = clamp(z, ZOOM_MIN, ZOOM_MAX);
  const mode = opts.mode || 'custom';
  const sc = el.scroller;
  const ax0 = opts.ax0 ?? sc.clientWidth / 2;
  const ay0 = opts.ay0 ?? (opts.top ? topInset() + 1 : sc.clientHeight / 2);
  const ax1 = opts.ax1 ?? ax0, ay1 = opts.ay1 ?? ay0;
  const cx = sc.scrollLeft + ax0, cy = sc.scrollTop + ay0;
  const p = pageAtY(cy);
  const left = p.el.offsetLeft;
  const relY = (cy - p.top) / (p.ch || 1);
  const relX = (cx - left) / (p.cw || 1);
  const changed = Math.abs(z - S.zoom) > 1e-4;
  S.zoom = z;
  S.quietScroll = performance.now() + 150;
  S.mode = mode;
  if (changed) {
    layout();
    sc.scrollTop = p.top + relY * p.ch - ay1;
    const pad = isMobile() ? 8 : 18;
    sc.scrollLeft = p.cw + 2 * pad <= sc.clientWidth ? 0 : p.el.offsetLeft + relX * p.cw - ax1;
    S.zoomingUntil = performance.now() + 160;
    clearTimeout(S.zoomTimer);
    S.zoomTimer = setTimeout(updateVisible, 180);
  } else updateZoomUI();
  scheduleVisible();
}
function setZoomMode(mode, opts = {}) { setZoom(fitScale(mode), { ...opts, mode }); }
function zoomStep(dir) {
  const z = S.zoom;
  let n;
  if (dir > 0) n = ZOOM_STEPS.find((s) => s > z * 1.01) ?? ZOOM_MAX;
  else n = [...ZOOM_STEPS].reverse().find((s) => s < z * 0.99) ?? ZOOM_MIN;
  setZoom(n);
}
function updateZoomUI() {
  const sel = el.zoomSelect;
  if (S.mode !== 'custom') { sel.value = S.mode; el.zoomCustom.hidden = true; return; }
  const match = [...sel.options].find((o) => !isNaN(+o.value) && Math.abs(+o.value - S.zoom) < 0.005);
  if (match) { sel.value = match.value; el.zoomCustom.hidden = true; }
  else {
    el.zoomCustom.textContent = Math.round(S.zoom * 100) + ' %';
    el.zoomCustom.hidden = false;
    sel.value = 'custom';
  }
}

/* ---------------- Sichtbarkeit & Render-Warteschlange ---------------- */
let visRaf = 0;
function scheduleVisible() {
  if (visRaf) return;
  visRaf = requestAnimationFrame(() => { visRaf = 0; updateVisible(); });
}
function visibleInfo() {
  const sc = el.scroller;
  const st = sc.scrollTop, vh = sc.clientHeight;
  const top = st + topInset(), bottom = st + vh - bottomInset();
  const P = S.pages;
  let i = pageAtY(st).num - 1;
  let first = -1, last = -1, best = null, bestVis = -1;
  for (; i < P.length; i++) {
    const p = P[i];
    if (p.top > st + vh) break;
    if (p.top + p.ch < st) continue;
    if (first < 0) first = p.num;
    last = p.num;
    const vis = Math.min(p.top + p.ch, bottom) - Math.max(p.top, top);
    if (vis > bestVis + 1) { bestVis = vis; best = p.num; }
  }
  if (first < 0) { first = last = best = pageAtY(st).num; }
  // Am Dokumentende: letzte Seite gilt als aktuell
  if (st + vh >= sc.scrollHeight - 2 && last === P.length) best = last;
  return { first, last, current: best };
}
function updateVisible() {
  if (!S.doc || !S.pages.length) return;
  const { first, last, current } = visibleInfo();
  setCurrent(current);
  const want = new Set();
  for (let n = Math.max(1, first - 1); n <= Math.min(S.num, last + 1); n++) want.add(n);
  for (const n of [...S.live]) {
    const p = S.pages[n - 1];
    if (!want.has(n) && p.task) { try { p.task.cancel(); } catch {} p.task = null; }
    if (n < first - 3 || n > last + 3) releasePage(p, n < first - 8 || n > last + 8);
  }
  const zooming = performance.now() < S.zoomingUntil;
  S.queue = [...want]
    .filter((n) => needsRender(S.pages[n - 1]) && !(zooming && S.pages[n - 1].canvas))
    .sort((a, b) => Math.abs(a - current) - Math.abs(b - current) || (a >= first && a <= last ? -1 : 1));
  pump();
}
function needsRender(p) {
  return !p.canvas || Math.abs(p.rz - S.zoom) > 1e-4 || p.rr !== S.rotation;
}
function releasePage(p, dropText) {
  if (p.task) { try { p.task.cancel(); } catch {} p.task = null; }
  if (p.canvas) { p.canvas.width = 0; p.canvas.height = 0; p.canvas.remove(); p.canvas = null; p.rz = 0; }
  if (dropText && p.textDiv) {
    p.textDiv.remove(); p.textDiv = null; p.textLayer = null; p.textReady = false; p.textRot = -1;
    S.live.delete(p.num);
  }
  if (!p.textDiv) S.live.delete(p.num);
}
async function pump() {
  if (S.busy) return;
  const n = S.queue.shift();
  if (n == null) { pumpThumbs(); return; }
  const p = S.pages[n - 1];
  if (!p || !needsRender(p)) { pump(); return; }
  S.busy = true;
  const token = S.token;
  try { await renderPage(p, token); } catch (e) { if (!isCancel(e)) console.warn('Render', e); }
  if (token !== S.token) return;
  S.busy = false;
  pump();
}
async function renderPage(p, token) {
  const zoom = S.zoom, rot = S.rotation;
  const page = await getPage(p.num);
  if (token !== S.token) return;
  const totalRot = (page.rotate + rot) % 360;
  const base1 = page.getViewport({ scale: CSS_UNITS, rotation: totalRot });
  if (Math.abs(base1.width - p.w) > 0.5 || Math.abs(base1.height - p.h) > 0.5) {
    p.w = base1.width; p.h = base1.height;
    relayoutKeepAnchor();
  }
  const vp = page.getViewport({ scale: zoom * CSS_UNITS, rotation: totalRot });
  let os = dpr();
  const area = vp.width * vp.height;
  if (area * os * os > MAX_CANVAS_PIXELS) os = Math.sqrt(MAX_CANVAS_PIXELS / area);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(vp.width * os));
  canvas.height = Math.max(1, Math.floor(vp.height * os));
  const ctx = canvas.getContext('2d', { alpha: false });
  const task = page.render({
    canvasContext: ctx, viewport: vp,
    transform: os !== 1 ? [os, 0, 0, os, 0, 0] : null,
    annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS,
  });
  p.task = task;
  S.live.add(p.num);
  try { await task.promise; } finally { if (p.task === task) p.task = null; }
  if (token !== S.token) return;
  if (p.canvas) { p.canvas.replaceWith(canvas); p.canvas.width = 0; p.canvas.height = 0; }
  else p.el.prepend(canvas);
  p.canvas = canvas;
  p.rz = zoom; p.rr = rot;
  if (!el.loading.hidden) el.loading.hidden = true;
  ensureTextLayer(p, page, vp, rot);
  ensureLinks(p, page, totalRot);
}
function relayoutKeepAnchor() {
  const sc = el.scroller;
  const ay = topInset() + 1;
  const cy = sc.scrollTop + ay;
  const p = pageAtY(cy);
  const rel = (cy - p.top) / (p.ch || 1);
  S.quietScroll = performance.now() + 150;
  layout();
  sc.scrollTop = p.top + rel * p.ch - ay;
}
async function measureAll(token) {
  if (S.num > 4000) return;
  let changed = false;
  for (let n = 2; n <= S.num; n++) {
    if (token !== S.token) return;
    const page = await getPage(n);
    if (token !== S.token) return;
    const v = page.getViewport({ scale: CSS_UNITS, rotation: (page.rotate + S.rotation) % 360 });
    const p = S.pages[n - 1];
    if (Math.abs(v.width - p.w) > 0.5 || Math.abs(v.height - p.h) > 0.5) {
      p.w = v.width; p.h = v.height; changed = true;
      if (p.thumbEl) p.thumbEl.querySelector('.tcan').style.aspectRatio = `${p.w} / ${p.h}`;
    }
    if (n % 20 === 0 || n === S.num) {
      if (changed) { relayoutKeepAnchor(); scheduleVisible(); changed = false; }
      await sleep(S.busy ? 30 : 0);
    }
  }
}

/* ---------------- Textebene & Links ---------------- */
function ensureTextLayer(p, page, vp, rot) {
  if (p.textLayer && p.textRot === rot) {
    if (p.textReady) p.textLayer.update({ viewport: vp });
    return;
  }
  if (p.textDiv) { p.textDiv.remove(); }
  const div = document.createElement('div');
  div.className = 'textLayer';
  p.el.append(div);
  p.textDiv = div; p.textRot = rot; p.textReady = false;
  const tl = new pdfjsLib.TextLayer({
    textContentSource: page.streamTextContent({ includeMarkedContent: true, disableNormalization: true }),
    container: div, viewport: vp,
  });
  p.textLayer = tl;
  tl.render().then(() => {
    if (p.textLayer !== tl) return;
    const end = document.createElement('div');
    end.className = 'endOfContent';
    div.append(end);
    p.textReady = true;
    p.hl = null;
    applyHighlights(p);
  }).catch(() => {});
}
async function ensureLinks(p, page, totalRot) {
  if (p.linkRot === totalRot) return;
  p.linkRot = totalRot;
  let annots;
  try { annots = await page.getAnnotations({ intent: 'display' }); } catch { return; }
  if (p.linkRot !== totalRot || !p.el.isConnected) return;
  p.linkLayer?.remove();
  p.linkLayer = null;
  const links = annots.filter((a) => a.subtype === 'Link' && (a.url || a.dest || a.action));
  if (!links.length) return;
  const vp = page.getViewport({ scale: 1, rotation: totalRot });
  const layer = document.createElement('div');
  layer.className = 'linkLayer';
  for (const a of links) {
    const r = pdfjsLib.Util.normalizeRect(vp.convertToViewportRectangle(a.rect));
    const link = document.createElement('a');
    Object.assign(link.style, {
      left: (r[0] / vp.width * 100) + '%', top: (r[1] / vp.height * 100) + '%',
      width: ((r[2] - r[0]) / vp.width * 100) + '%', height: ((r[3] - r[1]) / vp.height * 100) + '%',
    });
    if (a.url) {
      link.href = a.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.title = a.url;
      link.setAttribute('aria-label', 'Link: ' + a.url);
    } else if (a.dest) {
      link.href = '#';
      link.title = 'Zur Stelle im Dokument springen';
      link.setAttribute('aria-label', 'Interner Link');
      link.addEventListener('click', (e) => { e.preventDefault(); goToDest(a.dest); });
    } else if (a.action) {
      link.href = '#';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const m = { NextPage: S.current + 1, PrevPage: S.current - 1, FirstPage: 1, LastPage: S.num }[a.action];
        if (m) scrollToPage(m);
      });
    }
    layer.append(link);
  }
  p.el.append(layer);
  p.linkLayer = layer;
}

/* ---------------- Navigation ---------------- */
function setCurrent(n) {
  if (!n || n === S.current) return;
  S.current = n;
  if (document.activeElement !== el.pageInput) el.pageInput.value = n;
  el.bbPage.textContent = n;
  el.pill.textContent = `${n} / ${S.num}`;
  $('prevBtn').disabled = n <= 1;
  $('nextBtn').disabled = n >= S.num;
  const prevT = el.thumbs.querySelector('.thumb.active');
  prevT?.classList.remove('active');
  prevT?.removeAttribute('aria-current');
  const t = S.pages[n - 1]?.thumbEl;
  if (t) {
    t.classList.add('active');
    t.setAttribute('aria-current', 'page');
    if (el.viewer.classList.contains('sb-open') && !el.thumbs.hidden && !S.thumbClickNav) {
      const r = t.getBoundingClientRect(), cr = el.thumbs.getBoundingClientRect();
      if (r.top < cr.top || r.bottom > cr.bottom) el.thumbs.scrollTop += r.top - cr.top - cr.height / 2 + r.height / 2;
    }
  }
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(saveLastPage, 900);
}
function scrollToPage(n, opts = {}) {
  if (!S.pages.length) return;
  n = clamp(Math.round(n) || 1, 1, S.num);
  const p = S.pages[n - 1];
  const sc = el.scroller;
  S.quietScroll = performance.now() + 150;
  let y = p.top - topInset() - (isMobile() ? 8 : 12);
  if (opts.offsetY != null) y = p.top + opts.offsetY - topInset() - 8;
  sc.scrollTop = Math.max(0, y);
  if (opts.x != null) sc.scrollLeft = opts.x;
  setCurrent(n);
  scheduleVisible();
}
async function goToDest(dest) {
  try {
    const explicit = typeof dest === 'string' ? await S.doc.getDestination(dest) : dest;
    if (!Array.isArray(explicit)) return;
    const ref = explicit[0];
    let idx;
    if (ref && typeof ref === 'object') idx = await S.doc.getPageIndex(ref);
    else if (Number.isInteger(ref)) idx = ref;
    else return;
    const num = idx + 1;
    const kind = explicit[1]?.name;
    let x = null, y = null;
    if (kind === 'XYZ') { x = explicit[2]; y = explicit[3]; }
    else if (kind === 'FitH' || kind === 'FitBH') y = explicit[2];
    else if (kind === 'FitR') { x = explicit[2]; y = explicit[5]; }
    if (y != null) {
      const page = await getPage(num);
      const vp = page.getViewport({ scale: S.zoom * CSS_UNITS, rotation: (page.rotate + S.rotation) % 360 });
      const [, vy] = vp.convertToViewportPoint(x || 0, y);
      scrollToPage(num, { offsetY: Math.max(0, vy - 10) });
    } else scrollToPage(num);
    if (isMobile()) closeSidebar();
  } catch (e) { console.warn('Ziel', e); }
}
function nextPage(d) { scrollToPage(S.current + d); }

/* ---------------- Drehen ---------------- */
function rotate(delta) {
  if (!S.doc) return;
  const cur = S.current;
  S.rotation = (S.rotation + delta + 360) % 360;
  for (const p of S.pages) {
    [p.w, p.h] = [p.h, p.w];
    if (p.thumbEl) {
      p.thumbDone = false;
      const tc = p.thumbEl.querySelector('.tcan');
      tc.replaceChildren();
      tc.style.aspectRatio = `${p.w} / ${p.h}`;
    }
  }
  if (S.mode !== 'custom') S.zoom = fitScale(S.mode);
  layout();
  el.scroller.scrollLeft = 0;
  scrollToPage(cur);
  if (S.thumbObserver) { el.thumbs.querySelectorAll('.thumb').forEach((t) => { S.thumbObserver.unobserve(t); S.thumbObserver.observe(t); }); }
  updateVisible();
}

/* ---------------- Seitenleiste ---------------- */
function openSidebar() {
  el.viewer.classList.add('sb-open');
  $('sidebarBtn').setAttribute('aria-pressed', 'true');
  if (isMobile()) el.scrim.hidden = false;
  else { prefs.sidebar = true; savePrefs(); }
  requestAnimationFrame(() => setCurrentThumbVisible());
}
function closeSidebar() {
  el.viewer.classList.remove('sb-open');
  $('sidebarBtn').setAttribute('aria-pressed', 'false');
  el.scrim.hidden = true;
  if (!isMobile()) { prefs.sidebar = false; savePrefs(); }
}
function toggleSidebar() { el.viewer.classList.contains('sb-open') ? closeSidebar() : openSidebar(); }
function setCurrentThumbVisible() {
  const t = S.pages[S.current - 1]?.thumbEl;
  if (t && !el.thumbs.hidden) el.thumbs.scrollTop = t.offsetTop - el.thumbs.clientHeight / 2 + t.offsetHeight / 2;
}
function selectTab(which) {
  const thumbs = which === 'thumbs';
  $('tabThumbs').setAttribute('aria-selected', thumbs);
  $('tabOutline').setAttribute('aria-selected', !thumbs);
  el.thumbs.hidden = !thumbs;
  el.outline.hidden = thumbs;
  if (thumbs) setCurrentThumbVisible();
}

function buildThumbs() {
  const frag = document.createDocumentFragment();
  for (const p of S.pages) {
    const b = document.createElement('button');
    b.className = 'thumb';
    b.dataset.page = p.num;
    b.setAttribute('aria-label', `Seite ${p.num}`);
    const c = document.createElement('div');
    c.className = 'tcan';
    c.style.aspectRatio = `${p.w} / ${p.h}`;
    const s = document.createElement('span');
    s.textContent = p.num;
    b.append(c, s);
    p.thumbEl = b;
    frag.append(b);
  }
  el.thumbs.append(frag);
  S.pages[S.current - 1]?.thumbEl?.classList.add('active');
  S.thumbObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const n = +e.target.dataset.page;
      const i = S.thumbQueue.indexOf(n);
      if (e.isIntersecting) { if (i < 0 && !S.pages[n - 1].thumbDone) S.thumbQueue.push(n); }
      else if (i >= 0) S.thumbQueue.splice(i, 1);
    }
    pumpThumbs();
  }, { root: el.thumbs, rootMargin: '400px 0px' });
  el.thumbs.querySelectorAll('.thumb').forEach((t) => S.thumbObserver.observe(t));
}
async function pumpThumbs() {
  if (S.thumbBusy || S.busy || S.queue.length || !S.doc) return;
  if (!el.viewer.classList.contains('sb-open') || el.thumbs.hidden) return;
  const n = S.thumbQueue.shift();
  if (n == null) return;
  const p = S.pages[n - 1];
  if (p.thumbDone) { pumpThumbs(); return; }
  S.thumbBusy = true;
  const token = S.token;
  try {
    const page = await getPage(n);
    if (token !== S.token) return;
    const rot = (page.rotate + S.rotation) % 360;
    const v1 = page.getViewport({ scale: 1, rotation: rot });
    const tw = (p.thumbEl.querySelector('.tcan').clientWidth || 132) * Math.min(dpr(), 2);
    const vp = page.getViewport({ scale: tw / v1.width, rotation: rot });
    const c = document.createElement('canvas');
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    await page.render({ canvasContext: c.getContext('2d', { alpha: false }), viewport: vp }).promise;
    if (token !== S.token) return;
    p.thumbEl.querySelector('.tcan').replaceChildren(c);
    p.thumbDone = true;
  } catch (e) { if (!isCancel(e)) console.warn('Miniatur', e); }
  finally { if (token === S.token) S.thumbBusy = false; }
  if (token === S.token) setTimeout(() => { S.queue.length ? pump() : pumpThumbs(); }, 0);
}

async function buildOutline() {
  let outline = null;
  try { outline = await S.doc.getOutline(); } catch {}
  if (!S.doc) return;
  el.outline.replaceChildren();
  if (!outline || !outline.length) {
    const p = document.createElement('p');
    p.className = 'ol-empty';
    p.textContent = 'Dieses Dokument hat kein Inhaltsverzeichnis.';
    el.outline.append(p);
    selectTab('thumbs');
    return;
  }
  let count = 0;
  const countAll = (items) => items.forEach((i) => { count++; countAll(i.items || []); });
  countAll(outline);
  const build = (items, depth) => {
    const ul = document.createElement('ul');
    if (depth === 0) ul.setAttribute('role', 'tree');
    else ul.setAttribute('role', 'group');
    for (const it of items) {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem');
      const row = document.createElement('div');
      row.className = 'ol-item';
      const kids = it.items?.length ? build(it.items, depth + 1) : null;
      if (kids) {
        const tg = document.createElement('button');
        tg.className = 'ol-toggle';
        tg.innerHTML = '<svg class="ic"><use href="#i-right"/></svg>';
        const open = count <= 60 || depth === 0 && count <= 200 ? depth === 0 : false;
        tg.setAttribute('aria-expanded', open);
        tg.setAttribute('aria-label', 'Unterpunkte ein-/ausklappen');
        kids.hidden = !open;
        tg.onclick = () => { const o = tg.getAttribute('aria-expanded') !== 'true'; tg.setAttribute('aria-expanded', o); kids.hidden = !o; };
        row.append(tg);
      } else row.append(Object.assign(document.createElement('span'), { className: 'ol-spacer' }));
      const a = document.createElement('button');
      a.className = 'ol-link';
      a.textContent = it.title || '(ohne Titel)';
      if (it.bold) a.style.fontWeight = '700';
      if (it.italic) a.style.fontStyle = 'italic';
      a.onclick = () => {
        if (it.dest) goToDest(it.dest);
        else if (it.url) window.open(it.url, '_blank', 'noopener');
      };
      row.append(a);
      li.append(row);
      if (kids) li.append(kids);
      ul.append(li);
    }
    return ul;
  };
  el.outline.append(build(outline, 0));
  selectTab('outline');
}

/* ---------------- Suche ---------------- */
function openSearch() {
  if (!S.doc) return;
  el.searchbar.hidden = false;
  showChrome();
  el.searchInput.focus();
  el.searchInput.select();
}
function closeSearch(silent) {
  el.searchbar.hidden = true;
  S.search.token++;
  const had = S.search.matches.length;
  S.search.q = ''; S.search.matches = []; S.search.byPage = new Map(); S.search.idx = -1;
  el.searchCount.textContent = '';
  el.searchCount.classList.remove('none');
  if (had) for (const p of S.pages) applyHighlights(p);
  if (!silent) el.scroller.focus({ preventScroll: true });
}
async function getPageText(n) {
  if (S.texts[n]) return S.texts[n];
  const page = await getPage(n);
  const tc = await page.getTextContent({ disableNormalization: true });
  const items = tc.items.filter((i) => i.str !== undefined);
  let text = '';
  const starts = [];
  for (const it of items) { starts.push(text.length); text += it.str; if (it.hasEOL) text += ' '; }
  return (S.texts[n] = { strs: items.map((i) => i.str), tr: items.map((i) => i.transform), starts, lower: lowerKeepLength(text) });
}
let searchDebounce = 0;
function onSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => runSearch(el.searchInput.value.trim()), 220);
}
async function runSearch(q) {
  const s = S.search;
  if (q === s.q && s.done && s.matches.length) return;
  const token = ++s.token;
  const old = s.byPage;
  s.q = q; s.matches = []; s.byPage = new Map(); s.idx = -1; s.done = false;
  for (const n of old.keys()) applyHighlights(S.pages[n - 1]);
  if (!q) { s.done = true; updateSearchCount(); return; }
  const ql = lowerKeepLength(q);
  const start = S.current;
  let jumped = false;
  el.searchCount.textContent = 'Suche …';
  el.searchCount.classList.remove('none');
  for (let n = 1; n <= S.num; n++) {
    let t;
    try { t = await getPageText(n); } catch { continue; }
    if (token !== s.token || !S.doc) return;
    let i = t.lower.indexOf(ql);
    while (i >= 0) {
      const m = { page: n, start: i, end: i + ql.length, i: s.matches.length };
      s.matches.push(m);
      if (!s.byPage.has(n)) s.byPage.set(n, []);
      s.byPage.get(n).push(m);
      i = t.lower.indexOf(ql, i + Math.max(1, ql.length));
    }
    if (s.byPage.has(n)) applyHighlights(S.pages[n - 1]);
    if (!jumped && n >= start && s.matches.length) {
      jumped = true;
      s.idx = s.matches.findIndex((m) => m.page >= start);
      showMatch();
    }
    if (n % 6 === 0) { updateSearchCount(); await tick(); }
  }
  s.done = true;
  if (!jumped && s.matches.length) { s.idx = 0; showMatch(); }
  updateSearchCount();
}
function updateSearchCount() {
  const s = S.search;
  const c = el.searchCount;
  if (!s.q) { c.textContent = ''; c.classList.remove('none'); return; }
  if (!s.matches.length) {
    c.textContent = s.done ? 'Keine Treffer' : 'Suche …';
    c.classList.toggle('none', s.done);
    return;
  }
  c.classList.remove('none');
  c.textContent = `${s.idx + 1} von ${s.matches.length}${s.done ? '' : '+'}`;
}
function searchStep(d) {
  const s = S.search;
  if (!s.matches.length) { if (el.searchInput.value.trim() !== s.q) runSearch(el.searchInput.value.trim()); return; }
  const prev = s.matches[s.idx];
  s.idx = (s.idx + d + s.matches.length) % s.matches.length;
  if (prev && prev.page !== s.matches[s.idx].page) applyHighlights(S.pages[prev.page - 1]);
  showMatch();
}
async function showMatch() {
  const s = S.search;
  const m = s.matches[s.idx];
  if (!m) return;
  updateSearchCount();
  const p = S.pages[m.page - 1];
  applyHighlights(p);
  const t = S.texts[m.page];
  let k = 0;
  while (k + 1 < t.starts.length && t.starts[k + 1] <= m.start) k++;
  const tr = t.tr[k];
  const page = await getPage(m.page);
  const vp = page.getViewport({ scale: S.zoom * CSS_UNITS, rotation: (page.rotate + S.rotation) % 360 });
  const [x, y] = vp.convertToViewportPoint(tr[4], tr[5]);
  const sc = el.scroller;
  const absY = p.top + y, absX = p.el.offsetLeft + x;
  const visTop = sc.scrollTop + topInset() + 70, visBot = sc.scrollTop + sc.clientHeight - bottomInset() - 60;
  S.quietScroll = performance.now() + 150;
  if (absY < visTop || absY > visBot) sc.scrollTop = absY - sc.clientHeight * 0.38;
  if (p.cw + 36 > sc.clientWidth && (absX < sc.scrollLeft + 20 || absX > sc.scrollLeft + sc.clientWidth - 60)) sc.scrollLeft = absX - sc.clientWidth * 0.3;
  scheduleVisible();
}
function applyHighlights(p) {
  if (!p || !p.textReady || !p.textLayer) return;
  const divs = p.textLayer.textDivs, strs = p.textLayer.textContentItemsStr;
  if (p.hl) { for (const k of p.hl) if (divs[k]) divs[k].textContent = strs[k]; }
  p.hl = null;
  const ms = S.search.byPage.get(p.num);
  if (!ms || !ms.length) return;
  const t = S.texts[p.num];
  if (!t) return;
  const sel = S.search.matches[S.search.idx];
  const segs = new Map();
  for (const m of ms) {
    let k = 0;
    while (k + 1 < t.starts.length && t.starts[k + 1] <= m.start) k++;
    for (; k < t.starts.length && t.starts[k] < m.end; k++) {
      const a = Math.max(0, m.start - t.starts[k]);
      const b = Math.min(t.strs[k].length, m.end - t.starts[k]);
      if (b <= a) continue;
      if (!segs.has(k)) segs.set(k, []);
      segs.get(k).push([a, b, m === sel]);
    }
  }
  p.hl = [];
  for (const [k, list] of segs) {
    const div = divs[k];
    if (!div || strs[k] !== t.strs[k]) continue;
    const str = strs[k];
    list.sort((x, y) => x[0] - y[0]);
    div.textContent = '';
    let pos = 0;
    for (const [a, b, isSel] of list) {
      if (a < pos) continue;
      if (a > pos) div.append(str.slice(pos, a));
      const span = document.createElement('span');
      span.className = 'highlight' + (isSel ? ' selected' : '');
      span.textContent = str.slice(a, b);
      div.append(span);
      pos = b;
    }
    if (pos < str.length) div.append(str.slice(pos));
    p.hl.push(k);
  }
}

/* ---------------- Mobile Bedienleisten ---------------- */
function showChrome() {
  if (!S.chromeHidden) return;
  S.chromeHidden = false;
  el.viewer.classList.remove('chrome-hidden');
}
function hideChrome() {
  if (S.chromeHidden || !isMobile()) return;
  if (!el.searchbar.hidden && document.activeElement === el.searchInput) return;
  if (!el.menu.hidden) return;
  S.chromeHidden = true;
  el.viewer.classList.add('chrome-hidden');
}
let lastScrollTop = 0, pillTimer = 0, scrubTimer = 0;
function onScroll() {
  const st = el.scroller.scrollTop;
  const dy = st - lastScrollTop;
  lastScrollTop = st;
  scheduleVisible();
  if (isMobile() && performance.now() > (S.quietScroll || 0)) {
    if (dy > 6 && st > 80) hideChrome();
    else if (dy < -16) showChrome();
  }
  if (isMobile() || isCoarse) {
    el.pill.classList.add('show');
    clearTimeout(pillTimer);
    pillTimer = setTimeout(() => el.pill.classList.remove('show'), 1100);
  }
  if (isCoarse && S.num > 2) updateScrub(true);
}
function updateScrub(show) {
  const sc = el.scroller;
  const max = sc.scrollHeight - sc.clientHeight;
  const track = el.scrub.clientHeight;
  const f = max > 0 ? sc.scrollTop / max : 0;
  el.scrubThumb.style.top = (22 + f * Math.max(0, track - 44)) + 'px';
  el.scrubLabel.textContent = `${S.current} / ${S.num}`;
  if (show) {
    el.scrub.classList.add('show');
    clearTimeout(scrubTimer);
    if (!el.scrub.classList.contains('drag')) scrubTimer = setTimeout(() => el.scrub.classList.remove('show'), 1500);
  }
}
function initScrub() {
  const th = el.scrubThumb;
  let dragging = false;
  th.addEventListener('pointerdown', (e) => {
    dragging = true;
    th.setPointerCapture(e.pointerId);
    el.scrub.classList.add('drag', 'show');
    clearTimeout(scrubTimer);
    e.preventDefault();
  });
  th.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = el.scrub.getBoundingClientRect();
    const f = clamp((e.clientY - r.top - 22) / Math.max(1, r.height - 44), 0, 1);
    const sc = el.scroller;
    sc.scrollTop = f * (sc.scrollHeight - sc.clientHeight);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    el.scrub.classList.remove('drag');
    scrubTimer = setTimeout(() => el.scrub.classList.remove('show'), 1200);
  };
  th.addEventListener('pointerup', end);
  th.addEventListener('pointercancel', end);
}

/* ---------------- Touch: Pinch-Zoom, Doppeltippen, Tippen ---------------- */
function initTouch() {
  const sc = el.scroller;
  let pinch = null, tap = null, lastTap = null, singleTimer = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const mid = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
  sc.addEventListener('touchstart', (e) => {
    if (!S.doc) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      tap = null;
      const r = sc.getBoundingClientRect();
      const c = mid(e.touches);
      pinch = { d0: dist(e.touches), z0: S.zoom, ax0: c.x - r.left, ay0: c.y - r.top, r, s: 1, ax1: c.x - r.left, ay1: c.y - r.top };
      pinch.px = sc.scrollLeft + pinch.ax0;
      pinch.py = sc.scrollTop + pinch.ay0;
      el.pages.style.willChange = 'transform';
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      tap = { x: t.clientX, y: t.clientY, t: performance.now(), target: e.target };
    } else tap = null;
  }, { passive: false });
  sc.addEventListener('touchmove', (e) => {
    if (pinch && e.touches.length === 2) {
      e.preventDefault();
      const z = clamp(pinch.z0 * dist(e.touches) / pinch.d0, ZOOM_MIN, ZOOM_MAX);
      const s = z / pinch.z0;
      const c = mid(e.touches);
      pinch.s = s;
      pinch.ax1 = c.x - pinch.r.left;
      pinch.ay1 = c.y - pinch.r.top;
      const tx = pinch.ax1 + sc.scrollLeft - s * pinch.px;
      const ty = pinch.ay1 + sc.scrollTop - s * pinch.py;
      el.pages.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
    } else if (tap && e.touches.length === 1) {
      const t = e.touches[0];
      if (Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 10) tap = null;
    }
  }, { passive: false });
  const endPinch = () => {
    const p = pinch;
    pinch = null;
    el.pages.style.transform = '';
    el.pages.style.willChange = '';
    if (Math.abs(p.s - 1) > 0.01) setZoom(p.z0 * p.s, { ax0: p.ax0, ay0: p.ay0, ax1: p.ax1, ay1: p.ay1 });
  };
  sc.addEventListener('touchend', (e) => {
    if (pinch) { if (e.touches.length < 2) endPinch(); return; }
    if (!tap || e.touches.length) return;
    const now = performance.now();
    const t = tap;
    tap = null;
    if (now - t.t > 350) return;
    if (t.target.closest?.('a')) return;
    if (lastTap && now - lastTap.t < 320 && Math.hypot(t.x - lastTap.x, t.y - lastTap.y) < 40) {
      clearTimeout(singleTimer);
      lastTap = null;
      e.preventDefault();
      const r = sc.getBoundingClientRect();
      const fw = fitScale('width');
      const ax = t.x - r.left, ay = t.y - r.top;
      if (S.zoom < fw * 1.4) setZoom(Math.min(fw * 2.2, ZOOM_MAX), { ax0: ax, ay0: ay });
      else setZoom(fw, { mode: 'width', ax0: ax, ay0: ay });
      return;
    }
    lastTap = { x: t.x, y: t.y, t: now };
    clearTimeout(singleTimer);
    singleTimer = setTimeout(() => {
      lastTap = null;
      if (String(window.getSelection?.() || '').length) return;
      if (!isMobile()) return;
      S.chromeHidden ? showChrome() : hideChrome();
    }, 300);
  }, { passive: false });
  sc.addEventListener('touchcancel', () => { if (pinch) endPinch(); tap = null; });

  // Strg/Trackpad-Zoom
  sc.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey) || !S.doc) return;
    e.preventDefault();
    const r = sc.getBoundingClientRect();
    const k = e.deltaMode === 1 ? 0.06 : 0.0028;
    const f = Math.exp(-clamp(e.deltaY, -120, 120) * k);
    setZoom(S.zoom * f, { ax0: e.clientX - r.left, ay0: e.clientY - r.top });
  }, { passive: false });
  // Safari (macOS) Gesten
  let g0 = null;
  const gs = (e) => { e.preventDefault(); if (!isCoarse && S.doc) g0 = { z: S.zoom, x: e.clientX, y: e.clientY }; };
  const gc = (e) => {
    e.preventDefault();
    if (!g0) return;
    const r = sc.getBoundingClientRect();
    setZoom(g0.z * e.scale, { ax0: g0.x - r.left, ay0: g0.y - r.top });
  };
  document.addEventListener('gesturestart', gs, { passive: false });
  document.addEventListener('gesturechange', gc, { passive: false });
  document.addEventListener('gestureend', (e) => { e.preventDefault(); g0 = null; }, { passive: false });
}

/* ---------------- Menü ---------------- */
function openMenu() {
  const m = el.menu;
  const shareOk = !!(navigator.canShare && navigator.share);
  $('menuShare').hidden = !shareOk;
  m.querySelector('[data-act=fullscreen]').hidden = !document.fullscreenEnabled;
  applyRead();
  m.hidden = false;
  el.menuScrim.hidden = false;
  $('menuBtn').setAttribute('aria-expanded', 'true');
  if (!isMobile()) {
    const r = $('menuBtn').getBoundingClientRect();
    m.style.top = r.bottom + 6 + 'px';
    m.style.right = Math.max(8, innerWidth - r.right) + 'px';
  } else { m.style.top = ''; m.style.right = ''; }
  m.querySelector('button:not([hidden])')?.focus({ preventScroll: true });
}
function closeMenu() {
  if (el.menu.hidden) return;
  el.menu.hidden = true;
  el.menuScrim.hidden = true;
  $('menuBtn').setAttribute('aria-expanded', 'false');
}
function menuAction(act) {
  closeMenu();
  switch (act) {
    case 'fit-width': setZoomMode('width', { top: true }); break;
    case 'fit-page': setZoomMode('page'); scrollToPage(S.current); break;
    case 'rotate': rotate(90); break;
    case 'present': openPresent(); break;
    case 'fullscreen': toggleFullscreen(); break;
    case 'goto': openGoto(); break;
    case 'print': printDoc(); break;
    case 'download': download(); break;
    case 'share': shareDoc(); break;
    case 'open': el.fileInput.click(); break;
    case 'info': showInfo(); break;
    case 'theme': toggleTheme(); break;
    case 'keys': $('keysDlg').showModal(); break;
    case 'about': openAbout(); break;
  }
}
function openAbout() { $('appVersion').textContent = APP_VERSION; $('aboutDlg').showModal(); }

function openGoto() {
  if (!S.doc) return;
  const dlg = $('gotoDlg');
  const inp = $('gotoInput');
  inp.value = S.current;
  dlg.returnValue = '';
  dlg.onclose = () => { if (dlg.returnValue === 'ok' && inp.value) scrollToPage(+inp.value); };
  dlg.showModal();
  setTimeout(() => { inp.focus(); inp.select(); }, 30);
}

function toggleFullscreen() {
  if (!document.fullscreenEnabled) { toast('Vollbild wird von diesem Browser nicht unterstützt.'); return; }
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

/* ---------------- Präsentation ---------------- */
const PR = { open: false, n: 1, cache: new Map(), idleTimer: 0, token: 0, fs: false };
async function openPresent() {
  if (!S.doc || PR.open) return;
  PR.open = true;
  PR.n = S.current;
  PR.cache.clear();
  el.present.hidden = false;
  history.pushState({ lpdf: 'present' }, '');
  PR.fs = false;
  if (document.fullscreenEnabled && !document.fullscreenElement) {
    try { await el.present.requestFullscreen(); PR.fs = true; } catch {}
  }
  presentWake();
  showPresentPage();
}
function closePresent() {
  if (history.state?.lpdf === 'present') history.back();
  else closePresentNow();
}
function closePresentNow() {
  if (!PR.open) return;
  PR.open = false;
  PR.token++;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  el.present.hidden = true;
  el.presentStage.replaceChildren();
  for (const c of PR.cache.values()) { c.width = 0; c.height = 0; }
  PR.cache.clear();
  scrollToPage(PR.n);
}
async function presentCanvas(n) {
  const key = `${n}:${innerWidth}x${innerHeight}:${S.rotation}`;
  if (PR.cache.has(key)) return PR.cache.get(key);
  const page = await getPage(n);
  const rot = (page.rotate + S.rotation) % 360;
  const v1 = page.getViewport({ scale: 1, rotation: rot });
  const W = el.present.clientWidth || innerWidth, H = el.present.clientHeight || innerHeight;
  const scale = Math.min(W / v1.width, H / v1.height);
  const vp = page.getViewport({ scale, rotation: rot });
  let os = dpr();
  if (vp.width * vp.height * os * os > MAX_CANVAS_PIXELS) os = Math.sqrt(MAX_CANVAS_PIXELS / (vp.width * vp.height));
  const c = document.createElement('canvas');
  c.width = Math.floor(vp.width * os); c.height = Math.floor(vp.height * os);
  c.style.width = Math.floor(vp.width) + 'px'; c.style.height = Math.floor(vp.height) + 'px';
  await page.render({ canvasContext: c.getContext('2d', { alpha: false }), viewport: vp, transform: os !== 1 ? [os, 0, 0, os, 0, 0] : null }).promise;
  PR.cache.set(key, c);
  if (PR.cache.size > 4) {
    const k0 = PR.cache.keys().next().value;
    const old = PR.cache.get(k0);
    if (old !== c && !old.isConnected) { old.width = 0; old.height = 0; }
    PR.cache.delete(k0);
  }
  return c;
}
async function showPresentPage() {
  const token = ++PR.token;
  el.presentCount.textContent = `${PR.n} / ${S.num}`;
  try {
    const c = await presentCanvas(PR.n);
    if (token !== PR.token || !PR.open) return;
    el.presentStage.replaceChildren(c);
    if (PR.n < S.num) presentCanvas(PR.n + 1).catch(() => {});
  } catch (e) { if (!isCancel(e)) console.warn(e); }
}
function presentGo(d) {
  const n = clamp(PR.n + d, 1, S.num);
  if (n === PR.n) return;
  PR.n = n;
  showPresentPage();
}
function presentWake() {
  el.present.classList.remove('idle');
  clearTimeout(PR.idleTimer);
  PR.idleTimer = setTimeout(() => el.present.classList.add('idle'), 2500);
}
function initPresent() {
  const pr = el.present;
  let sx = 0, sy = 0, st = 0;
  pr.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); });
  pr.addEventListener('pointerup', (e) => {
    if (e.target.closest('.present-ui')) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { presentGo(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && performance.now() - st < 500) {
      const w = pr.clientWidth;
      if (e.clientX > w * 0.66) presentGo(1);
      else if (e.clientX < w * 0.33) presentGo(-1);
      else { pr.classList.contains('idle') ? presentWake() : pr.classList.add('idle'); return; }
    }
    presentWake();
  });
  pr.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') presentWake(); });
  $('presentPrev').onclick = () => { presentGo(-1); presentWake(); };
  $('presentNext').onclick = () => { presentGo(1); presentWake(); };
  $('presentClose').onclick = closePresent;
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && PR.open && PR.fs) { PR.fs = false; closePresent(); }
  });
  let rt = 0;
  addEventListener('resize', () => {
    if (!PR.open) return;
    clearTimeout(rt);
    rt = setTimeout(() => { PR.cache.clear(); showPresentPage(); }, 150);
  });
}

/* ---------------- Drucken / Speichern / Teilen ---------------- */
let printUrls = [];
function clearPrintArea() {
  el.printArea.replaceChildren();
  printUrls.forEach((u) => URL.revokeObjectURL(u));
  printUrls = [];
}
async function printDoc() {
  if (!S.doc) return;
  clearPrintArea();
  const dlg = $('printDlg');
  let cancelled = false, done = false;
  dlg.returnValue = '';
  dlg.onclose = () => { if (!done) cancelled = true; };
  dlg.showModal();
  const N = S.num;
  const type = N > 30 ? 'image/jpeg' : 'image/png';
  const imgs = [];
  for (let n = 1; n <= N; n++) {
    if (cancelled || !S.doc) { clearPrintArea(); return; }
    $('printText').textContent = `Seite ${n} von ${N}`;
    $('printBar').style.width = (n / N * 100) + '%';
    try {
      const page = await getPage(n);
      const rot = (page.rotate + S.rotation) % 360;
      let vp = page.getViewport({ scale: 150 / 72, rotation: rot });
      const lim = 4000 * 4000;
      if (vp.width * vp.height > lim) vp = page.getViewport({ scale: 150 / 72 * Math.sqrt(lim / (vp.width * vp.height)), rotation: rot });
      const c = document.createElement('canvas');
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      const ctx = c.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'print', annotationMode: pdfjsLib.AnnotationMode.ENABLE_STORAGE }).promise;
      const blob = await canvasToBlob(c, type, 0.92);
      c.width = 0; c.height = 0;
      const url = URL.createObjectURL(blob);
      printUrls.push(url);
      const img = new Image();
      img.alt = '';
      img.src = url;
      imgs.push(img);
    } catch (e) { console.warn('Druck', e); }
  }
  el.printArea.append(...imgs);
  await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
  done = true;
  dlg.close();
  await sleep(60);
  window.print();
}
function download() {
  if (!S.blob) return;
  const url = URL.createObjectURL(S.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = /\.pdf$/i.test(S.name) ? S.name : S.name + '.pdf';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
async function shareDoc() {
  if (!S.blob) return;
  const file = new File([S.blob], /\.pdf$/i.test(S.name) ? S.name : S.name + '.pdf', { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: S.name }); }
    catch (e) { if (e.name !== 'AbortError') toast('Teilen ist fehlgeschlagen.'); }
  } else {
    toast('Teilen wird hier nicht unterstützt – die Datei wird gespeichert.');
    download();
  }
}
async function showInfo() {
  if (!S.doc) return;
  let md = {};
  try { md = await S.doc.getMetadata(); } catch {}
  const info = md.info || {};
  const date = (s) => { try { const d = pdfjsLib.PDFDateString.toDateObject(s); return d ? d.toLocaleString('de-DE') : ''; } catch { return ''; } };
  const page = await getPage(S.current);
  const v = page.getViewport({ scale: 1 });
  const mm = (pt) => Math.round(pt / 72 * 25.4);
  const rows = [
    ['Datei', S.name], ['Größe', fmtSize(S.blob.size)], ['Seiten', String(S.num)],
    ['Seitenformat', `${mm(v.width)} × ${mm(v.height)} mm`],
    ['Titel', info.Title], ['Autor', info.Author], ['Thema', info.Subject],
    ['Erstellt', date(info.CreationDate)], ['Geändert', date(info.ModDate)],
    ['Anwendung', info.Creator], ['PDF-Erzeuger', info.Producer], ['PDF-Version', info.PDFFormatVersion],
  ];
  const dl = $('infoList');
  dl.replaceChildren();
  for (const [k, val] of rows) {
    if (!val) continue;
    dl.append(Object.assign(document.createElement('dt'), { textContent: k }), Object.assign(document.createElement('dd'), { textContent: val }));
  }
  $('infoDlg').showModal();
}

/* ---------------- Verlauf ---------------- */
async function makeThumbBlob() {
  const page = await getPage(1);
  const v1 = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: 300 / v1.width });
  const c = document.createElement('canvas');
  c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
  const ctx = c.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  let b = await canvasToBlob(c, 'image/webp', 0.82);
  if (!b || b.type !== 'image/webp') b = await canvasToBlob(c, 'image/jpeg', 0.85);
  c.width = 0;
  return b;
}
async function saveRecent(existing) {
  const id = S.id, token = S.token;
  try { await openDB(); } catch { return; }
  await sleep(400);
  if (token !== S.token) return;
  let thumb = existing?.thumb;
  if (!thumb) { try { thumb = await makeThumbBlob(); } catch {} }
  if (token !== S.token) return;
  const rec = { id, name: S.name, size: S.blob.size, pages: S.num, lastPage: S.current, openedAt: Date.now(), thumb, stored: existing?.stored ?? false };
  if (!rec.stored) {
    try { await idb.put('data', { id, blob: S.blob }); rec.stored = true; }
    catch (e) { console.warn('Datei konnte nicht lokal gespeichert werden', e); }
  }
  await idb.put('meta', rec);
  try { navigator.storage?.persist?.(); } catch {}
  const all = (await idb.all('meta')).sort((a, b) => b.openedAt - a.openedAt);
  for (const r of all.slice(MAX_RECENTS)) { await idb.del('meta', r.id); await idb.del('data', r.id); }
}
async function saveLastPage() {
  if (!S.doc || !S.id) return;
  try {
    const m = await idb.get('meta', S.id);
    if (m && m.lastPage !== S.current) { m.lastPage = S.current; await idb.put('meta', m); }
  } catch {}
}
let recentUrls = [];
async function renderRecents() {
  let metas = [];
  try { metas = await idb.all('meta'); } catch {}
  recentUrls.forEach((u) => URL.revokeObjectURL(u));
  recentUrls = [];
  metas.sort((a, b) => b.openedAt - a.openedAt);
  $('recents').hidden = !metas.length;
  el.home.classList.toggle('has-recents', metas.length > 0);
  const list = $('recentList');
  list.replaceChildren();
  for (const m of metas) {
    const li = document.createElement('li');
    li.className = 'recent';
    const open = document.createElement('button');
    open.className = 'r-open';
    open.setAttribute('aria-label', `${m.name} öffnen`);
    const th = document.createElement('div');
    th.className = 'r-thumb';
    if (m.thumb) {
      const u = URL.createObjectURL(m.thumb);
      recentUrls.push(u);
      const img = new Image();
      img.src = u; img.alt = ''; img.loading = 'lazy';
      th.append(img);
    } else th.innerHTML = '<svg class="ic"><use href="#i-file"/></svg>';
    const body = document.createElement('div');
    body.className = 'r-body';
    const name = document.createElement('div');
    name.className = 'r-name';
    name.textContent = m.name.replace(/\.pdf$/i, '');
    const meta = document.createElement('div');
    meta.className = 'r-meta';
    meta.textContent = `S. ${m.lastPage || 1}/${m.pages} · ${fmtAgo(m.openedAt)}`;
    meta.title = `${fmtSize(m.size)} · zuletzt ${new Date(m.openedAt).toLocaleString('de-DE')}`;
    const bar = document.createElement('div');
    bar.className = 'r-bar';
    bar.innerHTML = `<i style="width:${Math.round(((m.lastPage || 1) / (m.pages || 1)) * 100)}%"></i>`;
    body.append(name, meta, bar);
    open.append(th, body);
    open.onclick = () => openRecent(m);
    const del = document.createElement('button');
    del.className = 'r-del';
    del.setAttribute('aria-label', `„${m.name}“ aus dem Verlauf entfernen`);
    del.title = 'Aus Verlauf entfernen';
    del.innerHTML = '<svg class="ic"><use href="#i-x"/></svg>';
    del.onclick = async () => {
      try { await idb.del('meta', m.id); await idb.del('data', m.id); } catch {}
      renderRecents();
      toast('Aus dem Verlauf entfernt.', { ms: 1800 });
    };
    li.append(open, del);
    list.append(li);
  }
}
async function openRecent(m) {
  let d = null;
  try { d = await idb.get('data', m.id); } catch {}
  if (!d?.blob) {
    toast('Diese Datei ist nicht mehr gespeichert. Bitte erneut öffnen.');
    try { await idb.del('meta', m.id); } catch {}
    renderRecents();
    return;
  }
  openBlob(d.blob, m.name);
}

/* ---------------- Tastatur ---------------- */
function onKey(e) {
  const k = e.key;
  const mod = e.ctrlKey || e.metaKey;
  if (PR.open) {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'j', 'n'].includes(k)) { e.preventDefault(); presentGo(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'k', 'p'].includes(k)) { e.preventDefault(); presentGo(-1); }
    else if (k === 'Home') presentGo(-S.num);
    else if (k === 'End') presentGo(S.num);
    else if (k === 'Escape') { e.preventDefault(); closePresent(); }
    return;
  }
  if (mod && k.toLowerCase() === 'o') { e.preventDefault(); el.fileInput.click(); return; }
  if (document.querySelector('dialog[open]')) return;
  if (!S.doc || el.viewer.hidden) return;
  if (!el.menu.hidden) {
    if (k === 'Escape') { closeMenu(); $('menuBtn').focus(); return; }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      const items = [...el.menu.querySelectorAll('button:not([hidden])')].filter((b) => b.offsetParent);
      const i = items.indexOf(document.activeElement);
      items[(i + (k === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
    return;
  }
  const inInput = e.target.matches?.('input,select,textarea');
  const lk = k.length === 1 ? k.toLowerCase() : k;
  if (mod) {
    if (lk === 'f') { e.preventDefault(); openSearch(); }
    else if (lk === 'g') { e.preventDefault(); openGoto(); }
    else if (lk === 'p') { e.preventDefault(); printDoc(); }
    else if (lk === 's') { e.preventDefault(); download(); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomStep(1); }
    else if (k === '-') { e.preventDefault(); zoomStep(-1); }
    else if (k === '0') { e.preventDefault(); setZoomMode('auto'); }
    return;
  }
  if (k === 'Escape') {
    if (!el.searchbar.hidden) { closeSearch(); return; }
    if (isMobile() && el.viewer.classList.contains('sb-open')) { closeSidebar(); return; }
    return;
  }
  if (inInput || e.altKey) return;
  const sc = el.scroller;
  const hasH = sc.scrollWidth > sc.clientWidth + 2;
  switch (k) {
    case '/': e.preventDefault(); openSearch(); return;
    case 'F3': e.preventDefault(); e.shiftKey ? searchStep(-1) : searchStep(1); return;
    case 'j': case 'n': nextPage(1); return;
    case 'k': nextPage(-1); return;
    case 'ArrowRight': if (!hasH) { e.preventDefault(); nextPage(1); } return;
    case 'ArrowLeft': if (!hasH) { e.preventDefault(); nextPage(-1); } return;
    case 'Home': e.preventDefault(); scrollToPage(1); return;
    case 'End': e.preventDefault(); scrollToPage(S.num); return;
    case '+': case '=': zoomStep(1); return;
    case '-': zoomStep(-1); return;
    case '0': setZoom(1); return;
    case 'w': setZoomMode('width', { top: true }); return;
    case 'e': setZoomMode('page'); scrollToPage(S.current); return;
    case 'r': rotate(90); return;
    case 'R': rotate(-90); return;
    case 's': toggleSidebar(); return;
    case 'd': toggleNight(); return;
    case 'p': openPresent(); return;
    case 'f': toggleFullscreen(); return;
    case '?': $('keysDlg').showModal(); return;
  }
  if (e.target === document.body || e.target === el.viewer) {
    const H = sc.clientHeight - topInset() - bottomInset();
    if (k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); sc.scrollBy(0, H * 0.9); }
    else if (k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); sc.scrollBy(0, -H * 0.9); }
    else if (k === 'ArrowDown') { e.preventDefault(); sc.scrollBy(0, 60); }
    else if (k === 'ArrowUp') { e.preventDefault(); sc.scrollBy(0, -60); }
  }
}

/* ---------------- Datei-Eingänge ---------------- */
function initFileInputs() {
  const pick = () => el.fileInput.click();
  $('openBtn').onclick = pick;
  el.fileInput.onchange = () => {
    const f = el.fileInput.files?.[0];
    el.fileInput.value = '';
    if (f) openBlob(f, f.name);
  };
  // Drag & Drop
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    el.dropOverlay.hidden = false;
    el.dropzone.classList.add('over');
  });
  addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) { el.dropOverlay.hidden = true; el.dropzone.classList.remove('over'); }
  });
  addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    el.dropOverlay.hidden = true;
    el.dropzone.classList.remove('over');
    const files = [...e.dataTransfer.files];
    const f = files.find((x) => /\.pdf$/i.test(x.name) || x.type === 'application/pdf') || files[0];
    if (!f) return;
    if (!looksLikePdf(f)) { toast('Bitte eine PDF-Datei ablegen.'); return; }
    openBlob(f, f.name);
  });
  // Datei-Handler (installierte App unter Windows/ChromeOS)
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (params) => {
      const h = params.files?.[0];
      if (!h) return;
      try { const f = await h.getFile(); openBlob(f, f.name); } catch (e) { toast('Datei konnte nicht geöffnet werden.'); }
    });
  }
}
async function handleShareLaunch() {
  const q = new URLSearchParams(location.search);
  if (!q.has('share')) return;
  history.replaceState(null, '', location.pathname);
  if (q.get('share') === 'error') { toast('Die geteilte Datei konnte nicht empfangen werden.'); return; }
  try {
    const c = await caches.open(SHARE_CACHE);
    const r = await c.match(SHARE_KEY);
    if (!r) { toast('Keine geteilte PDF gefunden.'); return; }
    const name = decodeURIComponent(r.headers.get('X-Filename') || 'Geteilt.pdf');
    const blob = await r.blob();
    await c.delete(SHARE_KEY);
    openBlob(blob, name);
  } catch (e) { console.warn(e); toast('Die geteilte Datei konnte nicht geöffnet werden.'); }
}

/* ---------------- PWA ---------------- */
function initPWA() {
  if ('serviceWorker' in navigator) {
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch((e) => console.warn('SW', e));
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (had) toast('Lewolux PDF wurde aktualisiert.', { action: 'Neu laden', fn: () => location.reload(), ms: 8000 });
      had = true;
    });
  }
  let deferred = null;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    $('installBtn').hidden = false;
  });
  $('installBtn').onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    deferred = null;
    $('installBtn').hidden = true;
  };
  addEventListener('appinstalled', () => { $('installBtn').hidden = true; toast('App installiert – viel Spaß!'); });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (ios && !standalone) $('iosHint').hidden = false;
}

/* ---------------- Verdrahtung ---------------- */
function wire() {
  $('closeDocBtn').onclick = closeDoc;
  $('sidebarBtn').onclick = toggleSidebar;
  $('bbSidebarBtn').onclick = toggleSidebar;
  $('sidebarCloseBtn').onclick = closeSidebar;
  el.scrim.onclick = closeSidebar;
  $('tabThumbs').onclick = () => selectTab('thumbs');
  $('tabOutline').onclick = () => selectTab('outline');
  el.thumbs.addEventListener('click', (e) => {
    const t = e.target.closest('.thumb');
    if (!t) return;
    S.thumbClickNav = true;
    scrollToPage(+t.dataset.page);
    S.thumbClickNav = false;
    if (isMobile()) closeSidebar();
  });
  $('prevBtn').onclick = () => nextPage(-1);
  $('nextBtn').onclick = () => nextPage(1);
  el.pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { scrollToPage(parseInt(el.pageInput.value, 10)); el.pageInput.blur(); }
    if (e.key === 'Escape') { el.pageInput.value = S.current; el.pageInput.blur(); }
  });
  el.pageInput.addEventListener('focus', () => el.pageInput.select());
  el.pageInput.addEventListener('blur', () => { el.pageInput.value = S.current; });
  $('zoomInBtn').onclick = () => zoomStep(1);
  $('zoomOutBtn').onclick = () => zoomStep(-1);
  $('bbZoomInBtn').onclick = () => zoomStep(1);
  $('bbZoomOutBtn').onclick = () => zoomStep(-1);
  el.zoomSelect.onchange = () => {
    const v = el.zoomSelect.value;
    if (v === 'custom') return;
    if (isNaN(+v)) { setZoomMode(v, { top: v === 'width' }); if (v === 'page') scrollToPage(S.current); }
    else setZoom(+v);
    el.scroller.focus({ preventScroll: true });
  };
  $('bbPageBtn').onclick = openGoto;
  $('rotateBtn').onclick = () => rotate(90);
  $('presentBtn').onclick = openPresent;
  $('printBtn').onclick = printDoc;
  $('downloadBtn').onclick = download;
  $('searchBtn').onclick = () => (el.searchbar.hidden ? openSearch() : closeSearch());
  $('nightBtn').onclick = toggleNight;
  $('bbNightBtn').onclick = toggleNight;
  $('menuBtn').onclick = () => (el.menu.hidden ? openMenu() : closeMenu());
  el.menuScrim.onclick = closeMenu;
  el.menu.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.read) { closeMenu(); setRead(b.dataset.read); return; }
    if (b.dataset.act) menuAction(b.dataset.act);
  });
  el.searchInput.addEventListener('input', onSearchInput);
  el.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = el.searchInput.value.trim();
      if (q !== S.search.q) { clearTimeout(searchDebounce); runSearch(q); }
      else searchStep(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
  });
  $('searchNextBtn').onclick = () => searchStep(1);
  $('searchPrevBtn').onclick = () => searchStep(-1);
  $('searchCloseBtn').onclick = () => closeSearch();
  $('homeThemeBtn').onclick = toggleTheme;
  $('homeAboutBtn').onclick = openAbout;
  $('homeAboutLink').onclick = openAbout;
  $('clearRecentsBtn').onclick = async () => {
    if (!confirm('Verlauf wirklich leeren? Die gespeicherten Kopien werden von diesem Gerät gelöscht.')) return;
    try { await idb.clear('meta'); await idb.clear('data'); } catch {}
    renderRecents();
  };
  el.scroller.addEventListener('scroll', onScroll, { passive: true });
  new ResizeObserver(() => {
    if (!S.doc || !S.pages.length) return;
    if (S.mode !== 'custom') {
      const z = fitScale(S.mode);
      if (Math.abs(z - S.zoom) > 0.002) setZoom(z, { mode: S.mode, top: true });
    }
    scheduleVisible();
  }).observe(el.scroller);
  mqMobile.addEventListener?.('change', () => {
    showChrome();
    el.scrim.hidden = true;
    if (isMobile()) el.viewer.classList.remove('sb-open');
    else if (prefs.sidebar && S.doc) el.viewer.classList.add('sb-open');
  });
  document.addEventListener('keydown', onKey);
  addEventListener('popstate', (e) => {
    const st = e.state?.lpdf;
    if (PR.open && st !== 'present') { closePresentNow(); return; }
    if (!el.viewer.hidden && st !== 'doc' && st !== 'present') closeDocNow();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveLastPage(); });
  addEventListener('pagehide', saveLastPage);
  // iOS: Browser-Zoom im Betrachter unterbinden
  el.viewer.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}

applyTheme();
applyRead();
wire();
initTouch();
initScrub();
initPresent();
initFileInputs();
initPWA();
renderRecents();
handleShareLaunch();

// Für Tests/Debugging
window.__lpdf = { S, openBlob, setZoom, scrollToPage, runSearch, rotate };
