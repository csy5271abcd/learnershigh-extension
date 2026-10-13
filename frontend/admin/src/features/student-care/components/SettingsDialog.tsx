import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { toApiError, type ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import type { CareSettingKey, CareSettings, CareSettingsValues } from '../model/types.ts'

const FIELDS: readonly { key: CareSettingKey; label: string; unit: string }[] = [
  { key: 'absenceDays', label: '연속 결석', unit: '일 이상' },
  { key: 'planMissingDays', label: '계획 미제출 (7일 중)', unit: '일 이상' },
  { key: 'studyDropPercent', label: '공부 시간 감소', unit: '% 이상' },
  { key: 'executionRatePercent', label: '계획 대비 실천', unit: '% 미만' },
  { key: 'subjectShareGapPoints', label: '과목 편중', unit: '%p 이상' },
  { key: 'startShiftMinutes', label: '등원 시간 늦어짐', unit: '분 이상' },
  { key: 'minValidDays', label: '기록 부족 (공부한 날)', unit: '일 미만' },
  { key: 'cooldownDays', label: '종료 후 다시 표시', unit: '일 뒤' },
]

interface Props {
  branchId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}

/** 특이사항 기준 (api-contract.md §65-9). 지점 단위. */
export function SettingsDialog({ branchId, open, onClose, onSaved }: Props) {
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
    studentCareApi.settings(branchId).then(
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
  }, [open, branchId, attempt])

  const invalid = (key: CareSettingKey) => saveError?.hasField(key) ?? false

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || pending) return
    setPending(true)
    setSaveError(null)
    try {
      const values = Object.fromEntries(FIELDS.map(({ key }) => [key, Number(draft[key])])) as unknown as CareSettingsValues
      await studentCareApi.updateSettings(branchId, values)
      onSaved()
      onClose()
    } catch (caught) {
      setSaveError(toApiError(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="sc-dialog" aria-labelledby="sc-settings-title" onClose={onClose}>
      <form ref={formRef} className="sc-dialog__body" onSubmit={submit} noValidate>
        <h2 id="sc-settings-title" className="sc-dialog__title">
          특이사항 기준
        </h2>
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
            {FIELDS.map(({ key, label, unit }) => {
              const range = settings.ranges[key]
              const hintId = `sc-setting-${key}-hint`
              return (
                <div key={key} className="sc-setting">
                  <label className="sc-setting__label" htmlFor={`sc-setting-${key}`}>
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
                  <span id={hintId} className={invalid(key) ? 'sc-setting__hint sc-field__error' : 'sc-setting__hint'}>
                    {range.min}~{range.max}
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
          <button type="button" className="sc-button" onClick={onClose}>
            취소
          </button>
          <button
            type="submit"
            className="sc-button sc-button--primary"
            aria-disabled={pending || !draft || undefined}
          >
            {pending ? '저장 중' : '저장'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
