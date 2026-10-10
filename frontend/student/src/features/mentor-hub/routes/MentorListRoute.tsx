import { useNavigate, useSearchParams } from 'react-router'
import type { MentorListFilters } from '../components/MentorListControls.tsx'
import { createMentorListFixtureLoader, readListFixtureScenario } from '../fixtures/mentorList.fixture.ts'
import { MentorListPage } from '../MentorListPage.tsx'
import { mentorProfilePath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// 검색어 / 전형 / 학과는 URL(?query= &admissionType= &major=, API Contract Query 이름)에 둔다.
// → 새로고침 / Back / Forward / Profile 왕복 후에도 유지. Scroll은 App Shell의 ScrollRestoration이 복원한다.
// 개발용 ?fixture= 는 Filter Param과 별개로 유지된다.
export function MentorListRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams, setSearchParams] = useSearchParams()

  const loadList = createMentorListFixtureLoader(
    import.meta.env.DEV ? readListFixtureScenario(searchParams.toString()) : 'success',
  )

  const filters: MentorListFilters = {
    query: searchParams.get('query') ?? '',
    admissionType: searchParams.get('admissionType') || undefined,
    major: searchParams.get('major') || undefined,
  }

  const changeFilters = (next: MentorListFilters) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        const entries: [string, string | undefined][] = [
          ['query', next.query],
          ['admissionType', next.admissionType],
          ['major', next.major],
        ]
        for (const [name, value] of entries) {
          if (value) params.set(name, value)
          else params.delete(name)
        }
        return params
      },
      // 입력마다 History가 쌓이지 않도록 현재 Entry를 바꾼다.
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <MentorListPage
      loadList={loadList}
      filters={filters}
      onFiltersChange={changeFilters}
      onTabSelect={navigateToTab}
      focusTabOnMount={focusTabOnMount}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
    />
  )
}
