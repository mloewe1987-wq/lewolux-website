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
if(spot){let spotI=0,spotTimer;const dots=$('#spotDots'),poster=$('#spotPoster'),spotIO=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?goLive(spot):stopLive(spot)));
  spot.dataset.scene=GAMES[0].scene;spot.dataset.v=0;ro.observe(spot);spotIO.observe(spot);
  GAMES.forEach((g,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Spotlight: '+g.short);b.onclick=()=>setSpot(i);dots.appendChild(b)});
  function setSpot(i){spotI=(i+GAMES.length)%GAMES.length;const g=GAMES[spotI];spot.dataset.scene=g.scene;spot.dataset.v=0;
    poster.src=g.shotImgs[0];poster.alt='Screenshot aus '+g.short;const t=$('#spotTitle');t.textContent=g.title;t.href=g.page;$('#spotTag').textContent=g.tagline;
    const hp=$('#heroPlay');hp.dataset.open=g.id;$('#heroPlayLabel').textContent=g.short+' spielen';
    [...dots.children].forEach((d,k)=>{d.removeAttribute('aria-current');void d.offsetWidth;if(k===spotI)d.setAttribute('aria-current','true')});
    draw(spot,performance.now());spot.classList.add('on');clearTimeout(spotTimer);if(!reduce)spotTimer=setTimeout(()=>setSpot(spotI+1),7000)}
  setSpot(0);spot.style.cursor='pointer';spot.onclick=()=>openModal(GAMES[spotI].id,'demo');
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
document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b&&!e.target.closest('a[href]:not([data-open])')){e.preventDefault();openModal(b.dataset.open,b.dataset.mode||'demo')}});

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

/* ---------- modal ---------- */
const modal=$('#modal'),stage=$('#stage'),shotCv=$('#stageShot'),host=$('#demoHost');let cur=null,curShot=0,cleanup=null,lastFocus=null,curMode='demo';
if(modal){shotCv.dataset.scene=GAMES[0].scene;shotCv.dataset.v=0;ro.observe(shotCv);
  if(!document.fullscreenEnabled||!fine)$('#fsBtn').hidden=true;}
function openModal(id,mode){const g=GAMES.find(x=>x.id===id);if(!g||!modal)return;cur=g;lastFocus=document.activeElement;
  $('#mTitle').textContent=g.title;$('#mGenres').innerHTML=g.genres.map(x=>`<span class="genre">${x}</span>`).join('');$('#mPanel').style.setProperty('--glow',g.accent);$('#mGenres').style.setProperty('--accent',g.accent);
  $('#mStory').textContent=g.story;$('#mKeys').innerHTML=g.controls.map(([a,k])=>`<li><span>${a}</span><kbd>${k}</kbd></li>`).join('');$('#mFeats').innerHTML=g.features.map(f=>`<li>${f}</li>`).join('');
  $('#mFormat').textContent=g.download.format;const dl=$('#mDownload');dl.href=g.download.href;$('#mPage').href=g.page;
  const th=$('#thumbs');th.innerHTML='';g.shots.forEach((sh,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Screenshot '+(i+1)+': '+sh);const im=document.createElement('img');im.src=g.shotImgs[i];im.alt='';im.loading='lazy';b.appendChild(im);b.onclick=()=>{setMode('shots');setShot(i)};th.appendChild(b)});
  modal.hidden=false;document.documentElement.classList.add('modal-open');$('#mPanel').scrollTop=0;
  requestAnimationFrame(()=>{setShot(0);setMode(mode);$('.icon-btn',modal).focus({preventScroll:true})});
  try{history.replaceState(null,'','#spiel-'+g.id)}catch(_){}
}
function setShot(i){curShot=i;shotCv.dataset.scene=cur.scene;shotCv.dataset.v=i;shotCv.setAttribute('aria-label','Screenshot aus '+cur.title+': '+cur.shots[i]);draw(shotCv,performance.now());$$('#thumbs button').forEach((b,k)=>b.setAttribute('aria-current',k===i))}
function setMode(m){curMode=m;const demo=m==='demo';$('#modeDemo').setAttribute('aria-pressed',demo);$('#modeShots').setAttribute('aria-pressed',!demo);stage.classList.toggle('demo-mode',demo);$('#thumbs').hidden=demo;host.hidden=!demo;shotCv.hidden=demo;
  if(cleanup){cleanup();cleanup=null}host.innerHTML='';
  if(demo){cleanup=(DEMOS[cur.demo]||DEMOS.none)(host,cur)||null;stopLive(shotCv)}else{draw(shotCv,performance.now());goLive(shotCv)}}
function closeModal(){if(!modal||modal.hidden)return;if(cleanup){cleanup();cleanup=null}host.innerHTML='';stopLive(shotCv);modal.hidden=true;document.documentElement.classList.remove('modal-open');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});try{history.replaceState(null,'',location.pathname+location.search)}catch(_){}lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true})}
if(modal){
$('#modeDemo').onclick=()=>setMode('demo');$('#modeShots').onclick=()=>setMode('shots');
$$('[data-close]',modal).forEach(b=>b.onclick=closeModal);
document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape')closeModal();if(e.key==='Tab'){const f=$$('button,a[href],input,[tabindex]:not([tabindex="-1"])',modal).filter(x=>x.offsetParent);if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus()}}
  if(curMode==='demo'||e.target.closest('input,textarea'))return;if(e.key==='ArrowRight')setShot((curShot+1)%cur.shots.length);if(e.key==='ArrowLeft')setShot((curShot+cur.shots.length-1)%cur.shots.length)});
$('#fsBtn').onclick=()=>{try{const p=document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen&&stage.requestFullscreen();p&&p.catch&&p.catch(()=>{})}catch(_){}};
const hm=location.hash.match(/^#spiel-([a-z0-9-]+)$/);if(hm&&GAMES.find(g=>g.id===hm[1]))setTimeout(()=>openModal(hm[1],'demo'),300);
}
}
