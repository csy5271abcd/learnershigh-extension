import type { ReferenceArea, ReferenceSource } from '../types.ts'

// 과목별 참고자료 자료원 카탈로그 (Mock, 2026-10-28 사용자 요청).
// 원본: references/reference-link/learnershigh-assessment-subject-reference-links.md (2026-10-28 작성 기준, 읽기 전용).
// - 자료원 24곳 = 원본 표 1의 22곳(original) + 표 3의 추가 2곳(additional). 같은 자료원은 한 번만 두고 영역으로 연결한다.
// - name·url·primaryUsage·nature는 원본 표 그대로. category(탐색 분류)는 원본 "자료 성격"을 LearnersHigh가 6개로 묶은 화면용 분류다.
// - 영역별 활용(usage)은 원본 §2 문장 그대로. 링크는 대표 홈페이지·채널이며 개별 기사·논문 주소가 아니다.
// - 서버 응답 계약은 없다 (P-24 PROPOSED). 검색 API·원문 수집 권한도 없다 (원본 §4).

export const referenceSourcesBasis = { document: 'learnershigh-assessment-subject-reference-links.md', checkedOn: '2026-10-28' } as const

export const fixtureReferenceSources: ReferenceSource[] = [
  { sourceId: 'ref_01', name: '국립국어원', url: 'https://www.korean.go.kr/', primaryUsage: '국어 규범, 문법, 어휘, 표현 검증', nature: '공공기관', category: '공식 기관', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_02', name: '국립중앙도서관', url: 'https://www.nl.go.kr/', primaryUsage: '도서·학위논문·고문헌·디지털 자료 검색', nature: '국립도서관', category: '공식 기관', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_03', name: 'RISS 학술연구정보서비스', url: 'https://www.riss.kr/', primaryUsage: '학술논문·학위논문·학술자료 검색', nature: '학술검색', category: '논문·학술', accessNotes: '검색과 원문 열람 범위는 자료·기관 인증·구독 상태에 따라 달라질 수 있어요.', sourceGroup: 'original' },
  { sourceId: 'ref_04', name: 'DBpia', url: 'https://www.dbpia.co.kr/', primaryUsage: '국내 학술논문 및 학술지 검색', nature: '학술 DB (일부 유료/기관인증)', category: '논문·학술', accessNotes: '일부 유료·기관 인증이 필요해요.', sourceGroup: 'original' },
  { sourceId: 'ref_05', name: '뉴닉 NEWNEEK', url: 'https://newneek.co/', primaryUsage: '사회·경제·정책·시사 이슈 파악', nature: '시사 콘텐츠', category: '뉴스·시사', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_06', name: '크랩 KLAB', url: 'https://www.youtube.com/channel/UCoxT1kQSLq564FwpK473w-g', primaryUsage: '사회 현상·산업·경제·기술 관련 설명 영상', nature: '영상 채널', category: '영상·다큐', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_07', name: '알지오매스 AlgeoMath', url: 'https://www.algeomath.kr/', primaryUsage: '함수·그래프·도형·수학적 시각화 및 탐구', nature: '수학 교육 도구', category: '교육 도구·포털', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_08', name: 'KOSIS 국가통계포털', url: 'https://kosis.kr/', primaryUsage: '정부 승인통계, 지표, 통계표와 그래프', nature: '공공 통계', category: '통계·데이터', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_09', name: 'ScienceON', url: 'https://scienceon.kisti.re.kr/', primaryUsage: '과학기술 논문·연구보고서·특허·연구정보 검색', nature: '과학기술 학술정보', category: '논문·학술', accessNotes: '검색과 원문 열람 범위는 자료·기관 인증·구독 상태에 따라 달라질 수 있어요.', sourceGroup: 'original' },
  { sourceId: 'ref_10', name: '연합뉴스', url: 'https://www.yna.co.kr/', primaryUsage: '국내외 사회·정치·경제·과학 이슈', nature: '언론사', category: '뉴스·시사', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_11', name: 'KBS 뉴스', url: 'https://news.kbs.co.kr/', primaryUsage: '사회·정치·경제 뉴스, 취재 영상', nature: '언론사', category: '뉴스·시사', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_12', name: '공공데이터포털', url: 'https://www.data.go.kr/', primaryUsage: '공공 데이터셋, 파일 자료 및 개방 API 탐색', nature: '공공데이터', category: '통계·데이터', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_13', name: '사이언스올 ScienceAll', url: 'https://www.scienceall.com/', primaryUsage: '과학 원리·용어·교육 영상·탐구 아이디어', nature: '과학문화·교육', category: '교육 도구·포털', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_14', name: '사이언스타임즈 The Science Times', url: 'https://www.sciencetimes.co.kr/', primaryUsage: '과학기술 연구동향·과학 뉴스', nature: '과학 뉴스', category: '뉴스·시사', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_15', name: 'YTN 사이언스', url: 'https://science.ytn.co.kr/', primaryUsage: '과학 뉴스·실험·다큐·교육 영상', nature: '방송·과학 교육', category: '영상·다큐', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_16', name: 'EBS 다큐', url: 'https://www.youtube.com/@EBSDocumentary', primaryUsage: '과학·사회·역사·생명과학 관련 다큐멘터리', nature: '교육방송 채널', category: '영상·다큐', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_17', name: '한국화학연구원 KRICT', url: 'https://www.krict.re.kr/', primaryUsage: '화학 연구성과·기술 동향·연구기관 정보', nature: '정부출연연구기관', category: '공식 기관', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_18', name: '한국생명공학연구원 KRIBB', url: 'https://www.kribb.re.kr/kor/main/main.jsp', primaryUsage: '생명공학·바이오 연구성과 및 연구정보', nature: '정부출연연구기관', category: '공식 기관', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_19', name: 'SW중심사회', url: 'https://new.software.kr/home/kor/main.do', primaryUsage: 'SW·AI 교육·정책·뉴스·학습 콘텐츠', nature: 'SW·AI 교육 포털', category: '교육 도구·포털', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_20', name: '국사편찬위원회', url: 'https://www.history.go.kr/', primaryUsage: '한국사 관련 연구·사료 및 관련 역사정보', nature: '공공기관', category: '공식 기관', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_21', name: '국가기록원', url: 'https://www.archives.go.kr/', primaryUsage: '정부 기록물·사진·공식 사료 검색', nature: '국가 기록기관', category: '공식 기관', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_22', name: 'KBS 다큐', url: 'https://www.youtube.com/channel/UC4LW3sOslC14Vn5bcoNUBkg', primaryUsage: '한국사·사회·과학·인물·생활문화 다큐멘터리', nature: '방송 채널', category: '영상·다큐', accessNotes: null, sourceGroup: 'original' },
  { sourceId: 'ref_23', name: '전자신문', url: 'https://www.etnews.com/', primaryUsage: 'IT·AI 뉴스', nature: '언론사 (추가 자료원)', category: '뉴스·시사', accessNotes: null, sourceGroup: 'additional' },
  { sourceId: 'ref_24', name: 'ZDNet Korea', url: 'https://zdnet.co.kr/', primaryUsage: 'IT·AI 뉴스', nature: '언론사 (추가 자료원)', category: '뉴스·시사', accessNotes: null, sourceGroup: 'additional' },
]

/** 원본 §2 과목 영역별 추천 자료원과 활용 방법 (순서·문장 그대로) */
export const fixtureReferenceAreas: ReferenceArea[] = [
  {
    areaKey: 'korean',
    label: '국어·문학',
    sources: [
      { sourceId: 'ref_01', usage: '어문 규범, 문법·어휘, 표현의 정확성 검토' },
      { sourceId: 'ref_02', usage: '문학 작품·작가·비평 자료 및 소장 문헌 탐색' },
      { sourceId: 'ref_03', usage: '문학·언어·미디어 관련 논문 검색' },
      { sourceId: 'ref_04', usage: '문학·언어·미디어 관련 논문 검색' },
      { sourceId: 'ref_05', usage: '논설문·비판적 매체 읽기에서 활용할 현대 사회 사례 탐색' },
      { sourceId: 'ref_06', usage: '논설문·비판적 매체 읽기에서 활용할 현대 사회 사례 탐색' },
    ],
    tips: [],
  },
  {
    areaKey: 'math',
    label: '수학',
    sources: [
      { sourceId: 'ref_07', usage: '함수, 그래프, 기하 도형의 탐구·시각화' },
      { sourceId: 'ref_08', usage: '실제 통계값을 이용한 표본 분석·그래프 작성' },
      { sourceId: 'ref_09', usage: '수학적 모델링·응용 연구자료 검색' },
    ],
    tips: ['통계 관련 기사·교육 영상은 KOSIS 원자료와 교차 확인해 사용'],
  },
  {
    areaKey: 'social',
    label: '사회·정치·경제',
    sources: [
      { sourceId: 'ref_05', usage: '주제 배경 이해와 탐구 질문 발굴' },
      { sourceId: 'ref_06', usage: '주제 배경 이해와 탐구 질문 발굴' },
      { sourceId: 'ref_10', usage: '해당 쟁점의 보도 내용 및 사례 비교' },
      { sourceId: 'ref_11', usage: '해당 쟁점의 보도 내용 및 사례 비교' },
      { sourceId: 'ref_08', usage: '사회·경제 지표와 공식 통계' },
      { sourceId: 'ref_12', usage: '정책·지역·환경 등 공공 데이터셋 탐색' },
    ],
    tips: [],
  },
  {
    areaKey: 'science',
    label: '과학·물리',
    sources: [
      { sourceId: 'ref_13', usage: '교과 개념·과학 원리·생활 속 적용 사례' },
      { sourceId: 'ref_14', usage: '새로운 연구와 과학기술 이슈' },
      { sourceId: 'ref_15', usage: '과학 실험·현상·다큐 영상' },
      { sourceId: 'ref_16', usage: '과학 실험·현상·다큐 영상' },
      { sourceId: 'ref_09', usage: '보고서나 발표에 사용할 전문 연구 근거' },
    ],
    tips: [],
  },
  {
    areaKey: 'chemistry',
    label: '화학',
    sources: [
      { sourceId: 'ref_17', usage: '국내 화학 연구성과·기술 응용 사례' },
      { sourceId: 'ref_13', usage: '반응·물질·환경화학 관련 기초 개념' },
      { sourceId: 'ref_09', usage: '화학 논문·연구보고서' },
      { sourceId: 'ref_14', usage: '화학·재료·환경 분야 연구동향' },
    ],
    tips: [],
  },
  {
    areaKey: 'biology',
    label: '생명과학',
    sources: [
      { sourceId: 'ref_18', usage: '바이오·생명공학 연구성과' },
      { sourceId: 'ref_09', usage: '생명과학 관련 연구자료' },
      { sourceId: 'ref_16', usage: '생물·생태·의학 관련 영상 자료' },
      { sourceId: 'ref_14', usage: '생명과학·의학 분야 뉴스' },
    ],
    tips: [],
  },
  {
    areaKey: 'software',
    label: '정보·소프트웨어',
    sources: [
      { sourceId: 'ref_19', usage: 'SW·AI 관련 교육 콘텐츠·뉴스·사례' },
      { sourceId: 'ref_05', usage: 'AI 기술의 사회적 영향, 산업 이슈' },
      { sourceId: 'ref_06', usage: 'AI 기술의 사회적 영향, 산업 이슈' },
      { sourceId: 'ref_12', usage: '데이터 분석·시각화·SW 프로젝트용 공개 데이터' },
      { sourceId: 'ref_23', usage: 'IT·AI 뉴스 (추가 자료원)' },
      { sourceId: 'ref_24', usage: 'IT·AI 뉴스 (추가 자료원)' },
    ],
    tips: [],
  },
  {
    areaKey: 'history',
    label: '역사',
    sources: [
      { sourceId: 'ref_20', usage: '한국사 연구·사료의 출발점' },
      { sourceId: 'ref_21', usage: '기록물·공문서·역사 사진 등 1차 자료' },
      { sourceId: 'ref_02', usage: '역사 관련 도서·고문헌·문헌 검색' },
      { sourceId: 'ref_22', usage: '시대·인물·사건에 관한 다큐멘터리' },
      { sourceId: 'ref_16', usage: '시대·인물·사건에 관한 다큐멘터리' },
    ],
    tips: [],
  },
]
