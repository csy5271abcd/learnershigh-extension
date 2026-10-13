import { mentorAffiliation } from '../model/format.ts'
import type { MentorListItem } from '../model/types.ts'
import { MentorAvatar } from './MentorAvatar.tsx'
import styles from './MentorListCard.module.css'

interface MentorListCardProps {
  item: MentorListItem
  onMentorSelect: (mentorId: string) => void
}

// 이름 Button이 Card 전체 영역으로 확장되어 Card 어디를 눌러도 Profile로 이동한다. (Card 안 다른 Interactive 요소 없음)
export function MentorListCard({ item, onMentorSelect }: MentorListCardProps) {
  const { mentor, contentCount } = item

  return (
    <article className={styles.card}>
      <div className={styles.identity}>
        <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="lg" />
        <div className={styles.identityText}>
          <h3 className={styles.nameRow}>
            <button type="button" className={styles.nameButton} onClick={() => onMentorSelect(mentor.mentorId)}>
              {mentor.name}
              <span className="lh-visually-hidden"> 프로필 보기</span>
            </button>
            <span className={styles.admissionType}>{mentor.admissionType}</span>
          </h3>
          <p className={styles.affiliation}>{mentorAffiliation(mentor)}</p>
        </div>
      </div>

      <p className={styles.highSchool}>{mentor.highSchoolContext}</p>
      <p className={styles.experience}>{mentor.representativeExperience}</p>

      {mentor.tags.length > 0 && (
        <ul className={styles.tags} aria-label="Tag">
          {mentor.tags.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      )}

      <div className={styles.footer}>
        <span className={styles.meta}>콘텐츠 {contentCount}개</span>
        <span className={styles.cta} aria-hidden="true">
          프로필 보기 ›
        </span>
      </div>
    </article>
  )
}
