"""과목 목록 먼저 뽑기 (값 추출과 분리). AI·OCR 없음.
근거 (강한 순)
  A 머리 표: '과목/과목명' 칸 옆·아래 값 (첫 2행)
  B 제목 줄: 'X(과) 교수·학습 (및 평가) (운영) 계획', '( X )과 교수', '[ X ]' + 교수/평가 — 표 앞 글자 끝 250자와 표 첫 행
  F 파일명: 과목별 파일일 때
제외: 교과군 이름(국어·한문, 과학·정보, 사회, 수학, 예·체능 …) — 고등학교는 과목이 아님. 평가 용어·학교명(bad_subject).
결과: 학교 → 과목(표시명, 근거, 파일)
"""
import collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates  # noqa: E402
SEP = r"\s*[․·ㆍ‧･・∙⦁]?\s*"
TITLES = [
    re.compile(r"(?:2\s*학기|[123]\s*학년|^|\s[1I]\s)\s*\(?\s*([^\s\d()\[\]][^()\[\]\n]{0,24}?)\s*\)?\s*(?:과목|교과|과)?\s*교수" + SEP + r"학습\s*(?:및\s*평가\s*)?(?:운영\s*)?계획"),
    re.compile(r"\[\s*([^\[\]\n]{2,25}?)\s*\]\s*(?:과목|교과)?\s*(?:-\s*[ⅠⅡ\d]\s*)?(?:교수|평가)"),
]
GROUP = re.compile(r"(국어|국어한문|수학|영어|사회|역사|도덕|사회역사|과학|과학정보|예체능|예술|체육|음악미술|기술가정정보|생활교양|교양|외국어|제2외국어)과?")  # 정보·한문·기술가정은 과목 이름이기도 해서 뺌
def gkey(s): return re.sub(r"[\s·ㆍ‧･・∙⦁()]", "", s or "")
def titles_in(t):
    out = []
    for p in TITLES:
        for m in p.finditer(t):
            out.append((m.start(), re.sub(r"\s+", " ", m.group(1)).strip(" -")))
    return [v for _, v in sorted(out)]
def ok_name(v, sc):
    if re.search(r"[가-힣]{1,4}\s*\d{2}\s*-\s*\d{2}|통합본|정보공시|^수정|최종", v): return None
    v = re.sub(r"\s+(?:\d+\s*(?:학점|시수)?\s*)?(?:2\s*학기\s*)?\d+\s*[~,\-].*$", "", v or "")  # '공통국어2 1~10반 1' 뒤 학급 정보
    if re.search(r"\d{2}\s*[가-힣Ⅰ-Ⅲ]{1,5}\s*\d?\s*-?\s*\d{2}\s*-\s*\d{2}|^\d|[가-힣]{2,}\s+\d+\s*-", v): return None  # 성취기준 코드
    v = re.split(r"\s+\d+\s+", v)[0]  # '생명과학 실험 1 생명과학 실험'
    if re.search(r"(하고|하여|이를|으로|에서|에게|한다|된다|추후)(\s|$)", v): return None  # 문장 조각
    v = gates.tidy_subject(re.sub(r"[\x00-\x1f]", "", v or "")) or ""
    if not v or len(v) > 22 or gates.bad_subject(v, sc) or gates.BAD_SUBJ.search(v): return None
    if re.search(r"교육과정|운영|안내|일정|목차|^※|월$|주$", v): return None
    if sc.endswith("고등학교") and GROUP.fullmatch(gkey(v)): return None
    return v
def build(tables, srcs=None, schools=None):
    res = collections.defaultdict(dict)
    for t in tables:
        for line in open(t, encoding="utf-8"):
            r = json.loads(line)
            if "grid" not in r or (srcs and r["src"] not in srcs) or (schools and r["school"] not in schools): continue
            fname = re.split(r"[\\/]", r["file"])[-1]
            if "성적관리" in fname.replace(" ", ""): continue
            sc = r["school"]; g = r["grid"]
            cands = []
            a = gates.subject_from_header_table(g) if g else None
            if a: cands.append((a, "A"))
            head = (r.get("ctx") or "")[-250:] + " " + (" ".join(dict.fromkeys(g[0])) if g and g[0] else "")
            cands += [(v, "B") for v in titles_in(re.sub(r"\s+", " ", head))]
            f = gates.subject_from_filename(r["file"])
            if f: cands.append((f, "F"))
            for v, how in cands:
                v2 = ok_name(v, sc)
                if not v2: continue
                k = gates.norm(v2)
                e = res[sc].setdefault(k, {"name": v2, "how": set(), "files": set()})
                e["how"].add(how); e["files"].add(fname)
    AMBIG = {"정보", "한문", "기술가정", "기술·가정"}  # 교과 이름이자 과목 이름: 머리 표(A) 근거가 있을 때만 과목으로
    for sc, d in res.items():
        if any("A" in e["how"] for e in d.values()):
            for k in [k for k, e in d.items() if gkey(e["name"]).replace("‧", "").replace("․", "") in {gkey(x) for x in AMBIG} and "A" not in e["how"]]:
                del d[k]
    for sc, d in res.items():  # 한 글자만 다른 약한 근거 변형(오타·'과' 끼임)은 강한 쪽에 합침
        ks = sorted(d, key=lambda k: (-("A" in d[k]["how"]), -len(d[k]["files"])))
        for k in ks[::-1]:
            if k not in d or "A" in d[k]["how"]: continue
            for k2 in ks:
                if k2 == k or k2 not in d or "A" not in d[k2]["how"]: continue
                if one_edit(k, k2) and not re.search(r"[0-9ⅠⅡⅢIV]", diff_chars(k, k2)):
                    d[k2]["how"] |= d[k]["how"]; d[k2]["files"] |= d[k]["files"]; del d[k]; break
    return res
def diff_chars(a, b):
    import difflib
    return "".join(a[i1:i2] + b[j1:j2] for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes() if op != "equal")
def one_edit(a, b):
    if abs(len(a) - len(b)) > 1: return False
    import difflib
    ops = [o for o in difflib.SequenceMatcher(None, a, b).get_opcodes() if o[0] != "equal"]
    return len(ops) == 1 and max(ops[0][2] - ops[0][1], ops[0][4] - ops[0][3]) == 1
if __name__ == "__main__":
    tabs = sys.argv[1].split(","); schools = set(json.load(open(sys.argv[2], encoding="utf-8"))) if len(sys.argv) > 2 else None
    res = build(tabs, schools=schools)
    for sc, d in res.items():
        print(sc, len(d), " / ".join(f"{e['name']}:{''.join(sorted(e['how']))}" for e in d.values()))
