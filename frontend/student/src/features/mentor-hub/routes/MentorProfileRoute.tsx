import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { createMentorProfileFixtureLoader, readProfileFixtureScenario } from '../fixtures/mentorProfile.fixture.ts'
import { MentorProfilePage } from '../MentorProfilePage.tsx'
import { parseProfileContentKind } from '../model/tabs.ts'
import type { MentorProfileContentKind } from '../model/types.ts'
import { mentorHubPath, mentorPlanPath, mentorRoutinePath } from './paths.ts'

// 선택 Content Tab은 URL(?content=)에 두어 Content Detail 왕복 후에도 유지한다.
export function MentorProfileRoute() {
  const { mentorId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=loading|error|not-found로 상태를 확인한다.
  const loadProfile = createMentorProfileFixtureLoader(
    import.meta.env.DEV ? readProfileFixtureScenario(searchParams.toString()) : 'success',
  )

  const selectContentKind = (kind: MentorProfileContentKind) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('content', kind)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  // App 안에서 이동해 왔다면 History Back으로 이전 Tab / Scroll을 그대로 복원한다.
  // 주소로 바로 들어온 경우(이전 화면 없음)에는 Mentor Hub Home으로 이동한다.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorHubPath)
  }

  return (
    <MentorProfilePage
      mentorId={mentorId}
      loadProfile={loadProfile}
      selectedContentKind={parseProfileContentKind(searchParams.get('content'))}
      onContentKindSelect={selectContentKind}
      onBack={goBack}
      onGoToHub={() => navigate(mentorHubPath)}
      // Detail 화면이 있는 Content(Plan / Routine)만 연결한다.
      onContentSelect={(content) => {
        if (content.kind === 'plan') navigate(mentorPlanPath(content.contentId))
        if (content.kind === 'routine') navigate(mentorRoutinePath(content.contentId))
      }}
    />
  )
}
