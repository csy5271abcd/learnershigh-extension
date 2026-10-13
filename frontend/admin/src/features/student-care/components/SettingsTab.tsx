import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import type { CareSettings } from '../model/types.ts'
import { useRemote } from '../model/useRemote.ts'
import { ErrorState, InlineError, Loading } from './StateMessage.tsx'

const FIELDS: { key: keyof CareSettings; label: string; unit: string; min: number; max: number; help: string }[] = [
  { key: 'absenceDays', label: '연속 미입실', unit: '일 이상', min: 2, max: 14, help: '오늘까지 이어진 미입실 일수' },
  { key: 'planMissingDays', label: '계획 미제출 반복', unit: '일 이상', min: 1, max: 7, help: '최근 7일 중 계획을 내지 않은 날' },
  { key: 'studyDropPercent', label: '학습량 감소', unit: '% 이상', min: 10, max: 90, help: '최근 7일 학습량이 평소보다 줄어든 비율' },
  { key: 'executionRatePercent', label: '계획 대비 실행 부족', unit: '% 미만', min: 10, max: 100, help: '최근 2주 계획 시간 대비 실행 비율' },
  { key: 'subjectShareGapPoints', label: '과목 배분 차이', unit: '%p 이상', min: 5, max: 60, help: '계획한 과목 비중과 실제 비중의 차이' },
  { key: 'startShiftMinutes', label: '시작 시각 변화', unit: '분 이상', min: 30, max: 300, help: '평소보다 늦어진 평균 시작 시각' },
  { key: 'minValidDays', label: '판단 보류', unit: '일 미만', min: 1, max: 7, help: '최근 7일 유효 학습일(30분 이상)이 이보다 적으면 학습량을 비교하지 않음' },
  { key: 'cooldownDays', label: '종결 후 쉬는 기간', unit: '일', min: 0, max: 30, help: '종결한 신호를 다시 올리지 않는 기간' },
]

/** 기준값: 지점별 신호 Threshold. 저장하면 케어 보드에 바로 반영된다. */
export function SettingsTab({ branchId, onSaved }: { branchId: string; onSaved: () => void }) {
  const settings = useRemote(branchId, () => studentCareApi.settings(branchId))

  if (settings.status === 'error' && !settings.data) {
    return <ErrorState error={settings.error} onRetry={settings.reload} />
  }
  if (!settings.data) {
    return <Loading />
  }
  return <SettingsForm branchId={branchId} initial={settings.data} onSaved={onSaved} />
}

type Values = Record<keyof CareSettings, string>

function SettingsForm({ branchId, initial, onSaved }: { branchId: string; initial: CareSettings; onSaved: () => void }) {
  const id = useId()
  const [values, setValues] = useState<Values>(
    () => Object.fromEntries(FIELDS.map((field) => [field.key, String(initial[field.key])])) as Values,
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    setSavedMessage(null)
    try {
      const payload = Object.fromEntries(FIELDS.map((field) => [field.key, Number(values[field.key])])) as unknown as CareSettings
      await studentCareApi.updateSettings(branchId, payload)
      setSavedMessage('저장했습니다. 케어 보드에 바로 반영됩니다.')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN_ERROR', String(caught), []))
    } finally {
      setPending(false)
    }
  }
  const invalid = (key: string) => error?.fields.some((field) => field.field === key) ?? false

  return (
    <form className="sc-settings" noValidate onSubmit={submit} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="sc-history__title">
        기준값 <span className="sc-hint">이 지점에서 신호를 올리는 기준입니다. 신호는 판정이 아닙니다.</span>
      </h2>
      <table className="sc-table">
        <thead>
          <tr>
            <th scope="col">신호</th>
            <th scope="col">기준</th>
            <th scope="col">설명</th>
          </tr>
        </thead>
        <tbody>
          {FIELDS.map((field) => (
            <tr key={field.key}>
              <th scope="row">
                <label htmlFor={`${id}-${field.key}`}>{field.label}</label>
              </th>
              <td>
                <input
                  id={`${id}-${field.key}`}
                  className="sc-number"
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  max={field.max}
                  required
                  value={values[field.key]}
                  aria-invalid={invalid(field.key)}
                  aria-describedby={`${id}-${field.key}-range`}
                  onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                />{' '}
                {field.unit}
                <span id={`${id}-${field.key}-range`} className="sc-hint">
                  {' '}
                  ({field.min}~{field.max})
                </span>
              </td>
              <td className="sc-hint">{field.help}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <InlineError error={error} />
      {savedMessage && (
        <p className="sc-success" role="status">
          {savedMessage}
        </p>
      )}
      <div className="sc-actions">
        <button type="submit" className="sc-button sc-button--primary" disabled={pending}>
          {pending ? '저장 중…' : '기준값 저장'}
        </button>
      </div>
    </form>
  )
}
