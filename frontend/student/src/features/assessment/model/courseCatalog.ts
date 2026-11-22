// A27-UX — 범용 고등학교 과목 검색 후보 카탈로그 (관리자 과목 확인·학생 수행평가 추가가 함께 쓴다. 관리자 쪽 model/courseCatalog.ts는 이 파일을 다시 내보낸다).
//
// - 특정 학교에 종속되지 않는 **검색 후보**다. 화면에는 과목명만 보이고 근거·출처는 보이지 않는다.
// - 근거(basis, 내부 검증용): 'plan-toc-2026' = 2026학년도 고교 평가계획서 6개(1~3학년 × 1·2학기) 목차에서 확인한 과목명,
//   'curriculum-2022' = 2022 개정 교육과정 고교학점제 공식 과목 안내의 선택과목(국어·수학·사회 일부). 공식 자료로 확인한 것만 넣었다.
// - 학생 화면(A27-UX 학생, 2026-11-19): 수강 과목에 없는 후보를 고르면 서버가 학생 개인 과목으로 더한다(§12-a) — 학교 공식 목록은 그대로.
// - **후보에 있다고 학교 과목이 되는 것이 아니다.** 실제 연결은 문서 슬롯(학교·학년도·학년·학기)의 학업 과목(§38-4, subjectId)만 가능하고,
//   서버도 확정 때 같은 원천으로 검사한다. 학교 과목에 없는 후보는 '연결 가능한 학교 과목 없음'으로만 보이고 고를 수 없다.
// - 이름이 비슷해도(예: '사회와 문화' / '사회·문화', 2022·2015 개정 공존) 같은 과목으로 합치지 않는다. 검색 별칭은 찾기 편의일 뿐이다.
// - 학년 구분: 1학년은 1·2학기 합집합, 2·3학년은 2·3학년 1·2학기 합집합 + 선택과목(2학년이 3학년 문서 과목을 듣는 경우가 있어 막지 않는다).

export type CourseBand = 'G1' | 'G2_3'

export interface CourseCandidate {
  /** 화면 표시·검색 기준 이름 */
  name: string
  band: CourseBand
  /** 원문 표기가 다르면 그대로 보존(검색 별칭으로도 쓴다) */
  rawNames?: string[]
  /** 공동교육과정 강좌 */
  joint?: boolean
  /** 내부 검증용 근거 — 화면에 표시하지 않는다 */
  basis: 'plan-toc-2026' | 'curriculum-2022'
}

const toc = (band: CourseBand, names: string[]): CourseCandidate[] =>
  names.map((raw) => {
    const joint = raw.startsWith('(공동)')
    const name = joint ? raw.slice('(공동)'.length) : raw
    return { name, band, ...(joint ? { joint: true, rawNames: [raw] } : {}), basis: 'plan-toc-2026' as const }
  })

const variant = (name: string, rawNames: string[], band: CourseBand): CourseCandidate => ({ name, band, rawNames, basis: 'plan-toc-2026' })

const G1 = toc('G1', [
  '공통국어1', '공통국어2', '공통수학1', '공통수학2', '공통영어1', '공통영어2', '한국사1', '한국사2',
  '통합사회1', '통합사회2', '통합과학1', '통합과학2', '과학탐구실험1', '과학탐구실험2', '체육1', '체육2',
  '음악', '미술', '정보', '인간과 철학', '(공동)인간과 심리',
])

const G2_3 = [
  ...toc('G2_3', [
    '문학', '대수', '영어Ⅰ', '운동과 건강', '중국어', '일본어', '데이터 과학', '미적분Ⅰ', '세계사', '정치', '현대사회와 윤리',
    '기후변화와 지속 가능한 세계', '물리학', '화학', '생명과학', '지구과학', '(공동)인공지능을 위한 선형대수학',
    '(공동)인공지능 생물정보학 기초와 활용', '(공동)국제법',
    '화법과 언어', '확률과 통계', '영어Ⅱ', '스포츠 생활1', '중국문화', '일본문화', '프로그래밍', '미적분Ⅱ', '한국지리 탐구',
    '사회와 문화', '경제', '윤리와 사상', '역학과 에너지', '전자기와 양자', '물질과 에너지', '화학반응의 세계', '세포와 물질대사',
    '생물의 유전', '지구시스템과학', '행성우주과학', '(공동)미디어콘텐츠 일반',
    '독서', '심화영어Ⅰ', '심화국어', '고급수학Ⅰ', '기하', '수학과제탐구', '심화영어독해Ⅰ', '세계지리', '사회·문화', '물리학Ⅱ',
    '화학Ⅱ', '생명과학Ⅱ', '지구과학Ⅱ', '사회문제탐구', '음악연주', '미술창작', '철학', '(자연)논술', '(인문)논술',
    '지역이해', '국제관계와 국제기구', '한국 사회의 이해', '고급물리학', '고급화학', '고급생명과학', '고급지구과학',
  ]),
  // 원문 표기가 문서마다 달랐던 과목(이름은 띄어 쓴 표기로, 원문 표기는 별칭으로 보존)
  variant('동아시아 역사 기행', ['동아시아사 역사기행'], 'G2_3'),
  variant('생활과 과학', ['생활과과학'], 'G2_3'),
  variant('스포츠 생활', ['스포츠생활'], 'G2_3'),
  variant('인공지능 기초', ['인공지능기초'], 'G2_3'),
  // 2022 개정 교육과정 공식 선택과목(검색 보완 후보)
  ...(['독서와 작문', '주제 탐구 독서', '문학과 영상', '독서 토론과 글쓰기', '매체 의사소통', '언어생활 탐구',
    '경제 수학', '인공지능 수학', '직무 수학', '수학과 문화', '실용 통계',
    '세계시민과 지리', '도시의 미래 탐구', '법과 사회', '국제 관계의 이해', '여행지리', '금융과 경제생활', '윤리문제 탐구',
  ].map((name): CourseCandidate => ({ name, band: 'G2_3', basis: 'curriculum-2022' }))),
]

/** 검색 후보 전체(이름 중복 없음). 학교별 확정 목록이 아니다 */
export const COURSE_CATALOG: readonly CourseCandidate[] = dedupe([...G1, ...G2_3])

function dedupe(items: CourseCandidate[]): CourseCandidate[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.band}|${item.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 문서 학년 → 후보 묶음 (1학년: 1학년 / 2·3학년: 2·3학년 통합). 학년을 모르면 전체 */
export function courseCandidatesFor(grade: number | null | undefined): CourseCandidate[] {
  if (grade === 1) return COURSE_CATALOG.filter((item) => item.band === 'G1')
  if (grade === 2 || grade === 3) return COURSE_CATALOG.filter((item) => item.band === 'G2_3')
  return [...COURSE_CATALOG]
}

/**
 * 검색용 정규화(찾기 편의만 — 같은 과목 판정에 쓰지 않는다): 공백·가운뎃점·괄호 제거, 로마 숫자 Ⅰ/Ⅱ·I/II → 1/2, 소문자.
 * 예: '미적분 1'·'미적분I'·'미적분Ⅰ' 모두 '미적분Ⅰ'을 찾는다.
 */
export function searchKey(text: string): string {
  // 로마 숫자는 소문자 변환 전에 바꾼다('Ⅰ'.toLowerCase()는 'ⅰ'(U+2170)이 된다)
  return text
    .normalize('NFC')
    .replace(/[Ⅱⅱ]/g, '2')
    .replace(/[Ⅰⅰ]/g, '1')
    .toLowerCase()
    .replace(/\(공동\)/g, '')
    .replace(/[\s·・()（）]/g, '')
    .replace(/ii$/, '2')
    .replace(/i$/, '1')
}

/** 이름·원문 표기 별칭 중 하나라도 검색어를 포함하면 true (빈 검색어는 모두) */
export function matchesQuery(query: string, names: readonly string[]): boolean {
  const key = searchKey(query)
  if (!key) return true
  return names.some((name) => searchKey(name).includes(key))
}
