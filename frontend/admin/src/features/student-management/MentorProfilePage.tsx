import { useEffect, useRef } from 'react'
import { ChipGroup } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { InlineStats, ToneTag } from '../../components/AdminVisual.tsx'
import { MentorPhoto } from './MentorPhoto.tsx'
import type { MentorContentType, MentorProfileRecord } from '../../fixtures/types.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { allMentorContent, mentorContentCounts, mentorContentTypeLabel, mentorContentTypes, type MentorContentItem } from '../../read-model/mentorContent.ts'
import { MentorContentGrid } from './MentorContentCards.tsx'
import styles from './MentorContent.module.css'

/*
 * Admin Mentor Profile (/mentors/:mentorId) — 추천 전에 Mentor Context를 확인한다.
 * - 값은 Student Mentor Hub Canonical MentorProfile 그대로다. (adminMentorContent.fixture.ts)
 * - 공개 Content 수는 Content의 mentorId로 계산한다. (read-model/mentorContent.ts)
 * - Admin Mentor Profile API Shape은 Contract에 없다. (Gap) Fixture에서 mentorId로 찾는다.
 */

interface MentorProfilePageProps {
  state: AdminState
  profile: MentorProfileRecord
  tab: MentorContentType | 'all'
  onTabChange: (tab: MentorContentType | 'all') => void
  onBack: () => void
  backLabel: string
  onOpenContent: (item: MentorContentItem) => void
}

export function MentorProfilePage({ state, profile, tab, onTabChange, onBack, backLabel, onOpenContent }: MentorProfilePageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [profile.mentorId])
  const counts = mentorContentCounts(state, profile.mentorId)
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const contents = allMentorContent(state).filter((item) => item.mentorId === profile.mentorId)
  const shown = tab === 'all' ? contents : contents.filter((item) => item.type === tab)
  const score = profile.scoreSummary

  return (
    <div className={ui.page}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabel}
        <span className="lh-visually-hidden">로 돌아가기</span>
      </button>

      {/* Profile Hero: 이름 · 대학 학과 · 전형 · 대표 경험 */}
      <section className={styles.profileHero} aria-labelledby="mentor-name">
        <MentorPhoto mentorId={profile.mentorId} name={profile.name} size="profile" />
        <div className={styles.profileHead}>
          <p className={ui.muted}>Mentor Profile</p>
          <h1 id="mentor-name" ref={headingRef} tabIndex={-1} className={styles.profileName}>
            {profile.name}
            {profile.verified && (
              <ToneTag tone="neutral">합격 인증</ToneTag>
            )}
          </h1>
          <p className={styles.profileAffiliation}>
            {profile.university} {profile.major} · {profile.admissionType}
          </p>
          <p className={styles.highlightBox}>
            <span className={ui.cellSub}>대표 경험</span>
            <br />
            {profile.representativeExperience}
          </p>
          <InlineStats
            label="공개 Content 수"
            items={[
              ...mentorContentTypes.filter((type) => type !== 'case').map((type) => ({ label: mentorContentTypeLabel[type], value: counts[type] })),
              { label: 'Case', value: counts.case },
            ]}
          />
        </div>
      </section>

      <div className={styles.profileGrid}>
        <section className={styles.detailSection} aria-labelledby="mentor-context">
          <h2 id="mentor-context" className={ui.sectionTitle}>
            고교 Context
          </h2>
          <p>{profile.highSchoolContext}</p>
          <ul className={styles.tagList} aria-label="Mentor Tag">
            {profile.tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
          {score?.schoolGrades && (
            <>
              <h3 className={ui.subTitle}>내신 ({score.schoolGrades.scaleLabel})</h3>
              <ol className={styles.termRow}>
                {score.schoolGrades.terms.map((term) => (
                  <li key={term.term}>
                    <span className={ui.cellSub}>{term.term}</span>
                    <strong>{term.averageGrade}</strong>
                  </li>
                ))}
              </ol>
            </>
          )}
          {score?.csat && (
            <>
              <h3 className={ui.subTitle}>수능 ({score.csat.basisLabel})</h3>
              <ul className={styles.termRow}>
                {score.csat.subjects.map((subject) => (
                  <li key={`${subject.area}-${subject.subject}`}>
                    <span className={ui.cellSub}>
                      {subject.area} · {subject.subject}
                    </span>
                    <strong>{subject.grade}등급</strong>
                    {subject.percentile !== null && <span className={ui.cellSub}>백분위 {subject.percentile}</span>}
                  </li>
                ))}
              </ul>
              {score.csat.minimumRequirement && <p className={ui.cellSub}>{score.csat.minimumRequirement}</p>}
            </>
          )}
          {score?.note && <p className={ui.muted}>{score.note}</p>}
        </section>
        <section className={styles.detailSection} aria-labelledby="mentor-experience">
          <h2 id="mentor-experience" className={ui.sectionTitle}>
            경험
          </h2>
          <ul className={styles.experienceList}>
            {profile.experiences.map((experience) => (
              <li key={experience.title}>
                <span className={ui.cellMain}>{experience.title}</span>
                <span className={ui.cellSub}>{experience.description}</span>
              </li>
            ))}
          </ul>
          <p className={ui.cellSub}>
            Mentor에게는 추천 대상 학생 정보가 전달되지 않아요.
          </p>
        </section>
      </div>

      <section className={ui.section} aria-labelledby="mentor-contents">
        <div className={ui.sectionHead}>
          <h2 id="mentor-contents" className={ui.sectionTitle}>
            공개 Content {total}
          </h2>
        </div>
        <ChipGroup
          label="Profile 콘텐츠 유형"
          value={tab}
          options={[{ value: 'all', label: `전체 ${total}` }, ...mentorContentTypes.map((type) => ({ value: type, label: `${mentorContentTypeLabel[type]} ${counts[type]}` }))]}
          onChange={(value) => onTabChange(value as MentorContentType | 'all')}
        />
        {shown.length === 0 ? (
          <p className={ui.muted}>이 유형의 공개 Content가 없어요.</p>
        ) : (
          <MentorContentGrid items={shown} label={`${profile.name} Mentor 콘텐츠 ${shown.length}개`} onOpen={onOpenContent} />
        )}
      </section>
    </div>
  )
}
