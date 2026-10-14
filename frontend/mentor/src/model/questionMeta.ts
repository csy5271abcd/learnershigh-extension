import type { AnonymousStudentContext, MentorQuestionStatus, QuestionCategory } from '../api/types.ts'
import type { BadgeTone } from '../components/Badge.tsx'

// Q&A Inbox · Question Detail · Home이 함께 쓴다.
// Category 이름은 Student Q&A 화면과 같은 문구를 쓴다. (frontend/student/.../questions.ts, TEMPORARY FIXTURE DUPLICATION)
export const questionCategories: { id: QuestionCategory; label: string }[] = [
  { id: 'STUDY_METHOD', label: '공부법' },
  { id: 'SCHOOL_GRADE', label: '내신' },
  { id: 'CSAT', label: '수능' },
  { id: 'ADMISSION_STRATEGY', label: '입시 전략' },
  { id: 'MENTAL', label: '멘탈' },
]

export const questionCategoryLabel = (category: QuestionCategory) =>
  questionCategories.find((item) => item.id === category)?.label ?? category

/** Mentor Inbox Filter 순서와 이름 */
export const questionStatuses: { id: MentorQuestionStatus; label: string; tone: BadgeTone }[] = [
  { id: 'pending', label: '답변 대기', tone: 'accent' },
  { id: 'overdue', label: '기한 초과', tone: 'negative' },
  { id: 'answered', label: '답변 완료', tone: 'positive' },
]

export const questionStatusView = (status: MentorQuestionStatus) =>
  questionStatuses.find((item) => item.id === status) ?? { id: status, label: status, tone: 'neutral' as const }

/**
 * 질문자 익명 Context. grade / interestField 말고는 쓰지 않는다. (domain.md §36)
 * 둘 중 하나가 비어 와도 자연스럽게 보이게 한다. ("고2 · 화학공학 관심" / "화학공학 관심" / "고2")
 */
export function anonymousContextText(context: AnonymousStudentContext): string {
  const grade = context.grade?.trim()
  const interest = context.interestField?.trim()
  const parts = [grade, interest ? `${interest} 관심` : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '익명 Student'
}
