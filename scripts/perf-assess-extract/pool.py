"""정답 만들기용 후보 묶음: subjlist(A/B/F) ∪ 게이트 단위 과목. 근거별 표시."""
import json, sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import subjlist, gates
from presence import key
schools = json.load(open(sys.argv[1], encoding='utf-8')); d = json.load(open(sys.argv[2], encoding='utf-8')); tabs = sys.argv[3].split(',')
lst = subjlist.build(tabs, schools=set(schools))
units = collections.defaultdict(set)
for u in d['units']:
    if u['school'] in schools and u['subject']: units[u['school']].add(u['subject'])
for sc in schools:
    pool = {}
    for e in lst.get(sc, {}).values(): pool.setdefault(key(e['name']), [e['name'], set()])[1].update(e['how'])
    for s in units[sc]: pool.setdefault(key(s), [s, set()])[1].add('U')
    print(f"## {sc} ({len(pool)})")
    strong = sorted(v[0] for v in pool.values() if 'A' in v[1])
    weak = sorted(f"{v[0]}:{''.join(sorted(v[1]))}" for v in pool.values() if 'A' not in v[1])
    print('  A:', ' / '.join(strong)); print('  기타:', ' / '.join(weak))
