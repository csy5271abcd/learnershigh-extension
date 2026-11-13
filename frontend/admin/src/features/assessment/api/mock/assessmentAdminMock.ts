import {
  ApiError,
  fixtureAnalysisResults,
  matchSubject,
  type SchoolAssessmentRecord,
  fixtureFavorites,
  fixtureResources,
  type ReadOnlyStudentSnapshot,
  fixtureCurrentTerm,
  fixtureReferenceAreas,
  fixtureReferenceSources,
  referenceSourcesBasis,
  type AssessmentSourceType,
  type FeedbackComment,
  type MockExamMaterial,
} from '../canonicalSource.ts'
import type {
  ActivitySummary,
  AdminArtifact,
  AdminCatalogTask,
  AdminEvaluationPlan,
  AdminEvaluationPlanRevision,
  AdminFeedbackDetail,
  AdminFeedbackRequest,
  AdminMockExamMaterial,
  AdminNote,
  AdminSchool,
  AdminStudentDetail,
  AdminStudentRef,
  AdminStudentSummary,
  AdminUniversityResource,
  AiReviewRecord,
  ArtifactComparison,
  AssessmentOverview,
  EvaluationPlanAnalysisView,
  FeedbackReplyDraft,
  PublishState,
  ReferenceScrap,
  ScrapRequest,
} from '../types.ts'
import { fail, mockAsOfDate, mockNow, nextMockId, respond, scenarioActive } from './adminMockRuntime.ts'
import { adminScopeBranchId, canonicalStudentId } from './adminRosterFixture.ts'
import { adminStore as store } from './adminStore.ts'

// Admin Assessment Mock Adapter (api-contract.md §33~47 DRAFT Shape).
// 모든 수치는 Store의 Entity 상태에서 계산한다 (Dashboard Counter 직접 기록 금지, frontend-admin §9).
// 담당 범위 검사는 서버 인가를 흉내만 낸다 (실제 인가는 Stage 2 Backend, §34).

// ── 공통 ─────────────────────────────────────────────

/** §5-2 Validation Error. 화면은 details.fields로 입력칸 옆에 사유를 보여준다 */
function invalid(fields: { field: string; reason: string }[]): never {
  throw new ApiError(400, { code: 'VALIDATION_ERROR', message: '입력 내용을 확인해 주세요.', details: { fields } })
}

const inScope = () => store.roster.filter((student) => student.branchId === adminScopeBranchId)

const toRef = (student: (typeof store.roster)[number]): AdminStudentRef => ({
  studentId: student.studentId,
  displayName: student.displayName,
  school: student.school,
  grade: student.grade,
})

/** 담당 범위 밖 학생은 존재 여부를 드러내지 않고 403 (IDOR 방어 확인용) */
function requireStudent(studentId: string) {
  const student = store.roster.find((item) => item.studentId === studentId)
  if (!student) fail(404, 'STUDENT_NOT_FOUND', '학생을 찾을 수 없어요.')
  if (student.branchId !== adminScopeBranchId) fail(403, 'FORBIDDEN', '담당 범위 밖 학생의 Assessment 기록은 볼 수 없어요.')
  return student
}

export function subjectNameOf(subjectId: string | null): string | null {
  if (!subjectId) return null
  for (const contexts of Object.values(store.academicContexts)) {
    for (const context of contexts) {
      const subject = context.subjects.find((item) => item.subjectId === subjectId)
      if (subject) return subject.name
    }
  }
  return null
}

/** 관리 콘텐츠의 과목 선택지: 현재 학기 학교 과목 (학생이 직접 추가한 과목은 그 학생 전용이라 공통 콘텐츠 과목으로 쓰지 않는다) */
export function catalogSubjectOptions(): { subjectId: string; name: string }[] {
  const seen = new Map<string, string>()
  // 공통 콘텐츠 과목은 Canonical 학생(Student 앱과 같은 과목 ID)의 학교 과목만 쓴다. 시연 학교 과목(demo_)은 학생별 시연 데이터라 넣지 않는다 (P-29)
  for (const contexts of [store.academicContexts[canonicalStudentId] ?? []]) {
    for (const context of contexts) {
      if (context.academicYear !== fixtureCurrentTerm.academicYear || context.semester !== fixtureCurrentTerm.semester) continue
      for (const subject of context.subjects) if (!subject.addedByStudent) seen.set(subject.subjectId, subject.name)
    }
  }
  return [...seen].map(([subjectId, name]) => ({ subjectId, name }))
}

function sourceTitleOf(sourceType: AssessmentSourceType, sourceId: string): { title: string; subjectId: string | null } {
  if (sourceType === 'SCHOOL_ASSESSMENT') {
    const item = store.schoolAssessments.find((assessment) => assessment.assessmentId === sourceId)
    return { title: item?.title ?? '삭제되었거나 볼 수 없는 수행평가', subjectId: item?.subjectId ?? null }
  }
  const task = store.enrichmentTasks.find((item) => item.taskId === sourceId)
  return { title: task?.title ?? '삭제되었거나 볼 수 없는 심화 탐구', subjectId: task?.subjectId ?? null }
}

const isCurrentTerm = (item: { academicYear: number; semester: number }, term: { academicYear: number; semester: number }) =>
  item.academicYear === term.academicYear && item.semester === term.semester

function countStatus(items: { status: string }[]) {
  return {
    beforeStart: items.filter((item) => item.status === 'BEFORE_START').length,
    inProgress: items.filter((item) => item.status === 'IN_PROGRESS').length,
    completed: items.filter((item) => item.status === 'COMPLETED').length,
  }
}

function activityOf(studentId: string, term: { academicYear: number; semester: number } = fixtureCurrentTerm): ActivitySummary {
  const requests = store.feedbackRequests.filter((request) => request.studentId === studentId)
  return {
    schoolAssessment: countStatus(store.schoolAssessments.filter((item) => item.studentId === studentId && isCurrentTerm(item, term))),
    enrichmentTask: countStatus(store.enrichmentTasks.filter((item) => item.studentId === studentId)),
    feedback: {
      pending: requests.filter((request) => request.status === 'PENDING').length,
      delivered: requests.filter((request) => request.status === 'DELIVERED').length,
    },
  }
}

function lastActivityOf(studentId: string): string | null {
  const times = [
    ...store.notes.filter((note) => note.studentId === studentId).flatMap((note) => note.revisions.map((revision) => revision.savedAt)),
    ...store.artifacts
      .filter((artifact) => artifact.studentId === studentId)
      .flatMap((artifact) => store.artifactVersions.filter((version) => version.artifactId === artifact.artifactId).map((version) => version.uploadedAt)),
    ...store.feedbackRequests.filter((request) => request.studentId === studentId).map((request) => request.requestedAt),
    ...store.enrichmentTasks.filter((task) => task.studentId === studentId).map((task) => task.updatedAt),
    ...store.growthRecords.filter((record) => record.studentId === studentId).map((record) => record.updatedAt),
  ]
  return times.length ? times.reduce((latest, value) => (Date.parse(value) > Date.parse(latest) ? value : latest)) : null
}

function nextDeadlineOf(studentId: string): AdminStudentSummary['nextDeadline'] {
  const upcoming = store.schoolAssessments
    .filter((item) => item.studentId === studentId && item.status !== 'COMPLETED' && item.deadlineDate && item.deadlineDate >= mockAsOfDate)
    .sort((a, b) => (a.deadlineDate ?? '').localeCompare(b.deadlineDate ?? ''))[0]
  return upcoming?.deadlineDate ? { assessmentId: upcoming.assessmentId, title: upcoming.title, deadlineDate: upcoming.deadlineDate } : null
}

const matches = (query: string | undefined, ...values: (string | null | undefined)[]) => {
  const keyword = query?.trim().toLowerCase()
  if (!keyword) return true
  return values.some((value) => value?.toLowerCase().includes(keyword))
}

// ── §33·§47 현황 ─────────────────────────────────────

export function getOverviewMock(query: { schoolId?: string; grade?: number } = {}): Promise<AssessmentOverview> {
  return respond(() => {
    if (scenarioActive('listError')) fail(503, 'SERVICE_UNAVAILABLE', 'Assessment 현황을 불러오지 못했어요.')
    const students = inScope().filter((student) => (!query.schoolId || student.school.schoolId === query.schoolId) && (!query.grade || student.grade === query.grade))
    const ids = new Set(students.map((student) => student.studentId))
    const requests = store.feedbackRequests.filter((request) => ids.has(request.studentId))
    const pending = requests.filter((request) => request.status === 'PENDING')
    const currentPlans = store.plans.filter((plan) => plan.academicYear === fixtureCurrentTerm.academicYear)
    return {
      kpi: {
        registeredStudents: students.length,
        schoolAssessments: store.schoolAssessments.filter((item) => ids.has(item.studentId) && isCurrentTerm(item, fixtureCurrentTerm)).length,
        enrichmentTasks: store.enrichmentTasks.filter((item) => ids.has(item.studentId)).length,
        feedbackPending: pending.length,
        feedbackDelivered: requests.filter((request) => request.status === 'DELIVERED').length,
      },
      evaluationPlans: {
        schools: new Set(currentPlans.map((plan) => plan.schoolId)).size,
        documents: currentPlans.reduce((sum, plan) => sum + plan.revisions.length, 0),
      },
      oldestPendingRequestedAt: pending.map((request) => request.requestedAt).sort()[0] ?? null,
      contentCounts: {
        mockExamMaterials: store.mockExam.filter((item) => item.publishState === 'PUBLISHED').length,
        scraps: store.scraps.length,
      },
      asOf: mockNow(),
    }
  })
}

export function getActivitySummaryMock(query: { studentId: string; academicYear: number; semester: number }): Promise<ActivitySummary> {
  return respond(() => {
    requireStudent(query.studentId)
    return activityOf(query.studentId, query)
  })
}

// ── §34 학생 ─────────────────────────────────────────

/** 학생 목록 조건. term·subjectName·status는 P-29 PROPOSED (§34에 없는 시연용 필터, 서버 계약 전 가정) */
export interface StudentListQuery {
  schoolId?: string
  grade?: number
  query?: string
  /** 학년도·학기 (예: { academicYear: 2026, semester: 1 }). 그 학기 학업 정보가 있는 학생만 */
  term?: { academicYear: number; semester: number }
  /** 그 학기에 듣는 과목 이름 */
  subjectName?: string
  /** 그 학기 수행평가 중 이 상태가 하나라도 있는 학생 */
  status?: 'BEFORE_START' | 'IN_PROGRESS' | 'COMPLETED'
}

export function listStudentsMock(query: StudentListQuery = {}): Promise<{ items: AdminStudentSummary[] }> {
  return respond(() => {
    if (scenarioActive('listError')) fail(503, 'SERVICE_UNAVAILABLE', '학생 목록을 불러오지 못했어요.')
    if (scenarioActive('empty')) return { items: [] }
    const term = query.term ?? fixtureCurrentTerm
    const contextOf = (studentId: string) => (store.academicContexts[studentId] ?? []).find((context) => isCurrentTerm(context, term))
    const items = inScope()
      .filter((student) => (!query.schoolId || student.school.schoolId === query.schoolId) && (!query.grade || student.grade === query.grade))
      .filter((student) => matches(query.query, student.displayName, student.school.name))
      .filter((student) => !query.term || contextOf(student.studentId) !== undefined)
      .filter((student) => !query.subjectName || Boolean(contextOf(student.studentId)?.subjects.some((subject) => subject.name === query.subjectName)))
      .filter(
        (student) =>
          !query.status ||
          store.schoolAssessments.some((item) => item.studentId === student.studentId && isCurrentTerm(item, term) && item.status === query.status),
      )
      .map((student) => ({
        student: toRef(student),
        activity: activityOf(student.studentId, term),
        nextDeadline: nextDeadlineOf(student.studentId),
        lastActivityAt: lastActivityOf(student.studentId),
      }))
    return { items }
  })
}

/** 학생 목록 필터 선택지 (P-29 PROPOSED). 담당 범위 학생의 학업 정보에서 계산한다 — 학교를 고르면 그 학교 값만 */
export function getStudentFilterOptionsMock(query: { schoolId?: string; grade?: number; term?: { academicYear: number; semester: number } } = {}) {
  return respond(() => {
    const students = inScope().filter((student) => (!query.schoolId || student.school.schoolId === query.schoolId) && (!query.grade || student.grade === query.grade))
    const schools = new Map<string, string>()
    for (const student of inScope()) schools.set(student.school.schoolId, student.school.name)
    const terms = new Map<string, { academicYear: number; semester: number }>()
    const subjects = new Set<string>()
    for (const student of students) {
      for (const context of store.academicContexts[student.studentId] ?? []) {
        terms.set(`${context.academicYear}-${context.semester}`, { academicYear: context.academicYear, semester: context.semester })
        if (!query.term || isCurrentTerm(context, query.term)) for (const subject of context.subjects) subjects.add(subject.name)
      }
    }
    return {
      schools: [...schools].map(([schoolId, name]) => ({ schoolId, name })),
      terms: [...terms.values()].sort((a, b) => b.academicYear - a.academicYear || b.semester - a.semester),
      subjectNames: [...subjects].sort((a, b) => a.localeCompare(b, 'ko')),
    }
  })
}

export function getStudentMock(studentId: string): Promise<AdminStudentDetail> {
  return respond(() => {
    if (scenarioActive('detailError')) fail(503, 'SERVICE_UNAVAILABLE', '학생 정보를 불러오지 못했어요.')
    const student = requireStudent(studentId)
    const contexts = structuredClone(store.academicContexts[studentId] ?? [])
    // 학생이 Student 앱에서 직접 추가한 과목은 그 브라우저에만 저장되어(P-26) Admin이 읽을 수 없다. 표시 구분만 이 시나리오로 확인한다.
    if (scenarioActive('studentCustomSubject')) {
      const current = contexts.find((context) => isCurrentTerm(context, fixtureCurrentTerm))
      current?.subjects.push({ subjectId: 'subj_custom_demo', name: '인공지능 기초', addedByStudent: true })
    }
    return { student: toRef(student), academicContexts: contexts }
  })
}

export function listStudentSchoolAssessmentsMock(studentId: string, term: { academicYear: number; semester: number }) {
  return respond(() => {
    requireStudent(studentId)
    return { items: store.schoolAssessments.filter((item) => item.studentId === studentId && isCurrentTerm(item, term)).map(({ studentId: _owner, ...item }) => item) }
  })
}

export function listStudentEnrichmentTasksMock(studentId: string) {
  return respond(() => {
    requireStudent(studentId)
    return { items: store.enrichmentTasks.filter((item) => item.studentId === studentId).map(({ studentId: _owner, ...item }) => item) }
  })
}

export function listStudentGrowthRecordsMock(studentId: string) {
  return respond(() => {
    requireStudent(studentId)
    return { items: store.growthRecords.filter((item) => item.studentId === studentId).map(({ studentId: _owner, ...item }) => item) }
  })
}

/**
 * 학생 기록 한 건 (학교 수행평가 또는 심화 탐구). §34는 목록만 정의해 단건 조회는 가정이다 (P-27).
 * 학기 구분 없이 ID로 찾되 소유 학생이 다르면 404 (다른 학생 기록 ID를 추측해도 열리지 않게).
 */
export function getStudentSourceMock(studentId: string, sourceType: AssessmentSourceType, sourceId: string) {
  return respond(() => {
    if (scenarioActive('detailError')) fail(503, 'SERVICE_UNAVAILABLE', '기록을 불러오지 못했어요.')
    const student = requireStudent(studentId)
    if (sourceType === 'SCHOOL_ASSESSMENT') {
      const item = store.schoolAssessments.find((assessment) => assessment.assessmentId === sourceId && assessment.studentId === studentId)
      if (!item) fail(404, 'SCHOOL_ASSESSMENT_NOT_FOUND', '이 학생의 수행평가를 찾을 수 없어요.')
      const plan = item.evaluationItemRef
        ? store.plans.flatMap((entry) => entry.revisions).find((revision) => revision.documentRevisionId === item.evaluationItemRef?.documentRevisionId)
        : undefined
      const { studentId: _owner, ...assessment } = item
      const subjectName = subjectNameOf(item.subjectId)
      const linkedTasks = store.enrichmentTasks
        .filter((task) => task.studentId === studentId && task.relatedAssessmentId === item.assessmentId)
        .map((task) => ({ taskId: task.taskId, title: task.title, status: task.status }))
      return {
        kind: 'school' as const,
        student: toRef(student),
        assessment,
        planFileName: plan?.fileName ?? null,
        planId: plan ? (store.plans.find((entry) => entry.revisions.includes(plan))?.planId ?? null) : null,
        criteria: criteriaOf(item.evaluationItemRef, subjectName),
        linkedTasks,
        // 그 학기의 학년 (학업 정보에서 찾는다. 없으면 null — 현재 학년으로 추측하지 않는다)
        term: {
          academicYear: item.academicYear,
          semester: item.semester,
          grade: (store.academicContexts[studentId] ?? []).find((context) => isCurrentTerm(context, item))?.grade ?? null,
        },
      }
    }
    const task = store.enrichmentTasks.find((entry) => entry.taskId === sourceId && entry.studentId === studentId)
    if (!task) fail(404, 'ENRICHMENT_TASK_NOT_FOUND', '이 학생의 심화 탐구를 찾을 수 없어요.')
    const { studentId: _owner, ...enrichment } = task
    const catalog = enrichment.catalogTaskId ? store.catalog.find((entry) => entry.catalogTaskId === enrichment.catalogTaskId) : undefined
    return { kind: 'enrichment' as const, student: toRef(student), task: enrichment, catalogTitle: catalog?.title ?? null }
  })
}

/**
 * 수행평가의 평가계획서 항목 후보 (Student 상세의 loadEvaluationItemCandidate와 같은 규칙, 시연 피드백 ③).
 * §12에 평가일·반영비율이 없어 evaluationItemRef가 가리키는 §11 분석 결과에서 찾는다. 값은 "후보"이고 확정 값이 아니다.
 * Admin은 분석을 새로 요청하지 않고 공통 문서의 분석 결과(Canonical)를 그대로 읽는다.
 */
export type CriteriaLookup =
  | { kind: 'unlinked' }
  | { kind: 'analysisUnavailable' }
  | { kind: 'subjectMissing'; extractionFailed: boolean }
  | { kind: 'itemMissing' }
  | {
      kind: 'found'
      analysisStatus: 'REVIEW_REQUIRED' | 'COMPLETED'
      label: string | null
      timing: string | null
      weightPercent: number | null
      maxScore: number | null
      rubric: string[]
      source: { pdfPageNumber: number; printedPageLabel: string | null; extractedText: string } | null
    }

function criteriaOf(ref: SchoolAssessmentRecord['evaluationItemRef'], subjectName: string | null): CriteriaLookup {
  if (!ref) return { kind: 'unlinked' }
  const analysis = fixtureAnalysisResults[ref.documentRevisionId]
  if (!analysis) return { kind: 'analysisUnavailable' }
  const subject = subjectName ? analysis.subjects.find((entry) => matchSubject(entry.subjectName, [{ subjectId: ref.subjectId, name: subjectName }])) : undefined
  if (!subject || subject.extractionFailed) return { kind: 'subjectMissing', extractionFailed: Boolean(subject?.extractionFailed) }
  const item = subject.performanceEvaluation?.items.find((entry) => entry.itemKey === ref.itemKey)
  if (!item) return { kind: 'itemMissing' }
  const source = item.sourcePdfPageNumber === null ? undefined : subject.sources.find((entry) => entry.pdfPageNumber === item.sourcePdfPageNumber)
  return {
    kind: 'found',
    analysisStatus: analysis.status,
    label: item.label,
    timing: item.timing,
    weightPercent: item.weightPercent,
    maxScore: item.maxScore,
    rubric: [...item.rubric],
    source: source ? { ...source } : null,
  }
}

// ── §35 노트 (읽기 전용) · §36·37 결과물 ───────────────

export function listStudentNotesMock(studentId: string, sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: AdminNote[] }> {
  return respond(() => {
    requireStudent(studentId)
    const items = store.notes
      .filter((note) => note.studentId === studentId && note.sourceType === sourceType && note.sourceId === sourceId)
      .map(({ studentId: _owner, ...note }) => note)
    return { items }
  })
}

/** 브라우저에서 실제로 보여줄 수 있는 형식만 미리보기 지원으로 본다 (HWP·DOCX·PPTX는 변환기 없음, API-OD-A03) */
const previewSupported = (contentType: string) => contentType === 'application/pdf' || contentType.startsWith('image/')

export function listStudentArtifactsMock(studentId: string, sourceType: AssessmentSourceType, sourceId: string): Promise<{ items: AdminArtifact[] }> {
  return respond(() => {
    requireStudent(studentId)
    const items = store.artifacts
      .filter((artifact) => artifact.studentId === studentId && artifact.sourceType === sourceType && artifact.sourceId === sourceId)
      .map((artifact) => ({
        artifactId: artifact.artifactId,
        sourceType: artifact.sourceType,
        sourceId: artifact.sourceId,
        title: artifact.title,
        versions: store.artifactVersions
          .filter((version) => version.artifactId === artifact.artifactId)
          .sort((a, b) => a.versionNumber - b.versionNumber)
          .map((version) => ({ ...version, previewSupported: previewSupported(version.file.contentType) })),
      }))
    return { items }
  })
}

export function compareArtifactVersionsMock(artifactId: string, fromVersionId: string, toVersionId: string): Promise<ArtifactComparison> {
  return respond(() => {
    const artifact = store.artifacts.find((item) => item.artifactId === artifactId)
    if (!artifact) fail(404, 'ARTIFACT_NOT_FOUND', '결과물을 찾을 수 없어요.')
    requireStudent(artifact.studentId)
    const from = store.artifactVersions.find((version) => version.versionId === fromVersionId)
    const to = store.artifactVersions.find((version) => version.versionId === toVersionId)
    // 같은 결과물의 실제 두 버전인지 검사한다 (§37)
    if (!from || !to || from.artifactId !== artifactId || to.artifactId !== artifactId) fail(400, 'VERSION_MISMATCH', '같은 결과물의 두 버전만 비교할 수 있어요.')
    if (from.versionId === to.versionId) fail(400, 'VERSION_MISMATCH', '서로 다른 두 버전을 골라 주세요.')
    const fields: [string, string, string][] = [
      ['파일 이름', from.file.fileName, to.file.fileName],
      ['형식', from.file.contentType, to.file.contentType],
      ['크기', String(from.file.sizeBytes), String(to.file.sizeBytes)],
      ['변경 메모', from.changeNote ?? '—', to.changeNote ?? '—'],
      ['업로드 시각', from.uploadedAt, to.uploadedAt],
    ]
    return {
      artifactId,
      fromVersionId,
      toVersionId,
      // 구조화 비교 변환기가 없어 파일 메타데이터만 비교한다. 없는 본문 차이를 만들지 않는다 (§37)
      comparison: {
        mode: 'METADATA_ONLY',
        changes: fields.filter(([, a, b]) => a !== b).map(([field, a, b]) => ({ field, from: a, to: b })),
        reason: '이 형식의 본문 비교는 아직 지원하지 않아요. 파일 정보와 변경 메모만 비교해요.',
      },
    }
  })
}

// ── §44·45·46 피드백 ─────────────────────────────────

function toAdminRequest(request: (typeof store.feedbackRequests)[number]): AdminFeedbackRequest {
  const student = store.roster.find((item) => item.studentId === request.studentId)
  const source = sourceTitleOf(request.sourceType, request.sourceId)
  return {
    requestId: request.requestId,
    student: student ? toRef(student) : { studentId: request.studentId, displayName: '알 수 없는 학생', school: { schoolId: '', name: '' }, grade: 0 },
    sourceType: request.sourceType,
    sourceId: request.sourceId,
    sourceTitle: source.title,
    subjectName: subjectNameOf(source.subjectId),
    requestedAt: request.requestedAt,
    status: request.status,
    snapshot: request.snapshot,
    draftSaved: Boolean(store.replyDrafts[request.requestId]),
    deliveredAt: request.deliveredAt ?? null,
  }
}

export function listFeedbackRequestsMock(query: { status?: 'PENDING' | 'DELIVERED'; query?: string; studentId?: string; sourceId?: string } = {}): Promise<{ items: AdminFeedbackRequest[] }> {
  return respond(() => {
    if (scenarioActive('feedbackListError')) fail(503, 'SERVICE_UNAVAILABLE', '피드백 요청 목록을 불러오지 못했어요.')
    if (scenarioActive('empty')) return { items: [] }
    const scope = new Set(inScope().map((student) => student.studentId))
    const items = store.feedbackRequests
      .filter((request) => scope.has(request.studentId))
      .filter((request) => (!query.status || request.status === query.status) && (!query.studentId || request.studentId === query.studentId) && (!query.sourceId || request.sourceId === query.sourceId))
      .map(toAdminRequest)
      .filter((request) => matches(query.query, request.student.displayName, request.sourceTitle, request.subjectName))
      // 요청 순서 그대로 (자동 담당자 배정·우선순위 Routing 없음, ADR-0009)
      .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
    return { items }
  })
}

export function getFeedbackRequestMock(requestId: string): Promise<AdminFeedbackDetail> {
  return respond(() => {
    if (scenarioActive('detailError')) fail(503, 'SERVICE_UNAVAILABLE', '피드백 요청을 불러오지 못했어요.')
    const request = store.feedbackRequests.find((item) => item.requestId === requestId)
    if (!request) fail(404, 'FEEDBACK_REQUEST_NOT_FOUND', '피드백 요청을 찾을 수 없어요.')
    requireStudent(request.studentId)
    const note = store.notes.find((item) => item.revisions.some((revision) => revision.revisionId === request.snapshot.noteRevisionId))
    const snapshotRevision = note?.revisions.find((revision) => revision.revisionId === request.snapshot.noteRevisionId) ?? null
    const latest = note ? Math.max(...note.revisions.map((revision) => revision.revisionNumber)) : null
    const snapshotVersions = request.snapshot.artifactVersionIds.flatMap((versionId) => {
      const version = store.artifactVersions.find((item) => item.versionId === versionId)
      if (!version) return []
      const artifact = store.artifacts.find((item) => item.artifactId === version.artifactId)
      return [{ ...version, artifactTitle: artifact?.title ?? '결과물', previewSupported: previewSupported(version.file.contentType) }]
    })
    return {
      ...toAdminRequest(request),
      snapshotRevision,
      latestRevisionNumber: latest,
      snapshotVersions,
      draft: store.replyDrafts[requestId] ?? null,
      reply: request.reply,
    }
  })
}

function validateComments(requestId: string, draft: FeedbackReplyDraft) {
  const request = store.feedbackRequests.find((item) => item.requestId === requestId)
  if (!request) fail(404, 'FEEDBACK_REQUEST_NOT_FOUND', '피드백 요청을 찾을 수 없어요.')
  requireStudent(request.studentId)
  if (request.status === 'DELIVERED') fail(409, 'FEEDBACK_ALREADY_DELIVERED', '이미 전달한 피드백은 고칠 수 없어요.')
  for (const comment of draft.comments) {
    // 코멘트 대상이 요청 Snapshot에 속한 버전·Revision인지 확인한다 (§45)
    if (comment.artifactVersionId && !request.snapshot.artifactVersionIds.includes(comment.artifactVersionId)) fail(400, 'COMMENT_TARGET_NOT_IN_SNAPSHOT', '요청에 포함되지 않은 파일 버전에는 의견을 달 수 없어요.')
    if (comment.noteRevisionId && comment.noteRevisionId !== request.snapshot.noteRevisionId) fail(400, 'COMMENT_TARGET_NOT_IN_SNAPSHOT', '요청 당시 노트에만 의견을 달 수 있어요.')
  }
  return request
}

export function saveReplyDraftMock(requestId: string, draft: FeedbackReplyDraft): Promise<{ status: 'DRAFT_SAVED'; savedAt: string }> {
  return respond(() => {
    if (scenarioActive('draftSaveError')) fail(503, 'SERVICE_UNAVAILABLE', '임시 저장하지 못했어요. 작성한 내용은 그대로 있어요.')
    validateComments(requestId, draft)
    const savedAt = mockNow()
    store.replyDrafts[requestId] = { ...structuredClone(draft), savedAt }
    // 요청은 계속 PENDING (§45)
    return { status: 'DRAFT_SAVED', savedAt }
  })
}

export function deliverReplyMock(requestId: string, draft: FeedbackReplyDraft): Promise<{ status: 'DELIVERED'; deliveredAt: string }> {
  return respond(() => {
    if (scenarioActive('deliverError') || scenarioActive('deliverErrorOnce')) fail(503, 'SERVICE_UNAVAILABLE', '전달하지 못했어요. 학생에게 아직 보이지 않아요. 작성한 내용은 그대로 있어요.')
    const request = validateComments(requestId, draft)
    if (!draft.overallComment.trim() && draft.comments.length === 0) fail(400, 'VALIDATION_ERROR', '전체 의견이나 위치별 의견을 하나 이상 적어 주세요.')
    const deliveredAt = mockNow()
    const comments: FeedbackComment[] = draft.comments.map((comment, index) => ({ ...comment, commentId: `${requestId}_comment_${index + 1}` }))
    request.reply = { overallComment: draft.overallComment, comments, recommendations: draft.recommendations }
    request.status = 'DELIVERED'
    request.deliveredAt = deliveredAt
    delete store.replyDrafts[requestId]
    return { status: 'DELIVERED', deliveredAt }
  })
}

// ── §38·39 평가계획서 ────────────────────────────────

export function listSchoolsMock(): Promise<{ items: (AdminSchool & { region: string | null; documentCount: number | null; planOperable?: boolean })[] }> {
  return respond(() => {
    const schools = new Map<string, string>()
    for (const student of inScope()) schools.set(student.school.schoolId, student.school.name)
    return {
      items: [...schools].map(([schoolId, name]) => ({
        schoolId,
        name,
        region: null,
        documentCount: store.plans.filter((plan) => plan.schoolId === schoolId).reduce((sum, plan) => sum + plan.revisions.length, 0),
      })),
    }
  })
}

export function listEvaluationPlansMock(query: { schoolId: string; academicYear: number }): Promise<{ items: AdminEvaluationPlan[] }> {
  return respond(() => {
    if (scenarioActive('listError')) fail(503, 'SERVICE_UNAVAILABLE', '평가계획서 목록을 불러오지 못했어요.')
    return { items: store.plans.filter((plan) => plan.schoolId === query.schoolId && plan.academicYear === query.academicYear) }
  })
}

export function listPlanYearsMock(schoolId: string): Promise<number[]> {
  return respond(() => {
    const years = new Set(store.plans.filter((plan) => plan.schoolId === schoolId).map((plan) => plan.academicYear))
    years.add(fixtureCurrentTerm.academicYear)
    return [...years].sort((a, b) => b - a)
  })
}

function newRevision(file: File, sourceUrl: string | null, revisionNumber: number): AdminEvaluationPlanRevision {
  return {
    documentRevisionId: nextMockId('plan_rev'),
    revisionNumber,
    fileName: file.name,
    fileRef: nextMockId('file_plan'),
    sizeBytes: file.size,
    sourceUrl,
    uploadedAt: mockNow(),
    analysisStatus: 'NOT_REQUESTED',
    reviewStatus: 'UNREVIEWED',
    confirmedFields: [],
  }
}

function checkPdf(file: File) {
  if (!(file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf'))) fail(400, 'UNSUPPORTED_FILE_TYPE', 'PDF 파일만 등록할 수 있어요.')
  if (file.size > 50 * 1024 * 1024) fail(400, 'FILE_TOO_LARGE', '50MB 이하 PDF만 등록할 수 있어요. (크기 제한 미확정, API-OD-A03)')
}

export function uploadEvaluationPlanMock(request: { file: File; schoolId: string; academicYear: number; grade: number; semester: number; sourceUrl: string | null }): Promise<AdminEvaluationPlan> {
  return respond(() => {
    if (scenarioActive('uploadError')) fail(503, 'SERVICE_UNAVAILABLE', '업로드하지 못했어요. 파일은 다시 골라 주세요.')
    checkPdf(request.file)
    // 같은 학년·학기 슬롯에 여러 PDF를 허용한다 (§38)
    const plan: AdminEvaluationPlan = {
      planId: nextMockId('plan'),
      schoolId: request.schoolId,
      academicYear: request.academicYear,
      grade: request.grade,
      semester: request.semester,
      revisions: [newRevision(request.file, request.sourceUrl, 1)],
    }
    store.plans.push(plan)
    return plan
  })
}

export function addPlanRevisionMock(planId: string, request: { file: File; sourceUrl: string | null }): Promise<AdminEvaluationPlan> {
  return respond(() => {
    if (scenarioActive('uploadError')) fail(503, 'SERVICE_UNAVAILABLE', '개정본을 올리지 못했어요.')
    const plan = store.plans.find((item) => item.planId === planId)
    if (!plan) fail(404, 'PLAN_NOT_FOUND', '평가계획서를 찾을 수 없어요.')
    checkPdf(request.file)
    // 기존 개정본을 덮어쓰지 않고 새 개정본을 쌓는다 (§38)
    plan.revisions.push(newRevision(request.file, request.sourceUrl, plan.revisions.length + 1))
    return plan
  })
}

function findRevision(planId: string, revisionId: string) {
  const plan = store.plans.find((item) => item.planId === planId)
  const revision = plan?.revisions.find((item) => item.documentRevisionId === revisionId)
  if (!plan || !revision) fail(404, 'PLAN_REVISION_NOT_FOUND', '평가계획서 개정본을 찾을 수 없어요.')
  return { plan, revision }
}

export function requestPlanAnalysisMock(planId: string, revisionId: string): Promise<AdminEvaluationPlanRevision> {
  return respond(() => {
    const { revision } = findRevision(planId, revisionId)
    if (revision.analysisStatus === 'PROCESSING') fail(409, 'ANALYSIS_IN_PROGRESS', '이미 분석 중이에요.')
    // 실제 AI 분석 엔진이 없다 (API-OD-A02·A10). 시연 결과가 준비된 문서만 결과가 생기고, 새로 올린 PDF는 실패로 끝난다.
    revision.analysisStatus = scenarioActive('analysisError') || !fixtureAnalysisResults[revisionId] ? 'FAILED' : fixtureAnalysisResults[revisionId].status
    return revision
  })
}

export function getPlanAnalysisMock(planId: string, revisionId: string): Promise<EvaluationPlanAnalysisView> {
  return respond(() => {
    const { revision } = findRevision(planId, revisionId)
    return {
      planId,
      documentRevisionId: revisionId,
      analysisStatus: revision.analysisStatus,
      reviewStatus: revision.reviewStatus,
      subjects: fixtureAnalysisResults[revisionId]?.subjects ?? [],
      confirmedFields: revision.confirmedFields,
    }
  })
}

export function savePlanReviewMock(
  planId: string,
  revisionId: string,
  request: { confirmedFields: AdminEvaluationPlanRevision['confirmedFields']; decision: 'CONFIRM' | 'SAVE' },
): Promise<AdminEvaluationPlanRevision> {
  return respond(() => {
    const { revision } = findRevision(planId, revisionId)
    if (revision.analysisStatus === 'FAILED' || revision.analysisStatus === 'NOT_REQUESTED') fail(409, 'INVALID_STATE_TRANSITION', '분석 결과가 있는 문서만 확인할 수 있어요.')
    revision.confirmedFields = structuredClone(request.confirmedFields)
    // CONFIRM = 공통 평가정보 확인 (학생 과제 승인/반려가 아니다, §39)
    if (request.decision === 'CONFIRM') revision.reviewStatus = 'CONFIRMED'
    return revision
  })
}

// ── §41 공통 심화 Task ───────────────────────────────

export type CatalogTaskInput = Omit<AdminCatalogTask, 'catalogTaskId' | 'publishState' | 'updatedAt'>

function validateCatalog(input: CatalogTaskInput) {
  const fields: { field: string; reason: string }[] = []
  if (!input.title.trim()) fields.push({ field: 'title', reason: 'Task 제목을 적어 주세요.' })
  if (!input.subjectId) fields.push({ field: 'subjectId', reason: '관련 과목을 골라 주세요.' })
  if (!input.goal.trim()) fields.push({ field: 'goal', reason: '탐구 목표를 적어 주세요.' })
  if (fields.length) invalid(fields)
}

/** 이 공통 Task로 개인 탐구를 시작한 학생 수 (Entity에서 계산) */
const withStartedCount = (task: AdminCatalogTask): AdminCatalogTask => ({
  ...task,
  startedStudentCount: new Set(store.enrichmentTasks.filter((item) => item.catalogTaskId === task.catalogTaskId).map((item) => item.studentId)).size,
})

export function listCatalogMock(query: { query?: string; status?: PublishState } = {}): Promise<{ items: AdminCatalogTask[] }> {
  return respond(() => {
    if (scenarioActive('listError')) fail(503, 'SERVICE_UNAVAILABLE', '심화 Task 목록을 불러오지 못했어요.')
    if (scenarioActive('empty')) return { items: [] }
    return {
      items: store.catalog
        .filter((task) => (!query.status || task.publishState === query.status) && matches(query.query, task.title, task.goal, subjectNameOf(task.subjectId)))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map(withStartedCount),
    }
  })
}

export function getCatalogTaskMock(catalogTaskId: string): Promise<AdminCatalogTask> {
  return respond(() => {
    const task = store.catalog.find((item) => item.catalogTaskId === catalogTaskId)
    if (!task) fail(404, 'CATALOG_TASK_NOT_FOUND', '심화 Task를 찾을 수 없어요.')
    return withStartedCount(task)
  })
}

export function saveCatalogTaskMock(catalogTaskId: string | null, input: CatalogTaskInput, publishState: PublishState): Promise<AdminCatalogTask> {
  return respond(() => {
    if (scenarioActive('contentSaveError')) fail(503, 'SERVICE_UNAVAILABLE', '저장하지 못했어요. 입력한 내용은 그대로 있어요.')
    if (publishState === 'PUBLISHED') validateCatalog(input)
    else if (!input.title.trim()) invalid([{ field: 'title', reason: '임시 저장에도 Task 제목은 필요해요.' }])
    const updatedAt = mockNow()
    if (catalogTaskId) {
      const task = store.catalog.find((item) => item.catalogTaskId === catalogTaskId)
      if (!task) fail(404, 'CATALOG_TASK_NOT_FOUND', '심화 Task를 찾을 수 없어요.')
      // 공통 콘텐츠만 바꾼다. 이미 시작한 학생 개인 EnrichmentTask는 바꾸지 않는다 (§41)
      Object.assign(task, structuredClone(input), { publishState, updatedAt })
      return task
    }
    const task: AdminCatalogTask = { ...structuredClone(input), catalogTaskId: nextMockId('catalog'), publishState, updatedAt }
    store.catalog.push(task)
    return task
  })
}

export function setCatalogPublishMock(catalogTaskId: string, publishState: PublishState): Promise<AdminCatalogTask> {
  return respond(() => {
    const task = store.catalog.find((item) => item.catalogTaskId === catalogTaskId)
    if (!task) fail(404, 'CATALOG_TASK_NOT_FOUND', '심화 Task를 찾을 수 없어요.')
    if (publishState === 'PUBLISHED') validateCatalog(task)
    task.publishState = publishState
    task.updatedAt = mockNow()
    return task
  })
}

/** 대학 문항·모의고사 소재를 공통 Task에 연결한다 (§41 relatedMaterialIds, 대학 문항은 P-27 가정) */
export function linkToCatalogTaskMock(catalogTaskId: string, link: { examQuestionId?: string; materialId?: string; documentId?: string }): Promise<AdminCatalogTask> {
  return respond(() => {
    const task = store.catalog.find((item) => item.catalogTaskId === catalogTaskId)
    if (!task) fail(404, 'CATALOG_TASK_NOT_FOUND', '심화 Task를 찾을 수 없어요.')
    if (link.examQuestionId && !task.relatedExamQuestionIds.includes(link.examQuestionId)) task.relatedExamQuestionIds.push(link.examQuestionId)
    if (link.materialId && !task.relatedMaterialIds.includes(link.materialId)) {
      task.relatedMaterialIds.push(link.materialId)
      const material = store.mockExam.find((item) => item.material.materialId === link.materialId)
      if (material && !material.relatedCatalogTaskIds.includes(catalogTaskId)) material.relatedCatalogTaskIds.push(catalogTaskId)
    }
    if (link.documentId) {
      const resource = store.university.find((item) => item.document.documentId === link.documentId)
      if (resource && !resource.relatedCatalogTaskIds.includes(catalogTaskId)) resource.relatedCatalogTaskIds.push(catalogTaskId)
    }
    task.updatedAt = mockNow()
    return task
  })
}

// ── §40 모의고사 탐구 소재 ───────────────────────────

export function listMockExamMock(): Promise<{ items: AdminMockExamMaterial[] }> {
  return respond(() => {
    if (scenarioActive('listError')) fail(503, 'SERVICE_UNAVAILABLE', '모의고사 탐구 소재를 불러오지 못했어요.')
    if (scenarioActive('empty')) return { items: [] }
    return { items: store.mockExam }
  })
}

export function getMockExamMock(materialId: string): Promise<AdminMockExamMaterial> {
  return respond(() => {
    if (scenarioActive('detailError')) fail(503, 'SERVICE_UNAVAILABLE', '소재를 불러오지 못했어요.')
    const item = store.mockExam.find((entry) => entry.material.materialId === materialId)
    if (!item) fail(404, 'MOCK_EXAM_MATERIAL_NOT_FOUND', '모의고사 탐구 소재를 찾을 수 없어요.')
    return item
  })
}

export interface MockExamInput {
  subjectId: string
  source: MockExamMaterial['source']
  idea: MockExamMaterial['idea']
  internalMemo: string | null
  sourceLicenseNote: string | null
  referenceSourceIds: string[]
  /** 관리자 원문 지문 (P-30 PROPOSED). 학생 공개 카드(material.research.passage)는 바꾸지 않는다 */
  passageText: string
  passageAiTransferAllowed: boolean
}

/** 원문 지문 최대 길이 (P-30 가정: 모의고사 한 지문 + 여유). 서버 계약 확정 시 바뀔 수 있다 */
export const mockExamPassageMaxLength = 20_000

/** 원문 저장 규칙: 바뀐 경우에만 갱신 시각·출처를 바꾼다 (같은 값 재저장은 이력 변화 없음) */
function nextPassage(current: AdminMockExamMaterial['adminPassage'] | undefined, input: MockExamInput, now: string): AdminMockExamMaterial['adminPassage'] {
  const text = input.passageText.replace(/\r\n/g, '\n')
  const changed = !current || current.text !== text
  return {
    text,
    origin: text.trim() === '' ? 'NONE' : changed ? 'ADMIN_INPUT' : current.origin,
    updatedAt: changed ? now : current.updatedAt,
    aiTransferAllowed: text.trim() === '' ? false : input.passageAiTransferAllowed,
  }
}

export function saveMockExamMock(materialId: string | null, input: MockExamInput): Promise<AdminMockExamMaterial> {
  return respond(() => {
    if (scenarioActive('contentSaveError')) fail(503, 'SERVICE_UNAVAILABLE', '저장하지 못했어요. 입력한 내용은 그대로 있어요.')
    const fields: { field: string; reason: string }[] = []
    if (!input.idea.topicTitle.trim()) fields.push({ field: 'topicTitle', reason: '추천 탐구 주제를 적어 주세요.' })
    if (!input.idea.coreMaterial.trim()) fields.push({ field: 'coreMaterial', reason: '소재명(핵심 소재)을 적어 주세요.' })
    if (input.passageText.length > mockExamPassageMaxLength) fields.push({ field: 'passageText', reason: `원문은 ${mockExamPassageMaxLength.toLocaleString()}자까지 저장할 수 있어요.` })
    if (fields.length) invalid(fields)
    const updatedAt = mockNow()
    if (materialId) {
      const item = store.mockExam.find((entry) => entry.material.materialId === materialId)
      if (!item) fail(404, 'MOCK_EXAM_MATERIAL_NOT_FOUND', '모의고사 탐구 소재를 찾을 수 없어요.')
      // 원문 지문(research.passage)·시험 출처 원본 정보는 관리자 수정 대상이 아니다 (원문 그대로 유지)
      item.material.subjectId = input.subjectId
      item.material.source = structuredClone(input.source)
      item.material.idea = structuredClone(input.idea)
      Object.assign(item, {
        internalMemo: input.internalMemo,
        sourceLicenseNote: input.sourceLicenseNote,
        referenceSourceIds: [...input.referenceSourceIds],
        adminPassage: nextPassage(item.adminPassage, input, updatedAt),
        updatedAt,
      })
      return item
    }
    const item: AdminMockExamMaterial = {
      material: { materialId: nextMockId('mock_material'), subjectId: input.subjectId, source: structuredClone(input.source), idea: structuredClone(input.idea) },
      publishState: 'DRAFT',
      internalMemo: input.internalMemo,
      sourceLicenseNote: input.sourceLicenseNote,
      relatedCatalogTaskIds: [],
      referenceSourceIds: [...input.referenceSourceIds],
      origin: 'ADMIN_CREATED',
      updatedAt,
      adminPassage: nextPassage(undefined, input, updatedAt),
    }
    store.mockExam.unshift(item)
    return item
  })
}

export function setMockExamPublishMock(materialId: string, publishState: PublishState): Promise<AdminMockExamMaterial> {
  return respond(() => {
    const item = store.mockExam.find((entry) => entry.material.materialId === materialId)
    if (!item) fail(404, 'MOCK_EXAM_MATERIAL_NOT_FOUND', '모의고사 탐구 소재를 찾을 수 없어요.')
    // 비공개로 바꿔도 이미 시작한 학생 개인 Task는 지우지 않는다 (§40)
    item.publishState = publishState
    item.updatedAt = mockNow()
    return item
  })
}

// ── §42 대학별 자료 ──────────────────────────────────

export function listUniversityMock(): Promise<{ items: AdminUniversityResource[] }> {
  return respond(() => {
    if (scenarioActive('listError')) fail(503, 'SERVICE_UNAVAILABLE', '대학별 자료를 불러오지 못했어요.')
    if (scenarioActive('empty')) return { items: [] }
    return { items: store.university }
  })
}

export function getUniversityMock(documentId: string): Promise<AdminUniversityResource> {
  return respond(() => {
    if (scenarioActive('detailError')) fail(503, 'SERVICE_UNAVAILABLE', '자료를 불러오지 못했어요.')
    const item = store.university.find((entry) => entry.document.documentId === documentId)
    if (!item) fail(404, 'UNIVERSITY_RESOURCE_NOT_FOUND', '대학별 자료를 찾을 수 없어요.')
    return item
  })
}

export interface UniversityMetaInput {
  title: string
  examType: string
  publisher: string
  sourceUrl: string | null
  checkedDate: string | null
  licenseNote: string | null
}

export function updateUniversityMock(documentId: string, input: UniversityMetaInput): Promise<AdminUniversityResource> {
  return respond(() => {
    if (scenarioActive('contentSaveError')) fail(503, 'SERVICE_UNAVAILABLE', '저장하지 못했어요. 입력한 내용은 그대로 있어요.')
    const item = store.university.find((entry) => entry.document.documentId === documentId)
    if (!item) fail(404, 'UNIVERSITY_RESOURCE_NOT_FOUND', '대학별 자료를 찾을 수 없어요.')
    if (!input.title.trim()) invalid([{ field: 'title', reason: '자료명을 적어 주세요.' }])
    if (input.sourceUrl && !/^https?:\/\//.test(input.sourceUrl)) invalid([{ field: 'sourceUrl', reason: 'http(s)로 시작하는 공식 주소를 적어 주세요.' }])
    // 문항 위치·쪽 수·파일 해시는 원본 Manifest 값이라 여기서 바꾸지 않는다
    item.document.title = input.title.trim()
    item.document.examType = input.examType.trim() || item.document.examType
    Object.assign(item, { publisher: input.publisher, sourceUrl: input.sourceUrl, checkedDate: input.checkedDate, licenseNote: input.licenseNote, updatedAt: mockNow() })
    return item
  })
}

export function setUniversityPublishMock(documentId: string, publishState: PublishState): Promise<AdminUniversityResource> {
  return respond(() => {
    const item = store.university.find((entry) => entry.document.documentId === documentId)
    if (!item) fail(404, 'UNIVERSITY_RESOURCE_NOT_FOUND', '대학별 자료를 찾을 수 없어요.')
    // 공개는 공식 주소·이용 조건 확인을 전제로 한다 (§42)
    if (publishState === 'PUBLISHED' && (!item.sourceUrl || !item.checkedDate)) fail(409, 'SOURCE_NOT_VERIFIED', '공식 게시 주소와 확인일을 먼저 적어야 공개할 수 있어요.')
    item.publishState = publishState
    item.updatedAt = mockNow()
    return item
  })
}

// ── §43 참고자료실 ───────────────────────────────────

export function getReferenceCatalogMock() {
  return respond(() => ({ sources: fixtureReferenceSources, areas: fixtureReferenceAreas, basis: referenceSourcesBasis }))
}

export function listScrapsMock(query: { query?: string } = {}): Promise<{ items: ReferenceScrap[] }> {
  return respond(() => {
    if (scenarioActive('listError')) fail(503, 'SERVICE_UNAVAILABLE', '스크랩을 불러오지 못했어요.')
    return {
      items: store.scraps
        .filter((scrap) => matches(query.query, scrap.title, scrap.sourceName, scrap.memo, ...scrap.tags))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    }
  })
}

function validateScrap(request: ScrapRequest) {
  const fields: { field: string; reason: string }[] = []
  if (!request.title.trim()) fields.push({ field: 'title', reason: '자료 제목을 적어 주세요.' })
  if (!/^https?:\/\/\S+$/.test(request.sourceUrl.trim())) fields.push({ field: 'sourceUrl', reason: 'http(s)로 시작하는 주소를 적어 주세요.' })
  if (request.publishedDate && !/^\d{4}-\d{2}-\d{2}$/.test(request.publishedDate)) fields.push({ field: 'publishedDate', reason: 'YYYY-MM-DD 형식으로 적어 주세요.' })
  if (request.referenceSourceId && !fixtureReferenceSources.some((source) => source.sourceId === request.referenceSourceId)) fields.push({ field: 'referenceSourceId', reason: '없는 자료원이에요.' })
  if (fields.length) invalid(fields)
}

export function saveScrapMock(scrapId: string | null, request: ScrapRequest): Promise<ReferenceScrap> {
  return respond(() => {
    if (scenarioActive('scrapSaveError')) fail(503, 'SERVICE_UNAVAILABLE', '저장하지 못했어요. 입력한 내용은 그대로 있어요.')
    validateScrap(request)
    const now = mockNow()
    if (scrapId) {
      const scrap = store.scraps.find((item) => item.scrapId === scrapId)
      if (!scrap) fail(404, 'SCRAP_NOT_FOUND', '스크랩을 찾을 수 없어요.')
      Object.assign(scrap, structuredClone(request), { sourceUrl: request.sourceUrl.trim(), updatedAt: now })
      return scrap
    }
    // 같은 자료원 안에서도 개별 자료(다른 주소)는 각각 새 ID로 저장한다 (요청 ⑤). 완전히 같은 주소만 중복으로 막는다 (중복 클릭·재시도 방어)
    const existing = store.scraps.find((item) => item.sourceUrl === request.sourceUrl.trim())
    if (existing) fail(409, 'SCRAP_ALREADY_EXISTS', '이미 저장한 주소예요. 내 스크랩에서 메모를 고칠 수 있어요.')
    const scrap: ReferenceScrap = { ...structuredClone(request), sourceUrl: request.sourceUrl.trim(), scrapId: nextMockId('scrap'), createdAt: now, updatedAt: now }
    store.scraps.unshift(scrap)
    return scrap
  })
}

export function deleteScrapMock(scrapId: string): Promise<void> {
  return respond(() => {
    const index = store.scraps.findIndex((item) => item.scrapId === scrapId)
    if (index < 0) fail(404, 'SCRAP_NOT_FOUND', '스크랩을 찾을 수 없어요.')
    // 이미 전달한 피드백 추천은 전달 시점의 링크·제목 Projection을 갖고 있어 삭제 영향을 받지 않는다 (§43 보존 정책 검토 중)
    store.scraps.splice(index, 1)
  })
}

// ── §47-A AI 분석 검토 기록 (P-31 PROPOSED) ─────────────

/** 같은 분석을 두 번 확정하면 처음 기록을 돌려준다 (중복 클릭 방어). 공식 평가계획서·학생 기록·Manifest는 바꾸지 않는다 */
export function saveAiReviewMock(request: Omit<AiReviewRecord, 'reviewId' | 'confirmedAt'>): Promise<AiReviewRecord> {
  return respond(() => {
    const existing = store.aiReviews.find((review) => review.analysisId === request.analysisId)
    if (existing) return existing
    const review: AiReviewRecord = { ...structuredClone(request), reviewId: nextMockId('ai_review'), confirmedAt: mockNow() }
    store.aiReviews.unshift(review)
    return review
  })
}

// ── 학생 화면 읽기 전용 보기 (요청 ⑧, P-28 PROPOSED) ──────

/**
 * 한 학생의 Assessment 기록 전체 (Student 화면을 그대로 그리기 위한 읽기 전용 Snapshot).
 * 담당 범위 검사 뒤 그 학생 기록만 담는다 (다른 학생 기록·관리자 답변 초안은 넣지 않는다).
 * 자료함·즐겨찾기는 Student Canonical 학생만 원천이 있다. 시연 학생은 빈 목록이다 (없는 자료를 만들지 않는다).
 */
export function getStudentViewSnapshotMock(studentId: string): Promise<{ student: AdminStudentRef; snapshot: ReadOnlyStudentSnapshot }> {
  return respond(() => {
    if (scenarioActive('detailError')) fail(503, 'SERVICE_UNAVAILABLE', '학생 화면 데이터를 불러오지 못했어요.')
    const student = requireStudent(studentId)
    const strip = <T extends { studentId: string }>(items: T[]) => items.filter((item) => item.studentId === studentId).map(({ studentId: _owner, ...item }) => item)
    const artifacts = strip(store.artifacts)
    const artifactIds = new Set(artifacts.map((artifact) => artifact.artifactId))
    const isCanonical = studentId === canonicalStudentId
    return {
      student: toRef(student),
      snapshot: {
        academicContexts: structuredClone(store.academicContexts[studentId] ?? []),
        schoolAssessments: strip(store.schoolAssessments),
        notes: strip(store.notes),
        artifacts,
        artifactVersions: store.artifactVersions.filter((version) => artifactIds.has(version.artifactId)),
        // 관리자 답변 초안은 학생 화면에 보이지 않는다: 전달된 답변(reply)만 Student 레코드에 있다
        feedbackRequests: strip(store.feedbackRequests),
        enrichmentTasks: strip(store.enrichmentTasks),
        growthRecords: strip(store.growthRecords),
        resources: isCanonical ? structuredClone(fixtureResources) : [],
        favorites: isCanonical ? structuredClone(fixtureFavorites) : [],
      },
    }
  })
}
