// Umgebung "Sternenturm" (Weltall-Nacht, Planeten, schwebende Stern-Inseln, Kristalle, Turm in der Mitte)
import * as THREE from './three.module.min.js';
import { rnd } from './scenery_common.js';

export function sky(K) {
  const { scene, tr, toon, quality, m4, q, e, s3, p3, WALL, ctex } = K;
  scene.fog = new THREE.Fog(0x140a3a, 300, 1100);
  K.sky({ top: 0x05021a, mid: 0x1a0a4a, hor: 0x5a2a9a, aurora: true, stars: true, disc: { c0: '#ffe8b0', c1: 'rgba(255,170,90,.35)', size: 360, pos: [-600, 160, -500] } });
  K.lights({ hemi: [0xb0a0ff, 0x2a1060, 1.2], sun: [0xfff0d8, 2.0], dir: [-200, 260, -160] });
  K.groundLevel = -60;
  // Untergrund: Nebelmeer statt Boden
  const neb = ctex(256, 256, (g, w, h) => { g.fillStyle = '#1a0a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { const x = Math.random()*w, y = Math.random()*h, r = rnd(20, 60); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ['rgba(255,90,200,.35)', 'rgba(90,160,255,.35)', 'rgba(160,90,255,.4)'][i % 3]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  neb.wrapS = neb.wrapT = THREE.RepeatWrapping; neb.repeat.set(8, 8);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshBasicMaterial({ map: neb, fog: false })); sea.rotation.x = -Math.PI/2; sea.position.y = -80; scene.add(sea);
  K.upd.push((t) => { neb.offset.set(t*0.004, t*0.002); });
  // Stützpfeiler unter der Strecke
  const pil = []; for (let i = 0; i < tr.N; i += 46) pil.push(i);
  K.inst(new THREE.CylinderGeometry(1.6, 0.6, 1, 8), toon(0x3a2a7a, 0x120830), pil, (i) => { const p = tr.P[i]; const h = p.y + 80; m4.compose(p3.set(p.x, p.y - h/2 - 0.5, p.z), q.identity(), s3.set(1, h, 1)); });
  K.inst(new THREE.TorusGeometry(2.2, 0.3, 8, 20), K.glow(0x29f0ff), pil, (i) => { const p = tr.P[i]; m4.compose(p3.set(p.x, p.y - 6, p.z), q.setFromEuler(e.set(Math.PI/2, 0, 0)), s3.setScalar(1)); });
  // Planeten
  const pc = [[0xff8a5a, 0xffd0a0], [0x5ac8ff, 0xd0f0ff], [0xb36bff, 0xffb0f0], [0x6ae0a0, 0xd0ffe0]];
  for (let k = 0; k < 5; k++) { const a = rnd(0, 6.28), r = rnd(520, 720), sz = rnd(40, 100); const col = pc[k % 4];
    const t = ctex(256, 128, (g, w, h) => { g.fillStyle = '#' + col[0].toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 10) { g.fillStyle = `rgba(255,255,255,${Math.random()*0.25})`; g.fillRect(0, y, w, 4 + Math.random()*6); } });
    const pl = new THREE.Mesh(new THREE.SphereGeometry(sz, 32, 20), new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color(col[0]).multiplyScalar(0.25), fog: false })); pl.position.set(Math.cos(a)*r, rnd(40, 200), Math.sin(a)*r); scene.add(pl);
    if (k % 2 === 0) { const ringM = new THREE.Mesh(new THREE.RingGeometry(sz*1.3, sz*1.9, 48), new THREE.MeshBasicMaterial({ color: col[1], transparent: true, opacity: 0.6, side: THREE.DoubleSide, fog: false })); ringM.rotation.x = 1.2; pl.add(ringM); }
    K.upd.push(t2 => { pl.rotation.y = t2*0.05; }); }
  // Schwebende Stern-Inseln
  const starShape = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.45 : 1, a = k/10*Math.PI*2 + Math.PI/2; const x = Math.cos(a)*r, y = Math.sin(a)*r; k ? starShape.lineTo(x, y) : starShape.moveTo(x, y); }
  const starG = new THREE.ExtrudeGeometry(starShape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 2 }); starG.rotateX(-Math.PI/2);
  const isl = K.spots(Math.round(30*quality + 10), WALL + 25, 320);
  const islands = K.inst(starG, toon(0xffe14a, 0x553300), isl, ([x, z], i) => { const sc = rnd(6, 16); m4.compose(p3.set(x, rnd(-30, 40), z), q.setFromEuler(e.set(0, rnd(0, 6), 0)), s3.set(sc, sc*0.8, sc)); }, true);
  void islands;
  // Kristalle am Rand
  const crys = K.along(Math.round(160*quality), WALL + 2, WALL + 12);
  K.inst(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), crys, ([x, z, d], i, im) => { const p = tr.P[tr.locate(new THREE.Vector3(x, 0, z)).i]; m4.compose(p3.set(x, p.y - rnd(1, 6), z), q.setFromEuler(e.set(rnd(0, 1), rnd(0, 6), rnd(0, 1))), s3.set(rnd(0.8, 1.6), rnd(2, 5), rnd(0.8, 1.6))); im.setColorAt(i, new THREE.Color([0x29f0ff, 0xff3fd0, 0xb36bff, 0xfff36b][i % 4])); });
  // Der Sternenturm im Zentrum
  const c = K.inner.getCenter(new THREE.Vector3());
  if (K.distTo(c.x, c.z) > 40) { const g = new THREE.Group(); g.position.set(c.x, -60, c.z); scene.add(g);
    for (let k = 0; k < 9; k++) { const r = 10 - k*0.9; const seg = new THREE.Mesh(new THREE.CylinderGeometry(r*0.85, r, 16, 10), toon(k % 2 ? 0x3a2a8a : 0x4a3aa0)); seg.position.y = 8 + k*16; seg.castShadow = true; g.add(seg); const band = new THREE.Mesh(new THREE.TorusGeometry(r*0.92, 0.35, 6, 24), K.glow(k % 2 ? 0x29f0ff : 0xff3fd0)); band.rotation.x = Math.PI/2; band.position.y = 16 + k*16; g.add(band); }
    const top = new THREE.Mesh(new THREE.OctahedronGeometry(6, 0), K.glow(0xfff36b)); top.position.y = 160; g.add(top);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.haloT, color: 0xfff36b, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.y = 160; halo.scale.setScalar(50); g.add(halo);
    K.upd.push(t2 => { top.rotation.y = t2*0.8; top.position.y = 160 + Math.sin(t2*1.4)*2; }); }
  // Sternschnuppen
  const comets = []; for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 1.2, 40, 6), new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); scene.add(m); comets.push({ m, ph: rnd(0, 20) }); }
  K.upd.push(t2 => { for (const cm of comets) { const tt = ((t2 + cm.ph) % 9)/9; cm.m.visible = tt < 0.25; const k = tt/0.25; cm.m.position.set(c.x - 400 + k*800 + cm.ph*20, 300 - k*150, c.z - 300 + cm.ph*30); cm.m.rotation.z = 1.1; } });
  K.posts({ pole: 0x5a3aaa, h: 3, every: 26, lamp: [0xfff36b, 0x29f0ff], lampGeo: new THREE.OctahedronGeometry(0.7, 0), halo: 0.6 });
  K.billboards(null, 0x3a2a7a);
  K.motes(Math.round(600*quality), 0xfff6d0, 70, 4, 80, -8, 20);
  return K.finish();
}
