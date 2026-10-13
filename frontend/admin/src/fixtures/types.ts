/*
 * Admin Canonical Fixture Entity 타입 (Admin Surface 전용, 실제 API 연결 전).
 * - 화면별 View Model이 아니라 Entity 단위다. Feedback Queue / Today Board / Student 360 / Operations는 read-model/에서 이 값으로 계산한다.
 * - Student Surface와 공유하는 실체(최하은 Task · Activity · Connection · Interview · Mentor Case)는 Student Canonical Fixture와 같은 id · 값을 쓴다.
 *   (frontend/student를 import하지 않는다. 값을 읽어 맞춘다)
 * - 여기 있는 상태 문자열은 Fixture 의미 값이다. Backend Enum으로 확정하지 않는다. (Stage Enum · Topic Approval · Connection · ParentReport Status = Open Decision)
 */

export type StudentGrade = '고1' | '고2' | '고3'

export interface AdminStudent {
  studentId: string
  displayName: string
  grade: StudentGrade
  /** 관심 분야 (domain.md §9-1 Student Context). 없으면 생략 */
  interestField?: string
  /** 희망 전공 (§9-1 desiredMajor). 없으면 생략 */
  desiredMajor?: string
}

// ---------- Existing LearnersHigh Study / Plan (Integration Boundary 대상, 재구현 아님) ----------

export type AttendanceState = 'attended' | 'not-yet' | 'absent'

/** 기존 LearnersHigh 등원 · 순공 · Plan 데이터를 Snapshot 시점에 읽어 온 값 (실제 Adapter 연결 전 Fixture) */
export interface ExistingStudySnapshot {
  studentId: string
  attendance: AttendanceState
  /** 등원 시각 HH:MM (등원한 경우) */
  checkInTime?: string
  /** 연속 미등원 일수 (오늘 포함, 기존 출결 기록 기준) */
  consecutiveAbsentDays: number
  /** 오늘 순공(분). 0 = 오늘 학습 기록 없음 */
  todayStudyMinutes: number
  /** 최근 7일 Plan 실행률 (0~1). Today Board Plan 기준 기간 = 최근 7일 (domain.md §59) */
  recent7DayPlanRate: number
  /** 직전 7일 Plan 실행률 (변화 비교용) */
  previous7DayPlanRate: number
  /** 최근 7일 과목별 순공(분). 최근 7일 전체 순공은 이 합으로 계산한다. (따로 저장하지 않는다) */
  subjectMinutes7d: { subject: string; minutes: number }[]
}

// ---------- Task ----------

export type TaskStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** Topic 상태 (Student Fixture model/topic.ts와 같은 의미 값. topicApprovalStatus Enum 미확정 OD-03) */
export type TopicState = 'not-submitted' | 'in-review' | 'direction-requested' | 'confirmed'

export interface AdminTaskTopic {
  state: TopicState
  text: string
  /** 공용 검토 대기열에 들어간 시각 (in-review) */
  submittedAt?: string
  /** 방향 요청 문장 (direction-requested) */
  guidance?: string
}

export type AiAnalysisStatus = 'processing' | 'success' | 'failed'

/**
 * 원본 파일 Resource (Admin assets의 개발용 Sample 파일). 미리보기 · 다운로드는 이 값이 있을 때만 한다.
 * 파일 이름만 있고 이 값이 없으면 "원본 파일 준비 전"이다. (File Storage 미정 OD-09)
 */
export interface FileBacking {
  url: string
  mimeType: string
  sizeBytes: number
}

/** Task 과정 자료 단계 Tag (Student TaskProcessCategory와 같은 값: 계획 · 조사 · 초안 · 최종 · 발표) */
export type EvidenceStageTag = 'plan' | 'research' | 'draft' | 'final' | 'presentation'

/** Task 과정 자료 (Student TaskEvidence와 같은 의미). Version과 다른 Entity다. */
export interface AdminTaskEvidence {
  evidenceId: string
  taskId: string
  fileName: string
  stageTag: EvidenceStageTag
  /** ISO 8601 */
  createdAt: string
  file?: FileBacking
}

/** Revision 비교 Block (Student revisionDiffs와 같은 Shape) */
export type RevisionDiffBlock =
  | { kind: 'same'; text: string }
  | { kind: 'changed'; before: string; after: string }
  | { kind: 'removed'; before: string }
  | { kind: 'added'; after: string }

export interface RevisionDiff {
  fromVersionId: string
  toVersionId: string
  /** 이 수정이 반영한 선생님 피드백 (feedbackId) */
  appliedFeedbackId?: string
  blocks: RevisionDiffBlock[]
}

export interface AdminTaskVersion {
  versionId: string
  number: number
  fileName: string
  /** ISO 8601 */
  submittedAt: string
  aiStatus: AiAnalysisStatus
  /** AI 결과 시각 (success / failed) */
  aiAnalyzedAt?: string
  /** 실패 시 다시 시도 가능 여부 (Student가 다시 시도한다) */
  retryAllowed?: boolean
  /** AI 사전 점검 시도 이력 (실패 후 다시 시도한 경우만. 상태 수준만, 내부 Log 없음) */
  aiAttempts?: { status: AiAnalysisStatus; at: string }[]
  /** 제출 파일 원본 (없으면 파일 이름만) */
  file?: FileBacking
}

export type ParentShareStatus = 'not_shared' | 'consented' | 'attached' | 'shared'

export interface AdminFinalArtifact {
  artifactId: string
  fileName: string
  parentShareStatus: ParentShareStatus
}

export interface AdminTask {
  taskId: string
  studentId: string
  title: string
  subject: string
  /** YYYY-MM-DD */
  deadlineDate: string
  currentStage: TaskStageNumber
  /** 단계 안의 상태 문구 (Student Task 요약과 같은 값) */
  stageStatus: string
  deliverableSummary: string
  /** Student에게 보이는 다음 할 일 (Student Task 요약과 같은 값) */
  nextAction: string
  turn: 'student' | 'waiting' | 'done'
  onHold?: boolean
  topic?: AdminTaskTopic
  /** 과정 자료. null = 자료 정보 없음 (빈 배열 = 실제로 없음과 구분) */
  evidence: AdminTaskEvidence[] | null
  /** 제출 Version. null = Version 정보 없음 (Student Fixture에도 없음), [] = 실제로 제출 없음 */
  versions: AdminTaskVersion[] | null
  /** 평가 기준 (안내문에서 읽은 값). null = 정보 없음 */
  criteria: { criterionId: string; name: string; points: number | null; aiCheck?: string }[] | null
  finalArtifact: AdminFinalArtifact | null
  /** Version 사이 내용 비교 (내용 비교 Fixture가 있는 Task만, Student revisionDiffs 의미) */
  revisionDiffs?: RevisionDiff[]
  /** 수행평가 안내문 (Stage 1 등록 파일, 정보가 있는 Task만) */
  guideFile?: { fileName: string; registeredDate: string }
  /** 학생이 정리한 참고 자료 (정보가 있는 Task만) */
  references?: { referenceId: string; kind: 'link' | 'article' | 'textbook'; title: string; source: string; usage: string }[]
  /** Task와 연결된 Mentor Activity Case (contentId) */
  relatedMentorCaseIds: string[]
}

// ---------- Task Feedback (Shared Queue 원본) ----------

export type AiItemDecision = 'ACCEPT' | 'EXCLUDE' | 'EDIT_AND_DELIVER'

export interface AdminAiItem {
  itemId: string
  /** 연결된 평가 기준 이름 (없으면 생략) */
  criterionName?: string
  summary: string
}

export interface TaskReviewDelivery {
  /** ISO 8601 */
  deliveredAt: string
  /** 작성자 Audit 정보 (배정이 아니다) */
  reviewedBy: string
  studentComment: string
  nextAction: string
  /** 이 Version 다음에 수정본이 더 필요한지 (Student reviewDecisions 의미) */
  needsAnotherRevision: boolean
  parentReportCandidate: boolean
  /** 학생에게 전달된 AI 항목 (동의 / 수정 후 전달). 제외 항목은 넣지 않는다. */
  deliveredAiItems: { itemId: string; text: string; decision: Exclude<AiItemDecision, 'EXCLUDE'> }[]
}

/** Version 하나에 대한 선생님 검토. delivery가 없으면 공용 Queue에서 기다리는 중이다. */
export interface TaskReview {
  feedbackId: string
  taskId: string
  versionId: string
  /** 공용 검토 대기열에 들어간 시각 (= AI 사전 점검 성공 시각) */
  queuedAt: string
  aiItems: AdminAiItem[]
  delivery: TaskReviewDelivery | null
}

// ---------- Growth Activity ----------

export type ActivityType =
  | 'school-competition'
  | 'external-competition'
  | 'volunteer'
  | 'club'
  | 'school-project'
  | 'self-study'
  | 'career'
  | 'etc'

/** Student model/activity.ts와 같은 의미 값 */
export type ActivityStatus = 'draft' | 'submitted' | 'feedback-waiting' | 'feedback-delivered' | 'reflected' | 'archived'

export interface ActivityReflection {
  participationReason: string
  role: string
  whatIDid: string
  difficulty: string
  learning: string
  nextChange: string
  followUpActivity: string
}

export interface ActivityFeedback {
  author: string
  deliveredAt: string
  strength: string
  needsDetail: string
  question: string
  nextSuggestion: string
  parentReportCandidate?: boolean
}

export interface AdminActivity {
  activityId: string
  studentId: string
  title: string
  type: ActivityType
  organizer: string
  startDate: string
  /** 하루짜리면 '' */
  endDate: string
  role: string
  participationReason: string
  process: string
  contribution: string
  result: string
  followUp: string
  status: ActivityStatus
  reflection: ActivityReflection | null
  feedback: ActivityFeedback | null
  /** 과정 자료 파일 이름 (Task Evidence와 다른 저장소) */
  files: string[]
  /** 과정 자료 원본 (파일 이름 → 원본). 없으면 파일 이름만 있다. */
  fileBackings?: Record<string, FileBacking>
  /** 활동 Tag (학생 입력) */
  tags?: string[]
  /** 학생이 피드백을 요청한 시각 (Admin Queue 대기 시간 기준). Student Fixture에 없는 Admin Queue Metadata */
  feedbackRequestedAt?: string
}

// ---------- TestResult (api-contract §35) ----------

export type TestResultType = 'school_exam' | 'mock_exam' | 'academy_test'

export interface AdminTestResult {
  testResultId: string
  studentId: string
  type: TestResultType
  name: string
  /** Contract Item에 없는 Fixture 필드 (과목별 변화 표시용, Contract Gap) */
  subject: string
  /** YYYY-MM-DD (Contract Item에 없는 Fixture 필드) */
  date: string
  score?: number
  grade?: number
  percentile?: number
  rank?: number
  previousResult?: number
  change?: number
}

// ---------- SchoolRecordSnapshot (§36) ----------

export interface AdminSchoolRecord {
  schoolRecordSnapshotId: string
  studentId: string
  status: 'candidate' | 'confirmed'
  category: '세부능력 및 특기사항' | '동아리활동' | '자율활동' | '진로활동'
  /** 세특 과목 (Contract에 없는 Fixture 필드) */
  subject?: string
  summary: string
  snapshotDate: string
}

// ---------- Connection (§37, 상태 Enum 미확정 API-OD-04) ----------

export type ConnectionReviewState = 'candidate' | 'confirmed' | 'rejected'

export interface ConnectionSourceRef {
  source: 'task' | 'growth'
  sourceId: string
}

export interface AdminConnection {
  connectionId: string
  studentId: string
  sourceRefs: [ConnectionSourceRef, ConnectionSourceRef]
  /** AI 후보 이유 (AI Suggestion) */
  reason: string
  reviewState: ConnectionReviewState
  reviewedAt?: string
}

// ---------- InterviewQuestion (§38) ----------

export interface AdminInterviewQuestion {
  questionId: string
  studentId: string
  question: string
  relatedActivityIds: string[]
  /** 공개 여부 (Fixture 의미 값, 공개 상태 Enum 미확정) */
  published: boolean
  /** 확정 Connection에서 나온 질문이면 그 id (Contract Create Request에 없는 Fixture Metadata) */
  connectionId?: string
  /** Student 연습 상태 (Student가 바꾼다. Admin은 읽기만) */
  practiceStatus: 'NOT_STARTED' | 'PRACTICING'
  /** Student 답변 (Student 원문. Admin은 수정하지 않는다) */
  answer: string
  source: 'ai-draft' | 'admin'
}

// ---------- Mentor ----------

/** Student Mentor Hub Canonical Activity Case를 같은 contentId로 가리키는 Admin 검색용 값 (activityCases.fixture.ts 값 그대로) */
export interface MentorCaseRef {
  contentId: string
  title: string
  mentorId: string
  mentorName: string
  mentorAffiliation: string
  /** 활동 당시 학년 */
  gradeLabel: string
  subject: string
  activityType: string
}

export interface MentorCaseRecommendation {
  recommendationId: string
  studentId: string
  caseId: string
  taskId: string | null
  activityId: string | null
  reason: string
  /** YYYY-MM-DD. Student Fixture에 날짜가 없으면 null */
  recommendedDate: string | null
}

/** 학생이 기존 LearnersHigh Plan에 적용한 Mentor Plan / Routine (Snapshot, Existing Plan 연결 대상) */
export interface MentorApplication {
  applicationId: string
  studentId: string
  kind: 'plan' | 'routine'
  contentId: string
  title: string
  mentorName: string
  appliedDate: string
  /** 적용 Item 중 완료 수 / 전체 (기존 Plan 실행 기록) */
  progress: { done: number; total: number }
}

// ---------- ParentReport (§40, Status Enum 미확정 API-OD-01) ----------

export interface AdminParentReport {
  parentReportId: string
  studentId: string
  /** YYYY-MM */
  period: string
  /** Contract에 알려진 문자열 그대로 (전역 Enum으로 고정하지 않는다) */
  status: 'Draft' | 'Reviewing' | 'Ready' | 'Sent'
  sentAt: string | null
}

// ---------- Mentor Activity Case 상세 (Student activityCases.fixture.ts와 같은 값) ----------

export type CaseMaterialRole = 'evidence' | 'draft' | 'feedback' | 'revision' | 'final'

export interface CaseDocumentPage {
  pageNumber: number
  title: string
  lead?: string
  body?: string
  bullets?: string[]
  paragraphs?: string[]
  footnote?: string
}

/** Case 자료 미리보기 View Model (원본 파일을 해석한 것이 아니라 Student Case가 쓰는 표시용 값) */
export type CaseMaterialPreview =
  | { kind: 'slides'; pages: CaseDocumentPage[] }
  | { kind: 'document'; pages: CaseDocumentPage[] }
  | { kind: 'table'; title: string; description?: string; columns: string[]; rows: string[][]; footnote?: string }

export interface CaseMaterial {
  materialId: string
  role: CaseMaterialRole
  title: string
  format: string
  description: string
  stageId: string
  fileName?: string
  preview?: CaseMaterialPreview
  original?: { url: string; mimeType: string; fileSizeBytes: number }
}

export interface CaseStage {
  stageId: string
  title: string
  summary: string
  description: string
  checklist: string[]
  planChange?: { before: string; after: string }
  feedback?: { source: string; text: string; note: string }
}

export interface MentorCaseDetail {
  contentId: string
  summary: string
  activities: string[]
  stages: CaseStage[]
  materials: CaseMaterial[]
  reflection: string
  followUp?: string
  relatedContent: { contentId: string; kind: string; title: string; summary: string; mentorName: string }[]
}

// ---------- Mentor Profile / Content (Student Mentor Hub Canonical Fixture와 같은 값 · Admin Mentor 추천 화면용) ----------

export type MentorContentType = 'case' | 'plan' | 'routine' | 'story' | 'record'

export interface MentorProfileRecord {
  mentorId: string
  name: string
  university: string
  major: string
  admissionType: string
  highSchoolContext: string
  representativeExperience: string
  tags: string[]
  verified: boolean
  scoreSummary: {
    note?: string
    schoolGrades?: { scaleLabel: string; terms: { term: string; averageGrade: number }[] }
    csat?: { basisLabel: string; subjects: { area: string; subject: string; grade: number; percentile: number | null }[]; minimumRequirement?: string }
  } | null
  experiences: { title: string; description: string }[]
}

export type MentorPlanDay = '월' | '화' | '수' | '목' | '금' | '토' | '일'

export interface MentorTimeSlot {
  start: string
  end: string
}

export interface MentorPlanContent {
  contentId: string
  kind: 'plan'
  title: string
  mentorId: string
  summary: string
  description: string
  durationWeeks: number
  daysPerWeek: number
  weeks: { week: number; items: { itemId: string; day: MentorPlanDay; task: string; subject: string; memo?: string }[] }[]
}

export interface MentorRoutineContent {
  contentId: string
  kind: 'routine'
  title: string
  mentorId: string
  summary: string
  description: string
  timelineTitle: string
  applyDays: MentorPlanDay[]
  timeline: { blockId: string; slot: MentorTimeSlot; title: string; description: string }[]
  habits: { habitId: string; title: string; frequency: string; slot: MentorTimeSlot; description: string }[]
}

export type MentorStoryBlock = { type: 'paragraph'; text: string } | { type: 'heading'; text: string } | { type: 'photoMemo'; caption: string } | { type: 'quote'; text: string }

export interface MentorStoryContent {
  contentId: string
  kind: 'story'
  title: string
  mentorId: string
  summary: string
  /** Student storyTopics.ts 화면 이름 */
  topics: string[]
  readMinutes: number
  publishedDate: string
  body: MentorStoryBlock[]
}

export interface MentorRecordContent {
  contentId: string
  kind: 'record'
  title: string
  mentorId: string
  summary: string
  grade: 1 | 2 | 3
  semester?: 1 | 2
  /** Student records.ts 영역 이름 */
  areaLabel: string
  subjectOrActivity: string
  /** 개인정보를 제거한 기록 문장 (읽기 전용 · 원본 파일 없음) */
  recordText: string
  linkedActivity: { title: string; description: string; caseId?: string }
  relatedContent: { contentId: string; kind: string; title: string }[]
  mentorNote: string
}

/**
 * Case 외 Mentor Content 추천 기록 (Plan · Routine · Story · Record).
 * Admin 추천 Mutation API가 Contract에 없다. (Gap: MENTOR-CONTENT-RECOMMENDATION-API)
 * Admin 화면 안의 임시 기록일 뿐이며 학생 Mentor Hub에는 반영하지 않는다.
 */
export interface MentorContentRecommendationDraft {
  draftId: string
  studentId: string
  contentId: string
  kind: Exclude<MentorContentType, 'case'>
  taskId: string | null
  activityId: string | null
  reason: string
  createdAt: string
}

// ---------- Today Board 메시지 · 리마인더 (Delivery Provider / API 미정 · Gap: MESSAGE-REMINDER-DELIVERY) ----------

/** 발송 요청 준비 기록. 실제 학생 알림 전송이 아니다. (전송 완료 상태 값을 만들지 않는다) */
export interface StudentOutreachDraft {
  outreachId: string
  kind: 'message' | 'reminder'
  studentId: string
  /** 리마인더 관련 대상 (선택) */
  taskId: string | null
  activityId: string | null
  title: string | null
  body: string
  /** 리마인더 전달 예정 시각 (YYYY-MM-DDTHH:mm, 메시지는 null) */
  scheduledAt: string | null
  /** 메시지 Template 이름 (선택) */
  template: string | null
  preparedAt: string
}
