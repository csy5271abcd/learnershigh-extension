import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError, type ApiError } from '../api/apiError.ts'

export type QueryStatus = 'loading' | 'success' | 'error'

export interface QueryResult<T> {
  status: QueryStatus
  data: T | undefined
  error: ApiError | undefined
  /** 이전 결과를 보여주는 중에 새 요청이 진행 중 */
  isRefreshing: boolean
  retry: () => void
}

interface Settled<T> {
  /** 이 결과를 만든 요청 (`key#attempt`) */
  requestKey: string
  data?: T
  error?: ApiError
}

// 같은 key의 마지막 성공 결과. 상세에서 목록으로 돌아올 때 바로 그려 Scroll 위치를 복원할 수 있게 한다.
// 화면에는 바로 보여주되 항상 다시 조회한다 (Source of Truth는 API 응답).
const lastResults = new Map<string, unknown>()

/**
 * Assessment 화면용 조회 Hook. `key`가 바뀌거나 retry하면 다시 조회한다.
 * - `key`는 조회 조건 전체를 담고 Feature 안에서 유일해야 한다.
 * - 오류는 `[]`/`null`로 바꾸지 않고 error 상태로 돌려준다 (frontend-student.md §18).
 * - 조건을 바꿀 때는 이전 결과를 유지해 목록이 깜빡이지 않게 한다. 오류 뒤에는 이전 결과를 보여주지 않는다.
 */
export function useApiQuery<T>(key: string, load: () => Promise<T>): QueryResult<T> {
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>({ requestKey: '' })
  const requestKey = `${key}#${attempt}`

  useEffect(() => {
    let active = true
    loadRef.current().then(
      (data) => {
        lastResults.set(key, data)
        if (active) setSettled({ requestKey: `${key}#${attempt}`, data })
      },
      (error: unknown) => {
        if (active) setSettled({ requestKey: `${key}#${attempt}`, error: toApiError(error) })
      },
    )
    return () => {
      active = false
    }
  }, [key, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  const inFlight = settled.requestKey !== requestKey
  if (!inFlight) {
    return {
      status: settled.error ? 'error' : 'success',
      data: settled.error ? undefined : settled.data,
      error: settled.error,
      isRefreshing: false,
      retry,
    }
  }
  const data = (lastResults.get(key) as T | undefined) ?? (settled.error ? undefined : settled.data)
  return { status: data === undefined ? 'loading' : 'success', data, error: undefined, isRefreshing: data !== undefined, retry }
}
