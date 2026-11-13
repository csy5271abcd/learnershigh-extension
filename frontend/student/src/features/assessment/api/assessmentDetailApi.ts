import { ApiError } from './apiError.ts'
import * as http from './http/recordsHttp.ts'
import { isMockDataSource } from './dataSource.ts'
import { guardWrite } from './viewMode.ts'
import {
  createArtifactMock,
  createNoteMock,
  createFeedbackRequestMock,
  getFeedbackReplyMock,
  listArtifactsMock,
  listArtifactVersionsMock,
  listFeedbackRequestsMock,
  getNoteRevisionMock,
  listNoteRevisionsMock,
  listNotesMock,
  updateNoteMock,
  uploadArtifactVersionMock,
} from './mock/assessmentDetailMock.ts'
import type {
  ArtifactComparison,
  Artifact,
  ArtifactVersion,
  AssessmentNote,
  AssessmentSourceType,
  CreateArtifactRequest,
  CreateFeedbackRequestBody,
  CreateNoteRequest,
  FeedbackReplyResponse,
  FeedbackRequest,
  FeedbackRequestStatus,
  NoteRevisionDetail,
  NoteRevisionSummary,
  PageResponse,
  SaveNoteResponse,
  UpdateNoteRequest,
  UploadArtifactVersionRequest,
} from './types.ts'

// 수행평가 상세가 호출하는 노트·결과물·피드백 API. Mock과 Stage 2 http는 같은 시그니처를 가진다.
// 노트 저장(§20 POST/PUT)은 Stage 4 경량 편집기가 쓴다. 블록 Schema는 OD-A05·API-OD-A04 결정 전 Mock 가정이다.


/** §20 GET /api/student/assessment/notes?sourceType=&sourceId= */
export function listNotes(sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: AssessmentNote[] }> {
  return isMockDataSource ? listNotesMock(sourceType, sourceId) : http.listNotesHttp(sourceType, sourceId)
}

/** §20 POST /api/student/assessment/notes — 노트 첫 저장 (Revision 1) */
export function createNote(request: CreateNoteRequest): Promise<SaveNoteResponse> {
  return guardWrite('createNote', () => (isMockDataSource ? createNoteMock(request) : http.createNoteHttp(request)))
}

/** §20 PUT /api/student/assessment/notes/{noteId} — 새 Revision 저장. 다른 저장이 먼저 있으면 409 RESOURCE_VERSION_CONFLICT */
export function updateNote(noteId: string, request: UpdateNoteRequest): Promise<SaveNoteResponse> {
  return guardWrite('updateNote', () => (isMockDataSource ? updateNoteMock(noteId, request) : http.updateNoteHttp(noteId, request)))
}

/** §21 GET /api/student/assessment/notes/{noteId}/revisions */
export function listNoteRevisions(noteId: string): Promise<{ items: NoteRevisionSummary[] }> {
  return isMockDataSource ? listNoteRevisionsMock(noteId) : http.listNoteRevisionsHttp(noteId)
}

/** §21 GET /api/student/assessment/notes/{noteId}/revisions/{revisionId} — 과거 Revision 본문 (불변) */
export function getNoteRevision(noteId: string, revisionId: string): Promise<NoteRevisionDetail> {
  return isMockDataSource ? getNoteRevisionMock(noteId, revisionId) : http.getNoteRevisionHttp(noteId, revisionId)
}

/** §24 GET /api/student/assessment/artifacts?sourceType=&sourceId= */
export function listArtifacts(sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: Artifact[] }> {
  return isMockDataSource ? listArtifactsMock(sourceType, sourceId) : http.listArtifactsHttp(sourceType, sourceId)
}

/** §24 POST /api/student/assessment/artifacts */
export function createArtifact(request: CreateArtifactRequest): Promise<Artifact> {
  return guardWrite('createArtifact', () => (isMockDataSource ? createArtifactMock(request) : http.createArtifactHttp(request)))
}

/** §25 GET /api/student/assessment/artifacts/{artifactId}/versions */
export function listArtifactVersions(artifactId: string): Promise<{ items: ArtifactVersion[] }> {
  return isMockDataSource ? listArtifactVersionsMock(artifactId) : http.listArtifactVersionsHttp(artifactId)
}

/** §25 POST /api/student/assessment/artifacts/{artifactId}/versions (multipart/form-data) */
export function uploadArtifactVersion(artifactId: string, request: UploadArtifactVersionRequest): Promise<ArtifactVersion> {
  return guardWrite('uploadArtifactVersion', () => (isMockDataSource ? uploadArtifactVersionMock(artifactId, request) : http.uploadArtifactVersionHttp(artifactId, request)))
}

/** §31 GET /api/student/assessment/feedback-requests */
export function listFeedbackRequests(query: {
  status?: FeedbackRequestStatus
  page: number
  size: number
}): Promise<PageResponse<FeedbackRequest>> {
  return isMockDataSource ? listFeedbackRequestsMock(query) : http.listFeedbackRequestsHttp(query)
}

/** §31 POST /api/student/assessment/feedback-requests */
export function createFeedbackRequest(body: CreateFeedbackRequestBody): Promise<FeedbackRequest> {
  return guardWrite('createFeedbackRequest', () => (isMockDataSource ? createFeedbackRequestMock(body) : http.createFeedbackRequestHttp(body)))
}

/** §32 GET /api/student/assessment/feedback-requests/{requestId}/reply */
export function getFeedbackReply(requestId: string): Promise<FeedbackReplyResponse> {
  return isMockDataSource ? getFeedbackReplyMock(requestId) : http.getFeedbackReplyHttp(requestId)
}

/** §26 GET .../artifacts/{artifactId}/versions/{versionId}/file — 원본 파일 (서버가 소유권 검사). Mock에는 실제 파일이 없다. */
export function downloadArtifactVersion(artifactId: string, versionId: string): Promise<Blob> {
  return isMockDataSource
    ? Promise.reject(new Error('시연 데이터에는 실제 파일이 없어요.'))
    : http.downloadArtifactVersionHttp(artifactId, versionId)
}

const mockOnly = (what: string) => Promise.reject(new ApiError(503, { code: 'ASSESSMENT_API_NOT_CONNECTED', message: `${what}는 시연(Mock) 데이터에서는 제공하지 않아요. 실제 서버 연결에서 사용할 수 있어요.`, details: {} }))

/** §26 앱 안 미리보기 (PDF·PNG·JPEG·GIF만, 서버가 소유권·SHA 확인). 미지원 형식은 415 PREVIEW_UNAVAILABLE */
export function previewArtifactVersion(artifactId: string, versionId: string): Promise<Blob> {
  return isMockDataSource ? mockOnly('미리보기') : http.previewArtifactVersionHttp(artifactId, versionId)
}

/** §25-1 두 버전 비교 (METADATA_ONLY) */
export function compareArtifactVersions(artifactId: string, fromVersionId: string, toVersionId: string): Promise<ArtifactComparison> {
  return isMockDataSource ? mockOnly('버전 비교') : http.compareArtifactVersionsHttp(artifactId, fromVersionId, toVersionId)
}

/** 휴지통으로 이동 (소프트 삭제 — 버전·파일은 지우지 않는다) */
export function trashArtifact(artifactId: string): Promise<void> {
  return guardWrite('trashArtifact', () => (isMockDataSource ? mockOnly('휴지통') : http.trashArtifactHttp(artifactId)))
}

export function trashSchoolAssessment(assessmentId: string): Promise<void> {
  return guardWrite('trashSchoolAssessment', () => (isMockDataSource ? mockOnly('휴지통') : http.trashSchoolAssessmentHttp(assessmentId)))
}
