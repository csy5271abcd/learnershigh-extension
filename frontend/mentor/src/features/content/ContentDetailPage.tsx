import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentDetail } from '../../api/types.ts'
import { contentEditPath, contentListPath, contentReviewPendingPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx'
import { ErrorState, LoadingState, NotFoundState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import { useToast } from '../../components/toastContext.ts'
import ui from '../../components/ui.module.css'
import { errorMessage, formatCount, formatDate } from '../../lib/format.ts'
import { invalidateResources, useResource } from '../../lib/useResource.ts'
import { contentStatusView, contentTypeLabel, hasApply, isInReview, isReviewRequired } from '../../model/contentMeta.ts'
import { ContentBodyView } from './body/ContentBodyView.tsx'
import { editBlockedReason } from './model/editability.ts'

export function ContentDetailPage() {
  const { contentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, reload, replace } = useResource(`content:detail:${contentId}`, () => mentorApi.getContent(contentId))

  // App 안에서 왔다면 History Back으로 이전 Filter / Scroll을 그대로 복원한다.
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(contentListPath))

  return (
    <div className={ui.page}>
      <button type="button" className={ui.backLink} onClick={goBack}>
        ‹ 내 콘텐츠
      </button>
      {state.status === 'loading' && <LoadingState label="콘텐츠를 불러오는 중이에요." rows={3} />}
      {state.status === 'error' && <ErrorState title="콘텐츠를 불러오지 못했어요." error={state.error} onRetry={reload} />}
      {state.status === 'notFound' && (
        <NotFoundState title="콘텐츠를 찾을 수 없어요." description="삭제되었거나 내 콘텐츠가 아니에요.">
          <Link to={contentListPath} className={`${ui.button} ${ui.neutral}`}>
            내 콘텐츠로 가기
          </Link>
        </NotFoundState>
      )}
      {state.status === 'success' && <ContentDetail content={state.data} onChange={replace} />}
    </div>
  )
}

function ContentDetail({ content, onChange }: { content: MentorContentDetail; onChange: (next: MentorContentDetail) => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<unknown>(null)
  const inFlight = useRef(false)

  const statusView = contentStatusView(content)
  const reviewRequired = isReviewRequired(content.type)
  const blockedReason = editBlockedReason(content)
  const canPublish = content.status === 'DRAFT' && !isInReview(content)

  const publish = async () => {
    // 중복 클릭으로 같은 요청이 두 번 가지 않게 한다.
    if (inFlight.current) return
    inFlight.current = true
    setConfirming(false)
    setPublishing(true)
    setPublishError(null)
    try {
      const next = await mentorApi.publishContent(content.contentId)
      invalidateResources('content:list')
      onChange(next)
      if (reviewRequired) navigate(contentReviewPendingPath(content.contentId))
      else toast('공개했어요. 이제 Student에게 보여요.')
    } catch (error) {
      setPublishError(error)
    } finally {
      inFlight.current = false
      setPublishing(false)
    }
  }

  return (
    <div className={ui.split}>
      <article className={ui.form} aria-labelledby="content-title">
        <header className={ui.stack}>
          <div className={ui.actions}>
            <Badge>{contentTypeLabel(content.type)}</Badge>
            <Badge tone={statusView.tone}>{statusView.label}</Badge>
          </div>
          <div id="content-title">
            <PageTitle>{content.title}</PageTitle>
          </div>
          {content.tags.length > 0 && (
            <ul className={ui.tagList} aria-label="태그">
              {content.tags.map((tag) => (
                <li key={tag} className={ui.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>
        <ContentBodyView content={content} />
      </article>

      <aside className={ui.aside} aria-label="콘텐츠 상태와 작업">
        <section className={ui.panel} aria-labelledby="content-state-title">
          <h2 id="content-state-title" className={ui.panelTitle}>
            상태
          </h2>
          <dl className={ui.facts}>
            <dt>상태</dt>
            <dd>{statusView.label}</dd>
            <dt>공개 범위</dt>
            <dd>{content.visibility === 'PUBLIC' ? '전체 Student' : content.visibility}</dd>
            <dt>최근 수정</dt>
            <dd>{formatDate(content.updatedAt)}</dd>
            {content.publishedAt && (
              <>
                <dt>공개일</dt>
                <dd>{formatDate(content.publishedAt)}</dd>
              </>
            )}
            {isInReview(content) && content.review.publishRequestedAt && (
              <>
                <dt>검수 요청</dt>
                <dd>{formatDate(content.review.publishRequestedAt)}</dd>
              </>
            )}
          </dl>
        </section>

        {content.status === 'PUBLISHED' && (
          <section className={ui.panel} aria-labelledby="content-metrics-title">
            <h2 id="content-metrics-title" className={ui.panelTitle}>
              Student 반응
            </h2>
            <dl className={ui.facts}>
              <dt>조회</dt>
              <dd>{formatCount(content.metrics.viewCount)}</dd>
              <dt>저장</dt>
              <dd>{formatCount(content.metrics.saveCount)}</dd>
              {hasApply(content.type) && content.metrics.applyCount !== null && (
                <>
                  <dt>내 계획에 적용</dt>
                  <dd>{formatCount(content.metrics.applyCount)}</dd>
                </>
              )}
            </dl>
          </section>
        )}

        <section className={ui.panel} aria-labelledby="content-actions-title">
          <h2 id="content-actions-title" className={ui.panelTitle}>
            작업
          </h2>
          <div className={ui.stack}>
            {isInReview(content) && (
              <p className={`${ui.alert} ${ui.alertWarning}`}>
                검수 중이에요. 개인정보 확인과 운영팀 검수를 마치면 공개돼요.
              </p>
            )}
            {canPublish && (
              <button
                type="button"
                className={`${ui.button} ${ui.primary}`}
                onClick={() => setConfirming(true)}
                disabled={publishing}
                aria-busy={publishing}
              >
                {publishing ? '요청 중…' : reviewRequired ? '검수 요청하기' : '공개하기'}
              </button>
            )}
            {blockedReason ? (
              <p className={ui.help}>{blockedReason}</p>
            ) : (
              <Link to={contentEditPath(content.contentId)} className={`${ui.button} ${ui.neutral}`}>
                수정하기
              </Link>
            )}
            {publishError !== null && (
              <div className={`${ui.alert} ${ui.alertError}`} role="alert">
                <span>{errorMessage(publishError, '요청하지 못했어요.')}</span>
                <button type="button" className={`${ui.button} ${ui.neutral} ${ui.small}`} onClick={publish}>
                  다시 시도
                </button>
              </div>
            )}
          </div>
        </section>
      </aside>

      <ConfirmDialog
        open={confirming}
        title={reviewRequired ? '검수를 요청할까요?' : '공개할까요?'}
        confirmLabel={reviewRequired ? '검수 요청' : '공개'}
        onConfirm={publish}
        onCancel={() => setConfirming(false)}
      >
        {reviewRequired
          ? '개인정보 확인과 운영팀 검수를 마친 뒤 Student에게 공개돼요. 검수 중에는 수정할 수 없어요.'
          : '공개하면 Mentor Hub에서 Student가 이 콘텐츠를 볼 수 있어요.'}
      </ConfirmDialog>
    </div>
  )
}
