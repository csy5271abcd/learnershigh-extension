import { useId, useState, type FormEvent } from 'react'
import type { ApiError } from '../api/apiClient.ts'
import { addDays, monthDay } from '../model/format.ts'
import type { PlanInput } from '../model/types.ts'
import { InlineError } from './StateMessage.tsx'

const RECHECK_OPTIONS = [3, 7, 14]

interface Props {
  asOf: string
  initial: { goal: string; action: string; loadLimit: string | null; recheckDate: string | null }
  submitLabel: string
  pending: boolean
  error: ApiError | null
  onSubmit: (plan: PlanInput) => void
  onCancel?: () => void
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** 약속 한 가지: 목표 · 행동 · 부담 한도 · 재점검일 · 학생 합의. 예시로 채워지고 선생님이 고친다. */
export function PlanForm({ asOf, initial, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const id = useId()
  const initialDays = initial.recheckDate ? daysBetween(asOf, initial.recheckDate) : 7
  const [goal, setGoal] = useState(initial.goal)
  const [action, setAction] = useState(initial.action)
  const [loadLimit, setLoadLimit] = useState(initial.loadLimit ?? '')
  const [recheckDays, setRecheckDays] = useState(RECHECK_OPTIONS.includes(initialDays) ? initialDays : 7)
  const [agreed, setAgreed] = useState(false)

  const filled = goal.trim().length > 0 && action.trim().length > 0
  const disabledReason = !filled ? '목표와 행동을 입력하세요' : !agreed ? '학생과 합의한 뒤 시작할 수 있습니다' : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (disabledReason || pending) return
    onSubmit({ goal, action, loadLimit, recheckDate: addDays(asOf, recheckDays), agreedWithStudent: agreed })
  }

  const fieldError = (field: string) => error?.fields.some((violation) => violation.field.endsWith(field))

  return (
    <form className="sc-plan" onSubmit={submit} aria-label="조정 약속">
      <div className="sc-field">
        <label htmlFor={`${id}-goal`}>목표 한 가지</label>
        <input
          id={`${id}-goal`}
          value={goal}
          maxLength={200}
          onChange={(event) => setGoal(event.target.value)}
          aria-invalid={fieldError('goal')}
        />
      </div>
      <div className="sc-field">
        <label htmlFor={`${id}-action`}>행동</label>
        <input id={`${id}-action`} value={action} maxLength={200} onChange={(event) => setAction(event.target.value)} />
      </div>
      <div className="sc-plan__row">
        <div className="sc-field">
          <label htmlFor={`${id}-load`}>부담 한도</label>
          <input
            id={`${id}-load`}
            value={loadLimit}
            maxLength={100}
            placeholder="예: 주 2시간 추가까지"
            onChange={(event) => setLoadLimit(event.target.value)}
          />
        </div>
        <div className="sc-field">
          <label htmlFor={`${id}-recheck`}>재점검일</label>
          <select
            id={`${id}-recheck`}
            value={recheckDays}
            onChange={(event) => setRecheckDays(Number(event.target.value))}
          >
            {RECHECK_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {monthDay(addDays(asOf, days))} ({days}일 뒤)
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="sc-check">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        학생과 합의함
      </label>
      <InlineError error={error} />
      <div className="sc-actions">
        <button
          type="submit"
          className="sc-button sc-button--primary"
          disabled={disabledReason !== null || pending}
          aria-describedby={disabledReason ? `${id}-disabled` : undefined}
        >
          {pending ? '저장 중…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="sc-button sc-button--ghost" onClick={onCancel} disabled={pending}>
            취소
          </button>
        )}
        {disabledReason && (
          <span id={`${id}-disabled`} className="sc-hint">
            {disabledReason}
          </span>
        )}
      </div>
    </form>
  )
}
