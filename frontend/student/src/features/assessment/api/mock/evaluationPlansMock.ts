import type {
  EvaluationPlan,
  EvaluationPlanAnalysis,
  EvaluationPlanUpload,
  PersonalReview,
  PersonalReviewRequest,
  UploadEvaluationPlanRequest,
} from '../types.ts'
import { fixtureAnalysisResults, fixtureOtherSchoolPlan } from './evaluationPlansFixture.ts'
import { mockPdfPolicy } from '../../model/pdfImportPolicy.ts'
import { fail, mockNow, nextMockId, respond, scenarioActive } from './mockRuntime.ts'
import { mockStore } from './mockStore.ts'

// §10·§11 평가계획서 Mock. 실제 PDF를 저장·분석하지 않는다.
// - 개인 업로드: 파일 메타데이터만 기록한다 (파일 내용은 서버로 가지 않고 브라우저에만 있다).
// - 분석: 시연 Fixture가 있는 공통 문서만 결과를 돌려준다. 개인 업로드는 분석 엔진이 없어 503으로 끝난다.

/** Mock Store 내부 업로드 Record (응답 + 소유 Context·파일 메타데이터) */
export interface EvaluationPlanUploadRecord extends EvaluationPlanUpload {
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  fileName: string
  fileSize: number
  uploadedAt: string
}

/** Mock Store 내부 분석 Record. `pendingPolls`는 시연용 진행 횟수(조회 몇 번 뒤에 끝날지)다. */
export interface EvaluationPlanAnalysisRecord extends EvaluationPlanAnalysis {
  pendingPolls: number
}

const notFound = () => fail(404, { code: 'EVALUATION_PLAN_NOT_FOUND', message: '평가계획서를 찾을 수 없어요.', details: {} })

export function listEvaluationPlansMock(query: { schoolId: string; academicYear: number; grade: number; semester: number }): Promise<{ items: EvaluationPlan[] }> {
  return respond(() => {
    if (scenarioActive('evaluationPlanListError')) fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했어요.', details: {} })
    if (scenarioActive('evaluationPlanEmpty')) return { items: [] }
    const items = mockStore.evaluationPlans.filter(
      (plan) =>
        plan.schoolId === query.schoolId &&
        plan.academicYear === query.academicYear &&
        plan.grade === query.grade &&
        plan.semester === query.semester,
    )
    // 서버가 걸러야 할 다른 학교 문서가 섞였을 때 화면이 막는지 확인하는 시나리오
    return { items: scenarioActive('evaluationPlanOtherSchool') ? [...items, fixtureOtherSchoolPlan] : items }
  })
}

export function uploadEvaluationPlanMock(request: UploadEvaluationPlanRequest): Promise<EvaluationPlanUpload> {
  return respond(() => {
    if (scenarioActive('evaluationPlanUploadError')) fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류로 파일을 올리지 못했어요.', details: {} })
    const isPdf = request.file.type === 'application/pdf' && request.file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) fail(415, { code: 'UNSUPPORTED_FILE_TYPE', message: 'PDF 파일만 올릴 수 있어요.', details: {} })
    if (request.file.size === 0) fail(400, { code: 'VALIDATION_ERROR', message: '빈 파일이에요.', details: { fields: [{ field: 'file', reason: 'empty' }] } })
    if (request.file.size > mockPdfPolicy.maxBytes) fail(413, { code: 'FILE_TOO_LARGE', message: '파일이 너무 커요.', details: { maxBytes: mockPdfPolicy.maxBytes } })
    const record: EvaluationPlanUploadRecord = {
      uploadId: nextMockId('student_plan_upload'),
      documentRevisionId: nextMockId('private_rev'),
      fileRef: nextMockId('file'),
      visibility: 'PRIVATE',
      analysisStatus: 'NOT_REQUESTED',
      schoolId: request.schoolId,
      academicYear: request.academicYear,
      grade: request.grade,
      semester: request.semester,
      fileName: request.file.name,
      fileSize: request.file.size,
      uploadedAt: mockNow(),
    }
    mockStore.evaluationPlanUploads.push(record)
    const { schoolId: _schoolId, academicYear: _year, grade: _grade, semester: _semester, fileName: _name, fileSize: _size, uploadedAt: _at, ...response } = record
    return response
  })
}

function toAnalysisResponse(record: EvaluationPlanAnalysisRecord): EvaluationPlanAnalysis {
  const { pendingPolls: _pending, ...response } = record
  return structuredClone(response)
}

function documentExists(documentRevisionId: string) {
  return (
    mockStore.evaluationPlans.some((plan) => plan.documentRevisionId === documentRevisionId) ||
    mockStore.evaluationPlanUploads.some((upload) => upload.documentRevisionId === documentRevisionId)
  )
}

/** §11 POST. 같은 문서에 진행 중·완료된 분석이 있으면 새로 만들지 않고 그것을 돌려준다 (중복 요청 방지). */
export function requestEvaluationPlanAnalysisMock(documentRevisionId: string): Promise<EvaluationPlanAnalysis> {
  return respond(() => {
    if (!documentExists(documentRevisionId)) notFound()
    if (scenarioActive('analysisRequestError')) fail(503, { code: 'ASSESSMENT_AI_UNAVAILABLE', message: '분석 요청을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.', details: {} })
    if (mockStore.evaluationPlanUploads.some((upload) => upload.documentRevisionId === documentRevisionId)) {
      fail(503, {
        code: 'ASSESSMENT_AI_UNAVAILABLE',
        message: 'PDF 분석 엔진이 아직 연결되지 않아 내가 올린 PDF는 분석할 수 없어요.',
        details: { reason: 'MOCK_NO_ANALYSIS_ENGINE' },
      })
    }
    const existing = mockStore.evaluationPlanAnalyses.find((item) => item.documentRevisionId === documentRevisionId)
    if (existing && existing.status !== 'FAILED') return toAnalysisResponse(existing)
    const record: EvaluationPlanAnalysisRecord = {
      analysisId: nextMockId('analysis'),
      documentRevisionId,
      status: 'PROCESSING',
      startedAt: mockNow(),
      pendingPolls: scenarioActive('analysisSlow') ? 8 : 2,
    }
    mockStore.evaluationPlanAnalyses = [...mockStore.evaluationPlanAnalyses.filter((item) => item.documentRevisionId !== documentRevisionId), record]
    return toAnalysisResponse(record)
  })
}

/** §11 GET. 시연 진행 횟수가 끝나면 Fixture 결과로 바뀐다. Fixture가 없는 문서는 FAILED (빈 결과가 아니다). */
export function getEvaluationPlanAnalysisMock(documentRevisionId: string): Promise<EvaluationPlanAnalysis> {
  return respond(() => {
    if (scenarioActive('analysisLoadError')) fail(500, { code: 'INTERNAL_ERROR', message: '분석 상태를 불러오지 못했어요.', details: {} })
    const record = mockStore.evaluationPlanAnalyses.find((item) => item.documentRevisionId === documentRevisionId)
    if (!record) return { analysisId: '', documentRevisionId, status: 'NOT_REQUESTED', startedAt: '' }
    if (record.status === 'PROCESSING') {
      if (record.pendingPolls > 0) {
        record.pendingPolls -= 1
      } else {
        const result = fixtureAnalysisResults[documentRevisionId]
        if (!result || scenarioActive('analysisFailed')) {
          record.status = 'FAILED'
        } else if (scenarioActive('analysisNoResult')) {
          record.status = 'REVIEW_REQUIRED'
          record.subjects = []
        } else {
          record.status = result.status
          record.subjects = structuredClone(result.subjects)
        }
      }
    }
    return toAnalysisResponse(record)
  })
}

/** §11 PUT. 학생 개인 검토본만 바꾼다. 공통 문서·분석 결과(관리자 확인값 포함)는 그대로다. */
export function savePersonalReviewMock(documentRevisionId: string, request: PersonalReviewRequest): Promise<PersonalReview> {
  return respond(() => {
    if (scenarioActive('personalReviewError')) fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류로 정정 내용을 저장하지 못했어요.', details: {} })
    const analysis = mockStore.evaluationPlanAnalyses.find((item) => item.documentRevisionId === documentRevisionId)
    if (!analysis || analysis.analysisId !== request.analysisId) notFound()
    // 허용 경로 화이트리스트는 계약 미정. Mock은 수행평가 항목 이름만 받는다 (§11 예시, MM-47).
    const allowed = /^subjects\[\d+\]\.performanceEvaluation\.items\[\d+\]\.label$/
    const invalid = request.corrections.filter((correction) => !allowed.test(correction.fieldPath) || !correction.value.trim())
    if (invalid.length > 0) {
      fail(400, { code: 'VALIDATION_ERROR', message: '정정할 수 없는 항목이에요.', details: { fields: invalid.map((item) => ({ field: item.fieldPath, reason: 'not_allowed' })) } })
    }
    const review: PersonalReview = {
      documentRevisionId,
      analysisId: request.analysisId,
      corrections: request.corrections.map((correction) => ({ ...correction, value: correction.value.trim() })),
      savedAt: mockNow(),
    }
    mockStore.personalReviews = [...mockStore.personalReviews.filter((item) => item.documentRevisionId !== documentRevisionId), review]
    return structuredClone(review)
  })
}
