// Deep Signal – synthesized sound (WebAudio only, no audio files)
(function (DS) {
'use strict';
const A = DS.A = {ctx: null, on: false, sfx: 1, mus: 1, muted: false};
let ctx, master, sfxBus, musBus, rev, sRev, mRev, droneG, droneF, droneO = [], noiseBuf, drillN = null, musT = 0, musNext = 0, depthK = 0, surface = true;

function mkNoise() { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function mkReverb() { const len = ctx.sampleRate * 3.2, b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const cv = ctx.createConvolver(); cv.buffer = b; return cv; }

A.init = () => {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { ctx = A.ctx = new AC(); } catch (_) { return; }
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.connect(comp); musBus = ctx.createGain(); musBus.connect(comp);
  rev = mkReverb(); const rg = ctx.createGain(); rg.gain.value = 0.55; rev.connect(rg); rg.connect(comp); sRev = ctx.createGain(); mRev = ctx.createGain(); sRev.connect(rev); mRev.connect(rev);
  noiseBuf = mkNoise();
  // deep ambient drone
  droneG = ctx.createGain(); droneG.gain.value = 0; droneF = ctx.createBiquadFilter(); droneF.type = 'lowpass'; droneF.frequency.value = 260; droneF.Q.value = 2;
  droneF.connect(droneG); droneG.connect(musBus);
  for (const [f, t] of [[55, 'sawtooth'], [55.4, 'triangle'], [82.4, 'sine']]) { const o = ctx.createOscillator(); o.type = t; o.frequency.value = f; const gg = ctx.createGain(); gg.gain.value = t === 'sawtooth' ? 0.12 : 0.3; o.connect(gg); gg.connect(droneF); o.start(); droneO.push(o); }
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(droneF.frequency); lfo.start();
  const rn = ctx.createBufferSource(); rn.buffer = noiseBuf; rn.loop = true; const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 180; const rgain = ctx.createGain(); rgain.gain.value = 0.18; rn.connect(rf); rf.connect(rgain); rgain.connect(droneG); rn.start();
  A.on = true; A.apply();
};
A.apply = () => { if (!ctx) return; const t = ctx.currentTime; master.gain.setTargetAtTime(A.muted ? 0 : 0.9, t, 0.05); sfxBus.gain.setTargetAtTime(A.sfx ? 1 : 0, t, 0.03); musBus.gain.setTargetAtTime(A.mus ? 0.8 : 0, t, 0.1); sRev.gain.setTargetAtTime(A.sfx ? 1 : 0, t, 0.03); mRev.gain.setTargetAtTime(A.mus ? 1 : 0, t, 0.1); };
A.setDepth = (m, atSurface) => { depthK = Math.min(1, m / 4000); surface = atSurface; if (!ctx) return; const t = ctx.currentTime;
  droneG.gain.setTargetAtTime(atSurface ? 0.18 : 0.34 + depthK * 0.25, t, 0.8); droneF.frequency.setTargetAtTime(atSurface ? 420 : 300 - depthK * 180, t, 1.2);
  droneO.forEach((o, i) => o.frequency.setTargetAtTime([55, 55.4, 82.4][i] * (1 - depthK * 0.18), t, 2)); };

function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(f, d, o = {}) {
  if (!ctx || !A.on) return; const t = ctx.currentTime + (o.delay || 0), osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
  env(g, t, o.a || 0.005, o.v || 0.2, d); osc.connect(g); g.connect(o.bus || sfxBus); if (o.rev) { const s = ctx.createGain(); s.gain.value = o.rev; g.connect(s); s.connect(sRev); }
  osc.start(t); osc.stop(t + (o.a || 0.005) + d + 0.05);
}
function noise(d, o = {}) {
  if (!ctx || !A.on) return; const t = ctx.currentTime + (o.delay || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + d); f.Q.value = o.q || 1;
  env(g, t, o.a || 0.005, o.v || 0.2, d); src.connect(f); f.connect(g); g.connect(sfxBus); if (o.rev) { const s = ctx.createGain(); s.gain.value = o.rev; g.connect(s); s.connect(sRev); }
  src.start(t, Math.random()); src.stop(t + (o.a || 0.005) + d + 0.05);
}
// sonar ping: higher and with a second blip when a signal cache is close
A.ping = (str = 0) => { const f = 1180 * (1 + str * 0.35); tone(f, 1.3, {v: 0.15, rev: 1.2}); tone(f, 0.9, {v: 0.05, delay: 0.42, rev: 0.8}); if (str > 0.05) tone(f * 1.5, 0.5, {v: 0.04 + 0.08 * str, delay: 0.12 + (1 - str) * 0.5, rev: 0.8}); };
A.lift = () => { noise(1.6, {f: 300, to: 900, v: 0.12, q: 0.8}); tone(70, 1.5, {type: 'sawtooth', to: 50, v: 0.06}); A.bubble(6); };
A.light = on => { tone(on ? 1600 : 900, 0.05, {type: 'square', v: 0.05}); tone(on ? 2400 : 600, 0.08, {v: 0.04, delay: 0.03}); };
A.growl = (k = 1) => { tone(62, 0.9, {type: 'sawtooth', to: 44, v: 0.11 * k, a: 0.15, rev: 0.8}); noise(0.8, {f: 220, q: 6, v: 0.12 * k, a: 0.1, rev: 0.6}); };
A.lunge = () => { noise(0.35, {f: 500, to: 2600, v: 0.2, q: 0.9}); };
A.bite = kind => { tone(kind === 'grab' ? 90 : 140, 0.25, {type: 'square', to: 60, v: 0.18}); noise(0.3, {f: 900, ft: 'lowpass', v: 0.3}); if (kind === 'steal') A.bubble(6); };
A.flare = () => { noise(0.9, {f: 3000, to: 1200, v: 0.14, q: 0.7}); tone(440, 0.2, {type: 'triangle', to: 880, v: 0.06}); };
A.cache = () => { [0, 7, 12, 16, 19].forEach((s, i) => tone(784 * Math.pow(2, s / 12), 0.5, {v: 0.07, delay: i * 0.06, rev: 1})); noise(0.6, {f: 2400, q: 0.8, v: 0.07}); };
A.rumble = (k = 1) => { noise(1.6 * k, {f: 120, to: 60, ft: 'lowpass', v: 0.35 * k, a: 0.2, rev: 0.5}); tone(38, 1.5 * k, {to: 30, v: 0.3 * k, a: 0.3}); };
A.wave = () => { noise(1, {f: 400, to: 80, ft: 'lowpass', v: 0.45, rev: 0.6}); tone(55, 0.8, {to: 35, v: 0.4}); };
A.vent = () => { noise(0.9, {f: 2000, to: 600, v: 0.18, q: 0.6}); A.bubble(5); };
A.static = (k = 1) => { noise(1.4 * k, {f: 3200, q: 0.5, v: 0.12 * k, a: 0.05}); tone(58, 1.2 * k, {type: 'sawtooth', v: 0.08 * k, a: 0.3}); };
A.task = () => { [0, 4, 7, 12, 16].forEach((s, i) => tone(659 * Math.pow(2, s / 12), 0.35, {type: 'triangle', v: 0.09, delay: i * 0.07, rev: 0.6})); };
A.finale = (resolve) => { const ch = resolve ? [0, 4, 7, 11, 14] : [0, 3, 7, 10]; ch.forEach((s, i) => tone(110 * Math.pow(2, s / 12), 5, {type: 'triangle', v: 0.06, a: 1.2 + i * 0.2, rev: 1.4})); tone(55, 6, {type: 'sawtooth', v: 0.05, a: 2, rev: 0.8}); };
A.bubble = (n = 1) => { for (let i = 0; i < n; i++) { const f = 300 + Math.random() * 500; tone(f, 0.06, {to: f * 2.4, v: 0.06, delay: i * 0.05 + Math.random() * 0.03}); } };
A.splash = () => { noise(0.8, {f: 900, to: 200, v: 0.35, ft: 'lowpass'}); A.bubble(6); };
A.chunk = () => { noise(0.12, {f: 1800, v: 0.14, q: 3}); tone(140, 0.12, {type: 'triangle', to: 80, v: 0.2}); };
A.crack = big => { noise(big ? 0.9 : 0.5, {f: 600, to: 120, v: big ? 0.5 : 0.35, ft: 'lowpass', rev: 0.4}); tone(big ? 70 : 110, big ? 0.7 : 0.4, {type: 'sine', to: 40, v: 0.45}); A.bubble(5); };
let pickN = 0, pickT = 0;
A.pick = (find, gold) => { const now = ctx ? ctx.currentTime : 0; if (now - pickT > 0.6) pickN = 0; pickT = now; pickN = Math.min(pickN + 1, 12);
  const base = 520 * Math.pow(2, (pickN % 8) / 12 * 2); tone(base, 0.12, {type: 'triangle', v: 0.12}); tone(base * 2, 0.08, {v: 0.04});
  if (find) { [0, 4, 7, 12].forEach((s, i) => tone(660 * Math.pow(2, s / 12), 0.35, {type: 'triangle', v: 0.12, delay: i * 0.07, rev: 0.6})); if (gold) [0, 7, 12, 19].forEach((s, i) => tone(1046 * Math.pow(2, s / 12), 0.5, {v: 0.07, delay: 0.3 + i * 0.06, rev: 1})); } };
A.full = () => { tone(220, 0.15, {type: 'square', v: 0.06}); tone(180, 0.2, {type: 'square', v: 0.06, delay: 0.12}); };
A.warn = () => { tone(880, 0.12, {type: 'square', v: 0.07}); tone(660, 0.14, {type: 'square', v: 0.07, delay: 0.15}); };
A.creak = () => { noise(1.1, {f: 160, to: 90, q: 12, v: 0.32, rev: 0.6}); tone(48, 0.9, {type: 'sawtooth', v: 0.08, to: 38}); };
A.sting = () => { tone(1400, 0.25, {type: 'sawtooth', to: 300, v: 0.08}); noise(0.2, {f: 3000, v: 0.08}); };
A.bump = () => { tone(90, 0.2, {to: 50, v: 0.25}); noise(0.15, {f: 400, ft: 'lowpass', v: 0.15}); };
A.ascent = () => { noise(1.4, {f: 400, to: 2400, v: 0.22, q: 0.7}); A.bubble(10); };
A.alarm = () => { for (let i = 0; i < 3; i++) tone(700, 0.3, {type: 'square', to: 420, v: 0.08, delay: i * 0.35}); };
A.blast = () => { noise(1.6, {f: 300, to: 40, ft: 'lowpass', v: 0.8, rev: 0.8}); tone(45, 1.4, {to: 25, v: 0.6}); };
A.click = () => tone(1200, 0.04, {type: 'triangle', v: 0.06});
A.buy = () => { [0, 4, 7, 12].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.25, {type: 'triangle', v: 0.12, delay: i * 0.05, rev: 0.4})); noise(0.3, {f: 6000, v: 0.04, delay: 0.1}); };
A.deny = () => { tone(200, 0.12, {type: 'square', v: 0.06}); };
A.coin = (i = 0) => { const f = 1500 + (i % 6) * 120; tone(f, 0.09, {type: 'square', v: 0.035}); tone(f * 1.5, 0.12, {v: 0.04, delay: 0.03}); };
A.tick = () => tone(1800, 0.03, {type: 'square', v: 0.025});
A.record = () => { [0, 3, 7, 10, 14].forEach((s, i) => tone(392 * Math.pow(2, s / 12), 0.6, {v: 0.08, delay: i * 0.09, rev: 1})); };
A.signal = () => {
  // static burst + morse fragment + low hum
  noise(2.6, {f: 2200, q: 0.6, v: 0.18, a: 0.05});
  const pat = '.-. ..- -.'; let t = 0.4; for (const c of pat) { if (c === ' ') { t += 0.18; continue; } const d = c === '.' ? 0.07 : 0.2; tone(720, d, {v: 0.09, delay: t, a: 0.004, rev: 0.6}); t += d + 0.08; }
  tone(58, 3, {type: 'sawtooth', v: 0.12, a: 0.6, rev: 0.4}); tone(87, 3, {v: 0.1, a: 0.8, delay: 0.2, rev: 0.6});
};
// continuous drill sound
A.drill = (on, k = 0) => {
  if (!ctx || !A.on) return;
  if (on && !drillN) { const t = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), am = ctx.createOscillator(), amg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 92; o2.type = 'square'; o2.frequency.value = 46; f.type = 'lowpass'; f.frequency.value = 900; n.buffer = noiseBuf; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 2400; nf.Q.value = 1.5;
    am.frequency.value = 28; amg.gain.value = 0.35; am.connect(amg); amg.connect(g.gain);
    const og = ctx.createGain(); og.gain.value = 0.35; o.connect(og); o2.connect(og); og.connect(f); f.connect(g); n.connect(nf); const ng = ctx.createGain(); ng.gain.value = 0.5; nf.connect(ng); ng.connect(g);
    g.gain.value = 0; g.gain.setTargetAtTime(0.13, t, 0.03); g.connect(sfxBus); o.start(); o2.start(); n.start(); am.start();
    drillN = {o, o2, g, n, am, nf}; }
  if (drillN) { const t = ctx.currentTime; if (on) { drillN.o.frequency.setTargetAtTime(92 + k * 60, t, 0.05); drillN.nf.frequency.setTargetAtTime(2000 + k * 1600, t, 0.05); }
    else { const d = drillN; drillN = null; d.g.gain.setTargetAtTime(0, t, 0.04); setTimeout(() => { try { d.o.stop(); d.o2.stop(); d.n.stop(); d.am.stop(); } catch (_) {} }, 250); } }
};
// generative ambient pad (music)
const SC_DEEP = [0, 3, 7, 10, 12, 15, 19], SC_SURF = [0, 4, 7, 9, 12, 16];
A.tick16 = dt => {
  if (!ctx || !A.on || !A.mus) return; musT += dt; if (musT < musNext) return;
  musNext = musT + (surface ? 2.4 : 3.6) + Math.random() * 2;
  const sc = surface ? SC_SURF : SC_DEEP, root = surface ? 220 : 110 * (1 - depthK * 0.1);
  const n = 1 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) { const s = sc[Math.floor(Math.random() * sc.length)], f = root * Math.pow(2, s / 12);
    const t = ctx.currentTime + i * 0.6, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.003; lp.type = 'lowpass'; lp.frequency.value = surface ? 1800 : 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musBus); const s2 = ctx.createGain(); s2.gain.value = 1.2; g.connect(s2); s2.connect(mRev);
    o.start(t); o2.start(t); o.stop(t + 6); o2.stop(t + 6); }
};
})(window.DS);
