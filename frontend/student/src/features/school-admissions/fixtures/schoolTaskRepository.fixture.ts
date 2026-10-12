// 개발용 Fixture 저장소: 이번 화면 Session 동안 바뀐 Task를 메모리에 둔다.
// - 학생이 등록한 Task, 그리고 Seed Task의 Session 중 변경(예: 주제 제출)을 같은 곳에 둔다.
// - 실제 Backend Persistence가 아니다. 새로고침하면 사라지고 Seed로 돌아간다. (Mentor Hub sessionToggle과 같은 방식, localStorage / sessionStorage 미사용)
// - Tasks 목록 / Task Detail Loader가 이 저장소와 Seed를 함께 읽어 같은 taskId · 같은 값을 본다. (Task 복사본 Store 없음)

import type { TaskStartingPoint } from '../model/taskCreate.ts'
import type { StudentTaskDetailExtra, StudentTaskSummary } from '../model/types.ts'

export interface StoredTask {
  task: StudentTaskSummary
  detail: StudentTaskDetailExtra | null
}

interface CreatedTask extends StoredTask {
  detail: StudentTaskDetailExtra
  /** 등록할 때 학생이 알려준 맥락. currentStage를 바꾸지 않는다. (Stage 전이 규칙 미확정) */
  context: { performanceType: string; startingPoint: TaskStartingPoint }
}

const created: CreatedTask[] = []
/** Seed Task의 Session 중 변경 */
const seedOverrides = new Map<string, StoredTask>()
let revision = 0

/** 생성 순서대로 증가하는 id (fixture-created-task-001 …). Seed id와 겹치지 않는다. */
export function nextCreatedTaskId(): string {
  return `fixture-created-task-${String(created.length + 1).padStart(3, '0')}`
}

export function addCreatedTask(item: CreatedTask): void {
  created.push(item)
  revision += 1
}

/** 저장소가 바뀔 때마다 증가한다. 목록 / Detail Loader가 이 값으로 다시 불러온다. */
export function taskStoreRevision(): number {
  return revision
}

/** Task에 딸린 값(예: Evidence)이 바뀌었을 때 Loader가 다시 불러오도록 알린다. */
export function markTaskStoreChanged(): void {
  revision += 1
}

/** 최근 등록한 Task가 먼저 */
export function listCreatedTasks(): StudentTaskSummary[] {
  return created.map((item) => item.task).reverse()
}

export function findCreatedTask(taskId: string): CreatedTask | undefined {
  return created.find((item) => item.task.taskId === taskId)
}

export function findSeedOverride(taskId: string): StoredTask | undefined {
  return seedOverrides.get(taskId)
}

/** Task를 바꾼다. 등록한 Task면 그 값을, Seed Task면 Session 변경으로 저장한다. (같은 taskId) */
export function saveTask(next: StoredTask): void {
  const createdItem = findCreatedTask(next.task.taskId)
  if (createdItem) {
    createdItem.task = next.task
    if (next.detail) createdItem.detail = next.detail
  } else {
    seedOverrides.set(next.task.taskId, next)
  }
  revision += 1
}
