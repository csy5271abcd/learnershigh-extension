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

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error' }
