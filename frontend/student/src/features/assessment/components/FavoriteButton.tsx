import { StarIcon } from './AssessmentIcons.tsx'
import styles from './FavoriteButton.module.css'

interface FavoriteButtonProps {
  /** undefined = 즐겨찾기 상태를 아직 모름 (누를 수 없음) */
  favorite: boolean | undefined
  pending: boolean
  /** 대상 이름. 읽기 이름은 "<이름> 즐겨찾기" */
  title: string
  onToggle: () => void
  size?: 'small' | 'medium'
}

// 즐겨찾기 별표 (채움 = 즐겨찾기, 선 = 아님). 누름 영역은 최소 28px(작은 크기) 이상이며 aria-pressed로 상태를 읽는다.
export function FavoriteButton({ favorite, pending, title, onToggle, size = 'small' }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      data-size={size}
      aria-pressed={favorite ?? false}
      aria-label={`${title} 즐겨찾기`}
      title={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
      disabled={pending || favorite === undefined}
      aria-busy={pending || undefined}
      onClick={(event) => {
        // 행 전체가 링크·버튼인 곳에서도 별표만 동작하게 한다.
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      <StarIcon size={size === 'medium' ? 20 : 17} filled={favorite === true} />
    </button>
  )
}
