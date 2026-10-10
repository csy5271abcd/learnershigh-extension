import { useCallback, useEffect, useState } from 'react'
import type { LoadState, MentorPlanDetail } from './types.ts'

export type MentorPlanState = LoadState<MentorPlanDetail> | { status: 'notFound' }

type PlanLoader = (contentId: string) => Promise<MentorPlanDetail | null>

// 같은 Plan으로 다시 들어올 때(Profile 왕복 등) Loading 없이 바로 그려 Scroll을 복원할 수 있게 한다.
const lastLoaded = new WeakMap<PlanLoader, Map<string, MentorPlanDetail>>()

function cachedPlan(load: PlanLoader, contentId: string): MentorPlanState {
  const cached = lastLoaded.get(load)?.get(contentId)
  return cached ? { status: 'success', data: cached } : { status: 'loading' }
}

/**
 * Mentor Plan Detail을 불러온다. `loadPlan`은 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/mentor-content/{contentId} Client로 교체)
 * null은 Not Found, reject는 Error로 구분한다.
 */
export function useMentorPlan(contentId: string, loadPlan: PlanLoader) {
  const [request, setRequest] = useState({ contentId, loadPlan, attempt: 0 })
  const [state, setState] = useState<MentorPlanState>(() => cachedPlan(loadPlan, contentId))

  // 다른 Plan으로 바뀌면 렌더링 중에 상태를 초기화한다. (Effect 안의 동기 setState를 피한다)
  if (request.contentId !== contentId || request.loadPlan !== loadPlan) {
    setRequest({ contentId, loadPlan, attempt: 0 })
    setState(cachedPlan(loadPlan, contentId))
  }

  useEffect(() => {
    let active = true

    request.loadPlan(request.contentId).then(
      (plan) => {
        if (!active) return
        if (plan) {
          const byContent = lastLoaded.get(request.loadPlan) ?? new Map<string, MentorPlanDetail>()
          byContent.set(request.contentId, plan)
          lastLoaded.set(request.loadPlan, byContent)
          setState({ status: 'success', data: plan })
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
