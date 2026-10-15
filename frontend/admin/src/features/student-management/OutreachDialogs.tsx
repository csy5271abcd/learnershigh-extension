import { useState } from 'react'
import { ModalDialog } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import { ADMIN_SNAPSHOT_AT } from '../../fixtures/snapshot.ts'
import { errorMessageOf, OUTREACH_MESSAGE_MAX, prepareStudentOutreach } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { daysUntil, formatDday, formatPercent } from '../../read-model/time.ts'
import type { StudentInsight } from '../../read-model/studentInsights.ts'
import styles from './StudentManagement.module.css'

/*
 * Today Board 메시지 · 리마인더 (student-management.md Today Board Quick Action)
 * - 기존 LearnersHigh "문자관리" 메뉴는 기존 Admin 소관이고 연결 API · 화면 Reference가 없다. 재사용할 수 있는 Message / Notification API도 없다.
 * - Delivery Provider / API가 정해지지 않았다. (Gap: MESSAGE-REMINDER-DELIVERY) 이 Dialog는 발송 요청만 준비한다.
 *   실제 학생 알림 전송 · 전송 완료 상태를 만들지 않는다.
 * - Template 문장은 Admin이 고치는 초안이다. AI가 만들지 않는다.
 */

export const OUTREACH_PROVIDER_NOTICE = '실제 학생 알림 전송은 Delivery Provider 연결 후 사용할 수 있어요.'

type MessageTemplateId = 'deadline' | 'feedback' | 'plan'

interface MessageTemplate {
  id: MessageTemplateId
  label: string
  text: string | null
  /** 쓸 수 없으면 이유 */
  reason?: string
}

function templatesFor(state: AdminState, row: StudentInsight): MessageTemplate[] {
  const name = row.student.displayName
  const task = row.primaryTask
  const days = task ? daysUntil(task.deadlineDate) : null
  // 실제로 전달된 선생님 피드백이 있을 때만 "피드백 확인" Template을 쓴다.
  const delivered = state.reviews.some((review) => review.delivery !== null && row.tasks.some((task) => task.taskId === review.taskId))
  return [
    {
      id: 'deadline',
      label: '수행평가 마감 안내',
      text: task && days !== null ? `${name} 학생, ${task.subject} 수행평가 "${task.title}" 마감이 ${days < 0 ? '지났어요' : formatDday(days)}${days < 0 ? '' : '예요'}. 남은 단계를 확인해 주세요.` : null,
      reason: '진행 중인 수행평가가 없어요.',
    },
    {
      id: 'feedback',
      label: '피드백 확인',
      text: delivered ? `${name} 학생, 수행평가 화면에서 선생님 피드백과 다음 할 일을 확인해 주세요.` : null,
      reason: '아직 전달된 선생님 피드백이 없어요.',
    },
    {
      id: 'plan',
      label: '학습 계획 확인',
      text: row.study ? `${name} 학생, 최근 7일 Plan 실행률이 ${formatPercent(row.study.recent7DayPlanRate)}예요. 이번 주 학습 계획을 다시 확인해 주세요.` : null,
      reason: '기존 Plan 기록이 없어요.',
    },
  ]
}

function PreparedNotice({ kind, onClose }: { kind: 'message' | 'reminder'; onClose: () => void }) {
  return (
    <div className={ui.list}>
      <div className={styles.preparedNotice} role="status">
        <div>
          <p className={ui.cellMain}>{kind === 'message' ? '발송 요청을 준비했어요.' : '리마인더 요청을 준비했어요.'}</p>
          <p>{OUTREACH_PROVIDER_NOTICE}</p>
          <p className={ui.cellSub}>아직 학생에게 전송되지 않았어요. 준비한 요청은 이 화면 Session에만 남아요.</p>
        </div>
      </div>
      <div className={ui.dialogActions}>
        <button type="button" className={ui.primaryButton} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}

function ContextBlock({ row }: { row: StudentInsight }) {
  const task = row.primaryTask
  return (
    <dl className={styles.outreachContext}>
      <div>
        <dt>학생</dt>
        <dd>
          {row.student.displayName} · {row.student.grade}
        </dd>
      </div>
      <div>
        <dt>Context</dt>
        <dd>{row.points[0]?.label ?? (task ? `${task.subject} · ${task.title}` : '현재 특이사항 없음')}</dd>
      </div>
    </dl>
  )
}

export function MessageDialog({ state, row, onClose }: { state: AdminState; row: StudentInsight | null; onClose: () => void }) {
  return (
    <ModalDialog open={row !== null} title="학생에게 메시지" onClose={onClose}>
      {row && <MessageForm key={row.student.studentId} state={state} row={row} onClose={onClose} />}
    </ModalDialog>
  )
}

function MessageForm({ state, row, onClose }: { state: AdminState; row: StudentInsight; onClose: () => void }) {
  const [body, setBody] = useState('')
  const [template, setTemplate] = useState<MessageTemplateId | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const templates = templatesFor(state, row)
  if (done) return <PreparedNotice kind="message" onClose={onClose} />
  const submit = async () => {
    if (pending || !body.trim()) return
    setPending(true)
    setError(null)
    try {
      await prepareStudentOutreach(row.student.studentId, { kind: 'message', taskId: null, activityId: null, title: null, body, scheduledAt: null, template: templates.find((item) => item.id === template)?.label ?? null })
      setDone(true)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className={ui.list}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <ContextBlock row={row} />
      <div className={ui.field} role="group" aria-label="메시지 Template (선택)">
        <span className={ui.fieldLabel}>Template (선택)</span>
        <div className={styles.templateRow}>
          {templates.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.templateChip}
              aria-pressed={template === item.id}
              disabled={!item.text}
              title={!item.text ? item.reason : undefined}
              onClick={() => {
                setTemplate(item.id)
                setBody(item.text ?? '')
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>메시지 본문</span>
        <textarea className={ui.textarea} rows={5} maxLength={OUTREACH_MESSAGE_MAX} value={body} aria-invalid={!body.trim()} onChange={(event) => setBody(event.target.value)} placeholder="학생에게 보낼 내용을 입력하세요." />
        <span className={ui.counter} aria-live="polite">
          {body.length}/{OUTREACH_MESSAGE_MAX}자
        </span>
      </label>
      <p className={ui.note}>
        Delivery Provider가 아직 연결되지 않아 발송 요청만 준비돼요. {OUTREACH_PROVIDER_NOTICE}
      </p>
      {error && (
        <p className={ui.errorText} role="alert">
          {error}
        </p>
      )}
      <div className={ui.dialogActions}>
        <button type="button" className={ui.secondaryButton} onClick={onClose} disabled={pending}>
          취소
        </button>
        <button type="submit" className={ui.primaryButton} disabled={pending || !body.trim()} aria-busy={pending}>
          {pending ? '준비하는 중…' : '발송 요청 준비'}
        </button>
      </div>
    </form>
  )
}

/** 'YYYY-MM-DDTHH:mm' (datetime-local 값, KST) */
const snapshotLocal = ADMIN_SNAPSHOT_AT.slice(0, 16)

export function ReminderDialog({ state, row, onClose }: { state: AdminState; row: StudentInsight | null; onClose: () => void }) {
  return (
    <ModalDialog open={row !== null} title="학생 리마인더" onClose={onClose}>
      {row && <ReminderForm key={row.student.studentId} state={state} row={row} onClose={onClose} />}
    </ModalDialog>
  )
}

function ReminderForm({ state, row, onClose }: { state: AdminState; row: StudentInsight; onClose: () => void }) {
  const [target, setTarget] = useState(row.primaryTask ? `t:${row.primaryTask.taskId}` : '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const activities = state.activities.filter((item) => item.studentId === row.student.studentId && item.status !== 'archived')
  if (done) return <PreparedNotice kind="reminder" onClose={onClose} />
  const scheduleInvalid = scheduledAt !== '' && scheduledAt <= snapshotLocal
  const invalid = !title.trim() || !body.trim() || !scheduledAt || scheduleInvalid
  const submit = async () => {
    if (pending || invalid) return
    setPending(true)
    setError(null)
    try {
      await prepareStudentOutreach(row.student.studentId, {
        kind: 'reminder',
        taskId: target.startsWith('t:') ? target.slice(2) : null,
        activityId: target.startsWith('a:') ? target.slice(2) : null,
        title,
        body,
        scheduledAt,
        template: null,
      })
      setDone(true)
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className={ui.list}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <ContextBlock row={row} />
      <label className={ui.field}>
        <span className={ui.fieldLabel}>관련 수행평가 · 활동 (선택)</span>
        <select className={ui.select} value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">연결하지 않음</option>
          {row.activeTasks.length > 0 && (
            <optgroup label="진행 중 수행평가">
              {row.activeTasks.map((item) => (
                <option key={item.taskId} value={`t:${item.taskId}`}>
                  {item.subject} · {item.title}
                </option>
              ))}
            </optgroup>
          )}
          {activities.length > 0 && (
            <optgroup label="성장활동">
              {activities.map((item) => (
                <option key={item.activityId} value={`a:${item.activityId}`}>
                  {item.title}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>제목</span>
        <input className={ui.input} maxLength={40} value={title} aria-invalid={!title.trim()} onChange={(event) => setTitle(event.target.value)} placeholder="예: 수행평가 초안 제출 확인" />
      </label>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>내용</span>
        <textarea className={ui.textarea} rows={4} maxLength={OUTREACH_MESSAGE_MAX} value={body} aria-invalid={!body.trim()} onChange={(event) => setBody(event.target.value)} />
        <span className={ui.counter}>
          {body.length}/{OUTREACH_MESSAGE_MAX}자
        </span>
      </label>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>전달 예정 시각</span>
        <input type="datetime-local" className={ui.input} min={snapshotLocal} value={scheduledAt} aria-invalid={!scheduledAt || scheduleInvalid} aria-describedby="reminder-schedule-hint" onChange={(event) => setScheduledAt(event.target.value)} />
        <span id="reminder-schedule-hint" className={scheduleInvalid ? ui.errorText : ui.cellSub}>
          {scheduleInvalid ? '전달 예정 시각은 지금 이후로 골라주세요.' : '기준 시각 10월 6일 11:00 이후로 고를 수 있어요.'}
        </span>
      </label>
      <p className={ui.note}>
        리마인더 예약 · 전송은 Delivery Provider 연결 전이라 요청만 준비돼요. {OUTREACH_PROVIDER_NOTICE}
      </p>
      {error && (
        <p className={ui.errorText} role="alert">
          {error}
        </p>
      )}
      <div className={ui.dialogActions}>
        <button type="button" className={ui.secondaryButton} onClick={onClose} disabled={pending}>
          취소
        </button>
        <button type="submit" className={ui.primaryButton} disabled={pending || invalid} aria-busy={pending}>
          {pending ? '준비하는 중…' : '리마인더 요청 준비'}
        </button>
      </div>
    </form>
  )
}
