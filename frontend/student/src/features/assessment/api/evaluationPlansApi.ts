import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { downloadEvaluationPlanFileHttp, getEvaluationPlanHttp, listEvaluationPlansHttp, previewEvaluationPlanFileHttp } from './http/evaluationPlansHttp.ts'
import { guardWrite } from './viewMode.ts'
import {
  getEvaluationPlanAnalysisMock,
  getEvaluationPlanMock,
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
// Stage 2 (2026-11-09): §10-1 목록·상세만 http 연결. §10-2 개인 업로드·§11 분석·개인 검토는 Backend 미구현이라 http에서 "연결 전".

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/** §10-1 GET /api/student/assessment/evaluation-plans?schoolId=&academicYear=&grade=&semester= */
export function listEvaluationPlans(query: { schoolId: string; academicYear: number; grade: number; semester: number }): Promise<{ items: EvaluationPlan[] }> {
  return isMockDataSource ? listEvaluationPlansMock(query) : listEvaluationPlansHttp(query)
}

/** §10-1 GET /api/student/assessment/evaluation-plans/{planId} */
export function getEvaluationPlan(planId: string): Promise<EvaluationPlan> {
  return isMockDataSource ? getEvaluationPlanMock(planId) : getEvaluationPlanHttp(planId)
}

function noMockFile(): Promise<never> {
  return Promise.reject(new ApiError(404, { code: 'NOT_FOUND', message: '시연 데이터에는 실제 원문 파일이 없어요.', details: {} }))
}

/** S-4 GET .../evaluation-plans/{planId}/preview — 확정된 문서 원문 미리보기(PDF만). Mock에는 실제 파일이 없다 */
export function previewEvaluationPlanFile(planId: string): Promise<Blob> {
  return isMockDataSource ? noMockFile() : previewEvaluationPlanFileHttp(planId)
}

/** S-4 GET .../evaluation-plans/{planId}/file — 확정된 문서 원문 내려받기(형식 그대로) */
export function downloadEvaluationPlanFile(planId: string): Promise<Blob> {
  return isMockDataSource ? noMockFile() : downloadEvaluationPlanFileHttp(planId)
}

/** §10-2 POST /api/student/assessment/evaluation-plans/uploads (multipart) */
export function uploadEvaluationPlan(request: UploadEvaluationPlanRequest): Promise<EvaluationPlanUpload> {
  return guardWrite('uploadEvaluationPlan', () => (isMockDataSource ? uploadEvaluationPlanMock(request) : httpNotConnected()))
}

/**
 * §11 POST /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis
 * 읽기 전용 보기(P-28)에서도 막지 않는다: 학교 공통 평가계획서의 분석 Job이라 학생 기록을 바꾸지 않고, 수행평가 상세의 평가 기준 조회에 필요하다.
 * 학생이 직접 올린 PDF는 uploadEvaluationPlan이 막히므로 읽기 전용 보기에는 존재하지 않는다.
 */
export function requestEvaluationPlanAnalysis(documentRevisionId: string): Promise<EvaluationPlanAnalysis> {
  return isMockDataSource ? requestEvaluationPlanAnalysisMock(documentRevisionId) : httpNotConnected()
}

/** §11 GET /api/student/assessment/evaluation-plans/{documentRevisionId}/analysis */
export function getEvaluationPlanAnalysis(documentRevisionId: string): Promise<EvaluationPlanAnalysis> {
  return isMockDataSource ? getEvaluationPlanAnalysisMock(documentRevisionId) : httpNotConnected()
}

/** §11 PUT /api/student/assessment/evaluation-plans/{documentRevisionId}/personal-review */
export function savePersonalReview(documentRevisionId: string, request: PersonalReviewRequest): Promise<PersonalReview> {
  return guardWrite('savePersonalReview', () => (isMockDataSource ? savePersonalReviewMock(documentRevisionId, request) : httpNotConnected()))
}
