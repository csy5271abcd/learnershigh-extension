import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toApiError } from '../../api/apiError.ts'
import type { SchoolAssessment, SchoolAssessmentType, UpdateSchoolAssessmentRequest } from '../../api/types.ts'
import {
  assessmentTypeLabels,
  assessmentTypeOrder,
  submissionChoice,
  submissionOptions,
  submissionOther,
  submissionValue,
} from '../../model/personalDetails.ts'
import styles from './inlineMeta.module.css'

// A27-UX 학생 수행평가 상세(2026-11-19, 이미지 09): Notion처럼 값 자리를 눌러 그 자리에서 추가·수정한다(전체 수정 Modal을 다시 열지 않는다).
// - 한 필드만 PATCH로 보낸다(§12 PATCH는 보낸 필드만 바꾸고 나머지는 유지 → 다른 필드 손실 없음).
// - 저장 중 표시, 실패하면 이전 값으로 되돌리고 이유와 '다시 시도'를 보인다. Enter 저장 · Esc 취소 · 바깥 클릭은 바뀐 값이 있으면 저장.
// - 학생 개인 관리 값만 고친다. 학교·관리자 확정 공개값은 '평가 기준' Section에서 읽기 전용으로 본다.

type Saver = (request: UpdateSchoolAssessmentRequest) => Promise<void>

interface InlineRowProps {
  label: string
  icon: ReactNode
  testId: string
  display: ReactNode
  empty: boolean
  emptyText?: string
  readOnly: boolean
  hint?: ReactNode
  /** 편집기를 그린다. done(request)로 저장, cancel()로 취소 */
  editor: (controls: { save: (request: UpdateSchoolAssessmentRequest) => void; cancel: () => void }) => ReactNode
  saver: Saver
}

export function InlineRow({ label, icon, testId, display, empty, emptyText = '추가', readOnly, hint, editor, saver }: InlineRowProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ message: string; retry: UpdateSchoolAssessmentRequest } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // 편집을 마치면(저장·취소) 값 버튼으로 Focus를 돌려준다
  const [focusBack, setFocusBack] = useState(0)
  useEffect(() => {
    if (focusBack > 0) triggerRef.current?.focus()
  }, [focusBack])

  const save = async (request: UpdateSchoolAssessmentRequest) => {
    setSaving(true)
    setError(null)
    try {
      await saver(request)
      setEditing(false)
      setFocusBack((value) => value + 1)
    } catch (cause) {
      const apiError = toApiError(cause)
      // 실패: 화면 값은 서버 값 그대로(되돌림) — 편집기를 닫고 이유와 다시 시도를 보인다
      setEditing(false)
      setError({ message: `${label}을(를) 저장하지 못했어요. ${apiError.message}`, retry: request })
    } finally {
      setSaving(false)
    }
  }
  const cancel = () => {
    setEditing(false)
    setFocusBack((value) => value + 1)
  }

  return (
    <div className={styles.row} data-testid={testId}>
      <dt className={styles.label}>
        {icon}
        {label}
      </dt>
      <dd className={styles.value}>
        {editing ? (
          <div
            className={styles.editor}
            data-saving={saving || undefined}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancel()
              }
            }}
          >
            {editor({ save: (request) => void save(request), cancel })}
            {saving && <span className={styles.saving} role="status">저장 중…</span>}
          </div>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            data-empty={empty || undefined}
            disabled={readOnly}
            title={readOnly ? '관리자 읽기 전용 보기에서는 바꿀 수 없어요' : `${label} ${empty ? '추가' : '수정'}`}
            onClick={() => {
              setError(null)
              setEditing(true)
            }}
            data-testid={`${testId}-trigger`}
          >
            {empty ? <span className={styles.placeholder}>{readOnly ? '미입력' : `+ ${emptyText}`}</span> : display}
          </button>
        )}
        {!editing && hint}
        {error && (
          <span className={styles.error} role="alert" data-testid={`${testId}-error`}>
            {error.message}
            <button type="button" className={styles.retry} onClick={() => void save(error.retry)}>
              다시 시도
            </button>
          </span>
        )}
      </dd>
    </div>
  )
}

/** 바깥을 누르면 onOutside (바뀐 값이 있으면 저장, 없으면 닫기는 호출 측이 정한다) */
function useOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  const handler = useRef(onOutside)
  useEffect(() => {
    handler.current = onOutside
  })
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler.current()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref])
}

// ---- 필드별 편집기 ----

export function TypeEditor({ item, save, cancel }: { item: SchoolAssessment; save: (request: UpdateSchoolAssessmentRequest) => void; cancel: () => void }) {
  const [type, setType] = useState<SchoolAssessmentType | ''>(item.assessmentType ?? '')
  const [label, setLabel] = useState(item.assessmentTypeLabel ?? '')
  const ref = useRef<HTMLDivElement>(null)
  const commit = (nextType = type, nextLabel = label) => {
    const request: UpdateSchoolAssessmentRequest = {}
    if ((nextType || null) !== (item.assessmentType ?? null)) request.assessmentType = nextType || null
    const labelValue = nextType === 'OTHER' ? nextLabel.trim() || null : null
    if (nextType === 'OTHER' && labelValue !== (item.assessmentTypeLabel ?? null)) request.assessmentTypeLabel = labelValue
    if (Object.keys(request).length === 0) cancel()
    else save(request)
  }
  useOutside(ref, () => commit())
  return (
    <div ref={ref} className={styles.inline}>
      <select
        className={styles.select}
        value={type}
        autoFocus
        aria-label="평가 유형"
        onChange={(event) => {
          const next = event.target.value as SchoolAssessmentType | ''
          setType(next)
          if (next !== 'OTHER') commit(next, '')
        }}
        data-testid="inline-type-select"
      >
        <option value="">미입력</option>
        {assessmentTypeOrder.map((value) => (
          <option key={value} value={value}>
            {assessmentTypeLabels[value]}
          </option>
        ))}
      </select>
      {type === 'OTHER' && (
        <input
          className={styles.input}
          value={label}
          maxLength={50}
          placeholder="평가 유형 직접 입력 (예: 모의 면접)"
          aria-label="평가 유형 직접 입력"
          autoFocus
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              commit()
            }
          }}
          data-testid="inline-type-label"
        />
      )}
    </div>
  )
}

export function DateEditor({ field, value, label, save, cancel }: { field: 'evaluationDate' | 'deadlineDate'; value: string | null | undefined; label: string; save: (request: UpdateSchoolAssessmentRequest) => void; cancel: () => void }) {
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef<HTMLDivElement>(null)
  const commit = (next = draft) => {
    if ((next || null) === (value ?? null)) cancel()
    else save({ [field]: next || null })
  }
  useOutside(ref, () => commit())
  return (
    <div ref={ref} className={styles.inline}>
      <input
        type="date"
        className={styles.input}
        value={draft}
        autoFocus
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
        data-testid={`inline-${field}`}
      />
      <button type="button" className={styles.small} onClick={() => commit()}>
        저장
      </button>
      {value && (
        <button type="button" className={styles.small} onClick={() => commit('')} data-testid={`inline-${field}-clear`}>
          날짜 지우기
        </button>
      )}
    </div>
  )
}

const weightOptions = Array.from({ length: 21 }, (_, index) => index * 5)

export function WeightEditor({ value, save, cancel }: { value: number | null | undefined; save: (request: UpdateSchoolAssessmentRequest) => void; cancel: () => void }) {
  const initialPreset = value === null || value === undefined ? '' : weightOptions.includes(value) ? String(value) : 'custom'
  const [preset, setPreset] = useState(initialPreset)
  const [custom, setCustom] = useState(initialPreset === 'custom' ? String(value) : '')
  const [problem, setProblem] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const commit = (nextPreset = preset, nextCustom = custom) => {
    let next: number | null
    if (nextPreset === '') next = null
    else if (nextPreset === 'custom') {
      if (!/^\d{1,3}$/.test(nextCustom.trim()) || Number(nextCustom) > 100) {
        setProblem('0~100 사이 숫자로 입력해 주세요.')
        return
      }
      next = Number(nextCustom)
    } else next = Number(nextPreset)
    if (next === (value ?? null)) cancel()
    else save({ weightPercent: next })
  }
  useOutside(ref, () => (problem ? cancel() : commit()))
  return (
    <div ref={ref} className={styles.inline}>
      <select
        className={styles.select}
        value={preset}
        autoFocus
        aria-label="반영 비율"
        onChange={(event) => {
          setPreset(event.target.value)
          setProblem(null)
          if (event.target.value !== 'custom') commit(event.target.value)
        }}
        data-testid="inline-weight-select"
      >
        <option value="">미정</option>
        {weightOptions.map((option) => (
          <option key={option} value={option}>
            {option}%
          </option>
        ))}
        <option value="custom">직접 입력</option>
      </select>
      {preset === 'custom' && (
        <>
          <input
            className={styles.input}
            inputMode="numeric"
            value={custom}
            placeholder="0~100"
            aria-label="반영 비율 직접 입력"
            aria-invalid={problem ? true : undefined}
            autoFocus
            onChange={(event) => {
              setCustom(event.target.value)
              setProblem(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            data-testid="inline-weight-custom"
          />
          <span className={styles.unit}>%</span>
        </>
      )}
      {problem && (
        <span className={styles.fieldError} role="alert">
          {problem}
        </span>
      )}
    </div>
  )
}

export function SubmissionEditor({ value, save, cancel }: { value: string | null | undefined; save: (request: UpdateSchoolAssessmentRequest) => void; cancel: () => void }) {
  const initial = submissionChoice(value)
  const [choice, setChoice] = useState(initial.choice)
  const [custom, setCustom] = useState(initial.custom)
  const ref = useRef<HTMLDivElement>(null)
  const commit = (nextChoice = choice, nextCustom = custom) => {
    const next = submissionValue(nextChoice, nextCustom)
    if (next === (value ?? null)) cancel()
    else save({ submissions: next })
  }
  useOutside(ref, () => commit())
  return (
    <div ref={ref} className={styles.inline}>
      <select
        className={styles.select}
        value={choice}
        autoFocus
        aria-label="제출물"
        onChange={(event) => {
          setChoice(event.target.value)
          if (event.target.value !== submissionOther) commit(event.target.value, '')
        }}
        data-testid="inline-submission-select"
      >
        <option value="">미정</option>
        {submissionOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={submissionOther}>기타 (직접 입력)</option>
      </select>
      {choice === submissionOther && (
        <input
          className={styles.input}
          value={custom}
          maxLength={500}
          placeholder="제출물 직접 입력"
          aria-label="제출물 직접 입력"
          autoFocus
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              commit()
            }
          }}
          data-testid="inline-submission-custom"
        />
      )}
    </div>
  )
}
