import { useId, useState } from 'react'
import { studentCareApi } from '../api/studentCareApi.ts'
import { addDays, metric, RECHECK_CHOICES, shortDate, TREND_LABEL } from '../model/format.ts'
import type { CareCase } from '../model/types.ts'
import { useCommand } from '../model/useCommand.ts'
import { Choice } from './Choice.tsx'

interface Props {
  branchId: string
  asOf: string
  careCase: CareCase
  onSaved: (message: string) => void
  onStale: () => void
}

/** 점검: 지난번 → 지금 수치, 관리 종료 / 계속 관리 (student-care.md §4-3). */
export function RecheckPanel({ branchId, asOf, careCase, onSaved, onStale }: Props) {
  const id = useId()
  const [continuing, setContinuing] = useState(false)
  const [days, setDays] = useState('7')
  const command = useCommand(onStale)
  const comparison = careCase.comparison

  const close = () =>
    void command.run(
      () => studentCareApi.decide(branchId, careCase.caseId, { decision: 'CLOSE' }),
      () => onSaved('관리 종료'),
    )

  const keep = () =>
    void command.run(
      () =>
        studentCareApi.decide(branchId, careCase.caseId, {
          decision: 'CONTINUE',
          recheckDate: addDays(asOf, Number(days)),
        }),
      (saved) => onSaved(`계속 관리 · 다음 점검 ${shortDate(saved.recheckDate ?? '')}`),
    )

  return (
    <section className="sc-form" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="sc-section-title">
        점검
        {comparison && <span className={`sc-result sc-result--${comparison.result}`}>{comparison.resultLabel}</span>}
      </h3>
      {comparison && (
        <table className="sc-compare">
          <thead>
            <tr>
              <th scope="col">특이사항</th>
              <th scope="col">지난번</th>
              <th scope="col">지금</th>
              <th scope="col">
                <span className="sc-visually-hidden">변화</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.type}>
                <th scope="row">{row.label}</th>
                <td>{metric(row.before, row.unit)}</td>
                <td>{row.now === null ? '기록 없음' : metric(row.now, row.unit)}</td>
                <td className={`sc-trend sc-trend--${row.trend}`}>{row.now === null ? '' : TREND_LABEL[row.trend]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="sc-actions">
        <button
          type="button"
          className="sc-button sc-button--primary"
          aria-disabled={command.pending || undefined}
          onClick={close}
        >
          관리 종료
        </button>
        <button
          type="button"
          className="sc-button"
          aria-expanded={continuing}
          aria-controls={`${id}-continue`}
          onClick={() => setContinuing((value) => !value)}
        >
          계속 관리
        </button>
      </div>

      <div id={`${id}-continue`} className="sc-continue" hidden={!continuing}>
        <Choice
          name={`${id}-days`}
          legend="다음 점검일"
          options={RECHECK_CHOICES.map((choice) => ({
            value: String(choice.days),
            label: choice.label,
          }))}
          value={days}
          onChange={setDays}
        />
        <button type="button" className="sc-button sc-button--primary" aria-disabled={command.pending || undefined} onClick={keep}>
          {command.pending ? '저장 중' : '계속 관리 저장'}
        </button>
      </div>

      {command.error && (
        <p className="sc-error" role="alert">
          {command.error.message}
        </p>
      )}
    </section>
  )
}
