// Mentor Surface API Type (/api/mentor/**, docs/api/api-contract.md §25 ~ §27).
//
// Contract가 정한 값: Endpoint, Query(type / status / page / size), Create Request(type / title / tags / body / visibility),
// Answer Request(answer / relatedContentIds), 익명 Context(anonymousStudentContext.grade / interestField), Q&A status 3개,
// 목록 Envelope(items + page), Error Format(code / message / details).
//
// Contract에 Field 정의가 없어 Frontend View Model로 둔 값은 각 Field 주석에 "(Contract Gap)"으로 표시한다.
// Backend가 생기면 Contract에 먼저 반영한 뒤 이 파일을 맞춘다. (CLAUDE.md §11)

/** api-contract §25-3 예시("STORY")와 같은 대문자 Enum */
export type MentorContentType = 'PLAN' | 'ROUTINE' | 'STORY' | 'RECORD' | 'CASE'

/** domain.md §29 확정 표시 상태. Review 중간 상태는 OD-05 미확정이라 Enum에 넣지 않는다. */
export type MentorContentStatus = 'DRAFT' | 'PUBLISHED'

/** api-contract §25-3 예시에 있는 값만 둔다. 다른 공개 범위 값은 미확정이다. (Open Decision) */
export type MentorContentVisibility = 'PUBLIC'

export interface PageInfo {
  number: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageResult<T> {
  items: T[]
  page: PageInfo
}

/** 조회 / 저장 / Apply 수 (Contract Gap: Mentor Content 응답 Field 미정의, mentor-hub.md §5 My Content 표시 항목) */
export interface MentorContentMetrics {
  viewCount: number
  saveCount: number
  /** Plan / Routine만 Student Apply가 있다. 다른 유형은 null. */
  applyCount: number | null
}

/**
 * Canonical Review State 확정 전 UI-only representation. (domain.md §29-1, OD-05 / API-OD-06)
 * Record / Case의 Publish Request(POST .../publish) 이후 status는 DRAFT 그대로 두고
 * 이 값으로만 "검수 대기" 화면을 그린다. Persisted Domain Enum이 아니다.
 */
export interface MentorContentReviewPresentation {
  publishRequestSubmitted: boolean
  /** ISO 8601. 검수 요청 시각 (Contract Gap) */
  publishRequestedAt: string | null
}

export interface MentorContentListItem {
  contentId: string
  type: MentorContentType
  title: string
  tags: string[]
  status: MentorContentStatus
  visibility: MentorContentVisibility
  metrics: MentorContentMetrics
  review: MentorContentReviewPresentation
  /** ISO 8601 (Contract Gap) */
  updatedAt: string
  /** ISO 8601, Published일 때만 (Contract Gap) */
  publishedAt: string | null
}

// ---------- Type별 body (api-contract §25-3: "body의 내부 Shape은 Content Type별로 다르다") ----------
// Student Mentor Hub View Model(frontend/student/src/features/mentor-hub/model/types.ts)과 같은 개념을 쓴다.

export type PlanDay = '월' | '화' | '수' | '목' | '금' | '토' | '일'

export interface PlanBodyItem {
  itemId: string
  day: PlanDay
  subject: string
  task: string
  memo: string
}

export interface PlanBodyWeek {
  /** 1부터 시작 */
  week: number
  items: PlanBodyItem[]
}

export interface PlanBody {
  description: string
  weeks: PlanBodyWeek[]
}

export interface RoutineHabit {
  habitId: string
  title: string
  /** 화면 표시용 주기 (예: 매일, 평일) */
  frequency: string
  /** "HH:mm" */
  start: string
  /** "HH:mm" */
  end: string
  description: string
}

export interface RoutineBody {
  description: string
  habits: RoutineHabit[]
}

/** Student Mentor Hub Story 주제 Key (frontend/student/.../storyTopics.ts와 같은 값) */
export type StoryTopic =
  | 'success'
  | 'failure'
  | 'recovery'
  | 'grade-change'
  | 'admission-switch'
  | 'career'
  | 'study-method'
  | 'mental'

export interface StoryBody {
  summary: string
  topics: StoryTopic[]
  /** 빈 줄로 문단을 나눈 본문 */
  text: string
}

export type RecordGrade = 1 | 2 | 3

/** Feature Spec 공개 가능 Record 유형 (Student RecordArea와 같은 값) */
export type RecordArea = 'subject-detail' | 'autonomous' | 'club' | 'career' | 'project'

export interface RecordBody {
  grade: RecordGrade
  semester: 1 | 2 | null
  area: RecordArea
  /** 과목 또는 활동 이름 */
  subjectOrActivity: string
  /** 개인정보를 제거한 기록 문장 */
  recordText: string
  /** 이 기록과 연결된 실제 활동 */
  linkedActivity: string
  mentorNote: string
}

export interface CaseStageBody {
  stageId: string
  title: string
  description: string
}

export interface CaseBody {
  grade: RecordGrade
  /** 과목 / 영역 */
  subject: string
  activityType: string
  summary: string
  stages: CaseStageBody[]
  evidenceSummary: string
  result: string
  reflection: string
  followUp: string
}

export interface MentorContentBodyByType {
  PLAN: PlanBody
  ROUTINE: RoutineBody
  STORY: StoryBody
  RECORD: RecordBody
  CASE: CaseBody
}

export type MentorContentBody = MentorContentBodyByType[MentorContentType]

type DetailOf<T extends MentorContentType> = Omit<MentorContentListItem, 'type'> & {
  type: T
  body: MentorContentBodyByType[T]
}

/** GET /api/mentor/content/{contentId} */
export type MentorContentDetail = { [T in MentorContentType]: DetailOf<T> }[MentorContentType]

/** POST /api/mentor/content (api-contract §25-3) */
export type MentorContentCreateRequest = {
  [T in MentorContentType]: {
    type: T
    title: string
    tags: string[]
    body: MentorContentBodyByType[T]
    visibility: MentorContentVisibility
  }
}[MentorContentType]

/** PATCH /api/mentor/content/{contentId}. Type은 바꾸지 않는다. (Contract에 Field 미정의) */
export interface MentorContentUpdateRequest {
  title?: string
  tags?: string[]
  body?: MentorContentBody
  visibility?: MentorContentVisibility
}

export interface MentorContentListQuery {
  type?: MentorContentType
  status?: MentorContentStatus
  page?: number
  size?: number
}

/** 답변에 연결된 Content 참조. 본문을 복제하지 않는다. (frontend-mentor.md §9) */
export interface MentorContentRef {
  contentId: string
  type: MentorContentType
  title: string
}

// ---------- Q&A (api-contract §26) ----------

/** domain.md §35-1 확정 상태. reassign은 상태로 만들지 않는다. (OD-02) */
export type MentorQuestionStatus = 'pending' | 'overdue' | 'answered'

/** Student Q&A Category Key와 같은 값 (전체 Enum은 미확정, api-contract §24-2 예시 형식) */
export type QuestionCategory = 'STUDY_METHOD' | 'SCHOOL_GRADE' | 'CSAT' | 'ADMISSION_STRATEGY' | 'MENTAL'

/**
 * 질문자 익명 Context (api-contract §26-1). 이 두 값 말고는 Student 정보를 받지 않는다.
 * grade는 Shared Contract 확정 전이라 비어 올 수 있다고 본다.
 */
export interface AnonymousStudentContext {
  grade?: string | null
  interestField?: string | null
}

export interface MentorAnswer {
  text: string
  /** ISO 8601 */
  answeredAt: string
}

export interface MentorQuestion {
  questionId: string
  status: MentorQuestionStatus
  category: QuestionCategory
  /** Student Submit Request의 question (api-contract §24-2) */
  question: string
  /** 질문 보충 설명 (Contract Gap, Student Fixture에 있는 값) */
  detail: string | null
  anonymousStudentContext: AnonymousStudentContext
  /** ISO 8601 */
  submittedAt: string
  answer: MentorAnswer | null
  relatedContent: MentorContentRef[]
}

export interface MentorQuestionListQuery {
  status?: MentorQuestionStatus
  page?: number
  size?: number
}

/** POST /api/mentor/questions/{questionId}/answer (api-contract §26-3) */
export interface MentorAnswerRequest {
  answer: string
  relatedContentIds: string[]
}

// ---------- Profile (api-contract §27, 공개 Profile Field는 §20-3과 같은 이름) ----------

export interface MentorProfile {
  mentorId: string
  name: string
  university: string
  major: string
  admissionType: string
  highSchoolContext: string
  representativeExperience: string
  verified: boolean
  tags: string[]
}

/**
 * PATCH /api/mentor/profile: "수정 가능한 공개 필드만 허용" (api-contract §27-2).
 * 정확한 수정 가능 Field 목록은 미정이라, 인증 대상(이름 / 대학 / 학과 / 전형 / 인증)은 넣지 않는다. (Open Decision)
 */
export interface MentorProfileUpdateRequest {
  highSchoolContext?: string
  representativeExperience?: string
  tags?: string[]
}
