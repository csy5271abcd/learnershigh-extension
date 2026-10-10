import { useNavigate, useSearchParams } from 'react-router'
import { createMentorHubHomeFixtureLoader, readFixtureScenario } from '../fixtures/mentorHubHome.fixture.ts'
import { MentorHubHomePage } from '../MentorHubHomePage.tsx'
import { parseMentorHubTab, type MentorHubTabId } from '../model/tabs.ts'
import { mentorProfilePath } from './paths.ts'

// 선택 Main Tab은 URL(?tab=)에 두어 Profile 왕복(Back) 후에도 유지한다.
// Scroll 위치는 App Shell의 ScrollRestoration이 복원한다.
export function MentorHubHomeRoute() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=empty|loading|error로 상태를 확인한다.
  const loadHome = createMentorHubHomeFixtureLoader(
    import.meta.env.DEV ? readFixtureScenario(searchParams.toString()) : 'success',
  )

  const selectTab = (tab: MentorHubTabId) => {
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
      selectedTab={parseMentorHubTab(searchParams.get('tab'))}
      onTabSelect={selectTab}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
    />
  )
}
