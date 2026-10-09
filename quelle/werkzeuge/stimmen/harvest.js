const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const out={};
for(const g of ['pandi','schulhofkicker']){await p.goto('file:///home/claude/site/spiele-dateien/'+g+'/index.html');await p.waitForTimeout(1500);
 out[g]=await p.evaluate((g)=>{const r={};const T=(o)=>JSON.parse(JSON.stringify(o,(k,v)=>typeof v==='function'?undefined:v));
  if(g==='pandi'){r.LV=LV.map(x=>x.n);r.PT=Object.values(PT).map(x=>x.name);r.WORLDS=Object.values(WORLDS).map(x=>({name:x.name,say:x.say}));r.TT=Object.keys(TT).map(k=>TT[k].name);r.ITEMS=Object.keys(ITEMS).map(c=>ITEMS[c].map(x=>x[1]));}
  else{r.BIOMES=BIOMES.map(x=>x.name);r.ITEMS=ITEMS.map(x=>({name:x.name,price:x.price}));r.KEEPERS=KEEPERS.map(x=>x.say);r.OPPS=OPPS.map(x=>x.say);r.MODES=MODES.map(x=>x.say);r.SLOTS=SLOTS.map(x=>x.name);r.SZLV=SZLV.map(x=>x.n);r.UPS=UPS.map(x=>x.name);r.MEL=T(MEL).slice?MEL.length:0;}
  return r;},g);}
require('fs').writeFileSync('data.json',JSON.stringify(out,null,1));await b.close();})();
