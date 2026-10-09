// Eingabe: Tastatur, Controller (Gamepad-API), Touch-Stick und Neigen
export const input = { steer: 0, gas: 0, brake: 0, drift: false, item: false, pause: false, mode: 'keys', touchMode: 'stick', invertTilt: false, autoGas: true, menuNav: null };
const keys = new Set();
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const touch = { on: isTouch, stickX: 0, drift: false, item: false, brake: false, tilt: 0, tiltOK: false };
let itemLatch = false, pauseLatch = false;

addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys.add(e.code); input.mode = 'keys';
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

export function pollInput() {
  let steer = 0, gas = 0, brake = 0, drift = false, item = false, pause = false;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) steer -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) steer += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) gas = 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) brake = 1;
  if (keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight')) drift = true;
  if (keys.has('KeyE') || keys.has('KeyX') || keys.has('ControlLeft') || keys.has('KeyF') || keys.has('Enter')) item = true;
  if (keys.has('Escape') || keys.has('KeyP')) pause = true;

  // Controller
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let padItem = false, padPause = false;
  for (const p of pads) {
    if (!p || !p.connected) continue;
    const b = i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.4);
    const v = i => (p.buttons[i] ? p.buttons[i].value : 0);
    let ax = p.axes[0] || 0; if (Math.abs(ax) < 0.15) ax = 0; else ax = Math.sign(ax) * (Math.abs(ax) - 0.15) / 0.85;
    if (b(14)) ax = -1; if (b(15)) ax = 1;
    if (ax !== 0) { steer = ax; input.mode = 'pad'; }
    const g = Math.max(b(0) ? 1 : 0, v(7)); if (g > 0.1) { gas = Math.max(gas, g); input.mode = 'pad'; }
    if (b(1) || v(6) > 0.3) brake = 1;
    if (b(5)) drift = true;
    if (b(2) || b(4) || b(3)) padItem = true;
    if (b(9)) padPause = true;
  }
  // Touch
  if (touch.on && input.mode === 'touch') {
    if (input.touchMode === 'tilt' && touch.tiltOK) steer += touch.tilt; else steer += touch.stickX;
    if (touch.drift) drift = true; if (touch.item) item = true; if (touch.brake) brake = 1;
    if (input.autoGas && !brake) gas = Math.max(gas, 1);
  }
  input.steer = Math.max(-1, Math.min(1, steer)); input.gas = gas; input.brake = brake; input.drift = drift;
  // Item/Pause nur beim Drücken auslösen
  const it = item || padItem;
  input.item = it && !itemLatch; itemLatch = it;
  const pz = pause || padPause;
  input.pause = pz && !pauseLatch; pauseLatch = pz;
}

// Touch-Steuerung aufbauen
export function setupTouch(el) {
  const stickZone = el.querySelector('#tStick'), knob = el.querySelector('#tKnob'), base = el.querySelector('#tBase');
  let sid = null, ox = 0, oy = 0;
  stickZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; sid = t.identifier; ox = t.clientX; oy = t.clientY;
    base.style.left = ox + 'px'; base.style.top = oy + 'px'; base.style.opacity = 1; input.mode = 'touch'; e.preventDefault();
  }, { passive: false });
  stickZone.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) if (t.identifier === sid) {
      const dx = Math.max(-60, Math.min(60, t.clientX - ox));
      touch.stickX = dx / 60; knob.style.transform = `translate(${dx}px,0)`;
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; touch.stickX = 0; knob.style.transform = ''; base.style.opacity = .45; } };
  stickZone.addEventListener('touchend', end); stickZone.addEventListener('touchcancel', end);
  const hold = (id, key) => {
    const b = el.querySelector(id);
    b.addEventListener('touchstart', e => { touch[key] = true; b.classList.add('on'); input.mode = 'touch'; e.preventDefault(); }, { passive: false });
    const up = e => { touch[key] = false; b.classList.remove('on'); e.preventDefault(); };
    b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
  };
  hold('#tDrift', 'drift'); hold('#tItem', 'item'); hold('#tBrake', 'brake');
}

// Neigen: Schwerkraft entlang der langen Handykante
export async function enableTilt() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const r = await DeviceMotionEvent.requestPermission(); if (r !== 'granted') return false;
    }
  } catch (_) { return false; }
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  addEventListener('devicemotion', e => {
    const g = e.accelerationIncludingGravity; if (!g || g.y == null) return;
    const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 90;
    let v = (ang === 90 ? g.y : ang === 270 || ang === -90 ? -g.y : g.x);
    if (iOS) v = -v;
    if (input.invertTilt) v = -v;
    const s = v / 4.2; touch.tilt = Math.max(-1, Math.min(1, Math.abs(s) < 0.06 ? 0 : s));
    touch.tiltOK = true;
  });
  return true;
}
