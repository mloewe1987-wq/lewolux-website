// Gemeinsame Bausteine für alle Strecken-Umgebungen
import * as THREE from './three.module.min.js';
import { WALL, HALF } from './track.js';
import { glow } from './karts.js';

export function ctex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export const rnd = (a, b) => a + Math.random()*(b - a);
const hex = c => '#' + new THREE.Color(c).getHexString();

export function makeKit(scene, tr, toon, quality) {
  const K = { scene, tr, toon, quality, upd: [], THREE, WALL, HALF, glow, ctex, rnd };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  Object.assign(K, { m4, q, e, s3, p3 });

  // Abstand zur Strecke, Plätze suchen
  K.distTo = (x, z) => { let b = 1e9; for (let i = 0; i < tr.N; i += 5) { const p = tr.P[i]; const d = (p.x-x)**2 + (p.z-z)**2; if (d < b) b = d; } return Math.sqrt(b); };
  const box = new THREE.Box3(); for (const p of tr.P) box.expandByPoint(p); K.box = box.clone().expandByScalar(180); K.inner = box;
  K.spots = (n, dmin, dmax, bx = K.box) => { const out = []; let tries = 0;
    while (out.length < n && tries++ < n*60) { const x = THREE.MathUtils.lerp(bx.min.x, bx.max.x, Math.random()), z = THREE.MathUtils.lerp(bx.min.z, bx.max.z, Math.random());
      const d = K.distTo(x, z); if (d > dmin && d < dmax) out.push([x, z, d]); } return out; };
  K.along = (n, l0, l1) => { const out = []; for (let k = 0; k < n; k++) { const i = Math.random()*tr.N | 0, s = Math.random() < .5 ? -1 : 1, l = s*rnd(l0, l1); const p = tr.P[i], r = tr.R[i];
    const x = p.x + r.x*l, z = p.z + r.z*l; if (K.distTo(x, z) < l0 - 0.5) continue; out.push([x, z, Math.abs(l), i]); } return out; };
  K.groundLevel = -5.5;
  K.groundY = (x, z, d) => { const L = tr.locate(new THREE.Vector3(x, 0, z)); const base = tr.P[L.i].y; if (d <= WALL + 0.3) return base - 0.05; const f = Math.min(1, (d - WALL) / 14); return base + (K.groundLevel - base)*f; };
  K.inst = (geo, mat, list, f, shadow = false) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); let n = 0; list.forEach((it) => { if (f(it, n, im) !== false) im.setMatrixAt(n++, m4); }); im.count = n; im.castShadow = shadow; scene.add(im); return im; };
  // größter freier Platz (z. B. Innenfeld)
  K.bestSpot = (minD, tries = 400, bx = K.inner) => { let best = null, bd = -1; for (let i = 0; i < tries; i++) { const x = THREE.MathUtils.lerp(bx.min.x, bx.max.x, Math.random()), z = THREE.MathUtils.lerp(bx.min.z, bx.max.z, Math.random()); const d = K.distTo(x, z); if (d > bd) { bd = d; best = [x, z, d]; } } return bd > minD ? best : null; };

  // ---------- Himmel ----------
  K.sky = (o) => {
    const U = { t: { value: 0 }, top: { value: new THREE.Color(o.top) }, mid: { value: new THREE.Color(o.mid) }, hor: { value: new THREE.Color(o.hor) }, aur: { value: o.aurora ? 1 : 0 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float t, aur; uniform vec3 top, mid, hor; varying vec3 vp;
        void main(){ float h = vp.y; vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.65, h)) : mix(hor, mid, smoothstep(-0.04, 0.1, h));
          float a = atan(vp.z, vp.x); float band = sin(a*3.0 + t*0.07 + sin(a*7.0 + t*0.11)*0.6)*0.5 + 0.5;
          float au = aur*smoothstep(0.15, 0.3, h)*(1.0 - smoothstep(0.3, 0.62, h))*pow(band, 3.0);
          c += au*mix(vec3(0.1,0.9,0.7), vec3(0.6,0.3,1.0), sin(a*2.0 + t*0.05)*0.5 + 0.5)*0.55; gl_FragColor = vec4(c, 1.0); }` }));
    scene.add(sky); K.upd.push(t => { U.t.value = t; });
    if (o.stars) { const g = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 1400; i++) { const a = Math.random()*Math.PI*2, el = 0.12 + Math.random()*1.35; sp.push(Math.cos(a)*Math.cos(el)*900, Math.sin(el)*900, Math.sin(a)*Math.cos(el)*900); }
      g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, fog: false }))); }
    if (o.disc) { const d = o.disc; const t = ctex(256, 256, g => { const r = g.createRadialGradient(128, 128, 40, 128, 128, 128); r.addColorStop(0, d.c0); r.addColorStop(.38, d.c0); r.addColorStop(.42, d.c1); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
        if (d.moon) { g.fillStyle = 'rgba(220,200,170,.35)'; for (const [x, y, s] of [[110, 100, 14], [150, 140, 10], [120, 150, 8], [145, 105, 6]]) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } } });
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false })); s.scale.setScalar(d.size); s.position.set(...d.pos); scene.add(s); }
    if (o.clouds) { const c = o.clouds; const t = ctex(256, 128, g => { for (let i = 0; i < 16; i++) { const x = rnd(40, 216), y = rnd(50, 90), r = rnd(20, 45); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c.color); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } });
      for (let i = 0; i < (c.n || 14); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false, transparent: true, opacity: rnd(0.45, 0.9) })); const a = rnd(0, Math.PI*2), r = rnd(480, 700); s.position.set(Math.cos(a)*r, rnd(c.y0 || 90, c.y1 || 220), Math.sin(a)*r); s.scale.set(rnd(220, 380), rnd(80, 130), 1); scene.add(s);
        const sp = rnd(0.002, 0.006); K.upd.push(t => { const aa = a + t*sp; s.position.x = Math.cos(aa)*r; s.position.z = Math.sin(aa)*r; }); } }
  };
  // ---------- Licht ----------
  K.lights = (o) => {
    scene.add(new THREE.HemisphereLight(o.hemi[0], o.hemi[1], o.hemi[2]));
    const sun = new THREE.DirectionalLight(o.sun[0], o.sun[1]); sun.position.set(...(o.dir || [-200, 300, -150]));
    sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 340;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target); K.sun = sun; K.sunDir = sun.position.clone().normalize();
  };
  // ---------- Boden ----------
  K.ground = (cols, y = -5.5, rep = 140, extra) => {
    K.groundLevel = y;
    const t = ctex(256, 256, g => { g.fillStyle = hex(cols[0]); g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4000; i++) { g.fillStyle = hex(cols[1 + (i % (cols.length - 1))]); g.fillRect(Math.random()*256, Math.random()*256, 2, 3); } if (extra) extra(g); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshLambertMaterial({ map: t })); m.rotation.x = -Math.PI/2; m.position.y = y; m.receiveShadow = true; scene.add(m); return m;
  };
  // ---------- Berge am Horizont ----------
  K.mountains = (c0, c1, hMul = 1, shape = 'cone') => { for (let row = 0; row < 2; row++) for (let i = 0; i < 30; i++) {
    const a = (i + row*0.5)/30*Math.PI*2, r = 600 + row*140 + Math.random()*80, h = (90 + Math.random()*170 + row*60)*hMul;
    const geo = shape === 'mesa' ? new THREE.CylinderGeometry(50 + Math.random()*40, 70 + Math.random()*50, h*0.5, 7) : new THREE.ConeGeometry(70 + Math.random()*70, h, 7);
    const mt = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: row ? c1 : c0 })); mt.position.set(Math.cos(a)*r, (shape === 'mesa' ? h*0.25 : h/2) - 6, Math.sin(a)*r); mt.rotation.y = Math.random()*3; scene.add(mt); } };
  // ---------- Leuchtende Punkte (Glühwürmchen/Blütenblätter/Staub) ----------
  K.motes = (n, color, size = 90, l0 = HALF + 2, l1 = WALL + 40, y0 = 1, y1 = 10, fall = 0) => {
    const fp = [], fph = []; for (let i = 0; i < n; i++) { const j = Math.random()*tr.N | 0, side = Math.random() < .5 ? -1 : 1, l = side*rnd(l0, l1); fp.push(tr.P[j].x + tr.R[j].x*l, tr.P[j].y + rnd(y0, y1), tr.P[j].z + tr.R[j].z*l); fph.push(Math.random()*6.28); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); g.setAttribute('ph', new THREE.Float32BufferAttribute(fph, 1));
    const c = new THREE.Color(color); const U = { t: { value: 0 }, col: { value: c } };
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: fall ? THREE.NormalBlending : THREE.AdditiveBlending,
      vertexShader: `attribute float ph; uniform float t; varying float a; void main(){ vec3 p = position + vec3(sin(t*0.7+ph)*1.5, ${fall ? `-mod(t*${fall.toFixed(2)}+ph*3.0, ${(y1 - y0).toFixed(1)})` : 'sin(t*1.1+ph*2.0)*0.8'}, cos(t*0.6+ph)*1.5); vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; a = ${fall ? '0.9' : '0.5+0.5*sin(t*3.0+ph*5.0)'}; gl_PointSize = clamp(${size.toFixed(1)}/ max(1.0, -mv.z), 1.0, 24.0); }`,
      fragmentShader: `uniform vec3 col; varying float a; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor = vec4(col, (1.0-d*2.0)*a); }` }));
    pts.frustumCulled = false; scene.add(pts); K.upd.push(t => { U.t.value = t; }); return pts;
  };
  // ---------- Werbetafeln unserer Spiele ----------
  K.billboards = (frameMat, legCol = 0x2a1a4a, dist = WALL + 7) => {
    const ads = [['PANDI', '🐼', 'Jetzt spielen!', '#7fd6ff', '#c58bff'], ['KRITZELHELD', '🦉', 'Schreiben lernen mit Kritzel', '#5fb6ff', '#ffe14a'], ['SCHULHOFKICKER', '⚽', 'Wie weit schießt du?', '#3ad46a', '#ffffff'],
      ['RING LEGENDS', '🤼', 'Sammle alle Karten!', '#ff5a3c', '#ffe14a'], ['NERVBERT', '🧔', 'Der Onkel kommt!', '#ff8a3c', '#2fd4ff'], ['LEWOLUX.DE', '🦁', 'Spiele für alle', '#a24bff', '#29f0ff'], ['STERNENWURF', '🌠', 'Wirf dein Glück!', '#3a2aa0', '#fff36b'], ['MANDAT', '🗳️', 'Vom Dorf ins Kanzleramt', '#1a4ae0', '#ffffff']];
    const off = Math.random();
    ads.forEach(([title, icon, sub, c1, c2], n) => {
      const i = Math.round(((n + off)/ads.length)*tr.N) % tr.N, side = n % 2 ? 1 : -1, p = tr.P[i], r = tr.R[i], l = side*dist;
      if (K.distTo(p.x + r.x*l, p.z + r.z*l) < dist - 3) return;
      const t = ctex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, '#1a0b3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.font = '220px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 190, h/2 + 10);
        g.textAlign = 'left'; g.font = `900 ${title.length > 11 ? 92 : 120}px system-ui,sans-serif`; g.lineWidth = 14; g.strokeStyle = '#150a24'; g.strokeText(title, 340, h/2 - 50); g.fillStyle = c2; g.fillText(title, 340, h/2 - 50);
        g.font = '700 50px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText(sub, 344, h/2 + 70); });
      const gr = new THREE.Group(); gr.position.set(p.x + r.x*l, p.y, p.z + r.z*l); scene.add(gr);
      gr.lookAt(p.x - tr.T[i].x*30, p.y, p.z - tr.T[i].z*30);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: t, color: 0xdddddd })); board.position.y = 10; gr.add(board);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(16.8, 8.8, 0.5), frameMat || glow(new THREE.Color(c2 === '#ffffff' ? '#3ad46a' : c2).getHex())); frame.position.set(0, 10, -0.3); gr.add(frame);
      const back = new THREE.Mesh(new THREE.BoxGeometry(16.4, 8.4, 0.6), toon(0x1a0b3a)); back.position.set(0, 10, -0.35); gr.add(back);
      for (const sx of [-5, 5]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 8), toon(legCol)); leg.position.set(sx, 1, -0.6); leg.castShadow = true; gr.add(leg); }
    });
  };
  // ---------- Pflanzen-Texturen ----------
  K.frondT = ctex(128, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#d8fff0'; g.lineWidth = 6; g.beginPath(); g.moveTo(w/2, h); g.lineTo(w/2, 0); g.stroke();
    for (let y = 20; y < h - 10; y += 14) { const len = Math.sin((y/h)*Math.PI)*58 + 6; g.fillStyle = '#ffffff';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w/2, y); g.quadraticCurveTo(w/2 + s*len*0.6, y - 18, w/2 + s*len, y - 4); g.quadraticCurveTo(w/2 + s*len*0.5, y + 2, w/2, y + 8); g.fill(); } } });
  K.fernT = ctex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; for (let y = 10; y < h; y += 10) { const len = (1 - y/h)*50 + 8; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w/2 + s*len*0.5, y, len*0.55, 4, s*-0.35, 0, 7); g.fill(); } } g.fillRect(w/2 - 2, 0, 4, h); });
  K.grassT = ctex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const x = rnd(8, 56); g.fillStyle = i % 3 ? '#fff' : '#e0ffe8'; g.beginPath(); g.moveTo(x - 3, h); g.quadraticCurveTo(x + rnd(-10, 10), h*0.5, x + rnd(-12, 12), rnd(4, 24)); g.lineTo(x + 3, h); g.fill(); } });
  K.leafMat = (map, color, em) => new THREE.MeshLambertMaterial({ map, color, emissive: em || 0, alphaTest: 0.5, side: THREE.DoubleSide });
  K.haloT = ctex(64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  K.fernG = (() => { const g = new THREE.PlaneGeometry(2.4, 3.2, 1, 4); g.translate(0, 1.4, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.pow(p.getY(i)/3, 2)*1.2); g.computeVertexNormals(); return g; })();

  // Palmen (Stamm gebogen, Wedel, Früchte)
  K.palms = (list, o = {}) => {
    const barkT = ctex(64, 256, (g, w, h) => { g.fillStyle = hex(o.bark || 0x6a3a5a); g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, w, 5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y + 5, w, 2); } });
    barkT.wrapS = barkT.wrapT = THREE.RepeatWrapping; barkT.repeat.set(1, 4);
    const frond = new THREE.PlaneGeometry(1.8, 7, 1, 8); frond.translate(0, 3.5, 0);
    { const p = frond.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y/7; p.setZ(i, p.getZ(i) - t*t*3.2); } frond.rotateX(-Math.PI/2.2); frond.computeVertexNormals(); }
    const frondMat = K.leafMat(K.frondT, o.leaf || 0x2fe0a8, o.leafEm || 0x0a4a3a), trunkMat = toon(0, 0, barkT), crowns = [];
    [1.6, -2.2, 3.0].forEach((bend, v) => {
      const sub = list.filter((_, i) => i % 3 === v);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(bend*0.06, 0.35, 0), new THREE.Vector3(bend*0.3, 0.7, 0), new THREE.Vector3(bend*0.6, 1, 0)]);
      const geo = new THREE.TubeGeometry(curve, 12, 1, 8, false);
      { const p = geo.attributes.position; const tmp = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { const y = p.getY(i); const c = curve.getPoint(Math.min(1, Math.max(0, y))); tmp.set(p.getX(i) - c.x, 0, p.getZ(i) - c.z).multiplyScalar(0.05*(1 - y*0.45)); p.setX(i, c.x + tmp.x); p.setZ(i, c.z + tmp.z); } geo.computeVertexNormals(); }
      K.inst(geo, trunkMat, sub, ([x, z, d, , yy]) => { const h = rnd(o.h0 || 11, o.h1 || 21), y = yy ?? K.groundY(x, z, d), ry = Math.random()*6.28;
        e.set(0, ry, 0); m4.compose(p3.set(x, y, z), q.setFromEuler(e), s3.set(h*0.1, h, h*0.1));
        const top = new THREE.Vector3(bend*0.6*h*0.1, h, 0).applyEuler(e); crowns.push([x + top.x, y + top.y, z + top.z]); }, true);
    });
    K.inst(frond, frondMat, crowns.flatMap(c => [0, 1, 2, 3, 4, 5, 6].map(k => [c, k])), ([c, k]) => { const ry = k/7*Math.PI*2 + Math.random()*0.5; m4.compose(p3.set(c[0], c[1], c[2]), q.setFromEuler(e.set(rnd(-0.25, 0.15), ry, 0, 'YXZ')), s3.setScalar(rnd(0.85, 1.25))); }, true);
    const tips = o.fruit || [0x29f0ff, 0xff3fd0, 0xfff36b, 0x8aff6b];
    K.inst(new THREE.SphereGeometry(0.5, 10, 8), o.fruitToon ? toon(0xffffff) : new THREE.MeshBasicMaterial({ color: 0xffffff }), crowns, (c, i, im) => { m4.compose(p3.set(c[0], c[1] - 0.4, c[2]), q.identity(), s3.setScalar(1)); im.setColorAt(i, new THREE.Color(tips[i % tips.length])); });
  };
  // Laubbäume (runde Kronen)
  K.roundTrees = (list, o = {}) => {
    K.inst(new THREE.CylinderGeometry(0.5, 0.8, 1, 8), toon(o.trunk || 0x7a4a2a), list, ([x, z, d]) => { const h = rnd(5, 9); m4.compose(p3.set(x, K.groundY(x, z, d) + h/2, z), q.identity(), s3.set(1, h, 1)); }, true);
    const cols = o.leaves || [0x3aa84a, 0x4ac05a, 0x2f9040];
    K.inst(new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), list.flatMap(t => [0, 1, 2].map(k => [t, k])), ([[x, z, d], k], i, im) => { const y = K.groundY(x, z, d) + 8 + (k ? rnd(-1, 1) : 1.5); const a = k*2.1 + x;
      m4.compose(p3.set(x + (k ? Math.cos(a)*2.2 : 0), y, z + (k ? Math.sin(a)*2.2 : 0)), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), 0)), s3.setScalar(rnd(3.2, 4.6))); im.setColorAt(i, new THREE.Color(cols[(i + (x|0)) % cols.length])); }, true);
  };
  // Gras-Büschel und Farne am Rand
  K.tufts = (n1, n2, color, em) => { const g = new THREE.PlaneGeometry(1.4, 1.0); g.translate(0, 0.45, 0); const mat = K.leafMat(K.grassT, color, em || 0);
    const sp = [...K.along(Math.round(n1*quality), HALF + 3.0, WALL - 1.5), ...K.along(Math.round(n2*quality), WALL + 0.6, WALL + 16)];
    K.inst(g, mat, sp.flatMap(s => [0, 1].map(k => [s, k])), ([[x, z, d], k]) => { m4.compose(p3.set(x, K.groundY(x, z, d), z), q.setFromEuler(e.set(0, k*1.57 + rnd(0, 1), 0)), s3.setScalar(rnd(0.7, 1.5))); }); };
  K.ferns = (n, color, em, l0 = WALL + 0.8, l1 = WALL + 22) => { const mat = K.leafMat(K.fernT, color, em || 0);
    K.inst(K.fernG, mat, K.along(Math.round(n*quality), l0, l1).flatMap(s => [0, 1, 2, 3].map(k => [s, k])), ([[x, z, d], k]) => { m4.compose(p3.set(x, K.groundY(x, z, d), z), q.setFromEuler(e.set(0, k*1.57 + rnd(-0.3, 0.3), 0)), s3.setScalar(rnd(0.7, 1.4))); }); };
  K.rocks = (n, color, l0 = WALL + 1.5, l1 = WALL + 26) => K.inst(new THREE.DodecahedronGeometry(1, 0), toon(color), K.along(Math.round(n*quality), l0, l1), ([x, z, d]) => { m4.compose(p3.set(x, K.groundY(x, z, d), z), q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), rnd(0, 3))), s3.set(rnd(0.8, 2.6), rnd(0.6, 1.8), rnd(0.8, 2.4))); }, true);
  K.flowers = (n, cols, l0 = WALL + 0.8, l1 = WALL + 18) => { const f = K.along(Math.round(n*quality), l0, l1);
    K.inst(new THREE.CylinderGeometry(0.05, 0.05, 1, 4), toon(0x2a8a5a), f, ([x, z, d]) => { m4.compose(p3.set(x, K.groundY(x, z, d) + 0.5, z), q.identity(), s3.set(1, rnd(0.6, 1.6), 1)); });
    K.inst(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), f, ([x, z, d], i, im) => { m4.compose(p3.set(x, K.groundY(x, z, d) + 1.0 + Math.random()*0.5, z), q.identity(), s3.setScalar(rnd(0.8, 1.6))); im.setColorAt(i, new THREE.Color(cols[i % cols.length])); }); };
  // Pfosten mit Lampe entlang der Bande
  K.posts = (o) => { const posts = []; for (let i = 0; i < tr.N; i += (o.every || 34)) for (const s of [-1, 1]) { const p = tr.P[i], r = tr.R[i], l = s*(WALL + 1.3); posts.push([p.x + r.x*l, p.y, p.z + r.z*l, s, i]); }
    K.inst(new THREE.CylinderGeometry(0.18, 0.25, 1, 8), toon(o.pole), posts, ([x, y, z]) => { m4.compose(p3.set(x, y + (o.h || 6)/2, z), q.identity(), s3.set(1, o.h || 6, 1)); }, true);
    if (o.lamp) { K.inst(o.lampGeo || new THREE.SphereGeometry(0.55, 14, 10), o.lampMat || new THREE.MeshBasicMaterial({ color: 0xffffff }), posts, ([x, y, z, s], i, im) => { m4.compose(p3.set(x, y + (o.h || 6) + 0.3, z), q.identity(), s3.setScalar(1)); im.setColorAt(i, new THREE.Color(s < 0 ? o.lamp[0] : o.lamp[1])); });
      if (o.halo) for (const [x, y, z, s] of posts) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.haloT, color: s < 0 ? o.lamp[0] : o.lamp[1], transparent: true, opacity: o.halo, depthWrite: false, blending: THREE.AdditiveBlending })); h.position.set(x, y + (o.h || 6) + 0.3, z); h.scale.setScalar(4.5); scene.add(h); } }
    return posts; };
  // Tor über die Strecke: Rückgabe der Bogenkurve
  K.gateAt = (f, H = 15) => { const i = Math.round(f*tr.N) % tr.N, p = tr.P[i], r = tr.R[i], W = WALL + 2.2; return { i, p, r, W, H }; };

  K.finish = () => ({ sun: K.sun, update: (t, dt) => K.upd.forEach(fn => fn(t, dt)), follow: (pos) => { K.sun.target.position.copy(pos); K.sun.position.copy(pos).addScaledVector(K.sunDir, 160); } });
  return K;
}
