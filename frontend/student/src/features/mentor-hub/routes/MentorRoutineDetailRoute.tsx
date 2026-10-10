import { Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { createRoutineConflictHintLoader, readRoutineApplyFixtureScenario } from '../fixtures/mentorRoutineApply.fixture.ts'
import { createMentorRoutineFixtureLoader, readRoutineFixtureScenario } from '../fixtures/mentorRoutine.fixture.ts'
import { MentorRoutineDetailPage } from '../MentorRoutineDetailPage.tsx'
import { parseSelectedHabitIds } from '../model/routineApply.ts'
import type { RoutineApplyMode } from '../model/types.ts'
import type { MentorRoutineApplyNavigationState, MentorRoutineApplyOutletContext } from './MentorRoutineApplyRoute.tsx'
import { mentorProfilePath, mentorRoutineApplyPath, mentorRoutineListPath } from './paths.ts'

// 고른 Habit은 URL(?habits=)에 두어 Profile 왕복 / 적용 취소 / 새로고침 후에도 유지한다.
export function MentorRoutineDetailRoute() {
  const { contentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.toString()

  // API 연결 전까지 Fixture를 Data Source로 쓴다.
  // 개발 중: ?fixture=loading|error|not-found|empty (Routine), ?fixture=no-conflict|apply-fail-once (적용)
  const loadRoutine = createMentorRoutineFixtureLoader(import.meta.env.DEV ? readRoutineFixtureScenario(search) : 'success')
  const loadConflicts = createRoutineConflictHintLoader(
    import.meta.env.DEV ? readRoutineApplyFixtureScenario(search) : 'success',
  )

  const rawHabits = searchParams.get('habits')

  const changeHabits = (habitIds: string[]) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (habitIds.length > 0) next.set('habits', habitIds.join(','))
        else next.delete('habits')
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  // 적용: Detail 위에 Modal Route를 연다. (고른 Habit / 개발용 fixture Param 유지, Back으로 Detail 복귀)
  const openApply = (mode: RoutineApplyMode) => {
    const next = new URLSearchParams(searchParams)
    next.set('mode', mode)
    const state: MentorRoutineApplyNavigationState = { fromRoutineDetail: true }
    navigate({ pathname: mentorRoutineApplyPath(contentId), search: next.toString() }, { state, preventScrollReset: true })
  }

  // App 안에서 이동해 왔다면 History Back으로 이전 화면(Home / Profile / Routine 목록)과 Scroll을 복원한다.
  // 주소로 바로 들어온 경우(이전 화면 없음)에는 Routine 목록으로 이동한다.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorRoutineListPath)
  }

  return (
    <MentorRoutineDetailPage
      contentId={contentId}
      loadRoutine={loadRoutine}
      loadConflicts={loadConflicts}
      selectedHabitIds={parseSelectedHabitIds(rawHabits, null)}
      onHabitSelectionChange={changeHabits}
      onBack={goBack}
      onGoToRoutineList={() => navigate(mentorRoutineListPath)}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
      onApply={openApply}
      overlay={(routine) => {
        const context: MentorRoutineApplyOutletContext = {
          routine,
          selectedHabitIds: parseSelectedHabitIds(rawHabits, routine),
        }
        return <Outlet context={context} />
      }}
    />
  )
}
