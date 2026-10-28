import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import {
  createGrowthRecordMock,
  getGrowthRecordMock,
  listArchiveMock,
  listGrowthRecordsMock,
  setArchiveFavoriteMock,
  updateGrowthRecordMock,
} from './mock/growthArchiveMock.ts'
import type {
  ArchiveFavoriteRequest,
  ArchiveItem,
  ArchiveTab,
  CreateGrowthRecordRequest,
  GrowthRecord,
  PageResponse,
  UpdateGrowthRecordRequest,
} from './types.ts'

// 성장 기록(api-contract.md §29)·보관함(§30) 화면이 호출하는 API. Mock과 Stage 2 http는 같은 시그니처를 가진다.
// 보관함 복구(§30 POST restore)·영구 삭제는 정책 미정(API-OD-A08, OD-A11)이라 여기 두지 않는다.

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §29 GET /api/student/assessment/growth-records?academicYear=&query=&page=&size= */
export function listGrowthRecords(query: { academicYear?: number; query?: string; page: number; size: number }): Promise<PageResponse<GrowthRecord>> {
  return isMockDataSource ? listGrowthRecordsMock(query) : httpNotConnected()
}

/** §29 GET /api/student/assessment/growth-records/{recordId} */
export function getGrowthRecord(recordId: string): Promise<GrowthRecord> {
  return isMockDataSource ? getGrowthRecordMock(recordId) : httpNotConnected()
}

/** §29 POST /api/student/assessment/growth-records */
export function createGrowthRecord(request: CreateGrowthRecordRequest): Promise<GrowthRecord> {
  return isMockDataSource ? createGrowthRecordMock(request) : httpNotConnected()
}

/** §29 PATCH /api/student/assessment/growth-records/{recordId} */
export function updateGrowthRecord(recordId: string, request: UpdateGrowthRecordRequest): Promise<GrowthRecord> {
  return isMockDataSource ? updateGrowthRecordMock(recordId, request) : httpNotConnected()
}

/** §30 GET /api/student/assessment/archive?tab=&academicYear=&query=&page=&size= */
export function listArchive(query: { tab: ArchiveTab; academicYear?: number; query?: string; page: number; size: number }): Promise<PageResponse<ArchiveItem>> {
  return isMockDataSource ? listArchiveMock(query) : httpNotConnected()
}

/** §30 PUT /api/student/assessment/archive/favorites */
export function setArchiveFavorite(request: ArchiveFavoriteRequest): Promise<ArchiveFavoriteRequest> {
  return isMockDataSource ? setArchiveFavoriteMock(request) : httpNotConnected()
}
