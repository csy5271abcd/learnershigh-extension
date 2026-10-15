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
import { mentorCaseDetailsFixture } from '../../../fixtures/adminMentorCaseDetails.fixture.ts'
import { buildTaskDetail } from '../../../read-model/taskDetail.ts'
import { ActivityInspectorPage, TaskInspectorPage } from '../InspectorPages.tsx'
import { MentorCaseDetailPage } from '../MentorCaseDetailPage.tsx'
import { MentorRecommendPage, type MentorContentTab } from '../MentorRecommendPage.tsx'
import { MentorContentDetailPage } from '../MentorContentDetailPage.tsx'
import { MentorProfilePage } from '../MentorProfilePage.tsx'
import { findMentorContent, findMentorProfile, mentorContentTypes, type MentorContentItem } from '../../../read-model/mentorContent.ts'
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
  mentorCaseDetailPath,
  mentorCaseSearchPath,
  mentorContentDetailPath,
  mentorContentPath,
  mentorCasesPath,
  mentorProfilePath,
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
      onRecommendCase={(taskId) => navigate(mentorCaseSearchPath({ studentId, taskId: taskId ?? undefined }), { entry: inAppEntry })}
      onOpenInterview={() => navigate(`/interview?studentId=${encodeURIComponent(studentId)}`, { entry: inAppEntry })}
      onOpenTask={(taskId) => navigate(taskInspectorPath(taskId), { entry: inAppEntry })}
      onOpenActivity={(activityId) => navigate(activityInspectorPath(activityId), { entry: inAppEntry })}
      onNavigate={(href) => navigate(href, { entry: inAppEntry })}
      activityFilter={new URLSearchParams(location.search).get('astatus') ?? 'all'}
      onActivityFilterChange={(value) => replaceSearch(setParam(location.search, { astatus: value === 'all' ? null : value }))}
    />
  )
}

const readContentTab = (value: string | null, fallback: MentorContentTab): MentorContentTab =>
  value === 'all' || mentorContentTypes.includes(value as never) ? (value as MentorContentTab) : fallback

const contextOf = (params: URLSearchParams) => ({ studentId: params.get('studentId'), taskId: params.get('taskId'), activityId: params.get('activityId') })

/** Content 상세로 이동 (Case는 Case 상세, 나머지는 Content 상세). 추천 Context는 Query로 이어 간다. */
const openContent = (item: MentorContentItem, params: URLSearchParams) =>
  navigate(item.type === 'case' ? mentorCaseDetailPath(item.contentId, contextOf(params)) : mentorContentDetailPath(item.contentId, contextOf(params)), { entry: inAppEntry })

const openMentor = (mentorId: string, params: URLSearchParams) => navigate(mentorProfilePath(mentorId, contextOf(params)), { entry: inAppEntry })

/** Mentor 추천 Home. /mentor-content 기본 탭은 전체, /mentor-cases 기본 탭은 Case다. (?type=으로 바꾼다) */
export function MentorCaseRoute({ location }: { location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('mentor-cases', readScreenScenario(location.search))
  const params = new URLSearchParams(location.search)
  const target = params.get('taskId') ? `t:${params.get('taskId')}` : params.get('activityId') ? `a:${params.get('activityId')}` : null
  const defaultTab: MentorContentTab = location.pathname === mentorCasesPath ? 'case' : 'all'
  return (
    <MentorRecommendPage
      tab={readContentTab(params.get('type'), defaultTab)}
      onTabChange={(tab) => replaceSearch(setParam(location.search, { type: tab === defaultTab ? null : tab }))}
      onOpenContent={(item) => openContent(item, params)}
      onOpenMentor={(mentorId) => openMentor(mentorId, params)}
      state={state}
      load={load}
      onRetry={reload}
      context={{ studentId: params.get('studentId'), target }}
      onContextChange={(context) =>
        replaceSearch(
          setParam(location.search, {
            studentId: context.studentId,
            taskId: context.target?.startsWith('t:') ? context.target.slice(2) : null,
            activityId: context.target?.startsWith('a:') ? context.target.slice(2) : null,
          }),
        )
      }
      filter={{ query: params.get('q') ?? '', subject: params.get('subject') ?? '', activityType: params.get('activityType') ?? '' }}
      onFilterChange={(filter) => replaceSearch(setParam(location.search, { q: filter.query.trim() || null, subject: filter.subject || null, activityType: filter.activityType || null }))}
      onOpenStudent={(studentId) => openStudent(studentId, 'mentor')}
      onOpenCase={(caseId) => navigate(mentorCaseDetailPath(caseId, { studentId: params.get('studentId'), taskId: params.get('taskId'), activityId: params.get('activityId') }), { entry: inAppEntry })}
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

export function MentorCaseDetailRoute({ caseId, location }: { caseId: string; location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('mentor-case-detail', readScreenScenario(location.search))
  const params = new URLSearchParams(location.search)
  const back = backOf(location, mentorCaseSearchPath({ studentId: params.get('studentId') ?? undefined, taskId: params.get('taskId') ?? undefined, activityId: params.get('activityId') ?? undefined }), 'Mentor Case 목록')
  return (
    <PageFrame load={load} reload={reload} label="Mentor Case">
      {() => {
        const caseRef = load.status === 'ready' && !load.empty ? state.mentorCases.find((item) => item.contentId === caseId) : undefined
        const detail = mentorCaseDetailsFixture.find((item) => item.contentId === caseId)
        if (!caseRef || !detail) return <NotFound title="Mentor Case를 찾을 수 없어요." {...back} />
        const student = state.students.find((item) => item.studentId === params.get('studentId')) ?? null
        const targetTask = student ? (state.tasks.find((item) => item.taskId === params.get('taskId') && item.studentId === student.studentId) ?? null) : null
        const targetActivity = student ? (state.activities.find((item) => item.activityId === params.get('activityId') && item.studentId === student.studentId) ?? null) : null
        return (
          <MentorCaseDetailPage
            key={caseId}
            state={state}
            caseRef={caseRef}
            detail={detail}
            student={student}
            targetTask={targetTask}
            targetActivity={targetActivity}
            {...back}
            onChooseContext={back.onBack}
            onOpenMentor={(mentorId) => openMentor(mentorId, params)}
            onOpenStudent={(id) => openStudent(id, 'mentor')}
            onOpenTask={(id) => navigate(taskInspectorPath(id), { entry: inAppEntry })}
            onOpenActivity={(id) => navigate(activityInspectorPath(id), { entry: inAppEntry })}
            onOpenContent={(id) => {
              const related = findMentorContent(state, id)
              if (related) openContent(related, params)
            }}
          />
        )
      }}
    </PageFrame>
  )
}

export function MentorContentDetailRoute({ contentId, location }: { contentId: string; location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('mentor-content-detail', readScreenScenario(location.search))
  const params = new URLSearchParams(location.search)
  const back = backOf(location, mentorContentPath, 'Mentor 추천')
  return (
    <PageFrame load={load} reload={reload} label="Mentor 콘텐츠">
      {() => {
        const item = load.status === 'ready' && !load.empty ? findMentorContent(state, contentId) : null
        if (!item) return <NotFound title="Mentor 콘텐츠를 찾을 수 없어요." {...back} />
        if (item.type === 'case')
          // Case 상세는 /mentor-cases/:caseId가 맡는다. (주소만 다른 같은 Case)
          return (
            <div className={ui.page}>
              <NoticeState title="Activity Case는 Case 상세 화면에서 볼 수 있어요." focus>
                <button type="button" className={ui.secondaryButton} onClick={() => navigate(mentorCaseDetailPath(item.contentId, contextOf(params)), { entry: location.state })}>
                  Case 상세로 가기
                </button>
              </NoticeState>
            </div>
          )
        const target = params.get('taskId') ? `t:${params.get('taskId')}` : params.get('activityId') ? `a:${params.get('activityId')}` : null
        return (
          <MentorContentDetailPage
            key={contentId}
            state={state}
            item={item}
            studentId={params.get('studentId')}
            target={target}
            {...back}
            onOpenMentor={(mentorId) => openMentor(mentorId, params)}
            onOpenCase={(caseId) => navigate(mentorCaseDetailPath(caseId, contextOf(params)), { entry: inAppEntry })}
            onOpenStudent={(id) => openStudent(id, 'mentor')}
          />
        )
      }}
    </PageFrame>
  )
}

export function MentorProfileRoute({ mentorId, location }: { mentorId: string; location: AdminLocation }) {
  const state = useAdminState()
  const { state: load, reload } = useScreenLoad('mentor-profile', readScreenScenario(location.search))
  const params = new URLSearchParams(location.search)
  const back = backOf(location, mentorContentPath, 'Mentor 추천')
  return (
    <PageFrame load={load} reload={reload} label="Mentor Profile">
      {() => {
        const profile = load.status === 'ready' && !load.empty ? findMentorProfile(mentorId) : null
        if (!profile) return <NotFound title="Mentor를 찾을 수 없어요." {...back} />
        return (
          <MentorProfilePage
            key={mentorId}
            state={state}
            profile={profile}
            tab={readContentTab(params.get('type'), 'all')}
            onTabChange={(tab) => replaceSearch(setParam(location.search, { type: tab === 'all' ? null : tab }))}
            {...back}
            onOpenContent={(item) => openContent(item, params)}
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
