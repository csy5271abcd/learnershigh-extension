import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { MentorPlanApplyDialog } from '../components/MentorPlanApplyDialog.tsx'
import {
  createPlanApplyFixtureService,
  fixtureExistingLibraryItems,
  readPlanApplyFixtureScenario,
} from '../fixtures/mentorPlanApply.fixture.ts'
import { parsePlanApplyStep, type PlanApplyStep } from '../model/planApply.ts'
import type { MentorPlanDetail, MentorPlanWeek } from '../model/types.ts'
import { mentorPlanListPath, mentorPlanPath } from './paths.ts'

export interface MentorPlanApplyOutletContext {
  plan: MentorPlanDetail
  week: MentorPlanWeek
}

export interface MentorPlanApplyNavigationState {
  /** Plan Detail의 버튼으로 열었는지 (닫을 때 History Back으로 돌아간다) */
  fromPlanDetail?: boolean
}

// /mentor/plans/:contentId/apply?week=&step= : Plan Detail 위의 내 계획에 적용 Modal Route.
// - 단계(?step=)는 History를 쌓지 않고 바꾼다 → 브라우저 Back / 닫기 = Plan Detail로 복귀
// - 입력 내용은 Modal 안에서만 유지한다. 새로고침하면 입력이 필요한 첫 단계로 돌아간다. (Draft 저장 없음)
// - Plan이 없거나 불러오지 못하면 Plan Detail이 Not Found / Error를 보여주고 Modal은 열리지 않는다.
export function MentorPlanApplyRoute() {
  const { plan, week } = useOutletContext<MentorPlanApplyOutletContext>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigationState = location.state as MentorPlanApplyNavigationState | null

  // API 연결 전까지 Fixture Service를 쓴다. 개발 중에는 ?fixture=no-conflict|apply-fail-once로 상태를 확인한다.
  const service = createPlanApplyFixtureService(
    import.meta.env.DEV ? readPlanApplyFixtureScenario(searchParams.toString()) : 'success',
  )

  const changeStep = (step: PlanApplyStep) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (step === 'start-date') next.delete('step')
        else next.set('step', step)
        return next
      },
      { replace: true, preventScrollReset: true, state: navigationState },
    )
  }

  const close = () => {
    if (navigationState?.fromPlanDetail) {
      navigate(-1)
      return
    }
    // 주소로 바로 들어온 경우: Apply 주소를 Plan Detail 주소로 바꾼다.
    const search = new URLSearchParams(searchParams)
    search.delete('step')
    navigate({ pathname: mentorPlanPath(plan.contentId), search: search.toString() }, { replace: true, preventScrollReset: true })
  }

  return (
    <MentorPlanApplyDialog
      key={`${plan.contentId}-${week.week}`}
      plan={plan}
      week={week}
      step={parsePlanApplyStep(searchParams.get('step'))}
      onStepChange={changeStep}
      onClose={close}
      onGoToPlanList={() => navigate(mentorPlanListPath)}
      libraryItems={fixtureExistingLibraryItems}
      preview={service.preview}
      apply={service.apply}
    />
  )
}
