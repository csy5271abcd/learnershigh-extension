import { useId, useState } from 'react'
import { ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { REASON_LABEL } from '../model/format.ts'
import type { CareCase, CareReason, PlanInput, PlanSuggestion } from '../model/types.ts'
import { PlanForm } from './PlanForm.tsx'
import { InlineError } from './StateMessage.tsx'

const REASONS: { reason: CareReason; description: string }[] = [
  { reason: 'EXPECTED_CHANGE', description: '시험 뒤 휴식, 시간표 변경 등. 기록만 남기고 종결' },
  { reason: 'RECORD_ISSUE', description: '타이머 누락, 기기 문제. 기록 확인으로 넘김' },
  { reason: 'ADJUSTMENT_NEEDED', description: '학생과 약속 한 가지를 정하고 재점검일을 잡음' },
]

interface Props {
  branchId: string
  studentId: string
  asOf: string
  suggestion: PlanSuggestion | null
  onSaved: (careCase: CareCase) => void
}

/** 사유 확인: 예상된 변화 / 기록 문제 / 조정 필요. 결정은 선생님이 한다. */
export function ReasonSection({ branchId, studentId, asOf, suggestion, onSaved }: Props) {
  const id = useId()
  const [reason, setReason] = useState<CareReason | null>(null)
  const [memo, setMemo] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const save = async (plan?: PlanInput) => {
    if (!reason || pending) return
    setPending(true)
    setError(null)
    try {
      const careCase = await studentCareApi.openCase({
        branchId,
        studentId,
        reason,
        memo: memo.trim() || undefined,
        plan,
      })
      onSaved(careCase)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN_ERROR', String(caught), []))
      setPending(false)
    }
  }

  return (
    <section className="sc-section" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="sc-section__title">
        사유 확인 <span className="sc-section__hint">학생에게 묻거나 알고 있는 사정을 고릅니다</span>
      </h3>
      <div className="sc-reasons" role="group" aria-label="사유">
        {REASONS.map((option) => (
          <button
            key={option.reason}
            type="button"
            className="sc-reason"
            aria-pressed={reason === option.reason}
            onClick={() => {
              setReason(option.reason)
              setError(null)
            }}
          >
            <span className="sc-reason__label">{REASON_LABEL[option.reason]}</span>
            <span className="sc-reason__description">{option.description}</span>
          </button>
        ))}
      </div>

      {reason && (
        <div className="sc-field">
          <label htmlFor={`${id}-memo`}>사유 메모 (선택)</label>
          <textarea
            id={`${id}-memo`}
            rows={2}
            maxLength={1000}
            value={memo}
            placeholder="학생이 말한 사정이나 확인한 내용"
            onChange={(event) => setMemo(event.target.value)}
          />
        </div>
      )}

      {reason && reason !== 'ADJUSTMENT_NEEDED' && (
        <>
          <InlineError error={error} />
          <div className="sc-actions">
            <button type="button" className="sc-button sc-button--primary" disabled={pending} onClick={() => save()}>
              {pending ? '저장 중…' : '기록하고 종결'}
            </button>
          </div>
        </>
      )}

      {reason === 'ADJUSTMENT_NEEDED' && (
        <PlanForm
          asOf={asOf}
          initial={{
            goal: suggestion?.goal ?? '',
            action: suggestion?.action ?? '',
            loadLimit: suggestion?.loadLimit ?? null,
            recheckDate: suggestion?.recheckDate ?? null,
          }}
          submitLabel="조정 시작"
          pending={pending}
          error={error}
          onSubmit={(plan) => save(plan)}
        />
      )}
    </section>
  )
}
