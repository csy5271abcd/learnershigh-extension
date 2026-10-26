import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import {
  createResourceMock,
  getResourceMock,
  listRecommendedSourcesMock,
  listResourcesMock,
  updateResourceMock,
} from './mock/resourcesMock.ts'
import type {
  CreateResourceRequest,
  PageResponse,
  RecommendedSource,
  StudentResource,
  UpdateResourceRequest,
} from './types.ts'

// 자료함 화면이 호출하는 API (api-contract.md §22). Mock과 Stage 2 http는 같은 시그니처를 가진다.
// 노트에 자료 넣기(§23)는 Editor 결정(OD-A05) 뒤 §20 PUT 또는 §23 중 하나로 붙인다.

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §22 GET /api/student/assessment/resources/recommendations?subjectId=&query= */
export function listRecommendedSources(query: { subjectId: string; query?: string }): Promise<{ items: RecommendedSource[] }> {
  return isMockDataSource ? listRecommendedSourcesMock(query) : httpNotConnected()
}

/** §22 GET /api/student/assessment/resources?query=&type=&page=&size= */
export function listResources(query: { query?: string; type?: string; page: number; size: number }): Promise<PageResponse<StudentResource>> {
  return isMockDataSource ? listResourcesMock(query) : httpNotConnected()
}

/** §22 GET /api/student/assessment/resources/{resourceId} */
export function getResource(resourceId: string): Promise<StudentResource> {
  return isMockDataSource ? getResourceMock(resourceId) : httpNotConnected()
}

/** §22 POST /api/student/assessment/resources */
export function createResource(request: CreateResourceRequest): Promise<StudentResource> {
  return isMockDataSource ? createResourceMock(request) : httpNotConnected()
}

/** §22 PATCH /api/student/assessment/resources/{resourceId} */
export function updateResource(resourceId: string, request: UpdateResourceRequest): Promise<StudentResource> {
  return isMockDataSource ? updateResourceMock(resourceId, request) : httpNotConnected()
}
