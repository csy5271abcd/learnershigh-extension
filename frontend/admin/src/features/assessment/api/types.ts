import type {
  AcademicContext,
  AnalysisSubject,
  ArtifactVersionRecord,
  AssessmentSourceType,
  EnrichmentCatalogItem,
  EnrichmentTask,
  EvaluationPlan,
  FeedbackComment,
  FeedbackRecommendation,
  FeedbackRequestStatus,
  FeedbackSnapshot,
  GrowthRecord,
  MockExamMaterial,
  NoteBlock,
  SchoolAssessment,
  SubjectRef,
  UniversityExamDocument,
} from './canonicalSource.ts'

// Admin Assessment DTO (api-contract.md §33~47, 로컬 DRAFT).
// 학생·수행평가·노트·결과물·피드백·콘텐츠 Entity Type은 Student와 같은 정의를 쓴다 (canonicalSource.ts).
// 계약 예시에 필드 목록이 없어 화면이 가정한 필드는 `P-27` 주석으로 표시한다 (harness-change-proposals.md P-27, PROPOSED).

export type {
  AcademicContext,
  AnalysisSubject,
  AssessmentSourceType,
  EnrichmentCatalogItem,
  EnrichmentTask,
  EvaluationPlan,
  FeedbackComment,
  FeedbackRecommendation,
  FeedbackRequestStatus,
  FeedbackSnapshot,
  GrowthRecord,
  MockExamMaterial,
  NoteBlock,
  SchoolAssessment,
  SubjectRef,
  UniversityExamDocument,
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
}

/** §44 `student`. 학교·학년은 목록 표시용 가정 (P-27). 실제 학생 원천은 기존 LearnersHigh (API-OD-A01) */
export interface AdminStudentRef {
  studentId: string
  displayName: string
  school: { schoolId: string; name: string }
  grade: number
}

/** §47 activity-summary 응답 (상태별 개수는 Entity 상태에서 계산) */
export interface ActivitySummary {
  schoolAssessment: { beforeStart: number; inProgress: number; completed: number }
  enrichmentTask: { beforeStart: number; inProgress: number; completed: number }
  feedback: { pending: number; delivered: number }
}

/** §34 목록 행. 요약 열(다가오는 마감·최근 기록)은 Mockup AM-01·02용 가정 (P-27) */
export interface AdminStudentSummary {
  student: AdminStudentRef
  activity: ActivitySummary
  nextDeadline: { assessmentId: string; title: string; deadlineDate: string } | null
  lastActivityAt: string | null
}

/** §33 overview. kpi는 Entity에서 계산한 값만 담는다 */
export interface AssessmentOverview {
  kpi: {
    registeredStudents: number
    schoolAssessments: number
    enrichmentTasks: number
    feedbackPending: number
    feedbackDelivered: number
  }
  /** Mockup AM-01 첫 카드: 등록 학교 수·평가계획서 PDF 수 (P-27, §38 목록에서 계산) */
  evaluationPlans: { schools: number; documents: number }
  /** 가장 오래 기다린 대기 요청 시각 (P-27) */
  oldestPendingRequestedAt: string | null
  /** 최근 등록 콘텐츠 (P-27: §40·§43에서 계산) */
  contentCounts: { mockExamMaterials: number; scraps: number }
  asOf: string
}

/**
 * 관리자 학생 화면 보기 원천. Mock: snapshot(담당 범위 검사 뒤 Store 사본). http: snapshot은 비우고 httpStudentId만 넘긴다 —
 * iframe의 Student 화면이 GET만 관리자 읽기 전용 경로로 보낸다(학생 Header 없음, 서버가 담당 범위 재검사).
 */
export interface StudentViewSource {
  student: AdminStudentRef
  snapshot: import('./canonicalSource.ts').ReadOnlyStudentSnapshot
  httpStudentId?: string
}

export interface AdminStudentDetail {
  student: AdminStudentRef
  /** 학기별 학업 정보 (§9-1과 같은 Shape). 학생 추가 과목은 `addedByStudent`로 구분 */
  academicContexts: AcademicContext[]
}

/** §36 결과물 + 버전. previewSupported는 §36 응답 항목 */
export interface AdminArtifact {
  artifactId: string
  sourceType: AssessmentSourceType
  sourceId: string
  title: string
  versions: (ArtifactVersionRecord & { previewSupported: boolean })[]
}

/** §37 compare */
export interface ArtifactComparison {
  artifactId: string
  fromVersionId: string
  toVersionId: string
  comparison: { mode: 'METADATA_ONLY' | 'STRUCTURED_DIFF'; changes: { field: string; from: string; to: string }[]; reason: string | null }
}

/** §35 Revision 요약·본문 (읽기 전용) */
export interface AdminNoteRevision {
  revisionId: string
  revisionNumber: number
  savedAt: string
  title: string
  blocks: NoteBlock[]
}

export interface AdminNote {
  noteId: string
  sourceType: AssessmentSourceType
  sourceId: string
  revisions: AdminNoteRevision[]
}

/** §44 요청 목록 행. source 제목·과목은 목록 표시용 가정 (P-27) */
export interface AdminFeedbackRequest {
  requestId: string
  student: AdminStudentRef
  sourceType: AssessmentSourceType
  sourceId: string
  sourceTitle: string
  subjectName: string | null
  requestedAt: string
  status: FeedbackRequestStatus
  snapshot: FeedbackSnapshot
  /** 관리자 초안 존재 여부 (§45 DRAFT_SAVED, 학생에게 보이지 않음) */
  draftSaved: boolean
  deliveredAt: string | null
}

/** §45 reply-draft 요청 (commentId는 서버가 붙인다) */
export interface FeedbackReplyDraft {
  overallComment: string
  comments: Omit<FeedbackComment, 'commentId'>[]
  recommendations: FeedbackRecommendation[]
}

export interface AdminFeedbackDetail extends AdminFeedbackRequest {
  /** 요청 당시 Snapshot의 노트 Revision (최신 노트로 갈아끼우지 않는다) */
  snapshotRevision: AdminNoteRevision | null
  latestRevisionNumber: number | null
  snapshotVersions: (ArtifactVersionRecord & { artifactTitle: string; previewSupported: boolean })[]
  draft: (FeedbackReplyDraft & { savedAt: string }) | null
  reply: { overallComment: string; comments: FeedbackComment[]; recommendations: FeedbackRecommendation[] } | null
}

/** §38 응답 + 개정 이력. analysisStatus / reviewStatus Enum은 미정 (MM-45, API-OD-A02) — 화면은 아래 값만 가정 */
// PARTIAL(A3.5, 2026-11-14): 분석기가 부분 결과로 판정해 저장된 Run. 성공(REVIEW_REQUIRED)과 구분해서 보여 준다
export type PlanAnalysisStatus = 'NOT_REQUESTED' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'PARTIAL' | 'COMPLETED' | 'FAILED'
export type PlanReviewStatus = 'UNREVIEWED' | 'CONFIRMED'

/**
 * 평가계획서 Revision 원문 파일 (§48 모양, S-4 2026-11-13). Backend가 원문을 보관하면 available=true.
 * previewAvailable: 서비스 안 미리보기 가능(현재 PDF만). HWP·HWPX는 검증된 변환 엔진이 없어 false.
 */
export interface PlanFileMeta {
  fileRef: string | null
  fileName: string
  contentType: string
  sizeBytes: number
  checksum: string
  documentFormat: 'PDF' | 'HWP' | 'HWPX'
  pageCount: number | null
  available: boolean
  previewAvailable: boolean
}

export interface AdminEvaluationPlanRevision {
  documentRevisionId: string
  revisionNumber: number
  fileName: string
  /** 불투명 파일 참조(plan_file_…, http). 원문을 보관하지 않은 이전 등록분은 null. Mock은 시연용 문자열 */
  fileRef: string | null
  /** 원문 보관·미리보기 상태 (http). Mock에는 없다(실제 파일 없음) */
  file?: PlanFileMeta | null
  sizeBytes: number | null
  /** Backend가 계산한 PDF 쪽 수 (http). Mock에는 없다 */
  pageCount?: number | null
  /** 서버가 저장한 원본 SHA-256 (§48 checksum, http). 원본 대조용. Mock에는 없다 */
  checksum?: string | null
  /** 원본 형식 (http, 다중 형식 실험 — 공식 Enum 아님). Mock에는 없다(= PDF) */
  documentFormat?: 'PDF' | 'HWP' | 'HWPX'
  sourceUrl: string | null
  uploadedAt: string
  analysisStatus: PlanAnalysisStatus
  reviewStatus: PlanReviewStatus
  /** 수동 정정·확인한 필드 (§39 confirmedFields) */
  /** C-7: 계약·Backend는 subjectId. http Adapter는 과목 이름 원천이 없어 subjectName에 subjectId를 넣고 subjectId도 보존한다 */
  confirmedFields: { subjectName: string; subjectId?: string; fieldPath: string; value: string | number | null; pdfPageNumber: number | null; documentLocatorText?: string | null }[]
}

export interface AdminEvaluationPlan {
  planId: string
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  revisions: AdminEvaluationPlanRevision[]
}

export interface AdminSchool {
  schoolId: string
  name: string
}

export interface EvaluationPlanAnalysisView {
  planId: string
  documentRevisionId: string
  analysisStatus: PlanAnalysisStatus
  reviewStatus: PlanReviewStatus
  subjects: AnalysisSubject[]
  confirmedFields: AdminEvaluationPlanRevision['confirmedFields']
  /** 아래는 Backend §39 GET이 주는 값 (http). Mock에는 없다 */
  analysisId?: string | null
  analyzer?: { origin: string; name: string; version: string } | null
  receivedAt?: string | null
  /** 분석기 경고(ANALYZER)와 서버 검사 경고(SERVER). 값을 고치지 않고 경고만 남긴다 */
  warnings?: { source: string; message: string }[]
  /** 이 Revision 파일 정보 (http). 원본 대조에 쓴다 */
  revisionFile?: { fileName: string; pageCount: number | null; checksum: string | null; documentFormat: 'PDF' | 'HWP' | 'HWPX'; file?: PlanFileMeta | null }
  /** HWP·HWPX 검토 기록 (http, 확정 뒤) */
  sourceReview?: PlanSourceReview | null
  /** 검토 확정에 쓸 수 있는 후보 필드 (http). Backend fieldPath 규칙 안의 단일 값만 */
  reviewFields?: ReviewFieldCandidate[]
  /** 과목별 원문 쪽 범위 (http) */
  subjectPages?: { subjectName: string; from: number | null; to: number | null }[]
  /** 수행 항목의 활동·제출물·조건 (http). 화면 AnalysisSubject Type에 없는 후보 값을 그대로 보여주기 위해 따로 둔다 */
  /** 문서 슬롯 (http): 학교·학년도·학년·학기. 검토 화면 머리글에 쓴다 */
  slot?: { schoolId: string; academicYear: number; grade: number; semester: number }
  itemDetails?: {
    /** 분석 결과 안 순번 (subjects[subjectIndex].performanceEvaluation.items[itemIndex]) — 확정 fieldPath와 같은 기준 */
    subjectIndex?: number
    itemIndex?: number
    subjectName: string
    itemKey: string
    label: string
    content: string | null
    submissions: string[]
    conditions: string[]
    /** 채점기준표 후보 (A4): 평가 요소 → 수행 수준(문장·배점). 배점이 없으면 null(0 아님). sourcePages는 PDF 근거 쪽 */
    rubric: { element: string; levels: { description: string; score: number | null }[]; sourcePages: number[] }[]
  }[]
}

/** 검토 확정 후보 필드 하나 (http Adapter가 분석 후보에서 만든다. 값은 바꾸지 않는다) */
export interface ReviewFieldCandidate {
  subjectIndex: number
  subjectName: string
  fieldPath: string
  label: string
  kind: 'number' | 'text'
  candidate: number | string | null
  /** 이 값의 근거로 분석기가 보낸 PDF 쪽 (없으면 빈 배열 — 관리자가 원본에서 찾아 입력) */
  sourcePages: number[]
  /** HWP·HWPX 근거 위치 설명 (예: "구역 0 · 표 1 · 6행 5열 · 25%"). 쪽 번호로 바꾸지 않는다 */
  sourceLocators: string[]
  /** sourceLocators와 같은 순서의 구조 Locator 원본(HWP·HWPX). 확정 요청에 그대로 보낸다(서버가 이 Run의 근거인지 다시 확인) */
  documentLocators: ReviewDocumentLocator[]
}

/** HWP·HWPX 구조 Locator (분석 수신 Shape 그대로) */
export interface ReviewDocumentLocator {
  kind: string
  section: number
  path: string
  table?: number | null
  row?: number | null
  col?: number | null
  rowSpan?: number | null
  colSpan?: number | null
  control?: string | null
  cell?: string | null
}

/** HWP·HWPX 검토 기록(관리자 재조회). reviewerAuth=MOCK_HEADER면 개발용 Mock 관리자 기록(운영 검토 실적 아님) */
export interface PlanSourceReview {
  reviewId: string
  analysisId: string
  reviewedBy: string
  reviewedAt: string
  reviewerAuth: 'MOCK_HEADER' | 'VERIFIED'
  sourceCheckMethod: string
  sourceCheckSha256: string
  manualComparisonConfirmed: boolean
  confirmedFieldCount: number
}

/** §39 PUT review 요청 (Backend 계약 Shape) */
export interface PlanReviewConfirmRequest {
  analysisId: string
  decision: 'CONFIRM'
  reviewedSubjects: {
    subjectId: string
    /** HWP·HWPX만: 분석 결과 subjects[] 안의 번호 */
    analysisSubjectIndex?: number
    confirmedFields: {
      fieldPath: string
      value: number | string | null
      pdfPageNumber: number | null
      /** HWP·HWPX만: 확인한 원문 위치 */
      documentLocator?: ReviewDocumentLocator
      /** HWP·HWPX만: 값 null = 원문에 없음을 확인 */
      absence?: 'NOT_IN_SOURCE'
    }[]
  }[]
  /** HWP·HWPX만: 로컬 원본 SHA-256(브라우저 계산)과 명시적 수동 대조 확인 */
  sourceCheck?: { method: 'LOCAL_FILE_EXTERNAL_VIEWER'; localFileSha256: string; manualComparisonConfirmed: true }
}

export type PublishState = 'PUBLISHED' | 'DRAFT'

/**
 * §41 공통 심화 Task. Student 공개 DTO(EnrichmentCatalogItem: title·subjectId·goal·methods·published)에
 * §41 요청 필드를 더한 관리자 Record. 대학 문항·참고자료원 연결은 §41에 없어 가정 (P-27).
 */
export interface AdminCatalogTask {
  catalogTaskId: string
  title: string
  subjectId: string
  curriculumConcept: string | null
  inquiryType: string | null
  difficulty: string | null
  problem: string | null
  goal: string
  methods: string[]
  resources: string[]
  expectedArtifacts: string[]
  selfCheckItems: string[]
  relatedMaterialIds: string[]
  relatedExamQuestionIds: string[]
  referenceSourceIds: string[]
  publishState: PublishState
  updatedAt: string
  /** 이 Task로 개인 심화 탐구를 시작한 학생 수 (P-27: 학생 EnrichmentTask.catalogTaskId에서 계산, 목록·상세 응답 가정) */
  startedStudentCount?: number
}

/** §40 관리자 Record. Student 공개 Shape(MockExamMaterial)을 그대로 두고 관리 필드만 더한다 */
export interface AdminMockExamMaterial {
  material: MockExamMaterial
  publishState: PublishState
  internalMemo: string | null
  sourceLicenseNote: string | null
  relatedCatalogTaskIds: string[]
  referenceSourceIds: string[]
  /** 60선 원본(Student Canonical)인지, 관리자가 새로 등록한 소재인지 */
  origin: 'CANONICAL_60' | 'ADMIN_CREATED'
  updatedAt: string | null
  /** 관리자 원문 지문 (요청 ③, P-30 PROPOSED). 학생 공개 Shape(material)과 분리해 학생에게 자동 공개하지 않는다 */
  adminPassage: AdminMockExamPassage
}

/**
 * 관리자 원문 지문 (P-30 PROPOSED). §40에 원문 필드가 없어 화면이 가정한 Shape이다.
 * - LOCAL_FILE: Git 제외 로컬 파일(mockExamPassages.local.json)에서 붙은 원문. ADMIN_INPUT: 관리자가 이 화면에서 입력한 원문.
 * - aiTransferAllowed: 원문 이용 조건상 외부 AI Provider로 보내도 된다고 관리자가 확인했는지. false면 AI 분석 요청을 막는다.
 * - Stage 1에서는 Admin In-memory Store에만 있다 (새로고침하면 사라짐, Git·브라우저 저장소에 쓰지 않음).
 */
export interface AdminMockExamPassage {
  text: string
  origin: 'NONE' | 'LOCAL_FILE' | 'ADMIN_INPUT'
  updatedAt: string | null
  aiTransferAllowed: boolean
}

/** §42 관리자 Record. 문서·문항 메타데이터(Manifest)는 Student와 같은 원본 */
export interface AdminUniversityResource {
  document: UniversityExamDocument
  publishState: PublishState
  publisher: string
  sourceUrl: string | null
  checkedDate: string | null
  licenseNote: string | null
  relatedCatalogTaskIds: string[]
  updatedAt: string | null
}

/** AI 분석 관리자 검토 기록 (P-31 PROPOSED). 후보 확인 기록일 뿐 공식 값·학생 기록·Manifest를 바꾸지 않는다 */
export interface AiReviewRecord {
  reviewId: string
  analysisId: string
  kind: 'EVALUATION_PLAN' | 'UNIVERSITY_EXAM' | 'MOCK_EXAM'
  sourceSha256: string
  sourceName: string | null
  /** 관리자가 고친 값 (경로 → 값) */
  edits: Record<string, string>
  confirmedAt: string
}

export type ScrapType = 'SITE' | 'ARTICLE' | 'PAPER' | 'VIDEO' | 'STATISTICS' | 'OTHER'

/**
 * §43 스크랩 = 개별 참고자료(ReferenceItem). 자료원(ReferenceSource, 24곳) 하나에 여러 개를 저장할 수 있다 (요청 ⑤).
 * 식별자는 scrapId이고 자료원 ID(referenceSourceId)는 연결일 뿐이다 — 같은 자료원에서 저장한 자료끼리 덮어쓰지 않는다.
 * 기본 비공개 (학생 화면에 자동 노출하지 않음).
 */
export interface ReferenceScrap {
  scrapId: string
  title: string
  sourceUrl: string
  sourceName: string | null
  /** 추천 자료원에서 저장한 경우 그 자료원 ID (P-27) */
  referenceSourceId: string | null
  type: ScrapType
  memo: string | null
  tags: string[]
  subjectIds: string[]
  /** 작성자 또는 기관 (P-32 PROPOSED, §43에 없음) */
  authorOrOrg: string | null
  /** 발행일 YYYY-MM-DD (P-32 PROPOSED) */
  publishedDate: string | null
  /** 관련 심화 Task·모의고사 소재 (P-32 PROPOSED) */
  relatedCatalogTaskIds: string[]
  relatedMaterialIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ScrapRequest {
  title: string
  sourceUrl: string
  sourceName: string | null
  referenceSourceId: string | null
  type: ScrapType
  memo: string | null
  tags: string[]
  subjectIds: string[]
  authorOrOrg: string | null
  publishedDate: string | null
  relatedCatalogTaskIds: string[]
  relatedMaterialIds: string[]
}

/** A5 공유 검토 초안 (DRAFT §39-4). 학생 공개 아님. 서버 저장이 끝난 값만 '저장됨'으로 표시한다 */
export type PlanReviewDraftDecisionKind = 'CONFIRMED' | 'EDITED' | 'ABSENT'
export interface PlanReviewDraftDecision {
  subjectIndex: number
  fieldPath: string
  decision: PlanReviewDraftDecisionKind
  value: string | null
  pdfPageNumber: number | null
  /** 응답에만: 저장 당시 서버가 분석 결과에서 읽은 후보값 */
  candidate?: unknown
}
export interface PlanReviewDraftView {
  planId: string
  revisionId: string
  latestAnalysisId: string | null
  reviewStatus: PlanReviewStatus
  draft: {
    draftId: string
    analysisId: string
    status: 'ACTIVE' | 'CLOSED'
    closedReason: string | null
    version: number
    decisions: PlanReviewDraftDecision[]
    subjectLinks: { subjectIndex: number; subjectId: string }[]
    decisionCount: number
    analyzerVersion: string
    createdBy: string
    createdAt: string
    updatedBy: string
    updatedAt: string
  } | null
  history: { version: number; savedBy: string; savedAt: string; changedCount: number; changedFields: string[] }[]
  previousDrafts: { draftId: string; analysisId: string; status: string; version: number; decisionCount: number; updatedBy: string; updatedAt: string }[]
}
export interface PlanReviewDraftSaveRequest {
  analysisId: string
  baseVersion: number | null
  decisions: Omit<PlanReviewDraftDecision, 'candidate'>[]
  subjectLinks: { subjectIndex: number; subjectId: string }[]
}

/** A5 학교 검색 (DRAFT §38-3). coverage=REGISTERED_PLANS_ONLY: 평가계획서가 등록된 학교만 — 전체 학교 목록이 아니다 */
export interface SchoolSearchResult {
  coverage: string
  masterConnected: boolean
  truncated: boolean
  items: { schoolId: string; name: string | null; nameSource: string | null; planCount: number; latestAcademicYear: number | null }[]
}
