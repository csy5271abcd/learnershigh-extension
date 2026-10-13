import type { TaskTopicState } from './types.ts'

// ---------- 주제 제출 (PUT /api/student/tasks/{taskId}/topic, api-contract §10-1) ----------

/** 주제 입력칸 id (오류 Focus) */
export const taskTopicFieldId = 'task-topic-text'

/** 학생이 주제를 쓸 수 있는 상태: 아직 제출 전 / 선생님이 방향을 남김 */
export const canSubmitTopic = (topic: TaskTopicState | null | undefined) =>
  topic?.state === 'not-submitted' || topic?.state === 'direction-requested'

/** 빈 값 / 공백만은 제출하지 않는다. 최대 길이 규칙은 Source에 없어 두지 않는다. */
export function validateTopic(topic: string): string | undefined {
  return topic.trim() ? undefined : '주제를 입력해주세요.'
}
