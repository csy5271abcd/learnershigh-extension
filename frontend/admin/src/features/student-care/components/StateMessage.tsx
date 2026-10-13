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

function errorTitle(error: ApiError): string {
  switch (error.code) {
    case 'EXISTING_STUDY_DATA_UNAVAILABLE':
      return '학습 기록을 불러오지 못했습니다'
    case 'NETWORK_ERROR':
      return '서버에 연결하지 못했습니다'
    case 'CONCURRENT_MODIFICATION':
      return '다른 변경과 겹쳤습니다'
    default:
      return '요청을 처리하지 못했습니다'
  }
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="sc-state sc-state--error" role="alert">
      <p className="sc-state__title">{errorTitle(error)}</p>
      <p className="sc-state__description">{error.message}</p>
      {onRetry && (
        <button type="button" className="sc-button sc-button--secondary" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}

/**
 * 이미 보여주던 데이터를 다시 불러오다 실패했을 때. 빈 상태와 구분하고,
 * 아래 내용이 최신이 아닐 수 있음을 함께 알린다.
 */
export function StaleError({ what, error, onRetry }: { what: string; error: ApiError; onRetry: () => void }) {
  return (
    <div className="sc-stale" role="alert">
      <p className="sc-stale__text">
        <strong>{what}을(를) 다시 불러오지 못했습니다.</strong> 아래는 이전에 불러온 내용이라 최신이 아닐 수 있습니다.{' '}
        <span className="sc-stale__reason">{error.message}</span>
      </p>
      <button type="button" className="sc-button sc-button--secondary" onClick={onRetry}>
        다시 시도
      </button>
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

/** 입력 칸 바로 아래 오류. 입력 칸은 aria-invalid + aria-describedby로 이 id를 가리킨다. */
export function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null
  return (
    <p id={id} className="sc-field-error">
      {message}
    </p>
  )
}
