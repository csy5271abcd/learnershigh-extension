import { useEffect, useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { assessmentRoute } from './assessmentRoutes.tsx'
import { assessmentPath } from './paths.ts'

interface AssessmentReadOnlyViewerProps {
  /** 처음 열 Student 경로 (예: /assessment/school-assessments/assessment_001) */
  initialPath: string
  /** Student 화면 안에서 이동할 때마다 알린다 (Admin 주소의 `?path=`와 맞추기 위함) */
  onPathChange: (path: string) => void
}

const isAssessmentPath = (path: string) => path === assessmentPath || path.startsWith(`${assessmentPath}/`) || path.startsWith(`${assessmentPath}?`)

// Admin "학생 화면 보기" 전용 (2026-10-29, P-28 PROPOSED).
// Student Assessment Route Tree를 그대로 Memory Router로 그린다. Admin 앱의 주소 관리(adminLocation)는 바꾸지 않고,
// 이 Router는 이 보기 안에서만 산다. 읽기 전용 모드·데이터 주입은 호출하는 Admin Adapter가 먼저 끝낸다 (viewMode.ts, readOnlyViewStore.ts).
export function AssessmentReadOnlyViewer({ initialPath, onPathChange }: AssessmentReadOnlyViewerProps) {
  // Router는 이 보기가 처음 그려질 때 한 번만 만든다 (학생이 바뀌면 호출 측이 key로 새로 만든다)
  const [router] = useState(() =>
    createMemoryRouter([assessmentRoute, { path: '*', element: <p role="alert">Assessment 밖의 주소는 이 보기에서 열 수 없어요.</p> }], {
      initialEntries: [isAssessmentPath(initialPath) ? initialPath : assessmentPath],
    }),
  )

  useEffect(
    () =>
      router.subscribe((state) => {
        onPathChange(`${state.location.pathname}${state.location.search}`)
      }),
    [router, onPathChange],
  )

  return <RouterProvider router={router} />
}
