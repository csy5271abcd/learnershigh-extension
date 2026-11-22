import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { assessmentHttp, downloadFile } from './http/assessmentHttpClient.ts'
import { isAssessmentReadOnlyView, guardWrite } from './viewMode.ts'
import type { HomeMemo, NoticeFile } from './types.ts'

// A27-UX 학생 화면 개선 API (api-contract 'A27-UX 학생 화면 개선 추가 계약', 2026-11-19 DRAFT).
// §30-a 홈 메모 · §12-c 수행평가 안내문 첨부. 학생 본인 데이터만 다룬다(관리자 Endpoint 없음).
// Mock 모드는 이 탭 메모리에만 둔다(서버 저장 아님 — 화면 개발용).

const base = '/api/student/assessment'
const noticeBase = (assessmentId: string) => `${base}/school-assessments/${encodeURIComponent(assessmentId)}/notice-files`

/** 관리자 학생 화면 보기(읽기 전용)에서는 학생 개인 메모·안내문을 읽지 않는다 */
function blockedInAdminView(): ApiError | null {
  return isAssessmentReadOnlyView()
    ? new ApiError(403, { code: 'READ_ONLY_VIEW', message: '관리자 보기에서는 학생 개인 메모·안내문을 보여 주지 않아요.', details: {} })
    : null
}

// ---- Mock (이 탭 메모리) ----
let mockMemo: HomeMemo = { body: null, updatedAt: null, version: 0 }
const mockNotices = new Map<string, { file: NoticeFile; blob: Blob }[]>()
let mockSeq = 0

/** §30-a GET /home-memo */
export function getHomeMemo(): Promise<HomeMemo> {
  const blocked = blockedInAdminView()
  if (blocked) return Promise.reject(blocked)
  if (isMockDataSource) return Promise.resolve({ ...mockMemo })
  return assessmentHttp<HomeMemo>(`${base}/home-memo`)
}

/** §30-a PUT /home-memo. 기대 버전이 다르면 409 */
export function saveHomeMemo(body: string, expectedVersion: number): Promise<HomeMemo> {
  return guardWrite('saveHomeMemo', () => {
    if (isMockDataSource) {
      if (expectedVersion !== mockMemo.version) {
        return Promise.reject(new ApiError(409, { code: 'RESOURCE_VERSION_CONFLICT', message: '다른 곳에서 먼저 저장됐어요.', details: {} }))
      }
      mockMemo = { body: body.trim() ? body.trim() : null, updatedAt: new Date().toISOString(), version: mockMemo.version + 1 }
      return Promise.resolve({ ...mockMemo })
    }
    return assessmentHttp<HomeMemo>(`${base}/home-memo`, { method: 'PUT', json: { body, expectedVersion } })
  })
}

/** §12-c GET 안내문 목록 */
export function listNoticeFiles(assessmentId: string): Promise<{ items: NoticeFile[] }> {
  const blocked = blockedInAdminView()
  if (blocked) return Promise.reject(blocked)
  if (isMockDataSource) return Promise.resolve({ items: (mockNotices.get(assessmentId) ?? []).map((entry) => entry.file) })
  return assessmentHttp<{ items: NoticeFile[] }>(noticeBase(assessmentId))
}

/** §12-c POST 안내문 올리기 (PDF·이미지) */
export function uploadNoticeFile(assessmentId: string, file: File): Promise<NoticeFile> {
  return guardWrite('uploadNoticeFile', () => {
    if (isMockDataSource) {
      const created: NoticeFile = {
        fileId: `notice_mock_${(mockSeq += 1)}`,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      }
      mockNotices.set(assessmentId, [...(mockNotices.get(assessmentId) ?? []), { file: created, blob: file }])
      return Promise.resolve(created)
    }
    const form = new FormData()
    form.append('file', file)
    return assessmentHttp<NoticeFile>(noticeBase(assessmentId), { method: 'POST', form })
  })
}

/** §12-c DELETE 안내문 빼기 (목록에서만, 바이트는 서버가 보존) */
export function removeNoticeFile(assessmentId: string, fileId: string): Promise<void> {
  return guardWrite('removeNoticeFile', () => {
    if (isMockDataSource) {
      mockNotices.set(assessmentId, (mockNotices.get(assessmentId) ?? []).filter((entry) => entry.file.fileId !== fileId))
      return Promise.resolve()
    }
    return assessmentHttp<void>(`${noticeBase(assessmentId)}/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
  })
}

/** §12-c 안내문 원본(미리보기용 inline) Blob */
export function noticeFileBlob(assessmentId: string, fileId: string): Promise<Blob> {
  if (isMockDataSource) {
    const found = (mockNotices.get(assessmentId) ?? []).find((entry) => entry.file.fileId === fileId)
    return found ? Promise.resolve(found.blob) : Promise.reject(new ApiError(404, { code: 'NOT_FOUND', message: '안내문 파일을 찾을 수 없어요.', details: {} }))
  }
  return downloadFile(`${noticeBase(assessmentId)}/${encodeURIComponent(fileId)}/preview`)
}
