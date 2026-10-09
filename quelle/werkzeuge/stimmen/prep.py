import json,re,sys
S='/home/claude/site/'
def spoken(t):
    t=re.sub(r'[\U0001F000-\U0001FAFF☀-➿️‍]','',t)
    t=re.sub(r'(\d+)\s*-\s*(\d+)',r'\1 bis \2',t)
    return re.sub(r'\s+',' ',t).strip()
# Kritzel + Kids (owl)
K=json.load(open(S+'kritzel-voice-phrases.json'))
owl=[{'k':'kr:'+x['t'],'s':spoken(x.get('s') or x['t'])} for x in K if re.search(r'[0-9A-Za-zÄÖÜäöüß]',x['t'])]
owl+= [{'k':'kids:'+t,'s':spoken(t)} for t in json.load(open(S+'kids-voice-texts.json'))]
lux=[{'k':'lux:'+x['h'],'s':spoken(x['t'])} for x in json.load(open('lux_lines.json'))]
def batches(items,maxc,maxn):
    out=[];cur=[];c=0
    for it in items:
        L=len(it['s'])+14
        if cur and (c+L>maxc or len(cur)>=maxn): out.append(cur);cur=[];c=0
        cur.append(it);c+=L
    if cur: out.append(cur)
    return out
B={'owl':batches(owl,1800,60),'lux':batches(lux,1800,14)}
for k,v in B.items(): print(k,len(v),'batches',sum(len(b) for b in v),'items')
json.dump(B,open('batches.json','w'),ensure_ascii=False)
