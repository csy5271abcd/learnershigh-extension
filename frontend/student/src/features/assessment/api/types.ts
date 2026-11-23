import type { PlanRowLike } from '../components/teaching-plan/teachingPlanPlacement.ts'
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
  /**
   * 학생이 이름을 직접 입력해 만든 과목 (P-26 PROPOSED, Mock 전용 표시). 학교가 개설한 과목처럼 보이지 않게 구분한다.
   * §9-1 응답에는 없다. 다른 학기에서 가져온 기존 과목은 표시하지 않는다(원래 학교 과목).
   */
  addedByStudent?: boolean
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
  /** 학교 반 (§9-1 DRAFT 2026-11-12). 학원 반과 다르다. 모르면 null. DRAFT라 이전 응답·Mock에는 없을 수 있다. */
  schoolClassNumber?: number | null
  /** 학교 번호 (§9-1 DRAFT 2026-11-12). 모르면 null. */
  schoolStudentNumber?: number | null
  /**
   * 같은 학년도·학년·학기의 공통 과목 후보 (§9-1 DRAFT 2026-11-12). 학교별 후보가 아니고 공식 개설 과목 목록도 아니다.
   * 수행평가 등록은 subjects(수강 과목) 기준이며 enrolled=false 후보는 서버가 거절한다.
   */
  catalogSubjects?: CatalogSubjectRef[]
}

/** §9-1 DRAFT catalogSubjects 항목 */
export interface CatalogSubjectRef {
  subjectId: string
  name: string
  /** 교과군 표시값 (예: 국어, 과학). 고정 Enum이 아니다. */
  subjectGroup: string
  /** 적용 교육과정 표시값 (예: "2022", "2015"). 고정 Enum이 아니다. */
  curriculumVersion: string
  /** 이 학생의 수강 과목(subjects)에 있는지 */
  enrolled: boolean
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

/**
 * 학생이 과목명을 직접 입력해 이 학기에 추가 (P-26 PROPOSED — 계약에 Endpoint 없음, Mock 전용).
 * 범위는 §9 학업 Context(학교·학년도·학년·학기)이고, 응답은 새 과목(SubjectRef)이다.
 */
export interface CreateStudentSubjectRequest {
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  name: string
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
  /** A27-UX 학생 개인 관리 정보 (§12 DRAFT). 모르면 null. 이전 응답·Mock에는 없을 수 있다 */
  description?: string | null
  assessmentType?: SchoolAssessmentType | null
  /** YYYY-MM-DD 평가일 (제출 마감과 별도) */
  evaluationDate?: string | null
  /** 0~100. null = 모름(0과 구분) */
  weightPercent?: number | null
  submissions?: string | null
  personalMemo?: string | null
  updatedAt?: string
  /** A27-UX 학생 화면(2026-11-19 DRAFT §12-b): 평가 유형 '기타' 직접 입력. OTHER가 아니면 null */
  assessmentTypeLabel?: string | null
  /**
   * A28-20 §12-c 학교 확정 자동 등록(관리자 최종 승인된 공식 수행평가). 학생 직접 등록이면 null/없음.
   * 공식 값(이름·시기·반영·만점)은 학교 확정본이고 학생이 바꾸지 않는다. 날짜(평가일·마감)는 학생 개인 값이다.
   */
  official?: SchoolAssessmentOfficial | null
}

export interface SchoolAssessmentOfficial {
  planId: string
  /** ACTIVE = 최신 확정본에 있음, WITHDRAWN = 재확정에서 빠짐(학생 기록은 그대로) */
  status: 'ACTIVE' | 'WITHDRAWN'
  /** 원문 공식 시기(예: '9월'). 날짜가 아니다 */
  timing: string | null
  weightPercent: number | null
  maxScore: number | null
}

/**
 * §10-1-3 (DRAFT, A27-UX) 본인 학적 슬롯의 학교 공식 공개 평가계획서 원본.
 * 관리자가 직접 등록한 평가계획서·분석 결과와 다른 자료다(공식 원본은 관리자 분석 승인 없이 열람).
 * contextFound=false: 그 학년도·학기 학적 기록이 없어 다른 학년 문서를 연결하지 않았다.
 * sourceConnected=false: 공식 원본 공급자(학교알리미 수집기)가 아직 없다 — documents는 비어 있다.
 */
export interface StudentOfficialPlan {
  academicYear: number
  semester: number
  contextFound: boolean
  schoolId: string | null
  schoolName: string | null
  grade: number | null
  sourceConnected: boolean
  documents: {
    sourceDocumentId: string
    provider: string
    fileName: string
    documentFormat: string
    sourceUrl: string | null
    sha256: string | null
    publishedAt: string | null
    verifiedAt: string | null
    latest: boolean
    /** 부록 K: 원본 크기(바이트) */
    sizeBytes?: number | null
    /** 부록 K: 공시월 4(1학기 공시)·9(2학기 공시), 모르면 null */
    disclosureMonth?: number | null
  }[]
  /**
   * A28-01 원본 칸의 근거. ACADEMIC_RECORD = 그 해 학생 학적 칸 · SCHOOL_PUBLIC = 학교 공개 원본(학생 재학·수강 기록 아님) ·
   * null = 칸을 정할 학교 없음. contextFound 는 학적 유무 그대로다.
   */
  basis?: 'ACADEMIC_RECORD' | 'SCHOOL_PUBLIC' | null
}

/**
 * §10-1-3 부록 K POST .../official/ensure — 학생 진입 자동 확보 상태. 학교는 서버가 학적에서 정한다(요청에 학교·학년도 없음).
 * 학교알리미 후보·주소는 오지 않는다(학교 선택은 관리자만).
 */
export interface StudentOfficialEnsure {
  state: 'RUNNING' | 'READY' | 'SCHOOL_CONFIRMATION_REQUIRED' | 'SCHOOL_IDENTITY_REQUIRED' | 'NO_CONTEXT' | 'FAILED'
  schoolSelectionRequired: boolean
  years: { academicYear: number; status: string }[]
  message: string | null
  /** 부록 O: 학생이 고른 동명 학교(선생님 확인 전)의 원본을 확인한 결과 */
  viewSelected?: boolean
}

/** 부록 O §38-16 학생 개인 '공식 원본 열람 대상' 학교 선택 (학적·선생님 매핑과 별개) */
export interface StudentOfficialViewSelection {
  schoolName: string
  sido: string | null
  sigungu: string | null
  address: string
  selectedAt: string
  version: number
  teacherConfirmed: boolean
}

export interface StudentOfficialView {
  state: 'NO_CONTEXT' | 'NOT_REQUIRED' | 'ADMIN_CONFIRMED' | 'RUNNING' | 'SELECT_REQUIRED' | 'SELECTED' | 'UNAVAILABLE'
  schoolName: string | null
  candidates: {
    candidateId: string
    schoolName: string
    sido: string | null
    sigungu: string | null
    address: string | null
    selectable: boolean
    unselectableReason: string | null
  }[]
  selection: StudentOfficialViewSelection | null
  message: string | null
}

/** A27-UX 학생이 고르는 평가 유형 (개인 관리 정보, 공식 평가 방법 아님) */
export type SchoolAssessmentType = 'PRESENTATION' | 'REPORT' | 'PROJECT' | 'EXPERIMENT' | 'DEBATE' | 'PORTFOLIO' | 'OTHER'

/** §12 POST 직접 등록 요청 */
export interface CreateSchoolAssessmentRequest {
  title: string
  /** A27-UX(§12-a): newSubjectName과 둘 중 하나만 보낸다. 이름으로 보낼 때는 null */
  subjectId: string | null
  /** A27-UX(§12-a): 사이드바에 없는 과목 이름 — 서버가 같은 트랜잭션에서 학생 과목으로 더한다 */
  newSubjectName?: string | null
  assessmentTypeLabel?: string | null
  academicYear: number
  semester: number
  deadlineDate: string | null
  description: string | null
  status: SchoolAssessmentStatus
  evaluationItemRef: EvaluationItemRef | null
  assessmentType?: SchoolAssessmentType | null
  evaluationDate?: string | null
  weightPercent?: number | null
  submissions?: string | null
  personalMemo?: string | null
}

/**
 * §12 PATCH 학생 편집 필드 (계약은 "학생이 편집 가능한 필드만"이라고만 적음 — C-3, Backend 구현 기준 3개).
 * 보내지 않은 필드는 유지, null은 비움(설명·마감일). 과목·상태·evaluationItemRef는 이 요청으로 바꾸지 않는다.
 */
export interface UpdateSchoolAssessmentRequest {
  title?: string
  assessmentTypeLabel?: string | null
  description?: string | null
  deadlineDate?: string | null
  assessmentType?: SchoolAssessmentType | null
  evaluationDate?: string | null
  weightPercent?: number | null
  submissions?: string | null
  personalMemo?: string | null
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
  // ---- 아래도 Mock 임시 필드 (MM-33 확장, P-22 PROPOSED). Editor 선정(OD-A05) 뒤 Schema를 다시 정한다. ----
  /**
   * A27-UX(계정 B) 인라인 서식: text 위 글자 범위(start 포함·end 미포함). text는 순수 글 그대로 둔다(서식을 모르는 화면은 글만 보인다).
   * type = bold·italic·underline·link, link는 http(s) href. Editor 결정(OD-A05) 전 임시 형식.
   */
  marks?: { type: 'bold' | 'italic' | 'underline' | 'link'; start: number; end: number; href?: string }[]
  /** HEADING 단계 (1~3). 없으면 기존 소제목(2단계)으로 본다 */
  level?: 1 | 2 | 3
  /** 목록 들여쓰기 단계 (0~4) */
  indent?: number
  /** 템플릿 안내 문구. 본문이 아니라 빈 칸의 자리 표시로만 보인다 */
  placeholder?: string
  /** CALLOUT 아이콘 */
  emoji?: string
  /** CODE 언어 표시 (실행·하이라이트 없음) */
  language?: string
  /** TOGGLE 펼친 내용 */
  body?: string
  /** LINK·VIDEO·MAP 주소 (형식만 확인, 열리는지 확인 안 함) */
  url?: string
  /**
   * IMAGE·FILE 메타데이터. A28-41(§26-1): attachmentId 가 있으면 바이트가 서버 Storage 에 저장된 첨부다.
   * attachmentId 가 없는 이전 블록은 이름·크기만 남아 있고 파일은 없다(다시 첨부 필요).
   */
  file?: { name: string; size: number; mimeType: string; attachmentId?: string; sha256?: string }
  /** MAP 장소 이름 */
  place?: string
  /**
   * EXAM_SOURCE: 대학 기출 PDF 출처 카드 (P-25 PROPOSED). 원문은 복사하지 않고 문서·쪽 범위만 가리킨다.
   * label은 넣을 때의 표시 이름 사본(문서가 목록에서 빠져도 무엇이었는지 알 수 있게).
   */
  examSource?: { documentId: string; questionId: string | null; pageStart: number; pageEnd: number | null; label: string }
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
  /**
   * 대학 기출 PDF 안의 위치 (P-25 PROPOSED, Mock 전용). §18 초안에는 없다. 원문을 복제하지 않고 쪽·문항만 가리킨다.
   * questionId는 확인된 문항 인덱스가 있을 때만, page는 PDF 물리 쪽(1부터).
   */
  locator?: { questionId: string | null; page: number } | null
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
  /**
   * **Mock 전용 (계약 없음, P-24 PROPOSED).** 모의고사 60선의 시험 출처·원문 지문.
   * 원문 재배포 권한이 확인되지 않아(API-OD-A11) 서버 응답으로 확정하지 않는다. 없으면 원문을 보여주지 않는다.
   */
  research?: MockExamResearchInfo
}

export interface MockExamResearchInfo {
  /** 원본 표기 (예: 2026년-10월-고3-모의고사) */
  examLabel: string
  /** 화면 표기 (예: 2026년 10월 고3 모의고사, 2027학년도 6월 모의평가) */
  examTitle: string
  /** 학력평가(교육청) / 평가원 모의평가 */
  examKind: 'ACADEMIC_ACHIEVEMENT' | 'CSAT_MOCK'
  /** 문항 번호·문항군 (예: 22번, 10~13번 지문) */
  questionLabel: string
  /** 원본 PDF 쪽 (예: PDF 3쪽) */
  pdfPage: string
  originalFileName: string
  /** 원문 지문 (원본 그대로) */
  passage: string
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

// ---- 대학별 기출 PDF (2026-10-28, P-25 PROPOSED) ----
// §27은 목록 Query만 있고 응답 Shape·원문 파일·문항 위치가 없다. 아래는 로컬 Mock 시연용 확장 제안이며 승인된 HTTP 필드가 아니다.
// 원본은 references/previous-exam-questions의 PDF이고, 쪽 번호는 모두 PDF 물리 쪽(1부터)이다. 인쇄된 쪽 번호와 다를 수 있다.

/** 자료 유형. 실제 기출(PAST_EXAM)과 대학이 미리 공개한 예시 문항(SAMPLE_QUESTION)을 섞지 않는다. 모르는 값은 OTHER */
export type UniversityExamCategory = 'PAST_EXAM' | 'SAMPLE_QUESTION' | 'OTHER'

/** 문항 안의 원문 구획. PDF에서 제목·표 머리가 확인된 쪽만 기록한다 */
export type UniversityExamSectionKind = 'INTENT' | 'BASIS' | 'EXPLANATION' | 'RUBRIC' | 'SAMPLE_ANSWER' | 'REVIEW'

export interface UniversityExamSection {
  kind: UniversityExamSectionKind
  /** 그 구획 제목이 처음 나오는 PDF 쪽 */
  page: number
}

export interface UniversityExamQuestion {
  questionId: string
  /** 원문 표기 그대로 (예: "문제 1", "수학 A", "오전", 단과대학명) */
  label: string
  /** 분야·과목 (원문 표기) */
  field: string | null
  /** 원문 제목이 있는 경우만 (예: 영어 지문 제목) */
  topic: string | null
  /** 원문의 "핵심개념 및 용어"·"[개념]" 칸 그대로. 칸이 없으면 빈 배열 */
  concepts: string[]
  pageStart: number
  /** 문제·제시문이 끝나는 쪽. 확인하지 못했으면 null */
  pageEnd: number | null
  sections: UniversityExamSection[]
  /** 학생용 탐구 방향 예시 (LearnersHigh 작성, 대학 공식 추천 아님). 없으면 표시하지 않는다 */
  studyExamples?: string[]
}

export interface UniversityExamDocument {
  documentId: string
  /** 표시 이름 (서울대학교, KAIST). 고정 Enum 아님 */
  university: string
  universityName: string
  academicYear: number
  category: UniversityExamCategory
  /** 원문 표기 (면접 및 구술고사, 적성·인성면접, 면접, 공통문제, 면접 예시 문항) */
  examType: string
  title: string
  subjectAreas: string[]
  /** 저장소 기준 상대 경로 (references/previous-exam-questions 아래). 화면에 파일 경로를 노출하지 않는다 */
  relativePath: string
  fileName: string
  sizeBytes: number
  sha256: string
  pageCount: number
  /** 문항 인덱스를 만든 문서인지. NONE이면 원문 열람만 된다 */
  indexStatus: 'INDEXED' | 'NONE'
  questions: UniversityExamQuestion[]
}

/** 원문 파일 상태 (개발 서버가 Manifest와 실제 파일을 비교한 결과) */
export type UniversityExamFileState = 'AVAILABLE' | 'MISSING' | 'CHANGED' | 'NOT_PROVIDED' | 'UNKNOWN'

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
  /** A27-UX §22-1 DRAFT 첨부 파일 (없으면 null). previewAvailable = PDF·이미지만 */
  file?: StudentResourceFile | null
}

export interface StudentResourceFile {
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
  previewAvailable: boolean
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
 * 보관함·즐겨찾기 대상 유형. §30 예시는 `SCHOOL_ASSESSMENT`뿐이다.
 * `ENRICHMENT_TASK`(내 탐구)·`ENRICHMENT_CATALOG`(탐구 라이브러리 공개 콘텐츠, Mockup AR-TAB-02) 즐겨찾기는
 * **Mock 전용 제안(P-22, PROPOSED)**이며 승인된 계약 값이 아니다 (MM-40).
 */
export type ArchiveSourceType = AssessmentSourceType | 'ENRICHMENT_CATALOG' | 'ARTIFACT' | 'RESOURCE' | 'GROWTH_RECORD'

/**
 * §30 GET 항목. 계약은 "조회용 Projection"이라는 설명뿐이라 원본 참조 + 표시 정보로 가정한다 (MM-39).
 * `lastActivityAt`은 원본 생성·노트 저장·파일 업로드 중 가장 최근 시각(Mock 기준, 열람 시각 아님).
 */
export interface ArchiveItem {
  sourceType: ArchiveSourceType
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
  /** 휴지통 항목만 */
  deletedAt: string | null
  /** 휴지통 항목의 원래 소속 (예: "수행평가 'X'의 결과물") */
  origin?: string | null
}

/** §25-1·§37 두 버전 비교. 구조 비교기가 없어 METADATA_ONLY만 온다 */
export interface ArtifactComparison {
  artifactId: string
  fromVersionId: string
  toVersionId: string
  comparison: { mode: 'METADATA_ONLY' | 'STRUCTURED_DIFF'; changes: { field: string; from: unknown; to: unknown }[]; reason: string | null }
  versions: (ArtifactVersion & { previewSupported: boolean })[]
}

/** §30 PUT archive/favorites 요청 (계약 예시 그대로) */
export interface ArchiveFavoriteRequest {
  sourceType: ArchiveSourceType
  sourceId: string
  favorite: boolean
}

// ---- §10·§11 학교 평가계획서 (ST-02) ----
// 계약은 예시 JSON뿐이라 아래 Shape 중 예시에 없는 필드는 가정이다 (MM-45~47). Backend 연결 전 api-contract.md에서 확정한다.

/** §10-1 공통 평가계획서 (관리자 등록, 학생에게 공개된 것만) */
/**
 * 평가계획서 원문 파일 (§48 모양, S-4 2026-11-13). available: 서버가 원문을 보관함.
 * previewAvailable: 앱 안 미리보기 가능(현재 PDF만 — HWP·HWPX는 검증된 변환 엔진이 없어 내려받기만).
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

export interface EvaluationPlan {
  planId: string
  documentRevisionId: string
  schoolId: string
  academicYear: number
  grade: number
  semester: number
  fileName: string
  sourceUrl: string | null
  /** http는 관리자가 확정한 문서만 준다(CONFIRMED). Enum 미정 (MM-45) */
  reviewStatus: string
  uploadedAt: string
  /** 원문 열람 정보 (http). Mock에는 없다(실제 파일 없음) */
  file?: PlanFileMeta | null
  /** §10-1 상세에만 붙는 관리자 확정값 (A3.5 DRAFT). 목록·Mock에는 없다 → 확정 정보 없음으로 본다 */
  confirmedFields?: ConfirmedPlanField[]
}

/** §10-1 학생 상세 확정값. value=null은 "원문에 없음을 관리자가 확인"(0이 아니다). pdfPageNumber: PDF 근거 쪽 */
export interface ConfirmedPlanField {
  subjectId: string
  fieldPath: string
  value: string | number | null
  pdfPageNumber: number | null
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

// ---- 과목별 참고자료 자료원 카탈로그 (2026-10-28, Mock 전용 — 계약 없음, P-24 PROPOSED) ----
// 공식 사이트·채널 "자료원"이다. 개별 기사·논문(자료함 §22의 StudentResource)과 다르다.

/** 화면 탐색용 자료원 분류 (원본 "자료 성격"을 묶은 LearnersHigh 분류, 확정 Enum 아님) */
export type ReferenceSourceCategory = '공식 기관' | '논문·학술' | '뉴스·시사' | '통계·데이터' | '영상·다큐' | '교육 도구·포털'

export interface ReferenceSource {
  sourceId: string
  name: string
  /** 대표 홈페이지·채널 주소 (원본 문서 기준, 열리는지 이 앱에서 확인하지 않음) */
  url: string
  /** 원본 "주요 활용" */
  primaryUsage: string
  /** 원본 "자료 성격" */
  nature: string
  category: ReferenceSourceCategory
  accessNotes: string | null
  /** original = 원본 이미지 22곳, additional = 포괄 표현을 구체화한 추가 2곳 */
  sourceGroup: 'original' | 'additional'
}

/** 과목 영역 키 (8개) */
export type ReferenceAreaKey = 'korean' | 'math' | 'social' | 'science' | 'chemistry' | 'biology' | 'software' | 'history'

export interface ReferenceArea {
  areaKey: ReferenceAreaKey
  label: string
  /** 영역별 추천 자료원과 그 영역에서의 활용 방법 (원본 순서) */
  sources: { sourceId: string; usage: string }[]
  tips: string[]
}

export interface ReferenceCatalog {
  sources: ReferenceSource[]
  areas: ReferenceArea[]
  /** 원본 문서·확인일 */
  basis: { document: string; checkedOn: string }
}

/** §10-1-2 학생 월별 교수·학습 운영계획 (A6 DRAFT). 확정 행만. status NOT_CONFIRMED = 문서는 공개됐지만 운영계획은 확정 전(오류 아님) */
export interface StudentTeachingPlan {
  planId: string
  documentRevisionId: string
  academicYear: number
  grade: number
  semester: number
  status: 'CONFIRMED' | 'NOT_CONFIRMED'
  confirmedAt: string | null
  rows: (PlanRowLike & { subjectId: string })[]
}

/** A27-UX 학생 홈 메모 (2026-11-19 DRAFT §30-a). 한 번도 저장하지 않았으면 body·updatedAt null, version 0 */
export interface HomeMemo {
  body: string | null
  updatedAt: string | null
  version: number
}

/** A27-UX 수행평가 안내문 첨부 (2026-11-19 DRAFT §12-c). 학생 개인 파일 */
export interface NoticeFile {
  fileId: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
}

/** A28-33 학생 달력 개인 임시 배치 (2026-11-23 DRAFT §30-b). 본인 화면 표시용 — 공식 날짜 아님 */
export interface CalendarPlacement {
  sourceKey: string
  displayDate: string
  rangeFrom: string
  rangeTo: string
  updatedAt: string
}

/** §26-1 A28-41 탐구 노트 첨부 업로드 응답 */
export interface NoteAttachment {
  attachmentId: string
  fileName: string
  contentType: string
  sizeBytes: number
  sha256: string
  uploadedAt: string
  previewSupported: boolean
}
