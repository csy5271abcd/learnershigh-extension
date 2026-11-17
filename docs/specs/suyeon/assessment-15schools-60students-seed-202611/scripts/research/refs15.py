"""수행평가 유형(템플릿)별 15개교 평가계획서 근거 쪽 찾기. 출력: argv[1] (ASSESSMENT-REFERENCE-SOURCES.json)"""
import json, os, re, sys, collections
T = {
 'kor-critique': ('국어','비평문|비평하는글|작품비평'), 'kor-reading': ('국어','서평|독서감상문|주제탐구독서'), 'kor-debate': ('국어','논증하는글|토론하기|토론및논술'), 'kor-media': ('국어','매체자료|매체분석'),
 'math-process': ('수학','풀이과정|문제해결과정'), 'math-model': ('수학','수학적모델링|모델링'), 'math-stats': ('수학','통계적탐구|통계자료|자료분석'), 'math-concept': ('수학','개념탐구|수학탐구발표'),
 'eng-speech': ('영어','영어발표|말하기평가|스피치|speech'), 'eng-essay': ('영어','에세이|essay|영작문'), 'eng-reading': ('영어','원서읽기|책읽기|독서기록'), 'eng-debate': ('영어','영어토론|debate'),
 'soc-issue': ('사회','사회문제|조사보고서'), 'soc-debate': ('사회','시사|쟁점토론'), 'soc-data': ('사회','정책비교|통계자료분석|자료분석'), 'soc-history': ('사회','인물탐구|역사인물|역사적사건'),
 'sci-design': ('과학','실험설계|실험보고서'), 'sci-inquiry': ('과학','탐구보고서|주제탐구'), 'sci-analysis': ('과학','실험결과|결과분석|탐구발표'), 'sci-observe': ('과학','관찰탐구|삼투|관찰하기'),
 'info-program': ('정보','프로그래밍|프로그램작성|코딩'), 'info-data': ('정보','데이터분석|데이터수집'), 'info-ethics': ('정보','정보윤리|저작권'),
 'pe-skill': ('체육','실기평가|실기'), 'pe-plan': ('체육','체력관리|건강관리계획|운동계획'),
 'art-make': ('예술','작품제작|작품만들기'), 'art-critique': ('예술','감상문|감상및비평|감상비평'), 'art-perform': ('예술','연주|가창|합주|창작'),
 'tech-project': ('기술·가정','문제해결프로젝트|생활문제|프로젝트'),
 'lang-speak': ('제2외국어','회화|말하기'), 'lang-culture': ('제2외국어','문화탐구|문화발표|문화소개'),
 'gen-career': ('교양','진로탐색|진로보고서|직업탐구'), 'gen-essay': ('교양','논술문|논술'), 'gen-psych': ('교양','심리탐구|심리학'),
}
idx=[json.loads(l) for l in open('text15/index.jsonl',encoding='utf-8')]
pats={k:re.compile(v[1],re.I) for k,v in T.items()}
hits=collections.defaultdict(dict)  # key -> school -> evidence
counts=collections.defaultdict(collections.Counter)
for r in idx:
  text=open('text15/'+r['textId']+'.txt',encoding='utf-8').read()
  for pno,page in enumerate(text.split('\f'),1):
    n=re.sub(r'\s+','',page)
    if '수행' not in n and '평가' not in n: continue
    for k,p in pats.items():
      m=p.search(n)
      if not m: continue
      counts[k][r['school']]+=1
      if r['school'] in hits[k]: continue
      g=r['grade']
      if g is None:
        gm=None
        for gm in re.finditer(r'([123])학년',n[:m.start()]): pass
        g=int(gm.group(1)) if gm else None
      snippet=n[max(0,m.start()-18):m.end()+18]
      if re.search(r'교감|교장|결재',snippet): snippet='(결재란 인접 — 인명 보호를 위해 생략)'
      hits[k][r['school']]=dict(school=r['school'],schoolId=r['schoolId'],grade=g,semester=r['semester'],page=pno,
        folder=os.path.dirname(r['rel']),sha256Prefix=r['sha256'][:12],format=r['magic'],matched=m.group(0),snippet=snippet)
out={'note':'수행평가 유형 참고 근거. 쪽 번호는 추출 텍스트의 페이지(PDF 물리 쪽 / HWP·HWPX는 구역 순번)이며 인쇄 쪽이 아니다. 학생에게 배정한 날짜·상태·내용은 합성이다. 파일명은 교사명 포함 가능성 때문에 적지 않고 폴더·SHA-256 앞 12자리로 식별한다.',
     'templates':{}}
for k,(group,kw) in T.items():
  ev=sorted(hits[k].values(),key=lambda e:-counts[k][e['school']])
  out['templates'][k]={'subjectGroup':group,'keywords':kw.split('|'),'schoolsMatched':len(ev),'pageMatchesBySchool':dict(counts[k]),'evidence':ev[:6]}
json.dump(out,open(sys.argv[1],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
for k,v in out['templates'].items(): print(k,v['schoolsMatched'],'|',' ; '.join(f"{e['school']} {e['grade']}-{e['semester']} p{e['page']} «{e['snippet']}»" for e in v['evidence'][:2]))
