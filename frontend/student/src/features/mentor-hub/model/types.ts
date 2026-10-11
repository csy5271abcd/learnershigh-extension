// Student Mentor Hub Home 화면 전용 View Model이다.
// Backend Entity를 복제한 것이 아니며, Field 이름은 docs/api/api-contract.md §20을 따른다.
// API에 연결될 때 Response → View Model 변환은 이 Feature 안에서 처리한다.

export type MentorContentKind = 'plan' | 'routine' | 'story' | 'qna' | 'record' | 'case'

export interface MentorSummary {
  mentorId: string
  name: string
  university: string
  major: string
  admissionType: string
  highSchoolContext: string
  representativeExperience: string
  tags: string[]
  /** Frontend View Model 전용 (API Contract Field 아님). 없거나 Load 실패 시 이름 첫 글자로 대체한다. */
  profileImageUrl?: string
}

export interface MentorContentSummary {
  contentId: string
  kind: MentorContentKind
  title: string
}

export interface RecommendedMentor {
  mentor: MentorSummary
  /** Student Context와 Mentor 경험의 적합성 설명 (대학 순위 기준이 아니다) */
  recommendationReason: string
  relatedContent: MentorContentSummary[]
}

export interface MixedContentItem extends MentorContentSummary {
  summary: string
  mentor: MentorSummary
}

export interface LinkedTask {
  taskId: string
  title: string
}

export interface AdminRecommendedCase {
  caseId: string
  title: string
  mentor: MentorSummary
  relationReason: string
  /** YYYY-MM-DD */
  recommendedDate: string
  linkedTask: LinkedTask
  /** Case에서 볼 수 있는 과정. Case마다 다를 수 있다. */
  processSteps: string[]
}

export interface StudentRecommendationContext {
  displayName: string
  grade: string
  interestField: string
  currentTask?: LinkedTask
  savedContentTags: string[]
}

export interface MentorHubHome {
  studentContext: StudentRecommendationContext
  recommendedMentors: RecommendedMentor[]
  otherMentors: MentorSummary[]
  adminRecommendedCases: AdminRecommendedCase[]
  mixedContent: MixedContentItem[]
}

// ---------- Mentor Profile (GET /api/student/mentors/{mentorId} 기준 View Model) ----------

/** Profile Content Tab 유형. Q&A는 MentorContent 유형이 아니므로 제외한다. (domain.md §29) */
export type MentorProfileContentKind = Exclude<MentorContentKind, 'qna'>

export interface MentorProfileContent extends MentorContentSummary {
  kind: MentorProfileContentKind
  summary: string
  /** 현재 Student에게 Admin이 추천한 Case인지 (Home의 Admin 추천 Case와 같은 근거) */
  adminRecommended: boolean
}

export interface SchoolGradeTerm {
  term: string
  averageGrade: number
}

export interface CsatSubjectScore {
  area: string
  subject: string
  grade: number
  /** 절대평가 과목은 백분위가 없다. */
  percentile: number | null
}

/** UI 전용 View Model (API Contract에 아직 정의되지 않음) */
export interface MentorScoreSummary {
  note?: string
  schoolGrades?: {
    scaleLabel: string
    terms: SchoolGradeTerm[]
  }
  csat?: {
    basisLabel: string
    subjects: CsatSubjectScore[]
    minimumRequirement?: string
  }
}

export interface MentorExperience {
  title: string
  description: string
}

export interface MentorProfile {
  mentor: MentorSummary
  verified: boolean
  scoreSummary?: MentorScoreSummary
  experiences: MentorExperience[]
  contents: MentorProfileContent[]
}

// ---------- Mentor List (GET /api/student/mentors 기준 View Model) ----------

/** API Contract Query: query / admissionType / major / page / size */
export interface MentorListQuery {
  query: string
  admissionType?: string
  major?: string
  page: number
  size: number
}

export interface MentorListItem {
  mentor: MentorSummary
  /** 공개 Content 수 (Profile Content Tab과 같은 기준) */
  contentCount: number
}

export interface MentorListResult {
  items: MentorListItem[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
  }
  /** UI 전용: Filter 선택지. API Contract에 아직 정의되지 않음 */
  filterOptions: {
    admissionTypes: string[]
    majors: string[]
  }
}

// ---------- Mentor Plan (GET /api/student/mentor-content?type=plan, GET /api/student/mentor-content/{contentId}) ----------
// Contract에 Plan Detail Field가 정의되어 있지 않아 Frontend View Model로 둔다.

/** Plan / Routine 목록 (GET /api/student/mentor-content?type=). Card는 Home Mixed Content Card와 같은 모양을 쓴다. */
export interface MentorContentListResult {
  items: MixedContentItem[]
  page: MentorListResult['page']
}

export type MentorPlanDay = '월' | '화' | '수' | '목' | '금' | '토' | '일'

export interface MentorPlanItem {
  /** Plan Apply의 selectedItemIds / mentorItemId가 가리키는 Item Identity */
  itemId: string
  day: MentorPlanDay
  task: string
  subject: string
  memo?: string
}

export interface MentorPlanWeek {
  /** 1부터 시작 */
  week: number
  items: MentorPlanItem[]
}

export interface MentorPlanDetail {
  contentId: string
  kind: 'plan'
  title: string
  /** 작성 Mentor. Canonical Mentor를 그대로 참조한다. */
  mentor: MentorSummary
  description: string
  durationWeeks: number
  daysPerWeek: number
  weeks: MentorPlanWeek[]
}

// ---------- Mentor Plan Apply (POST .../plan-apply-preview, POST .../apply-plan 기준 View Model) ----------
// Contract에는 Request(startDate / selectedItemIds / libraryMappings)와 Apply Response만 정의되어 있다.
// 시간대 / 충돌 상세 / 해결 방법 / 날짜 계산 결과는 Frontend View Model이다. (Contract Gap)

/** Frontend 검증용 Library 표시 Model. 기존 LearnersHigh Library Schema가 아니다. */
export interface ExistingLibraryItemView {
  libraryItemId: string
  title: string
  subject: string
  type: string
}

export interface PlanLibraryMapping {
  mentorItemId: string
  existingLibraryItemId: string
}

export interface PlanApplyPreviewRequest {
  /** YYYY-MM-DD */
  startDate: string
  selectedItemIds: string[]
  libraryMappings: PlanLibraryMapping[]
}

/** "HH:mm" */
export interface PlanTimeSlot {
  start: string
  end: string
}

/** 선택 Item이 내 주간계획에 들어갈 날짜 / 시간 */
export interface PlanApplyPreviewItem {
  mentorItemId: string
  /** YYYY-MM-DD */
  date: string
  slot: PlanTimeSlot
}

export interface PlanApplyConflict {
  mentorItemId: string
  existingSchedule: { title: string; slot: PlanTimeSlot }
  /** "옮기기"를 고르면 쓰는 시간 */
  suggestedSlot: PlanTimeSlot
}

export interface PlanApplyPreviewResult {
  resolvedItems: PlanApplyPreviewItem[]
  conflicts: PlanApplyConflict[]
}

/** Plan-02 / 03 Mockup의 해결 방법: 옮기기 / 이번 항목 빼기 */
export type PlanConflictResolution = 'move' | 'exclude'

export interface PlanApplyRequest extends PlanApplyPreviewRequest {
  conflictResolutions: { mentorItemId: string; resolution: PlanConflictResolution }[]
}

export interface PlanApplyResult {
  applicationId: string
  createdPlanItemIds: string[]
  sourceMentorPlanId: string
  snapshotCreated: boolean
}

// ---------- Mentor Routine (GET /api/student/mentor-content?type=routine, GET .../{contentId}) ----------
// Contract에 Routine Detail Field가 없어 Frontend View Model로 둔다. (Routine-01 Mockup 기준)

/** Timeline 한 칸: 언제 무엇을 하는지 */
export interface MentorRoutineBlock {
  blockId: string
  slot: PlanTimeSlot
  title: string
  description: string
}

/** 따로 골라 적용할 수 있는 습관 (Apply의 selectedHabitIds 대상) */
export interface MentorRoutineHabit {
  habitId: string
  title: string
  /** 화면 표시용 주기 (예: 매일, 평일) */
  frequency: string
  slot: PlanTimeSlot
  description: string
}

export interface MentorRoutineDetail {
  contentId: string
  kind: 'routine'
  title: string
  /** 작성 Mentor. Canonical Mentor를 그대로 참조한다. */
  mentor: MentorSummary
  description: string
  /** 예: 하루 Timeline / 평일 저녁 Timeline */
  timelineTitle: string
  /** 적용하면 들어갈 요일 (Routine-02 Mockup "월~금 계획에 …") */
  applyDays: MentorPlanDay[]
  timeline: MentorRoutineBlock[]
  habits: MentorRoutineHabit[]
}

// ---------- Mentor Routine Apply (POST .../routine-apply-preview, POST .../apply-routine 기준 View Model) ----------
// Contract에는 Preview Request(selectedHabitIds)와 Response(conflicts)만 있다.
// 전체 적용(Timeline 전체) 표현 / 충돌 상세 / 해결 방법 / Apply 결과는 Frontend View Model이다. (Contract Gap)

/** 전체 적용 = Timeline 전체, 습관만 적용 = 고른 Habit (Routine-01 / 02 Mockup) */
export type RoutineApplyMode = 'all' | 'habits'

export interface RoutineApplyPreviewRequest {
  selectedHabitIds: string[]
  /** Frontend View Model: 전체 적용 여부 (Contract Gap) */
  applyAll: boolean
}

export interface RoutineApplyTarget {
  /** blockId 또는 habitId */
  targetId: string
  title: string
  slot: PlanTimeSlot
}

export interface RoutineApplyConflict {
  targetId: string
  /** 겹치는 요일 */
  days: MentorPlanDay[]
  /** 겹치는 기존 일정 이름 */
  existingTitles: string[]
}

export interface RoutineApplyPreviewResult {
  applyDays: MentorPlanDay[]
  items: RoutineApplyTarget[]
  conflicts: RoutineApplyConflict[]
}

/** Routine-02 Mockup의 해결 방법: 겹치는 요일만 빼기 / 그래도 추가 */
export type RoutineConflictResolution = 'skip-conflict-days' | 'keep'

export interface RoutineApplyRequest extends RoutineApplyPreviewRequest {
  conflictResolutions: { targetId: string; resolution: RoutineConflictResolution }[]
}

export interface RoutineApplyResult {
  applicationId: string
  createdScheduleItemIds: string[]
  sourceMentorRoutineId: string
  snapshotCreated: boolean
}

// ---------- Mentor Story (GET /api/student/mentor-content?type=story, GET .../{contentId}) ----------
// Contract에 Story Topic / 본문 / 저장 수 Field가 없어 Frontend View Model로 둔다. (Story-00 ~ 02 Mockup 기준)

/** Feature Spec Story 주제의 내부 Key (화면 이름은 storyTopics.ts) */
export type StoryTopic =
  | 'success'
  | 'failure'
  | 'recovery'
  | 'grade-change'
  | 'admission-switch'
  | 'career'
  | 'study-method'
  | 'mental'

/** 저장 상태 (PUT /api/student/mentor-content/{contentId}/saved). saveCount는 Mockup 표시용 (Contract Gap) */
export interface ContentSaveState {
  saved: boolean
  saveCount: number
}

export interface MentorStoryListItem extends MixedContentItem, ContentSaveState {
  topics: StoryTopic[]
}

export interface MentorStoryListResult {
  items: MentorStoryListItem[]
  page: MentorListResult['page']
}

/** Story 본문 한 덩어리: 문단 / 소제목 / 사진 메모(Caption) / 인용 (Story-01 / 02 Mockup) */
export type StoryBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'photoMemo'; caption: string }
  | { type: 'quote'; text: string }

export interface MentorStory extends ContentSaveState {
  contentId: string
  kind: 'story'
  title: string
  summary: string
  /** 작성 Mentor. Canonical Mentor를 그대로 참조한다. */
  mentor: MentorSummary
  topics: StoryTopic[]
  readMinutes: number
  /** YYYY-MM-DD */
  publishedDate: string
  body: StoryBlock[]
}

/** 관련 질문 Context: 다음 단계(Student Q&A)에서 질문 작성 화면이 받는다. 질문 문장은 만들지 않는다. */
export interface RelatedQuestionContext {
  mentorId: string
  sourceContentId: string
  sourceTitle: string
  contextType: 'story'
}

// ---------- Student Mentor Q&A (GET / POST /api/student/mentor-questions, GET .../{questionId}) ----------
// Q&A는 MentorContent가 아닌 별도 Student Question Flow다. (domain.md §35)
// Contract 확정 값: status(pending / answered / overdue), Submit Request(mentorId / category / question).
// 공개 목록 / 익명 Context / 도움돼요 / 재배정 기록은 Frontend View Model이다. (Contract Gap)

/** 지속 상태는 이 세 값만 쓴다. reassign은 상태가 아니라 Action 후보다. (domain.md §35-1) */
export type MentorQuestionStatus = 'pending' | 'answered' | 'overdue'

/** StudentQ&A-00 Mockup Category. Contract 예시(STUDY_METHOD)와 같은 형식의 Frontend Key (전체 Enum은 미확정) */
export type QuestionCategory = 'STUDY_METHOD' | 'SCHOOL_GRADE' | 'CSAT' | 'ADMISSION_STRATEGY' | 'MENTAL'

/** 질문자 익명 Context (예: 고2 · 화학공학 관심). 실명 / 학교 / 기관은 두지 않는다. (domain.md §36) */
export interface AnonymousStudentContext {
  grade: string
  interest: string
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
  /** Submit Request의 question */
  question: string
  /** Mockup의 질문 보충 설명 (Contract에 없음) */
  detail?: string
  /** 현재 질문을 받는 Mentor. Canonical Mentor를 그대로 참조한다. */
  mentor: MentorSummary
  student: AnonymousStudentContext
  /** ISO 8601 */
  submittedAt: string
  answer?: MentorAnswer
  relatedContent: MentorContentSummary[]
  /** 내가 쓴 질문인지 (내 질문 목록) */
  mine: boolean
  helpful: boolean
  /** Mockup 표시용 Fixture 값 (Contract에 Reaction API 없음) */
  helpfulCount: number
  /** 재배정 전 Mentor (Frontend 표시용, 상태 값이 아니다) */
  reassignedFrom?: MentorSummary
}

/** 모든 질문(공개된 답변) / 내 질문 */
export type QuestionView = 'public' | 'mine'

export interface MentorQuestionListResult {
  items: MentorQuestion[]
  page: MentorListResult['page']
}

export interface MentorQuestionSubmitRequest {
  mentorId: string
  category: QuestionCategory
  question: string
}

export interface MentorQuestionSubmitResult {
  questionId: string
  status: MentorQuestionStatus
  mentorId: string
  submittedAt: string
}

/** 재배정 요청 결과 (Contract에 Endpoint 없음: Frontend View Model) */
export interface QuestionReassignResult {
  previousMentorId: string
  newMentorId: string
}

/** 질문 작성 화면이 받는 Context. Story 정보는 화면 표시용이며 Submit Request에 넣지 않는다. */
export interface QuestionComposerContext {
  mentor: MentorSummary
  relatedStory?: MentorContentSummary
}

// ---------- Mentor Record (GET /api/student/mentor-content?type=record, GET .../{contentId}) ----------
// Published + 검수 완료된 비식별 Record만 Student에게 보인다는 경계(api-contract §21-2)를 전제로 한다.
// 검수 상태 Enum(OD-05)은 정하지 않고 화면에는 "개인정보 제거 · 검수 완료" 표시만 둔다.
// 학년 / 영역 / 기록 문장 / 연결 활동 등은 Frontend View Model이다. (Contract Gap)

export type RecordGrade = 1 | 2 | 3

/** Feature Spec 공개 가능 유형 (행동특성 및 종합의견은 제외) */
export type RecordArea = 'subject-detail' | 'autonomous' | 'club' | 'career' | 'project'

/** 이 기록과 연결된 실제 활동. Activity Case가 있으면 caseId로 이어진다. */
export interface RecordLinkedActivity {
  title: string
  description: string
  caseId?: string
}

export interface MentorRecord {
  contentId: string
  kind: 'record'
  title: string
  /** 작성 Mentor. Canonical Mentor를 그대로 참조한다. */
  mentor: MentorSummary
  grade: RecordGrade
  /** 학기 구분이 없는 기록(창의적 체험활동 등)은 없음 */
  semester?: 1 | 2
  area: RecordArea
  /** 과목 또는 활동 이름 */
  subjectOrActivity: string
  /** 개인정보를 제거한 기록 문장 (읽기 전용) */
  recordText: string
  linkedActivity: RecordLinkedActivity
  relatedContent: MentorContentSummary[]
  /** Mentor가 덧붙인 짧은 Context */
  mentorNote: string
}

export interface MentorRecordListQuery {
  query: string
  grade?: RecordGrade
  area?: RecordArea
  page: number
  size: number
}

export interface MentorRecordListResult {
  items: MentorRecord[]
  page: MentorListResult['page']
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error' }
