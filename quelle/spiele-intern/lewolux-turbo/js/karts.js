// Fahrer, Fahrzeuge und ihre 3D-Modelle (alles aus Grundformen, Comic-Look mit Umrisslinie)
import * as THREE from './three.module.min.js';

export const DRIVERS = [
  { id: 'nervbert', name: 'Nervbert', from: 'Nervbert', ride: 'Turbo-Rasenmäher', icon: '🧔', color: '#ff5a3c', pitch: 0.8,
    st: { speed: 5, accel: 2, handling: 2, weight: 5 },
    say: { start: 'Platz da, Onkel kommt!', hit: 'Hehe, Pech gehabt!', ouch: 'Mein frisch gemähter Rasen!', pass: 'Tschüssikowski!', win: 'Ich hab’s euch ja gesagt!', item: 'Na, was haben wir denn da?' } },
  { id: 'kritzel', name: 'Kritzel', from: 'Kritzelheld', ride: 'Federroller', icon: '🦉', color: '#5fb6ff', pitch: 1.6,
    st: { speed: 2, accel: 5, handling: 5, weight: 1 },
    say: { start: 'Huhu, los geht’s!', hit: 'Federleicht getroffen!', ouch: 'Huch, meine Federn!', pass: 'Schuhu und weg!', win: 'Ein Fleißstern für mich!', item: 'Oh, ein Geschenk!' } },
  { id: 'pandi', name: 'Pandi', from: 'Pandi', ride: 'Blubber-Badewanne', icon: '🐼', color: '#f2f2f2', pitch: 1.35,
    st: { speed: 3, accel: 4, handling: 3, weight: 3 },
    say: { start: 'Bambus-Turbo an!', hit: 'Blubb, erwischt!', ouch: 'Mein Badeschaum!', pass: 'Platsch, vorbei!', win: 'Pandi gewinnt, juhu!', item: 'Blubb blubb!' } },
  { id: 'lux', name: 'Lux', from: 'Lewolux', ride: 'Neon-Flitzer', icon: '🦁', color: '#a24bff', pitch: 0.95,
    st: { speed: 5, accel: 3, handling: 3, weight: 4 },
    say: { start: 'Zeit für Glanz!', hit: 'Roaar, getroffen!', ouch: 'Meine Mähne!', pass: 'Neon zieht vorbei!', win: 'König der Strecke!', item: 'Das nehm ich!' } },
  { id: 'kicker', name: 'Kicker-Kid', from: 'Schulhofkicker', ride: 'Bolzplatz-Buggy', icon: '⚽', color: '#3ad46a', pitch: 1.25,
    st: { speed: 3, accel: 5, handling: 4, weight: 2 },
    say: { start: 'Anstoß!', hit: 'Tooor!', ouch: 'Foul! Das war Foul!', pass: 'Doppelpass und weg!', win: 'Der Pokal gehört mir!', item: 'Zuspiel!' } },
  { id: 'sonni', name: 'Sonni', from: 'House in the Desert', ride: 'Dünen-Buggy', icon: '🤠', color: '#ffb23c', pitch: 1.1,
    st: { speed: 4, accel: 3, handling: 4, weight: 3 },
    say: { start: 'Sonnencreme drauf und los!', hit: 'Volltreffer!', ouch: 'Mein Hut! Mein Hut!', pass: 'Heiß, heißer, Sonni!', win: 'Sonnenschein-Sieg!', item: 'Ein Fundstück!' } },
];

const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = new Map();
export function toon(color, emissive) {
  const k = color + '|' + (emissive || 0);
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color, gradientMap: grad, emissive: emissive || 0 }));
  return mats.get(k);
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x150a24, side: THREE.BackSide });

function add(parent, geo, color, x, y, z, opt = {}) {
  const m = new THREE.Mesh(geo, opt.mat || toon(color, opt.em));
  m.position.set(x, y, z);
  if (opt.rx) m.rotation.x = opt.rx; if (opt.ry) m.rotation.y = opt.ry; if (opt.rz) m.rotation.z = opt.rz;
  if (opt.s) m.scale.set(...opt.s);
  parent.add(m);
  if (opt.outline !== false) { const o = new THREE.Mesh(geo, outlineMat); o.scale.setScalar(1 + (opt.ol || 0.07)); m.add(o); }
  return m;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const S = (r, ws = 14, hs = 10) => new THREE.SphereGeometry(r, ws, hs);
const C = (r1, r2, h, n = 14) => new THREE.CylinderGeometry(r1, r2, h, n);

function wheel(parent, x, y, z, r = 0.42, w = 0.36, color = 0x1a1424, rim = 0xdddddd) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const t = add(g, C(r, r, w, 16), color, 0, 0, 0, { rz: Math.PI/2, ol: 0.05 });
  add(t, C(r*0.5, r*0.5, w + 0.04, 10), rim, 0, 0, 0, { outline: false });
  return g;
}
function eyes(head, r, y, z, sep, pupil = 0x111111, size = 0.22) {
  for (const s of [-1, 1]) {
    const e = add(head, S(size, 10, 8), 0xffffff, s*sep, y, z, { ol: 0.12 });
    add(e, S(size*0.5, 8, 6), pupil, 0, 0, size*0.62, { outline: false });
  }
}
function hawaiiTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#ff5a3c'; g.fillRect(0, 0, 64, 64);
  const cols = ['#ffe14a', '#2fd4ff', '#46e07a', '#fff'];
  for (let i = 0; i < 18; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.arc(Math.random()*64, Math.random()*64, 3 + Math.random()*4, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Baut Fahrer + Fahrzeug. Rückgabe: { root, body, wheels[], driver, flame, spark }
export function buildRacer(id) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const driver = new THREE.Group(); body.add(driver);
  const wheels = [];
  let exhaustZ = -1.5, exhaustY = 0.6;

  if (id === 'nervbert') {
    // Rasenmäher-Kart
    add(body, B(1.9, 0.5, 2.6), 0xd8322a, 0, 0.6, 0);
    add(body, B(1.5, 0.7, 0.9), 0x2a2a2a, 0, 0.9, -1.25);          // Motor
    add(body, B(1.3, 0.25, 0.6), 0x2fae52, 0, 1.0, 1.15);          // Grasfang
    add(body, C(0.08, 0.08, 1.2, 6), 0x444444, 0, 1.3, 0.75, { rx: -0.6 }); // Lenksäule
    add(body, B(1.0, 0.1, 0.1), 0x222222, 0, 1.75, 0.95);
    wheels.push(wheel(body, -1.0, 0.45, 0.95, 0.38), wheel(body, 1.0, 0.45, 0.95, 0.38), wheel(body, -1.05, 0.55, -0.95, 0.55, 0.45), wheel(body, 1.05, 0.55, -0.95, 0.55, 0.45));
    // Fahrer: Onkel im Hawaiihemd
    const shirt = new THREE.MeshToonMaterial({ map: hawaiiTex(), gradientMap: grad });
    add(driver, S(0.75, 14, 10), 0, 0, 1.55, -0.2, { mat: shirt, s: [1.1, 1.05, 0.95] });
    const head = add(driver, S(0.55), 0xf1b48a, 0, 2.45, -0.1);
    add(head, S(0.18, 8, 6), 0xe89a72, 0, -0.05, 0.53, { ol: 0.1 });        // Nase
    add(head, B(0.6, 0.14, 0.12), 0x4a2a14, 0, -0.22, 0.48, { ol: 0.1 });    // Schnurrbart
    add(head, S(0.56, 12, 8), 0x4a2a14, 0, 0.18, -0.08, { s: [1, 0.55, 1], outline: false });
    for (const s of [-1, 1]) add(head, C(0.17, 0.17, 0.06, 12), 0x222244, s*0.22, 0.42, 0.18, { rx: 1.2 }); // Sonnenbrille auf dem Kopf
    eyes(head, 0.55, 0.05, 0.42, 0.2, 0x111111, 0.13);
    for (const s of [-1, 1]) add(driver, C(0.16, 0.14, 0.9, 8), 0xf1b48a, s*0.6, 1.6, 0.45, { rx: 1.2, rz: -s*0.2 });
  } else if (id === 'kritzel') {
    // Roller
    add(body, B(0.7, 0.25, 2.4), 0x2b6fd6, 0, 0.55, 0);
    add(body, B(0.75, 0.9, 0.5), 0x2b6fd6, 0, 1.0, 1.05);
    add(body, C(0.06, 0.06, 1.4, 6), 0xcccccc, 0, 1.6, 1.15, { rx: -0.25 });
    add(body, B(1.2, 0.1, 0.1), 0x222222, 0, 2.25, 1.3);
    add(body, B(0.8, 0.5, 0.9), 0xffd23c, 0, 0.85, -0.85);
    wheels.push(wheel(body, 0, 0.4, 1.15, 0.4, 0.3), wheel(body, 0, 0.4, -1.1, 0.4, 0.3));
    for (const s of [-1, 1]) add(body, C(0.15, 0.15, 0.12, 8), 0xffffff, s*0.25, 1.2, 1.32, { rx: Math.PI/2, em: 0x555555 });
    // Eule
    const o = add(driver, S(0.75), 0x5fb6ff, 0, 1.8, -0.3, { s: [1, 1.15, 0.95] });
    add(o, S(0.5, 12, 8), 0xd6ecff, 0, -0.2, 0.42, { s: [1, 1.1, 0.6], outline: false });
    eyes(o, 0.75, 0.3, 0.55, 0.3, 0x111111, 0.27);
    add(o, C(0, 0.12, 0.25, 6), 0xffb02e, 0, 0.05, 0.75, { rx: Math.PI/2 + 0.4 });
    for (const s of [-1, 1]) {
      add(o, C(0, 0.18, 0.4, 6), 0x3a8ae0, s*0.42, 0.8, 0, { rz: -s*0.4 });       // Federohren
      add(o, S(0.35, 10, 8), 0x3a8ae0, s*0.72, 0.0, 0.1, { s: [0.45, 1, 0.9], rz: s*0.4 }); // Flügel
    }
    add(o, B(0.9, 0.12, 0.6), 0x8a5a2a, 0, 0.75, -0.1, { rx: 0.2 }); // Fliegerkappe
    exhaustZ = -1.4; exhaustY = 0.7;
  } else if (id === 'pandi') {
    // Badewanne auf Rollen
    add(body, B(1.9, 0.9, 2.7), 0xf4f7ff, 0, 0.95, 0, { s: [1, 1, 1] });
    add(body, B(1.55, 0.2, 2.3), 0x7fd6ff, 0, 1.33, 0, { outline: false, em: 0x103040 });
    for (let i = 0; i < 9; i++) add(body, S(0.18 + Math.random()*0.18, 8, 6), 0xffffff, (Math.random() - .5)*1.5, 1.45, (Math.random() - .5)*2.2, { outline: false, em: 0x333333 });
    add(body, C(0.08, 0.08, 0.6, 6), 0xd0d0d0, 0, 1.6, -1.3);
    add(body, C(0.07, 0.07, 0.5, 6), 0xd0d0d0, 0, 1.9, -1.15, { rx: Math.PI/2 });
    wheels.push(wheel(body, -0.95, 0.35, 0.95, 0.33, 0.3, 0xb08a3a, 0xffe08a), wheel(body, 0.95, 0.35, 0.95, 0.33, 0.3, 0xb08a3a, 0xffe08a),
                wheel(body, -0.95, 0.35, -0.95, 0.33, 0.3, 0xb08a3a, 0xffe08a), wheel(body, 0.95, 0.35, -0.95, 0.33, 0.3, 0xb08a3a, 0xffe08a));
    const h = add(driver, S(0.72), 0xffffff, 0, 2.05, -0.15);
    for (const s of [-1, 1]) {
      add(h, S(0.24, 10, 8), 0x1a1a1a, s*0.52, 0.55, 0);                               // Ohren
      add(h, S(0.2, 10, 8), 0x1a1a1a, s*0.27, 0.08, 0.55, { s: [1, 1.3, 0.6], rz: s*0.5 }); // Augenflecken
      add(h, S(0.08, 6, 6), 0xffffff, s*0.27, 0.12, 0.66, { outline: false });
      add(h, S(0.12, 8, 6), 0xff9ab0, s*0.45, -0.2, 0.5, { outline: false });             // Bäckchen
      add(driver, S(0.22, 8, 6), 0x1a1a1a, s*0.75, 1.6, 0.3);                            // Pfoten
    }
    add(h, S(0.1, 8, 6), 0x1a1a1a, 0, -0.1, 0.7, { outline: false });
    exhaustZ = -1.5; exhaustY = 1.2;
  } else if (id === 'lux') {
    // Neon-Flitzer
    add(body, B(1.9, 0.45, 3.0), 0x2a1a5a, 0, 0.6, 0);
    add(body, B(1.5, 0.35, 1.0), 0x2a1a5a, 0, 0.75, 1.5, { rx: 0.15 });
    add(body, B(2.2, 0.08, 0.5), 0x29f0ff, 0, 1.25, -1.55, { mat: new THREE.MeshBasicMaterial({ color: 0x29f0ff }) }); // Spoiler
    for (const s of [-1, 1]) {
      add(body, B(0.08, 0.6, 0.3), 0x2a1a5a, s*0.9, 1.0, -1.55);
      add(body, B(0.06, 0.08, 2.8), 0, s*0.97, 0.6, 0, { mat: new THREE.MeshBasicMaterial({ color: 0xff3fd0 }), outline: false });
      add(body, B(0.35, 0.12, 0.05), 0, s*0.6, 0.72, 2.0, { mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), outline: false });
    }
    wheels.push(wheel(body, -1.05, 0.45, 1.1, 0.42, 0.38, 0x1a1424, 0x29f0ff), wheel(body, 1.05, 0.45, 1.1, 0.42, 0.38, 0x1a1424, 0x29f0ff),
                wheel(body, -1.1, 0.5, -1.1, 0.5, 0.45, 0x1a1424, 0xff3fd0), wheel(body, 1.1, 0.5, -1.1, 0.5, 0.45, 0x1a1424, 0xff3fd0));
    const t = add(driver, S(0.6), 0xffa53a, 0, 1.5, -0.3, { s: [1, 1.1, 0.9] });
    const h = add(driver, S(0.55), 0xffb24a, 0, 2.35, -0.1);
    const mane = add(h, new THREE.TorusGeometry(0.55, 0.3, 8, 16), 0x8a3cff, 0, 0.05, -0.1, { em: 0x3a0a6a });
    add(h, S(0.3, 10, 8), 0xffe0a0, 0, -0.18, 0.4, { s: [1.2, 0.8, 0.7], outline: false });
    add(h, S(0.1, 6, 6), 0x3a1a0a, 0, -0.05, 0.62, { outline: false });
    for (const s of [-1, 1]) add(h, S(0.15, 8, 6), 0xffa53a, s*0.45, 0.48, 0);
    eyes(h, 0.55, 0.13, 0.42, 0.2, 0x2a6aff, 0.13);
    void t; void mane;
  } else if (id === 'kicker') {
    // Bolzplatz-Buggy mit Ballnase
    add(body, B(1.6, 0.4, 2.6), 0x2fae52, 0, 0.6, 0);
    add(body, B(1.6, 0.06, 2.6), 0xffffff, 0, 0.82, 0, { outline: false });
    add(body, S(0.6, 12, 10), 0xffffff, 0, 0.75, 1.5);
    for (let i = 0; i < 5; i++) add(body, S(0.16, 5, 4), 0x111111, Math.cos(i*1.25)*0.45, 0.75 + Math.sin(i*1.25)*0.45, 1.85, { outline: false });
    for (const s of [-1, 1]) add(body, C(0.05, 0.05, 1.5, 6), 0xdddddd, s*0.75, 1.4, -0.9);
    add(body, B(1.6, 0.06, 0.06), 0xdddddd, 0, 2.15, -0.9);
    wheels.push(wheel(body, -0.95, 0.45, 0.9, 0.42), wheel(body, 0.95, 0.45, 0.9, 0.42), wheel(body, -1.0, 0.5, -0.9, 0.5, 0.42), wheel(body, 1.0, 0.5, -0.9, 0.5, 0.42));
    const jersey = add(driver, C(0.45, 0.55, 1.0, 12), 0x5fb6ff, 0, 1.45, -0.25);
    for (const y of [-0.25, 0.1, 0.4]) add(jersey, C(0.5, 0.52, 0.12, 12), 0xffffff, 0, y, 0, { outline: false });
    const h = add(driver, S(0.5), 0xf1c09a, 0, 2.3, -0.15);
    add(h, S(0.52, 12, 8), 0x7a3a14, 0, 0.18, -0.08, { s: [1, 0.6, 1] });
    add(h, C(0.53, 0.53, 0.15, 14), 0xe52a2a, 0, 0.18, 0, { outline: false });
    eyes(h, 0.5, 0.0, 0.4, 0.18, 0x3a2a14, 0.12);
    add(h, B(0.22, 0.05, 0.05), 0x7a2a1a, 0, -0.22, 0.46, { outline: false });
  } else if (id === 'sonni') {
    // Dünen-Buggy mit Sonnenschirm
    add(body, B(1.8, 0.45, 2.6), 0xffb23c, 0, 0.65, 0);
    for (const s of [-1, 1]) add(body, C(0.07, 0.07, 1.6, 6), 0x6a4a2a, s*0.85, 1.3, 0, { rz: s*0.2 });
    add(body, B(1.9, 0.08, 0.08), 0x6a4a2a, 0, 2.05, 0);
    wheels.push(wheel(body, -1.05, 0.55, 1.0, 0.55, 0.5, 0x2a2018), wheel(body, 1.05, 0.55, 1.0, 0.55, 0.5, 0x2a2018), wheel(body, -1.05, 0.6, -1.0, 0.6, 0.55, 0x2a2018), wheel(body, 1.05, 0.6, -1.0, 0.6, 0.55, 0x2a2018));
    add(driver, C(0.45, 0.55, 1.0, 12), 0xb8a070, 0, 1.45, -0.25);
    add(driver, B(0.9, 0.9, 0.5), 0x5a7a3a, 0, 1.6, -0.75);               // Rucksack
    const h = add(driver, S(0.5), 0xf3c49a, 0, 2.3, -0.15);
    const hat = add(h, C(1.05, 1.05, 0.08, 20), 0xe8c060, 0, 0.32, 0);
    add(hat, C(0.42, 0.5, 0.45, 14), 0xe8c060, 0, 0.25, 0);
    add(hat, C(0.51, 0.51, 0.1, 14), 0xc0503a, 0, 0.12, 0, { outline: false });
    eyes(h, 0.5, 0.0, 0.4, 0.18, 0x3a2a14, 0.12);
    add(h, S(0.1, 6, 6), 0xff8a6a, 0, -0.08, 0.5, { outline: false });
    for (const s of [-1, 1]) add(h, B(0.2, 0.05, 0.03), 0xffffff, s*0.2, -0.18, 0.45, { outline: false, rz: s*0.3 }); // Sonnencreme-Striche
  }
  // Auspuff-Flamme (für Turbo)
  const flame = new THREE.Group(); flame.position.set(0, exhaustY, exhaustZ); body.add(flame);
  const fo = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false }));
  fo.rotation.x = -Math.PI/2; fo.position.z = -0.6; flame.add(fo);
  const fi = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.95, depthWrite: false }));
  fi.rotation.x = -Math.PI/2; fi.position.z = -0.4; flame.add(fi);
  flame.visible = false;
  // Schatten
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20), shadowMat); sh.rotation.x = -Math.PI/2; sh.position.y = 0.06; sh.scale.set(1, 1.35, 1); root.add(sh);
  root.traverse(o => { if (o.isMesh) o.frustumCulled = true; });
  return { root, body, wheels, driver, flame, exhaustZ, exhaustY };
}

const shadowMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 4, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
})();
