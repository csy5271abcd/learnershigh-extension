import type { MockExamMaterial } from '../api/types.ts'
import { mockExamSubjectName } from './enrichmentView.ts'

// 모의고사 60선 탐색 화면 규칙 (표시·화면 필터만, Business State 아님).
// §17 목록 Query에는 학년·시행 시기·계열 필터가 없어(MM-57) 받은 목록(최대 100건)에서 화면이 거른다.

export const mockExamSubjectTabs = [
  { subjectId: undefined, label: '전체' },
  { subjectId: 'mock_eng', label: '영어' },
  { subjectId: 'mock_kor', label: '국어' },
] as const

export const mockExamPageStep = 12

export interface MockExamFilters {
  grade?: string
  period?: string
  major?: string
}

/** 학년 필터 값: 2·3 = 교육청 학력평가 학년, csat = 평가원 모의평가(원본에 학년 표기 없음) */
export function gradeKey(item: MockExamMaterial): string | null {
  if (item.research?.examKind === 'CSAT_MOCK') return 'csat'
  return item.source.grade ? String(item.source.grade) : null
}

export function gradeLabel(key: string): string {
  return key === 'csat' ? '평가원 모의평가' : `고${key}`
}

/** 시행 시기 값 `2026-10` (모의평가는 학년도 표기 그대로 `2027학년도-6`) */
export function periodKey(item: MockExamMaterial): string | null {
  const { academicYear, examMonth } = item.source
  if (!academicYear || !examMonth) return null
  return item.research?.examKind === 'CSAT_MOCK' ? `${academicYear}학년도-${examMonth}` : `${academicYear}-${examMonth}`
}

export function periodLabel(key: string): string {
  const csat = key.match(/^(\d{4})학년도-(\d{1,2})$/)
  if (csat) return `${csat[1]}학년도 ${csat[2]}월`
  const [year, month] = key.split('-')
  return `${year}년 ${month}월`
}

function sortPeriods(a: string, b: string): number {
  const value = (key: string) => {
    const csat = key.match(/^(\d{4})학년도-(\d{1,2})$/)
    // 학년도 모의평가는 그 전해에 시행된다 (2027학년도 6월 = 2026년 6월)
    if (csat) return (Number(csat[1]) - 1) * 100 + Number(csat[2]) + 0.5
    const [year, month] = key.split('-').map(Number)
    return year * 100 + month
  }
  return value(b) - value(a)
}

export interface MockExamFilterOptions {
  grades: { key: string; label: string; count: number }[]
  periods: { key: string; label: string; count: number }[]
  majors: { key: string; count: number }[]
}

export function filterOptions(items: MockExamMaterial[]): MockExamFilterOptions {
  const count = (keys: (string | null)[]) => {
    const map = new Map<string, number>()
    for (const key of keys) if (key) map.set(key, (map.get(key) ?? 0) + 1)
    return map
  }
  const grades = count(items.map(gradeKey))
  const periods = count(items.map(periodKey))
  const majors = count(items.flatMap((item) => item.idea.relatedFields))
  return {
    grades: [...grades].sort(([a], [b]) => (a === 'csat' ? 1 : b === 'csat' ? -1 : a.localeCompare(b))).map(([key, n]) => ({ key, label: gradeLabel(key), count: n })),
    periods: [...periods].sort(([a], [b]) => sortPeriods(a, b)).map(([key, n]) => ({ key, label: periodLabel(key), count: n })),
    majors: [...majors].sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([key, n]) => ({ key, count: n })),
  }
}

export function applyFilters(items: MockExamMaterial[], filters: MockExamFilters): MockExamMaterial[] {
  return items.filter(
    (item) =>
      (!filters.grade || gradeKey(item) === filters.grade) &&
      (!filters.period || periodKey(item) === filters.period) &&
      (!filters.major || item.idea.relatedFields.includes(filters.major)),
  )
}

/** 카드 위 출처 줄: "2026년 10월 고3 모의고사 · 22번" (60선이 아니면 예전 규칙) */
export function examLine(item: MockExamMaterial): string {
  if (item.research) return `${item.research.examTitle} · ${item.research.questionLabel}`
  const { academicYear, examMonth, grade, questionNumber } = item.source
  const parts = [academicYear && `${academicYear}학년도`, examMonth && `${examMonth}월`, grade && `고${grade}`, questionNumber && `${questionNumber}번`]
  return parts.filter(Boolean).join(' ') || 'LearnersHigh 자체 제작 시연용 주제'
}

export function subjectBadge(item: MockExamMaterial): string {
  return mockExamSubjectName(item.subjectId)
}
