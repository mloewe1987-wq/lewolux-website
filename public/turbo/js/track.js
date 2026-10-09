// Strecke "Neon-Dschungel": Kurve, Abtastpunkte, Ortung und Geometrie
import * as THREE from './three.module.min.js';

export const HALF = 11;      // halbe Fahrbahnbreite
export const WALL = 23;      // Abstand der Bande von der Mitte
export const N = 1400;       // Abtastpunkte

const CP = [[0,0,0],[60,0,0],[120,0,1],[168,-18,3],[190,-68,6],[165,-112,8],[118,-100,7],[100,-70,5],[78,-60,4],
  [46,-80,2],[12,-128,0],[-48,-142,0],[-108,-112,3],[-132,-52,5],[-104,-2,3],[-58,14,1]];

export function makeTrack() {
  const S = 1.7;
  const curve = new THREE.CatmullRomCurve3(CP.map(p => new THREE.Vector3(p[0]*S, p[2], p[1]*S)), true, 'centripetal');
  const P = curve.getSpacedPoints(N).slice(0, N);
  const T = [], R = [], Y = [];
  for (let i = 0; i < N; i++) {
    const a = P[(i - 1 + N) % N], b = P[(i + 1) % N];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    T.push(t); R.push(new THREE.Vector3(-t.z, 0, t.x)); Y.push(P[i].y);
  }
  // Kurvigkeit voraus (für KI und Randsteine)
  const C = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = T[i], b = T[(i + 30) % N];
    C[i] = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
  }
  const len = curve.getLength(); const seg = len / N;
  const tr = { curve, P, T, R, Y, C, len, seg, N };

  // Ortung: nächster Abtastpunkt (lokal, mit Hinweis)
  tr.locate = (pos, hint = -1, out = {}) => {
    let best = 1e18, bi = 0;
    if (hint < 0) {
      for (let i = 0; i < N; i += 2) { const d = (P[i].x-pos.x)**2 + (P[i].z-pos.z)**2; if (d < best) { best = d; bi = i; } }
      hint = bi; best = 1e18;
    }
    for (let k = -40; k <= 40; k++) {
      const i = (hint + k + N) % N; const d = (P[i].x-pos.x)**2 + (P[i].z-pos.z)**2;
      if (d < best) { best = d; bi = i; }
    }
    const p = P[bi], dx = pos.x - p.x, dz = pos.z - p.z;
    out.i = bi; out.lat = dx*R[bi].x + dz*R[bi].z; out.along = (dx*T[bi].x + dz*T[bi].z) / seg;
    const nx = P[(bi + 1) % N];
    out.y = p.y + (nx.y - p.y) * Math.max(-1, Math.min(1, out.along));
    out.s = bi + out.along;
    return out;
  };
  return tr;
}

function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

// Band entlang der Strecke zwischen zwei seitlichen Abständen
function ribbon(tr, l0, l1, y0, y1, vScale, step = 1) {
  const pos = [], uv = [], idx = [];
  const n = tr.N / step;
  for (let k = 0; k <= n; k++) {
    const i = (k * step) % tr.N, p = tr.P[i], r = tr.R[i];
    pos.push(p.x + r.x*l0, p.y + y0, p.z + r.z*l0, p.x + r.x*l1, p.y + y1, p.z + r.z*l1);
    const v = k * step * tr.seg / vScale; uv.push(0, v, 1, v);
    if (k < n) { const a = k*2; idx.push(a, a+1, a+2, a+1, a+3, a+2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); fixN(g);
  return g;
}

export function buildTrackMeshes(tr, scene, toon) {
  const group = new THREE.Group(); scene.add(group);
  // Fahrbahn
  const asphalt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2b2346'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 30 + Math.random()*40|0; g.fillStyle = `rgba(${v+20},${v},${v+45},.5)`; g.fillRect(Math.random()*w, Math.random()*h, 2, 2); }
    g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(w/2 - 3, 0, 6, h*0.5);
  }, true);
  const road = new THREE.Mesh(ribbon(tr, -HALF, HALF, 0.02, 0.02, 22), new THREE.MeshLambertMaterial({ map: asphalt }));
  group.add(road);
  // Neon-Kanten
  const edgeL = new THREE.Mesh(ribbon(tr, -HALF - 0.6, -HALF + 0.1, 0.05, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0x29f0ff }));
  const edgeR = new THREE.Mesh(ribbon(tr, HALF - 0.1, HALF + 0.6, 0.05, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xff3fd0 }));
  group.add(edgeL, edgeR);
  // Randsteine in Kurven
  const curbTex = canvasTex(32, 64, (g, w, h) => { g.fillStyle = '#ffe14a'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a2cff'; g.fillRect(0, 0, w, h/2); }, true);
  const curbPos = [], curbUv = [], curbIdx = []; let cn = 0;
  for (let i = 0; i < tr.N; i++) {
    if (tr.C[(i - 15 + tr.N) % tr.N] < 0.55) continue;
    const j = (i + 1) % tr.N;
    for (const side of [-1, 1]) {
      const a0 = side*(HALF + 0.6), a1 = side*(HALF + 2.4);
      const p = tr.P[i], q = tr.P[j], r = tr.R[i], s = tr.R[j];
      curbPos.push(p.x + r.x*a0, p.y + .06, p.z + r.z*a0, p.x + r.x*a1, p.y + .06, p.z + r.z*a1,
                   q.x + s.x*a0, q.y + .06, q.z + s.z*a0, q.x + s.x*a1, q.y + .06, q.z + s.z*a1);
      const v0 = i*tr.seg/4, v1 = (i + 1)*tr.seg/4; curbUv.push(0, v0, 1, v0, 0, v1, 1, v1);
      curbIdx.push(cn, cn+2, cn+1, cn+1, cn+2, cn+3); cn += 4;
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(curbPos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(curbUv, 2));
  cg.setIndex(curbIdx); fixN(cg);
  const curbMat = new THREE.MeshLambertMaterial({ map: curbTex, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(cg, curbMat));
  // Seitenstreifen (Gras, fällt zum Boden ab)
  const grassTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1d4a3a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < .5 ? '#2a6b4a' : '#183c33'; g.fillRect(Math.random()*w, Math.random()*h, 2, 3); }
  }, true);
  const grassMat = new THREE.MeshLambertMaterial({ map: grassTex });
  for (const side of [-1, 1]) {
    const a = side*(HALF + 0.5), b = side*(WALL + 0.2), c = side*(WALL + 14);
    const g1 = ribbon(tr, a, b, 0.0, -0.05, 6, 2), g2 = ribbon(tr, b, c, -0.05, -6, 6, 2);
    if (side < 0) { flip(g1); flip(g2); }
    group.add(new THREE.Mesh(g1, grassMat), new THREE.Mesh(g2, grassMat));
  }
  // Bande: niedrige Mauer mit Leuchtkante
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x3a1f66 });
  for (const side of [-1, 1]) {
    const w = side*WALL;
    const wg = vertical(tr, w, -0.3, 1.1, 3); if (side > 0) flip(wg);
    group.add(new THREE.Mesh(wg, wallMat));
    group.add(new THREE.Mesh(ribbon(tr, w - 0.25*side, w + 0.25*side, 1.12, 1.12, 10, 3), new THREE.MeshBasicMaterial({ color: side < 0 ? 0x29f0ff : 0xff3fd0, side: THREE.DoubleSide })));
  }
  // Start/Ziel: Schachbrett
  const chk = canvasTex(128, 16, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#fff' : '#111'; g.fillRect(x*8, y*8, 8, 8); } });
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(HALF*2, 2.2), new THREE.MeshBasicMaterial({ map: chk }));
  sl.rotation.x = -Math.PI/2; const holder = new THREE.Group(); holder.add(sl);
  holder.position.copy(tr.P[0]).add(new THREE.Vector3(0, .07, 0)); holder.rotation.y = Math.atan2(-tr.R[0].z, tr.R[0].x);
  group.add(holder);
  // Start-Bogen
  const arch = new THREE.Group();
  const pillarM = toon(0x7a2cff), glow = new THREE.MeshBasicMaterial({ color: 0x29f0ff });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 11, 1.6), pillarM); p.position.set(s*(HALF + 2), 5.5, 0); arch.add(p);
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10.5, 1.7), glow); g.position.set(s*(HALF + 2) - s*0.75, 5.5, 0); arch.add(g);
  }
  const ban = canvasTex(1024, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff3fd0'); gr.addColorStop(.5, '#7a2cff'); gr.addColorStop(1, '#29f0ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#140b2e'; g.fillRect(8, 8, w - 16, h - 16);
    g.font = '900 104px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#ff3fd0'; g.strokeText('LEWOLUX TURBO', w/2, h/2 + 6); g.fillStyle = '#fff36b'; g.fillText('LEWOLUX TURBO', w/2, h/2 + 6);
  });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(HALF*2 + 5.6, 3.2, 1), [pillarM, pillarM, pillarM, pillarM, new THREE.MeshBasicMaterial({ map: ban }), new THREE.MeshBasicMaterial({ map: ban })]);
  banner.position.y = 10.4; arch.add(banner);
  arch.position.copy(tr.P[0]); arch.rotation.y = Math.atan2(-tr.R[0].z, tr.R[0].x);
  group.add(arch);
  return group;
}

function flip(g) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i+1]; ix[i+1] = ix[i+2]; ix[i+2] = t; } fixN(g); }
function vertical(tr, lat, y0, y1, step) {
  const pos = [], idx = []; const n = tr.N / step;
  for (let k = 0; k <= n; k++) {
    const i = (k*step) % tr.N, p = tr.P[i], r = tr.R[i];
    pos.push(p.x + r.x*lat, p.y + y0, p.z + r.z*lat, p.x + r.x*lat, p.y + y1, p.z + r.z*lat);
    if (k < n) { const a = k*2; idx.push(a, a+2, a+1, a+1, a+2, a+3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); fixN(g); return g;
}
function placeAt(tr, obj, i, lat, y) { const p = tr.P[i], r = tr.R[i]; obj.position.set(p.x + r.x*lat, p.y + y, p.z + r.z*lat); }

// Normalen berechnen und kaputte (NaN/Null) durch "nach oben" ersetzen – sonst schwarze Blöcke im Leuchteffekt
export function fixN(g) {
  g.computeVertexNormals(); const n = g.attributes.normal.array;
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i+1], n[i+2]);
    if (!(l > 1e-6) || !isFinite(l)) { n[i] = 0; n[i+1] = 1; n[i+2] = 0; }
  }
}
