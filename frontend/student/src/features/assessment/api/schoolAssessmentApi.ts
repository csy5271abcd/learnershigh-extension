import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import {
  changeSchoolAssessmentStatusMock,
  createSchoolAssessmentMock,
  getSchoolAssessmentMock,
  listSchoolAssessmentsMock,
} from './mock/schoolAssessmentMock.ts'
import type {
  ChangeSchoolAssessmentStatusResponse,
  CreateSchoolAssessmentRequest,
  ListSchoolAssessmentsQuery,
  PageResponse,
  SchoolAssessment,
  SchoolAssessmentStatus,
} from './types.ts'

// 화면이 호출하는 학교 수행평가 API (api-contract.md §12·13). Mock과 Stage 2 http는 같은 시그니처를 가진다.
// §12 PATCH(수정)·DELETE(Soft Delete 후보, OD-A11)는 이번 범위에서 구현하지 않는다.

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §12 GET /api/student/assessment/school-assessments */
export function listSchoolAssessments(query: ListSchoolAssessmentsQuery): Promise<PageResponse<SchoolAssessment>> {
  return isMockDataSource ? listSchoolAssessmentsMock(query) : httpNotConnected()
}

/** §12 GET /api/student/assessment/school-assessments/{assessmentId} */
export function getSchoolAssessment(assessmentId: string): Promise<SchoolAssessment> {
  return isMockDataSource ? getSchoolAssessmentMock(assessmentId) : httpNotConnected()
}

/** §12 POST /api/student/assessment/school-assessments (직접 등록) */
export function createSchoolAssessment(request: CreateSchoolAssessmentRequest): Promise<SchoolAssessment> {
  return isMockDataSource ? createSchoolAssessmentMock(request) : httpNotConnected()
}

/** §13 PATCH /api/student/assessment/school-assessments/{assessmentId}/status */
export function changeSchoolAssessmentStatus(
  assessmentId: string,
  status: SchoolAssessmentStatus,
): Promise<ChangeSchoolAssessmentStatusResponse> {
  return isMockDataSource ? changeSchoolAssessmentStatusMock(assessmentId, status) : httpNotConnected()
}
