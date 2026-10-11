import {
  deadlineCountdown,
  formatDeadline,
  TASK_STAGE_COUNT,
  taskAttentionLabel,
  taskStageNames,
  taskTurnText,
} from '../model/tasks.ts'
import type { StudentTaskSummary } from '../model/types.ts'
import styles from './SchoolTaskRow.module.css'

interface SchoolTaskRowProps {
  task: StudentTaskSummary
  /** D-day 기준일 (목록 응답 값) */
  snapshotDate: string
}

// Tasks-00 Task 한 줄: 제목 · 제출물 · 과목 / 마감 · D-day / n/8 · 단계 상태 + 8칸 진행 / 주의 표시 · 차례 (+ 내 차례면 다음 할 일)
// Task Detail은 다음 Branch에서 만든다. 아직 이동할 화면이 없어 Row를 Link로 만들지 않는다.
export function SchoolTaskRow({ task, snapshotDate }: SchoolTaskRowProps) {
  const titleId = `school-task-${task.taskId}-title`
  const countdown = deadlineCountdown(task.deadlineDate, snapshotDate)
  const stageName = taskStageNames[task.currentStage]

  return (
    <article className={styles.row} aria-labelledby={titleId}>
      <div className={styles.task}>
        <h3 id={titleId} className={styles.title}>
          {task.title}
        </h3>
        <p className={styles.meta}>
          {task.deliverableSummary} · {task.subject}
        </p>
      </div>

      <p className={styles.deadline}>
        <span className="lh-visually-hidden">마감 </span>
        <time dateTime={task.deadlineDate} className={styles.deadlineDate}>
          {formatDeadline(task.deadlineDate)}
        </time>
        {/* 마감이 지나 주의가 필요한 Task는 상태 열의 Deadline Passed로 알린다. (완료된 Task의 마감 지남은 경고가 아니다) */}
        <span className={styles.countdown}>{countdown}</span>
      </p>

      <div className={styles.stage}>
        <p className={styles.stageText}>
          <span className="lh-visually-hidden">현재 단계 </span>
          {task.currentStage}/{TASK_STAGE_COUNT} · {task.stageStatus}
          <span className="lh-visually-hidden">
            {' '}
            ({TASK_STAGE_COUNT}단계 중 {task.currentStage}단계 {stageName})
          </span>
        </p>
        {/* 진행 막대는 위 Text와 같은 정보라 Screen Reader에서는 숨긴다. (색상만으로 단계를 알리지 않는다) */}
        <ol className={styles.progress} aria-hidden="true">
          {Array.from({ length: TASK_STAGE_COUNT }, (_, index) => (
            <li key={index} className={styles.segment} data-done={index < task.currentStage || undefined} />
          ))}
        </ol>
      </div>

      <div className={styles.status}>
        <span className="lh-visually-hidden">상태 </span>
        {task.attentionFlags.map((flag) => (
          <span key={flag} className={styles.attention} data-flag={flag}>
            {taskAttentionLabel[flag]}
          </span>
        ))}
        <span className={styles.turn} data-turn={task.turn}>
          {taskTurnText(task)}
        </span>
        {task.turn === 'student' && <span className={styles.nextAction}>{task.nextAction}</span>}
      </div>
    </article>
  )
}
