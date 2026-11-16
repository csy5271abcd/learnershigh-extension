import type { ReactNode } from 'react'
import { goBack, navigate, replaceSearch, type AdminLocation } from '../../../app/adminLocation.ts'
import { readScreenScenario, useScreenLoad } from '../../../app/useScreenLoad.ts'
import { ErrorState, LoadingState, NoticeState } from '../../../components/AdminUi.tsx'
import ui from '../../../components/AdminUi.module.css'
import type { ConnectionReviewState } from '../../../fixtures/types.ts'
import { buildStudent360 } from '../../../read-model/student360.ts'
import { parseTodayBoardFilter, writeTodayBoardFilter } from '../../../read-model/todayBoard.ts'
import { useAdminState } from '../../../store/adminStore.ts'
import { feedbackReviewPath } from '../../feedback/routes/paths.ts'
import { ConnectionReviewPage, type ConnectionFilter } from '../ConnectionReviewPage.tsx'
import { InterviewManagementPage, type InterviewEditorRequest, type InterviewFilter } from '../InterviewManagementPage.tsx'
import { buildTaskDetail } from '../../../read-model/taskDetail.ts'
import { ActivityInspectorPage, TaskInspectorPage } from '../InspectorPages.tsx'
import { OperationsPage } from '../OperationsPage.tsx'
import { Student360Page } from '../Student360Page.tsx'
import { TodayBoardPage } from '../TodayBoardPage.tsx'
import {
  activityInspectorPath,
  inAppEntry,
  interviewCreatePath,
  interviewPath,
  connectionsPath,
  isInAppEntry,
  readStudent360Tab,
  taskInspectorPath,
  student360Path,
  todayBoardPath,
  type Student360Tab,
} from './paths.ts'

/*
 * Student Management 화면 Route. Filter · 선택 · Tab은 주소 Query에 둬서 새로고침 / Back / Forward 후에도 유지한다. (바꿀 때 History를 쌓지 않는다)
 * 다른 화면으로 들어갈 때 inApp 표시를 남기고, 돌아가기는 History Back으로 처리해 이전 화면의 Filter · Tab · Scroll을 복원한다.
 * 개발용 ?fixture=loading | error | error-once | empty
 */

const setParam = (search: string, values: Record<string, string | null>) => {
  const params = new URLSearchParams(search)
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  return params.toString()
}

const openStudent = (studentId: string, tab: Student360Tab = 'overview') => navigate(student360Path(studentId, tab), { entry: inAppEntry })

export function TodayBoardRoute({ location }: { location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('today-board', readScreenScenario(location.search))
  return (
    <TodayBoardPage
      state={state}
      load={load}
      onRetry={reload}
      filter={parseTodayBoardFilter(location.search)}
      onFilterChange={(filter) => replaceSearch(writeTodayBoardFilter(location.search, filter))}
      onOpenStudent={(studentId) => openStudent(studentId)}
      onOpenTarget={(target) => {
        if (target.kind === 'review') navigate(feedbackReviewPath(target.feedbackId), { entry: inAppEntry })
        else if (target.kind === 'task') navigate(taskInspectorPath(target.taskId), { entry: inAppEntry })
        else openStudent(target.studentId, target.tab)
      }}
    />
  )
}

export function Student360Route({ studentId, location }: { studentId: string; location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('student-360', readScreenScenario(location.search))
  const inApp = isInAppEntry(location.state)
  const back = () => (inApp ? goBack() : navigate(todayBoardPath))
  const backLabel = inApp ? '이전 화면' : 'Today Board'
  if (load.status === 'loading')
    return (
      <div className={ui.page}>
        <LoadingState label="Student 360을 불러오는 중이에요." />
      </div>
    )
  if (load.status === 'error')
    return (
      <div className={ui.page}>
        <ErrorState title="학생 정보를 불러오지 못했어요." onRetry={reload} />
      </div>
    )
  const data = load.empty ? null : buildStudent360(state, studentId)
  if (!data)
    return (
      <div className={ui.page}>
        <button type="button" className={ui.back} onClick={back}>
          <span aria-hidden="true">‹</span> {backLabel}
        </button>
        <NoticeState title="학생을 찾을 수 없어요." focus>
          <p>주소가 잘못되었거나 관리 범위 밖의 학생이에요.</p>
        </NoticeState>
      </div>
    )
  return (
    <Student360Page
      state={state}
      data={data}
      tab={readStudent360Tab(location.search)}
      onTabChange={(tab) => replaceSearch(setParam(location.search, { tab: tab === 'overview' ? null : tab }))}
      onSwitchStudent={(id) => {
        // 학생 바꾸기는 같은 화면 안의 선택이다. (History를 쌓지 않고, 들어온 경로 · Tab은 그대로)
        const tab = readStudent360Tab(location.search)
        window.history.replaceState(window.history.state, '', student360Path(id, tab))
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
      }}
      onBack={back}
      backLabel={backLabel}
      onOpenReview={(feedbackId) => navigate(feedbackReviewPath(feedbackId), { entry: inAppEntry })}
      onOpenInterview={() => navigate(`/interview?studentId=${encodeURIComponent(studentId)}`, { entry: inAppEntry })}
      onOpenTask={(taskId) => navigate(taskInspectorPath(taskId), { entry: inAppEntry })}
      onOpenActivity={(activityId) => navigate(activityInspectorPath(activityId), { entry: inAppEntry })}
      onNavigate={(href) => navigate(href, { entry: inAppEntry })}
      activityFilter={new URLSearchParams(location.search).get('astatus') ?? 'all'}
      onActivityFilterChange={(value) => replaceSearch(setParam(location.search, { astatus: value === 'all' ? null : value }))}
    />
  )
}

function PageFrame({ load, reload, label, children }: { load: ReturnType<typeof useScreenLoad>['state']; reload: () => void; label: string; children: () => ReactNode }) {
  if (load.status === 'loading')
    return (
      <div className={ui.page}>
        <LoadingState label={`${label}을(를) 불러오는 중이에요.`} />
      </div>
    )
  if (load.status === 'error')
    return (
      <div className={ui.page}>
        <ErrorState title={`${label}을(를) 불러오지 못했어요.`} onRetry={reload} />
      </div>
    )
  return <>{children()}</>
}

function NotFound({ title, onBack, backLabel }: { title: string; onBack: () => void; backLabel: string }) {
  return (
    <div className={ui.page}>
      <button type="button" className={ui.back} onClick={onBack}>
        <span aria-hidden="true">‹</span> {backLabel}
      </button>
      <NoticeState title={title} focus>
        <p>주소가 잘못되었거나 관리 범위 밖의 항목이에요.</p>
      </NoticeState>
    </div>
  )
}

const backOf = (location: AdminLocation, fallback: string, fallbackLabel: string) =>
  isInAppEntry(location.state) ? { onBack: goBack, backLabel: '이전 화면' } : { onBack: () => navigate(fallback), backLabel: fallbackLabel }

export function TaskInspectorRoute({ taskId, location }: { taskId: string; location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('task-inspector', readScreenScenario(location.search))
  const back = backOf(location, todayBoardPath, 'Today Board')
  return (
    <PageFrame load={load} reload={reload} label="Task 상세">
      {() => {
        const detail = load.status === 'ready' && !load.empty ? buildTaskDetail(state, taskId) : null
        const student = detail && state.students.find((item) => item.studentId === detail.task.studentId)
        if (!detail || !student) return <NotFound title="Task를 찾을 수 없어요." {...back} />
        return (
          <TaskInspectorPage
            key={taskId}
            state={state}
            detail={detail}
            student={student}
            {...back}
            onOpenStudent={(id) => openStudent(id, 'school')}
            onOpenReview={(feedbackId) => navigate(feedbackReviewPath(feedbackId), { entry: inAppEntry })}
          />
        )
      }}
    </PageFrame>
  )
}

export function ActivityInspectorRoute({ activityId, location }: { activityId: string; location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('activity-inspector', readScreenScenario(location.search))
  const back = backOf(location, todayBoardPath, 'Today Board')
  return (
    <PageFrame load={load} reload={reload} label="성장활동 상세">
      {() => {
        const activity = load.status === 'ready' && !load.empty ? state.activities.find((item) => item.activityId === activityId) : undefined
        const student = activity && state.students.find((item) => item.studentId === activity.studentId)
        if (!activity || !student) return <NotFound title="성장활동을 찾을 수 없어요." {...back} />
        return (
          <ActivityInspectorPage
            key={activityId}
            state={state}
            activity={activity}
            student={student}
            {...back}
            onOpenStudent={(id) => openStudent(id, 'activities')}
            onOpenReview={(feedbackId) => navigate(feedbackReviewPath(feedbackId), { entry: inAppEntry })}
          />
        )
      }}
    </PageFrame>
  )
}

const connectionStates: ConnectionReviewState[] = ['candidate', 'confirmed', 'rejected']

export function ConnectionRoute({ location }: { location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('connections', readScreenScenario(location.search))
  const params = new URLSearchParams(location.search)
  const status = params.get('state')
  const filter: ConnectionFilter = { state: connectionStates.includes(status as ConnectionReviewState) ? (status as ConnectionReviewState) : 'all', query: params.get('q') ?? '', selected: params.get('selected') }
  return (
    <ConnectionReviewPage
      state={state}
      load={load}
      onRetry={reload}
      filter={filter}
      onFilterChange={(next) => replaceSearch(setParam(location.search, { state: next.state === 'all' ? null : next.state, q: next.query.trim() || null, selected: next.selected }))}
      onOpenQuestion={(studentId, questionId) => navigate(`${interviewPath}?studentId=${encodeURIComponent(studentId)}&selected=${encodeURIComponent(questionId)}`, { entry: inAppEntry })}
      onOpenStudent={(studentId) => openStudent(studentId, 'activities')}
      onOpenSource={(ref) => navigate(ref.source === 'task' ? taskInspectorPath(ref.sourceId) : activityInspectorPath(ref.sourceId), { entry: inAppEntry })}
      onCreateQuestion={(studentId, connectionId) => navigate(interviewCreatePath(studentId, connectionId), { entry: inAppEntry })}
    />
  )
}

export function InterviewRoute({ location }: { location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('interview', readScreenScenario(location.search))
  const params = new URLSearchParams(location.search)
  const status = params.get('status')
  const grade = params.get('grade')
  const filter: InterviewFilter = {
    studentId: params.get('studentId') ?? '',
    status: status === 'draft' || status === 'published' ? status : 'all',
    grade: grade === '1' || grade === '2' || grade === '3' ? (`고${grade}` as InterviewFilter['grade']) : 'all',
    query: params.get('q') ?? '',
    selected: params.get('selected'),
  }
  const editor: InterviewEditorRequest | null = params.get('edit')
    ? { mode: 'edit', questionId: params.get('edit')! }
    : params.get('create') === '1'
      ? { mode: 'create', studentId: params.get('studentId') ?? undefined, connectionId: params.get('connectionId') ?? undefined }
      : null
  return (
    <InterviewManagementPage
      state={state}
      load={load}
      onRetry={reload}
      filter={filter}
      onFilterChange={(next) =>
        replaceSearch(
          setParam(location.search, {
            studentId: next.studentId || null,
            status: next.status === 'all' ? null : next.status,
            grade: next.grade === 'all' ? null : next.grade.slice(1),
            q: next.query.trim() || null,
            selected: next.selected,
          }),
        )
      }
      onOpenConnection={(connectionId) => navigate(`${connectionsPath}?selected=${encodeURIComponent(connectionId)}`, { entry: inAppEntry })}
      editor={editor}
      onEditorChange={(next) =>
        replaceSearch(
          setParam(location.search, {
            create: next?.mode === 'create' ? '1' : null,
            edit: next?.mode === 'edit' ? (next.questionId ?? null) : null,
            connectionId: next?.mode === 'create' ? (next.connectionId ?? null) : null,
            studentId: next?.mode === 'create' && next.studentId ? next.studentId : filter.studentId || null,
          }),
        )
      }
      onOpenStudent={(studentId) => openStudent(studentId, 'activities')}
      onOpenActivity={(activityId) => navigate(activityInspectorPath(activityId), { entry: inAppEntry })}
    />
  )
}

export function OperationsRoute({ location }: { location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('operations', readScreenScenario(location.search))
  return <OperationsPage state={state} load={load} onRetry={reload} onNavigate={(href) => navigate(href, { entry: inAppEntry })} />
}
