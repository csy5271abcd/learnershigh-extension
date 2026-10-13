import { mentorAffiliation } from '../model/format.ts'
import type { MentorSummary } from '../model/types.ts'
import { MentorAvatar } from './MentorAvatar.tsx'
import styles from './OtherMentorRow.module.css'

interface OtherMentorRowProps {
  mentor: MentorSummary
  onMentorSelect?: (mentorId: string) => void
}

// 추천 Mentor보다 낮은 위계의 Compact Row. Row 전체가 Profile CTA다.
export function OtherMentorRow({ mentor, onMentorSelect }: OtherMentorRowProps) {
  return (
    <button type="button" className={styles.row} onClick={() => onMentorSelect?.(mentor.mentorId)}>
      <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="md" />
      <span className={styles.text}>
        <span className={styles.name}>
          {mentor.name}
          <span className={styles.admissionType}>{mentor.admissionType}</span>
        </span>
        <span className={styles.summary}>
          {mentorAffiliation(mentor)} · {mentor.representativeExperience}
        </span>
      </span>
      <span className={styles.profileHint}>
        <span className="lh-visually-hidden">프로필 보기</span>
        <span aria-hidden="true">›</span>
      </span>
    </button>
  )
}
