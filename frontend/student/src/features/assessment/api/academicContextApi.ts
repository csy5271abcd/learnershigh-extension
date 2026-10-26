import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { getAcademicContextMock, updateAcademicContextMock } from './mock/academicContextMock.ts'
import type { AcademicContext, AcademicTermQuery, UpdateAcademicContextRequest } from './types.ts'

// 화면이 호출하는 학업 정보 API (api-contract.md §9). Mock과 Stage 2 http는 같은 시그니처를 가진다.

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §9-1 GET /api/student/assessment/academic-context */
export function getAcademicContext(term?: AcademicTermQuery): Promise<AcademicContext> {
  return isMockDataSource ? getAcademicContextMock(term) : httpNotConnected()
}

/** §9-2 PUT /api/student/assessment/academic-context */
export function updateAcademicContext(request: UpdateAcademicContextRequest): Promise<void> {
  return isMockDataSource ? updateAcademicContextMock(request) : httpNotConnected()
}
