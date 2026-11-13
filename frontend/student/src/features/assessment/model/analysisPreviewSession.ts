import type { AnalysisPreviewResponse } from '../api/dev/analysisPreviewClient.ts'

// 개발용 분석 미리보기 결과 임시 보관 (2026-11-11).
// - **메모리 전용.** 브라우저 저장소(localStorage·sessionStorage·IndexedDB)와 서버에 남기지 않는다. 결과에는 문서 원문 일부가 들어 있다.
// - 새로고침·새 탭에서는 사라진다. 화면은 이를 "저장되지 않은 미리보기라 다시 분석해 달라"로 안내한다.
// - 공식 평가정보(§10·11)·학생 수행평가와 섞지 않는다. ID는 이 탭 안에서만 의미가 있다.

export interface AnalysisPreviewEntry {
  previewId: string
  fileName: string
  fileSize: number
  /** 브라우저에서 계산한 원본 SHA-256 */
  localSha256: string | null
  analyzedAt: string
  result: AnalysisPreviewResponse
}

const maxEntries = 5
const entries = new Map<string, AnalysisPreviewEntry>()
let counter = 0

export function savePreview(entry: Omit<AnalysisPreviewEntry, 'previewId' | 'analyzedAt'>): AnalysisPreviewEntry {
  counter += 1
  const previewId = `p${Date.now().toString(36)}${counter}`
  const saved = { ...entry, previewId, analyzedAt: new Date().toISOString() }
  entries.set(previewId, saved)
  while (entries.size > maxEntries) entries.delete(entries.keys().next().value as string)
  return saved
}

export function getPreview(previewId: string): AnalysisPreviewEntry | null {
  return entries.get(previewId) ?? null
}
