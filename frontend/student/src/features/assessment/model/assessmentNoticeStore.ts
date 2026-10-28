import { useSyncExternalStore } from 'react'

// 수행평가 상세 "안내문·첨부" (Mockup SA-DETAIL-01, 2026-10-28 사용자 요청).
// 안내문 첨부 계약·파일 저장소가 없어(MM-49·AUD-014, API-OD-A03) **이 브라우저 화면에서만** 미리보기로 보관한다.
// 서버·Mock Store·브라우저 저장소에 넣지 않으며 새로고침하면 사라진다. 실제 학교 안내문을 지어내 채우지 않는다.

export interface NoticeAttachment {
  attachmentId: string
  name: string
  size: number
  mimeType: string
  /** blob: 미리보기 주소 (이 탭에서만 유효) */
  previewUrl: string
}

export const noticeAccept = 'image/png,image/jpeg,image/webp,application/pdf'
/** 미리보기를 만드는 크기 (Mock 기준, 실제 업로드 한도 아님) */
export const noticeMaxBytes = 20 * 1024 * 1024

const notices = new Map<string, NoticeAttachment[]>()
const listeners = new Set<() => void>()
let version = 0
let sequence = 0

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function noticeFileProblem(file: File): string | null {
  if (!noticeAccept.split(',').includes(file.type)) return 'PNG·JPG·WEBP 사진 또는 PDF만 올릴 수 있어요.'
  if (file.size > noticeMaxBytes) return '20MB보다 큰 파일은 미리볼 수 없어요.'
  return null
}

export function addNotice(assessmentId: string, file: File) {
  sequence += 1
  const attachment: NoticeAttachment = {
    attachmentId: `notice_${sequence}`,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    previewUrl: URL.createObjectURL(file),
  }
  notices.set(assessmentId, [...(notices.get(assessmentId) ?? []), attachment])
  emit()
}

export function removeNotice(assessmentId: string, attachmentId: string) {
  const current = notices.get(assessmentId) ?? []
  current.filter((item) => item.attachmentId === attachmentId).forEach((item) => URL.revokeObjectURL(item.previewUrl))
  notices.set(assessmentId, current.filter((item) => item.attachmentId !== attachmentId))
  emit()
}

const empty: NoticeAttachment[] = []

export function useNotices(assessmentId: string): NoticeAttachment[] {
  useSyncExternalStore(subscribe, () => version)
  return notices.get(assessmentId) ?? empty
}
