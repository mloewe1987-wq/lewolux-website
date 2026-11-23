// Würfelzauber – Sound. Lädt echte Sounds aus sfx/<name>.mp3 (ElevenLabs),
// solange eine Datei fehlt, spielt ein eigener WebAudio-Klang als Ersatz.
let ctx = null, master = null, musicGain = null;
const buffers = {}, tried = {};
export const S = { on: true, music: true };
const VARIANTS = new Proxy({}, { get: () => 3 }); // jede Datei gibt es in 3 Varianten: name1..3.mp3

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const ALL = ['coins','jackpot','build','click','error','whoosh','boom','shield','block','egg','crack','hatch','star','levelup','wheel','mask','alarm','stretch','launch','roar','bomb','land','roll2','pop','win','lose','roll','coin'];
let preloaded = false;
export function unlock() { ac(); if (!preloaded) { preloaded = true; preload(ALL); } }

async function load(name) {
  if (tried[name]) return buffers[name];
  tried[name] = true;
  try {
    const r = await fetch(`sfx/${name}.mp3`);
    if (!r.ok) return null;
    buffers[name] = await ac().decodeAudioData(await r.arrayBuffer());
  } catch (e) { buffers[name] = null; }
  return buffers[name];
}
export function preload(names) { names.forEach(n => { const v = VARIANTS[n] || 1; for (let i = 1; i <= v; i++) load(v > 1 ? `${n}${i}` : n); }); }

export function play(name, vol = 1, rate = 1) {
  if (!S.on) return;
  const c = ac();
  const v = VARIANTS[name] || 1;
  const file = v > 1 ? `${name}${1 + Math.floor(Math.random() * v)}` : name;
  const b = buffers[file];
  if (b) {
    const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
    const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
    return;
  }
  if (!tried[file]) load(file);
  synth(name, vol);
}

// ---- Ersatzklänge ----
function tone(f, t, d, type = 'sine', vol = 0.2, f2 = null) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
}
function noise(t, d, vol = 0.2, fc = 2000, q = 1) {
  const n = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * d), ctx.sampleRate), a = n.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
  const s = ctx.createBufferSource(); s.buffer = n;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
function synth(name, vol) {
  const t = ctx.currentTime;
  const chime = (notes, step = 0.07, d = 0.5, type = 'triangle', v = 0.16) => notes.forEach((f, i) => { tone(f, t + i * step, d, type, v * vol); tone(f * 2, t + i * step, d * 0.6, 'sine', v * 0.35 * vol); });
  switch (name) {
    case 'roll': for (let i = 0; i < 7; i++) noise(t + i * 0.06 + Math.random() * 0.03, 0.05, 0.25 * vol, 1800 + Math.random() * 1500, 3); break;
    case 'land': noise(t, 0.09, 0.45 * vol, 600, 1.2); tone(140, t, 0.12, 'sine', 0.25 * vol, 70); break;
    case 'coin': chime([1568, 2093], 0.05, 0.35, 'triangle', 0.12); break;
    case 'coins': for (let i = 0; i < 10; i++) { const f = [1568, 1760, 2093, 2349][i % 4]; tone(f, t + i * 0.045, 0.25, 'triangle', 0.08 * vol); } break;
    case 'jackpot': chime([523, 659, 784, 1047, 1319, 1568, 2093], 0.08, 0.9, 'triangle', 0.15); break;
    case 'build': noise(t, 0.06, 0.4 * vol, 900, 2); noise(t + 0.14, 0.06, 0.4 * vol, 900, 2); chime([784, 988, 1175, 1568], 0.06, 0.7, 'triangle', 0.12); break;
    case 'click': tone(880, t, 0.06, 'triangle', 0.12 * vol, 1200); break;
    case 'pop': tone(500, t, 0.12, 'sine', 0.2 * vol, 1100); break;
    case 'error': tone(220, t, 0.18, 'square', 0.06 * vol, 160); break;
    case 'whoosh': noise(t, 0.45, 0.35 * vol, 700, 0.7); break;
    case 'boom': noise(t, 0.6, 0.7 * vol, 220, 0.6); tone(90, t, 0.5, 'sine', 0.4 * vol, 40); break;
    case 'shield': chime([392, 587, 784], 0.05, 0.6, 'sine', 0.18); noise(t, 0.3, 0.1 * vol, 4000, 2); break;
    case 'block': tone(300, t, 0.4, 'square', 0.08 * vol, 600); chime([1175, 1568], 0.04, 0.5); break;
    case 'egg': chime([1047, 1319, 1568, 2093, 2637], 0.06, 0.8, 'sine', 0.14); break;
    case 'crack': noise(t, 0.08, 0.5 * vol, 3000, 2); noise(t + 0.12, 0.06, 0.4 * vol, 2500, 2); break;
    case 'hatch': chime([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.09, 1.0, 'triangle', 0.14); break;
    case 'star': chime([1319, 1568, 1976, 2637], 0.05, 0.9, 'sine', 0.13); break;
    case 'levelup': chime([392, 523, 659, 784, 1047], 0.1, 1.1, 'triangle', 0.16); break;
    case 'wheel': tone(1400, t, 0.03, 'square', 0.04 * vol); break;
    case 'mask': chime([659, 554, 659, 880], 0.08, 0.4, 'triangle', 0.12); break;
    case 'alarm': tone(660, t, 0.18, 'sawtooth', 0.06 * vol); tone(520, t + 0.2, 0.18, 'sawtooth', 0.06 * vol); break;
    default: tone(660, t, 0.1, 'sine', 0.1 * vol);
  }
}

// ---- Musik ----
let musicSrc = null, musicName = null;
export async function music(name) {
  if (musicName === name) return;
  musicName = name;
  if (musicSrc) { try { musicSrc.stop(); } catch (e) { } musicSrc = null; }
  if (!S.music || !name) return;
  const b = await load('music_' + name);
  if (!b || musicName !== name) return;
  const s = ac().createBufferSource(); s.buffer = b; s.loop = true; s.connect(musicGain); s.start(); musicSrc = s;
}
export function setMusic(on) { S.music = on; const n = musicName; musicName = null; if (on) music(n || 'main'); else if (musicSrc) { musicSrc.stop(); musicSrc = null; musicName = n; } }
