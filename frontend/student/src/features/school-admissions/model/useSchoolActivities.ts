import { useCallback, useEffect, useState } from 'react'
import type { SchoolActivityDetailLoader, SchoolActivityListLoader } from '../fixtures/schoolActivity.fixture.ts'
import type { GrowthActivityDetail, GrowthActivityListItem } from './activity.ts'
import type { LoadState } from './types.ts'

// Detail에서 Back으로 돌아올 때 Loading 없이 바로 그려야 Scroll 위치가 복원된다.
const lastList = new WeakMap<SchoolActivityListLoader, GrowthActivityListItem[]>()

/** 로그인 학생의 Growth Activity 목록. (현재는 Fixture, API 연결 시 GET /api/student/activities) 다시 읽는 동안 보던 목록을 유지한다. */
export function useSchoolActivityList(loadList: SchoolActivityListLoader) {
  const cached = (): LoadState<GrowthActivityListItem[]> => {
    const data = lastList.get(loadList)
    return data ? { status: 'success', data } : { status: 'loading' }
  }
  const [request, setRequest] = useState({ loadList, attempt: 0 })
  const [state, setState] = useState<LoadState<GrowthActivityListItem[]>>(cached)

  if (request.loadList !== loadList) {
    const next = cached()
    setRequest({ loadList, attempt: 0 })
    if (next.status === 'success' || state.status !== 'success') setState(next)
  }

  useEffect(() => {
    let active = true
    const load = request.loadList
    load().then(
      (data) => {
        lastList.set(load, data)
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

export type ActivityDetailState = LoadState<GrowthActivityDetail> | { status: 'notFound' }

/** Growth Activity 하나. null은 Not Found, reject는 Error. 같은 활동을 다시 읽을 때는 보던 화면을 유지한다. */
export function useSchoolActivityDetail(activityId: string, loadDetail: SchoolActivityDetailLoader) {
  const [request, setRequest] = useState({ activityId, loadDetail, attempt: 0 })
  const [state, setState] = useState<ActivityDetailState>({ status: 'loading' })

  if (request.activityId !== activityId || request.loadDetail !== loadDetail) {
    const keepCurrent = request.activityId === activityId && state.status === 'success'
    setRequest({ activityId, loadDetail, attempt: 0 })
    if (!keepCurrent) setState({ status: 'loading' })
  }

  useEffect(() => {
    let active = true
    request.loadDetail(request.activityId).then(
      (data) => {
        if (active) setState(data ? { status: 'success', data } : { status: 'notFound' })
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
