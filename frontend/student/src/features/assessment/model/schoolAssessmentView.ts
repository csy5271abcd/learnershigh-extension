import type { SchoolAssessment, SchoolAssessmentSort, SchoolAssessmentStatus, SubjectRef } from '../api/types.ts'

// 학교 수행평가 화면 표시 규칙. Business State는 계약 값을 그대로 쓰고, 여기서는 표시 문구·파생 값만 만든다.

export const schoolAssessmentStatuses: SchoolAssessmentStatus[] = ['BEFORE_START', 'IN_PROGRESS', 'COMPLETED']

export const statusLabels: Record<SchoolAssessmentStatus, string> = {
  BEFORE_START: '시작 전',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
}

const statusOrder: Record<SchoolAssessmentStatus, number> = { BEFORE_START: 0, IN_PROGRESS: 1, COMPLETED: 2 }

/**
 * 되돌리기(역전이)는 정책 확정 전이라 막는다 (api-contract.md §13, assessment-screen-map.md MM-01).
 * 앞으로 건너뛰는 전이(시작 전 → 완료)는 §13 "완료 처리 가능"에 따라 허용한다.
 */
export function isStatusTransitionAllowed(from: SchoolAssessmentStatus, to: SchoolAssessmentStatus): boolean {
  return statusOrder[to] >= statusOrder[from]
}

export const sortOptions: { value: SchoolAssessmentSort; label: string }[] = [
  { value: 'deadlineDate,asc', label: '일정순' },
  { value: 'createdAt,desc', label: '최근 추가순' },
  { value: 'title,asc', label: '이름순' },
]

export const defaultSort: SchoolAssessmentSort = 'deadlineDate,asc'

export function parseSort(value: string | null): SchoolAssessmentSort {
  return sortOptions.some((option) => option.value === value) ? (value as SchoolAssessmentSort) : defaultSort
}

export function parseStatus(value: string | null): SchoolAssessmentStatus | undefined {
  return schoolAssessmentStatuses.find((status) => status === value)
}

// ---- 날짜 ----

function toUtcDay(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

/** 기준일(today)에서 마감일까지 남은 일수. 지난 날은 음수. */
export function daysUntil(date: string, today: string): number {
  return toUtcDay(date) - toUtcDay(today)
}

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

/** `2026-10-28` → `10. 28. (수)` */
export function formatDateWithWeekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${month}. ${day}. (${weekday})`
}

/** `2026-10-28` → `10. 28.` */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}. ${day}.`
}

export function formatDday(days: number): string {
  if (days === 0) return 'D-day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}

/** 7일 이내는 주의 색으로 표시한다 (표시 규칙이며 Business Rule 아님). */
export const urgentDays = 7

export interface UpcomingDeadline {
  assessment: SchoolAssessment
  days: number
}

/** 다가오는 일정: 완료하지 않은 과제 중 기준일 이후 마감, 가까운 순 최대 3개. 목록 응답에서 계산한다. */
export function upcomingDeadlines(items: SchoolAssessment[], today: string, limit = 3): UpcomingDeadline[] {
  return items
    .filter((item) => item.status !== 'COMPLETED' && item.deadlineDate !== null)
    .map((item) => ({ assessment: item, days: daysUntil(item.deadlineDate as string, today) }))
    .filter((entry) => entry.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, limit)
}

export function countByStatus(items: SchoolAssessment[]): Record<SchoolAssessmentStatus, number> {
  const counts: Record<SchoolAssessmentStatus, number> = { BEFORE_START: 0, IN_PROGRESS: 0, COMPLETED: 0 }
  for (const item of items) counts[item.status] += 1
  return counts
}

export function countBySubject(items: SchoolAssessment[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.subjectId, (counts.get(item.subjectId) ?? 0) + 1)
  return counts
}

export function subjectNameOf(subjects: SubjectRef[], subjectId: string): string {
  return subjects.find((subject) => subject.subjectId === subjectId)?.name ?? '과목 정보 없음'
}

/** 정보 출처: §12 `evaluationItemRef` 유무만으로 구분한다. */
export function sourceLabel(item: SchoolAssessment): string {
  return item.evaluationItemRef ? '평가계획서 연결' : '직접 등록'
}
