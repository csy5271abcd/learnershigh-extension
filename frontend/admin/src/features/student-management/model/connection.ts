import { activityTypeLabel } from '../../../fixtures/adminActivities.fixture.ts'
import type { ConnectionReviewState, ConnectionSourceRef } from '../../../fixtures/types.ts'
import type { AdminState } from '../../../store/adminStore.ts'

/* Connection 표시 값 (Connection Review · Interview 관리가 같은 문구를 쓴다) */

export const connectionStateLabel: Record<ConnectionReviewState, string> = { candidate: '검토 대기', confirmed: '확정', rejected: '제외' }

/**
 * Connection 기록 하나의 요약. 확정 전에 두 기록을 이해할 수 있게 결과 · Reflection · 자료 수까지 보여주고,
 * 전체 내용은 Task / Activity 상세 화면으로 이어 간다. (Connection 화면에 원본을 복사하지 않는다)
 */
export function describeSource(state: AdminState, ref: ConnectionSourceRef) {
  if (ref.source === 'task') {
    const task = state.tasks.find((item) => item.taskId === ref.sourceId)
    const versions = task?.versions?.length ?? 0
    return {
      title: task?.title ?? '찾을 수 없는 수행평가',
      sub: task ? `수행평가 · ${task.subject} · 최종 제출 완료` : ref.sourceId,
      result: task ? (task.finalArtifact ? `최종 결과물 ${task.finalArtifact.fileName}` : '최종 결과물 없음') : '',
      reflection: '수행평가에는 Reflection이 없어요.',
      evidence: task ? `과정 자료 ${task.evidence === null ? '정보 없음' : `${task.evidence.length}개`} · Version ${task.versions === null ? '정보 없음' : `${versions}개`}` : '',
    }
  }
  const activity = state.activities.find((item) => item.activityId === ref.sourceId)
  return {
    title: activity?.title ?? '찾을 수 없는 활동',
    sub: activity ? `성장활동 · ${activityTypeLabel[activity.type]} · Archive` : ref.sourceId,
    result: activity ? `결과: ${activity.result || '미작성'}` : '',
    reflection: activity?.reflection ? `배운 점: ${activity.reflection.learning || '미작성'}` : 'Reflection 미작성',
    evidence: activity ? `과정 자료 ${activity.files.length}개` : '',
  }
}
