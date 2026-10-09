/* ---------- Aufgenommene Stimme (ElevenLabs), Gerätestimme nur als Ersatz ---------- */
const VOX=/*@@VOX*/{}/*@@VOX-END*/;
const VXA={};let vxCur=null,vxTok=0;
function vxNorm(f){const m=f.match(/^(\d+) Meter!$/);if(m){let n=+m[1];n=n<=100?n:n<=1000?Math.round(n/10)*10:Math.min(10000,Math.round(n/100)*100);return n+' Meter!'}return f}
function vxPlan(t){const F=String(t).split(/(?<=[!?.])\s+/).map(s=>s.trim()).filter(Boolean).map(vxNorm);const ids=F.map(f=>VOX[f]||(f.endsWith('.')&&VOX[f.slice(0,-1)]));return F.length&&ids.every(Boolean)?ids:null}
function vxAudio(id){let a=VXA[id];if(!a){a=VXA[id]=new Audio('voice/'+id+'.mp3');a.preload='auto'}return a}
function vxStop(){vxTok++;if(vxCur){try{vxCur.pause()}catch(e){}vxCur=null}}
function vxSay(ids,tok){let i=0;const next=()=>{if(tok!==vxTok)return;if(i>=ids.length){vxCur=null;duck(false);return}
  const a=vxAudio(ids[i++]);vxCur=a;a.onended=next;a.onerror=()=>{vxCur=null;duck(false)};try{a.currentTime=0;a.volume=1;const p=a.play();if(p&&p.catch)p.catch(()=>{vxCur=null;duck(false)})}catch(e){vxCur=null;duck(false)}};
  duck(true);next()}
