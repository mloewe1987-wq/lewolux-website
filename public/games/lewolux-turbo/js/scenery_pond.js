// Umgebung "Pandis Seerosenteich" (Sonnenuntergang, Wasser, Seerosen, Bambus, Tore, Pagode, Koi, Pandi-Ballon)
import * as THREE from './three.module.min.js';
import { rnd } from './scenery_common.js';

export function pond(K, def = {}) {
  const { scene, tr, toon, quality, m4, q, e, s3, p3, WALL, ctex } = K;
  const night = !!def.night;
  if (night) {
    scene.fog = new THREE.Fog(0x14123a, 200, 900);
    K.sky({ top: 0x050520, mid: 0x1a1450, hor: 0x5a2a6a, stars: true, disc: { c0: '#fff6e0', c1: 'rgba(255,220,170,.4)', size: 200, pos: [-480, 300, -520], moon: true }, clouds: { color: 'rgba(150,120,200,.3)', n: 10, y0: 80, y1: 220 } });
    K.lights({ hemi: [0x8a7aff, 0x1a2a4a, 0.95], sun: [0xffe0c0, 1.5], dir: [-200, 300, -220] });
  } else {
    scene.fog = new THREE.Fog(0xffb08a, 220, 950);
    K.sky({ top: 0x2a3a8a, mid: 0xff8a7a, hor: 0xffd88a, disc: { c0: '#fff2b0', c1: 'rgba(255,170,90,.55)', size: 260, pos: [-560, 70, -480] }, clouds: { color: 'rgba(255,190,200,.85)', n: 16, y0: 60, y1: 200 } });
    K.lights({ hemi: [0xffd8c0, 0x3a6a8a, 1.1], sun: [0xffc890, 2.6], dir: [-260, 160, -220] });
  }
  K.ground([0x1a4a50, 0x225a60, 0x163e44], -5.5, 100);
  const WY = -1.0;
  // Wasser mit bewegter Normalen-Textur
  const nrm = ctex(256, 256, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y*w + x)*4; const a = Math.sin(x*0.15 + Math.sin(y*0.07)*2)*0.5 + Math.sin(y*0.21 + x*0.05)*0.5; img.data[i] = 128 + a*50; img.data[i+1] = 128 + Math.cos(x*0.11 - y*0.13)*50; img.data[i+2] = 255; img.data[i+3] = 255; } g.putImageData(img, 0, 0); }, false);
  nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.repeat.set(80, 80);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshPhongMaterial({ color: night ? 0x163a5a : 0x2a8a9a, shininess: 90, specular: night ? 0xffd8a0 : 0xffc890, normalMap: nrm, normalScale: new THREE.Vector2(0.6, 0.6), transparent: true, opacity: 0.9 }));
  water.rotation.x = -Math.PI/2; water.position.y = WY; water.receiveShadow = true; scene.add(water);
  K.upd.push((t) => { nrm.offset.set(t*0.01, t*0.006); });
  K.groundLevel = -5.5;
  const onWater = (x, z, d) => K.groundY(x, z, d) < WY;

  // Seerosen + Lotus
  const padG = new THREE.CircleGeometry(1, 20, 0.3, Math.PI*2 - 0.6); padG.rotateX(-Math.PI/2);
  const pads = [...K.along(Math.round(500*quality), WALL + 3, WALL + 60), ...K.spots(Math.round(300*quality), WALL + 40, 300)].filter(([x, z, d]) => onWater(x, z, d));
  K.inst(padG, toon(0xffffff), pads, ([x, z], i, im) => { m4.compose(p3.set(x, WY + 0.05, z), q.setFromEuler(e.set(0, rnd(0, 6), 0)), s3.setScalar(rnd(1.2, 4))); im.setColorAt(i, new THREE.Color([0x3aa84a, 0x4ab85a, 0x2f9a50][i % 3])); });
  const lotus = pads.filter((_, i) => i % 4 === 0);
  const petal = new THREE.ConeGeometry(0.35, 1.1, 5); petal.translate(0, 0.55, 0);
  K.inst(petal, toon(0xffffff, 0x331122), lotus.flatMap(l => [0, 1, 2, 3, 4, 5, 6, 7].map(k => [l, k])), ([[x, z], k], i, im) => { const a = k/8*Math.PI*2; m4.compose(p3.set(x, WY + 0.15, z), q.setFromEuler(e.set(0.55, a, 0, 'YXZ')), s3.setScalar(1)); im.setColorAt(i, new THREE.Color(k % 2 ? 0xff8ab8 : 0xffc0da)); });
  K.inst(new THREE.SphereGeometry(0.28, 10, 8), K.glow(0xffe14a), lotus, ([x, z]) => { m4.compose(p3.set(x, WY + 0.5, z), q.identity(), s3.setScalar(1)); });

  // Inseln mit Bambus und Kirschbäumen
  const isl = K.spots(Math.round(26*quality + 6), WALL + 30, 220);
  K.inst(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI*2, 0, Math.PI/2), toon(0x6aa84a), isl, ([x, z], i) => { m4.compose(p3.set(x, WY - 0.6, z), q.identity(), s3.set(rnd(10, 18), rnd(2, 3.5), rnd(10, 18))); });
  const ringT = ctex(32, 128, (g, w, h) => { g.fillStyle = '#7ac84a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = '#4a8a2a'; g.fillRect(0, y, w, 4); g.fillStyle = '#9ae06a'; g.fillRect(0, y + 4, w, 2); } }); ringT.wrapS = ringT.wrapT = THREE.RepeatWrapping; ringT.repeat.set(1, 4);
  const bamboo = [], blossoms = [];
  isl.forEach(([x, z], n) => { if (n % 3 === 2) blossoms.push([x, z]); else for (let k = 0; k < 9; k++) bamboo.push([x + rnd(-6, 6), z + rnd(-6, 6), rnd(10, 20)]); });
  bamboo.push(...K.along(Math.round(160*quality), WALL + 2, WALL + 8).map(([x, z, d]) => [x, z, rnd(8, 16), K.groundY(x, z, d)]));
  K.inst(new THREE.CylinderGeometry(0.28, 0.32, 1, 8), toon(0, 0, ringT), bamboo, ([x, z, h, y]) => { m4.compose(p3.set(x, (y ?? WY) + h/2, z), q.setFromEuler(e.set(rnd(-0.08, 0.08), 0, rnd(-0.08, 0.08))), s3.set(1, h, 1)); }, true);
  const leafMat = K.leafMat(K.fernT, 0x6ad86a);
  K.inst(K.fernG, leafMat, bamboo.flatMap(b => [0, 1, 2].map(k => [b, k])), ([[x, z, h, y], k]) => { m4.compose(p3.set(x, (y ?? WY) + h*(0.6 + k*0.18), z), q.setFromEuler(e.set(rnd(-0.5, 0.5), rnd(0, 6), 0)), s3.setScalar(rnd(0.6, 1.0))); });
  K.inst(new THREE.CylinderGeometry(0.5, 0.8, 1, 8), toon(0x5a3a2a), blossoms, ([x, z]) => { m4.compose(p3.set(x, WY + 3, z), q.identity(), s3.set(1, 8, 1)); }, true);
  K.inst(new THREE.IcosahedronGeometry(1, 1), toon(0xffffff, 0x220a10), blossoms.flatMap(b => [0, 1, 2, 3].map(k => [b, k])), ([[x, z], k], i, im) => { const a = k*1.6; m4.compose(p3.set(x + (k ? Math.cos(a)*3 : 0), WY + 8 + (k ? rnd(-1, 1) : 1.5), z + (k ? Math.sin(a)*3 : 0)), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), 0)), s3.setScalar(rnd(3.5, 5))); im.setColorAt(i, new THREE.Color([0xffb0d0, 0xff90c0, 0xffd0e4][i % 3])); }, true);

  // Steinlaternen entlang der Bande
  K.posts({ pole: 0x8a8a90, h: 3.2, every: 30, lamp: [0xffc070, 0xffc070], lampGeo: new THREE.BoxGeometry(1.2, 1.2, 1.2), halo: 0.45 });
  // Tore über der Strecke
  for (const f of [0.1, 0.36, 0.62, 0.88]) {
    const { p, r, W } = K.gateAt(f); const H = 13, red = toon(0xd0402a), blk = toon(0x2a1a1a);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, H + 5, 14), red); post.position.set(p.x + r.x*s*(W - 2), p.y + (H + 5)/2 - 5, p.z + r.z*s*(W - 2)); post.castShadow = true; scene.add(post); }
    const ang = Math.atan2(r.x, r.z);
    const top = new THREE.Mesh(new THREE.BoxGeometry(W*2 + 6, 1.3, 1.6), blk); top.position.set(p.x, p.y + H + 1.3, p.z); top.rotation.y = ang - Math.PI/2; top.castShadow = true; scene.add(top);
    const top2 = new THREE.Mesh(new THREE.BoxGeometry(W*2 + 4, 1.0, 1.3), red); top2.position.set(p.x, p.y + H, p.z); top2.rotation.y = ang - Math.PI/2; scene.add(top2);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(W*2 - 3, 0.7, 1.0), red); mid.position.set(p.x, p.y + H - 3, p.z); mid.rotation.y = ang - Math.PI/2; scene.add(mid);
    for (let k = -2; k <= 2; k++) { const lan = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.6, 4, 10), K.glow(0xff8a3c)); lan.position.set(p.x + r.x*k*7, p.y + H - 5, p.z + r.z*k*7); scene.add(lan); K.upd.push(t => { lan.position.y = p.y + H - 5 + Math.sin(t*2 + k)*0.2; }); }
  }
  // Pagode
  const ps = K.spots(1, 80, 160)[0];
  if (ps) { const g = new THREE.Group(); g.position.set(ps[0], WY, ps[1]); scene.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(16, 18, 2, 8), toon(0x9a9aa0)); base.position.y = 0.5; g.add(base);
    for (let k = 0; k < 4; k++) { const s = 1 - k*0.18; const wall = new THREE.Mesh(new THREE.BoxGeometry(14*s, 6, 14*s), toon(0xe8d8c0)); wall.position.y = 4.5 + k*8; wall.castShadow = true; g.add(wall);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(14*s, 4, 4, 1, true), toon(0xb03a2a)); roof.rotation.y = Math.PI/4; roof.position.y = 9 + k*8; roof.castShadow = true; g.add(roof); }
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 8, 8), toon(0xffcf4a)); spire.position.y = 38; g.add(spire); }
  // Pandi-Ballon
  const bs = K.spots(1, 60, 140)[0];
  if (bs) { const g = new THREE.Group(); g.position.set(bs[0], 40, bs[1]); scene.add(g);
    const h = new THREE.Mesh(new THREE.SphereGeometry(9, 28, 20), toon(0xffffff)); g.add(h);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), toon(0x1a1a1a)); ear.position.set(s*6.5, 6.5, 0); g.add(ear); const eye = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), toon(0x1a1a1a)); eye.position.set(s*3.2, 1, 7.6); eye.scale.set(1, 1.3, 0.5); g.add(eye); const hi = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), K.glow(0xffffff)); hi.position.set(s*3.2 + 0.5, 1.8, 8.6); g.add(hi); const ch = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), toon(0xff9ab0)); ch.position.set(s*5.5, -2.5, 6.4); ch.scale.z = 0.4; g.add(ch); }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), toon(0x1a1a1a)); nose.position.set(0, -1.6, 8.8); g.add(nose);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 40, 4), toon(0xffffff)); rope.position.y = -29; g.add(rope);
    K.upd.push(t => { g.position.y = 40 + Math.sin(t*0.6)*2; g.rotation.y = Math.sin(t*0.3)*0.4; g.lookAt(tr.P[0].x, g.position.y, tr.P[0].z); }); }
  // Koi springen
  const koiG = new THREE.Group(); scene.add(koiG); const kois = [];
  for (let k = 0; k < 10; k++) { const sp = K.along(1, WALL + 6, WALL + 30)[0]; if (!sp || !onWater(sp[0], sp[1], sp[2])) continue;
    const f = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), toon(k % 2 ? 0xff7a2a : 0xffffff)); b.scale.set(0.6, 0.6, 1.6); f.add(b); const tail = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 4), toon(0xff7a2a)); tail.rotation.x = -Math.PI/2; tail.position.z = -1.2; f.add(tail);
    koiG.add(f); kois.push({ f, x: sp[0], z: sp[1], ph: rnd(0, 8), a: rnd(0, 6) }); }
  K.upd.push(t => { for (const k of kois) { const c = ((t + k.ph) % 5) / 1.2; if (c > 1) { k.f.visible = false; continue; } k.f.visible = true; const dx = Math.cos(k.a)*6, dz = Math.sin(k.a)*6;
    k.f.position.set(k.x + dx*(c - 0.5), WY + Math.sin(c*Math.PI)*3.5, k.z + dz*(c - 0.5)); k.f.rotation.set(-Math.cos(c*Math.PI)*0.9, Math.atan2(dx, dz), 0); } });
  // Holzbrücken in der Ferne
  for (let k = 0; k < 3; k++) { const sp = K.spots(1, 50, 200)[0]; if (!sp) continue; const arc = new THREE.Mesh(new THREE.TorusGeometry(10, 0.9, 6, 20, Math.PI), toon(0xd0402a)); arc.position.set(sp[0], WY, sp[1]); arc.rotation.y = rnd(0, 3); arc.scale.z = 3; scene.add(arc); }
  if (night) { // Laternenfest: schwimmende Laternen und aufsteigende Himmelslaternen
    const wl = K.along(Math.round(140*quality), WALL + 3, WALL + 40).filter(([x, z, d]) => onWater(x, z, d));
    const wlm = K.inst(new THREE.CylinderGeometry(0.5, 0.6, 0.7, 6), K.glow(0xffffff), wl, ([x, z], i, im) => { m4.compose(p3.set(x, WY + 0.35, z), q.identity(), s3.setScalar(rnd(0.8, 1.3))); im.setColorAt(i, new THREE.Color([0xffb050, 0xff7a4a, 0xffe08a][i % 3])); });
    void wlm;
    const sk = []; for (let k = 0; k < Math.round(70*quality + 20); k++) { const sp = K.spots(1, WALL + 10, 260)[0]; if (sp) sk.push({ x: sp[0], z: sp[1], ph: rnd(0, 60), sp: rnd(0.8, 1.6) }); }
    const skm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.7, 0.9, 3, 8), K.glow(0xffa040), sk.length); skm.frustumCulled = false; scene.add(skm);
    const sm = new THREE.Matrix4(), sv = new THREE.Vector3(), sq = new THREE.Quaternion(), ss = new THREE.Vector3(1, 1, 1);
    K.upd.push(t => { sk.forEach((l, i) => { const y = ((t*l.sp + l.ph) % 60)*2.2 - 2; sm.compose(sv.set(l.x + Math.sin(t*0.4 + l.ph)*2, y, l.z), sq, ss); skm.setMatrixAt(i, sm); }); skm.instanceMatrix.needsUpdate = true; });
  }
  K.billboards(toon(0xd0402a), 0x5a3a2a);
  if (night) K.mountains(0x2a1a4a, 0x1a1238, 0.8); else K.mountains(0x8a4a8a, 0x6a3a7a, 0.8);
  if (night) K.motes(Math.round(380*quality), 0xffd08a, 70, 4, 60, 2, 16, 0.8); else K.motes(Math.round(380*quality), 0xffb0d0, 70, 4, 60, 2, 16, 0.8);
  K.motes(Math.round(200*quality), 0xffe08a, 80);
  return K.finish();
}
