import { useCallback, useEffect, useState } from 'react'
import type { LoadState, MentorProfile } from './types.ts'

export type MentorProfileState = LoadState<MentorProfile> | { status: 'notFound' }

type ProfileLoader = (mentorId: string) => Promise<MentorProfile | null>

// 같은 Mentor로 다시 들어올 때(Content Detail 왕복 등) Loading 없이 바로 그려 Scroll을 복원할 수 있게 한다.
const lastLoaded = new WeakMap<ProfileLoader, Map<string, MentorProfile>>()

function cachedProfile(load: ProfileLoader, mentorId: string): MentorProfileState {
  const cached = lastLoaded.get(load)?.get(mentorId)
  return cached ? { status: 'success', data: cached } : { status: 'loading' }
}

/**
 * Mentor Profile을 불러온다. `loadProfile`은 Data Source Boundary다.
 * (현재는 Fixture, API 연결 시 GET /api/student/mentors/{mentorId} Client로 교체)
 * null은 Not Found, reject는 Error로 구분한다.
 */
export function useMentorProfile(mentorId: string, loadProfile: ProfileLoader) {
  const [request, setRequest] = useState({ mentorId, loadProfile, attempt: 0 })
  const [state, setState] = useState<MentorProfileState>(() => cachedProfile(loadProfile, mentorId))

  // 다른 Mentor로 바뀌면 렌더링 중에 상태를 초기화한다. (Effect 안의 동기 setState를 피한다)
  if (request.mentorId !== mentorId || request.loadProfile !== loadProfile) {
    setRequest({ mentorId, loadProfile, attempt: 0 })
    setState(cachedProfile(loadProfile, mentorId))
  }

  useEffect(() => {
    let active = true

    request.loadProfile(request.mentorId).then(
      (profile) => {
        if (!active) return
        if (profile) {
          const byMentor = lastLoaded.get(request.loadProfile) ?? new Map<string, MentorProfile>()
          byMentor.set(request.mentorId, profile)
          lastLoaded.set(request.loadProfile, byMentor)
          setState({ status: 'success', data: profile })
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
