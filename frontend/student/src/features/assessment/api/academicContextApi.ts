import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { createStudentSubjectMock, getAcademicContextMock, updateAcademicContextMock } from './mock/academicContextMock.ts'
import type { AcademicContext, AcademicTermQuery, CreateStudentSubjectRequest, SubjectRef, UpdateAcademicContextRequest } from './types.ts'

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

/**
 * 학생이 과목명을 직접 입력해 이 학기에 추가 (P-26 PROPOSED — 계약에 Endpoint 없음).
 * Mock에서만 동작하고 이 브라우저에 저장된다. Stage 2 서버 계약(생성 Endpoint·Write Owner)이 정해지기 전에는 http에서 "연결 전"이다.
 * 다른 학기에서 쓰던 기존 과목을 고를 때는 계약 범위인 updateAcademicContext(subjectIds)를 쓴다.
 */
export function createStudentSubject(request: CreateStudentSubjectRequest): Promise<SubjectRef> {
  return isMockDataSource ? createStudentSubjectMock(request) : httpNotConnected()
}
