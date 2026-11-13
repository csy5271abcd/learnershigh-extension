import { isMockDataSource } from './dataSource.ts'
import {
  changeSchoolAssessmentStatusHttp,
  createSchoolAssessmentHttp,
  getSchoolAssessmentHttp,
  listSchoolAssessmentsHttp,
  updateSchoolAssessmentHttp,
} from './http/schoolAssessmentHttp.ts'
import { guardWrite } from './viewMode.ts'
import {
  changeSchoolAssessmentStatusMock,
  createSchoolAssessmentMock,
  getSchoolAssessmentMock,
  listSchoolAssessmentsMock,
  updateSchoolAssessmentMock,
} from './mock/schoolAssessmentMock.ts'
import type {
  ChangeSchoolAssessmentStatusResponse,
  CreateSchoolAssessmentRequest,
  ListSchoolAssessmentsQuery,
  PageResponse,
  SchoolAssessment,
  SchoolAssessmentStatus,
  UpdateSchoolAssessmentRequest,
} from './types.ts'

// 화면이 호출하는 학교 수행평가 API (api-contract.md §12·13). Mock과 Stage 2 http는 같은 시그니처를 가진다.
// Stage 2 (2026-11-09): http 모드에서 실제 Backend로 연결됨. DELETE(Soft Delete 후보, OD-A11)는 Backend 미구현이라 함수가 없다.

/** §12 GET /api/student/assessment/school-assessments */
export function listSchoolAssessments(query: ListSchoolAssessmentsQuery): Promise<PageResponse<SchoolAssessment>> {
  return isMockDataSource ? listSchoolAssessmentsMock(query) : listSchoolAssessmentsHttp(query)
}

/** §12 GET /api/student/assessment/school-assessments/{assessmentId} */
export function getSchoolAssessment(assessmentId: string): Promise<SchoolAssessment> {
  return isMockDataSource ? getSchoolAssessmentMock(assessmentId) : getSchoolAssessmentHttp(assessmentId)
}

/** §12 POST /api/student/assessment/school-assessments (직접 등록) */
export function createSchoolAssessment(request: CreateSchoolAssessmentRequest): Promise<SchoolAssessment> {
  return guardWrite('createSchoolAssessment', () => (isMockDataSource ? createSchoolAssessmentMock(request) : createSchoolAssessmentHttp(request)))
}

/** §12 PATCH /api/student/assessment/school-assessments/{assessmentId} (제목·설명·마감일) */
export function updateSchoolAssessment(assessmentId: string, request: UpdateSchoolAssessmentRequest): Promise<SchoolAssessment> {
  return guardWrite('updateSchoolAssessment', () =>
    isMockDataSource ? updateSchoolAssessmentMock(assessmentId, request) : updateSchoolAssessmentHttp(assessmentId, request),
  )
}

/** §13 PATCH /api/student/assessment/school-assessments/{assessmentId}/status */
export function changeSchoolAssessmentStatus(
  assessmentId: string,
  status: SchoolAssessmentStatus,
): Promise<ChangeSchoolAssessmentStatusResponse> {
  return guardWrite('changeSchoolAssessmentStatus', () => (isMockDataSource ? changeSchoolAssessmentStatusMock(assessmentId, status) : changeSchoolAssessmentStatusHttp(assessmentId, status)))
}
