import { getCatalogContent, getMockExamContent, listCatalogContent, listMockExamContent } from '../content/enrichmentContent.ts'
import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { listUniversityResourcesMock } from './mock/enrichmentMock.ts'
import type {
  EnrichmentCatalogItem,
  MockExamMaterial,
  PageResponse,
  UniversityResource,
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

// A12 (2026-11-16 사용자 결정): 학생 자율 심화탐구는 준비된 콘텐츠 열람 전용이다. 개인 탐구 Task 생성·수정·상태 변경
// API(§18)와 개인 모의고사 자료(§17 my-mock-exam-materials) 함수는 화면에서 쓰지 않아 제거했다. 서버 기존 데이터는 지우지 않는다.

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
