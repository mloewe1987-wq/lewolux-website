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
