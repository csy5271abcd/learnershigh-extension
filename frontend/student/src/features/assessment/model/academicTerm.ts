import type { AcademicContext, AcademicTermQuery } from '../api/types.ts'

// 학기 = 조회 필터 (assessment-student.md §4). 학기를 바꿔도 다른 학기의 기록은 바뀌지 않는다.

export function termKey(term: AcademicTermQuery): string {
  return `${term.academicYear}-${term.semester}`
}

export function isSameTerm(a: AcademicTermQuery, b: AcademicTermQuery): boolean {
  return a.academicYear === b.academicYear && a.semester === b.semester
}

/** `2026학년도 1학년 2학기` */
export function termLabel(context: AcademicContext): string {
  return `${context.academicYear}학년도 ${context.grade}학년 ${context.semester}학기`
}

/**
 * 학기 선택 후보. 학기 목록 API가 계약에 없어(§9) 현재 학년도의 1·2학기를 §9-1 Query 값으로 만든다.
 * 다른 학년도·이전 학교 이력은 계약 보완 후 추가한다.
 */
export function termCandidates(current: AcademicTermQuery): AcademicTermQuery[] {
  return [2, 1].map((semester) => ({ academicYear: current.academicYear, semester }))
}
