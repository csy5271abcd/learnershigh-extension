import { contentKindLabel, mentorAffiliation } from '../model/format.ts'
import type { MentorContentSummary, RecommendedMentor } from '../model/types.ts'
import { MentorAvatar } from './MentorAvatar.tsx'
import styles from './RecommendedMentorCard.module.css'

interface RecommendedMentorCardProps {
  recommendation: RecommendedMentor
  onMentorSelect?: (mentorId: string) => void
  onContentSelect?: (content: MentorContentSummary) => void
}

export function RecommendedMentorCard({ recommendation, onMentorSelect, onContentSelect }: RecommendedMentorCardProps) {
  const { mentor, recommendationReason, relatedContent } = recommendation

  return (
    <article className={styles.card}>
      <header className={styles.identity}>
        <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="lg" />
        <div className={styles.identityText}>
          <h3 className={styles.name}>
            {mentor.name}
            <span className={styles.admissionType}>{mentor.admissionType}</span>
          </h3>
          <p className={styles.affiliation}>{mentorAffiliation(mentor)}</p>
        </div>
      </header>

      <div className={styles.reason}>
        <p className={styles.reasonLabel}>추천 이유</p>
        <p className={styles.reasonText}>{recommendationReason}</p>
      </div>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>고교 당시</dt>
          <dd>{mentor.highSchoolContext}</dd>
        </div>
        <div className={styles.fact}>
          <dt>대표 경험</dt>
          <dd>{mentor.representativeExperience}</dd>
        </div>
      </dl>

      {relatedContent.length > 0 && (
        <ul className={styles.relatedList} aria-label={`${mentor.name} 관련 콘텐츠`}>
          {relatedContent.map((content) => (
            <li key={content.contentId}>
              <button type="button" className={styles.relatedItem} onClick={() => onContentSelect?.(content)}>
                <span className={styles.kind}>{contentKindLabel[content.kind]}</span>
                <span className={styles.relatedTitle}>{content.title}</span>
                <span className={styles.chevron} aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {mentor.tags.length > 0 && (
        <ul className={styles.tags} aria-label="Tag">
          {mentor.tags.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      )}

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.profileButton}
          aria-label={`${mentor.name} 프로필 보기`}
          onClick={() => onMentorSelect?.(mentor.mentorId)}
        >
          프로필 보기
          <span aria-hidden="true"> ›</span>
        </button>
      </footer>
    </article>
  )
}
