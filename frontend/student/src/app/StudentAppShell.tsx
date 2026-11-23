import { useEffect, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { StudentGlobalNavigation } from '../components/student-navigation/StudentGlobalNavigation.tsx'
import type { StudentNavigationItemId } from '../components/student-navigation/studentNavigationItems.ts'
import { getStudentMe, headerName, type StudentMe } from '../features/assessment/api/studentMeApi.ts'
import { assessmentPath } from '../features/assessment/routes/paths.ts'

// A28-12: 머리글 이름은 지금 인증된(개발 환경에서는 고른 시연) 학생 본인의 학생 정보에서 읽는다(GET /api/student/assessment/me).
// 예전 고정값('최하은')은 활성 학생과 달라 지웠다. 학생을 바꾸면 화면을 새로 불러오므로 처음 한 번만 읽는다.

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`)

function activeNavigationItem(pathname: string): StudentNavigationItemId | undefined {
  if (isUnder(pathname, assessmentPath)) return 'assessment'
  return undefined
}

// Student Surface Shell: Global Navigation + 현재 Route 화면 + Scroll 복원
export function StudentAppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [me, setMe] = useState<StudentMe | null>(null)
  useEffect(() => {
    let cancelled = false
    getStudentMe().then(
      (data) => !cancelled && setMe(data),
      () => !cancelled && setMe(null),
    )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <StudentGlobalNavigation
        activeItem={activeNavigationItem(location.pathname)}
        userDisplayName={headerName(me)}
        onItemSelect={(id) => {
          // 실제 화면이 있는 메뉴만 연결한다. 기존 LearnersHigh 메뉴(수행평가 포함) Route는 확인 전이라 연결하지 않는다.
          // Assessment는 어느 화면에서 눌러도 Assessment 홈으로 간다 (상세 URL 직접 접근은 그대로).
          if (id === 'assessment') navigate(assessmentPath)
        }}
      />
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
