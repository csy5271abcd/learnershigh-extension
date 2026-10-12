import { useEffect, useRef } from 'react'
import { deadlineCountdown, formatDeadline, taskStageNames } from '../model/tasks.ts'
import { taskTopicFieldId } from '../model/topic.ts'
import type { StudentTaskSummary } from '../model/types.ts'
import styles from './TaskTopicDialog.module.css'

interface TaskTopicDialogProps {
  task: StudentTaskSummary
  snapshotDate: string
  /** 방향 요청을 받은 경우: 처음 제출한 주제와 선생님 방향 안내 */
  revision?: { previousTopic: string; guidance: string }
  topic: string
  onTopicChange: (topic: string) => void
  error?: string
  submitting: boolean
  submitFailed: boolean
  onSubmit: () => void
  /** 취소 / 닫기 / ESC. 수정 중이면 호출 측이 확인 Dialog를 띄운다. */
  onRequestClose: () => void
}

// 주제 제출 Modal (전용 Mockup 없음 → TaskRegister Modal / TasksDetail-01 기준).
// Task Detail 위에 열려 어떤 수행평가의 주제인지(제목 · 과목 · 단계 · 마감)를 함께 보여준다.
// 주제는 학생이 직접 쓴다. AI / 선생님이 대신 쓰지 않고, 선생님은 방향만 남긴다.
export function TaskTopicDialog({
  task,
  snapshotDate,
  revision,
  topic,
  onTopicChange,
  error,
  submitting,
  submitFailed,
  onSubmit,
  onRequestClose,
}: TaskTopicDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    headingRef.current?.focus({ preventScroll: true })
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="task-topic-heading"
      aria-describedby="task-topic-context"
      onCancel={(event) => {
        event.preventDefault()
        onRequestClose()
      }}
    >
      <form
        className={styles.surface}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h2 id="task-topic-heading" ref={headingRef} tabIndex={-1} className={styles.title}>
              {revision ? '주제를 다시 정리해볼까요?' : '어떤 주제로 할까요?'}
            </h2>
            <button type="button" className={styles.close} aria-label="주제 제출 닫기" onClick={onRequestClose}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {/* 어떤 수행평가의 주제인지 */}
          <dl id="task-topic-context" className={styles.context}>
            <div>
              <dt className="lh-visually-hidden">수행평가</dt>
              <dd className={styles.contextTitle}>{task.title}</dd>
            </div>
            <div className={styles.contextMeta}>
              <dt className="lh-visually-hidden">과목 · 단계 · 마감</dt>
              <dd>
                {task.subject} · {task.currentStage}단계 {taskStageNames[task.currentStage]} · {formatDeadline(task.deadlineDate)} 마감 (
                {deadlineCountdown(task.deadlineDate, snapshotDate)})
              </dd>
            </div>
          </dl>
        </header>

        <div className={styles.body}>
          {revision && (
            <section className={styles.guidance} aria-labelledby="task-topic-guidance-heading">
              <h3 id="task-topic-guidance-heading" className={styles.guidanceLabel}>
                선생님이 남긴 방향
              </h3>
              <p>{revision.guidance}</p>
              <p className={styles.previous}>
                <span className={styles.previousLabel}>처음 제출한 주제</span> {revision.previousTopic}
              </p>
            </section>
          )}

          <div className={styles.field}>
            <label htmlFor={taskTopicFieldId} className={styles.label}>
              주제
            </label>
            <p id="task-topic-hint" className={styles.hint}>
              탐구하고 싶은 질문이나 범위를 직접 적어요.
            </p>
            <textarea
              id={taskTopicFieldId}
              className={styles.textarea}
              rows={4}
              value={topic}
              placeholder="예: 항생제 사용이 내성균 증가에 미치는 영향"
              aria-invalid={Boolean(error)}
              aria-describedby={`task-topic-hint${error ? ' task-topic-error' : ''}`}
              onChange={(event) => onTopicChange(event.target.value)}
            />
            {error && (
              <p id="task-topic-error" className={styles.error}>
                {error}
              </p>
            )}
          </div>
        </div>

        {submitFailed && (
          <p className={styles.submitError} role="alert">
            주제를 제출하지 못했어요. 입력한 내용은 그대로 있어요. 다시 제출해주세요.
          </p>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.secondaryButton} onClick={onRequestClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" className={styles.primaryButton} disabled={submitting} data-inactive={!topic.trim() || undefined}>
            {submitting ? '제출 중…' : revision ? '다시 제출' : '주제 제출'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
