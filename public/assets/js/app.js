/* ===== Web-App installieren – gemeinsam genutzt von der Hauptseite (app.js) und Lewolux Kids (kids.js) =====
   lxInstall(knopf, überschrift, text): registriert den Service Worker, fängt die Installations-Abfrage des Browsers ab
   und zeigt sonst eine kurze Anleitung (iPhone, Samsung, Firefox …). Welche App installiert wird, bestimmt das
   <link rel="manifest"> der jeweiligen Seite (Hauptseite: /site.webmanifest, Kinderbereich: /kids/kids.webmanifest). */
window.lxInstall=function(btn,title,lead){
  try{ if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('/sw.js').catch(()=>{}); }catch(_){}
  let deferred=null;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(btn&&standalone) btn.hidden=true;
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;});
  addEventListener('appinstalled',()=>{if(btn)btn.hidden=true;});
  const help=()=>{
    const ua=navigator.userAgent, ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&'ontouchend' in document), sam=/SamsungBrowser/.test(ua), ff=/Firefox/.test(ua);
    const steps=ios?['Unten auf <b>Teilen</b> tippen (Quadrat mit Pfeil).','<b>Zum Home-Bildschirm</b> wählen.','Oben rechts auf <b>Hinzufügen</b> tippen.']
      :sam?['Unten auf das <b>Menü</b> (☰) tippen.','<b>Seite hinzufügen zu</b> → <b>Startbildschirm</b> wählen.']
      :ff?['Firefox auf dem PC kann keine Web-Apps installieren. Öffne die Seite in Chrome oder Edge.','Auf dem Handy: Menü (⋮) → <b>Installieren</b>.']
      :['Im Browser-Menü (⋮ oben rechts) auf <b>App installieren</b> bzw. <b>Zum Startbildschirm hinzufügen</b> tippen.','Oder in Chrome/Edge am PC auf das kleine Bildschirm-Symbol rechts in der Adressleiste klicken.'];
    const d=document.createElement('div');d.className='install-help';d.innerHTML='<div><h3>'+title+'</h3>'+lead+'<ol>'+steps.map(s=>'<li>'+s+'</li>').join('')+'</ol><button type="button">Alles klar</button></div>';
    d.onclick=ev=>{if(ev.target===d||ev.target.tagName==='BUTTON')d.remove();};document.body.appendChild(d);
  };
  if(btn) btn.onclick=async()=>{ if(deferred){ deferred.prompt(); const r=await deferred.userChoice.catch(()=>null); deferred=null; if(r&&r.outcome==='accepted') btn.hidden=true; } else help(); };
};

(()=>{
"use strict";
const DATA = JSON.parse(document.getElementById('game-data').textContent);
const GAMES = DATA.games, SCENES_ALL = {};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
/* Ereignisse für community.js: welches Spiel ist offen (lx:modal) bzw. läuft gerade (lx:play) */
const lxEv=(n,id)=>{try{document.dispatchEvent(new CustomEvent('lx:'+n,{detail:{id:id||null}}))}catch(_){}};

/* ---------- utilities ---------- */
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function lg(c,y0,y1,stops){const g=c.createLinearGradient(0,y0,0,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g}
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
const FONT={d:'"Orbitron",sans-serif',b:'"Plus Jakarta Sans",sans-serif',m:'"JetBrains Mono",monospace'};
function tx(c,s,x,y,size,color,o={}){c.font=`${o.w||700} ${size}px ${FONT[o.f||'b']}`;c.fillStyle=color;c.textAlign=o.a||'left';c.textBaseline=o.bl||'alphabetic';c.fillText(s,x,y)}
function panel(c,x,y,w,h,s,fill='rgba(8,10,18,.74)',stroke='rgba(255,255,255,.16)'){rr(c,x,y,w,h,8*s);c.fillStyle=fill;c.fill();c.lineWidth=Math.max(1,s);c.strokeStyle=stroke;c.stroke()}
function stars(c,w,h,n,seed,t,maxY){const r=mulberry(seed);for(let i=0;i<n;i++){const x=r()*w,y=r()*(maxY||h),z=r()*1.6+.4,a=.35+.65*Math.abs(Math.sin(t*.0012*(.4+r())+i));c.fillStyle=`rgba(255,255,255,${a*.85})`;c.fillRect(x,y,z,z)}}
function glow(c,x,y,r,col,a=1){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.globalAlpha=1}
function person(c,x,y,s,shirt,skin='#f1c7a1',hair='#3a2a20'){ // simple modern figure, feet at y
  c.fillStyle='#2b3140';c.fillRect(x-6*s,y-16*s,5*s,16*s);c.fillRect(x+1*s,y-16*s,5*s,16*s);
  c.fillStyle=shirt;rr(c,x-8*s,y-36*s,16*s,22*s,4*s);c.fill();
  c.fillStyle=skin;c.beginPath();c.arc(x,y-43*s,7*s,0,7);c.fill();
  c.fillStyle=hair;c.beginPath();c.arc(x,y-46*s,7*s,Math.PI,0);c.fill();}

/* ---------- scenes (procedural screenshots) ---------- */
const S={};
S.mandat=(c,w,h,v,t)=>{const s=w/640,r=mulberry(11+v);
  const sky=[['#f7a96b','#e47d6c','#41537e'],['#78b2e6','#a9d0f0','#e6f1f9'],['#17223f','#34437a','#8a6aa6']][v];
  c.fillStyle=lg(c,0,h*.75,sky);c.fillRect(0,0,w,h);
  if(v===0)glow(c,w*.2,h*.42,h*.5,'rgba(255,214,140,.9)');
  if(v===2)stars(c,w,h,60,3,t,h*.45);
  // clouds
  c.fillStyle=v===2?'rgba(255,255,255,.05)':'rgba(255,255,255,.35)';
  for(let i=0;i<4;i++){const cx=((r()*w+t*.01*(i+1))%(w+200))-100,cy=h*(.1+r()*.2);c.beginPath();c.ellipse(cx,cy,60*s,14*s,0,0,7);c.fill()}
  const gy=h*.72;
  if(v===0){
    c.fillStyle='#5d8a4f';c.beginPath();c.moveTo(0,gy);for(let x=0;x<=w;x+=10)c.lineTo(x,gy-18*s-Math.sin(x*.012)*14*s);c.lineTo(w,gy);c.fill();
    c.fillStyle='#4a7a42';c.fillRect(0,gy,w,h-gy);
    c.fillStyle='#8f8a7c';c.fillRect(0,gy+18*s,w,16*s); // road
    c.fillStyle='rgba(255,255,255,.6)';for(let x=0;x<w;x+=40*s)c.fillRect(x,gy+25*s,18*s,2*s);
    // church
    const cx=w*.5;c.fillStyle='#e9e0cf';c.fillRect(cx-14*s,gy-110*s,28*s,110*s);c.fillStyle='#5b3b33';c.beginPath();c.moveTo(cx-18*s,gy-110*s);c.lineTo(cx,gy-160*s);c.lineTo(cx+18*s,gy-110*s);c.fill();
    c.fillStyle='#2b2b2b';c.beginPath();c.arc(cx,gy-90*s,6*s,0,7);c.fill();
    for(let i=0;i<8;i++){if(i===4)continue;const x=w*.03+i*w*.122,hw=58*s,hh=46*s,y=gy-hh;
      c.fillStyle=['#efe4d0','#d9b58c','#f3ead9','#c9d2c3'][i%4];c.fillRect(x,y,hw,hh);
      c.fillStyle=['#8a3b2e','#6d4a3a','#933f2f'][i%3];c.beginPath();c.moveTo(x-5*s,y);c.lineTo(x+hw/2,y-30*s);c.lineTo(x+hw+5*s,y);c.fill();
      c.fillStyle='#ffd77a';c.fillRect(x+10*s,y+14*s,12*s,12*s);c.fillRect(x+hw-22*s,y+14*s,12*s,12*s);c.fillStyle='#5a3d2b';c.fillRect(x+hw/2-6*s,y+22*s,12*s,24*s)}
    // bus stop without bus
    c.fillStyle='#e8c040';c.fillRect(w*.86,gy-40*s,4*s,40*s);c.beginPath();c.arc(w*.86+2*s,gy-44*s,9*s,0,7);c.fill();tx(c,'H',w*.86+2*s,gy-40*s,11*s,'#1d6b3a',{a:'center',f:'d',w:900});
    person(c,w*.36,gy+12*s,1.3*s,'#3b82c4');person(c,w*.42,gy+14*s,1.2*s,'#c4543b','#d9a57f','#1e1a17');person(c,w*.8,gy+12*s,1.2*s,'#6b8f3a','#f0c8a8','#9b9b9b');
  } else if(v===1){
    c.fillStyle='#7d8892';c.fillRect(0,gy,w,h-gy);
    for(let i=0;i<14;i++){const bw=(30+r()*40)*s,bh=(60+r()*130)*s,x=i*w/13-10*s;c.fillStyle=['#a9b4c0','#8c99a8','#c2c9d1','#76869a'][i%4];c.fillRect(x,gy-bh,bw,bh);
      c.fillStyle='rgba(255,255,255,.55)';for(let yy=gy-bh+8*s;yy<gy-10*s;yy+=12*s)for(let xx=x+5*s;xx<x+bw-8*s;xx+=10*s)if(r()>.3)c.fillRect(xx,yy,5*s,6*s)}
    c.fillStyle='#565f69';c.fillRect(0,gy+10*s,w,26*s);
    // tram
    const tx0=((t*.05)%(w+200))-160*s;c.fillStyle='#d64545';rr(c,tx0,gy+2*s,150*s,30*s,6*s);c.fill();c.fillStyle='#bfe6ff';for(let k=0;k<6;k++)c.fillRect(tx0+10*s+k*23*s,gy+7*s,16*s,10*s);
    // podium
    c.fillStyle='#1d3557';c.fillRect(w*.3,gy-6*s,w*.22,48*s);tx(c,'BÜRGERLISTE',w*.41,gy+22*s,12*s,'#fff',{a:'center',f:'d',w:800});
    for(let i=0;i<9;i++)person(c,w*.08+i*w*.07+(i>4?w*.3:0),h*.98,1.25*s,['#3b82c4','#9b5cff','#e07a3a','#3aa36b'][i%4],['#f1c7a1','#c98f6b','#8d5a3b'][i%3]);
    person(c,w*.41,gy-6*s,1.4*s,'#22303f');
  } else {
    c.fillStyle='#1b2236';c.fillRect(0,gy,w,h-gy);
    const bx=w*.18,bw=w*.64,by=gy-110*s;c.fillStyle='#cfc8b8';c.fillRect(bx,by,bw,110*s);
    c.fillStyle='#b5ad9b';for(let i=0;i<10;i++)c.fillRect(bx+20*s+i*bw/10.5,by+20*s,10*s,90*s);
    c.fillStyle='#e5dfd1';c.fillRect(bx-10*s,by-10*s,bw+20*s,14*s);
    // glass dome
    const dx=w*.5,dy=by-10*s,dr=70*s;c.save();c.beginPath();c.arc(dx,dy,dr,Math.PI,0);c.closePath();c.fillStyle='rgba(160,210,255,.35)';c.fill();c.clip();
    c.strokeStyle='rgba(230,245,255,.7)';c.lineWidth=1.5*s;for(let i=-4;i<=4;i++){c.beginPath();c.ellipse(dx,dy,Math.abs(i)*dr/4,dr,0,Math.PI,0);c.stroke()}for(let k=1;k<4;k++){c.beginPath();c.moveTo(dx-dr,dy-k*dr/4);c.lineTo(dx+dr,dy-k*dr/4);c.stroke()}c.restore();
    glow(c,dx,dy-dr*.4,dr*1.4,'rgba(255,220,140,.45)');
    ['#000','#dd0000','#ffce00'].forEach((col,i)=>{c.fillStyle=col;c.fillRect(bx+30*s,by-60*s+i*8*s,30*s,8*s);c.fillRect(bx+bw-60*s,by-60*s+i*8*s,30*s,8*s)});
    c.fillStyle='#ccc';c.fillRect(bx+28*s,by-60*s,2*s,60*s);c.fillRect(bx+bw-62*s,by-60*s,2*s,60*s);
    for(let i=0;i<6;i++)person(c,w*.25+i*w*.1,h*.97,1.3*s,['#22303f','#3b3b52','#5a2d2d'][i%3]);
  }
  // HUD
  panel(c,14*s,14*s,150*s,46*s,s);tx(c,['TAG 18','TAG 214','TAG 1.402'][v],26*s,33*s,12*s,'#ff8a3d',{f:'m'});tx(c,['Heidbrook · Dorf','Kreisstadt Lohmar','Berlin · Bundestag'][v],26*s,50*s,12*s,'#eef1f8',{w:600});
  const px=w-200*s,py=14*s;panel(c,px,py,186*s,128*s,s);tx(c,'UMFRAGE HEUTE',px+12*s,py+20*s,10*s,'#9aa3b8',{f:'m'});
  const parties=[['Bürgerliste',[4,19,27][v],'#3be8ff'],['Partei A',[31,26,22][v],'#7a8aa0'],['Partei B',[24,21,19][v],'#c04848'],['Partei C',[12,11,14][v],'#4caf50']];
  parties.forEach((p,i)=>{const yy=py+36*s+i*22*s,val=p[1]+Math.sin(t*.002+i)*.6;tx(c,p[0],px+12*s,yy+9*s,10.5*s,'#eef1f8',{w:600});c.fillStyle='rgba(255,255,255,.1)';c.fillRect(px+86*s,yy,70*s,10*s);c.fillStyle=p[2];c.fillRect(px+86*s,yy,70*s*val/35,10*s);tx(c,Math.round(val)+'%',px+176*s,yy+9*s,10*s,'#eef1f8',{a:'right',f:'m'})});
  panel(c,14*s,h-68*s,w-28*s,54*s,s);tx(c,['Frau Albers, 71','Pressesprecherin','Fraktionschef'][v],28*s,h-47*s,11*s,'#ff8a3d',{w:700});
  tx(c,['„Seit 2019 hält hier kein Bus mehr. Was machen Sie dagegen?“','„In drei Stunden ist Pressekonferenz. Ihre Linie zum Klimapaket?“','„Die Abstimmung ist morgen. Wir brauchen 12 Stimmen.“'][v],28*s,h-27*s,13*s,'#eef1f8',{w:500});
};
S.idle=(c,w,h,v,t)=>{const s=w/640,r=mulberry(21+v);
  c.fillStyle=lg(c,0,h,['#120c16','#1c1120','#0b0709']);c.fillRect(0,0,w,h);
  // bricks
  for(let y=0;y<h*.7;y+=18*s)for(let x=-(y/18%2)*20*s;x<w;x+=40*s){c.fillStyle=`rgba(${60+r()*30},${40+r()*20},${55+r()*25},${.35+r()*.25})`;c.fillRect(x+1,y+1,38*s,16*s)}
  c.fillStyle=lg(c,h*.7,h,['#2a1a1f','#0e0809']);c.fillRect(0,h*.7,w,h*.3);
  // torches
  [w*.14,w*.86].forEach((x,i)=>{const f=1+Math.sin(t*.012+i*2)*.08+Math.sin(t*.031+i)*.05;glow(c,x,h*.33,110*s*f,'rgba(255,140,50,.55)');c.fillStyle='#4a3428';c.fillRect(x-3*s,h*.34,6*s,26*s);c.fillStyle='#ffb347';c.beginPath();c.ellipse(x,h*.31,7*s*f,13*s*f,0,0,7);c.fill();c.fillStyle='#fff3c4';c.beginPath();c.ellipse(x,h*.32,3*s,6*s,0,0,7);c.fill()});
  // hero
  const hx=w*.3,hy=h*.78,bob=Math.sin(t*.006)*2*s;c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.ellipse(hx,hy,30*s,7*s,0,0,7);c.fill();
  c.fillStyle='#5b2a2a';c.beginPath();c.moveTo(hx-18*s,hy-60*s+bob);c.lineTo(hx-30*s,hy-6*s);c.lineTo(hx+6*s,hy-10*s);c.fill();// cape
  c.fillStyle='#8b93a6';rr(c,hx-14*s,hy-62*s+bob,28*s,40*s,5*s);c.fill();c.fillStyle='#3d4352';c.fillRect(hx-12*s,hy-22*s,9*s,22*s);c.fillRect(hx+3*s,hy-22*s,9*s,22*s);
  c.fillStyle='#a7afc0';c.beginPath();c.arc(hx,hy-72*s+bob,12*s,0,7);c.fill();c.fillStyle='#111';c.fillRect(hx-2*s,hy-76*s+bob,12*s,3*s);
  c.save();c.translate(hx+16*s,hy-44*s+bob);c.rotate(-.9+Math.sin(t*.01)*.25);c.fillStyle='#dfe7f5';c.fillRect(0,-3*s,50*s,6*s);c.fillStyle='#c9a227';c.fillRect(-4*s,-8*s,6*s,16*s);c.restore();
  glow(c,hx+40*s,hy-70*s,40*s,'rgba(59,232,255,.35)');
  // monster
  const mx=w*.68,my=h*.8,pulse=1+Math.sin(t*.005)*.03;c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.ellipse(mx,my,60*s,10*s,0,0,7);c.fill();
  const mc=['#3f7a3a','#5a3a7a','#7a2f2f'][v];c.fillStyle=mc;c.beginPath();c.ellipse(mx,my-50*s*pulse,58*s,52*s*pulse,0,0,7);c.fill();
  if(v===2){c.fillStyle='#4a1b1b';c.beginPath();c.moveTo(mx-40*s,my-90*s);c.lineTo(mx-60*s,my-140*s);c.lineTo(mx-20*s,my-100*s);c.fill();c.beginPath();c.moveTo(mx+40*s,my-90*s);c.lineTo(mx+60*s,my-140*s);c.lineTo(mx+20*s,my-100*s);c.fill()}
  glow(c,mx-18*s,my-62*s,16*s,'rgba(255,60,40,.9)');glow(c,mx+18*s,my-62*s,16*s,'rgba(255,60,40,.9)');c.fillStyle='#ffde6b';c.beginPath();c.arc(mx-18*s,my-62*s,5*s,0,7);c.arc(mx+18*s,my-62*s,5*s,0,7);c.fill();
  c.fillStyle='#120809';c.beginPath();c.ellipse(mx,my-36*s,22*s,9*s,0,0,Math.PI);c.fill();
  // HP
  panel(c,mx-70*s,my-130*s-(v===2?30*s:0),140*s,24*s,s);c.fillStyle='#3a0f12';c.fillRect(mx-62*s,my-120*s-(v===2?30*s:0),124*s,7*s);c.fillStyle='#e8413b';c.fillRect(mx-62*s,my-120*s-(v===2?30*s:0),124*s*(.35+.3*Math.abs(Math.sin(t*.0015))),7*s);
  tx(c,['Sumpfschleim Lv. 48','Schattenwanst Lv. 112','Aschenfürst Lv. 240'][v],mx,my-136*s-(v===2?30*s:0),11*s,'#ffd7c4',{a:'center',w:700});
  // floating numbers
  for(let i=0;i<4;i++){const ph=((t*.0009)+i/4)%1;c.globalAlpha=1-ph;tx(c,['+1.284','+3.902','KRIT! 18.440','+977'][i],mx+(i-1.5)*40*s,my-90*s-ph*80*s,(i===2?18:13)*s,i===2?'#ff8a3d':'#ffd75e',{f:'d',w:900,a:'center'});c.globalAlpha=1}
  // HUD
  panel(c,14*s,14*s,200*s,58*s,s);tx(c,'GOLD',26*s,34*s,10*s,'#9aa3b8',{f:'m'});tx(c,['84,2 Tsd.','1,92 Mio.','47,6 Mrd.'][v],26*s,58*s,20*s,'#ffd75e',{f:'d',w:900});tx(c,['DPS 2.410','DPS 88.300','DPS 2,1 Mio.'][v],200*s,34*s,10*s,'#3be8ff',{f:'m',a:'right'});
  panel(c,w-214*s,14*s,200*s,58*s,s);tx(c,'GOLDHAFEN',w-202*s,34*s,10*s,'#9aa3b8',{f:'m'});['Schmiede 7','Mine 12','Taverne 4'].forEach((b,i)=>tx(c,b,w-202*s+i*64*s,58*s,10.5*s,'#eef1f8',{w:600}));
  panel(c,14*s,h-44*s,w-28*s,30*s,s);c.fillStyle='rgba(155,92,255,.25)';c.fillRect(20*s,h-36*s,w-40*s,14*s);c.fillStyle='#9b5cff';c.fillRect(20*s,h-36*s,(w-40*s)*(.62+.1*v),14*s);tx(c,'LOOT-SPIRALE · Stufe '+(3+v*4),w/2,h-25*s,10.5*s,'#fff',{a:'center',f:'m'});
};
S.stern=(c,w,h,v,t)=>{const s=w/640;
  c.fillStyle=lg(c,0,h,['#05071a','#1a1240','#3a1f5c']);c.fillRect(0,0,w,h);stars(c,w,h,140,5+v,t);
  // meteors
  for(let i=0;i<3;i++){const ph=((t*.0004)+i/3)%1,x=w*(1.1-ph*1.3)+i*60*s,y=h*(.05+ph*.5)+i*20*s;const g=c.createLinearGradient(x,y,x+80*s,y-40*s);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');c.strokeStyle=g;c.lineWidth=2*s;c.beginPath();c.moveTo(x,y);c.lineTo(x+80*s,y-40*s);c.stroke()}
  // valley
  c.fillStyle='#160f2e';c.beginPath();c.moveTo(0,h*.8);for(let x=0;x<=w;x+=8)c.lineTo(x,h*.68-Math.abs(Math.sin(x*.008))*60*s);c.lineTo(w,h);c.lineTo(0,h);c.fill();
  c.fillStyle='#0d0a1d';c.fillRect(0,h*.82,w,h*.18);
  const cx=w/2,cy=h*.42,col=['#ffcf4a','#3be8ff','#7dff9e'][v];
  if(v<2){
    glow(c,cx,cy,170*s,v===0?'rgba(255,207,74,.5)':'rgba(59,232,255,.5)');
    c.save();c.translate(cx,cy);c.rotate(t*.0008);c.strokeStyle=col;c.lineWidth=2*s;c.setLineDash([10*s,8*s]);c.beginPath();c.arc(0,0,96*s,0,7);c.stroke();c.setLineDash([]);c.rotate(-t*.0016);c.globalAlpha=.6;c.beginPath();c.arc(0,0,120*s,0,7);c.stroke();c.globalAlpha=1;c.restore();
    // star
    c.save();c.translate(cx,cy);c.rotate(Math.sin(t*.001)*.1);c.fillStyle=col;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rad=i%2?26*s:62*s;c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad)}c.fill();c.restore();
    tx(c,['LEGENDÄR','KOMET'][v],cx,cy+150*s,34*s,col,{a:'center',f:'d',w:900});
    tx(c,['„Goldene Krone“ · 1 zu 25.000','„Morgenkomet“ · 1 zu 1.000.000'][v],cx,cy+175*s,13*s,'#eef1f8',{a:'center',f:'m'});
  } else {
    // garden with pets
    c.fillStyle='#163a2a';c.fillRect(0,h*.62,w,h*.38);for(let i=0;i<40;i++){const r=mulberry(i);c.fillStyle=`hsl(${r()*360},80%,70%)`;c.beginPath();c.arc(r()*w,h*.66+r()*h*.3,3*s,0,7);c.fill()}
    [['#ffcf4a',.3],['#3be8ff',.5],['#ff7ad9',.7]].forEach(([pc,px],i)=>{const x=w*px,y=h*.78+Math.sin(t*.006+i)*6*s;glow(c,x,y-14*s,40*s,'rgba(255,255,255,.25)');c.fillStyle=pc;c.beginPath();c.ellipse(x,y-14*s,22*s,18*s,0,0,7);c.fill();c.fillStyle='#111';c.beginPath();c.arc(x-7*s,y-18*s,3*s,0,7);c.arc(x+7*s,y-18*s,3*s,0,7);c.fill()});
    person(c,w*.18,h*.88,1.6*s,'#9b5cff');
    tx(c,'STERNENGARTEN',cx,h*.24,30*s,'#7dff9e',{a:'center',f:'d',w:900});tx(c,'3 Pets folgen dir · +12 % Glück',cx,h*.32,13*s,'#eef1f8',{a:'center',f:'m'});
  }
  panel(c,14*s,14*s,170*s,46*s,s);tx(c,'WÜRFE',26*s,32*s,10*s,'#9aa3b8',{f:'m'});tx(c,['12.884','204.117','58.302'][v],26*s,52*s,16*s,'#eef1f8',{f:'d',w:800});
  panel(c,w-150*s,14*s,136*s,46*s,s);tx(c,'GLÜCK',w-138*s,32*s,10*s,'#9aa3b8',{f:'m'});tx(c,['x2,4','x6,1','x3,8'][v],w-138*s,52*s,16*s,'#7dff9e',{f:'d',w:800});
};
S.wrestle=(c,w,h,v,t)=>{const s=w/640,r=mulberry(31+v);
  c.fillStyle=lg(c,0,h,['#07060c','#140d22','#0a0810']);c.fillRect(0,0,w,h);
  // crowd
  for(let i=0;i<220;i++){const x=r()*w,y=h*.18+r()*h*.3;c.fillStyle=`rgba(${80+r()*80},${70+r()*60},${100+r()*80},.35)`;c.beginPath();c.arc(x,y,3*s,0,7);c.fill();if(r()>.93){c.fillStyle='rgba(255,255,255,.8)';c.fillRect(x,y-4*s,2*s,2*s)}}
  // spotlights
  [[.2,'rgba(59,232,255,.18)'],[.8,'rgba(155,92,255,.2)'],[.5,'rgba(255,138,61,.15)']].forEach(([px,col],i)=>{const sway=Math.sin(t*.0012+i*2)*60*s;c.fillStyle=col;c.beginPath();c.moveTo(w*px,0);c.lineTo(w*.5+sway-120*s,h);c.lineTo(w*.5+sway+120*s,h);c.fill()});
  const rarity=[['SECRET MYTHIC','#ff5ad1','#3be8ff'],['ALBUM · SET 1','#3be8ff','#9b5cff'],['CHAMPIONSHIP GOLD PACK','#ffcf4a','#ff8a3d']][v];
  if(v===0){
    // ring
    c.fillStyle='#1b1430';c.fillRect(w*.08,h*.72,w*.84,h*.28);[0,1,2].forEach(i=>{c.strokeStyle=['#e33','#fff','#33e'][i];c.lineWidth=2.5*s;c.beginPath();c.moveTo(w*.06,h*.6+i*14*s);c.lineTo(w*.94,h*.6+i*14*s);c.stroke()});
    const names=['Nordsturm Nils','Kaiserin Vex','Graf Granit','Mia Meteor','Viktor Vulkan'],cols=['#7a8aa0','#3be8ff','#9b5cff','#ffcf4a','#ff5ad1'];
    for(let i=0;i<5;i++){c.save();c.translate(w/2+(i-2)*86*s,h*.66+Math.abs(i-2)*14*s);c.rotate((i-2)*.13);const cw=96*s,ch=136*s;
      const g=c.createLinearGradient(-cw/2,-ch,cw/2,0);g.addColorStop(0,cols[i]);g.addColorStop(1,'#140d22');rr(c,-cw/2,-ch,cw,ch,8*s);c.fillStyle=g;c.fill();c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5*s;c.stroke();
      c.fillStyle='rgba(0,0,0,.35)';rr(c,-cw/2+8*s,-ch+22*s,cw-16*s,70*s,4*s);c.fill();person(c,0,-ch+88*s,1.25*s,cols[i],'#d9a57f','#111');
      tx(c,names[i],0,-ch+14*s,8.5*s,'#fff',{a:'center',w:800});tx(c,String(10+i*17).padStart(3,'0')+'/100',0,-10*s,8*s,'rgba(255,255,255,.75)',{a:'center',f:'m'});
      if(i===4){c.globalCompositeOperation='lighter';const ph=(t*.0006)%1;const hg=c.createLinearGradient(-cw/2+ph*cw*2-cw,-ch,-cw/2+ph*cw*2,0);hg.addColorStop(0,'rgba(255,255,255,0)');hg.addColorStop(.5,'rgba(255,255,255,.55)');hg.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=hg;rr(c,-cw/2,-ch,cw,ch,8*s);c.fill();c.globalCompositeOperation='source-over'}
      c.restore()}
  } else if(v===1){
    const cols=10,rows=4,gw=w*.8/cols;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const filled=r()>.35,X=w*.1+x*gw,Y=h*.22+y*gw*1.3;rr(c,X+3*s,Y,gw-6*s,gw*1.2,5*s);c.fillStyle=filled?`hsl(${200+r()*120},70%,${35+r()*20}%)`:'rgba(255,255,255,.05)';c.fill();c.strokeStyle='rgba(255,255,255,.18)';c.stroke();if(!filled)tx(c,'?',X+gw/2,Y+gw*.7,14*s,'rgba(255,255,255,.25)',{a:'center',f:'d'})}
    tx(c,'63 / 100 gesammelt',w/2,h*.92,14*s,'#eef1f8',{a:'center',f:'m'});
  } else {
    const pulse=1+Math.sin(t*.004)*.03;glow(c,w/2,h*.5,200*s*pulse,'rgba(255,190,60,.45)');c.save();c.translate(w/2,h*.52);c.scale(pulse,pulse);
    const g=c.createLinearGradient(-70*s,-110*s,70*s,110*s);g.addColorStop(0,'#ffe08a');g.addColorStop(.5,'#c98b1d');g.addColorStop(1,'#ffcf4a');rr(c,-70*s,-110*s,140*s,220*s,10*s);c.fillStyle=g;c.fill();
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(-70*s,-80*s,140*s,6*s);tx(c,'GOLD',0,0,30*s,'#3a2400',{a:'center',f:'d',w:900});tx(c,'5 KARTEN',0,26*s,11*s,'#3a2400',{a:'center',f:'m'});c.restore();
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2+t*.0007,R=(150+Math.sin(t*.003+i)*20)*s;c.fillStyle='rgba(255,220,120,.8)';c.fillRect(w/2+Math.cos(a)*R,h*.52+Math.sin(a)*R*.6,3*s,3*s)}
  }
  tx(c,rarity[0],w/2,h*.13,22*s,rarity[1],{a:'center',f:'d',w:900});
  panel(c,14*s,14*s,130*s,40*s,s);tx(c,'MÜNZEN 12.450',26*s,39*s,11*s,'#ffcf4a',{f:'m'});
};
S.kritzel=(c,w,h,v,t)=>{const s=w/640;
  const bgs=['#fff8e8','#eaf6ff','#f3ffe9'];c.fillStyle=bgs[v];c.fillRect(0,0,w,h);
  c.strokeStyle='rgba(80,120,200,.18)';c.lineWidth=1*s;for(let y=40*s;y<h;y+=28*s){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
  const ch=['A','7','M'][v],cx=w*.42,cy=h*.62;
  c.font=`900 ${300*s}px ${FONT.b}`;c.textAlign='center';c.textBaseline='alphabetic';
  c.setLineDash([4*s,10*s]);c.lineWidth=6*s;c.lineCap='round';c.strokeStyle='#c9c2b3';c.strokeText(ch,cx,cy+100*s);c.setLineDash([]);
  // progress trace via clip
  const prog=reduce?.86:(.35+.55*((Math.sin(t*.0008)+1)/2));c.save();c.beginPath();c.rect(0,0,w,(cy-120*s)+prog*240*s);c.clip();c.lineWidth=22*s;c.lineJoin='round';c.strokeStyle=['#ff6b6b','#4d9bff','#2fbf71'][v];c.strokeText(ch,cx,cy+100*s);c.restore();
  // owl
  const ox=w*.82,oy=h*.62,b=Math.sin(t*.005)*4*s;c.fillStyle='#8a5a3b';c.beginPath();c.ellipse(ox,oy+b,62*s,74*s,0,0,7);c.fill();c.fillStyle='#e9c79f';c.beginPath();c.ellipse(ox,oy+22*s+b,40*s,44*s,0,0,7);c.fill();
  c.fillStyle='#8a5a3b';c.beginPath();c.moveTo(ox-50*s,oy-50*s+b);c.lineTo(ox-36*s,oy-88*s+b);c.lineTo(ox-22*s,oy-58*s+b);c.fill();c.beginPath();c.moveTo(ox+50*s,oy-50*s+b);c.lineTo(ox+36*s,oy-88*s+b);c.lineTo(ox+22*s,oy-58*s+b);c.fill();
  [-1,1].forEach(d=>{c.fillStyle='#fff';c.beginPath();c.arc(ox+d*22*s,oy-30*s+b,18*s,0,7);c.fill();c.fillStyle='#222';c.beginPath();c.arc(ox+d*20*s,oy-28*s+b,8*s,0,7);c.fill()});
  c.fillStyle='#ffb02e';c.beginPath();c.moveTo(ox-7*s,oy-12*s+b);c.lineTo(ox+7*s,oy-12*s+b);c.lineTo(ox,oy+2*s+b);c.fill();
  if(v===1){c.fillStyle='#e33';c.beginPath();c.moveTo(ox-40*s,oy-70*s+b);c.lineTo(ox,oy-110*s+b);c.lineTo(ox+40*s,oy-70*s+b);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(ox,oy-110*s+b,6*s,0,7);c.fill()}
  if(v===2){c.fillStyle='#222';c.fillRect(ox-30*s,oy-38*s+b,60*s,4*s);[-1,1].forEach(d=>{c.strokeStyle='#222';c.lineWidth=3*s;c.beginPath();c.arc(ox+d*22*s,oy-30*s+b,19*s,0,7);c.stroke()})}
  // bubble
  panel(c,ox-110*s,oy-170*s,170*s,52*s,s,'#ffffff','rgba(0,0,0,.12)');tx(c,['Super, Karl!','Fast geschafft, Michel!','Neues Outfit!'][v],ox-25*s,oy-138*s,15*s,'#3a2a1f',{a:'center',w:800});
  // HUD
  panel(c,14*s,14*s,150*s,40*s,s,'#ffffff','rgba(0,0,0,.1)');c.fillStyle='#ffb02e';c.beginPath();c.ellipse(34*s,34*s,6*s,12*s,.6,0,7);c.fill();tx(c,['128','86','240'][v]+' Federn',48*s,39*s,14*s,'#3a2a1f',{w:800});
  panel(c,w-120*s,14*s,106*s,40*s,s,'#2fbf71','rgba(0,0,0,.1)');tx(c,Math.round(prog*100)+' %',w-67*s,40*s,18*s,'#fff',{a:'center',f:'d',w:900});
};
S.kasse=(c,w,h,v,t)=>{const s=w/640,r=mulberry(41+v);
  c.fillStyle='#c79a6b';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=24*s)for(let x=0;x<w;x+=48*s){c.fillStyle=((x/48/s+y/24/s)|0)%2?'rgba(0,0,0,.05)':'rgba(255,255,255,.04)';c.fillRect(x,y,48*s,24*s)}
  c.fillStyle='#5b4636';c.fillRect(0,0,w,46*s);c.fillStyle='#ece6da';c.fillRect(w*.72,46*s,w*.28,48*s);tx(c,'KÜCHE',w*.86,76*s,13*s,'#5b4636',{a:'center',f:'d',w:800});
  const tables=[[.16,.42],[.38,.42],[.6,.42],[.16,.75],[.38,.75],[.6,.75],[.84,.62]];
  tables.forEach(([px,py],i)=>{const x=w*px,y=h*py;c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.arc(x+3*s,y+4*s,30*s,0,7);c.fill();c.fillStyle='#f4efe6';c.beginPath();c.arc(x,y,30*s,0,7);c.fill();c.fillStyle='#8b5e3c';[[0,-42],[0,42],[-42,0],[42,0]].forEach(([dx,dy])=>{rr(c,x+dx*s-9*s,y+dy*s-9*s,18*s,18*s,4*s);c.fill()});
    if((i+v)%3===0){const pulse=.6+.4*Math.sin(t*.008+i);c.strokeStyle=`rgba(255,138,61,${pulse})`;c.lineWidth=3*s;c.beginPath();c.arc(x,y,38*s,0,7);c.stroke();panel(c,x-16*s,y-74*s,32*s,22*s,s,'#fff','rgba(0,0,0,.2)');tx(c,'!',x,y-58*s,15*s,'#ff8a3d',{a:'center',f:'d',w:900})}
    person(c,x+(i%2?-42:42)*s,y+14*s,1*s,['#3b82c4','#c4543b','#6b8f3a','#9b5cff'][i%4]);});
  // waiter path
  const ph=(t*.00025)%1,wx=w*(.12+ph*.7),wy=h*.58+Math.sin(ph*Math.PI*4)*20*s;person(c,wx,wy,1.35*s,'#111','#f1c7a1','#2b1d14');c.fillStyle='#fff';c.fillRect(wx-6*s,wy-34*s,12*s,8*s);
  if(v===0){c.fillStyle='#1e2530';rr(c,wx+8*s,wy-38*s,12*s,18*s,2*s);c.fill();c.fillStyle='#3be8ff';c.fillRect(wx+10*s,wy-36*s,8*s,12*s)}
  else{c.fillStyle='#fffbe8';c.save();c.translate(wx+14*s,wy-30*s);c.rotate(.2);c.fillRect(-6*s,-10*s,12*s,16*s);c.restore();for(let i=0;i<7;i++){c.save();c.translate(w*(.1+r()*.6),h*(.3+r()*.6));c.rotate(r()*3);c.fillStyle='#fffbe8';c.fillRect(-8*s,-10*s,16*s,20*s);c.fillStyle='#aaa';c.fillRect(-5*s,-6*s,10*s,1.5*s);c.fillRect(-5*s,-2*s,8*s,1.5*s);c.restore()}}
  // HUD vs
  panel(c,w/2-170*s,8*s,340*s,32*s,s,'rgba(8,10,18,.82)');tx(c,'KASSE  0:42',w/2-20*s,30*s,14*s,'#3be8ff',{a:'right',f:'d',w:800});tx(c,'VS',w/2,30*s,11*s,'#9aa3b8',{a:'center',f:'m'});tx(c,'ZETTEL  2:15',w/2+20*s,30*s,14*s,'#ff8a3d',{f:'d',w:800});
  panel(c,14*s,h-40*s,200*s,28*s,s);tx(c,['Level 3 · Mittagsrush','Level 7 · Zettelchaos','Level 12 · Hochzeit'][v],26*s,h-21*s,12*s,'#eef1f8',{w:600});
};
S.ordnung=(c,w,h,v,t)=>{const s=w/640;
  c.fillStyle=lg(c,0,h,['#2a2440','#1e1a30']);c.fillRect(0,0,w,h);c.fillStyle='#3a3154';c.fillRect(0,h*.65,w,h*.35);
  c.fillStyle='#4f466e';c.fillRect(w*.08,h*.15,w*.22,h*.3);c.fillStyle='#8fd3ff';c.fillRect(w*.09,h*.17,w*.2,h*.26);c.strokeStyle='#4f466e';c.lineWidth=4*s;c.beginPath();c.moveTo(w*.19,h*.17);c.lineTo(w*.19,h*.43);c.stroke();
  c.fillStyle='#6a4fb0';rr(c,w*.06,h*.55,w*.34,h*.16,12*s);c.fill();c.fillStyle='#7d62c4';rr(c,w*.06,h*.48,w*.34,h*.1,12*s);c.fill();
  c.fillStyle='#2f7a4f';c.beginPath();c.ellipse(w*.46,h*.5,20*s,40*s,0,0,7);c.fill();c.fillStyle='#b5653d';c.fillRect(w*.44,h*.58,20*s,26*s);
  person(c,w*.32,h*.92,1.8*s,'#ff8a3d');c.fillStyle='#ffd75e';c.fillRect(w*.32+12*s,h*.92-70*s,3*s,60*s);c.fillRect(w*.32+6*s,h*.92-14*s,16*s,8*s);
  for(let i=0;i<10;i++){const a=t*.002+i;c.fillStyle='rgba(255,240,150,.9)';const x=w*.32+Math.cos(a)*40*s,y=h*.75+Math.sin(a*1.3)*30*s;c.fillRect(x,y,3*s,3*s)}
  const px=w*.56,py=h*.1,pw=w*.4;panel(c,px,py,pw,h*.8,s);tx(c,'TAGESQUESTS',px+14*s,py+24*s,11*s,'#9aa3b8',{f:'m'});
  const q=[['Spülmaschine ausräumen',20,1],['Staubsaugen Wohnzimmer',40,v>0],['Wäsche zusammenlegen',30,v>1],['Bad putzen',60,0],['Müll rausbringen',15,1]];
  q.forEach((it,i)=>{const y=py+46*s+i*34*s;rr(c,px+14*s,y,16*s,16*s,4*s);c.fillStyle=it[2]?'#7dff9e':'rgba(255,255,255,.08)';c.fill();if(it[2])tx(c,'✓',px+22*s,y+13*s,12*s,'#0a2a14',{a:'center',w:900});tx(c,it[0],px+40*s,y+13*s,12.5*s,it[2]?'#9aa3b8':'#eef1f8',{w:600});tx(c,'+'+it[1]+' XP',px+pw-14*s,y+13*s,11*s,'#ffd75e',{a:'right',f:'m'})});
  const by=py+h*.8-46*s;tx(c,'LEVEL '+(7+v)+' · Ordnungsritter',px+14*s,by,11.5*s,'#eef1f8',{w:700});c.fillStyle='rgba(255,255,255,.08)';c.fillRect(px+14*s,by+8*s,pw-28*s,10*s);c.fillStyle='#9b5cff';c.fillRect(px+14*s,by+8*s,(pw-28*s)*(.45+v*.2),10*s);
  panel(c,14*s,14*s,130*s,36*s,s);tx(c,'🔥 Serie: '+(5+v*6)+' Tage',26*s,37*s,12*s,'#ff8a3d',{w:700});
};
/* software scenes */
S.kanzlei=(c,w,h,v,t)=>{const s=w/640;c.fillStyle='#e9edf3';c.fillRect(0,0,w,h);c.fillStyle='#1d2a44';c.fillRect(0,0,w,30*s);tx(c,'Diktakte',14*s,20*s,12*s,'#fff',{w:700});[0,1,2].forEach(i=>{c.fillStyle=['#ff5f57','#febc2e','#28c840'][i];c.beginPath();c.arc(w-50*s+i*16*s,15*s,5*s,0,7);c.fill()});
  c.fillStyle='#f7f9fc';c.fillRect(0,30*s,w*.26,h);tx(c,'AKTEN',14*s,56*s,10*s,'#6b7389',{f:'m'});['Müller ./. Schmidt','Erbsache Behrens','Mietsache Kock','Verkehrsunfall Lü.','Arbeitsrecht Peters'].forEach((n,i)=>{if(i===0){c.fillStyle='rgba(155,92,255,.14)';c.fillRect(6*s,66*s+i*30*s,w*.26-12*s,26*s)}tx(c,n,16*s,84*s+i*30*s,11.5*s,'#1d2a44',{w:i===0?700:500})});
  const dx=w*.31,dw=w*.42;c.fillStyle='#fff';c.fillRect(dx,48*s,dw,h-60*s);c.shadowColor='transparent';tx(c,'Schriftsatz',dx+20*s,78*s,15*s,'#1d2a44',{w:800});
  const lines=Math.floor(9+((t*.004)%8));for(let i=0;i<17;i++){c.fillStyle=i<lines?'#c5ccd8':'#eef1f6';c.fillRect(dx+20*s,96*s+i*13*s,(dw-40*s)*(i%5===4?.6:1),5*s)}
  const sx=w*.76,sw=w*.22;panel(c,sx,48*s,sw,h-60*s,s,'#1d2a44','rgba(0,0,0,.1)');tx(c,'DIKTAT LÄUFT',sx+sw/2,74*s,10*s,'#3be8ff',{a:'center',f:'m'});
  c.fillStyle='#e8413b';c.beginPath();c.arc(sx+sw/2,130*s,30*s*(1+Math.sin(t*.008)*.06),0,7);c.fill();c.fillStyle='#fff';rr(c,sx+sw/2-7*s,114*s,14*s,24*s,7*s);c.fill();c.fillRect(sx+sw/2-1*s,140*s,2*s,8*s);
  for(let i=0;i<14;i++){const bh=(6+Math.abs(Math.sin(t*.01+i*.7))*30)*s;c.fillStyle='#3be8ff';c.fillRect(sx+12*s+i*(sw-24*s)/14,200*s-bh/2,3*s,bh)}
  ['Word','OpenOffice','PDF'].forEach((f,i)=>{rr(c,sx+12*s,240*s+i*30*s,sw-24*s,22*s,5*s);c.fillStyle='rgba(255,255,255,.08)';c.fill();tx(c,'Export '+f,sx+sw/2,255*s+i*30*s,10.5*s,'#eef1f8',{a:'center',w:600})});
};
S.desk=(c,w,h,v,t)=>{const s=w/640;c.fillStyle=lg(c,0,h,['#1b2a5a','#5a3b8f','#e07a5f']);c.fillRect(0,0,w,h);glow(c,w*.8,h*.2,200*s,'rgba(255,220,180,.35)');
  const now=new Date(2026,9,6,9,41);tx(c,'09:41',30*s,80*s,54*s,'#fff',{f:'d',w:800});tx(c,'Dienstag, 6. Oktober',32*s,104*s,13*s,'rgba(255,255,255,.8)',{w:600});
  const tiles=[['Mail','#3be8ff'],['Kasse','#ff8a3d'],['Browser','#9b5cff'],['Musik','#7dff9e'],['Dateien','#ffcf4a'],['Rechner','#ff5ad1'],['Kalender','#3be8ff'],['Notizen','#ffcf4a']];
  tiles.forEach((tl,i)=>{const x=30*s+(i%4)*92*s,y=136*s+Math.floor(i/4)*92*s,hov=Math.floor(t*.001)%8===i;rr(c,x,y-(hov?4*s:0),80*s,80*s,14*s);c.fillStyle=hov?'rgba(255,255,255,.28)':'rgba(255,255,255,.14)';c.fill();c.strokeStyle='rgba(255,255,255,.25)';c.stroke();rr(c,x+24*s,y+16*s-(hov?4*s:0),32*s,32*s,9*s);c.fillStyle=tl[1];c.fill();tx(c,tl[0],x+40*s,y+68*s-(hov?4*s:0),10.5*s,'#fff',{a:'center',w:600})});
  // weather
  panel(c,w-210*s,30*s,180*s,90*s,s,'rgba(255,255,255,.14)','rgba(255,255,255,.25)');tx(c,'14°',w-190*s,90*s,34*s,'#fff',{f:'d',w:800});tx(c,'Leicht bewölkt',w-110*s,72*s,11*s,'#fff',{w:600});glow(c,w-70*s,92*s,24*s,'rgba(255,220,120,.9)');
  // notepad
  c.save();c.translate(w-200*s,140*s);c.rotate(.04);c.fillStyle='#ffe98a';c.fillRect(0,0,170*s,170*s);c.fillStyle='#e8cf62';c.fillRect(0,0,170*s,16*s);['Kunde Heidmühlen 14 Uhr','Bon-Drucker prüfen','Pizza bestellen'].forEach((n,i)=>tx(c,'• '+n,12*s,42*s+i*24*s,11*s,'#5a4a10',{w:600}));c.restore();
};
S.speise=(c,w,h,v,t)=>{const s=w/640;c.fillStyle='#2a2e38';c.fillRect(0,0,w,h);c.fillStyle='#1f222b';c.fillRect(0,0,w*.22,h);c.fillRect(w*.78,0,w*.22,h);
  tx(c,'VORLAGEN',14*s,26*s,10*s,'#9aa3b8',{f:'m'});['Speisekarte','Tageskarte','Menükarte','Reserviert'].forEach((n,i)=>{rr(c,10*s,38*s+i*42*s,w*.22-20*s,34*s,6*s);c.fillStyle=i===1?'rgba(255,138,61,.25)':'rgba(255,255,255,.05)';c.fill();tx(c,n,22*s,60*s+i*42*s,11.5*s,'#eef1f8',{w:i===1?700:500})});
  const pw=h*.86/1.414,px=w/2-pw/2,py=h*.07;c.fillStyle='rgba(0,0,0,.3)';c.fillRect(px+6*s,py+6*s,pw,h*.86);c.fillStyle='#fbf7ef';c.fillRect(px,py,pw,h*.86);
  c.fillStyle='#7a2e2e';c.beginPath();c.arc(px+pw/2,py+34*s,16*s,0,7);c.fill();tx(c,'L',px+pw/2,py+40*s,15*s,'#fbf7ef',{a:'center',f:'d',w:900});
  tx(c,'Tageskarte',px+pw/2,py+80*s,22*s,'#3a2a1f',{a:'center',w:800});tx(c,'Dienstag, 6. Oktober',px+pw/2,py+98*s,10*s,'#7a6a5a',{a:'center',w:500});
  [['Kürbiscremesuppe','6,90'],['Schnitzel Wiener Art','16,50'],['Matjes Hausfrauenart','14,90'],['Ofengemüse mit Feta','13,20'],['Rote Grütze','5,80']].forEach(([n,p],i)=>{const y=py+130*s+i*30*s;tx(c,n,px+20*s,y,11.5*s,'#3a2a1f',{w:600});tx(c,p+' €',px+pw-20*s,y,11.5*s,'#7a2e2e',{a:'right',f:'m'});c.strokeStyle='rgba(58,42,31,.15)';c.setLineDash([2*s,3*s]);c.beginPath();c.moveTo(px+20*s,y+8*s);c.lineTo(px+pw-20*s,y+8*s);c.stroke();c.setLineDash([])});
  tx(c,'FORMAT',w*.78+14*s,26*s,10*s,'#9aa3b8',{f:'m'});['DIN A4','DIN A5','Tischaufsteller'].forEach((n,i)=>{rr(c,w*.78+10*s,38*s+i*36*s,w*.22-20*s,28*s,6*s);c.fillStyle=i===0?'rgba(59,232,255,.2)':'rgba(255,255,255,.05)';c.fill();tx(c,n,w*.78+22*s,57*s+i*36*s,11*s,'#eef1f8',{w:600})});
  rr(c,w*.78+10*s,h-60*s,w*.22-20*s,40*s,8*s);c.fillStyle='#ff8a3d';c.fill();tx(c,'Logo hochladen',w*.89,h-35*s,11*s,'#1a0f05',{a:'center',w:800});
};

/* ---------- echtes Spiel im Browser ---------- */
function el(html){const d=document.createElement('div');d.innerHTML=html.trim();return d.firstElementChild}
function mountGame(h,g){
  h.dataset.gid=g.id;
  h.closest('.stage').classList.toggle('is-soon',!g.play);
  if(!g.play){h.appendChild(el(`<div class="soon"><p class="soon-k">Bald spielbar</p><p class="soon-t">${g.short} wird gerade für den Browser vorbereitet.</p><p class="soon-s">Bis dahin kannst du die Early-Access-Version kostenlos herunterladen oder dir die Screenshots ansehen.</p>${g.download.href?`<a class="btn btn-primary" href="${g.download.href}" download>Kostenlos herunterladen</a>`:""}</div>`));return null}
  if(g._ok===undefined){h.innerHTML='';fetch(g.play,{method:'HEAD',cache:'no-store'}).then(r=>{g._ok=r.ok},()=>{g._ok=false}).then(()=>{if(h.dataset.gid===g.id&&!h.hidden){h.innerHTML='';mountGame(h,g)}});return null}
  if(!g._ok){const gp=Object.assign({},g,{play:null});return mountGame(h,gp)}
  const start=el(`<button class="game-start" aria-label="${g.short} starten"><img src="${g.shotImgs[0]}" alt=""><span class="gs-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span><span class="gs-label">${g.short} starten</span></button>`);
  start.onclick=()=>{if(touchDev){openPlayer(g);return}const f=document.createElement('iframe');f.src=g.play;f.title=g.title;f.allow='fullscreen; autoplay; gamepad; screen-wake-lock; identity-credentials-get';f.allowFullscreen=true;f.className='game-frame';h.innerHTML='';h.appendChild(f);lxEv('play',g.id);try{f.focus()}catch(_){}};
  h.appendChild(start);return null}


/* ---------- Handy-Player: Spiel bildschirmfüllend, mit Querformat-Hinweis ---------- */
const touchDev=matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<900;
let player=null,plFrame=null;
function updRot(){if(!player||player.hidden)return;const show=false; /* Die Spiele bringen eigene Dreh-Hinweise mit */$('.pl-rotate',player).hidden=!show}
function closePlayer(){if(!player||player.hidden)return;player.hidden=true;lxEv('play',null);if(plFrame){plFrame.remove();plFrame=null}document.documentElement.classList.remove('player-open');
  try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock()}catch(_){}
  const fe=document.fullscreenElement||document.webkitFullscreenElement;if(fe){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(_){}}}
function openPlayer(g){
  if(!player){player=el(`<div class="player" role="dialog" aria-modal="true" aria-label="Spiel" hidden>
    <div class="pl-bar"><button class="pl-close" aria-label="Spiel schließen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span class="pl-title"></span><a class="pl-dl" download>Download</a></div>
    <div class="pl-stage"><div class="pl-load"><span class="spin"></span><span>Spiel lädt …</span></div></div>
    <div class="pl-rotate" hidden><div class="rot-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg></div><p class="rot-t">Dreh dein Handy</p><p class="rot-s">Dieses Spiel ist fürs Querformat gemacht. Quer siehst du alles groß und scharf.</p><button class="btn btn-primary pl-anyway">Trotzdem hochkant spielen</button></div>
  </div>`);document.body.appendChild(player);
    $('.pl-close',player).onclick=()=>{if(history.state&&history.state.lgsPlayer)history.back();else closePlayer()};
    $('.pl-anyway',player).onclick=()=>{player.classList.add('rot-ok');updRot()};
    addEventListener('popstate',()=>{if(player&&!player.hidden)closePlayer()});
    const mq=matchMedia('(orientation:portrait)');(mq.addEventListener?mq.addEventListener('change',updRot):mq.addListener(updRot));addEventListener('resize',updRot)}
  $('.pl-title',player).textContent=g.short;const d=$('.pl-dl',player);if(g.download.href){d.href=g.download.href;d.setAttribute('download',g.download.href.split('/').pop());d.hidden=false}else d.hidden=true;
  const land=g.orient!=='any'&&g.rnum>1.05;player.dataset.land=land?'1':'0';player.classList.remove('rot-ok');
  const st=$('.pl-stage',player);st.classList.remove('ready');if(plFrame)plFrame.remove();
  plFrame=document.createElement('iframe');plFrame.src=g.play;plFrame.title=g.title;plFrame.allow='fullscreen; autoplay; gamepad; screen-wake-lock; identity-credentials-get';plFrame.allowFullscreen=true;plFrame.onload=()=>st.classList.add('ready');st.appendChild(plFrame);
  player.hidden=false;document.documentElement.classList.add('player-open');lxEv('play',g.id);
  try{history.pushState({lgsPlayer:1},'')}catch(_){}
  const fs=player.requestFullscreen||player.webkitRequestFullscreen;
  if(fs){try{const pr=fs.call(player,{navigationUI:'hide'});const lock=()=>{if(land&&screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').then(updRot,()=>{})};pr&&pr.then?pr.then(lock,()=>{}):lock()}catch(_){}}
  updRot();try{plFrame.focus()}catch(_){}
}

/* ---------- canvas render management ---------- */
const live=new Set();
const fine=matchMedia('(pointer:fine)').matches;
function draw(cv,t){const r=cv.getBoundingClientRect();const w=r.width||+cv.dataset.w,h=r.height||+cv.dataset.h;if(!w)return;const dpr=cv.dataset.w?1:Math.min(2,devicePixelRatio||1),W=Math.round(w*dpr),H=Math.round(h*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);const fn=S[cv.dataset.scene];if(fn)try{fn(c,w,h,+cv.dataset.v||0,t)}catch(e){console.error(e)}}
window.LGS={draw,scenes:S};
if(!window.LGS_RENDER_ONLY){
const ro=new ResizeObserver(es=>es.forEach(e=>{if(!e.target.closest('[hidden]'))draw(e.target,performance.now())}));
let raf=0;function loop(t){live.forEach(cv=>draw(cv,t));raf=live.size?requestAnimationFrame(loop):0}
function goLive(cv){if(reduce)return;live.add(cv);if(!raf)raf=requestAnimationFrame(loop)}
function stopLive(cv){live.delete(cv)}

/* ---------- spotlight (home only) ---------- */
const spot=$('#spotCanvas');
if(spot){let spotI=0,spotTimer;const dots=$('#spotDots'),poster=$('#spotPoster'),spotIO=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&!GAMES[spotI].real?goLive(spot):stopLive(spot)));
  spot.dataset.scene=GAMES[0].scene;spot.dataset.v=0;ro.observe(spot);spotIO.observe(spot);
  GAMES.forEach((g,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Spotlight: '+g.short);b.onclick=()=>setSpot(i);dots.appendChild(b)});
  function setSpot(i){spotI=(i+GAMES.length)%GAMES.length;const g=GAMES[spotI];spot.dataset.scene=g.scene;spot.dataset.v=0;
    poster.src=g.shotImgs[0];poster.alt='Screenshot aus '+g.short;const t=$('#spotTitle');t.textContent=g.title;t.href=g.page;$('#spotTag').textContent=g.tagline;
    const hp=$('#heroPlay');hp.dataset.open=g.id;$('#heroPlayLabel').textContent=g.short+' spielen';
    [...dots.children].forEach((d,k)=>{d.removeAttribute('aria-current');void d.offsetWidth;if(k===spotI)d.setAttribute('aria-current','true')});
    if(g.real){spot.classList.remove('on');stopLive(spot)}else{draw(spot,performance.now());spot.classList.add('on')}clearTimeout(spotTimer);if(!reduce)spotTimer=setTimeout(()=>setSpot(spotI+1),7000)}
  setSpot(0);spot.style.cursor='pointer';spot.onclick=()=>{const g=GAMES[spotI];if(touchDev&&g.play)openPlayer(g);else openModal(g.id,'demo',spot)};
}

/* ---------- key art parallax ---------- */
const ka=$('#keyart');if(ka&&!reduce&&fine){ka.addEventListener('pointermove',e=>{const r=ka.getBoundingClientRect();ka.style.setProperty('--px',((e.clientX-r.left)/r.width-.5)*-14+'px');ka.style.setProperty('--py',((e.clientY-r.top)/r.height-.5)*-10+'px')});ka.addEventListener('pointerleave',()=>{ka.style.setProperty('--px','0px');ka.style.setProperty('--py','0px')})}

/* ---------- cards & reel: live preview on hover (desktop) ---------- */
function hoverLive(el){if(!fine||reduce)return;const media=$('.media,.shot-media',el);if(!media||!media.dataset.scene)return;let cv;
  el.addEventListener('pointerenter',()=>{if(!cv){cv=document.createElement('canvas');cv.className='live';cv.setAttribute('aria-hidden','true');cv.dataset.scene=media.dataset.scene;cv.dataset.v=media.dataset.v||0;media.appendChild(cv)}draw(cv,performance.now());media.classList.add('is-live');goLive(cv)});
  el.addEventListener('pointerleave',()=>{if(cv){stopLive(cv);media.classList.remove('is-live')}})}
$$('.card,.shot').forEach(hoverLive);
if(fine&&!reduce)$$('.card').forEach(card=>{
  card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg')});
  card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.setProperty('--ry',(x-.5)*7+'deg');card.style.setProperty('--rx',(.5-y)*7+'deg');card.style.setProperty('--mx',x*100+'%');card.style.setProperty('--my',y*100+'%')});
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b&&!e.target.closest('a[href]:not([data-open])')){e.preventDefault();const mode=b.dataset.mode||'demo',g=GAMES.find(x=>x.id===b.dataset.open);if(touchDev&&mode==='demo'&&g&&g.play){openPlayer(g);return}openModal(b.dataset.open,mode,b)}});

/* ---------- filters ---------- */
const filters=$('#filters');if(filters)filters.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$$('button',filters).forEach(x=>x.setAttribute('aria-pressed',x===b));const f=b.dataset.f;let n=0;
  $$('#grid .card').forEach(c=>{const ok=f==='all'||c.dataset.cats.split(' ').includes(f);c.hidden=!ok;c.style.gridColumn=f==='all'?'':'auto';if(ok){n++;c.animate&&!reduce&&c.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:420,delay:n*50,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'})}})});

/* ---------- reel ---------- */
const reel=$('#reel');if(reel){$('#reelPrev').onclick=()=>reel.scrollBy({left:-reel.clientWidth*.8,behavior:reduce?'auto':'smooth'});$('#reelNext').onclick=()=>reel.scrollBy({left:reel.clientWidth*.8,behavior:reduce?'auto':'smooth'})}

/* ---------- menu ---------- */
const mb=$('#menuBtn');if(mb){mb.onclick=e=>{const o=$('#navLinks').classList.toggle('open');mb.setAttribute('aria-expanded',o);mb.setAttribute('aria-label',o?'Menü schließen':'Menü öffnen')};$$('#navLinks a').forEach(a=>a.addEventListener('click',()=>{$('#navLinks').classList.remove('open');mb.setAttribute('aria-expanded','false')}))}

/* ---------- copy mail ---------- */
const cm=$('#copyMail');if(cm)cm.onclick=async()=>{const t=$('#mail').textContent;try{await navigator.clipboard.writeText(t);cm.textContent='Kopiert'}catch(_){const r=document.createRange();r.selectNodeContents($('#mail'));const sel=getSelection();sel.removeAllRanges();sel.addRange(r);cm.textContent='Markiert'}setTimeout(()=>cm.textContent='Kopieren',1800)};
const yr=$('#year');if(yr)yr.textContent=new Date().getFullYear();

/* ---------- stats count-up ---------- */
const fmt=(n,el)=>{if(el.dataset.fmt==='short')return(el.dataset.prefix||'')+(n>=1e6?(n/1e6).toLocaleString('de-DE',{maximumFractionDigits:1})+' Mio.':Math.round(n).toLocaleString('de-DE'));return(el.dataset.prefix||'')+Math.round(n).toLocaleString('de-DE')+(el.dataset.suffix||'')};
const sio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting||reduce)return;sio.unobserve(e.target);const el=e.target,to=+el.dataset.count;if(!to)return;const st=performance.now();const step=n=>{const p=Math.min(1,(n-st)/1400),v=to*(1-Math.pow(1-p,3));el.textContent=fmt(v,el);if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)}),{threshold:.5});
$$('[data-count]').forEach(el=>sio.observe(el));

/* ---------- ambient particles (desktop only, saves battery on phones) ---------- */
(()=>{const cv=$('#ambient');if(!cv)return;if(!fine||innerWidth<760){cv.remove();return}const c=cv.getContext('2d');let W,H,P=[];
  function size(){W=cv.width=innerWidth;H=cv.height=innerHeight}size();addEventListener('resize',size);
  for(let i=0;i<55;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.6+.4,h:Math.random()});
  function frame(){if(document.hidden){requestAnimationFrame(frame);return}c.clearRect(0,0,W,H);for(const p of P){p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;c.fillStyle=p.h<.5?'rgba(59,232,255,.5)':p.h<.8?'rgba(155,92,255,.5)':'rgba(255,138,61,.55)';c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill()}
    for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<120){c.strokeStyle=`rgba(120,200,255,${.08*(1-d/120)})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke()}}
    if(!reduce)requestAnimationFrame(frame)}frame()})();

/* ---------- Handbuch-Tabs ---------- */
$$('.mn-box').forEach(box=>{const tabs=$$('[role=tab]',box),pans=$$('[role=tabpanel]',box);box.classList.add('tabbed');
  pans.forEach(p=>{p.hidden=p.hasAttribute('data-off');p.removeAttribute('data-off')});
  const sel=(t,focus)=>{tabs.forEach(x=>{const on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1});pans.forEach(p=>p.hidden=p.id!==t.getAttribute('aria-controls'));if(focus)t.focus();
    const p=$('#'+t.getAttribute('aria-controls'));if(p&&p.animate&&!reduce)p.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:260,easing:'ease-out'});t.scrollIntoView({block:'nearest',inline:'center',behavior:reduce?'auto':'smooth'})};
  tabs.forEach((t,i)=>{t.onclick=()=>sel(t);t.onkeydown=e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();sel(tabs[(i+d+tabs.length)%tabs.length],true)}}})});

/* ---------- Community: Umfrage, Feedback, Beiträge ---------- */
(()=>{const sec=$('.community[data-api]');if(!sec)return;const API=sec.dataset.api;
  const names=Object.fromEntries(GAMES.map(g=>[g.id,g.short]));names.allgemein='Allgemein';
  const KIND={wunsch:'Wunsch',idee:'Idee',bug:'Fehler',lob:'Lob'};
  const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const call=(path,opt)=>fetch(API+path,Object.assign({headers:{'Content-Type':'application/json'}},opt)).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.error||'Fehler'),{status:r.status});return d});
  const offline='Die Community-Funktionen starten in Kürze. Schau bald wieder vorbei!';
  /* Umfrage */
  const poll=$('#poll');
  function showPoll(d){if(!poll)return;const tot=d.total||0;poll.classList.toggle('voted',!!d.mine);
    $$('.poll-opt',poll).forEach(b=>{const n=d.counts[b.dataset.choice]||0,p=tot?Math.round(n*100/tot):0;b.style.setProperty('--p',p+'%');$('.po-pct',b).textContent=d.mine?p+' %':'';b.setAttribute('aria-pressed',d.mine===b.dataset.choice)});
    $('#pollNote').textContent=d.mine?`Danke für deine Stimme! ${tot.toLocaleString('de-DE')} ${tot===1?'Stimme':'Stimmen'} bisher.`:(tot?`${tot.toLocaleString('de-DE')} ${tot===1?'Stimme':'Stimmen'} bisher. Wähle dein Spiel!`:'Noch keine Stimmen. Sei die erste!')}
  if(poll){call('poll').then(showPoll).catch(()=>{poll.classList.add('off');$('#pollNote').textContent=offline});
    poll.addEventListener('click',e=>{const b=e.target.closest('.poll-opt');if(!b||poll.classList.contains('off')||poll.classList.contains('busy'))return;poll.classList.add('busy');
      call('poll',{method:'POST',body:JSON.stringify({choice:b.dataset.choice})}).then(showPoll).catch(()=>{$('#pollNote').textContent='Das hat leider nicht geklappt. Bitte versuch es gleich noch einmal.'}).finally(()=>poll.classList.remove('busy'))})}
  /* Beiträge anzeigen */
  const list=$('#cmList');
  function when(t){const d=(Date.now()-t)/864e5;return d<1?'heute':d<2?'gestern':d<30?`vor ${Math.floor(d)} Tagen`:new Date(t).toLocaleDateString('de-DE')}
  function load(){if(!list)return;const g=list.dataset.game;call('comments'+(g?'?game='+g:'')).then(d=>{if(!d.comments.length)return;
    list.innerHTML=d.comments.map(c=>`<article class="cm-item"><header><span class="cm-kind k-${esc(c.kind)}">${KIND[c.kind]||'Idee'}</span><b>${esc(c.name)}</b>${g?'':`<span class="cm-game">${esc(names[c.game]||'Allgemein')}</span>`}<time>${when(c.created)}</time></header><p>${esc(c.text)}</p>${c.reply?`<div class="cm-reply"><b>Lewolux Studio</b><p>${esc(c.reply)}</p></div>`:''}</article>`).join('')}).catch(()=>{})}
  load();
  /* Formular */
  $$('.fb-form').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const note=$('.cm-note',f),btn=$('button[type=submit]',f),fd=new FormData(f);
    const body={text:fd.get('text'),name:fd.get('name'),game:fd.get('game')||'allgemein',kind:fd.get('kind'),website:fd.get('website')};
    if(String(body.text||'').trim().length<5){note.textContent='Bitte schreib mindestens ein paar Worte.';f.text.focus();return}
    btn.disabled=true;note.textContent='Wird gesendet …';
    call('comments',{method:'POST',body:JSON.stringify(body)}).then(()=>{f.reset();note.textContent='Danke! Dein Beitrag ist angekommen und erscheint nach kurzer Prüfung hier.';f.classList.add('sent')})
      .catch(err=>{note.textContent=err.status?err.message:offline}).finally(()=>{btn.disabled=false})}));
})();

/* ---------- modal ---------- */
const modal=$('#modal'),stage=$('#stage'),shotCv=$('#stageShot'),host=$('#demoHost');let cur=null,curShot=0,cleanup=null,lastFocus=null,curMode='demo';
const shotImg=document.createElement('img');shotImg.className='stage-img';shotImg.alt='';shotImg.hidden=true;if(shotCv)shotCv.after(shotImg);
if(modal){shotCv.dataset.scene=GAMES[0].scene;shotCv.dataset.v=0;ro.observe(shotCv);
  if(!document.fullscreenEnabled||!fine)$('#fsBtn').hidden=true;}
function openModal(id,mode,trigger){const g=GAMES.find(x=>x.id===id);if(!g||!modal)return;cur=g;lastFocus=trigger||document.activeElement;
  /* Auf Handys und in eingebetteten Ansichten (z. B. Claude-App) öffnet sich die Arcade direkt unter dem angetippten Element im Seitenfluss.
     So ist sie immer sichtbar, egal wie der umgebende Rahmen scrollt. Auf dem Desktop bleibt es ein Overlay. */
  const tall=innerHeight>Math.max(screen.height||0,900)*1.25,flow=tall||innerWidth<=760,panel=$('#mPanel');
  modal.classList.toggle('flow',flow);
  if(flow){const anchor=(trigger&&trigger.closest&&(trigger.closest('.reel')||trigger.closest('.card,.hero,.g-hero,.sw')))||$('main')||document.body;
    if(anchor.nextElementSibling!==modal)anchor.insertAdjacentElement(anchor.tagName==='MAIN'?'afterbegin':'afterend',modal)}
  else if(modal.parentElement!==document.body)document.body.appendChild(modal);
  $('#mTitle').textContent=g.title;$('#mGenres').innerHTML=g.genres.map(x=>`<span class="genre">${x}</span>`).join('');$('#mPanel').style.setProperty('--glow',g.accent);$('#mGenres').style.setProperty('--accent',g.accent);
  $('#mStory').textContent=g.story;$('#mKeys').innerHTML=g.controls.map(([a,k])=>`<li><span>${a}</span><kbd>${k}</kbd></li>`).join('');$('#mFeats').innerHTML=g.features.map(f=>`<li>${f}</li>`).join('');
  $('#mFormat').textContent=g.download.format;{const T=$('#mTips'),H=$('#mTipH');if(T&&!T.dataset.off)T.dataset.off=T.innerHTML,H.dataset.off=H.textContent;if(T){if(g.download.href){T.innerHTML=T.dataset.off;H.textContent=H.dataset.off}else{H.textContent='★ So spielst du';T.innerHTML='<li><b>Sofort loslegen</b>, direkt im Browser, ohne Download</li><li><b>Ohne Anmeldung</b> spielbar, dein Spielstand ist sicher auf dem Server</li><li><b>Mit Google anmelden</b> für Markt, Tausch, Duelle und Ranglisten</li><li><b>Kostenlos</b> und kein Pay-to-Win</li>'}}}const dl=$('#mDownload');if(g.download.href){dl.href=g.download.href;dl.setAttribute('download',g.download.href.split('/').pop());dl.hidden=false}else{dl.hidden=true}$('#mPage').href=g.page;
  const th=$('#thumbs');th.innerHTML='';g.shots.forEach((sh,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Screenshot '+(i+1)+': '+sh);const im=document.createElement('img');im.src=g.shotImgs[i];im.alt='';im.loading='lazy';b.appendChild(im);b.onclick=()=>{setMode('shots');setShot(i)};th.appendChild(b)});
  modal.hidden=false;if(!flow)document.documentElement.classList.add('modal-open');panel.scrollTop=0;if(flow)try{modal.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'})}catch(_){modal.scrollIntoView()}
  requestAnimationFrame(()=>{setShot(0);setMode(mode);$('.icon-btn',modal).focus({preventScroll:true})});
  try{history.replaceState(null,'','#spiel-'+g.id)}catch(_){}
  lxEv('modal',g.id);
}
function setShot(i){curShot=i;if(cur.real){shotImg.src=cur.shotImgs[i];shotImg.alt='Screenshot aus '+cur.title+': '+cur.shots[i];$$('#thumbs button').forEach((b,k)=>b.setAttribute('aria-current',k===i));return}shotCv.dataset.scene=cur.scene;shotCv.dataset.v=i;shotCv.setAttribute('aria-label','Screenshot aus '+cur.title+': '+cur.shots[i]);draw(shotCv,performance.now());$$('#thumbs button').forEach((b,k)=>b.setAttribute('aria-current',k===i))}
function setMode(m){curMode=m;const demo=m==='demo';stage.style.setProperty('--ratio',cur.ratio);stage.style.setProperty('--rnum',cur.rnum);$('#newTab').hidden=!(cur.play&&cur._ok!==false);if(cur.play)$('#newTab').href=cur.play;$('#modeDemo').setAttribute('aria-pressed',demo);$('#modeShots').setAttribute('aria-pressed',!demo);stage.classList.toggle('demo-mode',demo);$('#thumbs').hidden=demo;host.hidden=!demo;shotCv.hidden=demo||!!cur.real;shotImg.hidden=demo||!cur.real;
  if(cleanup){cleanup();cleanup=null}if(host.firstChild)lxEv('play',null);host.innerHTML='';
  if(demo||cur.real){if(demo)cleanup=mountGame(host,cur);stopLive(shotCv);if(!demo)setShot(curShot)}else{draw(shotCv,performance.now());goLive(shotCv)}}
function closeModal(){if(!modal||modal.hidden)return;if(cleanup){cleanup();cleanup=null}host.innerHTML='';lxEv('play',null);lxEv('modal',null);stopLive(shotCv);modal.hidden=true;document.documentElement.classList.remove('modal-open');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});try{history.replaceState(null,'',location.pathname+location.search)}catch(_){}const wasFlow=modal.classList.contains('flow');lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true});if(wasFlow&&lastFocus&&lastFocus.scrollIntoView)try{lastFocus.scrollIntoView({block:'center'})}catch(_){}}
if(modal){
$('#modeDemo').onclick=()=>setMode('demo');$('#modeShots').onclick=()=>setMode('shots');
$$('[data-close]',modal).forEach(b=>b.onclick=closeModal);
document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape')closeModal();if(e.key==='Tab'){const f=$$('button,a[href],input,[tabindex]:not([tabindex="-1"])',modal).filter(x=>x.offsetParent);if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus()}}
  if(curMode==='demo'||e.target.closest('input,textarea'))return;if(e.key==='ArrowRight')setShot((curShot+1)%cur.shots.length);if(e.key==='ArrowLeft')setShot((curShot+cur.shots.length-1)%cur.shots.length)});
$('#fsBtn').onclick=()=>{try{const p=document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen&&stage.requestFullscreen();p&&p.catch&&p.catch(()=>{})}catch(_){}};
const hm=location.hash.match(/^#spiel-([a-z0-9-]+)$/);if(hm&&GAMES.find(g=>g.id===hm[1]))setTimeout(()=>openModal(hm[1],'demo',document.getElementById('spiel-'+hm[1])),300);
}
}

})();

/* ---------- Chat-Begleiter „Lux“ (läuft komplett im Browser) ---------- */
(()=>{const src=document.getElementById('lux-data');if(!src||window.LGS_RENDER_ONLY)return;let D;try{D=JSON.parse(src.textContent)}catch(_){return}

const mane2=Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2,x=80+Math.cos(a)*30,y=90+Math.sin(a)*30;return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"/>`}).join('');
const arm=(c,x)=>`<g class="fx-arm ${c}"><rect x="${x-8}" y="134" width="16" height="42" rx="8" fill="#1c2140" stroke="#3be8ff" stroke-opacity=".55" stroke-width="1.3"/><circle cx="${x}" cy="178" r="9" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.1"/></g>`;
const body=`<svg class="lux-fig" viewBox="0 0 160 250"><defs><linearGradient id="lxb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3be8ff"/><stop offset=".55" stop-color="#9b5cff"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs>
<ellipse cx="80" cy="243" rx="44" ry="5.5" fill="#000" opacity=".4"/>
<g class="fx-tail"><path d="M100 196C128 200 146 182 141 156" stroke="#eab676" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="141" cy="150" r="9" fill="url(#lxb)"/></g>
<g class="fx-leg fx-legl"><rect x="61" y="186" width="17" height="48" rx="8.5" fill="#f3bf7c"/><ellipse cx="67" cy="236" rx="14" ry="7.5" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.2"/><path d="M60 233v4M65 232v5M70 233v4" stroke="#d9934f" stroke-width="1.2" stroke-linecap="round"/></g><g class="fx-leg fx-legr"><rect x="82" y="186" width="17" height="48" rx="8.5" fill="#f3bf7c"/><ellipse cx="93" cy="236" rx="14" ry="7.5" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.2"/><path d="M88 233v4M93 232v5M98 233v4" stroke="#d9934f" stroke-width="1.2" stroke-linecap="round"/></g>
<g class="fx-body"><path d="M52 150q0-26 28-26t28 26v34q0 14-14 14H66q-14 0-14-14z" fill="#1c2140" stroke="#3be8ff" stroke-opacity=".55" stroke-width="1.5"/><text x="80" y="172" text-anchor="middle" font-size="15" font-weight="900" font-family="Arial,sans-serif" fill="url(#lxb)">LX</text><path d="M74 132v12M86 132v12" stroke="#cfd8ff" stroke-width="1.4" stroke-linecap="round"/><circle cx="74" cy="145" r="1.6" fill="#cfd8ff"/><circle cx="86" cy="145" r="1.6" fill="#cfd8ff"/></g>
${arm('fx-l',55)}
<g class="fx-head"><g fill="url(#lxb)">${mane2}</g><circle cx="58" cy="66" r="8.5" fill="#ffcf8a"/><circle cx="102" cy="66" r="8.5" fill="#ffcf8a"/><circle cx="58" cy="66" r="4" fill="#f2a65a"/><circle cx="102" cy="66" r="4" fill="#f2a65a"/>
<circle cx="80" cy="92" r="27" fill="#ffcf8a"/><ellipse cx="80" cy="105" rx="14" ry="10" fill="#fff1dc"/>
<g class="fx-eyes"><ellipse cx="70" cy="88" rx="3.3" ry="4.3" fill="#1b1430"/><ellipse cx="90" cy="88" rx="3.3" ry="4.3" fill="#1b1430"/><circle cx="71.2" cy="86.5" r="1.1" fill="#fff"/><circle cx="91.2" cy="86.5" r="1.1" fill="#fff"/></g>
<path class="fx-happy" d="M66.5 89q3.5-4.5 7 0M86.5 89q3.5-4.5 7 0" stroke="#1b1430" stroke-width="2" fill="none" stroke-linecap="round"/>
<path class="fx-brows" d="M65 80q5-3 10 0M85 80q5-3 10 0" stroke="#c98545" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="62" cy="99" r="3.4" fill="#ff9a9a" opacity=".5"/><circle cx="98" cy="99" r="3.4" fill="#ff9a9a" opacity=".5"/>
<path d="M75.5 98h9l-4.5 4.4z" fill="#7a3b2e"/><path d="M80 102.4v2.4" stroke="#7a3b2e" stroke-width="1.4" stroke-linecap="round"/>
<path class="fx-smile" d="M73 106q7 5.5 14 0" stroke="#7a3b2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<g class="fx-mouth"><ellipse cx="80" cy="109.5" rx="6.5" ry="5" fill="#5a1f2a"/><ellipse cx="80" cy="112.3" rx="4" ry="2" fill="#ff7b8a"/></g></g>
${arm('fx-r',105)}</svg>`;
const root=document.createElement('div');root.className='lux';root.innerHTML=`
<button class="lux-stage" type="button" aria-label="Chat mit Lux öffnen" aria-expanded="false">${body}</button>
<div class="lux-hint" hidden>Psst! Brauchst du einen Tipp? 🦁</div>
<section class="lux-panel" role="dialog" aria-label="Chat mit Lux" hidden>
 <header class="lux-head"><b>Lux</b><small><i></i>Studio-Löwe</small><button class="lux-voice" type="button" aria-pressed="false" aria-label="Lux spricht seine Antworten vor" title="Lux spricht (Ton an/aus)"><span class="lv-txt">Ton</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path class="lv-on" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path class="lv-off" d="M17 9l5 6M22 9l-5 6"/></svg></button><input class="lux-vol" type="range" min="0" max="1" step="0.05" value="0.8" aria-label="Lautstärke" title="Lautstärke"><button class="lux-x" aria-label="Chat schließen">✕</button></header>
 <div class="lux-log" aria-live="polite"></div>
 <div class="lux-adv" hidden></div>
 <div class="lux-chips"></div>
 <form class="lux-form"><input class="lux-in" maxlength="200" placeholder="Frag Lux etwas …" aria-label="Nachricht an Lux" autocomplete="off"><button class="lux-mic" type="button" aria-label="Spracheingabe: Frage einsprechen" title="Reinsprechen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></button><button class="lux-send" aria-label="Senden"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg></button></form>
</section>`;document.body.appendChild(root);
const q=s=>root.querySelector(s),panel=q('.lux-panel'),log=q('.lux-log'),chipsEl=q('.lux-chips'),inp=q('.lux-in'),hint=q('.lux-hint');
const pick=a=>a[Math.floor(Math.random()*a.length)];
const GREET=['Rawr! 🦁 Ich bin Lux, der Studio-Löwe. Was kann ich für dich tun?','Hey! Ich bin Lux. Frag mich nach Spielen, Tipps oder Downloads! Du kannst auch aufs Mikro tippen und mit mir reden.'],FALLBACK=['Hm, da muss ich passen. 🦁 Frag mich zu Spielen, Downloads, Steuerung oder Software!','Das weiß selbst ein Löwe nicht. Versuch es mit einem Spielnamen, zum Beispiel „Tipps für Sternenwurf“.','Brüll… ich meine: Das habe ich nicht verstanden. Vielleicht hilft einer dieser Vorschläge?'],VOICEON='Okay, ab jetzt spreche ich mit dir! 🦁',MICDENY='Ich darf dein Mikrofon gerade nicht benutzen. Erlaube es über das Schloss-Symbol neben der Adresse und tipp dann nochmal aufs Mikro.',MICNONE='Ich habe nichts gehört. Tipp aufs Mikro und sprich einfach los! 🦁';
const norm=t=>t.toLowerCase().replace(/[ä]/g,'ä').replace(/[^a-z0-9äöüß ]+/g,' ').replace(/\s+/g,' ').trim();
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const L=(u,t)=>`<a href="${D.root}${u}">${t}</a>`;
function add(html,who){const m=document.createElement('div');m.className='lux-msg '+who;m.innerHTML=html;log.appendChild(m);log.scrollTop=log.scrollHeight;return m}
const stage=q('.lux-stage'),mouth=q('.fx-mouth'),smile=q('.fx-smile'),vbtn=q('.lux-voice'),mic=q('.lux-mic'),synth=window.speechSynthesis;
const GSEQ={talk:['beat','open','','beat','point'],wave:['wave','wave','beat'],laugh:['laugh','laugh','laugh'],point:['point','point','beat'],shrug:['shrug','shrug',''],think:['think','think','beat'],open:['open','beat','open']};
const GEST={hallo:'wave','tschüss':'wave',danke:'wave',witz:'laugh','wer bist du':'open',lewolux:'open',horror:'think',kostenlos:'open',deskboard:'point',diktakte:'point',speisekarte:'point'};
const VOICE=new Set(D.voice||[]),hash=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return(h>>>0).toString(16).padStart(8,'0')};
const plainOf=el=>{const a=[],w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))a.push(n.nodeValue);return a.join(' ').replace(/\s+/g,' ').trim()};
const SAYFIX=[[/House in the Desert/g,'Hauss in se Desört'],[/DeskBoard/g,'Deskbord'],[/Ring Legends/g,'Ring Ledschends'],[/Idle Legenden/g,'Eidl Legenden'],[/\bIdle\b/g,'Eidl'],[/Downloads/g,'Daunlods'],[/Download/g,'Daunlod'],[/Browser/g,'Brauser'],[/Gamepad/g,'Gämpäd'],[/Feedback/g,'Fiedbäck'],[/Rawr/g,'Roarr'],[/\bPets\b/g,'Pätts'],[/Early Access/g,'Örli Äxess'],[/offline/g,'offlein'],[/Account/g,'Äkaunt'],[/Xbox/g,'Ex Box'],[/PlayStation/g,'Pläi Stäischen'],[/E-Mail/g,'I-Mail'],[/Cookies/g,'Kukies'],[/Tracking/g,'Träcking'],[/Software/g,'Softwär'],[/Widgets/g,'Widschets'],[/QR-Code/g,'Ku Er Kod'],[/§/g,'Paragraph'],[/Abs\./g,'Absatz'],[/\bBGB\b/g,'B G B'],[/\bHTML\b/g,'H T M L'],[/RPG-Maker/g,'R P G Mäiker'],[/\bRNG\b/g,'R N G'],[/\bTCG\b/g,'T C G'],[/\bbeA\b/g,'be A'],[/Windows/g,'Windous'],[/@/g,' ät '],[/lewolux\.de/g,'lewolux punkt de'],[/\bBug\b/g,'Bagg'],[/Hobby/g,'Hobbi']];
const forSpeech=t=>{t=t.replace(/[\u{1F300}-\u{1FAFF}☀-➿▶]/gu,'').replace(/\*[^*]+\*/g,'');for(const[a,b]of SAYFIX)t=t.replace(a,b);return t.replace(/\s+/g,' ').trim()};
let actx=null,an=null,abuf=null,au=null,gain=null,vol=.8;try{const v=parseFloat(localStorage.getItem('luxVol'));if(v>=0&&v<=1)vol=v}catch(_){}
function audioEl(){if(au)return au;au=new Audio();au.preload='auto';try{actx=new(window.AudioContext||window.webkitAudioContext)();const src=actx.createMediaElementSource(au);an=actx.createAnalyser();an.fftSize=512;gain=actx.createGain();gain.gain.value=vol;src.connect(an);an.connect(gain);gain.connect(actx.destination);abuf=new Uint8Array(an.fftSize)}catch(_){an=null;au.volume=vol}return au}
const unlock=()=>{if(!voiceOn)return;audioEl();if(actx&&actx.state==='suspended')actx.resume().catch(()=>{})};
function level(){an.getByteTimeDomainData(abuf);let s=0;for(const v of abuf){const x=(v-128)/128;s+=x*x}return Math.min(1,Math.max(0,(Math.sqrt(s/abuf.length)-.012)*7.5))}
function hush(){if(synth)synth.cancel();if(au&&!au.paused)au.pause()}
let yawn=false,ml=0,mt=0,mraf=0,speaking=false,clip=false,talking=null,voiceOn=false;try{voiceOn=localStorage.getItem('luxVoice')==='1'}catch(_){}
const pose=p=>{stage.dataset.pose=p||''};
function setMouth(l){mouth.setAttribute('transform',`translate(80 105) scale(${(.85+l*.25).toFixed(2)} ${Math.max(l,.001).toFixed(3)}) translate(-80 -105)`);smile.style.opacity=Math.max(0,1-l*1.6).toFixed(2)}
function mloop(t){if(yawn)mt=.95;else if(speaking)mt=clip&&an?level():.2+.7*Math.abs(Math.sin(t/75))*(.55+.45*Math.sin(t/240));ml+=(mt-ml)*.45;setMouth(ml);
 if(talking||speaking||yawn||ml>.02)mraf=requestAnimationFrame(mloop);else{ml=0;setMouth(0);mraf=0}}
const kick=()=>{if(!mraf)mraf=requestAnimationFrame(mloop)};setMouth(0);
(function blink(){setTimeout(()=>{stage.classList.add('blink');setTimeout(()=>{stage.classList.remove('blink');blink()},140)},2200+Math.random()*3200)})();
const endTalk=()=>{speaking=false;clip=false;mt=0;if(!talking){stage.classList.remove('talking');pose('')}};
function playClip(url,onDur){const a=audioEl();if(actx&&actx.state==='suspended')actx.resume().catch(()=>{});a.src=url;a.onloadedmetadata=()=>onDur(a.duration);a.onplay=()=>{speaking=true;clip=true;stage.classList.add('talking');kick()};a.onended=a.onerror=a.onpause=endTalk;a.play().catch(()=>endTalk())}
function speak(text){if(!synth||!voiceOn||!text)return;synth.cancel();const u=new SpeechSynthesisUtterance(forSpeech(text));u.volume=vol;
 u.lang='de-DE';const vs=synth.getVoices().filter(v=>/^de/i.test(v.lang));u.voice=vs.find(v=>/natural/i.test(v.name)&&/conrad|killian|florian|ralf/i.test(v.name))||vs.find(v=>/natural|online/i.test(v.name))||vs.find(v=>/google/i.test(v.name))||vs[0]||null;u.pitch=1.05;u.rate=1;
 u.onstart=()=>{speaking=true;stage.classList.add('talking');kick()};u.onend=u.onerror=endTalk;synth.speak(u)}
function say(html,g){if(talking)talking.finish();const m=add(html,'bot');m.classList.add('typing-out');
 const nodes=[],w=document.createTreeWalker(m,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){nodes.push([n,n.nodeValue]);n.nodeValue=''}
 const plain=nodes.map(x=>x[1]).join(' ').replace(/\s+/g,' ').trim(),N=nodes.reduce((a,x)=>a+x[1].length,0),key=hash(plain),file=voiceOn&&VOICE.has(key),t0=performance.now(),seq=GSEQ[g]||GSEQ.talk;
 let dur=Math.min(Math.max(N*(voiceOn?60:30),700),voiceOn?12000:4500);
 let gi=0,gt=t0,done=false;pose(seq[0]);stage.classList.add('talking');
 const fill=k=>{for(const[nd,tx]of nodes){const c=Math.min(k,tx.length);nd.nodeValue=tx.slice(0,c);k-=c;if(k<=0&&c<tx.length)break}};
 const at=k=>{for(const[,tx]of nodes){if(k<=tx.length)return tx[k-1]||' ';k-=tx.length}return' '};
 function finish(){if(done)return;done=true;fill(1e9);m.classList.remove('typing-out');mt=0;talking=null;log.scrollTop=log.scrollHeight;
  setTimeout(()=>{if(!talking&&!speaking){stage.classList.remove('talking');pose('')}},g==='wave'||g==='laugh'?1200:700)}
 function step(now){if(done)return;const k=Math.min(N,Math.round(N*(now-t0)/dur));fill(k);log.scrollTop=log.scrollHeight;
  if(!speaking){const ch=at(k).toLowerCase();mt=/[aeiouäöüy]/.test(ch)?.95:/[.,!?:;…]/.test(ch)?0:ch===' '?.12:.45}
  if(seq.length>1&&now-gt>850){gt=now;gi=(gi+1)%seq.length;pose(seq[gi])}
  if(k>=N)finish();else requestAnimationFrame(step)}
 talking={finish};requestAnimationFrame(step);kick();hush();if(file)playClip(`${D.root}assets/voice/${key}.mp3?v=${D.vv||1}`,d=>{if(d&&isFinite(d))dur=Math.max(700,d*920)});else speak(plain)}
const volEl=q('.lux-vol');volEl.value=vol;volEl.style.setProperty('--p',vol*100+'%');
volEl.oninput=()=>{vol=+volEl.value;volEl.style.setProperty('--p',vol*100+'%');if(gain)gain.gain.value=vol;else if(au)au.volume=vol;try{localStorage.setItem('luxVol',vol)}catch(_){}};
function setVoice(on){voiceOn=on;vbtn.setAttribute('aria-pressed',on);vbtn.classList.toggle('on',on);try{localStorage.setItem('luxVoice',on?'1':'0')}catch(_){}if(on)unlock();else hush()}
if(!synth)vbtn.hidden=true;else{setVoice(voiceOn);vbtn.onclick=()=>{setVoice(!voiceOn);if(voiceOn)say(VOICEON,'wave')}}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,listening=false;
if(!SR)mic.hidden=true;else mic.onclick=()=>{if(listening){rec.stop();return}hush();if(talking)talking.finish();
 rec=new SR();rec.lang='de-DE';rec.interimResults=true;rec.maxAlternatives=1;let sent=false;
 rec.onstart=()=>{listening=true;mic.classList.add('on');inp.value='';inp.placeholder='Ich höre zu …';pose('listen')};
 rec.onresult=e=>{let t='',fin=false;for(const r of e.results){t+=r[0].transcript;if(r.isFinal)fin=true}inp.value=t;if(fin&&!sent){sent=true;rec.stop();ask(t)}};
 rec.onerror=e=>{if(/not-allowed|service-not-allowed/.test(e.error))say(MICDENY,'shrug');else if(e.error==='no-speech')say(MICNONE,'shrug')};
 rec.onend=()=>{listening=false;mic.classList.remove('on');inp.placeholder='Frag Lux etwas …';if(stage.dataset.pose==='listen')pose('')};
 try{rec.start()}catch(_){}};
function chips(list){chipsEl.innerHTML='';list.forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=()=>{unlock();ask(t)};chipsEl.appendChild(b)})}
function gameAnswer(g,t){
 if(g.teaser)return{a:`<b>${g.name}</b>: ${g.desc} Empfohlen ab ${g.age}, noch nicht spielbar. ${L(g.url,'Zur Vorschau')}`,c:['Welche Spiele gibt es?','Wo kann ich abstimmen?']};
 const want=k=>k.some(w=>t.includes(w));
 if(want(['steuer','taste','bedien','control','wie spielt','wie geht']))return{a:`So steuerst du <b>${g.name}</b>:<br>💻 ${g.pc.map(esc).join('<br>💻 ')}${g.mobile.length?'<br>📱 '+g.mobile.map(esc).join('<br>📱 '):''}<br>${L(g.url+'#handbuch','Komplettes Handbuch')}`,c:[`Tipps für ${g.name}`,`${g.name} spielen`]};
 if(want(['tipp','trick','hilfe','profi','schaffe','komme nicht']))return{a:g.tips.length?`Profi-Tipps für <b>${g.name}</b>:<br>💡 ${g.tips.map(esc).join('<br>💡 ')}`:`Für ${g.name} habe ich noch keine Tipps.`,c:[`Steuerung ${g.name}`,'Was soll ich spielen?']};
 if(want(['speicher','spielstand']))return{a:esc(g.save||'Der Spielstand liegt in deinem Browser.'),c:[`Tipps für ${g.name}`]};
 if(want(['start','anfang','einsteig','erste schritt']))return{a:`Schnellstart <b>${g.name}</b>:<br>1. ${g.quick.map(esc).join('<br>2. ')}`,c:[`Steuerung ${g.name}`]};
 if(want(['download','herunter','runterlad']))return{a:g.dl?`${g.name} gibt es als eine einzige Datei zum Download. ${L(g.url,'Zur Spielseite mit Download')}`:`${g.name} gibt es noch nicht als Download.`,c:[`${g.name} spielen`]};
 return{a:`<b>${g.name}</b> – ${esc(g.tag)}<br>${esc(g.desc)}<br>${g.play?`<button class="lux-play" data-open="${g.id}" data-mode="demo">▶ Jetzt spielen</button> `:''}${L(g.url,'Mehr Infos & Handbuch')}`,c:[`Steuerung ${g.name}`,`Tipps für ${g.name}`,'Was soll ich spielen?']}}
const tipLine=p=>`Mein Tipp: <b>${p.name}</b>! ${esc(p.tag)} <button class="lux-play" data-open="${p.id}" data-mode="demo">▶ Jetzt spielen</button>`;
function answer(raw){const t=' '+norm(raw)+' ';
 const g=D.games.find(g=>g.keys.some(k=>t.includes(' '+k)||t.includes(k+' ')||t.includes(k)));if(g){const r=gameAnswer(g,t);r.g=g.teaser?'think':'point';return r}
 let best=null,score=0;for(const it of D.intents){let s=0;for(const k of it.k)if(t.includes(k))s+=k.length;s*=it.w||1;if(s>score){score=s;best=it}}
 if(best){let a=pick(best.a);if(a==='__random__')return{g:'point',a:tipLine(pick(D.games.filter(x=>x.play))),c:['Noch ein Tipp','Welche Spiele gibt es?']};return{a,g:GEST[best.k[0]]||'talk',c:D.chips.slice(0,3)}}
 return{g:'shrug',a:pick(FALLBACK),c:D.chips}}
function ask(text){if(!text.trim())return;if(advOn){add(esc(text),'me');inp.value='';advText(text);return}
 if(ADVTRIG.test(norm(text))){add(esc(text),'me');inp.value='';chipsEl.innerHTML='';setTimeout(advStart,450);return}
 add(esc(text),'me');inp.value='';chipsEl.innerHTML='';const typing=add('<span class="lux-typing"><i></i><i></i><i></i></span>','bot');
 setTimeout(()=>{typing.remove();const r=answer(text==='Noch ein Tipp'?'was soll ich spielen':text);say(r.a,r.g);chips(r.c||D.chips)},450+Math.random()*450)}
/* ---------- Text-Adventure: Lux und das Herz des Neon-Dschungels ---------- */
const ADVTRIG=/(mit dir (zusammen )?spielen|spiel (doch )?mit mir|spielen wir|lass uns spielen|abenteuer|text ?adventure)/;
const RESUME='Da bist du ja wieder, Partner! Der Neon-Dschungel wartet noch auf uns. Machen wir weiter, wo wir aufgehört haben, oder fangen wir ganz von vorne an?',
 EXITLINE='Okay, Abenteuer pausiert. Ich merke mir genau, wo wir waren. Sag einfach „Ich will mit dir zusammen spielen“, dann geht es weiter! 🦁',
 ADVHELP='Hm, das verstehe ich im Dschungel nicht. Tipp einfach auf eine der Antworten unten. Oder sag „Abenteuer beenden“, dann machen wir Pause.';
const ADV={
 start:{g:'open',t:'Psst, komm näher. Ich verrate dir ein Geheimnis: Hinter dieser Website liegt der Neon-Dschungel. Dort leuchtet alles, die Bäume, die Flüsse, sogar die Käfer. Aber seit gestern wird das Leuchten immer schwächer. Das Herz des Dschungels, ein riesiger Kristall, ist in drei Splitter zersprungen. Wenn wir sie nicht finden, wird es dort für immer dunkel. Kommst du mit?',c:[["Klar, los geht's!",'hub'],['Was muss ich wissen?','regeln']]},
 regeln:{g:'beat',t:'Ganz einfach: Du entscheidest, ich führe dich. Du hast drei Herzen Mut. Verlierst du alle, ruhen wir uns am Lagerfeuer aus und machen weiter. Gefundene Splitter und Gegenstände behältst du. Dein Fortschritt wird automatisch auf diesem Gerät gespeichert, und mit „Abenteuer beenden“ kannst du jederzeit Pause machen.',c:[['Verstanden, los!','hub']]},
 rand0:{g:'point',t:'Wir stehen am Rand des Neon-Dschungels. Riesige Farne glühen türkis, irgendwo zirpt etwas in Lila. Vor uns teilt sich der Pfad: Links rauscht der Flüsterfluss. Geradeaus ragt eine alte Ruine aus dem Dickicht. Und rechts schaukelt eine Hängebrücke über einer tiefen Schlucht. Wohin zuerst?'},
 rand1:{g:'open',t:'Zurück am Dschungelrand. Ein Splitter summt schon in deiner Tasche, und die Farne leuchten ein kleines bisschen heller. Zwei fehlen noch. Wohin jetzt?'},
 rand2:{g:'open',t:'Wieder am Dschungelrand. Zwei Splitter, nur noch einer! Ich kann es schon fast riechen, das Licht kommt zurück. Wohin gehen wir?'},
 rand3:{g:'wave',t:'Alle drei Splitter summen in deiner Tasche, blau, grün und rot! Hörst du das? Oben auf dem Berg öffnet sich der Weg zum Sonnentempel. Dort gehört das Herz des Dschungels hin. Bereit für das große Finale?',c:[['Auf zum Sonnentempel!','tempel']]},
 fluss:{g:'point',t:'Der Flüsterfluss glitzert wie flüssiges Mondlicht. Mitten im Wasser, auf einem Stein, funkelt etwas Blaues: ein Splitter! Aber die Strömung ist stark. Am Ufer liegt ein altes Seil, und ein Stück weiter treibt ein umgekippter Baumstamm.',c:[['Mit dem Seil zum Stein','fluss_seil'],['Über den Baumstamm balancieren','fluss_stamm'],['Einfach rüberschwimmen','rand:fluss_fische|fluss_strudel']]},
 fluss_seil:{g:'laugh',e:{shard:'blau',item:'seil'},t:'Du knotest das Seil an einen Ast, ich halte mit aller Löwenkraft dagegen. Stück für Stück hangelst du dich zum Stein. Geschafft! Der blaue Splitter summt leise in deiner Hand. Das Seil nehmen wir mit, wer weiß, wofür es noch gut ist.',c:[['Zurück zum Dschungelrand','hub']]},
 fluss_stamm:{g:'shrug',e:{hp:-1},t:'Der Stamm wackelt, wackelt … und dreht sich! Platsch! Du landest im Wasser, und ich fische dich mit dem Schwanz wieder raus. Klitschnass, aber heil. Das hat ein Herz Mut gekostet.',c:[['Diesmal mit dem Seil','fluss_seil'],['Doch rüberschwimmen','rand:fluss_fische|fluss_strudel']]},
 fluss_fische:{g:'laugh',e:{shard:'blau',item:'beere'},t:'Mutig! Die Strömung zerrt an dir, doch plötzlich tauchen leuchtende Fische auf und schieben dich sanft zum Stein. Sie mögen offenbar Abenteurer. Der blaue Splitter gehört dir! Zum Abschied zwinkert dir ein Fisch zu und lässt eine Glühbeere ans Ufer treiben.',c:[['Zurück zum Dschungelrand','hub']]},
 fluss_strudel:{g:'shrug',e:{hp:-1},t:'Ein Strudel packt dich, wirbelt dich herum und spuckt dich zurück ans Ufer. Vor Schreck ist meine Mähne ganz zerzaust. Ein Herz Mut ist weg.',c:[['Lieber mit dem Seil','fluss_seil'],['Nochmal schwimmen','rand:fluss_fische|fluss_strudel']]},
 ruine:{g:'think',t:'Die Ruine der Glühwürmchen. Tausende kleine Lichter tanzen um eine steinerne Tür. Darauf steht ein Rätsel: „Ich habe Tasten, aber kein Klavier. Ich habe eine Leertaste, aber keinen leeren Raum. Und ohne mich schreibst du am Computer kein Wort. Was bin ich?“',c:[['Eine Tastatur','ruine_auf'],['Ein Schlüsselbund','ruine_falsch'],['Eine Fernbedienung','ruine_falsch']]},
 ruine_falsch:{g:'shrug',e:{hp:-1},t:'Die Tür grummelt, und die Glühwürmchen pieksen dich in die Nase. Autsch! Ein Herz Mut weniger. Denk an das Ding, auf dem man tippt …',c:[['Eine Tastatur','ruine_auf'],['Ein Schlüsselbund','ruine_falsch'],['Eine Fernbedienung','ruine_falsch']]},
 ruine_auf:{g:'laugh',t:'Richtig, eine Tastatur! Knirschend schiebt sich die Tür zur Seite. Drinnen liegt der grüne Splitter auf einem Sockel, umringt von schlafenden Glühwürmchen. Leise jetzt …',c:[['Auf Zehenspitzen hinschleichen','ruine_leise'],['Schnell schnappen und rennen','ruine_schnell']]},
 ruine_leise:{g:'open',e:{shard:'gruen',item:'laterne'},t:'Auf Zehenspitzen schleichst du zum Sockel. Kein einziges Glühwürmchen wacht auf. Der grüne Splitter ist unser! Neben dem Sockel steht eine alte Laterne mit warmem Licht. Die nehmen wir mit.',c:[['Zurück zum Dschungelrand','hub']]},
 ruine_schnell:{g:'shrug',e:{shard:'gruen',hp:-1},t:'Zack, der Splitter ist in deiner Hand! Aber alle Glühwürmchen wachen auf und jagen uns brummend nach draußen. Wir rennen, bis die Pfoten qualmen. Splitter gerettet, aber ein Herz Mut ist futsch.',c:[['Zurück zum Dschungelrand','hub']]},
 bruecke:{g:'point',t:'Die Hängebrücke schaukelt über der Schlucht. In der Mitte hockt ein Neon-Affe und hält den roten Splitter fest wie eine Banane. „Den gebe ich nur her, wenn du mir etwas richtig Gutes gibst!“, kreischt er.',c:[['Glühbeere anbieten','affe_beere',{need:'beere'}],['Einen Witz erzählen','rand:affe_lacht|affe_gaehnt'],['Splitter wegschnappen','if:seil?affe_seil:affe_sturz']]},
 affe_beere:{g:'laugh',e:{shard:'rot',drop:'beere'},t:'Die Augen des Affen werden riesengroß. „Eine Glühbeere! Mein Lieblingssnack!“ Er tauscht sofort und schmatzt glücklich vor sich hin. Der rote Splitter gehört dir!',c:[['Zurück zum Dschungelrand','hub']]},
 affe_lacht:{g:'laugh',e:{shard:'rot'},t:'Du erzählst: „Was ist grün und klopft an die Tür? Ein Klopfsalat!“ Der Affe lacht so sehr, dass er fast von der Brücke fällt. „Okay, okay, den hast du dir verdient!“ Der rote Splitter gehört dir!',c:[['Zurück zum Dschungelrand','hub']]},
 affe_gaehnt:{g:'shrug',e:{hp:-1},t:'Der Affe gähnt. „Kenn ich schon.“ Dann wirft er dir eine Bananenschale an den Kopf. Autsch, ein Herz Mut weniger. Versuch etwas anderes!',c:[['Glühbeere anbieten','affe_beere',{need:'beere'}],['Noch einen Witz','rand:affe_lacht|affe_gaehnt'],['Splitter wegschnappen','if:seil?affe_seil:affe_sturz']]},
 affe_seil:{g:'laugh',e:{shard:'rot'},t:'Du bindest das Seil an die Brücke, schwingst dich darunter durch und schnappst den Splitter von unten. Der Affe ist so verdutzt, dass er nur „Hä?“ sagt. Der rote Splitter gehört dir!',c:[['Zurück zum Dschungelrand','hub']]},
 affe_sturz:{g:'shrug',e:{hp:-1},t:'Du greifst zu, der Affe weicht aus, die Brücke schaukelt wild, und plötzlich hängst du kopfüber am Geländer. Ich ziehe dich zurück. Puh! Ein Herz Mut weniger. Mit einem Seil hätte das vielleicht geklappt.',c:[['Glühbeere anbieten','affe_beere',{need:'beere'}],['Einen Witz erzählen','rand:affe_lacht|affe_gaehnt'],['Zurück zum Dschungelrand','hub']]},
 tempel:{g:'think',t:'Der Sonnentempel. Ganz oben steht der leere Sockel für das Herz des Dschungels. Doch davor löst sich etwas aus der Dunkelheit: der Schattenpanther! Seine Augen glühen kalt. „Das Licht gehört jetzt mir“, faucht er.',c:[['Laterne hochhalten','panther_licht',{need:'laterne'}],['Mit ihm reden','panther_reden'],['Kämpfen!','panther_kampf']]},
 panther_kampf:{g:'shrug',e:{hp:-1},t:'Ich brülle so laut ich kann, und du stellst dich mutig neben mich. Der Panther zuckt zurück, dann springt er. Wir weichen aus, aber seine Pfote streift dich. Ein Herz Mut weniger. So kommen wir nicht weiter.',c:[['Laterne hochhalten','panther_licht',{need:'laterne'}],['Mit ihm reden','panther_reden']]},
 panther_reden:{g:'think',t:'„Warum willst du das Licht?“, fragst du. Der Panther senkt den Kopf. „Weil mich im Dunkeln niemand sieht. Alle haben Angst vor mir. Ich bin immer allein.“ Oh. Er ist gar nicht böse, nur einsam.',c:[['Ihn einladen, mit uns zu leuchten','ende_gut'],['Ihn auslachen','panther_wut']]},
 panther_wut:{g:'shrug',e:{hp:-1},t:'Schlechte Idee! Der Panther faucht, und ein eiskalter Schatten streift dich. Ein Herz Mut weniger. Vielleicht etwas netter?',c:[['Entschuldigen und nochmal reden','panther_reden']]},
 panther_licht:{g:'open',t:'Du hebst die alte Laterne. Ihr warmes Licht fällt auf den Panther, und plötzlich sieht man es: Sein Fell schimmert wunderschön silbern. „So hat mich noch nie jemand gesehen“, flüstert er. Der kalte Schatten verschwindet.',c:[['Die Splitter einsetzen','ende_gut']]},
 ende_gut:{g:'laugh',e:{done:true},t:'Wir setzen die drei Splitter in den Sockel: blau, grün, rot. Ein Summen, ein Blitz, und das Herz des Dschungels strahlt heller als je zuvor! Der Panther bekommt ein silbernes Leuchten ab und schnurrt zum ersten Mal in seinem Leben. Der Neon-Dschungel ist gerettet. Und das, Partner, verdanken wir dir! 🦁✨',c:[['Nochmal spielen','__new'],['Zurück zum Chat','__exit']]},
 ende_mut:{g:'open',e:{heal:true},t:'Uff, kein Mut mehr übrig. Wir setzen uns ans Lagerfeuer am Dschungelrand, trinken einen Kokos-Kakao und sammeln neue Kraft. Deine Splitter und Gegenstände sind sicher. Mit vollen Herzen geht es weiter!',c:[["Weiter geht's",'hub']]}};
const HUBC=[['Zum Flüsterfluss','fluss',{hide:'blau'}],['Zur Ruine','ruine',{hide:'gruen'}],['Über die Hängebrücke','bruecke',{hide:'rot'}]];
['rand0','rand1','rand2'].forEach(k=>ADV[k].c=HUBC);
const AKEY='luxAdv',advEl=q('.lux-adv'),fresh=()=>({s:'start',hp:3,sh:[],it:[],done:false});
let A=null,advOn=false,advCur=[];try{A=JSON.parse(localStorage.getItem(AKEY))}catch(_){}
const advSave=()=>{try{localStorage.setItem(AKEY,JSON.stringify(A))}catch(_){}};
const has=k=>A.it.includes(k)||A.sh.includes(k);
function resolve(t){if(t==='hub')return'rand'+A.sh.length;if(t.startsWith('rand:'))return pick(t.slice(5).split('|'));if(t.startsWith('if:')){const[k,r]=t.slice(3).split('?'),[x,y]=r.split(':');return has(k)?x:y}return t}
function advBar(){advEl.hidden=!advOn;if(!advOn||!A)return;const gem=(k,c)=>`<i class="gem${A.sh.includes(k)?' on':''}" style="--c:${c}" title="Splitter ${k}"></i>`;const IT={seil:'🪢 Seil',beere:'🫐 Glühbeere',laterne:'🏮 Laterne'};
 advEl.innerHTML=`<span class="adv-t">Neon-Dschungel</span><span class="adv-hp" title="Mut">${'❤️'.repeat(A.hp)}${'🖤'.repeat(3-A.hp)}</span><span class="adv-gems">${gem('blau','#3be8ff')}${gem('gruen','#57ff9a')}${gem('rot','#ff4d6d')}</span>${A.it.length?`<span class="adv-it">${A.it.map(k=>IT[k]).join(' · ')}</span>`:''}`}
function advChips(list){advCur=list;chipsEl.innerHTML='';list.forEach(([l,t])=>{const b=document.createElement('button');b.type='button';b.className='adv';b.textContent=l;b.onclick=()=>{unlock();advPick(l,t)};chipsEl.appendChild(b)});
 if(list.some(c=>c[1]==='__exit'))return;const x=document.createElement('button');x.type='button';x.className='adv-x';x.textContent='Abenteuer beenden';x.onclick=()=>{unlock();add('Abenteuer beenden','me');advExit()};chipsEl.appendChild(x)}
function advPick(label,t){add(esc(label),'me');chipsEl.innerHTML='';const ty=add('<span class="lux-typing"><i></i><i></i><i></i></span>','bot');setTimeout(()=>{ty.remove();advGo(t)},420)}
function advGo(t,replay){if(t==='__new'){A=fresh();t='start'}if(t==='__exit')return advExit();if(t==='__cont'){t=A.s;replay=true}
 const id=resolve(t),sc=ADV[id];A.s=id;const e=replay?{}:(sc.e||{});
 if(e.hp)A.hp=Math.max(0,A.hp+e.hp);if(e.shard&&!A.sh.includes(e.shard))A.sh.push(e.shard);if(e.item&&!A.it.includes(e.item))A.it.push(e.item);if(e.drop)A.it=A.it.filter(k=>k!==e.drop);if(e.heal)A.hp=3;if(e.done)A.done=true;
 advSave();advBar();say(sc.t,sc.g);
 advChips(A.hp<=0?[['Ans Lagerfeuer 🔥','ende_mut']]:(sc.c||[]).filter(([,,o={}])=>(!o.need||has(o.need))&&(!o.hide||!A.sh.includes(o.hide))))}
function advStart(){advOn=true;root.classList.add('adv');if(A&&!A.done&&A.s!=='start'){advBar();say(RESUME,'wave');advChips([['Weiterspielen','__cont'],['Neu starten','__new']])}else{A=fresh();advGo('start')}}
function advExit(){advOn=false;root.classList.remove('adv');advBar();say(EXITLINE,'wave');chips(D.chips)}
function advText(raw){const t=norm(raw);if(/beend|stopp|aufhör|pause|zurück zum chat/.test(t))return advExit();
 if(/^(ruine|ruine_falsch)$/.test(A.s)&&/tastatur|keyboard/.test(t))return setTimeout(()=>advGo('ruine_auf'),400);
 const hit=advCur.find(([l])=>{const n=norm(l);return n.includes(t)||t.includes(n)||n.split(' ').some(w=>w.length>4&&t.includes(w))});
 if(hit){chipsEl.innerHTML='';setTimeout(()=>advGo(hit[1]),400);return}say(ADVHELP,'shrug')}

/* Lux bewegt sich ab und zu von selbst: hüpfen, drehen, umschauen, gähnen, ein paar Schritte gehen */
const wait=ms=>new Promise(r=>setTimeout(r,ms));let busy=false;
async function act(a){busy=true;const cls=c=>stage.classList.add(c),un=c=>stage.classList.remove(c);
 if(a==='hop'){pose('jump');cls('a-hop');await wait(800);un('a-hop');pose('')}
 else if(a==='spin'){cls('a-spin');await wait(1200);un('a-spin')}
 else if(a==='look'){cls('a-look');await wait(2600);un('a-look')}
 else if(a==='wave'){pose('wave');await wait(1800);pose('')}
 else if(a==='yawn'){pose('stretch');cls('sleepy');yawn=true;kick();await wait(1500);yawn=false;un('sleepy');pose('')}
 else if(a==='walk'){const d=-(45+Math.round(Math.random()*45));cls('walking');stage.style.setProperty('--wx',d+'px');await wait(2600);un('walking');
  cls('a-look');await wait(2200);un('a-look');cls('walking');stage.style.setProperty('--wx','0px');await wait(2600);un('walking')}
 busy=false}
(function idleLoop(){setTimeout(async()=>{const closed=panel.hidden;
 if(!document.hidden&&!busy&&!talking&&!speaking&&!listening&&!root.classList.contains('duck'))await act(pick(closed?['hop','spin','walk','look','wave','yawn','walk','hop']:['hop','look','spin']));
 idleLoop()},closed0()?7000+Math.random()*7000:12000+Math.random()*10000)})();
function closed0(){return panel.hidden}
/* Handy: Chat füllt den sichtbaren Bereich, auch wenn die Tastatur offen ist */
const mob=matchMedia('(max-width:520px)'),vv=window.visualViewport;
function fit(){if(!vv)return;root.style.setProperty('--vvh',vv.height+'px');root.style.setProperty('--vvt',vv.offsetTop+'px');if(!panel.hidden)log.scrollTop=log.scrollHeight}
if(vv){vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);fit()}
let started=false;function open(o){document.documentElement.classList.toggle('lux-lock',o&&mob.matches);fit();panel.hidden=!o;stage.setAttribute('aria-expanded',o);stage.setAttribute('aria-label',o?'Chat mit Lux schließen':'Chat mit Lux öffnen');root.classList.toggle('open',o);hint.hidden=true;try{sessionStorage.setItem('luxSeen','1')}catch(_){}
 if(!o){if(talking)talking.finish();hush();if(listening&&rec)rec.stop()}
 if(o&&!started){started=true;setTimeout(()=>say(pick(GREET),'wave'),350);chips(D.chips)}if(o)setTimeout(()=>inp.focus({preventScroll:true}),50)}
stage.onclick=()=>{unlock();open(panel.hidden)};q('.lux-x').onclick=()=>open(false);hint.onclick=()=>open(true);
q('.lux-form').onsubmit=e=>{e.preventDefault();unlock();ask(inp.value)};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)open(false)});
log.addEventListener('click',e=>{if(e.target.closest('.lux-play'))open(false)});
let seen=false;try{seen=!!sessionStorage.getItem('luxSeen')}catch(_){}
if(!seen)setTimeout(()=>{if(panel.hidden){hint.hidden=false;pose('wave');setTimeout(()=>{if(panel.hidden)pose('')},1800)}},6000);
let dk=0;addEventListener('scroll',()=>{if(!panel.hidden)return;root.classList.add('duck');hint.hidden=true;clearTimeout(dk);dk=setTimeout(()=>root.classList.remove('duck'),650)},{passive:true});
if(location.hash==='#luxlines'){const tmp=document.createElement('div'),P=h=>{tmp.innerHTML=h;return plainOf(tmp)},out=[...GREET,...FALLBACK,VOICEON,MICDENY,MICNONE,RESUME,EXITLINE,ADVHELP,...Object.values(ADV).map(x=>x.t)];
 D.intents.forEach(it=>it.a.forEach(a=>{if(a!=='__random__')out.push(a)}));
 D.games.forEach(g=>{[' ',' steuer ',' tipp ',' speicher ',' start ',' download '].forEach(t=>out.push(gameAnswer(g,t).a));if(g.play)out.push(tipLine(g))});
 const seen2=new Set;window.__luxLines=out.map(P).filter(t=>!seen2.has(t)&&seen2.add(t)).map(t=>({h:hash(t),t,s:forSpeech(t)}))}
})();

/* ---------- Löwenfang: wer Lux erwischt, bekommt einen Punkt. Zähler oben rechts, Rekord + Platz 2 und 3 für alle ---------- */
window.lxLion=(()=>{if(window.LGS_RENDER_ONLY)return null;
const badge=document.getElementById('lionBadge'),num=document.getElementById('lionN');
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(_){return null}};
let pid=ls('lxPid');if(!pid){pid=Math.random().toString(36).slice(2,12)+Date.now().toString(36);ls('lxPid',pid)}
let count=+(ls('lxLion')||0),name=ls('lxLionName')||'',top=[],busy=false;
const show=()=>{if(!badge)return;if(count>0){badge.hidden=false;num.textContent=count.toLocaleString('de-DE')}};show();
const api=async(body)=>{if(location.protocol!=='https:')return null;try{const r=await fetch('/api/lions',{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)return null;const j=await r.json();if(j.top)top=j.top;return j}catch(_){return null}};
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function panel(){
  document.querySelectorAll('.lion-pop').forEach(x=>x.remove());
  const d=document.createElement('div');d.className='lion-pop';
  const medal=['🥇','🥈','🥉'];
  const rows=top.length?top.slice(0,3).map((t,i)=>`<li class="${t.me?'me':''}"><span>${medal[i]}</span><b>${esc(t.name)}</b><em>${t.count.toLocaleString('de-DE')}</em>${i===0?'<small>Rekordhalter</small>':''}</li>`).join(''):'<li class="empty">Noch kein Rekord – sei die oder der Erste!</li>';
  d.innerHTML=`<div class="lp-h">🦁 Löwenfang</div><p>Lux lugt hinter den Kacheln hervor. Erwisch ihn, bevor er sich versteckt!</p><div class="lp-me">Du: <b>${count.toLocaleString('de-DE')}</b>× gefangen</div><ol>${rows}</ol>`+
   (name?`<p class="lp-name">Du spielst als <b>${esc(name)}</b> · <button type="button" data-rename>ändern</button></p>`:'')+
   `<form class="lp-form" ${name?'hidden':''}><input maxlength="16" placeholder="Dein Name für die Bestenliste" value="${esc(name)}" autocomplete="nickname"><button>Eintragen</button></form><button type="button" class="lp-x" aria-label="Schließen">✕</button>`;
  document.body.appendChild(d);
  const f=d.querySelector('form'),inp=f.querySelector('input');
  d.querySelector('.lp-x').onclick=()=>d.remove();
  const rn=d.querySelector('[data-rename]');if(rn)rn.onclick=()=>{f.hidden=false;inp.focus()};
  f.onsubmit=async e=>{e.preventDefault();const v=inp.value.trim().replace(/\s+/g,' ');if(v.length<2){inp.focus();return}name=v;ls('lxLionName',v);const j=await api({pid,name:v});if(j&&j.error==='name'){name='';ls('lxLionName','');inp.value='';inp.placeholder='Bitte einen anderen Namen wählen';return}panel()};
  setTimeout(()=>document.addEventListener('click',function off(e){if(!d.contains(e.target)&&e.target!==badge&&!badge.contains(e.target)){d.remove();document.removeEventListener('click',off)}}),0);
}
if(badge)badge.onclick=async()=>{panel();await api();if(document.querySelector('.lion-pop'))panel()};
function bubble(x,y,txt){const b=document.createElement('div');b.className='lion-aua';b.textContent=txt;b.style.left=x+'px';b.style.top=y+'px';document.body.appendChild(b);setTimeout(()=>b.remove(),1400)}
async function caught(x,y){if(busy)return;busy=true;setTimeout(()=>busy=false,600);
  count++;ls('lxLion',count);show();badge&&badge.classList.remove('pop');void(badge&&badge.offsetWidth);badge&&badge.classList.add('pop');
  bubble(x,y,['Aua!','Hey!','Erwischt!','Aua, meine Mähne!','Nicht kitzeln!'][Math.min(4,Math.floor(Math.random()*(count>3?5:2)))]);
  const j=await api({pid,name:name||undefined,catch:1});
  if(count===1&&!name)setTimeout(panel,900);
  else if(j&&j.top&&j.top[0]&&j.top[0].me&&j.mine===j.top[0].count&&count>1){bubble(x,y-40,'Neuer Rekord! 🏆')}
}
return{caught};})();

function touchLion(svg){
  const SEL='.card,.shot,.sw,.sp-shot,.sp-feat,.g-shot,.dl-box,.stat';
  const box=document.createElement('div');box.className='tpeek';box.innerHTML='<div class="tpeek-in">'+svg+'</div>';
  const go=()=>{setTimeout(()=>{if(document.hidden||document.documentElement.classList.contains('modal-open')||document.querySelector('.lux.open')){go();return}
    const vh=innerHeight,c=[...document.querySelectorAll(SEL)].filter(e=>{const r=e.getBoundingClientRect();return r.width>140&&r.top>140&&r.top<vh-120});
    if(!c.length){go();return}const r=c[Math.floor(Math.random()*c.length)].getBoundingClientRect();
    box.style.left=(r.left+20+Math.random()*Math.max(0,r.width-140))+'px';box.style.top=(r.top-62)+'px';box.className='tpeek up';
    setTimeout(()=>{box.className='tpeek';go()},1050+Math.random()*300)},18000+Math.random()*22000)};
  box.addEventListener('touchstart',e=>{if(!box.classList.contains('up'))return;e.preventDefault();const t=e.touches[0];if(window.lxLion)lxLion.caught(t.clientX,t.clientY);box.className='tpeek';},{passive:false});
  window.__tpeekBox=box;document.body.appendChild(box);go();
}
/* ---------- Guck-Löwe: Lux lugt hinter den Kacheln hervor und folgt der Maus (nur PC) ---------- */
(()=>{if(window.LGS_RENDER_ONLY)return;
const fine=matchMedia('(hover:hover) and (pointer:fine)'),calm=matchMedia('(prefers-reduced-motion:reduce)');

const SEL='.card,.shot,.keyart,.monitor,.sp-feat,.mn-tile,.mn-panel,.cm-card,.dl-box,.dl-tip,.sp-shot,.sp-fig,.sp-why,.sw,.sw-banner,.stat,.tp-shot,.tp-hero,.sp-hero,.tp-notice,.g-shot';
const W=100,H=81,HIDE=H+6,html=document.documentElement;
const mane=Array.from({length:14},(_,i)=>{const a=Math.PI+i/13*Math.PI,x=48+Math.cos(a)*29,y=50+Math.sin(a)*29;return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10"/>`}).join('')+'<circle cx="21" cy="62" r="10"/><circle cx="75" cy="62" r="10"/>';
const svg=`<svg viewBox="0 0 96 78" width="${W}" height="${H}"><defs><linearGradient id="pkm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3be8ff"/><stop offset=".55" stop-color="#9b5cff"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs>
<g class="pk-head"><g fill="url(#pkm)">${mane}</g>
<g class="pk-ears"><circle cx="28" cy="29" r="7" fill="#ffcf8a"/><circle cx="68" cy="29" r="7" fill="#ffcf8a"/><circle cx="28" cy="29" r="3.4" fill="#f2a65a"/><circle cx="68" cy="29" r="3.4" fill="#f2a65a"/></g>
<circle cx="48" cy="51" r="23" fill="#ffcf8a"/><ellipse cx="48" cy="61" rx="11" ry="8" fill="#fff1dc"/>
<g class="pk-eyes"><ellipse cx="39.5" cy="47" rx="5.2" ry="6.2" fill="#fff"/><ellipse cx="56.5" cy="47" rx="5.2" ry="6.2" fill="#fff"/>
<g class="pk-pupil"><circle cx="39.5" cy="47.5" r="3.3" fill="#1b1430"/><circle cx="40.6" cy="46.2" r="1" fill="#fff"/></g><g class="pk-pupil"><circle cx="56.5" cy="47.5" r="3.3" fill="#1b1430"/><circle cx="57.6" cy="46.2" r="1" fill="#fff"/></g></g>
<path class="pk-brow" d="M34 38.5q5-3 10 0M52 38.5q5-3 10 0" stroke="#c98545" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<g class="pk-blush" fill="#ff8f8f"><circle cx="31" cy="57" r="3.6"/><circle cx="65" cy="57" r="3.6"/></g>
<path d="M44.5 56h7l-3.5 3.6z" fill="#7a3b2e"/><path d="M48 59.6v2M48 61.6c-1.5 1.7-3.6 1.7-4.8.6M48 61.6c1.5 1.7 3.6 1.7 4.8.6" stroke="#7a3b2e" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>
<g class="pk-paws" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.2"><ellipse cx="20" cy="73" rx="10" ry="6.5"/><ellipse cx="76" cy="73" rx="10" ry="6.5"/><path d="M16 70v5M20 69.5v5.5M24 70v5M72 70v5M76 69.5v5.5M80 70v5" fill="none" stroke-linecap="round"/></g></svg>`;
if(!fine.matches){touchLion(svg);return;}
const box=document.createElement('div');box.className='peek';box.setAttribute('aria-hidden','true');box.innerHTML=`<div class="peek-in">${svg}</div>`;document.body.appendChild(box);
const inn=box.firstChild,pupils=[...box.querySelectorAll('.pk-pupil')],hdr=document.querySelector('.site-header');
let shyAt=0,coolUntil=0;let els=[],collected=0,mx=-1e4,my=-1e4,moved=0,dirty=true,best=null,el=null,edge=null,rot=0,cx=0,cy=0,tx=0,ty=0,bw=W,bh=H,p=HIDE,pt=HIDE,out=0;
const clamp=(v,a,b)=>a>b?(a+b)/2:Math.min(b,Math.max(a,v));
function place(k,r,hb,vw,vh){
  if(k==='top'||k==='bottom'){if(r.width<W+16)return null;const off=mx<(r.left+r.right)/2?70:-70,x=clamp(mx+off,r.left+W/2+8,r.right-W/2-8),y=k==='top'?r.top-H:r.bottom;
    if(y<hb||y+H>vh||x-W/2<0||x+W/2>vw)return null;return{x:x-W/2,y,w:W,h:H,rot:k==='top'?0:180}}
  if(r.height<W+16)return null;const off=my<(r.top+r.bottom)/2?70:-70,y=clamp(my+off,r.top+W/2+8,r.bottom-W/2-8),x=k==='left'?r.left-H:r.right;
  if(x<0||x+H>vw||y-W/2<hb||y+W/2>vh)return null;return{x,y:y-W/2,w:H,h:W,rot:k==='left'?-90:90}}
function choose(){const hb=(hdr?hdr.getBoundingClientRect().bottom:0)+6,vw=html.clientWidth,vh=innerHeight;let b=null;const rects=els.map(e=>({e,r:e.getBoundingClientRect()})).filter(o=>o.r.bottom>0&&o.r.top<vh);
  for(const{e,r}of rects){if(r.width<130||r.height<80||r.bottom<hb||r.top>vh)continue;
    const d=Math.hypot(Math.max(r.left-mx,0,mx-r.right),Math.max(r.top-my,0,my-r.bottom));if(d>240)continue;
    const opts=[['top',Math.abs(my-r.top)],['bottom',Math.abs(my-r.bottom)],['left',Math.abs(mx-r.left)],['right',Math.abs(mx-r.right)]].sort((a,c)=>a[1]-c[1]);
    for(const[k,ed]of opts){const pl=place(k,r,hb,vw,vh);if(!pl)continue;
      let ov=0;for(const o of rects)if(o.e!==e&&!o.e.contains(e)&&!e.contains(o.e)){const ix=Math.min(pl.x+pl.w,o.r.right)-Math.max(pl.x,o.r.left),iy=Math.min(pl.y+pl.h,o.r.bottom)-Math.max(pl.y,o.r.top);if(ix>0&&iy>0)ov+=ix*iy}
      const s=d+ed*.4+(ov>pl.w*pl.h*.12?140:0)+(k==='bottom'?60:k==='top'?0:25)-(e===el?40:0)-(e===el&&k===edge?30:0);if(!b||s<b.s)b={e,k,s,...pl}}}
  return b}
function tick(){const now=performance.now();
  if(now-collected>2500){els=[...document.querySelectorAll(SEL)].filter(e=>!e.closest('.lux,.modal,.site-header,.player'));collected=now}
  const blocked=html.classList.contains('modal-open')||html.classList.contains('player-open')||!!document.querySelector('.lux.open'),idle=now-moved;
  if(dirty){best=blocked||mx<-1e3||now<coolUntil?null:choose();dirty=false}
  let shy=false;
  if(!best||idle>9000)pt=HIDE;
  else if(best.e!==el||best.k!==edge){pt=HIDE;if(p>HIDE-3){el=best.e;edge=best.k;rot=best.rot;bw=best.w;bh=best.h;cx=tx=best.x;cy=ty=best.y;out=now+220}}
  else{tx=best.x;ty=best.y;const hx=cx+bw/2,hy=cy+bh/2;const near=Math.hypot(mx-hx,my-hy)<74;if(near&&!shyAt)shyAt=now;if(!near)shyAt=0;shy=near&&now-shyAt>230;if(now>out)pt=shy?HIDE:idle>2500?3:12}
  cx+=(tx-cx)*.2;cy+=(ty-cy)*.2;p+=(pt-p)*(pt>p?.42:.13);inn.style.pointerEvents=p<HIDE-14?'auto':'none';
  box.classList.toggle('shy',shy);box.classList.toggle('idle',idle>2500&&idle<9000);
  box.style.cssText=`width:${bw}px;height:${bh}px;transform:translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px);visibility:${p>HIDE-1?'hidden':'visible'}`;
  inn.style.transform=`translate(-50%,-50%) rotate(${rot}deg) translateY(${p.toFixed(1)}px)`;
  const a=-rot*Math.PI/180,vx=mx-(cx+bw/2),vy=my-(cy+bh/2),lx=vx*Math.cos(a)-vy*Math.sin(a),ly=vx*Math.sin(a)+vy*Math.cos(a),len=Math.hypot(lx,ly)||1,m=Math.min(len/60,1)*2.3;
  pupils.forEach(g=>g.setAttribute('transform',`translate(${(lx/len*m).toFixed(2)} ${(ly/len*m).toFixed(2)})`));
  requestAnimationFrame(tick)}
inn.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();if(window.lxLion)lxLion.caught(e.clientX,e.clientY);pt=HIDE;p=HIDE;best=null;el=null;coolUntil=performance.now()+20000+Math.random()*15000;});
addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;moved=performance.now();dirty=true},{passive:true});
addEventListener('scroll',()=>{dirty=true},{passive:true});addEventListener('resize',()=>{collected=0;dirty=true});
document.addEventListener('mouseout',e=>{if(!e.relatedTarget){mx=my=-1e4;dirty=true}});
(function blink(){setTimeout(()=>{box.classList.add('blink');setTimeout(()=>{box.classList.remove('blink');blink()},150)},2500+Math.random()*3500)})();
setInterval(()=>{dirty=true},400);
requestAnimationFrame(tick)})();

/* ===== Web-App (Installieren) & Besucherzähler ===== */
(function(){
  if(window.LGS_RENDER_ONLY) return;
  if(window.lxInstall) lxInstall(document.getElementById('lxInstall'),'Lewolux als App','So kommt das Lewolux-Logo auf deinen Startbildschirm:');
  // Besucherzähler: anonym, ohne Cookies, ohne IP. Zufällige Kennung nur für diesen Tab.
  const box=document.getElementById('lxStats'); if(!box||location.protocol!=='https:') return;
  let sid; try{ sid=sessionStorage.getItem('lxSid'); if(!sid){ sid=Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('lxSid',sid); } }catch(_){ sid=Math.random().toString(36).slice(2,14); }
  let first=true; try{ first=!sessionStorage.getItem('lxCounted'); sessionStorage.setItem('lxCounted','1'); }catch(_){}
  const fmt=n=>Number(n||0).toLocaleString('de-DE');
  const ping=async()=>{ if(document.hidden) return; try{ const r=await fetch('/api/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sid,first})}); first=false; if(!r.ok) return; const j=await r.json(); document.getElementById('lxOnline').textContent=fmt(j.online); document.getElementById('lxToday').textContent=fmt(j.today); document.getElementById('lxTotal').textContent=fmt(j.total); box.hidden=false; }catch(_){} };
  ping(); setInterval(ping,30000); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) ping(); });
})();

/* ===== Bereichs-Umschalter „Spiele · Software · Kids“ (oben auf jeder Seite) ===== */
(()=>{if(window.LGS_RENDER_ONLY)return;const nav=document.querySelector('.areas');if(!nav)return;
const set=k=>nav.querySelectorAll('[data-area]').forEach(a=>{if(a.dataset.area===k)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
const p=location.pathname;
if(/\/software\//.test(p))return set('software');
if(/\/(spiele|ring-legends)\//.test(p))return set('spiele');
const sw=document.getElementById('software'),sp=document.getElementById('spiele');if(!sw||!sp)return;
set('spiele');let cur='spiele';
const upd=()=>{const r=sw.getBoundingClientRect(),k=r.top<innerHeight*.45&&r.bottom>innerHeight*.2?'software':'spiele';if(k!==cur){cur=k;set(k)}};
addEventListener('scroll',upd,{passive:true});upd()})();

/* ===== Altersabfrage (Age Gate) – wiederverwendbare Komponente, noch nirgends eingesetzt =====
   So wird ein Inhalt ab 18 (z. B. ein Trailer) geschützt:

     <div class="age-gate" data-age="18" data-title="Trailer: House in the Desert">
       <template>
         <video src="/assets/video/house-trailer.mp4" controls playsinline preload="metadata"></video>
       </template>
     </div>

   - Der Inhalt steht in einem <template> und wird erst nach „Ja“ in die Seite eingefügt.
     Dadurch lädt der Browser Video/Bild vorher NICHT (kein Vorab-Download, kein Vorschaubild).
   - Die Antwort „Ja“ wird in localStorage unter 'lxAge18' = '1' gemerkt (gilt dann für alle Age-Gates der Seite).
   - „Nein“ zeigt nur einen Hinweis; der Inhalt bleibt gesperrt (nicht gespeichert, beim nächsten Besuch wird erneut gefragt).
   - Im Kids-Modus (localStorage 'lxKids' = '1') ist der Inhalt IMMER gesperrt, ohne Ja/Nein-Knöpfe.
     (Normalerweise leitet der Kids-Modus ohnehin auf /kids/ um; das hier ist die zweite Sicherung.)
   - Wird ein Age-Gate später per JavaScript eingefügt: window.lxAgeGate(element) aufrufen. */
(()=>{if(window.LGS_RENDER_ONLY)return;
const get=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
const reveal=g=>{const t=g.querySelector('template');g.classList.add('is-open');g.innerHTML='';if(t)g.appendChild(t.content.cloneNode(true))};
function init(g){if(!g||g.dataset.agInit)return;g.dataset.agInit='1';
  const age=g.dataset.age||'18',title=g.dataset.title||'';
  if(get('lxKids')==='1'){const t=g.querySelector('template');g.innerHTML='';if(t)g.appendChild(t);g.classList.add('is-blocked');
    g.insertAdjacentHTML('beforeend','<div class="ag-box"><p class="ag-ico" aria-hidden="true">🔒</p><p class="ag-q">Dieser Inhalt ist im Kids-Modus nicht verfügbar.</p></div>');return}
  if(get('lxAge'+age)==='1')return reveal(g);
  const box=document.createElement('div');box.className='ag-box';box.setAttribute('role','group');box.setAttribute('aria-label','Altersabfrage');
  box.innerHTML=(title?'<p class="ag-t"></p>':'')+'<p class="ag-ico" aria-hidden="true">'+age+'+</p><p class="ag-q">Dieser Inhalt ist für Erwachsene. Bist du mindestens '+age+' Jahre alt?</p><div class="ag-btns"><button type="button" class="btn btn-primary ag-yes">Ja, ich bin '+age+' oder älter</button><button type="button" class="btn ag-no">Nein</button></div><p class="ag-msg" aria-live="polite"></p>';
  if(title)box.querySelector('.ag-t').textContent=title;
  g.appendChild(box);
  box.querySelector('.ag-yes').onclick=()=>{try{localStorage.setItem('lxAge'+age,'1')}catch(_){}document.querySelectorAll('.age-gate[data-ag-init]:not(.is-open):not(.is-blocked)').forEach(x=>{if((x.dataset.age||'18')===age)reveal(x)})};
  box.querySelector('.ag-no').onclick=()=>{box.querySelector('.ag-msg').textContent='Schade! Dieser Inhalt ist nur für Erwachsene. Schau dir gern unsere anderen Spiele an.';box.querySelector('.ag-btns').hidden=true}}
window.lxAgeGate=init;document.querySelectorAll('.age-gate').forEach(init)})();

/* ===== Tester-Anmeldung: ohne E-Mail-Programm passiert bei mailto: am PC oft nichts -> Auswahl anbieten ===== */
(function(){
  const b=document.getElementById('testerBtn'); if(!b) return;
  const to='hallo@lewolux.de', su='Ring Legends Tester', body='Hallo Lewolux,\n\nich möchte Ring Legends vorab auf Android testen.\n\nMeine Gmail-Adresse für den Play Store: \n\nViele Grüße';
  b.addEventListener('click',ev=>{
    ev.preventDefault();
    const gm='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(to)+'&su='+encodeURIComponent(su)+'&body='+encodeURIComponent(body);
    const ol='https://outlook.live.com/mail/0/deeplink/compose?to='+encodeURIComponent(to)+'&subject='+encodeURIComponent(su)+'&body='+encodeURIComponent(body);
    const d=document.createElement('div');d.className='install-help';
    d.innerHTML='<div><h3>Als Tester melden</h3>Schick uns kurz deine Gmail-Adresse – wähle, womit du schreiben möchtest:'+
      '<div style="display:grid;gap:10px;margin:14px 0">'+
      '<a class="btn btn-play" href="'+gm+'" target="_blank" rel="noopener">Mit Gmail schreiben</a>'+
      '<a class="btn" href="'+ol+'" target="_blank" rel="noopener">Mit Outlook / Hotmail schreiben</a>'+
      '<a class="btn" href="'+b.getAttribute('href')+'">E-Mail-Programm öffnen</a>'+
      '<button type="button" class="btn" data-copy>Adresse kopieren: '+to+'</button></div>'+
      '<button type="button" data-close>Schließen</button></div>';
    d.addEventListener('click',e=>{const t=e.target;
      if(t===d||t.hasAttribute('data-close')) d.remove();
      if(t.hasAttribute('data-copy')){ (navigator.clipboard?navigator.clipboard.writeText(to):Promise.reject()).then(()=>{t.textContent='Kopiert: '+to;}).catch(()=>{t.textContent=to;}); }
    });
    document.body.appendChild(d);
  });
})();

/* ===== Spieleliste (Schublade) & aktiver Bereich im Umschalter ===== */
(function(){
  const r=document.getElementById('gameRail'), b=document.getElementById('gameRailBtn'); if(!r||!b) return;
  const set=o=>{r.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');};
  b.onclick=()=>set(!r.classList.contains('open'));
  r.querySelector('.gr-close').onclick=()=>set(false);
  document.addEventListener('click',e=>{if(r.classList.contains('open')&&!r.contains(e.target)&&!b.contains(e.target))set(false);});
  r.querySelectorAll('a[data-gid]').forEach(a=>{ if(location.pathname.indexOf('/spiele/'+a.dataset.gid+'/')>=0) a.setAttribute('aria-current','page'); });
  const areas=document.querySelectorAll('.area[data-area]'); const mark=k=>areas.forEach(a=>a.setAttribute('aria-current',a.dataset.area===k?'true':'false'));
  if(/\/software\//.test(location.pathname)) mark('software'); else if(/\/spiele\//.test(location.pathname)) mark('spiele');
  const secs=['spiele','software'].map(id=>document.getElementById(id)).filter(Boolean);
  if(secs.length&&'IntersectionObserver' in window){ const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting)mark(en.target.id);}),{rootMargin:'-40% 0px -55% 0px'}); secs.forEach(x=>io.observe(x)); }
})();

/* ---------- Controller (lx-pad.js): Website per Controller bedienbar.
   Läuft ein Spiel (iframe), ruht die Website-Steuerung; die View-/Back-Taste schließt das Spiel. ---------- */
window.LXPAD_INIT=function(P){
  const playing=()=>{const pl=document.querySelector('.player');return !!(document.querySelector('.game-frame')||(pl&&!pl.hidden&&pl.querySelector('iframe')))};
  P.suspend=playing;
  P.onSuspendBack=()=>{const pl=document.querySelector('.player');
    if(pl&&!pl.hidden){const c=pl.querySelector('.pl-close');if(c)c.click();return}
    const m=document.getElementById('modal');const x=m&&m.querySelector('[data-close]');if(x)x.click()};
};

window.LXPAD_CFG={fs:false,site:true};
/* Lewolux Controller-Modul (lx-pad.js)
   Ergänzung für Spiele und Website: Xbox-/Standard-Controller per Gamepad-API.
   - Schläft, bis ein Controller benutzt wird. Maus, Touch und Tastatur bleiben unverändert.
   - Linker Stick / Steuerkreuz = Fokus bewegen, A = bestätigen, B = zurück, Start = Pause/Menü.
   - Leuchtende Fokus-Markierung nur im Controller-Modus.
   - Hinweis „🎮 Controller verbunden“.
   - Kleiner Vollbild-Knopf (nur mit Maus oder Controller sichtbar, nie am Handy).
   Spiele können sich einklinken (alles optional, jederzeit setzbar):
     LXPAD.game(p)     -> jedes Bild aufgerufen; true = Eingabe gehört dem Spiel (keine Menü-Navigation)
     LXPAD.back()      -> true, wenn B selbst behandelt wurde
     LXPAD.pause()     -> true, wenn Start selbst behandelt wurde
     LXPAD.root()      -> Element, auf das die Navigation beschränkt wird (z. B. offener Dialog)
     LXPAD.suspend()   -> true = Modul ruht komplett (z. B. Spiel läuft im iframe)
   p: { lx, ly, rx, ry (Sticks mit Totzone), dx, dy (-1/0/1 inkl. Steuerkreuz),
        down(n), hit(n) (gerade gedrückt), up(n) (gerade losgelassen), dt }
   Knopfnamen: a b x y lb rb lt rt back start ls rs up down left right
   Konfiguration vor dem Laden: window.LXPAD_CFG = { fs:false (kein Vollbild-Knopf), fsPos:'br'|'bl'|'tr'|'tl', site:true } */
(function(){
'use strict';
if (window.LXPAD) return;
var CFG = window.LXPAD_CFG || {};
// Xbox (Edge): Vollbild über „View halten“, Controller muss einmal auf „Spielsteuerung“ umgestellt werden
var XBOX = /Xbox/i.test(navigator.userAgent || '');
var P = window.LXPAD = { active:false, pads:0, game:null, back:null, pause:null, root:null, suspend:null, focused:null };
var D = document, html = D.documentElement;
var NAMES = ['a','b','x','y','lb','rb','lt','rt','back','start','ls','rs','up','down','left','right','home'];
var DZ = 0.35;
var cur = {}, prev = {}, axes = [0,0,0,0], last = 0, raf = 0, rep = { dir:'', t:0, n:0 };
var ring, toastEl, fsBtn, styleEl, toastT, fsT, scrollAcc = 0;

/* ---------- Stil (nur im Controller-Modus sichtbar) ---------- */
function css(){
  if (styleEl) return;
  styleEl = D.createElement('style'); styleEl.id = 'lxPadCss';
  styleEl.textContent =
    '#lxPadRing{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483646;border-radius:14px;' +
      'box-shadow:0 0 0 4px #fff,0 0 0 8px #3be8ff,0 0 26px 10px rgba(59,232,255,.75);opacity:0;transition:opacity .15s,left .12s ease-out,top .12s ease-out,width .12s ease-out,height .12s ease-out}' +
    'html.lx-pad #lxPadRing.on{opacity:1;animation:lxPadGlow 1.4s ease-in-out infinite}' +
    '@keyframes lxPadGlow{50%{box-shadow:0 0 0 4px #fff,0 0 0 9px #ffd23b,0 0 34px 14px rgba(255,210,59,.7)}}' +
    '@media (prefers-reduced-motion:reduce){html.lx-pad #lxPadRing.on{animation:none;transition:opacity .15s}}' +
    'html.lx-pad,html.lx-pad *{cursor:none!important}' +
    '#lxPadToast{position:fixed;left:50%;top:max(14px,env(safe-area-inset-top,0px));transform:translate(-50%,-140%);z-index:2147483647;pointer-events:none;' +
      'background:rgba(17,20,38,.92);color:#fff;font:700 clamp(15px,1.6vw,26px)/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;padding:.6em 1.1em;border-radius:999px;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.35);transition:transform .35s cubic-bezier(.2,.9,.3,1.2);white-space:nowrap}' +
    '#lxPadToast.on{transform:translate(-50%,0)}' +
    '#lxFs{position:fixed;z-index:2147483645;width:44px;height:44px;border-radius:12px;border:0;padding:0;margin:0;display:none;align-items:center;justify-content:center;' +
      'background:rgba(17,20,38,.62);color:#fff;cursor:pointer;opacity:0;transition:opacity .3s;box-shadow:0 2px 10px rgba(0,0,0,.25)}' +
    '#lxFs svg{width:24px;height:24px}#lxFs:hover{opacity:1!important;background:rgba(17,20,38,.85)}' +
    '#lxFs.br{right:12px;bottom:12px}#lxFs.bl{left:12px;bottom:12px}#lxFs.tr{right:12px;top:12px}#lxFs.tl{left:12px;top:12px}' +
    '@media (pointer:fine){#lxFs{display:flex}}html.lx-pad #lxFs{display:flex}#lxFs.show{opacity:.8}' +
    'html.lx-fs #lxFs{display:none!important}';
  (D.head || html).appendChild(styleEl);
}
function ensureRing(){ if (!ring && D.body){ ring = D.createElement('div'); ring.id = 'lxPadRing'; ring.setAttribute('aria-hidden','true'); D.body.appendChild(ring); } }

/* ---------- Hinweis ---------- */
function toast(msg, ms){
  if (!D.body) return; css();
  if (!toastEl){ toastEl = D.createElement('div'); toastEl.id = 'lxPadToast'; toastEl.setAttribute('role','status'); D.body.appendChild(toastEl); }
  toastEl.textContent = msg; void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, ms || 2600);
}
P.toast = toast;

/* ---------- Vollbild ---------- */
function isFull(){ return !!(D.fullscreenElement || D.webkitFullscreenElement); }
function canFull(){ var e = html; return !!(e.requestFullscreen || e.webkitRequestFullscreen) && D.fullscreenEnabled !== false && D.webkitFullscreenEnabled !== false; }
function goFull(){
  try {
    if (isFull()) { (D.exitFullscreen || D.webkitExitFullscreen).call(D); return; }
    var r = (html.requestFullscreen || html.webkitRequestFullscreen).call(html, { navigationUI:'hide' });
    if (r && r.catch) r.catch(function(){ if (P.active) toast('Vollbild: bitte einmal mit Maus oder Fernbedienung auf ⛶ klicken', 3800); });
  } catch (e) {}
}
P.fullscreen = goFull;
function fsState(){ html.classList.toggle('lx-fs', isFull()); }
function showFs(){ if (!fsBtn) return; fsBtn.classList.add('show'); clearTimeout(fsT); fsT = setTimeout(function(){ if (!fsBtn.matches(':hover')) fsBtn.classList.remove('show'); }, 3500); }
function setupFs(){
  if (CFG.fs === false || XBOX || fsBtn || !D.body || !canFull()) return;
  fsBtn = D.createElement('button'); fsBtn.id = 'lxFs'; fsBtn.type = 'button'; fsBtn.className = CFG.fsPos || 'br';
  fsBtn.setAttribute('aria-label','Vollbild'); fsBtn.title = 'Vollbild';
  fsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  fsBtn.addEventListener('click', function(e){ e.stopPropagation(); e.preventDefault(); goFull(); });
  ['pointerdown','mousedown','touchstart','pointerup','mouseup'].forEach(function(t){ fsBtn.addEventListener(t, function(e){ e.stopPropagation(); }); });
  D.body.appendChild(fsBtn); showFs();
  D.addEventListener('mousemove', function(e){ if (e.isTrusted) showFs(); }, { passive:true });
}
D.addEventListener('fullscreenchange', fsState); D.addEventListener('webkitfullscreenchange', fsState);

/* ---------- Controller-Modus an/aus ---------- */
function setActive(on){
  if (P.active === on) return;
  P.active = on; html.classList.toggle('lx-pad', on);
  if (on){ css(); ensureRing(); showFs(); } else if (ring) ring.classList.remove('on');
  try { window.dispatchEvent(new CustomEvent('lxpadmode', { detail:{ active:on } })); } catch (e) {}
}
function leave(e){ if (e.isTrusted && P.active) setActive(false); }
D.addEventListener('pointerdown', leave, true); D.addEventListener('touchstart', leave, { capture:true, passive:true });
D.addEventListener('mousemove', function(e){ if (e.isTrusted && P.active && (Math.abs(e.movementX) + Math.abs(e.movementY) > 6)) setActive(false); }, { capture:true, passive:true });

/* ---------- Gamepad lesen ---------- */
function pads(){ try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return []; } }
function read(){
  var list = pads(), st = {}, ax = [0,0,0,0], any = false, n = 0;
  for (var i = 0; i < (list ? list.length : 0); i++){
    var g = list[i]; if (!g || g.connected === false) continue; n++;
    var b = g.buttons || [];
    for (var k = 0; k < NAMES.length; k++){ var bb = b[k]; if (bb && (bb.pressed || bb.value > 0.5)) { st[NAMES[k]] = true; any = true; } }
    var a = g.axes || [];
    for (var j = 0; j < 4; j++){ var v = +a[j] || 0; if (Math.abs(v) > Math.abs(ax[j])) ax[j] = v; }
    // manche Controller melden das Steuerkreuz als Achse 9 (Hat-Switch)
    if (g.mapping !== 'standard' && a.length > 9 && Math.abs(a[9]) <= 1.01 && Math.abs(a[9]) > 0.05){
      var h = Math.round((a[9] + 1) * 3.5); if (h === 0 || h === 1 || h === 7) st.up = true; if (h >= 3 && h <= 5) st.down = true; if (h >= 5 && h <= 7) st.left = true; if (h >= 1 && h <= 3) st.right = true;
    }
  }
  for (var q = 0; q < 4; q++){ var vv = ax[q]; ax[q] = Math.abs(vv) < DZ ? 0 : (vv - Math.sign(vv) * DZ) / (1 - DZ); if (ax[q]) any = true; }
  P.pads = n; return { st:st, ax:ax, any:any };
}
var api = {
  down: function(n){ return !!cur[n]; },
  hit:  function(n){ return !!cur[n] && !prev[n]; },
  up:   function(n){ return !cur[n] && !!prev[n]; }
};
P.state = api;

function connected(e){
  if (P.suspend && P.suspend()) { start(); return; }
  var id = e && e.gamepad && e.gamepad.id || '';
  toast('🎮 Controller verbunden' + (/xbox|xinput|045e/i.test(id) ? '' : ''));
  start();
}
function start(){ if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
window.addEventListener('gamepadconnected', connected);
window.addEventListener('gamepaddisconnected', function(){ setTimeout(function(){ var l = pads(), n = 0; for (var i = 0; i < (l ? l.length : 0); i++) if (l[i]) n++; if (!n) { toast('🎮 Controller getrennt'); setActive(false); } }, 50); });
// Falls der Controller schon vor dem Laden verbunden war
var seen = false;
var probe = setInterval(function(){ var l = pads(); for (var i = 0; i < (l ? l.length : 0); i++) if (l[i]) { if (!seen) { seen = true; start(); } return; } }, 1000);

/* ---------- Haupt-Schleife ---------- */
function loop(t){
  raf = requestAnimationFrame(loop);
  var dt = Math.min(0.1, (t - last) / 1000); last = t;
  var r = read();
  prev = cur; cur = r.st; axes = r.ax;
  if (P.suspend && P.suspend()) { if (api.hit('back') && P.onSuspendBack) P.onSuspendBack(); hideRing(); return; }
  if (r.any && !P.active && !D.hidden) { setActive(true); if (!seen) { seen = true; toast('🎮 Controller verbunden'); } }
  var dx = (cur.left ? -1 : 0) + (cur.right ? 1 : 0), dy = (cur.up ? -1 : 0) + (cur.down ? 1 : 0);
  if (!dx && Math.abs(axes[0]) > 0.45) dx = Math.sign(axes[0]);
  if (!dy && Math.abs(axes[1]) > 0.45) dy = Math.sign(axes[1]);
  var p = { lx:axes[0], ly:axes[1], rx:axes[2], ry:axes[3], dx:dx, dy:dy, dt:dt, down:api.down, hit:api.hit, up:api.up, active:P.active };
  P.last = p;
  var took = false;
  if (typeof P.game === 'function') { try { took = !!P.game(p); } catch (e) { console.error(e); } }
  if (took) { hideRing(); rep.dir = ''; return; }
  if (!P.active) return;
  nav(p);
}

/* ---------- Menü-Navigation (DOM) ---------- */
var SEL = 'button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=menuitem],[role=option],[role=switch],[role=checkbox],[role=radio],[role=link],[tabindex]:not([tabindex="-1"]),[data-pad]';
var BTN = 'button,a[href],[role=button],[role=link],[role=tab],[role=menuitem],[role=option]';
function vis(el){
  if (!el || el.disabled || el.closest('[hidden],[inert],[aria-hidden="true"],[data-pad-skip]')) return null;
  if (el.id === 'lxFs' && !(D.fullscreenEnabled !== false)) return null;
  var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return null;
  var cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.08 || cs.pointerEvents === 'none' && !el.hasAttribute('data-pad')) return null;
  return r;
}
function onTop(el, r){
  var vw = innerWidth, vh = innerHeight;
  var x0 = Math.max(0, r.left), x1 = Math.min(vw, r.right), y0 = Math.max(0, r.top), y1 = Math.min(vh, r.bottom);
  if (x1 - x0 < 2 || y1 - y0 < 2) return null; // außerhalb des Bildschirms
  var pts = [[(x0 + x1) / 2, (y0 + y1) / 2], [x0 + (x1 - x0) * .2, y0 + (y1 - y0) * .3], [x0 + (x1 - x0) * .8, y0 + (y1 - y0) * .7]];
  for (var i = 0; i < pts.length; i++){
    var h = D.elementFromPoint(pts[i][0], pts[i][1]);
    if (h && (h === el || el.contains(h) || (h.contains(el) && h !== D.body && h !== html) || h === ring)) return true;
  }
  return false;
}
function modalRoot(){
  if (typeof P.root === 'function') { var rr = P.root(); if (rr) return rr; }
  var ms = D.querySelectorAll('dialog[open],[aria-modal="true"],[role="dialog"],[role="alertdialog"]'), best = null;
  for (var i = 0; i < ms.length; i++){ var m = ms[i]; if (vis(m) && !m.closest('[hidden]')) best = m; }
  return best;
}
function candidates(){
  var root = modalRoot(), scope = root || D, out = [], els = scope.querySelectorAll(SEL);
  for (var i = 0; i < els.length; i++){
    var el = els[i]; if (el === ring || el === toastEl) continue;
    if (!el.hasAttribute('data-pad')) {
      // verschachtelt: Knopf im Knopf -> der äußere zählt; Container mit tabindex um Knöpfe -> die inneren zählen
      if (el.matches(BTN) && el.parentElement && el.parentElement.closest(BTN)) continue;
      if (!el.matches(BTN + ',input,select,textarea,summary') && el.querySelector(SEL)) continue;
    }
    var r = vis(el); if (!r) continue;
    var top = onTop(el, r);
    if (top === false) continue;               // verdeckt
    if (top === null && !root && !inScroller(el)) continue; // außerhalb des Bildes und nicht scrollbar erreichbar
    out.push({ el:el, r:r });
  }
  return out;
}
function inScroller(el){
  for (var p = el.parentElement; p && p !== D.body; p = p.parentElement){
    var cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) return true;
    if (cs.position === 'fixed') return false;
  }
  return D.scrollingElement && D.scrollingElement.scrollHeight > innerHeight + 2;
}
function pickStart(list){
  var def = list.filter(function(c){ return c.el.matches('[data-pad-default],[autofocus]'); })[0];
  if (def) return def.el;
  var act = D.activeElement; if (act && act !== D.body) for (var i = 0; i < list.length; i++) if (list[i].el === act) return act;
  // größtes sichtbares Bedienelement (meist „Spielen“/„Los geht’s“)
  var best = null, ba = 0;
  list.forEach(function(c){ var r = c.r; if (r.bottom < 0 || r.top > innerHeight) return; var a = Math.min(r.width, innerWidth) * Math.min(r.height, innerHeight); if (c.el.matches('input,textarea,select')) a *= 0.3; if (a > ba) { ba = a; best = c.el; } });
  return best || (list[0] && list[0].el);
}
function move(dx, dy){
  var list = candidates(); if (!list.length) return;
  var f = P.focused, fr = f && list.filter(function(c){ return c.el === f; })[0];
  if (!fr) { focus(pickStart(list)); return; }
  var a = fr.r, ax = (a.left + a.right) / 2, ay = (a.top + a.bottom) / 2, best = null, bs = Infinity;
  list.forEach(function(c){
    if (c.el === f) return; var b = c.r, bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2, main, side, ovl;
    if (dx) {
      main = dx > 0 ? b.left - a.right : a.left - b.right; if ((dx > 0 ? bx <= ax + 1 : bx >= ax - 1)) return;
      ovl = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); side = ovl > 0 ? 0 : Math.abs(by - ay);
    } else {
      main = dy > 0 ? b.top - a.bottom : a.top - b.bottom; if ((dy > 0 ? by <= ay + 1 : by >= ay - 1)) return;
      ovl = Math.min(a.right, b.right) - Math.max(a.left, b.left); side = ovl > 0 ? 0 : Math.abs(bx - ax);
    }
    var s = Math.max(main, -8) + side * 2.2 + (ovl > 0 ? 0 : 30);
    if (s < bs) { bs = s; best = c.el; }
  });
  if (best) focus(best);
  else if (dy) scrollBy(dy * innerHeight * 0.35); // nichts mehr in der Richtung: ein Stück weiterscrollen
}
function scroller(el){
  for (var p = el && el.parentElement; p && p !== D.body; p = p.parentElement){
    var cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) return p;
  }
  return D.scrollingElement || html;
}
function scrollBy(px){ var s = scroller(P.focused); try { s.scrollBy({ top:px, behavior:'smooth' }); } catch (e) { s.scrollTop += px; } }
function focus(el){
  if (!el) return; P.focused = el;
  try { el.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' }); } catch (e) {}
  if (!el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select')) {
    try { el.focus({ preventScroll:true }); } catch (e) {}
  }
  try { el.dispatchEvent(new CustomEvent('lxpadfocus', { bubbles:true })); } catch (e) {}
  drawRing();
}
P.focus = focus;
function hideRing(){ if (ring) ring.classList.remove('on'); }
function drawRing(){
  ensureRing(); var f = P.focused; if (!ring) return;
  if (!f || !f.isConnected || !P.active) { hideRing(); return; }
  var r = f.getBoundingClientRect(); if (r.width < 2) { hideRing(); return; }
  var cs = getComputedStyle(f), rad = parseFloat(cs.borderTopLeftRadius) || 10, pad = 3;
  // CSS-Zoom (z. B. Großbild-Ansicht): Rahmen-Koordinaten in seine eigene Zoom-Stufe umrechnen
  var z = ring.currentCSSZoom || 1; if (z !== 1) r = { left:r.left / z, top:r.top / z, width:r.width / z, height:r.height / z };
  ring.style.left = (r.left - pad) + 'px'; ring.style.top = (r.top - pad) + 'px';
  ring.style.width = (r.width + pad * 2) + 'px'; ring.style.height = (r.height + pad * 2) + 'px';
  ring.style.borderRadius = Math.min(rad + pad, (r.height + pad * 2) / 2) + 'px';
  ring.classList.add('on');
}
function fire(el, type, x, y){
  var o = { bubbles:true, cancelable:true, composed:true, clientX:x, clientY:y, button:0, buttons:type.indexOf('down') > 0 ? 1 : 0, view:window };
  try {
    if (type.indexOf('pointer') === 0) { o.pointerId = 1; o.pointerType = 'mouse'; o.isPrimary = true; el.dispatchEvent(new PointerEvent(type, o)); }
    else el.dispatchEvent(new MouseEvent(type, o));
  } catch (e) {}
}
function activate(el){
  if (!el) return;
  if (el.matches('input[type=range]')) return;
  if (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset]),textarea,select')) {
    try { el.focus(); if (el.showPicker && el.tagName === 'SELECT') el.showPicker(); } catch (e) {}
    return;
  }
  var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  fire(el, 'pointerdown', x, y); fire(el, 'mousedown', x, y); fire(el, 'pointerup', x, y); fire(el, 'mouseup', x, y);
  if (el.click) el.click(); else fire(el, 'click', x, y);
}
P.activate = activate;
var BACK_RE = /^(zur(ü|ue)ck|back|schlie(ß|ss)en|close|abbrechen|cancel|beenden|menü|menu|hauptmenü|home|×|✕|✖|x|←|‹|⟵|◀|<|‹ zurück|← zurück)$/i;
var BACK_IN = /(zur(ü|ue)ck|schlie(ß|ss)en|close|back|abbrechen)/i;
function label(el){ return ((el.getAttribute('aria-label') || '') + ' ' + (el.title || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim(); }
function findBack(){
  var list = candidates(), best = null, bs = -1;
  list.forEach(function(c){
    var el = c.el, al = (el.getAttribute('aria-label') || el.title || '').trim(), tx = (el.textContent || '').replace(/\s+/g, ' ').trim(), s = 0;
    if (el.matches('[data-pad-back]')) s = 100;
    else if (BACK_RE.test(al) || BACK_RE.test(tx)) s = 60;
    else if (BACK_IN.test(al) || (tx.length < 24 && BACK_IN.test(tx))) s = 40;
    else if (/class="[^"]*(close|back|zurueck|zurück)/i.test(el.outerHTML.slice(0, 200))) s = 30;
    if (s > bs && s > 0) { bs = s; best = el; }
  });
  return best;
}
function key(k, code, kc){
  var t = D.activeElement && D.activeElement !== D.body ? D.activeElement : D;
  ['keydown','keyup'].forEach(function(type){ try { t.dispatchEvent(new KeyboardEvent(type, { key:k, code:code, keyCode:kc, which:kc, bubbles:true, cancelable:true })); } catch (e) {} });
}
P.key = key;
function back(){
  if (typeof P.back === 'function' && P.back()) return;
  var b = findBack(); if (b) { activate(b); return; }
  key('Escape', 'Escape', 27);
}
function pause(){
  if (typeof P.pause === 'function' && P.pause()) return;
  var list = candidates(), b = null;
  list.forEach(function(c){ var l = label(c.el); if (!b && /(^|\s)(pause|menü|menu|einstellungen|optionen)(\s|$)/i.test(l)) b = c.el; });
  if (b) { activate(b); return; }
  key('Escape', 'Escape', 27);
}
function nav(p){
  // Richtung mit Wiederholung beim Halten
  var dir = p.dx ? (p.dx > 0 ? 'R' : 'L') : p.dy ? (p.dy > 0 ? 'D' : 'U') : '';
  var now = performance.now();
  if (dir) {
    var f = P.focused;
    if (f && f.matches && f.matches('input[type=range]') && p.dx) {
      if (dir !== rep.dir || now > rep.t) { var st = parseFloat(f.step) || 1; f.value = (parseFloat(f.value) || 0) + p.dx * st; f.dispatchEvent(new Event('input', { bubbles:true })); f.dispatchEvent(new Event('change', { bubbles:true })); rep.t = now + (dir !== rep.dir ? 380 : 90); rep.dir = dir; }
    } else if (dir !== rep.dir) { rep.dir = dir; rep.t = now + 400; move(p.dx, p.dx ? 0 : p.dy); }
    else if (now > rep.t) { rep.t = now + 140; move(p.dx, p.dx ? 0 : p.dy); }
  } else rep.dir = '';
  if (p.hit('a')) { var c = P.focused && P.focused.isConnected && vis(P.focused) ? P.focused : null; if (c) activate(c); else move(0, 0); }
  if (p.hit('b')) back();
  if (p.hit('start')) pause();
  if (p.hit('back') && CFG.fs !== false && !CFG.site && !XBOX) goFull();
  // Rechter Stick oder Schultertasten: scrollen
  var sy = p.ry || 0; if (p.down('rt')) sy = 1; if (p.down('lt')) sy = -1;
  if (sy) { scrollAcc += sy * p.dt * 900; if (Math.abs(scrollAcc) >= 4) { var s = scroller(P.focused); s.scrollTop += scrollAcc; scrollAcc = 0; } }
  if (P.focused && (!P.focused.isConnected || !vis(P.focused) || onTop(P.focused, P.focused.getBoundingClientRect()) === false)) {
    // Fokus ist verschwunden (Dialog zu, Seite gewechselt): neu wählen
    P.focused = null; var list = candidates(); if (list.length) focus(pickStart(list)); else hideRing();
  } else if (!P.focused) { var l2 = candidates(); if (l2.length) focus(pickStart(l2)); }
  drawRing();
}

function xboxHint(){
  // Nur im obersten Fenster, einmal pro Sitzung, und nur solange der Controller noch nicht bei der Seite ankommt
  var top = true; try { top = window.top === window; } catch (e) {}
  if (!XBOX || !top) return;
  try { if (sessionStorage.getItem('lxXboxHint')) return; sessionStorage.setItem('lxXboxHint', '1'); } catch (e) {}
  setTimeout(function(){ if (!seen) toast('🎮 Xbox: Menü-Taste ☰ halten → „Spielsteuerung“ wählen', 9000); }, 1200);
}
function init(){ css(); setupFs(); fsState(); xboxHint(); }
// Spiele können vorab window.LXPAD_INIT = function(P){ P.game = ...; } setzen
if (typeof window.LXPAD_INIT === 'function') { try { window.LXPAD_INIT(P); } catch (e) { console.error(e); } }
if (D.body) init(); else D.addEventListener('DOMContentLoaded', init);
})();
