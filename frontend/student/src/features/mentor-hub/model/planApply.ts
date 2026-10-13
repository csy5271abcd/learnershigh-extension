import type {
  ExistingLibraryItemView,
  MentorPlanItem,
  PlanApplyPreviewRequest,
  PlanApplyPreviewResult,
  PlanApplyRequest,
  PlanConflictResolution,
} from './types.ts'

// Apply Flow 단계 (Plan-02 ~ 04 Mockup Stepper: 시작일 → 항목 선택 → 교재 연결 → 충돌 확인·수정 → 추가)
export type PlanApplyStep = 'start-date' | 'items' | 'library' | 'conflicts' | 'review'

export const planApplySteps: { id: PlanApplyStep; label: string }[] = [
  { id: 'start-date', label: '시작일' },
  { id: 'items', label: '항목 선택' },
  { id: 'library', label: '교재 연결' },
  { id: 'conflicts', label: '충돌 확인·수정' },
  { id: 'review', label: '추가' },
]

export function parsePlanApplyStep(value: string | null): PlanApplyStep {
  return planApplySteps.find((step) => step.id === value)?.id ?? 'start-date'
}

export const stepIndex = (step: PlanApplyStep) => planApplySteps.findIndex((item) => item.id === step)

/** Apply Flow 입력 (화면 안에서만 유지한다. 새로고침 후 복원하지 않는다) */
export interface PlanApplyDraft {
  startDate: string
  selectedItemIds: string[]
  /** mentorItemId → existingLibraryItemId (연결하지 않으면 없음) */
  libraryMappings: Record<string, string>
  /** mentorItemId → 해결 방법 */
  resolutions: Record<string, PlanConflictResolution>
}

export function initialDraft(items: MentorPlanItem[]): PlanApplyDraft {
  return { startDate: '', selectedItemIds: items.map((item) => item.itemId), libraryMappings: {}, resolutions: {} }
}

/** 날짜 형식 / 실제 존재하는 날짜인지만 확인한다. (과거 날짜 허용 여부는 정책이 없어 막지 않는다) */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function toPreviewRequest(draft: PlanApplyDraft, items: MentorPlanItem[]): PlanApplyPreviewRequest {
  const selected = items.filter((item) => draft.selectedItemIds.includes(item.itemId))
  return {
    startDate: draft.startDate,
    selectedItemIds: selected.map((item) => item.itemId),
    libraryMappings: selected
      .filter((item) => draft.libraryMappings[item.itemId])
      .map((item) => ({ mentorItemId: item.itemId, existingLibraryItemId: draft.libraryMappings[item.itemId] })),
  }
}

export const unresolvedConflictCount = (preview: PlanApplyPreviewResult, draft: PlanApplyDraft) =>
  preview.conflicts.filter((conflict) => !draft.resolutions[conflict.mentorItemId]).length

/**
 * 요청 단계 앞의 입력이 비어 있으면(새로고침 / 주소로 바로 진입) 처음 비어 있는 단계로 되돌린다.
 * 충돌 해결 여부는 Preview 결과가 필요해 이동 시점(다음 버튼)에서 막는다.
 */
export function reachableStep(requested: PlanApplyStep, draft: PlanApplyDraft, hasPreview: boolean): PlanApplyStep {
  if (stepIndex(requested) > stepIndex('start-date') && !isValidDate(draft.startDate)) return 'start-date'
  if (stepIndex(requested) > stepIndex('items') && draft.selectedItemIds.length === 0) return 'items'
  if (requested === 'review' && !hasPreview) return 'conflicts'
  return requested
}

/** 충돌 단계 안내 문구 (Plan-02 / 03 Mockup) */
export function conflictSummary(preview: PlanApplyPreviewResult, draft: PlanApplyDraft) {
  const total = preview.conflicts.length
  const unresolved = unresolvedConflictCount(preview, draft)
  if (total === 0) return { tone: 'neutral', text: '겹치는 기존 일정이 없어요.' } as const
  if (unresolved > 0)
    return { tone: 'negative', text: `${total}개 중 ${unresolved}개가 아직 겹쳐요. 옮기거나 뺄 항목을 골라주세요.` } as const
  return { tone: 'neutral', text: `겹치는 ${total}개를 모두 정리했어요.` } as const
}

/** 최종으로 추가될 Item (빼기로 고른 충돌 항목 제외, 옮기기는 옮긴 시간) */
export function finalItems(preview: PlanApplyPreviewResult, draft: PlanApplyDraft) {
  return preview.resolvedItems
    .filter((placed) => draft.resolutions[placed.mentorItemId] !== 'exclude')
    .map((placed) => {
      const conflict = preview.conflicts.find((candidate) => candidate.mentorItemId === placed.mentorItemId)
      const moved = conflict !== undefined && draft.resolutions[placed.mentorItemId] === 'move'
      return { ...placed, slot: moved ? conflict.suggestedSlot : placed.slot }
    })
}

export function findLibraryItem(libraryItems: ExistingLibraryItemView[], libraryItemId: string | undefined) {
  return libraryItems.find((item) => item.libraryItemId === libraryItemId)
}

/** Preview Request + 현재 충돌 해결 선택 (해결이 필요한 항목만) */
export function toApplyRequest(
  draft: PlanApplyDraft,
  items: MentorPlanItem[],
  preview: PlanApplyPreviewResult,
): PlanApplyRequest {
  return {
    ...toPreviewRequest(draft, items),
    conflictResolutions: preview.conflicts
      .filter((conflict) => draft.resolutions[conflict.mentorItemId])
      .map((conflict) => ({ mentorItemId: conflict.mentorItemId, resolution: draft.resolutions[conflict.mentorItemId] })),
  }
}
