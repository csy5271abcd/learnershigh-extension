import type { AcademicContext, AcademicTermQuery } from '../api/types.ts'

// 학기 = 조회 필터 (assessment-student.md §4). 학기를 바꿔도 다른 학기의 기록은 바뀌지 않는다.

export function termKey(term: AcademicTermQuery): string {
  return `${term.academicYear}-${term.semester}`
}

/**
 * A28-34 주소의 학기 값(?term=2026-2) 읽기. 형식이 맞지 않으면 null.
 * 학적이 있는 학기인지는 서버 학기 목록(§9-1-c)과 대조해 화면이 다시 확인한다(목록에 없으면 쓰지 않음).
 */
export function parseTermParam(value: string | null | undefined): AcademicTermQuery | null {
  const match = /^(\d{4})-([12])$/.exec((value ?? '').trim())
  return match ? { academicYear: Number(match[1]), semester: Number(match[2]) } : null
}

export function isSameTerm(a: AcademicTermQuery, b: AcademicTermQuery): boolean {
  return a.academicYear === b.academicYear && a.semester === b.semester
}

/** `2026학년도 1학년 2학기` */
export function termLabel(context: AcademicContext): string {
  return `${context.academicYear}학년도 ${context.grade}학년 ${context.semester}학기`
}

/** 고교 3개 학년 = 현재 학년도와 앞 두 학년도 */
export const termHistoryYears = 3

/**
 * 학기 선택 후보. 학기 목록 API가 계약에 없어(§9) 현재 학년도부터 앞 두 학년도까지(3개 학년도 × 1·2학기 = 6개)를
 * §9-1 Query 값으로 만든다(최신 학기 먼저). 실제 학적이 있는 학기만 목록에 남는다 — §9-1 이 학적 없음(400)을 돌려준 학기는
 * {@link isNoAcademicRecord} 로 빼고, 그 밖의 실패만 '불러오지 못한 학기'로 남긴다. 학적을 만들거나 추측하지 않는다.
 */
export function termCandidates(current: AcademicTermQuery): AcademicTermQuery[] {
  const terms: AcademicTermQuery[] = []
  for (let back = 0; back < termHistoryYears; back++) {
    for (const semester of [2, 1]) terms.push({ academicYear: current.academicYear - back, semester })
  }
  return terms
}

/**
 * §9-1 이 그 학년도·학기의 학적이 없다고 답했는가. Backend 는 400 VALIDATION_ERROR(semester: unknown), Mock 은 404 NOT_FOUND
 * (학기 없음 전용 Code 가 계약에 없음). 연결 실패·서버 오류(5xx)·인증(401)은 아니다.
 */
export function isNoAcademicRecord(error: unknown): boolean {
  const candidate = error as { status?: number; code?: string } | null
  return (candidate?.status === 400 && candidate.code === 'VALIDATION_ERROR') || (candidate?.status === 404 && candidate.code === 'NOT_FOUND')
}
