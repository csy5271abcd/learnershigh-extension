import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { discoverApi } from '../../api/discover/discoverApi.ts'
import type { PublicMentorDetail } from '../../api/discover/types.ts'
import type { MentorContentType } from '../../api/types.ts'
import { discoverContentPath, discoverPath } from '../../app/paths.ts'
import { Avatar } from '../../components/Avatar.tsx'
import { TypeIcon } from '../../components/icons.tsx'
import { EmptyState, ErrorState, LoadingState, NotFoundState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatDate } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { contentTypeLabel, contentTypes } from '../../model/contentMeta.ts'
import styles from '../../components/ProfileLayout.module.css'

// 다른 Mentor 공개 Profile (Explore Identity). 공개 Profile Field와 Published Content만 보인다.
// Profile 수정 / 질문 Inbox / Draft / Metrics는 없다.
export function MentorPublicProfilePage() {
  const { mentorId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, reload } = useResource(`discover:mentor:${mentorId}`, () => discoverApi.getMentor(mentorId))
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(`${discoverPath}?view=mentors`))

  return (
    <div className={ui.page}>
      <button type="button" className={ui.backLink} onClick={goBack}>
        ‹ 둘러보기
      </button>
      {state.status === 'loading' && <LoadingState label="멘토 프로필을 불러오는 중이에요." rows={3} />}
      {state.status === 'error' && <ErrorState title="멘토 프로필을 불러오지 못했어요." error={state.error} onRetry={reload} />}
      {state.status === 'notFound' && (
        <NotFoundState title="멘토를 찾을 수 없어요.">
          <Link to={`${discoverPath}?view=mentors`} className={`${ui.button} ${ui.neutral}`}>
            멘토 둘러보기
          </Link>
        </NotFoundState>
      )}
      {state.status === 'success' && <PublicProfile detail={state.data} />}
    </div>
  )
}

function PublicProfile({ detail }: { detail: PublicMentorDetail }) {
  const { mentor, contents } = detail
  const [type, setType] = useState<MentorContentType | 'ALL'>('ALL')
  const types = contentTypes.filter((item) => contents.some((content) => content.type === item.id))

  return (
    <>
      <section className={styles.identity} aria-labelledby="mentor-name">
        <Avatar name={mentor.name} imageUrl={mentor.profileImageUrl} size={104} />
        <div className={styles.identityText}>
          <div id="mentor-name">
            <PageTitle>{mentor.name}</PageTitle>
          </div>
          <p className={styles.affiliation}>
            {mentor.university} · {mentor.major}
          </p>
          <p className={styles.meta}>
            {mentor.admissionType}
            {mentor.verified && ' · 인증 Mentor'}
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="public-info-title">
        <h2 id="public-info-title" className={styles.sectionTitle}>
          공개 프로필
        </h2>
        <dl className={styles.fields}>
          <div className={styles.field}>
            <dt>고교 Context</dt>
            <dd>{mentor.highSchoolContext}</dd>
          </div>
          <div className={styles.field}>
            <dt>대표 경험</dt>
            <dd>{mentor.representativeExperience}</dd>
          </div>
          {mentor.tags.length > 0 && (
            <div className={styles.field}>
              <dt>태그</dt>
              <dd className={styles.tags}>{mentor.tags.join(' · ')}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="public-content-title">
        <div className={styles.sectionHead}>
          <h2 id="public-content-title" className={styles.sectionTitle}>
            공개 콘텐츠 <span className={styles.count}>{contents.length}</span>
          </h2>
          {types.length > 1 && (
            <div className={ui.chips} role="group" aria-label="유형">
              <button type="button" className={ui.chip} aria-pressed={type === 'ALL'} onClick={() => setType('ALL')}>
                전체
              </button>
              {types.map((item) => (
                <button key={item.id} type="button" className={ui.chip} aria-pressed={type === item.id} onClick={() => setType(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {contents.length === 0 ? (
          <EmptyState title="아직 공개한 콘텐츠가 없어요." />
        ) : (
          <ul className={styles.list}>
            {contents
              .filter((content) => type === 'ALL' || content.type === type)
              .map((content) => (
                <li key={content.contentId} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.type}>
                      <TypeIcon type={content.type} />
                      {contentTypeLabel(content.type)}
                    </p>
                    <Link to={discoverContentPath(content.contentId)} className={styles.rowLink}>
                      {content.title}
                    </Link>
                    <p className={styles.summary}>{content.summary}</p>
                  </div>
                  <span className={styles.date}>{formatDate(content.publishedAt)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </>
  )
}
