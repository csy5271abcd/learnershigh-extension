import { useNavigate, useSearchParams } from 'react-router'
import { createMentorPlanListFixtureLoader, readPlanListFixtureScenario } from '../fixtures/mentorPlan.fixture.ts'
import { MentorContentListPage } from '../MentorContentListPage.tsx'
import { mentorPlanPath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// Main "Plan" Tab. Scroll은 App Shell의 ScrollRestoration이 복원한다.
export function MentorPlanListRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=empty|loading|error로 상태를 확인한다.
  const loadList = createMentorPlanListFixtureLoader(
    import.meta.env.DEV ? readPlanListFixtureScenario(searchParams.toString()) : 'success',
  )

  return (
    <MentorContentListPage
      kind="plan"
      loadList={loadList}
      onTabSelect={navigateToTab}
      focusTabOnMount={focusTabOnMount}
      onContentSelect={(content) => navigate(mentorPlanPath(content.contentId))}
    />
  )
}
