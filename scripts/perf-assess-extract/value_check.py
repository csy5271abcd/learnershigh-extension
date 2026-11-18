"""자동으로 채운 비율·수행 항목이 원문 평가표와 맞는지 표본 검사.

과목마다: 원문 파일의 표들 중 항목 이름이 가장 많이 들어 있는 표를 찾고,
  - 항목 이름 칸과 같은 행 또는 같은 열에 추출한 항목 비율 숫자가 있는지
  - 표(또는 표 바로 앞 글자)에 수행 총비율 숫자가 있는지
를 본다. 모두 맞으면 PASS, 아니면 사람이 원문을 보고 판정한다(REVIEW).

사용: python value_check.py RESULT_DIR N [SEED]
출력: RESULT_DIR/value_sample.json (표본과 자동 판정)
"""
import glob
import json
import os
import random
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dump_tables  # noqa: E402

d, N = sys.argv[1], int(sys.argv[2])
random.seed(int(sys.argv[3]) if len(sys.argv) > 3 else 7)
ns = lambda s: re.sub(r"[\s·ㆍ.,()\[\]\-_~:]", "", s or "")
num = lambda x: (f"{x:g}" if isinstance(x, (int, float)) else str(x))

pool = []
for f in sorted(glob.glob(os.path.join(d, "*.result.json"))):
    r = json.load(open(f, encoding="utf-8"))
    subs = [s for s in r["subjects"] if s.get("evaluation") and not s["evaluation"]["check"] and s["evaluation"]["items"]]
    random.shuffle(subs)
    pool += [(r["school"], s) for s in subs[:8]]   # 학교당 최대 8과목
random.shuffle(pool)
sample = pool[:N]

grids_cache = {}


def grids(school, fname):
    k = (school, fname)
    if k not in grids_cache:
        paths = [p for p in glob.glob(os.path.join(d, school, "**", "*"), recursive=True) if os.path.basename(p) == fname]
        out = []
        if paths:
            root = os.path.join(d)
            for row in dump_tables.work((root, paths[0])):
                if "grid" in row:
                    out.append((row.get("page"), row.get("ctx") or "", row["grid"]))
        grids_cache[k] = out
    return grids_cache[k]


def check(school, s):
    ev = s["evaluation"]
    fname, _, page = ev["source"].partition(" p.")
    page = int(re.match(r"\d+", page).group()) if re.match(r"\d+", page) else None
    cands = [(p, c, g) for p, c, g in grids(school, fname) if page is None or p in (page, page - 1, page + 1)]
    best, hit = None, -1
    for p, c, g in cands:
        flat = [ns(x) for row in g for x in row]
        h = sum(1 for it in ev["items"] if ns(it["name"])[:6] and any(ns(it["name"])[:6] in x for x in flat))
        if h > hit:
            best, hit = (p, c, g), h
    if not best or hit == 0:
        return "REVIEW", "원문 표에서 항목 이름을 못 찾음"
    _, ctx, g = best
    probs = []
    for it in ev["items"]:
        key = ns(it["name"])[:6]
        cells = [(i, j) for i, row in enumerate(g) for j, x in enumerate(row) if key and key in ns(x)]
        w = num(it["weightPercent"])
        ok = False
        for i, j in cells:
            line = [g[i][jj] for jj in range(len(g[i]))] + [g[ii][j] for ii in range(len(g)) if j < len(g[ii])]
            if any(re.search(rf"(?<![\d.]){re.escape(w)}(?![\d])", x) for x in line):
                ok = True; break
        if not ok:
            probs.append(f"{it['name'][:15]} {w}%")
    t = num(ev["performancePercent"])
    flat = " ".join(" ".join(r) for r in g) + " " + ctx[-300:]
    if not re.search(rf"(?<![\d.]){re.escape(t)}(?![\d])", flat):
        probs.append(f"수행 총비율 {t}%")
    return ("PASS", "") if not probs else ("REVIEW", "; ".join(probs))


rows = []
for school, s in sample:
    v, why = check(school, s)
    rows.append({"school": school, "subject": s["name"], "evaluation": s["evaluation"], "auto": v, "why": why})
json.dump(rows, open(os.path.join(d, "value_sample.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
n_items = sum(len(r["evaluation"]["items"]) for r in rows)
print(f"표본 {len(rows)}과목 (항목 {n_items}개) | 자동 PASS {sum(r['auto'] == 'PASS' for r in rows)} | REVIEW {sum(r['auto'] == 'REVIEW' for r in rows)}")
for r in rows:
    if r["auto"] == "REVIEW":
        print(f"  REVIEW {r['school'][:6]} {r['subject']}: {r['why']}")
