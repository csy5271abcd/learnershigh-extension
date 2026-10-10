import { useSyncExternalStore } from 'react'
import type { ContentSaveState } from './types.ts'

// 이번 화면 Session 동안 바뀐 저장 상태. Feed / Detail이 같은 값을 보므로 한쪽에서 바꾸면 다른 쪽에도 바로 반영된다.
// 영구 저장하지 않는다. (새로고침하면 서버(현재는 Fixture) 값으로 돌아간다)
const changed = new Map<string, ContentSaveState>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function update(contentId: string, state: ContentSaveState) {
  changed.set(contentId, state)
  listeners.forEach((listener) => listener())
}

type SaveRequest = (contentId: string, saved: boolean) => Promise<unknown>

/**
 * Content 저장 / 저장 취소. 화면에는 바로 반영하고(낙관적 갱신), 요청이 실패하면 이전 상태로 돌린다.
 * `requestSave`는 Data Source Boundary다. (현재는 Fixture, API 연결 시 PUT .../{contentId}/saved)
 * saveCount 증감은 화면 표시용이다. (Contract에 saveCount 응답이 없다)
 */
export function useSavedContent(contentId: string, initial: ContentSaveState, requestSave: SaveRequest) {
  const current = useSyncExternalStore(subscribe, () => changed.get(contentId)) ?? initial

  const toggle = () => {
    const previous = current
    const next = { saved: !previous.saved, saveCount: Math.max(0, previous.saveCount + (previous.saved ? -1 : 1)) }
    update(contentId, next)
    requestSave(contentId, next.saved).catch(() => update(contentId, previous))
  }

  return { ...current, toggle }
}
