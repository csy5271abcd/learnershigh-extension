import { AdminShell, type AdminExtensionEntryId } from './app/AdminShell.tsx'
import { navigate, useAdminLocation } from './app/adminLocation.ts'
import { NoticeState } from './components/AdminUi.tsx'
import ui from './components/AdminUi.module.css'
import { FeedbackDashboardRoute } from './features/feedback/routes/FeedbackDashboardRoute.tsx'
import { FeedbackReviewRoute } from './features/feedback/routes/FeedbackReviewRoute.tsx'
import { feedbackDashboardPath, matchFeedbackReviewPath } from './features/feedback/routes/paths.ts'
import {
  connectionsPath,
  interviewPath,
  matchActivityInspectorPath,
  matchMentorCaseDetailPath,
  matchMentorContentDetailPath,
  matchMentorProfilePath,
  matchStudent360Path,
  matchTaskInspectorPath,
  mentorCasesPath,
  mentorContentPath,
  operationsPath,
  todayBoardPath,
} from './features/student-management/routes/paths.ts'
import {
  ActivityInspectorRoute,
  ConnectionRoute,
  InterviewRoute,
  MentorCaseDetailRoute,
  MentorCaseRoute,
  MentorContentDetailRoute,
  MentorProfileRoute,
  OperationsRoute,
  Student360Route,
  TaskInspectorRoute,
  TodayBoardRoute,
} from './features/student-management/routes/StudentManagementRoutes.tsx'
import { StudentCareRoute, studentCarePath } from './app/StudentCareRoute.tsx'
import { configureCommandScenario } from './store/adminCommands.ts'

// Admin Extension App Shell. 주소(pathname)로 화면을 고른다. (Router Library 미확정 → app/adminLocation.ts)
// Feature는 src/features/<feature>/에 둔다: feedback(Queue · Review), student-management(Today Board · Student 360 · Mentor 추천 · Connection · Interview · Operations)
// 학생 케어(features/student-care, Wangyu)는 같은 AdminShell 안의 Feature Route(/student-care)로 연결한다. (별도 App Shell을 쓰지 않는다)
// 학생 케어 화면 제목 · 지점 선택은 StudentCarePage가 직접 그린다. (origin/main의 개발용 App은 StudentCarePage만 렌더링)
const entryPaths: Record<AdminExtensionEntryId, string> = {
  'today-board': todayBoardPath,
  'student-care': studentCarePath,
  'feedback-dashboard': feedbackDashboardPath,
  'mentor-cases': mentorContentPath,
  connections: connectionsPath,
  interview: interviewPath,
  operations: operationsPath,
}

function App() {
  const location = useAdminLocation()
  configureCommandScenario(location.search)
  const { pathname } = location
  const reviewId = matchFeedbackReviewPath(pathname)
  const studentId = matchStudent360Path(pathname)
  const taskId = matchTaskInspectorPath(pathname)
  const activityId = matchActivityInspectorPath(pathname)
  const caseId = matchMentorCaseDetailPath(pathname)
  const contentId = matchMentorContentDetailPath(pathname)
  const mentorId = matchMentorProfilePath(pathname)

  let current: AdminExtensionEntryId = 'feedback-dashboard'
  let pageLabel = 'Feedback Dashboard'
  let page
  if (pathname === '/' || pathname === feedbackDashboardPath) {
    page = <FeedbackDashboardRoute location={location} />
  } else if (reviewId !== null) {
    pageLabel = 'Feedback 검토'
    // 이전 / 다음 이동에도 같은 Route를 유지해 처음 연 Queue 순서를 기억한다.
    page = <FeedbackReviewRoute feedbackId={reviewId} location={location} />
  } else if (pathname === todayBoardPath) {
    current = 'today-board'
    pageLabel = 'Today Board'
    page = <TodayBoardRoute location={location} />
  } else if (studentId !== null) {
    current = 'today-board'
    pageLabel = 'Student 360'
    page = <Student360Route key={studentId} studentId={studentId} location={location} />
  } else if (taskId !== null) {
    current = 'today-board'
    pageLabel = 'Task 상세'
    page = <TaskInspectorRoute key={taskId} taskId={taskId} location={location} />
  } else if (activityId !== null) {
    current = 'today-board'
    pageLabel = '성장활동 상세'
    page = <ActivityInspectorRoute key={activityId} activityId={activityId} location={location} />
  } else if (caseId !== null) {
    current = 'mentor-cases'
    pageLabel = 'Mentor Case 상세'
    page = <MentorCaseDetailRoute key={caseId} caseId={caseId} location={location} />
  } else if (contentId !== null) {
    current = 'mentor-cases'
    pageLabel = 'Mentor 콘텐츠 상세'
    page = <MentorContentDetailRoute key={contentId} contentId={contentId} location={location} />
  } else if (mentorId !== null) {
    current = 'mentor-cases'
    pageLabel = 'Mentor Profile'
    page = <MentorProfileRoute key={mentorId} mentorId={mentorId} location={location} />
  } else if (pathname === mentorCasesPath || pathname === mentorContentPath) {
    current = 'mentor-cases'
    pageLabel = 'Mentor 추천'
    page = <MentorCaseRoute location={location} />
  } else if (pathname === connectionsPath) {
    current = 'connections'
    pageLabel = 'Connection 검토'
    page = <ConnectionRoute location={location} />
  } else if (pathname === interviewPath) {
    current = 'interview'
    pageLabel = 'Interview 관리'
    page = <InterviewRoute location={location} />
  } else if (pathname === studentCarePath) {
    current = 'student-care'
    pageLabel = '학생 케어'
    page = <StudentCareRoute />
  } else if (pathname === operationsPath) {
    current = 'operations'
    pageLabel = 'Operations'
    page = <OperationsRoute location={location} />
  } else {
    pageLabel = '페이지 없음'
    page = (
      <div className={ui.page}>
        <NoticeState title="페이지를 찾을 수 없어요." focus>
          <button type="button" className={ui.secondaryButton} onClick={() => navigate(feedbackDashboardPath)}>
            Feedback Dashboard로 가기
          </button>
        </NoticeState>
      </div>
    )
  }

  return (
    <AdminShell current={current} pageLabel={pageLabel} onEntrySelect={(id) => navigate(entryPaths[id])}>
      {page}
    </AdminShell>
  )
}

export default App
