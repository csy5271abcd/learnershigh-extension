import { useRef, useState } from 'react'
import { ApiError } from '../../api/apiError.ts'
import { permanentDeleteSchoolAssessment } from '../../api/assessmentDetailApi.ts'
import { Modal } from '../Modal.tsx'
import styles from '../AddSchoolAssessmentModal.module.css'

// A28-49 수행평가 영구 삭제(§12-1). 휴지통 이동(복원 가능)과 구분되는 되돌릴 수 없는 삭제라 제목을 그대로 적어야 누를 수 있다.
// 서버가 기록 보존을 위해 막는 경우(학교 확정 항목·피드백 요청·성장 기록 연결)는 이유를 보이고 휴지통 이동을 안내한다.

const blockedText: Record<string, string> = {
  official: '학교 확정에서 자동으로 등록된 항목이라 삭제할 수 없어요. 목록에서 치우려면 휴지통으로 이동해 주세요.',
  feedbackRequests: '선생님께 보낸 피드백 요청 기록이 있어 삭제할 수 없어요(선생님 기록 보존). 휴지통으로 이동은 할 수 있어요.',
  growthRecords: '이 수행평가를 연결한 성장 기록이 있어 삭제할 수 없어요. 성장 기록의 연결을 바꾸거나 휴지통으로 이동해 주세요.',
}

export function DeleteSchoolAssessmentModal({ assessmentId, title, onClose, onDeleted }: { assessmentId: string; title: string; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const pendingRef = useRef(false)
  const matches = typed.trim() === title.trim()

  const submit = () => {
    if (!matches || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(undefined)
    permanentDeleteSchoolAssessment(assessmentId, typed).then(
      () => {
        pendingRef.current = false
        onDeleted()
      },
      (cause: unknown) => {
        pendingRef.current = false
        setPending(false)
        if (cause instanceof ApiError) {
          const reason = Object.keys(cause.fieldReasons()).find((field) => blockedText[field])
          setError(reason ? blockedText[reason] : cause.message)
        } else setError(cause instanceof Error ? cause.message : '삭제하지 못했어요.')
      },
    )
  }

  return (
    <Modal
      title="수행평가를 삭제할까요?"
      description="되돌릴 수 없는 삭제"
      compact
      onRequestClose={() => !pending && onClose()}
      footer={
        <>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={pending}>
            취소
          </button>
          <button type="button" className={styles.dangerButton} onClick={submit} disabled={!matches || pending} aria-busy={pending} data-testid="delete-assessment-confirm">
            {pending ? '삭제하는 중…' : '영구 삭제'}
          </button>
        </>
      }
    >
      <p className={styles.hint} data-testid="delete-assessment-warning">
        &lsquo;{title}&rsquo;의 탐구 노트·수정 이력·결과물 파일·안내문 첨부가 모두 지워지고 <strong>되돌릴 수 없어요</strong>. 나중에 다시 볼 수도 있다면 &lsquo;휴지통으로 이동&rsquo;을 쓰세요.
      </p>
      <label className={styles.field}>
        <span className={styles.label}>확인을 위해 수행평가 제목을 그대로 입력</span>
        <input className={styles.input} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={title} data-testid="delete-assessment-title" autoFocus />
      </label>
      {error && (
        <p className={styles.hint} role="alert" style={{ color: 'var(--as-color-danger, #d92d20)' }} data-testid="delete-assessment-error">
          {error}
        </p>
      )}
    </Modal>
  )
}
