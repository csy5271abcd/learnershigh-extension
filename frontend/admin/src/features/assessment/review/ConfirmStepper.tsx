import type { ReactNode } from 'react'
import { CheckIcon } from '../components/canonicalUi.ts'
import styles from './review.module.css'

// [15] A27-UX 최종 확정 안 세부 단계 — TDS Mobile Stepper(StepperRow: 왼쪽 번호 아이콘 · 가운데 제목/설명 · 오른쪽 요소 · 행 사이 연결선,
// 마지막 행은 선 없음)를 데스크톱 관리자 화면에 번안했다. TDS Stepper에는 완료·현재 상태 prop이 없어서, 이 화면에서는
// 기존 확정 조건 계산값(ready)을 ✓로, 지금 여는 단계를 파란 번호로만 덧붙인다. 단계를 건너뛰어도 확정 조건(서버 검증 포함)은 바뀌지 않는다.
export interface ConfirmStepItem {
  title: string
  /** 그 단계의 현재 상태 한 줄 (예: '등록 문서와 같은 파일', '확정할 값 3개') */
  description: string
  ready: boolean
}

export function ConfirmStepper({ steps, current, onSelect, children }: { steps: ConfirmStepItem[]; current: number; onSelect: (index: number) => void; children: ReactNode }) {
  return (
    <div className={styles.stepperFrame}>
      <div className={styles.stepperLayout}>
        <ol className={styles.stepper} aria-label="최종 확정 단계" data-testid="review-confirm-stepper">
          {steps.map((step, index) => {
            const state = index === current ? 'current' : step.ready ? 'done' : 'todo'
            return (
              <li key={step.title} className={styles.stepperItem} data-state={state} data-last={index === steps.length - 1 || undefined}>
                <button type="button" className={styles.stepperRow} aria-current={index === current ? 'step' : undefined} onClick={() => onSelect(index)} data-testid="review-confirm-step">
                  <span className={styles.stepperIcon} aria-hidden="true">
                    {step.ready && index !== current ? <CheckIcon size={14} /> : index + 1}
                  </span>
                  <span className={styles.stepperTexts}>
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </span>
                  <span className={styles.visuallyHidden}>{step.ready ? '완료' : '미완료'}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <div className={styles.stepperBody}>{children}</div>
      </div>
    </div>
  )
}
