"""과목 누락 측정: 문서에서 '있어야 할 과목' 목록을 만들고 추출 결과와 대조한다. NEIS 없이.

있어야 할 과목(expected) 출처
  - 과목 머리글(문장·표 첫 줄·머리 표 '과목' 칸), 과목별 파일명
  - 목차: 번호가 붙은 줄이 5개 이상 이어지는 목록 ('15. 사회문제 탐구')
추출 상태
  - 자동 확정: 게이트 통과
  - 후보(확인 필요): 평가표는 찾았지만 검증 실패
  - 누락: expected 에 있는데 평가표 단위가 하나도 없음
사용: python presence.py GATES.json TABLES.jsonl [...] -- SRC [SRC ...]
"""
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates  # noqa: E402

ORDER = ['COL', 'ROW', 'HEAD+KV', 'KV', 'SUM']
TOC_LINE = re.compile(r"^\s*\d{1,2}\s*[.)]\s*([가-힣A-Za-zⅠⅡⅢ0-9·ㆍ ()]{2,24}?)\s*$")


def key(s):
    s = re.sub(r"[\x00-\x1f]", "", s or "")
    s = gates.tidy_subject(s) or ""
    return re.sub(r"[\s·ㆍ‧･・()]", "", s).replace("Ⅰ", "1").replace("Ⅱ", "2").replace("Ⅲ", "3")


def build_dictionary(d):
    """과목 사전: 추출 결과에서 2곳 이상 학교에 나온 과목명 + 기본 목록 + 코드 대응표."""
    seen = collections.defaultdict(set)
    for u in d["units"]:
        if u["subject"]:
            seen[key(u["subject"])].add(u["school"])
    dic = {k for k, v in seen.items() if len(v) >= 2}
    dic |= {key(s) for s in gates.SUBJECTS}
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "code_map_base.json")
    if os.path.exists(base):
        dic |= {key(v) for v in json.load(open(base, encoding="utf-8")).values()}
    return {k for k in dic if len(k) >= 2}


def toc_subjects(ctx):
    lines = (ctx or "").split("\n")
    out, run = [], []
    for ln in lines + [""]:
        m = TOC_LINE.match(ln)
        if m:
            run.append(m.group(1))
        else:
            if len(run) >= 5:
                out += run
            run = []
    return out


def main():
    args = sys.argv[1:]
    sep = args.index("--")
    gpath, tables, srcs = args[0], args[1:sep], set(args[sep + 1:])
    d = json.load(open(gpath, encoding="utf-8"))
    dic = build_dictionary(d)

    def in_dic(k):
        return k in dic or bool(gates.SUBJ_RE.fullmatch(k))
    expected = collections.defaultdict(set)  # school -> keys
    srcmap = {}
    noeval = set()
    disp = {}
    for t in tables:
        for line in open(t, encoding="utf-8"):
            r = json.loads(line)
            if r["src"] not in srcs or "grid" not in r:
                continue
            if "성적관리" in re.split(r"[\\/]", r["file"])[-1].replace(" ", ""):
                continue
            sc = r["school"]
            cands = []
            fn = gates.subject_from_filename(r["file"])
            if fn:
                cands.append((fn, "filename"))
            h = gates.subject_from_header_table(r["grid"]) if r["grid"] else None
            if h:
                cands.append((h, "header"))
            if r["grid"] and r["grid"][0]:
                t1 = gates.subject_from_text(" ".join(dict.fromkeys(r["grid"][0])))
                if t1:
                    cands.append((t1, "table_title"))
            tx = gates.subject_from_text(r["ctx"])
            if tx:
                cands.append((tx, "heading"))
            toc = toc_subjects(r["ctx"])
            if toc and sum(in_dic(key(x)) for x in toc) >= 0.5 * len(toc):
                cands += [(x, "toc") for x in toc]  # 줄 절반 이상이 과목 사전에 있는 목차만
            hs = sc.endswith("고등학교")
            flat_all = " ".join(" ".join(x) for x in r["grid"])
            if re.search(r"해당\s*없음|미실시", flat_all) and re.search(r"반영|비율", flat_all):
                for c, how in cands:
                    noeval.add((sc, key(gates.tidy_subject(re.sub(r"[\x00-\x1f]", "", c)) or "")))
            for c, how in cands:
                kk = key(gates.tidy_subject(re.sub(r"[\x00-\x1f]", "", c)) or "")
                if (hs and re.fullmatch(r"(국어|수학|영어|사회|과학|예체능|예술|체육|기술가정|생활교양|교양|외국어|제2외국어)과?", kk)) or kk.endswith("교과") or (len(kk) > 2 and kk.endswith("과") and gates.SUBJ_RE.fullmatch(kk[:-1]) and hs):
                    continue  # 고등학교의 교과군 이름(과학과 등)은 과목이 아님
                srcmap.setdefault((sc, key(gates.tidy_subject(re.sub(r"[\x00-\x1f]", "", c)) or "")), set()).add(how)
                c2 = gates.tidy_subject(re.sub(r"[\x00-\x1f]", "", c))
                if c2 and not gates.bad_subject(c2, sc) and in_dic(key(c2)):
                    expected[sc].add(key(c2))
                    disp.setdefault((sc, key(c2)), c2)
    status = collections.defaultdict(dict)  # school -> key -> 'auto'|'candidate'
    unnamed = collections.Counter()
    for u in d["units"]:
        if u["src"] not in srcs:
            continue
        ok = any(u["tried"][f]["ok"] for f in ORDER)
        if not u["subject"]:
            unnamed[u["school"]] += 1
            continue
        k = key(u["subject"])
        cur = status[u["school"]].get(k)
        status[u["school"]][k] = "auto" if (ok or cur == "auto") else "candidate"
    rows = []
    for sc in sorted(set(expected) | set(status)):
        exp = expected[sc] | set(status[sc])
        auto = sum(1 for k in exp if status[sc].get(k) == "auto")
        cand = sum(1 for k in exp if status[sc].get(k) == "candidate")
        miss = [disp.get((sc, k), k) for k in exp if k not in status[sc] and (sc, k) not in noeval]
        noev_n = sum(1 for k in exp if k not in status[sc] and (sc, k) in noeval)
        n_eff = len(exp) - noev_n
        rows.append((sc, n_eff, auto, cand, miss, unnamed[sc]))
    tot = sum(r[1] for r in rows); A = sum(r[2] for r in rows); C = sum(r[3] for r in rows)
    print(f"schools {len(rows)} | expected subjects {tot} | auto {A} ({100*A/max(tot,1):.1f}%) | candidate {C} ({100*C/max(tot,1):.1f}%)"
          f" | missing {tot-A-C} ({100*(tot-A-C)/max(tot,1):.1f}%) | unnamed units {sum(unnamed.values())}")
    pres = [(r[2] + r[3]) / r[1] for r in rows if r[1]]
    autoq = [r[2] / r[1] for r in rows if r[1]]
    for th in (0.95, 0.9):
        print(f"  schools with presence>={th:.0%}: {sum(p >= th for p in pres)}/{len(pres)} | auto>={th:.0%}: {sum(a >= th for a in autoq)}/{len(autoq)}")
    msrc = collections.Counter()
    for r in rows:
        for m in r[4]:
            msrc["+".join(sorted(srcmap.get((r[0], key(m)), {"?"})))] += 1
    print("missing by source:", msrc.most_common())
    json.dump([{"school": r[0], "expected": r[1], "auto": r[2], "candidate": r[3], "missing": r[4], "unnamed": r[5]} for r in rows],
              open(gpath.replace(".json", "_presence.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    worst = sorted(rows, key=lambda r: (r[2] + r[3]) / max(r[1], 1))[:10]
    for r in worst:
        print(f"  {r[0]:14} expected {r[1]:3} auto {r[2]:3} cand {r[3]:3} missing {len(r[4]):3} unnamed {r[5]:3} e.g. {r[4][:4]}")


if __name__ == "__main__":
    main()
