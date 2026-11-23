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
} from '../types.ts'
import type { ArtifactVersionRecord, FeedbackRequestRecord, NoteRecord, NoteRevisionRecord } from './assessmentDetailFixture.ts'
import { fail, mockNow, nextMockId, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'

// §20·21 노트, §24·25 결과물·버전, §31·32 피드백 Mock.
// 파일은 내용을 저장하지 않고 이름·크기·형식 메타데이터만 Version으로 만든다 (assessment-frontend-mock.md §5).

const validationError = (field: string, reason: string) =>
  fail(400, { code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.', details: { fields: [{ field, reason }] } })

function assertSourceExists(sourceType: AssessmentSourceType, sourceId: string) {
  // 심화 탐구 노트·결과물은 같은 계약(§20·24)을 sourceType=ENRICHMENT_TASK로 쓴다.
  if (sourceType === 'ENRICHMENT_TASK') {
    if (!mockStore.enrichmentTasks.some((item) => item.taskId === sourceId)) {
      fail(404, { code: 'ENRICHMENT_TASK_NOT_FOUND', message: '심화 탐구를 찾을 수 없어요.', details: {} })
    }
    return
  }
  if (sourceType !== 'SCHOOL_ASSESSMENT') validationError('sourceType', 'unsupported')
  if (!mockStore.schoolAssessments.some((item) => item.assessmentId === sourceId)) {
    fail(404, { code: 'ASSESSMENT_NOT_FOUND', message: '수행평가를 찾을 수 없어요.', details: {} })
  }
}

// ---- §20·21 노트 ----

export function listNotesMock(sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: AssessmentNote[] }> {
  return respond(() => {
    if (scenarioActive('noteError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했어요.', details: {} })
    }
    assertSourceExists(sourceType, sourceId)
    // 노트 미생성이면 items: [] (§20)
    const items = mockStore.notes
      .filter((note) => note.sourceType === sourceType && note.sourceId === sourceId)
      .map((note): AssessmentNote => {
        const latest = note.revisions[note.revisions.length - 1]
        return {
          noteId: note.noteId,
          sourceType: note.sourceType,
          sourceId: note.sourceId,
          title: latest.title,
          blocks: latest.blocks,
          revisionId: latest.revisionId,
          revisionNumber: latest.revisionNumber,
          savedAt: latest.savedAt,
          updatedAt: latest.savedAt,
        }
      })
    return { items }
  })
}

export function listNoteRevisionsMock(noteId: string): Promise<{ items: NoteRevisionSummary[] }> {
  return respond(() => {
    const note = mockStore.notes.find((item) => item.noteId === noteId)
    if (!note) fail(404, { code: 'NOTE_NOT_FOUND', message: '노트를 찾을 수 없어요.', details: {} })
    return {
      items: [...note.revisions]
        .reverse()
        .map(({ revisionId, revisionNumber, savedAt }) => ({ revisionId, revisionNumber, savedAt })),
    }
  })
}

function validateNoteBody(title: string, blocks: CreateNoteRequest['blocks']) {
  const ids = new Set<string>()
  for (const block of blocks) {
    if (!block.blockId || ids.has(block.blockId)) validationError('blocks', 'duplicateBlockId')
    ids.add(block.blockId)
  }
  if (title.length > 200) validationError('title', 'tooLong')
}

function appendRevision(note: NoteRecord, title: string, blocks: CreateNoteRequest['blocks']): SaveNoteResponse {
  const previous = note.revisions[note.revisions.length - 1]
  const revision: NoteRevisionRecord = {
    revisionId: nextMockId('rev'),
    revisionNumber: (previous?.revisionNumber ?? 0) + 1,
    savedAt: mockNow(),
    title: title.trim() || '탐구 노트',
    // 새 Revision은 요청 본문을 복사해 둔다. 이전 Revision 배열은 건드리지 않는다 (§21 immutable).
    blocks: structuredClone(blocks),
  }
  note.revisions.push(revision)
  return {
    noteId: note.noteId,
    revisionId: revision.revisionId,
    revisionNumber: revision.revisionNumber,
    savedAt: revision.savedAt,
    updatedAt: revision.savedAt,
  }
}

export function createNoteMock(request: CreateNoteRequest): Promise<SaveNoteResponse> {
  return respond(() => {
    if (scenarioActive('noteSaveError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류로 노트를 저장하지 못했어요.', details: {} })
    }
    assertSourceExists(request.sourceType, request.sourceId)
    validateNoteBody(request.title, request.blocks)
    // 같은 과제에 이미 노트가 있으면 새로 만들지 않는다 (중복 생성 방지, 과제당 노트 수 정책은 미정 MM-18).
    if (mockStore.notes.some((note) => note.sourceType === request.sourceType && note.sourceId === request.sourceId)) {
      fail(409, { code: 'RESOURCE_VERSION_CONFLICT', message: '다른 변경사항이 먼저 저장되었습니다.', details: { reason: 'NOTE_EXISTS' } })
    }
    const note: NoteRecord = { noteId: nextMockId('note'), sourceType: request.sourceType, sourceId: request.sourceId, revisions: [] }
    mockStore.notes.push(note)
    return appendRevision(note, request.title, request.blocks)
  })
}

export function updateNoteMock(noteId: string, request: UpdateNoteRequest): Promise<SaveNoteResponse> {
  return respond(() => {
    if (scenarioActive('noteSaveError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류로 노트를 저장하지 못했어요.', details: {} })
    }
    const note = mockStore.notes.find((item) => item.noteId === noteId)
    if (!note) fail(404, { code: 'NOTE_NOT_FOUND', message: '노트를 찾을 수 없어요.', details: {} })
    // noteConflict: 다른 기기에서 먼저 저장한 상황을 재현한다 (그 저장을 실제 Revision으로 남긴다).
    if (scenarioActive('noteConflict')) {
      const latest = note.revisions[note.revisions.length - 1]
      appendRevision(note, latest.title, [
        ...latest.blocks,
        { blockId: nextMockId('block'), type: 'PARAGRAPH', text: '(다른 기기에서 추가한 문단 · 시연)' },
      ])
    }
    const latest = note.revisions[note.revisions.length - 1]
    if (request.expectedRevisionId !== latest.revisionId) {
      fail(409, {
        code: 'RESOURCE_VERSION_CONFLICT',
        message: '다른 변경사항이 먼저 저장되었습니다.',
        details: { currentRevisionId: latest.revisionId, currentRevisionNumber: latest.revisionNumber },
      })
    }
    validateNoteBody(request.title, request.blocks)
    return appendRevision(note, request.title, request.blocks)
  })
}

export function getNoteRevisionMock(noteId: string, revisionId: string): Promise<NoteRevisionDetail> {
  return respond(() => {
    if (scenarioActive('noteError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했어요.', details: {} })
    }
    const note = mockStore.notes.find((item) => item.noteId === noteId)
    const revision = note?.revisions.find((item) => item.revisionId === revisionId)
    if (!note || !revision) fail(404, { code: 'NOTE_NOT_FOUND', message: '노트 기록을 찾을 수 없어요.', details: {} })
    return { noteId, ...revision }
  })
}

// ---- §24·25 결과물·버전 ----

function toVersion(record: ArtifactVersionRecord): ArtifactVersion {
  return { ...record, file: { ...record.file } }
}

export function listArtifactsMock(sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: Artifact[] }> {
  return respond(() => {
    if (scenarioActive('artifactError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했어요.', details: {} })
    }
    assertSourceExists(sourceType, sourceId)
    return {
      items: mockStore.artifacts.filter((item) => item.sourceType === sourceType && item.sourceId === sourceId),
    }
  })
}

export function createArtifactMock(request: CreateArtifactRequest): Promise<Artifact> {
  return respond(() => {
    assertSourceExists(request.sourceType, request.sourceId)
    const title = request.title.trim()
    if (title === '') validationError('title', 'required')
    const artifact: Artifact = {
      artifactId: nextMockId('artifact'),
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      title,
      kind: request.kind,
    }
    mockStore.artifacts.push(artifact)
    return artifact
  })
}

export function listArtifactVersionsMock(artifactId: string): Promise<{ items: ArtifactVersion[] }> {
  return respond(() => {
    if (!mockStore.artifacts.some((item) => item.artifactId === artifactId)) {
      fail(404, { code: 'ARTIFACT_NOT_FOUND', message: '결과물을 찾을 수 없어요.', details: {} })
    }
    return {
      items: mockStore.artifactVersions
        .filter((version) => version.artifactId === artifactId)
        .sort((a, b) => b.versionNumber - a.versionNumber)
        .map(toVersion),
    }
  })
}

export function uploadArtifactVersionMock(artifactId: string, request: UploadArtifactVersionRequest): Promise<ArtifactVersion> {
  // File 객체는 structuredClone 대상이 아니므로 메타데이터만 먼저 꺼낸다.
  const meta = { fileName: request.file.name, contentType: request.file.type, sizeBytes: request.file.size }
  return respond(() => {
    if (scenarioActive('uploadError')) {
      // 업로드 실패 시 Version을 만들지 않는다 (§25).
      fail(500, { code: 'INTERNAL_ERROR', message: '파일을 올리지 못했어요.', details: {} })
    }
    if (!mockStore.artifacts.some((item) => item.artifactId === artifactId)) {
      fail(404, { code: 'ARTIFACT_NOT_FOUND', message: '결과물을 찾을 수 없어요.', details: {} })
    }
    if (meta.sizeBytes === 0) validationError('file', 'empty')
    const versions = mockStore.artifactVersions.filter((version) => version.artifactId === artifactId)
    const latest = versions.reduce<ArtifactVersionRecord | undefined>(
      (max, version) => (!max || version.versionNumber > max.versionNumber ? version : max),
      undefined,
    )
    if (request.expectedLatestVersionId !== undefined && request.expectedLatestVersionId !== latest?.versionId) {
      fail(409, {
        code: 'RESOURCE_VERSION_CONFLICT',
        message: '다른 변경사항이 먼저 저장되었습니다.',
        details: { currentVersionId: latest?.versionId ?? null },
      })
    }
    const record: ArtifactVersionRecord = {
      versionId: nextMockId('version'),
      artifactId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      file: { fileRef: nextMockId('file'), ...meta, contentType: meta.contentType || 'application/octet-stream' },
      changeNote: request.changeNote?.trim() || null,
      uploadedAt: mockNow(),
    }
    mockStore.artifactVersions.push(record)
    return toVersion(record)
  })
}

// ---- §31·32 피드백 ----

function toFeedbackRequest(record: FeedbackRequestRecord): FeedbackRequest {
  return {
    requestId: record.requestId,
    status: record.status,
    requestedAt: record.requestedAt,
    snapshot: { ...record.snapshot, artifactVersionIds: [...record.snapshot.artifactVersionIds] },
  }
}

export function listFeedbackRequestsMock(query: {
  status?: FeedbackRequestStatus
  page: number
  size: number
}): Promise<PageResponse<FeedbackRequest>> {
  return respond(() => {
    if (scenarioActive('feedbackListError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했어요.', details: {} })
    }
    // feedbackEmpty: 요청을 한 번도 보내지 않은 학생 (Empty와 Error를 구분해 확인하기 위함)
    const matched = (scenarioActive('feedbackEmpty') ? [] : mockStore.feedbackRequests)
      .filter((item) => !query.status || item.status === query.status)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    const start = query.page * query.size
    return {
      items: matched.slice(start, start + query.size).map(toFeedbackRequest),
      page: {
        number: query.page,
        size: query.size,
        totalElements: matched.length,
        totalPages: Math.ceil(matched.length / query.size),
      },
    }
  })
}

export function createFeedbackRequestMock(body: CreateFeedbackRequestBody): Promise<FeedbackRequest> {
  return respond(() => {
    if (scenarioActive('feedbackError')) {
      fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류로 요청을 보내지 못했어요.', details: {} })
    }
    assertSourceExists(body.sourceType, body.sourceId)
    // Snapshot 대상 확인: 저장된 Revision과 같은 과제의 업로드 완료 Version만 허용한다 (§31 원자성).
    const note = mockStore.notes.find((item) => item.sourceType === body.sourceType && item.sourceId === body.sourceId)
    if (!note?.revisions.some((revision) => revision.revisionId === body.noteRevisionId)) {
      fail(409, {
        code: 'FEEDBACK_SNAPSHOT_NOT_READY',
        message: '저장된 노트가 있어야 피드백을 요청할 수 있어요.',
        details: {},
      })
    }
    const ownArtifactIds = new Set(
      mockStore.artifacts
        .filter((item) => item.sourceType === body.sourceType && item.sourceId === body.sourceId)
        .map((item) => item.artifactId),
    )
    for (const versionId of body.artifactVersionIds) {
      const version = mockStore.artifactVersions.find((item) => item.versionId === versionId)
      if (!version || !ownArtifactIds.has(version.artifactId)) {
        fail(409, { code: 'FILE_VERSION_MISMATCH', message: '이 과제에 속한 파일 버전이 아니에요.', details: { versionId } })
      }
    }
    const record: FeedbackRequestRecord = {
      requestId: nextMockId('fbr'),
      status: 'PENDING',
      requestedAt: mockNow(),
      snapshot: { noteRevisionId: body.noteRevisionId, artifactVersionIds: [...body.artifactVersionIds], locked: true },
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      reply: null,
    }
    mockStore.feedbackRequests.push(record)
    return toFeedbackRequest(record)
  })
}

export function getFeedbackReplyMock(requestId: string): Promise<FeedbackReplyResponse> {
  return respond(() => {
    const record = mockStore.feedbackRequests.find((item) => item.requestId === requestId)
    if (!record) fail(404, { code: 'FEEDBACK_REQUEST_NOT_FOUND', message: '피드백 요청을 찾을 수 없어요.', details: {} })
    if (record.status === 'PENDING') return { requestId, status: 'PENDING', reply: null }
    return { requestId, status: record.status, deliveredAt: record.deliveredAt, reply: record.reply }
  })
}
