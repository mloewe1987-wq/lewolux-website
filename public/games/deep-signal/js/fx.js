// Deep Signal – UI effects layer (money rain, coins flying to the counter, purchase sparkles)
(function (DS) {
'use strict';
const cv = document.getElementById('fx'), cb = document.getElementById('fxb'), gF = cv.getContext('2d'), gB = cb.getContext('2d'); let g = gF, W = 0, H = 0, dpr = 1;
const P = [];
function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; for (const c of [cv, cb]) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; } }
addEventListener('resize', size); size();
const target = () => { const e = document.querySelector('#hMoney .cash'); if (!e) return [W * 0.15, 24]; const r = e.getBoundingClientRect(); return [r.left + 14, r.top + r.height / 2]; };
function coinShape(x, y, r, rot, gold = true) {
  g.save(); g.translate(x, y); g.scale(Math.cos(rot), 1);
  const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.5, '#ffc640'); gr.addColorStop(1, '#c47a10');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#8a5208'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(138,82,8,0.6)'; g.fillRect(-r * 0.15, -r * 0.55, r * 0.3, r * 1.1); g.restore();
}
function bill(x, y, w, rot, flip) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, Math.cos(flip));
  g.fillStyle = '#3fbf7f'; g.fillRect(-w / 2, -w * 0.25, w, w * 0.5); g.strokeStyle = '#1d6e48'; g.lineWidth = 1.5; g.strokeRect(-w / 2 + 2, -w * 0.25 + 2, w - 4, w * 0.5 - 4);
  g.fillStyle = '#1d6e48'; g.beginPath(); g.arc(0, 0, w * 0.13, 0, Math.PI * 2); g.fill(); g.restore();
}
DS.FX = {
  clear() { P.length = 0; for (const x of [gF, gB]) { x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H); } },
  rain(n, x0 = 0, x1 = W) { for (let i = 0; i < n; i++) P.push({t: 'rain', x: x0 + Math.random() * (x1 - x0), y: -20 - Math.random() * H * 0.6, vy: 260 + Math.random() * 260, vx: (Math.random() - .5) * 40, rot: Math.random() * 6, vr: (Math.random() - .5) * 8, s: 8 + Math.random() * 8, bill: Math.random() < 0.35, life: 0}); },
  coins(x, y, n) { const [tx, ty] = target(); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 260; P.push({t: 'fly', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, tx, ty, life: -i * 0.03, rot: Math.random() * 6, s: 9}); } },
  sparkle(x, y) { for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 220; P.push({t: 'sp', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.5 + Math.random() * 0.4, c: Math.random() < 0.5 ? '#3ff2d8' : '#ffd36a'}); }
    P.push({t: 'ring', x, y, life: 0, max: 0.5}); },
  frame(dt) {
    for (const x of [gF, gB]) { x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H); } if (!P.length) return;
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.life += dt; if (p.life < 0) continue; g = p.t === 'rain' ? gB : gF; g.globalAlpha = 1;
      if (p.t === 'rain') { p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(p.life * 3 + p.rot) * 30 * dt; p.rot += p.vr * dt; if (p.y > H + 30) { P.splice(i, 1); continue; } g.globalAlpha = Math.min(1, (H + 30 - p.y) / 120);
        if (p.bill) bill(p.x, p.y, p.s * 2.6, p.rot * 0.3, p.rot); else coinShape(p.x, p.y, p.s, p.rot); }
      else if (p.t === 'fly') { const k = Math.min(1, p.life / 0.75); if (p.life < 0.25) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; } else { p.x += (p.tx - p.x) * Math.min(1, dt * 9 * k); p.y += (p.ty - p.y) * Math.min(1, dt * 9 * k); }
        p.rot += dt * 9; g.globalAlpha = 1; coinShape(p.x, p.y, p.s, p.rot); if (Math.hypot(p.x - p.tx, p.y - p.ty) < 10 && p.life > 0.3) { P.splice(i, 1); const e = document.querySelector('#hMoney'); if (e) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } DS.A.coin(i); } }
      else if (p.t === 'sp') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; const a = 1 - p.life / p.max; if (a <= 0) { P.splice(i, 1); continue; } g.globalAlpha = a; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.5 * a + 0.5, 0, Math.PI * 2); g.fill(); }
      else if (p.t === 'ring') { const a = 1 - p.life / p.max; if (a <= 0) { P.splice(i, 1); continue; } g.globalAlpha = a; g.strokeStyle = '#3ff2d8'; g.lineWidth = 3 * a; g.beginPath(); g.arc(p.x, p.y, 10 + p.life * 140, 0, Math.PI * 2); g.stroke(); }
    }
    gF.globalAlpha = 1; gB.globalAlpha = 1; g = gF;
  },
};
})(window.DS);
