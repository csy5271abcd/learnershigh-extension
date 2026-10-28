import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import {
  changeEnrichmentTaskStatusMock,
  createEnrichmentTaskMock,
  createPersonalMockExamMaterialMock,
  getCatalogItemMock,
  getEnrichmentTaskMock,
  getMockExamMaterialMock,
  listCatalogMock,
  listEnrichmentTasksMock,
  listMockExamMaterialsMock,
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

// 심화 탐구 화면이 호출하는 API (api-contract.md §16·17·18·27). Mock과 Stage 2 http는 같은 시그니처를 가진다.

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
  return isMockDataSource ? listCatalogMock(query) : httpNotConnected()
}

/** §16 GET /api/student/assessment/enrichment/catalog/{catalogTaskId} */
export function getCatalogItem(catalogTaskId: string): Promise<EnrichmentCatalogItem> {
  return isMockDataSource ? getCatalogItemMock(catalogTaskId) : httpNotConnected()
}

/** §18 GET /api/student/assessment/enrichment/tasks?status=&page=&size= */
export function listEnrichmentTasks(query: {
  status?: EnrichmentTaskStatus
  page: number
  size: number
}): Promise<PageResponse<EnrichmentTask>> {
  return isMockDataSource ? listEnrichmentTasksMock(query) : httpNotConnected()
}

/** §18 GET /api/student/assessment/enrichment/tasks/{taskId} */
export function getEnrichmentTask(taskId: string): Promise<EnrichmentTask> {
  return isMockDataSource ? getEnrichmentTaskMock(taskId) : httpNotConnected()
}

/** §18 POST /api/student/assessment/enrichment/tasks (공개 콘텐츠에서 시작하거나 직접 생성) */
export function createEnrichmentTask(request: CreateEnrichmentTaskRequest): Promise<EnrichmentTask> {
  return isMockDataSource ? createEnrichmentTaskMock(request) : httpNotConnected()
}

/** §18 PATCH /api/student/assessment/enrichment/tasks/{taskId} */
export function updateEnrichmentTask(taskId: string, request: UpdateEnrichmentTaskRequest): Promise<EnrichmentTask> {
  return isMockDataSource ? updateEnrichmentTaskMock(taskId, request) : httpNotConnected()
}

/** §18 PATCH /api/student/assessment/enrichment/tasks/{taskId}/status */
export function changeEnrichmentTaskStatus(
  taskId: string,
  status: EnrichmentTaskStatus,
): Promise<ChangeEnrichmentTaskStatusResponse> {
  return isMockDataSource ? changeEnrichmentTaskStatusMock(taskId, status) : httpNotConnected()
}

/** §17 GET /api/student/assessment/mock-exam-materials?subjectId=&query=&page=&size= */
export function listMockExamMaterials(query: {
  subjectId?: string
  query?: string
  page: number
  size: number
}): Promise<PageResponse<MockExamMaterial>> {
  return isMockDataSource ? listMockExamMaterialsMock(query) : httpNotConnected()
}

/** §17 GET /api/student/assessment/mock-exam-materials/{materialId} */
export function getMockExamMaterial(materialId: string): Promise<MockExamMaterial> {
  return isMockDataSource ? getMockExamMaterialMock(materialId) : httpNotConnected()
}

/** §17 GET /api/student/assessment/my-mock-exam-materials */
export function listPersonalMockExamMaterials(): Promise<PageResponse<PersonalMockExamMaterial>> {
  return isMockDataSource ? listPersonalMockExamMaterialsMock() : httpNotConnected()
}

/** §17 POST /api/student/assessment/my-mock-exam-materials */
export function createPersonalMockExamMaterial(
  request: CreatePersonalMockExamMaterialRequest,
): Promise<PersonalMockExamMaterial> {
  return isMockDataSource ? createPersonalMockExamMaterialMock(request) : httpNotConnected()
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
