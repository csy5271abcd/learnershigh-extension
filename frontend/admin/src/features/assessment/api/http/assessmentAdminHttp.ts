import type {
  AdminEvaluationPlan,
  AdminEvaluationPlanRevision,
  AdminSchool,
  AnalysisSubject,
  EvaluationPlanAnalysisView,
  PlanAnalysisStatus,
  PlanReviewConfirmRequest,
  PlanReviewStatus,
  ReviewFieldCandidate,
  SchoolAssessment,
  PlanSourceReview,
} from '../types.ts'
import { ApiError } from '../canonicalSource.ts'
import { adminHttp, notConnected } from './adminHttpClient.ts'
import { getStudentFilterOptionsHttp } from './adminRecordsHttp.ts'

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
    fileRef: revision.fileRef, // 원본 미보관: null (C-11)
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
export async function listSchoolsHttp(): Promise<{ items: (AdminSchool & { region: string | null; documentCount: number | null; planOperable?: boolean })[] }> {
  const raw: unknown = import.meta.env.DEV ? import.meta.env.VITE_ASSESSMENT_DEV_PLAN_SCHOOLS : undefined
  const configured = typeof raw === 'string' ? raw.split(',').map((entry) => entry.trim()).filter(Boolean) : []
  const schools = new Map<string, string>()
  const studentSchools = new Set<string>()
  if (import.meta.env.DEV) {
    for (const school of (await getStudentFilterOptionsHttp()).schools) {
      schools.set(school.schoolId, school.name)
      studentSchools.add(school.schoolId)
    }
  }
  for (const entry of configured) {
    const [schoolId, name] = entry.split(':')
    if (!schools.has(schoolId)) schools.set(schoolId, name || schoolId)
  }
  if (schools.size === 0) {
    return notConnected('담당 학교 목록 API가 아직 없어요. (학교 원천 API-OD-A01 · 평가계획서 운영 권한 OD-A08 결정 대기)')
  }
  const items = await Promise.all(
    [...schools].map(async ([schoolId, name]) => {
      try {
        const plans = await adminHttp<{ items: BackendPlan[] }>(plansPath, { query: { schoolId } })
        return { schoolId, name, region: null, documentCount: plans.items.length, planOperable: true }
      } catch (error) {
        // 설정에만 있고 담당 학생의 학교도 아닌 학교는 운영 권한이 없으면 목록에서 뺀다
        if (error instanceof ApiError && error.code === 'FORBIDDEN') return studentSchools.has(schoolId) ? { schoolId, name, region: null, documentCount: null, planOperable: false } : null
        throw error
      }
    }),
  ).then((list) => list.filter((item) => item !== null))
  // 운영 권한이 있는 학교를 먼저, 그다음 이름순
  items.sort((a, b) => Number(b.planOperable) - Number(a.planOperable) || a.name.localeCompare(b.name, 'ko'))
  return { items }
}

/** 실제 등록된 문서의 학년도 + 개발용 현재 학기(VITE_ASSESSMENT_DEV_CURRENT_TERM)의 학년도. 날짜로 학년도를 추측하지 않는다. */
export async function listPlanYearsHttp(schoolId: string): Promise<number[]> {
  const plans = await adminHttp<{ items: BackendPlan[] }>(plansPath, { query: { schoolId } })
  const years = new Set(plans.items.map((plan) => plan.academicYear))
  const term: unknown = import.meta.env.DEV ? import.meta.env.VITE_ASSESSMENT_DEV_CURRENT_TERM : undefined
  const match = typeof term === 'string' ? /^(\d{4})-[12]$/.exec(term.trim()) : null
  if (match) years.add(Number(match[1]))
  return [...years].sort((a, b) => b - a)
}

export async function listEvaluationPlansHttp(query: { schoolId: string; academicYear: number }): Promise<{ items: AdminEvaluationPlan[] }> {
  const body = await adminHttp<{ items: BackendPlan[] }>(plansPath, { query })
  return { items: body.items.map(toPlan) }
}

async function getPlan(planId: string): Promise<AdminEvaluationPlan> {
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
export function requestPlanAnalysisHttp(_planId: string, _revisionId: string): Promise<AdminEvaluationPlanRevision> {
  return notConnected('서버 분석 실행은 아직 없어요. 원본 PDF를 서버에 보관하지 않아요(File Storage 결정 대기). 분석 결과는 외부 분석기 수신으로만 들어와요.')
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
}

interface BackendAnalysis {
  planId: string
  documentRevisionId: string
  analysisId: string | null
  analysisStatus: PlanAnalysisStatus
  reviewStatus: PlanReviewStatus
  analyzer: { origin: string; name: string; version: string } | null
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

export async function getPlanAnalysisHttp(planId: string, revisionId: string): Promise<EvaluationPlanAnalysisView> {
  const [body, plan] = await Promise.all([
    adminHttp<BackendAnalysis>(`${plansPath}/${encodeURIComponent(planId)}/revisions/${encodeURIComponent(revisionId)}/analysis`),
    adminHttp<BackendPlan>(`${plansPath}/${encodeURIComponent(planId)}`),
  ])
  const revision = plan.revisions.find((item) => item.documentRevisionId === revisionId)
  const subjects = body.subjects ?? []
  return {
    revisionFile: revision
      ? { fileName: revision.fileName, pageCount: revision.pageCount, checksum: revision.checksum ?? null, documentFormat: revision.documentFormat ?? 'PDF' }
      : undefined,
    reviewFields: reviewFieldsOf(subjects),
    subjectPages: subjects.map((subject) => ({ subjectName: subject.subjectName, from: subject.pageRange?.from ?? null, to: subject.pageRange?.to ?? null })),
    itemDetails: subjects.flatMap((subject) =>
      (subject.performanceEvaluation?.items ?? []).map((item) => ({
        subjectName: subject.subjectName,
        itemKey: item.itemKey,
        label: item.label,
        content: item.content ?? null,
        submissions: item.submissions ?? [],
        conditions: item.conditions ?? [],
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
