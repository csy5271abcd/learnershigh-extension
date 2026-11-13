import { ApiError } from './apiError.ts'
import * as http from './http/recordsHttp.ts'
import { isMockDataSource } from './dataSource.ts'
import { guardWrite } from './viewMode.ts'
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


/** §29 GET /api/student/assessment/growth-records?academicYear=&query=&page=&size= */
export function listGrowthRecords(query: { academicYear?: number; query?: string; page: number; size: number }): Promise<PageResponse<GrowthRecord>> {
  return isMockDataSource ? listGrowthRecordsMock(query) : http.listGrowthRecordsHttp(query)
}

/** §29 GET /api/student/assessment/growth-records/{recordId} */
export function getGrowthRecord(recordId: string): Promise<GrowthRecord> {
  return isMockDataSource ? getGrowthRecordMock(recordId) : http.getGrowthRecordHttp(recordId)
}

/** §29 POST /api/student/assessment/growth-records */
export function createGrowthRecord(request: CreateGrowthRecordRequest): Promise<GrowthRecord> {
  return guardWrite('createGrowthRecord', () => (isMockDataSource ? createGrowthRecordMock(request) : http.createGrowthRecordHttp(request)))
}

/** §29 PATCH /api/student/assessment/growth-records/{recordId} */
export function updateGrowthRecord(recordId: string, request: UpdateGrowthRecordRequest): Promise<GrowthRecord> {
  return guardWrite('updateGrowthRecord', () => (isMockDataSource ? updateGrowthRecordMock(recordId, request) : http.updateGrowthRecordHttp(recordId, request)))
}

/** §30 GET /api/student/assessment/archive?tab=&academicYear=&query=&page=&size= */
export function listArchive(query: { tab: ArchiveTab; academicYear?: number; query?: string; page: number; size: number }): Promise<PageResponse<ArchiveItem>> {
  return isMockDataSource ? listArchiveMock(query) : http.listArchiveHttp(query)
}

/** §30 PUT /api/student/assessment/archive/favorites */
export function setArchiveFavorite(request: ArchiveFavoriteRequest): Promise<ArchiveFavoriteRequest> {
  return guardWrite('setArchiveFavorite', () => (isMockDataSource ? setArchiveFavoriteMock(request) : http.setArchiveFavoriteHttp(request)))
}

const notInMock = () => Promise.reject(new ApiError(503, { code: 'ASSESSMENT_API_NOT_CONNECTED', message: '휴지통은 시연(Mock) 데이터에서는 제공하지 않아요.', details: {} }))

/** 성장 기록 휴지통 이동 */
export function trashGrowthRecord(recordId: string): Promise<void> {
  return guardWrite('trashGrowthRecord', () => (isMockDataSource ? notInMock() : http.trashGrowthRecordHttp(recordId)))
}

/** §30 휴지통 복원 — 원래 자리로 (같은 ID·이력·파일) */
export function restoreArchiveItem(request: { sourceType: string; sourceId: string }): Promise<ArchiveItem> {
  return guardWrite('restoreArchiveItem', () => (isMockDataSource ? notInMock() : http.restoreArchiveItemHttp(request)))
}
