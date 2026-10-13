import { useState } from 'react'
import { mentorPhotoFixture } from '../../fixtures/adminMentorPhotos.fixture.ts'
import styles from './MentorContent.module.css'

/*
 * Mentor Profile 사진 (Student MentorAvatar와 같은 규칙)
 * - 이름이 바로 옆에 글자로 함께 보이므로 사진은 장식이다. (alt="" + aria-hidden)
 * - 사진이 없거나 불러오지 못하면 이름 첫 글자 중립 Placeholder로 바꾼다. (깨진 이미지 표시 없음)
 */
export function MentorPhoto({ mentorId, name, size = 'list' }: { mentorId: string; name: string; size?: 'list' | 'profile' }) {
  const url = mentorPhotoFixture[mentorId] ?? null
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const show = url !== null && url !== failedUrl
  return (
    <span className={styles.photo} data-size={size} data-fallback={show ? undefined : 'true'} aria-hidden="true">
      {show ? <img src={url} alt="" decoding="async" loading={size === 'list' ? 'lazy' : 'eager'} onError={() => setFailedUrl(url)} /> : name.slice(0, 1)}
    </span>
  )
}
