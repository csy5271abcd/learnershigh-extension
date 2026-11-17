import { useId, useRef, useState, type ReactNode } from 'react'
import { manualRowErrorText, manualRowReasonText as reasonText } from './manualRowErrors.ts'
import type { TeachingPlanManualRow, TeachingPlanManualRowInput } from '../api/types.ts'
import styles from './review.module.css'

// A14 §39-11 운영계획 관리자 직접 추가 행 입력. 분석 결과에 없던 행을 초안에 둔다(학생에게는 확정 뒤에만).
// - 행 키는 서버가 발급한다. 시기는 정밀도와 관리자가 고른 월·주차만 보낸다 — 화면·서버 모두 월·주차를 추정하지 않는다.
// - 연도는 받지 않는다. 원문 쪽은 PDF 쪽 수 안에서만(관리자가 확인한 쪽, 분석 근거 아님). HWP·HWPX는 쪽 입력이 없다.
// - 저장에 실패해도 입력값을 그대로 둔다. 저장 중에는 다시 누를 수 없다.

type Precision = 'MONTH' | 'MONTH_RANGE' | 'WEEK_IN_MONTH' | 'TERM_WEEK' | 'UNKNOWN'
const precisionOptions: { value: Precision; label: string }[] = [
  { value: 'WEEK_IN_MONTH', label: '월·주차 (예: 3월 3주)' },
  { value: 'MONTH', label: '월 단위 (예: 3월)' },
  { value: 'MONTH_RANGE', label: '여러 달 (예: 3~4월)' },
  { value: 'TERM_WEEK', label: '학기 주차 (예: 5주차)' },
  { value: 'UNKNOWN', label: '시기가 원문에 없음' },
]
const months = Array.from({ length: 12 }, (_, index) => index + 1)


interface Values {
  precision: Precision
  monthFrom: string
  monthTo: string
  weekFrom: string
  weekTo: string
  weekLabel: string
  unit: string
  content: string
  standards: string
  teachingMethods: string
  assessmentMethods: string
  specialSchedule: string
  note: string
  page: string
}

function initialValues(row?: TeachingPlanManualRow): Values {
  const schedule = row?.schedule
  const precision = (precisionOptions.some((option) => option.value === schedule?.precision) ? schedule?.precision : 'WEEK_IN_MONTH') as Precision
  const text = (value: number | null | undefined) => (value == null ? '' : String(value))
  return {
    precision,
    monthFrom: text(schedule?.monthFrom),
    monthTo: text(schedule?.monthTo),
    weekFrom: text(schedule?.weekFrom),
    weekTo: text(schedule?.weekTo),
    weekLabel: schedule?.weekLabel ?? '',
    unit: row?.unit ?? '',
    content: row?.content ?? '',
    standards: (row?.achievementStandards ?? []).map((standard) => (standard.code ? `[${standard.code}] ${standard.text ?? ''}` : standard.text ?? '')).join('\n'),
    teachingMethods: (row?.teachingMethods ?? []).join(', '),
    assessmentMethods: (row?.assessmentMethods ?? []).join(', '),
    specialSchedule: row?.specialSchedule ?? '',
    note: row?.note ?? '',
    page: text(row?.pdfPageNumber),
  }
}

const list = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
const standardsOf = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^\[([^\]]{1,50})\]\s*(.*)$/.exec(line)
      return match ? { code: match[1], text: match[2] || null } : { code: null, text: line }
    })
const numberOf = (value: string) => (value.trim() === '' ? null : Number(value))

/** 화면 검증 (서버 규칙과 같다 — 서버가 최종 검증) */
function validate(values: Values, pageCount: number | null): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.unit.trim() && !values.content.trim() && !values.specialSchedule.trim()) errors.content = reasonText['row.content|required']
  const monthFrom = numberOf(values.monthFrom)
  const monthTo = numberOf(values.monthTo)
  const weekFrom = numberOf(values.weekFrom)
  const weekTo = numberOf(values.weekTo)
  if (['MONTH', 'MONTH_RANGE', 'WEEK_IN_MONTH'].includes(values.precision) && monthFrom === null) errors.monthFrom = reasonText['row.schedule.monthFrom|required']
  if (values.precision === 'MONTH_RANGE' && monthTo === null) errors.monthTo = reasonText['row.schedule.monthTo|required']
  if (['WEEK_IN_MONTH', 'TERM_WEEK'].includes(values.precision) && weekFrom === null) errors.weekFrom = reasonText['row.schedule.weekFrom|required']
  for (const [key, value] of [['weekFrom', weekFrom], ['weekTo', weekTo]] as const) {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 25)) errors[key] = '주차는 1~25 사이로 적어 주세요.'
  }
  if (weekFrom !== null && weekTo !== null && weekFrom > weekTo) errors.weekTo = reasonText['row.schedule.weekTo|out_of_range']
  if (values.page.trim()) {
    const page = Number(values.page)
    if (pageCount === null) errors.page = reasonText['row.pdfPageNumber|not_allowed']
    else if (!Number.isInteger(page) || page < 1 || page > pageCount) errors.page = `원문 쪽은 1~${pageCount} 사이로 적어 주세요.`
  }
  return errors
}

function toInput(values: Values, subjectIndex: number, status: TeachingPlanManualRowInput['status']): TeachingPlanManualRowInput {
  const usesMonth = values.precision !== 'TERM_WEEK' && values.precision !== 'UNKNOWN'
  const usesWeek = values.precision === 'WEEK_IN_MONTH' || values.precision === 'TERM_WEEK'
  const weekFrom = usesWeek ? numberOf(values.weekFrom) : null
  return {
    subjectIndex,
    status,
    unit: values.unit.trim() || null,
    content: values.content.trim() || null,
    note: values.note.trim() || null,
    specialSchedule: values.specialSchedule.trim() || null,
    achievementStandards: standardsOf(values.standards),
    teachingMethods: list(values.teachingMethods),
    assessmentMethods: list(values.assessmentMethods),
    schedule: {
      precision: values.precision,
      monthFrom: usesMonth ? numberOf(values.monthFrom) : null,
      monthTo: values.precision === 'MONTH_RANGE' ? numberOf(values.monthTo) : null,
      weekFrom,
      weekTo: usesWeek ? (numberOf(values.weekTo) ?? weekFrom) : null,
      weekLabel: usesWeek ? values.weekLabel.trim() || null : null,
    },
    pdfPageNumber: values.page.trim() ? Number(values.page) : null,
  }
}

export function TeachingPlanManualRowForm({
  subjectIndex,
  subjectName,
  row,
  pageCount,
  disabledReason,
  onSubmit,
  onCancel,
}: {
  subjectIndex: number
  subjectName: string
  /** 수정이면 기존 추가 행 */
  row?: TeachingPlanManualRow
  /** PDF 쪽 수 (HWP·HWPX = null → 쪽 입력 없음) */
  pageCount: number | null
  /** 지금 저장할 수 없는 이유(행 결정 저장 중 등) */
  disabledReason: string | null
  onSubmit: (input: TeachingPlanManualRowInput) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState<Values>(() => initialValues(row))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const id = useId()
  const set = (key: keyof Values) => (event: { target: { value: string } }) => setValues((previous) => ({ ...previous, [key]: event.target.value }))
  const usesMonth = values.precision !== 'TERM_WEEK' && values.precision !== 'UNKNOWN'
  const usesWeek = values.precision === 'WEEK_IN_MONTH' || values.precision === 'TERM_WEEK'

  const submit = async () => {
    if (pendingRef.current || disabledReason) return
    const found = validate(values, pageCount)
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length) return
    pendingRef.current = true
    setPending(true)
    try {
      await onSubmit(toInput(values, subjectIndex, row?.status ?? 'INCLUDED'))
    } catch (cause) {
      setServerError(manualRowErrorText(cause))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const field = (key: string, label: string, control: ReactNode) => (
    <label className={styles.formRow} htmlFor={`${id}-${key}`}>
      <span>{label}</span>
      <span style={{ display: 'grid', gap: 4 }}>
        {control}
        {errors[key] && (
          <span className={styles.statusText} data-tone="danger" id={`${id}-${key}-error`}>
            {errors[key]}
          </span>
        )}
      </span>
    </label>
  )
  const invalid = (key: string) => ({ 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined })

  return (
    <form
      className={styles.formStack}
      style={{ gap: 10, padding: 14, border: '1px solid var(--as-color-border, #e5e8eb)', borderRadius: 12, marginTop: 8 }}
      aria-label={`${subjectName} 운영계획 ${row ? '추가 행 수정' : '새 행 추가'}`}
      data-testid="teaching-plan-manual-form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className={styles.tiny} style={{ margin: 0 }}>
        {subjectName} · 관리자 직접 추가 행 — 분석 결과에 없던 행이에요. 원문에 적힌 시기 단위를 고르고, 적혀 있지 않은 날짜·연도는 만들지 않아요. 확정하기 전까지 학생에게 보이지 않아요.
      </p>
      {field(
        'precision',
        '시기 단위',
        <select id={`${id}-precision`} className={styles.select} value={values.precision} onChange={set('precision')} data-testid="manual-precision">
          {precisionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>,
      )}
      {usesMonth &&
        field(
          'monthFrom',
          values.precision === 'MONTH_RANGE' ? '시작 월' : '월',
          <select id={`${id}-monthFrom`} className={styles.select} value={values.monthFrom} onChange={set('monthFrom')} data-testid="manual-month-from" {...invalid('monthFrom')}>
            <option value="">선택</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>,
        )}
      {values.precision === 'MONTH_RANGE' &&
        field(
          'monthTo',
          '끝 월',
          <select id={`${id}-monthTo`} className={styles.select} value={values.monthTo} onChange={set('monthTo')} data-testid="manual-month-to" {...invalid('monthTo')}>
            <option value="">선택</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>,
        )}
      {usesWeek && (
        <>
          {field('weekFrom', values.precision === 'TERM_WEEK' ? '학기 주차' : '주차', <input id={`${id}-weekFrom`} className={styles.input} inputMode="numeric" value={values.weekFrom} onChange={set('weekFrom')} placeholder="예: 3" data-testid="manual-week-from" {...invalid('weekFrom')} />)}
          {field('weekTo', '끝 주차(선택)', <input id={`${id}-weekTo`} className={styles.input} inputMode="numeric" value={values.weekTo} onChange={set('weekTo')} placeholder="한 주면 비워 두세요" data-testid="manual-week-to" {...invalid('weekTo')} />)}
          {field('weekLabel', '원문 표기(선택)', <input id={`${id}-weekLabel`} className={styles.input} maxLength={100} value={values.weekLabel} onChange={set('weekLabel')} placeholder="원문에 적힌 그대로 (예: 3월 3주)" />)}
        </>
      )}
      {field('unit', '단원', <input id={`${id}-unit`} className={styles.input} maxLength={300} value={values.unit} onChange={set('unit')} data-testid="manual-unit" {...invalid('content')} />)}
      {field('content', '학습 내용', <textarea id={`${id}-content`} className={styles.input} style={{ height: 72, paddingTop: 8 }} maxLength={4000} value={values.content} onChange={set('content')} data-testid="manual-content" {...invalid('content')} />)}
      {field('standards', '성취기준(선택)', <textarea id={`${id}-standards`} className={styles.input} style={{ height: 56, paddingTop: 8 }} value={values.standards} onChange={set('standards')} placeholder="한 줄에 하나 · [코드] 내용" />)}
      {field('teachingMethods', '교수·학습 방법', <input id={`${id}-teachingMethods`} className={styles.input} value={values.teachingMethods} onChange={set('teachingMethods')} placeholder="쉼표로 구분 (선택)" />)}
      {field('assessmentMethods', '평가 방법', <input id={`${id}-assessmentMethods`} className={styles.input} value={values.assessmentMethods} onChange={set('assessmentMethods')} placeholder="쉼표로 구분 (선택)" />)}
      {field('specialSchedule', '특별 일정', <input id={`${id}-specialSchedule`} className={styles.input} maxLength={200} value={values.specialSchedule} onChange={set('specialSchedule')} placeholder="선택" />)}
      {field('note', '비고', <input id={`${id}-note`} className={styles.input} maxLength={1000} value={values.note} onChange={set('note')} placeholder="선택" />)}
      {pageCount !== null &&
        field('page', '원문 쪽(선택)', <input id={`${id}-page`} className={styles.input} inputMode="numeric" value={values.page} onChange={set('page')} placeholder={`관리자가 확인한 PDF 쪽 (1~${pageCount})`} data-testid="manual-page" {...invalid('page')} />)}
      {(serverError || disabledReason) && (
        <p role="alert" className={styles.statusText} data-tone="danger" style={{ margin: 0 }} data-testid="manual-error">
          {serverError ?? disabledReason}
        </p>
      )}
      <div className={styles.rowButtons}>
        <button type="submit" className={`${styles.buttonDark} ${styles.small}`} disabled={pending || Boolean(disabledReason)} aria-busy={pending} data-testid="manual-save">
          {pending ? '저장하는 중…' : row ? '추가 행 수정 저장' : '추가 행 저장'}
        </button>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={onCancel} disabled={pending}>
          취소
        </button>
      </div>
    </form>
  )
}
