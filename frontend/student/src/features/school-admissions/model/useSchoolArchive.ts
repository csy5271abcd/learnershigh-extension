import { useCallback, useEffect, useState } from 'react'
import type { SchoolArchiveLoader, SchoolArchiveQuery } from '../fixtures/schoolArchive.fixture.ts'
import type { LoadState, SchoolArchiveResult } from './types.ts'

// Task Detail에서 Back으로 돌아올 때 Loading 없이 바로 그려야 Scroll 위치가 복원된다.
const lastLoaded = new WeakMap<SchoolArchiveLoader, Map<string, SchoolArchiveResult>>()

/**
 * School Archive 목록을 불러온다. `loadArchive`는 Data Source Boundary다. (현재는 Fixture, API 연결 시 GET /api/student/archive 하나)
 * 검색 / 출처를 바꿔 다시 읽는 동안에는 보던 목록을 유지한다.
 */
export function useSchoolArchive(loadArchive: SchoolArchiveLoader, query: SchoolArchiveQuery) {
  const key = `${query.source}|${query.query}`
  const cached = (): LoadState<SchoolArchiveResult> => {
    const data = lastLoaded.get(loadArchive)?.get(key)
    return data ? { status: 'success', data } : { status: 'loading' }
  }
  const [request, setRequest] = useState({ loadArchive, key, query, attempt: 0 })
  const [state, setState] = useState<LoadState<SchoolArchiveResult>>(cached)

  if (request.loadArchive !== loadArchive || request.key !== key) {
    const next = cached()
    setRequest({ loadArchive, key, query, attempt: 0 })
    if (next.status === 'success' || state.status !== 'success') setState(next)
  }

  useEffect(() => {
    let active = true
    request.loadArchive(request.query).then(
      (data) => {
        const byQuery = lastLoaded.get(request.loadArchive) ?? new Map<string, SchoolArchiveResult>()
        byQuery.set(request.key, data)
        lastLoaded.set(request.loadArchive, byQuery)
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

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
  }, [])

  return { state, reload }
}
