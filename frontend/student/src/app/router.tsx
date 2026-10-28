import { createBrowserRouter, Navigate } from 'react-router'
import { assessmentRoute } from '../features/assessment/routes/assessmentRoutes.tsx'
import { assessmentPath } from '../features/assessment/routes/paths.ts'
import { NotFoundPage } from './NotFoundPage.tsx'
import { StudentAppShell } from './StudentAppShell.tsx'

// Extension Student App 내부 개발 Route. (기존 LearnersHigh URL이 아니며 Integration 단계에서 바뀔 수 있다)
// Data Router를 쓰는 이유: Detail 왕복 시 ScrollRestoration으로 이전 Scroll 위치를 복원하기 위함.
// 구형 Mentor Hub·School Activity Route는 2026-10-28 제거했다 (legacy-cleanup-plan.md 2단계). 그 주소는 아래 '*'(Not Found)로 간다.
export const studentRouter = createBrowserRouter([
  {
    element: <StudentAppShell />,
    children: [
      { index: true, element: <Navigate to={assessmentPath} replace /> },
      assessmentRoute,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
