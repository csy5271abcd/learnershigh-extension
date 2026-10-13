import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { toApiError, type ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { fieldMessage } from '../model/fieldErrors.ts'
import type { CareSettingKey, CareSettings, CareSettingsValues } from '../model/types.ts'
import { useErrorFocus, useRetryFocus } from '../model/useFocus.ts'
import { loadFailure, useRemote } from '../model/useRemote.ts'
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

/** 기준값: 지점별 신호 Threshold. 저장하면 케어 보드에 바로 반영된다. */
export function SettingsTab({ branchId, onSaved }: { branchId: string; onSaved: () => void }) {
  const settings = useRemote(branchId, () => studentCareApi.settings(branchId))
  const { anchorRef, retry } = useRetryFocus<HTMLHeadingElement>(settings)
  const failure = loadFailure(settings)
  const retrying = settings.status === 'loading'

  if (failure && !settings.data) {
    return <ErrorState error={failure} onRetry={retry} retrying={retrying} />
  }
  if (!settings.data) {
    return <Loading />
  }
  return <SettingsForm branchId={branchId} initial={settings.data} titleRef={anchorRef} onSaved={onSaved} />
}

interface FormProps {
  branchId: string
  initial: CareSettings
  titleRef: RefObject<HTMLHeadingElement | null>
  onSaved: () => void
}

function SettingsForm({ branchId, initial, titleRef, onSaved }: FormProps) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const inFlight = useRef(false)
  const [values, setValues] = useState<Values>(() => toValues(initial))
  const [ranges, setRanges] = useState<Ranges>(initial.ranges)
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [savedMessage, setSavedMessage] = useState('')
  const hasClientErrors = Object.keys(clientErrors).length > 0
  // 서버 오류(422 범위 밖 / 400 / 연결 실패)가 나면 표시한 첫 칸, 없으면 오류 문구로 Focus를 옮긴다.
  useErrorFocus(error, formRef)

  // 저장 버튼은 보내는 중에도 disabled로 바꾸지 않는다(Focus가 body로 빠지지 않게). 대신 여기서 다시 보내지 않는다.
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (inFlight.current) return
    setSavedMessage('')
    setError(null)
    const errors = validate(values, ranges)
    setClientErrors(errors)
    const firstInvalid = FIELDS.find((field) => errors[field.key])
    if (firstInvalid) {
      document.getElementById(`${id}-${firstInvalid.key}`)?.focus()
      return
    }
    inFlight.current = true
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
      inFlight.current = false
      setPending(false)
    }
  }

  const fieldError = (key: CareSettingKey) =>
    clientErrors[key] ?? fieldMessage(error, [key], `${rangeText(ranges, key)} 사이의 정수로 입력하세요.`)
  const serverFieldMatched = FIELDS.some((field) => error?.hasField(field.key))

  return (
    <form ref={formRef} className="sc-settings" noValidate onSubmit={submit} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className="sc-settings__title">
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
                      // 저장하는 동안 고친 값이 응답 값에 덮여 사라지지 않게, 보내는 중에는 읽기 전용이다.
                      readOnly={pending}
                      value={values[field.key]}
                      aria-invalid={message ? true : undefined}
                      aria-describedby={message ? `${inputId}-range ${inputId}-error` : `${inputId}-range`}
                      onChange={(event) => {
                        setValues({ ...values, [field.key]: event.target.value })
                        // 저장한 뒤 다시 고치기 시작하면 "저장했습니다"는 더 이상 맞지 않는다.
                        setSavedMessage('')
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
      {/* 칸에 붙은 오류가 있으면 요약만, 칸에 붙일 수 없는 오류(연결 실패 등)만 서버 문구를 보여준다. */}
      {hasClientErrors || serverFieldMatched ? (
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
        <button type="submit" className="sc-button sc-button--primary" aria-disabled={pending || undefined}>
          {pending ? '저장 중…' : '기준값 저장'}
        </button>
      </div>
    </form>
  )
}
