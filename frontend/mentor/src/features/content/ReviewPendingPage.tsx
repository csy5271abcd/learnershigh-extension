import { Link, useParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentDetail } from '../../api/types.ts'
import { contentListPath, contentPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { ErrorState, LoadingState, NotFoundState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatDate } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { contentTypeLabel, isInReview } from '../../model/contentMeta.ts'
import styles from './ReviewPendingPage.module.css'

// Record / Case 검수 요청 후 화면.
// 검수 단계 이름은 Feature Spec 흐름(PII Detection → Admin Review → Published)을 안내로만 보여 준다.
// 지금 어느 단계인지는 Canonical Review State(OD-05) 확정 전이라 "검수 대기"로만 표시한다.
const reviewSteps = [
  { title: '개인정보 확인', description: '학교명 · 교사명 · 학번 같은 식별 정보가 남아 있는지 확인해요.' },
  { title: '운영팀 검수', description: '운영팀이 기록과 활동 내용을 확인해요.' },
  { title: '공개', description: '검수를 마치면 Mentor Hub에서 Student에게 보여요.' },
]

export function ReviewPendingPage() {
  const { contentId = '' } = useParams()
  const { state, reload } = useResource(`content:detail:${contentId}`, () => mentorApi.getContent(contentId))

  return (
    <div className={ui.page}>
      {state.status === 'loading' && <LoadingState label="검수 상태를 불러오는 중이에요." rows={2} />}
      {state.status === 'error' && <ErrorState title="검수 상태를 불러오지 못했어요." error={state.error} onRetry={reload} />}
      {state.status === 'notFound' && (
        <NotFoundState title="콘텐츠를 찾을 수 없어요.">
          <Link to={contentListPath} className={`${ui.button} ${ui.neutral}`}>
            내 콘텐츠로 가기
          </Link>
        </NotFoundState>
      )}
      {state.status === 'success' && <ReviewPending content={state.data} />}
    </div>
  )
}

function ReviewPending({ content }: { content: MentorContentDetail }) {
  const inReview = isInReview(content)
  const published = content.status === 'PUBLISHED'

  return (
    <section className={styles.wrap} aria-labelledby="review-title">
      <div className={ui.actions}>
        <Badge>{contentTypeLabel(content.type)}</Badge>
        <Badge tone={published ? 'positive' : inReview ? 'warning' : 'neutral'}>
          {published ? '공개됨' : inReview ? '검수 대기' : '초안'}
        </Badge>
      </div>
      <div id="review-title">
        <PageTitle>
          {published ? '검수를 마치고 공개됐어요' : inReview ? '검수를 요청했어요' : '아직 검수를 요청하지 않았어요'}
        </PageTitle>
      </div>
      <p className={styles.contentTitle}>{content.title}</p>
      {inReview && (
        <p className={ui.pageLead}>
          검수가 끝나기 전에는 Student에게 보이지 않고, 수정할 수도 없어요.
          {content.review.publishRequestedAt && ` 요청일 ${formatDate(content.review.publishRequestedAt)}`}
        </p>
      )}

      <ol className={styles.steps} aria-label="공개까지 거치는 단계">
        {reviewSteps.map((step, index) => {
          const done = published
          return (
            <li key={step.title} className={`${styles.step} ${done ? styles.done : ''}`}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <p className={styles.stepTitle}>
                  {step.title}
                  {done && <span className="visually-hidden"> (완료)</span>}
                </p>
                <p className={ui.help}>{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className={ui.actions}>
        <Link to={contentPath(content.contentId)} className={`${ui.button} ${ui.primary}`}>
          콘텐츠 보기
        </Link>
        <Link to={contentListPath} className={`${ui.button} ${ui.neutral}`}>
          내 콘텐츠로 가기
        </Link>
      </div>
    </section>
  )
}
