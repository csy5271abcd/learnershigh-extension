import { useCallback, useEffect, useState } from 'react'
import type { LoadState, StudentTaskListResult } from './types.ts'

type TaskListLoader = () => Promise<StudentTaskListResult>

// 다른 화면에서 Back으로 돌아올 때 Loading 없이 바로 그려야 Scroll 위치가 복원된다.
const lastLoaded = new WeakMap<TaskListLoader, StudentTaskListResult>()

/**
 * Student Task 목록을 불러온다. `loadList`는 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/tasks Client로 교체)
 */
export function useSchoolTaskList(loadList: TaskListLoader) {
  const cachedState = (): LoadState<StudentTaskListResult> => {
    const data = lastLoaded.get(loadList)
    return data ? { status: 'success', data } : { status: 'loading' }
  }
  const [request, setRequest] = useState({ loadList, attempt: 0 })
  const [state, setState] = useState<LoadState<StudentTaskListResult>>(cachedState)

  // Loader가 바뀌면 렌더링 중에 상태를 초기화한다. (Effect 안의 동기 setState를 피한다)
  if (request.loadList !== loadList) {
    setRequest({ loadList, attempt: 0 })
    setState(cachedState())
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
