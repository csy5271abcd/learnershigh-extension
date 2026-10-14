import { useSyncExternalStore } from 'react'

/*
 * Admin App Shell의 최소 주소 관리. (Router Library는 미확정이라 도입하지 않는다 — ARCHITECTURE.md §1)
 * - 주소(pathname + search)를 그대로 화면 상태의 기준으로 쓴다. Back / Forward / 새로고침이 같은 화면을 다시 그린다.
 * - 화면을 떠날 때 지금 Scroll 위치를 그 History 항목에 적어 두고, Back / Forward로 돌아오면 복원한다.
 * Router가 확정되면 이 파일을 그 Router로 바꾼다.
 */

export interface AdminLocation {
  pathname: string
  search: string
  /** 이 History 항목에 함께 저장한 화면 이동 정보 (예: Dashboard에서 들어옴) */
  state: unknown
}

interface HistoryEntryState {
  scrollY?: number
  entry?: unknown
}

const listeners = new Set<() => void>()
let current: AdminLocation = read()

function read(): AdminLocation {
  const state = (window.history.state ?? {}) as HistoryEntryState
  return { pathname: window.location.pathname, search: window.location.search, state: state.entry ?? null }
}

function emit() {
  current = read()
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.history.scrollRestoration = 'manual'
  window.addEventListener('popstate', () => {
    emit()
    const { scrollY } = (window.history.state ?? {}) as HistoryEntryState
    // 다시 그린 뒤 (Cache된 목록은 바로 그려진다) 저장한 위치로 돌아간다.
    requestAnimationFrame(() => window.scrollTo(0, scrollY ?? 0))
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAdminLocation(): AdminLocation {
  return useSyncExternalStore(subscribe, () => current)
}

/** 새 화면으로 이동한다. 떠나는 화면의 Scroll은 그 History 항목에 남긴다. */
export function navigate(to: string, options: { entry?: unknown } = {}) {
  window.history.replaceState({ ...(window.history.state ?? {}), scrollY: window.scrollY }, '')
  window.history.pushState({ entry: options.entry } satisfies HistoryEntryState, '', to)
  emit()
  window.scrollTo(0, 0)
}

/** 같은 화면의 주소만 바꾼다. (Filter 등. History를 쌓지 않고 Scroll도 그대로) */
export function replaceSearch(search: string) {
  const url = `${window.location.pathname}${search ? `?${search}` : ''}`
  window.history.replaceState(window.history.state, '', url)
  emit()
}

export function goBack() {
  window.history.back()
}
