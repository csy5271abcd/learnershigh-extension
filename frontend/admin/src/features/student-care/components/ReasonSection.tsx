import { useId, useRef, useState } from 'react'
import type { ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { fieldMessage, formLevelError, invalidProps } from '../model/fieldErrors.ts'
import { REASON_LABEL } from '../model/format.ts'
import type { CareCase, CareReason, PlanFields, PlanSuggestion } from '../model/types.ts'
import { useCaseCommand } from '../model/useCaseCommand.ts'
import { useErrorFocus } from '../model/useFocus.ts'
import { PlanForm } from './PlanForm.tsx'
import { FieldError, InlineError, LockHint } from './StateMessage.tsx'

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
  /** 상세 데이터의 revision. 저장 뒤 새 데이터가 오기 전까지 다시 제출하지 않는다. */
  revision: number
  /** 상세를 다시 불러오지 못해 지금 보이는 내용이 오래된 값인지. */
  stale: boolean
  onSaved: (careCase: CareCase) => void
  onStale: (error: ApiError) => void
  onRetryLatest: () => void
}

/** 사유 확인: 예상된 변화 / 기록 문제 / 조정 필요. 결정은 선생님이 한다. */
export function ReasonSection({
  branchId,
  studentId,
  asOf,
  suggestion,
  revision,
  stale,
  onSaved,
  onStale,
  onRetryLatest,
}: Props) {
  const id = useId()
  const sectionRef = useRef<HTMLElement>(null)
  const [reason, setReason] = useState<CareReason | null>(null)
  const [memo, setMemo] = useState('')
  const command = useCaseCommand(revision, onStale)
  useErrorFocus(command.error, sectionRef)

  const save = (plan?: PlanFields, recheckDate?: string) => {
    if (!reason) return
    void command.run(
      () =>
        studentCareApi.openCase({
          branchId,
          studentId,
          reason,
          memo: memo.trim() || undefined,
          plan: plan && recheckDate ? { ...plan, recheckDate } : undefined,
        }),
      (careCase) => {
        // 같은 내용을 다시 보낼 수 없게 고른 사유 / 메모를 비운다 (쉬는 기간 0일이면 학생이 목록에 남는다).
        setReason(null)
        setMemo('')
        onSaved(careCase)
      },
    )
  }

  const memoError = fieldMessage(command.error, ['memo'], '사유 메모는 1000자 이내로 입력하세요.')

  return (
    <section ref={sectionRef} className="sc-section" aria-labelledby={`${id}-title`}>
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
            aria-disabled={command.busy || undefined}
            onClick={() => {
              if (command.busy) return
              setReason(option.reason)
              command.clearError()
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
            readOnly={command.pending}
            placeholder="학생이 말한 사정이나 확인한 내용"
            onChange={(event) => setMemo(event.target.value)}
            {...invalidProps(`${id}-memo-error`, memoError)}
          />
          <FieldError id={`${id}-memo-error`} message={memoError} />
        </div>
      )}

      {reason && reason !== 'ADJUSTMENT_NEEDED' && (
        <>
          <InlineError error={formLevelError(command.error, [memoError])} />
          <div className="sc-actions">
            <button
              type="button"
              className="sc-button sc-button--primary"
              aria-disabled={command.busy || undefined}
              onClick={() => save()}
            >
              {command.pending ? '저장 중…' : '기록하고 종결'}
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
          pending={command.pending}
          locked={command.locked}
          error={command.error}
          extraFieldMessages={[memoError]}
          onSubmit={(plan, recheckDate) => save(plan, recheckDate)}
        />
      )}

      {command.locked && <LockHint stale={stale} onRetry={onRetryLatest} />}
    </section>
  )
}
