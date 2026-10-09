// Umgebung "Neon-Dschungel": Himmel mit Polarlicht, Licht + Schatten, dichte Pflanzen, Leuchtpilze,
// Laternen, Lianen-Tore, Werbetafeln, Wasserfall, Glühwürmchen
import * as THREE from './three.module.min.js';
import { WALL, HALF } from './track.js';
import { glow } from './karts.js';

function ctex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const rnd = (a, b) => a + Math.random()*(b - a);

export function buildScenery(scene, tr, toon, quality = 1) {
  const upd = [];
  scene.fog = new THREE.Fog(0x2a1452, 160, 820);

  // ---------- Himmel ----------
  const skyU = { t: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float t; varying vec3 vp;
      void main(){ float h = vp.y;
        vec3 top = vec3(0.03,0.02,0.16), mid = vec3(0.26,0.08,0.45), hor = vec3(1.0,0.32,0.62);
        vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.65, h)) : mix(hor, mid, smoothstep(-0.04, 0.1, h));
        float a = atan(vp.z, vp.x);
        float band = sin(a*3.0 + t*0.07 + sin(a*7.0 + t*0.11)*0.6)*0.5 + 0.5;
        float aur = smoothstep(0.15, 0.3, h) * (1.0 - smoothstep(0.3, 0.62, h)) * pow(band, 3.0);
        c += aur * mix(vec3(0.1,0.9,0.7), vec3(0.6,0.3,1.0), sin(a*2.0 + t*0.05)*0.5 + 0.5) * 0.55;
        gl_FragColor = vec4(c, 1.0); }`
  }));
  scene.add(sky); upd.push(t => { skyU.t.value = t; });
  const starG = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 1400; i++) { const a = Math.random()*Math.PI*2, e = 0.12 + Math.random()*1.35; sp.push(Math.cos(a)*Math.cos(e)*900, Math.sin(e)*900, Math.sin(a)*Math.cos(e)*900); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, fog: false })));
  const mc = ctex(256, 256, g => { const r = g.createRadialGradient(128, 128, 50, 128, 128, 128); r.addColorStop(0, '#fff6d8'); r.addColorStop(.4, '#fff3c8'); r.addColorStop(.42, 'rgba(255,190,255,.45)'); r.addColorStop(1, 'rgba(255,120,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(220,200,170,.35)'; for (const [x, y, s] of [[110, 100, 14], [150, 140, 10], [120, 150, 8], [145, 105, 6]]) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } });
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: mc, fog: false, depthWrite: false })); moon.scale.set(220, 220, 1); moon.position.set(-500, 330, -560); scene.add(moon);
  // Wolken
  const cloudT = ctex(256, 128, g => { for (let i = 0; i < 14; i++) { const x = rnd(40, 216), y = rnd(50, 90), r = rnd(20, 45); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,170,230,.55)'); gr.addColorStop(1, 'rgba(255,170,230,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } });
  for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, fog: false, depthWrite: false, transparent: true, opacity: rnd(0.35, 0.7) })); const a = rnd(0, Math.PI*2), r = rnd(500, 700); s.position.set(Math.cos(a)*r, rnd(90, 220), Math.sin(a)*r); s.scale.set(rnd(220, 380), rnd(80, 130), 1); scene.add(s); }

  // ---------- Licht ----------
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x4a1a70, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0ff, 2.2); sun.position.set(-200, 300, -150);
  sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 320;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const sunDir = sun.position.clone().normalize();

  // ---------- Boden ----------
  const gtex = ctex(256, 256, g => { g.fillStyle = '#123a32'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) { g.fillStyle = ['#1a4c40', '#0d2b27', '#1f5a4a', '#2a2a5a'][i % 4]; g.fillRect(Math.random()*256, Math.random()*256, 2, 3); } });
  gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.repeat.set(140, 140);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshLambertMaterial({ map: gtex }));
  ground.rotation.x = -Math.PI/2; ground.position.y = -5.5; ground.receiveShadow = true; scene.add(ground);

  // ---------- Platzsuche ----------
  const distTo = (x, z) => { let b = 1e9; for (let i = 0; i < tr.N; i += 5) { const p = tr.P[i]; const d = (p.x-x)**2 + (p.z-z)**2; if (d < b) b = d; } return Math.sqrt(b); };
  const box = new THREE.Box3(); for (const p of tr.P) box.expandByPoint(p); box.expandByScalar(180);
  const spots = (n, dmin, dmax) => { const out = []; let tries = 0;
    while (out.length < n && tries++ < n*50) { const x = THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random()), z = THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random());
      const d = distTo(x, z); if (d > dmin && d < dmax) out.push([x, z, d]); } return out; };
  const along = (n, l0, l1) => { const out = []; for (let k = 0; k < n; k++) { const i = Math.random()*tr.N | 0, s = Math.random() < .5 ? -1 : 1, l = s*rnd(l0, l1); const p = tr.P[i], r = tr.R[i];
    const x = p.x + r.x*l, z = p.z + r.z*l; if (distTo(x, z) < l0 - 0.5) continue; out.push([x, z, Math.abs(l), i]); } return out; };
  const groundY = (x, z, d) => { const L = tr.locate(new THREE.Vector3(x, 0, z)); const base = tr.P[L.i].y; if (d <= WALL + 0.3) return base - 0.05; const f = Math.min(1, (d - WALL) / 14); return base + (-5.5 - base)*f; };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const inst = (geo, mat, list, f, shadow = false) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); let n = 0; list.forEach((it, i) => { if (f(it, n, im) !== false) im.setMatrixAt(n++, m4); }); im.count = n; im.castShadow = shadow; scene.add(im); return im; };

  // ---------- Texturen für Pflanzen ----------
  const frondT = ctex(128, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#d8fff0'; g.lineWidth = 6; g.beginPath(); g.moveTo(w/2, h); g.lineTo(w/2, 0); g.stroke();
    for (let y = 20; y < h - 10; y += 14) { const len = Math.sin((y/h)*Math.PI)*58 + 6; g.fillStyle = '#ffffff';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w/2, y); g.quadraticCurveTo(w/2 + s*len*0.6, y - 18, w/2 + s*len, y - 4); g.quadraticCurveTo(w/2 + s*len*0.5, y + 2, w/2, y + 8); g.fill(); } }
  });
  const fernT = ctex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fff';
    for (let y = 10; y < h; y += 10) { const len = (1 - y/h)*50 + 8; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w/2 + s*len*0.5, y, len*0.55, 4, s*-0.35, 0, 7); g.fill(); } }
    g.fillRect(w/2 - 2, 0, 4, h); });
  const grassT = ctex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const x = rnd(8, 56); g.fillStyle = i % 3 ? '#fff' : '#e0ffe8'; g.beginPath(); g.moveTo(x - 3, h); g.quadraticCurveTo(x + rnd(-10, 10), h*0.5, x + rnd(-12, 12), rnd(4, 24)); g.lineTo(x + 3, h); g.fill(); } });
  const leafMat = (map, color, em) => new THREE.MeshLambertMaterial({ map, color, emissive: em, alphaTest: 0.5, side: THREE.DoubleSide });

  // ---------- Palmen ----------
  const nPalm = Math.round(150*quality);
  const palmSpots = [...along(Math.round(nPalm*0.55), WALL + 6, WALL + 30), ...spots(Math.round(nPalm*0.45), WALL + 30, 260)];
  const barkT = ctex(64, 256, (g, w, h) => { g.fillStyle = '#6a3a5a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = '#4e2846'; g.fillRect(0, y, w, 5); g.fillStyle = '#8a4a72'; g.fillRect(0, y + 5, w, 2); } });
  barkT.wrapS = barkT.wrapT = THREE.RepeatWrapping; barkT.repeat.set(1, 4);
  const frond = new THREE.PlaneGeometry(1.8, 7, 1, 8); frond.translate(0, 3.5, 0);
  { const p = frond.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y/7; p.setZ(i, p.getZ(i) - t*t*3.2); } frond.rotateX(-Math.PI/2.2); frond.computeVertexNormals(); }
  const frondMat = leafMat(frondT, 0x2fe0a8, 0x0a4a3a);
  const tipCols = [0x29f0ff, 0xff3fd0, 0xfff36b, 0x8aff6b];
  const trunkMat = toon(0, 0, barkT);
  const crowns = [];
  [1.6, -2.2, 3.0].forEach((bend, v) => {
    const list = palmSpots.filter((_, i) => i % 3 === v);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(bend*0.06, 0.35, 0), new THREE.Vector3(bend*0.3, 0.7, 0), new THREE.Vector3(bend*0.6, 1, 0)]);
    const geo = new THREE.TubeGeometry(curve, 12, 1, 8, false);
    { const p = geo.attributes.position; const tmp = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { const y = p.getY(i); const c = curve.getPoint(Math.min(1, Math.max(0, y))); tmp.set(p.getX(i) - c.x, 0, p.getZ(i) - c.z).multiplyScalar(0.05*(1 - y*0.45)); p.setX(i, c.x + tmp.x); p.setZ(i, c.z + tmp.z); } geo.computeVertexNormals(); }
    inst(geo, trunkMat, list, ([x, z, d]) => { const h = rnd(11, 21), y = groundY(x, z, d), ry = Math.random()*6.28;
      e.set(0, ry, 0); m4.compose(p3.set(x, y, z), q.setFromEuler(e), s3.set(h*0.1, h, h*0.1));
      const top = new THREE.Vector3(bend*0.6*h*0.1, h, 0).applyEuler(e); crowns.push([x + top.x, y + top.y, z + top.z]); }, true);
  });
  inst(frond, frondMat, crowns.flatMap(c => [0, 1, 2, 3, 4, 5, 6].map(k => [c, k])), ([c, k]) => { const ry = k/7*Math.PI*2 + Math.random()*0.5; m4.compose(p3.set(c[0], c[1], c[2]), q.setFromEuler(e.set(rnd(-0.25, 0.15), ry, 0, 'YXZ')), s3.setScalar(rnd(0.85, 1.25))); }, true);
  inst(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), crowns, (c, i, im) => { m4.compose(p3.set(c[0], c[1] - 0.4, c[2]), q.identity(), s3.setScalar(1)); im.setColorAt(i, new THREE.Color(tipCols[i % 4])); });

  // ---------- Urwaldriesen ----------
  const giants = spots(Math.round(45*quality), 60, 300);
  inst(new THREE.CylinderGeometry(1.4, 2.4, 1, 9), toon(0x4a2a4a), giants, ([x, z, d]) => { m4.compose(p3.set(x, groundY(x, z, d) + 14, z), q.identity(), s3.set(1.6, 30, 1.6)); }, true);
  inst(new THREE.IcosahedronGeometry(1, 1), toon(0x1f9a7a, 0x06302a), giants.flatMap(g => [0, 1, 2, 3, 4].map(k => [g, k])), ([[x, z, d], k]) => { const y = groundY(x, z, d) + 30; const a = k*1.26; const r = k ? 8 : 0;
    m4.compose(p3.set(x + Math.cos(a)*r, y + (k ? rnd(-2, 2) : 4), z + Math.sin(a)*r), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), 0)), s3.set(rnd(8, 12), rnd(6, 8), rnd(8, 12))); }, true);

  // ---------- Farne, Gras, Blumen, Felsen ----------
  const fernG = new THREE.PlaneGeometry(2.4, 3.2, 1, 4); fernG.translate(0, 1.4, 0); { const p = fernG.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.pow(p.getY(i)/3, 2)*1.2); fernG.computeVertexNormals(); }
  const fernMat = leafMat(fernT, 0x3ad08a, 0x0a3a2a);
  const fernSpots = along(Math.round(520*quality), WALL + 0.8, WALL + 22);
  inst(fernG, fernMat, fernSpots.flatMap(sp => [0, 1, 2, 3].map(k => [sp, k])), ([[x, z, d], k]) => { m4.compose(p3.set(x, groundY(x, z, d), z), q.setFromEuler(e.set(0, k*1.57 + rnd(-0.3, 0.3), 0)), s3.setScalar(rnd(0.7, 1.4))); });
  const tuftG = new THREE.PlaneGeometry(1.4, 1.0); tuftG.translate(0, 0.45, 0);
  const tuftMat = leafMat(grassT, 0x4ad89a, 0x0a3a2a);
  const tuftSpots = [...along(Math.round(1600*quality), HALF + 3.0, WALL - 1.5), ...along(Math.round(700*quality), WALL + 0.6, WALL + 16)];
  inst(tuftG, tuftMat, tuftSpots.flatMap(sp => [0, 1].map(k => [sp, k])), ([[x, z, d], k]) => { m4.compose(p3.set(x, groundY(x, z, d), z), q.setFromEuler(e.set(0, k*1.57 + rnd(0, 1), 0)), s3.setScalar(rnd(0.7, 1.5))); });
  const flowers = along(Math.round(420*quality), WALL + 0.8, WALL + 18);
  const fcols = [0xff3fd0, 0x29f0ff, 0xfff36b, 0xb36bff, 0xff7a5a];
  inst(new THREE.CylinderGeometry(0.05, 0.05, 1, 4), toon(0x2a8a5a), flowers, ([x, z, d]) => { m4.compose(p3.set(x, groundY(x, z, d) + 0.5, z), q.identity(), s3.set(1, rnd(0.6, 1.6), 1)); });
  inst(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), flowers, ([x, z, d], i, im) => { m4.compose(p3.set(x, groundY(x, z, d) + 1.0 + Math.random()*0.5, z), q.identity(), s3.setScalar(rnd(0.8, 1.6))); im.setColorAt(i, new THREE.Color(fcols[i % 5])); });
  const rocks = along(Math.round(140*quality), WALL + 1.5, WALL + 26);
  inst(new THREE.DodecahedronGeometry(1, 0), toon(0x5a4a7a), rocks, ([x, z, d]) => { m4.compose(p3.set(x, groundY(x, z, d), z), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), rnd(0, 3))), s3.set(rnd(0.8, 2.6), rnd(0.6, 1.8), rnd(0.8, 2.4))); }, true);

  // ---------- Leuchtpilze ----------
  const mSpots = along(Math.round(130*quality), WALL + 2, WALL + 34);
  const capCols = [0xff3fd0, 0x29f0ff, 0xb36bff, 0xfff36b];
  const stemG = new THREE.CylinderGeometry(0.3, 0.45, 1, 10); stemG.translate(0, 0.5, 0);
  const capG = new THREE.SphereGeometry(1, 18, 9, 0, Math.PI*2, 0, Math.PI/2);
  const mData = mSpots.map(([x, z, d]) => [x, z, groundY(x, z, d), rnd(0.8, 2.8)]);
  inst(stemG, toon(0xf5e6ff, 0x2a1a3a), mData, ([x, z, y, k]) => { m4.compose(p3.set(x, y, z), q.identity(), s3.set(k, k*2.2, k)); }, true);
  inst(capG, new THREE.MeshBasicMaterial({ color: 0xffffff }), mData, ([x, z, y, k], i, im) => { m4.compose(p3.set(x, y + k*2.1, z), q.identity(), s3.set(k*1.7, k*1.05, k*1.7)); im.setColorAt(i, new THREE.Color(capCols[i % 4]).multiplyScalar(0.85)); });
  inst(new THREE.SphereGeometry(0.18, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), mData.flatMap(m => [0, 1, 2].map(k => [m, k])), ([[x, z, y, k], j]) => { const a = j*2.1 + x; m4.compose(p3.set(x + Math.cos(a)*k*0.9, y + k*2.1 + k*0.75, z + Math.sin(a)*k*0.9), q.identity(), s3.setScalar(k*0.9)); });

  // ---------- Laternen entlang der Bande ----------
  const posts = []; for (let i = 0; i < tr.N; i += 34) for (const s of [-1, 1]) { const p = tr.P[i], r = tr.R[i], l = s*(WALL + 1.3); posts.push([p.x + r.x*l, p.y, p.z + r.z*l, s, i]); }
  inst(new THREE.CylinderGeometry(0.18, 0.25, 1, 8), toon(0x2a1a4a), posts, ([x, y, z]) => { m4.compose(p3.set(x, y + 3, z), q.identity(), s3.set(1, 6, 1)); }, true);
  inst(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), posts, ([x, y, z, s], i, im) => { m4.compose(p3.set(x, y + 6.3, z), q.identity(), s3.setScalar(1)); im.setColorAt(i, new THREE.Color(s < 0 ? 0x29f0ff : 0xff3fd0)); });
  const haloT = ctex(64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  for (const [x, y, z, s] of posts) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, color: s < 0 ? 0x29f0ff : 0xff3fd0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); h.position.set(x, y + 6.3, z); h.scale.setScalar(4.5); scene.add(h); }

  // ---------- Lianen-Tore über der Strecke ----------
  const vineMat = toon(0x2a7a5a, 0x062a20), lanternCols = [0xfff36b, 0xff3fd0, 0x29f0ff];
  for (const f of [0.14, 0.43, 0.69, 0.93]) {
    const i = Math.round(f*tr.N), p = tr.P[i], r = tr.R[i]; const W = WALL + 2.2, H = 15;
    const g = new THREE.Group(); scene.add(g);
    for (const s of [-1, 1]) { const tr1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.6, H + 6, 10), toon(0x5a3050)); tr1.position.set(p.x + r.x*s*W, p.y + (H + 6)/2 - 5, p.z + r.z*s*W); tr1.castShadow = true; g.add(tr1); }
    const arc = new THREE.CatmullRomCurve3([-1, -0.6, 0, 0.6, 1].map(t => new THREE.Vector3(p.x + r.x*t*W, p.y + H + (1 - t*t)*5, p.z + r.z*t*W)));
    const a = new THREE.Mesh(new THREE.TubeGeometry(arc, 30, 0.9, 8, false), vineMat); a.castShadow = true; g.add(a);
    const leaves = new THREE.InstancedMesh(fernG, fernMat, 26);
    for (let k = 0; k < 26; k++) { const pt = arc.getPoint(k/25); m4.compose(p3.copy(pt), q.setFromEuler(e.set(rnd(-1, 1), rnd(0, 6), rnd(-1, 1))), s3.setScalar(rnd(1, 1.8))); leaves.setMatrixAt(k, m4); }
    g.add(leaves);
    for (let k = 1; k < 8; k++) {
      const pt = arc.getPoint(k/8), len = rnd(3, 7);
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 5), vineMat); v.position.set(pt.x, pt.y - len/2, pt.z); g.add(v);
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), glow(lanternCols[k % 3])); lan.position.set(pt.x, pt.y - len - 0.3, pt.z); g.add(lan);
      upd.push(t => { const sw = Math.sin(t*1.3 + k)*0.15; lan.position.x = pt.x + r.x*sw; lan.position.z = pt.z + r.z*sw; });
    }
  }

  // ---------- Werbetafeln (unsere Spiele) ----------
  const ads = [['PANDI', '🐼', 'Jetzt spielen!', '#7fd6ff', '#c58bff'], ['KRITZELHELD', '🦉', 'Schreiben lernen mit Kritzel', '#5fb6ff', '#ffe14a'], ['SCHULHOFKICKER', '⚽', 'Wie weit schießt du?', '#3ad46a', '#ffffff'],
    ['RING LEGENDS', '🤼', 'Sammle alle Karten!', '#ff5a3c', '#ffe14a'], ['NERVBERT', '🧔', 'Der Onkel kommt!', '#ff8a3c', '#2fd4ff'], ['LEWOLUX.DE', '🦁', 'Spiele für alle', '#a24bff', '#29f0ff'], ['STERNENWURF', '🌠', 'Wirf dein Glück!', '#3a2aa0', '#fff36b']];
  ads.forEach(([title, icon, sub, c1, c2], n) => {
    const i = Math.round(((n + 0.5)/ads.length + 0.03)*tr.N) % tr.N, side = n % 2 ? 1 : -1, p = tr.P[i], r = tr.R[i], l = side*(WALL + 7);
    const t = ctex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, '#1a0b3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.font = '220px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 190, h/2 + 10);
      g.textAlign = 'left'; g.font = `900 ${title.length > 11 ? 92 : 120}px system-ui,sans-serif`; g.lineWidth = 14; g.strokeStyle = '#150a24'; g.strokeText(title, 340, h/2 - 50); g.fillStyle = c2; g.fillText(title, 340, h/2 - 50);
      g.font = '700 52px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText(sub, 344, h/2 + 70); });
    const g = new THREE.Group(); g.position.set(p.x + r.x*l, p.y, p.z + r.z*l); scene.add(g);
    g.lookAt(p.x - tr.T[i].x*30, p.y, p.z - tr.T[i].z*30);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: t, color: 0xdddddd })); board.position.y = 10; g.add(board);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(16.8, 8.8, 0.5), glow(c2 === '#ffffff' ? 0x3ad46a : new THREE.Color(c2).getHex())); frame.position.set(0, 10, -0.3); g.add(frame);
    const back = new THREE.Mesh(new THREE.BoxGeometry(16.4, 8.4, 0.6), toon(0x1a0b3a)); back.position.set(0, 10, -0.35); g.add(back);
    for (const sx of [-5, 5]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 8), toon(0x2a1a4a)); leg.position.set(sx, 1, -0.6); leg.castShadow = true; g.add(leg); }
  });

  // ---------- ferne Berge (zwei Reihen) ----------
  for (let row = 0; row < 2; row++) for (let i = 0; i < 30; i++) {
    const a = (i + row*0.5)/30*Math.PI*2, r = 600 + row*140 + Math.random()*80, h = 90 + Math.random()*170 + row*60;
    const mt = new THREE.Mesh(new THREE.ConeGeometry(70 + Math.random()*70, h, 7), new THREE.MeshBasicMaterial({ color: row ? 0x24104a : 0x3a1a68 }));
    mt.position.set(Math.cos(a)*r, h/2 - 6, Math.sin(a)*r); mt.rotation.y = Math.random()*3; scene.add(mt);
  }

  // ---------- Glühwürmchen ----------
  const nFly = Math.round(700*quality); const fp = [], fph = [];
  for (let i = 0; i < nFly; i++) { const j = Math.random()*tr.N | 0, side = Math.random() < .5 ? -1 : 1, l = side*rnd(HALF + 2, WALL + 40); fp.push(tr.P[j].x + tr.R[j].x*l, tr.P[j].y + rnd(1, 10), tr.P[j].z + tr.R[j].z*l); fph.push(Math.random()*6.28); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('ph', new THREE.Float32BufferAttribute(fph, 1));
  const flyU = { t: { value: 0 } };
  const flies = new THREE.Points(fg, new THREE.ShaderMaterial({ uniforms: flyU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float ph; uniform float t; varying float a; void main(){ vec3 p = position + vec3(sin(t*0.7+ph)*1.5, sin(t*1.1+ph*2.0)*0.8, cos(t*0.6+ph)*1.5); vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; a = 0.5+0.5*sin(t*3.0+ph*5.0); gl_PointSize = clamp(90.0/ max(1.0, -mv.z), 1.0, 24.0); }',
    fragmentShader: 'varying float a; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor = vec4(1.0,0.95,0.5, (1.0-d*2.0)*a); }' }));
  flies.frustumCulled = false; scene.add(flies); upd.push(t => { flyU.t.value = t; });

  // ---------- Wasserfall ----------
  let wi = 0, cx = 0, cz = 0, bestD = -1;
  for (let f = 0; f < 1; f += 0.04) for (const sd of [-1, 1]) { const ii = Math.round(f*tr.N), x = tr.P[ii].x + tr.R[ii].x*sd*74, z = tr.P[ii].z + tr.R[ii].z*sd*74; const d = distTo(x, z); if (d > bestD && d < 80) { bestD = d; wi = ii; cx = x; cz = z; } }
  const wp = tr.P[wi]; const dir = new THREE.Vector3(wp.x - cx, 0, wp.z - cz).normalize();
  const rockM = toon(0x4a2a72);
  for (let k = 0; k < 14; k++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockM); const a = (k/14 - 0.5)*2.2; const off = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(a)*34);
    rk.position.set(cx + off.x - dir.x*Math.cos(a)*6, rnd(5, 40), cz + off.z - dir.z*Math.cos(a)*6); rk.scale.set(rnd(10, 18), rnd(14, 26), rnd(10, 16)); rk.rotation.set(rnd(0, 3), rnd(0, 3), 0); scene.add(rk); }
  const wtex = ctex(64, 256, g => { g.fillStyle = '#7fe8ff'; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 120; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.85)' : 'rgba(40,160,255,.6)'; g.fillRect(Math.random()*64, Math.random()*256, 2 + Math.random()*3, 20 + Math.random()*50); } });
  wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(20, 52), new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.92, color: 0xcfefff }));
  fall.position.set(cx + dir.x*12, 21, cz + dir.z*12); fall.lookAt(wp.x, 21, wp.z); scene.add(fall);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(22, 32), new THREE.MeshBasicMaterial({ color: 0x3fd6ff, transparent: true, opacity: 0.8 }));
  pool.rotation.x = -Math.PI/2; pool.position.set(cx + dir.x*24, -5.2, cz + dir.z*24); scene.add(pool);
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, color: 0xbff4ff, transparent: true, opacity: 0.5, depthWrite: false })); mist.position.set(cx + dir.x*18, -2, cz + dir.z*18); mist.scale.set(40, 14, 1); scene.add(mist);
  upd.push((t, dt) => { wtex.offset.y += dt*1.8; mist.material.opacity = 0.4 + Math.sin(t*2)*0.1; });

  return {
    sun,
    update: (t, dt) => upd.forEach(f => f(t, dt)),
    follow: (pos) => { sun.target.position.copy(pos); sun.position.copy(pos).addScaledVector(sunDir, 160); },
  };
}
