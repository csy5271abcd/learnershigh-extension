import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { StudentGlobalNavigation } from '../components/student-navigation/StudentGlobalNavigation.tsx'
import type { StudentNavigationItemId } from '../components/student-navigation/studentNavigationItems.ts'
import { mentorHubHomeFixture } from '../features/mentor-hub/fixtures/mentorHubHome.fixture.ts'
import { mentorHubPath } from '../features/mentor-hub/routes/paths.ts'
import { schoolPath, schoolTasksPath } from '../features/school-admissions/routes/paths.ts'

// 인증 / 사용자 Model이 없어 Navigation 표시용 이름은 Fixture 값을 재사용한다.
const studentDisplayName = mentorHubHomeFixture.studentContext.displayName

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`)

function activeNavigationItem(pathname: string): StudentNavigationItemId | undefined {
  if (isUnder(pathname, mentorHubPath)) return 'mentor'
  if (isUnder(pathname, schoolPath)) return 'schoolActivity'
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
          // 실제 화면이 있는 메뉴만 연결한다. 기존 LearnersHigh 메뉴 Route는 확인 전이라 연결하지 않는다.
          if (id === 'mentor') navigate(mentorHubPath)
          // 기존 수행평가 Entry는 School로 연결한다. (Extension App 내부 Route, 기존 LearnersHigh URL 아님)
          else if (id === 'schoolActivity' || id === 'performanceTask') navigate(schoolTasksPath)
        }}
      />
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
