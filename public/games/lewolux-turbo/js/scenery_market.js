// Umgebung "Supermarkt-Chaos" (riesige Halle, Regale, Riesen-Produkte, Kassen, Einkaufswagen, Deckenlampen)
import * as THREE from './three.module.min.js';
import { rnd } from './scenery_common.js';

export function market(K, def = {}) {
  const { scene, tr, toon, quality, m4, q, e, s3, p3, WALL, ctex } = K;
  const night = !!def.night;
  scene.fog = night ? new THREE.Fog(0x141a30, 200, 800) : new THREE.Fog(0xe8eef6, 260, 900);
  if (night) K.lights({ hemi: [0x6a7aff, 0x1a1a2a, 0.75], sun: [0xa0c0ff, 0.9], dir: [-60, 400, -40] });
  else K.lights({ hemi: [0xffffff, 0xb8c0d0, 1.35], sun: [0xffffff, 1.6], dir: [-60, 400, -40] });
  K.groundLevel = -0.3;
  const B = K.inner.clone().expandByScalar(90), size = B.getSize(new THREE.Vector3()), c = B.getCenter(new THREE.Vector3()), H = 60;
  // Boden: Fliesen
  const tile = ctex(256, 256, (g, w, h) => { g.fillStyle = '#e8ecf2'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8dde6'; for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) if ((x + y)/64 % 2) g.fillRect(x, y, 64, 64); g.strokeStyle = '#c0c6d0'; g.lineWidth = 2; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(size.x/8, size.z/8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.z), new THREE.MeshPhongMaterial({ map: tile, shininess: 70, specular: 0x666666, color: night ? 0x6a7090 : 0xffffff })); floor.rotation.x = -Math.PI/2; floor.position.set(c.x, -0.3, c.z); floor.receiveShadow = true; scene.add(floor);
  // Wände und Decke
  const wallT = ctex(512, 256, (g, w, h) => { g.fillStyle = '#f4f0e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#e52a2a'; g.fillRect(0, h - 40, w, 40); g.fillStyle = '#ffe14a'; g.fillRect(0, h - 48, w, 8); g.font = '900 40px system-ui'; g.fillStyle = '#e52a2a'; g.textAlign = 'center'; g.fillText('LEWOLUX-MARKT', w/2, 80); g.font = '60px sans-serif'; g.fillText('🛒 🍎 🥕 🍞 🧀', w/2, 160); });
  wallT.wrapS = THREE.RepeatWrapping; wallT.repeat.set(-4, 1);
  const wm = new THREE.MeshLambertMaterial({ map: wallT, side: THREE.BackSide, color: night ? 0x5a6080 : 0xffffff });
  const hall = new THREE.Mesh(new THREE.BoxGeometry(size.x, H, size.z), [wm, wm, new THREE.MeshLambertMaterial({ color: night ? 0x20253a : 0xdfe4ec, side: THREE.BackSide }), new THREE.MeshLambertMaterial({ color: night ? 0x3a4058 : 0xffffff, side: THREE.BackSide }), wm, wm]);
  hall.position.set(c.x, H/2 - 0.3, c.z); scene.add(hall);
  // Deckenlampen (Leuchtstreifen)
  const lamps = []; for (let x = B.min.x + 20; x < B.max.x; x += 36) for (let z = B.min.z + 20; z < B.max.z; z += 24) lamps.push([x, z]);
  if (night) lamps.splice(0, lamps.length, ...lamps.filter((_, i) => i % 3 === 0));
  K.inst(new THREE.BoxGeometry(14, 0.6, 2.2), K.glow(night ? 0xbfe0ff : 0xfffcf0), lamps, ([x, z]) => { m4.compose(p3.set(x, H - 2, z), q.identity(), s3.setScalar(1)); });
  K.inst(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 4), toon(0x888888), lamps.flatMap(l => [[l[0] - 6, l[1]], [l[0] + 6, l[1]]]), ([x, z]) => { m4.compose(p3.set(x, H - 1, z), q.identity(), s3.setScalar(1)); });
  // Regale entlang der Strecke
  const prodCols = [0xe52a2a, 0xffe14a, 0x3ad46a, 0x2a5ad6, 0xff8a3c, 0xa24bff, 0xffffff, 0xff5aa8, 0x29c8f0];
  const shelves = []; for (let i = 0; i < tr.N; i += 13) for (const s of [-1, 1]) { const p = tr.P[i], r = tr.R[i], l = s*(WALL + 5), x = p.x + r.x*l, z = p.z + r.z*l; if (K.distTo(x, z) < WALL + 3.5) continue; shelves.push([x, z, Math.atan2(tr.T[i].x, tr.T[i].z), s]); }
  K.inst(new THREE.BoxGeometry(1, 1, 1), toon(0x5a7ab0, 0x22304a), shelves, ([x, z, a]) => { m4.compose(p3.set(x, 5.4, z), q.setFromEuler(e.set(0, a, 0)), s3.set(2.6, 11.4, 9.4)); }, true);
  const boards = []; shelves.forEach(([x, z, a, s]) => { for (let row = 0; row < 5; row++) boards.push([x + Math.cos(a)*s*1.3, 0.55 + row*2.2, z - Math.sin(a)*s*1.3, a]); });
  K.inst(new THREE.BoxGeometry(1, 1, 1), toon(0xe8ecf2, 0x8090a8), boards, ([x, y, z, a]) => { m4.compose(p3.set(x, y, z), q.setFromEuler(e.set(0, a, 0)), s3.set(1.4, 0.18, 9.6)); });
  const prods = []; shelves.forEach(([x, z, a, s], n) => { for (let row = 0; row < 5; row++) for (let k = -2; k <= 2; k++) { if (Math.random() < 0.12) continue; const cs = Math.cos(a), sn = Math.sin(a); const off = k*1.8; prods.push([x + sn*off + cs*s*1.6, 1.32 + row*2.2, z + cs*off - sn*s*1.6, a, (n + row + k + 20) % prodCols.length]); } });
  K.inst(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), prods, ([x, y, z, a, ci], i, im) => { const tall = Math.random() < 0.5; m4.compose(p3.set(x, y + (tall ? 0.15 : 0), z), q.setFromEuler(e.set(0, a + rnd(-0.2, 0.2), 0)), s3.set(1.4, tall ? 1.8 : 1.3, 0.7)); im.setColorAt(i, new THREE.Color(prodCols[ci])); });
  // Riesen-Produkte im Innenraum
  const giant = (x, z, kind) => { const g = new THREE.Group(); g.position.set(x, -0.3, z); g.rotation.y = rnd(0, 6); scene.add(g);
    if (kind === 0) { const t = ctex(256, 384, (cc, w, h) => { cc.fillStyle = '#ffb21a'; cc.fillRect(0, 0, w, h); cc.fillStyle = '#e52a2a'; cc.fillRect(0, 0, w, 90); cc.font = '900 50px system-ui'; cc.fillStyle = '#fff'; cc.textAlign = 'center'; cc.fillText('KNUSPER', w/2, 64); cc.font = '140px sans-serif'; cc.fillText('🥣', w/2, 260); });
      const box = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 4), [toon(0xffb21a), toon(0xffb21a), toon(0xffb21a), toon(0xffb21a), new THREE.MeshToonMaterial({ map: t }), new THREE.MeshToonMaterial({ map: t })]); box.position.y = 8; box.castShadow = true; g.add(box); }
    else if (kind === 1) { const can = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 10, 28), toon(0xe52a2a)); can.position.y = 5; can.castShadow = true; g.add(can); const lid = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.05, 0.6, 28), toon(0xd0d0d8)); lid.position.y = 10; g.add(lid); const band = new THREE.Mesh(new THREE.CylinderGeometry(4.08, 4.08, 3, 28), toon(0xffffff)); band.position.y = 5; g.add(band); }
    else if (kind === 2) { const ap = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 18), toon(0x46d04a)); ap.scale.y = 0.9; ap.position.y = 5.2; ap.castShadow = true; g.add(ap); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.5, 6), toon(0x6a3a1a)); st.position.y = 11; g.add(st); const lf = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 6), toon(0x2a8a2a)); lf.scale.set(1, 0.3, 0.6); lf.position.set(1.2, 11.4, 0); g.add(lf); }
    else { const m = new THREE.Mesh(new THREE.CapsuleGeometry(2.4, 8, 6, 12), toon(0xffffff)); m.position.y = 6.5; m.castShadow = true; g.add(m); const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.4, 16), toon(0x2a5ad6)); cap.position.y = 13.2; g.add(cap); const lbl = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 3.5, 24, 1, true), toon(0x2a8ad6)); lbl.position.y = 6.5; g.add(lbl); }
  };
  K.spots(Math.round(10*quality + 4), WALL + 10, 120, B).forEach(([x, z], i) => giant(x, z, i % 4));
  // Kassen mit Förderband und Kassenbon
  const ks = K.spots(1, WALL + 12, 80, B)[0];
  if (ks) { const g = new THREE.Group(); g.position.set(ks[0], -0.3, ks[1]); g.rotation.y = rnd(0, 6); scene.add(g);
    for (let k = 0; k < 4; k++) { const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 8), toon(0x2a5ad6)); desk.position.set(k*6, 0.8, 0); desk.castShadow = true; g.add(desk); const belt = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 6), toon(0x1a1a22)); belt.position.set(k*6, 1.65, -0.5); g.add(belt);
      const reg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), toon(0xd0d6e0)); reg.position.set(k*6, 2.2, 3); g.add(reg); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), K.glow(0x7affb0)); scr.position.set(k*6, 2.3, 2.49); scr.rotation.y = Math.PI; g.add(scr);
      const num = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.2), K.glow([0xffe14a, 0x3ad46a, 0xff5a5a, 0x29c8f0][k])); num.position.set(k*6, 5.5, 3); g.add(num); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), toon(0x888888)); pole.position.set(k*6, 3.6, 3); g.add(pole);
      const bon = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.4), toon(0xffffff)); bon.position.set(k*6 + 0.4, 2.2, 3.2); bon.rotation.x = -0.4; g.add(bon); } }
  // Einkaufswagen verteilt
  const cartM = toon(0xc8ced8), cartSp = K.along(Math.round(26*quality), WALL + 6, WALL + 30);
  for (const [x, z, d] of cartSp) { const g = new THREE.Group(); g.position.set(x, -0.3, z); g.rotation.y = rnd(0, 6); scene.add(g); const basket = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3), cartM); basket.position.y = 1.6; g.add(basket); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2, 6), toon(0xe52a2a)); h.rotation.z = Math.PI/2; h.position.set(0, 2.5, -1.6); g.add(h);
    for (const [wx, wz] of [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 10), toon(0x222222)); w.rotation.z = Math.PI/2; w.position.set(wx, 0.25, wz); g.add(w); } void d; }
  // Hängende Angebotsschilder über der Strecke
  const tags = ['ANGEBOT!', '-50%', 'NEU!', 'KASSE ⟶', 'FRISCH!', '2 FÜR 1'];
  for (let k = 0; k < 10; k++) { const i = Math.round((k + 0.5)/10*tr.N) % tr.N, p = tr.P[i]; const t = ctex(256, 128, (g, w, h) => { g.fillStyle = k % 2 ? '#ffe14a' : '#e52a2a'; g.fillRect(0, 0, w, h); g.fillStyle = k % 2 ? '#e52a2a' : '#fff'; g.font = '900 48px system-ui'; g.textAlign = 'center'; g.fillText(tags[k % tags.length], w/2, 82); });
    const sgn = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.3), [toon(0xffffff), toon(0xffffff), toon(0xffffff), toon(0xffffff), new THREE.MeshToonMaterial({ map: t }), new THREE.MeshToonMaterial({ map: t })]); sgn.position.set(p.x, p.y + 15, p.z); sgn.rotation.y = Math.atan2(tr.T[i].x, tr.T[i].z); scene.add(sgn);
    for (const s of [-4, 4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H - 18, 4), toon(0x999999)); w.position.set(p.x + Math.cos(sgn.rotation.y)*s, p.y + 15 + (H - 18)/2, p.z - Math.sin(sgn.rotation.y)*s); scene.add(w); }
    K.upd.push(t2 => { sgn.rotation.z = Math.sin(t2*1.2 + k)*0.05; }); }
  if (night) { // leuchtende Kühltruhen und Notausgang-Schilder
    const fr = K.along(Math.round(40*quality + 8), WALL + 12, WALL + 30).map(([x, z]) => [x, z, rnd(0, 6)]);
    K.inst(new THREE.BoxGeometry(8, 2.2, 3), toon(0xd8e0f0, 0x303850), fr, ([x, z, a]) => { m4.compose(p3.set(x, 0.8, z), q.setFromEuler(e.set(0, a, 0)), s3.setScalar(1)); });
    K.inst(new THREE.BoxGeometry(7.4, 0.2, 2.4), K.glow(0x7ae0ff), fr, ([x, z, a]) => { m4.compose(p3.set(x, 1.95, z), q.setFromEuler(e.set(0, a, 0)), s3.setScalar(1)); });
    K.posts({ pole: 0x6a7090, h: 3, every: 34, lamp: [0x29c8f0, 0xffe14a], halo: 0.5 });
  }
  K.billboards(toon(0xe52a2a), 0x888888);
  return K.finish();
}
