// Extension Student App 내부 Route. (기존 LearnersHigh 수행평가 URL이 아니다)

export const schoolRoutePattern = 'school'
export const schoolTasksRoutePattern = 'school/tasks'
export const schoolTaskRoutePattern = 'school/tasks/:taskId'

export const schoolPath = '/school'
export const schoolTasksPath = '/school/tasks'

/** Task Detail. Tab은 ?tab=, 수정 기록 Version Pair는 ?from=&to=로 둔다. */
export function schoolTaskPath(taskId: string): string {
  return `${schoolTasksPath}/${encodeURIComponent(taskId)}`
}
