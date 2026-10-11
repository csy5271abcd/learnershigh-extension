import { useNavigate, useSearchParams } from 'react-router'
import { createMentorCaseListFixtureLoader, readCaseListFixtureScenario } from '../fixtures/mentorCase.fixture.ts'
import { MentorCaseListPage } from '../MentorCaseListPage.tsx'
import { mentorCasePath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// Main "Case" Tab. 검색어는 URL(?query=)에 두어 새로고침 / Back / Detail 왕복 후에도 유지한다.
// Scroll은 App Shell의 ScrollRestoration이 복원한다. 개발용 ?fixture=는 함께 써도 된다.
export function MentorCaseListRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('query') ?? ''

  const loadList = createMentorCaseListFixtureLoader(
    import.meta.env.DEV ? readCaseListFixtureScenario(searchParams.toString()) : 'success',
    query,
  )

  const changeQuery = (next: string) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next) params.set('query', next)
        else params.delete('query')
        return params
      },
      // 입력마다 History가 쌓이지 않도록 현재 Entry를 바꾼다.
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <MentorCaseListPage
      loadList={loadList}
      query={query}
      onQueryChange={changeQuery}
      onTabSelect={navigateToTab}
      focusTabOnMount={focusTabOnMount}
      onCaseSelect={(contentId) => navigate(mentorCasePath(contentId))}
    />
  )
}
