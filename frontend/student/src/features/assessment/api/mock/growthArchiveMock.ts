import type {
  ArchiveFavoriteRequest,
  ArchiveItem,
  ArchiveTab,
  CreateGrowthRecordRequest,
  GrowthRecord,
  PageResponse,
  UpdateGrowthRecordRequest,
} from '../types.ts'
import { fixtureCurrentTerm } from './assessmentFixture.ts'
import { fixtureFavoriteBaseTime } from './growthArchiveFixture.ts'
import { fail, mockNow, nextMockId, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'

// §29 성장 기록, §30 보관함 Mock.
// 보관함은 Store에 따로 저장하지 않고 수행평가·심화 탐구·노트·결과물에서 매번 계산한다 (조회용 Projection, OD-A11).

const datePattern = /^\d{4}-\d{2}-\d{2}$/

const serverError = (message = '일시적인 서버 오류가 발생했어요.') => fail(500, { code: 'INTERNAL_ERROR', message, details: {} })

const validationError = (fields: { field: string; reason: string }[]) =>
  fail(400, { code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.', details: { fields } })

function paginate<T>(items: T[], page: number, size: number): PageResponse<T> {
  const start = page * size
  return { items: items.slice(start, start + size), page: { number: page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) } }
}

const matches = (query: string | undefined, ...texts: (string | null | undefined)[]) => {
  const needle = query?.trim().toLocaleLowerCase('ko')
  return !needle || texts.some((text) => text?.toLocaleLowerCase('ko').includes(needle))
}

// ---- §29 성장 기록 ----

function validateRecord(request: Partial<CreateGrowthRecordRequest>, requireTitle: boolean) {
  const fields: { field: string; reason: string }[] = []
  if ((requireTitle || request.title !== undefined) && !request.title?.trim()) fields.push({ field: 'title', reason: 'required' })
  if (request.activityStartDate && !datePattern.test(request.activityStartDate)) fields.push({ field: 'activityStartDate', reason: 'format' })
  if (request.subjectId && !mockStore.academicContexts.some((context) => context.subjects.some((s) => s.subjectId === request.subjectId))) {
    fields.push({ field: 'subjectId', reason: 'unknown' })
  }
  if (request.relatedSourceType !== undefined || request.relatedSourceId !== undefined) {
    const type = request.relatedSourceType ?? null
    const id = request.relatedSourceId ?? null
    // 독립 활동은 둘 다 null. 하나만 있으면 잘못된 연결이다.
    if ((type === null) !== (id === null)) fields.push({ field: 'relatedSourceId', reason: 'pair' })
    if (type === 'SCHOOL_ASSESSMENT' && !mockStore.schoolAssessments.some((a) => a.assessmentId === id)) fields.push({ field: 'relatedSourceId', reason: 'unknown' })
    if (type === 'ENRICHMENT_TASK' && !mockStore.enrichmentTasks.some((t) => t.taskId === id)) fields.push({ field: 'relatedSourceId', reason: 'unknown' })
  }
  if (request.artifactIds) {
    for (const artifactId of request.artifactIds) {
      const artifact = mockStore.artifacts.find((item) => item.artifactId === artifactId)
      // 결과물은 연결한 활동에 속한 것만 (다른 과제의 파일을 근거로 붙이지 않는다)
      if (!artifact || artifact.sourceId !== (request.relatedSourceId ?? null)) fields.push({ field: 'artifactIds', reason: 'unknown' })
    }
  }
  if (fields.length > 0) validationError(fields)
}

export function listGrowthRecordsMock(query: { academicYear?: number; query?: string; page: number; size: number }): Promise<PageResponse<GrowthRecord>> {
  return respond(() => {
    if (scenarioActive('growthListError')) serverError()
    const items = (scenarioActive('growthEmpty') ? [] : mockStore.growthRecords)
      .filter((record) => !query.academicYear || record.activityStartDate?.startsWith(String(query.academicYear)))
      .filter((record) => matches(query.query, record.title, record.role, record.reflection, record.outcome))
      .sort((a, b) => (b.activityStartDate ?? '').localeCompare(a.activityStartDate ?? '') || b.createdAt.localeCompare(a.createdAt))
    return paginate(items, query.page, query.size)
  })
}

function findRecord(recordId: string): GrowthRecord {
  const record = mockStore.growthRecords.find((item) => item.recordId === recordId)
  if (!record) fail(404, { code: 'GROWTH_RECORD_NOT_FOUND', message: '성장 기록을 찾을 수 없어요.', details: {} })
  return record
}

export function getGrowthRecordMock(recordId: string): Promise<GrowthRecord> {
  return respond(() => findRecord(recordId))
}

const clean = (value: string | null | undefined) => (value?.trim() ? value.trim() : null)

export function createGrowthRecordMock(request: CreateGrowthRecordRequest): Promise<GrowthRecord> {
  return respond(() => {
    if (scenarioActive('growthSaveError')) serverError('일시적인 서버 오류로 성장 기록을 저장하지 못했어요.')
    validateRecord(request, true)
    const now = mockNow()
    const record: GrowthRecord = {
      ...request,
      title: request.title.trim(),
      role: clean(request.role),
      motivation: clean(request.motivation),
      process: clean(request.process),
      contribution: clean(request.contribution),
      difficulty: clean(request.difficulty),
      solution: clean(request.solution),
      outcome: clean(request.outcome),
      reflection: clean(request.reflection),
      followUp: clean(request.followUp),
      artifactIds: [...request.artifactIds],
      recordId: nextMockId('growth'),
      createdAt: now,
      updatedAt: now,
    }
    mockStore.growthRecords.push(record)
    return record
  })
}

export function updateGrowthRecordMock(recordId: string, request: UpdateGrowthRecordRequest): Promise<GrowthRecord> {
  return respond(() => {
    if (scenarioActive('growthSaveError')) serverError('일시적인 서버 오류로 성장 기록을 저장하지 못했어요.')
    const record = findRecord(recordId)
    validateRecord(
      {
        ...request,
        relatedSourceType: request.relatedSourceType !== undefined ? request.relatedSourceType : record.relatedSourceType,
        relatedSourceId: request.relatedSourceId !== undefined ? request.relatedSourceId : record.relatedSourceId,
        artifactIds: request.artifactIds ?? record.artifactIds,
      },
      false,
    )
    const textFields = ['role', 'motivation', 'process', 'contribution', 'difficulty', 'solution', 'outcome', 'reflection', 'followUp'] as const
    if (request.title !== undefined) record.title = request.title.trim()
    if (request.subjectId !== undefined) record.subjectId = request.subjectId
    if (request.activityStartDate !== undefined) record.activityStartDate = request.activityStartDate
    for (const field of textFields) if (request[field] !== undefined) record[field] = clean(request[field])
    if (request.relatedSourceType !== undefined) record.relatedSourceType = request.relatedSourceType
    if (request.relatedSourceId !== undefined) record.relatedSourceId = request.relatedSourceId
    if (request.artifactIds !== undefined) record.artifactIds = [...request.artifactIds]
    record.updatedAt = mockNow()
    return record
  })
}

// ---- §30 보관함 ----

function noteFor(sourceType: string, sourceId: string) {
  return mockStore.notes.find((note) => note.sourceType === sourceType && note.sourceId === sourceId)
}

/** 원본 생성·노트 저장·파일 업로드 중 가장 최근 시각 (열람 기록은 계약에 없어 쓰지 않는다) */
function lastActivity(sourceType: string, sourceId: string, createdAt: string): string {
  const note = noteFor(sourceType, sourceId)
  const noteSaved = note?.revisions[note.revisions.length - 1]?.savedAt
  const artifactIds = new Set(mockStore.artifacts.filter((a) => a.sourceId === sourceId).map((a) => a.artifactId))
  const uploads = mockStore.artifactVersions.filter((v) => artifactIds.has(v.artifactId)).map((v) => v.uploadedAt)
  return [createdAt, noteSaved, ...uploads].filter((value): value is string => Boolean(value)).sort().at(-1) ?? createdAt
}

function isFavorite(sourceType: string, sourceId: string) {
  return mockStore.favorites.some((item) => item.sourceType === sourceType && item.sourceId === sourceId && item.favorite)
}

function projection(): ArchiveItem[] {
  const schoolItems: ArchiveItem[] = mockStore.schoolAssessments.map((record) => {
    const note = noteFor('SCHOOL_ASSESSMENT', record.assessmentId)
    return {
      sourceType: 'SCHOOL_ASSESSMENT',
      sourceId: record.assessmentId,
      title: record.title,
      subjectId: record.subjectId,
      academicYear: record.academicYear,
      semester: record.semester,
      status: record.status,
      lastActivityAt: lastActivity('SCHOOL_ASSESSMENT', record.assessmentId, record.createdAt),
      noteBlockCount: note ? note.revisions[note.revisions.length - 1].blocks.length : null,
      favorite: isFavorite('SCHOOL_ASSESSMENT', record.assessmentId),
      deletedAt: null,
    }
  })
  const taskItems: ArchiveItem[] = mockStore.enrichmentTasks.map((task) => {
    const note = noteFor('ENRICHMENT_TASK', task.taskId)
    return {
      sourceType: 'ENRICHMENT_TASK',
      sourceId: task.taskId,
      title: task.title,
      subjectId: task.subjectId,
      // EnrichmentTask에는 학기 정보가 없다 (§18). 지난 학기 탭에는 넣지 않는다.
      academicYear: null,
      semester: null,
      status: task.status,
      lastActivityAt: lastActivity('ENRICHMENT_TASK', task.taskId, task.updatedAt),
      noteBlockCount: note ? note.revisions[note.revisions.length - 1].blocks.length : null,
      favorite: isFavorite('ENRICHMENT_TASK', task.taskId),
      deletedAt: null,
    }
  })
  // 탐구 라이브러리 공개 콘텐츠는 학생 기록이 아니라서 즐겨찾기한 것만 즐겨찾기 탭에 보인다 (Mockup AR-TAB-02, P-22 Mock 전용).
  const catalogItems: ArchiveItem[] = mockStore.enrichmentCatalog
    .filter((item) => item.published && isFavorite('ENRICHMENT_CATALOG', item.catalogTaskId))
    .map((item) => ({
      sourceType: 'ENRICHMENT_CATALOG',
      sourceId: item.catalogTaskId,
      title: item.title,
      subjectId: item.subjectId,
      academicYear: null,
      semester: null,
      status: null,
      lastActivityAt: mockStore.favoriteMarkedAt[`ENRICHMENT_CATALOG:${item.catalogTaskId}`] ?? fixtureFavoriteBaseTime,
      noteBlockCount: null,
      favorite: true,
      deletedAt: null,
    }))
  return [...schoolItems, ...taskItems, ...catalogItems]
}

const isCurrentTerm = (item: ArchiveItem) =>
  item.academicYear === fixtureCurrentTerm.academicYear && item.semester === fixtureCurrentTerm.semester

export function listArchiveMock(query: { tab: ArchiveTab; academicYear?: number; query?: string; page: number; size: number }): Promise<PageResponse<ArchiveItem>> {
  return respond(() => {
    if (scenarioActive('archiveError')) serverError()
    let items: ArchiveItem[]
    if (query.tab === 'trash') {
      // 삭제·휴지통 정책이 정해지지 않아(API-OD-A08) 실제로 휴지통에 들어간 기록은 없다.
      // archiveTrashDemo는 화면 확인용 시연 항목 하나만 돌려준다 (실제 삭제 결과 아님).
      items = scenarioActive('archiveTrashDemo')
        ? [{ sourceType: 'SCHOOL_ASSESSMENT', sourceId: 'demo_trash_001', title: '(시연) 통합과학2 모둠 역할 메모', subjectId: 'subj_02', academicYear: 2026, semester: 2, status: null, lastActivityAt: '2026-10-09T10:00:00+09:00', noteBlockCount: null, favorite: false, deletedAt: '2026-10-09T10:00:00+09:00' }]
        : []
    } else {
      const all = projection()
      items =
        query.tab === 'favorites'
          ? all.filter((item) => item.favorite)
          : query.tab === 'completed'
            ? all.filter((item) => item.status === 'COMPLETED')
            : query.tab === 'previous-semesters'
              ? all.filter((item) => item.academicYear !== null && !isCurrentTerm(item))
              : all.filter((item) => item.sourceType === 'ENRICHMENT_TASK' || (item.sourceType === 'SCHOOL_ASSESSMENT' && isCurrentTerm(item)))
    }
    const filtered = items
      .filter((item) => !query.academicYear || item.academicYear === query.academicYear)
      .filter((item) => matches(query.query, item.title))
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    return paginate(filtered, query.page, query.size)
  })
}

export function setArchiveFavoriteMock(request: ArchiveFavoriteRequest): Promise<ArchiveFavoriteRequest> {
  return respond(() => {
    if (scenarioActive('favoriteError')) serverError('즐겨찾기를 바꾸지 못했어요.')
    // §30 예시는 SCHOOL_ASSESSMENT뿐이다. 심화 탐구·라이브러리 콘텐츠는 Mock 전용 제안(P-22)으로만 받는다 (MM-40).
    const exists =
      request.sourceType === 'SCHOOL_ASSESSMENT'
        ? mockStore.schoolAssessments.some((a) => a.assessmentId === request.sourceId)
        : request.sourceType === 'ENRICHMENT_TASK'
          ? mockStore.enrichmentTasks.some((task) => task.taskId === request.sourceId)
          : request.sourceType === 'ENRICHMENT_CATALOG'
            ? mockStore.enrichmentCatalog.some((item) => item.catalogTaskId === request.sourceId && item.published)
            : validationError([{ field: 'sourceType', reason: 'unsupported' }])
    if (!exists) {
      fail(404, { code: 'ARCHIVE_SOURCE_NOT_FOUND', message: '원본 기록을 찾을 수 없어요.', details: {} })
    }
    if (request.favorite) mockStore.favoriteMarkedAt[`${request.sourceType}:${request.sourceId}`] = mockNow()
    // 즐겨찾기는 원본을 가리키는 표시일 뿐이다. 해제해도 원본은 그대로다.
    mockStore.favorites = [
      ...mockStore.favorites.filter((item) => !(item.sourceType === request.sourceType && item.sourceId === request.sourceId)),
      ...(request.favorite ? [{ ...request }] : []),
    ]
    return request
  })
}
