"""과목 목록 v2. AI·OCR 없음. subjlist(v1)에서 처음 보는 20곳 실패 유형을 일반 규칙으로 보강.

근거
  A 머리 표 '과목' 칸 옆·아래 값
  S 요약 표: 머리 행에 '과목'과 (수행|정기|지필|반영|단위|학점)이 함께 있는 표의 '과목' 열 값 전부
  B 제목 줄: '(학년) X(과) 교수·학습 (및 평가) (운영) 계획', '2학기 X 평가 계획', '[ X ]/( X )과 교수'
  F 파일명
  U 평가표 게이트가 붙인 과목 이름 — 과목 사전(여러 학교 A/S/B에 나온 이름)에 있을 때만
정리
  괄호·꺾쇠·밑줄·확장자·학급/교사 꼬리 제거, '※ 위의'·'첨부'·점수/등급 같은 잡음 제외, 교과군 이름 제외
  같은 과목의 표기 변형(공백·기호·한 글자 차이, 'X과' 꼬리)은 하나로 합침
"""
import collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates  # noqa: E402

SEP = r"\s*[․·ㆍ‧･・∙⦁]?\s*"
END = r"(?![은는을이의에])"
LEAD = r"(?:2\s*\)?\s*학기|\(?\s*[123]\s*\)?\s*학년|학년도|^|\s[1-3I]\s|\s[1-3](?=\())"   # r4: '2026학년도 (X)과', '1(대수) 교수'
TITLES = [
    # r4: 과 뒤 '2학기', 학습 뒤 '-평가' 허용 — '( 고전과 윤리)과 2학기 교수학습 및 평가계획', '( 확률과 통계 )과목 교수학습-평가 운영계획'
    re.compile(LEAD + r"\s*\(?\s*([^\s\d()\[\]<>][^()\[\]<>\n]{0,24}?)\s*\)?\s*(?:과목|교과|과)?\s*(?:\(?\s*2\s*\)?\s*학기\s*)?교수" + SEP + r"학습\s*(?:[-‐–]\s*|및\s*)?(?:평가\s*)?(?:운영\s*)?계획" + END),
    re.compile(r"학년도\s*\(?\s*2\s*\)?\s*학기\s*(?:[^\n]{0,15}?\(?\s*[123]\s*\)?\s*학년\s*)?\(?\s*([^\s\d()\[\]<>][^()\[\]<>\n]{0,24}?)\s*\)?\s*(?:과목\s*)?평가\s*(?:운영\s*)?계획" + END),
    re.compile(r"(?:^|\s)[가-하]\s*\.\s*([^\s\d()][^()\n]{1,24}?)\s*\(\s*[123]\s*학년\s*\)"),   # '가. 공통국어2(1학년)' 목록형 제목
    re.compile(r"[\[<「]\s*([^\[\]<>「」\n]{2,25}?)\s*[\]>」]\s*(?:과목|교과)?\s*(?:-\s*[ⅠⅡ\d]\s*)?(?:교수|평가)"),
]
GROUP = re.compile(r"(국어|국어한문|수학|영어|사회|역사|도덕|사회역사|일반사회|과학|과학정보|과학기술|예체능|예술|체육|체육예술|예술체육|음악미술|기술가정정보|생활교양|교양|외국어|제2외국어|직업)과?")
NOISE = re.compile(r"※|■|위의|^획|피드백|전략$|교과목|^첨부\d*$|^본문$|^붙임|^별첨|^활용$|\d+\s*(점|등급)$|학기\s*\d$|수립된|^관찰$|범교과|^(말하기|읽기|쓰기|듣기)$|듣기\s*,|단위|단계|분할|산출|해당\s*없음|합본|\d\s*반|반\s*\d|00$|○|^[가-힣]\d?$|[가-힣]{1,4}\d{4,6}$")


def gkey(s):
    return re.sub(r"[\s·ㆍ‧･・∙⦁()_\-]", "", s or "")


def skey(s):
    """같은 과목 판단용 키: 기호·공백 제거, 로마숫자→숫자."""
    s = re.sub(r"[\s·ㆍ‧･・∙⦁‧․()<>\[\]「」『』_\-.,]", "", s or "")
    return s.replace("Ⅰ", "1").replace("Ⅱ", "2").replace("Ⅲ", "3").replace("І", "1")


def titles_in(t):
    out = []
    for p in TITLES:
        for m in p.finditer(t):
            v = re.sub(r"\s+", " ", m.group(1)).strip(" -")
            v = re.split(r"\s[1-3I]\s", " " + v + " ")[-1].strip()
            if re.match(r"\d+\s*[.)]", v):                            # '[1. 중국문화 논술 …] 평가 영역' = 평가 항목
                continue
            v = re.split(r"[.。]\s", v)[-1].strip()                  # '수 있다. 고전과 윤리' 앞 문장 꼬리
            out.append((m.start(), v))
    return [v for _, v in sorted(out)]


def ok_name(v, sc):
    v = v or ""
    v = re.sub(r"\.(hwpx?|pdf|docx?)$", "", v, flags=re.I)
    v = re.sub(r"[<>「」『』]", " ", v).strip(" _-")
    v = re.sub(r"\s*과목\s*\(?\s*2\s*\)?\s*학기.*$", "", v)          # '미술 감상과 비평 과목 2학기'
    v = re.sub(r"\s*\(?\s*(?:주당\s*)?\d+\s*(?:시간|학점|단위)\s*\)?\s*$", "", v)   # r4: '경제수학 (주당 3시간)'
    m2 = re.fullmatch(r"\s*(.+?)\s+\1\s*", v)   # r5: 병합 칸이 겹쳐 읽힌 '심화 수학Ⅰ 심화 수학Ⅰ'
    if m2:
        v = m2.group(1)
    v = re.sub(r"\s+\(?\s*2\s*\)?\s*학기\s*\d.*$", "", v)              # '경제 2학기 8반 이00'
    v = re.sub(r"^\d+\s*(?=[가-힣])", "", v)
    v = re.sub(r"^[가-하]\s*[.)]\s*", "", v)                          # '가. 정보A'
    if re.search(r"[가-힣]{1,5}\s*\d{2}\s*-?\s*\d{2}\s*-?\s*\d{1,2}$", v):  # '생과20604' 성취기준 코드
        return None                           # '1심화영어독해Ⅰ'
    if re.search(r"[가-힣]{1,4}\s*\d{2}\s*-\s*\d{2}|통합본|정보공시|^수정|최종", v):
        return None
    v = re.sub(r"\s+(?:\d+\s*(?:학점|시수)?\s*)?(?:2\s*학기\s*)?\d+\s*[~,\-].*$", "", v)
    if re.search(r"\d{2}\s*[가-힣Ⅰ-Ⅲ]{1,5}\s*\d?\s*-?\s*\d{2}\s*-\s*\d{2}|^\d|[가-힣]{2,}\s+\d+\s*-", v):
        return None
    v = re.split(r"\s+\d+\s+", v)[0]
    if re.search(r"(하고|하여|이를|한다|된다|추후|있습니다)(\s|$|\.)", v):
        return None
    toks = v.split()
    if len(toks) >= 2 and toks[0].endswith("과") and GROUP.fullmatch(gkey(toks[0])):   # '영어과 영어Ⅱ', '역사과 동아시아역사기행'
        v = " ".join(toks[1:])
    v = gates.tidy_subject(re.sub(r"[\x00-\x1f]", "", v)) or ""
    v = re.sub(r"\(\s*(직업|직업반|직업위탁|온라인.*|공동.*)\s*\)$", "", v).strip()
    if not re.search(r"[가-힣]", v):                                    # 'Page' 같은 영문 잡음
        return None
    if not v or len(v) > 22 or NOISE.search(v) or gates.bad_subject(v, sc) or gates.BAD_SUBJ.search(v):
        return None
    if re.search(r"교육과정|운영|안내|일정|목차|(^|[\s\d])월$|(^|[\s\d])주$|^직업반", v):
        return None
    if sc.endswith("고등학교") and GROUP.fullmatch(gkey(v)):
        return None
    return v


def header_below(g):
    """머리 행에 '학교명'과 '과목'이 함께 있으면, 그 바로 아래 행의 '과목' 열 값."""
    for ri, row in enumerate(g[:2]):
        cells = [re.sub(r"\s", "", c) for c in row]
        if ("과목" in cells or "과목명" in cells) and ("학교명" in cells or "학년" in cells or "학기" in cells) and ri + 1 < len(g):   # r5: 학교명 없는 '학년|과목|학기' 머리 행
            ci = cells.index("과목") if "과목" in cells else cells.index("과목명")
            nxt = g[ri + 1]
            return nxt[ci] if ci < len(nxt) and nxt[ci].strip() else None
    return None


def summary_subjects(g):
    """머리 행에 '과목'+(수행|정기|...)가 있는 요약 표의 과목 열 값."""
    for ri, row in enumerate(g[:2]):
        cells = [re.sub(r"\s", "", c) for c in row]
        if "과목" in cells and any(re.search(r"수행|정기|지필|반영|단위|학점", c) for c in cells):
            ci = cells.index("과목")
            heads = [" ".join(g[j][c] for j in range(min(3, len(g))) if c < len(g[j])) for c in range(len(g[0]))]
            c1 = [c for c, h in enumerate(heads) if re.search(r"1\s*학기", h)]
            c2 = [c for c, h in enumerate(heads) if re.search(r"2\s*학기", h)]
            rows = [r for r in g[ri + 1:] if ci < len(r) and r[ci].strip()]
            if c1 and c2:                                   # 1·2학기를 함께 담은 연간 표: 2학기 칸에 내용이 있는 과목만
                rows = [r for r in rows if any(c < len(r) and r[c].strip() not in ("", "-", "–", "—") for c in c2)]
            return [r[ci] for r in rows]
    return []


def _raw(tables, schools):
    res = collections.defaultdict(dict)
    for t in tables:
        for line in open(t, encoding="utf-8"):
            r = json.loads(line)
            if "grid" not in r or (schools and r["school"] not in schools):
                continue
            fname = re.split(r"[\\/]", r["file"])[-1]
            if "성적관리" in fname.replace(" ", ""):
                continue
            sc = r["school"]; g = r["grid"]
            cands = []
            a = gates.subject_from_header_table(g) if g else None
            if a:
                cands.append((a, "A"))
            a2 = header_below(g) if g else None   # r4: '학교명|학년|과목' 머리 행 바로 아래 값 ('수학과제탐구'를 평가 항목으로 오인하던 문제)
            if a2 and a2 != a:
                cands.append((a2, "A"))
            cands += [(v, "S") for v in summary_subjects(g)] if g else []
            head = (r.get("ctx") or "")[-250:] + " " + (" ".join(dict.fromkeys(g[0])) if g and g[0] else "")
            cands += [(v, "B") for v in titles_in(re.sub(r"\s+", " ", head))]
            fn = re.sub(r"\[[^\]]{1,10}\](?=\s*\S*고(?:등학교)?\s)", "", r["file"])   # '[꿈두레]동산고등학교 …' 앞 꼬리표
            f = gates.subject_from_filename(fn)
            if f:
                cands.append((f, "F"))
            m = re.search(r"계획\s*[-_]\s*[123]\s*학년\s+([^\\/]+?)\.(?:hwpx?|pdf)$", r["file"], re.I)   # r4: '…운영 계획-1학년 통합과학2.hwp'
            if m:
                cands.append((re.sub(r"^과목명\s*\((.+)\)$", r"\1", m.group(1).strip()), "F"))
            for v, how in cands:
                v2 = ok_name(v, sc)
                if not v2:
                    continue
                k = skey(v2)
                if len(k) < 2 or re.fullmatch(r"[가-힣]{1,5}\d{4,6}", k):
                    continue
                e = res[sc].setdefault(k, {"name": v2, "how": set(), "files": set(), "pages": set()})
                e["how"].add(how); e["files"].add(fname)
                if how in ("A", "B", "S") and isinstance(r.get("page"), int):
                    e.setdefault("pages", set()).add((fname, r["page"]))   # 과목이 시작되는 쪽 (평가표를 쪽 순서로 붙일 때 씀)
    return res


def dictionary(raw):
    seen = collections.defaultdict(set)
    for sc, d in raw.items():
        for k, e in d.items():
            if e["how"] & {"A", "S", "B"}:
                seen[k].add(sc)
    return {k for k, v in seen.items() if len(v) >= 2}


def _merge(d, k, k2):
    d[k2]["how"] |= d[k]["how"]; d[k2]["files"] |= d[k]["files"]
    d[k2].setdefault("pages", set()).update(d[k].get("pages") or set()); del d[k]


def build(tables, units=None, schools=None, dic_tables=None, dic=None):
    raw = _raw(tables, schools)
    if dic is None:
        dic = dictionary(_raw(dic_tables, None)) if dic_tables else dictionary(raw)
    for u in (units or []) if os.environ.get("USE_UNITS", "0") == "1" else []:
        if schools and u["school"] not in schools or not u.get("subject"):
            continue
        v = ok_name(u["subject"], u["school"])
        if v and skey(v) in dic:
            e = raw[u["school"]].setdefault(skey(v), {"name": v, "how": set(), "files": set()})
            e["how"].add("U")
    AMBIG = {"정보", "한문", "기술가정"}
    for sc, d in raw.items():
        strong = sum(bool(e["how"] & {"A", "S"}) for e in d.values()) >= 10   # 머리 표가 대부분 과목에 있는 학교
        for k in list(d):
            e = d[k]
            if strong and gkey(e["name"]).replace("‧", "").replace("․", "").replace("･", "") in AMBIG and not e["how"] & {"A", "S"}:
                del d[k]; continue
            if k.endswith("과") and k[:-1] in d:          # '심화국어과' → '심화국어'
                _merge(d, k, k[:-1]); continue
        rank = lambda k: (-len(d[k]["how"] & {"A", "S"}), -len(d[k]["how"]), -len(d[k]["files"]))
        for k in sorted(d, key=rank)[::-1]:              # 약한 쪽부터 강한 쪽에 합침
            if k not in d:
                continue
            for k2 in sorted(d, key=rank):
                if k2 == k or k2 not in d or rank(k2) > rank(k):
                    continue
                if len(k) >= 4 and len(k2) >= 4 and k not in dic and one_edit(k, k2) and not re.search(r"[0-9]", diff_chars(k, k2)):
                    _merge(d, k, k2); break
                if d[k]["how"] <= {"B", "U"} and len(k) >= 4 and k2.endswith(k) and k2 != k and d[k]["files"] & d[k2]["files"]:
                    _merge(d, k, k2); break               # '감성과 상상력' ⊂ '문학적 감성과 상상력'
    return raw


def diff_chars(a, b):
    import difflib
    return "".join(a[i1:i2] + b[j1:j2] for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes() if op != "equal")


def one_edit(a, b):
    if abs(len(a) - len(b)) > 1:
        return False
    import difflib
    ops = [o for o in difflib.SequenceMatcher(None, a, b).get_opcodes() if o[0] != "equal"]
    return len(ops) == 1 and max(ops[0][2] - ops[0][1], ops[0][4] - ops[0][3]) == 1
