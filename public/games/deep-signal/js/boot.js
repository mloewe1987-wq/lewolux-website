// Deep Signal – start on CrazyGames: init SDK, choose language and storage, then load the game
(async function () {
  const sdk = window.CrazyGames && window.CrazyGames.SDK;
  window.__cg = {sdk: null, env: 'none'};
  if (sdk) {
    try {
      await sdk.init();
      window.__cg.sdk = sdk; window.__cg.env = sdk.environment;
      try { sdk.game.loadingStart(); } catch (_) {}
      try { const loc = sdk.user && sdk.user.systemInfo && sdk.user.systemInfo.locale; if (loc) window.__lang = loc; } catch (_) {}
      try { if (sdk.data && sdk.environment !== 'disabled') window.__store = sdk.data; } catch (_) {}
    } catch (e) { console.warn('CrazyGames SDK not available', e); }
  }
  // without a platform locale (no SDK, e.g. played directly): the browser language (de* -> German, everything else English)
  if (!window.__lang) { try { const nl = (navigator.languages && navigator.languages[0]) || navigator.language; if (nl) window.__lang = nl; } catch (_) {} }
  // a ?lang= URL parameter beats the platform / browser, the language chosen in the settings beats everything
  const q = new URLSearchParams(location.search); if (q.get('lang')) window.__lang = q.get('lang');
  try { const st = window.__store || window.localStorage, l = st && st.getItem('deepsignal_lang'); if (l === 'en' || l === 'de') window.__lang = l; } catch (_) {}
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.body.appendChild(s); });
  try { await document.fonts.load('700 16px Poppins'); await document.fonts.load('500 16px Poppins'); } catch (_) {}
  for (const f of ['data', 'i18n', 'core', 'audio', 'render', 'fx', 'main', 'cg']) await load('js/' + f + '.js');
  window.DS.start();
  window.DS.cgReady && window.DS.cgReady();
})();
