// Fahrer, Fahrzeuge und ihre 3D-Modelle (Comic-Look: Toon-Licht + Umrisslinie, abgerundete Formen)
import * as THREE from './three.module.min.js';
import { RoundedBoxGeometry } from './jsm/geometries/RoundedBoxGeometry.js';

export const DRIVERS = [
  { id: 'nervbert', age: '52', trait: 'Laut, lauter, Nervbert', bio: 'Der nervigste Onkel der Welt hat seinen Rasenmäher frisiert. Er erklärt dir beim Überholen, wie man richtig grillt, und hupt dabei ununterbrochen.', name: 'Nervbert', from: 'Nervbert', ride: 'Turbo-Rasenmäher', icon: '🧔', color: '#ff5a3c', pitch: 0.8,
    st: { speed: 5, accel: 2, handling: 2, weight: 5 },
    say: { start: 'Platz da, Onkel kommt!', hit: 'Hehe, Pech gehabt!', ouch: 'Mein frisch gemähter Rasen!', pass: 'Tschüssikowski!', win: 'Ich hab’s euch ja gesagt!', item: 'Na, was haben wir denn da?' } },
  { id: 'kritzel', age: '8 (Eulenjahre)', trait: 'Federleicht und wendig', bio: 'Die schlaue Eule aus Kritzelheld sammelt sonst verlorene Federn. Auf ihrem Federroller schlängelt sie sich durch jede Kurve und verteilt Fleißsterne an sich selbst.', name: 'Kritzel', from: 'Kritzelheld', ride: 'Federroller', icon: '🦉', color: '#5fb6ff', pitch: 1.6,
    st: { speed: 2, accel: 5, handling: 5, weight: 1 },
    say: { start: 'Huhu, los geht’s!', hit: 'Federleicht getroffen!', ouch: 'Huch, meine Federn!', pass: 'Schuhu und weg!', win: 'Ein Fleißstern für mich!', item: 'Oh, ein Geschenk!' } },
  { id: 'pandi', age: '6', trait: 'Gemütlich, aber gefährlich', bio: 'Pandi nimmt seine Badewanne überallhin mit. Mit Schaum, Bambus-Turbo und Quietscheente rutscht er durch die Kurven, als wäre die Strecke ein Schaumbad.', name: 'Pandi', from: 'Pandi', ride: 'Blubber-Badewanne', icon: '🐼', color: '#f2f2f2', pitch: 1.35,
    st: { speed: 3, accel: 4, handling: 3, weight: 3 },
    say: { start: 'Bambus-Turbo an!', hit: 'Blubb, erwischt!', ouch: 'Mein Badeschaum!', pass: 'Platsch, vorbei!', win: 'Pandi gewinnt, juhu!', item: 'Blubb blubb!' } },
  { id: 'lux', age: '12', trait: 'König der Strecke', bio: 'Der Löwe von Lewolux und Gesicht des Studios. Lux liebt seine Mähne fast so sehr wie das Gewinnen. Sein Neon-Flitzer ist schnell, schick und ein bisschen eitel.', name: 'Lux', from: 'Lewolux', ride: 'Neon-Flitzer', icon: '🦁', color: '#a24bff', pitch: 0.95,
    st: { speed: 5, accel: 3, handling: 3, weight: 4 },
    say: { start: 'Zeit für Glanz!', hit: 'Roaar, getroffen!', ouch: 'Meine Mähne!', pass: 'Neon zieht vorbei!', win: 'König der Strecke!', item: 'Das nehm ich!' } },
  { id: 'kicker', age: '10', trait: 'Kurven wie ein Flankenlauf', bio: 'Das Kicker-Kid vom Schulhof schießt sonst Bälle bis ins Wolkenland. Im Bolzplatz-Buggy fährt es genauso: volles Risiko, Ball immer dabei.', name: 'Kicker-Kid', from: 'Schulhofkicker', ride: 'Bolzplatz-Buggy', icon: '⚽', color: '#3ad46a', pitch: 1.25,
    st: { speed: 3, accel: 5, handling: 4, weight: 2 },
    say: { start: 'Anstoß!', hit: 'Tooor!', ouch: 'Foul! Das war Foul!', pass: 'Doppelpass und weg!', win: 'Der Pokal gehört mir!', item: 'Zuspiel!' } },
  { id: 'sonni', age: '34', trait: 'Kennt jede Düne', bio: 'Sonni lebt am Rand der großen Wüste und hat schon jeden Sandsturm überlebt. Sein Dünen-Buggy verzeiht viel und lässt sich auch von Hitze nicht stoppen.', name: 'Sonni', from: 'House in the Desert', ride: 'Dünen-Buggy', icon: '🤠', color: '#ffb23c', pitch: 1.1,
    st: { speed: 4, accel: 3, handling: 4, weight: 3 },
    say: { start: 'Sonnencreme drauf und los!', hit: 'Volltreffer!', ouch: 'Mein Hut! Mein Hut!', pass: 'Heiß, heißer, Sonni!', win: 'Sonnenschein-Sieg!', item: 'Ein Fundstück!' } },
  { id: 'berta', age: '67', trait: 'Hat immer ein Wahlplakat dabei', bio: 'Die Bürgermeisterin von Lindenbrück will die nächste Wahl gewinnen und dieses Rennen gleich mit. Ihr Rathaus-Cabrio ist schwer, solide und mit Fahnen geschmückt.', name: 'Bürgermeisterin Berta', short: 'Berta', from: 'Mandat', ride: 'Rathaus-Cabrio', icon: '👵', color: '#2a5ad6', pitch: 1.05,
    st: { speed: 4, accel: 2, handling: 3, weight: 5 },
    say: { start: 'Die Sitzung ist eröffnet!', hit: 'Antrag abgelehnt!', ouch: 'Das gibt eine Beschwerde!', pass: 'Vorfahrt fürs Rathaus!', win: 'Einstimmig gewonnen!', item: 'Wird sofort beschlossen!' } },
  { id: 'brecher', age: '29', trait: 'Das Schwergewicht', bio: 'Der Champion aus Ring Legends zieht sein Ring-Raser-Kart wie einen Einmarsch auf. Wer ihn rammt, prallt meistens selbst ab.', name: 'Brecher', from: 'Ring Legends', ride: 'Ring-Raser', icon: '🤼', color: '#e52a2a', pitch: 0.7,
    st: { speed: 5, accel: 2, handling: 2, weight: 6 },
    say: { start: 'Ding ding ding!', hit: 'Bodyslam!', ouch: 'Das war unfair, Schiri!', pass: 'Aus dem Weg, Champion kommt!', win: 'Der Gürtel bleibt bei mir!', item: 'Jetzt wird’s wild!' } },
  { id: 'elara', age: '312 (Elfenjahre)', trait: 'Schwebt über allem', bio: 'Die Ratgeberin aus Goldhafen hat Idle Legenden für einen Ausflug verlassen. Ihr Kristall-Gleiter schwebt knapp über der Strecke und glitzert bei jedem Turbo.', name: 'Elara', from: 'Idle Legenden', ride: 'Kristall-Gleiter', icon: '🧝', color: '#b36bff', pitch: 1.45,
    st: { speed: 3, accel: 4, handling: 5, weight: 2 },
    say: { start: 'Magie, entfache dich!', hit: 'Zauber trifft!', ouch: 'Mein Umhang!', pass: 'Schneller als ein Zauberspruch!', win: 'Eine Legende ist geboren!', item: 'Ein magischer Fund!' } },
  { id: 'karl', age: '41', trait: 'Nie ohne Tablett', bio: 'Kellner Karl hat genug vom vollen Restaurant und rast jetzt im Turbo-Einkaufswagen. Das Tablett balanciert er dabei immer noch, ohne einen Tropfen zu verschütten.', name: 'Kellner Karl', short: 'Karl', from: 'Kasse oder Zettel', ride: 'Turbo-Einkaufswagen', icon: '🤵', color: '#3ad4c0', pitch: 1.0,
    st: { speed: 3, accel: 5, handling: 4, weight: 2 },
    say: { start: 'Ihre Bestellung kommt sofort!', hit: 'Die Rechnung, bitte!', ouch: 'Mein Tablett!', pass: 'Bitte Platz machen, heiß und fettig!', win: 'Stimmt so!', item: 'Mit Bon, bitte!' } },
  { id: 'goldfuchs', age: '??', trait: 'Das Geheimnis', bio: 'Niemand weiß, woher der Goldfuchs kommt. Er taucht nur bei Champions auf, die einen ganzen Grand Prix gewonnen haben.', name: 'Goldfuchs', from: 'Lewolux-Geheimnis', ride: 'Goldflitzer', icon: '🦊', color: '#ffc928', pitch: 1.2, locked: true,
    st: { speed: 4, accel: 4, handling: 4, weight: 2 },
    say: { start: 'Schlau gewinnt!', hit: 'Ausgefuchst!', ouch: 'Mein goldenes Fell!', pass: 'Fuchsschnell vorbei!', win: 'Gold gehört mir!', item: 'Ein Schatz!' } },
];

// ---------- Materialien ----------
const grad = (() => { const d = new Uint8Array([70, 150, 215, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = new Map();
export function toon(color, emissive, map) {
  const k = color + '|' + (emissive || 0) + '|' + (map ? map.uuid : '');
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: map ? (color || 0xffffff) : color, gradientMap: grad, emissive: emissive || 0, map: map || null }));
  return mats.get(k);
}
const glowMats = new Map();
export const glow = c => { if (!glowMats.has(c)) glowMats.set(c, new THREE.MeshBasicMaterial({ color: c })); return glowMats.get(c); };
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x150a24, side: THREE.BackSide });
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// ---------- Bausteine ----------
const gcache = new Map();
const G = (k, f) => { if (!gcache.has(k)) gcache.set(k, f()); return gcache.get(k); };
const RB = (w, h, d, r = 0.12) => G(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w/2 - 0.01, h/2 - 0.01, d/2 - 0.01)));
const S = (r, ws = 20, hs = 14) => G(`s${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
const C = (r1, r2, h, n = 18) => G(`c${r1},${r2},${h},${n}`, () => new THREE.CylinderGeometry(r1, r2, h, n));
const TOR = (r, t, a = Math.PI*2) => G(`t${r},${t},${a}`, () => new THREE.TorusGeometry(r, t, 10, 24, a));
const CONE = (r, h, n = 10) => G(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n));

let PMAP = null, WSTYLE = 'std';
function add(parent, geo, color, x, y, z, o = {}) {
  if (PMAP && PMAP.has(color)) { const c = PMAP.get(color); color = c.c; if (c.em && !o.em) o.em = c.em; }
  const m = new THREE.Mesh(geo, o.mat || toon(color, o.em, o.map));
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  if (o.s) m.scale.set(...o.s);
  m.castShadow = o.shadow !== false;
  parent.add(m);
  if (o.outline !== false) { const ol = new THREE.Mesh(geo, outlineMat); ol.scale.setScalar(1 + (o.ol || 0.06)); m.add(ol); }
  return m;
}
const tube = (parent, pts, r, color, o = {}) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(curve, 20, r, 8, false), color, 0, 0, 0, o);
};

// Rad: Drehgruppe (Lenkung) > Rollgruppe > Reifen + Felge + Profil
function wheel(car, x, y, z, r, w, o = {}) {
  if (WSTYLE === 'monster') { const k = 1.35; y += r*(k - 1); r *= k; w *= 1.25; o = { ...o, tire: 0x1a1414, rim: 0xff5a3c }; }
  else if (WSTYLE === 'slick') { w *= 0.8; o = { ...o, tire: 0x111111, rim: 0xdfe6f0 }; }
  else if (WSTYLE === 'glow') { o = { ...o, rim: 0x29f0ff, rimGlow: true }; }
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); car.body.add(pivot);
  const roll = new THREE.Group(); pivot.add(roll);
  add(roll, C(r, r, w, 22), o.tire || 0x1d1826, 0, 0, 0, { rz: Math.PI/2, ol: 0.05 });
  for (let i = 0; i < 10; i++) { const a = i/10*Math.PI*2; add(roll, RB(w*1.02, r*0.22, r*0.3, 0.04), o.tire || 0x1d1826, 0, Math.cos(a)*r*0.97, Math.sin(a)*r*0.97, { rx: -a, outline: false, shadow: false }); }
  for (const s of [-1, 1]) {
    add(roll, C(r*0.58, r*0.58, 0.05, 18), o.rim || 0xe8e8f0, s*w*0.5, 0, 0, { rz: Math.PI/2, outline: false, em: o.rimGlow ? o.rim : 0 });
    add(roll, C(r*0.2, r*0.2, 0.08, 10), o.hub || 0x555566, s*(w*0.5 + 0.03), 0, 0, { rz: Math.PI/2, outline: false });
    for (let i = 0; i < 5; i++) add(roll, RB(0.03, r*0.85, 0.07, 0.01), o.hub || 0x555566, s*(w*0.5 + 0.03), 0, 0, { rx: i/5*Math.PI, outline: false, shadow: false });
  }
  car.wheels.push(roll); if (o.front) car.fronts.push(pivot);
  return pivot;
}
// Lenkrad mit Händen
function steering(car, x, y, z, tilt, color = 0x222230, hands = 0xf1b48a, armFrom = null) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = tilt; car.body.add(g);
  const sw = new THREE.Group(); g.add(sw);
  add(sw, TOR(0.32, 0.05), color, 0, 0, 0, { ol: 0.12 });
  add(sw, RB(0.6, 0.06, 0.06, 0.02), color, 0, 0, 0, { outline: false });
  add(sw, C(0.1, 0.1, 0.06, 12), 0xff3fd0, 0, 0, 0.02, { rx: Math.PI/2, em: 0x661150, outline: false });
  for (const s of [-1, 1]) add(sw, S(0.12, 10, 8), hands, s*0.3, 0.02, 0.03, { ol: 0.12 });
  car.steer = sw;
  if (armFrom) for (const s of [-1, 1]) {
    const wp = new THREE.Vector3(s*0.3, 0, 0).applyEuler(g.rotation).add(g.position);
    const arm = tube(car.driver, [[s*armFrom[0], armFrom[1], armFrom[2]], [s*(armFrom[0] + 0.05), (armFrom[1] + wp.y)/2 - 0.05, (armFrom[2] + wp.z)/2], [wp.x, wp.y, wp.z]], 0.11, armFrom[3]); arm.userData.arm = true;
  }
  return sw;
}
function eyes(head, y, z, sep, size, iris = 0x2a1a0a, o = {}) {
  const out = [];
  for (const s of [-1, 1]) {
    const e = add(head, S(size, 16, 12), 0xffffff, s*sep, y, z, { ol: 0.1, s: o.s });
    const p = add(e, S(size*0.55, 12, 10), iris, 0, 0, size*0.55, { outline: false, shadow: false });
    add(p, S(size*0.3, 10, 8), 0x0a0a12, 0, 0, size*0.28, { outline: false, shadow: false });
    add(p, S(size*0.14, 8, 6), 0xffffff, size*0.15, size*0.18, size*0.4, { outline: false, shadow: false, mat: glow(0xffffff) });
    out.push(e);
  }
  return out;
}
function plate(car, icon, color, x, y, z, ry = 0) {
  const t = tex(128, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = color; g.fillRect(4, 4, w - 8, h - 8); g.font = '44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, w/2, h/2 + 3); });
  add(car.body, RB(0.7, 0.36, 0.05, 0.03), 0, x, y, z, { mat: new THREE.MeshBasicMaterial({ map: t }), ry, outline: false });
}
function underglow(car, color, w = 1.8, l = 2.8) {
  const t = tex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w*1.6, l*1.4), new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI/2; m.position.y = 0.08; car.root.add(m); car.glow = m;
}
function headlights(car, x, y, z) { for (const s of [-1, 1]) add(car.body, C(0.13, 0.13, 0.06, 14), 0, s*x, y, z, { rx: Math.PI/2, mat: glow(0xfff6d0), outline: false }); }
function exhaust(car, pts) { for (const [x, y, z] of pts) { add(car.body, C(0.1, 0.13, 0.5, 12), 0xc8c8d8, x, y, z, { rx: Math.PI/2, ol: 0.1 }); add(car.body, C(0.07, 0.07, 0.02, 10), 0x111111, x, y, z - 0.26, { rx: Math.PI/2, outline: false }); } car.exhaust = pts; }

// Muster-Texturen
const T = {};
function hawaii() { return T.h ||= tex(128, 128, (g, w, h) => { g.fillStyle = '#ff5a3c'; g.fillRect(0, 0, w, h); const cols = ['#ffe14a', '#2fd4ff', '#46e07a', '#fff', '#ff9ad0'];
  for (let i = 0; i < 26; i++) { const x = Math.random()*w, y = Math.random()*h, r = 6 + Math.random()*7; g.fillStyle = cols[i % 5]; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + Math.cos(k*1.256)*r*0.6, y + Math.sin(k*1.256)*r*0.6, r*0.55, r*0.32, k*1.256, 0, 7); g.fill(); } g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(x, y, r*0.3, 0, 7); g.fill(); }
  for (let i = 0; i < 10; i++) { g.strokeStyle = '#1f8a4a'; g.lineWidth = 4; g.beginPath(); const x = Math.random()*w, y = Math.random()*h; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 14, x + 22, y - 6); g.stroke(); } }); }
function jersey() { return T.j ||= tex(256, 128, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x/32) % 2 ? '#ffffff' : '#5fb6ff'; g.fillRect(x, 0, 32, h); }
  g.font = '900 64px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#13294a'; g.fillStyle = '#ffe14a';
  g.strokeText('10', w*0.75, h/2 + 4); g.fillText('10', w*0.75, h/2 + 4); g.strokeText('10', w*0.25, h/2 + 4); g.fillText('10', w*0.25, h/2 + 4); }); }
function pitch() { return T.p ||= tex(128, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = (y/32) % 2 ? '#2fae52' : '#3ac862'; g.fillRect(0, y, w, 32); } g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16); g.beginPath(); g.moveTo(8, h/2); g.lineTo(w - 8, h/2); g.stroke(); g.beginPath(); g.arc(w/2, h/2, 26, 0, 7); g.stroke(); }); }
function stripes(a, b, n = 8) { return T['st' + a + b] ||= tex(256, 32, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i*w/n, 0, w/n, h); } }); }
function feathers() { return T.f ||= tex(128, 128, (g, w, h) => { g.fillStyle = '#d6ecff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9ccbf2'; g.lineWidth = 3; for (let y = 10; y < h; y += 16) for (let x = (y/16 % 2)*10; x < w; x += 20) { g.beginPath(); g.arc(x, y, 9, 0.1*Math.PI, 0.9*Math.PI); g.stroke(); } }); }
function net() { return T.n ||= (() => { const t = tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 3; for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t; })(); }

// ---------- Fahrer + Fahrzeug ----------
const PALETTES = {
  nervbert: { base: [0xd8322a, 0xe8463a], p2: [0x2a6ad6, 0x3a7ae6], p3: [0x2fae52, 0x40c062], p4: [0x2a2a34, 0x3a3a46] },
  kritzel: { base: [0x2b6fd6, 0x3a8ae0], p2: [0xff5aa8, 0xff7ab8], p3: [0xffb21a, 0xffc84a], p4: [0x2fc0a0, 0x40d0b0] },
  pandi: { base: [0xf6f8ff], p2: [0xffb0d0], p3: [0xa8f0d8], p4: [0xd0b4ff] },
  lux: { base: [0x2a1a5a], p2: [0x6a0a1a], p3: [0x0a4a5a], p4: [0xe8e8f0] },
  kicker: { base: [0xffffff], p2: [0x9ab8ff], p3: [0xffb0b0], p4: [0xffe08a] },
  sonni: { base: [0xffb23c, 0xe89a2a], p2: [0x3ac8a0, 0x2ab090], p3: [0xff6a6a, 0xe85a5a], p4: [0x8a8aff, 0x7a7ae8] },
  berta: { base: [0x2a5ad6, 0x1a3a8a], p2: [0xd83a5a, 0x8a1a3a], p3: [0x2a8a5a, 0x1a5a3a], p4: [0xe8e8f0, 0xa0a0b0] },
  brecher: { base: [0xe52a2a, 0x2a2a3a], p2: [0x2a6ae5, 0x2a2a3a], p3: [0x1a1a22, 0xffc928], p4: [0x3ad46a, 0x1a1a22] },
  elara: { base: [0xb36bff, 0x6a3ab0], p2: [0x29c8f0, 0x1a6a9a], p3: [0xff6ab8, 0xa03a7a], p4: [0x6ae0a0, 0x2a8a5a] },
  karl: { base: [0x3ad4c0, 0xd0d8e0], p2: [0xff8a3c, 0xd0d8e0], p3: [0xa24bff, 0xd0d8e0], p4: [0xff3fd0, 0xd0d8e0] },
  goldfuchs: { base: [0xffc928, 0xffe08a], p2: [0xe8e8f8, 0xffffff], p3: [0xff5a3c, 0xffb08a], p4: [0x2a2a40, 0x5a5a80] },
};
export function paintColor(id, paint) { const P = PALETTES[id] || PALETTES.nervbert; return paint === 'gold' ? 0xffc928 : (P[paint] || P.base)[0]; }
export function buildRacer(id, cfg = {}) {
  const pal = PALETTES[id] || PALETTES.nervbert, paint = cfg.paint || 'p1';
  PMAP = null;
  if (paint !== 'p1') { PMAP = new Map(); const tgt = paint === 'gold' ? pal.base.map((_, i) => i ? 0xffd84a : 0xffc928) : pal[paint]; pal.base.forEach((c, i) => PMAP.set(c, { c: tgt[i] ?? tgt[0], em: paint === 'gold' ? 0x553300 : 0 })); }
  WSTYLE = cfg.wheels || 'std';
  const root = new THREE.Group();
  const susp = new THREE.Group(); root.add(susp);          // Federung (hoch/runter, Kippen)
  const body = new THREE.Group(); susp.add(body);
  const driver = new THREE.Group(); body.add(driver);
  const car = { root, susp, body, driver, wheels: [], fronts: [], steer: null, head: null, exhaust: [[0, 0.6, -1.5]], tail: null, scarf: null };

  if (id === 'nervbert') {
    // Aufsitz-Rasenmäher
    add(body, RB(1.7, 0.5, 2.7, 0.2), 0xd8322a, 0, 0.75, 0);
    add(body, RB(1.5, 0.55, 1.15, 0.22), 0xe8463a, 0, 1.1, 0.85, { rx: 0.08 });                 // Motorhaube
    add(body, RB(1.2, 0.35, 0.08, 0.05), 0x2a2a2a, 0, 1.0, 1.43);                               // Kühlergrill
    for (let i = 0; i < 4; i++) add(body, RB(1.0, 0.04, 0.03, 0.01), 0xaaaaaa, 0, 0.88 + i*0.07, 1.48, { outline: false });
    add(body, RB(1.9, 0.12, 1.6, 0.06), 0x333344, 0, 0.42, 0.1);                                 // Mähwerk
    add(body, RB(1.1, 0.25, 0.9, 0.14), 0x2a2a30, 0, 1.08, -0.45);                               // Sitz
    add(body, RB(1.1, 0.8, 0.22, 0.12), 0x2a2a30, 0, 1.45, -0.88, { rx: -0.15 });
    add(body, RB(1.5, 0.95, 0.8, 0.2), 0x2fae52, 0, 1.15, -1.45);                                // Grasfangsack
    add(body, RB(1.35, 0.1, 0.65, 0.04), 0x8fe060, 0, 1.64, -1.45, { outline: false });
    exhaust(car, [[0.62, 1.55, 0.6]]); car.exhaust = [[0.62, 2.1, 0.6]]; add(body, C(0.09, 0.09, 0.9, 10), 0xc8c8d8, 0.62, 1.7, 0.6, { ol: 0.1 });
    headlights(car, 0.5, 1.15, 1.44);
    wheel(car, -0.9, 0.42, 1.0, 0.38, 0.34, { front: true }); wheel(car, 0.9, 0.42, 1.0, 0.38, 0.34, { front: true });
    wheel(car, -0.98, 0.58, -0.95, 0.58, 0.5, { rim: 0xffe14a }); wheel(car, 0.98, 0.58, -0.95, 0.58, 0.5, { rim: 0xffe14a });
    plate(car, '🧔', '#ff5a3c', 0, 0.7, -1.88, Math.PI);
    // Fahne
    add(body, C(0.03, 0.03, 1.6, 6), 0xdddddd, -0.6, 2.0, -1.6, { outline: false });
    car.flag = add(body, new THREE.PlaneGeometry(0.7, 0.45, 6, 1), 0, -0.25, 2.6, -1.6, { mat: new THREE.MeshToonMaterial({ map: stripes('#ff3fd0', '#ffe14a', 4), gradientMap: grad, side: THREE.DoubleSide }), outline: false });
    // Onkel im Hawaiihemd
    const shirt = toon(0, 0, hawaii());
    add(driver, S(0.78), 0, 0, 1.75, -0.45, { mat: shirt, s: [1.1, 1.0, 0.95] });
    add(driver, S(0.5), 0xf1b48a, 0, 2.15, -0.28, { s: [1, 0.5, 0.5], outline: false });       // Hals
    const head = add(driver, S(0.58), 0xf1b48a, 0, 2.62, -0.35); car.head = head;
    add(head, S(0.6, 18, 10), 0x5a3418, 0, 0.05, -0.12, { s: [1.02, 0.7, 1], outline: false }); // Haarkranz
    add(head, S(0.53), 0xf1b48a, 0, 0.18, 0.04, { outline: false });                              // Glatze
    add(head, S(0.19, 12, 10), 0xe89a72, 0, -0.03, 0.56, { ol: 0.1 });
    add(head, RB(0.64, 0.15, 0.14, 0.06), 0x5a3418, 0, -0.24, 0.5, { ol: 0.1 });                  // Schnurrbart
    add(head, RB(0.16, 0.22, 0.12, 0.05), 0x5a3418, -0.3, -0.33, 0.44, { rz: 0.4, outline: false }); add(head, RB(0.16, 0.22, 0.12, 0.05), 0x5a3418, 0.3, -0.33, 0.44, { rz: -0.4, outline: false });
    for (const s of [-1, 1]) { add(head, C(0.17, 0.17, 0.05, 14), 0x222244, s*0.22, 0.46, 0.22, { rx: 1.25 }); add(head, S(0.15, 10, 8), 0xf1b48a, s*0.58, 0, -0.05, { s: [0.5, 1, 0.8] }); }
    eyes(head, 0.08, 0.45, 0.2, 0.13);
    steering(car, 0, 1.6, 0.25, -0.9, 0x222230, 0xf1b48a, [0.68, 1.9, -0.35, 0xf1b48a]);
  } else if (id === 'kritzel') {
    // Roller
    add(body, S(0.9), 0x2b6fd6, 0, 0.95, -0.7, { s: [0.85, 0.7, 1.15] });                       // Heck
    add(body, RB(0.6, 0.18, 1.8, 0.08), 0x2b6fd6, 0, 0.55, 0.2);                                  // Trittbrett
    add(body, RB(0.85, 1.25, 0.28, 0.14), 0x3a8ae0, 0, 1.1, 1.05, { rx: -0.2 });                  // Beinschild
    add(body, RB(0.7, 0.14, 1.0, 0.07), 0x5a3a2a, 0, 1.42, -0.6);                                  // Sitz
    add(body, C(0.07, 0.07, 1.2, 8), 0xcccccc, 0, 1.75, 1.18, { rx: -0.25 });
    add(body, RB(1.3, 0.12, 0.12, 0.05), 0x222230, 0, 2.3, 1.3);
    add(body, S(0.16, 12, 10), 0, 0, 2.15, 1.42, { mat: glow(0xfff6d0) });
    add(body, RB(0.5, 0.4, 0.5, 0.1), 0xffd23c, 0, 1.6, -1.55);                                   // Gepäckbox
    // Bleistift-Antenne
    add(body, C(0.07, 0.07, 1.4, 6), 0xffd23c, -0.32, 2.2, -1.5); add(body, CONE(0.07, 0.22, 6), 0xf3c49a, -0.32, 3.0, -1.5); add(body, C(0.072, 0.072, 0.12, 6), 0xff8ab0, -0.32, 1.47, -1.5);
    wheel(car, 0, 0.42, 1.2, 0.42, 0.3, { front: true, rim: 0xffd23c }); wheel(car, 0, 0.42, -1.15, 0.42, 0.3, { rim: 0xffd23c });
    add(body, TOR(0.5, 0.06, Math.PI), 0x2b6fd6, 0, 0.45, 1.2, { ry: Math.PI/2 });                // Schutzblech
    plate(car, '🦉', '#5fb6ff', 0, 0.85, -1.75, Math.PI); exhaust(car, [[0.35, 0.7, -1.4]]);
    // Eule
    const o = add(driver, S(0.75), 0x5fb6ff, 0, 2.15, -0.45, { s: [1, 1.12, 0.95] }); car.head = o;
    add(o, S(0.55), 0, 0, -0.18, 0.4, { mat: toon(0, 0, feathers()), s: [1, 1.1, 0.55], outline: false });
    eyes(o, 0.3, 0.55, 0.3, 0.28, 0xffa000);
    for (const s of [-1, 1]) add(o, S(0.34, 14, 10), 0x2a5aa8, s*0.3, 0.3, 0.5, { s: [1, 1, 0.3], outline: false });
    add(o, CONE(0.13, 0.3, 8), 0xffb02e, 0, 0.05, 0.78, { rx: Math.PI/2 + 0.5 });
    for (const s of [-1, 1]) {
      add(o, CONE(0.18, 0.45, 8), 0x3a8ae0, s*0.42, 0.85, -0.05, { rz: -s*0.45 });
      const wing = add(driver, S(0.4, 14, 10), 0x3a8ae0, s*0.72, 2.05, -0.15, { s: [0.4, 0.95, 1.1], rx: -0.9, rz: s*0.3 });
      add(wing, S(0.12, 8, 6), 0x3a8ae0, 0, -0.75, 0.15, { outline: false });
    }
    for (let i = -1; i <= 1; i++) add(driver, CONE(0.14, 0.6, 6), 0x2a5aa8, i*0.18, 1.85, -1.15, { rx: -2.1, rz: i*0.3 });          // Schwanzfedern
    add(o, new THREE.SphereGeometry(0.78, 18, 10, 0, Math.PI*2, 0, 1.2), 0, 0, 0.12, -0.05, { s: [1, 0.7, 1], outline: false, mat: new THREE.MeshToonMaterial({ color: 0x8a5a2a, gradientMap: grad, side: THREE.DoubleSide }) });                                     // Fliegerkappe
    add(o, TOR(0.55, 0.07), 0x5a3a2a, 0, 0.62, 0.15, { rx: -0.3 });
    for (const s of [-1, 1]) add(o, C(0.16, 0.16, 0.12, 14), 0xaee8ff, s*0.25, 0.62, 0.52, { rx: 1.3, em: 0x224455 });
    car.scarf = add(driver, new THREE.PlaneGeometry(0.3, 1.4, 1, 8), 0, 0.25, 1.75, -1.2, { mat: new THREE.MeshToonMaterial({ color: 0xff3a5a, gradientMap: grad, side: THREE.DoubleSide }), rx: -1.2, outline: false });
    car.steer = null;
  } else if (id === 'pandi') {
    // Löwenfuß-Badewanne
    const prof = [[0, 0.35], [0.75, 0.38], [0.98, 0.6], [1.06, 1.0], [1.1, 1.38], [1.2, 1.45], [1.12, 1.5], [0.98, 1.42]].map(p => new THREE.Vector2(...p));
    const tub = add(body, new THREE.LatheGeometry(prof, 28), 0, 0, 0, 0, { s: [0.9, 1, 1.38], outline: false, mat: new THREE.MeshToonMaterial({ color: PMAP ? PMAP.get(0xf6f8ff).c : 0xf6f8ff, emissive: paint === 'gold' ? 0x553300 : 0, gradientMap: grad, side: THREE.DoubleSide }) });
    add(tub, TOR(1.12, 0.07), 0xffcf4a, 0, 1.46, 0, { rx: Math.PI/2, em: 0x332200 });
    add(body, C(1.0, 1.0, 0.05, 28), 0x7fd6ff, 0, 1.28, 0, { s: [0.88, 1, 1.32], em: 0x103850, outline: false });
    for (let i = 0; i < 16; i++) { const a = Math.random()*Math.PI*2, r = Math.random()*0.8; add(body, S(0.12 + Math.random()*0.16, 10, 8), 0xffffff, Math.cos(a)*r*0.85, 1.36, Math.sin(a)*r*1.25, { outline: false, em: 0x444466 }); }
    add(body, C(0.07, 0.07, 1.3, 8), 0xffcf4a, 0, 1.9, -1.3); add(body, C(0.06, 0.06, 0.5, 8), 0xffcf4a, 0, 2.55, -1.1, { rx: Math.PI/2 }); add(body, C(0.22, 0.1, 0.15, 14), 0xffcf4a, 0, 2.5, -0.85);
    // Quietscheente
    const duck = new THREE.Group(); duck.position.set(0.85, 1.55, 0.9); body.add(duck);
    add(duck, S(0.2), 0xffe14a, 0, 0, 0, { s: [1, 0.8, 1.2] }); add(duck, S(0.13), 0xffe14a, 0, 0.2, 0.12); add(duck, CONE(0.06, 0.14, 6), 0xff8a1a, 0, 0.18, 0.27, { rx: Math.PI/2 });
    for (const [x, z] of [[-0.9, 1.0], [0.9, 1.0], [-0.9, -1.0], [0.9, -1.0]]) { add(body, S(0.18, 10, 8), 0xffcf4a, x, 0.55, z); wheel(car, x, 0.3, z, 0.3, 0.26, { front: z > 0, tire: 0x8a5a2a, rim: 0xffcf4a }); }
    plate(car, '🐼', '#7fd6ff', 0, 0.9, -1.5, Math.PI); car.exhaust = [[0, 2.5, -0.85]];
    // Panda
    add(driver, S(0.62), 0x1a1a1a, 0, 1.55, -0.35, { s: [1.1, 0.8, 0.9] });                       // Schultern
    const h = add(driver, S(0.74), 0xffffff, 0, 2.25, -0.3); car.head = h;
    for (const s of [-1, 1]) {
      add(h, S(0.26, 14, 10), 0x1a1a1a, s*0.55, 0.55, -0.05);
      add(h, S(0.22, 14, 10), 0x1a1a1a, s*0.27, 0.08, 0.55, { s: [1, 1.3, 0.6], rz: s*0.5, outline: false });
      add(h, S(0.13, 10, 8), 0xff9ab0, s*0.45, -0.22, 0.52, { outline: false });
    }
    eyes(h, 0.1, 0.62, 0.27, 0.1, 0x111111);
    add(h, S(0.11, 10, 8), 0x1a1a1a, 0, -0.1, 0.72, { s: [1.3, 1, 1], outline: false }); add(h, TOR(0.1, 0.025, Math.PI), 0x1a1a1a, 0, -0.25, 0.7, { rz: Math.PI, outline: false });
    // Steuerrad (Schiff)
    const sw = new THREE.Group(); sw.position.set(0, 1.85, 0.55); sw.rotation.x = -0.5; body.add(sw);
    add(sw, TOR(0.35, 0.05), 0x8a5a2a, 0, 0, 0); for (let i = 0; i < 6; i++) add(sw, C(0.035, 0.035, 0.95, 6), 0x8a5a2a, 0, 0, 0, { rz: i/6*Math.PI, outline: false });
    car.steer = sw;
    for (const s of [-1, 1]) { add(sw, S(0.17, 10, 8), 0x1a1a1a, s*0.32, 0.05, 0.05); tube(driver, [[s*0.62, 1.6, -0.3], [s*0.5, 1.75, 0.15], [s*0.32, 1.88, 0.55]], 0.14, 0x1a1a1a).userData.arm = true; }
  } else if (id === 'lux') {
    // Neon-Flitzer (Keil-Form)
    const sh = new THREE.Shape(); sh.moveTo(-1.6, 0); sh.lineTo(1.75, 0); sh.lineTo(1.8, 0.2); sh.quadraticCurveTo(0.9, 0.45, 0.4, 0.65); sh.lineTo(-1.2, 0.75); sh.lineTo(-1.6, 0.6); sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, { depth: 1.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }); eg.center(); eg.rotateY(-Math.PI/2);
    add(body, eg, 0x2a1a5a, 0, 0.75, 0);
    add(body, RB(1.2, 0.3, 0.9, 0.14), 0x1a0f3a, 0, 1.15, -0.45);                                 // Sitzmulde
    for (const s of [-1, 1]) {
      add(body, RB(0.06, 0.06, 3.3, 0.02), 0, s*0.92, 0.62, 0, { mat: glow(0xff3fd0), outline: false });
      add(body, RB(0.05, 0.05, 1.6, 0.02), 0, s*0.6, 1.05, 0.9, { mat: glow(0x29f0ff), outline: false, rx: 0.2 });
      add(body, RB(0.1, 0.65, 0.25, 0.04), 0x2a1a5a, s*0.8, 1.35, -1.55);
      add(body, RB(0.4, 0.1, 0.05, 0.02), 0, s*0.55, 0.78, 1.82, { mat: glow(0xffffff), outline: false });
      add(body, RB(0.45, 0.12, 0.05, 0.02), 0, s*0.5, 0.95, -1.84, { mat: glow(0xff2a4a), outline: false });
    }
    add(body, RB(2.1, 0.08, 0.55, 0.03), 0, 0, 1.7, -1.6, { mat: glow(0x29f0ff) });               // Spoiler
    add(body, RB(2.15, 0.14, 0.6, 0.05), 0x2a1a5a, 0, 1.62, -1.6, { outline: false });
    exhaust(car, [[-0.35, 0.65, -1.85], [0.35, 0.65, -1.85]]);
    wheel(car, -1.0, 0.45, 1.15, 0.42, 0.4, { front: true, rim: 0x29f0ff, rimGlow: true }); wheel(car, 1.0, 0.45, 1.15, 0.42, 0.4, { front: true, rim: 0x29f0ff, rimGlow: true });
    wheel(car, -1.05, 0.52, -1.1, 0.52, 0.52, { rim: 0xff3fd0, rimGlow: true }); wheel(car, 1.05, 0.52, -1.1, 0.52, 0.52, { rim: 0xff3fd0, rimGlow: true });
    underglow(car, 0xa24bff); plate(car, '🦁', '#a24bff', 0, 0.55, -1.86, Math.PI);
    // Löwe
    add(driver, S(0.6), 0xffa53a, 0, 1.6, -0.5, { s: [1.05, 1.1, 0.9] });
    const h = add(driver, S(0.55), 0xffb24a, 0, 2.45, -0.35); car.head = h;
    const mane = new THREE.Group(); h.add(mane);
    for (let i = 0; i < 26; i++) {
      const a = i/26*Math.PI*2, ring = i % 2;
      const m = add(mane, CONE(0.24, 0.85, 7), ring ? 0xb24bff : 0xff3fd0, Math.cos(a)*0.5, Math.sin(a)*0.5, -0.12 - ring*0.12, { em: ring ? 0x3a0a6a : 0x5a0a40, ol: 0.08 });
      m.rotation.z = a - Math.PI/2; m.rotation.x = -0.25;
    }
    add(mane, S(0.62), 0x8a3cff, 0, 0.05, -0.3, { em: 0x2a0a4a, s: [1, 1, 0.8] });
    add(h, S(0.3, 14, 10), 0xffe0a0, 0, -0.18, 0.42, { s: [1.2, 0.8, 0.7], outline: false });
    add(h, S(0.1, 8, 6), 0x3a1a0a, 0, -0.05, 0.64, { s: [1.3, 0.9, 1], outline: false });
    for (const s of [-1, 1]) add(h, S(0.15, 10, 8), 0xffa53a, s*0.45, 0.48, 0);
    eyes(h, 0.13, 0.43, 0.2, 0.13, 0x2a6aff);
    add(h, RB(0.5, 0.08, 0.06, 0.03), 0x8a3cff, 0, 0.25, 0.5, { rx: -0.2, outline: false });       // Augenbrauen
    car.tail = tube(driver, [[0, 1.3, -0.95], [0, 1.1, -1.5], [0, 1.6, -1.95]], 0.07, 0xffa53a);
    add(driver, S(0.17, 10, 8), 0xff3fd0, 0, 1.65, -1.98, { em: 0x5a0a40 });
    steering(car, 0, 1.55, 0.45, -1.0, 0x1a1a2a, 0xffa53a, [0.55, 1.85, -0.45, 0xffa53a]);
  } else if (id === 'kicker') {
    // Bolzplatz-Buggy
    add(body, RB(1.7, 0.4, 2.8, 0.15), 0, 0, 0.7, 0, { mat: toon(PMAP ? PMAP.get(0xffffff).c : 0, PMAP && paint === 'gold' ? 0x553300 : 0, pitch()) });
    add(body, RB(1.0, 0.25, 0.8, 0.12), 0x222230, 0, 1.0, -0.4);
    add(body, S(0.6, 18, 14), 0xffffff, 0, 0.85, 1.55);
    for (let i = 0; i < 6; i++) { const a = i*1.05; add(body, C(0.16, 0.16, 0.04, 5), 0x111111, Math.cos(a)*0.38, 0.85 + Math.sin(a)*0.38, 2.08, { rx: Math.PI/2, outline: false }); }
    // Überrollbügel + Tor als Spoiler
    for (const s of [-1, 1]) add(body, C(0.05, 0.05, 1.5, 8), 0xffffff, s*0.75, 1.55, -1.2);
    add(body, C(0.05, 0.05, 1.55, 8), 0xffffff, 0, 2.3, -1.2, { rz: Math.PI/2 });
    add(body, new THREE.PlaneGeometry(1.5, 1.4), 0, 0, 1.6, -1.35, { mat: new THREE.MeshBasicMaterial({ map: net(), transparent: true, side: THREE.DoubleSide, opacity: 0.85 }), outline: false });
    wheel(car, -0.95, 0.45, 0.95, 0.43, 0.4, { front: true, rim: 0xffffff }); wheel(car, 0.95, 0.45, 0.95, 0.43, 0.4, { front: true, rim: 0xffffff });
    wheel(car, -1.0, 0.5, -0.95, 0.5, 0.45, { rim: 0xffffff }); wheel(car, 1.0, 0.5, -0.95, 0.5, 0.45, { rim: 0xffffff });
    plate(car, '⚽', '#3ad46a', 0, 0.75, -1.45, Math.PI); headlights(car, 0.55, 0.85, 1.42); exhaust(car, [[0.45, 0.6, -1.5]]);
    // Kicker-Kid
    add(driver, C(0.42, 0.52, 1.0, 18), 0, 0, 1.55, -0.4, { mat: toon(0, 0, jersey()), ry: Math.PI });
    const h = add(driver, S(0.5), 0xf1c09a, 0, 2.38, -0.3); car.head = h;
    add(h, S(0.52, 16, 10), 0x7a3a14, 0, 0.16, -0.08, { s: [1, 0.62, 1] });
    for (let i = 0; i < 7; i++) add(h, CONE(0.12, 0.35, 6), 0x7a3a14, (i - 3)*0.12, 0.42, -0.1 - Math.abs(i - 3)*0.04, { rx: -0.6, rz: (i - 3)*0.15, outline: false });
    add(h, C(0.53, 0.53, 0.14, 20), 0xe52a2a, 0, 0.2, 0, { outline: false });
    add(h, new THREE.PlaneGeometry(0.15, 0.5), 0, 0.15, 0.15, -0.6, { mat: new THREE.MeshBasicMaterial({ color: 0xe52a2a, side: THREE.DoubleSide }), rx: 0.5, outline: false });
    eyes(h, 0.0, 0.4, 0.18, 0.12, 0x3a7a2a);
    add(h, TOR(0.13, 0.03, Math.PI), 0x7a2a1a, 0, -0.18, 0.46, { rz: Math.PI, outline: false });
    for (const s of [-1, 1]) add(h, S(0.12, 8, 6), 0xf1c09a, s*0.5, 0, 0);
    steering(car, 0, 1.45, 0.5, -1.0, 0x222230, 0xf1c09a, [0.5, 1.85, -0.4, 0x5fb6ff]);
  } else if (id === 'sonni') {
    // Dünen-Buggy mit Rohrrahmen und Sonnenschirm
    add(body, RB(1.6, 0.45, 2.6, 0.18), 0xffb23c, 0, 0.75, 0);
    add(body, RB(1.3, 0.35, 0.9, 0.16), 0xe89a2a, 0, 1.05, 0.95, { rx: 0.15 });
    add(body, RB(1.0, 0.3, 0.8, 0.12), 0x6a4a2a, 0, 1.05, -0.4);
    for (const s of [-1, 1]) {
      tube(body, [[s*0.75, 0.95, 0.6], [s*0.8, 2.1, -0.1], [s*0.75, 2.2, -0.8], [s*0.7, 0.95, -1.2]], 0.06, 0x8a6a3a);
      add(body, RB(0.5, 0.5, 0.06, 0.06), 0xffe14a, s*0.95, 1.0, -1.25);
    }
    add(body, C(0.06, 0.06, 1.55, 8), 0x8a6a3a, 0, 2.2, -0.1, { rz: Math.PI/2 });
    const pole = add(body, C(0.04, 0.04, 1.6, 6), 0xdddddd, 0.55, 2.4, -1.1, { outline: false });
    car.umbrella = add(body, new THREE.ConeGeometry(1.15, 0.45, 12, 1, true), 0, 0.55, 3.25, -1.1, { mat: new THREE.MeshToonMaterial({ map: stripes('#ff5a3c', '#fff6d0', 12), gradientMap: grad, side: THREE.DoubleSide }), outline: false });
    void pole;
    // Kaktus-Wackelfigur
    const cac = new THREE.Group(); cac.position.set(-0.4, 1.3, 1.1); body.add(cac); car.bobble = cac;
    add(cac, C(0.09, 0.1, 0.35, 8), 0x46b05a, 0, 0.15, 0); add(cac, S(0.09, 8, 6), 0x46b05a, 0, 0.33, 0); add(cac, C(0.05, 0.05, 0.15, 6), 0x46b05a, 0.1, 0.2, 0, { rz: 1.2, outline: false });
    wheel(car, -1.0, 0.55, 1.0, 0.55, 0.55, { front: true, tire: 0x2a2018, rim: 0xffe14a }); wheel(car, 1.0, 0.55, 1.0, 0.55, 0.55, { front: true, tire: 0x2a2018, rim: 0xffe14a });
    wheel(car, -1.05, 0.62, -1.0, 0.62, 0.6, { tire: 0x2a2018, rim: 0xffe14a }); wheel(car, 1.05, 0.62, -1.0, 0.62, 0.6, { tire: 0x2a2018, rim: 0xffe14a });
    plate(car, '🤠', '#ffb23c', 0, 0.8, -1.33, Math.PI); headlights(car, 0.5, 1.05, 1.42); exhaust(car, [[-0.45, 0.65, -1.35]]);
    // Sonni
    add(driver, C(0.42, 0.52, 0.95, 16), 0xc8b080, 0, 1.6, -0.4);
    add(driver, RB(0.85, 0.9, 0.45, 0.15), 0x5a7a3a, 0, 1.75, -0.85);
    add(driver, C(0.18, 0.18, 0.9, 12), 0xb04a3a, 0, 2.28, -0.95, { rz: Math.PI/2 });
    const h = add(driver, S(0.5), 0xf3c49a, 0, 2.4, -0.3); car.head = h;
    const hat = new THREE.Group(); hat.position.y = 0.3; h.add(hat);
    add(hat, C(1.05, 1.0, 0.07, 28), 0xf0c860, 0, 0, 0); add(hat, C(0.42, 0.5, 0.48, 18), 0xf0c860, 0, 0.26, 0); add(hat, C(0.51, 0.51, 0.1, 18), 0xd0402a, 0, 0.1, 0, { outline: false });
    eyes(h, 0.0, 0.4, 0.18, 0.12, 0x3a7a9a);
    add(h, S(0.1, 8, 6), 0xff8a6a, 0, -0.08, 0.5, { outline: false });
    for (const s of [-1, 1]) add(h, RB(0.2, 0.06, 0.03, 0.02), 0xffffff, s*0.22, -0.16, 0.44, { outline: false, rz: s*0.3 });
    add(h, TOR(0.12, 0.03, Math.PI), 0x7a2a1a, 0, -0.2, 0.45, { rz: Math.PI, outline: false });
    steering(car, 0, 1.5, 0.45, -1.0, 0x3a2a1a, 0xf3c49a, [0.5, 1.9, -0.4, 0xc8b080]);
  }
  if (id === 'berta') {
    // Rathaus-Cabrio
    add(body, RB(1.85, 0.55, 3.1, 0.25), 0x2a5ad6, 0, 0.75, 0);
    add(body, RB(1.7, 0.35, 1.0, 0.18), 0x2a5ad6, 0, 1.05, 1.15, { rx: 0.1 });
    add(body, RB(1.7, 0.45, 0.8, 0.18), 0x1a3a8a, 0, 1.15, -1.2);
    add(body, RB(1.5, 0.08, 0.4, 0.04), 0xaee8ff, 0, 1.5, 0.55, { rx: -0.9, em: 0x224455 });
    add(body, RB(1.2, 0.3, 0.9, 0.14), 0xf0e6d0, 0, 1.12, -0.45);
    for (let i = 0; i < 5; i++) add(body, RB(1.4, 0.04, 0.03, 0.01), 0xd0d0d8, 0, 0.62 + i*0.07, 1.58, { outline: false });
    headlights(car, 0.6, 0.9, 1.56); exhaust(car, [[0.5, 0.55, -1.6]]);
    for (const s of [-1, 1]) { add(body, C(0.025, 0.025, 0.8, 6), 0xdddddd, s*0.8, 1.45, 1.4, { outline: false }); add(body, new THREE.PlaneGeometry(0.45, 0.3), 0, s*0.8 + s*0.22, 1.72, 1.4, { mat: new THREE.MeshBasicMaterial({ map: stripes('#1a1a1a', '#ffc928', 3), side: THREE.DoubleSide }), outline: false }); }
    wheel(car, -0.98, 0.42, 1.1, 0.42, 0.36, { front: true }); wheel(car, 0.98, 0.42, 1.1, 0.42, 0.36, { front: true }); wheel(car, -0.98, 0.42, -1.1, 0.42, 0.36); wheel(car, 0.98, 0.42, -1.1, 0.42, 0.36);
    plate(car, '🏛️', '#2a5ad6', 0, 0.7, -1.62, Math.PI);
    add(driver, C(0.45, 0.6, 1.0, 16), 0xd83a3a, 0, 1.75, -0.45);
    add(driver, TOR(0.42, 0.06), 0xffc928, 0, 2.15, -0.38, { rx: 1.1, em: 0x443300 });
    add(driver, C(0.18, 0.18, 0.05, 14), 0xffc928, 0, 1.85, -0.02, { rx: 1.4, em: 0x443300 });
    const h = add(driver, S(0.52), 0xf3c8a8, 0, 2.6, -0.4); car.head = h;
    add(h, S(0.55, 16, 10), 0xc8c8d0, 0, 0.12, -0.1, { s: [1, 0.75, 1] }); add(h, S(0.3, 12, 10), 0xc8c8d0, 0, 0.45, -0.38);
    eyes(h, 0.05, 0.42, 0.18, 0.12, 0x4a6aaa);
    for (const s of [-1, 1]) add(h, TOR(0.13, 0.025), 0x8a3a8a, s*0.18, 0.05, 0.5, { outline: false });
    add(h, RB(0.12, 0.025, 0.02, 0.01), 0x8a3a8a, 0, 0.07, 0.52, { outline: false });
    add(h, TOR(0.12, 0.03, Math.PI), 0xb03a4a, 0, -0.2, 0.45, { rz: Math.PI, outline: false });
    steering(car, 0, 1.6, 0.4, -1.0, 0xf0e6d0, 0xf3c8a8, [0.55, 2.05, -0.45, 0xd83a3a]);
  } else if (id === 'brecher') {
    // Ring-Raser: Fahrzeug wie eine Ringecke mit Seilen
    add(body, RB(2.0, 0.5, 2.9, 0.15), 0x2a2a3a, 0, 0.7, 0);
    add(body, RB(1.9, 0.12, 2.8, 0.05), 0xe8e8f0, 0, 0.98, 0);
    for (const [x, z] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) add(body, C(0.08, 0.08, 1.1, 8), 0xc8c8d0, x, 1.5, z);
    for (const [y, c] of [[1.3, 0xe52a2a], [1.6, 0xffffff], [1.9, 0x2a6ae5]]) for (const s of [-1, 1]) { add(body, C(0.035, 0.035, 2.6, 6), c, s*0.9, y, 0, { rx: Math.PI/2, outline: false }); add(body, C(0.035, 0.035, 1.8, 6), c, 0, y, s*1.3, { rz: Math.PI/2, outline: false }); }
    exhaust(car, [[-0.5, 0.6, -1.5], [0.5, 0.6, -1.5]]);
    wheel(car, -1.05, 0.5, 1.05, 0.5, 0.45, { front: true, rim: 0xffc928 }); wheel(car, 1.05, 0.5, 1.05, 0.5, 0.45, { front: true, rim: 0xffc928 }); wheel(car, -1.1, 0.55, -1.05, 0.55, 0.55, { rim: 0xffc928 }); wheel(car, 1.1, 0.55, -1.05, 0.55, 0.55, { rim: 0xffc928 });
    plate(car, '🤼', '#e52a2a', 0, 0.75, -1.47, Math.PI);
    const torso = add(driver, S(0.85), 0xd8966a, 0, 1.85, -0.35, { s: [1.25, 1, 0.9] });
    add(driver, C(0.82, 0.82, 0.32, 20), 0xffc928, 0, 1.35, -0.35, { em: 0x553300 }); add(driver, RB(0.6, 0.4, 0.12, 0.05), 0xffe88a, 0, 1.35, 0.4, { em: 0x664400 });
    for (const s of [-1, 1]) add(driver, S(0.4, 12, 10), 0xd8966a, s*1.0, 2.25, -0.3);
    const h = add(driver, S(0.56), 0xe52a2a, 0, 2.95, -0.25); car.head = h;
    for (const s of [-1, 1]) { add(h, S(0.2, 12, 10), 0xffffff, s*0.2, 0.06, 0.45, { s: [1.2, 0.8, 0.5], outline: false }); }
    eyes(h, 0.06, 0.48, 0.2, 0.1, 0x2a2a2a);
    add(h, RB(0.5, 0.06, 0.05, 0.02), 0xffc928, 0, 0.32, 0.5, { outline: false });
    add(h, S(0.18, 10, 8), 0xd8966a, 0, -0.3, 0.42, { s: [1.4, 0.7, 0.6], outline: false });
    void torso;
    steering(car, 0, 1.75, 0.6, -1.0, 0x2a2a3a, 0xd8966a, [0.95, 2.2, -0.3, 0xd8966a]);
  } else if (id === 'elara') {
    // Kristall-Gleiter (schwebt)
    add(body, S(1.1, 22, 14), 0x6a3ab0, 0, 0.85, 0, { s: [0.95, 0.4, 1.6] });
    add(body, RB(1.2, 0.25, 1.2, 0.12), 0xb36bff, 0, 1.05, -0.35);
    for (const [x, z, sc] of [[0, 1.6, 1], [-0.7, -1.2, 0.8], [0.7, -1.2, 0.8], [0, -1.6, 0.7]]) add(body, new THREE.OctahedronGeometry(0.35*sc), 0, x, 1.2, z, { mat: glow(0x9af0ff), s: [1, 1.8, 1] });
    for (const [x, z] of [[-0.8, 0.9], [0.8, 0.9], [-0.8, -0.9], [0.8, -0.9]]) add(body, C(0.35, 0.25, 0.12, 16), 0, x, 0.4, z, { mat: glow(0xd0a0ff), outline: false });
    exhaust(car, [[0, 0.8, -1.75]]); car.hover = true;
    plate(car, '🧝', '#b36bff', 0, 0.85, -1.72, Math.PI);
    add(driver, CONE(0.75, 1.5, 16), 0xb36bff, 0, 1.85, -0.4);
    const h = add(driver, S(0.48), 0xffe0d0, 0, 2.62, -0.35); car.head = h;
    add(h, S(0.52, 16, 10), 0xffe9a0, 0, 0.1, -0.12, { s: [1, 0.9, 1] });
    for (let i = 0; i < 5; i++) add(h, CONE(0.14, 0.9, 6), 0xffe9a0, (i - 2)*0.14, -0.35, -0.38, { rx: 0.2, outline: false });
    for (const s of [-1, 1]) add(h, CONE(0.09, 0.5, 6), 0xffe0d0, s*0.5, 0.1, -0.05, { rz: -s*1.2 });
    eyes(h, 0.0, 0.4, 0.17, 0.12, 0x2ad070);
    add(h, CONE(0.55, 0.9, 16), 0x6a3ab0, 0, 0.62, -0.12, { rx: -0.25 });
    add(h, C(0.6, 0.6, 0.06, 20), 0x6a3ab0, 0, 0.2, -0.05);
    // Zauberstab
    add(driver, C(0.04, 0.05, 1.8, 8), 0x8a5a2a, 0.7, 2.2, 0.0, { rx: 0.4, rz: -0.25 });
    car.orb = add(driver, new THREE.OctahedronGeometry(0.2), 0, 0.93, 3.05, 0.35, { mat: glow(0xff9af0) });
    for (const s of [-1, 1]) add(driver, S(0.12, 10, 8), 0xffe0d0, s*0.55, 2.05, 0.15);
  } else if (id === 'karl') {
    // Turbo-Einkaufswagen
    const wt = net().clone(); wt.repeat.set(8, 4); wt.needsUpdate = true;
    const wire = new THREE.MeshToonMaterial({ color: 0xd0d8e0, map: wt, alphaTest: 0.4, side: THREE.DoubleSide, gradientMap: grad });
    add(body, RB(1.5, 0.12, 2.3, 0.05), 0xd0d8e0, 0, 0.75, 0.1);
    for (const s of [-1, 1]) { add(body, RB(0.06, 1.0, 2.4, 0.02), 0, s*0.78, 1.3, 0.1, { mat: wire, outline: false }); }
    add(body, RB(1.6, 1.0, 0.06, 0.02), 0, 0, 1.3, 1.3, { mat: wire, outline: false });
    for (const s of [-1, 1]) { add(body, RB(0.06, 0.06, 2.4, 0.02), 0xd0d8e0, s*0.78, 1.8, 0.1); add(body, RB(0.06, 0.06, 2.4, 0.02), 0xd0d8e0, s*0.78, 0.82, 0.1); }
    add(body, RB(1.6, 0.08, 0.08, 0.03), 0x3ad4c0, 0, 1.85, 1.3, { em: 0x0a3a30 });
    add(body, RB(1.7, 0.12, 0.12, 0.04), 0x3ad4c0, 0, 2.0, -1.1, { em: 0x0a3a30 });
    for (const s of [-1, 1]) add(body, C(0.04, 0.04, 1.1, 6), 0xd0d8e0, s*0.75, 1.55, -1.0, { rx: -0.4 });
    for (let i = 0; i < 4; i++) add(body, RB(0.4, 0.4, 0.4, 0.06), [0xffe14a, 0xff5a3c, 0x46e07a, 0xffffff][i], -0.4 + (i % 2)*0.8, 1.05, 0.7 + (i > 1 ? 0.35 : 0), { ry: i });
    add(body, RB(0.7, 0.5, 0.6, 0.1), 0x555566, 0, 0.55, -1.2);
    exhaust(car, [[0, 0.55, -1.55]]);
    for (const [x, z] of [[-0.7, 1.1], [0.7, 1.1], [-0.7, -0.9], [0.7, -0.9]]) wheel(car, x, 0.3, z, 0.3, 0.2, { front: z > 0, tire: 0x2a2a30, rim: 0x3ad4c0 });
    plate(car, '🧾', '#3ad4c0', 0, 0.6, -1.5, Math.PI);
    add(driver, C(0.42, 0.5, 1.0, 16), 0x1a1a24, 0, 1.6, -0.55);
    add(driver, RB(0.35, 0.6, 0.05, 0.02), 0xffffff, 0, 1.75, -0.08);
    add(driver, RB(0.3, 0.12, 0.08, 0.03), 0xd02a2a, 0, 2.03, -0.04);
    const h = add(driver, S(0.5), 0xf3c8a8, 0, 2.48, -0.5); car.head = h;
    add(h, S(0.52, 16, 10), 0x1a1a1a, 0, 0.16, -0.06, { s: [1, 0.55, 1] });
    eyes(h, 0.02, 0.42, 0.17, 0.11, 0x3a2a1a);
    add(h, RB(0.36, 0.05, 0.05, 0.02), 0x1a1a1a, 0, -0.17, 0.46, { outline: false });
    // Tablett mit Getränk (linke Hand)
    const tray = new THREE.Group(); tray.position.set(-0.65, 2.55, -0.2); driver.add(tray); car.tray = tray;
    add(tray, C(0.45, 0.45, 0.04, 20), 0xd0d8e0, 0, 0, 0); add(tray, C(0.1, 0.08, 0.32, 10), 0xffcf4a, 0.1, 0.18, 0, { em: 0x332200 }); add(tray, S(0.12, 10, 8), 0xffffff, 0.1, 0.36, 0, { outline: false });
    add(driver, S(0.12, 10, 8), 0xffffff, -0.65, 2.45, -0.2);
    steering(car, 0.15, 1.95, -0.9, -0.5, 0x3ad4c0, 0xffffff, null);
  } else if (id === 'goldfuchs') {
    // Goldflitzer
    const gold = 0xffc928;
    add(body, RB(1.8, 0.45, 3.0, 0.2), gold, 0, 0.65, 0, { em: 0x553300 });
    add(body, RB(1.4, 0.35, 1.0, 0.16), gold, 0, 0.85, 1.35, { em: 0x553300, rx: 0.15 });
    add(body, RB(1.2, 0.3, 0.9, 0.14), 0x8a1a2a, 0, 1.0, -0.45);
    for (let i = 0; i < 5; i++) add(body, CONE(0.1, 0.32, 6), gold, -0.4 + i*0.2, 1.25, 1.75, { em: 0x553300 });
    add(body, RB(2.0, 0.08, 0.5, 0.03), 0xffe08a, 0, 1.55, -1.6, { em: 0x664400 });
    for (const s of [-1, 1]) add(body, RB(0.1, 0.55, 0.3, 0.04), gold, s*0.75, 1.25, -1.6);
    exhaust(car, [[-0.35, 0.6, -1.6], [0.35, 0.6, -1.6]]);
    wheel(car, -1.0, 0.45, 1.1, 0.42, 0.38, { front: true, rim: 0xffe08a, rimGlow: true }); wheel(car, 1.0, 0.45, 1.1, 0.42, 0.38, { front: true, rim: 0xffe08a, rimGlow: true });
    wheel(car, -1.05, 0.5, -1.1, 0.5, 0.48, { rim: 0xffe08a, rimGlow: true }); wheel(car, 1.05, 0.5, -1.1, 0.5, 0.48, { rim: 0xffe08a, rimGlow: true });
    underglow(car, 0xffc928); plate(car, '🦊', '#ffc928', 0, 0.55, -1.52, Math.PI);
    add(driver, S(0.55), 0xff9a3a, 0, 1.6, -0.5, { s: [1, 1.1, 0.9] });
    add(driver, S(0.4), 0xffffff, 0, 1.6, -0.1, { s: [1, 1.1, 0.5], outline: false });
    const h = add(driver, S(0.52), 0xff9a3a, 0, 2.38, -0.4); car.head = h;
    add(h, CONE(0.3, 0.6, 12), 0xff9a3a, 0, -0.12, 0.55, { rx: Math.PI/2 }); add(h, S(0.09, 8, 6), 0x1a1a1a, 0, -0.12, 0.85, { outline: false });
    add(h, S(0.3, 12, 10), 0xffffff, 0, -0.22, 0.3, { s: [1.2, 0.6, 0.8], outline: false });
    for (const s of [-1, 1]) { add(h, CONE(0.2, 0.5, 8), 0xff9a3a, s*0.32, 0.55, -0.05, { rz: -s*0.3 }); add(h, CONE(0.1, 0.28, 6), 0x1a1a1a, s*0.33, 0.66, 0.0, { rz: -s*0.3, outline: false }); }
    eyes(h, 0.12, 0.42, 0.2, 0.12, 0x2a8a3a);
    car.tail = tube(driver, [[0, 1.3, -0.95], [0.3, 1.2, -1.5], [0.1, 1.7, -2.0]], 0.22, 0xff9a3a);
    add(driver, S(0.28, 10, 8), 0xffffff, 0.1, 1.85, -2.05);
    steering(car, 0, 1.55, 0.45, -1.0, 0x8a1a2a, 0xffffff, [0.5, 1.85, -0.5, 0xff9a3a]);
  }
  car.headR = { nervbert: 0.58, kritzel: 0.8, pandi: 0.74, lux: 0.55, kicker: 0.5, sonni: 0.5, goldfuchs: 0.55, berta: 0.52, brecher: 0.56, elara: 0.48, karl: 0.5 }[id] || 0.55;
  if (cfg.vehicle && cfg.vehicle !== 'sig') genericVehicle(car, id, cfg.vehicle, paintColor(id, paint), paint === 'gold');
  if (cfg.outfit && cfg.outfit !== 'none' && car.head) outfit(car, cfg.outfit, id);
  PMAP = null; WSTYLE = 'std';
  // Auspuff-Flammen
  car.flames = [];
  for (const [x, y, z] of car.exhaust) {
    const f = new THREE.Group(); f.position.set(x, y, z - 0.25); body.add(f);
    const fo = new THREE.Mesh(CONE(0.28, 1.3, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    fo.rotation.x = -Math.PI/2; fo.position.z = -0.6; f.add(fo);
    const fi = new THREE.Mesh(CONE(0.14, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.95, depthWrite: false }));
    fi.rotation.x = -Math.PI/2; fi.position.z = -0.4; f.add(fi);
    f.visible = false; car.flames.push(f); car.flameMats = [fo.material, fi.material];
  }
  // weicher Kontaktschatten
  const sh = new THREE.Mesh(G('shadow', () => new THREE.CircleGeometry(1.7, 24)), shadowMat); sh.rotation.x = -Math.PI/2; sh.position.y = 0.05; sh.scale.set(1, 1.35, 1); root.add(sh);
  sanitize(root);
  return car;
}

const shadowMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 4, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
})();

// Kaputte Normalen (NaN/Länge 0) reparieren – sonst entstehen schwarze Flächen im Leuchteffekt
const done = new WeakSet();
export function sanitize(obj) {
  obj.traverse(o => { const g = o.geometry; if (!g || done.has(g) || !g.attributes.normal) return; done.add(g);
    const n = g.attributes.normal.array; let bad = 0;
    for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i+1], n[i+2]); if (!(l > 1e-6)) { n[i] = 0; n[i+1] = 1; n[i+2] = 0; bad++; } else if (Math.abs(l - 1) > 1e-3) { n[i] /= l; n[i+1] /= l; n[i+2] /= l; } }
    if (bad) { g.attributes.normal.needsUpdate = true; if (window.__nanLog) window.__nanLog.push(g.type + ':' + bad); } });
}

// ---------- Allgemeine Fahrzeuge (für alle Fahrer) ----------
const HANDS = { nervbert: 0xf1b48a, kritzel: 0x3a8ae0, pandi: 0x1a1a1a, lux: 0xffa53a, kicker: 0xf1c09a, sonni: 0xf3c49a, goldfuchs: 0xffffff, berta: 0xf3c8a8, brecher: 0xd8966a, elara: 0xffe0d0, karl: 0xffffff };
function genericVehicle(car, id, type, col, gold) {
  const { body, driver } = car;
  for (const c of [...body.children]) if (c !== driver) body.remove(c);
  for (const c of [...driver.children]) if (c.userData.arm) driver.remove(c);
  car.wheels = []; car.fronts = []; car.steer = null; car.flag = car.umbrella = car.bobble = null; car.glow = null;
  // Fahrer auf neue Sitzhöhe setzen
  driver.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(driver);
  const em = gold ? 0x553300 : 0, dark = 0x22222e;
  let seatY = 1.0, seatZ = -0.4, wheelZ = 1.2;
  if (type === 'kart') {
    add(body, RB(1.5, 0.22, 3.0, 0.1), dark, 0, 0.42, 0);
    add(body, RB(1.3, 0.4, 1.1, 0.18), col, 0, 0.62, 1.25, { em, rx: 0.12 });
    add(body, RB(0.9, 0.3, 0.6, 0.12), col, 0, 0.55, 1.95, { em });
    for (const s of [-1, 1]) add(body, RB(0.38, 0.42, 1.5, 0.15), col, s*0.82, 0.6, -0.2, { em });
    add(body, RB(1.0, 0.6, 0.7, 0.15), 0x444455, 0, 0.75, -1.35);
    add(body, RB(1.7, 0.08, 0.45, 0.03), col, 0, 1.25, -1.75, { em });
    for (const s of [-1, 1]) add(body, RB(0.08, 0.5, 0.3, 0.02), dark, s*0.7, 1.0, -1.75);
    exhaust(car, [[0.3, 0.7, -1.8], [-0.3, 0.7, -1.8]]);
    add(body, RB(0.9, 0.5, 0.7, 0.15), 0x1a1a24, 0, 0.75, -0.55);
    wheel(car, -0.95, 0.38, 1.15, 0.36, 0.34, { front: true }); wheel(car, 0.95, 0.38, 1.15, 0.36, 0.34, { front: true });
    wheel(car, -1.0, 0.48, -1.1, 0.48, 0.5); wheel(car, 1.0, 0.48, -1.1, 0.48, 0.5);
    seatY = 0.95; seatZ = -0.5; steering(car, 0, 1.25, 0.55, -1.1, dark, HANDS[id]);
  } else if (type === 'bike') {
    add(body, S(0.7), col, 0, 1.0, 0.2, { s: [0.7, 0.7, 1.9], em });
    add(body, RB(0.55, 0.15, 1.1, 0.07), 0x1a1a24, 0, 1.4, -0.45);
    add(body, C(0.06, 0.06, 1.1, 8), 0xcccccc, 0, 1.6, 1.15, { rx: -0.35 });
    add(body, RB(1.3, 0.1, 0.1, 0.04), dark, 0, 2.1, 1.35);
    add(body, S(0.18, 12, 10), 0, 0, 1.75, 1.45, { mat: glow(0xfff6d0) });
    add(body, TOR(0.48, 0.07, Math.PI), col, 0, 0.5, 1.2, { ry: Math.PI/2, em });
    exhaust(car, [[0.3, 0.65, -1.2]]);
    wheel(car, 0, 0.45, 1.2, 0.45, 0.32, { front: true }); wheel(car, 0, 0.45, -1.1, 0.45, 0.34);
    seatY = 1.45; seatZ = -0.45; car.lean = true;
    const sw = new THREE.Group(); sw.position.set(0, 2.1, 1.35); body.add(sw); car.steer = null;
    for (const s of [-1, 1]) add(body, S(0.13, 10, 8), HANDS[id], s*0.6, 2.12, 1.33);
  } else if (type === 'sofa') {
    add(body, RB(2.1, 0.6, 1.6, 0.25), col, 0, 0.75, -0.2, { em });
    add(body, RB(2.1, 1.1, 0.45, 0.2), col, 0, 1.3, -0.95, { em, rx: -0.1 });
    for (const s of [-1, 1]) add(body, RB(0.4, 0.75, 1.6, 0.18), col, s*1.1, 1.05, -0.2, { em });
    for (const s of [-1, 1]) add(body, RB(0.85, 0.22, 1.2, 0.1), 0xfff0d8, s*0.45, 1.12, -0.1);
    add(body, S(0.28, 12, 8), 0xffe14a, -0.7, 1.45, -0.6, { s: [1, 0.6, 1] });
    add(body, C(0.05, 0.05, 1.3, 6), 0x8a5a2a, 0, 1.1, 0.75, { rx: 0.7 });
    add(body, RB(1.2, 0.15, 0.6, 0.05), 0x8a5a2a, 0, 0.55, 1.0);
    const lamp = add(body, C(0.25, 0.4, 0.4, 12), 0xffe9a8, 0.95, 2.3, -0.9, { em: 0x664400 }); add(body, C(0.03, 0.03, 1.3, 6), 0x555555, 0.95, 1.6, -0.9);
    exhaust(car, [[0.6, 0.6, -1.2]]); void lamp;
    for (const [x, z] of [[-0.9, 0.9], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9]]) wheel(car, x, 0.3, z, 0.3, 0.25, { front: z > 0, rim: 0xffcf4a });
    seatY = 1.15; seatZ = -0.35; steering(car, 0, 1.55, 0.55, -0.9, 0x8a5a2a, HANDS[id]);
  }
  driver.position.set(0, seatY - bb.min.y - 0.15 + (type === 'bike' ? 0 : 0), seatZ - (bb.min.z + bb.max.z)/2);
  void wheelZ;
}
// ---------- Outfits (Kopfschmuck) ----------
function outfit(car, type, id) {
  const h = car.head, r = car.headR, g = new THREE.Group(); h.add(g); g.position.y = r*0.82;
  if (id === 'sonni') g.position.y = r*0.82 + 0.75;
  if (type === 'party') { const c = add(g, CONE(r*0.55, r*1.4, 16), 0, 0, r*0.6, 0, { mat: new THREE.MeshToonMaterial({ map: stripes('#ff3fd0', '#ffe14a', 8), gradientMap: grad }) }); c.rotation.z = 0.15; add(g, S(r*0.18, 10, 8), 0x29f0ff, 0.1, r*1.35, 0); }
  else if (type === 'phones') { g.position.y = 0; add(g, TOR(r*1.02, r*0.09, Math.PI), 0x222230, 0, 0, 0); for (const s of [-1, 1]) add(g, C(r*0.32, r*0.32, r*0.28, 16), 0xff3fd0, s*r*1.0, 0, 0, { rz: Math.PI/2, em: 0x330a22 }); }
  else if (type === 'tophat') { add(g, C(r*0.95, r*0.95, r*0.08, 20), 0x1a1a22, 0, 0, 0); add(g, C(r*0.62, r*0.62, r*1.05, 20), 0x1a1a22, 0, r*0.55, 0); add(g, C(r*0.64, r*0.64, r*0.18, 20), 0xd0402a, 0, r*0.15, 0, { outline: false }); }
  else if (type === 'shades') { g.position.y = r*0.15; g.position.z = r*0.82; for (const s of [-1, 1]) add(g, RB(r*0.6, r*0.36, r*0.08, 0.05), 0x111122, s*r*0.36, 0, 0, { em: 0x1a0a3a }); add(g, RB(r*0.3, r*0.08, r*0.05, 0.02), 0x111122, 0, r*0.08, 0); }
  else if (type === 'viking') { add(g, S(r*0.85, 18, 10), 0xa0a8b8, 0, -r*0.1, 0, { s: [1, 0.75, 1] }); for (const s of [-1, 1]) { const horn = add(g, CONE(r*0.18, r*0.9, 10), 0xfff0d8, s*r*0.85, r*0.3, 0); horn.rotation.z = -s*0.9; } add(g, TOR(r*0.86, r*0.07), 0xffcf4a, 0, -r*0.25, 0, { rx: Math.PI/2 }); }
  else if (type === 'crown') { add(g, C(r*0.62, r*0.55, r*0.4, 16, 1, true), 0xffc928, 0, r*0.2, 0, { em: 0x553300 }); for (let i = 0; i < 6; i++) { const a = i/6*Math.PI*2; add(g, CONE(r*0.14, r*0.38, 6), 0xffc928, Math.cos(a)*r*0.58, r*0.55, Math.sin(a)*r*0.58, { em: 0x553300 }); add(g, S(r*0.07, 8, 6), 0, Math.cos(a)*r*0.6, r*0.25, Math.sin(a)*r*0.6, { mat: glow([0xff3fd0, 0x29f0ff, 0x46e07a][i % 3]), outline: false }); } }
  else if (type === 'halo') { const ring = add(g, TOR(r*0.6, r*0.08), 0, 0, r*0.55, 0, { mat: glow(0xfff6b0), outline: false }); ring.rotation.x = Math.PI/2; car.halo = ring; }
}
