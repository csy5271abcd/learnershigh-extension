import { useState } from 'react'
import { mentorAffiliation } from '../model/format.ts'
import type { MentorProfile } from '../model/types.ts'
import { MentorAvatar } from './MentorAvatar.tsx'
import styles from './MentorProfileHeader.module.css'

interface MentorProfileHeaderProps {
  profile: MentorProfile
  /** Student Q&A 화면이 아직 없어 호출 측에서 연결한다. */
  onAskQuestion?: (mentorId: string) => void
}

export function MentorProfileHeader({ profile, onAskQuestion }: MentorProfileHeaderProps) {
  const { mentor, verified } = profile
  // Follow API가 없어 화면 확인용 Local State로만 둔다. (새로고침 / 다른 화면에서는 유지되지 않음)
  const [following, setFollowing] = useState(false)

  return (
    <header className={styles.header}>
      <MentorAvatar name={mentor.name} imageUrl={mentor.profileImageUrl} size="xl" />
      <div className={styles.identity}>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{mentor.name}</h1>
          {verified && (
            <span className={styles.verified}>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              인증 Mentor
            </span>
          )}
        </div>
        <p className={styles.affiliation}>
          {mentorAffiliation(mentor)} · {mentor.admissionType}
        </p>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.followButton} ${following ? styles.following : ''}`}
          aria-pressed={following}
          onClick={() => setFollowing((value) => !value)}
        >
          {following ? '팔로잉' : '팔로우'}
        </button>
        <button type="button" className={styles.askButton} onClick={() => onAskQuestion?.(mentor.mentorId)}>
          질문하기
        </button>
      </div>
    </header>
  )
}
