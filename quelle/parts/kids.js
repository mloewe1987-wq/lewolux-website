/* ===== Lewolux Kids: Vorlesen, Spiel im Vollbild, Elternsperre, App-Installation =====
   Kids-Modus: localStorage 'lxKids' = '1'. Wird beim Betreten von /kids/ gesetzt (Inline-Skript im <head>).
   Solange er aktiv ist, leitet jede andere Seite der Website sofort nach /kids/ um (Inline-Skript im <head> jeder Seite,
   auch in den Nicht-Kinder-Spielen unter /games/). Beenden nur über „Für Eltern“ + Rechenaufgabe. */
(function(){
  const $=s=>document.querySelector(s), KEY='lxKids';
  const games={}; try{ JSON.parse($('#kids-data').textContent).games.forEach(g=>games[g.id]=g); }catch(_){}

  /* ---- Vorlesen (für Kinder, die noch nicht lesen) – schlägt still fehl, wenn der Browser es nicht kann ---- */
  let voice=null;
  const pickVoice=()=>{ try{ const vs=speechSynthesis.getVoices(); voice=vs.find(v=>/^de(-|_)DE/i.test(v.lang))||vs.find(v=>/^de/i.test(v.lang))||null; }catch(_){} };
  try{ pickVoice(); speechSynthesis.addEventListener('voiceschanged',pickVoice); }catch(_){}
  function say(t){
    try{ if(!t||!('speechSynthesis' in window)) return; speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(t); u.lang='de-DE'; if(voice) u.voice=voice; u.rate=.95; u.pitch=1.15; speechSynthesis.speak(u);
    }catch(_){}
  }
  document.addEventListener('click',e=>{ const el=e.target.closest('[data-say]'); if(el) say(el.dataset.say); });

  /* ---- Spiel im Kinderbereich öffnen (Vollbild, ohne die Erwachsenen-Seiten zu verlassen) ---- */
  const pl=$('#kPlayer'), stage=$('#kStage');
  let frame=null;
  function openGame(id,push){
    const g=games[id]; if(!g) return;
    if(frame) frame.remove();
    pl.classList.remove('ready');
    frame=document.createElement('iframe'); frame.src=g.play; frame.title=g.title;
    frame.allow='fullscreen; autoplay; gamepad; screen-wake-lock'; frame.allowFullscreen=true;
    frame.onload=()=>pl.classList.add('ready');
    stage.appendChild(frame); pl.hidden=false; document.documentElement.classList.add('k-playing');
    if(push!==false) try{ history.pushState({kplay:id},'','#spiel-'+id); }catch(_){}
    try{ const fs=pl.requestFullscreen||pl.webkitRequestFullscreen; if(fs&&!document.fullscreenElement){ const r=fs.call(pl,{navigationUI:'hide'}); if(r&&r.catch) r.catch(()=>{}); } }catch(_){}
    setTimeout(()=>{ try{ frame.focus(); }catch(_){} },300);
  }
  function closeGame(fromPop){
    if(pl.hidden) return;
    pl.hidden=true; document.documentElement.classList.remove('k-playing');
    if(frame){ frame.remove(); frame=null; }
    try{ if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }catch(_){}
    if(!fromPop && /^#spiel-/.test(location.hash)) try{ history.back(); }catch(_){}
  }
  document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.play)));
  $('#kClose').addEventListener('click',()=>closeGame(false));
  addEventListener('popstate',()=>{ const m=location.hash.match(/^#spiel-(.+)$/); if(m&&games[m[1]]) openGame(m[1],false); else closeGame(true); });
  { const m=location.hash.match(/^#spiel-(.+)$/); if(m&&games[m[1]]) try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){} }

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
    t.innerHTML='<b>Kids-Modus ist an.</b> Andere Seiten von lewolux.de sind jetzt gesperrt. Zurück geht es über „Für Eltern“.';
    document.body.appendChild(t); setTimeout(()=>t.remove(),7000); t.onclick=()=>t.remove();
  }

  /* ---- Als App installieren (eigenes Manifest /kids/kids.webmanifest) ---- */
  if(window.lxInstall) lxInstall(document.getElementById('kInstall'),'Lewolux Kids als App','So kommt Lewolux Kids auf den Startbildschirm:');
})();
