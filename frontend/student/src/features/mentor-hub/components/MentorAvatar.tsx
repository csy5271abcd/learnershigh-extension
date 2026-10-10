import { useState } from 'react'
import styles from './MentorAvatar.module.css'

interface MentorAvatarProps {
  name: string
  imageUrl?: string
  size: 'md' | 'lg'
}

// 이름이 옆에 Text로 함께 표시되므로 Avatar는 장식 요소로 취급한다. (alt="" + aria-hidden)
// Image가 없거나 Load에 실패하면 이름 첫 글자 Placeholder를 보여준다.
export function MentorAvatar({ name, imageUrl, size }: MentorAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const showImage = imageUrl !== undefined && imageUrl !== failedUrl

  return (
    <span className={`${styles.avatar} ${styles[size]}`} aria-hidden="true">
      {showImage ? (
        <img
          className={styles.image}
          src={imageUrl}
          alt=""
          decoding="async"
          loading={size === 'md' ? 'lazy' : 'eager'}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  )
}
