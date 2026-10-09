"""integrate.py <owl|lux> <map.json>  -> copies split clips into the site."""
import hashlib, json, os, re, subprocess, sys
SITE = '/home/claude/site'
who, mp = sys.argv[1], json.load(open(sys.argv[2]))
def enc(src, dst, br='48k'):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-b:a', br, dst], check=True)
if who == 'owl':
    game = os.path.join(SITE, 'spiele-dateien/kritzelheld'); vd = os.path.join(game, 'voice')
    html = open(os.path.join(game, 'index.html'), encoding='utf-8').read()
    m = re.search(r"/\*@@VOICE-MANIFEST\*/(.*?)/\*@@VOICE-END\*/", html, re.S); vm = json.loads(m.group(1))
    ident = lambda t: hashlib.sha1(('v4|' + t).encode()).hexdigest()[:10]  # v4 = ElevenLabs (neue Namen gegen alten Cache)
    os.makedirs(os.path.join(SITE, 'kids-voice-el'), exist_ok=True)
    n = k = 0
    for key, f in mp.items():
        kind, t = key.split(':', 1)
        if kind == 'kr':
            h = ident(t); enc(f, os.path.join(vd, h + '.mp3')); old = vm.get(t); vm[t] = h; n += 1
        elif kind == 'kids':
            enc(f, os.path.join(SITE, 'kids-voice-el', hashlib.md5(('el|' + t).encode()).hexdigest()[:12] + '.mp3'), '64k'); k += 1
    used = set(vm.values())
    for fn in os.listdir(vd):
        if fn.endswith('.mp3') and fn[:-4] not in used: os.remove(os.path.join(vd, fn))
    man = json.dumps(dict(sorted(vm.items())), ensure_ascii=False, separators=(',', ':'))
    html = html[:m.start(1)] + man + html[m.end(1):]
    open(os.path.join(game, 'index.html'), 'w', encoding='utf-8').write(html)
    print('kritzel', n, 'kids', k, 'map', len(vm))
else:
    lines = {('lux:' + x['h']): x for x in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lux_lines.json')))}
    vd = os.path.join(SITE, 'lux-voice'); n = 0
    for key, f in mp.items():
        h = key.split(':', 1)[1]; enc(f, os.path.join(vd, h + '.mp3'), '64k'); n += 1
    print('lux', n, 'of', len(lines))
