import type {
  ChangeEnrichmentTaskStatusResponse,
  CreateEnrichmentTaskRequest,
  CreatePersonalMockExamMaterialRequest,
  EnrichmentCatalogItem,
  EnrichmentTask,
  EnrichmentTaskStatus,
  MockExamMaterial,
  PageResponse,
  PersonalMockExamMaterial,
  UniversityResource,
  UpdateEnrichmentTaskRequest,
} from '../types.ts'
import { fail, mockNow, nextMockId, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'
import { retiredMockExamMaterials } from './enrichmentFixture.ts'
import { isValidExamLocator } from './universityExamMock.ts'

// §16 공개 심화 Task, §17 모의고사 소재·개인 자료, §18 개인 심화 Task, §27 대학 공개 자료 Mock.
// 공개 콘텐츠와 학생 Task는 서로 다른 Store 배열·ID를 쓴다. 시작해도 공개 콘텐츠 Record는 바뀌지 않는다.

const statusOrder: Record<EnrichmentTaskStatus, number> = { BEFORE_START: 0, IN_PROGRESS: 1, COMPLETED: 2 }
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const serverError = (message = '일시적인 서버 오류가 발생했어요.') =>
  fail(500, { code: 'INTERNAL_ERROR', message, details: {} })

const validationError = (fields: { field: string; reason: string }[]) =>
  fail(400, { code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.', details: { fields } })

function paginate<T>(items: T[], page: number, size: number): PageResponse<T> {
  const start = page * size
  return {
    items: items.slice(start, start + size),
    page: { number: page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) },
  }
}

const matchesQuery = (query: string | undefined, ...texts: string[]) => {
  const needle = query?.trim().toLocaleLowerCase('ko')
  return !needle || texts.some((text) => text.toLocaleLowerCase('ko').includes(needle))
}

const knownSubjectIds = () => new Set(mockStore.academicContexts.flatMap((context) => context.subjects.map((s) => s.subjectId)))

// ---- §16 공개 콘텐츠 ----

export function listCatalogMock(query: {
  subjectId?: string
  query?: string
  page: number
  size: number
}): Promise<PageResponse<EnrichmentCatalogItem>> {
  return respond(() => {
    if (scenarioActive('catalogError')) serverError()
    const items = scenarioActive('enrichmentEmpty')
      ? []
      : mockStore.enrichmentCatalog.filter(
          (item) =>
            item.published &&
            (!query.subjectId || item.subjectId === query.subjectId) &&
            matchesQuery(query.query, item.title, item.goal, ...item.methods),
        )
    return paginate(items, query.page, query.size)
  })
}

export function getCatalogItemMock(catalogTaskId: string): Promise<EnrichmentCatalogItem> {
  return respond(() => {
    if (scenarioActive('catalogDetailError')) serverError()
    const item = mockStore.enrichmentCatalog.find((entry) => entry.catalogTaskId === catalogTaskId)
    // 미공개·삭제는 학생에게 없는 것과 같다 (§16).
    if (!item || !item.published) {
      fail(404, { code: 'ENRICHMENT_CATALOG_NOT_FOUND', message: '공개된 탐구 콘텐츠를 찾을 수 없어요.', details: {} })
    }
    return item
  })
}

// ---- §18 개인 Task ----

export function listEnrichmentTasksMock(query: {
  status?: EnrichmentTaskStatus
  page: number
  size: number
}): Promise<PageResponse<EnrichmentTask>> {
  return respond(() => {
    if (scenarioActive('taskListError')) serverError()
    const items = (scenarioActive('enrichmentEmpty') ? [] : mockStore.enrichmentTasks)
      .filter((task) => !query.status || task.status === query.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return paginate(items, query.page, query.size)
  })
}

function findTask(taskId: string): EnrichmentTask {
  const task = mockStore.enrichmentTasks.find((entry) => entry.taskId === taskId)
  if (!task) fail(404, { code: 'ENRICHMENT_TASK_NOT_FOUND', message: '심화 탐구를 찾을 수 없어요.', details: {} })
  return task
}

export function getEnrichmentTaskMock(taskId: string): Promise<EnrichmentTask> {
  return respond(() => findTask(taskId))
}

export function createEnrichmentTaskMock(request: CreateEnrichmentTaskRequest): Promise<EnrichmentTask> {
  return respond(() => {
    if (scenarioActive('taskCreateError')) serverError('일시적인 서버 오류로 탐구를 만들지 못했어요.')
    const title = request.title.trim()
    const fields: { field: string; reason: string }[] = []
    if (title === '') fields.push({ field: 'title', reason: 'required' })
    if (!knownSubjectIds().has(request.subjectId)) fields.push({ field: 'subjectId', reason: 'unknown' })
    if (!(request.status in statusOrder)) fields.push({ field: 'status', reason: 'unknown' })
    if (request.deadlineDate !== null && !datePattern.test(request.deadlineDate)) {
      fields.push({ field: 'deadlineDate', reason: 'format' })
    }
    if (request.relatedAssessmentId !== null && !mockStore.schoolAssessments.some((a) => a.assessmentId === request.relatedAssessmentId)) {
      fields.push({ field: 'relatedAssessmentId', reason: 'unknown' })
    }
    if (request.catalogTaskId !== null && !mockStore.enrichmentCatalog.some((c) => c.catalogTaskId === request.catalogTaskId && c.published)) {
      fields.push({ field: 'catalogTaskId', reason: 'unknown' })
    }
    // sourceReference는 §18 제안 계약(DRAFT). Mock은 출처 존재만 확인해 추적을 시연한다 (API-OD-A12).
    const source = request.sourceReference
    if (source) {
      const exists =
        source.type === 'MOCK_EXAM_MATERIAL'
          ? mockStore.mockExamMaterials.some((m) => m.materialId === source.sourceId) || retiredMockExamMaterials.some((m) => m.materialId === source.sourceId)
          : source.type === 'PERSONAL_MOCK_EXAM_MATERIAL'
            ? mockStore.personalMockExamMaterials.some((m) => m.materialId === source.sourceId)
            : mockStore.universityResources.some((r) => r.resourceId === source.sourceId)
      if (!exists) fields.push({ field: 'sourceReference', reason: 'unknown' })
      // locator(P-25)는 대학 기출 PDF에만 쓰고, 그 문서의 실제 쪽·문항이어야 한다.
      else if (source.locator && (source.type !== 'UNIVERSITY_RESOURCE' || !isValidExamLocator(source))) {
        fields.push({ field: 'sourceReference.locator', reason: 'unknown' })
      }
    }
    if (fields.length > 0) validationError(fields)

    const now = mockNow()
    const task: EnrichmentTask = {
      taskId: nextMockId('task'),
      title,
      subjectId: request.subjectId,
      goal: request.goal?.trim() || null,
      relatedAssessmentId: request.relatedAssessmentId,
      catalogTaskId: request.catalogTaskId,
      status: request.status,
      deadlineDate: request.deadlineDate,
      sourceReference: source ? { ...source } : null,
      createdAt: now,
      updatedAt: now,
    }
    mockStore.enrichmentTasks.push(task)
    return task
  })
}

export function updateEnrichmentTaskMock(taskId: string, request: UpdateEnrichmentTaskRequest): Promise<EnrichmentTask> {
  return respond(() => {
    const task = findTask(taskId)
    if (request.relatedAssessmentId !== null && !mockStore.schoolAssessments.some((a) => a.assessmentId === request.relatedAssessmentId)) {
      validationError([{ field: 'relatedAssessmentId', reason: 'unknown' }])
    }
    // 연결은 Task 쪽 참조만 바꾼다. 학교 수행평가 Record는 건드리지 않는다.
    task.relatedAssessmentId = request.relatedAssessmentId
    task.updatedAt = mockNow()
    return task
  })
}

export function changeEnrichmentTaskStatusMock(
  taskId: string,
  status: EnrichmentTaskStatus,
): Promise<ChangeEnrichmentTaskStatusResponse> {
  return respond(() => {
    const task = findTask(taskId)
    // §18은 §13과 같은 3개 상태를 쓴다. 역전이 정책은 미확정이라 되돌리기를 허용하지 않는다 (MM-01).
    if (statusOrder[status] < statusOrder[task.status]) {
      fail(409, {
        code: 'INVALID_STATE_TRANSITION',
        message: '현재 상태에서 해당 동작을 할 수 없습니다.',
        details: { currentState: task.status, requestedAction: status },
      })
    }
    task.status = status
    task.updatedAt = mockNow()
    return { taskId, status, updatedAt: task.updatedAt }
  })
}

// ---- §17 모의고사 소재·개인 자료 ----

export function listMockExamMaterialsMock(query: {
  subjectId?: string
  query?: string
  page: number
  size: number
}): Promise<PageResponse<MockExamMaterial>> {
  return respond(() => {
    if (scenarioActive('materialError')) serverError()
    const items = scenarioActive('enrichmentEmpty')
      ? []
      : mockStore.mockExamMaterials.filter(
          (item) =>
            (!query.subjectId || item.subjectId === query.subjectId) &&
            matchesQuery(query.query, item.idea.topicTitle, item.idea.coreMaterial, item.research?.examTitle ?? '', ...item.idea.relatedFields),
        )
    return paginate(items, query.page, query.size)
  })
}

export function getMockExamMaterialMock(materialId: string): Promise<MockExamMaterial> {
  return respond(() => {
    if (scenarioActive('materialError')) serverError()
    // 추천 목록에서 내린 예전 시연 소재도 ID로는 열린다 (그 소재에서 시작한 탐구의 출처 보존).
    const item =
      mockStore.mockExamMaterials.find((entry) => entry.materialId === materialId) ??
      retiredMockExamMaterials.find((entry) => entry.materialId === materialId)
    if (!item) fail(404, { code: 'MOCK_EXAM_MATERIAL_NOT_FOUND', message: '탐구 소재를 찾을 수 없어요.', details: {} })
    return item
  })
}

export function listPersonalMockExamMaterialsMock(): Promise<PageResponse<PersonalMockExamMaterial>> {
  return respond(() => {
    if (scenarioActive('materialError')) serverError()
    const items = [...mockStore.personalMockExamMaterials].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return paginate(items, 0, Math.max(items.length, 1))
  })
}

export function createPersonalMockExamMaterialMock(
  request: CreatePersonalMockExamMaterialRequest,
): Promise<PersonalMockExamMaterial> {
  return respond(() => {
    if (scenarioActive('taskCreateError')) serverError('일시적인 서버 오류로 자료를 등록하지 못했어요.')
    const fields: { field: string; reason: string }[] = []
    if (request.subjectId.trim() === '') fields.push({ field: 'subjectId', reason: 'required' })
    if (!request.sourceUrl && !request.sourceFileRef) fields.push({ field: 'sourceUrl', reason: 'required' })
    if (request.sourceUrl && !/^https?:\/\//.test(request.sourceUrl)) fields.push({ field: 'sourceUrl', reason: 'format' })
    if (fields.length > 0) validationError(fields)
    // 개인 자료는 학생 본인 것이며 공개 카드 배열(mockExamMaterials)에 넣지 않는다 (§17).
    const record: PersonalMockExamMaterial = { ...request, materialId: nextMockId('my_material'), createdAt: mockNow() }
    mockStore.personalMockExamMaterials.push(record)
    return record
  })
}

// ---- §27 대학 공개 자료 ----

export function listUniversityResourcesMock(query: {
  university?: string
  academicYear?: number
  query?: string
  page: number
  size: number
}): Promise<PageResponse<UniversityResource>> {
  return respond(() => {
    if (scenarioActive('universityError')) serverError()
    const items = scenarioActive('enrichmentEmpty')
      ? []
      : mockStore.universityResources.filter(
          (item) =>
            (!query.university || item.university === query.university) &&
            (!query.academicYear || item.academicYear === query.academicYear) &&
            matchesQuery(query.query, item.title, item.university, ...item.relatedConcepts),
        )
    return paginate(items, query.page, query.size)
  })
}
