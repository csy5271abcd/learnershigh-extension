import { useState } from 'react'
import { ModalDialog } from '../../components/AdminUi.tsx'
import { activityStatusLabel } from '../../fixtures/adminActivities.fixture.ts'
import ui from '../../components/AdminUi.module.css'
import { AdminIcon } from '../../components/AdminIcons.tsx'
import { draftMentorContentRecommendation, errorMessageOf } from '../../store/adminCommands.ts'
import type { AdminState } from '../../store/adminStore.ts'
import { isActiveTask } from '../../read-model/studentInsights.ts'
import { mentorContentTypeLabel, type MentorContentItem } from '../../read-model/mentorContent.ts'
import styles from './StudentManagement.module.css'

/*
 * Plan · Routine · Story · Record 추천 기록 Dialog (Case 추천은 RecommendCaseDialog)
 * - Admin 추천 Mutation API가 Contract에 없다. (Gap: MENTOR-CONTENT-RECOMMENDATION-API)
 *   그래서 Admin 화면 안의 임시 기록만 남긴다. 학생 Mentor Hub에는 반영하지 않는다. (성공처럼 보이지 않게 문구로 구분)
 * - 학생 정보는 Admin 내부 추천 Context다. Mentor에게 전달되지 않는다.
 */

export const CONTENT_RECOMMENDATION_BOUNDARY = 'Plan · Routine · Story · Record 추천 API가 아직 없어 Admin 화면에만 임시로 기록해요. 학생 Mentor Hub에는 보이지 않아요.'

export function RecommendContentDialog({
  state,
  item,
  initialStudentId,
  initialTarget,
  onClose,
  onDone,
}: {
  state: AdminState
  item: Exclude<MentorContentItem, { type: 'case' }> | null
  initialStudentId: string | null
  /** 't:<taskId>' | 'a:<activityId>' */
  initialTarget: string | null
  onClose: () => void
  onDone: (message: string) => void
}) {
  return (
    <ModalDialog open={item !== null} title={item ? `Mentor ${mentorContentTypeLabel[item.type]} 추천 기록` : ''} onClose={onClose}>
      {item && <ContentForm key={item.contentId} state={state} item={item} initialStudentId={initialStudentId} initialTarget={initialTarget} onClose={onClose} onDone={onDone} />}
    </ModalDialog>
  )
}

function ContentForm({
  state,
  item,
  initialStudentId,
  initialTarget,
  onClose,
  onDone,
}: {
  state: AdminState
  item: Exclude<MentorContentItem, { type: 'case' }>
  initialStudentId: string | null
  initialTarget: string | null
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [studentId, setStudentId] = useState(initialStudentId ?? '')
  const [target, setTarget] = useState(initialTarget ?? '')
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const student = state.students.find((entry) => entry.studentId === studentId) ?? null
  const tasks = student ? state.tasks.filter((entry) => entry.studentId === student.studentId && isActiveTask(entry)) : []
  const activities = student ? state.activities.filter((entry) => entry.studentId === student.studentId) : []
  const targetTask = target.startsWith('t:') ? (tasks.find((entry) => entry.taskId === target.slice(2)) ?? null) : null
  const targetActivity = target.startsWith('a:') ? (activities.find((entry) => entry.activityId === target.slice(2)) ?? null) : null
  const invalid = !student || !reason.trim()

  const submit = async () => {
    if (pending || invalid || !student) return
    setPending(true)
    setError(null)
    try {
      await draftMentorContentRecommendation(student.studentId, { contentId: item.contentId, taskId: targetTask?.taskId ?? null, activityId: targetActivity?.activityId ?? null, reason })
      onDone(`"${item.title}" 추천을 Admin 기록으로 남겼어요. 학생 Mentor Hub에는 아직 보이지 않아요. (추천 API 확정 전)`)
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
      <p className={styles.boundaryNote}>
        <AdminIcon name="alert" size={14} />
        {CONTENT_RECOMMENDATION_BOUNDARY}
      </p>
      <p>
        <strong>{item.title}</strong>
      </p>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>학생</span>
        <select
          className={ui.select}
          value={studentId}
          onChange={(event) => {
            setStudentId(event.target.value)
            setTarget('')
          }}
        >
          <option value="">학생 선택</option>
          {state.students.map((entry) => (
            <option key={entry.studentId} value={entry.studentId}>
              {entry.displayName} · {entry.grade}
            </option>
          ))}
        </select>
      </label>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>연결할 수행평가 · 활동 (선택)</span>
        <select className={ui.select} value={target} disabled={!student} onChange={(event) => setTarget(event.target.value)}>
          <option value="">연결하지 않음</option>
          {tasks.length > 0 && (
            <optgroup label="진행 중 수행평가">
              {tasks.map((entry) => (
                <option key={entry.taskId} value={`t:${entry.taskId}`}>
                  {entry.subject} · {entry.title}
                </option>
              ))}
            </optgroup>
          )}
          {activities.length > 0 && (
            <optgroup label="성장활동">
              {activities.map((entry) => (
                <option key={entry.activityId} value={`a:${entry.activityId}`}>
                  {entry.title}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {student && (
        <dl className={styles.outreachContext} aria-label="추천 Context (Admin 내부)">
          <div>
            <dt>관심 분야</dt>
            <dd>{student.interestField ?? '기록 없음'}</dd>
          </div>
          <div>
            <dt>희망 전공</dt>
            <dd>{student.desiredMajor ?? '기록 없음'}</dd>
          </div>
          {targetTask && (
            <div>
              <dt>과목 · 단계</dt>
              <dd>
                {targetTask.subject} · {targetTask.currentStage}/8 {targetTask.stageStatus}
              </dd>
            </div>
          )}
          {targetActivity && (
            <div>
              <dt>활동 상태</dt>
              <dd>{activityStatusLabel[targetActivity.status]}</dd>
            </div>
          )}
        </dl>
      )}
      <label className={ui.field}>
        <span className={ui.fieldLabel}>추천 이유 (Admin 내부 기록)</span>
        <textarea className={ui.textarea} rows={3} maxLength={200} value={reason} aria-invalid={!reason.trim()} onChange={(event) => setReason(event.target.value)} />
        <span className={ui.counter}>{reason.length}/200</span>
      </label>
      {invalid && <p className={ui.cellSub}>학생과 추천 이유를 입력하면 기록할 수 있어요.</p>}
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
          {pending ? '기록하는 중…' : 'Admin 추천 기록 남기기'}
        </button>
      </div>
    </form>
  )
}
