import type { StudentTaskDetail, StudentTaskSummary, TaskNowCard, TaskProcessCategory, TaskStageNumber } from './types.ts'

// ---------- Evidence(과정 자료) 표시 규칙 ----------
// 확정 규칙: Evidence ≥ 1이면 자료 조사(Stage 3) 완료 조건을 "만족할 수 있다".
// Stage 4 자동 전이, Evidence 삭제 시 Stage 역전은 정해지지 않았으므로 하지 않는다. (api-contract §11-2 / §11-3)

/** 자료 추가 Dialog의 단계 Tag 제안값. 학생이 바꿀 수 있다. (Task currentStage와 묶지 않는다) */
export function suggestedStageTag(stage: TaskStageNumber): TaskProcessCategory {
  if (stage <= 2) return 'plan'
  if (stage === 3) return 'research'
  if (stage === 8) return 'final'
  return 'draft'
}

/** 자료 조사 완료 조건 문장 (Stage 3일 때만) */
export function evidenceConditionText(task: StudentTaskSummary, count: number): string | undefined {
  if (task.currentStage !== 3) return undefined
  return count > 0 ? `자료 ${count}개 · 자료 조사 완료 조건을 채웠어요` : '자료를 1개 이상 추가하면 자료 조사 완료 조건을 채워요'
}

/**
 * 자료 조사 단계의 지금 할 일: Primary CTA를 실제 자료 추가로 연결하고 완료 조건을 함께 보여준다.
 * 자료 정보가 준비되지 않은 Task는 추가를 열지 않는다. (기존 자료를 모른 채 일부만 보여주지 않는다)
 */
export function withEvidenceNowCard(data: StudentTaskDetail, card: TaskNowCard): TaskNowCard {
  const { task, evidence } = data
  if (task.currentStage !== 3 || task.turn !== 'student' || task.attentionFlags.includes('onHold')) return card
  if (!evidence.complete) {
    return { ...card, primaryAction: { kind: 'unavailable', label: '자료 추가', reason: '이 수행평가의 자료 정보가 아직 준비되지 않았어요.' } }
  }
  return {
    ...card,
    fact: evidenceConditionText(task, evidence.items.length),
    primaryAction: { kind: 'addEvidence', label: '자료 추가' },
  }
}
