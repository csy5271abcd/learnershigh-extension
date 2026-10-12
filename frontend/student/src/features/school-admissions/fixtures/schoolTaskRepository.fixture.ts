// 개발용 Fixture 저장소: 이번 화면 Session 동안 학생이 등록한 Task만 메모리에 둔다.
// - 실제 Backend Persistence가 아니다. 새로고침하면 사라진다. (Mentor Hub sessionToggle과 같은 방식, localStorage / sessionStorage 미사용)
// - Tasks 목록 / Task Detail Loader가 이 저장소와 Seed를 함께 읽어 같은 taskId · 같은 객체를 본다. (중복 Source 없음)

import type { TaskStartingPoint } from '../model/taskCreate.ts'
import type { StudentTaskDetailExtra, StudentTaskSummary } from '../model/types.ts'

interface CreatedTask {
  task: StudentTaskSummary
  detail: StudentTaskDetailExtra
  /** 등록할 때 학생이 알려준 맥락. currentStage를 바꾸지 않는다. (Stage 전이 규칙 미확정) */
  context: { performanceType: string; startingPoint: TaskStartingPoint }
}

const created: CreatedTask[] = []

/** 생성 순서대로 증가하는 id (fixture-created-task-001 …). Seed id와 겹치지 않는다. */
export function nextCreatedTaskId(): string {
  return `fixture-created-task-${String(created.length + 1).padStart(3, '0')}`
}

export function addCreatedTask(item: CreatedTask): void {
  created.push(item)
}

/** 등록한 Task 수. 목록 Loader가 이 값으로 다시 불러온다. */
export function createdTaskRevision(): number {
  return created.length
}

/** 최근 등록한 Task가 먼저 */
export function listCreatedTasks(): StudentTaskSummary[] {
  return created.map((item) => item.task).reverse()
}

export function findCreatedTask(taskId: string): CreatedTask | undefined {
  return created.find((item) => item.task.taskId === taskId)
}
