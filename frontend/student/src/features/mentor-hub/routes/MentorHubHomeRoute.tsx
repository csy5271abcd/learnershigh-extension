import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { createMentorHubHomeFixtureLoader, readFixtureScenario } from '../fixtures/mentorHubHome.fixture.ts'
import { MentorHubHomePage } from '../MentorHubHomePage.tsx'
import { parseMentorHubTab, type MentorHubTabId } from '../model/tabs.ts'
import { mentorListPath, mentorProfilePath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// 선택 Main Tab은 URL(?tab=)에 두어 Profile 왕복(Back) 후에도 유지한다. ('멘토' Tab은 Mentor List Route)
// Scroll 위치는 App Shell의 ScrollRestoration이 복원한다.
export function MentorHubHomeRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTab = parseMentorHubTab(searchParams.get('tab'))

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=empty|loading|error로 상태를 확인한다.
  const loadHome = createMentorHubHomeFixtureLoader(
    import.meta.env.DEV ? readFixtureScenario(searchParams.toString()) : 'success',
  )

  // 이전 주소(?tab=mentors)로 들어오면 Mentor List로 보낸다.
  if (selectedTab === 'mentors') return <Navigate to={mentorListPath} replace />

  const selectTab = (tab: MentorHubTabId) => {
    if (tab === 'mentors') {
      navigateToTab(tab)
      return
    }
    // Home 안의 Tab 전환(추천 / 아직 화면이 없는 Tab)은 History를 쌓지 않는다.
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (tab === 'recommend') next.delete('tab')
        else next.set('tab', tab)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <MentorHubHomePage
      loadHome={loadHome}
      selectedTab={selectedTab}
      onTabSelect={selectTab}
      focusTabOnMount={focusTabOnMount}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
    />
  )
}
