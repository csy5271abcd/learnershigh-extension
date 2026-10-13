import type { StudentTaskDetail, StudentTaskSummary, TaskNowCard, TaskParentShareStatus } from './types.ts'

// ---------- 최종 제출 / 최종 결과물 표시 규칙 ----------
// 최종 제출 준비(선생님 결정) ≠ 8단계. 실제로 최종 제출을 마쳤을 때만 8단계가 된다.
// 8단계(완료) Task는 읽기 전용 기록으로 남는다. (수정본 · AI 다시 시도 · 반영 표시 · 자료 추가 / 삭제를 열지 않는다)

/** 최종 제출을 마친(완료) 수행평가인지 */
export const isTaskCompleted = (task: StudentTaskSummary) => task.currentStage === 8

/** 학부모 공유 상태 문장 (바로 보내지 않는다는 뜻이 드러나게) */
export const parentShareStatusText: Record<TaskParentShareStatus, string> = {
  not_shared: '학부모와 공유하지 않아요.',
  consented: '학부모 리포트에 첨부할 수 있도록 공유를 허용했어요. 바로 전송되지는 않아요.',
  attached: '학원에서 학부모 리포트에 첨부했어요.',
  shared: '학부모 리포트로 전달됐어요.',
}

/** Student가 공유 동의를 바꿀 수 있는 상태인지 (attached / shared 이후 해제 정책은 미정이라 바꾸지 않는다) */
export const canChangeParentShare = (status: TaskParentShareStatus) => status === 'not_shared' || status === 'consented'

/** 지금 할 일: 8단계 완료 Task */
export function withFinalNowCard(data: StudentTaskDetail, card: TaskNowCard): TaskNowCard {
  if (!isTaskCompleted(data.task) || data.finalArtifact.status !== 'ready') return card
  const artifact = data.finalArtifact.data
  return {
    headline: '수행평가를 완료했어요',
    description: `최종 결과물: ${artifact.sourceVersionLabel} · ${artifact.fileName}`,
    fact: data.inArchive ? 'Archive 보관 대상이에요. Archive 화면은 준비 중이에요.' : undefined,
    primaryAction: { kind: 'previewFinal', label: '최종 결과물 보기' },
    waitingActions: [],
  }
}
