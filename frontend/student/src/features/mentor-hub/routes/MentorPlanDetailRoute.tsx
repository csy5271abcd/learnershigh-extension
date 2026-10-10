import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { createMentorPlanFixtureLoader, readPlanFixtureScenario } from '../fixtures/mentorPlan.fixture.ts'
import { MentorPlanDetailPage } from '../MentorPlanDetailPage.tsx'
import { mentorPlanListPath, mentorProfilePath } from './paths.ts'

function parseWeek(value: string | null): number | undefined {
  const week = Number(value)
  return Number.isInteger(week) && week >= 1 ? week : undefined
}

// 선택 주차는 URL(?week=)에 두어 Profile 왕복 / 새로고침 후에도 유지한다. (없는 주차면 1주차)
export function MentorPlanDetailRoute() {
  const { contentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=loading|error|not-found|empty로 상태를 확인한다.
  const loadPlan = createMentorPlanFixtureLoader(
    import.meta.env.DEV ? readPlanFixtureScenario(searchParams.toString()) : 'success',
  )

  const selectWeek = (week: number) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (week === 1) next.delete('week')
        else next.set('week', String(week))
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  // App 안에서 이동해 왔다면 History Back으로 이전 화면(Home / Profile / Plan 목록)과 Scroll을 복원한다.
  // 주소로 바로 들어온 경우(이전 화면 없음)에는 Plan 목록으로 이동한다.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorPlanListPath)
  }

  return (
    <MentorPlanDetailPage
      contentId={contentId}
      loadPlan={loadPlan}
      selectedWeek={parseWeek(searchParams.get('week'))}
      onWeekSelect={selectWeek}
      onBack={goBack}
      onGoToPlanList={() => navigate(mentorPlanListPath)}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
    />
  )
}
