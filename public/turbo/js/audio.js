// Klang: Motor, Effekte und Musik, komplett im Browser erzeugt (WebAudio)
let ctx = null, master, sfxBus, musicBus, noiseBuf;
let engine = null, drift = null, musicTimer = null, nextBeat = 0, beat = 0;
export const audio = { muted: false, musicOn: true };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = audio.muted ? 0 : 0.8; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
}
export function setMuted(m) { audio.muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05); }

function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function tone(type, f0, f1, dur, vol = 0.3, delay = 0, bus = sfxBus) {
  if (!ctx) return; const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.005, vol, dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, f0, f1, vol = 0.3, q = 1, type = 'bandpass', delay = 0, bus = sfxBus) {
  if (!ctx) return; const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, 0.01, vol, dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.05);
}

export function sfx(name, p = 1) {
  if (!ctx || audio.muted) return;
  switch (name) {
    case 'beep': tone('square', 520, 0, 0.18, 0.25); break;
    case 'go': tone('square', 1040, 0, 0.5, 0.25); tone('square', 1560, 0, 0.5, 0.12); break;
    case 'tick': tone('sine', 1200 + Math.random()*400, 0, 0.035, 0.06); break;
    case 'item': [660, 880, 1320].forEach((f, i) => tone('triangle', f, 0, 0.12, 0.2, i*0.06)); break;
    case 'got': [880, 1175, 1760].forEach((f, i) => tone('sine', f, 0, 0.18, 0.22, i*0.05)); break;
    case 'boost': noise(0.7, 400, 3000, 0.35, 0.8); tone('sawtooth', 120, 480, 0.6, 0.12); break;
    case 'mini': noise(0.35, 800, 3500, 0.25, 1); break;
    case 'honk': tone('square', 330, 0, 0.18, 0.2); tone('square', 415, 0, 0.18, 0.15); tone('square', 330, 0, 0.3, 0.2, 0.22); tone('square', 415, 0, 0.3, 0.15, 0.22); break;
    case 'hit': tone('sine', 700, 120, 0.5, 0.4); noise(0.2, 2000, 400, 0.2); break;
    case 'bump': noise(0.12, 300, 120, 0.4, 0.7, 'lowpass'); tone('sine', 140, 60, 0.15, 0.3); break;
    case 'pop': tone('sine', 1200, 300, 0.12, 0.35); noise(0.06, 3000, 0, 0.2); break;
    case 'bubble': for (let i = 0; i < 4; i++) tone('sine', 400 + i*180, 900 + i*200, 0.1, 0.15, i*0.05); break;
    case 'ink': noise(0.35, 600, 150, 0.45, 0.6, 'lowpass'); tone('sine', 200, 80, 0.3, 0.3); break;
    case 'kick': tone('sine', 160, 50, 0.2, 0.5); noise(0.08, 1500, 0, 0.25); break;
    case 'zap': noise(0.6, 5000, 300, 0.5, 0.5, 'highpass'); tone('sawtooth', 1800, 90, 0.5, 0.2); break;
    case 'thunder': noise(1.4, 400, 60, 0.6, 0.4, 'lowpass'); break;
    case 'star': for (let i = 0; i < 6; i++) tone('triangle', 1000 + i*220, 0, 0.12, 0.12, i*0.05); break;
    case 'lap': [523, 659, 784, 1046].forEach((f, i) => tone('square', f, 0, 0.16, 0.16, i*0.1)); break;
    case 'final': [784, 784, 1046].forEach((f, i) => tone('square', f, 0, 0.2, 0.18, i*0.15)); break;
    case 'finish': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => { tone('square', f, 0, 0.25, 0.15, i*0.11); tone('triangle', f/2, 0, 0.3, 0.15, i*0.11); }); break;
    case 'hop': tone('sine', 300, 600, 0.08, 0.15); break;
    case 'land': noise(0.1, 500, 200, 0.2, 0.7, 'lowpass'); break;
    case 'click': tone('triangle', 1400, 0, 0.05, 0.15); break;
  }
}

// Plapper-Stimme (Fantasiesprache) je nach Fahrer-Tonhöhe
export function voice(pitch, n = 6) {
  if (!ctx || audio.muted) return;
  for (let i = 0; i < n; i++) {
    const f = (220 + Math.random()*140) * pitch, d = 0.055 + Math.random()*0.04;
    tone(i % 2 ? 'triangle' : 'sine', f, f*(0.85 + Math.random()*0.4), d, 0.08, i*0.075);
  }
}

// Motor des Spielers (Dauerton)
export function engineStart() {
  if (!ctx || engine) return;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o1.type = 'triangle'; o2.type = 'sine'; o2.detune.value = 7; f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 0.4; g.gain.value = 0;
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o1.start(); o2.start();
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const df = ctx.createBiquadFilter(); df.type = 'bandpass'; df.frequency.value = 1400; df.Q.value = 1.2;
  const dg = ctx.createGain(); dg.gain.value = 0; s.connect(df); df.connect(dg); dg.connect(sfxBus); s.start();
  engine = { o1, o2, f, g }; drift = { df, dg };
}
export function engineUpdate(speed01, boosting, drifting, lvl, on = true) {
  if (!engine) return; const t = ctx.currentTime;
  const f = 48 + speed01*95 + (boosting ? 25 : 0);
  engine.o1.frequency.setTargetAtTime(f, t, 0.12); engine.o2.frequency.setTargetAtTime(f*0.5, t, 0.12);
  engine.f.frequency.setTargetAtTime(220 + speed01*520 + (boosting ? 200 : 0), t, 0.15);
  engine.g.gain.setTargetAtTime(on ? 0.035 + speed01*0.03 : 0, t, 0.15);
  drift.dg.gain.setTargetAtTime(drifting && on ? 0.03 : 0, t, 0.08);
  drift.df.frequency.setTargetAtTime(1200 + lvl*350, t, 0.08);
}
export function engineStop() {
  if (!engine) return; const t = ctx.currentTime;
  engine.g.gain.setTargetAtTime(0, t, 0.05); drift.dg.gain.setTargetAtTime(0, t, 0.05);
  const e = engine; setTimeout(() => { try { e.o1.stop(); e.o2.stop(); } catch (_) {} }, 400);
  engine = null; drift = null;
}

// Musik: fröhlicher Synth-Loop (Am – F – C – G), 132 BPM
const BPM = 132, STEP = 60 / BPM / 4;
const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export function musicStart(fast = false) {
  if (!ctx || musicTimer || !audio.musicOn) return;
  nextBeat = ctx.currentTime + 0.1; beat = 0;
  musicTimer = setInterval(() => {
    while (nextBeat < ctx.currentTime + 0.2) { playStep(beat, nextBeat, fast); nextBeat += STEP / (fast ? 1.12 : 1); beat++; }
  }, 50);
}
export function musicStop() { clearInterval(musicTimer); musicTimer = null; }
function note(type, f, t, d, v) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
}
function playStep(b, t) {
  const bar = (b >> 4) % 4, st = b % 16, ch = CH[bar];
  if (st % 4 === 0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.2); }
  if (st % 4 === 2) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); s.stop(t + 0.06); }
  if (st % 8 === 4) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = ctx.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14); s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); s.stop(t + 0.15); }
  if (st % 2 === 0) note('sawtooth', mtof(ch[0] - 24 + (st % 4 === 2 ? 12 : 0)), t, STEP*1.6, 0.16);
  const arp = [0, 1, 2, 1, 2, 0, 1, 2][st % 8];
  note('square', mtof(ch[arp] + 12 + (bar === 3 && st > 11 ? 12 : 0)), t, STEP*0.9, 0.05);
  const mel = [72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 69, 0, 71, 0, 72, 0];
  if (bar % 2 === 1 && mel[st]) note('triangle', mtof(mel[st] + (bar === 3 ? 2 : 0)), t, STEP*1.8, 0.08);
}
