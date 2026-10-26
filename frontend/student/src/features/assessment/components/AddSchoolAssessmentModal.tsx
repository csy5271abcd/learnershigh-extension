import { useId, useRef, useState, type FormEvent } from 'react'
import { toApiError, type ApiError } from '../api/apiError.ts'
import { createSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { AcademicContext, SchoolAssessment } from '../api/types.ts'
import { termLabel } from '../model/academicTerm.ts'
import { AlertIcon, ChevronDownIcon } from './AssessmentIcons.tsx'
import styles from './AddSchoolAssessmentModal.module.css'
import { Modal } from './Modal.tsx'

interface AddSchoolAssessmentModalProps {
  context: AcademicContext
  /** 과목별 목록에서 열면 해당 과목을 미리 선택한다 */
  initialSubjectId?: string
  /** 같은 학기에 이미 있는 과제명 (중복 가능성 안내용, 자동 병합하지 않는다) */
  existingTitles: string[]
  onClose: () => void
  onCreated: (created: SchoolAssessment) => void
}

type FieldErrors = Partial<Record<'title' | 'subjectId' | 'deadlineDate' | 'form', string>>

const reasonMessages: Record<string, Record<string, string>> = {
  title: { required: '수행평가 이름을 입력해 주세요.' },
  subjectId: { required: '과목을 선택해 주세요.', unknown: '선택한 학기에 없는 과목이에요. 다시 선택해 주세요.' },
  deadlineDate: { format: '날짜 형식을 확인해 주세요.' },
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko')
}

// ST-03 등록 B — 직접 입력 (assessment-student.md §6, api-contract.md §12 POST).
// 제목·과목만 필수다. 마감일·설명은 선택이며, 학교가 공개하지 않은 값을 채워 넣지 않는다.
// Mockup의 평가 유형·반영비율·평가일·평가기준·안내문 첨부·개인 메모는 §12 계약에 없어 보류한다 (screen-map MM-03).
export function AddSchoolAssessmentModal({
  context,
  initialSubjectId,
  existingTitles,
  onClose,
  onCreated,
}: AddSchoolAssessmentModalProps) {
  const ids = { title: useId(), subject: useId(), deadline: useId(), description: useId(), more: useId() }
  const titleRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState(
    context.subjects.some((subject) => subject.subjectId === initialSubjectId) ? (initialSubjectId ?? '') : '',
  )
  const [deadlineDate, setDeadlineDate] = useState('')
  const [description, setDescription] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)

  const trimmedTitle = title.trim()
  const canSubmit = trimmedTitle !== '' && subjectId !== '' && !submitting
  const isDirty = title !== '' || subjectId !== (initialSubjectId ?? '') || deadlineDate !== '' || description !== ''
  const duplicate = trimmedTitle !== '' && existingTitles.some((existing) => normalizeTitle(existing) === normalizeTitle(title))

  const titleError = errors.title ?? (titleTouched && trimmedTitle === '' ? reasonMessages.title.required : undefined)

  const requestClose = () => {
    if (submitting) return
    if (isDirty && !confirmingClose) {
      setConfirmingClose(true)
      return
    }
    onClose()
  }

  const applyServerError = (error: ApiError) => {
    if (error.code === 'VALIDATION_ERROR') {
      const next: FieldErrors = {}
      for (const [field, reason] of Object.entries(error.fieldReasons())) {
        if (field === 'title' || field === 'subjectId' || field === 'deadlineDate') {
          next[field] = reasonMessages[field]?.[reason] ?? `입력값을 확인해 주세요. (${reason})`
        } else {
          next.form = `${error.message} (${field})`
        }
      }
      setErrors(next)
      if (next.title) titleRef.current?.focus()
      return
    }
    setErrors({ form: `${error.message} 입력한 내용은 그대로 있어요. 다시 저장해 주세요. (${error.code})` })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // 중복 제출 방지: 진행 중인 요청이 있으면 무시한다 (버튼 비활성 이전의 연속 입력 포함).
    if (submittingRef.current) return
    setTitleTouched(true)
    if (trimmedTitle === '' || subjectId === '') {
      setErrors({
        title: trimmedTitle === '' ? reasonMessages.title.required : undefined,
        subjectId: subjectId === '' ? reasonMessages.subjectId.required : undefined,
      })
      if (trimmedTitle === '') titleRef.current?.focus()
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setErrors({})
    setConfirmingClose(false)
    try {
      const created = await createSchoolAssessment({
        title: trimmedTitle,
        subjectId,
        academicYear: context.academicYear,
        semester: context.semester,
        deadlineDate: deadlineDate || null,
        description: description.trim() || null,
        status: 'BEFORE_START',
        evaluationItemRef: null,
      })
      onCreated(created)
    } catch (error) {
      applyServerError(toApiError(error))
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="수행평가 추가"
      description={`${termLabel(context)} 수행평가로 추가돼요.`}
      onRequestClose={requestClose}
      initialFocusRef={titleRef}
      footer={
        confirmingClose ? (
          <div className={styles.confirm} role="alert">
            <span>작성 중인 내용이 사라져요. 닫을까요?</span>
            <button type="button" className={styles.ghostButton} onClick={() => setConfirmingClose(false)}>
              계속 작성
            </button>
            <button type="button" className={styles.dangerButton} onClick={onClose}>
              닫기
            </button>
          </div>
        ) : (
          <>
            <button type="button" className={styles.ghostButton} onClick={requestClose} disabled={submitting}>
              취소
            </button>
            <button
              type="submit"
              form="add-school-assessment-form"
              className={styles.primaryButton}
              disabled={!canSubmit}
              aria-busy={submitting}
            >
              {submitting ? '저장 중…' : '저장'}
            </button>
          </>
        )
      }
    >
      <form id="add-school-assessment-form" className={styles.form} noValidate onSubmit={onSubmit}>
        {errors.form && (
          <p className={styles.formError} role="alert">
            <AlertIcon size={16} />
            {errors.form}
          </p>
        )}

        <div className={styles.field}>
          <label htmlFor={ids.title} className={styles.label}>
            수행평가 이름 <span className={styles.required} aria-hidden="true">*</span>
            <span className="lh-visually-hidden">(필수)</span>
          </label>
          <input
            ref={titleRef}
            id={ids.title}
            className={styles.input}
            value={title}
            placeholder="예: 학교 주변 생물 탐구"
            autoComplete="off"
            required
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? `${ids.title}-error` : duplicate ? `${ids.title}-duplicate` : undefined}
            disabled={submitting}
            onChange={(event) => {
              setTitle(event.target.value)
              if (errors.title) setErrors((previous) => ({ ...previous, title: undefined }))
            }}
            onBlur={(event) => {
              // 빈 칸 오류는 저장을 시도했거나 실제로 입력한 뒤에만 보인다 (Mockup SA-LIST-03 기본 상태).
              // 빈 상태에서 blur만으로 오류를 띄우면 아래 요소가 밀려 다른 버튼 클릭이 빗나간다.
              if (event.currentTarget.value !== '') setTitleTouched(true)
            }}
          />
          {titleError && (
            <p id={`${ids.title}-error`} className={styles.fieldError}>
              {titleError}
            </p>
          )}
          {!titleError && duplicate && (
            <p id={`${ids.title}-duplicate`} className={styles.fieldWarning}>
              이 학기에 같은 이름의 수행평가가 이미 있어요. 저장하면 별도 항목으로 추가돼요.
            </p>
          )}
        </div>

        <fieldset className={styles.field} aria-describedby={errors.subjectId ? `${ids.subject}-error` : undefined}>
          <legend className={styles.label}>
            과목 <span className={styles.required} aria-hidden="true">*</span>
            <span className="lh-visually-hidden">(필수)</span>
          </legend>
          {context.subjects.length === 0 ? (
            <p className={styles.fieldWarning}>이 학기에 등록된 과목이 없어요. 학교·학업 정보에서 과목을 확인해 주세요.</p>
          ) : (
            <div className={styles.chips}>
              {context.subjects.map((subject) => (
                <label key={subject.subjectId} className={styles.chip}>
                  <input
                    type="radio"
                    name="subjectId"
                    value={subject.subjectId}
                    checked={subjectId === subject.subjectId}
                    disabled={submitting}
                    onChange={() => {
                      setSubjectId(subject.subjectId)
                      if (errors.subjectId) setErrors((previous) => ({ ...previous, subjectId: undefined }))
                    }}
                  />
                  <span>{subject.name}</span>
                </label>
              ))}
            </div>
          )}
          {errors.subjectId && (
            <p id={`${ids.subject}-error`} className={styles.fieldError}>
              {errors.subjectId}
            </p>
          )}
        </fieldset>

        <button
          type="button"
          className={styles.moreToggle}
          aria-expanded={moreOpen}
          aria-controls={ids.more}
          onClick={() => setMoreOpen((value) => !value)}
        >
          <ChevronDownIcon size={16} className={moreOpen ? styles.chevronOpen : undefined} />
          평가 정보 더 입력하기 (선택)
        </button>

        <div id={ids.more} hidden={!moreOpen} className={styles.more}>
          <div className={styles.field}>
            <label htmlFor={ids.deadline} className={styles.label}>
              제출 마감일
            </label>
            <input
              id={ids.deadline}
              type="date"
              className={styles.input}
              value={deadlineDate}
              disabled={submitting}
              aria-invalid={errors.deadlineDate ? true : undefined}
              aria-describedby={`${ids.deadline}-hint`}
              onChange={(event) => setDeadlineDate(event.target.value)}
            />
            <p id={`${ids.deadline}-hint`} className={errors.deadlineDate ? styles.fieldError : styles.hint}>
              {errors.deadlineDate ?? '아직 모르면 비워 두세요. 나중에 확인되면 입력할 수 있어요.'}
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor={ids.description} className={styles.label}>
              설명
            </label>
            <textarea
              id={ids.description}
              className={styles.textarea}
              value={description}
              rows={3}
              placeholder="선생님이 안내한 내용이나 준비할 점을 적어 두세요"
              disabled={submitting}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
