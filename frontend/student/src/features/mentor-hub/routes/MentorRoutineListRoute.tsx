import { useNavigate, useSearchParams } from 'react-router'
import { createMentorRoutineListFixtureLoader, readRoutineListFixtureScenario } from '../fixtures/mentorRoutine.fixture.ts'
import { MentorContentListPage } from '../MentorContentListPage.tsx'
import { mentorRoutinePath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// Main "Routine" Tab (Routine-00 Mockup). Scroll은 App Shell의 ScrollRestoration이 복원한다.
export function MentorRoutineListRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=empty|loading|error로 상태를 확인한다.
  const loadList = createMentorRoutineListFixtureLoader(
    import.meta.env.DEV ? readRoutineListFixtureScenario(searchParams.toString()) : 'success',
  )

  return (
    <MentorContentListPage
      kind="routine"
      loadList={loadList}
      onTabSelect={navigateToTab}
      focusTabOnMount={focusTabOnMount}
      onContentSelect={(content) => navigate(mentorRoutinePath(content.contentId))}
    />
  )
}
