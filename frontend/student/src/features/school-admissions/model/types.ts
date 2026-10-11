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

export type LoadState<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error' }
