import { formatDateTime } from './taskDetail.ts'
import type { StudentTaskDetail, TaskAiAnalysisStatus, TaskNowCard, TaskVersion } from './types.ts'

// ---------- Version / AI 사전 점검 표시 규칙 ----------
// Version.aiAnalysisStatus와 Task.currentStage는 다른 책임이다. (Domain §15) 화면은 둘을 함께 읽기만 한다.
// AI 상태는 Text로만 알린다. (회전 표시 / Badge 없음, 결과 자리는 정적인 Skeleton)

export const versionAiStatusText: Record<TaskAiAnalysisStatus, string> = {
  processing: 'AI 사전 점검 중',
  success: 'AI 사전 점검 완료',
  failed: 'AI 사전 점검 못함',
}

/** 피드백 Tab의 AI 사전 점검 제목 id (다시 시도 후 Focus 위치) */
export const aiStatusHeadingId = (versionId: string) => `task-ai-status-${versionId}`

export const latestVersion = (data: StudentTaskDetail): TaskVersion | undefined => data.versions.items.at(-1)

export const nextVersionNumber = (data: StudentTaskDetail): number => (latestVersion(data)?.versionNumber ?? 0) + 1

/** 제출 이름: V1은 초안, 그 뒤는 수정본 (Stage 4 초안 V1 / Stage 7 Revision V2 · V3) */
export const versionSubmitLabel = (versionNumber: number): string =>
  versionNumber === 1 ? `초안 V${versionNumber} 제출` : `수정본 V${versionNumber} 제출`

/**
 * 초안 V1을 제출할 수 있는지: 학생 차례인 4단계이고, 분석 중인 Version이 없을 때.
 * 수정본(V2 / V3) 제출 조건은 피드백 반영 현황을 함께 본다. (model/feedback.ts canSubmitNextVersion)
 * Version 정보가 준비되지 않은 Task는 열지 않는다. (기존 Version을 모른 채 번호를 매기지 않는다)
 */
export function canSubmitFirstVersion(data: StudentTaskDetail): boolean {
  const { task, versions } = data
  if (!versions.complete || task.turn !== 'student' || task.attentionFlags.includes('onHold')) return false
  if (task.currentStage !== 4) return false
  return latestVersion(data)?.aiAnalysisStatus !== 'processing'
}

const submittedFact = (version: TaskVersion) => `${formatDateTime(version.submittedAt)}에 ${version.label}을 제출했어요 · ${version.fileName}`

/** 지금 할 일: 최근 Version의 AI 사전 점검 상태 / 제출 가능 여부를 반영한다. */
export function withVersionNowCard(data: StudentTaskDetail, card: TaskNowCard): TaskNowCard {
  if (!data.versions.complete) return card
  const latest = latestVersion(data)
  if (latest?.aiAnalysisStatus === 'processing') {
    return {
      headline: latest.versionNumber > 1 ? `${latest.label} AI 사전 점검을 진행하고 있어요` : 'AI 사전 점검을 진행하고 있어요',
      description: `제출한 ${latest.label}을 AI가 확인하고 있어요. 분석이 끝나면 확인할 내용을 이 화면에서 보여드릴게요.`,
      fact: submittedFact(latest),
      waitingActions: card.waitingActions,
    }
  }
  if (latest?.aiAnalysisStatus === 'failed') {
    return {
      headline: 'AI 사전 점검을 완료하지 못했어요',
      description: latest.retryAllowed
        ? `제출한 ${latest.label} 파일은 그대로 있어요. 다시 시도하면 같은 파일로 AI 사전 점검을 다시 진행해요.`
        : `제출한 ${latest.label} 파일은 그대로 있어요. 지금은 다시 시도할 수 없어서 학원에서 확인한 뒤 알려드릴게요.`,
      fact: submittedFact(latest),
      primaryAction: latest.retryAllowed ? { kind: 'retryAiAnalysis', label: '다시 시도', versionId: latest.versionId } : undefined,
      waitingActions: card.waitingActions,
    }
  }
  // 이번 Session에 제출한 Version의 AI 사전 점검이 끝나 공용 검토 대기열에 들어간 상태 (초안 = 6단계, 수정본 = 7단계 재검토).
  // (Seed Task는 Seed의 지금 할 일을 그대로 쓴다. 선생님 피드백이 전달되면 피드백 지금 할 일이 덮는다)
  const inQueueStage = data.task.currentStage === 6 || data.task.currentStage === 7
  if (latest?.aiAnalysisStatus === 'success' && latest.inFeedbackQueue && inQueueStage && latest.file) {
    const revision = latest.versionNumber > 1
    return {
      headline: revision ? `${latest.label} 검토를 기다리고 있어요` : 'AI 사전 점검을 마쳤어요',
      description: revision
        ? '선생님 재검토가 끝나면 다음 수정 여부를 확인할 수 있어요.'
        : '선생님 검토를 기다리고 있어요. AI 사전 점검은 참고용이에요.',
      fact: submittedFact(latest),
      primaryAction: { kind: 'openTab', label: 'AI 사전 점검 보기', tab: 'feedback', versionId: latest.versionId },
      waitingActions: card.waitingActions,
    }
  }
  if (canSubmitFirstVersion(data)) {
    return { ...card, primaryAction: { kind: 'submitVersion', label: versionSubmitLabel(nextVersionNumber(data)) } }
  }
  return card
}
