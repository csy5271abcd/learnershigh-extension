import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/apiClient.ts'

export type Remote<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'success'; data: T }
  | { status: 'error'; data: T | null; error: ApiError }

interface Loaded<T> {
  key: string | null
  version: number
  data: T | null
  error: ApiError | null
}

/**
 * 서버 데이터를 불러오는 상태.
 * - 같은 key를 다시 불러오는 동안(reload)은 직전 데이터를 유지해 화면이 깜빡이지 않게 한다.
 * - key가 바뀌면 이전 key의 데이터를 보여주지 않는다.
 * - key가 null이면 요청하지 않는다.
 */
export function useRemote<T>(key: string | null, load: () => Promise<T>): Remote<T> & { reload: () => void } {
  const [loaded, setLoaded] = useState<Loaded<T>>({ key: null, version: -1, data: null, error: null })
  const [version, setVersion] = useState(0)
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
        if (!cancelled) setLoaded({ key, version, data, error: null })
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoaded((previous) => ({
            key,
            version,
            data: previous.key === key ? previous.data : null,
            error: error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN_ERROR', String(error), []),
          }))
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [key, version])

  const reload = useCallback(() => setVersion((value) => value + 1), [])
  const data = loaded.key === key ? loaded.data : null

  if (loaded.key !== key || loaded.version !== version) {
    return { status: 'loading', data, reload }
  }
  if (loaded.error) {
    return { status: 'error', data, error: loaded.error, reload }
  }
  return { status: 'success', data: data as T, reload }
}
