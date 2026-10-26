import type { ReactNode } from 'react'
import type { ApiError } from '../api/apiError.ts'
import { AlertIcon, RefreshIcon } from './AssessmentIcons.tsx'
import styles from './StateViews.module.css'

// Loading / Empty / Error 공통 표현. Empty와 Error는 서로 다른 문구·아이콘·Action을 쓴다 (testing.md §10).

export function LoadingRows({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className="lh-visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeletonRow} aria-hidden="true">
          <span className={styles.skeletonTitle} />
          <span className={styles.skeletonMeta} />
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title: string
  error: ApiError
  onRetry: () => void
}

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.error} role="alert">
      <AlertIcon className={styles.errorIcon} size={22} />
      <p className={styles.errorTitle}>{title}</p>
      <p className={styles.errorMessage}>
        {error.message} <span className={styles.errorCode}>({error.code})</span>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          <RefreshIcon size={16} />
          다시 시도
        </button>
      </div>
    </div>
  )
}
