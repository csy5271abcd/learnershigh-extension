import type {
  ChangeSchoolAssessmentStatusResponse,
  CreateSchoolAssessmentRequest,
  ListSchoolAssessmentsQuery,
  PageResponse,
  SchoolAssessment,
  SchoolAssessmentStatus,
  UpdateSchoolAssessmentRequest,
} from '../types.ts'
import { assessmentHttp } from './assessmentHttpClient.ts'

// §12·§13 학교 수행평가 HTTP Adapter. Backend 응답 Shape이 Type과 같아 변환하지 않는다.
const base = '/api/student/assessment/school-assessments'
const path = (assessmentId: string) => `${base}/${encodeURIComponent(assessmentId)}`

export function listSchoolAssessmentsHttp(query: ListSchoolAssessmentsQuery): Promise<PageResponse<SchoolAssessment>> {
  return assessmentHttp(base, {
    query: {
      academicYear: query.academicYear,
      semester: query.semester,
      subjectId: query.subjectId,
      status: query.status,
      query: query.query?.trim(),
      sort: query.sort,
      page: query.page,
      size: query.size,
    },
  })
}

export function getSchoolAssessmentHttp(assessmentId: string): Promise<SchoolAssessment> {
  return assessmentHttp(path(assessmentId))
}

export function createSchoolAssessmentHttp(request: CreateSchoolAssessmentRequest): Promise<SchoolAssessment> {
  return assessmentHttp(base, { method: 'POST', json: request })
}

export function updateSchoolAssessmentHttp(assessmentId: string, request: UpdateSchoolAssessmentRequest): Promise<SchoolAssessment> {
  return assessmentHttp(path(assessmentId), { method: 'PATCH', json: request })
}

export function changeSchoolAssessmentStatusHttp(
  assessmentId: string,
  status: SchoolAssessmentStatus,
): Promise<ChangeSchoolAssessmentStatusResponse> {
  return assessmentHttp(`${path(assessmentId)}/status`, { method: 'PATCH', json: { status } })
}
