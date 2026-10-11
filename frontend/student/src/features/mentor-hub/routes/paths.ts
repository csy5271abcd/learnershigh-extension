// Extension Student App 내부 개발 Route다. 기존 LearnersHigh 실제 URL이 아니며,
// 실제 Integration 단계에서 바뀔 수 있다.

export const mentorHubRoutePattern = 'mentor'
export const mentorListRoutePattern = 'mentor/mentors'
export const mentorProfileRoutePattern = 'mentor/mentors/:mentorId'
export const mentorPlanListRoutePattern = 'mentor/plans'
export const mentorPlanRoutePattern = 'mentor/plans/:contentId'
/** Plan Detail 하위 Route (Detail 위에 내 계획에 적용 Modal을 띄운다) */
export const mentorPlanApplyRoutePattern = 'apply'

export const mentorHubPath = '/mentor'
export const mentorListPath = '/mentor/mentors'
export const mentorPlanListPath = '/mentor/plans'

export function mentorProfilePath(mentorId: string): string {
  return `${mentorListPath}/${encodeURIComponent(mentorId)}`
}

export function mentorPlanPath(contentId: string): string {
  return `${mentorPlanListPath}/${encodeURIComponent(contentId)}`
}

export function mentorPlanApplyPath(contentId: string): string {
  return `${mentorPlanPath(contentId)}/${mentorPlanApplyRoutePattern}`
}

export const mentorRoutineListRoutePattern = 'mentor/routines'
export const mentorRoutineRoutePattern = 'mentor/routines/:contentId'
/** Routine Detail 하위 Route (Detail 위에 적용 Modal을 띄운다) */
export const mentorRoutineApplyRoutePattern = 'apply'

export const mentorRoutineListPath = '/mentor/routines'

export function mentorRoutinePath(contentId: string): string {
  return `${mentorRoutineListPath}/${encodeURIComponent(contentId)}`
}

export function mentorRoutineApplyPath(contentId: string): string {
  return `${mentorRoutinePath(contentId)}/${mentorRoutineApplyRoutePattern}`
}

export const mentorStoryListRoutePattern = 'mentor/stories'
export const mentorStoryRoutePattern = 'mentor/stories/:contentId'

export const mentorStoryListPath = '/mentor/stories'

export function mentorStoryPath(contentId: string): string {
  return `${mentorStoryListPath}/${encodeURIComponent(contentId)}`
}

export const mentorQuestionListRoutePattern = 'mentor/questions'
export const mentorQuestionComposerRoutePattern = 'mentor/questions/new'
export const mentorQuestionRoutePattern = 'mentor/questions/:questionId'

export const mentorQuestionListPath = '/mentor/questions'

export function mentorQuestionPath(questionId: string): string {
  return `${mentorQuestionListPath}/${encodeURIComponent(questionId)}`
}

/** 질문 작성. Story Context(sourceContentId)는 화면 표시용이다. */
export function mentorQuestionComposerPath(context: { mentorId?: string; sourceContentId?: string }): string {
  const params = new URLSearchParams()
  if (context.mentorId) params.set('mentorId', context.mentorId)
  if (context.sourceContentId) params.set('sourceContentId', context.sourceContentId)
  const search = params.toString()
  return `/${mentorQuestionComposerRoutePattern}${search ? `?${search}` : ''}`
}

export const mentorRecordListRoutePattern = 'mentor/records'
export const mentorRecordRoutePattern = 'mentor/records/:contentId'

export const mentorRecordListPath = '/mentor/records'

export function mentorRecordPath(contentId: string): string {
  return `${mentorRecordListPath}/${encodeURIComponent(contentId)}`
}
