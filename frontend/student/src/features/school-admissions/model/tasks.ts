import type { StudentTaskSummary, TaskAttentionFlag, TaskStageNumber, TaskTurn } from './types.ts'

// 수행평가 8단계 이름 (school-admissions.md 수행평가 8단계). 단계를 건너뛰거나 화면에서 다시 계산하지 않는다.
export const taskStageNames: Record<TaskStageNumber, string> = {
  1: '안내문 등록',
  2: '주제 선정',
  3: '자료 조사',
  4: '초안 V1 제출',
  5: 'AI 사전 점검',
  6: '선생님 피드백',
  7: 'Revision V2/V3',
  8: '최종 제출/발표',
}

export const TASK_STAGE_COUNT = 8

export const taskTurnLabel: Record<TaskTurn, string> = {
  student: '내 차례',
  waiting: '기다리는 중',
  done: '완료',
}

/** 주의 표시 이름. Student에게는 운영시간 숫자(48h 등)를 보이지 않는다. (Tasks-00 Mockup Badge 문구 기준) */
export const taskAttentionLabel: Record<TaskAttentionFlag, string> = {
  reviewDelayed: 'Review 지연',
  deadlinePassed: 'Deadline Passed',
  onHold: 'Hold',
}

/** 상태 열의 차례 문구. 보류된 Task는 차례 대신 보류로 보여준다. */
export const taskTurnText = (task: StudentTaskSummary) =>
  task.attentionFlags.includes('onHold') ? '보류' : taskTurnLabel[task.turn]

/**
 * 학생이 아니라 선생님 검토 / AI 분석 같은 바깥 처리를 기다리는 중인지. (Frontend 파생 값, Contract Status Enum 아님)
 * - 기다리는 차례(turn = waiting)이고
 * - 보류(onHold)가 아니며
 * - 최종 단계(8) 이전일 때만 기다림으로 본다. (최종 제출 이후는 완료)
 * Review 지연(reviewDelayed)도 실패가 아니라 이 기다림이 길어진 상태다. Deadline Passed 자체는 기다림 조건이 아니다.
 * Task Detail Header는 이 상태를 Badge 대신 Text로 보여준다. (움직이는 표시 / Badge 없음)
 */
export const isAwaitingOthers = (task: StudentTaskSummary) =>
  task.turn === 'waiting' && !task.attentionFlags.includes('onHold') && task.currentStage < 8

// ---------- 목록 Filter (Tasks-00 Chip: 전체 / 내 차례 / 기다리는 중 / 주의 필요) ----------

export type TaskListFilter = 'all' | 'mine' | 'waiting' | 'attention'

export const taskListFilters: { id: TaskListFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'mine', label: '내 차례' },
  { id: 'waiting', label: '기다리는 중' },
  { id: 'attention', label: '주의 필요' },
]

export function parseTaskListFilter(value: string | null): TaskListFilter {
  return taskListFilters.find((filter) => filter.id === value)?.id ?? 'all'
}

export function matchesTaskFilter(task: StudentTaskSummary, filter: TaskListFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'mine':
      return task.turn === 'student'
    case 'waiting':
      return task.turn === 'waiting'
    case 'attention':
      return task.attentionFlags.length > 0
  }
}

// ---------- 마감 표시 ----------

const DAY_MS = 24 * 60 * 60 * 1000

/** YYYY-MM-DD 두 날짜의 일 수 차이 (Timezone 영향 없이 날짜만 비교) */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS)
}

/** 마감 날짜 아래 줄: D-10 / D-Day / 마감 지남. 기준일은 목록 응답의 snapshotDate다. (현재 시각을 가정하지 않는다) */
export function deadlineCountdown(deadlineDate: string, snapshotDate: string): string {
  const days = daysBetween(snapshotDate, deadlineDate)
  if (days < 0) return '마감 지남'
  if (days === 0) return 'D-Day'
  return `D-${days}`
}

/** 10월 16일 */
export function formatDeadline(deadlineDate: string): string {
  const [, month, day] = deadlineDate.split('-').map(Number)
  return `${month}월 ${day}일`
}
