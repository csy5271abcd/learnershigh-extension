import type { MentorQuestion, MentorQuestionStatus, QuestionCategory, QuestionView } from './types.ts'

// StudentQ&A-00 Mockup Category 순서
export const questionCategories: { id: QuestionCategory; label: string }[] = [
  { id: 'STUDY_METHOD', label: '공부법' },
  { id: 'SCHOOL_GRADE', label: '내신' },
  { id: 'CSAT', label: '수능' },
  { id: 'ADMISSION_STRATEGY', label: '입시 전략' },
  { id: 'MENTAL', label: '멘탈' },
]

export const questionCategoryLabel = (category: QuestionCategory) =>
  questionCategories.find((item) => item.id === category)?.label ?? category

export function parseQuestionCategory(value: string | null): QuestionCategory | undefined {
  return questionCategories.find((item) => item.id === value)?.id
}

export function parseQuestionView(value: string | null): QuestionView {
  return value === 'mine' ? 'mine' : 'public'
}

/** 상태 표시 문구. answered는 StudentQ&A-01 Mockup "답변 완료" */
export const questionStatusLabel: Record<MentorQuestionStatus, string> = {
  pending: '답변 대기',
  answered: '답변 완료',
  overdue: '답변 지연',
}

export const questionStatusTone: Record<MentorQuestionStatus, 'neutral' | 'positive' | 'negative'> = {
  pending: 'neutral',
  answered: 'positive',
  overdue: 'negative',
}

export const studentContextText = (question: MentorQuestion) => `${question.student.grade} · ${question.student.interest}`

/** "8시간 전" (Mockup 표기). 화면 표시용이며 상태 계산에는 쓰지 않는다. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}
