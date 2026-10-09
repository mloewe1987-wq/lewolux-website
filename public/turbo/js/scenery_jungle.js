// Umgebung "Neon-Dschungel" (Nacht, Polarlicht, Leuchtpilze, Lianen-Tore, Wasserfall)
import * as THREE from './three.module.min.js';
import { rnd } from './scenery_common.js';

export function jungle(K) {
  const { scene, tr, toon, quality, m4, q, e, s3, p3, WALL, glow } = K;
  scene.fog = new THREE.Fog(0x2a1452, 160, 820);
  K.sky({ top: 0x080530, mid: 0x42145a, hor: 0xff52a0, aurora: true, stars: true,
    disc: { c0: '#fff6d8', c1: 'rgba(255,190,255,.45)', size: 220, pos: [-500, 330, -560], moon: true }, clouds: { color: 'rgba(255,170,230,.55)' } });
  K.lights({ hemi: [0x9fd8ff, 0x4a1a70, 1.25], sun: [0xfff0ff, 2.2] });
  K.ground([0x123a32, 0x1a4c40, 0x0d2b27, 0x1f5a4a, 0x2a2a5a]);

  K.palms([...K.along(Math.round(85*quality), WALL + 6, WALL + 30), ...K.spots(Math.round(65*quality), WALL + 30, 260)]);
  // Urwaldriesen
  const giants = K.spots(Math.round(45*quality), 60, 300);
  K.inst(new THREE.CylinderGeometry(1.4, 2.4, 1, 9), toon(0x4a2a4a), giants, ([x, z, d]) => { m4.compose(p3.set(x, K.groundY(x, z, d) + 14, z), q.identity(), s3.set(1.6, 30, 1.6)); }, true);
  K.inst(new THREE.IcosahedronGeometry(1, 1), toon(0x1f9a7a, 0x06302a), giants.flatMap(g => [0, 1, 2, 3, 4].map(k => [g, k])), ([[x, z, d], k]) => { const y = K.groundY(x, z, d) + 30; const a = k*1.26; const r = k ? 8 : 0;
    m4.compose(p3.set(x + Math.cos(a)*r, y + (k ? rnd(-2, 2) : 4), z + Math.sin(a)*r), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), 0)), s3.set(rnd(8, 12), rnd(6, 8), rnd(8, 12))); }, true);
  K.ferns(520, 0x3ad08a, 0x0a3a2a);
  K.tufts(1600, 700, 0x4ad89a, 0x0a3a2a);
  K.flowers(420, [0xff3fd0, 0x29f0ff, 0xfff36b, 0xb36bff, 0xff7a5a]);
  K.rocks(140, 0x5a4a7a);
  // Leuchtpilze
  const capCols = [0xff3fd0, 0x29f0ff, 0xb36bff, 0xfff36b];
  const stemG = new THREE.CylinderGeometry(0.3, 0.45, 1, 10); stemG.translate(0, 0.5, 0);
  const capG = new THREE.SphereGeometry(1, 18, 9, 0, Math.PI*2, 0, Math.PI/2);
  const mData = K.along(Math.round(130*quality), WALL + 2, WALL + 34).map(([x, z, d]) => [x, z, K.groundY(x, z, d), rnd(0.8, 2.8)]);
  K.inst(stemG, toon(0xf5e6ff, 0x2a1a3a), mData, ([x, z, y, k]) => { m4.compose(p3.set(x, y, z), q.identity(), s3.set(k, k*2.2, k)); }, true);
  K.inst(capG, new THREE.MeshBasicMaterial({ color: 0xffffff }), mData, ([x, z, y, k], i, im) => { m4.compose(p3.set(x, y + k*2.1, z), q.identity(), s3.set(k*1.7, k*1.05, k*1.7)); im.setColorAt(i, new THREE.Color(capCols[i % 4]).multiplyScalar(0.85)); });
  K.inst(new THREE.SphereGeometry(0.18, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), mData.flatMap(m => [0, 1, 2].map(k => [m, k])), ([[x, z, y, k], j]) => { const a = j*2.1 + x; m4.compose(p3.set(x + Math.cos(a)*k*0.9, y + k*2.1 + k*0.75, z + Math.sin(a)*k*0.9), q.identity(), s3.setScalar(k*0.9)); });
  K.posts({ pole: 0x2a1a4a, lamp: [0x29f0ff, 0xff3fd0], halo: 0.5 });
  // Lianen-Tore
  const vineMat = toon(0x2a7a5a, 0x062a20), lanternCols = [0xfff36b, 0xff3fd0, 0x29f0ff], fernMat = K.leafMat(K.fernT, 0x3ad08a, 0x0a3a2a);
  for (const f of [0.14, 0.43, 0.69, 0.93]) {
    const { p, r, W, H } = K.gateAt(f);
    const g = new THREE.Group(); scene.add(g);
    for (const s of [-1, 1]) { const t1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.6, H + 6, 10), toon(0x5a3050)); t1.position.set(p.x + r.x*s*W, p.y + (H + 6)/2 - 5, p.z + r.z*s*W); t1.castShadow = true; g.add(t1); }
    const arc = new THREE.CatmullRomCurve3([-1, -0.6, 0, 0.6, 1].map(t => new THREE.Vector3(p.x + r.x*t*W, p.y + H + (1 - t*t)*5, p.z + r.z*t*W)));
    const a = new THREE.Mesh(new THREE.TubeGeometry(arc, 30, 0.9, 8, false), vineMat); a.castShadow = true; g.add(a);
    const leaves = new THREE.InstancedMesh(K.fernG, fernMat, 26);
    for (let k = 0; k < 26; k++) { const pt = arc.getPoint(k/25); m4.compose(p3.copy(pt), q.setFromEuler(e.set(rnd(-1, 1), rnd(0, 6), rnd(-1, 1))), s3.setScalar(rnd(1, 1.8))); leaves.setMatrixAt(k, m4); }
    g.add(leaves);
    for (let k = 1; k < 8; k++) {
      const pt = arc.getPoint(k/8), len = rnd(3, 7);
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 5), vineMat); v.position.set(pt.x, pt.y - len/2, pt.z); g.add(v);
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), glow(lanternCols[k % 3])); lan.position.set(pt.x, pt.y - len - 0.3, pt.z); g.add(lan);
      K.upd.push(t => { const sw = Math.sin(t*1.3 + k)*0.15; lan.position.x = pt.x + r.x*sw; lan.position.z = pt.z + r.z*sw; });
    }
  }
  K.billboards();
  K.mountains(0x3a1a68, 0x24104a);
  K.motes(Math.round(700*quality), 0xfff27a);
  waterfall(K, { rock: 0x4a2a72, top: 0x1f9a7a, topEm: 0x06302a });
  return K.finish();
}

// Wasserfall mit Felsklippe (auch für andere Strecken)
export function waterfall(K, o) {
  const { scene, tr, toon } = K;
  let wi = 0, cx = 0, cz = 0, bestD = -1;
  for (let f = 0; f < 1; f += 0.04) for (const sd of [-1, 1]) { const ii = Math.round(f*tr.N), x = tr.P[ii].x + tr.R[ii].x*sd*74, z = tr.P[ii].z + tr.R[ii].z*sd*74; const d = K.distTo(x, z); if (d > bestD && d < 80) { bestD = d; wi = ii; cx = x; cz = z; } }
  const wp = tr.P[wi]; const dir = new THREE.Vector3(wp.x - cx, 0, wp.z - cz).normalize();
  const rockM = toon(o.rock), side2 = new THREE.Vector3(-dir.z, 0, dir.x);
  const cliffG = new THREE.BoxGeometry(64, 54, 34, 24, 20, 12);
  { const p = cliffG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x*0.31 + y*0.17)*1.6 + Math.sin(y*0.43 - z*0.21)*1.3 + Math.sin(x*0.11 + z*0.37)*2.2;
      const front = z > 16.9 && Math.abs(x) < 12 ? 0.25 : 1; const top = y > 26 ? 1.8 : 1;
      p.setXYZ(i, x + n*0.6*front, y + (y > 26 ? Math.abs(n)*top : 0), z + n*front); }
    cliffG.computeVertexNormals(); }
  const cliff = new THREE.Mesh(cliffG, rockM); cliff.position.set(cx, 21, cz); cliff.lookAt(cx + dir.x, 21, cz + dir.z); cliff.castShadow = true; scene.add(cliff);
  const frontX = cx + dir.x*17.3, frontZ = cz + dir.z*17.3;
  for (let k = 0; k < 10; k++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockM); const sd = k % 2 ? 1 : -1, a = rnd(13, 30);
    rk.position.set(frontX + side2.x*sd*a + dir.x*rnd(0, 6), rnd(-4, 4), frontZ + side2.z*sd*a + dir.z*rnd(0, 6)); rk.scale.set(rnd(5, 10), rnd(5, 12), rnd(5, 9)); rk.rotation.set(rnd(0, 3), rnd(0, 3), 0); scene.add(rk); }
  for (let k = 0; k < 12; k++) { const tf = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), toon(o.top, o.topEm)); tf.position.set(cx + side2.x*rnd(-30, 30) + dir.x*rnd(-14, 14), 47 + rnd(0, 3), cz + side2.z*rnd(-30, 30) + dir.z*rnd(-14, 14)); tf.scale.set(rnd(5, 9), rnd(3, 5), rnd(5, 9)); scene.add(tf); }
  const wtex = K.ctex(64, 256, g => { g.fillStyle = '#7fe8ff'; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 120; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.85)' : 'rgba(40,160,255,.6)'; g.fillRect(Math.random()*64, Math.random()*256, 2 + Math.random()*3, 20 + Math.random()*50); } });
  wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(18, 52), new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.93, color: 0xcfefff }));
  fall.position.set(frontX + dir.x*1.2, 21, frontZ + dir.z*1.2); fall.lookAt(frontX + dir.x*10, 21, frontZ + dir.z*10); scene.add(fall);
  const lip = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 17, 4, 10), new THREE.MeshBasicMaterial({ color: 0xe8fbff })); lip.position.set(frontX + dir.x*1.0, 47, frontZ + dir.z*1.0); lip.lookAt(lip.position.clone().add(side2)); lip.rotateX(Math.PI/2); scene.add(lip);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(18, 30), new THREE.MeshBasicMaterial({ map: wtex, color: 0x9fe6ff })); river.rotation.x = -Math.PI/2; river.position.set(cx, 47.6, cz); river.rotation.z = Math.atan2(dir.x, dir.z); scene.add(river);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: 0x3fd6ff, transparent: true, opacity: 0.85 }));
  pool.rotation.x = -Math.PI/2; pool.position.set(frontX + dir.x*10, K.groundLevel + 0.3, frontZ + dir.z*10); scene.add(pool);
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.haloT, color: 0xbff4ff, transparent: true, opacity: 0.5, depthWrite: false })); mist.position.set(frontX + dir.x*5, -1, frontZ + dir.z*5); mist.scale.set(36, 12, 1); scene.add(mist);
  K.upd.push((t, dt) => { wtex.offset.y += dt*1.8; mist.material.opacity = 0.4 + Math.sin(t*2)*0.1; });
}
