import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import {
  getEvaluationPlanAnalysisMock,
  listEvaluationPlansMock,
  requestEvaluationPlanAnalysisMock,
  savePersonalReviewMock,
  uploadEvaluationPlanMock,
} from './mock/evaluationPlansMock.ts'
import type {
  EvaluationPlan,
  EvaluationPlanAnalysis,
  EvaluationPlanUpload,
  PersonalReview,
  PersonalReviewRequest,
  UploadEvaluationPlanRequest,
} from './types.ts'

// 학교 평가계획서 화면이 호출하는 API (api-contract.md §10·§11). Mock과 Stage 2 http는 같은 시그니처를 가진다.
// Mock은 PDF를 저장·분석하지 않는다 (evaluationPlansMock.ts).

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §10-1 GET /api/student/assessment/evaluation-plans?schoolId=&academicYear=&grade=&semester= */
export function listEvaluationPlans(query: { schoolId: string; academicYear: number; grade: number; semester: number }): Promise<{ items: EvaluationPlan[] }> {
  return isMockDataSource ? listEvaluationPlansMock(query) : httpNotConnected()
}

/** §10-2 POST /api/student/assessment/evaluation-plans/uploads (multipart) */
export function uploadEvaluationPlan(request: UploadEvaluationPlanRequest): Promise<EvaluationPlanUpload> {
  return isMockDataSource ? uploadEvaluationPlanMock(request) : httpNotConnected()
}

/** §11 POST /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis */
export function requestEvaluationPlanAnalysis(documentRevisionId: string): Promise<EvaluationPlanAnalysis> {
  return isMockDataSource ? requestEvaluationPlanAnalysisMock(documentRevisionId) : httpNotConnected()
}

/** §11 GET /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis */
export function getEvaluationPlanAnalysis(documentRevisionId: string): Promise<EvaluationPlanAnalysis> {
  return isMockDataSource ? getEvaluationPlanAnalysisMock(documentRevisionId) : httpNotConnected()
}

/** §11 PUT /api/student/assessment/evaluation-plans/{documentRevisionId}/personal-review */
export function savePersonalReview(documentRevisionId: string, request: PersonalReviewRequest): Promise<PersonalReview> {
  return isMockDataSource ? savePersonalReviewMock(documentRevisionId, request) : httpNotConnected()
}
