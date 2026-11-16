"""15개교 추출 텍스트 → 학교·학년·학기별 과목 출현 + 수행평가 항목 후보(근거 쪽). 결과: scratchpad/analysis15.json"""
import collections, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
TXT = os.path.join(HERE, "text15")

G = {  # 과목 사전: (교과군, 교육과정)
    "국어": ["공통국어1", "공통국어2", "화법과 언어", "독서와 작문", "문학", "주제 탐구 독서", "문학과 영상", "직무 의사소통",
            "독서 토론과 글쓰기", "매체 의사소통", "언어생활 탐구", "화법과 작문", "독서", "언어와 매체", "심화 국어", "고전 읽기", "실용 국어"],
    "수학": ["공통수학1", "공통수학2", "기본수학1", "기본수학2", "대수", "미적분Ⅰ", "미적분Ⅱ", "확률과 통계", "기하", "경제 수학",
            "인공지능 수학", "직무 수학", "수학과 문화", "실용 통계", "수학과제 탐구", "수학Ⅰ", "수학Ⅱ", "미적분", "고급 수학Ⅰ", "고급 수학Ⅱ", "실용 수학"],
    "영어": ["공통영어1", "공통영어2", "기본영어1", "기본영어2", "영어Ⅰ", "영어Ⅱ", "영어 독해와 작문", "영미 문학 읽기", "영어 발표와 토론",
            "심화 영어", "심화 영어 독해와 작문", "직무 영어", "실생활 영어 회화", "미디어 영어", "세계 문화와 영어", "영어 회화", "진로 영어",
            "심화 영어Ⅰ", "심화 영어Ⅱ", "심화 영어 독해Ⅰ", "심화 영어 독해Ⅱ", "심화 영어 회화Ⅰ", "영어권 문화"],
    "사회": ["한국사1", "한국사2", "한국사", "통합사회1", "통합사회2", "통합사회", "세계시민과 지리", "사회와 문화", "세계사", "현대사회와 윤리",
            "한국지리 탐구", "도시의 미래 탐구", "동아시아 역사 기행", "정치", "법과 사회", "경제", "윤리와 사상", "인문학과 윤리", "국제 관계의 이해",
            "여행지리", "역사로 탐구하는 현대 세계", "사회문제 탐구", "금융과 경제생활", "윤리문제 탐구", "기후변화와 지속가능한 세계",
            "한국지리", "세계지리", "동아시아사", "정치와 법", "사회·문화", "생활과 윤리", "고전과 윤리"],
    "과학": ["통합과학1", "통합과학2", "통합과학", "과학탐구실험1", "과학탐구실험2", "과학탐구실험", "물리학", "화학", "생명과학", "지구과학",
            "역학과 에너지", "전자기와 양자", "물질과 에너지", "화학 반응의 세계", "세포와 물질대사", "생물의 유전", "지구시스템과학",
            "행성우주과학", "과학의 역사와 문화", "기후변화와 환경생태", "융합과학 탐구", "물리학Ⅰ", "물리학Ⅱ", "화학Ⅰ", "화학Ⅱ",
            "생명과학Ⅰ", "생명과학Ⅱ", "지구과학Ⅰ", "지구과학Ⅱ", "고급 물리학", "고급 화학", "고급 생명과학", "고급 지구과학", "과학사",
            "생활과 과학", "융합과학", "과학과제 연구", "물리학 실험", "화학 실험", "생명과학 실험", "지구과학 실험"],
    "체육": ["체육1", "체육2", "체육", "운동과 건강", "스포츠 문화", "스포츠 과학", "스포츠 생활", "스포츠 생활1", "스포츠 생활2", "체육 탐구"],
    "예술": ["음악", "미술", "연극", "음악 연주와 창작", "음악 감상과 비평", "미술 창작", "미술 감상과 비평", "음악 연주", "음악과 미디어", "미술과 매체"],
    "기술·가정/정보": ["기술·가정", "정보", "인공지능 기초", "데이터 과학", "소프트웨어와 생활", "프로그래밍", "로봇과 공학세계", "생활과학 탐구", "정보과학"],
    "제2외국어/한문": ["중국어", "일본어", "중국어Ⅰ", "일본어Ⅰ", "중국어 회화", "일본어 회화", "한문", "한문Ⅰ", "독일어", "스페인어", "프랑스어"],
    "교양": ["진로와 직업", "인간과 철학", "논리와 사고", "인간과 심리", "교육의 이해", "삶과 종교", "보건", "인간과 경제활동", "논술", "심리학",
            "교육학", "철학", "환경", "생태와 환경"],
}
V2015 = {"화법과 작문", "독서", "언어와 매체", "고전 읽기", "수학Ⅰ", "수학Ⅱ", "미적분", "고급 수학Ⅰ", "고급 수학Ⅱ", "실용 수학", "영어 회화",
         "진로 영어", "심화 영어Ⅰ", "심화 영어Ⅱ", "심화 영어 독해Ⅰ", "심화 영어 독해Ⅱ", "심화 영어 회화Ⅰ", "영어권 문화", "한국사", "통합사회",
         "한국지리", "세계지리", "동아시아사", "정치와 법", "사회·문화", "생활과 윤리", "고전과 윤리", "통합과학", "과학탐구실험", "물리학Ⅰ", "물리학Ⅱ",
         "화학Ⅰ", "화학Ⅱ", "생명과학Ⅰ", "생명과학Ⅱ", "지구과학Ⅰ", "지구과학Ⅱ", "고급 물리학", "고급 화학", "고급 생명과학", "고급 지구과학",
         "과학사", "생활과 과학", "융합과학", "과학과제 연구", "물리학 실험", "화학 실험", "생명과학 실험", "지구과학 실험", "체육", "스포츠 생활",
         "체육 탐구", "음악 연주", "미술 창작", "프로그래밍", "중국어Ⅰ", "일본어Ⅰ", "한문Ⅰ", "심리학", "교육학", "철학", "환경", "정보과학"}
# 본문에서 일반 단어로도 쓰여 오탐이 많은 이름: 과목 머리 문맥에서만 센다.
GENERIC = {"정보", "경제", "정치", "환경", "보건", "논술", "음악", "미술", "체육", "문학", "화학", "물리학", "생명과학", "지구과학", "대수", "기하",
           "한문", "연극", "독서", "철학", "세계사", "한국사", "미적분", "통합사회", "통합과학", "과학탐구실험", "중국어", "일본어"}
GENERIC_CTX = re.compile(r"(과목명?|교과목|과목\s*[:：]|\d학년|학기)")


def norm(s):
    s = re.sub(r"\s+", "", s)
    s = s.replace("·", "·").replace("ㆍ", "·").replace("∙", "·").replace("・", "·")
    s = re.sub(r"(?<=[가-힣])(II|Ⅱ|2)(?![0-9])", "Ⅱ", s)
    s = re.sub(r"(?<=[가-힣])(I|Ⅰ|1)(?![0-9Ⅰ])", "Ⅰ", s)
    return s


ALIASES = []  # (alias_norm, canonical)
for group, names in G.items():
    for n in names:
        ALIASES.append((norm(n), n, group))
ALIASES.sort(key=lambda a: -len(a[0]))
PAT = re.compile("|".join(re.escape(a[0]) for a in ALIASES))
BY_ALIAS = {a[0]: (a[1], a[2]) for a in ALIASES}

KW = re.compile(r"(보고서|발표|실험|토론|논술|서평|감상문|비평|에세이|말하기|글쓰기|쓰기|포트폴리오|프로젝트|탐구|실기|작품|창작|모델링|프로그래밍|카드\s*뉴스|조사|수필|연주|가창|그리기|구술|면접|독후|일지|관찰|설계|제작|소논문|프레젠테이션|읽기)")
NOISE = re.compile(r"(성취기준|성취수준|교수학습|운영\s*계획|평가\s*기준|유의\s*사항|채점|결시|인정점|반영\s*비율|만점|기본\s*점수|[0-9]{3,}|http|※|▶|○|문항|정답)")


def grade_near(stripped, pos):
    m = None
    for m2 in re.finditer(r"([123])학년", stripped[max(0, pos - 400):pos]):
        m = m2
    return int(m.group(1)) if m else None


def main():
    idx = [json.loads(l) for l in open(os.path.join(TXT, "index.jsonl"), encoding="utf-8")]
    slot_counts = collections.defaultdict(lambda: collections.Counter())  # (school, g, s) -> Counter(subject)
    slot_files = collections.defaultdict(set)
    items = collections.defaultdict(list)  # subject -> [(school, g, s, label, page, file)]
    for r in idx:
        text = open(os.path.join(TXT, r["textId"] + ".txt"), encoding="utf-8").read()
        pages = text.split("\f")
        fname_norm = norm(r["fileName"])
        file_subjects = [BY_ALIAS[m.group(0)][0] for m in PAT.finditer(fname_norm)]
        last_subject = file_subjects[0] if len(file_subjects) == 1 else None
        for pno, page in enumerate(pages, 1):
            stripped = norm(page)
            masked = stripped
            for m in PAT.finditer(stripped):
                name, group = BY_ALIAS[m.group(0)]
                if name in GENERIC:
                    ctx = stripped[max(0, m.start() - 12):m.end() + 12]
                    if not GENERIC_CTX.search(ctx):
                        continue
                g = r["grade"] or grade_near(stripped, m.start())
                s = r["semester"]
                if g and s:
                    slot_counts[(r["schoolId"], g, s)][name] += 1
                    slot_files[(r["schoolId"], g, s)].add(r["rel"])
            # 수행평가 항목 후보: 원문 줄을 2칸 이상 공백으로 나눈 짧은 조각
            for line in page.splitlines():
                ln = norm(line)
                for m in PAT.finditer(ln):
                    last_subject = BY_ALIAS[m.group(0)][0]
                for seg in re.split(r"\s{2,}|\t|\|", line):
                    seg = seg.strip(" ·-•:()[]")
                    if 3 <= len(seg) <= 26 and KW.search(seg) and not NOISE.search(seg) and re.search(r"[가-힣]{2}", seg) and last_subject:
                        g = r["grade"] or grade_near(norm(page), len(norm(page)) // 2)
                        items[last_subject].append(dict(school=r["school"], grade=g, semester=r["semester"], label=re.sub(r"\s+", " ", seg),
                                                        page=pno, rel=r["rel"], format=r["magic"]))
    out = {"slots": {}, "items": {}}
    for (sid, g, s), c in sorted(slot_counts.items()):
        out["slots"][f"{sid}|{g}|{s}"] = {"subjects": dict(c.most_common()), "files": sorted(slot_files[(sid, g, s)])}
    for subj, lst in items.items():
        lab = collections.Counter(x["label"] for x in lst)
        top = []
        for label, n in lab.most_common(25):
            ev = next(x for x in lst if x["label"] == label)
            top.append(dict(label=label, count=n, evidence=ev))
        out["items"][subj] = top
    json.dump(out, open(os.path.join(HERE, "analysis15.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # 요약 출력: (학년,학기) -> 과목별 학교 수 (학교 슬롯 내 3회 이상)
    agg = collections.defaultdict(collections.Counter)
    for (sid, g, s), c in slot_counts.items():
        for name, n in c.items():
            if n >= 3:
                agg[(g, s)][name] += 1
    for k in sorted(agg):
        print(k, ", ".join(f"{n}:{v}" for n, v in agg[k].most_common()))


if __name__ == "__main__":
    main()
