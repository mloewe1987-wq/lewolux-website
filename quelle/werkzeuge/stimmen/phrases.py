import json, re
D = json.load(open('data.json'))
def lits(g):
    s = open(f'/home/claude/site/spiele-dateien/{g}/index.html', encoding='utf-8').read()
    out = []
    for call in re.findall(r"say\(([^;]*)", s):
        out += [x.replace("\\'", "'") for x in re.findall(r"'((?:[^'\\]|\\.)*)'", call)]
    return out
JUNK={'REKORD!','Weitschuss','Werkstatt','Nochmal','Trick-Show','Schaffe 3 Tore für einen Stern'}
def frags(t):
    return [x.strip() for x in re.split(r'(?<=[!?.])\s+', t) if x.strip()]
def build(g):
    P = []
    for t in lits(g):
        if re.match(r'[A-ZÄÖÜ0-9]', t) and t not in JUNK and not t.startswith(' ') and not t.endswith(' ') and t not in ('Neu: ', 'Neue Welt: '):
            P.append(t)
    d = D[g]
    if g == 'pandi':
        P += d['LV'] + d['PT'] + d['TT'] + [w['say'] for w in d['WORLDS']]
        P += ['Neu: ' + x + '!' for x in d['PT']] + ['Neue Welt: ' + w['name'] + '!' for w in d['WORLDS']]
        P += [n + '!' for c in d['ITEMS'] for n in c]
    else:
        P += d['BIOMES'] + d['KEEPERS'] + d['OPPS'] + d['MODES'] + d['SLOTS'] + d['SZLV'] + [u + ' verbessert!' for u in d['UPS']]
        for it in d['ITEMS']:
            P.append(it['name'])
            if it['price'] > 0:
                P += [it['name'] + '.', 'Kostet %d Münzen.' % it['price'], it['name'] + ' gehört jetzt dir!']
        P += ['%d Meter!' % m for m in meters()]
        P += ['%d mal!' % n for n in range(1, 151)]
        P += ['%d Tore!' % g_ for g_ in range(0, 6)] + ['%d Tore.' % g_ for g_ in range(0, 6)]
        P += ['%d zu %d!' % (a, o) for a in range(0, 13) for o in range(0, 13)]
    # split everything into fragments (runtime plays fragments in sequence)
    F = []
    for t in P: F += frags(t)
    F = [f for f in dict.fromkeys(F) if re.search(r'[A-Za-zÄÖÜäöü0-9]', f)]
    return F
def meters():
    return list(range(1, 101)) + list(range(110, 1001, 10)) + list(range(1100, 10001, 100))
for g in ('pandi', 'schulhofkicker'):
    F = build(g); json.dump(F, open(g + '_frags.json', 'w'), ensure_ascii=False, indent=0)
    print(g, len(F), sum(map(len, F)))
    print([f for f in F if not re.match(r'^\d', f)][:400])
