import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError, type ApiError } from '../api/canonicalSource.ts'
import { getAiStatus, newIdempotencyKey, type AiAnalysis, type AiProviderStatus } from './aiApi.ts'

/**
 * AI 분석 화면 상태 (요청 ⑨ 공통 상태). 실제 요청 상태만 보여준다:
 * idle 분석 전 → running 서버 처리 중(텍스트 추출·AI 분석은 한 요청 안에서 진행) → review 분석 완료·관리자 검토 필요
 * → confirmed 관리자 확인 완료 / failed 분석 실패(재시도 가능).
 */
export type AiRunState<T> =
  | { kind: 'idle' }
  | { kind: 'running'; startedAt: number }
  | { kind: 'review'; analysis: AiAnalysis<T> }
  | { kind: 'confirmed'; analysis: AiAnalysis<T>; confirmedAt: string }
  | { kind: 'failed'; error: ApiError }

export function useAiRun<T>() {
  const [state, setState] = useState<AiRunState<T>>({ kind: 'idle' })
  const running = useRef(false)

  /** 같은 동작의 중복 실행을 막는다 (진행 중이면 무시). 새 분석마다 새 Idempotency-Key를 쓴다 */
  const run = useCallback(async (request: (idempotencyKey: string) => Promise<AiAnalysis<T>>) => {
    if (running.current) return
    running.current = true
    setState({ kind: 'running', startedAt: Date.now() })
    try {
      const analysis = await request(newIdempotencyKey())
      setState({ kind: 'review', analysis })
    } catch (error) {
      setState({ kind: 'failed', error: toApiError(error) })
    } finally {
      running.current = false
    }
  }, [])

  const confirm = useCallback((analysis: AiAnalysis<T>, confirmedAt: string) => setState({ kind: 'confirmed', analysis, confirmedAt }), [])
  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, run, confirm, reset }
}

export type ProviderState = { kind: 'loading' } | { kind: 'ready'; status: AiProviderStatus } | { kind: 'error'; error: ApiError }

/** 서버·Provider 연결 상태. 서버 미연결과 Provider 미설정을 구분한다 */
export function useAiProvider() {
  const [state, setState] = useState<ProviderState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    getAiStatus().then(
      (status) => active && setState({ kind: 'ready', status }),
      (error: unknown) => active && setState({ kind: 'error', error: toApiError(error) }),
    )
    return () => {
      active = false
    }
  }, [attempt])
  const retry = useCallback(() => {
    setState({ kind: 'loading' })
    setAttempt((value) => value + 1)
  }, [])
  return { provider: state, retry }
}
