// Extension Student App 내부 Route. (기존 LearnersHigh 수행평가 URL이 아니다)

export const schoolRoutePattern = 'school'
export const schoolTasksRoutePattern = 'school/tasks'
export const schoolTaskRoutePattern = 'school/tasks/:taskId'
export const schoolEvidenceRoutePattern = 'school/evidence'
export const schoolArchiveRoutePattern = 'school/archive'
export const schoolActivitiesRoutePattern = 'school/activities'
export const schoolActivityRoutePattern = 'school/activities/:activityId'

export const schoolPath = '/school'
export const schoolTasksPath = '/school/tasks'
/** School Evidence: 로그인 Student의 모든 수행평가 자료 (Evidence-00) */
export const schoolEvidencePath = '/school/evidence'
/** School Archive: 완료된 수행평가(와 이후 Growth Activity) 기록 (Archive-00) */
export const schoolArchivePath = '/school/archive'
/** School Activities: 수행평가 밖 성장 활동 기록 (Activities-00) */
export const schoolActivitiesPath = '/school/activities'

/** Tasks 화면 위 수행평가 등록 Modal (?create=1). Browser Back으로 닫히고, 새로고침하면 빈 Form으로 다시 열린다. */
export const createModalParam = 'create'

/** Task Detail 위 주제 제출 Modal (?topic=1). Browser Back으로 닫힌다. */
export const topicModalParam = 'topic'

/** Task Detail 위 Version 제출 Modal (?version=submit). Browser Back으로 닫힌다. */
export const versionModalParam = 'version'

/** 피드백 Tab에서 특정 Version 피드백으로 이동 (?tab=feedback&versionId=) */
export const feedbackVersionParam = 'versionId'

/** Growth Activity Detail (ActivitiesDetail-01 / 02) */
export function schoolActivityPath(activityId: string): string {
  return `${schoolActivitiesPath}/${encodeURIComponent(activityId)}`
}

/** Task Detail. Tab은 ?tab=, 수정 기록 Version Pair는 ?from=&to=로 둔다. */
export function schoolTaskPath(taskId: string): string {
  return `${schoolTasksPath}/${encodeURIComponent(taskId)}`
}
