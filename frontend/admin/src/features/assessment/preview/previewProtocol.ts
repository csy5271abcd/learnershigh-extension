import type { ReadOnlyStudentSnapshot } from '../api/canonicalSource.ts'

// Admin "학생 Desktop 화면 미리보기" 부모 ↔ iframe 메시지 (같은 Origin만 주고받는다).
// 부모(Admin 화면)가 담당 범위 검사를 통과한 학생 기록을 넘기고, iframe은 Student 화면을 읽기 전용으로 그린 뒤
// Student 안에서 이동한 경로·차단한 쓰기 시도 수를 부모에게 알린다. 학생 Session·쓰기 권한은 넘기지 않는다.

/** 학생 Desktop 기준 가상 화면 너비 (Student 앱 Desktop 배치: Sidebar + 본문 + 오른쪽 패널이 한 줄에 놓이는 폭) */
export const desktopViewportWidth = 1600

export type PreviewToChild = { type: 'lh-preview:snapshot'; snapshot: ReadOnlyStudentSnapshot; path: string; httpStudentId?: string }

export type PreviewToParent =
  | { type: 'lh-preview:ready' }
  | { type: 'lh-preview:path'; path: string }
  | { type: 'lh-preview:blocked'; count: number }

export const isPreviewMessage = (value: unknown): value is { type: string } =>
  typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string' && (value as { type: string }).type.startsWith('lh-preview:')

/** 축소 비율 계산: 가용 폭이 Desktop 폭보다 넓으면 그 폭을 가상 화면 폭으로 쓰고(1배), 좁으면 Desktop 폭을 유지한 채 줄인다 */
export function previewGeometry(availableWidth: number, availableHeight: number) {
  const virtualWidth = Math.max(desktopViewportWidth, Math.floor(availableWidth))
  const scale = Math.min(1, availableWidth / desktopViewportWidth)
  return { virtualWidth, virtualHeight: Math.max(400, Math.floor(availableHeight / scale)), scale }
}
