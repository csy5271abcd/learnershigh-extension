import type { ApiError } from '../api/apiClient.ts'

/** 불러오는 중 / 빈 상태 / 오류를 구분해서 보여준다. 오류는 빈 상태로 바꾸지 않는다. */
export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <p className="sc-state sc-state--loading" role="status" aria-live="polite">
      {label}
    </p>
  )
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="sc-state sc-state--empty">
      <p className="sc-state__title">{title}</p>
      {description && <p className="sc-state__description">{description}</p>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const title =
    error.code === 'EXISTING_STUDY_DATA_UNAVAILABLE'
      ? '학습 기록을 불러오지 못했습니다'
      : error.code === 'NETWORK_ERROR'
        ? '서버에 연결하지 못했습니다'
        : '요청을 처리하지 못했습니다'
  return (
    <div className="sc-state sc-state--error" role="alert">
      <p className="sc-state__title">{title}</p>
      <p className="sc-state__description">{error.message}</p>
      {onRetry && (
        <button type="button" className="sc-button sc-button--secondary" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}

/** 폼 제출 실패 안내. */
export function InlineError({ error }: { error: ApiError | null }) {
  if (!error) return null
  return (
    <p className="sc-inline-error" role="alert">
      {error.message}
    </p>
  )
}
