import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError, type ApiError } from '../api/canonicalSource.ts'

// 조회 상태: Loading / Error / Success. 오류를 빈 목록으로 바꾸지 않는다 (frontend-admin §16, testing §10).
export type Remote<T> = { status: 'loading' } | { status: 'error'; error: ApiError } | { status: 'success'; data: T }

export function useRemote<T>(load: () => Promise<T>, deps: unknown[]): { state: Remote<T>; reload: () => void; setData: (data: T) => void } {
  const [state, setState] = useState<Remote<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadRef.current().then(
      (data) => !cancelled && setState({ status: 'success', data }),
      (error: unknown) => !cancelled && setState({ status: 'error', error: toApiError(error) }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps는 호출 측이 정한다
  }, [attempt, ...deps])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const setData = useCallback((data: T) => setState({ status: 'success', data }), [])
  return { state, reload, setData }
}

/** 저장·전달처럼 중복 실행을 막아야 하는 명령. 실행 중에는 다시 실행하지 않는다 (frontend-admin §17) */
export function useCommand() {
  const running = useRef(false)
  const [pending, setPending] = useState(false)
  const run = useCallback(async <R,>(command: () => Promise<R>): Promise<{ ok: true; value: R } | { ok: false; error: ApiError } | null> => {
    if (running.current) return null
    running.current = true
    setPending(true)
    try {
      return { ok: true, value: await command() }
    } catch (error) {
      return { ok: false, error: toApiError(error) }
    } finally {
      running.current = false
      setPending(false)
    }
  }, [])
  return { run, pending }
}
