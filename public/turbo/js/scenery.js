// Umgebung "Neon-Dschungel": Himmel, Licht, Pflanzen, Pilze, Glühwürmchen, Wasserfall
import * as THREE from './three.module.min.js';
import { WALL } from './track.js';

export function buildScenery(scene, tr, toon, quality = 1) {
  const upd = [];
  scene.fog = new THREE.Fog(0x2a1452, 140, 760);
  // Himmel mit Verlauf und Sternen
  const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x0b0630) }, mid: { value: new THREE.Color(0x4a1a7a) }, bot: { value: new THREE.Color(0xff4fa8) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top,mid,bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h>0.12 ? mix(mid, top, smoothstep(0.12,0.6,h)) : mix(bot, mid, smoothstep(-0.05,0.12,h)); gl_FragColor = vec4(c,1.0); }'
  }));
  scene.add(sky);
  const starG = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 900; i++) { const a = Math.random()*Math.PI*2, e = 0.15 + Math.random()*1.3; sp.push(Math.cos(a)*Math.cos(e)*900, Math.sin(e)*900, Math.sin(a)*Math.cos(e)*900); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false })));
  // Mond
  const mc = document.createElement('canvas'); mc.width = mc.height = 128; { const g = mc.getContext('2d'); const r = g.createRadialGradient(64, 64, 30, 64, 64, 64); r.addColorStop(0, 'rgba(255,243,200,1)'); r.addColorStop(.72, 'rgba(255,243,200,1)'); r.addColorStop(.76, 'rgba(255,200,255,.35)'); r.addColorStop(1, 'rgba(255,150,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mc), fog: false, depthWrite: false }));
  moon.scale.set(140, 140, 1); moon.position.set(-500, 330, -560); scene.add(moon);

  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x3a1060, 1.3));
  const sun = new THREE.DirectionalLight(0xffe6ff, 1.6); sun.position.set(-200, 300, -150); scene.add(sun);

  // Boden
  const gtex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#143a33'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1400; i++) { g.fillStyle = ['#1c4d40', '#0f2e2a', '#22594a'][i % 3]; g.fillRect(Math.random()*128, Math.random()*128, 2, 3); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(120, 120); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshLambertMaterial({ map: gtex }));
  ground.rotation.x = -Math.PI/2; ground.position.y = -5.5; scene.add(ground);

  // freie Plätze finden (Abstand zur Strecke)
  const distTo = (x, z) => { let b = 1e9; for (let i = 0; i < tr.N; i += 6) { const p = tr.P[i]; const d = (p.x-x)**2 + (p.z-z)**2; if (d < b) b = d; } return Math.sqrt(b); };
  const box = new THREE.Box3(); for (const p of tr.P) box.expandByPoint(p); box.expandByScalar(160);
  const spots = (n, dmin, dmax) => { const out = []; let tries = 0;
    while (out.length < n && tries++ < n*40) { const x = THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random()), z = THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random());
      const d = distTo(x, z); if (d > dmin && d < dmax) out.push([x, z, d]); } return out; };

  // Neon-Palmen (Instanzen)
  const nTree = Math.round(170*quality);
  const trunkG = new THREE.CylinderGeometry(0.6, 1.1, 1, 7); trunkG.translate(0, 0.5, 0);
  const leafG = new THREE.ConeGeometry(1.4, 7, 4, 1); leafG.translate(0, 3.5, 0); leafG.rotateX(Math.PI/2.4); leafG.scale(1, 0.35, 1);
  const trunks = new THREE.InstancedMesh(trunkG, toon(0x6a3a5a), nTree);
  const leaves = new THREE.InstancedMesh(leafG, toon(0x19c99a, 0x0a4a3a), nTree*6);
  const tips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), nTree);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const tipCols = [0x29f0ff, 0xff3fd0, 0xfff36b, 0x8aff6b];
  const tSpots = spots(nTree, WALL + 10, 260); let li = 0;
  tSpots.forEach(([x, z], i) => {
    const h = 9 + Math.random()*12, y = -5.5 + (distTo(x, z) < WALL + 22 ? 2 : 0);
    m.compose(p.set(x, y, z), q.setFromEuler(e.set((Math.random() - .5)*0.25, 0, (Math.random() - .5)*0.25)), s.set(1, h, 1)); trunks.setMatrixAt(i, m);
    for (let k = 0; k < 6; k++) { m.compose(p.set(x, y + h, z), q.setFromEuler(e.set(0, k*Math.PI/3 + Math.random()*0.4, 0, 'YXZ')), s.setScalar(0.9 + Math.random()*0.5)); leaves.setMatrixAt(li++, m); }
    m.compose(p.set(x, y + h + 0.2, z), q.identity(), s.setScalar(1)); tips.setMatrixAt(i, m); tips.setColorAt(i, new THREE.Color(tipCols[i % 4]));
  });
  trunks.count = tSpots.length; leaves.count = li; tips.count = tSpots.length;
  scene.add(trunks, leaves, tips);

  // Leuchtpilze
  const nMush = Math.round(110*quality);
  const stemG = new THREE.CylinderGeometry(0.35, 0.5, 1, 8); stemG.translate(0, 0.5, 0);
  const capG = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI*2, 0, Math.PI/2);
  const stems = new THREE.InstancedMesh(stemG, toon(0xf5e6ff), nMush);
  const caps = new THREE.InstancedMesh(capG, new THREE.MeshBasicMaterial({ color: 0xffffff }), nMush);
  const capCols = [0xff3fd0, 0x29f0ff, 0xb36bff, 0xfff36b];
  const mSpots = spots(nMush, WALL + 3, WALL + 40);
  mSpots.forEach(([x, z, d], i) => {
    const k = 0.7 + Math.random()*2.2, y = -0.4 - Math.max(0, (d - WALL) / 14) * 5;
    const loc = tr.locate(new THREE.Vector3(x, 0, z)); const gy = tr.P[loc.i].y + Math.min(0, y);
    m.compose(p.set(x, gy, z), q.identity(), s.set(k, k*2.2, k)); stems.setMatrixAt(i, m);
    m.compose(p.set(x, gy + k*2.1, z), q.identity(), s.set(k*1.7, k*1.1, k*1.7)); caps.setMatrixAt(i, m);
    caps.setColorAt(i, new THREE.Color(capCols[i % 4]));
  });
  stems.count = caps.count = mSpots.length; scene.add(stems, caps);

  // Farne/Büsche am Rand
  const nBush = Math.round(220*quality);
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.4, 0), toon(0x2fbf7a, 0x0a3a2a), nBush);
  const bSpots = spots(nBush, WALL + 1.5, WALL + 30);
  bSpots.forEach(([x, z, d], i) => { const loc = tr.locate(new THREE.Vector3(x, 0, z)); const gy = tr.P[loc.i].y - Math.max(0, (d - WALL) / 14)*5;
    m.compose(p.set(x, gy, z), q.setFromEuler(e.set(0, Math.random()*6, 0)), s.set(1 + Math.random(), 0.7 + Math.random()*0.8, 1 + Math.random())); bush.setMatrixAt(i, m); });
  bush.count = bSpots.length; scene.add(bush);

  // ferne Berge
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI*2, r = 620 + Math.random()*120, h = 90 + Math.random()*160;
    const mt = new THREE.Mesh(new THREE.ConeGeometry(70 + Math.random()*60, h, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x2a1050 : 0x341660 }));
    mt.position.set(Math.cos(a)*r, h/2 - 6, Math.sin(a)*r); scene.add(mt);
  }

  // Glühwürmchen
  const nFly = Math.round(500*quality); const fp = [];
  for (let i = 0; i < nFly; i++) { const j = Math.random()*tr.N | 0, side = Math.random() < .5 ? -1 : 1, l = side*(WALL - 4 + Math.random()*40);
    fp.push(tr.P[j].x + tr.R[j].x*l, tr.P[j].y + 1 + Math.random()*9, tr.P[j].z + tr.R[j].z*l); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  const fdot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,200,1)'); r.addColorStop(.3, 'rgba(255,240,120,.8)'); r.addColorStop(1, 'rgba(255,200,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ size: 1.3, map: fdot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff27a }));
  scene.add(flies);
  upd.push(t => { flies.position.y = Math.sin(t*0.8)*0.6; flies.material.opacity = 0.7 + Math.sin(t*3)*0.3; });

  // Wasserfall an der Haarnadel
  let wi = 0, side = 1, cx = 0, cz = 0, bestD = -1;
  for (let f = 0; f < 1; f += 0.05) for (const sd of [-1, 1]) { const ii = Math.round(f*tr.N), x = tr.P[ii].x + tr.R[ii].x*sd*72, z = tr.P[ii].z + tr.R[ii].z*sd*72; const d = distTo(x, z); if (d > bestD && d < 80) { bestD = d; wi = ii; side = sd; cx = x; cz = z; } }
  const wp = tr.P[wi];
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(70, 60, 30), toon(0x3a2266)); cliff.position.set(cx, 22, cz); cliff.lookAt(wp.x, 22, wp.z); scene.add(cliff);
  const wtex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#7fe8ff'; g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 90; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.8)' : 'rgba(40,160,255,.6)'; g.fillRect(Math.random()*64, Math.random()*256, 2 + Math.random()*3, 20 + Math.random()*40); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(22, 58), new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.92 }));
  const dir = new THREE.Vector3(wp.x - cx, 0, wp.z - cz).normalize();
  fall.position.set(cx + dir.x*15.5, 21, cz + dir.z*15.5); fall.lookAt(wp.x, 21, wp.z); scene.add(fall);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(20, 24), new THREE.MeshBasicMaterial({ color: 0x3fd6ff, transparent: true, opacity: .85 }));
  pool.rotation.x = -Math.PI/2; pool.position.set(cx + dir.x*24, -5.2, cz + dir.z*24); scene.add(pool);
  upd.push((t, dt) => { wtex.offset.y += dt*1.6; });

  return { update: (t, dt) => upd.forEach(f => f(t, dt)) };
}
