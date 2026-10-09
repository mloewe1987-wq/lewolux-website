import hashlib, json, os, re, subprocess, sys
g, mp = sys.argv[1], json.load(open(sys.argv[2]))
d = f'/home/claude/site/spiele-dateien/{g}'; vd = os.path.join(d, 'voice'); os.makedirs(vd, exist_ok=True)
vox = {}
for k, f in mp.items():
    h = hashlib.sha1(('vx1|' + k).encode()).hexdigest()[:10]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-ac', '1', '-ar', '44100', '-b:a', '48k', os.path.join(vd, h + '.mp3')], check=True)
    vox[k] = h
for fn in os.listdir(vd):
    if fn[:-4] not in vox.values(): os.remove(os.path.join(vd, fn))
p = os.path.join(d, 'index.html'); s = open(p, encoding='utf-8').read()
s, n = re.subn(r'/\*@@VOX\*/.*?/\*@@VOX-END\*/', lambda m: '/*@@VOX*/' + json.dumps(vox, ensure_ascii=False, separators=(',', ':')) + '/*@@VOX-END*/', s, flags=re.S)
assert n == 1
open(p, 'w', encoding='utf-8').write(s)
print(g, len(vox), sum(os.path.getsize(os.path.join(vd, x)) for x in os.listdir(vd)) // 1024, 'KB')
