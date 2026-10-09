// Streckenliste: Verlauf, Aussehen, Objekte
export const TRACKS = [
  {
    id: 'dschungel', name: 'Neon-Dschungel', icon: '🌴', theme: 'jungle', scale: 1.7, music: 'jungle',
    cp: [[0,0,0],[60,0,0],[120,0,1],[168,-18,3],[190,-68,6],[165,-112,8],[118,-100,7],[100,-70,5],[78,-60,4],
      [46,-80,2],[12,-128,0],[-48,-142,0],[-108,-112,3],[-132,-52,5],[-104,-2,3],[-58,14,1]],
    pads: [[0.08, 0], [0.37, -5], [0.6, 5], [0.86, -4]], ramps: [[0.115, 0, 12], [0.64, 3, 10]],
    pickups: [0.2, 0.5, 0.76], coins: [[0.035, 6], [0.3, -4], [0.55, 4], [0.67, -6], [0.9, 0]], bloom: [0.6, 0.8], exposure: 1.15, ramp: ['#29f0ff', '#ff3fd0'], dust: 0x3a8a6a,
    style: { road: 0x272043, roadSpeck: [18, 6, 50], edge: [0x29f0ff, 0xff3fd0], curb: [0xffe14a, 0x7a2cff], grass: [0x1d4a3a, 0x2a6b4a, 0x183c33],
      wall: 0x3a1f66, wallTop: [0x29f0ff, 0xff3fd0], arch: [0x7a2cff, 0x29f0ff], banner: 'LEWOLUX TURBO', shine: 60, spec: 0x4a3a7a },
  },
  {
    id: 'schulhof', name: 'Schulhof-Stadion', icon: '⚽', theme: 'school', scale: 1.7, music: 'school',
    cp: [[0,0,0],[80,0,0],[130,-10,0],[150,-50,0],[140,-95,2],[100,-115,4],[40,-110,4],[0,-130,2],[-50,-140,0],[-95,-115,0],[-115,-65,0],[-90,-22,1],[-40,-8,1]],
    pads: [[0.1, 4], [0.42, -4], [0.7, 0], [0.9, 5]], ramps: [[0.2, -3, 12], [0.78, 0, 14]],
    pickups: [0.16, 0.47, 0.74], coins: [[0.05, -5], [0.28, 5], [0.55, 0], [0.63, -6], [0.95, 3]], bloom: [0.22, 0.93], exposure: 1.0, ramp: ['#e52a2a', '#ffffff'], dust: 0x6ab84a,
    style: { road: 0x5a5f6e, roadSpeck: [0, 0, 6], edge: [0xffffff, 0xffe14a], curb: [0xe52a2a, 0xffffff], grass: [0x4aa84a, 0x5cc05a, 0x3e9440],
      wall: 0x2a5ad6, wallTop: [0xffe14a, 0xffe14a], arch: [0x2a5ad6, 0xffe14a], banner: 'SCHULHOF-CUP', shine: 25, spec: 0x333333,
      decals: true,
      wallTex: (canvasTex) => { const t = canvasTex(512, 64, (g, w, h) => { const cols = ['#2a5ad6', '#e52a2a', '#ffe14a', '#3ad46a']; const txt = ['LEWOLUX.DE', 'SCHULHOFKICKER', 'PANDI', 'TOR!']; for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.fillRect(i*128, 0, 128, h); g.fillStyle = i === 2 ? '#2a2a6a' : '#fff'; g.font = '900 20px system-ui'; g.textAlign = 'center'; g.fillText(txt[i], i*128 + 64, 40); } }, true); return t; },
    },
  },
  {
    id: 'teich', name: 'Pandis Seerosenteich', icon: '🐼', theme: 'pond', scale: 1.6, music: 'pond',
    cp: [[0,0,0],[70,10,0],[120,40,0],[140,90,1],[110,140,2],[50,150,3],[0,130,2],[-40,105,1],[-95,110,0],[-150,105,0],[-170,55,0],[-145,0,1],[-85,-20,0],[-35,-12,0]],
    pads: [[0.12, 0], [0.4, 4], [0.66, -4], [0.92, 0]], ramps: [[0.3, 0, 12], [0.83, -2, 12]],
    pickups: [0.22, 0.52, 0.76], coins: [[0.05, 5], [0.34, -5], [0.58, 0], [0.7, 6], [0.96, -4]], bloom: [0.35, 0.88], exposure: 1.05, ramp: ['#d0402a', '#ffd23c'], dust: 0xbfeaff, splash: true,
    style: { road: 0xb88458, roadSpeck: [8, 4, -6], planks: true, lines: false, edge: [0x8a5a3a, 0x8a5a3a], waterShoulder: true, curb: [0xff8ab0, 0xffffff], grass: [0x3a8a8a, 0x4aa0a0, 0x2f7a80],
      wall: 0x6a9a3a, wallTop: null, arch: [0xd0402a, 0xffd23c], banner: 'PANDIS TEICH', shine: 30, spec: 0x553311,
      wallTex: (canvasTex) => canvasTex(128, 64, (g, w, h) => { for (let x = 0; x < w; x += 16) { g.fillStyle = (x/16) % 2 ? '#8ac84a' : '#7ab83a'; g.fillRect(x, 0, 16, h); g.fillStyle = '#4a7a2a'; g.fillRect(x, 20 + (x % 32), 16, 3); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 14, 0, 2, h); } }, true) },
  },
  {
    id: 'wueste', name: 'Wüsten-Hitze', icon: '🌵', theme: 'desert', scale: 1.7, music: 'desert',
    cp: [[0,0,0],[90,0,2],[150,30,6],[170,90,10],[135,130,8],[75,115,4],[35,75,2],[-15,90,4],[-60,130,8],[-120,115,6],[-145,55,3],[-110,0,1],[-55,-15,0]],
    pads: [[0.09, -4], [0.35, 4], [0.6, 0], [0.88, 4]], ramps: [[0.14, 2, 12], [0.7, 0, 14]],
    pickups: [0.2, 0.46, 0.79], coins: [[0.04, 4], [0.27, -4], [0.52, 4], [0.62, -5], [0.94, 0]], bloom: [0.2, 0.94], exposure: 1.0, ramp: ['#ff8a3c', '#fff0c8'], dust: 0xe8c080,
    style: { road: 0xa86e42, roadSpeck: [12, 6, -4], tracks: true, lines: false, edge: [0xfff0c8, 0xfff0c8], curb: [0xff5a3c, 0xfff0c8], grass: [0xe0b070, 0xecc080, 0xd4a060],
      wall: 0xb07a4a, wallTop: null, arch: [0xb07a4a, 0xffb23c], banner: 'WÜSTEN-HITZE', shine: 12, spec: 0x332211,
      wallTex: (canvasTex) => canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#d8a868'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = '#c0905a'; g.fillRect(x, 0, 30, h); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x, 4, 30, 4); } g.fillStyle = '#8a5a2a'; g.fillRect(0, 28, w, 6); }, true) },
  },
];
export const CUPS = [{ id: 'lewolux', name: 'Lewolux-Cup', icon: '🦁', tracks: ['dschungel', 'schulhof', 'teich', 'wueste'] }];
export const trackById = id => TRACKS.find(t => t.id === id) || TRACKS[0];
