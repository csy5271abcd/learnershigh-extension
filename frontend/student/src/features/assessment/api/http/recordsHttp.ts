import type {
  ArchiveFavoriteRequest,
  ArchiveItem,
  ArchiveTab,
  Artifact,
  ArtifactComparison,
  ArtifactVersion,
  AssessmentNote,
  AssessmentSourceType,
  CreateArtifactRequest,
  CreateFeedbackRequestBody,
  CreateGrowthRecordRequest,
  CreateNoteRequest,
  CreateResourceRequest,
  FeedbackReplyResponse,
  FeedbackRequest,
  FeedbackRequestStatus,
  GrowthRecord,
  NoteRevisionDetail,
  NoteRevisionSummary,
  PageResponse,
  SaveNoteResponse,
  StudentResource,
  UpdateGrowthRecordRequest,
  UpdateNoteRequest,
  UpdateResourceRequest,
  UploadArtifactVersionRequest,
} from '../types.ts'
import { assessmentHttp, downloadFile } from './assessmentHttpClient.ts'

// Student 학생 기록 HTTP Adapter (2026-11-11, api-contract.md §20·21·22·24·25·26·29·30·31·32).
// Mock Adapter와 같은 함수 시그니처·같은 계약 Shape을 쓴다. 실패는 ApiError로 던지고 빈 값으로 바꾸지 않는다.

const base = '/api/student/assessment'
const enc = encodeURIComponent

// ---- §20·21 노트 ----
export const listNotesHttp = (sourceType: AssessmentSourceType, sourceId: string) =>
  assessmentHttp<{ items: AssessmentNote[] }>(`${base}/notes`, { query: { sourceType, sourceId } })
export const createNoteHttp = (request: CreateNoteRequest) =>
  assessmentHttp<SaveNoteResponse>(`${base}/notes`, { method: 'POST', json: request })
export const updateNoteHttp = (noteId: string, request: UpdateNoteRequest) =>
  assessmentHttp<SaveNoteResponse>(`${base}/notes/${enc(noteId)}`, { method: 'PUT', json: request })
export const listNoteRevisionsHttp = (noteId: string) =>
  assessmentHttp<{ items: NoteRevisionSummary[] }>(`${base}/notes/${enc(noteId)}/revisions`)
export const getNoteRevisionHttp = (noteId: string, revisionId: string) =>
  assessmentHttp<NoteRevisionDetail>(`${base}/notes/${enc(noteId)}/revisions/${enc(revisionId)}`)

// ---- §24·25·26 결과물 ----
export const listArtifactsHttp = (sourceType: AssessmentSourceType, sourceId: string) =>
  assessmentHttp<{ items: Artifact[] }>(`${base}/artifacts`, { query: { sourceType, sourceId } })
export const createArtifactHttp = (request: CreateArtifactRequest) =>
  assessmentHttp<Artifact>(`${base}/artifacts`, { method: 'POST', json: request })
export const listArtifactVersionsHttp = (artifactId: string) =>
  assessmentHttp<{ items: ArtifactVersion[] }>(`${base}/artifacts/${enc(artifactId)}/versions`)
export function uploadArtifactVersionHttp(artifactId: string, request: UploadArtifactVersionRequest) {
  const form = new FormData()
  form.append('file', request.file)
  if (request.changeNote) form.append('changeNote', request.changeNote)
  if (request.expectedLatestVersionId) form.append('expectedLatestVersionId', request.expectedLatestVersionId)
  return assessmentHttp<ArtifactVersion>(`${base}/artifacts/${enc(artifactId)}/versions`, { method: 'POST', form })
}
/** §26-1 A28-41 노트 첨부: 업로드(본인) · 원본 · 미리보기(PDF·이미지). 관리자 학생 화면 보기에서는 클라이언트가 student-view 경로로 바꾼다 */
export function uploadNoteAttachmentHttp(file: File) {
  const form = new FormData()
  form.append('file', file)
  return assessmentHttp<import('../types.ts').NoteAttachment>(`${base}/note-attachments`, { method: 'POST', form })
}
export const downloadNoteAttachmentHttp = (attachmentId: string) => downloadFile(`${base}/note-attachments/${enc(attachmentId)}/file`)
export const previewNoteAttachmentHttp = (attachmentId: string) => downloadFile(`${base}/note-attachments/${enc(attachmentId)}/preview`)
/** §26 원본 파일 (본인 소유만, 서버가 권한 검사) */
export const downloadArtifactVersionHttp = (artifactId: string, versionId: string) =>
  downloadFile(`${base}/artifacts/${enc(artifactId)}/versions/${enc(versionId)}/file`)

// ---- §31·32 피드백 ----
export const listFeedbackRequestsHttp = (query: { status?: FeedbackRequestStatus; page: number; size: number }) =>
  assessmentHttp<PageResponse<FeedbackRequest>>(`${base}/feedback-requests`, { query })
export const createFeedbackRequestHttp = (body: CreateFeedbackRequestBody) =>
  assessmentHttp<FeedbackRequest>(`${base}/feedback-requests`, { method: 'POST', json: body })
export const getFeedbackReplyHttp = (requestId: string) =>
  assessmentHttp<FeedbackReplyResponse>(`${base}/feedback-requests/${enc(requestId)}/reply`)

// ---- §29 성장 기록 ----
export const listGrowthRecordsHttp = (query: { academicYear?: number; query?: string; page: number; size: number }) =>
  assessmentHttp<PageResponse<GrowthRecord>>(`${base}/growth-records`, { query })
export const getGrowthRecordHttp = (recordId: string) => assessmentHttp<GrowthRecord>(`${base}/growth-records/${enc(recordId)}`)
export const createGrowthRecordHttp = (request: CreateGrowthRecordRequest) =>
  assessmentHttp<GrowthRecord>(`${base}/growth-records`, { method: 'POST', json: request })
export const updateGrowthRecordHttp = (recordId: string, request: UpdateGrowthRecordRequest) =>
  assessmentHttp<GrowthRecord>(`${base}/growth-records/${enc(recordId)}`, { method: 'PATCH', json: request })

// ---- §30 보관함·중요 표시 ----
export const listArchiveHttp = (query: { tab: ArchiveTab; academicYear?: number; query?: string; page: number; size: number }) =>
  assessmentHttp<PageResponse<ArchiveItem>>(`${base}/archive`, { query })
export const setArchiveFavoriteHttp = (request: ArchiveFavoriteRequest) =>
  assessmentHttp<ArchiveFavoriteRequest>(`${base}/archive/favorites`, { method: 'PUT', json: request })

// ---- §22 자료함 + 관리자 공개 자료 ----
export const listResourcesHttp = (query: { query?: string; type?: string; page: number; size: number }) =>
  assessmentHttp<PageResponse<StudentResource>>(`${base}/resources`, { query })
export const getResourceHttp = (resourceId: string) => assessmentHttp<StudentResource>(`${base}/resources/${enc(resourceId)}`)
export const createResourceHttp = (request: CreateResourceRequest) =>
  assessmentHttp<StudentResource>(`${base}/resources`, { method: 'POST', json: request })
export const updateResourceHttp = (resourceId: string, request: UpdateResourceRequest) =>
  assessmentHttp<StudentResource>(`${base}/resources/${enc(resourceId)}`, { method: 'PATCH', json: request })

/** 관리자가 학생에게 공개한 참고자료 (읽기 전용, 2026-11-11 계약 추가) */
export interface SharedResource {
  resourceId: string
  type: string
  title: string
  sourceName: string | null
  sourceUrl: string | null
  author: string | null
  publishedDate: string | null
  description: string | null
  tags: string[]
  subjectIds: string[]
  publishedAt: string
}
/** A27-UX §22-1 DRAFT 자료 파일 첨부·삭제·내려받기·미리보기 */
export const attachResourceFileHttp = (resourceId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return assessmentHttp<StudentResource>(`${base}/resources/${enc(resourceId)}/file`, { method: 'POST', form })
}
export const detachResourceFileHttp = (resourceId: string) => assessmentHttp<StudentResource>(`${base}/resources/${enc(resourceId)}/file`, { method: 'DELETE' })
export const downloadResourceFileHttp = (resourceId: string) => downloadFile(`${base}/resources/${enc(resourceId)}/file`)
export const previewResourceFileHttp = (resourceId: string) => downloadFile(`${base}/resources/${enc(resourceId)}/file/preview`)
export const listSharedResourcesHttp = () => assessmentHttp<{ items: SharedResource[] }>(`${base}/shared-resources`)

// ---- §26 미리보기 · §25-1 비교 · 휴지통(2026-11-11) ----
export const previewArtifactVersionHttp = (artifactId: string, versionId: string) =>
  downloadFile(`${base}/artifacts/${enc(artifactId)}/versions/${enc(versionId)}/preview`)
export const compareArtifactVersionsHttp = (artifactId: string, fromVersionId: string, toVersionId: string) =>
  assessmentHttp<ArtifactComparison>(`${base}/artifacts/${enc(artifactId)}/compare`, { query: { fromVersionId, toVersionId } })
export const trashSchoolAssessmentHttp = (assessmentId: string) =>
  assessmentHttp<void>(`${base}/school-assessments/${enc(assessmentId)}`, { method: 'DELETE' })
/** §12-1 A28-49 영구 삭제(제목 확인, 되돌릴 수 없음) */
export const permanentDeleteSchoolAssessmentHttp = (assessmentId: string, confirmTitle: string) =>
  assessmentHttp<void>(`${base}/school-assessments/${enc(assessmentId)}/permanent-delete`, { method: 'POST', json: { confirmTitle } })
export const trashArtifactHttp = (artifactId: string) => assessmentHttp<void>(`${base}/artifacts/${enc(artifactId)}`, { method: 'DELETE' })
export const trashResourceHttp = (resourceId: string) => assessmentHttp<void>(`${base}/resources/${enc(resourceId)}`, { method: 'DELETE' })
export const trashGrowthRecordHttp = (recordId: string) => assessmentHttp<void>(`${base}/growth-records/${enc(recordId)}`, { method: 'DELETE' })
export const restoreArchiveItemHttp = (request: { sourceType: string; sourceId: string }) =>
  assessmentHttp<ArchiveItem>(`${base}/archive/restore`, { method: 'POST', json: request })
