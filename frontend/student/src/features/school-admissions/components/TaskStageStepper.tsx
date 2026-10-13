import { useLayoutEffect, useRef } from 'react'
import { taskStageShortNames } from '../model/taskDetail.ts'
import { TASK_STAGE_COUNT, taskStageNames } from '../model/tasks.ts'
import type { TaskStageNumber } from '../model/types.ts'
import styles from './TaskStageStepper.module.css'

interface TaskStageStepperProps {
  currentStage: TaskStageNumber
}

const stages = Array.from({ length: TASK_STAGE_COUNT }, (_, index) => (index + 1) as TaskStageNumber)

// 수행평가 8단계 Stepper (TasksDetail Mockup). 지난 단계 ✓ / 현재 단계 번호 강조 / 남은 단계 흐리게.
// 좁은 화면에서는 줄이지 않고 가로 Scroll로 보여주며, 현재 단계가 보이는 위치로 옮긴다.
export function TaskStageStepper({ currentStage }: TaskStageStepperProps) {
  const listRef = useRef<HTMLOListElement>(null)
  const currentRef = useRef<HTMLLIElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const current = currentRef.current
    if (!list || !current || list.scrollWidth <= list.clientWidth) return
    list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2
  }, [currentStage])

  return (
    <ol ref={listRef} className={styles.stepper} aria-label={`수행평가 8단계 중 ${currentStage}단계 ${taskStageNames[currentStage]}`}>
      {stages.map((stage) => {
        const state = stage < currentStage ? 'done' : stage === currentStage ? 'current' : 'upcoming'
        return (
          <li
            key={stage}
            ref={state === 'current' ? currentRef : undefined}
            className={styles.step}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            title={taskStageNames[stage]}
          >
            <span className={styles.marker} aria-hidden="true">
              {state === 'done' ? (
                <svg viewBox="0 0 16 16" width="12" height="12" focusable="false">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                stage
              )}
            </span>
            <span className={styles.label}>{taskStageShortNames[stage]}</span>
            <span className="lh-visually-hidden">
              {' '}
              ({stage}단계 {taskStageNames[stage]}, {state === 'done' ? '완료' : state === 'current' ? '현재 단계' : '남은 단계'})
            </span>
          </li>
        )
      })}
    </ol>
  )
}
