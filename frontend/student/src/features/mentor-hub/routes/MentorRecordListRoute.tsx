import { useNavigate, useSearchParams } from 'react-router'
import type { RecordListFilters } from '../components/RecordParts.tsx'
import { createMentorRecordListFixtureLoader, readRecordListFixtureScenario } from '../fixtures/mentorRecord.fixture.ts'
import { MentorRecordListPage } from '../MentorRecordListPage.tsx'
import { parseRecordArea, parseRecordGrade } from '../model/records.ts'
import { mentorRecordPath } from './paths.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// Main "Record" Tab. 검색어 / 학년 / 영역은 URL(?query= &grade= &area=)에 두어 새로고침 / Back / Detail 왕복 후에도 유지한다.
// Scroll은 App Shell의 ScrollRestoration이 복원한다. 개발용 ?fixture=는 함께 써도 된다.
export function MentorRecordListRoute() {
  const navigate = useNavigate()
  const { navigateToTab, focusTabOnMount } = useMentorHubTabNavigation()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: RecordListFilters = {
    query: searchParams.get('query') ?? '',
    grade: parseRecordGrade(searchParams.get('grade')),
    area: parseRecordArea(searchParams.get('area')),
  }

  const loadList = createMentorRecordListFixtureLoader(
    import.meta.env.DEV ? readRecordListFixtureScenario(searchParams.toString()) : 'success',
    filters,
  )

  const changeFilters = (next: RecordListFilters) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        const entries: [string, string | undefined][] = [
          ['query', next.query || undefined],
          ['grade', next.grade ? String(next.grade) : undefined],
          ['area', next.area],
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
    <MentorRecordListPage
      loadList={loadList}
      filters={filters}
      onFiltersChange={changeFilters}
      onTabSelect={navigateToTab}
      focusTabOnMount={focusTabOnMount}
      onRecordSelect={(contentId) => navigate(mentorRecordPath(contentId))}
    />
  )
}
