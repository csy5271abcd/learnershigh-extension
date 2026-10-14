import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { discoverApi } from '../../api/discover/discoverApi.ts'
import type { PublishedMentorContentDetail } from '../../api/discover/types.ts'
import { discoverMentorPath, discoverPath } from '../../app/paths.ts'
import { ErrorState, LoadingState, NotFoundState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatDate } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { contentTypeLabel } from '../../model/contentMeta.ts'
import { ContentBodyView } from '../../content-body/ContentBodyView.tsx'
import { AuthorLine } from './components/AuthorLine.tsx'
import styles from './DiscoverContentPage.module.css'

// 다른 Mentor의 Published Content. 읽기 전용 참고 자료다:
// 수정 / 삭제 / 공개 / 검수 요청 / 복제 / 내 콘텐츠로 복사 Action과 조회 · 저장 수 같은 비공개 Metrics는 두지 않는다.
export function DiscoverContentPage() {
  const { contentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, reload } = useResource(`discover:content:${contentId}`, () => discoverApi.getPublishedContent(contentId))
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(discoverPath))

  return (
    <div className={ui.page}>
      <button type="button" className={ui.backLink} onClick={goBack}>
        ‹ 둘러보기
      </button>
      {state.status === 'loading' && <LoadingState label="콘텐츠를 불러오는 중이에요." rows={3} />}
      {state.status === 'error' && <ErrorState title="콘텐츠를 불러오지 못했어요." error={state.error} onRetry={reload} />}
      {state.status === 'notFound' && (
        <NotFoundState title="공개된 콘텐츠를 찾을 수 없어요." description="공개가 끝났거나 아직 공개되지 않은 콘텐츠예요.">
          <Link to={discoverPath} className={`${ui.button} ${ui.neutral}`}>
            둘러보기로 가기
          </Link>
        </NotFoundState>
      )}
      {state.status === 'success' && <PublishedContent content={state.data} />}
    </div>
  )
}

function PublishedContent({ content }: { content: PublishedMentorContentDetail }) {
  return (
    <div className={ui.split}>
      <article className={styles.article} aria-labelledby="published-title">
        <header className={styles.header}>
          <p className={styles.type}>{contentTypeLabel(content.type)}</p>
          <div id="published-title">
            <PageTitle>{content.title}</PageTitle>
          </div>
          <AuthorLine author={content.mentor} />
          {content.tags.length > 0 && <p className={styles.tags}>{content.tags.join(' · ')}</p>}
        </header>
        <ContentBodyView content={content} />
      </article>
      <aside className={ui.aside} aria-label="콘텐츠 정보">
        <section className={ui.panel} aria-labelledby="published-info-title">
          <h2 id="published-info-title" className={ui.panelTitle}>
            공개 정보
          </h2>
          <dl className={ui.facts}>
            <dt>유형</dt>
            <dd>{contentTypeLabel(content.type)}</dd>
            <dt>공개일</dt>
            <dd>{formatDate(content.publishedAt)}</dd>
            <dt>작성</dt>
            <dd>{content.mentor.name}</dd>
          </dl>
        </section>
        <section className={ui.panel}>
          <p className={ui.help}>다른 멘토의 공개 콘텐츠는 참고용으로만 볼 수 있어요.</p>
          <Link to={discoverMentorPath(content.mentor.mentorId)} className={`${ui.button} ${ui.neutral} ${styles.profileLink}`}>
            {content.mentor.name} 멘토 프로필 보기
          </Link>
        </section>
      </aside>
    </div>
  )
}
