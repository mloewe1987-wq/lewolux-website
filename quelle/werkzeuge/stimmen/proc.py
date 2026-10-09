"""proc.py <who: owl|lux> <dir with lx_<who>_NN.mp3> <outdir>
Splits each batch, checks count + duration/length correlation, writes outdir/<idx>.mp3 and outdir/map.json {key: file}."""
import json, os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from split import load, segs, cut
who, src, out = sys.argv[1:4]
B = json.load(open(os.environ.get('BATCHES') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'batches.json')))[os.environ.get('BKEY', who)]
os.makedirs(out, exist_ok=True)
m, bad = {}, []
for i, items in enumerate(B):
    cands = [os.path.join(src, f'lx_{who}_{i:02d}{s}.mp3') for s in ('', '_a', '_b', '_c', '_d')]
    cands = [c for c in cands if os.path.exists(c)]
    if not cands: bad.append((i, 'missing')); continue
    best = None; why = []
    L = np.array([len(it['s']) for it in items])
    for f in cands:
        x, sr = load(f)
        for thr in (0.75, 0.9, 1.05, 1.2, 0.6):
            S = segs(x, sr, thr)
            if len(S) != len(items): continue
            d = np.array([b - a for a, b in S])
            r = float(np.nan_to_num(np.corrcoef(d, L)[0, 1], nan=1.0)) if len(items) > 2 else 1.0
            if r >= float(os.environ.get('MINR','0.6')) and (best is None or r > best[2]): best = (f, thr, r)
            break
        else:
            why.append(f'{os.path.basename(f)}:{len(segs(x, sr))}/{len(items)}')
    if best is None: bad.append((i, why)); continue
    f, thr, r = best
    outs = [os.path.join(out, f'{who}_{i:02d}_{j:02d}.mp3') for j in range(len(items))]
    assert cut(f, outs, thr) is True
    for it, o in zip(items, outs): m[it['k']] = o
    print(i, 'ok', len(items), f'r={r:.2f}', flush=True)
json.dump(m, open(os.path.join(out, 'map.json'), 'w'), ensure_ascii=False, indent=0)
print('BAD', bad)
