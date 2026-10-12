// ---------- Student Task List (GET /api/student/tasks, api-contract §9-1) ----------
// Contract 필드: taskId / title / subject / deadlineDate / currentStage / nextAction
// 그 외(제출물 요약 / 단계 상태 문구 / 차례 / 주의 표시 / snapshotDate)는 Tasks-00 Mockup을 위한 Frontend View Model이다. (Contract Gap)

/**
 * 수행평가 8단계 번호 (school-admissions.md / domain.md §12-2).
 * Contract의 currentStage Enum Naming은 미확정이라 Frontend는 단계 번호로만 다룬다.
 */
export type TaskStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** 지금 누가 움직여야 하는지. Stage와 별개다. */
export type TaskTurn = 'student' | 'waiting'

/**
 * Student에게 보이는 주의 표시. Admin 운영 상태(domain.md §12-3)를 Stage와 분리해 받고,
 * Student에게는 운영시간 숫자 없이 상태로만 보여준다. (예: Review 48h 초과 → Review 지연)
 */
export type TaskAttentionFlag = 'reviewDelayed' | 'deadlinePassed' | 'onHold'

export interface StudentTaskSummary {
  taskId: string
  title: string
  subject: string
  /** YYYY-MM-DD */
  deadlineDate: string
  currentStage: TaskStageNumber
  /** 현재 단계 안의 상태 (예: V2 검토 대기, AI 1차 분석 중). Backend가 정한 문구를 그대로 보여준다. */
  stageStatus: string
  /** 제출물 요약 (예: A3 포스터 + 3분 발표) */
  deliverableSummary: string
  turn: TaskTurn
  attentionFlags: TaskAttentionFlag[]
  /** 다음에 할 일. AI / Admin이 학생 제출물을 대신 쓰는 내용이 아니라 행동 안내다. */
  nextAction: string
}

export interface StudentTaskListResult {
  items: StudentTaskSummary[]
  /** 이 목록이 기준으로 삼은 날짜 (D-day 계산 기준, YYYY-MM-DD) */
  snapshotDate: string
}

// ---------- Student Task Detail (GET /api/student/tasks/{taskId}, api-contract §9-3 / §11 / §12 / §13) ----------
// Task Identity는 목록과 같은 StudentTaskSummary(taskId)를 그대로 쓰고, Detail에만 필요한 값을 더한다.
// 평가 기준 / 제출물 / 참고 자료 / 과정 자료 / 피드백 반영 여부 / Revision Diff Shape는 Contract에 없어 Frontend View Model이다. (Contract Gap)
// 각 Section 값이 null이면 "이 Task의 상세 자료가 아직 준비되지 않음"(Fixture에 없음), 빈 배열이면 "실제로 없음"이다.

/** 수행평가 안내문 (Stage 1에서 등록한 파일) */
export interface TaskGuideFile {
  fileName: string
  format: string
  /** YYYY-MM-DD */
  registeredDate: string
}

export interface TaskEvaluationCriterion {
  criterionId: string
  name: string
  /** 배점. 학생이 등록할 때 비워둘 수 있다. */
  points: number | null
  /** 최신 Version의 AI 사전 점검 한 줄. 참고용 보조 점검이며 채점이 아니다. */
  aiCheck?: string
}

export type TaskReferenceKind = 'link' | 'article' | 'textbook'

/** 참고 자료: 학생이 과제를 위해 참고하는 기사 / 교과서 / 링크. (과정 자료와 다른 배열) */
export interface TaskReferenceMaterial {
  referenceId: string
  kind: TaskReferenceKind
  title: string
  source: string
  /** 어디에 쓰는지 (예: thesis 근거 통계 1개) */
  usage: string
}

/** 과정 자료 단계 (Evidence stageTag의 Frontend 표현. Contract Enum 미확정) */
export type TaskProcessCategory = 'plan' | 'research' | 'draft' | 'final' | 'presentation'

/** 과정 자료(Evidence / 제출 Version 파일): 학생이 실제로 조사 · 작성 · 수정하며 만든 자료 */
export interface TaskProcessMaterial {
  evidenceId: string
  fileName: string
  format: string
  category: TaskProcessCategory
  /** YYYY-MM-DD */
  createdDate: string
}

/** 선생님 피드백 (teacherFeedback). 검토 중이면 comment가 없다. */
export interface TaskTeacherFeedback {
  feedbackId: string
  versionLabel: string
  status: 'delivered' | 'reviewing'
  comment?: string
  nextAction?: string
  /** ISO 8601 */
  deliveredAt?: string
}

/** AI 사전 점검 한 항목. reflected는 학생이 반영 여부를 표시한 값이다. (Contract Gap, 화면에서는 읽기 전용) */
export interface TaskAiFeedbackItem {
  itemId: string
  summary: string
  reflected: boolean
}

/** AI 사전 점검 (aiFeedback). 참고용이며 선생님이 확인하기 전 결과다. */
export interface TaskAiFeedback {
  feedbackId: string
  versionLabel: string
  /** ISO 8601 */
  analyzedAt: string
  items: TaskAiFeedbackItem[]
}

export interface TaskFeedback {
  teacher: TaskTeacherFeedback[]
  ai: TaskAiFeedback[]
}

/** Task와 연결된 Mentor Activity Case. Case 자체 값은 Mentor Hub Canonical Case를 contentId로 참조한다. */
export interface TaskMentorCaseLink {
  contentId: string
  /** 선생님(학원)이 이 Task에 추천한 Case인지. 내부 출처는 Admin Recommendation이다. */
  teacherRecommended: boolean
  /** 왜 지금 이 Task에 도움이 되는지 */
  relationNote: string
}

/** 화면 표시용 Case 값. Canonical Activity Case에서 그대로 읽어 온 값이다. (복제 데이터가 아니다) */
export interface TaskMentorCaseView extends TaskMentorCaseLink {
  title: string
  mentorName: string
  /** 대학 · 학과 */
  mentorAffiliation: string
  /** 활동 당시 학년 (예: 고1) */
  gradeLabel: string
  activityType: string
  stageTitles: string[]
  materials: { materialId: string; roleLabel: string; name: string; description: string }[]
}

/** 제출 Version (V1 / V2 …). 존재하는 Version만 둔다. */
export interface TaskVersion {
  versionId: string
  label: string
  /** ISO 8601 */
  submittedAt: string
  /** 이 Version에서 바꾼 점 (학생이 남긴 메모) */
  note: string
  /** 분량 요약 (예: 3분 55초 · 548단어) */
  sizeSummary: string
}

/** Diff 한 덩어리. 학생이 직접 쓴 원고를 Version끼리 비교한 것이다. */
export type TaskRevisionBlock =
  | { kind: 'same'; text: string }
  | { kind: 'changed'; before: string; after: string }
  | { kind: 'removed'; before: string }
  | { kind: 'added'; after: string }

export interface TaskRevisionDiff {
  fromVersionId: string
  toVersionId: string
  blocks: TaskRevisionBlock[]
  /** 이 수정에서 반영한 선생님 피드백 */
  appliedFeedbackId?: string
}

/** 지금 할 일 Card의 기다리는 동안 / 보조 Action. 화면이 없는 Action은 이유와 함께 비활성으로 둔다. */
export type TaskDetailAction =
  | { kind: 'compareVersions'; label: string; fromVersionId: string; toVersionId: string }
  | { kind: 'openTab'; label: string; tab: 'feedback' | 'mentor-case' }
  | { kind: 'unavailable'; label: string; reason: string }

export interface TaskNowCard {
  /** 큰 제목 (예: V2 검토가 진행 중이에요) */
  headline: string
  description: string
  /** 최근 제출 등 사실 한 줄 (운영시간 숫자는 넣지 않는다) */
  fact?: string
  primaryAction?: TaskDetailAction
  /** 기다리는 동안 할 수 있는 일 */
  waitingActions: TaskDetailAction[]
}

export interface StudentTaskDetailExtra {
  topic: { text: string; approved: boolean } | null
  nowCard: TaskNowCard
  guideFile: TaskGuideFile | null
  /** 학생이 직접 입력한 안내문 내용 (Task Create, POST /api/student/tasks description) */
  guideText: string | null
  criteria: TaskEvaluationCriterion[] | null
  references: TaskReferenceMaterial[] | null
  processMaterials: TaskProcessMaterial[] | null
  feedback: TaskFeedback | null
  mentorCases: TaskMentorCaseView[] | null
  versions: TaskVersion[] | null
  revisionDiffs: TaskRevisionDiff[]
}

export interface StudentTaskDetail {
  task: StudentTaskSummary
  /** Detail 자료. null이면 이 Task의 상세 자료가 아직 준비되지 않았다. (목록 정보만 있음) */
  detail: StudentTaskDetailExtra | null
  snapshotDate: string
}

export type LoadState<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error' }
