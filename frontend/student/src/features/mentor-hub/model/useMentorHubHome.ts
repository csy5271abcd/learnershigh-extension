import { useCallback, useEffect, useState } from 'react'
import type { LoadState, MentorHubHome } from './types.ts'

/**
 * Mentor Hub Home 데이터를 불러온다.
 * `loadHome`은 Data Source Boundary다. (현재는 Fixture, API 연결 시 API Client로 교체)
 * 렌더링마다 새 함수를 넘기면 다시 불러오므로 안정적인 참조를 넘긴다.
 */
export function useMentorHubHome(loadHome: () => Promise<MentorHubHome>) {
  const [state, setState] = useState<LoadState<MentorHubHome>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    loadHome().then(
      (data) => {
        if (active) setState({ status: 'success', data })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )

    return () => {
      active = false
    }
  }, [loadHome, attempt])

  // 다시 불러올 때 Loading으로 바꾸는 일은 Effect가 아니라 사용자 Action에서 한다.
  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  return { state, reload }
}
