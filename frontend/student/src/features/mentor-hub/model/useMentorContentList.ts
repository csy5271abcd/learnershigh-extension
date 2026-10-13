import { useCallback, useEffect, useState } from 'react'
import type { LoadState } from './types.ts'

type ContentListLoader<T> = (page: number, size: number) => Promise<T>

// Detail 왕복 시 목록이 Loading을 거치지 않고 바로 그려져야 Scroll 위치가 복원된다.
const lastLoaded = new WeakMap<ContentListLoader<unknown>, Map<string, unknown>>()

const pageKey = (page: number, size: number) => `${page}:${size}`

/**
 * Plan / Routine / Story 목록(Main Tab)을 불러온다. `loadList`는 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/mentor-content?type=&page=&size= Client로 교체)
 * 조건(예: Story Topic)이 바뀌면 다른 `loadList`를 넘긴다.
 */
export function useMentorContentList<T>(loadList: ContentListLoader<T>, page: number, size: number) {
  const key = loadList as ContentListLoader<unknown>
  const cachedState = (): LoadState<T> => {
    const byPage = lastLoaded.get(key)
    return byPage?.has(pageKey(page, size))
      ? { status: 'success', data: byPage.get(pageKey(page, size)) as T }
      : { status: 'loading' }
  }
  const [request, setRequest] = useState({ loadList, page, size, attempt: 0 })
  const [state, setState] = useState<LoadState<T>>(cachedState)

  // 조건이 바뀌면 렌더링 중에 상태를 초기화한다. (Effect 안의 동기 setState를 피한다)
  if (request.loadList !== loadList || request.page !== page || request.size !== size) {
    setRequest({ loadList, page, size, attempt: 0 })
    setState(cachedState())
  }

  useEffect(() => {
    let active = true
    const { loadList: load, page: requestPage, size: requestSize } = request

    load(requestPage, requestSize).then(
      (data) => {
        const loaderKey = load as ContentListLoader<unknown>
        const byPage = lastLoaded.get(loaderKey) ?? new Map<string, unknown>()
        byPage.set(pageKey(requestPage, requestSize), data)
        lastLoaded.set(loaderKey, byPage)
        if (active) setState({ status: 'success', data })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )

    return () => {
      active = false
    }
  }, [request])

  // 다시 불러올 때 Loading으로 바꾸는 일은 Effect가 아니라 사용자 Action에서 한다.
  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
  }, [])

  return { state, reload }
}
