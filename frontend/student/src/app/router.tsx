import { createBrowserRouter, Navigate } from 'react-router'
import { MentorHubHomeRoute } from '../features/mentor-hub/routes/MentorHubHomeRoute.tsx'
import { MentorListRoute } from '../features/mentor-hub/routes/MentorListRoute.tsx'
import { MentorProfileRoute } from '../features/mentor-hub/routes/MentorProfileRoute.tsx'
import {
  mentorHubPath,
  mentorHubRoutePattern,
  mentorListRoutePattern,
  mentorProfileRoutePattern,
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
