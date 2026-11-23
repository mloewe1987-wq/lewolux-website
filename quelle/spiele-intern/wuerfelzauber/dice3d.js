// Würfelzauber – echte 3D-Würfel (three.js)
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// Seiten-Reihenfolge von BoxGeometry: +x, -x, +y, -y, +z, -z
const NORMALS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(a => new THREE.Vector3(...a));
const TEXUP = [[0,1,0],[0,1,0],[0,0,-1],[0,0,1],[0,1,0],[0,1,0]].map(a => new THREE.Vector3(...a));
export const FACES = ['coin', 'crown', 'swords', 'shield', 'card', 'star'];

export const SKINS = [
  { n: 'Klassik', t: [{ a: '#fff6d6', b: '#f2b632', rim: '#a8670a' }, { a: '#e3f3ff', b: '#3f86f0', rim: '#1d4fa8' }, { a: '#f3e4ff', b: '#a052e8', rim: '#5c2296' }] },
  { n: 'Kristall', t: [{ a: '#f0fbff', b: '#7fd8ff', rim: '#2a8fc0' }, { a: '#f0fbff', b: '#9fe8ff', rim: '#3aa0d0' }, { a: '#f0fbff', b: '#7fd8ff', rim: '#2a8fc0' }] },
  { n: 'Feuer', t: [{ a: '#fff1d6', b: '#ff7a2e', rim: '#a3300a' }, { a: '#ffe6cf', b: '#ff4d3d', rim: '#8a1a14' }, { a: '#fff4c8', b: '#ffb21e', rim: '#a85a00' }] },
  { n: 'Sakura', t: [{ a: '#fff0f6', b: '#ff9ec8', rim: '#c2457e' }, { a: '#fff5fa', b: '#ffc2dc', rim: '#d0608f' }, { a: '#fff0f6', b: '#f77fb5', rim: '#b0306a' }] },
  { n: 'Mondnacht', t: [{ a: '#e8e8ff', b: '#4b4fb8', rim: '#1d1f6a' }, { a: '#e0f2ff', b: '#2b6fa8', rim: '#0f3a63' }, { a: '#f0e6ff', b: '#6a3fb8', rim: '#2d1460' }] },
  { n: 'Regenbogen', t: [{ a: '#ffe6e6', b: '#ff6b6b', rim: '#a02a2a' }, { a: '#e6ffe9', b: '#3fcf6a', rim: '#1d7a3c' }, { a: '#e6f0ff', b: '#5b7bff', rim: '#2a3aa0' }] },
];
let THEMES = [
  { a: '#fff6d6', b: '#f2b632', rim: '#a8670a' },
  { a: '#e3f3ff', b: '#3f86f0', rim: '#1d4fa8' },
  { a: '#f3e4ff', b: '#a052e8', rim: '#5c2296' },
];

export class Dice3D {
  constructor(canvas, icons) {
    this.canvas = canvas;
    this.icons = icons; // {coin: HTMLImageElement|canvas, ...}
    this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2.5));
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.15;
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.cam = new THREE.PerspectiveCamera(21, 1, 0.1, 100);
    this.cam.position.set(0, 8.6, 4.4);
    this.cam.lookAt(0, 0.1, 0.2);
    const key = new THREE.DirectionalLight(0xfff1d6, 2.2); key.position.set(-3, 6, 4); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9b8ff, 0.8); fill.position.set(4, 3, -2); this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    this.dice = [];
    this.shadowTex = this.makeShadow();
    const geo = new RoundedBoxGeometry(1, 1, 1, 5, 0.16);
    for (let i = 0; i < 3; i++) {
      const mats = FACES.map(f => new THREE.MeshPhysicalMaterial({ map: this.faceTex(f, THEMES[i]), roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 }));
      const m = new THREE.Mesh(geo, mats);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }));
      sh.rotation.x = -Math.PI / 2;
      this.scene.add(sh); this.scene.add(m);
      const home = new THREE.Vector3((i - 1) * 1.42, 0.5, 0);
      m.position.copy(home);
      this.dice.push({ m, sh, home, face: i * 2 % 6, anim: null });
    }
    this.dice.forEach((d, i) => this.setFace(d, [0, 2, 3][i], 0));
    this.onLand = null;
    this.resize();
    addEventListener('resize', () => this.resize());
    this.t0 = performance.now();
    const loop = t => { this.tick(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  resize() {
    const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 150;
    this.r.setPixelRatio(Math.min(3.5, (window.devicePixelRatio || 1) * (window.__appScale || 1)) * 1.15);
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  }
  makeShadow() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(30,10,60,0.9)'); gr.addColorStop(1, 'rgba(30,10,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); return t;
  }
  faceTex(face, th) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, th.a); gr.addColorStop(1, th.b);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    // innerer Rahmen
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 14; g.strokeRect(40, 40, S - 80, S - 80);
    g.strokeStyle = th.rim; g.globalAlpha = 0.35; g.lineWidth = 6; g.strokeRect(58, 58, S - 116, S - 116); g.globalAlpha = 1;
    const ic = this.icons && this.icons[face];
    if (ic) { const s = S * 0.66; g.shadowColor = 'rgba(40,10,60,.45)'; g.shadowBlur = 18; g.shadowOffsetY = 8; g.drawImage(ic, (S - s) / 2, (S - s) / 2, s, s); }
    else { g.font = `${S * 0.5}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText({ coin: '🪙', crown: '👑', swords: '⚔️', shield: '🛡️', card: '❓', star: '⭐' }[face], S / 2, S / 2 + 10); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.r.capabilities.getMaxAnisotropy(); return t;
  }
  setSkin(themes) { THEMES = themes; this.refreshIcons(this.icons); }
  refreshIcons(icons) {
    this.icons = icons;
    this.dice.forEach((d, i) => d.m.material.forEach((mat, k) => { mat.map.dispose(); mat.map = this.faceTex(FACES[k], THEMES[i]); mat.needsUpdate = true; }));
  }
  targetQuat(faceIdx, jitter) {
    const q = new THREE.Quaternion().setFromUnitVectors(NORMALS[faceIdx], new THREE.Vector3(0, 1, 0));
    const up = TEXUP[faceIdx].clone().applyQuaternion(q); // liegt in der XZ-Ebene
    const want = new THREE.Vector3(0, 0, -1);
    let ang = Math.atan2(up.x, up.z) - Math.atan2(want.x, want.z);
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang + jitter);
    return yaw.multiply(q);
  }
  setFace(d, f, jitter) { d.face = f; d.m.quaternion.copy(this.targetQuat(f, jitter)); d.m.position.copy(d.home); }
  // wirft alle drei Würfel; faces = [i,i,i] Indizes in FACES
  roll(faces, held = [false, false, false]) {
    return new Promise(res => {
      const now = performance.now();
      let maxEnd = 0;
      this.dice.forEach((d, i) => {
        if (held[i]) return;
        const dur = 1050 + i * 90 + Math.random() * 120;
        const delay = i * 55;
        const endQ = this.targetQuat(faces[i], (Math.random() - 0.5) * 0.35);
        const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5).normalize();
        const spins = Math.PI * 2 * (2 + Math.floor(Math.random() * 2)) + Math.random() * 1.5;
        const start = new THREE.Vector3((i - 1) * 0.6 + (Math.random() - 0.5) * 0.6, 2.8, 4.2);
        const end = d.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.22, 0, (Math.random() - 0.5) * 0.25));
        d.anim = { t0: now + delay, dur, endQ, axis, spins, start, end, landed: 0 };
        d.face = faces[i];
        maxEnd = Math.max(maxEnd, delay + dur);
      });
      setTimeout(res, maxEnd + 60);
    });
  }
  tick(t) {
    const tmp = new THREE.Quaternion();
    for (const d of this.dice) {
      const a = d.anim;
      if (a) {
        let k = (t - a.t0) / a.dur;
        if (k < 0) { d.m.visible = true; continue; }
        if (k >= 1) { k = 1; d.anim = null; }
        // Position: Wurfbahn mit zwei Aufprallern
        const ek = 1 - Math.pow(1 - k, 2.2);
        const p = a.start.clone().lerp(a.end, ek);
        let y;
        if (k < 0.45) { const u = k / 0.45; y = 0.5 + (a.start.y - 0.5) * (1 - u) + Math.sin(u * Math.PI) * 0.9 * (1 - u); }
        else if (k < 0.72) { const u = (k - 0.45) / 0.27; y = 0.5 + Math.sin(u * Math.PI) * 0.55; }
        else if (k < 0.88) { const u = (k - 0.72) / 0.16; y = 0.5 + Math.sin(u * Math.PI) * 0.16; }
        else y = 0.5;
        p.y = y;
        d.m.position.copy(p);
        // Drehung läuft genau auf die Zielseite aus
        const rem = Math.pow(1 - k, 2.6) * a.spins;
        tmp.setFromAxisAngle(a.axis, rem);
        d.m.quaternion.copy(a.endQ).multiply(tmp);
        const marks = [0.45, 0.72, 0.88];
        while (a.landed < 3 && k >= marks[a.landed]) { if (this.onLand) this.onLand(a.landed); a.landed++; }
      }
      d.sh.position.set(d.m.position.x, 0.01, d.m.position.z);
      const h = Math.max(0, d.m.position.y - 0.5);
      d.sh.scale.setScalar(1 + h * 0.35);
      d.sh.material.opacity = 0.55 / (1 + h * 1.2);
    }
    // sanftes Wippen im Ruhezustand
    const idle = (t - this.t0) / 1000;
    for (const [i, d] of this.dice.entries()) if (!d.anim && d.glow) d.m.position.y = 0.5 + Math.sin(idle * 4 + i) * 0.04;
    this.r.render(this.scene, this.cam);
  }
  glow(on) { this.dice.forEach(d => { d.glow = on; d.m.material.forEach(m => { m.emissive = new THREE.Color(on ? 0x553300 : 0x000000); }); }); }
}
