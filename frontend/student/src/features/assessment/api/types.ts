// Student Assessment API Type. 출처: docs/api/api-contract.md (DRAFT)
// 계약에 없는 필드는 추가하지 않는다. 필드를 바꾸려면 계약 개정이 먼저다 (CLAUDE.md §18).

/** §4 / §49 목록 응답 */
export interface PageResponse<T> {
  items: T[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
  }
}

/** §5 공통 Error Format */
export interface ApiErrorBody {
  code: string
  message: string
  details?: {
    fields?: { field: string; reason: string }[]
    [key: string]: unknown
  }
  traceId?: string
}

// ---- §9 학업 정보 (ST-01) ----

export interface SubjectRef {
  subjectId: string
  /** 과목명은 고정 Enum이 아니다 (§9-1). */
  name: string
}

/** §9-1 GET /api/student/assessment/academic-context 응답 */
export interface AcademicContext {
  school: { schoolId: string; name: string }
  academicYear: number
  grade: number
  semester: number
  subjects: SubjectRef[]
  /** 원천 출처 메타데이터 후보 (§9-1, 기존 시스템 확인 후 확정) */
  source: string
}

/** §9-1 Query. 둘 다 생략하면 현재 학기를 조회한다 (계약 보완 필요: 생략 시 의미가 계약에 명시되지 않음). */
export interface AcademicTermQuery {
  academicYear: number
  semester: number
}

/** §9-2 PUT /api/student/assessment/academic-context 요청. 응답 Body는 계약에 없다. */
export interface UpdateAcademicContextRequest {
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  subjectIds: string[]
}

// ---- §12·13 학교 수행평가 (ST-03) ----

/** §12·13 학생 자기 관리 상태. 공식 제출·점수 확정이 아니다. */
export type SchoolAssessmentStatus = 'BEFORE_START' | 'IN_PROGRESS' | 'COMPLETED'

/** §12 PDF 기반 등록 시 참조. 최종 조합은 Integration과 합의 전 (§12). */
export interface EvaluationItemRef {
  documentRevisionId: string
  subjectId: string
  itemKey: string
}

/** §12 목록·상세·등록 응답 */
export interface SchoolAssessment {
  assessmentId: string
  title: string
  subjectId: string
  status: SchoolAssessmentStatus
  /** YYYY-MM-DD. 모르면 null. */
  deadlineDate: string | null
  createdAt: string
  evaluationItemRef: EvaluationItemRef | null
}

/** §12 POST 직접 등록 요청 */
export interface CreateSchoolAssessmentRequest {
  title: string
  subjectId: string
  academicYear: number
  semester: number
  deadlineDate: string | null
  description: string | null
  status: SchoolAssessmentStatus
  evaluationItemRef: EvaluationItemRef | null
}

/**
 * §12 GET 목록 Query.
 * `query`(검색)와 `sort`는 §8·§50 공통 규칙을 따른다. §12가 허용 Sort 필드를 명시하지 않아
 * Stage 1은 아래 세 값만 사용한다 (계약 보완 필요).
 */
export interface ListSchoolAssessmentsQuery {
  academicYear: number
  semester: number
  subjectId?: string
  status?: SchoolAssessmentStatus
  query?: string
  sort?: SchoolAssessmentSort
  page: number
  size: number
}

export type SchoolAssessmentSort = 'deadlineDate,asc' | 'createdAt,desc' | 'title,asc'

/** §13 PATCH .../status 응답 */
export interface ChangeSchoolAssessmentStatusResponse {
  assessmentId: string
  status: SchoolAssessmentStatus
  updatedAt: string
}

// ---- §19~21 탐구 노트 (ST-08·09) ----

/** 노트가 연결되는 업무 객체 (§20 `sourceType`) */
export type AssessmentSourceType = 'SCHOOL_ASSESSMENT' | 'ENRICHMENT_TASK'

/**
 * §20 노트 블록. 계약 예시의 type은 `HEADING`·`PARAGRAPH`뿐이며, 목록·표·체크리스트·링크 카드 등
 * 나머지 블록 형식은 Editor 선정 후 확정한다 (OD-A05). 그 전에는 알 수 없는 type을 그대로 보존한다.
 */
export interface NoteBlock {
  blockId: string
  type: string
  text: string
  /**
   * **Mock 임시 필드 (계약 없음, MM-33).** 체크 여부·표 셀·링크 카드 출처처럼 HEADING/PARAGRAPH 밖의 블록 데이터를
   * Stage 1 Mock에서만 보존한다. 블록 Schema는 Editor 선정(OD-A05)·API-OD-A04 결정 뒤 확정한다.
   */
  attrs?: NoteBlockAttrs
}

export interface NoteBlockAttrs {
  checked?: boolean
  rows?: string[][]
  resource?: { resourceId: string; title: string; type: string; sourceName: string | null; sourceUrl: string | null }
}

/** §20 POST /notes 요청 */
export interface CreateNoteRequest {
  sourceType: AssessmentSourceType
  sourceId: string
  title: string
  blocks: NoteBlock[]
}

/** §20 PUT /notes/{noteId} 요청. 전체 본문 + 편집을 시작한 Revision */
export interface UpdateNoteRequest {
  expectedRevisionId: string
  title: string
  blocks: NoteBlock[]
}

/** §20 저장 응답 (POST·PUT 공통) */
export interface SaveNoteResponse {
  noteId: string
  revisionId: string
  revisionNumber: number
  savedAt: string
  updatedAt: string
}

/**
 * §20 GET 목록 항목. 계약은 POST/PUT 요청(title·blocks)과 저장 응답(noteId·revisionId·revisionNumber·savedAt·updatedAt)만
 * 예시로 보여주므로, 조회 항목은 두 Shape을 합친 것으로 본다 (계약 보완 필요: screen-map MM-18).
 */
export interface AssessmentNote {
  noteId: string
  sourceType: AssessmentSourceType
  sourceId: string
  title: string
  blocks: NoteBlock[]
  revisionId: string
  revisionNumber: number
  savedAt: string
  updatedAt: string
}

/** §21 Revision 목록 항목 (불변) */
export interface NoteRevisionSummary {
  revisionId: string
  revisionNumber: number
  savedAt: string
}

/**
 * §21 GET .../revisions/{revisionId} 응답. 계약은 Endpoint만 있고 응답 Shape이 없어,
 * 목록 항목 + 저장 당시 본문(§20의 title·blocks)으로 본다 (계약 보완 필요: screen-map MM-18).
 */
export interface NoteRevisionDetail extends NoteRevisionSummary {
  noteId: string
  title: string
  blocks: NoteBlock[]
}

// ---- §24~25 결과물·버전 (ST-12·13) ----

/** §48 File Contract */
export interface FileMeta {
  fileRef: string
  fileName: string
  contentType: string
  sizeBytes: number
}

/**
 * §24 결과물. 목록 항목 Shape은 생성 요청 필드 + `artifactId`로 본다 (계약 보완 필요: MM-18).
 * `kind` Enum은 미확정이라 문자열/없음으로 둔다.
 */
export interface Artifact {
  artifactId: string
  sourceType: AssessmentSourceType
  sourceId: string
  title: string
  kind: string | null
}

export interface CreateArtifactRequest {
  sourceType: AssessmentSourceType
  sourceId: string
  title: string
  kind: string | null
}

/** §25 업로드 응답·버전 목록 항목. 버전 번호는 Artifact 안에서만 증가한다. */
export interface ArtifactVersion {
  versionId: string
  artifactId: string
  versionNumber: number
  file: FileMeta
  changeNote: string | null
  uploadedAt: string
}

/** §25 multipart Parts */
export interface UploadArtifactVersionRequest {
  file: File
  changeNote?: string
  expectedLatestVersionId?: string
}

// ---- §31~32 선택형 피드백 (ST-14·15) ----

export type FeedbackRequestStatus = 'PENDING' | 'DELIVERED'

/** §31 요청 Snapshot — 생성 후 바뀌지 않는다 */
export interface FeedbackSnapshot {
  noteRevisionId: string
  artifactVersionIds: string[]
  locked: boolean
}

/** §31 201 응답. 목록 항목도 같은 Shape으로 본다 (계약 보완 필요: MM-19). */
export interface FeedbackRequest {
  requestId: string
  status: FeedbackRequestStatus
  requestedAt: string
  snapshot: FeedbackSnapshot
}

export interface CreateFeedbackRequestBody {
  sourceType: AssessmentSourceType
  sourceId: string
  noteRevisionId: string
  artifactVersionIds: string[]
}

/**
 * §32 위치별 의견. `location`은 뷰어가 위치를 보장할 때만 있고, 없으면 문서 전체 의견이다 (§45 `location=null`).
 * `targetType`·`location.type` Enum은 계약 예시(PDF·NOTE / PDF_PAGE·NOTE_BLOCK) 외에는 미확정이라 문자열로 둔다.
 */
export interface FeedbackComment {
  commentId: string
  targetType: string
  artifactVersionId?: string
  noteRevisionId?: string
  location?: { type: string; pageNumber?: number; blockId?: string } | null
  text: string
}

/** §46 후속 추천. 학생이 수락하지 않아도 된다. 추천 대상의 제목 등 상세 조회 계약은 없다. */
export interface FeedbackRecommendation {
  type: string
  resourceId?: string
  catalogTaskId?: string
  note: string
}

/** §32 답변 조회 응답. 대기 중이면 reply = null */
export interface FeedbackReplyResponse {
  requestId: string
  status: FeedbackRequestStatus
  deliveredAt?: string
  reply: {
    overallComment: string
    comments: FeedbackComment[]
    recommendations: FeedbackRecommendation[]
  } | null
}

// ---- §16~18·§27 심화 탐구 (ST-07·16·17) ----
// SchoolAssessment와 다른 Entity다. 공개 콘텐츠(catalogTaskId·materialId·resourceId)와 학생 개인 Task(taskId)는 Identity가 다르다.

/** §18 "수행평가와 동일한 3개 상태를 사용하되 동일 Entity로 합치지 않는다" */
export type EnrichmentTaskStatus = 'BEFORE_START' | 'IN_PROGRESS' | 'COMPLETED'

/** §16 관리자 공개 심화 Task. 응답 예시의 필드만 쓴다 (난이도·분야·문제 상황·자기 점검 등은 계약 없음: screen-map MM-26). */
export interface EnrichmentCatalogItem {
  catalogTaskId: string
  title: string
  subjectId: string
  goal: string
  methods: string[]
  published: boolean
}

/**
 * §18 `sourceReference` — **제안 계약(DRAFT)**. DTO·Enum은 API-OD-A12에서 확정한다.
 * Stage 1 Mock은 출처 추적을 시연하려고 이 형태를 쓰지만, 승인된 HTTP 필드로 취급하지 않는다.
 */
export type EnrichmentSourceType = 'MOCK_EXAM_MATERIAL' | 'PERSONAL_MOCK_EXAM_MATERIAL' | 'UNIVERSITY_RESOURCE'

export interface EnrichmentSourceReference {
  type: EnrichmentSourceType
  sourceId: string
}

/** §18 POST 요청 */
export interface CreateEnrichmentTaskRequest {
  title: string
  subjectId: string
  goal: string | null
  relatedAssessmentId: string | null
  catalogTaskId: string | null
  status: EnrichmentTaskStatus
  deadlineDate: string | null
  sourceReference: EnrichmentSourceReference | null
}

/**
 * §18 GET 항목·상세. 계약에 응답 Shape이 없어 "요청 필드 + taskId + 생성·수정 시각"으로 본다 (MM-18과 같은 가정, MM-27).
 * `deadlineDate`는 학생 자율 Task의 선택적 마감이며 학교 공식 마감이 아니다.
 */
export interface EnrichmentTask extends CreateEnrichmentTaskRequest {
  taskId: string
  createdAt: string
  updatedAt: string
}

/** §18 PATCH /tasks/{taskId}. 수정 가능 필드가 계약에 없어 이 화면은 연결 수행평가만 바꾼다 (MM-27). */
export interface UpdateEnrichmentTaskRequest {
  relatedAssessmentId: string | null
}

/** §18 PATCH .../status 응답 (§13과 같은 형태로 본다) */
export interface ChangeEnrichmentTaskStatusResponse {
  taskId: string
  status: EnrichmentTaskStatus
  updatedAt: string
}

/**
 * §17 모의고사 탐구 카드. 계약은 개인 등록 필드만 예시하고 공개 카드 응답 Shape은 없다.
 * "출처와 탐구 아이디어를 별개 필드로 보존"(§17)과 Feature Spec inquiry §4 표의 항목으로 가정한다 (MM-28).
 */
export interface MockExamSource {
  academicYear: number | null
  examMonth: number | null
  grade: number | null
  questionNumber: string | null
  /** 실제 확인된 원문 링크만. 확인되지 않으면 null (API-OD-A11) */
  sourceUrl: string | null
}

export interface MockExamInquiryIdea {
  topicTitle: string
  /** 핵심 소재 (지문 원문이 아니라 LearnersHigh가 정리한 요약) */
  coreMaterial: string
  relatedFields: string[]
  topicReason: string
  goal: string
  methods: { label: string; text: string }[]
  extensionQuestions: string[]
}

export interface MockExamMaterial {
  materialId: string
  subjectId: string
  source: MockExamSource
  idea: MockExamInquiryIdea
}

/** §17 POST my-mock-exam-materials 요청 (계약 예시 그대로) */
export interface CreatePersonalMockExamMaterialRequest {
  academicYear: number | null
  examMonth: number | null
  grade: number | null
  subjectId: string
  questionNumber: string | null
  sourceUrl: string | null
  sourceFileRef: string | null
  personalNote: string | null
}

/** §17 GET my-mock-exam-materials 항목. 요청 필드 + ID·등록 시각으로 본다 (MM-28). 관리자 공개 자료로 바뀌지 않는다. */
export interface PersonalMockExamMaterial extends CreatePersonalMockExamMaterialRequest {
  materialId: string
  createdAt: string
}

/**
 * §27 대학 공개 자료. 계약에 응답 Shape이 없어 Feature Spec inquiry §9의 메타데이터 목록으로 가정한다 (MM-29).
 * 대학명은 고정 Enum이 아니다.
 */
export interface UniversityResource {
  resourceId: string
  university: string
  title: string
  academicYear: number
  /** 자료 유형 (자유 문자열, Enum 미확정) */
  resourceType: string
  /** 확인된 공식 출처 URL만. 없으면 null */
  officialUrl: string | null
  checkedAt: string | null
  relatedConcepts: string[]
  inquiryIdeas: string[]
}

// ---- §22 참고자료 추천·자료함 (ST-10·11) ----
// 학생 자료(ResourceReference)는 본인 비공개가 기본이다. 관리자 내부 스크랩·공개 탐구 콘텐츠·대학 공개 자료와 다른 Entity다.

/**
 * §22 자료 유형. 계약 예시는 `ARTICLE` 하나뿐이고 Enum이 확정되지 않았다 (MM-31).
 * Mock은 Mockup RL-ADD-01의 7종을 후보 값으로 쓴다. 서버 확정 전까지 모르는 값도 문자열로 보존한다.
 */
export type ResourceType = string

/** §22 POST 요청 (계약 예시 그대로) */
export interface CreateResourceRequest {
  type: ResourceType
  title: string
  sourceName: string | null
  sourceUrl: string | null
  author: string | null
  publishedDate: string | null
  memo: string | null
  tags: string[]
  fileRef: string | null
}

/** §22 GET 목록·상세. 응답 Shape이 없어 "요청 필드 + resourceId + 생성·수정 시각"으로 본다 (MM-30). */
export interface StudentResource extends CreateResourceRequest {
  resourceId: string
  createdAt: string
  updatedAt: string
}

/** §22 PATCH. 수정 가능 필드가 계약에 없어 요청 필드의 부분 집합으로 본다 (MM-30). */
export type UpdateResourceRequest = Partial<Omit<CreateResourceRequest, 'fileRef'>>

/**
 * §22 GET recommendations 항목. 응답 Shape이 없어 P-15(MM-21)의 제안 Shape을 가정한다.
 * 추천은 "탐색 후보 자료원"이며 시스템이 해당 서비스 DB에 접근한다는 뜻이 아니다.
 */
export interface RecommendedSource {
  sourceName: string
  category: string
  homepageUrl: string | null
  description: string
  searchKeywords: string[]
}

// ---- §29 성장 기록 (ST-19) ----
// 학생 개인 참고 기록이다. 공식 학교생활기록부·세특이 아니며 학교에 제출되지 않는다.

/** §29 POST 요청 (계약 예시 그대로). 필수 여부는 검증 규칙 확정 전이라 화면은 제목만 필수로 본다 (MM-37). */
export interface CreateGrowthRecordRequest {
  title: string
  subjectId: string | null
  activityStartDate: string | null
  role: string | null
  motivation: string | null
  process: string | null
  contribution: string | null
  difficulty: string | null
  solution: string | null
  outcome: string | null
  reflection: string | null
  followUp: string | null
  /** 관련 활동. 독립 활동이면 둘 다 null */
  relatedSourceType: AssessmentSourceType | null
  relatedSourceId: string | null
  /** §24 Artifact ID (특정 Version 고정 여부는 미정, MM-38) */
  artifactIds: string[]
}

/** §29 GET 목록·상세. 응답 Shape이 없어 "요청 필드 + recordId + 생성·수정 시각"으로 본다 (MM-37). */
export interface GrowthRecord extends CreateGrowthRecordRequest {
  recordId: string
  createdAt: string
  updatedAt: string
}

/** §29 PATCH. 요청 필드의 부분 집합으로 본다 (MM-37). */
export type UpdateGrowthRecordRequest = Partial<CreateGrowthRecordRequest>

// ---- §30 보관함 (ST-20) ----
// 원본(수행평가·심화 탐구)을 조회하는 Projection이다. 보관함 전용 사본을 만들지 않는다.

export type ArchiveTab = 'recent' | 'favorites' | 'completed' | 'previous-semesters' | 'trash'

/**
 * §30 GET 항목. 계약은 "조회용 Projection"이라는 설명뿐이라 원본 참조 + 표시 정보로 가정한다 (MM-39).
 * `lastActivityAt`은 원본 생성·노트 저장·파일 업로드 중 가장 최근 시각(Mock 기준, 열람 시각 아님).
 */
export interface ArchiveItem {
  sourceType: AssessmentSourceType
  sourceId: string
  title: string
  subjectId: string | null
  /** 원본의 학년도·학기 (심화 탐구는 학기 정보가 없어 null) */
  academicYear: number | null
  semester: number | null
  status: string | null
  lastActivityAt: string
  noteBlockCount: number | null
  favorite: boolean
  /** 휴지통 항목만 (삭제 정책 미정) */
  deletedAt: string | null
}

/** §30 PUT archive/favorites 요청 (계약 예시 그대로) */
export interface ArchiveFavoriteRequest {
  sourceType: AssessmentSourceType
  sourceId: string
  favorite: boolean
}

// ---- §10·§11 학교 평가계획서 (ST-02) ----
// 계약은 예시 JSON뿐이라 아래 Shape 중 예시에 없는 필드는 가정이다 (MM-45~47). Backend 연결 전 api-contract.md에서 확정한다.

/** §10-1 공통 평가계획서 (관리자 등록, 학생에게 공개된 것만) */
export interface EvaluationPlan {
  planId: string
  documentRevisionId: string
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  fileName: string
  sourceUrl: string | null
  /** 예시는 `CONFIRMED`뿐. Enum 미정 (MM-45) */
  reviewStatus: string
  uploadedAt: string
}

/** §10-2 개인 업로드 요청 (multipart Part). 파일 자체는 화면이 File로 들고 있다. */
export interface UploadEvaluationPlanRequest {
  file: File
  schoolId: string
  academicYear: number
  grade: number
  semester: number
}

/** §10-2 `201` 응답 */
export interface EvaluationPlanUpload {
  uploadId: string
  documentRevisionId: string
  fileRef: string
  visibility: 'PRIVATE'
  analysisStatus: EvaluationAnalysisStatus
}

/**
 * §11 분석 상태. 계약 예시: NOT_REQUESTED·PROCESSING·REVIEW_REQUIRED·FAILED.
 * `COMPLETED`(확인 필요 없이 끝남)는 후보로 가정한다 (MM-45).
 */
export type EvaluationAnalysisStatus = 'NOT_REQUESTED' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'FAILED'

export interface AnalysisSource {
  /** 1-based PDF 페이지 */
  pdfPageNumber: number
  /** 문서에 인쇄된 쪽 번호. 없으면 null */
  printedPageLabel: string | null
  extractedText: string
}

export interface WrittenExam {
  round: number
  weightPercent: number | null
  questionTypes: string[]
}

export interface PerformanceEvaluationItem {
  /** 등록 시 `evaluationItemRef.itemKey`로 쓰는 항목 키. §11 예시에 없어 가정 (MM-46) */
  itemKey: string
  label: string | null
  weightPercent: number | null
  maxScore: number | null
  timing: string | null
  /** 채점기준 문장. §11은 빈 배열 예시뿐이라 문자열 목록으로 가정 (MM-46) */
  rubric: string[]
  /** 근거 PDF 페이지 (`sources`의 pdfPageNumber). 예시에 없어 가정, 없으면 근거 미확인 (MM-46) */
  sourcePdfPageNumber: number | null
}

export interface AnalysisSubject {
  subjectName: string
  /** 이 과목만 추출에 실패한 경우 (부분 성공). 예시에 없어 가정 (MM-45) */
  extractionFailed: boolean
  writtenEvaluation: { weightPercent: number | null; exams: WrittenExam[] } | null
  performanceEvaluation: { weightPercent: number | null; items: PerformanceEvaluationItem[] } | null
  /** §11 예시는 빈 배열뿐이라 문장 목록으로 가정 */
  achievement: { standards: string[]; levels: string[]; thresholds: string[] }
  teachingPlan: string[]
  sources: AnalysisSource[]
}

/** §11 POST·GET 응답. 완료 전에는 `subjects`가 없다. */
export interface EvaluationPlanAnalysis {
  analysisId: string
  documentRevisionId: string
  status: EvaluationAnalysisStatus
  startedAt: string
  subjects?: AnalysisSubject[]
}

export interface PersonalReviewCorrection {
  fieldPath: string
  value: string
  sourcePdfPageNumber: number | null
}

/** §11 PUT personal-review 요청 */
export interface PersonalReviewRequest {
  analysisId: string
  corrections: PersonalReviewCorrection[]
}

/** §11 PUT 응답. 계약에 없어 "요청 + 저장 시각"으로 가정 (MM-47) */
export interface PersonalReview extends PersonalReviewRequest {
  documentRevisionId: string
  savedAt: string
}
