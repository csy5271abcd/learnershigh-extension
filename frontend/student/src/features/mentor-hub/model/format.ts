import type { MentorContentKind, MentorSummary } from './types.ts'

export const contentKindLabel: Record<MentorContentKind, string> = {
  plan: 'Plan',
  routine: 'Routine',
  story: 'Story',
  qna: 'Q&A',
  record: 'Record',
  case: 'Case',
}

/** "2026-10-04" → "10월 4일" (Timezone 변환 없이 날짜 문자열만 사용한다) */
export function formatMonthDay(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}월 ${day}일`
}

export function mentorAffiliation(mentor: MentorSummary): string {
  return `${mentor.university} ${mentor.major}`
}
