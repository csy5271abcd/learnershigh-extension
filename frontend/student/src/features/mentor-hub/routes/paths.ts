// Extension Student App 내부 개발 Route다. 기존 LearnersHigh 실제 URL이 아니며,
// 실제 Integration 단계에서 바뀔 수 있다.

export const mentorHubRoutePattern = 'mentor'
export const mentorListRoutePattern = 'mentor/mentors'
export const mentorProfileRoutePattern = 'mentor/mentors/:mentorId'
export const mentorPlanListRoutePattern = 'mentor/plans'
export const mentorPlanRoutePattern = 'mentor/plans/:contentId'

export const mentorHubPath = '/mentor'
export const mentorListPath = '/mentor/mentors'
export const mentorPlanListPath = '/mentor/plans'

export function mentorProfilePath(mentorId: string): string {
  return `${mentorListPath}/${encodeURIComponent(mentorId)}`
}

export function mentorPlanPath(contentId: string): string {
  return `${mentorPlanListPath}/${encodeURIComponent(contentId)}`
}
