import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, toApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { PREVIEW_DEFAULTS } from '../api/previewData.ts'
import type { CareSettingKey, CareSettings, CareSettingsValues } from '../model/types.ts'

const FIELDS: readonly { key: CareSettingKey; label: string; unit: string; reason: string }[] = [
  { key: 'absenceDays', label: '등원 예정일 미입실', unit: '일 이상', reason: '최근 7일의 등원 예정일 중 입실 기록이 없는 날짜 수입니다. 일정이 없는 학생은 결석으로 판정하지 않습니다.' },
  { key: 'planMissingDays', label: '계획 미제출 (7일 중)', unit: '일 이상', reason: '최근 7일 중 학습 계획을 제출하지 않은 날짜 수입니다.' },
  { key: 'studyDropPercent', label: '학습 시간 감소', unit: '% 이상', reason: '최근 7일을 제외한 직전 28일의 주평균 대비 최근 7일 총 학습 시간의 감소율입니다.' },
  { key: 'executionRatePercent', label: '계획 달성률', unit: '% 미만', reason: '최근 7일 중 계획과 실제 기록이 모두 있는 날의 시간 합계로 비교합니다.' },
  { key: 'subjectShareGapPoints', label: '과목별 계획·실제 비율 차이', unit: '%p 이상', reason: '최근 7일의 과목별 계획 비율과 실제 학습 비율의 차이입니다.' },
  { key: 'startShiftMinutes', label: '입실 시각 지연', unit: '분 이상', reason: '최근 7일을 제외한 직전 28일 평균 대비 최근 7일 평균 입실 시각의 차이입니다.' },
  { key: 'minValidDays', label: '분석에 필요한 최소 학습일', unit: '일 이상', reason: '최근 7일 중 30분 이상 학습한 날짜 수입니다. 이보다 적으면 학습 시간과 달성률을 분석하지 않습니다.' },
  { key: 'cooldownDays', label: '관리 종료 후 다시 표시', unit: '일', reason: '관리를 종료한 항목을 다시 표시하기까지의 기간입니다. 0일이면 바로 표시합니다.' },
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

  const invalid = (key: CareSettingKey) => saveError?.hasField(key) ?? false

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || !settings || pending) return
    const fields = FIELDS.filter(({ key }) => draft[key].trim() === '' || !Number.isInteger(Number(draft[key])) || Number(draft[key]) < settings.ranges[key].min || Number(draft[key]) > settings.ranges[key].max)
      .map(({ key }) => ({ field: key, reason: '허용 범위 안의 정수를 입력해 주세요.' }))
    if (fields.length) {
      setSaveError(new ApiError(422, 'INVALID_CARE_SETTINGS', '허용 범위 안의 정수를 입력해 주세요.', fields))
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
        <p className="sc-settings-intro">학습관별 설정 · 초기값은 운영 전 검토용 제안입니다</p>
        <p className="sc-settings-preview">미입실은 등원 예정일 기준입니다. 등원 일정이 없으면 결석으로 판정하지 않습니다.</p>
        <p className="sc-settings-preview">새로고침하면 초기화됩니다.</p>
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
                      aria-describedby={`${hintId} sc-setting-${key}-default`}
                      onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    />
                    <span className="sc-setting__unit">{unit}</span>
                  </div>
                  <span id={hintId} className={invalid(key) ? 'sc-setting__hint sc-field__error' : 'sc-setting__hint'}>
                    {reason} {invalid(key) ? '입력값 확인 · ' : '허용 범위 '}{range.min}~{range.max}
                  </span>
                  <span id={`sc-setting-${key}-default`} className="sc-settings-defaults">기본값 {PREVIEW_DEFAULTS[key]}{unit}</span>
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
