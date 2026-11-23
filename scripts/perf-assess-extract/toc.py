"""학교별 목차 글자 뽑기 (정답 검토용). PDF: 앞 6쪽에서 '목 차/차 례' 또는 점선 줄이 많은 쪽. HWP/HWPX: 표 앞 글자 중 목차 신호."""
import json, re, sys, glob, os
import pymupdf
root, schools, tables = sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8')), sys.argv[3].split(',')
SIG = re.compile(r"목\s*차|차\s*례|과목별 교수학습 및 평가계획|[·\.]{8,}")
ctx = {}
for t in tables:
    for line in open(t, encoding='utf-8'):
        r = json.loads(line)
        if r['school'] in schools and r.get('ctx'):
            ctx.setdefault((r['school'], os.path.basename(r['file'].replace(chr(92), '/'))), []).append(r['ctx'])
for sc in schools:
    print('########', sc)
    for f in sorted(glob.glob(os.path.join(root, sc, '**', '*'), recursive=True)):
        n = os.path.basename(f)
        if os.path.isdir(f) or '성적관리' in n.replace(' ', '') or n.endswith('.zip'): continue
        if f.lower().endswith('.pdf'):
            try: pages = [re.sub(r"\s+", " ", p.get_text()) for i, p in enumerate(pymupdf.open(f)) if i < 6]
            except Exception: continue
        else:
            pages = [re.sub(r"\s+", " ", c) for c in ctx.get((sc, n), [])[:40]]
        best = max(pages, key=lambda p: len(re.findall(r"[·\.]{6,}", p)) + 20 * bool(re.search(r"목\s*차|차\s*례|과목별 교수학습 및 평가계획", p)), default='')
        if SIG.search(best):
            best = re.sub(r"[·\.…]{3,}", "…", best)
            m = re.search(r"목\s*차|차\s*례|과목별 교수학습 및 평가계획", best)
            print('  ##', n[-45:], '::', best[(m.start() if m else 0):][:900])
        else:
            print('  ##', n[-45:], ':: (목차 없음)')
