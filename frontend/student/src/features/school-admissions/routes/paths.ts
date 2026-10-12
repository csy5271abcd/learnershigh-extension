// Extension Student App 내부 Route. (기존 LearnersHigh 수행평가 URL이 아니다)

export const schoolRoutePattern = 'school'
export const schoolTasksRoutePattern = 'school/tasks'
export const schoolTaskRoutePattern = 'school/tasks/:taskId'

export const schoolPath = '/school'
export const schoolTasksPath = '/school/tasks'

/** Tasks 화면 위 수행평가 등록 Modal (?create=1). Browser Back으로 닫히고, 새로고침하면 빈 Form으로 다시 열린다. */
export const createModalParam = 'create'

/** Task Detail. Tab은 ?tab=, 수정 기록 Version Pair는 ?from=&to=로 둔다. */
export function schoolTaskPath(taskId: string): string {
  return `${schoolTasksPath}/${encodeURIComponent(taskId)}`
}
