// Extension Student App 내부 Route. (기존 LearnersHigh 수행평가 URL이 아니다)

export const schoolRoutePattern = 'school'
export const schoolTasksRoutePattern = 'school/tasks'

export const schoolPath = '/school'
export const schoolTasksPath = '/school/tasks'

/** Task Detail Route Boundary. 화면은 다음 Branch(Task Detail)에서 연결한다. */
export function schoolTaskPath(taskId: string): string {
  return `${schoolTasksPath}/${encodeURIComponent(taskId)}`
}
