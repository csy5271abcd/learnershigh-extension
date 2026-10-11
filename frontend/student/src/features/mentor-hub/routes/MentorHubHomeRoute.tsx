import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { createMentorHubHomeFixtureLoader, readFixtureScenario } from '../fixtures/mentorHubHome.fixture.ts'
import { MentorHubHomePage } from '../MentorHubHomePage.tsx'
import { parseMentorHubTab, type MentorHubTabId } from '../model/tabs.ts'
import {
  mentorListPath,
  mentorPlanListPath,
  mentorProfilePath,
  mentorQuestionListPath,
  mentorQuestionPath,
  mentorRecordListPath,
  mentorRoutineListPath,
  mentorStoryListPath,
} from './paths.ts'
import { mentorContentPath } from './useMentorContentLink.ts'
import { useMentorHubTabNavigation } from './useMentorHubTabNavigation.ts'

// 선택 Main Tab은 URL(?tab=)에 두어 Profile 왕복(Back) 후에도 유지한다. ('멘토' / 'Plan' / 'Routine' / 'Story' / 'Q&A' / 'Record' Tab은 별도 Route)
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

  // 별도 Route가 있는 Tab을 ?tab= 주소로 들어오면 해당 Route로 보낸다.
  if (selectedTab === 'mentors') return <Navigate to={mentorListPath} replace />
  if (selectedTab === 'plan') return <Navigate to={mentorPlanListPath} replace />
  if (selectedTab === 'routine') return <Navigate to={mentorRoutineListPath} replace />
  if (selectedTab === 'story') return <Navigate to={mentorStoryListPath} replace />
  if (selectedTab === 'qna') return <Navigate to={mentorQuestionListPath} replace />
  if (selectedTab === 'record') return <Navigate to={mentorRecordListPath} replace />

  const selectTab = (tab: MentorHubTabId) => {
    if (tab === 'mentors' || tab === 'plan' || tab === 'routine' || tab === 'story' || tab === 'qna' || tab === 'record') {
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
      // Detail 화면이 있는 Content(Plan / Routine / Story / Record / Q&A)만 연결한다.
      // Q&A 항목의 id는 MentorContent가 아니라 질문 id다. (Q&A는 별도 Student Question Flow)
      onContentSelect={(content) => {
        if (content.kind === 'qna') {
          navigate(mentorQuestionPath(content.contentId))
          return
        }
        const path = mentorContentPath(content)
        if (path) navigate(path)
      }}
    />
  )
}
