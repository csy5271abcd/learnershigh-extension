import { useEffect, useState } from 'react'

/*
 * 화면 불러오기 Boundary (실제 API 연결 전). 데이터 자체는 Admin Store에서 읽고, 이 Hook은 불러오기 상태만 재현한다.
 * - 같은 화면 · 같은 Scenario를 한 번 불러오면 기억해 Back / Forward 때 바로 그린다. (Filter · Scroll 복원)
 * - 개발용 ?fixture=loading | error | error-once | empty (DEV에서만 읽는다)
 *   error-once: 처음 불러오기만 실패, 다시 시도하면 성공 / empty: 불러오기는 성공했지만 데이터가 없는 상태
 * Error는 Empty로 바꾸지 않는다. (연동 실패 ≠ 데이터 없음)
 */

export type ScreenScenario = 'success' | 'loading' | 'error' | 'error-once' | 'empty'

export function readScreenScenario(search: string): ScreenScenario {
  if (!import.meta.env.DEV) return 'success'
  const value = new URLSearchParams(search).get('fixture')
  return value === 'loading' || value === 'error' || value === 'error-once' || value === 'empty' ? value : 'success'
}

export type ScreenLoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; empty: boolean }

const LOAD_DELAY_MS = 250
const loaded = new Set<string>()

export function useScreenLoad(screen: string, scenario: ScreenScenario): { state: ScreenLoadState; reload: () => void } {
  const key = `${screen}|${scenario}`
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; attempt: number; ok: boolean } | null>(null)
  const ready = loaded.has(key) && attempt === 0

  useEffect(() => {
    if (ready || scenario === 'loading') return
    let active = true
    const timer = setTimeout(() => {
      if (!active) return
      const ok = scenario !== 'error' && !(scenario === 'error-once' && attempt === 0)
      if (ok) loaded.add(key)
      setResult({ key, attempt, ok })
    }, LOAD_DELAY_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [key, attempt, ready, scenario])

  let state: ScreenLoadState
  if (ready) state = { status: 'ready', empty: scenario === 'empty' }
  else if (result && result.key === key && result.attempt === attempt) state = result.ok ? { status: 'ready', empty: scenario === 'empty' } : { status: 'error' }
  else state = { status: 'loading' }

  return { state, reload: () => setAttempt((value) => value + 1) }
}
