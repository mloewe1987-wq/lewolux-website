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

/* ===== Lewolux Kids: Vorlesen, Wiese mit Spielfiguren, Sonne, animierte Vorschau, Spiel im Vollbild, Elternsperre, App-Installation =====
   Kids-Modus: localStorage 'lxKids' = '1'. Wird beim Betreten von /kids/ gesetzt (Inline-Skript im <head>).
   Solange er aktiv ist, leitet jede andere Seite der Website sofort nach /kids/ um (Inline-Skript im <head> jeder Seite,
   auch in den Nicht-Kinder-Spielen unter /games/). Beenden nur über „Zurück zum Erwachsenenbereich“ + Rechenaufgabe.
   Neue Kinderspiele: nur in data.py (KIDS) eintragen. „mascot“ wählt die Figur auf der Wiese (MASCOTS unten),
   „preview“ die animierte Vorschau (PREVIEWS unten). */
(function(){
  const $=s=>document.querySelector(s), KEY='lxKids';
  let D={games:[],phrases:{},voice:{}}; try{ D=Object.assign(D,JSON.parse($('#kids-data').textContent)); }catch(_){}
  const games={}; D.games.forEach(g=>games[g.id]=g);
  const P=D.phrases||{};
  const calm=matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---- Vorlesen: aufgenommene MP3s (build.py, Piper-Stimme); nur wenn eine Datei fehlt, die Browserstimme ---- */
  let voice=null, cur=null; const audios={};
  const pickVoice=()=>{ try{ const vs=speechSynthesis.getVoices(); voice=vs.find(v=>/^de(-|_)DE/i.test(v.lang))||vs.find(v=>/^de/i.test(v.lang))||null; }catch(_){} };
  function tts(t){
    try{ if(!('speechSynthesis' in window)) return; if(!voice) pickVoice(); speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(t); u.lang='de-DE'; if(voice) u.voice=voice; u.rate=.95; u.pitch=1.15; speechSynthesis.speak(u);
    }catch(_){}
  }
  const audio=url=>{ let a=audios[url]; if(!a){ a=audios[url]=new Audio(url); a.preload='auto'; } return a; };
  function say(t){
    if(!t) return; t=String(t).trim();
    try{ if(cur){ cur.pause(); cur.currentTime=0; } }catch(_){}
    try{ speechSynthesis.cancel(); }catch(_){}
    const url=D.voice&&D.voice[t];
    if(!url) return tts(t);
    try{ const a=audio(url); cur=a; a.currentTime=0; const r=a.play(); if(r&&r.catch) r.catch(()=>{}); a.onerror=()=>tts(t); }catch(_){ tts(t); }
  }
  // Kurze Dateien vorab laden, damit der erste Tipp sofort klingt
  addEventListener('load',()=>setTimeout(()=>{ try{ Object.values(D.voice||{}).forEach(audio); }catch(_){} },800));
  document.addEventListener('click',e=>{ const el=e.target.closest('[data-say]'); if(el) say(el.dataset.say); });

  /* ---- Spiel im Kinderbereich öffnen (Vollbild, ohne die Erwachsenen-Seiten zu verlassen) ---- */
  const pl=$('#kPlayer'), stage=$('#kStage');
  let frame=null, curId=null;
  const quit=$('#kQuit');
  function openGame(id,push){
    const g=games[id]; if(!g||!g.play) return;
    if(frame) frame.remove();
    pl.classList.remove('ready');
    frame=document.createElement('iframe'); frame.src=g.play; frame.title=g.title;
    frame.allow='fullscreen; autoplay; gamepad; screen-wake-lock'; frame.allowFullscreen=true;
    frame.onload=()=>pl.classList.add('ready');
    curId=id; $('#kTitle').textContent=g.title; quit.hidden=true;
    stage.appendChild(frame); pl.hidden=false; document.documentElement.classList.add('k-playing');
    if(push!==false) try{ history.pushState({kplay:id},'','#spiel-'+id); }catch(_){}
    try{ const fs=pl.requestFullscreen||pl.webkitRequestFullscreen; if(fs&&!document.fullscreenElement){ const r=fs.call(pl,{navigationUI:'hide'}); if(r&&r.catch) r.catch(()=>{}); } }catch(_){}
    setTimeout(()=>{ try{ frame.focus(); }catch(_){} },300);
  }
  function closeGame(fromPop){
    if(pl.hidden) return;
    pl.hidden=true; quit.hidden=true; curId=null; document.documentElement.classList.remove('k-playing');
    if(frame){ frame.remove(); frame=null; }
    try{ if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }catch(_){}
    if(!fromPop && /^#spiel-/.test(location.hash)) try{ history.back(); }catch(_){}
  }
  document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.play)));
  // „Beenden“ fragt erst nach (große Ja/Nein-Knöpfe, vorgelesen), damit Kinder das Spiel nicht aus Versehen schließen
  const askQuit=()=>{ quit.hidden=false; setTimeout(()=>{ try{ $('#kNo').focus(); }catch(_){} },50); };
  $('#kClose').addEventListener('click',askQuit);
  $('#kYes').addEventListener('click',()=>closeGame(false));
  $('#kNo').addEventListener('click',()=>{ quit.hidden=true; try{ frame&&frame.focus(); }catch(_){} });
  quit.addEventListener('click',e=>{ if(e.target===quit){ quit.hidden=true; } });
  // Zurück-Taste/-Geste des Handys während des Spiels: nicht sofort schließen, sondern auch nachfragen
  addEventListener('popstate',()=>{ const m=location.hash.match(/^#spiel-(.+)$/);
    if(m&&games[m[1]]){ if(curId!==m[1]) openGame(m[1],false); return; }
    if(!pl.hidden&&curId){ try{ history.pushState({kplay:curId},'','#spiel-'+curId); }catch(_){} say(P.quit); askQuit(); } });
  { const m=location.hash.match(/^#spiel-(.+)$/); if(m&&games[m[1]]) try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){} }
  const playing=()=>document.hidden||document.documentElement.classList.contains('k-playing');

  /* ---- Sonne: blinzelt, lacht beim Antippen ---- */
  const sun=$('#kSun');
  if(sun){ let st=0; sun.addEventListener('click',()=>{ sun.classList.remove('happy'); void sun.offsetWidth; sun.classList.add('happy'); clearTimeout(st); st=setTimeout(()=>sun.classList.remove('happy'),1800); }); }

  /* ---- Figuren (SVG, Füße unten, Blick nach vorn). Beine haben die Klassen lg1/lg2, Flügel/Arme wg1/wg2 ---- */
  const lionMane=Array.from({length:14},(_,i)=>{const a=Math.PI+i/13*Math.PI,x=48+Math.cos(a)*29,y=50+Math.sin(a)*29;return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10"/>`}).join('')+'<circle cx="21" cy="62" r="10"/><circle cx="75" cy="62" r="10"/>';
  const MASCOTS={
    // Lux, der Lewolux-Löwe (gleiche Zeichnung wie der Guck-Löwe in app.js, hier mit Körper zum Laufen)
    lion:{w:84,h:98,svg:`<svg viewBox="0 0 96 112"><defs><linearGradient id="kpm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3be8ff"/><stop offset=".55" stop-color="#9b5cff"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs>
<path d="M64 92q22 2 21-18" stroke="#e8a85c" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="85" cy="72" r="6" fill="url(#kpm)"/>
<g class="lg1"><path d="M34 92v12" stroke="#ffcf8a" stroke-width="12" stroke-linecap="round"/><ellipse cx="34" cy="105" rx="9" ry="5.5" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.2"/></g>
<g class="lg2"><path d="M62 92v12" stroke="#ffcf8a" stroke-width="12" stroke-linecap="round"/><ellipse cx="62" cy="105" rx="9" ry="5.5" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.2"/></g>
<path d="M27 92q-2-26 21-28q23 2 21 28q-4 8-21 8q-17 0-21-8z" fill="#ffcf8a" stroke="#e5ad6b" stroke-width="1.2"/><ellipse cx="48" cy="86" rx="12" ry="11" fill="#fff1dc"/>
<g class="wg1"><path d="M31 70q-9 8-8 18" stroke="#ffcf8a" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="23" cy="89" r="5.5" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.1"/></g>
<g class="wg2"><path d="M65 70q9 8 8 18" stroke="#ffcf8a" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="73" cy="89" r="5.5" fill="#ffcf8a" stroke="#d9934f" stroke-width="1.1"/></g>
<g><g fill="url(#kpm)">${lionMane}</g>
<circle cx="28" cy="29" r="7" fill="#ffcf8a"/><circle cx="68" cy="29" r="7" fill="#ffcf8a"/><circle cx="28" cy="29" r="3.4" fill="#f2a65a"/><circle cx="68" cy="29" r="3.4" fill="#f2a65a"/>
<circle cx="48" cy="51" r="23" fill="#ffcf8a"/><ellipse cx="48" cy="61" rx="11" ry="8" fill="#fff1dc"/>
<g class="k-eye"><ellipse cx="39.5" cy="47" rx="5.2" ry="6.2" fill="#fff"/><ellipse cx="56.5" cy="47" rx="5.2" ry="6.2" fill="#fff"/><circle cx="39.5" cy="47.5" r="3.3" fill="#1b1430"/><circle cx="40.6" cy="46.2" r="1" fill="#fff"/><circle cx="56.5" cy="47.5" r="3.3" fill="#1b1430"/><circle cx="57.6" cy="46.2" r="1" fill="#fff"/></g>
<path d="M34 38.5q5-3 10 0M52 38.5q5-3 10 0" stroke="#c98545" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<g fill="#ff8f8f"><circle cx="31" cy="57" r="3.6"/><circle cx="65" cy="57" r="3.6"/></g>
<path d="M44.5 56h7l-3.5 3.6z" fill="#7a3b2e"/><path d="M48 59.6v2M48 61.6c-1.5 1.7-3.6 1.7-4.8.6M48 61.6c1.5 1.7 3.6 1.7 4.8.6" stroke="#7a3b2e" stroke-width="1.3" fill="none" stroke-linecap="round"/></g></svg>`},
    // Eule Kritzel aus Kritzelheld – Farben wie im Spiel (Flügel sitzen am Körper und schwingen an der Schulter)
    owl:{w:70,h:80,svg:`<svg viewBox="0 0 100 114">
<g class="lg1"><path d="M40 102v6M40 108l-5 4M40 108v5M40 108l5 4" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/></g><g class="lg2"><path d="M60 102v6M60 108l-5 4M60 108v5M60 108l5 4" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/></g>
<path d="M26 30 L27 6 L44 22 Z M74 30 L73 6 L56 22 Z" fill="#e8484a"/>
<path d="M50 14c22 0 36 18 36 44c0 28-14 46-36 46S14 86 14 58C14 32 28 14 50 14z" fill="#ff5f5c"/>
<path d="M50 54c13 0 21 10 21 24c0 14-9 23-21 23s-21-9-21-23c0-14 8-24 21-24z" fill="#ffb7b5"/>
<path d="M40 72q4 3 8 0M52 72q4 3 8 0M46 84q4 3 8 0" stroke="#f08f8d" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<g class="wg1"><path d="M22 50c-8 6-11 20-8 34c1 4 6 5 9 2c4-6 6-18 5-32z" fill="#e8484a"/></g>
<g class="wg2"><path d="M78 50c8 6 11 20 8 34c-1 4-6 5-9 2c-4-6-6-18-5-32z" fill="#e8484a"/></g>
<circle cx="36" cy="42" r="15" fill="#fff"/><circle cx="64" cy="42" r="15" fill="#fff"/>
<g class="k-eye"><circle cx="38" cy="44" r="8" fill="#1d2350"/><circle cx="62" cy="44" r="8" fill="#1d2350"/><circle cx="41" cy="41" r="3" fill="#fff"/><circle cx="65" cy="41" r="3" fill="#fff"/></g>
<path d="M44 54 L56 54 L50 64 Z" fill="#ff9f1c"/><g fill="#ffd0d0" opacity=".9"><ellipse cx="24" cy="56" rx="5" ry="3.5"/><ellipse cx="76" cy="56" rx="5" ry="3.5"/></g></svg>`},
    // Panda (für das nächste Kinderspiel, erscheint automatisch, sobald ein KIDS-Eintrag mascot="panda" hat)
    panda:{w:78,h:90,svg:`<svg viewBox="0 0 100 116">
<g class="lg1"><ellipse cx="36" cy="106" rx="11" ry="9" fill="#26263a"/></g><g class="lg2"><ellipse cx="64" cy="106" rx="11" ry="9" fill="#26263a"/></g>
<ellipse cx="50" cy="84" rx="30" ry="26" fill="#fff"/><g class="wg1"><ellipse cx="22" cy="82" rx="9" ry="15" fill="#26263a"/></g><g class="wg2"><ellipse cx="78" cy="82" rx="9" ry="15" fill="#26263a"/></g>
<circle cx="24" cy="20" r="11" fill="#26263a"/><circle cx="76" cy="20" r="11" fill="#26263a"/><circle cx="50" cy="44" r="32" fill="#fff"/>
<ellipse cx="37" cy="44" rx="9" ry="11" fill="#26263a" transform="rotate(-20 37 44)"/><ellipse cx="63" cy="44" rx="9" ry="11" fill="#26263a" transform="rotate(20 63 44)"/>
<g class="k-eye"><circle cx="38" cy="44" r="4" fill="#fff"/><circle cx="62" cy="44" r="4" fill="#fff"/><circle cx="38.6" cy="44.6" r="2.2" fill="#1d2350"/><circle cx="62.6" cy="44.6" r="2.2" fill="#1d2350"/></g>
<ellipse cx="50" cy="56" rx="5" ry="3.6" fill="#26263a"/><path d="M50 59v3M50 62q-4 3-7 0M50 62q4 3 7 0" stroke="#26263a" stroke-width="2" fill="none" stroke-linecap="round"/><g fill="#ffb3c1"><ellipse cx="30" cy="58" rx="5" ry="3"/><ellipse cx="70" cy="58" rx="5" ry="3"/></g></svg>`}
  };
  const emojiFig=em=>({w:64,h:64,svg:`<svg viewBox="0 0 64 64"><text x="32" y="54" font-size="52" text-anchor="middle">${em}</text></svg>`});

  /* ---- Wiese: Figuren laufen weich hin und her (requestAnimationFrame + Easing) ---- */
  const lawn=$('#kLawn');
  if(lawn){
    const list=[{kind:'lion',game:null,scale:1}];
    D.games.forEach(g=>{ if(!g.mascot&&!g.emoji) return; const n=Math.max(1,Math.min(4,g.crowd||1)); for(let i=0;i<n;i++) list.push({kind:g.mascot,game:g,scale:i?.72+Math.random()*.1:1}); });
    const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    const W=()=>lawn.clientWidth;
    let openBubble=null;
    // Jede Figur bekommt einen eigenen Streifen der Wiese (gemischte Reihenfolge), damit sie sich nicht überlagern;
    // dazu eine leicht unterschiedliche Tiefe (weiter hinten = etwas höher und kleiner).
    const order=list.map((_,i)=>i).sort(()=>Math.random()-.5);
    const walkers=list.map((m,i)=>{
      const slot=order[i], depth=(slot%2)*10+Math.random()*6, f=MASCOTS[m.kind]||emojiFig(m.game&&m.game.emoji||'⭐'), big=(W()>900?1.3:1)*(1-depth/120), w=f.w*m.scale*big, h=f.h*m.scale*big;
      const el=document.createElement('div'); el.className='k-walker'+(m.kind==='lion'?' is-lion':''); el.style.width=w+'px'; el.style.height=h+'px'; el.style.bottom=(10+depth)+'px';
      el.innerHTML='<button type="button" class="k-fig" aria-label="'+(m.game?m.game.title+': Wollen wir spielen?':'Lux, der Löwe')+'">'+f.svg+'</button>';
      lawn.appendChild(el);
      const o={el,fig:el.firstChild,m,w,h,slot,depth,x:0,x0:0,tx:0,t:0,dur:1,state:'idle',wait:.3+Math.random()*1.5,dir:Math.random()<.5?-1:1,ph:Math.random()*6,hop:0,z:Math.round(h)};
      el.style.zIndex=String(200-Math.round(depth)); const z=zone(o); o.x=(z[0]+z[1])/2;
      o.fig.addEventListener('click',ev=>{ ev.stopPropagation(); tap(o); });
      return o;
    });
    function bubble(o,text,withPlay){
      closeBubble();
      const b=document.createElement('div'); b.className='k-wb'+(withPlay?' has-play':''); const sp=document.createElement('span'); sp.textContent=text; b.appendChild(sp);
      if(withPlay){ const p=document.createElement('button'); p.type='button'; p.className='k-wb-play'; p.setAttribute('aria-label',o.m.game.title+' spielen');
        p.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="#fff"/></svg>';
        p.onclick=ev=>{ ev.stopPropagation(); say(o.m.game.say); closeBubble(); openGame(o.m.game.id); }; b.appendChild(p); }
      lawn.appendChild(b);
      const bw=b.offsetWidth, cx=o.x+o.w/2, left=Math.max(6,Math.min(W()-bw-6,cx-bw/2));
      b.style.left=left+'px'; b.style.bottom=(10+o.depth+o.h+10)+'px'; b.style.setProperty('--tail',(cx-left)+'px');
      openBubble={b,o,until:performance.now()+(withPlay?7000:2400)};
    }
    function closeBubble(){ if(openBubble){ openBubble.b.remove(); openBubble.o.state='idle'; openBubble.o.wait=.8; openBubble=null; } }
    function tap(o){
      o.state='talk'; o.hop=1; o.el.classList.remove('giggle'); void o.el.offsetWidth; o.el.classList.add('giggle');
      if(o.m.game&&o.m.game.play){ say(P.askplay||'Wollen wir spielen?'); bubble(o,P.askplay||'Wollen wir spielen?',true); }
      else { say(P.lion||'Haha!'); bubble(o,P.lion||'Haha!',false); }
    }
    document.addEventListener('click',e=>{ if(openBubble&&!e.target.closest('.k-wb')) closeBubble(); });
    function zone(o){ const n=list.length, sw=W()/n, a=o.slot*sw, b=a+sw-o.w; return b>a?[a,b]:[a+(sw-o.w)/2,a+(sw-o.w)/2]; }
    function pick(o){
      const [a,b]=zone(o); let t=a+Math.random()*(b-a); if(Math.abs(t-o.x)<(b-a)*.25) t=o.x<(a+b)/2?b-Math.random()*(b-a)*.2:a+Math.random()*(b-a)*.2;
      o.x0=o.x; o.tx=Math.max(a,Math.min(b,t)); if(Math.abs(o.tx-o.x)<4){ o.state='idle'; o.wait=1+Math.random()*2; return; }
      o.dir=o.tx>o.x?1:-1; o.t=0; o.dur=Math.abs(o.tx-o.x)/(48*(o.m.scale<1?1.15:1)); o.state='walk';
    }
    let last=performance.now(), vis=true;
    try{ new IntersectionObserver(es=>{ vis=es[0].isIntersecting; }).observe(lawn); }catch(_){}
    function draw(o){
      const walking=o.state==='walk', sw=walking?Math.sin(o.ph):0;
      const bob=walking?Math.abs(Math.sin(o.ph))*4*o.m.scale:0, hop=Math.sin(Math.min(1,o.hop)*Math.PI)*28*o.m.scale;
      o.el.style.transform=`translate3d(${o.x.toFixed(1)}px,${(-bob-hop).toFixed(1)}px,0)`;
      o.fig.style.transform=`scaleX(${o.dir}) rotate(${(sw*5).toFixed(2)}deg)`;
      o.el.style.setProperty('--sw',(sw*1).toFixed(3));
    }
    function tick(now){
      const dt=Math.min(.05,(now-last)/1000); last=now;
      if(vis&&!playing()){
        walkers.forEach(o=>{
          if(o.hop>0) o.hop=Math.max(0,o.hop-dt*1.8);
          if(o.state==='walk'){ o.t+=dt/o.dur; const p=Math.min(1,o.t); o.x=o.x0+(o.tx-o.x0)*ease(p); o.ph+=dt*9*(.4+Math.sin(p*Math.PI)); if(p>=1){ o.state='idle'; o.wait=.8+Math.random()*2.6; } }
          else if(o.state==='idle'){ o.wait-=dt; if(o.wait<=0) pick(o); }
          draw(o);
        });
        if(openBubble&&now>openBubble.until) closeBubble();
      }
      requestAnimationFrame(tick);
    }
    walkers.forEach(draw);
    addEventListener('resize',()=>walkers.forEach(o=>{ const z=zone(o); o.x=Math.max(z[0],Math.min(z[1],o.x)); if(o.state==='walk'){ o.state='idle'; o.wait=.2; } draw(o); }));
    if(!calm) requestAnimationFrame(tick);
  }

  /* ---- Animierte Vorschau auf den Spielkarten (Canvas, ohne Text) ---- */
  const PREVIEWS={
    // Kritzelheld: Eule Kritzel winkt, malt einen bunten Buchstaben, Sterne und Federn fliegen, ein Fußball hüpft vorbei
    kritzel(ctx,W,H,t,n){
      const s=H/200, T=7, k=t%T, letter='AKMOL3'[n%6];
      const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#bff0ff'); g.addColorStop(1,'#e9fff2'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#8fe08a'; ctx.beginPath(); ctx.ellipse(W*.5,H*1.12,W*.75,H*.3,0,0,7); ctx.fill();
      // Papier
      const px=W*.42, py=H*.1, pw=W*.5, ph=H*.72;
      ctx.save(); ctx.translate(px+pw/2,py+ph/2); ctx.rotate(-.03); ctx.fillStyle='#fff'; ctx.shadowColor='rgba(29,35,80,.15)'; ctx.shadowOffsetY=5*s; ctx.beginPath(); ctx.roundRect(-pw/2,-ph/2,pw,ph,14*s); ctx.fill(); ctx.shadowColor='transparent';
      ctx.strokeStyle='#d6ecff'; ctx.lineWidth=2*s; for(let i=1;i<5;i++){ ctx.beginPath(); ctx.moveTo(-pw/2+10*s,-ph/2+i*ph/5); ctx.lineTo(pw/2-10*s,-ph/2+i*ph/5); ctx.stroke(); }
      // Buchstabe Strich für Strich
      const L={A:[[[0,1],[.5,0],[1,1]],[[.22,.6],[.78,.6]]],K:[[[.1,0],[.1,1]],[[.85,0],[.1,.55],[.9,1]]],M:[[[0,1],[.05,0],[.5,.6],[.95,0],[1,1]]],L:[[[.15,0],[.15,1],[.9,1]]],
               O:[Array.from({length:33},(_,i)=>[.5+.45*Math.sin(i/32*Math.PI*2),.5-.5*Math.cos(i/32*Math.PI*2)])],'3':[Array.from({length:17},(_,i)=>[.45+.4*Math.sin(i/16*Math.PI*1.25-.3),.25-.25*Math.cos(i/16*Math.PI*1.25-.3)]).concat(Array.from({length:17},(_,i)=>[.45+.45*Math.sin(i/16*Math.PI*1.4-.1),.72-.28*Math.cos(i/16*Math.PI*1.4-.1)]))]};
      const strokes=L[letter], lw=ph*.55, lh=ph*.62, lx=-lw/2, ly=-lh/2;
      let total=0; const segs=[]; strokes.forEach(st=>{ for(let i=1;i<st.length;i++){ const a=st[i-1],b=st[i],d=Math.hypot((b[0]-a[0])*lw,(b[1]-a[1])*lh); segs.push([a,b,d,i===1]); total+=d; } });
      const prog=Math.max(0,Math.min(1,(k-.6)/2.6)), fade=k>6.4?1-(k-6.4)/.6:1;
      let left=prog*total, tip=null; ctx.lineCap=ctx.lineJoin='round'; ctx.lineWidth=ph*.085; ctx.globalAlpha=fade;
      const cols=['#ff5d8f','#ff8a3d','#ffc93f','#3ec97a','#19a7e0','#8b5cf6']; let ci=0;
      for(const [a,b,d] of segs){ if(left<=0) break; const f=Math.min(1,left/d); left-=d;
        const x1=lx+a[0]*lw, y1=ly+a[1]*lh, x2=lx+(a[0]+(b[0]-a[0])*f)*lw, y2=ly+(a[1]+(b[1]-a[1])*f)*lh;
        ctx.strokeStyle=cols[(ci++)%cols.length]; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); tip=[x2,y2]; }
      ctx.globalAlpha=1;
      // Stift
      if(tip&&prog<1){ ctx.save(); ctx.translate(tip[0],tip[1]); ctx.rotate(-.7+Math.sin(t*20)*.05); ctx.fillStyle='#ffd23f'; ctx.fillRect(0,-5*s,40*s,10*s); ctx.fillStyle='#ff6fae'; ctx.fillRect(36*s,-5*s,8*s,10*s); ctx.fillStyle='#f3c99a'; ctx.beginPath(); ctx.moveTo(0,-5*s); ctx.lineTo(-10*s,0); ctx.lineTo(0,5*s); ctx.fill(); ctx.restore(); }
      // Sterne-Explosion
      if(k>3.3&&k<5){ const q=(k-3.3)/1.7; for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+.3, r=(30+q*120)*s; star(ctx,Math.cos(a)*r,Math.sin(a)*r*.8,(10-q*4)*s,cols[i%6],1-q,t*4+i); } }
      ctx.restore();
      // Federn schweben
      if(k>3.5){ for(let i=0;i<3;i++){ const q=(k-3.5-i*.3)/3; if(q<0||q>1) continue; const fx=W*(.55+i*.13)+Math.sin(q*9+i)*14*s, fy=H*(.05+q*.75); feather(ctx,fx,fy,s,Math.sin(q*7+i)*.6,['#ff8a3d','#19a7e0','#ff6fae'][i]); } }
      // Fußball
      if(k>4.4&&k<7){ const q=(k-4.4)/2.6, bx=W*1.08-q*W*1.25, by=H*.86-Math.abs(Math.sin(q*Math.PI*3))*H*.32, r=16*s; ball(ctx,bx,by,r,-q*14); }
      // Eule Kritzel
      const hap=k>3.3&&k<4.6?Math.abs(Math.sin((k-3.3)*9))*14*s:0;
      owl(ctx,W*.2,H*.9-hap,s*1.05,Math.sin(t*6)*.5,(t%3.2)<.12);
    }
  };
  function star(c,x,y,r,col,a,rot){ c.save(); c.globalAlpha=Math.max(0,a); c.translate(x,y); c.rotate(rot); c.fillStyle=col; c.beginPath(); for(let i=0;i<10;i++){ const rr=i%2?r*.45:r, an=i/10*Math.PI*2; c.lineTo(Math.sin(an)*rr,-Math.cos(an)*rr); } c.fill(); c.restore(); }
  function feather(c,x,y,s,rot,col){ c.save(); c.translate(x,y); c.rotate(rot); c.fillStyle=col; c.beginPath(); c.ellipse(0,0,6*s,16*s,0,0,7); c.fill(); c.strokeStyle='rgba(255,255,255,.8)'; c.lineWidth=1.5*s; c.beginPath(); c.moveTo(0,-15*s); c.lineTo(0,20*s); c.stroke(); c.restore(); }
  function ball(c,x,y,r,rot){ c.save(); c.translate(x,y); c.fillStyle='rgba(29,35,80,.12)'; c.beginPath(); c.ellipse(0,r*1.1+(1-0)*0,r*.9,r*.25,0,0,7); c.restore();
    c.save(); c.translate(x,y); c.rotate(rot); c.fillStyle='#fff'; c.strokeStyle='#1d2350'; c.lineWidth=r*.12; c.beginPath(); c.arc(0,0,r,0,7); c.fill(); c.stroke();
    c.fillStyle='#1d2350'; c.beginPath(); for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; c.lineTo(Math.sin(a)*r*.38,-Math.cos(a)*r*.38); } c.fill();
    for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; c.beginPath(); c.arc(Math.sin(a)*r*.92,-Math.cos(a)*r*.92,r*.2,0,7); c.fill(); } c.restore(); }
  function owl(c,x,y,s,wave,blink){
    c.save(); c.translate(x,y); c.scale(s,s);
    c.fillStyle='rgba(29,35,80,.15)'; c.beginPath(); c.ellipse(0,0,40,8,0,0,7); c.fill();
    c.fillStyle='#ff9f1c'; [-14,14].forEach(dx=>{ c.beginPath(); c.ellipse(dx,-3,9,5,0,0,7); c.fill(); });
    c.fillStyle='#e8484a'; c.beginPath(); c.moveTo(-30,-110); c.lineTo(-24,-142); c.lineTo(-8,-118); c.fill(); c.beginPath(); c.moveTo(30,-110); c.lineTo(24,-142); c.lineTo(8,-118); c.fill();
    c.fillStyle='#ff5f5c'; c.beginPath(); c.ellipse(0,-62,40,58,0,0,7); c.fill();
    c.fillStyle='#ffb7b5'; c.beginPath(); c.ellipse(0,-42,26,32,0,0,7); c.fill();
    c.fillStyle='#e8484a'; c.beginPath(); c.ellipse(-38,-58,10,26,.25,0,7); c.fill();          // linker Flügel
    c.save(); c.translate(34,-76); c.rotate(-1.2+wave); c.beginPath(); c.ellipse(0,-22,10,26,0,0,7); c.fill(); c.restore();   // winkt
    c.fillStyle='#fff'; [-17,17].forEach(dx=>{ c.beginPath(); c.arc(dx,-90,18,0,7); c.fill(); });
    if(blink){ c.strokeStyle='#1d2350'; c.lineWidth=4; c.lineCap='round'; [-17,17].forEach(dx=>{ c.beginPath(); c.moveTo(dx-8,-89); c.quadraticCurveTo(dx,-84,dx+8,-89); c.stroke(); }); }
    else { c.fillStyle='#1d2350'; [-15,19].forEach(dx=>{ c.beginPath(); c.arc(dx,-88,9.5,0,7); c.fill(); }); c.fillStyle='#fff'; [-12,22].forEach(dx=>{ c.beginPath(); c.arc(dx,-92,3.4,0,7); c.fill(); }); }
    c.fillStyle='#ff9f1c'; c.beginPath(); c.moveTo(-7,-74); c.lineTo(7,-74); c.lineTo(0,-62); c.fill();
    c.fillStyle='rgba(255,215,215,.9)'; [-30,30].forEach(dx=>{ c.beginPath(); c.ellipse(dx,-70,6,4,0,0,7); c.fill(); });
    c.restore();
  }
  document.querySelectorAll('canvas.k-prev').forEach(cv=>{
    const fn=PREVIEWS[cv.dataset.preview]; if(!fn) return;
    const ctx=cv.getContext('2d'); if(!ctx) return; if(!ctx.roundRect) ctx.roundRect=function(x,y,w,h){ this.rect(x,y,w,h); };
    let W=0,H=0,vis=true,t0=performance.now();
    const fit=()=>{ const r=cv.getBoundingClientRect(), d=Math.min(2,devicePixelRatio||1); W=r.width; H=r.height; cv.width=Math.round(W*d); cv.height=Math.round(H*d); ctx.setTransform(d,0,0,d,0,0); };
    fit(); addEventListener('resize',()=>{ fit(); if(calm) frame(3.6); });
    try{ new IntersectionObserver(es=>{ vis=es[0].isIntersecting; }).observe(cv); }catch(_){}
    const frame=t=>{ if(W&&H) fn(ctx,W,H,t,Math.floor(t/7)); };
    if(calm){ frame(3.6); return; }
    const loop=now=>{ if(vis&&!playing()) frame(Math.max(0,now-t0)/1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });

  /* ---- Elternsperre: Rechenaufgabe, erst die richtige Antwort beendet den Kids-Modus ---- */
  const dlg=$('#kGate'), q=$('#kQ'), inp=$('#kAns'), err=$('#kErr');
  let ans=0;
  const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
  function newQ(){ const a=rnd(3,9), b=rnd(4,9); ans=a*b; q.textContent='Wie viel ist '+a+' × '+b+'?'; inp.value=''; }
  function openGate(){ newQ(); err.textContent=''; try{ dlg.showModal(); }catch(_){ dlg.setAttribute('open',''); } setTimeout(()=>{ try{ inp.focus(); }catch(_){} },60); }
  function closeGate(){ try{ dlg.close(); }catch(_){ dlg.removeAttribute('open'); } }
  $('#kParents').addEventListener('click',openGate);
  $('#kBack').addEventListener('click',closeGate);
  dlg.addEventListener('click',e=>{ if(e.target===dlg) closeGate(); });
  $('#kGateForm').addEventListener('submit',e=>{
    e.preventDefault();
    if(String(inp.value).trim()!=='' && Number(inp.value)===ans){
      try{ localStorage.removeItem(KEY); }catch(_){}
      location.href='/';
    } else {
      err.textContent='Leider falsch. Hier ist eine neue Aufgabe.';
      dlg.classList.remove('shake'); void dlg.offsetWidth; dlg.classList.add('shake');
      newQ(); try{ inp.focus(); }catch(_){}
    }
  });

  /* ---- Hinweis, wenn man gerade von der Hauptseite kommt ---- */
  if(window.__lxKidsNew){
    const t=document.createElement('div'); t.className='k-toast'; t.setAttribute('role','status');
    t.innerHTML='<b>Kids-Modus ist an.</b> Andere Seiten von lewolux.de sind jetzt gesperrt. Zurück geht es oben rechts über „Erwachsenenbereich“.';
    document.body.appendChild(t); setTimeout(()=>t.remove(),7000); t.onclick=()=>t.remove();
  }

  /* ---- Als App installieren (eigenes Manifest /kids/kids.webmanifest) ---- */
  if(window.lxInstall) lxInstall(document.getElementById('kInstall'),'Lewolux Kids als App','So kommt Lewolux Kids auf den Startbildschirm:');
})();
