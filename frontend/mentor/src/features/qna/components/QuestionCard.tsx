import type { ReactNode } from 'react'
import type { MentorQuestion } from '../../../api/types.ts'
import { Badge } from '../../../components/Badge.tsx'
import ui from '../../../components/ui.module.css'
import { formatRelativeTime } from '../../../lib/format.ts'
import { anonymousContextText, questionCategoryLabel, questionStatusView } from '../../../model/questionMeta.ts'
import styles from './QuestionCard.module.css'

interface QuestionCardProps {
  question: MentorQuestion
  /** Question Detail에서는 h1, Answer 화면에서는 h2로 쓴다. */
  heading: ReactNode
}

// 질문 본문 + 익명 Context. Student 식별 정보는 Response에 없으므로 그릴 수도 없다.
export function QuestionCard({ question, heading }: QuestionCardProps) {
  const status = questionStatusView(question.status)

  return (
    <section className={styles.card} aria-label="질문">
      <div className={ui.actions}>
        <Badge tone={status.tone}>{status.label}</Badge>
        <Badge>{questionCategoryLabel(question.category)}</Badge>
      </div>
      {heading}
      {question.detail && <p className={styles.detail}>{question.detail}</p>}
      <p className={ui.meta}>
        {anonymousContextText(question.anonymousStudentContext)} · {formatRelativeTime(question.submittedAt)} 질문
      </p>
    </section>
  )
}
