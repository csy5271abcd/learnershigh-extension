import { ApiError } from './apiError.ts'
import { recommendedSourcesForSubject } from '../content/enrichmentContent.ts'
import * as http from './http/recordsHttp.ts'
import { isMockDataSource } from './dataSource.ts'
import { guardWrite } from './viewMode.ts'
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

/**
 * 과목별 추천 자료원. Mock은 기존 Mock Adapter, http는 서버 API(§22 recommendations, 미구현) 대신
 * 검토된 정적 카탈로그를 쓴다(과목 이름 정규화). 정적 자료를 DB에 복사하지 않는다.
 */
export function listRecommendedSources(query: { subjectId: string; subjectName?: string | null; query?: string }): Promise<{ items: RecommendedSource[]; basis?: 'subject' | 'general' | 'none'; areaLabel?: string | null }> {
  return isMockDataSource ? listRecommendedSourcesMock(query) : Promise.resolve(recommendedSourcesForSubject(query.subjectName, query.query))
}

/** §22 GET /api/student/assessment/resources?query=&type=&page=&size= */
export function listResources(query: { query?: string; type?: string; page: number; size: number }): Promise<PageResponse<StudentResource>> {
  return isMockDataSource ? listResourcesMock(query) : http.listResourcesHttp(query)
}

/** §22 GET /api/student/assessment/resources/{resourceId} */
export function getResource(resourceId: string): Promise<StudentResource> {
  return isMockDataSource ? getResourceMock(resourceId) : http.getResourceHttp(resourceId)
}

/** §22 POST /api/student/assessment/resources */
export function createResource(request: CreateResourceRequest): Promise<StudentResource> {
  return guardWrite('createResource', () => (isMockDataSource ? createResourceMock(request) : http.createResourceHttp(request)))
}

/** §22 PATCH /api/student/assessment/resources/{resourceId} */
export function updateResource(resourceId: string, request: UpdateResourceRequest): Promise<StudentResource> {
  return guardWrite('updateResource', () => (isMockDataSource ? updateResourceMock(resourceId, request) : http.updateResourceHttp(resourceId, request)))
}

/** 관리자가 공개한 참고자료 (2026-11-11 계약 추가, 읽기 전용). Mock에는 공개 자료가 없다. */
export function listSharedResources(): Promise<{ items: http.SharedResource[] }> {
  return isMockDataSource ? Promise.resolve({ items: [] }) : http.listSharedResourcesHttp()
}

const noMockFile = () =>
  Promise.reject(new ApiError(503, { code: 'ASSESSMENT_API_NOT_CONNECTED', message: '시연(Mock) 데이터에서는 파일을 올리거나 열 수 없어요.', details: {} }))

/** A27-UX §22-1 DRAFT 자료 파일 첨부(교체). 형식·크기는 서버가 다시 검사한다 */
export function attachResourceFile(resourceId: string, file: File): Promise<StudentResource> {
  return guardWrite('attachResourceFile', () => (isMockDataSource ? noMockFile() : http.attachResourceFileHttp(resourceId, file)))
}
export function detachResourceFile(resourceId: string): Promise<StudentResource> {
  return guardWrite('detachResourceFile', () => (isMockDataSource ? noMockFile() : http.detachResourceFileHttp(resourceId)))
}
export function downloadResourceFile(resourceId: string): Promise<Blob> {
  return isMockDataSource ? noMockFile() : http.downloadResourceFileHttp(resourceId)
}
export function previewResourceFile(resourceId: string): Promise<Blob> {
  return isMockDataSource ? noMockFile() : http.previewResourceFileHttp(resourceId)
}

/** 자료 휴지통 이동 (소프트 삭제) */
export function trashResource(resourceId: string): Promise<void> {
  return guardWrite('trashResource', () =>
    isMockDataSource
      ? Promise.reject(new ApiError(503, { code: 'ASSESSMENT_API_NOT_CONNECTED', message: '휴지통은 시연(Mock) 데이터에서는 제공하지 않아요.', details: {} }))
      : http.trashResourceHttp(resourceId),
  )
}
