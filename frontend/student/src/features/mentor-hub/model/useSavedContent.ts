import { createSessionToggleStore } from './sessionToggle.ts'
import type { ContentSaveState } from './types.ts'

const useSavedToggle = createSessionToggleStore()

/**
 * Content 저장 / 저장 취소. Feed / Detail이 같은 값을 보므로 한쪽에서 바꾸면 다른 쪽에도 바로 반영된다.
 * `requestSave`는 Data Source Boundary다. (현재는 Fixture, API 연결 시 PUT .../{contentId}/saved)
 * saveCount 증감은 화면 표시용이다. (Contract에 saveCount 응답이 없다)
 */
export function useSavedContent(
  contentId: string,
  initial: ContentSaveState,
  requestSave: (contentId: string, saved: boolean) => Promise<unknown>,
) {
  const { on, count, toggle } = useSavedToggle(contentId, { on: initial.saved, count: initial.saveCount }, requestSave)
  return { saved: on, saveCount: count, toggle }
}
