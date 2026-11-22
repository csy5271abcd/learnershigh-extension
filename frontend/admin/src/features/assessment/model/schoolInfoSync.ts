// §38-12 학교알리미 최근 3개 학년도 자동 확인 (A27-UX 부록 E) — 화면 표시용 순수 함수.
// 기준 학년도는 서버가 정한다(KST 달력 연도). 화면 값은 첫 요청용 추정일 뿐이고, 서버가 409로 기대값을 주면 그 값으로 다시 보낸다.

import type { SchoolInfoSyncResult } from '../api/types.ts'

export const SYNC_GRADES = [1, 2, 3]
export const SYNC_SEMESTERS = [1, 2]

/** 브라우저 시각을 KST 달력 연도로 바꿔 [Y, Y-1, Y-2]. */
export function recentAcademicYears(now: Date = new Date()): number[] {
  const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now))
  return [year, year - 1, year - 2]
}

/**
 * 부록 N5-2: 학년도 선택지 = KST 기준 최근 3개 학년도(올해·작년·재작년) ∪ 평가계획서가 등록된 학년도, 큰 해부터.
 * 등록 문서가 없는 해도 숨기지 않는다(그 해 6칸에서 공시 상태·문서 없음을 보여 준다).
 */
export function planYearOptions(registeredYears: readonly number[], now: Date = new Date()): number[] {
  return [...new Set([...recentAcademicYears(now), ...registeredYears])].sort((a, b) => b - a)
}

/** 최근 3개 학년도에 붙이는 보조 이름(올해·작년·재작년). 그 밖의 해는 null. */
export function relativeYearLabel(year: number, now: Date = new Date()): string | null {
  const [current] = recentAcademicYears(now)
  return year === current ? '올해' : year === current - 1 ? '작년' : year === current - 2 ? '재작년' : null
}

const YEAR_LABEL: Record<string, string> = {
  QUEUED: '확인 대기',
  FETCHING: '확인 중',
  COMPLETED: '확인 완료',
  PARTIAL: '일부 확인',
  NEEDS_SOURCE_VERIFICATION: '출처 확인 필요',
  YEAR_MISMATCH: '학년도 불일치',
  NOT_PUBLISHED: '공시 파일 없음',
  YEAR_UNAVAILABLE: '학년도 제공 안 됨',
  SCHOOL_AMBIGUOUS: '학교 식별 필요',
  SCHOOL_NOT_FOUND: '학교 없음',
  SCHOOL_IDENTITY_REQUIRED: '학교 식별 필요',
  FAILED: '확인 실패',
}

const SLOT_LABEL: Record<string, string> = {
  ...YEAR_LABEL,
  REGISTERED: '원본 등록 완료',
  NO_SOURCE_FOR_SLOT: '이 칸 공시 파일 없음',
  REMOVED_BY_ADMIN: '관리자가 삭제함(다시 받지 않음)',
}

const ANALYSIS_LABEL: Record<string, string> = {
  NONE: '',
  QUEUED: '분석 대기',
  ANALYZING: '분석 중',
  ANALYZED: '분석됨 · 검토 전',
  FAILED: '분석 실패',
}

export function yearStatusLabel(status: string): string {
  return YEAR_LABEL[status] ?? status
}

/** 칸 배지: 수집 상태와 분석 상태를 섞지 않고 '·'로 나란히 보인다. 0개는 오류가 아니다. */
export function slotBadge(slot: SchoolInfoSyncResult['slotStatuses'][number] | undefined): string | null {
  if (!slot) return null
  const collect = SLOT_LABEL[slot.status] ?? slot.status
  const count = slot.status === 'REGISTERED' ? ` ${slot.sourceFileCount}개` : ''
  const analysis = ANALYSIS_LABEL[slot.analysisStatus] ?? ''
  return `학교알리미: ${collect}${count}${analysis ? ` · ${analysis}` : ''}`
}

/** 문제 상태(관리자 확인이 필요한 것)인가 — 배지 색 구분용(중립/주의 두 가지만). */
export function needsAttention(status: string): boolean {
  return ['NEEDS_SOURCE_VERIFICATION', 'YEAR_MISMATCH', 'SCHOOL_AMBIGUOUS', 'SCHOOL_IDENTITY_REQUIRED', 'FAILED', 'SCHOOL_NOT_FOUND'].includes(status)
}

export function slotOf(result: SchoolInfoSyncResult | null, academicYear: number | null | undefined, grade: number, semester: number) {
  if (!result || academicYear == null) return undefined
  return result.slotStatuses.find((slot) => slot.academicYear === academicYear && slot.grade === grade && slot.semester === semester)
}

/** 상단 한 줄 요약: '18개 구간 중 원본 등록 n개'. 모든 칸이 등록일 때만 n = 18. */
export function coverageLabel(result: SchoolInfoSyncResult): string {
  return `${result.counts.expectedSlots}개 구간 중 원본 등록 ${result.counts.verifiedSlots}개`
}

/** 학교알리미에서 받은 문서인가 (관리자 전용 출처 배지). 등록 문서 sourceUrl 은 학교·학년도 공시 주소다. */
export function isSchoolInfoSource(sourceUrl: string | null | undefined): boolean {
  if (!sourceUrl) return false
  return sourceUrl.startsWith('https://www.schoolinfo.go.kr') || sourceUrl.includes('/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=')
}

/** 같은 원본 조회 범위인가 — 학년도 필터를 바꿔도 다시 보내지 않기 위함. */
export function sameRange(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

// 출처 분류·받지 않은 사유(관리자 표시용)
const REASONS: Record<string, string> = {
  UNCLASSIFIED: '학년·학기 분류 필요',
  UNSUPPORTED: '받지 않은 파일',
  NOT_PLAN: '평가계획 아님',
  YEAR_QUERY_UNVERIFIED: '학교알리미 학년도 조회 방식 미검증',
  NO_DISCLOSURE_YEAR: '공시연도 확인 안 됨',
  DISCLOSURE_YEAR_DIFFERS: '다른 학년도 공시',
  FILE_YEAR_DIFFERS: '파일의 학년도가 다름',
  FILE_YEAR_CONFLICT: '파일에 학년도가 여러 개',
  NO_FILE_YEAR_EVIDENCE: '파일에 학년도 표기 없음',
  NO_GRADE_EVIDENCE: '학년 표기 없음',
  NO_SEMESTER_EVIDENCE: '학기 표기 없음',
  NESTED_ZIP: 'ZIP 안의 ZIP',
  ZIP_PATH: 'ZIP 경로 문제',
  ZIP_CORRUPT: '손상된 ZIP',
  ZIP_TOO_MANY_ENTRIES: 'ZIP 파일이 너무 많음',
  ZIP_TOO_LARGE: 'ZIP이 너무 큼',
  TOO_LARGE: '파일이 너무 큼',
  FILE_DOWNLOAD_FAILED: '첨부를 받지 못함(오류 응답)',
  FORMAT: 'PDF·HWP·HWPX 아님',
  NOT_PLAN_FILE: '평가계획 아님',
  ADDRESS_MISSING: '주소를 확인하지 못함',
  GRADE_UNSPECIFIED_ALL_GRADES_APPLIED: '학년 표기 없음 → 고1·고2·고3 공통 적용',
  GRADES_FROM_BODY_ALL: '본문에 1·2·3학년 모두 → 공통 적용',
  GRADE_SCOPE_CONFLICT: '본문에 일부 학년만 있어 학년 범위 확인 필요',
  SEMESTER_CONFLICT: '원문 학기와 공시월(4월·9월)이 다름',
  CHASU_IGNORED: '공시 차수를 받지 못함',
  ADDRESS_DUPLICATE: '다른 후보와 주소가 같음',
  SAME_NAME_CANDIDATES: '같은 이름의 학교가 여러 곳',
  MAPPING_CHANGED: '고른 학교의 이름·주소가 바뀜',
  TOO_MANY_CANDIDATES: '같은 이름의 학교가 너무 많음',
}

export function reasonLabel(code: string): string {
  return REASONS[code] ?? code
}
