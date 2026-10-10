// Umgebung "Wüsten-Hitze" (sonnig, Dünen, Kakteen, Tafelberge, Oase, Zeltlager, Kamele, Steppenläufer)
import * as THREE from './three.module.min.js';
import { rnd } from './scenery_common.js';

export function desert(K, def = {}) {
  const { scene, tr, toon, quality, m4, q, e, s3, p3, WALL, ctex } = K;
  if (def.sunset) {
    scene.fog = new THREE.Fog(0xff9a6a, 220, 950);
    K.sky({ top: 0x3a2a7a, mid: 0xff6a5a, hor: 0xffc070, disc: { c0: '#fff0b0', c1: 'rgba(255,140,80,.6)', size: 300, pos: [520, 60, -480] }, clouds: { color: 'rgba(255,160,160,.8)', n: 14, y0: 60, y1: 180 } });
    K.lights({ hemi: [0xffc8a0, 0x6a3a5a, 1.05], sun: [0xffa070, 2.7], dir: [300, 120, -260] });
  } else {
  scene.fog = new THREE.Fog(0xf6d8a8, 240, 980);
  K.sky({ top: 0x1a6ad0, mid: 0x7ac2ff, hor: 0xffe2a8, disc: { c0: '#fffbe8', c1: 'rgba(255,230,150,.6)', size: 200, pos: [-300, 380, -520] }, clouds: { color: 'rgba(255,255,255,.7)', n: 8, y0: 160, y1: 260 } });
  K.lights({ hemi: [0xfff0d8, 0xb08a5a, 1.2], sun: [0xfff0d0, 2.9], dir: [-120, 340, -160] });
  }
  K.ground([0xe0b070, 0xecc080, 0xd4a060, 0xe8b878], -5.5, 110, g => { g.strokeStyle = 'rgba(160,110,60,.25)'; g.lineWidth = 2; for (let y = 0; y < 256; y += 12) { g.beginPath(); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + Math.sin(x*0.08 + y)*3); g.stroke(); } });
  const sand = toon(0xe8b878);
  // Dünen
  K.inst(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI*2, 0, Math.PI/2), sand, K.spots(Math.round(70*quality), WALL + 25, 320), ([x, z]) => { m4.compose(p3.set(x, -5.5, z), q.setFromEuler(e.set(0, rnd(0, 3), 0)), s3.set(rnd(18, 40), rnd(5, 14), rnd(12, 26))); }, true);
  // Kakteen (Saguaro)
  const cac = toon(0x3a9a4a), cacSp = [...K.along(Math.round(110*quality), WALL + 3, WALL + 30), ...K.spots(Math.round(90*quality), WALL + 30, 260)];
  const trunkG = new THREE.CapsuleGeometry(0.7, 1, 4, 10); trunkG.translate(0, 0.5, 0);
  K.inst(trunkG, cac, cacSp, ([x, z, d], i) => { const h = rnd(4, 9); cacSp[i].h = h; m4.compose(p3.set(x, K.groundY(x, z, d), z), q.identity(), s3.set(1, h, 1)); }, true);
  const armG = new THREE.CapsuleGeometry(0.45, 1.6, 4, 8); armG.translate(0, 0.8, 0);
  K.inst(armG, cac, cacSp.flatMap((c, i) => i % 3 === 2 ? [] : [[c, -1], [c, 1]]), ([[x, z, d], s]) => { const y = K.groundY(x, z, d) + rnd(2, 4); m4.compose(p3.set(x + s*1.1, y, z), q.setFromEuler(e.set(0, rnd(0, 3), 0)), s3.setScalar(rnd(0.8, 1.2))); }, true);
  K.inst(new THREE.SphereGeometry(0.3, 8, 6), K.glow(0xff5a8a), cacSp.filter((_, i) => i % 4 === 0), ([x, z, d]) => { m4.compose(p3.set(x, K.groundY(x, z, d) + rnd(4, 9), z + 0.6), q.identity(), s3.setScalar(1)); });
  // Tafelberge mit Streifen
  const stripeT = ctex(64, 256, (g, w, h) => { const cols = ['#c8643a', '#d87a48', '#b0502e', '#e09060']; for (let y = 0; y < h; y += 16) { g.fillStyle = cols[(y/16) % 4]; g.fillRect(0, y, w, 16); } });
  stripeT.wrapS = stripeT.wrapT = THREE.RepeatWrapping; stripeT.repeat.set(4, 1);
  K.inst(new THREE.CylinderGeometry(1, 1.25, 1, 9), toon(0, 0, stripeT), K.spots(Math.round(14*quality + 4), 90, 340), ([x, z]) => { const h = rnd(30, 70); m4.compose(p3.set(x, -5.5 + h/2, z), q.setFromEuler(e.set(0, rnd(0, 3), 0)), s3.set(rnd(18, 34), h, rnd(18, 34))); }, true);
  // Felsbögen über der Strecke
  const rockM = toon(0xc8643a);
  for (const f of [0.18, 0.45, 0.82]) {
    const { p, r, W } = K.gateAt(f); const H = 14;
    for (const s of [-1, 1]) { const pil = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockM); pil.position.set(p.x + r.x*s*(W + 1), p.y + 4, p.z + r.z*s*(W + 1)); pil.scale.set(4.5, 12, 4.5); pil.castShadow = true; scene.add(pil); }
    const R2 = W + 1, sy = (H - 2)/R2;
    K.inst(new THREE.DodecahedronGeometry(1, 0), rockM, Array.from({ length: 26 }, (_, k) => k), (k) => { const t = k/25*Math.PI, x = Math.cos(t)*R2, y = Math.sin(t)*R2*sy;
      m4.compose(p3.set(p.x + r.x*x, p.y + 4 + y, p.z + r.z*x), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), rnd(0, 3))), s3.set(rnd(2.6, 3.6), rnd(2.4, 3.4), rnd(2.6, 3.8))); }, true);
    K.inst(new THREE.DodecahedronGeometry(1, 0), toon(0xe0905a), Array.from({ length: 10 }, (_, k) => k), (k) => { const t = (k + 0.5)/10*Math.PI, x = Math.cos(t)*R2, y = Math.sin(t)*R2*sy + 2.4;
      m4.compose(p3.set(p.x + r.x*x, p.y + 4 + y, p.z + r.z*x), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), 0)), s3.set(rnd(1.4, 2.2), rnd(0.8, 1.2), rnd(1.4, 2.2))); });
  }
  // Oase mit Palmen und Wasser
  const os = K.bestSpot(40) || K.spots(1, 45, 120)[0];
  if (os) { const [ox, oz] = os;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshPhongMaterial({ color: 0x3ad0e0, shininess: 100, specular: 0xffffff })); pool.rotation.x = -Math.PI/2; pool.position.set(ox, -5.3, oz); scene.add(pool);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(16.5, 1.4, 6, 32), toon(0x8ac85a)); rim.rotation.x = Math.PI/2; rim.position.set(ox, -5.3, oz); scene.add(rim);
    const pl = []; for (let k = 0; k < 9; k++) { const a = k/9*Math.PI*2; pl.push([ox + Math.cos(a)*rnd(18, 24), oz + Math.sin(a)*rnd(18, 24), 60, 0, -5.5]); }
    K.palms(pl, { leaf: 0x4ac85a, leafEm: 0x0a2a10, bark: 0x9a6a3a, fruit: [0x8a5a2a], fruitToon: true }); }
  K.palms(K.spots(Math.round(14*quality), WALL + 15, 200), { leaf: 0x4ac85a, leafEm: 0x0a2a10, bark: 0x9a6a3a, fruit: [0x8a5a2a], fruitToon: true });
  // Sonnis Zeltlager
  const cs = K.spots(1, 40, 90)[0];
  if (cs) { const g = new THREE.Group(); g.position.set(cs[0], K.groundY(cs[0], cs[1], cs[2]), cs[1]); scene.add(g);
    const tentT = ctex(64, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ff5a3c' : '#fff0c8'; c.fillRect(i*8, 0, 8, 64); } });
    for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(5, 7, 4), toon(0, 0, tentT)); t.position.set(Math.cos(k*2.1)*12, 3.5, Math.sin(k*2.1)*12); t.rotation.y = k; t.castShadow = true; g.add(t); }
    const fire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 8), K.glow(0xff8a1a)); fire.position.y = 1.3; g.add(fire); K.upd.push(t => { fire.scale.set(1 + Math.sin(t*13)*0.12, 1 + Math.sin(t*9)*0.2, 1); });
    const logs = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 6, 10), toon(0x6a3a1a)); logs.rotation.x = Math.PI/2; logs.position.y = 0.3; g.add(logs);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.5, 24), toon(0xf0c860)); hat.position.set(0, 9, -16); hat.rotation.x = 0.4; g.add(hat); const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 3, 18), toon(0xf0c860)); crown.position.set(0, 10.4, -16.6); crown.rotation.x = 0.4; g.add(crown);
    const sign = ctex(512, 128, (c, w, h) => { c.fillStyle = '#8a5a2a'; c.fillRect(0, 0, w, h); c.font = '900 64px system-ui'; c.textAlign = 'center'; c.fillStyle = '#ffe9a8'; c.fillText("SONNIS CAMP", w/2, 86); });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: sign })); s.position.set(0, 5, -10); g.add(s); }
  // Kamele
  for (let k = 0; k < 4; k++) { const sp = K.along(1, WALL + 12, WALL + 40)[0]; if (!sp) continue; const g = new THREE.Group(); g.position.set(sp[0], K.groundY(sp[0], sp[1], sp[2]), sp[1]); g.rotation.y = rnd(0, 6); scene.add(g); const fur = toon(0xd0a060);
    const b = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), fur); b.scale.set(1, 0.8, 1.5); b.position.y = 3.4; g.add(b);
    for (const z of [-0.5, 0.6]) { const hump = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), fur); hump.position.set(0, 4.4, z); g.add(hump); }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.4, 8), fur); neck.position.set(0, 4.6, 2.2); neck.rotation.x = 0.5; g.add(neck);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), fur); hd.scale.set(0.8, 0.8, 1.4); hd.position.set(0, 5.8, 2.9); g.add(hd);
    for (const [x, z] of [[-0.7, 1.2], [0.7, 1.2], [-0.7, -1.2], [0.7, -1.2]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 2.8, 6), fur); leg.position.set(x, 1.4, z); g.add(leg); }
    K.upd.push(t => { hd.rotation.x = Math.sin(t*1.5 + k)*0.2; }); }
  // Steppenläufer rollen über die Strecke
  const tw = []; for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshToonMaterial({ color: 0xb08a4a, wireframe: true })); scene.add(m); tw.push({ m, i: Math.random()*tr.N | 0, ph: rnd(0, 10) }); }
  K.upd.push((t) => { for (const w of tw) { const c = ((t*0.08 + w.ph) % 1)*2 - 1, p = tr.P[w.i], r = tr.R[w.i]; const l = c*(WALL + 30); w.m.position.set(p.x + r.x*l, p.y + 1.1 + Math.abs(Math.sin(t*5 + w.ph))*0.8, p.z + r.z*l); w.m.rotation.x = t*4; w.m.rotation.z = t*3; } });
  // Pfosten mit Seilen, Steine, Gras
  K.posts({ pole: 0x8a5a2a, h: 2.2, every: 20 });
  K.rocks(120, 0xc8743a);
  K.tufts(500, 300, 0xc8b060);
  K.billboards(toon(0xffb23c), 0x8a5a2a);
  if (def.sunset) K.mountains(0x8a3a5a, 0x6a2a5a, 0.7, 'mesa'); else K.mountains(0xd8946a, 0xe8b08a, 0.7, 'mesa');
  if (def.sunset) K.posts({ pole: 0x6a3a2a, h: 4, every: 40, lamp: [0xffb060, 0xffb060], halo: 0.5 });
  K.motes(Math.round(200*quality), 0xfff0c8, 50, 2, 50, 0.5, 4);
  return K.finish();
}
