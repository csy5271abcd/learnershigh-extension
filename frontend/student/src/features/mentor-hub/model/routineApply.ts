import type {
  MentorPlanDay,
  MentorRoutineDetail,
  RoutineApplyConflict,
  RoutineApplyMode,
  RoutineApplyPreviewResult,
  RoutineConflictResolution,
} from './types.ts'

const dayOrder: MentorPlanDay[] = ['월', '화', '수', '목', '금', '토', '일']

/** 적용 요일 표시: 매일 / 월~금(연속) / 월·수·금 (Routine-02 Mockup "월~금 계획에 …") */
export function applyDaysLabel(days: MentorPlanDay[]): string {
  if (days.length === 7) return '매일'
  const indexes = days.map((day) => dayOrder.indexOf(day))
  const consecutive = indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1)
  return consecutive && days.length >= 3 ? `${days[0]}~${days[days.length - 1]}` : days.join('·')
}

/** 마지막 한글 글자의 받침 여부로 "과 / 와"를 고른다. */
function withAnd(text: string): string {
  const hangul = [...text].reverse().find((char) => char >= '가' && char <= '힣')
  const hasFinal = hangul ? (hangul.charCodeAt(0) - 0xac00) % 28 !== 0 : false
  return `${text}${hasFinal ? '과' : '와'}`
}

/** "월·화·수·목 · 생명과학 학원, 영어 단어 (내 계획), 수학 학원과 겹쳐요" (Routine-01 / 02 Mockup) */
export function conflictText(conflict: RoutineApplyConflict): string {
  return `${conflict.days.join('·')} · ${withAnd(conflict.existingTitles.join(', '))} 겹쳐요`
}

export function parseRoutineApplyMode(value: string | null): RoutineApplyMode {
  return value === 'habits' ? 'habits' : 'all'
}

/** URL ?habits=id,id → Routine에 실제 있는 Habit만, Routine 순서대로 */
export function parseSelectedHabitIds(value: string | null, routine: MentorRoutineDetail | null): string[] {
  const ids = new Set((value ?? '').split(',').filter(Boolean))
  if (!routine) return [...ids]
  return routine.habits.map((habit) => habit.habitId).filter((id) => ids.has(id))
}

/** 충돌 항목마다 해결 방법. 처음에는 "겹치는 요일만 빼기"가 선택되어 있다. (Routine-02 Mockup) */
export function initialResolutions(preview: RoutineApplyPreviewResult): Record<string, RoutineConflictResolution> {
  return Object.fromEntries(preview.conflicts.map((conflict) => [conflict.targetId, 'skip-conflict-days' as const]))
}
