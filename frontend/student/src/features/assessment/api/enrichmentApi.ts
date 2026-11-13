import { getCatalogContent, getMockExamContent, listCatalogContent, listMockExamContent } from '../content/enrichmentContent.ts'
import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { guardWrite } from './viewMode.ts'
import {
  changeEnrichmentTaskStatusMock,
  createEnrichmentTaskMock,
  createPersonalMockExamMaterialMock,
  getEnrichmentTaskMock,
  listEnrichmentTasksMock,
  listPersonalMockExamMaterialsMock,
  listUniversityResourcesMock,
  updateEnrichmentTaskMock,
} from './mock/enrichmentMock.ts'
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
} from './types.ts'

// 심화 탐구 화면이 호출하는 API (api-contract.md §16·17·18·27).
// 2026-11-11: 공개 콘텐츠 읽기(§16 목록·상세, §17 모의고사 목록·상세)는 정적 참고자료(content/enrichmentContent.ts)로 바꿨다.
// dataSource(mock|http)와 무관하며 http 모드에서도 503을 내지 않는다(assessment-enrichment-content.md §6-3).
// 개인 Task·개인 지문 함수는 화면 진입을 없앴고(범위 축소 2026-11-03), 코드 제거는 영향 분석 뒤 별도 제안한다.

function notFound(code: string, message: string): Promise<never> {
  return Promise.reject(new ApiError(404, { code, message, details: {} }))
}

function paginate<T>(items: T[], page: number, size: number): PageResponse<T> {
  const start = page * size
  return {
    items: items.slice(start, start + size),
    page: { number: page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) },
  }
}

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §16 GET /api/student/assessment/enrichment/catalog?subjectId=&query=&page=&size= */
export function listCatalog(query: {
  subjectId?: string
  query?: string
  page: number
  size: number
}): Promise<PageResponse<EnrichmentCatalogItem>> {
  // subjectId 필터는 콘텐츠 자체 과목 ID 기준이다. 화면은 교과 이름 필터(listCatalogContent)를 쓴다.
  const items = listCatalogContent({ query: query.query }).filter((item) => !query.subjectId || item.subjectId === query.subjectId)
  return Promise.resolve(paginate(items, query.page, query.size))
}

/** §16 GET /api/student/assessment/enrichment/catalog/{catalogTaskId} */
export function getCatalogItem(catalogTaskId: string): Promise<EnrichmentCatalogItem> {
  const item = getCatalogContent(catalogTaskId)
  return item ? Promise.resolve(item) : notFound('ENRICHMENT_CATALOG_NOT_FOUND', '탐구 콘텐츠를 찾을 수 없어요.')
}

/** §18 GET /api/student/assessment/enrichment/tasks?status=&page=&size= */
export function listEnrichmentTasks(query: {
  status?: EnrichmentTaskStatus
  page: number
  size: number
}): Promise<PageResponse<EnrichmentTask>> {
  // 심화 Task는 2026-11-03 범위 축소로 폐기. http에서는 학생 Task가 없으므로 빈 목록(성장 기록 관련 활동 선택 등이 오류로 막히지 않게).
  return isMockDataSource ? listEnrichmentTasksMock(query) : Promise.resolve({ items: [], page: { number: query.page, size: query.size, totalElements: 0, totalPages: 0 } })
}

/** §18 GET /api/student/assessment/enrichment/tasks/{taskId} */
export function getEnrichmentTask(taskId: string): Promise<EnrichmentTask> {
  return isMockDataSource ? getEnrichmentTaskMock(taskId) : httpNotConnected()
}

/** §18 POST /api/student/assessment/enrichment/tasks (공개 콘텐츠에서 시작하거나 직접 생성) */
export function createEnrichmentTask(request: CreateEnrichmentTaskRequest): Promise<EnrichmentTask> {
  return guardWrite('createEnrichmentTask', () => (isMockDataSource ? createEnrichmentTaskMock(request) : httpNotConnected()))
}

/** §18 PATCH /api/student/assessment/enrichment/tasks/{taskId} */
export function updateEnrichmentTask(taskId: string, request: UpdateEnrichmentTaskRequest): Promise<EnrichmentTask> {
  return guardWrite('updateEnrichmentTask', () => (isMockDataSource ? updateEnrichmentTaskMock(taskId, request) : httpNotConnected()))
}

/** §18 PATCH /api/student/assessment/enrichment/tasks/{taskId}/status */
export function changeEnrichmentTaskStatus(
  taskId: string,
  status: EnrichmentTaskStatus,
): Promise<ChangeEnrichmentTaskStatusResponse> {
  return guardWrite('changeEnrichmentTaskStatus', () => (isMockDataSource ? changeEnrichmentTaskStatusMock(taskId, status) : httpNotConnected()))
}

/** §17 GET /api/student/assessment/mock-exam-materials?subjectId=&query=&page=&size= */
export function listMockExamMaterials(query: {
  subjectId?: string
  query?: string
  page: number
  size: number
}): Promise<PageResponse<MockExamMaterial>> {
  return Promise.resolve(paginate(listMockExamContent({ subjectId: query.subjectId, query: query.query }), query.page, query.size))
}

/** §17 GET /api/student/assessment/mock-exam-materials/{materialId} */
export function getMockExamMaterial(materialId: string): Promise<MockExamMaterial> {
  const item = getMockExamContent(materialId)
  return item ? Promise.resolve(item) : notFound('MOCK_EXAM_MATERIAL_NOT_FOUND', '모의고사 자료를 찾을 수 없어요.')
}

/** §17 GET /api/student/assessment/my-mock-exam-materials */
export function listPersonalMockExamMaterials(): Promise<PageResponse<PersonalMockExamMaterial>> {
  return isMockDataSource ? listPersonalMockExamMaterialsMock() : httpNotConnected()
}

/** §17 POST /api/student/assessment/my-mock-exam-materials */
export function createPersonalMockExamMaterial(
  request: CreatePersonalMockExamMaterialRequest,
): Promise<PersonalMockExamMaterial> {
  return guardWrite('createPersonalMockExamMaterial', () => (isMockDataSource ? createPersonalMockExamMaterialMock(request) : httpNotConnected()))
}

/** §27 GET /api/student/assessment/university-resources?university=&academicYear=&query=&page=&size= */
export function listUniversityResources(query: {
  university?: string
  academicYear?: number
  query?: string
  page: number
  size: number
}): Promise<PageResponse<UniversityResource>> {
  return isMockDataSource ? listUniversityResourcesMock(query) : httpNotConnected()
}
