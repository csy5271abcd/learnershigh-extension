import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { MentorRoutineApplyDialog } from '../components/MentorRoutineApplyDialog.tsx'
import { createRoutineApplyFixtureService, readRoutineApplyFixtureScenario } from '../fixtures/mentorRoutineApply.fixture.ts'
import { parseRoutineApplyMode } from '../model/routineApply.ts'
import type { MentorRoutineDetail } from '../model/types.ts'
import { mentorRoutinePath } from './paths.ts'

export interface MentorRoutineApplyOutletContext {
  routine: MentorRoutineDetail
  selectedHabitIds: string[]
}

export interface MentorRoutineApplyNavigationState {
  /** Routine Detail의 버튼으로 열었는지 (닫을 때 History Back으로 돌아간다) */
  fromRoutineDetail?: boolean
}

// /mentor/routines/:contentId/apply?mode=all|habits&habits= : Routine Detail 위의 적용 Modal Route.
// 닫기 / 취소 / ESC / 브라우저 Back = Routine Detail로 복귀 (고른 Habit / Scroll 유지)
export function MentorRoutineApplyRoute() {
  const { routine, selectedHabitIds } = useOutletContext<MentorRoutineApplyOutletContext>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const navigationState = location.state as MentorRoutineApplyNavigationState | null
  const mode = parseRoutineApplyMode(searchParams.get('mode'))

  // API 연결 전까지 Fixture Service를 쓴다. 개발 중에는 ?fixture=no-conflict|apply-fail-once로 상태를 확인한다.
  const service = createRoutineApplyFixtureService(
    import.meta.env.DEV ? readRoutineApplyFixtureScenario(searchParams.toString()) : 'success',
  )

  const close = () => {
    if (navigationState?.fromRoutineDetail) {
      navigate(-1)
      return
    }
    // 주소로 바로 들어온 경우: Apply 주소를 Routine Detail 주소로 바꾼다.
    const search = new URLSearchParams(searchParams)
    search.delete('mode')
    navigate(
      { pathname: mentorRoutinePath(routine.contentId), search: search.toString() },
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <MentorRoutineApplyDialog
      key={`${routine.contentId}-${mode}-${selectedHabitIds.join(',')}`}
      routine={routine}
      mode={mode}
      selectedHabitIds={selectedHabitIds}
      onClose={close}
      preview={service.preview}
      apply={service.apply}
    />
  )
}
