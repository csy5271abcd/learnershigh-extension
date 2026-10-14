import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError, type ApiError } from '../api/apiClient.ts'

export type Remote<T> = (
  /** `lastError`: 같은 key를 직전에 불러오지 못했고 지금 다시 불러오는 중이면 그 오류 (안내와 다시 시도 버튼을 유지한다). */
  | { status: 'loading'; data: T | null; lastError: ApiError | null }
  | { status: 'success'; data: T }
  | { status: 'error'; data: T | null; error: ApiError }
) & {
  /** 같은 key를 다시 불러온다 (다시 시도). */
  reload: () => void
  /** 성공적으로 불러온 횟수. 데이터가 새로 바뀌었는지 비교할 때 쓴다. */
  revision: number
}

interface Loaded<T> {
  key: string | null
  token: number
  attempt: number
  data: T | null
  error: ApiError | null
  revision: number
}

/**
 * 서버 데이터를 불러오는 상태. 모든 화면이 이 한 가지 방식으로 다시 불러온다.
 * - `token`이 바뀌면(외부 변경 알림) 같은 key를 다시 불러온다. 첫 Mount에서는 한 번만 요청한다.
 * - 같은 key를 다시 불러오는 동안은 직전 데이터를 유지해 화면이 깜빡이지 않게 한다.
 *   다시 불러오기에 실패하면 status는 'error'이고 data는 직전 값(오래된 값)이다.
 * - key가 바뀌면 이전 key의 데이터를 보여주지 않는다. key가 null이면 요청하지 않는다.
 */
export function useRemote<T>(key: string | null, load: () => Promise<T>, token = 0): Remote<T> {
  const [loaded, setLoaded] = useState<Loaded<T>>({
    key: null,
    token: -1,
    attempt: -1,
    data: null,
    error: null,
    revision: 0,
  })
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (key === null) {
      return
    }
    let cancelled = false
    loadRef.current().then(
      (data) => {
        if (!cancelled) {
          setLoaded((previous) => ({ key, token, attempt, data, error: null, revision: previous.revision + 1 }))
        }
      },
      (caught: unknown) => {
        if (!cancelled) {
          setLoaded((previous) => ({
            key,
            token,
            attempt,
            data: previous.key === key ? previous.data : null,
            error: toApiError(caught),
            revision: previous.revision,
          }))
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [key, token, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const data = loaded.key === key ? loaded.data : null
  const revision = loaded.revision

  if (loaded.key !== key || loaded.token !== token || loaded.attempt !== attempt) {
    return { status: 'loading', data, lastError: loaded.key === key ? loaded.error : null, reload, revision }
  }
  if (loaded.error) {
    return { status: 'error', data, error: loaded.error, reload, revision }
  }
  return { status: 'success', data: data as T, reload, revision }
}

/**
 * 보여줄 불러오기 오류. 실패한 뒤 다시 불러오는 동안에도 직전 오류를 돌려줘
 * 오류 안내(와 Focus가 있을 수 있는 다시 시도 버튼)가 결과가 나올 때까지 사라지지 않게 한다.
 */
export function loadFailure<T>(remote: Remote<T>): ApiError | null {
  if (remote.status === 'error') return remote.error
  if (remote.status === 'loading') return remote.lastError
  return null
}
