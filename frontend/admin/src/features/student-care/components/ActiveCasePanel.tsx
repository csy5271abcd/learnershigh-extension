import { useId, useRef, useState } from 'react'
import type { ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { fieldMessage, formLevelError, invalidProps } from '../model/fieldErrors.ts'
import { addDays, DEFAULT_RECHECK_DAYS, metric, monthDay, RECHECK_DAY_CHOICES } from '../model/format.ts'
import type { CareCase, ComparisonRow, DecisionInput, Trend } from '../model/types.ts'
import { useCaseCommand } from '../model/useCaseCommand.ts'
import { useErrorFocus } from '../model/useFocus.ts'
import { NoteForm } from './NoteForm.tsx'
import { PlanForm } from './PlanForm.tsx'
import { FieldError, InlineError, LockHint } from './StateMessage.tsx'
import { Timeline } from './Timeline.tsx'

const TREND_LABEL: Record<Trend, string> = { IMPROVED: '나아짐', SAME: '비슷함', WORSENED: '나빠짐' }

interface Props {
  branchId: string
  careCase: CareCase
  asOf: string
  /** 상세 데이터의 revision. 결정 뒤 새 데이터가 오기 전까지 결정 버튼을 잠근다. */
  revision: number
  stale: boolean
  onDecided: (careCase: CareCase) => void
  onNoteSaved: () => void
  onStale: (error: ApiError) => void
  onRetryLatest: () => void
}

function CompareRow({ row }: { row: ComparisonRow }) {
  return (
    <li className="sc-compare__row">
      <span className="sc-compare__label">{row.label}</span>
      <span className="sc-compare__values">
        {metric(row.before, row.unit)} →{' '}
        {row.now === null ? <strong>비교할 기록 없음</strong> : <strong>{metric(row.now, row.unit)}</strong>}
        {row.target !== null && <span className="sc-compare__target"> · 기준 {metric(row.target, row.unit)}</span>}
      </span>
      {row.now !== null && <span className={`sc-trend sc-trend--${row.trend.toLowerCase()}`}>{TREND_LABEL[row.trend]}</span>}
    </li>
  )
}

/** 조정 진행 중인 건: 기록, 약속, 재점검 비교와 선생님 결정, 면담·통화 메모. */
export function ActiveCasePanel({
  branchId,
  careCase,
  asOf,
  revision,
  stale,
  onDecided,
  onNoteSaved,
  onStale,
  onRetryLatest,
}: Props) {
  const id = useId()
  const [mode, setMode] = useState<'idle' | 'continue' | 'revise'>('idle')
  const [continueDays, setContinueDays] = useState(DEFAULT_RECHECK_DAYS)
  const recheckRef = useRef<HTMLElement>(null)
  const command = useCaseCommand(revision, onStale)
  const { busy, pending, locked, error } = command
  const plan = careCase.plan
  useErrorFocus(error, recheckRef)

  const decide = (input: DecisionInput) =>
    command.run(
      () => studentCareApi.decide(branchId, careCase.caseId, input),
      (decided) => {
        setMode('idle')
        onDecided(decided)
      },
    )

  const toggle = (next: 'continue' | 'revise') => {
    if (busy) return
    setMode(mode === next ? 'idle' : next)
    command.clearError()
  }

  const continueError =
    mode === 'continue' ? fieldMessage(error, ['recheckDate'], '다음 재점검일을 다시 골라주세요.') : null

  return (
    <div className="sc-case">
      <section className="sc-section" aria-labelledby={`${id}-history`}>
        <h3 id={`${id}-history`} className="sc-section__title">
          이 건의 기록
        </h3>
        <Timeline events={careCase.events} label="이 건의 기록" />
      </section>

      {plan && (
        <section className="sc-section" aria-labelledby={`${id}-plan`}>
          <h3 id={`${id}-plan`} className="sc-section__title">
            조정 약속
          </h3>
          <dl className="sc-plan-summary">
            <dt>목표</dt>
            <dd>{plan.goal}</dd>
            <dt>행동</dt>
            <dd>{plan.action}</dd>
            <dt>부담 한도</dt>
            <dd>{plan.loadLimit ?? '정하지 않음'}</dd>
            <dt>합의</dt>
            <dd>{plan.agreedWithStudent ? '학생과 합의함' : '합의 전'}</dd>
          </dl>
        </section>
      )}

      {!careCase.recheckDue && careCase.recheckDate && (
        <p className="sc-notice">
          재점검일({monthDay(careCase.recheckDate)})에 같은 기준으로 다시 비교합니다. 그 전에는 결정하지 않습니다.
        </p>
      )}

      {careCase.recheckDue && careCase.comparison && (
        <section ref={recheckRef} className="sc-section sc-recheck" aria-labelledby={`${id}-recheck`}>
          <h3 id={`${id}-recheck`} className="sc-section__title">
            재점검 · 같은 기준으로 다시 비교
          </h3>
          <ul className="sc-compare">
            {careCase.comparison.rows.map((row) => (
              <CompareRow key={row.type} row={row} />
            ))}
          </ul>
          <p className="sc-result">
            결과 표시{' '}
            <span className={`sc-chip sc-chip--${careCase.comparison.result.toLowerCase()}`}>
              {careCase.comparison.resultLabel}
            </span>{' '}
            <span className="sc-hint">판정이 아니라 비교 결과입니다</span>
          </p>

          <h4 className="sc-subtitle">선생님 결정</h4>
          <div className="sc-actions" role="group" aria-label="선생님 결정">
            <button
              type="button"
              className="sc-button sc-button--primary"
              aria-disabled={busy || undefined}
              onClick={() => decide({ decision: 'CLOSE' })}
            >
              종결
            </button>
            <button
              type="button"
              className="sc-button sc-button--secondary"
              aria-expanded={mode === 'continue'}
              aria-disabled={busy || undefined}
              onClick={() => toggle('continue')}
            >
              같은 약속으로 계속
            </button>
            <button
              type="button"
              className="sc-button sc-button--secondary"
              aria-expanded={mode === 'revise'}
              aria-disabled={busy || undefined}
              onClick={() => toggle('revise')}
            >
              약속 수정
            </button>
          </div>

          {mode === 'continue' && (
            <div className="sc-inline-form">
              <label htmlFor={`${id}-next`}>다음 재점검일</label>
              <select
                id={`${id}-next`}
                value={continueDays}
                onChange={(event) => setContinueDays(Number(event.target.value))}
                {...invalidProps(`${id}-next-error`, continueError)}
              >
                {RECHECK_DAY_CHOICES.map((days) => (
                  <option key={days} value={days}>
                    {monthDay(addDays(asOf, days))} ({days}일 뒤)
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="sc-button sc-button--primary"
                aria-disabled={busy || undefined}
                onClick={() => decide({ decision: 'CONTINUE', recheckDate: addDays(asOf, continueDays) })}
              >
                {pending ? '저장 중…' : '계속하기'}
              </button>
              <FieldError id={`${id}-next-error`} message={continueError} />
            </div>
          )}

          {mode === 'revise' && plan && (
            <PlanForm
              asOf={asOf}
              initial={{ goal: plan.goal, action: plan.action, loadLimit: plan.loadLimit, recheckDate: null }}
              submitLabel="새 약속으로 시작"
              pending={pending}
              locked={locked}
              error={error}
              onSubmit={(newPlan, recheckDate) => decide({ decision: 'REVISE', plan: newPlan, recheckDate })}
              onCancel={() => {
                setMode('idle')
                command.clearError()
              }}
            />
          )}
          {mode !== 'revise' && <InlineError error={formLevelError(error, [continueError])} />}
          {locked && <LockHint stale={stale} onRetry={onRetryLatest} />}
        </section>
      )}

      <section className="sc-section" aria-labelledby={`${id}-note`}>
        <h3 id={`${id}-note`} className="sc-section__title">
          면담·통화 메모
        </h3>
        <NoteForm branchId={branchId} caseId={careCase.caseId} onSaved={onNoteSaved} onStale={onStale} />
      </section>
    </div>
  )
}
