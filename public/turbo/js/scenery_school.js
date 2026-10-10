// Umgebung "Schulhof-Stadion" (sonniger Tag, Schule, Fußballplatz, Tribünen mit Fans, Flutlicht)
import * as THREE from './three.module.min.js';
import { rnd } from './scenery_common.js';

export function school(K, def = {}) {
  const { scene, tr, toon, quality, m4, q, e, s3, p3, WALL, ctex } = K;
  const night = !!def.night;
  if (night) {
    scene.fog = new THREE.Fog(0x0a1030, 200, 900);
    K.sky({ top: 0x040818, mid: 0x0a1a48, hor: 0x2a3a8a, stars: true, disc: { c0: '#f0f4ff', c1: 'rgba(160,190,255,.45)', size: 180, pos: [420, 380, -500], moon: true }, clouds: { color: 'rgba(120,140,220,.35)', n: 10 } });
    K.lights({ hemi: [0x6a8aff, 0x1a2a3a, 0.9], sun: [0xd8e4ff, 1.5], dir: [160, 300, -120] });
  } else {
  scene.fog = new THREE.Fog(0xbfe4ff, 260, 1000);
  K.sky({ top: 0x1f6ad6, mid: 0x7ac0ff, hor: 0xe6f6ff, disc: { c0: '#ffffff', c1: 'rgba(255,250,200,.6)', size: 160, pos: [-420, 420, -500] }, clouds: { color: 'rgba(255,255,255,.95)', n: 18, y0: 120, y1: 260 } });
  K.lights({ hemi: [0xffffff, 0x6a8a4a, 1.15], sun: [0xfff4e0, 2.7], dir: [-150, 320, -120] });
  }
  K.ground(night ? [0x1e4a2a, 0x24582f, 0x1a3e24, 0x22502c] : [0x4aa84a, 0x5cc05a, 0x3e9440, 0x54b452], -5.5, 120, g => { g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 256); });

  // Fußballplatz im Innenfeld
  const spot = K.bestSpot(48) || K.spots(1, 50, 120)[0];
  if (spot) {
    const [cx, cz] = spot; const PW = 70, PL = 46;
    const pt = ctex(512, 340, (g, w, h) => { for (let x = 0; x < w; x += 40) { g.fillStyle = (x/40) % 2 ? '#3ab84a' : '#46c656'; g.fillRect(x, 0, 40, h); }
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20); g.beginPath(); g.moveTo(w/2, 10); g.lineTo(w/2, h - 10); g.stroke(); g.beginPath(); g.arc(w/2, h/2, 46, 0, 7); g.stroke();
      g.strokeRect(10, h/2 - 70, 70, 140); g.strokeRect(w - 80, h/2 - 70, 70, 140); g.strokeRect(10, h/2 - 34, 26, 68); g.strokeRect(w - 36, h/2 - 34, 26, 68); });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshLambertMaterial({ map: pt })); pitch.rotation.x = -Math.PI/2; pitch.position.set(cx, -5.4, cz); pitch.receiveShadow = true; scene.add(pitch);
    const netT = ctex(64, 64, g => { g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } });
    netT.wrapS = netT.wrapT = THREE.RepeatWrapping; netT.repeat.set(4, 2);
    for (const s of [-1, 1]) {
      const goal = new THREE.Group(); goal.position.set(cx + s*(PW/2 - 0.5), -5.4, cz); goal.rotation.y = s > 0 ? Math.PI : 0; scene.add(goal);
      for (const z of [-3.6, 3.6]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), toon(0xffffff)); post.position.set(0, 1.3, z); goal.add(post); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7.4, 8), toon(0xffffff)); bar.rotation.x = Math.PI/2; bar.position.y = 2.6; goal.add(bar);
      const net = new THREE.Mesh(new THREE.BoxGeometry(2, 2.6, 7.2), new THREE.MeshBasicMaterial({ map: netT, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); net.position.set(-1, 1.3, 0); goal.add(net);
    }
    // Riesenfußball
    const bt = ctex(256, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; for (let i = 0; i < 9; i++) { const x = (i*61) % w, y = (i*37) % h; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k/5*Math.PI*2; g.lineTo(x + Math.cos(a)*16, y + Math.sin(a)*16); } g.fill(); } });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(5, 28, 20), new THREE.MeshToonMaterial({ map: bt })); ball.position.set(cx, -0.4, cz); ball.castShadow = true; scene.add(ball);
    K.upd.push(t => { ball.rotation.y = t*0.3; ball.position.y = -0.4 + Math.abs(Math.sin(t*1.6))*3; });
  }

  // Schulgebäude
  const bspot = K.spots(1, 70, 110)[0];
  if (bspot) {
    const [x, z] = bspot; const to = tr.P[tr.locate(new THREE.Vector3(x, 0, z)).i];
    const g = new THREE.Group(); g.position.set(x, -5.5, z); g.lookAt(to.x, -5.5, to.z); scene.add(g);
    const brick = ctex(256, 256, (c, w, h) => { c.fillStyle = '#c2523a'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8d6c0'; for (let y = 0; y < h; y += 16) { c.fillRect(0, y, w, 2); for (let x2 = (y/16 % 2)*16; x2 < w; x2 += 32) c.fillRect(x2, y, 2, 16); } }); brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(6, 2);
    const win = ctex(512, 256, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) { const x2 = 20 + k*62, y = 20 + r*80; c.fillStyle = '#fff'; c.fillRect(x2 - 4, y - 4, 48, 60); c.fillStyle = r === 1 && k % 3 === 0 ? '#ffe9a0' : '#7ac8ff'; c.fillRect(x2, y, 40, 52); c.fillStyle = '#fff'; c.fillRect(x2 + 18, y, 4, 52); c.fillRect(x2, y + 24, 40, 4);
      if ((r + k) % 4 === 1) { c.font = '26px sans-serif'; c.fillText(['⭐', '🎨', '🦉', '⚽'][k % 4], x2 + 6, y + 22); } } });
    const body = new THREE.Mesh(new THREE.BoxGeometry(70, 24, 20), [toon(0, 0, brick), toon(0, 0, brick), toon(0x8a3a2a), toon(0x8a3a2a), toon(0, 0, brick), toon(0, 0, brick)]); body.position.y = 12; body.castShadow = true; g.add(body);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(66, 22), new THREE.MeshBasicMaterial({ map: win, transparent: true })); front.position.set(0, 12, 10.05); g.add(front);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 14, 10, 4, 1), toon(0x5a3a6a)); roof.rotation.y = Math.PI/4; roof.scale.set(3.6, 1, 1); roof.position.y = 29; g.add(roof);
    const sign = ctex(512, 96, (c, w, h) => { c.fillStyle = '#2a5ad6'; c.fillRect(0, 0, w, h); c.font = '900 52px system-ui'; c.textAlign = 'center'; c.fillStyle = '#ffe14a'; c.fillText('LEWOLUX-SCHULE', w/2, 66); });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(30, 5.6), new THREE.MeshBasicMaterial({ map: sign })); s.position.set(0, 27, 10.2); g.add(s);
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.5, 24), toon(0xffffff)); clock.rotation.x = Math.PI/2; clock.position.set(0, 33, 6); g.add(clock);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.2), toon(0x111111)); hand.position.set(0, 33, 6.4); g.add(hand); K.upd.push(t => { hand.rotation.z = -t*0.5; });
    const door = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 0.6), toon(0x2a5ad6)); door.position.set(0, 3.5, 10.2); g.add(door);
  }

  // Tribünen mit Fans entlang einer langen Geraden
  const fanCols = [0xe52a2a, 0x2a5ad6, 0xffe14a, 0x3ad46a, 0xff8a3c, 0xffffff, 0xa24bff, 0xff3fd0];
  const fans = [], steps = [];
  for (const [f, side] of [[0.03, -1], [0.5, 1], [0.94, 1]]) {
    const i0 = Math.round(f*tr.N), len = 60;
    for (let k = 0; k < len; k += 2) {
      const i = (i0 + k) % tr.N, p = tr.P[i], r = tr.R[i], T = tr.T[i];
      for (let row = 0; row < 6; row++) {
        const l = side*(WALL + 4 + row*1.8), y = p.y + row*1.2;
        steps.push([p.x + r.x*l, y - 0.4, p.z + r.z*l, Math.atan2(T.x, T.z), row]);
        if (Math.random() < 0.85) fans.push([p.x + r.x*l, y + 0.25, p.z + r.z*l, Math.atan2(-r.x*side, -r.z*side), Math.random()*6, fanCols[(Math.random()*fanCols.length) | 0]]);
      }
    }
    // Dach
    const im = (i0 + len/2) % tr.N, pm = tr.P[im], rm = tr.R[im];
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, len*tr.seg + 6), toon(0xd8dde8)); roof.position.set(pm.x + rm.x*side*(WALL + 9), pm.y + 11, pm.z + rm.z*side*(WALL + 9)); roof.rotation.y = Math.atan2(tr.T[im].x, tr.T[im].z); roof.castShadow = true; scene.add(roof);
  }
  K.inst(new THREE.BoxGeometry(2.2, 1.2, 1.9), toon(0xffffff), steps, ([x, y, z, ry, row], i, im) => { m4.compose(p3.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), s3.setScalar(1)); im.setColorAt(i, new THREE.Color(row % 2 ? 0x8a9ab0 : 0xa8b4c8)); }, true);
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.35, 0.5, 4, 8), toon(0xffffff), fans.length);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), toon(0xf1c09a), fans.length);
  fans.forEach((f, i) => { body.setColorAt(i, new THREE.Color(f[5])); });
  scene.add(body, head);
  let fr = 0;
  K.upd.push(t => { if ((fr++ % 2) && quality < 1) return;
    fans.forEach(([x, y, z, ry, ph], i) => { const j = Math.max(0, Math.sin(t*6 + ph))*0.35; m4.compose(p3.set(x, y + 0.45 + j, z), q.setFromEuler(e.set(0, ry, 0)), s3.setScalar(1)); body.setMatrixAt(i, m4); m4.compose(p3.set(x, y + 1.2 + j, z), q.identity(), s3.setScalar(1)); head.setMatrixAt(i, m4); });
    body.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true; });

  // Flutlichtmasten
  for (let k = 0; k < 6; k++) {
    const i = Math.round((k/6 + 0.08)*tr.N) % tr.N, s = k % 2 ? 1 : -1, p = tr.P[i], r = tr.R[i], l = s*(WALL + 14);
    const g = new THREE.Group(); g.position.set(p.x + r.x*l, p.y - 5, p.z + r.z*l); scene.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 40, 8), toon(0x9aa0b0)); pole.position.y = 20; pole.castShadow = true; g.add(pole);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 1), toon(0x6a7080)); panel.position.y = 41; g.add(panel);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { const L = new THREE.Mesh(new THREE.CircleGeometry(0.8, 12), K.glow(0xfffbe8)); L.position.set(-2.2 + a*2.2, 40.1 + b*1.8, 0.55); g.add(L); }
    g.lookAt(p.x, p.y - 5, p.z);
    if (night) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.haloT, color: 0xfff6d8, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); h.position.set(g.position.x, g.position.y + 41, g.position.z); h.scale.setScalar(26); scene.add(h);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(26, 32), new THREE.MeshBasicMaterial({ map: K.haloT, color: 0xfff0c0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI/2; pool.position.set(p.x, p.y + 0.12, p.z); scene.add(pool); }
  }
  // Bäume, Hecken, Blumen
  K.roundTrees([...K.along(Math.round(70*quality), WALL + 8, WALL + 40), ...K.spots(Math.round(80*quality), WALL + 40, 260)]);
  K.inst(new THREE.BoxGeometry(1, 1, 1), toon(0x2f8a3a), K.along(Math.round(120*quality), WALL + 2, WALL + 6), ([x, z, d]) => { m4.compose(p3.set(x, K.groundY(x, z, d) + 0.7, z), q.setFromEuler(e.set(0, rnd(0, 3), 0)), s3.set(rnd(2, 4), 1.4, 1.4)); }, true);
  K.tufts(900, 300, 0x7ad86a);
  K.flowers(260, [0xff5a8a, 0xffe14a, 0xffffff, 0xff8a3c, 0xa24bff]);
  // Wimpelketten-Tore (Fußballtor-Form) über der Strecke
  const bunt = [0xe52a2a, 0xffe14a, 0x2a5ad6, 0x3ad46a, 0xff8a3c];
  for (const f of [0.12, 0.38, 0.66, 0.86]) {
    const { p, r, W } = K.gateAt(f); const H = 12;
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, H + 5, 12), toon(0xffffff)); post.position.set(p.x + r.x*s*W, p.y + (H + 5)/2 - 5, p.z + r.z*s*W); post.castShadow = true; scene.add(post); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, W*2, 12), toon(0xffffff)); bar.position.set(p.x, p.y + H, p.z); bar.lookAt(p.x + r.x, p.y + H, p.z + r.z); bar.rotateX(Math.PI/2); bar.castShadow = true; scene.add(bar);
    for (let k = 0; k < 18; k++) { const t2 = (k + 0.5)/18*2 - 1, sag = (1 - t2*t2)*2.5; const fl = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 3), toon(bunt[k % 5])); fl.position.set(p.x + r.x*t2*W, p.y + H - 0.9 - sag, p.z + r.z*t2*W); fl.rotation.x = Math.PI; scene.add(fl); }
  }
  if (night) K.posts({ pole: 0x8a9ab0, h: 6, every: 30, lamp: [0xfff0c0, 0xfff0c0], halo: 0.55 });
  else K.posts({ pole: 0xffffff, h: 5, every: 40, lamp: [0xe52a2a, 0x2a5ad6], lampGeo: new THREE.BoxGeometry(1.4, 0.9, 0.1), lampMat: toon(0xffffff) });
  K.billboards(toon(0xffffff), 0x8a9ab0);
  if (night) K.mountains(0x10183a, 0x0a1028, 0.6); else K.mountains(0x8ab8d8, 0xa8cce6, 0.6);
  if (night) K.motes(Math.round(300*quality), 0xbfe0ff, 70); else K.motes(Math.round(160*quality), 0xffffff, 60, 4, 60, 2, 14);
  if (night) { // Feuerwerk über dem Stadion
    const fw = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 2.4, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: K.haloT }));
    const NP = 240, pos = new Float32Array(NP*3), col = new Float32Array(NP*3), vel = new Float32Array(NP*3); fw.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fw.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); fw.frustumCulled = false; scene.add(fw);
    let tt = 0, burst = 0; const c0 = K.inner.getCenter(new THREE.Vector3());
    K.upd.push((t, dt) => { tt += dt; if (tt > 1.6) { tt = 0; const x = c0.x + rnd(-120, 120), z = c0.z + rnd(-120, 120), y = rnd(70, 110), cc = new THREE.Color().setHSL(Math.random(), 1, 0.6); for (let i = 0; i < 60; i++) { const k = (burst*60 + i) % NP; const a = rnd(0, 6.28), b = Math.acos(rnd(-1, 1)), v = rnd(14, 20); pos.set([x, y, z], k*3); vel.set([Math.sin(b)*Math.cos(a)*v, Math.cos(b)*v, Math.sin(b)*Math.sin(a)*v], k*3); col.set([cc.r, cc.g, cc.b], k*3); } burst++; }
      for (let k = 0; k < NP; k++) { vel[k*3+1] -= 9*dt; pos[k*3] += vel[k*3]*dt; pos[k*3+1] += vel[k*3+1]*dt; pos[k*3+2] += vel[k*3+2]*dt; col[k*3] *= 0.985; col[k*3+1] *= 0.985; col[k*3+2] *= 0.985; }
      fw.geometry.attributes.position.needsUpdate = true; fw.geometry.attributes.color.needsUpdate = true; });
  }
  return K.finish();
}
