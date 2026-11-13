import { ApiError } from '../api/canonicalSource.ts'

// Admin Assessment AI 분석 Client (api-contract.md §47-A PROPOSED, P-31).
// Backend(/api/admin/assessment/ai)만 호출한다. API Key·원문을 브라우저에서 AI Provider로 직접 보내지 않는다.
// 이 기능은 Mock이 없다: 서버나 Provider가 연결되지 않으면 실패를 그대로 보여주고 가짜 결과를 만들지 않는다.

export interface AiField {
  found: boolean
  value: string
  pdfPage: number
  printedPage: string
  evidenceQuote: string
}

export interface EvaluationPlanResult {
  schoolName: AiField
  academicYear: AiField
  grade: AiField
  semester: AiField
  subjects: {
    subjectName: AiField
    writtenExamTotalRatio: AiField
    performanceTotalRatio: AiField
    writtenExams: { name: AiField; timing: AiField; ratio: AiField; maxScore: AiField }[]
    performanceAreas: { area: AiField; evaluationType: AiField; timing: AiField; ratio: AiField; maxScore: AiField; scoringCriteria: AiField[] }[]
    achievementStandards: { code: AiField; statement: AiField }[]
    units: AiField[]
    teachingMethods: AiField[]
    achievementLevels: AiField[]
  }[]
  unreadableNotes: string[]
}

export interface InquiryTopic {
  title: string
  reason: string
  methods: string[]
  extensionQuestions: string[]
}

export interface ExamQuestion {
  questionNumber: string
  title: string
  startPage: number
  endPage: number
  boundaryConfident: boolean
  intentPages: number[]
  basisPages: number[]
  evidenceQuote: string
  relatedConcepts: string[]
  thinkingSkills: string[]
  problemAnalysis: string
  inquiryTopics: InquiryTopic[]
  referenceCandidates: string[]
}

export interface UniversityExamResult {
  questions: ExamQuestion[]
  limitations: string[]
}

export interface MockExamTopic {
  title: string
  reason: string
  goal: string
  questions: string[]
  methods: string[]
  expectedOutput: string
  relatedSubjects: string[]
  extensionDirection: string
}

export interface MockExamResult {
  sufficient: boolean
  insufficientReason: string
  summary: string
  keyConcepts: string[]
  coreClaims: string[]
  academicFields: string[]
  materials: { material: string; curriculumLink: string; realWorldExtension: string }[]
  topics: MockExamTopic[]
}

export interface EvidenceCheck {
  path: string
  pdfPage: number
  verified: boolean
  reason: string | null
}

export interface AiAnalysis<T> {
  analysisId: string
  kind: 'EVALUATION_PLAN' | 'UNIVERSITY_EXAM' | 'MOCK_EXAM'
  /** 성공 응답은 항상 REVIEW_REQUIRED (관리자 확인 전 공개·확정 금지) */
  status: 'REVIEW_REQUIRED'
  provider: string
  model: string | null
  source: { fileName: string | null; sha256: string; pageCount: number; textPageCount: number; characterCount: number }
  result: T
  evidenceChecks: EvidenceCheck[]
  warnings: string[]
  createdAt: string
}

export interface AiProviderStatus {
  configured: boolean
  provider: string
  model: string | null
  ocrSupported: boolean
  maxPdfBytes: number
  maxPdfPages: number
}

const base = '/api/admin/assessment/ai'

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${base}${path}`, { ...init, headers: { Accept: 'application/json', ...(init.headers ?? {}) } })
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: 'Assessment 서버에 연결하지 못했어요. Backend 실행 여부를 확인해 주세요.' })
  }
  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!response.ok) {
    const error = (body ?? {}) as { code?: string; message?: string; details?: Record<string, unknown> }
    // Vite 개발 서버 Proxy가 Backend에 닿지 못하면 JSON이 아닌 5xx가 온다 → 서버 미연결로 구분한다
    if (!error.code) throw new ApiError(response.status, { code: 'SERVER_NOT_CONNECTED', message: 'Assessment 서버(Backend)가 응답하지 않아요. 서버가 실행 중인지 확인해 주세요.' })
    throw new ApiError(response.status, { code: error.code, message: error.message ?? '요청을 처리하지 못했어요.', details: error.details as never })
  }
  if (body === null) throw new ApiError(502, { code: 'SERVER_NOT_CONNECTED', message: 'Assessment 서버 응답을 읽지 못했어요.' })
  return body as T
}

/** 중복 클릭·재전송 시 같은 분석을 돌려받기 위한 Key. 사용자 동작(분석 시작) 한 번에 하나를 만든다 */
export const newIdempotencyKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k_${Date.now()}_${Math.random().toString(36).slice(2)}`)

export const getAiStatus = () => call<AiProviderStatus>('/status', { method: 'GET' })

function pdfForm(file: File, hint: string) {
  const form = new FormData()
  form.append('file', file)
  if (hint.trim()) form.append('hint', hint.trim())
  return form
}

export const analyzeEvaluationPlanPdf = (file: File, hint: string, idempotencyKey: string) =>
  call<AiAnalysis<EvaluationPlanResult>>('/evaluation-plan-analyses', { method: 'POST', body: pdfForm(file, hint), headers: { 'Idempotency-Key': idempotencyKey } })

export const analyzeUniversityExamPdf = (file: File, hint: string, idempotencyKey: string) =>
  call<AiAnalysis<UniversityExamResult>>('/university-exam-analyses', { method: 'POST', body: pdfForm(file, hint), headers: { 'Idempotency-Key': idempotencyKey } })

export interface MockExamAnalysisInput {
  subjectName: string
  academicYear: number | null
  examMonth: number | null
  grade: number | null
  questionNumber: string | null
  fieldHint: string | null
  passageText: string
  aiTransferConfirmed: boolean
}

export const analyzeMockExamPassage = (input: MockExamAnalysisInput, idempotencyKey: string) =>
  call<AiAnalysis<MockExamResult>>('/mock-exam-analyses', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
  })
