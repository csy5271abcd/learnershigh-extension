"""subjlist2 결과를 정답과 비교. 매칭: 같은 키 > 포함/유사(0.75+) 이름 오류(허용). 남은 정답=FN, 남은 예측 중 이미 맞은 정답과 유사=중복, 나머지=FP."""
import json, sys, os, collections, difflib, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import subjlist2 as SL
gt = json.load(open(sys.argv[1], encoding='utf-8')); d = json.load(open(sys.argv[2], encoding='utf-8'))
tabs = sys.argv[3].split(','); dtabs = sys.argv[4].split(',')
schools = {k for k in gt if not k.startswith('_')}
res = SL.build(tabs, units=d['units'], schools=schools, dic_tables=dtabs)
import re as _re
_h = lambda s: _re.sub(r'[^가-힣]', '', s)  # 기호·숫자 표기만 다른 경우(화학∥/화학2)는 한글이 같으면 이름 오류
sim = lambda a, b: a in b or b in a or difflib.SequenceMatcher(None, a, b).ratio() >= 0.75 or (_h(a) == _h(b) and len(_h(a)) >= 2)
T = collections.Counter(); out = []
for sc in sorted(schools):
    if gt[sc].get('_scanned'):
        print(f"  {sc} 스캔본 — 목록 {len(res.get(sc, {}))}"); continue
    truth = {SL.skey(x) for v in gt[sc].values() for x in v}
    P = set(res.get(sc, {}))
    ex = truth & P; rt = sorted(truth - ex); rp = sorted(P - ex); ne = []
    for t in list(rt):
        b = max(rp, key=lambda p: difflib.SequenceMatcher(None, t, p).ratio(), default=None)
        if b and sim(t, b): ne.append((t, b)); rt.remove(t); rp.remove(b)
    matched = ex | {p for _, p in ne}
    dup = [p for p in rp if any(sim(p, m) for m in truth)]
    fp = [p for p in rp if p not in dup]
    T['t'] += len(truth); T['fn'] += len(rt); T['fp'] += len(fp); T['dup'] += len(dup); T['ne'] += len(ne); T['s'] += 1
    T['pass'] += (not rt and not fp); T['pass_strict'] += (not rt and not fp and not dup)
    print(f"  {sc:10} 정답 {len(truth):3} FN {len(rt):2} FP {len(fp):2} 중복 {len(dup):2} 이름 {len(ne):2}", ('FN:' + str(rt)) if rt else '', ('FP:' + str(fp)) if fp else '', ('중복:' + str(dup)) if dup else '')
print(f"정답 {T['t']} | FN {T['fn']} ({100*T['fn']/max(T['t'],1):.1f}%) | FP {T['fp']} | 중복 {T['dup']} | 이름오류 {T['ne']} | 통과(FN=FP=0) {T['pass']}/{T['s']} | 중복까지 0 {T['pass_strict']}/{T['s']}")
