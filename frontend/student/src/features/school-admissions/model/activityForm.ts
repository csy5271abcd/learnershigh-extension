import type { ActivityFieldErrors, ActivityRecordFields, ActivityType, GrowthActivity } from './activity.ts'
import { parseTags, validateActivityBasics } from './activity.ts'

// 활동 기록 입력 상태 (등록 Modal / 상세 수정이 함께 쓴다)

/** 입력 중인 활동 기록 (유형은 아직 고르지 않았을 수 있다) */
export interface ActivityDraftValues {
  title: string
  type: ActivityType | ''
  organizer: string
  startDate: string
  endDate: string
  role: string
  participationReason: string
  process: string
  contribution: string
  result: string
  followUp: string
  /** 쉼표로 나눈 태그 입력 */
  tags: string
}

export const emptyActivityDraft: ActivityDraftValues = {
  title: '',
  type: '',
  organizer: '',
  startDate: '',
  endDate: '',
  role: '',
  participationReason: '',
  process: '',
  contribution: '',
  result: '',
  followUp: '',
  tags: '',
}

export const activityFieldId = (idPrefix: string, name: keyof ActivityDraftValues) => `${idPrefix}-${name}`

/** 저장된 활동 → 입력 상태 */
export function draftFromActivity(activity: GrowthActivity): ActivityDraftValues {
  return {
    title: activity.title,
    type: activity.type,
    organizer: activity.organizer,
    startDate: activity.startDate,
    endDate: activity.endDate,
    role: activity.role,
    participationReason: activity.participationReason,
    process: activity.process,
    contribution: activity.contribution,
    result: activity.result,
    followUp: activity.followUp,
    tags: activity.tags.join(', '),
  }
}

/** 입력 상태 검사 → 오류가 없으면 저장할 기록 */
export function readActivityDraft(values: ActivityDraftValues): { errors: ActivityFieldErrors; fields?: ActivityRecordFields } {
  const errors = validateActivityBasics(values)
  if (Object.keys(errors).length > 0 || !values.type) return { errors }
  const type: ActivityType = values.type
  return {
    errors,
    fields: {
      title: values.title.trim(),
      type,
      organizer: values.organizer.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      role: values.role.trim(),
      participationReason: values.participationReason.trim(),
      process: values.process.trim(),
      contribution: values.contribution.trim(),
      result: values.result.trim(),
      followUp: values.followUp.trim(),
      tags: parseTags(values.tags),
    },
  }
}

/** 입력 오류가 있는 첫 칸으로 Focus */
export function focusFirstActivityError(idPrefix: string, errors: ActivityFieldErrors) {
  const first = (['title', 'type', 'startDate', 'endDate'] as const).find((name) => errors[name])
  if (first) document.getElementById(activityFieldId(idPrefix, first))?.focus()
}
