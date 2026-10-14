import styles from './CreateStepper.module.css'

export interface StepItem<Id extends string> {
  id: Id
  label: string
}

interface CreateStepperProps<Id extends string> {
  steps: StepItem<Id>[]
  current: Id
  /** 이 순서까지 이동할 수 있다. (앞 단계 입력이 끝난 곳까지) */
  reachableIndex: number
  onSelect: (id: Id) => void
}

// 작성 진행 상태. 지나온 단계와 갈 수 있는 단계는 눌러서 이동한다.
export function CreateStepper<Id extends string>({ steps, current, reachableIndex, onSelect }: CreateStepperProps<Id>) {
  const currentIndex = steps.findIndex((step) => step.id === current)

  return (
    <nav aria-label="작성 단계" className={styles.nav}>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const state = index === currentIndex ? 'current' : index < currentIndex ? 'done' : 'todo'
          return (
            <li key={step.id} className={`${styles.item} ${styles[state]}`}>
              <button
                type="button"
                className={styles.button}
                aria-current={state === 'current' ? 'step' : undefined}
                disabled={index > reachableIndex}
                onClick={() => onSelect(step.id)}
              >
                <span className={styles.number} aria-hidden="true">
                  {index + 1}
                </span>
                <span>{step.label}</span>
                {state === 'done' && <span className="visually-hidden">(완료)</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
