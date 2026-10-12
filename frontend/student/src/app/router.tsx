import { createBrowserRouter, Navigate } from 'react-router'
import { MentorCaseDetailRoute } from '../features/mentor-hub/routes/MentorCaseDetailRoute.tsx'
import { MentorCaseListRoute } from '../features/mentor-hub/routes/MentorCaseListRoute.tsx'
import { MentorHubHomeRoute } from '../features/mentor-hub/routes/MentorHubHomeRoute.tsx'
import { MentorListRoute } from '../features/mentor-hub/routes/MentorListRoute.tsx'
import { MentorPlanApplyRoute } from '../features/mentor-hub/routes/MentorPlanApplyRoute.tsx'
import { MentorPlanDetailRoute } from '../features/mentor-hub/routes/MentorPlanDetailRoute.tsx'
import { MentorPlanListRoute } from '../features/mentor-hub/routes/MentorPlanListRoute.tsx'
import { MentorProfileRoute } from '../features/mentor-hub/routes/MentorProfileRoute.tsx'
import { MentorQuestionComposerRoute } from '../features/mentor-hub/routes/MentorQuestionComposerRoute.tsx'
import { MentorQuestionDetailRoute } from '../features/mentor-hub/routes/MentorQuestionDetailRoute.tsx'
import { MentorQuestionListRoute } from '../features/mentor-hub/routes/MentorQuestionListRoute.tsx'
import { MentorRecordDetailRoute } from '../features/mentor-hub/routes/MentorRecordDetailRoute.tsx'
import { MentorRecordListRoute } from '../features/mentor-hub/routes/MentorRecordListRoute.tsx'
import { MentorRoutineApplyRoute } from '../features/mentor-hub/routes/MentorRoutineApplyRoute.tsx'
import { MentorRoutineDetailRoute } from '../features/mentor-hub/routes/MentorRoutineDetailRoute.tsx'
import { MentorRoutineListRoute } from '../features/mentor-hub/routes/MentorRoutineListRoute.tsx'
import { MentorStoryDetailRoute } from '../features/mentor-hub/routes/MentorStoryDetailRoute.tsx'
import { MentorStoryFeedRoute } from '../features/mentor-hub/routes/MentorStoryFeedRoute.tsx'
import {
  schoolArchiveRoutePattern,
  schoolEvidenceRoutePattern,
  schoolRoutePattern,
  schoolTaskRoutePattern,
  schoolTasksPath,
  schoolTasksRoutePattern,
} from '../features/school-admissions/routes/paths.ts'
import { SchoolArchiveRoute } from '../features/school-admissions/routes/SchoolArchiveRoute.tsx'
import { SchoolEvidenceRoute } from '../features/school-admissions/routes/SchoolEvidenceRoute.tsx'
import { SchoolTaskDetailRoute } from '../features/school-admissions/routes/SchoolTaskDetailRoute.tsx'
import { SchoolTasksRoute } from '../features/school-admissions/routes/SchoolTasksRoute.tsx'
import {
  mentorCaseListRoutePattern,
  mentorCaseRoutePattern,
  mentorHubPath,
  mentorHubRoutePattern,
  mentorListRoutePattern,
  mentorPlanApplyRoutePattern,
  mentorPlanListRoutePattern,
  mentorPlanRoutePattern,
  mentorProfileRoutePattern,
  mentorQuestionComposerRoutePattern,
  mentorQuestionListRoutePattern,
  mentorQuestionRoutePattern,
  mentorRecordListRoutePattern,
  mentorRecordRoutePattern,
  mentorRoutineApplyRoutePattern,
  mentorRoutineListRoutePattern,
  mentorRoutineRoutePattern,
  mentorStoryListRoutePattern,
  mentorStoryRoutePattern,
} from '../features/mentor-hub/routes/paths.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import { StudentAppShell } from './StudentAppShell.tsx'

// Extension Student App 내부 개발 Route. (기존 LearnersHigh URL이 아니며 Integration 단계에서 바뀔 수 있다)
// Data Router를 쓰는 이유: Detail 왕복 시 ScrollRestoration으로 이전 Scroll 위치를 복원하기 위함.
export const studentRouter = createBrowserRouter([
  {
    element: <StudentAppShell />,
    children: [
      { index: true, element: <Navigate to={mentorHubPath} replace /> },
      { path: mentorHubRoutePattern, element: <MentorHubHomeRoute /> },
      { path: mentorListRoutePattern, element: <MentorListRoute /> },
      { path: mentorProfileRoutePattern, element: <MentorProfileRoute /> },
      { path: mentorPlanListRoutePattern, element: <MentorPlanListRoute /> },
      {
        path: mentorPlanRoutePattern,
        element: <MentorPlanDetailRoute />,
        children: [{ path: mentorPlanApplyRoutePattern, element: <MentorPlanApplyRoute /> }],
      },
      { path: mentorRoutineListRoutePattern, element: <MentorRoutineListRoute /> },
      {
        path: mentorRoutineRoutePattern,
        element: <MentorRoutineDetailRoute />,
        children: [{ path: mentorRoutineApplyRoutePattern, element: <MentorRoutineApplyRoute /> }],
      },
      { path: mentorStoryListRoutePattern, element: <MentorStoryFeedRoute /> },
      { path: mentorStoryRoutePattern, element: <MentorStoryDetailRoute /> },
      { path: mentorQuestionListRoutePattern, element: <MentorQuestionListRoute /> },
      { path: mentorQuestionComposerRoutePattern, element: <MentorQuestionComposerRoute /> },
      { path: mentorQuestionRoutePattern, element: <MentorQuestionDetailRoute /> },
      { path: mentorRecordListRoutePattern, element: <MentorRecordListRoute /> },
      { path: mentorRecordRoutePattern, element: <MentorRecordDetailRoute /> },
      { path: mentorCaseListRoutePattern, element: <MentorCaseListRoute /> },
      { path: mentorCaseRoutePattern, element: <MentorCaseDetailRoute /> },
      // School Home의 기본 화면은 Tasks다.
      { path: schoolRoutePattern, element: <Navigate to={schoolTasksPath} replace /> },
      { path: schoolTasksRoutePattern, element: <SchoolTasksRoute /> },
      { path: schoolTaskRoutePattern, element: <SchoolTaskDetailRoute /> },
      { path: schoolEvidenceRoutePattern, element: <SchoolEvidenceRoute /> },
      { path: schoolArchiveRoutePattern, element: <SchoolArchiveRoute /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
