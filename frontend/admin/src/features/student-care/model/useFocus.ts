import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'
import type { ApiError } from '../api/apiClient.ts'

/** 오류를 보여줄 때 Focus를 둘 곳: 표시한 첫 입력 칸, 없으면 폼 오류 문구. */
const ERROR_TARGET = '[aria-invalid="true"], [data-error-focus]'

/** 새 오류가 생기면 `container` 안의 오류 칸(또는 오류 문구)으로 Focus를 옮긴다. */
export function useErrorFocus(error: ApiError | null, container: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (error) container.current?.querySelector<HTMLElement>(ERROR_TARGET)?.focus()
  }, [error, container])
}

/**
 * 요청이 끝났을 때 Focus를 옮겨도 되는지: Focus가 사라졌거나, 아직 보내는 중 표시(aria-disabled)인 그 버튼에 있을 때만.
 * 사용자가 그사이 다른 칸으로 옮겨 입력 중이면 Focus를 가져오지 않는다 (WCAG 3.2.2).
 */
export function mayReclaimFocus(): boolean {
  if (focusIsLost()) return true
  return document.activeElement?.getAttribute('aria-disabled') === 'true'
}

/** Focus가 어디에도 없는지 (누른 버튼이 사라져 body로 빠졌는지). */
export function focusIsLost(): boolean {
  const active = document.activeElement
  return active === null || active === document.body || !active.isConnected
}

/**
 * "다시 시도"를 누른 뒤 오류 안내(와 그 버튼)가 사라지면 Focus를 `anchor`(제목 등)로 옮긴다.
 * 다시 실패해서 버튼이 그대로 있으면 Focus를 건드리지 않는다.
 */
export function useRetryFocus<T extends HTMLElement>(
  remote: { status: string; revision: number; reload: () => void },
): { anchorRef: RefObject<T | null>; retry: () => void } {
  const anchorRef = useRef<T>(null)
  const requested = useRef(false)
  const { status, revision, reload } = remote

  useLayoutEffect(() => {
    if (!requested.current || status === 'loading') return
    requested.current = false
    if (focusIsLost()) anchorRef.current?.focus()
  }, [status, revision])

  const retry = useCallback(() => {
    requested.current = true
    reload()
  }, [reload])

  return { anchorRef, retry }
}
