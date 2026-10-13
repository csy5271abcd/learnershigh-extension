import { useId, useState, type FormEvent } from 'react'
import type { ApiError } from '../api/apiClient.ts'
import { fieldMessage, formLevelError, invalidProps } from '../model/fieldErrors.ts'
import { addDays, daysBetween, DEFAULT_RECHECK_DAYS, monthDay, RECHECK_DAY_CHOICES } from '../model/format.ts'
import type { PlanFields } from '../model/types.ts'
import { FieldError, InlineError } from './StateMessage.tsx'

interface Props {
  /** 가장 최근에 불러온 기준일. 재점검일은 제출 시점에 이 값으로 계산한다. */
  asOf: string
  initial: { goal: string; action: string; loadLimit: string | null; recheckDate: string | null }
  submitLabel: string
  pending: boolean
  /** 저장은 끝났고 새 데이터를 기다리는 중이라 다시 제출하지 않는다. */
  locked?: boolean
  error: ApiError | null
  /** 이 폼 밖(예: 사유 메모)에서 이미 칸에 보여준 오류. 있으면 폼 아래에 같은 오류를 다시 쓰지 않는다. */
  extraFieldMessages?: (string | null)[]
  onSubmit: (plan: PlanFields, recheckDate: string) => void
  onCancel?: () => void
}

/** 약속 한 가지: 목표 · 행동 · 부담 한도 · 재점검일 · 학생 합의. 예시로 채워지고 선생님이 고친다. */
export function PlanForm({
  asOf,
  initial,
  submitLabel,
  pending,
  locked = false,
  error,
  extraFieldMessages = [],
  onSubmit,
  onCancel,
}: Props) {
  const id = useId()
  const initialDays = initial.recheckDate ? daysBetween(asOf, initial.recheckDate) : DEFAULT_RECHECK_DAYS
  const [goal, setGoal] = useState(initial.goal)
  const [action, setAction] = useState(initial.action)
  const [loadLimit, setLoadLimit] = useState(initial.loadLimit ?? '')
  const [recheckDays, setRecheckDays] = useState(
    RECHECK_DAY_CHOICES.includes(initialDays) ? initialDays : DEFAULT_RECHECK_DAYS,
  )
  const [agreed, setAgreed] = useState(false)

  const filled = goal.trim().length > 0 && action.trim().length > 0
  const disabledReason = !filled ? '목표와 행동을 입력하세요' : !agreed ? '학생과 합의한 뒤 시작할 수 있습니다' : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (disabledReason || busy) return
    onSubmit({ goal, action, loadLimit, agreedWithStudent: agreed }, addDays(asOf, recheckDays))
  }

  const busy = pending || locked
  const errors = {
    goal: fieldMessage(error, ['plan.goal'], '목표는 1~200자로 입력하세요.'),
    action: fieldMessage(error, ['plan.action'], '행동은 1~200자로 입력하세요.'),
    loadLimit: fieldMessage(error, ['plan.loadLimit'], '부담 한도는 100자 이내로 입력하세요.'),
    recheck: fieldMessage(error, ['plan.recheckDate', 'recheckDate'], '재점검일을 다시 골라주세요.'),
    agreed: fieldMessage(error, ['plan.agreedWithStudent'], '학생과 합의한 뒤 시작할 수 있습니다.'),
  }

  return (
    <form className="sc-plan" onSubmit={submit} aria-label="조정 약속">
      <div className="sc-field">
        <label htmlFor={`${id}-goal`}>목표 한 가지</label>
        <input
          id={`${id}-goal`}
          value={goal}
          maxLength={200}
          onChange={(event) => setGoal(event.target.value)}
          {...invalidProps(`${id}-goal-error`, errors.goal)}
        />
        <FieldError id={`${id}-goal-error`} message={errors.goal} />
      </div>
      <div className="sc-field">
        <label htmlFor={`${id}-action`}>행동</label>
        <input
          id={`${id}-action`}
          value={action}
          maxLength={200}
          onChange={(event) => setAction(event.target.value)}
          {...invalidProps(`${id}-action-error`, errors.action)}
        />
        <FieldError id={`${id}-action-error`} message={errors.action} />
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
            {...invalidProps(`${id}-load-error`, errors.loadLimit)}
          />
          <FieldError id={`${id}-load-error`} message={errors.loadLimit} />
        </div>
        <div className="sc-field">
          <label htmlFor={`${id}-recheck`}>재점검일</label>
          <select
            id={`${id}-recheck`}
            value={recheckDays}
            onChange={(event) => setRecheckDays(Number(event.target.value))}
            {...invalidProps(`${id}-recheck-error`, errors.recheck)}
          >
            {RECHECK_DAY_CHOICES.map((days) => (
              <option key={days} value={days}>
                {monthDay(addDays(asOf, days))} ({days}일 뒤)
              </option>
            ))}
          </select>
          <FieldError id={`${id}-recheck-error`} message={errors.recheck} />
        </div>
      </div>
      <div className="sc-check-field">
        <label className="sc-check">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            {...invalidProps(`${id}-agreed-error`, errors.agreed)}
          />
          학생과 합의함
        </label>
        <FieldError id={`${id}-agreed-error`} message={errors.agreed} />
      </div>
      <InlineError error={formLevelError(error, [...Object.values(errors), ...extraFieldMessages])} />
      <div className="sc-actions">
        {/* 입력이 모자라면 disabled(이유를 옆에 적는다), 보내는 중에는 Focus를 잃지 않게 aria-disabled로만 막는다. */}
        <button
          type="submit"
          className="sc-button sc-button--primary"
          disabled={disabledReason !== null}
          aria-disabled={busy || undefined}
          aria-describedby={disabledReason ? `${id}-disabled` : undefined}
        >
          {pending ? '저장 중…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="sc-button sc-button--ghost"
            aria-disabled={busy || undefined}
            onClick={() => {
              if (!busy) onCancel()
            }}
          >
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
