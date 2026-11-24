# 평가계획서 추출 벤치마크 채점기. 사용: python bench.py <batch 1123|1124|all> <pred.jsonl> [pred2.jsonl ...]
# 정답: truth.jsonl (판정 20곳, 1,212과목). 예측 줄: {"file","subject","exam","perf","items":[{"name","w"}],"check":[...]}
# 학교 정답률 = 맞은 과목 / (정답 과목 + 정답에 없는 예측 과목). RULES.md 와 같은 분모.
import json, re, sys, collections, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROMAN = str.maketrans({'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5'})


TYPE_SUFFIX = re.compile(r'\s*[(（]\s*(서\s*[·・ㆍ‧]?\s*논술형?|논술형|서술형|서답형)\s*(평가)?\s*[)）]\s*$')


def norm(s):
    # 과제 이름 끝의 평가 유형 괄호('(서논술형)')는 같은 원문 안에서도 표마다 붙거나 빠진다 → 비교에서 뺀다 (보고서에 적음)
    s = TYPE_SUFFIX.sub('', (s or '').strip()).translate(ROMAN)
    return re.sub(r'[\s·ㆍ・‧･.,()\[\]<>「」『』"\'~\-_/]', '', s)


def name_eq(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return False
    if a == b:
        return True
    short, long_ = sorted((a, b), key=len)
    return short in long_ and len(short) >= 0.8 * len(long_)


def eq(a, b):
    return a is not None and b is not None and abs(float(a) - float(b)) <= 0.6


def correct(t, p):
    if t.get('passFail') or t.get('noTask'):
        if p['items']:
            return False
        return (eq(t.get('exam'), p['exam']) or t.get('exam') in (None, 0)) and (eq(t.get('perf'), p['perf']) or t.get('passFail'))
    if not (eq(t['exam'], p['exam']) and eq(t['perf'], p['perf'])):
        return False
    tt, pp = list(t['tasks']), list(p['items'])
    if len(tt) != len(pp):
        return False
    used = set()
    for x in tt:
        hit = next((i for i, y in enumerate(pp) if i not in used and eq(x['w'], y['w']) and name_eq(x['name'], y['name'])), None)
        if hit is None:
            return False
        used.add(hit)
    return True


def load_truth(batch):
    T = [json.loads(l) for l in open(os.path.join(HERE, 'truth.jsonl'), encoding='utf-8')]
    return [t for t in T if (batch == 'all' or t['batch'] == batch) and not t.get('unresolved')]


def score(truth, preds):
    by_school = collections.defaultdict(list)
    for t in truth:
        by_school[(t['batch'], t['filePrefix'][:2], t['school'])].append(t)
    pred_by = collections.defaultdict(list)
    for p in preds:
        p.setdefault('items', [])
        p['items'] = [{'name': i.get('name'), 'w': i.get('w')} for i in p['items']]
        pred_by[p['file'][:2]].append(p)
    res = {}
    cat = collections.Counter(); cat_ok = collections.Counter()
    silent = 0; auto = 0
    for key, ts in sorted(by_school.items()):
        ps = pred_by.get(key[1], [])
        used = set(); ok = 0
        for t in ts:
            cands = [i for i, p in enumerate(ps) if i not in used and name_eq(t['subject'], p['subject'])]
            best = next((i for i in cands if correct(t, ps[i])), cands[0] if cands else None)
            good = best is not None and correct(t, ps[best])
            if best is not None:
                used.add(best)
            ok += good
            c = t.get('category') or '기타'
            cat[c] += 1; cat_ok[c] += good
            ps_best = ps[best] if best is not None else None
            if ps_best is not None and not ps_best.get('check'):
                auto += 1
                silent += not good
        # 이름을 못 맞힌 예측(과목명 미확인·교과 이름 등)은 비율이 같은 남은 정답 과목 하나에 붙여 한 번만 센다 (판정 규칙과 같게)
        for t in ts:
            if any(name_eq(t['subject'], ps[i]['subject']) for i in used):
                continue
            if any(name_eq(t['subject'], p['subject']) for p in ps):
                continue
            hit = next((i for i, p in enumerate(ps) if i not in used and not any(name_eq(x['subject'], p['subject']) for x in ts)
                        and eq(t.get('exam'), p.get('exam')) and eq(t.get('perf'), p.get('perf'))), None)
            if hit is not None:
                used.add(hit)
        extra = [p for i, p in enumerate(ps) if i not in used]
        silent += sum(1 for p in extra if not p.get('check')); auto += sum(1 for p in extra if not p.get('check'))
        den = len(ts) + len(extra)
        res[key] = (ok, den, len(extra))
    return res, cat, cat_ok, silent, auto


def main():
    batch = sys.argv[1]
    preds = []
    for f in sys.argv[2:]:
        preds += [json.loads(l) for l in open(f, encoding='utf-8')]
    res, cat, cat_ok, silent, auto = score(load_truth(batch), preds)
    passed = 0; tot_ok = tot = 0
    for (b, pre, name), (ok, den, extra) in res.items():
        r = ok / den if den else 0
        passed += r >= 0.8; tot_ok += ok; tot += den
        print(f'{b} {pre} {name:<20} {ok:>4}/{den:<4} {r*100:5.1f}%  (정답에 없는 예측 {extra})')
    print(f'80% 이상 학교: {passed}/{len(res)}   전체 과목: {tot_ok}/{tot} = {tot_ok/tot*100:.1f}%')
    core = ['국어', '수학', '영어', '사회', '과학']
    for c in core + ['기타']:
        if cat[c]:
            print(f'  {c}: {cat_ok[c]}/{cat[c]} = {cat_ok[c]/cat[c]*100:.1f}%')
    co = sum(cat_ok[c] for c in core); ca = sum(cat[c] for c in core)
    print(f'  국수영사과: {co}/{ca} = {co/ca*100:.1f}%')
    print(f'자동 확정 {auto}개 중 틀림 {silent}개')


if __name__ == '__main__':
    main()


def diff(batch, prefix, preds, limit=12):
    """한 학교의 틀린 과목: 정답과 예측을 나란히."""
    ts = [t for t in load_truth(batch) if t['filePrefix'][:2] == prefix]
    ps = [p for p in preds if p['file'][:2] == prefix]
    shown = 0
    for t in ts:
        cands = [p for p in ps if name_eq(t['subject'], p['subject'])]
        if any(correct(t, p) for p in cands):
            continue
        p = cands[0] if cands else None
        fmt = lambda e, f, it: f"{e}/{f} " + '·'.join(f"{x['name']}{x['w']}" for x in it)
        print('T', t['subject'], fmt(t['exam'], t['perf'], t['tasks'])[:160])
        print('P', (p['subject'] + ' ' + fmt(p['exam'], p['perf'], p['items']) + ' ' + str(p.get('check')))[:160] if p else '-- 없음')
        shown += 1
        if shown >= limit:
            break
