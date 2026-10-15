import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { ActivityInspector } from '../../components/ActivityInspector.tsx'
import { activityStatusLabel, activityTypeLabel } from '../../fixtures/adminActivities.fixture.ts'
import type { AdminActivity, AdminStudent } from '../../fixtures/types.ts'
import { deliverActivityFeedback, errorMessageOf } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { studentActivityView } from '../../read-model/studentProjection.ts'
import { formatDateTime, formatWaiting, hoursSince } from '../../read-model/time.ts'
import { ReviewTopBar, type ReviewNavigation } from './ReviewTopBar.tsx'
import styles from './ReviewPage.module.css'

/*
 * Activity Feedback Review (POST /api/admin/activities/{activityId}/feedback)
 * Task 3-column을 그대로 쓰지 않는다: LEFT 활동 기록(기본 · 과정 · 기여 · 결과 · 과정 자료 · Reflection 상태) / RIGHT Staff Feedback 4항목.
 * - 학생이 쓴 활동 기록 · Reflection은 원문 그대로 읽기만 한다. (Admin / AI가 대신 쓰지 않는다)
 * - 전달하면 Activity 상태가 피드백 대기 → 피드백 도착으로 바뀐다. (§31-1 State Change)
 * - 4항목 중 하나 이상은 있어야 전달할 수 있다. (빈 피드백 전달 방지 · UI 규칙, Contract에 필수 여부 없음 → Gap)
 */

interface ActivityFeedbackPageProps {
  state: AdminState
  activity: AdminActivity
  student: AdminStudent
  navigation: ReviewNavigation
  onBack: () => void
  onGo: (feedbackId: string) => void
  onOpenStudent: (studentId: string) => void
}

const feedbackFields = [
  { key: 'strength', label: '잘 드러난 점' },
  { key: 'needsDetail', label: '조금 더 구체화할 점' },
  { key: 'question', label: '생각해볼 질문' },
  { key: 'nextSuggestion', label: '다음 활동 제안' },
] as const

type FeedbackKey = (typeof feedbackFields)[number]['key']

const shown = (value: string) => (value.trim() ? value : '작성하지 않았어요.')

export function ActivityFeedbackPage({ state, activity, student, navigation, onBack, onGo, onOpenStudent }: ActivityFeedbackPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [values, setValues] = useState<Record<FeedbackKey, string>>({ strength: '', needsDetail: '', question: '', nextSuggestion: '' })
  const [parentCandidate, setParentCandidate] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const waiting = activity.status === 'feedback-waiting'
  const empty = !Object.values(values).some((value) => value.trim())
  const projection = studentActivityView(state, activity.activityId)

  const submit = async () => {
    if (pending || empty) return
    setPending(true)
    setError(null)
    try {
      await deliverActivityFeedback(activity.activityId, { ...values, parentReportCandidate: parentCandidate })
      setDone(true)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <ReviewTopBar navigation={navigation} status="성장활동 피드백" onBack={onBack} onGo={onGo} />
      <div className={styles.split}>
        <section className={styles.viewer} aria-labelledby="activity-title">
          <p className={styles.eyebrow}>
            <button type="button" className={ui.linkButton} onClick={() => onOpenStudent(student.studentId)}>
              {student.displayName}
              <span className="lh-visually-hidden"> Student 360 보기</span>
            </button>{' '}
            · {student.grade} · {activityTypeLabel[activity.type]}
          </p>
          <h1 id="activity-title" ref={headingRef} tabIndex={-1} className={styles.title}>
            {activity.title}
          </h1>
          <p className={ui.muted}>
            {activityStatusLabel[activity.status]}
            {activity.feedbackRequestedAt ? ` · ${formatDateTime(activity.feedbackRequestedAt)} 피드백 요청${waiting ? ` · ${formatWaiting(hoursSince(activity.feedbackRequestedAt))} 대기` : ''}` : ''}
          </p>
          <ActivityInspector activity={activity} showFeedback={false} />
        </section>

        <section className={styles.staff} aria-labelledby="activity-staff-title">
          <h2 id="activity-staff-title" className={ui.subTitle}>
            Staff Feedback
          </h2>
          {activity.feedback ? (
            <div className={ui.list}>
              {done && (
                <p className={ui.success} role="status">
                  학생에게 피드백을 전달했어요.
                </p>
              )}
              <p className={ui.muted}>
                {activity.feedback.author} · {formatDateTime(activity.feedback.deliveredAt)} 전달
                {activity.feedback.parentReportCandidate ? ' · Parent Report 공개 후보' : ''}
              </p>
              <dl className={styles.qa}>
                {feedbackFields.map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>{shown(activity.feedback![field.key])}</dd>
                  </div>
                ))}
              </dl>
              {projection && (
                <div className={ui.note}>
                  <p className={ui.fieldLabel}>학생 화면 반영</p>
                  <p>
                    <Badge tone="accent">{activityStatusLabel[projection.status]}</Badge> 선생님 피드백 4항목이 활동 상세에 보여요.
                  </p>
                </div>
              )}
              {navigation.nextId && (
                <button type="button" className={ui.primaryButton} onClick={() => onGo(navigation.nextId!)}>
                  다음 검토로
                </button>
              )}
            </div>
          ) : !waiting ? (
            <p className={ui.note}>학생이 피드백을 요청한 활동이 아니에요.</p>
          ) : (
            <form
              className={ui.list}
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              {feedbackFields.map((field) => (
                <label key={field.key} className={ui.field}>
                  <span className={ui.fieldLabel}>{field.label}</span>
                  <textarea
                    className={ui.textarea}
                    rows={3}
                    maxLength={300}
                    value={values[field.key]}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </label>
              ))}
              <label className={ui.check}>
                <input type="checkbox" checked={parentCandidate} onChange={(event) => setParentCandidate(event.target.checked)} />
                <span>
                  Parent Report 공개 후보로 표시
                  <span className={ui.cellSub}>후보 표시만 해요. 학부모에게 보일 문장은 Parent Progress에서 따로 작성해요.</span>
                </span>
              </label>
              {empty && <p className={ui.cellSub}>네 항목 중 하나 이상 입력하면 전달할 수 있어요.</p>}
              {error && (
                <p className={ui.errorText} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className={ui.primaryButton} disabled={empty || pending} aria-busy={pending}>
                {pending ? '전달하는 중…' : '학생에게 전달'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
