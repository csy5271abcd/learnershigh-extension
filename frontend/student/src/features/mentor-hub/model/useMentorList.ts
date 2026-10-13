import { useCallback, useEffect, useState } from 'react'
import type { LoadState, MentorListQuery, MentorListResult } from './types.ts'

type ListLoader = (query: MentorListQuery) => Promise<MentorListResult>

const queryKey = (query: MentorListQuery) =>
  JSON.stringify([query.query.trim(), query.admissionType ?? '', query.major ?? '', query.page, query.size])

// Profile → Back 시 같은 조건의 결과를 바로 그려야 Scroll 위치가 복원된다.
const lastLoaded = new WeakMap<ListLoader, Map<string, MentorListResult>>()

function cachedResult(load: ListLoader, key: string): LoadState<MentorListResult> | undefined {
  const cached = lastLoaded.get(load)?.get(key)
  return cached ? { status: 'success', data: cached } : undefined
}

/**
 * Mentor List를 불러온다. `loadList`는 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/mentors Client로 교체)
 * 검색어 / Filter가 바뀌는 동안에는 이전 결과를 유지해 화면이 Skeleton으로 깜빡이지 않게 한다.
 */
export function useMentorList(query: MentorListQuery, loadList: ListLoader) {
  const key = queryKey(query)
  const [request, setRequest] = useState({ key, query, loadList, attempt: 0 })
  const [state, setState] = useState<LoadState<MentorListResult>>(
    () => cachedResult(loadList, key) ?? { status: 'loading' },
  )

  // 조건이 바뀌면 렌더링 중에 요청을 갱신한다. (Effect 안의 동기 setState를 피한다)
  if (request.key !== key || request.loadList !== loadList) {
    setRequest({ key, query, loadList, attempt: 0 })
    const cached = cachedResult(loadList, key)
    if (cached) setState(cached)
    else if (request.loadList !== loadList || state.status === 'error') setState({ status: 'loading' })
  }

  useEffect(() => {
    let active = true

    request.loadList(request.query).then(
      (result) => {
        const byKey = lastLoaded.get(request.loadList) ?? new Map<string, MentorListResult>()
        byKey.set(request.key, result)
        lastLoaded.set(request.loadList, byKey)
        if (active) setState({ status: 'success', data: result })
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
