import { useCallback, useEffect, useState } from 'react'
import type { LoadState, MentorContentListResult } from './types.ts'

type ContentListLoader = (page: number, size: number) => Promise<MentorContentListResult>

// Detail 왕복 시 목록이 Loading을 거치지 않고 바로 그려져야 Scroll 위치가 복원된다.
const lastLoaded = new WeakMap<ContentListLoader, Map<string, MentorContentListResult>>()

const pageKey = (page: number, size: number) => `${page}:${size}`

/**
 * Plan / Routine 목록(Main Tab)을 불러온다. `loadList`는 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/mentor-content?type=&page=&size= Client로 교체)
 */
export function useMentorContentList(loadList: ContentListLoader, page: number, size: number) {
  const [state, setState] = useState<LoadState<MentorContentListResult>>(() => {
    const cached = lastLoaded.get(loadList)?.get(pageKey(page, size))
    return cached ? { status: 'success', data: cached } : { status: 'loading' }
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    loadList(page, size).then(
      (data) => {
        const byPage = lastLoaded.get(loadList) ?? new Map<string, MentorContentListResult>()
        byPage.set(pageKey(page, size), data)
        lastLoaded.set(loadList, byPage)
        if (active) setState({ status: 'success', data })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )

    return () => {
      active = false
    }
  }, [loadList, page, size, attempt])

  // 다시 불러올 때 Loading으로 바꾸는 일은 Effect가 아니라 사용자 Action에서 한다.
  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  return { state, reload }
}
