/* Admin Student Management 주소 (Router Library 미확정 → app/adminLocation.ts 위의 최소 주소 규칙) */

export const todayBoardPath = '/today'
export const operationsPath = '/operations'
export const connectionsPath = '/connections'
export const interviewPath = '/interview'

export type Student360Tab = 'overview' | 'study' | 'school' | 'activities' | 'reports'
export const student360Tabs: { id: Student360Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'study', label: 'Study' },
  { id: 'school', label: 'School' },
  { id: 'activities', label: 'Activities' },
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

