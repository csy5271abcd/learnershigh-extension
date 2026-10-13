import { useRef, useState } from 'react'
import { toApiError, type ApiError } from '../api/apiClient.ts'
import { isStale, staysAtField } from './conflicts.ts'
import { useLatest } from './useLatest.ts'

/**
 * 사유 확인 / 결정 / 메모처럼 케어 건을 바꾸는 요청 하나의 상태.
 * - 보내는 중에는 다시 보내지 않는다 (중복 클릭 · Enter 연타). 버튼은 `aria-disabled`로만 막아 Focus를 잃지 않게 한다.
 * - `revision`을 주면, 성공한 뒤 새 상세 데이터(revision 증가)가 오기 전까지 잠근다 (같은 내용을 다시 보내지 않게).
 * - 상태 오류(conflicts.ts)는 `onStale`로 페이지에 알려 보드 · 상세 · 요약을 다시 불러오게 한다.
 */
export function useCaseCommand(revision: number | null, onStale: (error: ApiError) => void) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [doneRevision, setDoneRevision] = useState<number | null>(null)
  const latestRevision = useLatest(revision)
  const inFlight = useRef(false)
  const locked = revision !== null && doneRevision === revision

  async function run<T>(command: () => Promise<T>, onSuccess: (result: T) => void): Promise<void> {
    if (inFlight.current || locked) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      const result = await command()
      setDoneRevision(latestRevision.current)
      onSuccess(result)
    } catch (caught) {
      const apiError = toApiError(caught)
      if (isStale(apiError.code)) {
        if (staysAtField(apiError)) setError(apiError)
        onStale(apiError)
      } else {
        setError(apiError)
      }
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return { pending, locked, busy: pending || locked, error, clearError: () => setError(null), run }
}
