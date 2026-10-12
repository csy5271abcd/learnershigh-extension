import type {
  StudentTaskDetail,
  TaskDetailAction,
  TaskNowCard,
  TaskProcessCategory,
  TaskReferenceKind,
  TaskRevisionBlock,
  TaskRevisionDiff,
  TaskStageNumber,
  TaskVersion,
} from './types.ts'

// ---------- Task Detail 고정 7 Tab (school-admissions.md Student Task Detail) ----------

export type TaskDetailTabId = 'overview' | 'evaluation' | 'references' | 'process' | 'feedback' | 'mentor-case' | 'revision'

export const taskDetailTabs: { id: TaskDetailTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'evaluation', label: '평가 기준·제출물' },
  { id: 'references', label: '참고 자료' },
  { id: 'process', label: '과정 자료' },
  { id: 'feedback', label: '피드백' },
  { id: 'mentor-case', label: 'Mentor Case' },
  { id: 'revision', label: '수정 기록' },
]

export const taskDetailTabElementId = (id: TaskDetailTabId) => `task-detail-tab-${id}`

export function parseTaskDetailTab(value: string | null): TaskDetailTabId {
  return taskDetailTabs.find((tab) => tab.id === value)?.id ?? 'overview'
}

/** Tab 옆 개수 (TasksDetail Mockup: 참고 자료 3 / 과정 자료 4 / 피드백 5 / Mentor Case 3 / 수정 기록 2). 모르는 값은 표시하지 않는다. */
export function taskDetailTabCount(data: StudentTaskDetail, tab: TaskDetailTabId): number | undefined {
  const { detail } = data
  // 과정 자료는 Canonical Evidence에서 센다. (자료 정보가 준비되지 않은 Task는 표시하지 않는다)
  if (tab === 'process') return data.evidence.complete ? data.evidence.items.length : undefined
  if (!detail) return undefined
  switch (tab) {
    case 'references':
      return detail.references?.length
    case 'feedback':
      return detail.feedback ? deliveredFeedbackCount(detail.feedback) : undefined
    case 'mentor-case':
      return detail.mentorCases?.length
    case 'revision':
      return detail.versions?.length
    default:
      return undefined
  }
}

/** 학생에게 전달된 피드백 수: 전달된 선생님 피드백 + AI 사전 점검 항목 (검토 중인 피드백은 세지 않는다) */
export function deliveredFeedbackCount(feedback: NonNullable<NonNullable<StudentTaskDetail['detail']>['feedback']>): number {
  const teacher = feedback.teacher.filter((item) => item.status === 'delivered').length
  const ai = feedback.ai.reduce((sum, item) => sum + item.items.length, 0)
  return teacher + ai
}

// ---------- 8단계 Stepper 짧은 이름 (TasksDetail Mockup) ----------

export const taskStageShortNames: Record<TaskStageNumber, string> = {
  1: '안내문',
  2: '주제',
  3: '자료 조사',
  4: '초안 V1',
  5: 'AI 사전 점검',
  6: '선생님 피드백',
  7: 'Revision',
  8: '최종 제출',
}

// ---------- 지금 할 일 ----------

/**
 * 상세 자료가 없는 Task의 지금 할 일: 목록과 같은 nextAction을 쓰고,
 * 내 차례면 단계별 Action을 보여주되 아직 화면이 없으므로 비활성 + 이유로 둔다. (가짜 성공 없음)
 */
const stageActionLabel: Record<TaskStageNumber, string> = {
  1: '안내문 등록',
  2: '주제 제출',
  3: '자료 추가',
  4: '초안 V1 제출',
  5: 'AI 결과 확인',
  6: '피드백 확인',
  7: 'Revision 제출',
  8: '최종 제출',
}

export function fallbackNowCard(data: StudentTaskDetail): TaskNowCard {
  const { task } = data
  const primaryAction: TaskDetailAction | undefined =
    task.turn === 'student' && !task.attentionFlags.includes('onHold')
      ? { kind: 'unavailable', label: stageActionLabel[task.currentStage], reason: '이 단계의 화면은 준비 중이에요.' }
      : undefined
  return { headline: task.nextAction, description: '', primaryAction, waitingActions: [] }
}

/** 운영 상태를 학생용 문장으로 (운영시간 숫자 없이) */
export const studentAttentionMessage = {
  reviewDelayed: '검토가 조금 지연되고 있어요.',
  deadlinePassed: '마감일이 지났어요. 남은 단계를 이어서 진행해 주세요.',
  onHold: '지금은 보류된 수행평가예요.',
} as const

// ---------- 참고 자료 / 과정 자료 이름 ----------

export const referenceKindLabel: Record<TaskReferenceKind, string> = {
  link: '링크',
  article: '기사',
  textbook: '교과서',
}

/** 과정 자료 묶음 (TasksDetail-04 Mockup: 계획서 / 조사 자료 / 초안 / 최종본 / 발표 자료) */
export const processCategories: { id: TaskProcessCategory; label: string; tag: string; description: string }[] = [
  { id: 'plan', label: '계획서', tag: '계획', description: '주제 · 탐구 질문 · 일정' },
  { id: 'research', label: '조사 자료', tag: '조사', description: '참고한 데이터 · 사진 · 메모' },
  { id: 'draft', label: '초안', tag: '초안', description: 'V1, V2처럼 제출한 원고' },
  { id: 'final', label: '최종본', tag: '최종', description: '최종 제출 파일' },
  { id: 'presentation', label: '발표 자료', tag: '발표', description: 'PPT · 대본 · 영상' },
]

// ---------- 수정 기록 ----------

export interface RevisionDiffCounts {
  removed: number
  changed: number
  added: number
}

export function revisionDiffCounts(blocks: TaskRevisionBlock[]): RevisionDiffCounts {
  return {
    removed: blocks.filter((block) => block.kind === 'removed').length,
    changed: blocks.filter((block) => block.kind === 'changed').length,
    added: blocks.filter((block) => block.kind === 'added').length,
  }
}

/** URL의 Version Pair가 없거나 맞지 않으면 마지막 두 Version을 비교한다. */
export function resolveVersionPair(
  versions: TaskVersion[],
  from: string | null,
  to: string | null,
): { fromVersionId: string; toVersionId: string } | null {
  if (versions.length < 2) return null
  const ids = versions.map((version) => version.versionId)
  const fromIndex = from ? ids.indexOf(from) : -1
  const toIndex = to ? ids.indexOf(to) : -1
  if (fromIndex >= 0 && toIndex > fromIndex) return { fromVersionId: ids[fromIndex], toVersionId: ids[toIndex] }
  return { fromVersionId: ids[ids.length - 2], toVersionId: ids[ids.length - 1] }
}

export function findRevisionDiff(diffs: TaskRevisionDiff[], fromVersionId: string, toVersionId: string) {
  return diffs.find((diff) => diff.fromVersionId === fromVersionId && diff.toVersionId === toVersionId)
}

// ---------- 날짜 표시 ----------

/** 2026-10-03T20:45:00+09:00 → 10월 3일 20:45 (KST 기준 문자열을 그대로 읽는다) */
export function formatDateTime(iso: string): string {
  const [date, time] = iso.split('T')
  const [, month, day] = date.split('-').map(Number)
  return `${month}월 ${day}일 ${time.slice(0, 5)}`
}
