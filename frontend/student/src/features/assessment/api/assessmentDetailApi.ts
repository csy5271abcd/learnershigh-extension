import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
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

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §20 GET /api/student/assessment/notes?sourceType=&sourceId= */
export function listNotes(sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: AssessmentNote[] }> {
  return isMockDataSource ? listNotesMock(sourceType, sourceId) : httpNotConnected()
}

/** §20 POST /api/student/assessment/notes — 노트 첫 저장 (Revision 1) */
export function createNote(request: CreateNoteRequest): Promise<SaveNoteResponse> {
  return isMockDataSource ? createNoteMock(request) : httpNotConnected()
}

/** §20 PUT /api/student/assessment/notes/{noteId} — 새 Revision 저장. 다른 저장이 먼저 있으면 409 RESOURCE_VERSION_CONFLICT */
export function updateNote(noteId: string, request: UpdateNoteRequest): Promise<SaveNoteResponse> {
  return isMockDataSource ? updateNoteMock(noteId, request) : httpNotConnected()
}

/** §21 GET /api/student/assessment/notes/{noteId}/revisions */
export function listNoteRevisions(noteId: string): Promise<{ items: NoteRevisionSummary[] }> {
  return isMockDataSource ? listNoteRevisionsMock(noteId) : httpNotConnected()
}

/** §21 GET /api/student/assessment/notes/{noteId}/revisions/{revisionId} — 과거 Revision 본문 (불변) */
export function getNoteRevision(noteId: string, revisionId: string): Promise<NoteRevisionDetail> {
  return isMockDataSource ? getNoteRevisionMock(noteId, revisionId) : httpNotConnected()
}

/** §24 GET /api/student/assessment/artifacts?sourceType=&sourceId= */
export function listArtifacts(sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: Artifact[] }> {
  return isMockDataSource ? listArtifactsMock(sourceType, sourceId) : httpNotConnected()
}

/** §24 POST /api/student/assessment/artifacts */
export function createArtifact(request: CreateArtifactRequest): Promise<Artifact> {
  return isMockDataSource ? createArtifactMock(request) : httpNotConnected()
}

/** §25 GET /api/student/assessment/artifacts/{artifactId}/versions */
export function listArtifactVersions(artifactId: string): Promise<{ items: ArtifactVersion[] }> {
  return isMockDataSource ? listArtifactVersionsMock(artifactId) : httpNotConnected()
}

/** §25 POST /api/student/assessment/artifacts/{artifactId}/versions (multipart/form-data) */
export function uploadArtifactVersion(artifactId: string, request: UploadArtifactVersionRequest): Promise<ArtifactVersion> {
  return isMockDataSource ? uploadArtifactVersionMock(artifactId, request) : httpNotConnected()
}

/** §31 GET /api/student/assessment/feedback-requests */
export function listFeedbackRequests(query: {
  status?: FeedbackRequestStatus
  page: number
  size: number
}): Promise<PageResponse<FeedbackRequest>> {
  return isMockDataSource ? listFeedbackRequestsMock(query) : httpNotConnected()
}

/** §31 POST /api/student/assessment/feedback-requests */
export function createFeedbackRequest(body: CreateFeedbackRequestBody): Promise<FeedbackRequest> {
  return isMockDataSource ? createFeedbackRequestMock(body) : httpNotConnected()
}

/** §32 GET /api/student/assessment/feedback-requests/{requestId}/reply */
export function getFeedbackReply(requestId: string): Promise<FeedbackReplyResponse> {
  return isMockDataSource ? getFeedbackReplyMock(requestId) : httpNotConnected()
}
