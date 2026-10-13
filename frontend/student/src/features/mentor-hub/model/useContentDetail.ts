import { useCallback, useEffect, useState } from 'react'
import type { LoadState } from './types.ts'

export type ContentDetailState<T> = LoadState<T> | { status: 'notFound' }

type DetailLoader<T> = (contentId: string) => Promise<T | null>

// 같은 Content로 다시 들어올 때(Profile 왕복 등) Loading 없이 바로 그려 Scroll을 복원할 수 있게 한다.
const lastLoaded = new WeakMap<DetailLoader<unknown>, Map<string, unknown>>()

function cachedDetail<T>(load: DetailLoader<T>, contentId: string): ContentDetailState<T> {
  const byContent = lastLoaded.get(load as DetailLoader<unknown>)
  return byContent?.has(contentId) ? { status: 'success', data: byContent.get(contentId) as T } : { status: 'loading' }
}

/**
 * Mentor Content Detail(Plan / Routine)을 불러온다. `loadDetail`은 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/mentor-content/{contentId} Client로 교체)
 * null은 Not Found, reject는 Error로 구분한다.
 */
export function useContentDetail<T>(contentId: string, loadDetail: DetailLoader<T>) {
  const [request, setRequest] = useState({ contentId, loadDetail, attempt: 0 })
  const [state, setState] = useState<ContentDetailState<T>>(() => cachedDetail(loadDetail, contentId))

  // 다른 Content로 바뀌면 렌더링 중에 상태를 초기화한다. (Effect 안의 동기 setState를 피한다)
  if (request.contentId !== contentId || request.loadDetail !== loadDetail) {
    setRequest({ contentId, loadDetail, attempt: 0 })
    setState(cachedDetail(loadDetail, contentId))
  }

  useEffect(() => {
    let active = true

    request.loadDetail(request.contentId).then(
      (detail) => {
        if (!active) return
        if (detail) {
          const key = request.loadDetail as DetailLoader<unknown>
          const byContent = lastLoaded.get(key) ?? new Map<string, unknown>()
          byContent.set(request.contentId, detail)
          lastLoaded.set(key, byContent)
          setState({ status: 'success', data: detail })
        } else {
          setState({ status: 'notFound' })
        }
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )

    return () => {
      active = false
    }
  }, [request])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
  }, [])

  return { state, reload }
}
