"""수행평가 세부 표(과제 머리·성취수준·채점 기준·기본 점수·유의사항)를 공통 JSON 으로 바꾼다.

공통 형식 (수행 항목 하나):
{
  "task": {"name", "maxScore", "timing", "method": [..], "description", "elements"},
  "achievement": [{"standard", "levels": [{"level", "description"}]}],
  "rubric": [{"element", "maxScore", "kind": "levels"|"sum",
              "levels": [{"level", "score", "scoreTo", "description"}]}],
  "baseScore": [{"score", "condition"}],
  "notes": [..],
  "check": [..],              # 검증 사유 (요소 만점 합 ≠ 과제 만점 등)
  "sourceTables": [[[칸]]]    # 원문 표 (형식으로 못 옮긴 내용도 그대로 보여 줄 수 있게)
}
110개 학교 세부 표 조사(2026-11-18)에서 나온 블록: 성취수준 108곳, 과제 머리 103곳, 채점 기준 97곳, 기본 점수 86곳, 유의사항 72곳.
"""
import re

ns = lambda s: re.sub(r"[\s·ㆍ‧･・()（）\[\]:]", "", s or "")  # noqa: E731
sp = lambda s: re.sub(r"\s+", " ", s or "").strip()  # noqa: E731

SCORE = re.compile(r"(?<![\d.])(\d{1,3}(?:\.\d+)?)\s*(?:[~∼\-–]\s*(\d{1,3}(?:\.\d+)?))?\s*점")
NUM_ONLY = re.compile(r"^\s*(\d{1,3}(?:\.\d+)?)\s*(?:[~∼\-–]\s*(\d{1,3}(?:\.\d+)?))?\s*점?\s*(이하|이상|미만)?\s*$")
LEVEL = re.compile(r"^\s*(A|B|C|D|E|F|상|중상|중|중하|하|매우\s*우수|우수|보통|미흡|미도달|[1-5]\s*수준)\s*(?:[(（].*)?$")
CODE = re.compile(r"\[\s*\d{1,2}\s*[가-힣A-Za-zⅠⅡ\s]{1,10}\d*\s*-?\s*\d{1,2}\s*-\s*\d{1,2}\s*\]|\[\s*[가-힣]{1,6}\s*\d{2}\s*-\s*\d{2}\s*\]")
CHECKED = re.compile(r"[■☑▣◼√✔]\s*([^□■☑▣◼◻☐√✔]+)")

L_TASK = re.compile(r"^(평가)?영역명?(만점)?$|^평가영역명|^NEIS수행평가영역명|^평가과제|^과제명|^평가명$|^수행평가명")
L_MAX = re.compile(r"^(영역)?만점$|^배점만점$|^총점$|^영역만점")
L_DESC = re.compile(r"^수행과제|^과제내용|^평가내용$|^내용$|^평가과제내용")
L_TIME = re.compile(r"^평가시기|^시기$|^실시시기")
L_METHOD = re.compile(r"^평가방법|^평가유형$")
L_ELEMS = re.compile(r"^평가요소$")
L_STD = re.compile(r"^(교육과정)?성취기준|^성취기준및평가기준")
L_NOTE = re.compile(r"유의사항|미응시|결시|처리기준|기타사항|학생안내")
H_ELEM = re.compile(r"^(채점|평가)?요소\d*|^채점영역|^평가영역$|^세부요소|^평가항목")
H_DESC = re.compile(r"^채점기준|^평가기준|^기대수행|^수행수준|^수행특성|^세부기준|^성취수준별|^채점내용|^기준$")
H_SCORE = re.compile(r"^배점|^점수|^부여점수|^득점|^세부점수|^환산점")
H_LEVEL = re.compile(r"^등급|^수준$|^척도$|^성취수준$|^평가등급|^부여등급")


def num(s):
    m = re.search(r"(\d{1,3}(?:\.\d+)?)", s or "")
    return float(m.group(1)) if m else None


def score_of(s):
    """칸 글자에서 점수(또는 점수 범위). '25점', '25', '24~25점', 'A (40점)', '15점 이하' → (점수, 끝점수)"""
    t = sp(s)
    m = re.match(r"^(\d{1,3}(?:\.\d+)?)\s*점?\s*[(（]\s*(?:[A-E][+\-]?|상|중|하)\s*[)）]$", t)   # '40(A+)'
    if m:
        return float(m.group(1)), None
    m = NUM_ONLY.match(t)
    if m:
        return float(m.group(1)), (float(m.group(2)) if m.group(2) else None)
    m = SCORE.search(t)
    if m and len(t) <= 25:
        return float(m.group(1)), (float(m.group(2)) if m.group(2) else None)
    return None


def dedupe_row(row):
    out = []
    for x in row:
        if not out or x != out[-1]:
            out.append(x)
    return out


def text_of(grid):
    return " ".join(" ".join(r) for r in grid)


def checked_list(cells):
    t = " ".join(cells)
    items = [sp(m.group(1)) for m in CHECKED.finditer(t)]
    if items:
        return [x for x in dict.fromkeys(items) if x]
    if re.search(r"[□☐◻]", t):
        return []
    return [x for x in dict.fromkeys(sp(c) for c in cells) if x]


# ---------- 채점 기준 ----------
def rubric(grid):
    """채점 기준 표 → [{element, maxScore, kind, levels}]. 못 읽으면 []."""
    g = [[sp(x) for x in r] for r in grid]
    if not g:
        return []
    W = max(len(r) for r in g)
    g = [r + [""] * (W - len(r)) for r in g]
    # 머리 행: 요소 열과 (기준 또는 점수) 열이 있는 행
    hi = None
    for i, r in enumerate(g):   # 성취수준 행이 길어 채점표 머리가 아래에 있는 표가 많다: 표 전체에서 찾는다
        n = [ns(x) for x in r]
        if any(H_ELEM.search(x) for x in n) and any(H_DESC.search(x) or H_SCORE.search(x) for x in n):
            hi = i
            break
    if hi is None:
        for i, r in enumerate(g):  # '등급 | 채점 기준 | 배점' 처럼 요소 열 없이
            n = [ns(x) for x in r]
            if any(H_DESC.search(x) for x in n) and any(H_SCORE.search(x) or H_LEVEL.search(x) for x in n):
                hi = i
                break
    if hi is None:
        for i, r in enumerate(g[:4]):
            n = [ns(x) for x in r]
            if any(re.match(r"^(평가과제|평가영역|채점영역|영역)(배점|만점)?$", x) for x in n):
                hi = i
                break
    if hi is None:
        return []
    head = [ns(x) for x in g[hi]]
    if not any(H_ELEM.search(x) for x in head) and re.match(r"^(평가과제|평가영역|채점영역|영역)", head[0] or ""):
        head[0] = "요소"
    ecol = next((c for c, x in enumerate(head) if H_ELEM.search(x)), None)
    dcols = [c for c, x in enumerate(head) if H_DESC.search(x)]
    scols = [c for c, x in enumerate(head) if H_SCORE.search(x)]
    scol = scols[0] if scols else None
    lcol = next((c for c, x in enumerate(head) if H_LEVEL.search(x)), None)
    title = ""
    body = g[hi + 1:]
    if ecol is not None and ecol > 0:
        left = [r[0] for r in body if r[0]]
        if left and sum(1 for x in left if re.search(r"[(（]\s*\d{1,3}\s*점?\s*[)）]", x)) >= max(1, len(set(left)) // 2):
            dcols = sorted(set(dcols) | {ecol})   # 원래 '채점 요소' 열은 설명으로
            ecol = 0
    head_labels = {ns(x) for x in g[hi]}

    # 가로형: 머리 아래 행에 점수 칸이 3개 이상 나란한 행('A (40점) | B (38점) …', '10점 | 9점 | 8점')
    out = []
    i = hi + 1
    horizontal = False
    while i < len(g):
        r = g[i]
        sc = [(c, score_of(x)) for c, x in enumerate(r) if score_of(x) and (ecol is None or c != ecol)]
        lv_cells = [(c, LEVEL.match(x)) for c, x in enumerate(r) if LEVEL.match(x or "")]
        # 병합 칸 복제('40 | 40(A+) | 40(A+)')를 가로형으로 잘못 보지 않게: 서로 다른 점수 값이 3개 이상, 설명 칸은 없음
        if len({v[0] for _, v in sc}) >= 3 and not any(len(x) > 20 for x in r):
            horizontal = True
            cols = [c for c, _ in sc]
            # 같은 열의 아래 행들이 설명, 요소는 점수 칸 왼쪽 칸
            j = i + 1
            while j < len(g) and not sum(1 for x in g[j] if score_of(x)) >= 3:
                rr = g[j]
                left = [x for c, x in enumerate(rr) if c < cols[0] and x]
                elem = left[-1] if left else (sp(r[cols[0] - 1]) if cols[0] > 0 else "")
                levels = []
                for c, (s, s2) in sc:
                    lab = LEVEL.match(r[c])
                    levels.append({"level": lab.group(1) if lab else None, "score": s, "scoreTo": s2, "description": rr[c]})
                if any(lv["description"] for lv in levels):
                    out.append(_elem(elem, levels))
                j += 1
            # 머리 행 자체가 등급(A(40점)…)이고 아래가 요소 행인 표
            i = j
            continue
        if len(lv_cells) >= 3 and not sc:
            pass
        i += 1
    if horizontal:
        return [e for e in out if e]

    # 세로형: 한 행 = 요소 하나의 수준 하나. 열 역할을 내용으로 정한다
    #   점수 열: 머리 '배점' 또는 점수 칸이 가장 많은 열 / 설명 열: 점수 아닌 열 중 글이 가장 긴 열
    #   요소 열: 설명 열 왼쪽 열들(병합으로 빈 칸은 위 값을 이어 받음) — 큰 요소·세부 요소가 둘 다 있으면 '큰 › 세부'
    body = [r for r in g[hi + 1:] if any(r)]
    cut = next((k for k, r in enumerate(body) if any(L_NOTE.search(ns(x)) for x in r[:2])
                or any(re.fullmatch(r"(합계|총점|계|소계)", ns(x)) for x in r[:2])), len(body))
    body = body[:cut]
    if not body:
        return []
    cnt = lambda c, f: sum(1 for r in body if c < len(r) and f(r[c]))  # noqa: E731
    if len(scols) > 1:   # '배점 | 점수' 둘 다: 값이 바뀌는 열이 수준 점수, 늘 같은 열은 요소 만점
        scol = max(scols, key=lambda c: (len({r[c] for r in body if score_of(r[c])}), cnt(c, score_of)))
    if scol is None or cnt(scol, score_of) == 0:
        cand = [(cnt(c, lambda x: bool(NUM_ONLY.match(x or "")) or bool(score_of(x) and len(x) <= 12)), c) for c in range(W)]
        cand = [(n, c) for n, c in cand if n > 0 and c != lcol]
        scol = max(cand)[1] if cand else None
    if lcol is None:
        lv_c = [(cnt(c, lambda x: bool(LEVEL.match(x or "") and len(x) <= 12)), c) for c in range(W) if c != scol]
        lv_c = [(n, c) for n, c in lv_c if n >= 2]
        lcol = max(lv_c)[1] if lv_c else None
    avg = {c: sum(len(r[c]) for r in body if not score_of(r[c]) or len(r[c]) > 12) / max(1, len(body))
           for c in range(W) if c not in (scol, lcol)}
    dcol = max(avg, key=avg.get) if avg else None
    if ecol is not None and dcol == ecol and len(avg) > 1:
        avg.pop(ecol)
        dcol = max(avg, key=avg.get)
    keycols = [c for c in range(W) if dcol is not None and c < dcol and c not in (scol, lcol) and c not in scols
               and any(r[c] for r in body) and ns(g[hi][c]) not in ("채점기준", "평가기준")]
    # 표 왼쪽 끝의 '채점 기준' 같은 세로 라벨 열은 요소가 아님
    keycols = [c for c in keycols if len({r[c] for r in body if r[c]}) > 1 or c == ecol]

    def numeric_col(c):   # 숫자만 있는 열(점수)은 요소 열이 아니다
        vals = [r[c] for r in body if r[c]]
        return vals and sum(1 for x in vals if NUM_ONLY.match(x)) >= 0.6 * len(vals)
    def desc_copy(c):   # 설명 칸이 병합돼 왼쪽 열에도 복제된 열은 요소 열이 아니다
        both = [r for r in body if r[c] and dcol is not None and r[dcol]]
        return both and sum(1 for r in both if r[c] == r[dcol]) >= 0.3 * len(both)
    keycols = [c for c in keycols if not desc_copy(c)]
    numcols = [c for c in keycols if numeric_col(c)]
    keycols = [c for c in keycols if c not in numcols]
    if numcols and (scol is None or cnt(scol, lambda x: bool(NUM_ONLY.match(x or ""))) < cnt(numcols[-1], lambda x: bool(NUM_ONLY.match(x or "")))):
        scol = numcols[-1]
    carry = {c: "" for c in keycols}
    rows, base = [], []
    for r in body:
        for c in keycols:
            if r[c]:
                carry[c] = r[c]
                for c2 in keycols:   # 큰 요소가 바뀌면 그 오른쪽 세부 요소는 새로 시작
                    if c2 > c and not r[c2]:
                        carry[c2] = ""
        s = score_of(r[scol]) if scol is not None else None
        desc = r[dcol] if dcol is not None else ""
        if dcol is not None and ns(desc) in head_labels:
            desc = ""
        lab = LEVEL.match(r[lcol]).group(1) if lcol is not None and LEVEL.match(r[lcol] or "") else None
        if lab is None and scol is not None:
            m2 = re.search(r"[(（]\s*([A-E][+\-]?|상|중|하)\s*[)）]", r[scol] or "")
            lab = m2.group(1) if m2 else None
        if lab is None and s is None:
            m = next((LEVEL.match(x) for x in r if LEVEL.match(x or "") and len(x) <= 12), None)
            lab = m.group(1) if m else None
            if m and s is None:
                s = score_of(next(x for x in r if LEVEL.match(x or "") and len(x) <= 12))
        key = [carry[c] for c in keycols if carry[c]]
        whole = " ".join(key + [desc])
        if key and re.search(r"^(평가)?(시기|방법|유형|요소|기준|내용|과제|영역명?)$|^성취기준|^반영비율|^만점|^교육과정|^평가유의|^유의사항",
                             ns(key[0])):
            continue   # '평가 시기 | 9월 | 만점 | 50점' 같은 라벨 행
        own = " ".join(r[c] for c in keycols if r[c]) or desc   # 이 행에 적힌 글자만 (위에서 이어받은 요소 이름 말고)
        if re.search(r"기본\s*점수|백지|미제출|미참여|미응시|불성실|결석|결시|미인정", own) and s is not None:
            base.append({"score": s[0], "condition": sp(" ".join(key + [desc]))[:80]})
            continue
        if s is None and not lab and not desc:
            continue
        if re.search(r"기본\s*점수", whole) and not lab:
            lab = "기본"
        rows.append((" › ".join(dict.fromkeys(key)), lab, s, desc))
    groups = []
    for e, lab, s, d in rows:
        if not groups or groups[-1][0] != e:
            groups.append((e, []))
        groups[-1][1].append({"level": lab, "score": s[0] if s else None, "scoreTo": s[1] if s else None, "description": d})
    out = [x for x in (_elem(e, lv) for e, lv in groups) if x]
    if base and out:
        out[0].setdefault("_base", []).extend(base)
    return out


def _elem(name, levels):
    levels = [lv for lv in levels if lv["score"] is not None or lv["level"] or lv["description"]]
    if not levels or not any(lv["score"] is not None for lv in levels) and not re.search(r"[(（]\s*\d", name or ""):
        return None
    name = sp(name)
    last = name.split(" › ")[-1]   # '큰 요소 (20) › 세부 요소': 만점은 세부 요소 것만
    m = re.search(r"[(（]\s*(\d{1,3}(?:\.\d+)?)\s*점?\s*[)）]", last)
    mx = float(m.group(1)) if m else None
    clean = sp(re.sub(r"[(（]\s*\d{1,3}(?:\.\d+)?\s*점?\s*[)）]", "", name))
    # 한 칸에 '25점: … 20점: …' 처럼 수준이 이어 적힌 경우 나눈다
    split, note = [], None
    for lv in levels:
        parts = re.split(r"(?=(?<![\d.])\d{1,3}\s*점\s*[:：])", lv["description"] or "")
        parts = [p.strip(" /") for p in parts if p.strip(" /")]
        scored = [p for p in parts if re.match(r"\d{1,3}\s*점\s*[:：]", p)]
        if len(scored) >= 2:
            pre = [p for p in parts if p not in scored]
            if pre:
                note = " ".join(pre)   # 점수 앞의 공통 설명(채점 요소 목록 등)은 요소 설명으로
            for p in scored:
                sc = float(re.match(r"(\d{1,3})", p).group(1))
                split.append({"level": None, "score": sc, "scoreTo": None, "description": re.sub(r"^\d{1,3}\s*점\s*[:：]\s*", "", p)})
        else:
            split.append(lv)
    levels = split
    labeled = [lv for lv in levels if lv["level"] and lv["level"] != "기본"]
    if len(labeled) >= 2 and len({lv["score"] for lv in labeled}) == 1:
        mx = mx or labeled[0]["score"]
        for lv in labeled:
            lv["score"] = None     # '상·중·하 | 배점 10점': 배점은 요소 만점이지 수준 점수가 아님
    levels = [lv for lv in levels if lv["score"] is not None or lv["level"] or lv["description"]]
    scores = [lv["scoreTo"] or lv["score"] for lv in levels if lv["score"] is not None]
    kind = "levels"
    if scores:
        top, total = max(scores), sum(lv["score"] for lv in levels if lv["score"] is not None)
        if mx is None:
            mx = top
        if len(scores) > 1 and abs(total - mx) <= 0.01 and top < mx:
            kind = "sum"   # 부분 점수를 더하는 채점 (5+5+5=15)
    out = {"element": clean, "maxScore": mx, "kind": kind, "levels": levels}
    if note:
        out["description"] = note
    return out


# ---------- 표 하나 → 블록 ----------
def blocks(grid, ctx=""):
    g = [[sp(x) for x in r] for r in grid if any(sp(x) for x in r)]
    out = {"task": {}, "achievement": [], "rubric": [], "baseScore": [], "notes": []}
    if not g:
        return out
    flat = text_of(g) + " " + (ctx or "")
    # 기본 점수 ('기본 점수(40점)', '기본점수 5점 부여')
    for m in re.finditer(r"기본\s*점수\s*[(（]?\s*(\d{1,3})\s*점", flat):
        cond = sp(flat[max(0, m.start() - 60):m.start()])
        cond = re.split(r"[-–▪•※①-⑩]|\.\s", cond)[-1].strip() if cond else ""
        out["baseScore"].append({"score": float(m.group(1)), "condition": cond[-60:] or None})
    rb = rubric(g)
    if rb:
        for e in rb:
            out["baseScore"] += e.pop("_base", [])
        out["rubric"] = rb
    # 라벨-값 행 (첫 칸이 라벨)
    for r in g:
        cells = [x for x in dedupe_row(r) if x]
        lab = ns(cells[0]) if cells else ""
        vals = [x for x in cells[1:] if x]
        if not lab or not vals or len(lab) > 16:
            continue
        # 한 행에 '평가 영역명 | X | 영역 만점 | 20점' 처럼 여러 쌍
        pairs = [(ns(cells[k]), cells[k + 1]) for k in range(0, len(cells) - 1, 2)] if len(cells) >= 4 else [(lab, " ".join(vals))]
        for pl, pv in pairs:
            if L_TASK.search(pl) and not L_MAX.search(pl):
                out["task"].setdefault("name", sp(re.sub(r"[(（]\s*\d{1,3}(?:\.\d+)?\s*%\s*[)）]\s*$", "", pv)))
            elif "기본점수" in pl and num(pv) is not None:
                out["baseScore"].append({"score": num(pv), "condition": None})
            elif L_MAX.search(pl) and num(pv) is not None:
                out["task"].setdefault("maxScore", num(pv))
            elif L_DESC.search(pl):
                out["task"].setdefault("description", sp(pv))
            elif L_TIME.search(pl):
                out["task"].setdefault("timing", sp(pv))
            elif L_METHOD.search(pl):
                ms = checked_list(vals)
                if ms:
                    out["task"].setdefault("method", ms)
            elif L_ELEMS.search(pl) and not rb:
                out["task"].setdefault("elements", sp(pv))
            elif L_NOTE.search(pl):
                out["notes"].append(sp(" ".join(vals)))
    # 성취수준: [코드] 성취기준 → 수준별 설명
    cur = None
    for r in g:
        cells = dedupe_row(r)
        code_cell = next((x for x in cells if CODE.search(x)), None)
        if code_cell and len(code_cell) > 8:
            cur = {"standard": code_cell, "levels": []}
            out["achievement"].append(cur)
        lv = next(((k, LEVEL.match(x)) for k, x in enumerate(cells) if LEVEL.match(x or "") and len(x) <= 8), None)
        if lv and cur is not None:
            k, m = lv
            desc = " ".join(x for x in cells[k + 1:] if x and not LEVEL.match(x))
            if desc and not score_of(desc):
                cur["levels"].append({"level": m.group(1), "description": desc})
    out["achievement"] = [a for a in out["achievement"] if a["levels"]]
    seen_b, bs = set(), []
    for b in out["baseScore"]:   # 같은 기본 점수가 표·문맥에서 여러 번 읽힌 것은 하나로
        k = (b["score"], (b.get("condition") or "")[:20])
        if k not in seen_b:
            seen_b.add(k); bs.append(b)
    out["baseScore"] = bs
    return out


def merge(dst, src):
    for k, v in src["task"].items():
        dst["task"].setdefault(k, v)
    for k in ("achievement", "baseScore", "notes"):
        for x in src[k]:
            if x not in dst[k]:
                dst[k].append(x)
    sig = lambda e: (ns(e["element"]), tuple(lv["score"] for lv in e["levels"]))  # noqa: E731
    have = {sig(e) for e in dst["rubric"]}
    for e in src["rubric"]:   # 같은 채점표가 두 번 읽혀도(쪽 나뉨·열 자르기) 한 번만
        if sig(e) not in have:
            dst["rubric"].append(e)
            have.add(sig(e))


def detail_for(tables):
    """한 수행 항목에 붙은 표들([{grid, ctx}]) → 공통 JSON."""
    d = {"task": {}, "achievement": [], "rubric": [], "baseScore": [], "notes": [], "check": [], "sourceTables": []}
    per = []
    for t in tables:
        b = blocks(t["grid"], t.get("ctx") or "")
        per.append(b["rubric"])
        merge(d, b)
        d["sourceTables"].append([[sp(x) for x in r] for r in t["grid"]])
        d.setdefault("sourceRefs", []).append({"page": t.get("page"), "ti": t.get("ti"), "hasRubric": bool(b["rubric"])})
    mx = d["task"].get("maxScore")
    tot_of = lambda rb: sum(e["maxScore"] or 0 for e in rb)  # noqa: E731
    if mx and d["rubric"] and abs(tot_of(d["rubric"]) - mx) > 0.6:
        # 여러 표에서 읽은 채점 기준을 합치니 만점이 안 맞으면: 혼자서 만점이 맞는 표 하나만 쓴다(같은 표를 다르게 읽은 중복 제거)
        fit = [rb for rb in per if rb and (abs(tot_of(rb) - mx) <= 0.6 or any(abs(tot_of(rb) + bs["score"] - mx) <= 0.6 for bs in d["baseScore"]))]
        if fit:
            d["rubric"] = fit[0]
    if d["rubric"]:
        tot = sum(e["maxScore"] or 0 for e in d["rubric"])
        text = " ".join(" ".join(" ".join(r) for r in g) for g in d["sourceTables"])
        if mx and abs(tot - mx) > 0.6 and not any(abs(tot + b["score"] - mx) <= 0.6 for b in d["baseScore"]):
            gap = mx - tot
            if gap > 0 and re.search(r"기본\s*점수", text):
                d["info"] = f"요소 합 {tot:g}점 + 기본 점수 {gap:g}점 = 만점 {mx:g}점으로 보임"   # 확인 대상 아님
            elif gap > 0 and tot and abs(mx / tot - round(mx / tot)) < 0.01 and round(mx / tot) >= 2:
                d["info"] = f"채점 점수 {tot:g}점을 만점 {mx:g}점으로 환산하는 것으로 보임"
            else:
                d["check"].append(f"채점 요소 만점 합 {tot:g}점 ≠ 과제 만점 {mx:g}점")
        if not mx:
            d["task"]["maxScore"] = tot
    return d


def split_by_items(tables, names):
    """과목 평가표 뒤의 세부 표들을 수행 항목별로 나눈다.
    1) 표 글자에 항목 이름(앞 6자)이 있으면 그 항목, 다음 이름이 나올 때까지 이어지는 표도 같은 항목
    2) 이름으로 하나도 못 나누면: 과제 머리(평가 영역명·수행과제)나 채점 기준 머리가 나올 때마다 다음 항목으로 (순서대로)"""
    keys = [ns(n)[:6] for n in names]
    out = [[] for _ in names]
    cur = None
    hit = False
    for t in tables:
        # 한 표에 항목이 열마다 하나씩(평가영역 | 항목1 | 항목2 …): 라벨 열 + 그 항목 열만 잘라 각 항목에
        g = t["grid"]
        if g:
            colhit = {}
            for row in g[:3]:
                for c, x in enumerate(row):
                    k = next((i for i, key in enumerate(keys) if key and len(key) >= 3 and key in ns(x)), None)
                    if k is not None and c > 0:
                        colhit.setdefault(k, c)
            if len(colhit) >= 2:
                for k, c in colhit.items():
                    out[k].append(dict(t, grid=[[row[0], row[c] if c < len(row) else ""] for row in g]))
                hit = True
                continue
        flat = ns(text_of(t["grid"][:6]))
        k = next((i for i, key in enumerate(keys) if key and len(key) >= 3 and key in flat), None)
        has_rb = bool(rubric(t["grid"]))
        if k is not None:
            cur, hit = k, True
        elif cur is not None and has_rb and any(x.get("_rb") for x in out[cur]):
            cur = None   # 이미 채점 기준을 받은 항목에 이름 없는 새 채점표: 다른 과제의 것일 수 있어 붙이지 않음
        if cur is not None:
            out[cur].append(dict(t, _rb=has_rb))
    if hit:
        return out
    starts = []
    for j, t in enumerate(tables):
        first = [ns(x) for r in t["grid"][:3] for x in r[:2]]
        if any(L_TASK.search(x) or x.startswith("수행과제") for x in first):
            starts.append(j)
    if len(starts) == len(names) and names:
        for i, st in enumerate(starts):
            en = starts[i + 1] if i + 1 < len(starts) else len(tables)
            out[i] = tables[st:en]
    elif len(names) == 1:
        out[0] = tables
    return out


def items_from_details(tables):
    """평가표에서 수행 항목 이름을 못 읽은 과목: 세부 표에서 항목을 만든다.
    과제 머리(평가 영역명·과제명)가 있으면 과제마다 하나, 없으면 채점 기준 표의 요소(=과제)마다 하나."""
    starts = []
    for j, t in enumerate(tables):
        first = [ns(x) for r in t["grid"][:3] for x in r[:2]]
        if any(L_TASK.search(x) for x in first):
            starts.append(j)
    items = []
    if starts:
        for i, st in enumerate(starts):
            en = starts[i + 1] if i + 1 < len(starts) else len(tables)
            dt = detail_for(tables[st:en])
            name = dt["task"].get("name")
            if name:
                items.append({"name": name, "weightPercent": None, "maxScore": dt["task"].get("maxScore"), "detail": dt})
        if items:
            return items
    for t in tables:
        dt = detail_for([t])
        for e in dt["rubric"]:
            if not e["element"]:
                continue
            one = dict(dt, task={"name": e["element"], "maxScore": e["maxScore"]}, rubric=[e])
            items.append({"name": e["element"].split(" › ")[0], "weightPercent": None, "maxScore": e["maxScore"], "detail": one})
    # 같은 이름(세부 요소로 나뉜 과제)은 하나로
    merged = {}
    for it in items:
        k = ns(it["name"])
        if k in merged:
            merged[k]["detail"]["rubric"] += it["detail"]["rubric"]
        else:
            merged[k] = it
    return list(merged.values())[:12]
