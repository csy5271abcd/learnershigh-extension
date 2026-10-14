import { useState } from 'react'
import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  /** px */
  size?: number
  /** 이름이 바로 옆에 보이면 장식(alt="")으로 둔다. */
  decorative?: boolean
}

/**
 * Mentor 사진. 사진이 없거나 불러오지 못하면 이름 첫 글자를 보여 준다.
 * (src가 바뀌면 다시 시도하도록 실패한 src를 기억한다)
 */
export function Avatar({ name, imageUrl, size = 40, decorative = false }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(imageUrl) && failedSrc !== imageUrl
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (showImage) {
    return (
      <img
        className={styles.avatar}
        style={style}
        src={imageUrl ?? undefined}
        alt={decorative ? '' : `${name} 프로필 사진`}
        onError={() => setFailedSrc(imageUrl ?? null)}
      />
    )
  }
  return (
    <span
      className={`${styles.avatar} ${styles.fallback}`}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `${name} 프로필 사진 없음`}
      aria-hidden={decorative ? true : undefined}
      data-avatar-fallback=""
    >
      {name.slice(0, 1)}
    </span>
  )
}
