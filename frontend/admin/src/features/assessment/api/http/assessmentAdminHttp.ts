import type {
  AdminEvaluationPlan,
  AdminEvaluationPlanRevision,
  AdminSchool,
  PlanStructurePreview,
  PlanReviewHistory,
  TeachingPlanHistory,
  ArchiveSubject,
  PlanArchiveDetail,
  PlanSubjects,
  TeachingPlanIssue,
  TeachingPlanReviewRequest,
  TeachingPlanManualRowRequest,
  TeachingPlanReviewView,
  TeachingPlanRowCandidate,
  AnalysisSubject,
  EvaluationPlanAnalysisView,
  PlanAnalysisStatus,
  PlanReviewConfirmRequest,
  PlanReviewStatus,
  ReviewFieldCandidate,
  SchoolAssessment,
  PlanSourceReview,
  PlanFileMeta,
  PlanReviewDraftSaveRequest,
  PlanReviewDraftView,
  SchoolSearchResult,
} from '../types.ts'
import { ApiError } from '../canonicalSource.ts'
import { adminFile, adminHttp, notConnected } from './adminHttpClient.ts'
import { currentTermAsync } from './adminRecordsHttp.ts'

// Admin Assessment HTTP Adapter (Stage 2, 2026-11-09). 화면 함수 시그니처는 Mock과 같고, Backend 응답 Shape 차이는 여기서만 변환한다.
// 실제 Backend Endpoint가 없는 기능은 호출하지 않고 이유를 담은 503 ASSESSMENT_API_NOT_CONNECTED로 끝낸다.

// ---- §34 학생별 학교 수행평가 ----

interface PageBody<T> {
  items: T[]
  page: { number: number; size: number; totalElements: number; totalPages: number }
}

/** 한 학기 전체를 한 번에 본다(Backend size 상한 100). 넘으면 첫 100건만이라 totalElements로 알린다. */
export async function listStudentSchoolAssessmentsHttp(
  studentId: string,
  term: { academicYear: number; semester: number },
): Promise<{ items: SchoolAssessment[]; totalElements?: number }> {
  const body = await adminHttp<PageBody<SchoolAssessment>>(
    `/api/admin/assessment/students/${encodeURIComponent(studentId)}/school-assessments`,
    { query: { academicYear: term.academicYear, semester: term.semester, page: 0, size: 100 } },
  )
  return { items: body.items, totalElements: body.page.totalElements }
}

// ---- §38 학교별 평가계획서 ----

interface BackendConfirmedField {
  subjectId: string
  fieldPath: string
  value: unknown
  pdfPageNumber: number | null
  analysisSubjectIndex?: number
  documentLocator?: BackendDocumentLocator
  absence?: string
}

interface BackendRevision {
  documentRevisionId: string
  revisionNumber: number
  fileName: string
  fileRef: string | null
  file?: PlanFileMeta | null
  sizeBytes: number | null
  pageCount: number | null
  sourceUrl: string | null
  uploadedAt: string
  analysisStatus: PlanAnalysisStatus
  reviewStatus: PlanReviewStatus
  confirmedFields: BackendConfirmedField[]
  checksum?: string | null
  documentFormat?: 'PDF' | 'HWP' | 'HWPX'
}

interface BackendPlan {
  planId: string
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  revisions: BackendRevision[]
}

/** 확정값 표시 값. 화면 Type은 문자·숫자·null만 받으므로 배열·객체는 JSON 문자열로 보여준다(값을 바꾸지 않는다). */
function displayValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  return JSON.stringify(value)
}

/**
 * C-7: 계약·Backend는 subjectId, Admin 화면 Type은 subjectName. 과목 이름 원천(§34)이 아직 없어 이름을 지어내지 않고
 * subjectName 칸에 subjectId를 그대로 넣는다(subjectId도 함께 보존).
 */
function toConfirmed(fields: BackendConfirmedField[]): AdminEvaluationPlanRevision['confirmedFields'] {
  return fields.map((field) => ({
    subjectName: field.subjectId,
    subjectId: field.subjectId,
    fieldPath: field.fieldPath,
    value: displayValue(field.value),
    pdfPageNumber: field.pdfPageNumber,
    documentLocatorText: field.documentLocator ? describeLocator({ extractedText: null, documentLocator: field.documentLocator }) : null,
  }))
}

function toRevision(revision: BackendRevision): AdminEvaluationPlanRevision {
  return {
    documentRevisionId: revision.documentRevisionId,
    revisionNumber: revision.revisionNumber,
    fileName: revision.fileName,
    fileRef: revision.fileRef, // 불투명 참조. 원문 미보관 이전 등록분은 null
    file: revision.file ?? null,
    sizeBytes: revision.sizeBytes,
    pageCount: revision.pageCount,
    sourceUrl: revision.sourceUrl,
    uploadedAt: revision.uploadedAt,
    analysisStatus: revision.analysisStatus,
    reviewStatus: revision.reviewStatus,
    confirmedFields: toConfirmed(revision.confirmedFields),
    checksum: revision.checksum ?? null,
    documentFormat: revision.documentFormat ?? 'PDF',
  }
}

function toPlan(plan: BackendPlan): AdminEvaluationPlan {
  return { ...plan, revisions: plan.revisions.map(toRevision) }
}

const plansPath = '/api/admin/assessment/evaluation-plans'

/**
 * 관리자 담당 학교 목록 Endpoint가 계약·Backend에 없다(학교 원천 API-OD-A01, 운영 권한 OD-A08).
 * 개발 서버에서만 VITE_ASSESSMENT_DEV_PLAN_SCHOOLS("school_001:예시고등학교,…")로 학교를 정하고, 문서 수는 실제 서버에서 센다.
 * 설정이 없거나 Production이면 연결 전 오류로 끝낸다.
 */
// 학교 목록 (2026-11-12 시연 수정):
// - 개발 설정 운영 학교(VITE_ASSESSMENT_DEV_PLAN_SCHOOLS) ∪ 개발 서버에서는 지점 권한으로 조회한 담당 학생의 학교(Mock listSchoolsMock과 같은 규칙).
// - 학교마다 평가계획서 목록을 읽어 공식 운영 권한을 구분한다. 403 FORBIDDEN은 "운영 권한 없음"(planOperable=false)으로 표시하고
//   목록 전체를 실패시키지 않는다. 운영 권한(OD-A08)은 넓히지 않는다 — 서버가 계속 학교별로 검사한다.
export async function listSchoolsHttp(): Promise<{ items: (AdminSchool & { region: string | null; documentCount: number | null; planOperable?: boolean; studentCount?: number })[] }> {
  // A13: 관리자 담당 학생의 학교(§33-1 managed-schools, 서버가 지점 범위에서 학교 ID로 중복 제거). 전체 학교 Master가 아니다.
  // 평가계획서 운영 권한(OD-A08)은 모든 학교라 등록 문서가 있는 다른 학교는 화면이 따로 보여 준다(권한을 줄이지 않는다).
  const raw: unknown = import.meta.env.DEV ? import.meta.env.VITE_ASSESSMENT_DEV_PLAN_SCHOOLS : undefined
  const configured = typeof raw === 'string' ? raw.split(',').map((entry) => entry.trim()).filter(Boolean) : []
  const schools = new Map<string, string>()
  const studentSchools = new Map<string, number>()
  const term = await currentTermAsync()
  const managed = await adminHttp<{ items: { schoolId: string; name: string | null; studentCount: number }[] }>('/api/admin/assessment/managed-schools', {
    query: { academicYear: term.academicYear, semester: term.semester },
  })
  for (const school of managed.items) {
    schools.set(school.schoolId, school.name ?? school.schoolId)
    studentSchools.set(school.schoolId, school.studentCount)
  }
  for (const entry of configured) {
    const [schoolId, name] = entry.split(':')
    if (!schools.has(schoolId)) schools.set(schoolId, name || schoolId)
  }
  const items = await Promise.all(
    [...schools].map(async ([schoolId, name]) => {
      try {
        const plans = await adminHttp<{ items: BackendPlan[] }>(plansPath, { query: { schoolId } })
        return { schoolId, name, region: null, documentCount: plans.items.length, planOperable: true, studentCount: studentSchools.get(schoolId) }
      } catch (error) {
        // 설정에만 있고 담당 학생의 학교도 아닌 학교는 운영 권한이 없으면 목록에서 뺀다
        if (error instanceof ApiError && error.code === 'FORBIDDEN') return studentSchools.has(schoolId) ? { schoolId, name, region: null, documentCount: null, planOperable: false, studentCount: studentSchools.get(schoolId) } : null
        throw error
      }
    }),
  ).then((list) => list.filter((item) => item !== null))
  // 담당 학생 학교를 먼저(학생 많은 순), 운영 권한이 있는 학교를 먼저, 그다음 이름순
  items.sort((a, b) => Number(Boolean(b.studentCount)) - Number(Boolean(a.studentCount)) || (b.studentCount ?? 0) - (a.studentCount ?? 0) || Number(b.planOperable) - Number(a.planOperable) || a.name.localeCompare(b.name, 'ko'))
  return { items }
}

/** 실제 등록된 문서의 학년도 + 서버 현재 학기(부록 O §9-2)의 학년도. */
/** includeCurrentTerm=false(A9 학년도별 열람): 실제 등록 문서가 있는 학년도만 */
export async function listPlanYearsHttp(schoolId: string, includeCurrentTerm = true): Promise<number[]> {
  const plans = await adminHttp<{ items: BackendPlan[] }>(plansPath, { query: { schoolId } })
  const years = new Set(plans.items.map((plan) => plan.academicYear))
  if (!includeCurrentTerm) return [...years].sort((a, b) => b - a)
  years.add((await currentTermAsync()).academicYear)
  return [...years].sort((a, b) => b - a)
}

export async function listEvaluationPlansHttp(query: { schoolId: string; academicYear: number }): Promise<{ items: AdminEvaluationPlan[] }> {
  const body = await adminHttp<{ items: BackendPlan[] }>(plansPath, { query })
  return { items: body.items.map(toPlan) }
}

export async function getPlan(planId: string): Promise<AdminEvaluationPlan> {
  return toPlan(await adminHttp<BackendPlan>(`${plansPath}/${encodeURIComponent(planId)}`))
}

/** §38 POST (multipart). 응답은 등록 요약이라 같은 문서를 다시 읽어 화면 Shape(개정 이력 포함)으로 돌려준다. */
export async function uploadEvaluationPlanHttp(request: {
  file: File
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  sourceUrl: string | null
}): Promise<AdminEvaluationPlan> {
  const form = new FormData()
  form.append('file', request.file)
  form.append('schoolId', request.schoolId)
  form.append('academicYear', String(request.academicYear))
  form.append('grade', String(request.grade))
  form.append('semester', String(request.semester))
  if (request.sourceUrl) form.append('sourceUrl', request.sourceUrl)
  const created = await adminHttp<{ planId: string }>(plansPath, { method: 'POST', form })
  return getPlan(created.planId)
}

export async function addPlanRevisionHttp(planId: string, request: { file: File; sourceUrl: string | null }): Promise<AdminEvaluationPlan> {
  const form = new FormData()
  form.append('file', request.file)
  if (request.sourceUrl) form.append('sourceUrl', request.sourceUrl)
  await adminHttp(`${plansPath}/${encodeURIComponent(planId)}/revisions`, { method: 'POST', form })
  return getPlan(planId)
}

/** §39 POST 서버 분석 실행: Backend 미구현(원본 PDF 미보관, File Storage API-OD-A03). 호출하지 않는다. */
/**
 * §39 POST .../analysis (A3, 2026-11-13): Backend가 보관한 원문을 분석기로 보내 결과를 저장한다(브라우저·개발 Proxy를 거치지 않음).
 * 분석은 최대 약 2분 걸릴 수 있다. 응답을 그대로 쓰지 않고 문서를 다시 읽어 서버에 저장된 상태를 돌려준다.
 * 오류(분석기 미설정·연결 실패·BUSY·Timeout·부분 결과·HWP/HWPX 계약 대기·응답 오류)는 서버 Error Body 그대로 던진다.
 */
export async function requestPlanAnalysisHttp(planId: string, revisionId: string): Promise<AdminEvaluationPlanRevision> {
  await adminHttp<unknown>(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/analysis`, { method: 'POST' })
  const plan = await getPlan(planId)
  const revision = plan.revisions.find((item) => item.documentRevisionId === revisionId)
  if (!revision) throw new ApiError(404, { code: 'NOT_FOUND', message: '분석한 개정본을 다시 찾지 못했어요.', details: {} })
  return revision
}

/**
 * 외부 분석 결과 수신 (PROPOSED, api-contract.md 미등록 C-10 — Backend `assessment.analysis-import.enabled=true`일 때만 존재).
 * 로컬 분석기가 돌려준 `backendImport.payload`(AnalysisImportRequest)를 **그대로** 보낸다. 응답 봉투·원문 전체는 보내지 않는다.
 * Backend가 Revision SHA-256·쪽 수와 대조하고, 후보로만 저장한다(검토 상태 변경 없음). 같은 내용 재전송은 기존 결과(200).
 */
export function importPlanAnalysisHttp(planId: string, revisionId: string, payload: unknown): Promise<unknown> {
  return adminHttp(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/analysis-imports`, { method: 'POST', json: payload })
}

// ---- §39 분석 후보 조회 ----

interface BackendDocumentLocator {
  kind: string
  section: number
  path: string
  table?: number | null
  row?: number | null
  col?: number | null
  control?: string | null
  cell?: string | null
  rowSpan?: number | null
  colSpan?: number | null
}

/** PDF는 pdfPageNumber, HWP·HWPX(실험)는 documentLocator만 있다 */
interface BackendLocator {
  pdfPageNumber?: number | null
  printedPageLabel?: string | null
  extractedText: string | null
  documentLocator?: BackendDocumentLocator | null
}

/** HWP·HWPX 위치를 사람이 원본에서 찾을 수 있는 문장으로 (쪽 번호로 바꾸지 않는다) */
function describeLocator(source: BackendLocator): string | null {
  const at = source.documentLocator
  if (!at) return null
  const parts = [`구역 ${at.section}`]
  if (at.table !== undefined && at.table !== null) parts.push(`표 ${at.table}`)
  if (at.row !== undefined && at.row !== null && at.col !== undefined && at.col !== null) parts.push(`${at.row + 1}행 ${at.col + 1}열`)
  if (at.control) parts.push(`${at.control}${at.cell === 'UNAVAILABLE' ? '(칸 위치 모름)' : ''}`)
  parts.push(`경로 ${at.path}`)
  return `${parts.join(' · ')}${source.extractedText ? ` — "${source.extractedText.slice(0, 40)}"` : ''}`
}

interface BackendRubric {
  element: string
  levels: { description: string; score: number | null }[] | null
  sources?: BackendLocator[] | null
  /** A15 0.3 선택 확장(§39-12): 요소 배점(원문에 있을 때만) · 채점표 연결 사람 확인 */
  maxScore?: number | null
  linkReview?: 'REVIEW_REQUIRED' | null
}

interface BackendSubject {
  subjectName: string
  pageRange?: { from: number; to: number } | null
  sources: BackendLocator[] | null
  writtenEvaluation: {
    weightPercent: number | null
    sources?: BackendLocator[] | null
    exams: {
      itemKey: string
      round: number
      weightPercent: number | null
      maxScore?: number | null
      timing?: string | null
      questionTypes: string[] | null
      sources?: BackendLocator[] | null
    }[] | null
  } | null
  performanceEvaluation: {
    weightPercent: number | null
    sources?: BackendLocator[] | null
    items: {
      itemKey: string
      label: string
      content?: string | null
      submissions?: string[] | null
      conditions?: string[] | null
      weightPercent: number | null
      maxScore: number | null
      timing: string | null
      rubric: BackendRubric[] | null
      sources: BackendLocator[] | null
    }[] | null
  } | null
  /** 0.3 DRAFT (§39-3) — 0.2 결과에는 없다 */
  extraction?: { status: 'COMPLETE' | 'PARTIAL' | 'MISSING_SECTION'; issues?: TeachingPlanIssue[] | null } | null
  teachingPlan?: TeachingPlanRowCandidate[] | null
  /** A15 0.3 선택 확장(§39-12): 원문 근거가 있는 학년만 */
  grades?: number[] | null
}

interface BackendAnalysis {
  planId: string
  documentRevisionId: string
  analysisId: string | null
  analysisStatus: PlanAnalysisStatus
  reviewStatus: PlanReviewStatus
  analyzer: { origin: string; name: string; version: string; contractVersion?: string; profile?: string } | null
  receivedAt: string | null
  subjects: BackendSubject[] | null
  warnings: { source: string; message: string }[] | null
  confirmedFields: BackendConfirmedField[]
  review?: { analysisId: string; reviewedBy: string; reviewedAt: string; sourceReview?: PlanSourceReview } | null
}

function locators(list: BackendLocator[] | null | undefined) {
  // 화면 AnalysisSource는 PDF 쪽 근거만 담는다. HWP·HWPX 위치는 reviewFields.sourceLocators로 따로 보여준다.
  return (list ?? []).filter((source): source is BackendLocator & { pdfPageNumber: number } => typeof source.pdfPageNumber === 'number').map((source) => ({
    pdfPageNumber: source.pdfPageNumber,
    printedPageLabel: source.printedPageLabel ?? null,
    extractedText: source.extractedText ?? '',
  }))
}

/** 수신 Shape → 화면 AnalysisSubject. 값은 그대로 옮기고, 화면 Type에 없는 정보(채점 수준 문장)는 요소 이름 옆에 붙인다. */
function toSubject(subject: BackendSubject): AnalysisSubject {
  const items = subject.performanceEvaluation?.items ?? []
  return {
    subjectName: subject.subjectName,
    extractionFailed: false,
    writtenEvaluation: subject.writtenEvaluation
      ? {
          weightPercent: subject.writtenEvaluation.weightPercent,
          exams: (subject.writtenEvaluation.exams ?? []).map((exam) => ({
            round: exam.round,
            weightPercent: exam.weightPercent,
            questionTypes: exam.questionTypes ?? [],
          })),
        }
      : null,
    performanceEvaluation: subject.performanceEvaluation
      ? {
          weightPercent: subject.performanceEvaluation.weightPercent,
          items: items.map((item) => ({
            itemKey: item.itemKey,
            label: item.label,
            weightPercent: item.weightPercent,
            maxScore: item.maxScore,
            timing: item.timing,
            rubric: (item.rubric ?? []).map((criterion) => {
              const levels = (criterion.levels ?? []).map((level) => (level.score === null ? level.description : `${level.description} ${level.score}`))
              return levels.length ? `${criterion.element}(${levels.join(' / ')})` : criterion.element
            }),
            sourcePdfPageNumber: item.sources?.find((source) => typeof source.pdfPageNumber === 'number')?.pdfPageNumber ?? null,
          })),
        }
      : null,
    // 수신 계약에 성취기준·교수학습계획이 없다(B-5). 빈 배열은 "원문에 없음"이 아니다.
    achievement: { standards: [], levels: [], thresholds: [] },
    teachingPlan: [],
    sources: [...locators(subject.sources), ...items.flatMap((item) => locators(item.sources))],
  }
}

const pagesOf = (list: BackendLocator[] | null | undefined) =>
  [...new Set((list ?? []).map((source) => source.pdfPageNumber).filter((page): page is number => typeof page === 'number'))].sort((a, b) => a - b)
const locatorsOf = (list: BackendLocator[] | null | undefined) =>
  (list ?? []).filter((source) => source.documentLocator).map(describeLocator).filter((text): text is string => text !== null)
const documentLocatorsOf = (list: BackendLocator[] | null | undefined) =>
  (list ?? []).map((source) => source.documentLocator).filter((at): at is BackendDocumentLocator => Boolean(at))

/**
 * 검토 확정 후보: Backend fieldPath 규칙(평가 영역 아래 속성·색인)에 맞는 단일 값만 만든다. 값은 바꾸지 않는다.
 * 배열 값(제출물·조건·채점 기준)은 화면에서 볼 수 있지만 이번 화면의 확정 대상에서 뺐다(값 단위 편집 규칙 미정).
 */
function reviewFieldsOf(subjects: BackendSubject[]): ReviewFieldCandidate[] {
  const fields: ReviewFieldCandidate[] = []
  subjects.forEach((subject, subjectIndex) => {
    const add = (fieldPath: string, label: string, kind: 'number' | 'text', candidate: number | string | null | undefined, list: BackendLocator[] | null | undefined) => {
      fields.push({ subjectIndex, subjectName: subject.subjectName, fieldPath, label, kind, candidate: candidate ?? null, sourcePages: pagesOf(list), sourceLocators: locatorsOf(list), documentLocators: documentLocatorsOf(list) })
    }
    const written = subject.writtenEvaluation
    if (written) {
      add('writtenEvaluation.weightPercent', '지필평가 반영 비율(%)', 'number', written.weightPercent, written.sources)
      for (const [index, exam] of (written.exams ?? []).entries()) {
        const pages = exam.sources
        const name = `지필 ${exam.round}차(${exam.itemKey})`
        add(`writtenEvaluation.exams[${index}].weightPercent`, `${name} 반영 비율(%)`, 'number', exam.weightPercent, pages)
        add(`writtenEvaluation.exams[${index}].maxScore`, `${name} 만점`, 'number', exam.maxScore, pages)
        add(`writtenEvaluation.exams[${index}].timing`, `${name} 시기`, 'text', exam.timing, pages)
      }
    }
    const performance = subject.performanceEvaluation
    if (performance) {
      add('performanceEvaluation.weightPercent', '수행평가 반영 비율(%)', 'number', performance.weightPercent, performance.sources)
      for (const [index, item] of (performance.items ?? []).entries()) {
        const pages = item.sources
        const name = `수행 ${item.itemKey}`
        add(`performanceEvaluation.items[${index}].label`, `${name} 이름`, 'text', item.label, pages)
        add(`performanceEvaluation.items[${index}].weightPercent`, `${name} 반영 비율(%)`, 'number', item.weightPercent, pages)
        add(`performanceEvaluation.items[${index}].maxScore`, `${name} 만점`, 'number', item.maxScore, pages)
        add(`performanceEvaluation.items[${index}].timing`, `${name} 시기`, 'text', item.timing, pages)
      }
    }
  })
  return fields
}

/** S-4: Revision 원문 미리보기(inline, PDF만)·내려받기(형식 그대로). 서버가 크기·SHA-256을 다시 확인한다. */
/** A10 §38-6 HWP·HWPX 원문 구조 미리보기 (JSON). 422 PLAN_PREVIEW_FAILED·409 무결성은 그대로 던진다 */
export const getPlanStructureHttp = (planId: string, revisionId: string) =>
  adminHttp<PlanStructurePreview>(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/structure`)
export const previewPlanRevisionHttp = (planId: string, revisionId: string) =>
  adminFile(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/preview`)
/** §38-9 평가계획서 문서 삭제(논리 삭제, A25 DRAFT). 학생 공개 중이면 confirmPublished=true가 있어야 한다(없으면 409 PLAN_DELETE_CONFIRMATION_REQUIRED). */
export interface PlanDeleteResult {
  planId: string
  schoolId: string
  deletedAt: string
  wasPublished: boolean
  revisionCount: number
}

export const deleteEvaluationPlanHttp = (planId: string, schoolId: string, confirmPublished: boolean) =>
  adminHttp<PlanDeleteResult>(`${plansPath}/${encodeURIComponent(planId)}`, { method: 'DELETE', query: { schoolId, confirmPublished: String(confirmPublished) } })

export const downloadPlanRevisionHttp = (planId: string, revisionId: string) =>
  adminFile(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/file`)

export async function getPlanAnalysisHttp(planId: string, revisionId: string): Promise<EvaluationPlanAnalysisView> {
  const [body, plan] = await Promise.all([
    adminHttp<BackendAnalysis>(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/analysis`),
    adminHttp<BackendPlan>(`${plansPath}/${encodeURIComponent(planId)}`),
  ])
  const revision = plan.revisions.find((item) => item.documentRevisionId === revisionId)
  const subjects = body.subjects ?? []
  return {
    revisionFile: revision
      ? { fileName: revision.fileName, pageCount: revision.pageCount, checksum: revision.checksum ?? null, documentFormat: revision.documentFormat ?? 'PDF', file: revision.file ?? null, sourceUrl: revision.sourceUrl ?? null }
      : undefined,
    reviewFields: reviewFieldsOf(subjects),
    subjectPages: subjects.map((subject) => ({ subjectName: subject.subjectName, from: subject.pageRange?.from ?? null, to: subject.pageRange?.to ?? null })),
    slot: { schoolId: plan.schoolId, academicYear: plan.academicYear, grade: plan.grade, semester: plan.semester },
    subjectGrades: subjects.map((subject) => subject.grades ?? null),
    teachingPlanCandidates: subjects.map((subject, subjectIndex) => ({
      subjectIndex,
      subjectName: subject.subjectName,
      grades: subject.grades ?? null,
      extractionStatus: subject.extraction?.status ?? null,
      issues: subject.extraction?.issues ?? [],
      rows: subject.teachingPlan ?? null,
    })),
    itemDetails: subjects.flatMap((subject, subjectIndex) =>
      (subject.performanceEvaluation?.items ?? []).map((item, itemIndex) => ({
        subjectIndex,
        itemIndex,
        subjectName: subject.subjectName,
        itemKey: item.itemKey,
        label: item.label,
        content: item.content ?? null,
        submissions: item.submissions ?? [],
        conditions: item.conditions ?? [],
        rubric: (item.rubric ?? []).map((criterion) => ({
          element: criterion.element,
          levels: (criterion.levels ?? []).map((level) => ({ description: level.description, score: level.score })),
          maxScore: criterion.maxScore ?? null,
          linkReview: criterion.linkReview ?? null,
          sourcePages: pagesOf(criterion.sources),
          documentLocators: documentLocatorsOf(criterion.sources),
        })),
      })),
    ),
    planId: body.planId,
    documentRevisionId: body.documentRevisionId,
    analysisStatus: body.analysisStatus,
    reviewStatus: body.reviewStatus,
    subjects: (body.subjects ?? []).map(toSubject),
    confirmedFields: toConfirmed(body.confirmedFields),
    analysisId: body.analysisId,
    analyzer: body.analyzer,
    receivedAt: body.receivedAt,
    warnings: body.warnings ?? [],
    sourceReview: body.review?.sourceReview ?? null,
  }
}

/**
 * §39 PUT review (검토 확정). 관리자가 원본 대조·과목 ID 입력·필드 확인을 마치고 명시적으로 누를 때만 화면이 호출한다.
 * 과목 ID는 서버가 그 문서 슬롯(학교·학년도·학년·학기)의 학업 과목인지 검증한다(아니면 400 reviewedSubjects[i].subjectId: unknown).
 * 응답을 그대로 쓰지 않고 다시 읽어 확정값·상태를 서버 기준으로 보여준다.
 */
export async function confirmPlanReviewHttp(planId: string, revisionId: string, request: PlanReviewConfirmRequest): Promise<EvaluationPlanAnalysisView> {
  await adminHttp(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/review`, { method: 'PUT', json: request })
  return getPlanAnalysisHttp(planId, revisionId)
}

/**
 * 기존 Mock 화면 Shape(savePlanReview): Backend는 reviewedSubjects[].subjectId(학업 Context 과목 ID)를 요구한다. 현재 검토 화면은 분석 과목명만 다루고
 * 과목 ID를 고르는 UI가 없다(C-7). 이름으로 ID를 추측해 확정하면 안 되므로 연결하지 않는다. 'SAVE'(임시 저장)는 Backend에 없다.
 */
export function savePlanReviewHttp(
  _planId: string,
  _revisionId: string,
  _request: { confirmedFields: AdminEvaluationPlanRevision['confirmedFields']; decision: 'CONFIRM' | 'SAVE' },
): Promise<AdminEvaluationPlanRevision> {
  return notConnected('검토 확정은 아직 화면에 연결하지 않았어요. 분석 과목을 학업 정보의 과목 ID와 맞추는 화면이 필요해요(C-7). 임시 저장은 서버에 없어요.')
}

/** A6 §38-4 문서 슬롯 학업 과목 (검토 화면 과목 선택용) */
export const getPlanSubjectsHttp = (planId: string) => adminHttp<PlanSubjects>(`${plansPath}/${encodeURIComponent(planId)}/subjects`)

/** A6 월별 운영계획 확정 조회·저장 (DRAFT §39-6). 평가 정보 확정과 별도. 409(이미 확정)는 그대로 던진다 */
const teachingPlanPath = (planId: string, revisionId: string) =>
  `${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/teaching-plan-review`
export const getTeachingPlanReviewHttp = (planId: string, revisionId: string) => adminHttp<TeachingPlanReviewView>(teachingPlanPath(planId, revisionId))
export const confirmTeachingPlanHttp = (planId: string, revisionId: string, request: TeachingPlanReviewRequest) =>
  adminHttp<TeachingPlanReviewView>(teachingPlanPath(planId, revisionId), { method: 'PUT', json: request })

/** A5 공유 검토 초안 조회·저장 (DRAFT §39-4). 409(충돌·결과 바뀜)는 그대로 던진다 — 화면이 사용자에게 선택을 묻는다 */
const draftPath = (planId: string, revisionId: string) => `${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/review-draft`
export const getPlanReviewDraftHttp = (planId: string, revisionId: string) => adminHttp<PlanReviewDraftView>(draftPath(planId, revisionId))
/** A7 운영계획 초안 (§39-6): 평가 정보 초안과 별도 — 평가 정보 확정 뒤에도 저장된다 */
const teachingDraftPath = (planId: string, revisionId: string) => `${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/teaching-plan-draft`
export const getTeachingPlanDraftHttp = (planId: string, revisionId: string) => adminHttp<PlanReviewDraftView>(teachingDraftPath(planId, revisionId))
/** A13 §39-10 운영계획 재검토 시작 · 확정 이력 */
export const reopenTeachingPlanDraftHttp = (planId: string, revisionId: string) =>
  adminHttp<PlanReviewDraftView>(`${teachingDraftPath(planId, revisionId)}/reopen`, { method: 'POST' })
export const getTeachingPlanHistoryHttp = (planId: string, revisionId: string) =>
  adminHttp<TeachingPlanHistory>(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/teaching-plan-reviews`)
export const saveTeachingPlanDraftHttp = (planId: string, revisionId: string, request: PlanReviewDraftSaveRequest) =>
  adminHttp<PlanReviewDraftView>(teachingDraftPath(planId, revisionId), { method: 'PUT', json: request })
/** A14 §39-11 관리자 직접 추가 행 생성·수정(제외·복원 포함). 409(초안 version 충돌)·400(입력)은 그대로 던진다 */
export const createTeachingPlanManualRowHttp = (planId: string, revisionId: string, request: TeachingPlanManualRowRequest) =>
  adminHttp<PlanReviewDraftView>(`${teachingDraftPath(planId, revisionId)}/manual-rows`, { method: 'POST', json: request })
export const updateTeachingPlanManualRowHttp = (planId: string, revisionId: string, rowKey: string, request: TeachingPlanManualRowRequest) =>
  adminHttp<PlanReviewDraftView>(`${teachingDraftPath(planId, revisionId)}/manual-rows/${encodeURIComponent(rowKey)}`, { method: 'PUT', json: request })
/** A12 §39-8 재검토 시작: 확정된 Revision의 평가 정보 초안을 다시 연다. 이미 열려 있으면 409 그대로 */
export const reopenPlanReviewDraftHttp = (planId: string, revisionId: string) =>
  adminHttp<PlanReviewDraftView>(`${draftPath(planId, revisionId)}/reopen`, { method: 'POST' })
/** A12 §39-8 확정 이력 (최신 → 과거, 관리자 전용) */
export const getPlanReviewHistoryHttp = (planId: string, revisionId: string) =>
  adminHttp<PlanReviewHistory>(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/reviews`)
export const savePlanReviewDraftHttp = (planId: string, revisionId: string, request: PlanReviewDraftSaveRequest) =>
  adminHttp<PlanReviewDraftView>(draftPath(planId, revisionId), { method: 'PUT', json: request })

/** A5 학교 검색: 평가계획서가 등록된 학교 (전체 학교 Master 연결 전) */
export const searchSchoolsHttp = (query?: string) => adminHttp<SchoolSearchResult>('/api/admin/assessment/schools', { query: { query, limit: 100 } })

/**
 * A9 학년도별 열람: 한 Revision의 분석 결과(원본 모양 그대로)·관리자 확정값·과목 연결·운영계획 확정을 함께 읽는다.
 * 새 Endpoint 없이 기존 §39 GET analysis · §39-4 review-draft · §39-6 teaching-plan-review를 조합한다.
 * 초안·운영계획 조회 실패는 '없음'이 아니라 null로 두고 화면이 구분한다.
 */
export async function getPlanArchiveDetailHttp(planId: string, revisionId: string): Promise<PlanArchiveDetail> {
  const revisionPath = `${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}`
  const [analysis, draft, teaching] = await Promise.all([
    adminHttp<{ analysisId: string | null; analysisStatus: PlanAnalysisStatus; reviewStatus: PlanReviewStatus; analyzer: PlanArchiveDetail['analyzer']; subjects: ArchiveSubject[] | null; warnings: { source: string; message: string }[] | null; confirmedFields: BackendConfirmedField[] | null }>(`${revisionPath}/analysis`),
    adminHttp<PlanReviewDraftView>(`${revisionPath}/review-draft`).catch(() => null),
    adminHttp<TeachingPlanReviewView>(`${revisionPath}/teaching-plan-review`).catch(() => null),
  ])
  // 과목 연결 우선순위 (A10): ① 확정값에 저장된 분석 과목 번호(공식, 초안이 닫혀도 남음)
  // ② 검토 초안의 subjectLinks(번호·과목 모두 ①에 없을 때만) ③ 분석 과목 1개 + 확정 과목 1개. 그 밖에는 추정하지 않는다
  const subjectLinks: Record<number, string> = {}
  for (const field of analysis.confirmedFields ?? []) if (field.analysisSubjectIndex != null && subjectLinks[field.analysisSubjectIndex] === undefined) subjectLinks[field.analysisSubjectIndex] = field.subjectId
  const linkedSubjectIds = () => new Set(Object.values(subjectLinks))
  for (const link of draft?.draft?.subjectLinks ?? []) if (subjectLinks[link.subjectIndex] === undefined && !linkedSubjectIds().has(link.subjectId)) subjectLinks[link.subjectIndex] = link.subjectId
  // 과목 번호 없이 확정한 이전 PDF: 분석 과목이 하나이고 확정 과목도 하나면 그 둘은 같은 과목이다
  const confirmedSubjects = new Set((analysis.confirmedFields ?? []).map((field) => field.subjectId))
  if ((analysis.subjects ?? []).length === 1 && subjectLinks[0] === undefined && confirmedSubjects.size === 1) subjectLinks[0] = [...confirmedSubjects][0]
  return {
    analysisId: analysis.analysisId,
    analysisStatus: analysis.analysisStatus,
    reviewStatus: analysis.reviewStatus,
    analyzer: analysis.analyzer,
    subjects: analysis.subjects ?? [],
    warnings: analysis.warnings ?? [],
    confirmed: (analysis.confirmedFields ?? []).map((field) => ({ subjectId: field.subjectId, fieldPath: field.fieldPath, value: field.value, pdfPageNumber: field.pdfPageNumber })),
    subjectLinks,
    teachingPlan: teaching,
  }
}

/** PR #18 §38-11: 학교 이름으로 학교알리미 평가계획 파일을 받아 학년·학기 문서로 등록하고 서버 분석까지 한다(202 + 작업 번호). */
export function importFromSchoolInfoHttp(request: { schoolId: string; schoolName: string; academicYear: number; semester: number; defaultGrade: number | null }): Promise<import('../types.ts').SchoolInfoImportResult> {
  return adminHttp(`${plansPath}/import-from-schoolinfo`, { method: 'POST', json: request })
}

export function getSchoolInfoImportHttp(jobId: string): Promise<import('../types.ts').SchoolInfoImportResult> {
  return adminHttp(`${plansPath}/import-from-schoolinfo/${encodeURIComponent(jobId)}`)
}

/** §38-12 (A27-UX 부록 E): 최근 3개 학년도 자동 확인 명령. 진행 중이면 같은 작업을 돌려준다. */
export function ensureSchoolInfoSyncHttp(request: { schoolId: string; requestedAcademicYears: number[]; grades: number[]; semesters: number[]; force?: boolean }): Promise<import('../types.ts').SchoolInfoSyncResult> {
  return adminHttp(`${plansPath}/schoolinfo-sync`, { method: 'POST', json: request })
}

/** §38-12 상태 조회(읽기 전용). */
export function getSchoolInfoSyncHttp(jobId: string): Promise<import('../types.ts').SchoolInfoSyncResult> {
  return adminHttp(`${plansPath}/schoolinfo-sync/${encodeURIComponent(jobId)}`)
}

/** §38-13 (부록 F): 동명 학교 후보 하나 고르기 → 그 학교만 세 학년도를 다시 확인한다. */
export function selectSchoolInfoSchoolHttp(request: { schoolId: string; jobId: string; candidateId: string; expectedVersion: number }): Promise<import('../types.ts').SchoolInfoSyncResult> {
  return adminHttp(`${plansPath}/schoolinfo-sync/school-selection`, { method: 'POST', json: request })
}

/** §38-14 (부록 F): 확인되지 않은 원본·분류한 원본 목록 */
export function listSchoolInfoSourcesHttp(schoolId: string): Promise<import('../types.ts').SchoolInfoSourcesResult> {
  return adminHttp(`${plansPath}/schoolinfo-sources`, { query: { schoolId } })
}

/** §38-14: 원본 내려받기(관리자만) */
export function downloadSchoolInfoSourceHttp(schoolId: string, sourceFileId: string): Promise<Blob> {
  return adminFile(`${plansPath}/schoolinfo-sources/${encodeURIComponent(sourceFileId)}/file?schoolId=${encodeURIComponent(schoolId)}`)
}

/** §38-14: 학년·학기 분류(Revision + 칸 연결) */
export function classifySchoolInfoSourceHttp(sourceFileId: string, request: { schoolId: string; academicYear: number; grades: number[]; semesters: number[]; note: string | null; expectedVersion: number }): Promise<import('../types.ts').SchoolInfoSourceItem> {
  return adminHttp(`${plansPath}/schoolinfo-sources/${encodeURIComponent(sourceFileId)}/classification`, { method: 'PUT', json: request })
}

// ---------------- 부록 O §38-15 학교알리미 공식 학교 검색·선택 (평가계획서 0건 학교 포함)
export interface SchoolDirectoryItem {
  candidateId: string
  officialName: string
  sido: string | null
  sigungu: string | null
  address: string | null
  schoolinfoSchoolId: string
  /** 이미 이 학교알리미 학교를 쓰는 학교 키(없으면 null) */
  schoolId: string | null
  selectable: boolean
  unselectableReason: 'ADDRESS_MISSING' | 'ADDRESS_DUPLICATE' | 'SEARCH_INCOMPLETE' | null
}
export interface SchoolDirectorySearch {
  query: string
  complete: boolean
  incompleteReason: string | null
  items: SchoolDirectoryItem[]
}
export interface SchoolDirectorySelection {
  schoolId: string
  schoolName: string
  sido: string | null
  sigungu: string | null
  address: string | null
  schoolinfoSchoolId: string
  sync: import('../types.ts').SchoolInfoSyncResult
}
export const searchSchoolDirectoryHttp = (query: string) =>
  adminHttp<SchoolDirectorySearch>('/api/admin/assessment/schools/directory', { query: { query } })
export const selectSchoolDirectoryHttp = (candidateId: string) =>
  adminHttp<SchoolDirectorySelection>('/api/admin/assessment/schools/directory/selection', { method: 'POST', json: { candidateId } })
