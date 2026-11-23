import { useId, useRef, useState, type FormEvent } from 'react'
import { toApiError, type ApiError } from '../api/apiError.ts'
import { updateSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { SchoolAssessment, UpdateSchoolAssessmentRequest } from '../api/types.ts'
import { isAssessmentReadOnlyView } from '../api/viewMode.ts'
import { personalDetailsOf, personalDetailsPayload, submissionError, typeLabelError, weightError, type PersonalDetailsValue } from '../model/personalDetails.ts'
import { AlertIcon } from './AssessmentIcons.tsx'
import styles from './AddSchoolAssessmentModal.module.css'
import { Modal } from './Modal.tsx'
import { PersonalDetailsFields } from './PersonalDetailsFields.tsx'
import { ReadOnlyBlockedModal } from './ReadOnlyBlockedModal.tsx'

interface EditSchoolAssessmentModalProps {
  assessment: SchoolAssessment
  onClose: () => void
  onSaved: (updated: SchoolAssessment) => void
}

type FieldErrors = Partial<Record<'title' | 'description' | 'deadlineDate' | 'evaluationDate' | 'weightPercent' | 'form', string>>

const reasonMessages: Record<string, Record<string, string>> = {
  title: { required: '수행평가 이름을 입력해 주세요.', size: '이름이 너무 길어요.' },
  description: { size: '수행 내용이 너무 길어요.' },
  deadlineDate: { format: '날짜 형식을 확인해 주세요.' },
  evaluationDate: { format: '날짜 형식을 확인해 주세요.' },
  weightPercent: { range: '0~100 사이 숫자로 입력해 주세요.', type: '0~100 사이 숫자로 입력해 주세요.' },
}

const fromAssessment = (assessment: SchoolAssessment): PersonalDetailsValue => personalDetailsOf(assessment)

// ST-03 학생 개인 관리 정보 수정 (api-contract.md §12 PATCH, A27-UX 확장).
// 이름·평가 유형·평가일·제출 마감·반영 비율·제출물·수행 내용·개인 메모를 바꾼다. 과목·평가계획서 연결은 바꾸지 않는다.
// 진행 상태는 상세 화면의 상태 선택(§13)에서 바꾼다(되돌리기 포함). 바뀐 값만 PATCH로 보낸다.
function EditSchoolAssessmentForm({ assessment, onClose, onSaved }: EditSchoolAssessmentModalProps) {
  const ids = { title: useId() }
  const titleRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const initial = fromAssessment(assessment)
  const [title, setTitle] = useState(assessment.title)
  const [details, setDetails] = useState<PersonalDetailsValue>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)

  const trimmedTitle = title.trim()
  const next = personalDetailsPayload(details)
  const before = personalDetailsPayload(initial)
  const request: UpdateSchoolAssessmentRequest = {}
  if (trimmedTitle !== assessment.title) request.title = trimmedTitle
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (next[key] !== before[key]) (request as Record<string, unknown>)[key] = next[key]
  }
  const changed = Object.keys(request).length > 0
  const canSubmit = changed && trimmedTitle !== '' && !submitting && !weightError(details.weightPercent) && !typeLabelError(details) && !submissionError(details)

  const requestClose = () => {
    if (submitting) return
    if (changed && !confirmingClose) {
      setConfirmingClose(true)
      return
    }
    onClose()
  }

  const applyServerError = (error: ApiError) => {
    if (error.code === 'VALIDATION_ERROR') {
      const nextErrors: FieldErrors = {}
      for (const [field, reason] of Object.entries(error.fieldReasons())) {
        if (field in reasonMessages) nextErrors[field as keyof FieldErrors] = reasonMessages[field]?.[reason] ?? `입력값을 확인해 주세요. (${reason})`
        else nextErrors.form = `${error.message} (${field})`
      }
      setErrors(nextErrors)
      if (nextErrors.title) titleRef.current?.focus()
      return
    }
    if (error.code === 'ASSESSMENT_NOT_FOUND') {
      setErrors({ form: '이 수행평가를 찾을 수 없어요. 삭제되었거나 접근할 수 없는 수행평가예요.' })
      return
    }
    setErrors({ form: `${error.message} 입력한 내용은 그대로 있어요. 다시 저장해 주세요.` })
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
      title="수행평가 정보 수정"
      description="내 관리용 정보예요. 학교가 공개한 공식 평가정보는 바뀌지 않아요."
      onRequestClose={requestClose}
      initialFocusRef={titleRef}
      footer={
        confirmingClose ? (
          <div className={styles.confirm} role="alert">
            <span>저장하지 않은 내용이 사라져요. 닫을까요?</span>
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
            <button type="submit" form="edit-school-assessment-form" className={styles.primaryButton} disabled={!canSubmit} aria-busy={submitting} title={!changed ? '바뀐 내용이 없어요' : undefined} data-testid="edit-assessment-save">
              {submitting ? '저장 중…' : '저장'}
            </button>
          </>
        )
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
            disabled={submitting}
            readOnly={Boolean(assessment.official)}
            aria-describedby={assessment.official ? `${ids.title}-official` : undefined}
            onChange={(event) => {
              setTitle(event.target.value)
              if (errors.title) setErrors((previous) => ({ ...previous, title: undefined }))
            }}
          />
          {errors.title && <p className={styles.fieldError}>{errors.title}</p>}
          {/* A28-20: 학교 확정 수행평가의 이름은 학교 확정본 값이라 바꿀 수 없다(내 날짜·유형·메모는 바꿀 수 있음) */}
          {assessment.official && (
            <p id={`${ids.title}-official`} className={styles.hint}>
              학교 확정 수행평가라 이름은 바꿀 수 없어요.
            </p>
          )}
        </div>
        <PersonalDetailsFields
          value={details}
          onChange={(patch) => setDetails((previous) => ({ ...previous, ...patch }))}
          disabled={submitting}
          errors={{ deadlineDate: errors.deadlineDate, evaluationDate: errors.evaluationDate, weightPercent: errors.weightPercent }}
        />
      </form>
    </Modal>
  )
}

/** 관리자 읽기 전용 보기(P-28)에서는 입력 폼 대신 안내만 연다 */
export function EditSchoolAssessmentModal(props: EditSchoolAssessmentModalProps) {
  return isAssessmentReadOnlyView() ? <ReadOnlyBlockedModal onClose={props.onClose} /> : <EditSchoolAssessmentForm {...props} />
}
