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
