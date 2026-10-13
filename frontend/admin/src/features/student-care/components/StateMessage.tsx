import type { ApiError } from '../api/apiClient.ts'
import { withObjectParticle } from '../model/format.ts'

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

/** 다시 시도 버튼. 다시 불러오는 중에는 Focus를 잃지 않게 aria-disabled로만 막는다. */
function RetryButton({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <button
      type="button"
      className="sc-button sc-button--secondary"
      aria-disabled={retrying || undefined}
      onClick={() => {
        if (!retrying) onRetry()
      }}
    >
      {retrying ? '다시 불러오는 중…' : '다시 시도'}
    </button>
  )
}

export function ErrorState({
  error,
  onRetry,
  retrying = false,
}: {
  error: ApiError
  onRetry?: () => void
  /** 다시 불러오는 중인지 (안내는 결과가 나올 때까지 남는다). */
  retrying?: boolean
}) {
  return (
    <div className="sc-state sc-state--error" role="alert">
      <p className="sc-state__title">{errorTitle(error)}</p>
      <p className="sc-state__description">{error.message}</p>
      {onRetry && <RetryButton retrying={retrying} onRetry={onRetry} />}
    </div>
  )
}

/**
 * 이미 보여주던 데이터를 다시 불러오다 실패했을 때. 빈 상태와 구분하고,
 * 아래 내용이 최신이 아닐 수 있음을 함께 알린다.
 */
export function StaleError({
  what,
  error,
  onRetry,
  retrying = false,
}: {
  what: string
  error: ApiError
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <div className="sc-stale" role="alert">
      <p className="sc-stale__text">
        <strong>{withObjectParticle(what)} 다시 불러오지 못했습니다.</strong> 아래는 이전에 불러온 내용이라 최신이 아닐 수 있습니다.{' '}
        <span className="sc-stale__reason">{error.message}</span>
      </p>
      <RetryButton retrying={retrying} onRetry={onRetry} />
    </div>
  )
}

/** 폼 제출 실패 안내. 칸에 붙일 수 없는 오류만 여기에 보여주고, 오류가 나면 Focus를 받는다 (useErrorFocus). */
export function InlineError({ error }: { error: ApiError | null }) {
  if (!error) return null
  return (
    <p className="sc-inline-error" role="alert" tabIndex={-1} data-error-focus="">
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

/**
 * 저장은 끝났고 새 데이터를 기다리는 동안의 안내. 다시 불러오지 못했으면 이 안내 안에서 바로 다시 시도한다
 * (다시 보내기는 새 데이터가 와야 풀린다). 버튼은 불러오는 중에도 그대로 두고(aria-disabled) Focus를 잃지 않게 한다.
 */
export function LockHint({ stale, onRetry }: { stale: boolean; onRetry: () => void }) {
  return (
    <div className="sc-lock-hint">
      <p className="sc-hint" role="status">
        {stale
          ? '저장했습니다. 최신 상태를 불러오지 못해 다시 보낼 수 없습니다.'
          : '저장했습니다. 최신 상태를 불러오는 중…'}
      </p>
      <button
        type="button"
        className="sc-button sc-button--secondary"
        aria-disabled={!stale || undefined}
        onClick={() => {
          if (stale) onRetry()
        }}
      >
        최신 상태 다시 불러오기
      </button>
    </div>
  )
}
