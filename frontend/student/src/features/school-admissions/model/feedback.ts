import type { StudentTaskDetail, TaskNowCard, TaskTeacherFeedback } from './types.ts'
import { latestVersion, versionSubmitLabel } from './version.ts'

// ---------- 피드백 표시 규칙 ----------
// 선생님 피드백 = Primary, AI 사전 점검 = Secondary(참고용). Student는 피드백 내용을 고치거나 지울 수 없고 "반영함"만 표시한다.
// 필수 피드백을 모두 반영해도 Stage는 6(선생님 피드백)에 머문다. 다음 할 일만 수정본 준비로 바뀐다.

/** 피드백 Tab에서 Version별 피드백 묶음의 id (수정 기록 / AI 결과에서 바로 이동할 때 쓴다) */
export const feedbackVersionAnchorId = (versionId: string) => `task-feedback-${versionId}`
export const feedbackAiAnchorId = (versionId: string) => `task-feedback-${versionId}-ai`

/** "반영함" 표시 대상: 선생님 피드백 하나 또는 AI 사전 점검 항목 하나 */
export type FeedbackReflectTarget =
  | { kind: 'teacher'; taskId: string; feedbackId: string }
  | { kind: 'ai'; taskId: string; feedbackId: string; itemId: string }

/** 반영 표시 대상 key (AI 항목 id는 Task 안에서만 고유할 수 있어 Feedback id와 함께 쓴다) */
export const reflectTargetKey = (target: FeedbackReflectTarget) =>
  target.kind === 'teacher' ? target.feedbackId : `${target.feedbackId}:${target.itemId}`

/** 선생님 피드백을 Version별로 묶는다. (최근 Version이 먼저, 받은 순서 유지) */
export function groupTeacherFeedback(items: TaskTeacherFeedback[]): { versionId: string; versionLabel: string; items: TaskTeacherFeedback[] }[] {
  const groups: { versionId: string; versionLabel: string; items: TaskTeacherFeedback[] }[] = []
  for (const item of items) {
    const group = groups.find((entry) => entry.versionId === item.versionId)
    if (group) group.items.push(item)
    else groups.push({ versionId: item.versionId, versionLabel: item.versionLabel, items: [item] })
  }
  return groups
}

/** 최근 Version에 전달된 필수 선생님 피드백 반영 현황 (없으면 undefined) */
export function requiredFeedbackProgress(data: StudentTaskDetail): { reflected: number; total: number } | undefined {
  const latest = latestVersion(data)
  if (data.feedback.status !== 'ready' || !latest) return undefined
  const required = data.feedback.data.teacher.filter(
    (item) => item.versionId === latest.versionId && item.status === 'delivered' && item.required,
  )
  if (required.length === 0) return undefined
  return { reflected: required.filter((item) => item.reflected).length, total: required.length }
}

/** 학생이 "반영함"을 바꿀 수 있는 피드백인지: 최근 Version에 대한 피드백만 (지난 Version은 읽기 전용) */
export const isReflectEditable = (data: StudentTaskDetail, versionId: string) => latestVersion(data)?.versionId === versionId

/**
 * 지금 할 일: 6단계에서 최근 Version의 선생님 피드백이 전달됐을 때.
 * - 필수 피드백이 남아 있으면: 피드백 확인 · 반영 (수정본 제출은 아직 비활성)
 * - 모두 반영했으면: 수정본 준비. 수정본 제출 화면은 다음 단계(Revision)에서 연결한다. (가짜 제출 없음)
 */
export function withFeedbackNowCard(data: StudentTaskDetail, card: TaskNowCard): TaskNowCard {
  const latest = latestVersion(data)
  const progress = requiredFeedbackProgress(data)
  if (data.task.currentStage !== 6 || !latest || !progress) return card
  const submitLabel = versionSubmitLabel(latest.versionNumber + 1)
  const fact = `${latest.label} 필수 피드백 ${progress.reflected}/${progress.total} 반영`
  if (progress.reflected < progress.total) {
    return {
      headline: '선생님 피드백을 확인하고 수정할 내용을 반영해주세요',
      description: '파일을 직접 고친 뒤 반영한 항목을 체크하면 다음 할 일이 바뀌어요.',
      fact,
      primaryAction: { kind: 'openTab', label: '피드백 확인하기', tab: 'feedback', versionId: latest.versionId },
      waitingActions: [{ kind: 'unavailable', label: submitLabel, reason: '필수 피드백을 모두 반영하면 제출할 수 있어요.' }],
    }
  }
  return {
    headline: `수정본 V${latest.versionNumber + 1}를 준비해주세요`,
    description: '필수 피드백을 모두 반영했어요. 고친 파일을 다음 버전으로 제출해요.',
    fact,
    primaryAction: { kind: 'unavailable', label: submitLabel, reason: '수정본 제출 화면은 준비 중이에요.' },
    waitingActions: [{ kind: 'openTab', label: '피드백 다시 보기', tab: 'feedback', versionId: latest.versionId }],
  }
}
