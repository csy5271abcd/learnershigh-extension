import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import type { AdminStudent, AdminTask } from '../../fixtures/types.ts'
import { errorMessageOf, reviewTopic, type TopicReviewDecision } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { studentTaskSummary } from '../../read-model/studentProjection.ts'
import { daysUntil, formatDateTime, formatDday, formatMonthDay, formatWaiting, hoursSince } from '../../read-model/time.ts'
import { ReviewTopBar, type ReviewNavigation } from './ReviewTopBar.tsx'
import styles from './ReviewPage.module.css'

/*
 * Topic Review (POST /api/admin/tasks/{taskId}/topic-review, decision APPROVE | REQUEST_DIRECTION)
 * - 승인: Student Task가 3단계 자료 조사로 진행된다. 방향 요청: 2단계에 머물고 학생이 주제를 고쳐 다시 제출한다. (같은 taskId)
 * - 방향 요청 Comment 필수 여부는 Source에 없어 막지 않는다. 비우면 학생에게 방향 문장 없이 "주제 수정 필요"만 보인다. (Gap)
 * - 학생 주제 원문은 Admin이 고쳐 쓰지 않는다. topicApprovalStatus Enum은 확정하지 않는다. (OD-03)
 */

interface TopicReviewPageProps {
  state: AdminState
  task: AdminTask
  student: AdminStudent
  navigation: ReviewNavigation
  onBack: () => void
  onGo: (feedbackId: string) => void
  onOpenStudent: (studentId: string) => void
}

const topicStateLabel = { 'not-submitted': '제출 전', 'in-review': '검토 대기', 'direction-requested': '방향 요청됨', confirmed: '승인됨' } as const

export function TopicReviewPage({ state, task, student, navigation, onBack, onGo, onOpenStudent }: TopicReviewPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [decision, setDecision] = useState<TopicReviewDecision | null>(null)
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const topic = task.topic!
  const days = daysUntil(task.deadlineDate)
  const inReview = topic.state === 'in-review'
  const projection = studentTaskSummary(state, task.taskId)

  const submit = async () => {
    if (!decision || pending) return
    setPending(true)
    setError(null)
    try {
      await reviewTopic(task.taskId, decision, decision === 'REQUEST_DIRECTION' ? comment : null)
      setDone(true)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <ReviewTopBar navigation={navigation} status="주제 검토" onBack={onBack} onGo={onGo} />
      <div className={styles.split}>
        <section className={styles.viewer} aria-labelledby="topic-title">
          <p className={styles.eyebrow}>
            <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(student.studentId)}>
              {student.displayName}
              <span className="lh-visually-hidden"> Student 360 보기</span>
            </button>{' '}
            · {student.grade} · 주제 검토
          </p>
          <h1 id="topic-title" ref={headingRef} tabIndex={-1} className={styles.title}>
            {task.title}
          </h1>
          <dl className={styles.facts}>
            <div>
              <dt>과목</dt>
              <dd>{task.subject}</dd>
            </div>
            <div>
              <dt>제출물</dt>
              <dd>{task.deliverableSummary}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd data-tone={days <= 3 ? 'negative' : undefined}>
                {formatMonthDay(task.deadlineDate)} · {formatDday(days)}
              </dd>
            </div>
            <div>
              <dt>주제 제출</dt>
              <dd>{topic.submittedAt ? `${formatDateTime(topic.submittedAt)} · ${formatWaiting(hoursSince(topic.submittedAt))} 대기` : '기록 없음'}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd>{topicStateLabel[topic.state]}</dd>
            </div>
          </dl>
          <div className={styles.recordSection}>
            <h2 className={styles.blockTitle}>학생이 제출한 주제</h2>
            <p className={styles.fileName}>{topic.text}</p>
            <p className={ui.cellSub}>학생 원문이에요. Admin은 승인하거나 방향만 남기고, 주제를 대신 고쳐 쓰지 않아요.</p>
          </div>
          {topic.guidance && (
            <div className={styles.recordSection}>
              <h2 className={styles.blockTitle}>남긴 방향</h2>
              <p>{topic.guidance}</p>
            </div>
          )}
        </section>

        <section className={styles.staff} aria-labelledby="topic-staff-title">
          <h2 id="topic-staff-title" className={ui.subTitle}>
            주제 검토
          </h2>
          {!inReview ? (
            <div className={ui.list}>
              {done && (
                <p className={ui.success} role="status">
                  검토 결과를 학생에게 전달했어요.
                </p>
              )}
              <p>
                <Badge tone={topic.state === 'confirmed' ? 'accent' : 'warning'}>{topicStateLabel[topic.state]}</Badge>
              </p>
              {projection && (
                <div className={ui.note}>
                  <p className={ui.fieldLabel}>학생 화면 반영</p>
                  <p>
                    {projection.currentStage}단계 · {projection.stageStatus} · 다음 할 일 "{projection.nextAction}"
                  </p>
                </div>
              )}
              {navigation.nextId && (
                <button type="button" className={ui.primaryButton} onClick={() => onGo(navigation.nextId!)}>
                  다음 검토로
                </button>
              )}
            </div>
          ) : (
            <form
              className={ui.list}
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <fieldset className={styles.fieldset}>
                <legend className={ui.fieldLabel}>결정</legend>
                <label className={styles.option} data-checked={decision === 'APPROVE' || undefined}>
                  <input type="radio" name="topic-decision" checked={decision === 'APPROVE'} onChange={() => setDecision('APPROVE')} />
                  승인 · 자료 조사로 진행
                </label>
                <label className={styles.option} data-checked={decision === 'REQUEST_DIRECTION' || undefined}>
                  <input type="radio" name="topic-decision" checked={decision === 'REQUEST_DIRECTION'} onChange={() => setDecision('REQUEST_DIRECTION')} />
                  방향 요청 · 학생이 주제를 고쳐 다시 제출
                </label>
              </fieldset>
              {decision === 'REQUEST_DIRECTION' && (
                <label className={ui.field}>
                  <span className={ui.fieldLabel}>방향 Comment</span>
                  <textarea className={ui.textarea} rows={4} maxLength={300} value={comment} placeholder="예: 범위를 한 지역으로 좁혀보세요." onChange={(event) => setComment(event.target.value)} />
                  <span className={ui.counter}>{comment.length}/300</span>
                  <span className={ui.cellSub}>비워 두면 학생에게는 "주제 수정 필요"만 보여요.</span>
                </label>
              )}
              {error && (
                <p className={ui.errorText} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className={ui.primaryButton} disabled={!decision || pending} aria-busy={pending}>
                {pending ? '전달하는 중…' : decision === 'REQUEST_DIRECTION' ? '방향 요청 전달' : '주제 승인'}
              </button>
              {!decision && <p className={ui.cellSub}>결정을 먼저 골라주세요.</p>}
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
