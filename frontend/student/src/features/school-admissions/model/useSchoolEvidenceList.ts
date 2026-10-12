import { useCallback, useEffect, useState } from 'react'
import type { LoadState, SchoolEvidenceListResult } from './types.ts'

type EvidenceListLoader = () => Promise<SchoolEvidenceListResult>

// Task Detail에서 Back으로 돌아올 때 Loading 없이 바로 그려야 Scroll 위치가 복원된다.
const lastLoaded = new WeakMap<EvidenceListLoader, SchoolEvidenceListResult>()

/**
 * School Evidence 전체 목록을 불러온다. `loadList`는 Data Source Boundary다.
 * (현재는 Fixture. 전체 목록 Endpoint가 Contract에 없어 Task 목록 + Task별 Evidence를 묶는다)
 * 자료 추가 / 삭제로 Loader가 바뀌면 보던 목록을 유지한 채 다시 읽는다. (Scroll / Focus 유지)
 */
export function useSchoolEvidenceList(loadList: EvidenceListLoader) {
  const cachedState = (): LoadState<SchoolEvidenceListResult> => {
    const data = lastLoaded.get(loadList)
    return data ? { status: 'success', data } : { status: 'loading' }
  }
  const [request, setRequest] = useState({ loadList, attempt: 0 })
  const [state, setState] = useState<LoadState<SchoolEvidenceListResult>>(cachedState)

  if (request.loadList !== loadList) {
    const next = cachedState()
    setRequest({ loadList, attempt: 0 })
    if (next.status === 'success' || state.status !== 'success') setState(next)
  }

  useEffect(() => {
    let active = true
    const load = request.loadList
    load().then(
      (data) => {
        lastLoaded.set(load, data)
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
