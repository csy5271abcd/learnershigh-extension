import { useState } from 'react'
import { Link } from 'react-router'
import { mentorApi } from '../../api/mentorApi.ts'
import type { MentorContentType, MentorProfile } from '../../api/types.ts'
import { contentPath, createPath, profileEditPath } from '../../app/paths.ts'
import { Badge } from '../../components/Badge.tsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.tsx'
import { PageTitle } from '../../components/PageTitle.tsx'
import ui from '../../components/ui.module.css'
import { formatCount } from '../../lib/format.ts'
import { useResource } from '../../lib/useResource.ts'
import { contentTypeLabel, contentTypes } from '../../model/contentMeta.ts'
import styles from './ProfilePage.module.css'

// Mentor 공개 Profile: Student Mentor Hub의 Mentor Profile에 보이는 값과 같은 Entity다. (domain.md §28)
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
          <ProfileHeader profile={state.data} />
          <PublishedContent />
        </>
      )}
    </div>
  )
}

function ProfileHeader({ profile }: { profile: MentorProfile }) {
  return (
    <section className={styles.header} aria-labelledby="profile-name">
      <div className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">
          {profile.name.slice(0, 1)}
        </span>
        <div>
          <div className={styles.nameRow} id="profile-name">
            <PageTitle>{profile.name}</PageTitle>
            {profile.verified && <Badge tone="positive">재학 인증</Badge>}
          </div>
          <p className={styles.affiliation}>
            {profile.university} {profile.major}
          </p>
        </div>
        <Link to={profileEditPath} className={`${ui.button} ${ui.neutral} ${styles.edit}`}>
          프로필 수정
        </Link>
      </div>
      <p className={ui.help}>Student가 Mentor Hub에서 보는 내 공개 프로필이에요.</p>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>고교 당시</dt>
          <dd>{profile.highSchoolContext}</dd>
        </div>
        <div className={styles.fact}>
          <dt>전형</dt>
          <dd>{profile.admissionType}</dd>
        </div>
        <div className={`${styles.fact} ${styles.factWide}`}>
          <dt>대표 경험</dt>
          <dd>{profile.representativeExperience}</dd>
        </div>
      </dl>

      {profile.tags.length > 0 && (
        <ul className={ui.tagList} aria-label="태그">
          {profile.tags.map((tag) => (
            <li key={tag} className={ui.tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PublishedContent() {
  const { state, reload } = useResource('content:list:all:PUBLISHED', () =>
    mentorApi.listContent({ status: 'PUBLISHED', size: 100 }),
  )
  const [type, setType] = useState<MentorContentType | 'ALL'>('ALL')

  return (
    <section className={styles.contents} aria-labelledby="published-title">
      <h2 id="published-title" className={ui.sectionTitle}>
        공개한 콘텐츠
      </h2>
      {state.status === 'loading' && <LoadingState label="공개한 콘텐츠를 불러오는 중이에요." rows={2} />}
      {(state.status === 'error' || state.status === 'notFound') && (
        <ErrorState
          title="공개한 콘텐츠를 불러오지 못했어요."
          error={state.status === 'error' ? state.error : null}
          onRetry={reload}
        />
      )}
      {state.status === 'success' &&
        (state.data.items.length === 0 ? (
          <EmptyState title="아직 공개한 콘텐츠가 없어요." description="공개한 콘텐츠는 Student가 내 프로필에서 볼 수 있어요.">
            <Link to={createPath} className={`${ui.button} ${ui.primary}`}>
              새 글 쓰기
            </Link>
          </EmptyState>
        ) : (
          <>
            <div className={ui.chips} role="group" aria-label="유형">
              <button type="button" className={ui.chip} aria-pressed={type === 'ALL'} onClick={() => setType('ALL')}>
                전체 {state.data.items.length}
              </button>
              {contentTypes.map((item) => {
                const count = state.data.items.filter((content) => content.type === item.id).length
                if (count === 0) return null
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={ui.chip}
                    aria-pressed={type === item.id}
                    onClick={() => setType(item.id)}
                  >
                    {item.label} {count}
                  </button>
                )
              })}
            </div>
            <ul className={styles.cards}>
              {state.data.items
                .filter((content) => type === 'ALL' || content.type === type)
                .map((content) => (
                  <li key={content.contentId}>
                    <Link to={contentPath(content.contentId)} className={styles.card}>
                      <Badge>{contentTypeLabel(content.type)}</Badge>
                      <span className={styles.cardTitle}>{content.title}</span>
                      <span className={ui.meta}>
                        조회 {formatCount(content.metrics.viewCount)} · 저장 {formatCount(content.metrics.saveCount)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </>
        ))}
    </section>
  )
}
