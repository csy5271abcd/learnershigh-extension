import { planApplySteps, stepIndex, type PlanApplyStep } from '../model/planApply.ts'
import styles from './MentorPlanApplyDialog.module.css'

// Plan-02 ~ 04 Mockup Stepper: 지난 단계 ✓, 현재 단계 번호(Accent), 남은 단계 번호(회색)
// Mobile에서는 단계 이름을 숨기고 "4 / 5 · 충돌 확인·수정" 한 줄로 보여준다.
export function PlanApplyStepper({ current }: { current: PlanApplyStep }) {
  const currentIndex = stepIndex(current)

  return (
    <div className={styles.stepper}>
      <ol className={styles.steps} aria-label="내 계획에 적용 단계">
        {planApplySteps.map((step, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
          return (
            <li key={step.id} className={styles.step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className={styles.stepMarker} aria-hidden="true">
                {state === 'done' ? (
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className={styles.stepLabel}>
                {step.label}
                <span className="lh-visually-hidden">{state === 'done' ? ' (완료)' : state === 'current' ? ' (현재 단계)' : ''}</span>
              </span>
            </li>
          )
        })}
      </ol>
      <p className={styles.stepCompact} aria-hidden="true">
        {currentIndex + 1} / {planApplySteps.length} · {planApplySteps[currentIndex].label}
      </p>
    </div>
  )
}
