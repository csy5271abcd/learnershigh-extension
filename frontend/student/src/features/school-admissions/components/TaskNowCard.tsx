import { studentAttentionMessage } from '../model/taskDetail.ts'
import { taskStageNames, taskTurnText } from '../model/tasks.ts'
import type { StudentTaskSummary, TaskDetailAction, TaskNowCard as TaskNowCardModel } from '../model/types.ts'
import styles from './TaskNowCard.module.css'

interface TaskActionButtonProps {
  action: TaskDetailAction
  variant: 'primary' | 'secondary'
  onAction: (action: TaskDetailAction) => void
}

// 지금 할 일 Action. 화면이 아직 없는 Action은 비활성 + 이유를 보여준다. (가짜 완료 / 성공 없음)
export function TaskActionButton({ action, variant, onAction }: TaskActionButtonProps) {
  const className = variant === 'primary' ? styles.primaryButton : styles.secondaryButton
  if (action.kind === 'unavailable') {
    const reasonId = `task-action-${action.label.replace(/\s+/g, '-')}-reason`
    return (
      <span className={styles.actionWithReason}>
        <button type="button" className={className} disabled aria-describedby={reasonId}>
          {action.label}
        </button>
        <span id={reasonId} className={styles.actionReason}>
          {action.reason}
        </span>
      </span>
    )
  }
  return (
    <button type="button" className={className} onClick={() => onAction(action)}>
      {action.label}
    </button>
  )
}

interface TaskNowCardProps {
  task: StudentTaskSummary
  card: TaskNowCardModel
  onAction: (action: TaskDetailAction) => void
}

// Overview의 지금 할 일 (TasksDetail-01): 현재 단계 · 상태 / 큰 제목 / 설명 / 사실 한 줄 / Primary CTA / 기다리는 동안 할 수 있는 일.
// 운영시간 숫자(62시간 등)는 보여주지 않고, 운영 상태는 학생용 문장으로만 알린다.
// 기다리는 상태(선생님 검토 / AI 분석 / Review 지연)는 움직이는 표시 없이 Text로만 보여준다.
export function TaskNowCard({ task, card, onAction }: TaskNowCardProps) {
  const waiting = task.turn === 'waiting'
  const attention = task.attentionFlags.map((flag) => studentAttentionMessage[flag])

  return (
    <section className={styles.card} aria-labelledby="task-now-heading" data-turn={task.turn}>
      <p className={styles.eyebrow}>
        {!waiting && <span className={styles.turnDot} aria-hidden="true" />}
        {waiting ? `지금은 ${taskTurnText(task)}` : '지금 할 일'}
        <span className={styles.stage}>
          <span className={styles.stageSeparator} aria-hidden="true">
            ·{' '}
          </span>
          {task.currentStage}단계 {taskStageNames[task.currentStage]} · {task.stageStatus}
        </span>
      </p>
      <h2 id="task-now-heading" tabIndex={-1} className={styles.headline}>
        {card.headline}
      </h2>
      {card.description && <p className={styles.description}>{card.description}</p>}
      {(card.fact || attention.length > 0) && (
        <p className={styles.fact}>{[card.fact, ...attention].filter(Boolean).join(' · ')}</p>
      )}
      {card.primaryAction && (
        <div className={styles.primary}>
          <TaskActionButton action={card.primaryAction} variant="primary" onAction={onAction} />
        </div>
      )}
      {card.waitingActions.length > 0 && (
        <div className={styles.more}>
          <p className={styles.moreLabel}>{waiting ? '기다리는 동안 할 수 있어요' : '함께 보면 좋아요'}</p>
          <div className={styles.moreActions}>
            {card.waitingActions.map((action) => (
              <TaskActionButton key={action.label} action={action} variant="secondary" onAction={onAction} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

interface TaskCompactStatusProps {
  task: StudentTaskSummary
}

// Overview 외 6개 Tab 위의 한 줄 상태: 현재 단계 · 상태 · 다음 할 일 (큰 지금 할 일 Card를 반복하지 않는다)
// 운영 상태가 있으면 학생용 문장(예: 검토가 조금 지연되고 있어요.)을 Text로 덧붙인다.
export function TaskCompactStatus({ task }: TaskCompactStatusProps) {
  const attention = task.attentionFlags.map((flag) => studentAttentionMessage[flag])
  return (
    <p className={styles.compact}>
      <span className="lh-visually-hidden">현재 상태: </span>
      <span className={styles.compactStage}>
        {task.currentStage}/8 · {taskStageNames[task.currentStage]} · {task.stageStatus}
      </span>
      <span className={styles.compactTurn} data-turn={task.turn}>
        {taskTurnText(task)}
      </span>
      <span className={styles.compactNext}>{task.nextAction}</span>
      {attention.length > 0 && <span className={styles.compactNote}>{attention.join(' ')}</span>}
    </p>
  )
}
