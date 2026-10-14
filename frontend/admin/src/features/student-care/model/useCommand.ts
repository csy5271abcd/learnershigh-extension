import { useRef, useState } from 'react'
import { toApiError, type ApiError } from '../api/apiClient.ts'

/** 보던 상태가 서버와 달라 생기는 오류. 나면 목록 · 상세를 다시 불러온다. */
const STALE: ReadonlySet<string> = new Set([
  'ACTIVE_CARE_CASE_EXISTS',
  'STUDENT_NOT_FLAGGED',
  'INVALID_STATE_TRANSITION',
  'RECHECK_NOT_DUE',
  'CONCURRENT_MODIFICATION',
])

/**
 * 저장 요청 하나의 상태. 보내는 중에는 다시 보내지 않는다(중복 클릭 · Enter 연타).
 * 버튼은 `aria-disabled`로만 막아 Focus를 잃지 않게 한다.
 */
export function useCommand(onStale: () => void) {
  const inFlight = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function run<T>(command: () => Promise<T>, onSuccess: (result: T) => void): Promise<void> {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      onSuccess(await command())
    } catch (caught) {
      const apiError = toApiError(caught)
      setError(apiError)
      if (STALE.has(apiError.code)) onStale()
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return { pending, error, run, clearError: () => setError(null) }
}
