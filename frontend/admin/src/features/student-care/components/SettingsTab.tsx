import { useId, useState, type FormEvent } from 'react'
import { toApiError, type ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import type { CareSettingKey, CareSettings, CareSettingsValues } from '../model/types.ts'
import { useRemote } from '../model/useRemote.ts'
import { ErrorState, FieldError, InlineError, Loading } from './StateMessage.tsx'

// 허용 범위는 서버 응답의 `ranges`(65-9)만 쓴다. 여기서는 표시 문구만 정한다.
const FIELDS: { key: CareSettingKey; label: string; unit: string; help: string }[] = [
  { key: 'absenceDays', label: '연속 미입실', unit: '일 이상', help: '오늘까지 이어진 미입실 일수' },
  { key: 'planMissingDays', label: '계획 미제출 반복', unit: '일 이상', help: '최근 7일 중 계획을 내지 않은 날' },
  { key: 'studyDropPercent', label: '학습량 감소', unit: '% 이상', help: '최근 7일 학습량이 평소보다 줄어든 비율' },
  { key: 'executionRatePercent', label: '계획 대비 실행 부족', unit: '% 미만', help: '최근 2주 계획 시간 대비 실행 비율' },
  { key: 'subjectShareGapPoints', label: '과목 배분 차이', unit: '%p 이상', help: '계획한 과목 비중과 실제 비중의 차이' },
  { key: 'startShiftMinutes', label: '시작 시각 변화', unit: '분 이상', help: '평소보다 늦어진 평균 시작 시각' },
  {
    key: 'minValidDays',
    label: '판단 보류',
    unit: '일 미만',
    help: '최근 7일 유효 학습일(30분 이상)이 이보다 적으면 학습량을 비교하지 않음',
  },
  { key: 'cooldownDays', label: '종결 후 쉬는 기간', unit: '일', help: '종결한 신호를 다시 올리지 않는 기간' },
]

const RANGE_SUMMARY = '기준값 범위를 확인해주세요. 표시한 칸을 고친 뒤 다시 저장하세요.'
const SAVED_MESSAGE = '저장했습니다. 케어 보드에 바로 반영됩니다.'

type Values = Record<CareSettingKey, string>
type Ranges = CareSettings['ranges']
type FieldErrors = Partial<Record<CareSettingKey, string>>

const toValues = (settings: CareSettingsValues): Values =>
  Object.fromEntries(FIELDS.map((field) => [field.key, String(settings[field.key])])) as Values

const rangeText = (ranges: Ranges, key: CareSettingKey) => `${ranges[key].min}~${ranges[key].max}`

/** 빈 값 / 소수 / 범위 밖을 서버에 보내기 전에 막는다. */
function validate(values: Values, ranges: Ranges): FieldErrors {
  const errors: FieldErrors = {}
  for (const { key } of FIELDS) {
    const raw = values[key].trim()
    const value = Number(raw)
    const { min, max } = ranges[key]
    if (raw === '' || !Number.isInteger(value)) {
      errors[key] = `${rangeText(ranges, key)} 사이의 정수로 입력하세요.`
    } else if (value < min || value > max) {
      errors[key] = `${rangeText(ranges, key)} 사이로 입력하세요.`
    }
  }
  return errors
}

/** 서버가 `details.fields`로 가리킨 칸의 문구. */
function serverFieldError(error: ApiError | null, key: CareSettingKey, ranges: Ranges): string | null {
  if (!error || !error.hasField(key)) return null
  return error.code === 'VALIDATION_ERROR'
    ? `${rangeText(ranges, key)} 사이의 정수로 입력하세요.`
    : `${rangeText(ranges, key)} 사이로 입력하세요.`
}

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

function SettingsForm({ branchId, initial, onSaved }: { branchId: string; initial: CareSettings; onSaved: () => void }) {
  const id = useId()
  const [values, setValues] = useState<Values>(() => toValues(initial))
  const [ranges, setRanges] = useState<Ranges>(initial.ranges)
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [savedMessage, setSavedMessage] = useState('')
  const hasClientErrors = Object.keys(clientErrors).length > 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setSavedMessage('')
    setError(null)
    const errors = validate(values, ranges)
    setClientErrors(errors)
    const firstInvalid = FIELDS.find((field) => errors[field.key])
    if (firstInvalid) {
      document.getElementById(`${id}-${firstInvalid.key}`)?.focus()
      return
    }
    setPending(true)
    try {
      const payload = Object.fromEntries(
        FIELDS.map((field) => [field.key, Number(values[field.key])]),
      ) as unknown as CareSettingsValues
      const saved = await studentCareApi.updateSettings(branchId, payload)
      // 저장된 값(서버 기준)으로 폼을 다시 채운다.
      setValues(toValues(saved))
      setRanges(saved.ranges)
      setSavedMessage(SAVED_MESSAGE)
      onSaved()
    } catch (caught) {
      setError(toApiError(caught))
    } finally {
      setPending(false)
    }
  }

  const fieldError = (key: CareSettingKey) => clientErrors[key] ?? serverFieldError(error, key, ranges)

  return (
    <form className="sc-settings" noValidate onSubmit={submit} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="sc-history__title">
        기준값 <span className="sc-hint">이 지점에서 신호를 올리는 기준입니다. 신호는 판정이 아닙니다.</span>
      </h2>
      <div className="sc-table-scroll">
        <table className="sc-table">
          <thead>
            <tr>
              <th scope="col">신호</th>
              <th scope="col">기준</th>
              <th scope="col">설명</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((field) => {
              const message = fieldError(field.key)
              const inputId = `${id}-${field.key}`
              return (
                <tr key={field.key}>
                  <th scope="row">
                    <label htmlFor={inputId}>{field.label}</label>
                  </th>
                  <td>
                    <input
                      id={inputId}
                      className="sc-number"
                      type="number"
                      inputMode="numeric"
                      step={1}
                      min={ranges[field.key].min}
                      max={ranges[field.key].max}
                      required
                      value={values[field.key]}
                      aria-invalid={message ? true : undefined}
                      aria-describedby={message ? `${inputId}-range ${inputId}-error` : `${inputId}-range`}
                      onChange={(event) => {
                        setValues({ ...values, [field.key]: event.target.value })
                        if (clientErrors[field.key]) {
                          const rest = { ...clientErrors }
                          delete rest[field.key]
                          setClientErrors(rest)
                        }
                      }}
                    />{' '}
                    {field.unit}
                    <span id={`${inputId}-range`} className="sc-hint">
                      {' '}
                      ({rangeText(ranges, field.key)})
                    </span>
                    <FieldError id={`${inputId}-error`} message={message} />
                  </td>
                  <td className="sc-hint">{field.help}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hasClientErrors ? (
        <p className="sc-inline-error" role="alert">
          {RANGE_SUMMARY}
        </p>
      ) : (
        <InlineError error={error} />
      )}
      <p className="sc-success" role="status" aria-live="polite">
        {savedMessage}
      </p>
      <div className="sc-actions">
        <button type="submit" className="sc-button sc-button--primary" disabled={pending}>
          {pending ? '저장 중…' : '기준값 저장'}
        </button>
      </div>
    </form>
  )
}
