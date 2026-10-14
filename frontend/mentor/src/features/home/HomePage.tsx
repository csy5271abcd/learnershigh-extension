import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { discoverApi } from '../../api/discover/discoverApi.ts'
import { mentorApi } from '../../api/mentorApi.ts'
import {
  answerPath,
  contentListPath,
  contentPath,
  createPath,
  discoverContentPath,
  discoverPath,
  questionListPath,
  questionPath,
} from '../../app/paths.ts'
import { Avatar } from '../../components/Avatar.tsx'
import { Badge } from '../../components/Badge.tsx'
import { ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatDate, formatRelativeTime } from '../../lib/format.ts'
import { useResource, type ResourceState } from '../../lib/useResource.ts'
import { contentStatusView, contentTypeLabel, isInReview } from '../../model/contentMeta.ts'
import { anonymousContextText, questionCategoryLabel, questionStatusView } from '../../model/questionMeta.ts'
import styles from './HomePage.module.css'

// Mentor Workspace Home: "오늘 Mentor로서 무엇을 할까"를 빠르게 보여 준다.
// KPI Card(총 조회 / 답변률 / 랭킹 / 팔로워)는 두지 않는다. 숫자는 할 일 개수만, 같은 목록 데이터에서 센다.
export function HomePage() {
  const profile = useResource('profile', () => mentorApi.getProfile())
  const contents = useResource('content:list:all:all', () => mentorApi.listContent({ size: 100 }))
  const questions = useResource('questions:list:all', () => mentorApi.listQuestions({ size: 100 }))
  const peers = useResource('discover:content:all', () => discoverApi.listPublishedContent())

  const me = profile.state.status === 'success' ? profile.state.data : null
  const waiting = questions.state.status === 'success' ? questions.state.data.items.filter((q) => q.status !== 'answered') : []
  const pendingCount = waiting.filter((q) => q.status === 'pending').length
  const drafts =
    contents.state.status === 'success'
      ? contents.state.data.items.filter((item) => item.status === 'DRAFT' && !isInReview(item))
      : []

  return (
    <div className={styles.home}>
      <header className={styles.hero}>
        {me && <Avatar name={me.name} imageUrl={me.profileImageUrl} size={56} decorative />}
        <PageTitle>{me ? `${me.name} 멘토님, 안녕하세요` : '안녕하세요'}</PageTitle>
        <p className={styles.lead}>오늘 무엇을 준비해 볼까요?</p>
        <nav className={styles.quick} aria-label="빠른 작업">
          <Link to={createPath} className={`${ui.button} ${ui.primary}`}>
            새 콘텐츠 작성
          </Link>
          <Link to={`${questionListPath}?status=pending`} className={`${ui.button} ${ui.neutral}`}>
            답변 대기 질문{questions.state.status === 'success' && <span className={styles.quickCount}>{pendingCount}</span>}
          </Link>
          <Link to={`${contentListPath}?status=DRAFT`} className={`${ui.button} ${ui.neutral}`}>
            내 초안{contents.state.status === 'success' && <span className={styles.quickCount}>{drafts.length}</span>}
          </Link>
          <Link to={discoverPath} className={`${ui.button} ${ui.neutral}`}>
            다른 멘토 콘텐츠 둘러보기
          </Link>
        </nav>
      </header>

      <HomeSection title="최근 작업" moreTo={contentListPath} state={contents.state} reload={contents.reload} empty="아직 작성한 콘텐츠가 없어요.">
        {contents.state.status === 'success' &&
          contents.state.data.items.slice(0, 4).map((item) => {
            const status = contentStatusView(item)
            return (
              <li key={item.contentId} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.kind}>{contentTypeLabel(item.type)}</p>
                  <Link to={contentPath(item.contentId)} className={styles.rowLink}>
                    {item.title}
                  </Link>
                </div>
                <div className={styles.rowSide}>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className={styles.time}>최근 수정 {formatRelativeTime(item.updatedAt)}</span>
                </div>
              </li>
            )
          })}
      </HomeSection>

      <HomeSection
        title="답변을 기다리는 질문"
        moreTo={questionListPath}
        state={questions.state}
        reload={questions.reload}
        empty="지금 답변을 기다리는 질문이 없어요."
        isEmpty={waiting.length === 0}
      >
        {waiting.slice(0, 3).map((question) => {
          const status = questionStatusView(question.status)
          return (
            <li key={question.questionId} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.kind}>{questionCategoryLabel(question.category)}</p>
                <Link to={questionPath(question.questionId)} className={styles.rowLink}>
                  {question.question}
                </Link>
                <p className={styles.context}>
                  {anonymousContextText(question.anonymousStudentContext)} · {formatRelativeTime(question.submittedAt)}
                </p>
              </div>
              <div className={styles.rowSide}>
                <Badge tone={status.tone}>{status.label}</Badge>
                <Link to={answerPath(question.questionId)} className={styles.inlineAction}>
                  답변하기
                </Link>
              </div>
            </li>
          )
        })}
      </HomeSection>

      <HomeSection
        title="동료 멘토의 새 콘텐츠"
        moreTo={discoverPath}
        state={peers.state}
        reload={peers.reload}
        empty="아직 공개된 다른 멘토의 콘텐츠가 없어요."
      >
        {peers.state.status === 'success' &&
          peers.state.data.slice(0, 3).map((item) => (
            <li key={item.contentId} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.kind}>{contentTypeLabel(item.type)}</p>
                <Link to={discoverContentPath(item.contentId)} className={styles.rowLink}>
                  {item.title}
                </Link>
                <p className={styles.context}>
                  <Avatar name={item.mentor.name} imageUrl={item.mentor.profileImageUrl} size={20} decorative />
                  {item.mentor.name} · {item.mentor.university} {item.mentor.major}
                </p>
              </div>
              <span className={styles.time}>{formatDate(item.publishedAt)}</span>
            </li>
          ))}
      </HomeSection>
    </div>
  )
}

interface HomeSectionProps<T> {
  title: string
  moreTo: string
  state: ResourceState<T>
  reload: () => void
  empty: string
  isEmpty?: boolean
  children: ReactNode
}

function HomeSection<T>({ title, moreTo, state, reload, empty, isEmpty, children }: HomeSectionProps<T>) {
  const id = useId()
  const dataEmpty =
    state.status === 'success' &&
    (isEmpty ?? (Array.isArray(state.data) ? state.data.length === 0 : (state.data as { items?: unknown[] }).items?.length === 0))

  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        <Link to={moreTo} className={styles.more}>
          전체 보기
        </Link>
      </div>
      {state.status === 'loading' && <LoadingState label={`${title}을 불러오는 중이에요.`} rows={2} />}
      {(state.status === 'error' || state.status === 'notFound') && (
        <ErrorState title={`${title}을 불러오지 못했어요.`} error={state.status === 'error' ? state.error : null} onRetry={reload} />
      )}
      {state.status === 'success' && (dataEmpty ? <p className={styles.empty}>{empty}</p> : <ul className={styles.list}>{children}</ul>)}
    </section>
  )
}
