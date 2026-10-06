(()=>{
"use strict";
const DATA = JSON.parse(document.getElementById('game-data').textContent);
const GAMES = DATA.games, SCENES_ALL = {};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

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
  start.onclick=()=>{if(touchDev){openPlayer(g);return}const f=document.createElement('iframe');f.src=g.play;f.title=g.title;f.allow='fullscreen; autoplay; gamepad; screen-wake-lock';f.allowFullscreen=true;f.className='game-frame';h.innerHTML='';h.appendChild(f);try{f.focus()}catch(_){}};
  h.appendChild(start);return null}


/* ---------- Handy-Player: Spiel bildschirmfüllend, mit Querformat-Hinweis ---------- */
const touchDev=matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<900;
let player=null,plFrame=null;
function updRot(){if(!player||player.hidden)return;const show=false; /* Die Spiele bringen eigene Dreh-Hinweise mit */$('.pl-rotate',player).hidden=!show}
function closePlayer(){if(!player||player.hidden)return;player.hidden=true;if(plFrame){plFrame.remove();plFrame=null}document.documentElement.classList.remove('player-open');
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
  plFrame=document.createElement('iframe');plFrame.src=g.play;plFrame.title=g.title;plFrame.allow='fullscreen; autoplay; gamepad; screen-wake-lock';plFrame.allowFullscreen=true;plFrame.onload=()=>st.classList.add('ready');st.appendChild(plFrame);
  player.hidden=false;document.documentElement.classList.add('player-open');
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
  $('#mFormat').textContent=g.download.format;const dl=$('#mDownload');if(g.download.href){dl.href=g.download.href;dl.setAttribute('download',g.download.href.split('/').pop());dl.hidden=false}else{dl.hidden=true}$('#mPage').href=g.page;
  const th=$('#thumbs');th.innerHTML='';g.shots.forEach((sh,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Screenshot '+(i+1)+': '+sh);const im=document.createElement('img');im.src=g.shotImgs[i];im.alt='';im.loading='lazy';b.appendChild(im);b.onclick=()=>{setMode('shots');setShot(i)};th.appendChild(b)});
  modal.hidden=false;if(!flow)document.documentElement.classList.add('modal-open');panel.scrollTop=0;if(flow)try{modal.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'})}catch(_){modal.scrollIntoView()}
  requestAnimationFrame(()=>{setShot(0);setMode(mode);$('.icon-btn',modal).focus({preventScroll:true})});
  try{history.replaceState(null,'','#spiel-'+g.id)}catch(_){}
}
function setShot(i){curShot=i;if(cur.real){shotImg.src=cur.shotImgs[i];shotImg.alt='Screenshot aus '+cur.title+': '+cur.shots[i];$$('#thumbs button').forEach((b,k)=>b.setAttribute('aria-current',k===i));return}shotCv.dataset.scene=cur.scene;shotCv.dataset.v=i;shotCv.setAttribute('aria-label','Screenshot aus '+cur.title+': '+cur.shots[i]);draw(shotCv,performance.now());$$('#thumbs button').forEach((b,k)=>b.setAttribute('aria-current',k===i))}
function setMode(m){curMode=m;const demo=m==='demo';stage.style.setProperty('--ratio',cur.ratio);stage.style.setProperty('--rnum',cur.rnum);$('#newTab').hidden=!(cur.play&&cur._ok!==false);if(cur.play)$('#newTab').href=cur.play;$('#modeDemo').setAttribute('aria-pressed',demo);$('#modeShots').setAttribute('aria-pressed',!demo);stage.classList.toggle('demo-mode',demo);$('#thumbs').hidden=demo;host.hidden=!demo;shotCv.hidden=demo||!!cur.real;shotImg.hidden=demo||!cur.real;
  if(cleanup){cleanup();cleanup=null}host.innerHTML='';
  if(demo||cur.real){if(demo)cleanup=mountGame(host,cur);stopLive(shotCv);if(!demo)setShot(curShot)}else{draw(shotCv,performance.now());goLive(shotCv)}}
function closeModal(){if(!modal||modal.hidden)return;if(cleanup){cleanup();cleanup=null}host.innerHTML='';stopLive(shotCv);modal.hidden=true;document.documentElement.classList.remove('modal-open');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});try{history.replaceState(null,'',location.pathname+location.search)}catch(_){}const wasFlow=modal.classList.contains('flow');lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true});if(wasFlow&&lastFocus&&lastFocus.scrollIntoView)try{lastFocus.scrollIntoView({block:'center'})}catch(_){}}
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
