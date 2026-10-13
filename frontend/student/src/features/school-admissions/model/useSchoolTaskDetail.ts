import { useCallback, useEffect, useState } from 'react'
import type { LoadState, StudentTaskDetail } from './types.ts'

export type TaskDetailState = LoadState<StudentTaskDetail> | { status: 'notFound' }

type TaskDetailLoader = (taskId: string) => Promise<StudentTaskDetail | null>

// Mentor Case Detail 등 다른 화면에서 Back으로 돌아올 때 Loading 없이 바로 그려야 Tab / Scroll이 복원된다.
const lastLoaded = new WeakMap<TaskDetailLoader, Map<string, StudentTaskDetail>>()

function cached(load: TaskDetailLoader, taskId: string): TaskDetailState {
  const data = lastLoaded.get(load)?.get(taskId)
  return data ? { status: 'success', data } : { status: 'loading' }
}

/**
 * Student Task Detail을 불러온다. `loadDetail`은 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/tasks/{taskId} Client로 교체)
 * null은 Not Found, reject는 Error로 구분한다.
 */
export function useSchoolTaskDetail(taskId: string, loadDetail: TaskDetailLoader) {
  const [request, setRequest] = useState({ taskId, loadDetail, attempt: 0 })
  const [state, setState] = useState<TaskDetailState>(() => cached(loadDetail, taskId))

  // 다른 Task로 바뀌면 렌더링 중에 상태를 초기화한다. (Effect 안의 동기 setState를 피한다)
  // 같은 Task를 다시 불러올 때(예: 자료 추가 / 삭제)는 보던 화면을 유지해 Tab / Scroll / Focus가 흔들리지 않게 한다.
  if (request.taskId !== taskId || request.loadDetail !== loadDetail) {
    const next = cached(loadDetail, taskId)
    const keepCurrent = next.status === 'loading' && request.taskId === taskId && state.status === 'success'
    setRequest({ taskId, loadDetail, attempt: 0 })
    if (!keepCurrent) setState(next)
  }

  useEffect(() => {
    let active = true
    const { loadDetail: load, taskId: id } = request
    load(id).then(
      (data) => {
        if (!active) return
        if (!data) {
          setState({ status: 'notFound' })
          return
        }
        const byTask = lastLoaded.get(load) ?? new Map<string, StudentTaskDetail>()
        byTask.set(id, data)
        lastLoaded.set(load, byTask)
        setState({ status: 'success', data })
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
