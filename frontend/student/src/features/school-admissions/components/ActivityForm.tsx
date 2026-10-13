import { activityTypes, type ActivityFieldErrors } from '../model/activity.ts'
import { activityFieldId as fieldId, type ActivityDraftValues } from '../model/activityForm.ts'
import { DialogShell } from './EvidenceDialogs.tsx'
import dialogStyles from './EvidenceParts.module.css'
import styles from './ActivityForm.module.css'

interface ActivityFormFieldsProps {
  idPrefix: string
  values: ActivityDraftValues
  errors: ActivityFieldErrors
  onChange: (next: ActivityDraftValues) => void
  /** basic: 등록 창 (기본 정보만), full: 상세 수정 (활동 서술 포함) */
  mode: 'basic' | 'full'
}

/**
 * 활동 기록 입력 칸. 모든 서술은 학생이 직접 쓴다. (AI 작성 / 자동 채우기 없음)
 * 필수: 활동명 · 유형 · 시작일. 지난 활동도 기록할 수 있어 과거 날짜를 막지 않는다.
 */
export function ActivityFormFields({ idPrefix, values, errors, onChange, mode }: ActivityFormFieldsProps) {
  const set = (name: keyof ActivityDraftValues, value: string) => onChange({ ...values, [name]: value })
  const textField = (name: keyof ActivityDraftValues, label: string, options: { required?: boolean; placeholder?: string } = {}) => {
    const id = fieldId(idPrefix, name)
    const error = errors[name as keyof ActivityFieldErrors]
    return (
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {options.required && <span className={styles.required}> (필수)</span>}
        </label>
        <input
          id={id}
          className={styles.input}
          value={values[name]}
          placeholder={options.placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => set(name, event.target.value)}
        />
        {error && (
          <p id={`${id}-error`} className={styles.error}>
            {error}
          </p>
        )}
      </div>
    )
  }
  const longField = (name: keyof ActivityDraftValues, label: string, hint: string) => {
    const id = fieldId(idPrefix, name)
    return (
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <textarea
          id={id}
          className={styles.textarea}
          rows={3}
          value={values[name]}
          aria-describedby={`${id}-hint`}
          onChange={(event) => set(name, event.target.value)}
        />
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      </div>
    )
  }
  const dateField = (name: 'startDate' | 'endDate', label: string, required: boolean) => {
    const id = fieldId(idPrefix, name)
    const error = errors[name]
    return (
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required}> (필수)</span>}
        </label>
        <input
          id={id}
          type="date"
          className={styles.input}
          value={values[name]}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => set(name, event.target.value)}
        />
        {error && (
          <p id={`${id}-error`} className={styles.error}>
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={styles.fields}>
      {textField('title', '활동명', { required: true, placeholder: '예: 학교 주변 하천 정화 및 생태 기록' })}
      <fieldset className={styles.fieldset} aria-describedby={errors.type ? `${idPrefix}-type-error` : undefined}>
        <legend className={styles.label}>
          활동 유형<span className={styles.required}> (필수)</span>
        </legend>
        <div className={styles.chips} id={`${idPrefix}-type`} tabIndex={-1}>
          {activityTypes.map((item) => (
            <label key={item.id} className={styles.chip}>
              <input
                type="radio"
                name={`${idPrefix}-type`}
                className="lh-visually-hidden"
                checked={values.type === item.id}
                onChange={() => set('type', item.id)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        {errors.type && (
          <p id={`${idPrefix}-type-error`} className={styles.error}>
            {errors.type}
          </p>
        )}
      </fieldset>
      {textField('organizer', '주최 / 기관', { placeholder: '예: 교내 환경동아리' })}
      <div className={styles.dates}>
        {dateField('startDate', '시작일', true)}
        {dateField('endDate', '종료일 (하루 활동은 비워 두세요)', false)}
      </div>
      {textField('role', '내 역할', { placeholder: '예: 생태 사진 기록과 분류' })}
      {mode === 'full' && (
        <>
          {longField('participationReason', '참여 이유', '왜 이 활동에 참여했는지 적어보세요.')}
          {longField('process', '주요 과정', '활동이 어떤 순서로 진행됐는지 적어보세요.')}
          {longField('contribution', '내가 실제로 한 일', '내가 직접 맡아서 한 일을 구체적으로 적어보세요.')}
          {longField('result', '결과', '활동으로 무엇이 남았는지 적어보세요.')}
          {longField('followUp', '후속 활동', '이 활동 뒤에 이어서 하고 싶은 일이 있으면 적어보세요.')}
          {textField('tags', '태그 (쉼표로 나눠 입력)', { placeholder: '예: 환경, 생태' })}
        </>
      )}
    </div>
  )
}

// ---------- 활동 기록 추가 (Activities 위 Modal) ----------

interface ActivityCreateDialogProps {
  values: ActivityDraftValues
  errors: ActivityFieldErrors
  onChange: (next: ActivityDraftValues) => void
  submitting: boolean
  submitFailed: boolean
  onSubmit: () => void
  onRequestClose: () => void
}

/** 처음 기록은 기본 정보만 받는다. 활동 서술과 자료는 만든 뒤 상세 화면에서 채운다. 만들면 작성 중(Draft) 상태다. */
export function ActivityCreateDialog({ values, errors, onChange, submitting, submitFailed, onSubmit, onRequestClose }: ActivityCreateDialogProps) {
  return (
    <DialogShell labelledBy="activity-create-heading" onCancel={() => !submitting && onRequestClose()}>
      <form
        className={dialogStyles.dialogSurface}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className={dialogStyles.dialogHeader}>
          <h2 id="activity-create-heading" className={dialogStyles.dialogTitle} tabIndex={-1} data-autofocus>
            활동 기록 추가
          </h2>
          <p className={dialogStyles.dialogContext}>기본 정보부터 적어요. 과정과 자료는 다음 화면에서 이어서 채울 수 있어요.</p>
        </header>
        <div className={dialogStyles.dialogBody}>
          <ActivityFormFields idPrefix="activity-create" values={values} errors={errors} onChange={onChange} mode="basic" />
        </div>
        {submitFailed && (
          <p className={dialogStyles.submitError} role="alert">
            활동 기록을 만들지 못했어요. 입력한 내용은 그대로 있어요. 다시 시도해주세요.
          </p>
        )}
        <div className={dialogStyles.dialogFooter}>
          <button type="button" className={dialogStyles.secondaryButton} onClick={onRequestClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" className={dialogStyles.primaryButton} disabled={submitting}>
            {submitting ? '만드는 중…' : '기록 만들기'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
