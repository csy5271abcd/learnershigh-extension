import type {
  ActivitySummary,
  AssessmentOverview,
  AdminArtifact,
  AdminFeedbackDetail,
  AdminFeedbackRequest,
  AdminNote,
  AdminStudentDetail,
  AdminStudentRef,
  AdminStudentSummary,
  AssessmentSourceType,
  FeedbackReplyDraft,
  GrowthRecord,
  ReferenceScrap,
  ScrapRequest,
  StudentViewSource,
  ArtifactComparison,
} from '../types.ts'
import type { ReadOnlyStudentSnapshot } from '../canonicalSource.ts'
import type { getStudentSourceMock } from '../mock/assessmentAdminMock.ts'
import { adminFile, adminHttp } from './adminHttpClient.ts'

// Admin 학생 기록·피드백·참고자료실 HTTP Adapter (2026-11-11, api-contract.md §34·35·36·43·44·45).
// Mock Adapter와 같은 함수 시그니처·같은 Shape. 담당 범위 검사는 Backend가 한다(화면 숨김으로 대신하지 않음).

const base = '/api/admin/assessment'
const enc = encodeURIComponent

type Term = { academicYear: number; semester: number }

/**
 * 부록 O §9-2: 현재 학년도·학기는 서버(GET /api/admin/assessment/current-term, KST 달력)가 정한다 — 설정(VITE_*) 불필요.
 * 서버 응답 전·실패 시에는 서버와 같은 규칙(3~8월 1학기, 9~2월 2학기, 1·2월은 전년도)의 KST 달력 값을 쓴다.
 */
export function calendarTerm(now: Date = new Date()): Term {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric' }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  if (month <= 2) return { academicYear: year - 1, semester: 2 }
  return { academicYear: year, semester: month <= 8 ? 1 : 2 }
}

let serverTerm: Term | null = null
let pendingTerm: Promise<Term> | null = null

/** 서버 현재 학기(한 번 받아 둔다) */
export function currentTermAsync(): Promise<Term> {
  if (serverTerm) return Promise.resolve(serverTerm)
  pendingTerm ??= adminHttp<Term>(`${base}/current-term`).then(
    (term) => (serverTerm = { academicYear: term.academicYear, semester: term.semester }),
    () => {
      pendingTerm = null
      return calendarTerm()
    },
  )
  return pendingTerm
}

/** 지금 알고 있는 현재 학기(서버 값이 오기 전이면 같은 규칙의 KST 달력 값) */
export function currentTerm(): Term {
  return serverTerm ?? calendarTerm()
}

interface StudentListQuery {
  query?: string
  term?: { academicYear: number; semester: number }
  schoolId?: string
  grade?: number
  status?: 'BEFORE_START' | 'IN_PROGRESS' | 'COMPLETED'
  subjectName?: string
}

const statusKey = { BEFORE_START: 'beforeStart', IN_PROGRESS: 'inProgress', COMPLETED: 'completed' } as const

/**
 * §34 담당 학생 목록. 학교·학년·상태 필터는 Backend에 없어(계약 "필터 미구현") query와 학기만 서버로 보내고,
 * 서버가 돌려준 **담당 지점 학생 목록 안에서만** 학교·학년·상태(해당 학기 수행평가가 그 상태로 1건 이상)를 거른다.
 * 서버 권한 범위를 넓히지 않는다. 과목 필터는 목록 응답에 수강 과목이 없어 http에서는 적용하지 않는다.
 */
/** §33 Assessment 현황 (A12): 서버가 요청 시점 DB에서 계산한 값. 학기는 서버 현재 학기(currentTermAsync)를 보낸다 */
export async function getOverviewHttp(query: { schoolId?: string; grade?: number } = {}): Promise<AssessmentOverview> {
  const term = await currentTermAsync()
  return adminHttp<AssessmentOverview>(`${base}/overview`, { query: { schoolId: query.schoolId, grade: query.grade, academicYear: term.academicYear, semester: term.semester } })
}

export async function listStudentsHttp(query: StudentListQuery = {}): Promise<{ items: AdminStudentSummary[] }> {
  const term = query.term ?? (await currentTermAsync())
  const response = await adminHttp<{ items: AdminStudentSummary[] }>(`${base}/students`, {
    query: { academicYear: term.academicYear, semester: term.semester, query: query.query },
  })
  const items = response.items.filter(
    (item) =>
      (!query.schoolId || item.student.school.schoolId === query.schoolId) &&
      (!query.grade || item.student.grade === query.grade) &&
      (!query.status || item.activity.schoolAssessment[statusKey[query.status]] > 0),
  )
  return { ...response, items }
}

/** 학생 목록 필터 선택지 (http): 담당 학생 목록(서버)에서 학교를 모으고, 학기는 현재 학년도 1·2학기. 과목 선택지는 http에서 제공하지 않는다. */
export async function getStudentFilterOptionsHttp(query: { schoolId?: string; grade?: number; term?: { academicYear: number; semester: number } } = {}) {
  const term = query.term ?? (await currentTermAsync())
  const list = await adminHttp<{ items: AdminStudentSummary[] }>(`${base}/students`, { query: { academicYear: term.academicYear, semester: term.semester } })
  const schools = new Map<string, string>()
  for (const item of list.items) if (item.student.school.schoolId) schools.set(item.student.school.schoolId, item.student.school.name)
  return {
    schools: [...schools].map(([schoolId, name]) => ({ schoolId, name })).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    terms: [2, 1].map((semester) => ({ academicYear: term.academicYear, semester })),
    subjectNames: [] as string[],
  }
}

/** 학생 화면 보기(http): 담당 범위 확인 겸 학생 정보를 읽고, 기록은 iframe이 관리자 읽기 전용 경로로 직접 조회한다 */
export async function getStudentViewSourceHttp(studentId: string): Promise<StudentViewSource> {
  const detail = await getStudentHttp(studentId)
  const empty: ReadOnlyStudentSnapshot = {
    academicContexts: [], schoolAssessments: [], notes: [], artifacts: [], artifactVersions: [], feedbackRequests: [],
    enrichmentTasks: [], growthRecords: [], resources: [], favorites: [],
  }
  return { student: detail.student, snapshot: empty, httpStudentId: detail.student.studentId }
}

export async function getStudentHttp(studentId: string): Promise<AdminStudentDetail> {
  return adminHttp<AdminStudentDetail>(`${base}/students/${enc(studentId)}`, { query: { academicYear: (await currentTermAsync()).academicYear } })
}

export async function getActivitySummaryHttp(query: { studentId: string; academicYear: number; semester: number }): Promise<ActivitySummary> {
  const list = await listStudentsHttp({ query: query.studentId, term: { academicYear: query.academicYear, semester: query.semester } })
  const found = list.items.find((item) => item.student.studentId === query.studentId)
  if (!found) throw new Error('학생 활동 현황을 찾을 수 없어요.')
  return found.activity
}

interface BackendStudentAssessment {
  student: AdminStudentRef
  /** Backend §12 응답(학년도·학기·설명 포함) */
  assessment: Record<string, unknown> & { academicYear: number; semester: number; evaluationItemRef: unknown }
  grade: number | null
}

type StudentSource = Awaited<ReturnType<typeof getStudentSourceMock>>
type SchoolSource = Extract<StudentSource, { kind: 'school' }>

/** §34 학생 수행평가 단건 (관리자 학생 기록 화면). 평가 기준 후보 연결은 이 화면에서 아직 하지 않는다. */
export async function getStudentSourceHttp(studentId: string, sourceType: AssessmentSourceType, sourceId: string): Promise<StudentSource> {
  if (sourceType !== 'SCHOOL_ASSESSMENT') throw new Error('학교 수행평가만 열람할 수 있어요.')
  const body = await adminHttp<BackendStudentAssessment>(`${base}/students/${enc(studentId)}/school-assessments/${enc(sourceId)}`)
  // §12 응답에는 학년도·학기가 없다(계약 Shape). 비어 있으면 학생 상세의 학기별 학업 Context(§9-1)에서
  // 이 수행평가 과목 ID가 수강 과목인 학기를 찾는다(과목 ID는 학년·학기 슬롯마다 다르다). 못 찾으면 비워 둔다(추측하지 않음).
  let academicYear: number | undefined = typeof body.assessment.academicYear === 'number' ? body.assessment.academicYear : undefined
  let semester: number | undefined = typeof body.assessment.semester === 'number' ? body.assessment.semester : undefined
  if (academicYear === undefined || semester === undefined) {
    const detail = await getStudentHttp(studentId)
    const subjectId = (body.assessment as { subjectId?: string }).subjectId
    const owner = detail.academicContexts.find((context) => context.subjects.some((subject) => subject.subjectId === subjectId))
    academicYear = academicYear ?? owner?.academicYear
    semester = semester ?? owner?.semester
  }
  const source: SchoolSource = {
    kind: 'school',
    student: body.student,
    assessment: body.assessment as unknown as SchoolSource['assessment'],
    planFileName: null,
    planId: null,
    criteria: (body.assessment.evaluationItemRef ? { kind: 'analysisUnavailable' } : { kind: 'unlinked' }) as SchoolSource['criteria'],
    linkedTasks: [],
    term: { academicYear: academicYear as number, semester: semester as number, grade: body.grade },
  }
  return source
}

export const listStudentNotesHttp = (studentId: string, sourceType: AssessmentSourceType, sourceId: string) =>
  adminHttp<{ items: AdminNote[] }>(`${base}/students/${enc(studentId)}/notes`, { query: { sourceType, sourceId } })

export const listStudentArtifactsHttp = (studentId: string, sourceType: AssessmentSourceType, sourceId: string) =>
  adminHttp<{ items: AdminArtifact[] }>(`${base}/students/${enc(studentId)}/artifacts`, { query: { sourceType, sourceId } })

export const listStudentGrowthRecordsHttp = (studentId: string) =>
  adminHttp<{ items: GrowthRecord[] }>(`${base}/students/${enc(studentId)}/growth-records`)

// ---- §44·45 피드백 ----

export const listFeedbackRequestsHttp = (query: { status?: 'PENDING' | 'DELIVERED'; query?: string; studentId?: string; sourceId?: string } = {}) =>
  adminHttp<{ items: AdminFeedbackRequest[] }>(`${base}/feedback-requests`, { query })

export const getFeedbackRequestHttp = (requestId: string) => adminHttp<AdminFeedbackDetail>(`${base}/feedback-requests/${enc(requestId)}`)

export const saveReplyDraftHttp = (requestId: string, draft: FeedbackReplyDraft) =>
  adminHttp<{ status: 'DRAFT_SAVED'; savedAt: string }>(`${base}/feedback-requests/${enc(requestId)}/reply-draft`, { method: 'PUT', json: draft })

export const deliverReplyHttp = (requestId: string, draft: FeedbackReplyDraft) =>
  adminHttp<{ status: 'DELIVERED'; deliveredAt: string }>(`${base}/feedback-requests/${enc(requestId)}/deliver`, { method: 'POST', json: draft })

// ---- §43 참고자료실 ----

/** Backend 응답은 ReferenceScrap + 공개 상태 */
export type ReferenceScrapWithVisibility = ReferenceScrap & { published: boolean; publishedAt: string | null }

export async function listScrapsHttp(query: { query?: string } = {}): Promise<{ items: ReferenceScrapWithVisibility[] }> {
  const body = await adminHttp<{ items: ReferenceScrapWithVisibility[] }>(`${base}/reference-library`, { query: { query: query.query, size: 100 } })
  return { items: body.items }
}

export function saveScrapHttp(scrapId: string | null, request: ScrapRequest): Promise<ReferenceScrapWithVisibility> {
  return scrapId
    ? adminHttp<ReferenceScrapWithVisibility>(`${base}/reference-library/${enc(scrapId)}`, { method: 'PATCH', json: request })
    : adminHttp<ReferenceScrapWithVisibility>(`${base}/reference-library`, { method: 'POST', json: request })
}

/** 학생 공개/비공개 (기본 비공개). 공개한 자료만 학생 자료함의 "선생님이 공개한 자료"에 보인다. */
// ---- §26 미리보기·원본 · §37 비교 (2026-11-11) ----
export const previewArtifactVersionHttp = (artifactId: string, versionId: string) =>
  adminFile(`${base}/artifacts/${enc(artifactId)}/versions/${enc(versionId)}/preview`)
export const downloadArtifactVersionHttp = (artifactId: string, versionId: string) =>
  adminFile(`${base}/artifacts/${enc(artifactId)}/versions/${enc(versionId)}/file`)
/** §26-1 A28-41 학생 노트 첨부(담당 학생만, 서버가 범위 검사) */
export const previewNoteAttachmentHttp = (attachmentId: string) => adminFile(`${base}/note-attachments/${enc(attachmentId)}/preview`)
export const downloadNoteAttachmentHttp = (attachmentId: string) => adminFile(`${base}/note-attachments/${enc(attachmentId)}/file`)

const compareLabels: Record<string, string> = {
  fileName: '파일 이름',
  contentType: '형식',
  sizeBytes: '크기',
  sha256: '파일 지문(SHA-256)',
  changeNote: '변경 메모',
  uploadedAt: '업로드 시각',
}

/** §37 비교. 화면 Type(한국어 항목명·문자열 값)에 맞춰 옮긴다. 서버가 낸 차이만 보여준다(없는 차이를 만들지 않음) */
export async function compareArtifactVersionsHttp(artifactId: string, fromVersionId: string, toVersionId: string): Promise<ArtifactComparison> {
  const body = await adminHttp<{
    artifactId: string
    fromVersionId: string
    toVersionId: string
    comparison: { mode: 'METADATA_ONLY' | 'STRUCTURED_DIFF'; changes: { field: string; from: unknown; to: unknown }[]; reason: string | null }
  }>(`${base}/artifacts/${enc(artifactId)}/compare`, { query: { fromVersionId, toVersionId } })
  const text = (value: unknown) => (value === null || value === undefined ? '—' : String(value))
  return {
    artifactId: body.artifactId,
    fromVersionId: body.fromVersionId,
    toVersionId: body.toVersionId,
    comparison: {
      mode: body.comparison.mode,
      reason: body.comparison.reason,
      changes: body.comparison.changes.map((change) => ({
        field: compareLabels[change.field] ?? change.field,
        from: change.field === 'sha256' ? `${text(change.from).slice(0, 16)}…` : text(change.from),
        to: change.field === 'sha256' ? `${text(change.to).slice(0, 16)}…` : text(change.to),
      })),
    },
  }
}

// ---- §43-1 DRAFT 관리자 참고자료 파일 업로드 (영상·사진·문서, 관리자 전용) ----
/** 메타정보(JSON part) + 파일을 한 번에 저장한다. 업로드 스크랩만 sourceUrl 선택 */
export function uploadScrapHttp(metadata: ScrapRequest, file: File): Promise<ReferenceScrapWithVisibility> {
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify({ ...metadata, sourceUrl: metadata.sourceUrl?.trim() ? metadata.sourceUrl.trim() : null })], { type: 'application/json' }))
  form.append('file', file, file.name)
  return adminHttp<ReferenceScrapWithVisibility>(`${base}/reference-library/uploads`, { method: 'POST', form })
}
export function attachScrapFileHttp(scrapId: string, file: File): Promise<ReferenceScrapWithVisibility> {
  const form = new FormData()
  form.append('file', file, file.name)
  return adminHttp<ReferenceScrapWithVisibility>(`${base}/reference-library/${enc(scrapId)}/file`, { method: 'POST', form })
}
export const detachScrapFileHttp = (scrapId: string) =>
  adminHttp<ReferenceScrapWithVisibility>(`${base}/reference-library/${enc(scrapId)}/file`, { method: 'DELETE' })
export const downloadScrapFileHttp = (scrapId: string) => adminFile(`${base}/reference-library/${enc(scrapId)}/file`)
export const previewScrapFileHttp = (scrapId: string) => adminFile(`${base}/reference-library/${enc(scrapId)}/file/preview`)

/** §43 DELETE = 소프트 삭제(휴지통). 만든 관리자만. 영구 삭제는 없다 */
export const deleteScrapHttp = (scrapId: string) => adminHttp<void>(`${base}/reference-library/${enc(scrapId)}`, { method: 'DELETE' })
export const listScrapTrashHttp = () =>
  adminHttp<{ items: { scrap: ReferenceScrap; deletedAt: string }[] }>(`${base}/reference-library/trash`)
export const restoreScrapHttp = (scrapId: string) =>
  adminHttp<ReferenceScrap>(`${base}/reference-library/${enc(scrapId)}/restore`, { method: 'POST' })

export const setScrapPublishedHttp = (scrapId: string, published: boolean) =>
  adminHttp<ReferenceScrapWithVisibility>(`${base}/reference-library/${enc(scrapId)}/visibility`, { method: 'PUT', json: { published } })
