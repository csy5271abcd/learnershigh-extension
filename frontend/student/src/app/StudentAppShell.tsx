import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { StudentGlobalNavigation } from '../components/student-navigation/StudentGlobalNavigation.tsx'
import type { StudentNavigationItemId } from '../components/student-navigation/studentNavigationItems.ts'
import { assessmentPath } from '../features/assessment/routes/paths.ts'

// 인증 / 사용자 Model이 없어 Navigation 표시용 이름은 개발용 고정값이다.
// (예전에는 구형 Mentor Hub Fixture에서 읽었다. 2026-10-28 Mentor·School Activity 제거 후 같은 값을 여기 둔다)
const studentDisplayName = '최하은'

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`)

function activeNavigationItem(pathname: string): StudentNavigationItemId | undefined {
  if (isUnder(pathname, assessmentPath)) return 'assessment'
  return undefined
}

// Student Surface Shell: Global Navigation + 현재 Route 화면 + Scroll 복원
export function StudentAppShell() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <StudentGlobalNavigation
        activeItem={activeNavigationItem(location.pathname)}
        userDisplayName={studentDisplayName}
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
