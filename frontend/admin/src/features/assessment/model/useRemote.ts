import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError, type ApiError } from '../api/canonicalSource.ts'

// 조회 상태: Loading / Error / Success. 오류를 빈 목록으로 바꾸지 않는다 (frontend-admin §16, testing §10).
export type Remote<T> = { status: 'loading' } | { status: 'error'; error: ApiError } | { status: 'success'; data: T }

export function useRemote<T>(load: () => Promise<T>, deps: unknown[]): { state: Remote<T>; reload: () => void; refresh: () => void; setData: (data: T) => void } {
  const [state, setState] = useState<Remote<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  // A28-17: 다시 조회(refresh)는 지금 보이는 값을 지우지 않고 바꾼다(탭 복귀 때 깜빡임 없음). 처음·조건 변경은 Loading 부터
  const silent = useRef(false)
  useEffect(() => {
    let cancelled = false
    if (!silent.current) setState({ status: 'loading' })
    silent.current = false
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
  const refresh = useCallback(() => {
    silent.current = true
    setAttempt((value) => value + 1)
  }, [])
  const setData = useCallback((data: T) => setState({ status: 'success', data }), [])
  return { state, reload, refresh, setData }
}

/**
 * A28-17: 다른 탭·창에서 확정·재확정한 뒤 이 화면으로 돌아오면(창 포커스·화면 표시) 다시 조회한다.
 * 같은 탭에서 승인하고 돌아오면 화면이 새로 그려져 조회되고, 오래 열어 둔 탭도 돌아오는 순간 최신 확정본을 본다. 최소 간격 10초.
 */
export function useRefreshOnReturn(refresh: () => void, minIntervalMs = 10_000) {
  const last = useRef(0)
  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])
  useEffect(() => {
    last.current = Date.now()
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - last.current < minIntervalMs) return
      last.current = now
      refreshRef.current()
    }
    window.addEventListener('focus', onReturn)
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      window.removeEventListener('focus', onReturn)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [minIntervalMs])
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
