import { useState } from 'react'
import { ConfirmDialog } from '../../components/AdminUi.tsx'
import ui from '../../components/AdminUi.module.css'
import type { AdminStudent, MentorCaseRef } from '../../fixtures/types.ts'
import { errorMessageOf, recommendMentorCase } from '../../store/adminCommands.ts'

/*
 * Mentor Case 추천 Dialog (Case 목록 · Case 상세가 같이 쓴다. 추천 Command는 recommendMentorCase 하나)
 * 추천하면 Task.relatedMentorCaseIds와 학생 Mentor Hub "선생님 추천 Case"가 함께 바뀐다.
 * 추천 이유는 학생 Mentor Hub에 그대로 보이는 문장이라 비워 두고 추천할 수 없다. (UI 규칙, Contract 필수 여부 없음 → Gap)
 * 학생 정보는 Admin 내부 추천 Context다. Mentor에게 전달되지 않는다.
 */
export function RecommendCaseDialog({
  caseRef,
  student,
  target,
  onClose,
  onDone,
}: {
  caseRef: MentorCaseRef | null
  student: AdminStudent | null
  target: { taskId: string | null; activityId: string | null; label: string } | null
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    if (!caseRef || !student || !target || pending || !reason.trim()) return
    setPending(true)
    setError(null)
    try {
      await recommendMentorCase(student.studentId, { caseId: caseRef.contentId, taskId: target.taskId, activityId: target.activityId, reason })
      onDone(`"${caseRef.title}"을(를) 추천했어요. ${target.taskId ? 'Task의 Mentor Case 연결과 ' : ''}학생 Mentor Hub "선생님 추천 Case"에 함께 보여요.`)
      setReason('')
    } catch (caught) {
      setError(errorMessageOf(caught))
    } finally {
      setPending(false)
    }
  }
  return (
    <ConfirmDialog
      open={caseRef !== null}
      title="Mentor Case 추천"
      confirmLabel="추천하기"
      pending={pending}
      disabled={!reason.trim()}
      error={error}
      onConfirm={() => void submit()}
      onClose={() => {
        setError(null)
        onClose()
      }}
    >
      {caseRef && student && target && (
        <>
          <p>
            <strong>{caseRef.title}</strong> ({caseRef.mentorName})을(를) {student.displayName}의 "{target.label}"에 추천해요.
          </p>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>추천 이유 (학생 Mentor Hub에 보여요)</span>
            <textarea className={ui.textarea} rows={3} maxLength={200} value={reason} aria-invalid={!reason.trim()} onChange={(event) => setReason(event.target.value)} placeholder="예: 지금 수행평가와 같은 주제로 자료 조사부터 발표까지 진행한 과정을 볼 수 있어요." />
            <span className={ui.counter}>{reason.length}/200</span>
          </label>
          {!reason.trim() && <p className={ui.cellSub}>추천 이유를 입력하면 추천할 수 있어요.</p>}
        </>
      )}
    </ConfirmDialog>
  )
}
