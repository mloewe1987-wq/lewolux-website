/* Lewolux Community – Konto, Freunde, Chat, Favoriten, Spielzeit-Statistik.
   Läuft NUR im Erwachsenen-Bereich. Im Kinderbereich (/kids/, Kinderspiele, aktiver Kids-Modus) wird nichts geladen.
   Sicherheit: Nutzerdaten werden nur per textContent/Attribut in die Seite gesetzt, nie per innerHTML. */
(()=>{"use strict";
const SCRIPT=document.currentScript;
try{if(/^\/kids(\/|$)/.test(location.pathname)||localStorage.getItem('lxKids')==='1')return}catch(_){}
const KIDS=new Set(((SCRIPT&&SCRIPT.dataset.kids)||'').split(',').filter(Boolean));
let DATA={games:[]};try{DATA=JSON.parse(document.getElementById('game-data').textContent)}catch(_){}
const GAMES=new Map((DATA.games||[]).filter(g=>!KIDS.has(g.id)).map(g=>[g.id,g]));
const pageGame=(location.pathname.match(/^\/spiele\/([a-z0-9-]+)\/?$/)||[])[1]||null;
if(pageGame&&KIDS.has(pageGame))return;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const wantFav=location.hash==='#favoriten';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const LS={get(k){try{return localStorage.getItem(k)}catch(_){return null}},set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(_){}}};

/* ---------- DOM-Helfer: Inhalte nur als Text ---------- */
function h(tag,props,...kids){const e=document.createElement(tag);
  if(props)for(const k in props){const v=props[k];if(v==null||v===false)continue;
    if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='svg')e.innerHTML=v;/* nur feste, eigene SVG-Grafiken */
    else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='style')e.style.cssText=v;else if(k==='data')Object.assign(e.dataset,v);
    else e.setAttribute(k,v===true?'':String(v))}
  for(const c of kids.flat(3))if(c!=null&&c!==false)e.append(c.nodeType?c:document.createTextNode(String(c)));return e}
const I={
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.2 2.6 3.7 5.5"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.3-9.6C1.5 7.4 3.7 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.5 0 5.7 3.4 4.5 6.9-1.8 5-9.3 9.6-9.3 9.6z"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4M4 4h12l-2 4 2 4H4"/></svg>',
  game:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-3.96 3.43l-.7 5.6A3 3 0 0 0 5 17.5c.8 0 1.56-.32 2.12-.88L8.5 15h7l1.38 1.62c.56.56 1.32.88 2.12.88a3 3 0 0 0 2.96-3.47l-.7-5.6A4 4 0 0 0 17.3 5z"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  drag:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

/* ---------- 24 Profilbilder (SVG, im Code erzeugt) ---------- */
const PAL=[ // Hintergrund 1, Hintergrund 2, Hauptfarbe, Dunkel, Akzent
 ['#ff8a3d','#9b5cff','#ffb43d','#5a2a0c','#ffe7b0'],['#22d3ff','#3b2bff','#ff7ad9','#4a1240','#ffe0f4'],
 ['#1b2a78','#3be8ff','#d6e2ff','#3d4b7a','#3be8ff'],['#ff3d8a','#ffb43d','#eef2ff','#5d3a52','#ff3d8a'],
 ['#0e5a4a','#3be8ff','#7dff9e','#1d5c3c','#eaffef'],['#5b1fa8','#ff5ad1','#b8f15a','#3b5a12','#f4ffd9'],
 ['#3b2bff','#9b5cff','#e9f2ff','#3a3f6b','#9b5cff'],['#ff6b3d','#ffcf4a','#fff6e6','#7a4a20','#ff3d6b'],
 ['#00a37a','#3be8ff','#ff5ad1','#6b1050','#ffe0f6'],['#ff3d6b','#9b5cff','#3be8ff','#0f4a6b','#e3fbff'],
 ['#2b1b6b','#ff8a3d','#c58cff','#3e1f6b','#ffd36b'],['#0f6b8a','#7dff9e','#ffcf4a','#6b4a10','#fff1c2'],
 ['#ff8a3d','#ff3d8a','#2d2f45','#14152a','#ffcf4a'],['#3be8ff','#7dff9e','#f1f3ff','#3a4a6b','#ff8a3d'],
 ['#5b1fa8','#3be8ff','#b9c4dd','#3b435a','#ff3d6b'],['#14306b','#ffcf4a','#ffcf4a','#6b4a10','#3be8ff'],
 ['#9b5cff','#ff8a3d','#ff7a2d','#5a2008','#fff1e6'],['#0e4a6b','#3be8ff','#8a9bff','#262f6b','#ffffff'],
 ['#ff3d8a','#9b5cff','#ff4a4a','#5a0f1a','#fff2f2'],['#00a37a','#ffcf4a','#3b82ff','#0f2a6b','#ffffff'],
 ['#3b1b8a','#ff3d8a','#5ee67d','#14562a','#ffd36b'],['#ff8a3d','#ffcf4a','#3be8ff','#0f4a6b','#ff3d8a'],
 ['#14306b','#9b5cff','#3be8ff','#0f4a6b','#3be8ff'],['#5b1fa8','#ff5ad1','#ffcf4a','#6b4a10','#ff8a3d']];
function star(cx,cy,r1,r2,n){let p=[];for(let i=0;i<n*2;i++){const a=Math.PI*i/n-Math.PI/2,r=i%2?r2:r1;p.push((cx+Math.cos(a)*r).toFixed(1)+','+(cy+Math.sin(a)*r).toFixed(1))}return p.join(' ')}
const INV=["..X.....X..","...X...X...","..XXXXXXX..",".XX.XXX.XX.","XXXXXXXXXXX","X.XXXXXXX.X","X.X.....X.X","...XX.XX..."];
const E='#151028';
const CH=[
 p=>`<polygon points="${star(32,35,25,18.5,13)}" fill="${p[2]}"/><circle cx="21" cy="25" r="4.5" fill="${p[4]}"/><circle cx="43" cy="25" r="4.5" fill="${p[4]}"/><circle cx="32" cy="36" r="13.5" fill="${p[4]}"/><circle cx="27" cy="34" r="2.2" fill="${E}"/><circle cx="37" cy="34" r="2.2" fill="${E}"/><path d="M29.4 39h5.2L32 42z" fill="${p[3]}"/><path d="M32 42v2.2M28.8 45q3.2 2.2 6.4 0" stroke="${p[3]}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
 p=>`<path d="M32 18v-7" stroke="${p[3]}" stroke-width="2.6" stroke-linecap="round"/><circle cx="32" cy="10" r="3.6" fill="${p[4]}"/><rect x="11" y="28" width="5" height="11" rx="2.5" fill="${p[3]}"/><rect x="48" y="28" width="5" height="11" rx="2.5" fill="${p[3]}"/><rect x="15" y="18" width="34" height="31" rx="9" fill="${p[2]}"/><rect x="19" y="25" width="26" height="11" rx="5.5" fill="${E}"/><circle cx="26" cy="30.5" r="2.9" fill="${p[4]}"/><circle cx="38" cy="30.5" r="2.9" fill="${p[4]}"/><path d="M24 42.5h16" stroke="${p[3]}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2.6 2.4"/>`,
 p=>`<path d="M24 17l-5-8M40 17l5-8" stroke="${p[2]}" stroke-width="2.6" stroke-linecap="round"/><circle cx="19" cy="9" r="3.2" fill="${p[4]}"/><circle cx="45" cy="9" r="3.2" fill="${p[4]}"/><path d="M32 15c11 0 18 8 18 18 0 11-9 19-18 19s-18-8-18-19c0-10 7-18 18-18z" fill="${p[2]}"/><ellipse cx="25" cy="33" rx="5" ry="7.2" transform="rotate(-28 25 33)" fill="${E}"/><ellipse cx="39" cy="33" rx="5" ry="7.2" transform="rotate(28 39 33)" fill="${E}"/><circle cx="26.5" cy="30.5" r="1.6" fill="#fff"/><circle cx="40.5" cy="30.5" r="1.6" fill="#fff"/><path d="M29 45q3 1.6 6 0" stroke="${p[3]}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
 p=>`<path d="M15 51V31a17 17 0 0 1 34 0v20l-5.7-4.2-5.6 4.2-5.7-4.2-5.6 4.2-5.7-4.2z" fill="${p[2]}"/><ellipse cx="26" cy="31" rx="3.2" ry="4.4" fill="${E}"/><ellipse cx="38" cy="31" rx="3.2" ry="4.4" fill="${E}"/><ellipse cx="32" cy="40" rx="2.6" ry="3.2" fill="${E}"/><circle cx="21" cy="37" r="2.6" fill="${p[4]}" opacity=".55"/><circle cx="43" cy="37" r="2.6" fill="${p[4]}" opacity=".55"/>`,
 p=>`<path d="M44 49v5.5a2.2 2.2 0 0 0 4.4 0V47z" fill="${p[2]}"/><path d="M10 49c0-15 8-29 22-29s22 14 22 29c0 2-1.8 3.5-4 3.5H14c-2.2 0-4-1.5-4-3.5z" fill="${p[2]}"/><ellipse cx="21.5" cy="31" rx="3.6" ry="6" transform="rotate(32 21.5 31)" fill="#fff" opacity=".38"/><circle cx="27" cy="38" r="2.7" fill="${E}"/><circle cx="39" cy="38" r="2.7" fill="${E}"/><path d="M28 44q4 3.2 8 0" stroke="${E}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`,
 p=>`<path d="M16 28l1.5-13 9 8.5zM48 28l-1.5-13-9 8.5z" fill="${p[2]}"/><ellipse cx="32" cy="37" rx="17.5" ry="16.5" fill="${p[2]}"/><ellipse cx="32" cy="45" rx="10" ry="7" fill="${p[4]}" opacity=".55"/><circle cx="25" cy="33" r="6.6" fill="#fff"/><circle cx="39" cy="33" r="6.6" fill="#fff"/><circle cx="25.6" cy="33.6" r="3.1" fill="${E}"/><circle cx="38.4" cy="33.6" r="3.1" fill="${E}"/><path d="M29.8 38.5h4.4L32 42.6z" fill="${p[3]}"/>`,
 p=>`<path d="M14.5 31l3-17 11 8.5zM49.5 31l-3-17-11 8.5z" fill="${p[2]}"/><path d="M18 25.5l1.4-7.5 5 4zM46 25.5l-1.4-7.5-5 4z" fill="${p[4]}" opacity=".8"/><circle cx="32" cy="36" r="17" fill="${p[2]}"/><ellipse cx="25.5" cy="34" rx="2.6" ry="3.8" fill="${E}"/><ellipse cx="38.5" cy="34" rx="2.6" ry="3.8" fill="${E}"/><path d="M30 40h4l-2 2.6z" fill="${p[4]}"/><path d="M11 39.5l9 1.4M11 45l9-1.6M53 39.5l-9 1.4M53 45l-9-1.6" stroke="${p[3]}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
 p=>`<path d="M32 9c9 0 13 5 13 11-4.5-3.2-8.5-3.4-13-3.4z" fill="${p[4]}"/><path d="M17 51V33c0-9.4 6.7-16.5 15-16.5S47 23.6 47 33v18z" fill="${p[2]}"/><path d="M24 20c-3 3-4.5 7-4.5 12" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45" fill="none"/><rect x="20.5" y="30" width="23" height="5.4" rx="2.7" fill="${E}"/><rect x="30.5" y="35" width="3" height="11" rx="1.5" fill="${E}" opacity=".75"/><circle cx="21.5" cy="43" r="1.6" fill="${p[3]}"/><circle cx="42.5" cy="43" r="1.6" fill="${p[3]}"/>`,
 p=>`<path d="M13 29l2.5-17 12.5 10zM51 29l-2.5-17-12.5 10z" fill="${p[2]}"/><path d="M16.5 25l1.4-8.5 6.4 5zM47.5 25l-1.4-8.5-6.4 5z" fill="${E}" opacity=".35"/><path d="M11 28c4.5-6 12.5-8 21-8s16.5 2 21 8c-2 12.5-10 22.5-21 24.5-11-2-19-12-21-24.5z" fill="${p[2]}"/><path d="M11 28c7 1 13 7 21 24.5-11-2-19-12-21-24.5zM53 28c-7 1-13 7-21 24.5 11-2 19-12 21-24.5z" fill="${p[4]}"/><ellipse cx="24.5" cy="32" rx="2.3" ry="3.2" fill="${E}"/><ellipse cx="39.5" cy="32" rx="2.3" ry="3.2" fill="${E}"/><circle cx="32" cy="47" r="2.6" fill="${E}"/>`,
 p=>`<path d="M22 37h20v10c0 4.4-4.5 7.5-10 7.5S22 51.4 22 47z" fill="${p[4]}"/><path d="M9.5 35c0-13 10-23 22.5-23s22.5 10 22.5 23c0 2-1.8 3.4-4 3.4H13.5c-2.2 0-4-1.4-4-3.4z" fill="${p[2]}"/><circle cx="21" cy="23" r="3.8" fill="#fff" opacity=".92"/><circle cx="37" cy="19" r="2.7" fill="#fff" opacity=".92"/><circle cx="45" cy="29" r="3.2" fill="#fff" opacity=".92"/><circle cx="29" cy="31" r="2.1" fill="#fff" opacity=".92"/><circle cx="28" cy="44" r="1.9" fill="${E}"/><circle cx="36" cy="44" r="1.9" fill="${E}"/><path d="M29.5 48q2.5 1.8 5 0" stroke="${E}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
 p=>`<path d="M20 23l-7-12.5 13 7.5zM44 23l7-12.5-13 7.5z" fill="${p[4]}"/><path d="M28 18.5l4-6.5 4 6.5z" fill="${p[4]}"/><path d="M13 35c0-10.5 8.5-17 19-17s19 6.5 19 17v6c0 7.3-8.5 12.5-19 12.5S13 48.3 13 41z" fill="${p[2]}"/><ellipse cx="32" cy="45" rx="11.5" ry="6.4" fill="${p[3]}" opacity=".35"/><circle cx="28.3" cy="45" r="1.5" fill="${E}"/><circle cx="35.7" cy="45" r="1.5" fill="${E}"/><ellipse cx="23.5" cy="32.5" rx="3.8" ry="3.3" fill="#fff36b"/><ellipse cx="40.5" cy="32.5" rx="3.8" ry="3.3" fill="#fff36b"/><rect x="22.9" y="29.6" width="1.3" height="5.8" rx=".65" fill="${E}"/><rect x="39.9" y="29.6" width="1.3" height="5.8" rx=".65" fill="${E}"/>`,
 p=>{let d='';INV.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='X')d+=`M${10+x*4} ${17+y*4}h4v4h-4z`}));return`<path d="${d}" fill="${p[2]}"/><rect x="22" y="29" width="4" height="4" fill="${p[4]}"/><rect x="38" y="29" width="4" height="4" fill="${p[4]}"/>`},
];
const AV_NAMES=['Löwe','Löwe','Roboter','Roboter','Alien','Alien','Geist','Geist','Schleim','Schleim','Eule','Eule','Katze','Katze','Ritter','Ritter','Fuchs','Fuchs','Pilz','Pilz','Drache','Drache','Pixel-Invader','Pixel-Invader'];
let avUid=0;
function avSvg(i){i=Math.abs(i|0)%24;const p=PAL[i],id='cxg'+(++avUid);
  return`<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs><rect width="64" height="64" fill="url(#${id})"/><circle cx="18" cy="12" r="24" fill="#fff" opacity=".13"/>${CH[i>>1](p)}</svg>`}
const ANON_SVG='<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#2a2f42"/><circle cx="32" cy="26" r="11" fill="#6b7389"/><path d="M12 58c2-12 10-18 20-18s18 6 20 18z" fill="#6b7389"/><text x="32" y="31" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="800" font-size="14" fill="#2a2f42">?</text></svg>';
function avatar(i,size=40,anon=false){return h('span',{class:'cx-av',style:`--s:${size}px`,svg:anon?ANON_SVG:avSvg(i)})}
const avColor=i=>PAL[Math.abs(i|0)%24][2];

/* ---------- API ---------- */
async function api(path,body){const post=body!==undefined;
  const init={method:post?'POST':'GET',credentials:'same-origin',headers:{'X-Lwx':'1'}};
  if(post){init.headers['Content-Type']='application/json';init.body=JSON.stringify(body)}
  let r,j;try{r=await fetch('/api/c'+path,init);j=await r.json()}catch(_){return{ok:false,msg:'Keine Verbindung zum Server. Bitte später noch einmal versuchen.',status:0}}
  j.status=r.status;if(r.status===401&&st.me&&path!=='/logout'){loggedOut()}return j}

/* ---------- Zustand ---------- */
const st={me:null,counts:{unread:0,requests:0},cfg:null,friends:null,favs:[],playing:null,modal:null,ws:null,wsOk:false,wsTries:0,pollT:0,beatT:0,panel:null,tab:'profil',chatWith:null,shown:new Set()};
const STATUS={online:'Online',busy:'Beschäftigt',invisible:'Unsichtbar',offline:'Offline'};
const gname=id=>{const g=GAMES.get(id);return g?g.short:id};
function fmtDur(ms){const m=Math.floor(ms/60000);if(m<1)return'unter 1 Min';const hh=Math.floor(m/60),mm=m%60;return hh?(mm?`${hh} Std ${mm} Min`:`${hh} Std`):`${mm} Min`}
function fmtTime(t){const d=new Date(t),n=new Date();const hm=d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});return d.toDateString()===n.toDateString()?hm:d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+' '+hm}
function statusLine(f){if(!f.on)return'Offline';if(f.game)return(f.st==='busy'?'Beschäftigt · ':'')+'spielt gerade '+gname(f.game);return STATUS[f.st]||'Online'}

/* ---------- CSS nachladen, dann starten ---------- */
function loadCss(){return new Promise(ok=>{const href=SCRIPT&&SCRIPT.dataset.css;if(!href)return ok();const l=h('link',{rel:'stylesheet',href});l.onload=l.onerror=()=>ok();document.head.appendChild(l);setTimeout(ok,2500)})}

/* ---------- Kopfzeile ---------- */
let slot=null;
function renderSlot(){slot=slot||$('#cxSlot');if(!slot)return;slot.textContent='';slot.classList.add('cx-ready');
  if(!st.me){slot.append(h('button',{type:'button',class:'cx-login',onclick:openLogin,'aria-label':'Anmelden'},h('span',{class:'cx-ic',svg:I.user}),h('span',{class:'cx-login-t'},'Anmelden')));return}
  const n=st.counts.unread+st.counts.requests;
  const b=h('button',{type:'button',class:'cx-me','aria-haspopup':'menu','aria-expanded':'false','aria-label':`Konto von ${st.me.nick}`+(n?`, ${n} neu`:''),onclick:e=>{e.stopPropagation();toggleMenu(b)}},
    avatar(st.me.avatar,38),h('i',{class:'cx-dot st-'+st.me.status}),n?h('b',{class:'cx-badge'},n>99?'99+':n):null);
  slot.append(b)}
let menuEl=null;
function closeMenu(){if(menuEl){menuEl.remove();menuEl=null;const b=$('.cx-me');if(b)b.setAttribute('aria-expanded','false')}}
function toggleMenu(btn){if(menuEl){closeMenu();return}btn.setAttribute('aria-expanded','true');
  const item=(ic,label,fn,badge)=>h('button',{type:'button',role:'menuitem',class:'cx-mi',onclick:()=>{closeMenu();fn()}},h('span',{class:'cx-ic',svg:ic}),h('span',null,label),badge?h('b',{class:'cx-pill'},badge):null);
  const seg=h('div',{class:'cx-seg',role:'group','aria-label':'Status'},...['online','busy','invisible'].map(s=>h('button',{type:'button','aria-pressed':String(st.me.status===s),onclick:async e=>{e.stopPropagation();await setStatus(s);$$('button',seg).forEach(x=>x.setAttribute('aria-pressed',String(x.textContent===STATUS[s])))}},h('i',{class:'cx-dot st-'+s}),STATUS[s])));
  menuEl=h('div',{class:'cx-menu',role:'menu','aria-label':'Konto'},
    h('div',{class:'cx-mh'},avatar(st.me.avatar,44),h('div',null,h('b',null,st.me.nick),h('small',null,st.playing?'spielt gerade '+gname(st.playing):STATUS[st.me.status]))),seg,
    item(I.user,'Profil',()=>openPanel('profil')),item(I.users,'Freunde',()=>openPanel('freunde'),st.counts.requests||null),
    item(I.chat,'Nachrichten',()=>openPanel('chat'),st.counts.unread||null),item(I.heart,'Favoriten',showFavorites),
    item(I.gear,'Einstellungen',()=>openPanel('settings')),h('hr'),item(I.out,'Abmelden',logout));
  document.body.appendChild(menuEl);const r=btn.getBoundingClientRect();
  menuEl.style.top=(r.bottom+10)+'px';menuEl.style.right=Math.max(8,innerWidth-r.right-4)+'px';
  setTimeout(()=>$('.cx-mi',menuEl).focus({preventScroll:true}),0)}
document.addEventListener('click',e=>{if(menuEl&&!menuEl.contains(e.target))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(menuEl){closeMenu();return}if(dlgStack.length){dlgStack[dlgStack.length-1].close();return}if(st.panel)closePanel()}});
addEventListener('resize',closeMenu);addEventListener('scroll',()=>{if(menuEl&&innerWidth>700)closeMenu()},{passive:true});

/* ---------- Toasts ---------- */
let toastBox=null;
function toast(opts){if(typeof opts==='string')opts={text:opts};
  toastBox=toastBox||document.body.appendChild(h('div',{class:'cx-toasts','aria-live':'polite'}));
  const t=h('div',{class:'cx-toast'+(opts.kind?' k-'+opts.kind:'')},opts.av!=null?avatar(opts.av,36):null,
    h('div',{class:'cx-tt'},opts.title?h('b',null,opts.title):null,h('span',null,opts.text),opts.note?h('small',null,opts.note):null,
      opts.actions?h('div',{class:'cx-ta'},...opts.actions.map(a=>h('button',{type:'button',class:a.primary?'cx-btn cx-pri sm':'cx-btn sm',onclick:()=>{close();a.fn()}},a.label))):null),
    h('button',{type:'button',class:'cx-tx','aria-label':'Schließen',svg:I.x,onclick:()=>close()}));
  function close(){t.classList.add('out');setTimeout(()=>t.remove(),260)}
  toastBox.appendChild(t);while(toastBox.children.length>4)toastBox.firstChild.remove();
  setTimeout(close,opts.ms||(opts.actions?15000:4500));return t}

/* ---------- Dialoge ---------- */
const dlgStack=[];
function dialog(title,body,{wide=false,onClose,label}={}){
  const prev=document.activeElement;
  const box=h('div',{class:'cx-dlg'+(wide?' wide':''),role:'dialog','aria-modal':'true','aria-label':label||title},
    h('div',{class:'cx-dlg-h'},h('p',{class:'cx-dlg-t'},title),h('button',{type:'button',class:'cx-icon','aria-label':'Schließen',svg:I.x,onclick:()=>api_.close()})),body);
  const wrap=h('div',{class:'cx-dlg-wrap'},h('div',{class:'cx-dlg-bg',onclick:()=>api_.close()}),box);
  const api_={el:box,close(){if(!wrap.isConnected)return;wrap.remove();const i=dlgStack.indexOf(api_);if(i>=0)dlgStack.splice(i,1);if(!dlgStack.length&&!st.panel)document.documentElement.classList.remove('cx-lock');onClose&&onClose();try{prev&&prev.focus({preventScroll:true})}catch(_){}}};
  document.body.appendChild(wrap);dlgStack.push(api_);document.documentElement.classList.add('cx-lock');
  setTimeout(()=>{const f=$('input,button.cx-pri,button',body)||$('button',box);f&&f.focus({preventScroll:true})},30);return api_}
function confirmDlg(title,text,okLabel,danger){return new Promise(res=>{let done=false;
  const d=dialog(title,h('div',{class:'cx-dlg-b'},h('p',null,text),h('div',{class:'cx-row end'},h('button',{type:'button',class:'cx-btn',onclick:()=>{done=true;d.close();res(false)}},'Abbrechen'),h('button',{type:'button',class:'cx-btn '+(danger?'cx-danger':'cx-pri'),onclick:()=>{done=true;d.close();res(true)}},okLabel))),{onClose:()=>{if(!done)res(false)}})})}

/* ---------- Google Sign-In (wird erst beim Klick auf "Anmelden" geladen) ---------- */
let gisP=null,gisCb=null;
function loadGis(cid){if(gisP)return gisP;gisP=new Promise((ok,bad)=>{const s=h('script',{src:'https://accounts.google.com/gsi/client',async:true});
  s.onload=()=>{try{google.accounts.id.initialize({client_id:cid,callback:r=>gisCb&&gisCb(r.credential),ux_mode:'popup',auto_select:false,itp_support:true,use_fedcm_for_prompt:true,cancel_on_tap_outside:true,context:'signin'});ok()}catch(e){bad(e)}};
  s.onerror=()=>{gisP=null;bad(new Error('gis'))};document.head.appendChild(s)});return gisP}
async function googleButton(el,cb,{text='signin_with',oneTap=false}={}){gisCb=cb;const cfg=st.cfg||(await api('/me')).cfg||{};st.cfg=cfg;
  if(cfg.dev){el.append(h('form',{class:'cx-dev',onsubmit:e=>{e.preventDefault();const v=$('input',e.target).value.trim().toLowerCase();if(v)cb('dev:'+v)}},
    h('label',null,h('span',null,'Test-Login (nur lokal)'),h('input',{type:'text',name:'dev',placeholder:'z. B. anna',autocomplete:'off',maxlength:20,pattern:'[a-z0-9]+'})),h('button',{type:'submit',class:'cx-btn cx-pri'},'Test-Login')))}
  if(!cfg.gcid){if(!cfg.dev)el.append(h('p',{class:'cx-err'},'Die Anmeldung ist gerade nicht verfügbar.'));return}
  const box=h('div',{class:'cx-gbtn'},h('span',{class:'cx-spin'}));el.append(box);
  try{await loadGis(cfg.gcid);box.textContent='';google.accounts.id.renderButton(box,{theme:'filled_black',size:'large',shape:'pill',text,locale:'de',logo_alignment:'left',width:Math.min(320,Math.max(220,el.clientWidth||280))});if(oneTap)try{google.accounts.id.prompt()}catch(_){}}
  catch(_){box.textContent='';box.append(h('p',{class:'cx-err'},'Google konnte nicht geladen werden. Prüfe deine Verbindung oder einen Inhaltsblocker.'))}}

/* ---------- Login & Willkommen ---------- */
async function openLogin(){
  const r=await api('/me');st.cfg=r.cfg||st.cfg;
  if(r.me){setMe(r.me,r.counts);toast({text:'Du bist schon angemeldet.'});return}
  if(r.pending){openOnboarding(r.hasEmail);return}
  const msg=h('p',{class:'cx-err',role:'alert'});
  const g=h('div',{class:'cx-gwrap'});
  const d=dialog('Anmelden',h('div',{class:'cx-dlg-b cx-login-b'},
    h('div',{class:'cx-hero'},h('span',{class:'cx-hero-av'},avatar(0,56),avatar(9,56),avatar(19,56)),h('p',{class:'cx-lead'},'Dein Lewolux-Konto: Freunde, Chat, Favoriten und Spielzeit-Statistik. Kostenlos.')),
    h('ul',{class:'cx-perks'},h('li',null,h('span',{class:'cx-ic',svg:I.users}),'Freunde finden und sehen, wer gerade was spielt'),h('li',null,h('span',{class:'cx-ic',svg:I.chat}),'Chatten mit deinen Freunden'),h('li',null,h('span',{class:'cx-ic',svg:I.heart}),'Lieblingsspiele merken und sortieren'),h('li',null,h('span',{class:'cx-ic',svg:I.trophy}),'In den Bestenlisten der Spiele auftauchen (wenn du willst)')),
    g,msg,
    h('p',{class:'cx-fine'},'Spielen geht weiterhin ohne Konto. Die Anmeldung läuft über Google; Google wird erst jetzt geladen. Wir bekommen von Google nur eine anonyme Kennung, deine E-Mail-Adresse speichern wir nur, wenn du den Newsletter möchtest. ',h('a',{href:'/datenschutz/#konto'},'Datenschutz')),
  ),{label:'Anmelden'});
  googleButton(g,async cred=>{msg.textContent='';const j=await api('/login',{credential:cred});
    if(!j.ok){msg.textContent=j.msg||'Anmeldung fehlgeschlagen.';return}
    d.close();if(j.pending)openOnboarding(j.hasEmail);else{setMe(j.me,j.counts);toast({kind:'ok',text:`Willkommen zurück, ${j.me.nick}!`})}},{oneTap:true})}

function avatarPicker(cur,onPick){const grid=h('div',{class:'cx-avgrid',role:'radiogroup','aria-label':'Profilbild'});
  for(let i=0;i<24;i++){const b=h('button',{type:'button',role:'radio','aria-checked':String(i===cur),'aria-label':`Profilbild ${i+1}: ${AV_NAMES[i]}`,class:'cx-avopt',onclick:()=>{$$('.cx-avopt',grid).forEach(x=>x.setAttribute('aria-checked','false'));b.setAttribute('aria-checked','true');onPick(i)}},avatar(i,52));grid.append(b)}
  return grid}
function toggle(label,desc,checked,onChange){const id='cxt'+(++avUid);const inp=h('input',{type:'checkbox',id,class:'cx-sw-in',checked:checked||null,onchange:()=>onChange&&onChange(inp.checked,inp)});
  return h('div',{class:'cx-toggle'},inp,h('label',{for:id},h('span',{class:'cx-sw','aria-hidden':'true'}),h('span',{class:'cx-tg-t'},h('b',null,label),desc?h('small',null,desc):null)))}
function nickField(initial,self,label=true){const inp=h('input',{type:'text',class:'cx-in',value:initial||'',maxlength:20,autocomplete:'off',autocapitalize:'off',spellcheck:'false','aria-describedby':'cxNickHint',placeholder:'Dein Spielername'});
  const hint=h('small',{class:'cx-hint',id:'cxNickHint'},'3–20 Zeichen: Buchstaben, Ziffern, _ und -');let t=0,okNow=false;
  const check=async()=>{const v=inp.value.trim();if(!v||(self&&v===initial)){hint.className='cx-hint';hint.textContent='3–20 Zeichen: Buchstaben, Ziffern, _ und -';okNow=!!v;return}
    const j=await api('/nick',{nick:v,self:self||0});if(inp.value.trim()!==v)return;okNow=!!j.ok;hint.className='cx-hint '+(j.ok?'ok':'bad');hint.textContent=j.ok?'✓ Name ist frei':(j.msg||'Nicht möglich')};
  inp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(check,350)});
  return{el:h('label',{class:'cx-field'},label?h('span',null,'Spielername'):null,inp,hint),inp,check,get ok(){return okNow}}}

function openOnboarding(hasEmail){let av=Math.floor(Math.random()*24),pub=false,nl=false;
  const nf=nickField('');const msg=h('p',{class:'cx-err',role:'alert'});const big=h('div',{class:'cx-ob-av'},avatar(av,84));
  const btn=h('button',{type:'submit',class:'cx-btn cx-pri lg'},'Konto erstellen');
  let created=false;
  const form=h('form',{class:'cx-dlg-b cx-ob',onsubmit:async e=>{e.preventDefault();msg.textContent='';btn.disabled=true;
      const j=await api('/onboard',{nick:nf.inp.value.trim(),avatar:av,public:pub,newsletter:nl});btn.disabled=false;
      if(!j.ok){msg.textContent=j.msg||'Das hat nicht geklappt.';return}
      created=true;d.close();setMe(j.me,j.counts);toast({kind:'ok',title:`Willkommen, ${j.me.nick}!`,text:'Dein Konto ist fertig. Viel Spaß!'})}},
    h('div',{class:'cx-ob-top'},big,h('div',{class:'cx-grow'},nf.el)),
    h('p',{class:'cx-label'},'Profilbild wählen'),avatarPicker(av,i=>{av=i;big.textContent='';big.append(avatar(i,84))}),
    h('div',{class:'cx-box'},toggle('In Spiel-Statistiken mit meinem Namen erscheinen','Aus: Bei „Zuletzt gespielt“ und „Meiste Spielzeit“ stehst du als „Unbekannter Spieler“. Freunde sehen dich trotzdem. Jederzeit änderbar.',false,v=>pub=v),
      hasEmail?toggle('Newsletter abonnieren (freiwillig)','Neuigkeiten zu neuen Spielen per E-Mail. Nur dann speichern wir deine E-Mail-Adresse von Google. Abmeldung jederzeit in den Einstellungen.',false,v=>nl=v):null),
    msg,h('div',{class:'cx-row end'},h('button',{type:'button',class:'cx-btn',onclick:()=>d.close()},'Abbrechen'),btn),
    h('p',{class:'cx-fine'},'Mit „Konto erstellen“ legst du ein kostenloses Lewolux-Konto an (ab 16 Jahren). Gespeichert werden Spielername, Profilbild, deine Einstellungen und – nur für Freunde sichtbar – dein Online-Status. Details im ',h('a',{href:'/datenschutz/#konto'},'Datenschutz'),'.'));
  const d=dialog('Willkommen bei Lewolux!',form,{wide:true,onClose:()=>{if(!created)api('/logout',{})}});setTimeout(()=>nf.inp.focus(),60)}

/* ---------- Anmelden / Abmelden ---------- */
function setMe(me,counts){const was=!!st.me;st.me=me;st.favs=me.favs||[];if(counts)st.counts=counts;LS.set('lxC','1');renderSlot();decorate();
  if(!was){connect();if(st.playing)beatNow();}}
function loggedOut(){st.me=null;st.friends=null;st.favs=[];LS.set('lxC',null);stopLive();closePanel();closeMenu();renderSlot();decorate()}
async function logout(){await api('/logout',{});try{window.google&&google.accounts.id.disableAutoSelect()}catch(_){}loggedOut();toast('Du bist abgemeldet.')}
async function setStatus(s){const j=await api('/profile',{status:s});if(j.ok){st.me=j.me;renderSlot()}}

/* ---------- Live-Verbindung (WebSocket mit Hibernation, sonst Abfragen) ---------- */
let pingT=0,pongT=0,retryT=0;
function connect(){if(!st.me||st.ws)return;let ws;
  try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/c/ws')}catch(_){startPoll();scheduleRetry();return}
  st.ws=ws;
  ws.onopen=()=>{st.wsOk=true;st.wsTries=0;stopPoll();sendAct();clearInterval(pingT);pingT=setInterval(()=>{try{ws.send('ping')}catch(_){}clearTimeout(pongT);pongT=setTimeout(()=>{try{ws.close()}catch(_){}},10000)},25000)};
  ws.onmessage=e=>{if(e.data==='pong'){clearTimeout(pongT);return}let m;try{m=JSON.parse(e.data)}catch(_){return}onLive(m)};
  ws.onclose=e=>{clearInterval(pingT);clearTimeout(pongT);st.ws=null;st.wsOk=false;if(!st.me)return;if(e.code===4001||e.code===4002){if(e.code===4002)loggedOut();return}startPoll();scheduleRetry()};
  ws.onerror=()=>{}}
function scheduleRetry(){clearTimeout(retryT);st.wsTries++;const d=Math.min(60000,1000*2**Math.min(6,st.wsTries))*(0.7+Math.random()*0.6);retryT=setTimeout(connect,d)}
function stopLive(){clearTimeout(retryT);clearInterval(pingT);clearTimeout(pongT);if(st.ws){try{st.ws.close(1000)}catch(_){}st.ws=null}stopPoll();clearInterval(st.beatT);st.beatT=0}
function startPoll(){if(st.pollT||!st.me)return;sync();st.pollT=setInterval(sync,25000)}
function stopPoll(){clearInterval(st.pollT);st.pollT=0}
function sendAct(){if(st.ws&&st.wsOk)try{st.ws.send(JSON.stringify({t:'act',game:st.playing}))}catch(_){}}
async function sync(){if(!st.me)return;const j=await api('/sync');if(!j.ok||!j.me)return;st.me=j.me;st.favs=j.me.favs||st.favs;st.counts=j.counts;renderSlot();(j.notifs||[]).slice().reverse().forEach(showNotif);if(st.panel&&st.tab==='freunde')loadFriends()}
let frT=0;function friendsDirty(){clearTimeout(frT);frT=setTimeout(()=>{if(st.panel)loadFriends();else refreshCounts()},250)}
async function refreshCounts(){const j=await api('/sync');if(j.ok&&j.me){st.counts=j.counts;renderSlot()}}
function onLive(m){
  if(m.t==='hello'){st.counts=m.counts||st.counts;renderSlot();sync();return}
  if(m.t==='presence'){if(st.friends){const f=st.friends.friends.find(x=>x.id===m.id);if(f){Object.assign(f,{on:m.on,st:m.st,game:m.game});updatePresence(f)}}return}
  if(m.t==='friends'){friendsDirty();return}
  if(m.t==='notif'){showNotif(m.n);refreshCounts();if(m.n.kind==='freq'||m.n.kind==='facc')friendsDirty();return}
  if(m.t==='read'){if(st.chatWith===m.id)$$('.cx-msg.mine',st.panel).forEach(x=>x.classList.add('seen'));return}
  if(m.t==='msg'){const other=m.from?m.from.id:m.to;
    if(st.panel&&st.tab==='chat'&&st.chatWith===other){appendMsg(m.m);if(m.from&&!document.hidden)api('/messages/read',{with:other})}
    else if(m.from){st.counts.unread++;renderSlot();toast({av:m.from.avatar,title:m.from.nick,text:m.m.body.length>90?m.m.body.slice(0,90)+'…':m.m.body,actions:[{label:'Antworten',primary:true,fn:()=>openPanel('chat',m.from.id)}]})}
    if(st.friends){const f=st.friends.friends.find(x=>x.id===other);if(f){f.last={mine:m.m.mine,body:m.m.body.slice(0,80),at:m.m.at};if(m.from&&st.chatWith!==other)f.unread=(f.unread||0)+1}if(st.panel&&st.tab==='chat'&&!st.chatWith)renderChatList();if(f&&st.panel&&st.tab==='freunde'){const row=$(`.cx-fr[data-id="${f.id}"]`,st.panel),cb=row&&$('button[aria-label^="Chat"]',row);if(cb){let bd=$('.cx-badge',cb);if(!bd)bd=cb.appendChild(h('b',{class:'cx-badge sm'}));bd.textContent=f.unread||'';bd.hidden=!f.unread}}}}}
function showNotif(n){if(!n||st.shown.has(n.id))return;st.shown.add(n.id);const f=n.from||{nick:'Jemand',avatar:0};
  const seen=()=>api('/notifs/seen',{ids:[n.id]});
  if(n.kind==='freq'){toast({av:f.avatar,title:'Freundschaftsanfrage',text:`${f.nick} möchte mit dir befreundet sein.`,actions:[{label:'Annehmen',primary:true,fn:async()=>{const j=await api('/friends/respond',{id:f.id,accept:true});toast(j.ok?`Du bist jetzt mit ${f.nick} befreundet.`:(j.msg||'Nicht möglich.'));friendsDirty()}},{label:'Ansehen',fn:()=>openPanel('freunde')}]});seen()}
  else if(n.kind==='facc'){toast({av:f.avatar,kind:'ok',title:'Neue Freundschaft',text:`${f.nick} hat deine Anfrage angenommen.`});seen()}
  else if(n.kind==='inv'){seen();if(!GAMES.has(n.game))return;toast({av:f.avatar,title:'Zusammen spielen?',text:`${f.nick} lädt dich zu ${gname(n.game)} ein.`,note:'Vorbereitung für Mehrspieler: Ihr startet das Spiel gleichzeitig, jeder für sich.',ms:60000,
      actions:[{label:'Annehmen',primary:true,fn:async()=>{await api('/invite/answer',{id:n.id,accept:true});openGame(n.game)}},{label:'Später',fn:()=>api('/invite/answer',{id:n.id,accept:false})}]})}
  else if(n.kind==='inv_ok'){toast({av:f.avatar,kind:'ok',title:'Einladung angenommen',text:`${f.nick} startet jetzt ${gname(n.game)}.`,actions:[{label:'Auch starten',primary:true,fn:()=>openGame(n.game)}]});seen()}}
function openGame(id){closePanel();const g=GAMES.get(id);if(!g)return;
  const b=h('button',{type:'button',hidden:true,data:{open:id,mode:'demo'}});document.body.appendChild(b);b.click();b.remove();
  if(!$('#modal'))location.href=(g.page||('/spiele/'+id+'/'))}

/* ---------- Spielzeit & "spielt gerade" ---------- */
document.addEventListener('lx:play',e=>{const id=e.detail&&e.detail.id;const g=id&&GAMES.has(id)?id:null;if(g===st.playing)return;st.playing=g;sendAct();
  clearInterval(st.beatT);st.beatT=0;if(!st.me)return;if(g){beatNow();st.beatT=setInterval(beatNow,30000)}else api('/beat',{game:null,vis:!document.hidden})});
let firstBeat=null;
function beatNow(){if(!st.me||!st.playing)return;const g=st.playing;api('/beat',{game:g,vis:!document.hidden}).then(()=>{
  // Nach dem ersten Signal die Statistik neu laden, damit man sich selbst bei „Zuletzt gespielt von“ sieht
  if(firstBeat!==g){firstBeat=g;const b=st.modal===g?$('#modal .cx-gstats'):(pageGame===g?$('.g-hero .cx-gstats'):null);if(b)setTimeout(()=>renderStats(b,g,true),300)}})}
document.addEventListener('visibilitychange',()=>{if(st.me&&st.playing)beatNow()});
addEventListener('pagehide',()=>{if(st.me&&st.playing)try{fetch('/api/c/beat',{method:'POST',keepalive:true,credentials:'same-origin',headers:{'X-Lwx':'1','Content-Type':'application/json'},body:JSON.stringify({game:null,vis:false})})}catch(_){}});

/* ---------- Spiel-Statistik (Modal & Spielseite) ---------- */
function chip(p,extra){const anon=!!p.anon;const c=h('span',{class:'cx-chip'+(anon?' anon':''),style:anon?'':`--c:${avColor(p.avatar)}`},avatar(p.avatar,26,anon),h('span',{class:'cx-chip-n'},anon?'Unbekannter Spieler':p.nick),extra||null);return c}
async function renderStats(box,id,fresh){box.dataset.game=id;if(!box.firstChild)box.classList.add('loading');const j=await api('/stats?game='+encodeURIComponent(id)+(fresh?'&t='+Date.now():''));if(box.dataset.game!==id)return;box.classList.remove('loading');
  box.textContent='';const head=h('div',{class:'cx-gs-head'},h('span',{class:'cx-ic',svg:I.users}),h('b',null,'Community'));box.append(head);
  if(!j.ok){box.append(h('p',{class:'cx-gs-empty'},'Statistik gerade nicht verfügbar.'));return}
  const medals=['🥇','🥈','🥉'];
  box.append(h('div',{class:'cx-gs-row'},h('p',{class:'cx-gs-h'},'Zuletzt gespielt von'),j.recent.length?h('div',{class:'cx-chips'},...j.recent.map(p=>chip(p))):h('p',{class:'cx-gs-empty'},'Noch niemand – sei die oder der Erste!')),
    h('div',{class:'cx-gs-row'},h('p',{class:'cx-gs-h'},'Meiste Spielzeit'),j.top.length?h('ol',{class:'cx-chips cx-top'},...j.top.map((p,i)=>h('li',null,h('span',{class:'cx-medal','aria-label':`Platz ${i+1}`},medals[i]),chip(p,h('span',{class:'cx-chip-t'},fmtDur(p.ms)))))):h('p',{class:'cx-gs-empty'},'Noch keine Bestenliste.')));
  if(!st.me)box.append(h('p',{class:'cx-gs-note'},'Gezählt werden angemeldete Spieler. ',h('button',{type:'button',class:'cx-link',onclick:openLogin},'Anmelden')));
  else if(!st.me.public)box.append(h('p',{class:'cx-gs-note'},'Du erscheinst hier als „Unbekannter Spieler“. ',h('button',{type:'button',class:'cx-link',onclick:()=>openPanel('settings')},'Ändern')))}
function statsBox(){return h('section',{class:'cx-gstats','aria-label':'Community-Statistik'})}
document.addEventListener('lx:modal',e=>{const id=e.detail&&e.detail.id;st.modal=id&&GAMES.has(id)?id:null;decorateModal()});
function decorateModal(){const side=$('#modal .m-side'),head=$('#modal .m-head');if(!side)return;
  let box=$('.cx-gstats',side),heart=head&&$('.cx-heart',head);
  if(!st.modal){if(box)box.remove();if(heart)heart.remove();return}
  if(!box){box=statsBox();side.insertBefore(box,side.children[1]||null)}renderStats(box,st.modal);
  if(heart)heart.remove();if(st.me&&head){heart=heartBtn(st.modal,'cx-heart m');head.insertBefore(heart,$('.icon-btn',head))}}

/* ---------- Favoriten ---------- */
function heartBtn(id,cls){const on=st.favs.includes(id);const b=h('button',{type:'button',class:(cls||'cx-heart')+(on?' on':''),'aria-pressed':String(on),'aria-label':(on?'Aus Favoriten entfernen: ':'Zu Favoriten: ')+gname(id),title:on?'Favorit entfernen':'Als Favorit merken',data:{fav:id},svg:I.heart,
  onclick:e=>{e.preventDefault();e.stopPropagation();toggleFav(id)}});return b}
async function toggleFav(id){if(!st.me){openLogin();return}const on=!st.favs.includes(id);
  st.favs=on?[...st.favs,id]:st.favs.filter(x=>x!==id);syncHearts();if(favMode)applyFavFilter();
  const j=await api('/fav',{game:id,on});if(j.ok){st.favs=j.favs;if(st.me)st.me.favs=j.favs}else toast(j.msg||'Das hat nicht geklappt.');syncHearts();if(favMode)applyFavFilter();
  if(on)toast({kind:'ok',text:`${gname(id)} ist jetzt ein Favorit.`,ms:2600})}
function syncHearts(){$$('[data-fav]').forEach(b=>{const on=st.favs.includes(b.dataset.fav);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',(on?'Aus Favoriten entfernen: ':'Zu Favoriten: ')+gname(b.dataset.fav));if(b.classList.contains('cx-favbtn')){const t=$('.cx-fb-t',b);if(t)t.textContent=on?'Favorit':'Merken'}})}
function cards(){return $$('#grid .card[id^="spiel-"]').filter(c=>GAMES.has(c.id.slice(6)))}
function decorate(){
  // Herzen auf den Spielkarten
  cards().forEach(c=>{const media=$('.media',c);let b=media&&$('.cx-heart',media);if(st.me&&media&&!b)media.appendChild(heartBtn(c.id.slice(6)));if(!st.me&&b)b.remove()});
  // Spielseite
  if(pageGame&&GAMES.has(pageGame)){const act=$('.g-hero .g-actions');let fb=act&&$('.cx-favbtn',act);
    if(st.me&&act&&!fb){const on=st.favs.includes(pageGame);fb=h('button',{type:'button',class:'btn btn-ghost cx-favbtn'+(on?' on':''),data:{fav:pageGame},'aria-pressed':String(on),onclick:()=>toggleFav(pageGame)},h('span',{class:'cx-ic',svg:I.heart}),h('span',{class:'cx-fb-t'},on?'Favorit':'Merken'));act.appendChild(fb)}
    if(!st.me&&fb)fb.remove();
    let box=$('.g-hero .cx-gstats');if(!box&&act){box=statsBox();box.classList.add('page');(act.parentElement).insertBefore(box,act.nextSibling)}if(box)renderStats(box,pageGame)}
  // Filter-Chip "Meine Favoriten"
  const fl=$('#filters');let chipB=fl&&$('[data-f="fav"]',fl);
  if(st.me&&fl&&!chipB){chipB=h('button',{'aria-pressed':'false',data:{f:'fav'},class:'cx-favchip'},h('span',{class:'cx-ic',svg:I.heart}),'Meine Favoriten');fl.appendChild(chipB)}
  if(!st.me&&chipB){if(chipB.getAttribute('aria-pressed')==='true'){const all=$('[data-f="all"]',fl);all&&all.click()}chipB.remove()}
  syncHearts();decorateModal()}
let favMode=false,emptyEl=null;
const filtersEl=$('#filters');
// Läuft nach dem Filter aus app.js (setTimeout), egal in welcher Reihenfolge die Skripte geladen wurden
if(filtersEl)filtersEl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setTimeout(()=>{if(b.dataset.f==='fav'){favMode=true;applyFavFilter()}else if(favMode){favMode=false;clearFavFilter()}},0)});
function applyFavFilter(){const grid=$('#grid');if(!grid)return;grid.classList.add('cx-favmode');
  $$('#grid > .card').forEach(c=>{const id=c.id.slice(6),i=st.favs.indexOf(id),on=i>=0&&GAMES.has(id);c.hidden=!on;c.style.order=on?String(i):'';c.style.gridColumn='auto';
    let bar=$('.cx-favbar',c);if(on&&!bar){bar=h('div',{class:'cx-favbar'},h('span',{class:'cx-grip','aria-hidden':'true',svg:I.drag}),h('span',{class:'cx-fb-hint'},matchMedia('(pointer:coarse)').matches?'Gedrückt halten & ziehen':'Ziehen zum Sortieren'),
      h('button',{type:'button',class:'cx-mv','aria-label':'Nach vorne',svg:I.left,onclick:ev=>{ev.stopPropagation();moveFav(id,-1)}}),h('button',{type:'button',class:'cx-mv','aria-label':'Nach hinten',svg:I.right,onclick:ev=>{ev.stopPropagation();moveFav(id,1)}}));c.prepend(bar);enableDrag(c)}
    if(!on&&bar)bar.remove()});
  const n=st.favs.filter(id=>GAMES.has(id)).length;
  if(!n){if(!emptyEl)emptyEl=h('div',{class:'cx-favempty'},h('span',{class:'cx-ic',svg:I.heart}),h('b',null,'Noch keine Favoriten'),h('span',null,'Tippe auf das Herz bei einem Spiel, dann erscheint es hier. Die Reihenfolge kannst du per Ziehen ändern.'));grid.appendChild(emptyEl)}
  else if(emptyEl){emptyEl.remove()}}
function clearFavFilter(){const grid=$('#grid');if(grid)grid.classList.remove('cx-favmode');if(emptyEl){emptyEl.remove()}$$('#grid > .card').forEach(c=>{c.style.order='';const b=$('.cx-favbar',c);if(b)b.remove()})}
function moveFav(id,d){const i=st.favs.indexOf(id),j=i+d;if(i<0||j<0||j>=st.favs.length)return;const a=st.favs.slice();[a[i],a[j]]=[a[j],a[i]];st.favs=a;applyFavFilter();saveOrder();
  const c=document.getElementById('spiel-'+id);const btn=c&&$$('.cx-mv',c)[d<0?0:1];btn&&btn.focus({preventScroll:true})}
let saveT=0;function saveOrder(){clearTimeout(saveT);saveT=setTimeout(async()=>{const j=await api('/fav/order',{order:st.favs});if(j.ok){st.favs=j.favs;toast({kind:'ok',text:'Reihenfolge gespeichert.',ms:1800})}else toast(j.msg||'Speichern hat nicht geklappt.')},400)}
function showFavorites(){const home=document.getElementById('spiele');if(!home||!$('#filters')){location.href='/#favoriten';return}
  const b=$('#filters [data-f="fav"]');if(b&&b.getAttribute('aria-pressed')!=='true')b.click();home.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})}

/* Ziehen & Ablegen: Maus sofort, Touch nach langem Drücken (400 ms) */
function enableDrag(card){if(card.dataset.cxDrag)return;card.dataset.cxDrag='1';
  let drag=null,lp=0,start=null,suppress=false,raf=0;
  // Am oberen/unteren Rand automatisch weiterscrollen, solange gezogen wird (wichtig bei hohen Karten am Handy)
  const edge=()=>{if(!drag)return;const z=Math.max(60,innerHeight*.14),y=drag.y;let v=0;if(y<z)v=-Math.ceil((z-y)/z*18);else if(y>innerHeight-z)v=Math.ceil((y-innerHeight+z)/z*18);if(v){scrollBy(0,v);move(drag.x,drag.y)}raf=requestAnimationFrame(edge)};
  const begin=(x,y)=>{if(!favMode)return;const r=card.getBoundingClientRect();drag={gx:x-r.left,gy:y-r.top,tx:0,ty:0,x,y};card.classList.add('cx-dragging');document.documentElement.classList.add('cx-dragging-on');try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}cancelAnimationFrame(raf);raf=requestAnimationFrame(edge)};
  const move=(x,y)=>{if(!drag)return;drag.x=x;drag.y=y;const r=card.getBoundingClientRect(),bx=r.left-drag.tx,by=r.top-drag.ty;
    card.style.pointerEvents='none';const under=document.elementFromPoint(x,y);card.style.pointerEvents='';
    const tgt=under&&under.closest&&under.closest('#grid > .card');
    if(tgt&&tgt!==card&&!tgt.hidden){const a=st.favs.slice(),from=a.indexOf(card.id.slice(6)),to=a.indexOf(tgt.id.slice(6));if(from>=0&&to>=0&&from!==to){a.splice(from,1);a.splice(to,0,card.id.slice(6));st.favs=a;a.forEach((id,i)=>{const c=document.getElementById('spiel-'+id);if(c)c.style.order=String(i)})}}
    const r2=card.getBoundingClientRect(),nbx=r2.left-drag.tx,nby=r2.top-drag.ty;void bx;void by;
    drag.tx=x-drag.gx-nbx;drag.ty=y-drag.gy-nby;card.style.transform=`translate(${drag.tx}px,${drag.ty}px) scale(1.03)`};
  const end=()=>{clearTimeout(lp);cancelAnimationFrame(raf);if(!drag)return;drag=null;card.classList.remove('cx-dragging');document.documentElement.classList.remove('cx-dragging-on');card.style.transform='';suppress=true;setTimeout(()=>suppress=false,350);saveOrder()};
  card.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopPropagation()}},true);
  card.addEventListener('dragstart',e=>{if(favMode)e.preventDefault()});
  // Maus / Stift
  card.addEventListener('pointerdown',e=>{if(!favMode||e.pointerType==='touch'||e.button!==0||e.target.closest('.cx-mv,.cx-heart,a,input'))return;start={x:e.clientX,y:e.clientY,id:e.pointerId}});
  addEventListener('pointermove',e=>{if(!start||e.pointerId!==start.id)return;if(!drag&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8){begin(start.x,start.y);try{card.setPointerCapture(e.pointerId)}catch(_){}}if(drag){e.preventDefault();move(e.clientX,e.clientY)}});
  addEventListener('pointerup',e=>{if(start&&e.pointerId===start.id){start=null;end()}});addEventListener('pointercancel',()=>{start=null;end()});
  // Touch: langes Drücken
  card.addEventListener('touchstart',e=>{if(!favMode||e.touches.length!==1||e.target.closest('.cx-mv,.cx-heart'))return;const t=e.touches[0],sx=t.clientX,sy=t.clientY;start=null;
    clearTimeout(lp);lp=setTimeout(()=>begin(sx,sy),400);card._t0={x:sx,y:sy}},{passive:true});
  card.addEventListener('touchmove',e=>{const t=e.touches[0];if(drag){e.preventDefault();move(t.clientX,t.clientY);return}if(card._t0&&Math.hypot(t.clientX-card._t0.x,t.clientY-card._t0.y)>10)clearTimeout(lp)},{passive:false});
  card.addEventListener('touchend',()=>{clearTimeout(lp);end()});card.addEventListener('touchcancel',()=>{clearTimeout(lp);end()});
  card.addEventListener('contextmenu',e=>{if(favMode&&(drag||e.pointerType==='touch'||matchMedia('(pointer:coarse)').matches))e.preventDefault()})}

/* ---------- Seitenleiste: Profil, Freunde, Nachrichten, Einstellungen ---------- */
const TABS=[['profil','Profil',I.user],['freunde','Freunde',I.users],['chat','Nachrichten',I.chat],['settings','Einstellungen',I.gear]];
let panelBody=null,tabBtns={};
function openPanel(tab,chatWith){if(!st.me){openLogin();return}closeMenu();
  if(!st.panel){const prev=document.activeElement;
    panelBody=h('div',{class:'cx-pb'});
    const nav=h('nav',{class:'cx-tabs',role:'tablist','aria-label':'Community'},...TABS.map(([k,l,ic])=>tabBtns[k]=h('button',{type:'button',role:'tab',class:'cx-tab',data:{k},onclick:()=>{st.chatWith=null;showTab(k)}},h('span',{class:'cx-ic',svg:ic}),h('span',{class:'cx-tab-l'},l),h('b',{class:'cx-pill',hidden:true}))));
    st.panel=h('div',{class:'cx-panel',role:'dialog','aria-modal':'true','aria-label':'Community'},h('div',{class:'cx-panel-bg',onclick:closePanel}),
      h('aside',{class:'cx-sheet'},h('div',{class:'cx-sh-h'},avatar(st.me.avatar,34),h('div',{class:'cx-sh-who'},h('b',null,st.me.nick),h('small',null,STATUS[st.me.status])),h('button',{type:'button',class:'cx-icon','aria-label':'Schließen',svg:I.x,onclick:closePanel})),nav,panelBody));
    st.panel._prev=prev;document.body.appendChild(st.panel);document.documentElement.classList.add('cx-lock','cx-panel-open');requestAnimationFrame(()=>st.panel&&st.panel.classList.add('in'))}
  st.chatWith=chatWith||null;showTab(tab||'profil')}
function closePanel(){if(!st.panel)return;const p=st.panel;st.panel=null;st.chatWith=null;p.classList.remove('in');document.documentElement.classList.remove('cx-panel-open');setTimeout(()=>p.remove(),reduce?0:260);if(!dlgStack.length)document.documentElement.classList.remove('cx-lock');try{p._prev&&p._prev.focus({preventScroll:true})}catch(_){}}
function updateTabBadges(){if(!st.panel)return;const set=(k,n)=>{const b=$('.cx-pill',tabBtns[k]);b.hidden=!n;b.textContent=n>99?'99+':n};set('freunde',st.counts.requests);set('chat',st.counts.unread);
  const who=$('.cx-sh-who',st.panel);if(who){who.firstChild.textContent=st.me.nick;who.lastChild.textContent=st.playing?'spielt gerade '+gname(st.playing):STATUS[st.me.status]}
  const av=$('.cx-sh-h > .cx-av',st.panel);if(av)av.replaceWith(avatar(st.me.avatar,34))}
function showTab(k){st.tab=k;Object.entries(tabBtns).forEach(([n,b])=>{b.setAttribute('aria-selected',String(n===k));b.tabIndex=n===k?0:-1});updateTabBadges();panelBody.textContent='';panelBody.scrollTop=0;
  ({profil:viewProfile,freunde:viewFriends,chat:viewChat,settings:viewSettings})[k]()}
const sec=(title,...kids)=>h('section',{class:'cx-sec'},title?h('h3',{class:'cx-h'},title):null,...kids);
const loading=()=>h('div',{class:'cx-loading'},h('span',{class:'cx-spin'}),'Lädt …');

async function viewProfile(){const me=st.me;
  const statusSeg=h('div',{class:'cx-seg wide',role:'group','aria-label':'Status'},...['online','busy','invisible'].map(s=>h('button',{type:'button','aria-pressed':String(me.status===s),onclick:async()=>{await setStatus(s);showTab('profil')}},h('i',{class:'cx-dot st-'+s}),STATUS[s])));
  const plays=h('div',null,loading());
  panelBody.append(h('div',{class:'cx-prof'},h('div',{class:'cx-prof-av',style:`--c:${avColor(me.avatar)}`},avatar(me.avatar,92),h('i',{class:'cx-dot big st-'+me.status})),
      h('div',null,h('p',{class:'cx-prof-n'},me.nick),h('p',{class:'cx-muted'},st.playing?'Spielt gerade '+gname(st.playing):'Dabei seit '+new Date(me.created).toLocaleDateString('de-DE',{month:'long',year:'numeric'})),
        h('p',{class:'cx-muted sm'},me.public?'In Bestenlisten sichtbar':'In Bestenlisten als „Unbekannter Spieler“'))),
    sec('Status',statusSeg,h('p',{class:'cx-fine'},'„Unsichtbar“: Freunde sehen dich offline. „Beschäftigt“: Freunde sehen, dass du gerade keine Zeit hast. Was du spielst, sehen nur deine Freunde.')),
    sec('Deine Spielzeit',plays),
    sec(null,h('div',{class:'cx-row'},h('button',{type:'button',class:'cx-btn',onclick:showFavorites},h('span',{class:'cx-ic',svg:I.heart}),`Favoriten (${st.favs.filter(x=>GAMES.has(x)).length})`),h('button',{type:'button',class:'cx-btn',onclick:()=>showTab('freunde')},h('span',{class:'cx-ic',svg:I.users}),'Freunde'))));
  const j=await api('/plays');plays.textContent='';
  if(!j.ok||!j.plays.length){plays.append(h('p',{class:'cx-empty'},'Noch keine Spielzeit. Starte ein Spiel – angemeldet zählt jede Minute.'));return}
  const max=Math.max(...j.plays.map(p=>p.ms),1);
  plays.append(h('ul',{class:'cx-plays'},...j.plays.filter(p=>GAMES.has(p.game)).map(p=>{const g=GAMES.get(p.game);return h('li',{style:`--accent:${g.accent||'#3be8ff'}`},
    h('button',{type:'button',class:'cx-play-row',onclick:()=>openGame(p.game)},h('img',{src:g.shotImgs&&g.shotImgs[0],alt:'',width:56,height:32,loading:'lazy'}),h('span',{class:'cx-grow'},h('b',null,g.short),h('i',{class:'cx-bar'},h('i',{style:`width:${Math.max(4,p.ms/max*100)}%`}))),h('span',{class:'cx-mono'},fmtDur(p.ms))))})))}

async function loadFriends(){const j=await api('/friends');if(!j.ok)return null;st.friends=j;st.counts.requests=j.incoming.length;st.counts.unread=j.friends.reduce((a,f)=>a+(f.unread||0),0);renderSlot();updateTabBadges();
  if(st.panel&&st.tab==='freunde')renderFriends();if(st.panel&&st.tab==='chat'&&!st.chatWith)renderChatList();return j}
function viewFriends(){panelBody.append(loading());if(st.friends)renderFriends();loadFriends()}
function friendRow(f){const row=h('li',{class:'cx-fr',data:{id:f.id}},
    h('div',{class:'cx-fr-av'},avatar(f.avatar,44),h('i',{class:'cx-dot st-'+(f.on?f.st:'offline')})),
    h('div',{class:'cx-fr-t'},h('b',null,f.nick),h('small',{class:'cx-fr-s'+(f.game?' playing':'')},statusLine(f))),
    h('div',{class:'cx-fr-a'},
      h('button',{type:'button',class:'cx-icon','aria-label':`Chat mit ${f.nick}`,title:'Chat',onclick:()=>{st.chatWith=f.id;showTab('chat')}},h('span',{svg:I.chat,class:'cx-ic'}),f.unread?h('b',{class:'cx-badge sm'},f.unread):null),
      h('button',{type:'button',class:'cx-icon','aria-label':`${f.nick} zum Spielen einladen`,title:'Zusammen spielen',onclick:e=>invitePicker(f,e.currentTarget)},h('span',{svg:I.game,class:'cx-ic'})),
      h('button',{type:'button',class:'cx-icon','aria-label':`Mehr zu ${f.nick}`,title:'Mehr',onclick:e=>friendMore(f,e.currentTarget)},h('span',{svg:I.more,class:'cx-ic'}))));return row}
function updatePresence(f){if(!st.panel)return;const row=$(`.cx-fr[data-id="${f.id}"]`,st.panel);if(!row)return;const dot=$('.cx-fr-av .cx-dot',row);dot.className='cx-dot st-'+(f.on?f.st:'offline');const s=$('.cx-fr-s',row);s.textContent=statusLine(f);s.classList.toggle('playing',!!f.game);
  const ch=$('.cx-chat-h small',st.panel);if(ch&&st.chatWith===f.id)ch.textContent=statusLine(f)}
function renderFriends(){if(st.tab!=='freunde'||!st.friends)return;const F=st.friends;panelBody.textContent='';
  const msg=h('p',{class:'cx-formmsg',role:'status'});const inp=h('input',{type:'text',class:'cx-in',placeholder:'Spielername eingeben',maxlength:20,autocomplete:'off',autocapitalize:'off',spellcheck:'false','aria-label':'Spielername deines Freundes'});
  panelBody.append(sec('Freund hinzufügen',h('form',{class:'cx-add',onsubmit:async e=>{e.preventDefault();const n=inp.value.trim();if(!n)return;msg.className='cx-formmsg';msg.textContent='…';
      const j=await api('/friends/request',{nick:n});msg.className='cx-formmsg '+(j.ok?'ok':'bad');msg.textContent=j.ok?(j.state==='friends'?`Ihr seid jetzt befreundet!`:`Anfrage an ${n} gesendet.`):(j.msg||'Nicht möglich.');if(j.ok){inp.value='';loadFriends()}}},
    inp,h('button',{type:'submit',class:'cx-btn cx-pri'},h('span',{class:'cx-ic',svg:I.plus}),'Anfrage')),msg));
  if(F.incoming.length)panelBody.append(sec(`Anfragen (${F.incoming.length})`,h('ul',{class:'cx-list'},...F.incoming.map(u=>h('li',{class:'cx-fr req'},h('div',{class:'cx-fr-av'},avatar(u.avatar,44)),h('div',{class:'cx-fr-t'},h('b',null,u.nick),h('small',null,'möchte mit dir befreundet sein')),
    h('div',{class:'cx-fr-a'},h('button',{type:'button',class:'cx-btn cx-pri sm',onclick:async()=>{const j=await api('/friends/respond',{id:u.id,accept:true});if(!j.ok)toast(j.msg||'Nicht möglich.');loadFriends()}},'Annehmen'),
      h('button',{type:'button',class:'cx-btn sm',onclick:async()=>{await api('/friends/respond',{id:u.id,accept:false});loadFriends()}},'Ablehnen')))))));
  panelBody.append(sec(`Freunde (${F.friends.length})`,F.friends.length?h('ul',{class:'cx-list'},...F.friends.map(friendRow)):h('div',{class:'cx-empty'},h('b',null,'Noch keine Freunde'),h('span',null,'Gib oben den Spielernamen eines Freundes ein. Sobald er annimmt, seht ihr euch online und könnt chatten.'))));
  if(F.outgoing.length)panelBody.append(sec('Gesendete Anfragen',h('ul',{class:'cx-list'},...F.outgoing.map(u=>h('li',{class:'cx-fr dim'},h('div',{class:'cx-fr-av'},avatar(u.avatar,36)),h('div',{class:'cx-fr-t'},h('b',null,u.nick),h('small',null,'wartet auf Antwort')),h('div',{class:'cx-fr-a'},h('button',{type:'button',class:'cx-btn sm',onclick:async()=>{await api('/friends/remove',{id:u.id});loadFriends()}},'Zurückziehen')))))));
  if(F.blocked.length)panelBody.append(h('details',{class:'cx-sec cx-det'},h('summary',null,`Blockiert (${F.blocked.length})`),h('ul',{class:'cx-list'},...F.blocked.map(u=>h('li',{class:'cx-fr dim'},h('div',{class:'cx-fr-av'},avatar(u.avatar,36)),h('div',{class:'cx-fr-t'},h('b',null,u.nick)),h('div',{class:'cx-fr-a'},h('button',{type:'button',class:'cx-btn sm',onclick:async()=>{await api('/friends/unblock',{id:u.id});loadFriends()}},'Freigeben')))))))}
function popover(anchor,content){$$('.cx-pop').forEach(p=>p.remove());const p=h('div',{class:'cx-pop',role:'menu'},content);document.body.appendChild(p);
  const r=anchor.getBoundingClientRect(),pw=p.offsetWidth,ph=p.offsetHeight;let top=r.bottom+6;if(top+ph>innerHeight-8)top=Math.max(8,r.top-ph-6);
  p.style.top=top+'px';p.style.left=Math.max(8,Math.min(innerWidth-pw-8,r.right-pw))+'px';
  const off=e=>{if(!p.contains(e.target)&&e.target!==anchor){p.remove();document.removeEventListener('pointerdown',off,true)}};setTimeout(()=>document.addEventListener('pointerdown',off,true),0);
  const f=$('button',p);f&&f.focus({preventScroll:true});p.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();p.remove();anchor.focus()}});return p}
function invitePicker(f,anchor){const list=[...GAMES.values()].filter(g=>g.play);
  const p=popover(anchor,h('div',{class:'cx-inv'},h('p',{class:'cx-inv-h'},`${f.nick} einladen`),h('p',{class:'cx-fine'},'Vorbereitung für Mehrspieler: Dein Freund bekommt eine Einladung und startet das Spiel mit einem Tipp. Ihr spielt gleichzeitig, jeder für sich.'),
    h('div',{class:'cx-inv-l'},...list.map(g=>h('button',{type:'button',role:'menuitem',class:'cx-inv-g',onclick:async()=>{p.remove();const j=await api('/invite',{to:f.id,game:g.id});toast(j.ok?{kind:'ok',text:`Einladung zu ${g.short} an ${f.nick} gesendet.`}:(j.msg||'Nicht möglich.'))}},h('img',{src:g.shotImgs&&g.shotImgs[0],alt:'',width:48,height:27,loading:'lazy'}),h('span',null,g.short))))))}
function friendMore(f,anchor){const p=popover(anchor,h('div',{class:'cx-more'},
    h('button',{type:'button',role:'menuitem',onclick:async()=>{p.remove();if(await confirmDlg('Freund entfernen?',`${f.nick} wird aus deiner Freundesliste entfernt. Euer Chat ist dann nicht mehr erreichbar.`,'Entfernen',true)){await api('/friends/remove',{id:f.id});loadFriends()}}},h('span',{class:'cx-ic',svg:I.trash}),'Freund entfernen'),
    h('button',{type:'button',role:'menuitem',class:'danger',onclick:async()=>{p.remove();await blockUser(f)}},h('span',{class:'cx-ic',svg:I.shield}),'Blockieren')))}
async function blockUser(f){if(!await confirmDlg(`${f.nick} blockieren?`,`${f.nick} kann dir dann keine Nachrichten, Einladungen oder Anfragen mehr schicken und wird aus deiner Freundesliste entfernt. Du kannst das später rückgängig machen.`,'Blockieren',true))return false;
  const j=await api('/friends/block',{id:f.id});toast(j.ok?`${f.nick} ist blockiert.`:(j.msg||'Nicht möglich.'));st.chatWith=null;await loadFriends();if(st.panel)showTab('freunde');return true}

/* Chat */
let chatList=null,chatInput=null;
async function viewChat(){if(st.chatWith)return openChat(st.chatWith);panelBody.append(loading());if(st.friends)renderChatList();await loadFriends();}
function renderChatList(){if(!st.panel||st.tab!=='chat'||st.chatWith||!st.friends)return;panelBody.textContent='';const F=st.friends.friends.slice().sort((a,b)=>((b.last&&b.last.at)||0)-((a.last&&a.last.at)||0));
  if(!F.length){panelBody.append(h('div',{class:'cx-empty big'},h('span',{class:'cx-ic',svg:I.chat}),h('b',null,'Noch keine Chats'),h('span',null,'Chatten kannst du mit deinen Freunden. Füge zuerst Freunde hinzu.'),h('button',{type:'button',class:'cx-btn cx-pri',onclick:()=>showTab('freunde')},'Zu den Freunden')));return}
  panelBody.append(sec('Unterhaltungen',h('ul',{class:'cx-list'},...F.map(f=>h('li',null,h('button',{type:'button',class:'cx-conv'+(f.unread?' unread':''),onclick:()=>{st.chatWith=f.id;openChat(f.id)}},
    h('div',{class:'cx-fr-av'},avatar(f.avatar,44),h('i',{class:'cx-dot st-'+(f.on?f.st:'offline')})),
    h('div',{class:'cx-fr-t'},h('b',null,f.nick),h('small',null,f.last?(f.last.mine?'Du: ':'')+f.last.body:statusLine(f))),
    h('div',{class:'cx-conv-r'},f.last?h('small',null,fmtTime(f.last.at)):null,f.unread?h('b',{class:'cx-badge sm'},f.unread):null)))))))}
function msgEl(m){const el=h('div',{class:'cx-msg'+(m.mine?' mine':'')+(m.seen?' seen':''),data:{id:m.id}},h('p',null,m.body),h('small',null,fmtTime(m.at),m.mine?h('span',{class:'cx-tick','aria-label':m.seen?'gelesen':'gesendet'},m.seen?' ✓✓':' ✓'):null));
  if(!m.mine)el.append(h('button',{type:'button',class:'cx-rep','aria-label':'Nachricht melden',title:'Melden',svg:I.flag,onclick:()=>reportMsg(m)}));return el}
function appendMsg(m){if(!chatList||$(`.cx-msg[data-id="${m.id}"]`,chatList))return;const near=chatList.scrollHeight-chatList.scrollTop-chatList.clientHeight<120;const e=$('.cx-chat-empty',chatList);if(e)e.remove();chatList.append(msgEl(m));if(near||m.mine)chatList.scrollTop=chatList.scrollHeight}
async function openChat(fid){if(!st.friends)await loadFriends();const f=st.friends&&st.friends.friends.find(x=>x.id===fid);panelBody.textContent='';
  if(!f){panelBody.append(h('div',{class:'cx-empty'},h('b',null,'Chat nicht verfügbar'),h('span',null,'Ihr seid nicht (mehr) befreundet.')));return}
  chatList=h('div',{class:'cx-msgs','aria-live':'polite'},loading());
  const count=h('small',{class:'cx-count'},'0/500');const err=h('p',{class:'cx-formmsg bad',role:'alert'});
  chatInput=h('textarea',{class:'cx-in cx-ta-in',rows:1,maxlength:500,placeholder:`Nachricht an ${f.nick}`,'aria-label':`Nachricht an ${f.nick}`,
    oninput:()=>{const n=[...chatInput.value].length;count.textContent=n+'/500';count.classList.toggle('warn',n>450);chatInput.style.height='auto';chatInput.style.height=Math.min(140,chatInput.scrollHeight)+'px'},
    onkeydown:e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}}});
  const sendB=h('button',{type:'submit',class:'cx-send','aria-label':'Senden',svg:I.send});
  const form=h('form',{class:'cx-compose',onsubmit:async e=>{e.preventDefault();const body=chatInput.value.trim();if(!body)return;sendB.disabled=true;err.textContent='';
    const j=await api('/messages',{to:f.id,body});sendB.disabled=false;if(!j.ok){err.textContent=j.msg||'Senden fehlgeschlagen.';return}chatInput.value='';chatInput.dispatchEvent(new Event('input'));appendMsg(j.m);chatInput.focus()}},chatInput,sendB);
  panelBody.append(h('div',{class:'cx-chat'},
    h('div',{class:'cx-chat-h'},h('button',{type:'button',class:'cx-icon','aria-label':'Zurück zur Übersicht',svg:I.back,onclick:()=>{st.chatWith=null;showTab('chat')}}),
      h('div',{class:'cx-fr-av'},avatar(f.avatar,38),h('i',{class:'cx-dot st-'+(f.on?f.st:'offline')})),h('div',{class:'cx-fr-t'},h('b',null,f.nick),h('small',null,statusLine(f))),
      h('button',{type:'button',class:'cx-icon','aria-label':`${f.nick} zum Spielen einladen`,title:'Zusammen spielen',svg:I.game,onclick:e=>invitePicker(f,e.currentTarget)}),
      h('button',{type:'button',class:'cx-icon','aria-label':'Mehr',title:'Mehr',svg:I.more,onclick:e=>{const p=popover(e.currentTarget,h('div',{class:'cx-more'},
        h('button',{type:'button',role:'menuitem',class:'danger',onclick:async()=>{p.remove();await blockUser(f)}},h('span',{class:'cx-ic',svg:I.shield}),'Blockieren'),
        h('button',{type:'button',role:'menuitem',onclick:async()=>{p.remove();reportUser(f)}},h('span',{class:'cx-ic',svg:I.flag}),'Spieler melden')))}})),
    chatList,err,form,h('div',{class:'cx-chat-f'},h('small',{class:'cx-fine'},'Bleib freundlich. Keine persönlichen Daten teilen. Es werden die letzten 200 Nachrichten gespeichert.'),count)));
  const j=await api('/messages?with='+f.id);chatList.textContent='';
  if(!j.ok){chatList.append(h('p',{class:'cx-chat-empty'},j.msg||'Laden fehlgeschlagen.'));return}
  if(!j.messages.length)chatList.append(h('p',{class:'cx-chat-empty'},`Schreib ${f.nick} die erste Nachricht!`));
  j.messages.forEach(m=>chatList.append(msgEl(m)));chatList.scrollTop=chatList.scrollHeight;
  if(f.unread){st.counts.unread=Math.max(0,st.counts.unread-f.unread);f.unread=0;renderSlot();updateTabBadges()}
  if(matchMedia('(pointer:fine)').matches)chatInput.focus({preventScroll:true})}
async function reportMsg(m){const ok=await confirmDlg('Nachricht melden?','Die Nachricht wird zur Prüfung an Lewolux geschickt. Danke, dass du hilfst, die Community freundlich zu halten.','Melden');if(!ok)return;const j=await api('/report',{msg:m.id});toast(j.ok?{kind:'ok',text:'Danke! Die Nachricht wurde gemeldet.'}:(j.msg||'Nicht möglich.'))}
async function reportUser(f){const ok=await confirmDlg(`${f.nick} melden?`,'Der Spieler wird zur Prüfung an Lewolux gemeldet. Wenn dich jemand belästigt, kannst du ihn zusätzlich blockieren.','Melden');if(!ok)return;const j=await api('/report',{id:f.id,reason:'Spieler gemeldet'});toast(j.ok?{kind:'ok',text:'Danke! Der Spieler wurde gemeldet.'}:(j.msg||'Nicht möglich.'))}

/* Einstellungen */
function viewSettings(){const me=st.me,now=Date.now();
  const nf=nickField(me.nick,me.id,false);nf.inp.setAttribute('aria-label','Spielername');const nmsg=h('p',{class:'cx-formmsg',role:'status'});const locked=me.nickNext>now;
  if(locked){nf.inp.disabled=true}
  const nickSec=sec('Spielername',h('form',{class:'cx-stack',onsubmit:async e=>{e.preventDefault();const v=nf.inp.value.trim();if(v===me.nick)return;
      if(!await confirmDlg('Namen ändern?',`Dein neuer Name ist „${v}“. Danach kannst du ihn 30 Tage lang nicht mehr ändern.`,'Ändern'))return;
      const j=await api('/profile',{nick:v});nmsg.className='cx-formmsg '+(j.ok?'ok':'bad');nmsg.textContent=j.ok?'Gespeichert.':(j.msg||'Nicht möglich.');if(j.ok){st.me=j.me;renderSlot();updateTabBadges();setTimeout(()=>showTab('settings'),900)}}},
    nf.el,h('div',{class:'cx-row'},h('button',{type:'submit',class:'cx-btn cx-pri',disabled:locked||null},'Namen speichern'),h('small',{class:'cx-muted sm'},locked?`Nächste Änderung ab ${new Date(me.nickNext).toLocaleDateString('de-DE')}.`:'Änderbar einmal alle 30 Tage.')),nmsg));
  const avSec=sec('Profilbild',avatarPicker(me.avatar,async i=>{const j=await api('/profile',{avatar:i});if(j.ok){st.me=j.me;renderSlot();updateTabBadges()}}));
  const stSec=sec('Status',h('div',{class:'cx-seg wide',role:'group','aria-label':'Status'},...['online','busy','invisible'].map(s=>h('button',{type:'button','aria-pressed':String(me.status===s),onclick:async e=>{await setStatus(s);$$('button',e.currentTarget.parentNode).forEach(b=>b.setAttribute('aria-pressed',String(b===e.currentTarget)));updateTabBadges()}},h('i',{class:'cx-dot st-'+s}),STATUS[s]))),
    h('p',{class:'cx-fine'},'Dein Status bleibt gespeichert, bis du ihn änderst. Läuft ein Spiel, sehen deine Freunde automatisch „spielt gerade …“ (nicht bei „Unsichtbar“).'));
  const prSec=sec('Privatsphäre',h('div',{class:'cx-box'},toggle('In Spiel-Statistiken mit meinem Namen erscheinen','Bei „Zuletzt gespielt von“ und „Meiste Spielzeit“ auf den Spielseiten. Aus: Du erscheinst als „Unbekannter Spieler“.',me.public,async v=>{const j=await api('/profile',{public:v});if(j.ok){st.me=j.me;const mb=st.modal&&$('#modal .cx-gstats');mb&&renderStats(mb,st.modal,true);if(pageGame){const b=$('.g-hero .cx-gstats');b&&renderStats(b,pageGame,true)}}})));
  const nlState=h('small',{class:'cx-muted sm'},me.newsletter==='off'?'':me.newsletter==='confirmed'?'Angemeldet.':'Angemeldet – Bestätigung ausstehend. Sobald der Newsletter startet, bekommst du eine Mail zum Bestätigen.');
  const nlExtra=h('div');
  const nlSec=sec('Newsletter',h('div',{class:'cx-box'},toggle('Newsletter per E-Mail','Neuigkeiten zu neuen Spielen. Freiwillig, jederzeit abbestellbar. Nur dafür speichern wir deine E-Mail-Adresse.',me.newsletter!=='off',async(v,inp)=>{nlExtra.textContent='';
      if(!v){const j=await api('/newsletter',{on:false});if(j.ok){st.me=j.me;nlState.textContent='Abgemeldet. Deine E-Mail-Adresse wurde gelöscht.'}return}
      const j=await api('/newsletter',{on:true});if(j.ok){st.me=j.me;nlState.textContent='Angemeldet – Bestätigung ausstehend.';return}
      if(j.error==='need_google'){inp.checked=false;nlExtra.append(h('p',{class:'cx-fine'},'Bestätige kurz mit Google, damit wir deine E-Mail-Adresse für den Newsletter übernehmen können:'));
        googleButton(nlExtra,async cred=>{const k=await api('/newsletter',{on:true,credential:cred});if(k.ok){st.me=k.me;inp.checked=true;nlExtra.textContent='';nlState.textContent='Angemeldet – Bestätigung ausstehend.'}else{nlExtra.append(h('p',{class:'cx-err'},k.msg||'Nicht möglich.'))}},{text:'continue_with'})}
      else{inp.checked=false;nlState.textContent=j.msg||'Nicht möglich.'}}),nlState,nlExtra));
  const dataSec=sec('Meine Daten',h('div',{class:'cx-row'},h('button',{type:'button',class:'cx-btn',onclick:exportData},h('span',{class:'cx-ic',svg:I.dl}),'Daten herunterladen (JSON)'),h('button',{type:'button',class:'cx-btn',onclick:logout},h('span',{class:'cx-ic',svg:I.out}),'Abmelden')),
    h('p',{class:'cx-fine'},'Der Export enthält alles, was wir zu deinem Konto speichern: Profil, Freunde, Nachrichten, Favoriten und Spielzeiten. ',h('a',{href:'/datenschutz/#konto'},'Mehr im Datenschutz')));
  const delSec=sec('Konto löschen',h('p',{class:'cx-fine'},'Löscht dein Konto sofort und endgültig: Profil, Freundschaften, alle Nachrichten (auch bei deinen Freunden), Favoriten, Spielzeiten und Statistik-Einträge.'),h('button',{type:'button',class:'cx-btn cx-danger',onclick:deleteFlow},h('span',{class:'cx-ic',svg:I.trash}),'Konto löschen …'));
  delSec.classList.add('cx-dz');
  panelBody.append(nickSec,avSec,stSec,prSec,nlSec,dataSec,delSec)}
async function exportData(){const r=await fetch('/api/c/export',{credentials:'same-origin',headers:{'X-Lwx':'1'}});if(!r.ok){toast('Export fehlgeschlagen.');return}
  const blob=await r.blob(),url=URL.createObjectURL(blob),a=h('a',{href:url,download:'lewolux-meine-daten.json'});document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
function deleteFlow(){const inp=h('input',{type:'text',class:'cx-in',autocomplete:'off','aria-label':'Spielername zur Bestätigung',placeholder:st.me.nick});const msg=h('p',{class:'cx-err',role:'alert'});
  const btn=h('button',{type:'submit',class:'cx-btn cx-danger',disabled:true},'Endgültig löschen');inp.addEventListener('input',()=>btn.disabled=inp.value.trim().toLowerCase()!==st.me.nick.toLowerCase());
  const d=dialog('Konto wirklich löschen?',h('form',{class:'cx-dlg-b',onsubmit:async e=>{e.preventDefault();btn.disabled=true;const j=await api('/delete',{confirm:inp.value.trim()});if(!j.ok){msg.textContent=j.msg||'Nicht möglich.';btn.disabled=false;return}d.close();loggedOut();toast({text:'Dein Konto und alle Daten wurden gelöscht. Schade, dass du gehst!',ms:7000})}},
    h('p',null,'Das kann nicht rückgängig gemacht werden. Alle deine Daten werden sofort gelöscht.'),h('label',{class:'cx-field'},h('span',null,`Zur Bestätigung „${st.me.nick}“ eingeben`),inp),msg,
    h('div',{class:'cx-row end'},h('button',{type:'button',class:'cx-btn',onclick:()=>d.close()},'Abbrechen'),btn)))}

/* ---------- Start ---------- */
(async()=>{await loadCss();renderSlot();
  if(wantFav)try{history.replaceState(null,'',location.pathname+location.search+'#spiele')}catch(_){}
  // Statistik auf der Spielseite gleich zeigen (auch ohne Konto); ein schon offenes Spiel übernehmen
  decorate();const host=$('#demoHost');if(host&&host.dataset.gid&&$('iframe',host))document.dispatchEvent(new CustomEvent('lx:play',{detail:{id:host.dataset.gid}}));
  const m=$('#modal');if(m&&!m.hidden){const hm=location.hash.match(/^#spiel-([a-z0-9-]+)$/);if(hm){st.modal=GAMES.has(hm[1])?hm[1]:null;decorateModal()}}
  if(LS.get('lxC')!=='1')return;
  const r=await api('/me');st.cfg=r.cfg||null;
  if(r.me){setMe(r.me,r.counts);if(wantFav)setTimeout(showFavorites,200)}
  else if(r.pending)openOnboarding(r.hasEmail);
  else LS.set('lxC',null)})();
})();
