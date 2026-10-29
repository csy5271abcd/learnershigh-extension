import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, toApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { PREVIEW_DEFAULTS } from '../api/previewData.ts'
import type { CareSettingKey, CareSettings, CareSettingsValues } from '../model/types.ts'

const FIELDS: readonly { key: CareSettingKey; label: string; unit: string; reason: string }[] = [
  { key: 'absenceDays', label: '결석', unit: '일 이상', reason: '최근 7일 중 평소 오는 요일에 입실하지 않은 날' },
  { key: 'planMissingDays', label: '계획 미제출', unit: '일 이상', reason: '최근 7일 중 계획을 내지 않은 날' },
  { key: 'studyDropPercent', label: '학습 시간 감소', unit: '% 이상', reason: '평소(이전 4주) 대비 최근 7일 학습 시간' },
  { key: 'executionRatePercent', label: '계획 달성률', unit: '% 미만', reason: '최근 7일 계획 대비 실제 학습 시간' },
  { key: 'subjectShareGapPoints', label: '과목 비율 차이', unit: '%p 이상', reason: '과목별 계획 비율과 실제 비율의 차이' },
  { key: 'startShiftMinutes', label: '입실 지연', unit: '분 이상', reason: '평소(같은 요일) 대비 늦게 들어온 시간' },
  { key: 'minValidDays', label: '판단에 필요한 학습일', unit: '일 이상', reason: '30분 이상 공부한 날이 이보다 적으면 학습 시간·달성률은 판단하지 않음' },
  { key: 'cooldownDays', label: '종료 후 다시 표시', unit: '일 뒤', reason: '관리를 끝낸 항목을 이 기간 동안 다시 띄우지 않음' },
]

interface Props {
  api?: typeof studentCareApi
  branchId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}

/** 관리 기준 설정 (api-contract.md §65-9). 지점 단위. */
export function SettingsDialog({ api=studentCareApi, branchId, open, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [settings, setSettings] = useState<CareSettings | null>(null)
  const [draft, setDraft] = useState<Record<CareSettingKey, string> | null>(null)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [saveError, setSaveError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  // 저장 오류가 나면 범위를 벗어난 첫 칸으로 Focus를 옮긴다.
  useLayoutEffect(() => {
    if (saveError) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [saveError])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    api.settings(branchId).then(
      (loaded) => {
        if (cancelled) return
        setSettings(loaded)
        setDraft(Object.fromEntries(FIELDS.map(({ key }) => [key, String(loaded[key])])) as Record<CareSettingKey, string>)
        setLoadError(null)
        setSaveError(null)
      },
      (caught: unknown) => {
        if (!cancelled) setLoadError(toApiError(caught))
      },
    )
    return () => {
      cancelled = true
    }
  }, [open, branchId, attempt, api])

  /** 범위를 벗어난 값만 짧게 알린다. 평소에는 범위를 보여 주지 않는다. */
  const rangeError = (key: CareSettingKey): string | null => {
    if (!draft || !settings) return null
    const raw = draft[key].trim(), value = Number(raw), { min, max } = settings.ranges[key]
    if (raw === '' || !Number.isInteger(value)) return '정수를 입력해 주세요.'
    if (value > max) return `${max} 이하여야 합니다.`
    if (value < min) return `${min} 이상이어야 합니다.`
    return null
  }
  const invalid = (key: CareSettingKey) => rangeError(key) !== null || (saveError?.hasField(key) ?? false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || !settings || pending) return
    const fields = FIELDS.flatMap(({ key }) => { const reason = rangeError(key); return reason ? [{ field: key, reason }] : [] })
    if (fields.length) {
      setSaveError(new ApiError(422, 'INVALID_CARE_SETTINGS', '입력값을 확인해 주세요.', fields))
      return
    }
    setPending(true)
    setSaveError(null)
    try {
      const values = Object.fromEntries(FIELDS.map(({ key }) => [key, Number(draft[key])])) as unknown as CareSettingsValues
      await api.updateSettings(branchId, values)
      onSaved()
      onClose()
    } catch (caught) {
      setSaveError(toApiError(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="sc-dialog" aria-labelledby="sc-settings-title" onClose={() => {
      setSettings(null)
      setDraft(null)
      setLoadError(null)
      setSaveError(null)
      onClose()
    }}>
      <form ref={formRef} className="sc-dialog__body" onSubmit={submit} noValidate>
        <h2 id="sc-settings-title" className="sc-dialog__title">
          관리 기준 설정
        </h2>
        <p className="sc-settings-intro">학습관별로 적용됩니다</p>
        {loadError ? (
          <div className="sc-state" role="alert">
            <p>불러오지 못했습니다</p>
            <button type="button" className="sc-button" onClick={() => setAttempt((value) => value + 1)}>
              다시 시도
            </button>
          </div>
        ) : !settings || !draft ? (
          <p className="sc-state">불러오는 중</p>
        ) : (
          <div className="sc-settings">
            {FIELDS.map(({ key, label, unit, reason }) => {
              const range = settings.ranges[key]
              const hintId = `sc-setting-${key}-hint`
              const error = rangeError(key)
              return (
                <div key={key} className="sc-setting">
                  <label className="sc-setting__label" title={reason} htmlFor={`sc-setting-${key}`}>
                    {label}
                  </label>
                  <div className="sc-setting__control">
                    <input
                      id={`sc-setting-${key}`}
                      className="sc-input"
                      type="number"
                      inputMode="numeric"
                      min={range.min}
                      max={range.max}
                      step={1}
                      value={draft[key]}
                      aria-invalid={invalid(key) || undefined}
                      aria-describedby={hintId}
                      onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    />
                    <span className="sc-setting__unit">{unit}</span>
                  </div>
                  <span id={hintId} className={error ? 'sc-setting__hint sc-field__error' : 'sc-setting__hint'}>
                    {error ?? reason}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {saveError && (
          <p className="sc-error" role="alert">
            {saveError.message}
          </p>
        )}
        <div className="sc-actions sc-actions--end">
          <button type="button" className="sc-button" disabled={!draft || pending} onClick={() => { setDraft(Object.fromEntries(FIELDS.map(({ key }) => [key, String(PREVIEW_DEFAULTS[key])])) as Record<CareSettingKey, string>); setSaveError(null) }}>
            기본값으로 되돌리기
          </button>
          <button type="button" className="sc-button" disabled={pending} onClick={onClose}>
            취소
          </button>
          <button
            type="submit"
            className="sc-button sc-button--primary"
            disabled={pending || !draft || !!loadError}
          >
            {pending ? '저장 중' : '저장'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
