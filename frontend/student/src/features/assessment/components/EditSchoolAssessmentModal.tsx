import { useId, useRef, useState, type FormEvent } from 'react'
import { toApiError, type ApiError } from '../api/apiError.ts'
import { updateSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { SchoolAssessment, UpdateSchoolAssessmentRequest } from '../api/types.ts'
import { isAssessmentReadOnlyView } from '../api/viewMode.ts'
import { AlertIcon } from './AssessmentIcons.tsx'
import styles from './AddSchoolAssessmentModal.module.css'
import { Modal } from './Modal.tsx'
import { ReadOnlyBlockedModal } from './ReadOnlyBlockedModal.tsx'

interface EditSchoolAssessmentModalProps {
  assessment: SchoolAssessment
  onClose: () => void
  onSaved: (updated: SchoolAssessment) => void
}

type FieldErrors = Partial<Record<'title' | 'description' | 'deadlineDate' | 'form', string>>

const reasonMessages: Record<string, Record<string, string>> = {
  title: { required: '수행평가 이름을 입력해 주세요.', size: '이름이 너무 길어요.' },
  description: { size: '설명이 너무 길어요.' },
  deadlineDate: { format: '날짜 형식을 확인해 주세요.' },
}

// ST-03 학생 개인 관리 정보 수정 (api-contract.md §12 PATCH). 바꿀 수 있는 값은 제목·설명·마감일뿐이다(C-3, Backend 기준).
// 과목·상태·공식 평가 항목 참조(evaluationItemRef)는 이 화면에서 바꾸지 않는다.
// 상세 응답(§12)에 설명이 없어 현재 설명을 미리 채울 수 없다. 그래서 학생이 "설명 바꾸기"를 켠 경우에만 설명을 보낸다
// (보내지 않으면 서버의 기존 설명이 그대로 남는다). 바뀐 값만 PATCH로 보낸다.
function EditSchoolAssessmentForm({ assessment, onClose, onSaved }: EditSchoolAssessmentModalProps) {
  const ids = { title: useId(), deadline: useId(), description: useId(), replace: useId() }
  const titleRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [title, setTitle] = useState(assessment.title)
  const [deadlineDate, setDeadlineDate] = useState(assessment.deadlineDate ?? '')
  const [replaceDescription, setReplaceDescription] = useState(false)
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const trimmedTitle = title.trim()
  const request: UpdateSchoolAssessmentRequest = {}
  if (trimmedTitle !== assessment.title) request.title = trimmedTitle
  if ((deadlineDate || null) !== assessment.deadlineDate) request.deadlineDate = deadlineDate || null
  if (replaceDescription) request.description = description.trim() || null
  const changed = Object.keys(request).length > 0
  const canSubmit = changed && trimmedTitle !== '' && !submitting

  const applyServerError = (error: ApiError) => {
    if (error.code === 'VALIDATION_ERROR') {
      const next: FieldErrors = {}
      for (const [field, reason] of Object.entries(error.fieldReasons())) {
        if (field === 'title' || field === 'description' || field === 'deadlineDate') {
          next[field] = reasonMessages[field]?.[reason] ?? `입력값을 확인해 주세요. (${reason})`
        } else {
          next.form = `${error.message} (${field}: ${reason})`
        }
      }
      setErrors(next)
      if (next.title) titleRef.current?.focus()
      return
    }
    if (error.code === 'ASSESSMENT_NOT_FOUND') {
      setErrors({ form: '이 수행평가를 찾을 수 없어요. 삭제되었거나 접근할 수 없는 수행평가예요. (ASSESSMENT_NOT_FOUND)' })
      return
    }
    setErrors({ form: `${error.message} 입력한 내용은 그대로 있어요. 다시 저장해 주세요. (${error.code})` })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return // 중복 제출 방지
    if (trimmedTitle === '') {
      setErrors({ title: reasonMessages.title.required })
      titleRef.current?.focus()
      return
    }
    if (!changed) return
    submittingRef.current = true
    setSubmitting(true)
    setErrors({})
    try {
      onSaved(await updateSchoolAssessment(assessment.assessmentId, request))
    } catch (error) {
      applyServerError(toApiError(error))
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="평가 정보 수정"
      description="내 수행평가의 이름·마감일·설명만 바꿀 수 있어요. 과목·진행 상태·평가계획서 연결은 바뀌지 않아요."
      onRequestClose={() => !submitting && onClose()}
      initialFocusRef={titleRef}
      footer={
        <>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button
            type="submit"
            form="edit-school-assessment-form"
            className={styles.primaryButton}
            disabled={!canSubmit}
            aria-busy={submitting}
            title={!changed ? '바뀐 내용이 없어요' : undefined}
            data-testid="edit-assessment-save"
          >
            {submitting ? '저장 중…' : '저장'}
          </button>
        </>
      }
    >
      <form id="edit-school-assessment-form" className={styles.form} noValidate onSubmit={onSubmit}>
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
            autoComplete="off"
            required
            maxLength={200}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${ids.title}-error` : undefined}
            disabled={submitting}
            onChange={(event) => {
              setTitle(event.target.value)
              if (errors.title) setErrors((previous) => ({ ...previous, title: undefined }))
            }}
          />
          {errors.title && (
            <p id={`${ids.title}-error`} className={styles.fieldError}>
              {errors.title}
            </p>
          )}
        </div>
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
            {errors.deadlineDate ?? '날짜를 지우고 저장하면 "날짜 미정"이 돼요.'}
          </p>
          {deadlineDate !== '' && (
            <button type="button" className={styles.ghostButton} onClick={() => setDeadlineDate('')} disabled={submitting}>
              날짜 미정으로 바꾸기
            </button>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={ids.replace}>
            <input
              id={ids.replace}
              type="checkbox"
              checked={replaceDescription}
              disabled={submitting}
              onChange={(event) => setReplaceDescription(event.target.checked)}
            />{' '}
            설명 바꾸기
          </label>
          <p className={styles.hint}>
            지금 저장된 설명은 이 화면에서 불러오지 못해요(서버 응답에 설명이 없음). 바꾸지 않으면 기존 설명이 그대로 남아요. 켜고 비워 두면 설명이 지워져요.
          </p>
          {replaceDescription && (
            <>
              <label htmlFor={ids.description} className="lh-visually-hidden">
                새 설명
              </label>
              <textarea
                id={ids.description}
                className={styles.textarea}
                value={description}
                rows={3}
                maxLength={2000}
                placeholder="선생님이 안내한 내용이나 준비할 점을 적어 두세요"
                disabled={submitting}
                aria-invalid={errors.description ? true : undefined}
                onChange={(event) => setDescription(event.target.value)}
              />
              {errors.description && <p className={styles.fieldError}>{errors.description}</p>}
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}

/** 관리자 읽기 전용 보기(P-28)에서는 입력 폼 대신 안내만 연다 */
export function EditSchoolAssessmentModal(props: EditSchoolAssessmentModalProps) {
  return isAssessmentReadOnlyView() ? <ReadOnlyBlockedModal onClose={props.onClose} /> : <EditSchoolAssessmentForm {...props} />
}
