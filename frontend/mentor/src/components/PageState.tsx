import type { ReactNode } from 'react'
import { errorMessage } from '../lib/format.ts'
import styles from './PageState.module.css'
import ui from './ui.module.css'

/** Skeleton. 읽는 중임을 Screen Reader에도 알린다. */
export function LoadingState({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div className={styles.skeleton} role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeletonRow} aria-hidden="true">
          <span className={styles.skeletonLine} style={{ width: `${60 - (index % 3) * 12}%` }} />
          <span className={styles.skeletonLine} style={{ width: `${30 + (index % 2) * 14}%` }} />
        </div>
      ))}
    </div>
  )
}

interface MessageStateProps {
  title: string
  description?: string
  children?: ReactNode
}

/** 데이터가 없음 (연동 실패가 아니다) */
export function EmptyState({ title, description, children }: MessageStateProps) {
  return (
    <div className={styles.message}>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {children && <div className={ui.actions}>{children}</div>}
    </div>
  )
}

/** 불러오기 실패 + 다시 시도. Empty와 다른 모양 / 문구를 쓴다. */
export function ErrorState({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <div className={`${styles.message} ${styles.error}`} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{errorMessage(error, '잠시 후 다시 시도해 주세요.')}</p>
      <div className={ui.actions}>
        <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={onRetry}>
          다시 시도
        </button>
      </div>
    </div>
  )
}

/** 404 성격 Detail */
export function NotFoundState({ title, description, children }: MessageStateProps) {
  return (
    <div className={styles.message}>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {children && <div className={ui.actions}>{children}</div>}
    </div>
  )
}
