import { useCallback, useEffect, useRef, useState } from 'react'
import { isNotFoundError } from '../api/mentorApi.ts'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'notFound' }
  | { status: 'error'; error: unknown }

// 마지막으로 성공한 응답. Detail 왕복 후 돌아왔을 때 Loading 없이 바로 그려 Scroll 위치를 복원하고, 뒤에서 다시 불러온다.
const lastLoaded = new Map<string, unknown>()

function initialState<T>(key: string): ResourceState<T> {
  return lastLoaded.has(key) ? { status: 'success', data: lastLoaded.get(key) as T } : { status: 'loading' }
}

// 같은 Resource를 이미 그리고 있는 화면(예: Rail의 내 사진)에 변경을 알린다.
const listeners = new Map<string, Set<(data: unknown) => void>>()

/** 변경 후 바로 보여 줄 응답을 넣는다. (예: 답변 직후 Question Detail, 사진 변경 후 Rail) */
export function primeResource<T>(key: string, data: T) {
  lastLoaded.set(key, data)
  listeners.get(key)?.forEach((notify) => notify(data))
}

/** 변경으로 낡은 응답을 지운다. 다음 진입은 Loading부터 다시 불러온다. (낡은 상태를 잠깐이라도 보이지 않게) */
export function invalidateResources(keyPrefix: string) {
  for (const key of lastLoaded.keys()) {
    if (key.startsWith(keyPrefix)) lastLoaded.delete(key)
  }
}

/**
 * `load`는 MentorApi 호출이다. 404는 Not Found, 그 밖의 실패는 Error로 나눈다. (Empty와 Error를 섞지 않는다)
 * `key`가 바뀌면 다시 불러온다.
 */
export function useResource<T>(key: string, load: () => Promise<T>) {
  const [request, setRequest] = useState({ key, attempt: 0 })
  const [state, setState] = useState<ResourceState<T>>(() => initialState<T>(key))
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  // 다른 Resource로 바뀌면 렌더링 중에 상태를 초기화한다. (Effect 안의 동기 setState를 피한다)
  if (request.key !== key) {
    setRequest({ key, attempt: 0 })
    setState(initialState<T>(key))
  }

  useEffect(() => {
    let active = true
    loadRef.current().then(
      (data) => {
        if (!active) return
        lastLoaded.set(request.key, data)
        setState({ status: 'success', data })
      },
      (error: unknown) => {
        if (!active) return
        lastLoaded.delete(request.key)
        setState(isNotFoundError(error) ? { status: 'notFound' } : { status: 'error', error })
      },
    )
    return () => {
      active = false
    }
  }, [request])

  useEffect(() => {
    const notify = (data: unknown) => setState({ status: 'success', data: data as T })
    const set = listeners.get(request.key) ?? new Set()
    set.add(notify)
    listeners.set(request.key, set)
    return () => {
      set.delete(notify)
    }
  }, [request.key])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
  }, [])

  /** 변경 API 응답으로 화면을 바로 바꾼다. (다시 불러오지 않는다) */
  const replace = useCallback(
    (data: T) => {
      lastLoaded.set(request.key, data)
      setState({ status: 'success', data })
    },
    [request.key],
  )

  return { state, reload, replace }
}
