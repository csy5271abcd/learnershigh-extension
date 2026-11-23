// 시연 수행평가 제목·마감일 규칙 (Seed·수정 스크립트 공용). 모든 값은 합성 시연 데이터다.

const has = (s, re) => re.test(s)
const HISTORY = /역사|한국사|세계사|동아시아/
const GEO = /지리|도시/
const ETHICS = /윤리/
const MATHY = /수학|기하|미적분|대수|확률/
const STATS_FIT = /통계|확률|수학과제|공통수학|경제 수학|인공지능 수학/

/**
 * 과목명과 수행평가 유형(templateKey)으로 자연스러운 제목(접두사 제외)을 만든다.
 * 단어 중복("정보 정보 윤리"), 과목과 맞지 않는 유형("세계지리 역사 인물"), '탐구·실험' 반복을 피한다.
 */
export function naturalTitle(subject, templateKey) {
  const s = subject
  switch (templateKey) {
    case 'kor-critique':
      if (has(s, /화법/)) return `${s} 연설문 분석 및 비평 글쓰기`
      if (has(s, /독서/)) return `${s} 작품 비평문 쓰기`
      if (has(s, /문학/)) return `${s} 작품 비평문 쓰기`
      return `${s} 문학 작품 비평문 쓰기`
    case 'kor-reading':
      if (has(s, /독서|읽기/)) return `${s} 서평 쓰기`
      return `${s} 주제 탐구 독서 및 서평 쓰기`
    case 'kor-media':
      if (has(s, /매체/)) return `${s} 뉴스·카드뉴스 표현 분석 발표`
      return `${s} 매체 자료 분석 발표`
    case 'kor-debate':
      return `${s} 토론 및 논증하는 글쓰기`
    case 'math-process':
      return `${s} 문제 해결 과정 서술 평가`
    case 'math-model':
      return has(s, /수학/) ? `${s} 실생활 모델링 보고서` : `${s} 실생활 수학 모델링 보고서`
    case 'math-stats':
      if (!has(s, STATS_FIT)) return `${s} 실생활 활용 사례 분석 보고서`
      return has(s, /통계$/) ? `${s} 자료 분석 보고서` : `${s} 통계 자료 분석 보고서`
    case 'math-concept':
      if (has(s, /탐구/)) return `${s} 개념 연구 발표`
      return has(s, /수학/) ? `${s} 개념 탐구 발표` : `${s} 수학 개념 탐구 발표`
    case 'eng-speech':
      return has(s, /영어/) ? `${s} 주제 발표` : `${s} 영어 주제 발표`
    case 'eng-essay':
      return has(s, /영어/) ? `${s} 에세이 쓰기` : `${s} 영어 에세이 쓰기`
    case 'eng-reading':
      if (has(s, /읽기/)) return `${s} 원서 감상 활동`
      return has(s, /영어/) ? `${s} 원서 읽기 활동` : `${s} 영어 원서 읽기 활동`
    case 'eng-debate':
      return has(s, /영어|토론/) ? `${s} 토론` : `${s} 영어 토론`
    case 'soc-issue':
      if (has(s, HISTORY)) return `${s} 시대별 사회 변화 조사 보고서`
      if (has(s, GEO)) return `${s} 지역 문제 조사 보고서`
      if (has(s, ETHICS)) return has(s, /윤리$/) ? `${s} 쟁점 사례 조사 보고서` : `${s} 윤리적 쟁점 사례 조사 보고서`
      if (has(s, /^경제$/)) return '경제 현상 조사 보고서'
      if (has(s, /정치|법/)) return `${s} 법·제도 사례 조사 보고서`
      if (has(s, /사회/)) return `${s} 지역 사례 조사 보고서`
      return `${s} 사회 문제 조사 보고서`
    case 'soc-history':
      if (has(s, HISTORY)) return `${s} 역사 인물·사건 탐구 보고서`
      if (has(s, ETHICS)) return has(s, /사상$/) ? `${s} 주요 사상가 탐구 보고서` : `${s} 사상가 탐구 보고서`
      if (has(s, GEO)) return `${s} 지역 변화 탐구 보고서`
      if (has(s, /^경제$/)) return '경제사 주요 사례 탐구 보고서'
      if (has(s, /정치|법/)) return has(s, /^정치$/) ? '정치 주요 사건 탐구 보고서' : `${s} 정치 사건 탐구 보고서`
      if (has(s, /탐구/)) return `${s} 사회 변동 사례 보고서`
      return `${s} 사회 변동 사례 탐구 보고서`
    case 'soc-data':
      if (has(s, HISTORY)) return `${s} 사료 비교 분석`
      if (has(s, ETHICS)) return has(s, /윤리$/) ? `${s} 쟁점 자료 비교` : `${s} 윤리 쟁점 자료 비교`
      return `${s} 통계 자료 분석 및 정책 비교`
    case 'soc-debate':
      if (has(s, HISTORY)) return `${s} 역사 쟁점 토론`
      return `${s} 시사 쟁점 토론`
    case 'sci-design':
      if (has(s, /실험/)) return `${s} 설계 및 결과 보고서`
      return `${s} 실험 설계 및 실험 보고서`
    case 'sci-inquiry':
      if (has(s, /탐구/)) return `${s} 주제 연구 보고서`
      return `${s} 주제 탐구 보고서`
    case 'sci-analysis':
      if (has(s, /실험/)) return `${s} 결과 분석 및 발표`
      return `${s} 실험 결과 분석 및 발표`
    case 'sci-observe':
      if (has(s, /탐구/)) return `${s} 관찰 활동`
      return `${s} 관찰 탐구 활동`
    case 'info-program':
      return `${s} 프로그래밍 프로젝트`
    case 'info-data':
      return `${s} 데이터 분석 프로젝트`
    case 'info-ethics':
      if (s === '정보') return '정보 윤리 문제 탐구 발표'
      return `${s} 정보 윤리 탐구 발표`
    case 'pe-skill':
      return `${s} 실기 평가`
    case 'pe-plan':
      return `${s} 건강 체력 관리 계획서`
    case 'art-make':
      if (has(s, /음악/)) return has(s, /창작$/) ? `${s} 자작곡 발표` : `${s} 창작곡 발표`
      return `${s} 작품 제작`
    case 'art-critique':
      return `${s} 감상 및 비평문 쓰기`
    case 'art-perform':
      if (has(s, /음악/)) return `${s} 합주 프로젝트`
      return has(s, /창작/) ? `${s} 프로젝트` : `${s} 창작 프로젝트`
    case 'tech-project':
      return `${s} 생활 문제 해결 프로젝트`
    case 'lang-speak':
      return has(s, /회화/) ? `${s} 말하기 평가` : `${s} 회화 말하기 평가`
    case 'lang-culture':
      return `${s} 문화 탐구 발표`
    case 'gen-career':
      return `${s} 진로 탐색 보고서`
    case 'gen-essay':
      if (s === '논술') return '논술 시사 주제 글쓰기'
      return `${s} 논술문 작성`
    case 'gen-psych':
      if (has(s, /심리/)) return `${s} 심리 탐구 보고서`
      if (has(s, /교육/)) return `${s} 학습 동기 탐구 보고서`
      if (has(s, /진로/)) return `${s} 진로 적성 탐구 보고서`
      if (s === '논술') return '논술 사회 쟁점 탐구 보고서'
      return `${s} 심리 탐구 보고서`
    default:
      return `${s} 수행평가`
  }
}

/** Asia/Seoul 기준 오늘 (YYYY-MM-DD) */
export function seoulToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const OFFSETS = [1, 4, 6, 8, 11, 13, 15, 18, 20, 22, 25, 27, 29, 32, 36, 39, 43, 46, 50, 53, 57, 60, 64, 71]

/** 기준일(오늘) 다음 날 이후의 합성 마감일. 같은 Key면 같은 날짜(재실행 안전), 여러 날짜로 분산. */
export function futureDeadline(seedKey, today) {
  let h = 0x811c9dc5
  for (const ch of seedKey) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0
  return addDays(today, OFFSETS[h % OFFSETS.length])
}
