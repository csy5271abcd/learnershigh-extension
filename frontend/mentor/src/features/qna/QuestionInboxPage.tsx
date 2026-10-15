import { Link, useSearchParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorQuestion, MentorQuestionStatus } from '../../api/types.ts'
import { answerPath, questionPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { SearchField, ToolbarSpacer, Workspace, type SidebarSection } from '../../components/Workspace.tsx'
import { formatRelativeTime } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { anonymousContextText, questionCategoryLabel, questionStatuses, questionStatusView } from '../../model/questionMeta.ts'
import styles from './QuestionInboxPage.module.css'

const parseStatus = (value: string | null) => questionStatuses.find((item) => item.id === value)?.id

const emptyText: Record<MentorQuestionStatus | 'all', string> = {
  all: '아직 받은 질문이 없어요.',
  pending: '답변을 기다리는 질문이 없어요.',
  overdue: '기한이 지난 질문이 없어요.',
  answered: '아직 답변한 질문이 없어요.',
}

function matchesQuery(question: MentorQuestion, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [question.question, question.detail ?? '', questionCategoryLabel(question.category)].some((value) =>
    value.toLowerCase().includes(needle),
  )
}

// Q&A Inbox: 나에게 온 질문만 보인다. (다른 Mentor의 Q&A는 Discover에도 없다)
// 상태 / 검색어는 URL에 두어 Detail 왕복 후에도 유지한다. 목록은 한 번 받아 Sidebar 개수와 목록을 같은 데이터에서 계산한다.
export function QuestionInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const query = searchParams.get('q') ?? ''
  const { state, reload } = useResource('questions:list:all', () => mentorApi.listQuestions({ size: 100 }))
  const all = state.status === 'success' ? state.data.items : []
  const count = (id: MentorQuestionStatus) => all.filter((question) => question.status === id).length

  const hrefWith = (next: MentorQuestionStatus | undefined) => {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('status', next)
    else params.delete('status')
    const search = params.toString()
    return search ? `?${search}` : '?'
  }

  const sections: SidebarSection[] = [
    {
      items: [
        { key: 'all', label: '전체', to: hrefWith(undefined), active: !status, count: all.length },
        ...questionStatuses.map((item) => ({
          key: item.id,
          label: item.label,
          to: hrefWith(item.id),
          active: status === item.id,
          count: count(item.id),
        })),
      ],
    },
  ]

  const setQuery = (value: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const items = all.filter((question) => (!status || question.status === status) && matchesQuery(question, query))

  return (
    <Workspace
      title="Q&A"
      sections={sections}
      toolbar={
        <>
          <SearchField label="질문 검색" value={query} onChange={setQuery} />
          <ToolbarSpacer />
          {state.status === 'success' && (
            <p className={styles.summary}>
              답변 대기 <strong>{count('pending')}</strong>
              {count('overdue') > 0 && (
                <>
                  {' · '}
                  <span className={styles.overdue}>
                    기한 초과 <strong>{count('overdue')}</strong>
                  </span>
                </>
              )}
            </p>
          )}
        </>
      }
    >
      <header className={styles.header}>
        <PageTitle>Q&A Inbox</PageTitle>
        <p className={ui.pageLead}>나에게 온 질문이에요. 질문한 학생의 이름과 학교는 보이지 않아요.</p>
      </header>

      {state.status === 'loading' && <LoadingState label="질문을 불러오는 중이에요." />}
      {(state.status === 'error' || state.status === 'notFound') && (
        <ErrorState title="질문을 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
      )}
      {state.status === 'success' &&
        (all.length === 0 ? (
          <EmptyState title={emptyText.all} description="Student가 내 프로필이나 콘텐츠에서 질문하면 여기에 모여요." />
        ) : items.length === 0 ? (
          query.trim() ? (
            <EmptyState title={`'${query.trim()}' 검색 결과가 없어요.`}>
              <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={() => setQuery('')}>
                검색어 지우기
              </button>
            </EmptyState>
          ) : (
            <EmptyState title={emptyText[status ?? 'all']}>
              <Link to={hrefWith(undefined)} replace className={`${ui.button} ${ui.neutral}`}>
                전체 질문 보기
              </Link>
            </EmptyState>
          )
        ) : (
          <section aria-labelledby="question-count">
            <p id="question-count" className="visually-hidden" aria-live="polite">
              {items.length}개
            </p>
            <ul className={styles.list}>
              {items.map((question) => (
                <li key={question.questionId}>
                  <QuestionRow question={question} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </Workspace>
  )
}

function QuestionRow({ question }: { question: MentorQuestion }) {
  const status = questionStatusView(question.status)
  const waiting = question.status !== 'answered'

  return (
    <article className={styles.row}>
      <div className={styles.rowMain}>
        <p className={styles.category}>{questionCategoryLabel(question.category)}</p>
        <h2 className={styles.rowTitle}>
          <Link to={questionPath(question.questionId)} className={styles.rowLink}>
            {question.question}
          </Link>
        </h2>
        {question.detail && <p className={styles.detail}>{question.detail}</p>}
        <p className={styles.context}>
          {anonymousContextText(question.anonymousStudentContext)} · {formatRelativeTime(question.submittedAt)} 받음
        </p>
      </div>
      <div className={styles.rowSide}>
        <Badge tone={status.tone}>{status.label}</Badge>
        {waiting && (
          <Link
            to={answerPath(question.questionId)}
            className={`${ui.button} ${ui.secondary} ${ui.small}`}
            aria-label={`${question.question} 답변하기`}
          >
            답변하기
          </Link>
        )}
      </div>
    </article>
  )
}
