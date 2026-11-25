// Deep Signal – CrazyGames SDK v3 integration
// loading, gameplay start/stop, ads only at natural breaks, rewarded ads, mute handling, happytime.
(function (DS) {
'use strict';
const sdk = window.__cg && window.__cg.sdk;
const ok = () => !!sdk && window.__cg.env !== 'disabled';
const A = DS.A;

// 1) mute: the CrazyGames setting and running ads always win
let platformMute = false, adMute = false;
function applyMute() { A.muted = platformMute || adMute; A.apply(); }
if (ok()) { try { platformMute = !!sdk.game.settings.muteAudio; sdk.game.addSettingsChangeListener(s => { platformMute = !!s.muteAudio; applyMute(); }); } catch (_) {} }
applyMute();

// 2) gameplay start/stop: only while actually diving (not in menus, results or pause, not when the tab is hidden)
let playing = false, loaded = false;
function tick() {
  if (!loaded) return;
  const G = DS.G, now = !!G && G.mode === 'dive' && !G.paused && !G.menu && !document.hidden && !adMute;
  if (now !== playing) { playing = now; if (ok()) try { now ? sdk.game.gameplayStart() : sdk.game.gameplayStop(); } catch (_) {} }
}
setInterval(tick, 250); document.addEventListener('visibilitychange', tick);

// 3) ads
let busy = false;
function ad(type, done) {
  if (!ok() || busy) { done(false); return; }
  busy = true; let fin = false, started = false;
  const end = r => { if (fin) return; fin = true; busy = false; adMute = false; applyMute(); tick(); done(r); };
  setTimeout(() => { if (!started) end(false); }, 9000); // never hang the game if the SDK does not answer
  try {
    sdk.ad.requestAd(type, {
      adStarted: () => { started = true; adMute = true; applyMute(); tick(); },
      adFinished: () => end(true),
      adError: () => end(false),
    });
  } catch (_) { end(false); }
}
DS.hooks = {
  ads: () => ok(),
  midgame: cb => ad('midgame', () => cb && cb()),
  rewarded: (kind, cb) => ad('rewarded', r => cb(r)), // reward only on adFinished
  happy: () => { if (ok()) try { sdk.game.happytime(); } catch (_) {} },
  playing: () => tick(),
};

// 4) loading finished once the first frame is drawn
DS.cgReady = () => requestAnimationFrame(() => requestAnimationFrame(() => { if (ok()) try { sdk.game.loadingStop(); } catch (_) {} loaded = true; tick(); }));
})(window.DS);
