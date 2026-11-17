"""표 캐시(JSONL)에서 과목별 평가 개요표를 찾아 규칙(패밀리)별로 수행평가 정보를 뽑고 검증한다. AI·OCR 없음.

단위(unit): 한 과목의 평가 개요표 = 표 안에 '수행'과 '정기|지필|중간|기말'이 함께 있고,
            반영비율 라벨 또는 '수행…%' 칸이 있는 표.
패밀리
  COL     : 열마다 평가 하나. 평가 종류 행(값에 수행·정기)이 있고 그 아래 첫 열이 라벨.
  ROW     : 행마다 평가 하나. 머리글 행에 라벨, 평가 종류는 아무 열.
  HEAD+KV : 표에는 수행/정기 총비율만, 항목은 뒤따르는 세부표(라벨|값)에서.
과목명: 문서 순서대로 '현재 과목'을 갱신(머리 표의 '과목' 칸 > 과목 머리글 문장 > 파일명).
검증(통과 조건)
  - 과목명 있음
  - 수행 총비율 있음, 0 < 총비율 <= 100
  - 항목 1개 이상, 모든 항목에 반영비율 숫자
  - 항목 비율 합 == 수행 총비율 (±0.6), 또는 == 100 (항목이 수행 안의 내부 비율인 학교)
  - 정기 총비율이 있으면 정기+수행 == 100
결과 형식: AnalysisSubject 일부 (subjectName, writtenEvaluation.weightPercent,
          performanceEvaluation{weightPercent, items[label, weightPercent, maxScore, timing, method]})
사용: python gates.py TABLES.jsonl [...] OUT.json
"""
import collections
import json
import os
import re
import sys

STRIP = re.compile(r"[()\[\]·ㆍ・%\s]")
PCT = re.compile(r"(\d+(?:\.\d+)?)\s*\)?\s*[%％]")
PTS = re.compile(r"(\d+(?:\.\d+)?)\s*점")
PAREN_NUM = re.compile(r"\((\d+(?:\.\d+)?)\)")
BARE_NUM = re.compile(r"\s*(\d+(?:\.\d+)?)\s*")

HEAD_RE = re.compile(
    r"학기\s*(?:\d\s*학년\s*)?\[?\s*([^\[\]\n]{2,30}?)\s*\]?\s*(?:과|교과)?\s*\n?\s*교수\s*[·ㆍ‧･・\s]*학습")
BAD_SUBJ = re.compile(r"교과별|전과목|전\s*과목|과목별|학년|평가|계획|공시|2026|교수|학습")


def norm(s):
    return re.sub(r"\s+", "", s or "")


FULLWIDTH = str.maketrans("０１２３４５６７８９．", "0123456789.")


def pct(s):
    s = (s or "").translate(FULLWIDTH)  # '５０%' 같은 전각 숫자
    m = PCT.search(s or "")
    return float(m.group(1)) if m else None


def pct_loose(s):
    s = (s or "").translate(FULLWIDTH)
    v = pct(s)
    if v is not None:
        return v
    m = PAREN_NUM.search(s or "")
    if m:
        return float(m.group(1))
    m = BARE_NUM.fullmatch(s or "")
    return float(m.group(1)) if m else None


def pts(s):
    s = (s or "").translate(FULLWIDTH)
    m = PTS.search(s or "")
    return float(m.group(1)) if m else None


def clean(s, n=120):
    s = re.sub(r"\s+", " ", (s or "")).strip()
    return s[:n] or None


def label_of(s):
    n = STRIP.sub("", s or "")
    if not n or len(n) > 16:
        return None
    if "비율" in n or "비중" in n:
        return "max_ratio" if ("만점" in n or "배점" in n) else "ratio"
    if "만점" in n or "배점" in n:
        return "max"
    if "영역" in n or "횟수" in n or "과제" in n or "평가명" in n or n == "항목":
        return "name"
    if "시기" in n or "일정" in n:
        return "timing"
    if "요소" in n or "내용" in n:
        return "element"
    if "방법" in n or "유형" in n:
        return "method"
    return None


def is_perf(v):
    return "수행" in norm(v)


CHECKBOX = re.compile(r"^[□■☑☐▣◻◼]|^gfedc")


def is_exam(v):
    n = norm(v)
    if CHECKBOX.search(n):
        return False  # '□ 정기시험' 같은 체크박스 선택지
    n = n.replace("학기말", "")  # '학기말 반영비율'의 '기말'은 기말고사가 아님
    return "정기" in n or "지필" in n or "중간" in n or "기말" in n


# ---------- 과목명 ----------
def tidy_subject(s):
    if not s:
        return s
    m = re.fullmatch(r"\(\s*(.+?)\s*\)\s*(?:과목|교과)?", s)
    if m:
        s = m.group(1)
    s = re.sub(r"\s*(과목|교과)$", "", s).strip()
    s = re.sub(r"^\[\s*(.+?)\s*\]$", r"\1", s)  # '[스마트농업이해]'
    s = re.sub(r"\s*\)$", "", s) if s.count(")") > s.count("(") else s  # 짝 없는 닫는 괄호
    if re.fullmatch(r"(\S )+\S", s or ""):  # '도 덕', '체 육'
        s = s.replace(" ", "")
    s = re.sub(r"(?<=[가-힣])\s*III$", "Ⅲ", s)
    s = re.sub(r"(?<=[가-힣])\s*II$", "Ⅱ", s)
    s = re.sub(r"(?<=[가-힣])\s*I$", "Ⅰ", s)
    if s.endswith("과") and len(s) > 2 and SUBJ_RE.fullmatch(s[:-1]):
        s = s[:-1]  # '음악과' -> '음악'
    return s or None


def bad_subject(s, school):
    """학교 이름·머리 표 라벨·기호 등 과목명이 될 수 없는 값."""
    if not s:
        return True
    n = norm(s)
    if len(n) < 2 or not re.search(r"[가-힣A-Za-z]", n):
        return True
    if re.search(r"학교|부설|방송고|전교|주차|차시|^과정$|담당|교사|학급|학번|시수|단위수|학점|채점|별$|^\d+차|평가|항목", n):
        return True
    if re.fullmatch(r"제2외국어|교양|전문교과|공통과목|선택과목|일반선택|진로선택|융합선택|기초교과|탐구교과|체육예술|생활교양|전문일반", n):
        return True  # 과목군 이름
    if re.search(r"수행|정기|지필|중간|기말|기능|영역|요소|방법|내용|기준|단원|성취|반영|비율|채점|결과|과제$|^가능$|^불가", n):
        return True  # 평가 용어 ('(기능)과 평가', '수행) 평가' 등에서 잘못 잡힌 값)
    if school and (school.startswith(n) or n.startswith(re.sub(r"등학교$|학교$", "", school))):
        return True  # '울산고', '진주고부설방송고'
    return False


def subject_from_header_table(g):
    for r_i, r in enumerate(g[:2]):
        for c_i, x in enumerate(r):
            if re.sub(r"\s", "", x) in ("과목", "과목명", "교과목", "교과목명", "교과(목)", "교과(목)명", "과목명항목"):
                right = r[c_i + 1] if c_i + 1 < len(r) else ""
                below = g[r_i + 1][c_i] if r_i + 1 < len(g) and c_i < len(g[r_i + 1]) else ""
                for v in (right, below):  # 라벨처럼 보이는 값(평가종류 등)은 건너뜀
                    if norm(v) and norm(v) != norm(x) and not label_of(v) and not re.search(r"평가|구분|학기|학년|학급|학점|시수|시간|교사|담당", v):
                        return clean(v, 30)
    return None


HEAD_PATTERNS = [
    HEAD_RE,
    re.compile(r"\(\s*([^()\n]{2,25}?)\s*\)\s*(?:과|교과)?\s*(?:교수|평가|수업)"),         # '( 문학 )과 교수학습·평가 계획서'
    re.compile(r"학기\s*(?:\d\s*학년\s*)?\[\s*([^\[\]\n]{2,25}?)\s*\]"),                   # '2학기 [고전읽기] 교과'
    re.compile(r"학기\s*(?:\d\s*학년\s*)?([가-힣A-Za-zⅠⅡⅢ0-9·ㆍ ]{2,20}?)\s*(?:교과\s*)?평가\s*(?:운영\s*)?계획"),  # '2학기 화학 평가계획'
]


def subject_from_text(t):
    found = []
    for pat in HEAD_PATTERNS:
        for m in pat.finditer(t or ""):
            v = m.group(1).strip()
            if v and not BAD_SUBJ.search(v) and len(v) <= 25:
                found.append((m.start(), v))
    return clean(max(found)[1], 30) if found else None  # 문서에서 가장 뒤(가장 가까운) 머리글


SUBJECTS = [
    "공통국어", "화법과 언어", "화법과 작문", "독서와 작문", "언어와 매체", "주제 탐구 독서", "문학과 영상", "매체 의사소통", "문학", "독서", "작문", "화법", "국어",
    "공통수학", "기본수학", "대수", "미적분", "확률과 통계", "기하", "경제 수학", "인공지능 수학", "수학과제 탐구", "실용 수학", "수학",
    "공통영어", "기본영어", "영어 독해와 작문", "영어 회화", "영미 문학 읽기", "심화 영어", "실용 영어", "직무 영어", "영어",
    "한국사", "통합사회", "세계시민과 지리", "한국지리 탐구", "한국지리", "세계지리", "세계사", "동아시아 역사 기행", "동아시아사", "사회와 문화", "사회·문화", "사회문화",
    "현대사회와 윤리", "생활과 윤리", "윤리와 사상", "고전과 윤리", "윤리", "정치와 법", "정치", "법과 사회", "경제", "여행지리", "사회문제 탐구",
    "통합과학", "과학탐구실험", "물리학", "화학", "생명과학", "지구과학", "역학과 에너지", "전자기와 양자", "물질과 에너지", "화학 반응의 세계", "세포와 물질대사", "생물의 유전",
    "지구시스템과학", "행성우주과학", "융합과학 탐구", "과학의 역사와 문화", "과학사", "기후변화와 환경생태", "과학",
    "정보", "인공지능 기초", "데이터 과학", "기술·가정", "기술가정", "기술ㆍ가정", "공학 일반", "창의 공학 설계",
    "운동과 건강", "스포츠 생활", "스포츠 과학", "스포츠 문화", "체육", "음악 감상과 비평", "음악 연주와 창작", "음악", "미술 창작", "미술 감상과 비평", "미술",
    "도덕", "역사", "사회", "한문", "일본어", "중국어", "독일어", "프랑스어", "스페인어", "베트남어",
    "진로와 직업", "보건", "환경", "철학", "논리와 사고", "심리학", "교육학", "삶과 종교", "인간과 경제활동", "생태와 환경", "논술", "진로",
]
SUBJ_RE = re.compile("(" + "|".join(sorted((re.escape(x).replace(r"\ ", r"\s*") for x in SUBJECTS), key=len, reverse=True)) + r")\s*([ⅠⅡⅢ123]|I{1,3})?")


def subject_from_vocab(t):
    ms = list(SUBJ_RE.finditer((t or "")[-300:]))
    return clean(ms[-1].group(0), 30) if ms else None


def subject_from_filename(file):
    base = re.sub(r"\.(hwpx?|pdf)$", "", re.split(r"[\\/]", file)[-1])
    category = re.compile(r"전문일반|전공실무|전문공통|기초|교양|^공통$|선택|\d+반|학과$|과$")
    m = re.search(r"\(\s*([^()]{2,25}?)\s*\)\s*과목", base)  # '(농산물 유통)과목'
    if m and not BAD_SUBJ.search(m.group(1)):
        return clean(m.group(1), 30)
    for m in re.finditer(r"\[([^\]]{2,25})\]", base):
        v = m.group(1)
        if not BAD_SUBJ.search(v) and not category.search(v):
            return clean(v, 30)
    m = re.search(r"-([^-]{2,20})$", base)
    if m and not BAD_SUBJ.search(m.group(1)):
        return clean(m.group(1), 30)
    m = re.search(r"학기\s*(?:\d학년\s*)?(\S[^_]{1,20}?)\s*(?:과\s*)?(?:교수|평가\s*(?:운영\s*)?계획)", base)
    if m and not BAD_SUBJ.search(m.group(1)):
        return clean(m.group(1), 30)
    for m in re.finditer(r"\(\s*(?:\d\s*학년\s*)?(?:\d\s*학기\s*)?([^()]{2,20}?)\s*\)", base):
        v = m.group(1)  # '(1학년 2학기 체육2)' -> '체육2'
        if not BAD_SUBJ.search(v) and not re.search(r"^\d|\d{2,}|수정|최종|공시|게시|안$|합철|교과$", v):
            return clean(v, 30)
    return None


CODE_RE = re.compile(r"\[\s*(\d{1,2})\s*([가-힣]{1,6})\s*(\d?)\s*-?\s*\d{2}\s*-")


def code_prefixes(g):
    c = collections.Counter()
    for r in g:
        for x in r:
            for m in CODE_RE.finditer(x):
                c[m.group(1) + m.group(2) + m.group(3)] += 1
    return c


# ---------- 패밀리 ----------
PLACEHOLDER = re.compile(r"^(평가)?영역\s*\d+$|^수행\s*평가\s*\d*$|^\d+\s*(차|회)(\s*시험)?$|^\d+\s*순위$|^[\d.]+\s*[%점]?$|^[•▸⦁∙·Ÿ\-–―_]|^(합계|계|미실시|해당\s*없음)$")


def acceptable_label(s):
    t = re.sub(r"\s+", " ", (s or "")).strip()
    return bool(t) and not PLACEHOLDER.search(t) and pct(t) is None and len(t) <= 80


def drop_dup_label_col(g):
    """라벨 열이 병합돼 첫 두 열이 거의 모든 행에서 같으면 첫 열을 버린다.
    첫 열 값이 모든 행에서 같으면('2학기' 등 구분 머리) 그 열도 버린다."""
    # 앞에 과목 열이 붙은 표('과목 | 구분 | 수행평가 | 중간고사 …'): 과목 열을 버리고 '구분' 열을 라벨 열로
    if any(len(r) > 2 and norm(r[0]) in ("과목", "과목명") and STRIP.sub("", r[1]) in TYPE_LABELS for r in g):
        g = [r[1:] if len(r) > 1 else r for r in g]
    first = {norm(r[0]) for r in g if r}
    if len(g) >= 3 and len(first) == 1 and next(iter(first)) and all(len(r) > 2 for r in g):
        g = [r[1:] for r in g]
    rows = [r for r in g if len(r) > 2 and norm(r[0])]
    if rows and sum(1 for r in rows if r[0] == r[1]) >= 0.6 * len(rows):
        # 두 칸이 다르면 라벨을 합친다 ('반영비율' + '영역 만점' -> '반영비율 영역 만점')
        return [[r[0] if (len(r) < 2 or r[0] == r[1] or not norm(r[1])) else f"{r[0]} {r[1]}"] + r[2:] if len(r) > 1 else r for r in g]
    return g


def empty(x):
    return norm(x) in ("", "-", "·", "․", "ㆍ", "•", "‧", "－", "—")


TYPE_LABELS = ("평가유형", "평가종류", "종류", "구분", "유형", "평가구분", "평가유형및반영비율", "평가방법반영비율",
               "평가종류반영비율", "평가종류및반영비율", "평가유형반영비율")


def perf_only_row(r):
    """수행평가만 있는 과목의 종류 행: 첫 칸이 종류 라벨이고 값 칸이 모두 수행(합계 제외)."""
    if len(r) < 2 or STRIP.sub("", r[0]) not in TYPE_LABELS:
        return False
    vals = [x for x in r[1:] if norm(x) and not re.search(r"합계|^계$|총합", norm(x))]
    return bool(vals) and all(is_perf(x) and not is_exam(x) for x in vals)


def fam_col(g):
    g = drop_dup_label_col(g)
    ti = next((i for i, r in enumerate(g) if len(r) > 2 and any(is_perf(x) for x in r[1:]) and any(is_exam(x) for x in r[1:])), None)
    perf_only = False
    if ti is None:
        ti = next((i for i, r in enumerate(g) if perf_only_row(r)), None)
        perf_only = ti is not None
    if ti is None:
        return None
    tr = list(g[ti])
    for c in range(2, len(tr)):  # PDF 병합 칸이 비어 나오는 경우 왼쪽 값으로
        if not norm(tr[c]):
            tr[c] = tr[c - 1]
    rows = collections.defaultdict(list)
    for r in g[ti + 1:]:
        k = label_of(r[0]) if r else None
        if k == "method" and STRIP.sub("", r[0]) not in ("평가방법", "방법", "평가유형", "유형", "평가방법유형"):
            continue  # '점수 부여 방법' 등은 평가방법이 아님
        if k in ("ratio", "max_ratio") and re.search(r"서논술|서술|논술|서답|선택형|단답", norm(r[0])):
            rows["ratio_method"].append(r)  # 서논술형 반영비율 등 방식별 비율은 항목 비율 후보가 아님
            continue
        if k:
            rows[k].append(r)
    pcols =[c for c in range(1, len(tr)) if is_perf(tr[c]) and "합계" not in norm(tr[c])]
    ecols = [c for c in range(1, len(tr)) if is_exam(tr[c])]
    if not pcols:
        return None
    ratio_rows = rows.get("ratio", [])
    total = pct(tr[pcols[0]])
    if total is None and ratio_rows:
        total = pct_loose(ratio_rows[0][pcols[0]])
    if perf_only:
        total = 100.0  # 수행평가만 있는 과목: 수행 총비율 100, 항목 합이 100이어야 검증 통과
    exam_total = pct(tr[ecols[0]]) if ecols else None
    if exam_total is None and ratio_rows and ecols:
        cells = [ratio_rows[0][c] for c in ecols]
        filled = [pct_loose(x) for x in cells if not empty(x)]
        if len(filled) > 1 and any(empty(x) for x in cells) and all(v is not None for v in filled):
            exam_total = sum(filled)  # '30% | (빈칸) | 30% | (빈칸)': 시험별로 따로 적힌 비율
        else:
            exam_total = pct_loose(ratio_rows[0][ecols[0]])
    # 후보: 라벨 붙은 비율 행 먼저, 그다음 수행 칸이 모두 %인 아무 행(예: '영역/유형' 행의 50%|50%)
    labeled = ratio_rows[1:] + rows.get("max_ratio", []) + ratio_rows[:1]
    others = [r for r in g[ti + 1:] if r not in labeled and all(pct(r[c]) is not None for c in pcols)]
    cand = labeled + others

    def val(row, c):
        if label_of(row[0]) == "max_ratio":
            v = pct(row[c])
            if v is None:  # '100 (35)': 괄호 안 숫자가 비율
                m = PAREN_NUM.search(row[c] or "")
                v = float(m.group(1)) if m else None
            return v
        return pct(row[c]) if label_of(row[0]) in ("name", None) else pct_loose(row[c])

    def dup_col(c):  # 병합으로 복제된 열: 종류 행 아래 모든 행이 왼쪽 열과 같음
        return c - 1 in pcols and all(r[c] == r[c - 1] for r in g[ti + 1:] if len(r) > c)

    def uniq_cols(row):
        # 병합 복제 열과, 이 행에서 비어 있는 칸(PDF 병합)은 뺀다
        return [c for c in pcols if not dup_col(c) and not empty(row[c])]

    # 항목 이름 행: '영역'이 들어간 라벨 중 수행 칸이 채워지고 서로 다른 행 > 첫 이름 행 > 종류 행 바로 아래 행
    def good_names(r):
        vs = [norm(r[c]) for c in pcols if not dup_col(c)]
        return vs and all(vs) and len(set(vs)) == len(vs) and not any(pct(r[c]) is not None for c in pcols)
    name_rows = rows.get("name", [])
    name_row = next((r for r in name_rows if "영역" in r[0] and good_names(r)), None) \
        or next((r for r in name_rows if good_names(r)), None)
    if name_row is None and ti + 1 < len(g) and good_names(g[ti + 1]):
        name_row = g[ti + 1]
    if name_row is None:
        name_row = next((r for r in rows.get("method", []) + rows.get("element", []) if good_names(r)), None)

    def ex_vals(row):
        seen_e, vs = set(), []
        for c in ecols:
            if empty(row[c]):
                continue
            k = (norm(name_row[c]) if name_row is not None else c, row[c])
            if name_row is None and c - 1 in ecols and row[c] == row[c - 1]:
                continue
            if k in seen_e:
                continue
            seen_e.add(k)
            vs.append(pct(row[c]) if label_of(row[0]) != "ratio" else pct_loose(row[c]))
        return vs if vs and all(v is not None for v in vs) else None

    def p_vals(row):
        cs = uniq_cols(row)
        vs = [val(row, c) for c in cs]
        return vs if vs and all(v is not None for v in vs) else None

    item_ratio = None
    derived_total = False
    best_n = 0
    for target in ([total] if total is not None else []) + [100.0]:
        for rr in cand:  # 합이 맞는 후보 중 항목이 가장 많은 행 (총비율 행을 항목 하나로 읽는 실수 방지), 총비율 일치 우선
            vals = p_vals(rr)
            if vals is None:
                continue
            if total is not None and abs(sum(vals) - target) <= 0.6 and len(vals) > best_n:
                item_ratio, best_n = rr, len(vals)
        if item_ratio is not None:
            break
    if item_ratio is None:
        # 2단 비율: 영역 비율(같은 값이 이웃 열로 이어짐) × 영역 안 비율(영역마다 합 100)
        for area in ratio_rows + rows.get("max_ratio", []):
            a = []
            for c in pcols:
                v = val(area, c) if not empty(area[c]) else (a[-1] if a else None)
                a.append(v)
            if any(v is None for v in a):
                continue
            groups, start = [], 0
            for k in range(1, len(pcols) + 1):
                if k == len(pcols) or a[k] != a[k - 1] or not empty(area[pcols[k]]) and norm(area[pcols[k]]) != norm(area[pcols[k - 1]]):
                    groups.append(list(range(start, k)))
                    start = k
            if len(groups) == len(pcols):
                continue
            area_total = sum(a[gr[0]] for gr in groups)
            if not ((total is not None and abs(area_total - total) <= 0.6) or abs(area_total - 100) <= 0.6):
                continue
            for intr in g[ti + 1:]:
                if intr is area:
                    continue
                iv = [pct(intr[c]) for c in pcols]
                if any(v is None for v in iv):
                    continue
                if all(abs(sum(iv[k] for k in gr) - 100) <= 0.6 for gr in groups):
                    syn = ["반영비율"] + [""] * (len(g[ti]) - 1)
                    for k, c in enumerate(pcols):
                        syn[c] = f"{round(a[k] * iv[k] / 100, 2):g}%"
                    item_ratio, total = syn, (total if total is not None else area_total)
                    break
            if item_ratio is not None:
                break
    if item_ratio is None:
        # 총비율을 믿을 수 없거나 없을 때: 한 행 안에서 정기 칸 + 수행 칸 합이 100인 행
        for rr in cand:
            pv, ev = p_vals(rr), ex_vals(rr)
            if pv and ev and abs(sum(pv) + sum(ev) - 100) <= 0.6:
                item_ratio, total, exam_total, derived_total = rr, sum(pv), sum(ev), True
                break
    if item_ratio is None:
        # 정기 총비율 + 수행 항목 합 = 100 이면 수행 총비율 = 항목 합
        for rr in cand:
            pv = p_vals(rr)
            if pv and exam_total is not None and abs(sum(pv) + exam_total - 100) <= 0.6:
                item_ratio, total, derived_total = rr, sum(pv), True
                break
    if item_ratio is None and cand:
        item_ratio = cand[0]
    if item_ratio is not None and not derived_total and total is not None:
        ev = ex_vals(item_ratio)
        if ev and abs(sum(ev) + total - 100) <= 0.6:
            exam_total = sum(ev)  # 정기 칸이 병합되지 않은 표: 행 안 정기 합으로
    if name_row is None and rows.get("element"):
        name_row = rows["element"][0]
    # 항목 이름은 열마다 고른다: 이름 행 > 라벨 없는 행 > 평가방법 행 > 평가요소 행, 자리표시자(영역 1, 1차, 숫자, 글머리표)는 건너뜀
    def distinct_score(r):  # 수행 열 값이 서로 다르고 자리표시자가 아닐수록 앞에
        vs = [norm(r[c]) for c in pcols if not dup_col(c) and c < len(r) and acceptable_label(r[c])]
        return len(set(vs))
    label_rows = sorted(rows.get("name", []), key=lambda r: (-distinct_score(r), 0 if "영역" in r[0] else 1))
    unl = [r for r in g[ti + 1:] if r and not norm(r[0])]
    label_rows = sorted(label_rows + unl, key=lambda r: -distinct_score(r))
    label_rows += rows.get("method", []) + rows.get("element", [])

    def pick_label(c):
        for r in label_rows:
            if c < len(r) and acceptable_label(r[c]):
                return r[c]
        return ""
    mx = rows.get("max") or rows.get("max_ratio")
    items = []
    cols = uniq_cols(item_ratio) if item_ratio else pcols
    for c in cols:
        name = pick_label(c)
        rv = val(item_ratio, c) if item_ratio else None
        if not norm(name) and item_ratio is not None:
            name = re.split(r"[(（]", item_ratio[c])[0]
            if not acceptable_label(name):
                name = ""
        if rv == 0:
            continue
        mxv = None
        if mx:
            mxv = pts(mx[-1][c])
            if mxv is None and label_of(mx[-1][0]) == "max":
                mxv = pct_loose(mx[-1][c])
        items.append({
            "label": clean(name),
            "weightPercent": rv,
            "maxScore": mxv,
            "timing": clean(rows["timing"][0][c], 40) if rows.get("timing") else None,
            "method": clean(rows["method"][-1][c], 60) if rows.get("method") else None,
        })
    # 병합 칸 복제로 같은 항목이 두 번 들어간 경우(이름·비율·만점·시기가 모두 같음) 하나로. 합이 맞을 때만 적용
    if len(items) > 1 and total is not None:
        uniq, seen_i = [], set()
        for it in items:
            k = (norm(it["label"]), it["weightPercent"], it["maxScore"], norm(it["timing"]))
            if k in seen_i and norm(it["label"]):
                continue
            seen_i.add(k)
            uniq.append(it)
        s_all = sum(i["weightPercent"] or 0 for i in items)
        s_u = sum(i["weightPercent"] or 0 for i in uniq)
        if abs(s_u - total) <= 0.6 and abs(s_all - total) > 0.6:
            items = uniq
    if perf_only:
        exam_total = 0.0
    # 이름 행에 적힌 수행 과제 수 (병합 복제 열 제외) — 항목 수보다 많으면 검증에서 실패시킨다
    # 비율 칸이 '·'·'-'·0 으로 명시적으로 비어 있는 열(예: 서·논술형 0%)은 과제가 없는 것이므로 세지 않는다
    def explicitly_none(c):
        return item_ratio is not None and (empty(item_ratio[c]) or val(item_ratio, c) == 0)
    n_names = len({norm(name_row[c]) for c in pcols if name_row is not None and not dup_col(c) and norm(name_row[c])
                   and not explicitly_none(c)
                   and not re.fullmatch(r"[\d.%점]+|합계|계|-", norm(name_row[c]))}) if name_row is not None else 0
    return {"perf_total": total, "exam_total": exam_total, "items": items, "derived_total": derived_total,
            "perf_only": perf_only, "n_names": n_names}


def fam_row(g):
    if not g or len(g[0]) < 3:
        return None
    hi = next((i for i, r in enumerate(g[:3]) if sum(1 for x in r if label_of(x)) >= 2), None)
    if hi is None:
        return None
    head = g[hi]
    body = [list(r) for r in g[hi + 1:] if any(norm(x) for x in r)]
    tcol = next((c for c in range(len(head)) if any(is_perf(r[c]) for r in body) and any(is_exam(r[c]) for r in body)), None)
    if tcol is None:
        return None
    for i in range(1, len(body)):  # 병합된 종류 칸이 아래로 비어 나오는 경우 위 값으로 (합계 행 제외)
        if not norm(body[i][tcol]) and not any(re.search(r"합계|^계$|총계|합$", norm(x)) for x in body[i]):
            body[i][tcol] = body[i - 1][tcol]
    # 머리글이 두 줄이고 둘째 줄이 하위 라벨(선택형/서술형…)뿐이면 건너뜀
    body = [r for r in body if is_perf(r[tcol]) or is_exam(r[tcol])]
    col = {}
    for c, h in enumerate(head):
        k = label_of(h)
        if k and k not in col and c != tcol:
            col[k] = c
    if "ratio" not in col and "max_ratio" not in col:
        return None
    rc = col.get("ratio", col.get("max_ratio"))
    def dedupe(rs, key):
        out, seen = [], set()
        for r in rs:
            k = key(r)
            if k not in seen:
                seen.add(k)
                out.append(r)
        return out

    nc = col.get("name")
    # 이름도 비율도 없는 빈 수행 행(표 끝 여백)은 버림
    body = [r for r in body if not (is_perf(r[tcol]) and not any(norm(x) for i, x in enumerate(r) if i != tcol and pct_loose(x) not in (None, 0.0) or (i != tcol and norm(x) and pct_loose(x) is None)))]
    perf = dedupe([r for r in body if is_perf(r[tcol])], lambda r: tuple(r))
    # 정기시험 행이 평가방법별로 반복되면(같은 시험·같은 비율) 하나로
    exam = dedupe([r for r in body if is_exam(r[tcol])], lambda r: (norm(r[nc]) if nc is not None else "", r[rc]))
    items = []
    for r in perf:
        mxv = None
        if "max" in col:
            mxv = pts(r[col["max"]])
            if mxv is None:
                mxv = pct_loose(r[col["max"]])
        items.append({"label": clean(r[col["name"]]) if "name" in col else None,
                      "weightPercent": pct_loose(r[rc]), "maxScore": mxv,
                      "timing": clean(r[col["timing"]], 40) if "timing" in col else None,
                      "method": clean(r[col["method"]], 60) if "method" in col else None})
    total = sum(i["weightPercent"] for i in items if i["weightPercent"] is not None) if items else None
    ev = [pct_loose(r[rc]) for r in exam]
    exam_total = sum(v for v in ev if v is not None) if ev else None
    return {"perf_total": total, "exam_total": exam_total, "items": items}


def kv_items(g):
    found = {}
    for r in g:
        for i, cell in enumerate(r[:-1]):
            k = label_of(cell)
            if not k or k in found:
                continue
            v = next((x for x in r[i + 1:] if norm(x) and norm(x) != norm(cell)), "")
            if v:
                found[k] = v
    if "max_ratio" in found:
        found.setdefault("ratio", found["max_ratio"])
        found.setdefault("max", found["max_ratio"])
    if not ("ratio" in found and ("timing" in found or "element" in found or "method" in found)):
        return None
    if pct(found["ratio"]) is None:
        return None
    return {"label": clean(found.get("name")), "weightPercent": pct(found["ratio"]),
            "maxScore": pts(found.get("max")), "timing": clean(found.get("timing"), 40),
            "method": clean(found.get("method"), 60)}


def fam_head(g):
    flat = [x for r in g for x in r]
    p = next((pct(x) for x in flat if is_perf(x) and pct(x) is not None), None)
    e = next((pct(x) for x in flat if is_exam(x) and pct(x) is not None), None)
    if p is None:
        return None
    return {"perf_total": p, "exam_total": e, "items": []}


def validate(res, subject):
    reasons = []
    if not subject:
        reasons.append("과목명 못 찾음")
    if res is None:
        return ["표 구조 해석 실패"] + reasons
    t = res.get("perf_total")
    if t is None or not (0 < t <= 100):
        reasons.append("수행 총비율 없음")
    items = res.get("items") or []
    if not items:
        reasons.append("수행 항목 없음")
    elif any(i["weightPercent"] is None for i in items):
        reasons.append("항목 비율 빠짐")
    elif t is not None:
        s = sum(i["weightPercent"] for i in items)
        if not (abs(s - t) <= 0.6 or abs(s - 100) <= 0.6):
            reasons.append(f"항목 비율 합 불일치({s:g}≠{t:g})")
    if t is not None and res.get("exam_total") is not None and abs(t + res["exam_total"] - 100) > 0.6:
        reasons.append("정기+수행 ≠ 100")
    if res.get("n_names") and items and res["n_names"] > len(items):
        reasons.append(f"과제 이름 수({res['n_names']}) > 추출 항목 수({len(items)})")
    return reasons


def summary_rows(g):
    """과목별 요약표(한 줄 = 한 과목). 머리글에 '과목/교과목' 열과 정기·수행 열이 있다.
    반환: [(과목명, 결과)] 또는 None. 항목 칸은 '이름 (40%)' 형식이어야 한다."""
    if len(g) < 3:
        return None
    # 머리글 줄 수: 첫 칸이 첫 줄과 같은 동안(병합 머리글) 최대 3줄
    nh = 1
    while nh < min(3, len(g) - 1) and g[nh] and g[0] and g[nh][0] == g[0][0]:
        nh += 1
    nh = max(nh, 2)
    head_rows = g[:nh]
    ncol = max(len(r) for r in g)
    hdr = [" ".join(r[c] for r in head_rows if c < len(r)) for c in range(ncol)]
    scol = next((c for c, h in enumerate(hdr) if re.search(r"^(교과목|과목|교과)", norm(h)) and "명칭" not in h), None)
    if scol is None:
        return None
    ecols = [c for c, h in enumerate(hdr) if is_exam(h) and c != scol]
    pcols = [c for c, h in enumerate(hdr) if is_perf(h) and c != scol]
    if not pcols:
        return None
    tcol = next((c for c in pcols if re.search(r"비율|반영", norm(hdr[c])) and not re.search(r"항목", norm(hdr[c]))), None)
    icols = [c for c in pcols if c != tcol]
    out, seen_subj = [], set()
    for r in g[nh:]:
        if r and norm(r[scol] if scol < len(r) else "") in seen_subj:
            continue  # 과목당 비율 줄·점수 줄 두 줄인 서식: 첫 줄만
        if r and scol < len(r):
            seen_subj.add(norm(r[scol]))
        if len(r) <= max([scol] + pcols + ecols):
            continue
        subj = clean(r[scol], 30)
        if not subj or re.fullmatch(r"[\d\s]+", subj):
            continue
        ev = [pct_loose(r[c]) for c in ecols if not empty(r[c])]
        exam_total = sum(v for v in ev if v is not None) if ev else 0.0
        perf_total = pct_loose(r[tcol]) if tcol is not None and not empty(r[tcol]) else None
        items = []
        for c in icols:
            x = r[c]
            if empty(x):
                continue
            pairs = re.findall(r"([^()\d][^()]*?)\s*\(\s*(\d+(?:\.\d+)?)\s*%?\s*\)", x)
            if len(pairs) > 1:  # '영화 비평문(20) 문학 감상(20)': 한 칸에 여러 항목
                for lab, v in pairs:
                    items.append({"label": clean(lab, 60), "weightPercent": float(v), "maxScore": None, "timing": None, "method": None})
                continue
            m = re.search(r"\(\s*(\d+(?:\.\d+)?)\s*%?\s*\)", x) or PCT.search(x)
            items.append({"label": clean(re.split(r"\s*\(", x)[0], 60), "weightPercent": float(m.group(1)) if m else None,
                          "maxScore": None, "timing": None, "method": None})
        if perf_total is not None and not ev:
            exam_total = None  # 정기 비율 칸을 못 찾은 서식: 정기+수행 검사는 하지 않음
        elif perf_total is not None and exam_total is not None and abs(exam_total + perf_total - 100) > 0.6:
            exam_total = round(100 - perf_total, 2) if ev else None
        out.append((subj, {"perf_total": perf_total, "exam_total": exam_total, "items": items}))
    return out or None


AREA_CELL = re.compile(r"^(?P<name>.+?)\s*[(（]\s*(?P<w>\d{1,3}(?:\.\d+)?)\s*%\s*[)）]\s*$")


def area_items(g):
    """수행평가 세부 표의 항목 행: '평가영역 | 항목 이름 (20%) | 항목 이름 (10%) …'.
    첫 칸이 이름 라벨(영역·평가명·과제)이고 나머지 칸이 모두 '이름 (N%)' 꼴일 때만. 시기 행이 있으면 같이 읽는다."""
    for i, r in enumerate(g):
        if len(r) < 2 or label_of(r[0]) != "name":
            continue
        cells = [(c, re.sub(r"\s+", " ", x).strip()) for c, x in enumerate(r) if c > 0 and norm(x) and x != r[c - 1]]   # 병합 칸 복제 제외
        ms = [(c, AREA_CELL.match(x)) for c, x in cells]
        if not ms or not all(m for _, m in ms):
            continue
        timing = next((row for row in g[i + 1:] if row and label_of(row[0]) == "timing"), None)
        return [{"label": m.group("name").strip(), "weightPercent": float(m.group("w")), "maxScore": None,
                 "timing": clean(timing[c], 40) if timing and c < len(timing) else None, "method": None} for c, m in ms]
    return None


def is_perf_only_unit(g):
    """수행평가만 있는 과목 표: 종류 행이 수행뿐이고 비율 라벨이 있으며, 해석한 항목 합이 100."""
    gg = drop_dup_label_col(g)
    if not any(perf_only_row(r) for r in gg):
        return False
    if not any(label_of(x) in ("ratio", "max_ratio") for r in gg for x in r):
        return False
    res = fam_col(g)
    if not res or not res["items"] or any(i["weightPercent"] is None for i in res["items"]):
        return False
    return abs(sum(i["weightPercent"] for i in res["items"]) - 100) <= 0.6


def is_unit(g):
    flat = " ".join(" ".join(r) for r in g)
    if g and g[0] and re.search(r"방안|동점자", norm(g[0][0])):
        return False  # 동점자 처리 순위표
    has_exam = any(is_exam(x) for r in g for x in r)
    if "수행" in flat and not has_exam:
        return is_perf_only_unit(g)
    if "수행" not in flat or not has_exam:
        return False
    # 수행과 정기가 서로 다른 값 칸에 있어야 함 (라벨 열·본문 글 상자 제외)
    sep_row = any(any(is_perf(x) and not is_exam(x) for x in r[1:]) and any(is_exam(x) and not is_perf(x) for x in r[1:]) for r in g)
    cols = list(zip(*g)) if g and all(len(r) == len(g[0]) for r in g) else []
    sep_col = any(any(is_perf(x) and not is_exam(x) for x in c[1:]) and any(is_exam(x) and not is_perf(x) for x in c[1:]) for c in cols)
    if not (sep_row or sep_col) and is_perf_only_unit(g):
        return True
    if not (sep_row or sep_col):
        return False
    has_ratio_label = any(label_of(x) in ("ratio", "max_ratio") for r in g for x in r)
    has_perf_pct = any(is_perf(x) and pct(x) is not None for r in g for x in r)
    # 라벨 없는 비율 행: 수행 머리 칸 바로 아래 칸이 '40%'
    below_pct = any(is_perf(x) and i + 1 < len(g) and c < len(g[i + 1]) and pct(g[i + 1][c]) is not None
                    for i, r in enumerate(g) for c, x in enumerate(r))
    return has_ratio_label or has_perf_pct or below_pct


def main():
    *srcs, out = sys.argv[1:]
    by_file = collections.defaultdict(list)
    errors = []
    for s in srcs:
        for line in open(s, encoding="utf-8"):
            r = json.loads(line)
            if "성적관리" in re.split(r"[\\/]", r["file"])[-1].replace(" ", ""):
                continue  # 학업성적 관리규정 파일 (띄어쓰기 변형 포함)
            if "error" in r:
                errors.append(r)
                continue
            by_file[(r["src"], r["file"])].append(r)
    units = []
    for (src, file), ts in by_file.items():
        ts.sort(key=lambda r: r["ti"])
        school = ts[0]["school"] if ts else ""
        cur = subject_from_filename(file)
        if bad_subject(tidy_subject(cur), school):
            cur = None
        cur_at, from_header, hdr, src_at, hdr_id = {}, {}, False, {}, {}
        cur_src, cur_hid = ("filename" if cur else None), None
        for i, r in enumerate(ts):
            h = tidy_subject(subject_from_header_table(r["grid"]) if r["grid"] else None)
            if not h and r["grid"] and r["grid"][0]:
                # 제목이 표 첫 줄 안에 있는 서식 ('2026학년도 2학기 [현대문학감상] 교수학습 및 평가계획')
                h = tidy_subject(subject_from_text(" ".join(dict.fromkeys(r["grid"][0]))))
            tx = tidy_subject(subject_from_text(r["ctx"]))
            if h and not bad_subject(h, school):
                cur, hdr, cur_src, cur_hid = h, True, "header", i
            elif tx and not bad_subject(tx, school):
                cur, hdr, cur_src, cur_hid = tx, False, "text", None
            cur_at[i], from_header[i], src_at[i], hdr_id[i] = cur, hdr, cur_src, cur_hid
        # 과목별 요약표(한 줄 = 한 과목): 줄마다 단위 하나
        sum_tables = set()
        for i, r in enumerate(ts):
            srows = summary_rows(r["grid"]) if r["grid"] else None
            if not srows or len(srows) < 2:
                continue
            # 요약표 인정 조건: 과목명처럼 보이는 줄이 2개 이상 검증을 통과해야 함
            n_ok = sum(1 for sn, res in srows if not validate(res, tidy_subject(sn)) and SUBJ_RE.search(sn or ""))
            if n_ok < 2:
                continue
            sum_tables.add(i)
            for subj_name, res in srows:
                subj_name = tidy_subject(subj_name)
                reasons = validate(res, None if bad_subject(subj_name, school) else subj_name)
                none = {"ok": False, "reasons": ["표 구조 해석 실패"], "result": None}
                units.append({"src": src, "school": r["school"], "file": file, "kind": r["kind"], "ti": f"{r['ti']}:{subj_name}",
                              "page": r["page"], "subject": subj_name, "grid": r["grid"], "sum_row": True,
                              "tried": {"COL": dict(none), "ROW": dict(none), "HEAD+KV": dict(none),
                                        "SUM": {"ok": not reasons, "reasons": reasons, "result": res}}})
        idx = [i for i, r in enumerate(ts) if r["grid"] and r["grid"][0] and i not in sum_tables and is_unit(r["grid"])]
        # 과목 하나짜리 파일(평가표 2개 이하)은 파일명 과목을 우선
        fn_subj = tidy_subject(subject_from_filename(file))
        if fn_subj and not bad_subject(fn_subj, school) and len(idx) <= 2:
            for i in idx:
                if not from_header.get(i):
                    cur_at[i], src_at[i] = fn_subj, "filename"
        used_hdr = set()
        for n, i in enumerate(idx):
            r = ts[i]
            g = r["grid"]
            subj_src = src_at.get(i) if cur_at.get(i) else "vocab"
            if subj_src == "header":
                if hdr_id.get(i) in used_hdr:
                    subj_src = "carried"  # 앞 과목의 머리 표가 이어진 것: 약한 근거
                else:
                    used_hdr.add(hdr_id.get(i))
            subj = tidy_subject(cur_at.get(i) or subject_from_vocab(r["ctx"]))
            if bad_subject(subj, school):
                subj, subj_src = None, None
            tried = {}
            for fam, fn in (("COL", fam_col), ("ROW", fam_row)):
                try:
                    res = fn(g)
                except Exception:  # noqa: BLE001
                    res = None
                tried[fam] = (res, validate(res, subj))
            nxt = idx[n + 1] if n + 1 < len(idx) else len(ts)
            head = fam_head(g)
            if head is not None:
                for j in range(i + 1, min(nxt, i + 15)):
                    it = kv_items(ts[j]["grid"])
                    if it:
                        head["items"].append(it)
            tried["HEAD+KV"] = (head, validate(head, subj))
            # 비율 표 + 뒤따르는 세부 표의 항목 행('평가영역 | 이름 (20%) | …'): 비율은 앞 표, 항목은 세부 표에서
            base = next((v[0] for v in (tried["COL"], tried["ROW"]) if v[0] and v[0].get("perf_total")), None)
            area = None
            if base is not None:
                for j in range(i, min(nxt, i + 4)):
                    its = area_items(ts[j]["grid"]) if ts[j]["grid"] else None
                    if its and abs(sum(x["weightPercent"] for x in its) - base["perf_total"]) <= 0.6:
                        area = {"perf_total": base["perf_total"], "exam_total": base.get("exam_total"), "items": its}
                        break
            tried["AREA"] = (area, validate(area, subj)) if area else (None, ["표 구조 해석 실패"])
            # 이 평가표 뒤 다음 평가표 전까지의 표: 수행평가 세부(과제·성취수준·채점 기준·유의사항). 최대 40개
            # 다음 과목의 머리 표(학년·과목명 표)나 다른 과목 제목이 나오면 끊는다
            details = []
            for j in range(i + 1, min(nxt, i + 41)):
                gj = ts[j]["grid"]
                if not gj:
                    continue
                hj = tidy_subject(subject_from_header_table(gj))
                if hj and not bad_subject(hj, school) and (not subj or norm(hj) != norm(subj)):
                    break
                details.append({"ti": ts[j]["ti"], "page": ts[j]["page"], "ctx": (ts[j].get("ctx") or "")[-200:], "grid": gj})
            units.append({"src": src, "school": r["school"], "file": file, "kind": r["kind"], "ti": r["ti"], "page": r["page"],
                          "subject": subj, "subject_src": subj_src, "grid": g, "details": details,
                          "tried": {k: {"ok": not v[1], "reasons": v[1], "result": v[0]} for k, v in tried.items()}})
    # 4차 게이트(KV): 평가표가 하나도 없는 파일에서 항목별 세부표를 과목별로 모은다.
    unit_files = {(u["src"], u["file"]) for u in units}
    for (src, file), ts in by_file.items():
        if (src, file) in unit_files:
            continue
        ts.sort(key=lambda r: r["ti"])
        school = ts[0]["school"] if ts else ""
        cur = tidy_subject(subject_from_filename(file))
        cur = None if bad_subject(cur, school) else cur
        groups, order_ = collections.OrderedDict(), []
        exam_pct = None
        for r in ts:
            g = r["grid"]
            if not g:
                continue
            h = tidy_subject(subject_from_header_table(g))
            tx = tidy_subject(subject_from_text(r["ctx"]))
            if h and not bad_subject(h, school):
                cur = h
            elif tx and not bad_subject(tx, school) and len(by_file[(src, file)]) > 30:
                cur = tx  # 여러 과목 합본 파일에서만 문장 머리글로 과목 전환
            for row in g:
                for x in row:
                    if is_exam(x) and not is_perf(x) and pct(x) is not None and exam_pct is None:
                        exam_pct = pct(x)
            it = kv_items(g)
            if it:
                key = cur or "_"
                if key not in groups:
                    groups[key] = {"items": [], "first": r}
                sig = (norm(it["label"]), it["weightPercent"], norm(it["timing"]))
                if sig not in {(norm(x["label"]), x["weightPercent"], norm(x["timing"])) for x in groups[key]["items"]}:
                    groups[key]["items"].append(it)
        for subj_key, grp in groups.items():
            items = grp["items"]
            s = sum(i["weightPercent"] for i in items)
            if abs(s - 100) <= 0.6:
                res = {"perf_total": 100.0, "exam_total": 0.0, "items": items}
            elif exam_pct is not None and abs(s + exam_pct - 100) <= 0.6:
                res = {"perf_total": s, "exam_total": exam_pct, "items": items}
            else:
                res = {"perf_total": None, "exam_total": exam_pct, "items": items}
            subj = None if subj_key == "_" else subj_key
            reasons = validate(res, subj)
            if res["perf_total"] is None:
                reasons = [f"세부표 항목 합({s:g})이 100도, 100-정기비율도 아님"] + [x for x in reasons if not x.startswith("수행 총비율")]
            r0 = grp["first"]
            none = {"ok": False, "reasons": ["표 구조 해석 실패"], "result": None}
            units.append({"src": src, "school": school, "file": file, "kind": r0["kind"], "ti": r0["ti"], "page": r0["page"],
                          "subject": subj, "grid": r0["grid"], "kv_group": True,
                          "tried": {"COL": dict(none), "ROW": dict(none), "HEAD+KV": dict(none),
                                    "KV": {"ok": not reasons, "reasons": reasons, "result": res}}})
    for u in units:
        u["tried"].setdefault("KV", {"ok": False, "reasons": ["표 구조 해석 실패"], "result": None})
        u["tried"].setdefault("SUM", {"ok": False, "reasons": ["표 구조 해석 실패"], "result": None})
        u["tried"].setdefault("AREA", {"ok": False, "reasons": ["표 구조 해석 실패"], "result": None})

    # 성취기준 코드 앞부분 -> 과목명 대응표를 학습. 학교 단위로 한 표씩만 세고(같은 학교 반복 억제),
    # 서로 다른 학교 3곳 이상이 같은 과목을 가리키고 70% 이상 일치할 때만 믿는다.
    def nsub(s):
        return re.sub(r"[\s·ㆍ‧･・]", "", s or "").replace("Ⅰ", "1").replace("Ⅱ", "2").replace("Ⅲ", "3")
    votes = collections.defaultdict(lambda: collections.defaultdict(set))
    disp = {}
    for u in units:
        if u["subject"]:
            for p in code_prefixes(u["grid"]):
                votes[p][nsub(u["subject"])].add(u["school"])
                disp.setdefault(nsub(u["subject"]), u["subject"])
    code_map = {}
    for p, c in votes.items():
        best = max(c.items(), key=lambda kv: len(kv[1]))
        tot = sum(len(v) for v in c.values())
        if len(best[1]) >= 3 and len(best[1]) >= 0.7 * tot:
            code_map[p] = disp[best[0]]
    # 고정 대응표: 기준 파일(code_map_base.json)이 있으면 기존 코드는 그 값을 쓰고, 새 코드만 이번 데이터에서 추가.
    base_path = os.environ.get("CODE_MAP_BASE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "code_map_base.json"))
    if os.path.exists(base_path):
        base = json.load(open(base_path, encoding="utf-8"))
        code_map = {**code_map, **base}
    elif os.environ.get("WRITE_CODE_MAP_BASE") == "1":
        json.dump(code_map, open(base_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    filled = changed = 0
    for u in units:
        cp = code_prefixes(u["grid"])
        hit = next((code_map[p] for p, _ in cp.most_common() if p in code_map), None)
        if not hit or (u["subject"] and nsub(u["subject"]) == nsub(hit)):
            continue
        if u["subject"] and u.get("subject_src") in ("header", "filename"):
            continue  # 머리 표·파일명에서 온 과목명은 코드로 덮어쓰지 않음
        if u["subject"]:
            changed += 1
            u["subject_before_code"] = u["subject"]
        else:
            filled += 1
        u["subject"], u["subject_from"] = hit, "code_map"
        for k, v in u["tried"].items():
            v["reasons"] = validate(v["result"], hit)
            v["ok"] = not v["reasons"]
    # 단어 목록(vocab)에서만 온 과목명은 성취기준 코드로 확인되지 않으면 버린다 (기본 꺼짐: STRICT_VOCAB=1 로 켬)
    dropped = 0
    if os.environ.get("STRICT_VOCAB", "0") == "1":
        for u in units:
            if u["subject"] and u.get("subject_src") == "vocab" and u.get("subject_from") != "code_map":
                u["subject"], u["subject_src"] = None, None
                dropped += 1
                for k, v in u["tried"].items():
                    v["reasons"] = validate(v["result"], None) if v["result"] is not None else v["reasons"]
                    v["ok"] = not v["reasons"]
    print("code_map entries", len(code_map), "filled from codes", filled, "overridden by codes", changed, "vocab dropped", dropped)
    json.dump({"units": units, "file_errors": errors}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print("files", len(by_file), "units", len(units), "file_errors", len(errors))


if __name__ == "__main__":
    main()
