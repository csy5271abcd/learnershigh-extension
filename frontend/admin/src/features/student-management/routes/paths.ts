/* Admin Student Management 주소 (Router Library 미확정 → app/adminLocation.ts 위의 최소 주소 규칙) */

export const todayBoardPath = '/today'
export const operationsPath = '/operations'
export const connectionsPath = '/connections'
export const interviewPath = '/interview'
export const mentorCasesPath = '/mentor-cases'
/** Mentor 추천 Home (Case · Plan · Routine · Story · Record). /mentor-cases는 Case 탭 주소로 그대로 쓴다. */
export const mentorContentPath = '/mentor-content'

export type Student360Tab = 'overview' | 'study' | 'school' | 'activities' | 'mentor' | 'reports'
export const student360Tabs: { id: Student360Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'study', label: 'Study' },
  { id: 'school', label: 'School' },
  { id: 'activities', label: 'Activities' },
  { id: 'mentor', label: 'Mentor' },
  { id: 'reports', label: 'Reports' },
]

export const student360Path = (studentId: string, tab: Student360Tab = 'overview') =>
  `/students/${encodeURIComponent(studentId)}${tab === 'overview' ? '' : `?tab=${tab}`}`

export function matchStudent360Path(pathname: string): string | null {
  const match = /^\/students\/([^/]+)\/?$/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

export function readStudent360Tab(search: string): Student360Tab {
  const value = new URLSearchParams(search).get('tab')
  return student360Tabs.some((tab) => tab.id === value) ? (value as Student360Tab) : 'overview'
}

export function mentorCaseSearchPath(context: { studentId?: string; taskId?: string; activityId?: string } = {}) {
  const params = new URLSearchParams()
  if (context.studentId) params.set('studentId', context.studentId)
  if (context.taskId) params.set('taskId', context.taskId)
  if (context.activityId) params.set('activityId', context.activityId)
  const query = params.toString()
  return query ? `${mentorCasesPath}?${query}` : mentorCasesPath
}

export function interviewCreatePath(studentId: string, connectionId?: string) {
  const params = new URLSearchParams({ studentId, create: '1' })
  if (connectionId) params.set('connectionId', connectionId)
  return `${interviewPath}?${params.toString()}`
}

/** 다른 화면에서 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해 그 화면의 Filter · Tab · Scroll을 복원한다. */
export interface InAppEntry {
  inApp: true
}

export const inAppEntry: InAppEntry = { inApp: true }
export const isInAppEntry = (entry: unknown) => typeof entry === 'object' && entry !== null && (entry as Partial<InAppEntry>).inApp === true

export const taskInspectorPath = (taskId: string) => `/tasks/${encodeURIComponent(taskId)}`
export const activityInspectorPath = (activityId: string) => `/activities/${encodeURIComponent(activityId)}`

export function matchTaskInspectorPath(pathname: string): string | null {
  const match = /^\/tasks\/([^/]+)\/?$/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

export function matchActivityInspectorPath(pathname: string): string | null {
  const match = /^\/activities\/([^/]+)\/?$/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

/** Mentor Case 상세. 추천 Context(학생 · 대상)는 Query로 이어 간다. */
export function mentorCaseDetailPath(caseId: string, context: { studentId?: string | null; taskId?: string | null; activityId?: string | null } = {}) {
  const params = new URLSearchParams()
  if (context.studentId) params.set('studentId', context.studentId)
  if (context.taskId) params.set('taskId', context.taskId)
  if (context.activityId) params.set('activityId', context.activityId)
  const query = params.toString()
  return `${mentorCasesPath}/${encodeURIComponent(caseId)}${query ? `?${query}` : ''}`
}

export function matchMentorCaseDetailPath(pathname: string): string | null {
  const match = /^\/mentor-cases\/([^/]+)\/?$/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

/** 추천 Context Query (학생 · 대상 Task / 활동) */
function contextQuery(context: { studentId?: string | null; taskId?: string | null; activityId?: string | null }) {
  const params = new URLSearchParams()
  if (context.studentId) params.set('studentId', context.studentId)
  if (context.taskId) params.set('taskId', context.taskId)
  if (context.activityId) params.set('activityId', context.activityId)
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** Plan · Routine · Story · Record 상세 (Case 상세는 mentorCaseDetailPath) */
export const mentorContentDetailPath = (contentId: string, context: { studentId?: string | null; taskId?: string | null; activityId?: string | null } = {}) =>
  `${mentorContentPath}/${encodeURIComponent(contentId)}${contextQuery(context)}`

export function matchMentorContentDetailPath(pathname: string): string | null {
  const match = /^\/mentor-content\/([^/]+)\/?$/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

export const mentorProfilePath = (mentorId: string, context: { studentId?: string | null; taskId?: string | null; activityId?: string | null } = {}) =>
  `/mentors/${encodeURIComponent(mentorId)}${contextQuery(context)}`

export function matchMentorProfilePath(pathname: string): string | null {
  const match = /^\/mentors\/([^/]+)\/?$/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}
