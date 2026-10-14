import { Link, useSearchParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorQuestion, MentorQuestionStatus } from '../../api/types.ts'
import { answerPath, questionPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatRelativeTime } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { anonymousContextText, questionCategoryLabel, questionStatuses, questionStatusView } from './model/questionMeta.ts'
import styles from './QuestionInboxPage.module.css'

const parseStatus = (value: string | null) => questionStatuses.find((item) => item.id === value)?.id

const emptyText: Record<MentorQuestionStatus | 'all', string> = {
  all: '아직 받은 질문이 없어요.',
  pending: '답변을 기다리는 질문이 없어요.',
  overdue: '기한이 지난 질문이 없어요.',
  answered: '아직 답변한 질문이 없어요.',
}

// Q&A Inbox: 상태 Filter는 URL(?status=)에 두어 Detail 왕복 후에도 유지한다. Scroll은 ScrollRestoration이 복원한다.
export function QuestionInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const { state, reload } = useResource(`questions:list:${status ?? 'all'}`, () =>
    mentorApi.listQuestions({ status, size: 100 }),
  )

  const selectStatus = (next: MentorQuestionStatus | undefined) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next) params.set('status', next)
        else params.delete('status')
        return params
      },
      { replace: true, preventScrollReset: true },
    )

  return (
    <div className={ui.page}>
      <header className={ui.pageHeader}>
        <div>
          <PageTitle>Q&A</PageTitle>
          <p className={ui.pageLead}>Student가 보낸 질문이에요. 질문한 학생의 이름과 학교는 보이지 않아요.</p>
        </div>
      </header>

      <div className={styles.filters} role="group" aria-label="질문 상태">
        <button type="button" className={styles.filter} aria-pressed={!status} onClick={() => selectStatus(undefined)}>
          전체
        </button>
        {questionStatuses.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.filter}
            aria-pressed={status === item.id}
            onClick={() => selectStatus(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {state.status === 'loading' && <LoadingState label="질문을 불러오는 중이에요." />}
      {(state.status === 'error' || state.status === 'notFound') && (
        <ErrorState title="질문을 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
      )}
      {state.status === 'success' &&
        (state.data.items.length === 0 ? (
          status ? (
            <EmptyState title={emptyText[status]}>
              <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={() => selectStatus(undefined)}>
                전체 질문 보기
              </button>
            </EmptyState>
          ) : (
            <EmptyState
              title={emptyText.all}
              description="Student가 내 프로필이나 콘텐츠에서 질문하면 여기에 모여요."
            />
          )
        ) : (
          <section aria-labelledby="question-count">
            <p id="question-count" className={styles.count} aria-live="polite">
              {state.data.items.length}개
            </p>
            <ul className={styles.list}>
              {state.data.items.map((question) => (
                <li key={question.questionId}>
                  <QuestionRow question={question} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}

function QuestionRow({ question }: { question: MentorQuestion }) {
  const status = questionStatusView(question.status)
  const waiting = question.status !== 'answered'

  return (
    <article className={`${styles.row} ${question.status === 'overdue' ? styles.overdue : ''}`}>
      <div className={styles.rowMain}>
        <div className={ui.actions}>
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge>{questionCategoryLabel(question.category)}</Badge>
        </div>
        <h2 className={styles.rowTitle}>
          <Link to={questionPath(question.questionId)} className={styles.rowLink}>
            {question.question}
          </Link>
        </h2>
        {question.detail && <p className={styles.summary}>{question.detail}</p>}
        <p className={ui.meta}>
          {anonymousContextText(question.anonymousStudentContext)} · {formatRelativeTime(question.submittedAt)} 받음
        </p>
      </div>
      {waiting && (
        <Link
          to={answerPath(question.questionId)}
          className={`${ui.button} ${ui.secondary} ${ui.small}`}
          aria-label={`${question.question} 답변하기`}
        >
          답변하기
        </Link>
      )}
    </article>
  )
}
