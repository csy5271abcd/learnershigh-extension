import { useSyncExternalStore } from 'react'

export interface ToggleCountState {
  on: boolean
  count: number
}

type ToggleRequest = (id: string, on: boolean) => Promise<unknown>

/**
 * 이번 화면 Session 동안만 유지하는 켜기 / 끄기 + 수(±1) 상태. (Story 저장, Q&A 도움돼요)
 * 같은 id를 보는 모든 화면(목록 / Detail)이 같은 값을 본다. 영구 저장하지 않는다.
 * 화면에는 바로 반영하고(낙관적 갱신), 요청이 실패하면 이전 상태로 돌린다.
 */
export function createSessionToggleStore() {
  const changed = new Map<string, ToggleCountState>()
  const listeners = new Set<() => void>()

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const update = (id: string, state: ToggleCountState) => {
    changed.set(id, state)
    listeners.forEach((listener) => listener())
  }

  return function useSessionToggle(id: string, initial: ToggleCountState, request: ToggleRequest) {
    const current = useSyncExternalStore(subscribe, () => changed.get(id)) ?? initial

    const toggle = () => {
      const previous = current
      const next = { on: !previous.on, count: Math.max(0, previous.count + (previous.on ? -1 : 1)) }
      update(id, next)
      request(id, next.on).catch(() => update(id, previous))
    }

    return { ...current, toggle }
  }
}
