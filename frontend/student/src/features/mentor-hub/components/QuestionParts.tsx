import { contentKindLabel, mentorAffiliation } from '../model/format.ts'
import {
  formatRelativeTime,
  questionCategoryLabel,
  questionStatusLabel,
  questionStatusTone,
  studentContextText,
} from '../model/questions.ts'
import type { MentorContentSummary, MentorQuestion, MentorQuestionStatus } from '../model/types.ts'
import { useQuestionHelpful } from '../model/useQuestionHelpful.ts'
import { MentorAvatar } from './MentorAvatar.tsx'
import styles from './QuestionParts.module.css'

/** 상태는 색 + 글자로 함께 보여준다. */
export function QuestionStatusBadge({ status }: { status: MentorQuestionStatus }) {
  return (
    <span className={styles.badge} data-tone={questionStatusTone[status]}>
      {questionStatusLabel[status]}
    </span>
  )
}

export function QuestionCategoryBadge({ question }: { question: MentorQuestion }) {
  return <span className={styles.badge}>{questionCategoryLabel(question.category)}</span>
}

interface QuestionRowProps {
  question: MentorQuestion
  /** 내 질문 목록이면 상태를 함께 보여준다. */
  showStatus: boolean
  onSelect: (questionId: string) => void
  requestHelpful: (questionId: string, helpful: boolean) => Promise<unknown>
}

// StudentQ&A-00 Mockup 한 줄: Category · 익명 Context · 시간 / 질문 / 답변 상자 / 도움돼요 · 관련 콘텐츠
// 질문 Button이 Row 전체 Click 영역이 된다. (Row 안에 다른 Button / Link를 두지 않는다)
export function QuestionRow({ question, showStatus, onSelect, requestHelpful }: QuestionRowProps) {
  const { helpfulCount } = useQuestionHelpful(question, requestHelpful)
  const time = question.answer && !showStatus ? question.answer.answeredAt : question.submittedAt

  return (
    <article className={styles.row}>
      <p className={styles.rowMeta}>
        {showStatus && <QuestionStatusBadge status={question.status} />}
        <QuestionCategoryBadge question={question} />
        <span>
          {studentContextText(question)} · {formatRelativeTime(time)}
          {showStatus && ' 질문'}
        </span>
      </p>
      <h3 className={styles.rowTitle}>
        <button type="button" className={styles.rowButton} onClick={() => onSelect(question.questionId)}>
          {question.question}
        </button>
      </h3>
      {question.answer ? (
        <div className={styles.answerPreview}>
          <MentorAvatar name={question.mentor.name} imageUrl={question.mentor.profileImageUrl} size="md" />
          <div className={styles.answerText}>
            <p className={styles.answerMentor}>
              <strong>{question.mentor.name}</strong> {mentorAffiliation(question.mentor)}
            </p>
            <p className={styles.answerSummary}>{question.answer.text}</p>
          </div>
        </div>
      ) : (
        <p className={styles.waiting}>
          {question.status === 'overdue'
            ? `${question.mentor.name}님이 72시간 넘게 답하지 못했어요. 다른 Mentor에게 재배정할 수 있어요.`
            : `${question.mentor.name}님의 답변을 기다리고 있어요.`}
        </p>
      )}
      {question.answer && (
        <p className={styles.rowFooter}>
          <span>도움돼요 {helpfulCount}</span>
          {question.relatedContent[0] && <span>관련 콘텐츠 · {question.relatedContent[0].title}</span>}
        </p>
      )}
    </article>
  )
}

interface RelatedContentListProps {
  items: MentorContentSummary[]
  /** Detail 화면이 있는 유형이면 이동 함수를 돌려준다. 없으면 이동하지 않는 항목으로 보여준다. */
  resolveLink: (content: MentorContentSummary) => (() => void) | undefined
}

// StudentQ&A-01 Mockup 답변 아래 관련 콘텐츠 줄
export function RelatedContentList({ items, resolveLink }: RelatedContentListProps) {
  if (items.length === 0) return null
  return (
    <ul className={styles.related} aria-label="관련 콘텐츠">
      {items.map((item) => {
        const open = resolveLink(item)
        const body = (
          <>
            <span className={styles.relatedKind}>{contentKindLabel[item.kind]}</span>
            <span className={styles.relatedTitle}>{item.title}</span>
          </>
        )
        return (
          <li key={item.contentId}>
            {open ? (
              <button type="button" className={styles.relatedItem} onClick={open}>
                {body}
                <span className={styles.relatedChevron} aria-hidden="true">
                  ›
                </span>
              </button>
            ) : (
              <p className={`${styles.relatedItem} ${styles.relatedStatic}`}>
                {body}
                <span className={styles.relatedNote}>화면 준비 중</span>
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
