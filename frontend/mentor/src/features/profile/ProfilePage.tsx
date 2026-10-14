import { Link } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorProfile } from '../../api/types.ts'
import { contentPath, createPath, profileEditPath } from '../../app/paths.ts'
import { Avatar } from '../../components/Avatar.tsx'
import { TypeIcon } from '../../components/icons.tsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import styles from '../../components/ProfileLayout.module.css'
import ui from '../../components/ui.module.css'
import { formatCount, formatDate } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { contentTypeLabel, contentTypes } from '../../model/contentMeta.ts'

// 내 Profile (Manage Identity): Student Mentor Hub와 다른 Mentor에게 보이는 내 공개 정보와 공개 콘텐츠.
// Student 관리 데이터는 다루지 않는다. (frontend-mentor.md §11)
export function ProfilePage() {
  const { state, reload } = useResource('profile', () => mentorApi.getProfile())

  return (
    <div className={ui.page}>
      {state.status === 'loading' && <LoadingState label="프로필을 불러오는 중이에요." rows={3} />}
      {(state.status === 'error' || state.status === 'notFound') && (
        <ErrorState title="프로필을 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
      )}
      {state.status === 'success' && (
        <>
          <ProfileIdentity profile={state.data} />
          <PublicFields profile={state.data} />
          <PublishedContent />
        </>
      )}
    </div>
  )
}

function ProfileIdentity({ profile }: { profile: MentorProfile }) {
  return (
    <section className={styles.identity} aria-labelledby="profile-name">
      <Avatar name={profile.name} imageUrl={profile.profileImageUrl} size={104} />
      <div className={styles.identityText}>
        <div id="profile-name">
          <PageTitle>{profile.name}</PageTitle>
        </div>
        <p className={styles.affiliation}>
          {profile.university} · {profile.major}
        </p>
        <p className={styles.meta}>
          {profile.admissionType}
          {profile.verified && ' · 인증 Mentor'}
        </p>
      </div>
      <Link to={profileEditPath} className={`${ui.button} ${ui.neutral}`}>
        프로필 수정
      </Link>
    </section>
  )
}

function PublicFields({ profile }: { profile: MentorProfile }) {
  return (
    <section className={styles.section} aria-labelledby="public-profile-title">
      <h2 id="public-profile-title" className={styles.sectionTitle}>
        공개 프로필
      </h2>
      <p className={`${ui.help} ${styles.sectionHelp}`}>Student와 다른 멘토가 보는 정보예요.</p>
      <dl className={styles.fields}>
        <div className={styles.field}>
          <dt>고교 Context</dt>
          <dd>{profile.highSchoolContext}</dd>
        </div>
        <div className={styles.field}>
          <dt>대표 경험</dt>
          <dd>{profile.representativeExperience}</dd>
        </div>
        <div className={styles.field}>
          <dt>태그</dt>
          <dd className={styles.tags}>{profile.tags.length > 0 ? profile.tags.join(' · ') : '없음'}</dd>
        </div>
      </dl>
    </section>
  )
}

function PublishedContent() {
  const { state, reload } = useResource('content:list:all:PUBLISHED', () =>
    mentorApi.listContent({ status: 'PUBLISHED', size: 100 }),
  )

  return (
    <section className={styles.section} aria-labelledby="published-title">
      <h2 id="published-title" className={styles.sectionTitle}>
        내 공개 콘텐츠
      </h2>
      {state.status === 'loading' && <LoadingState label="공개한 콘텐츠를 불러오는 중이에요." rows={2} />}
      {(state.status === 'error' || state.status === 'notFound') && (
        <ErrorState title="공개한 콘텐츠를 불러오지 못했어요." error={state.status === 'error' ? state.error : null} onRetry={reload} />
      )}
      {state.status === 'success' &&
        (state.data.items.length === 0 ? (
          <EmptyState title="아직 공개한 콘텐츠가 없어요." description="공개한 콘텐츠는 Student와 다른 멘토가 내 프로필에서 볼 수 있어요.">
            <Link to={createPath} className={`${ui.button} ${ui.primary}`}>
              새 콘텐츠 작성
            </Link>
          </EmptyState>
        ) : (
          <>
            <p className={styles.typeCounts} aria-label="유형별 공개 콘텐츠 수">
              {contentTypes.map((type) => {
                const count = state.data.items.filter((item) => item.type === type.id).length
                return count > 0 ? (
                  <span key={type.id}>
                    {type.label}
                    <strong>{count}</strong>
                  </span>
                ) : null
              })}
            </p>
            <ul className={styles.list}>
              {state.data.items.map((content) => (
                <li key={content.contentId} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.type}>
                      <TypeIcon type={content.type} />
                      {contentTypeLabel(content.type)}
                    </p>
                    <Link to={contentPath(content.contentId)} className={styles.rowLink}>
                      {content.title}
                    </Link>
                    <p className={styles.summary}>
                      조회 {formatCount(content.metrics.viewCount)} · 저장 {formatCount(content.metrics.saveCount)}
                    </p>
                  </div>
                  {content.publishedAt && <span className={styles.date}>{formatDate(content.publishedAt)}</span>}
                </li>
              ))}
            </ul>
          </>
        ))}
    </section>
  )
}
