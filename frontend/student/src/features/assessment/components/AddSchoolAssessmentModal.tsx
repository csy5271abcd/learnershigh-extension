import { useId, useRef, useState, type FormEvent } from 'react'
import { isAssessmentReadOnlyView } from '../api/viewMode.ts'
import { ReadOnlyBlockedModal } from './ReadOnlyBlockedModal.tsx'
import { toApiError, type ApiError } from '../api/apiError.ts'
import { createSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { AcademicContext, SchoolAssessment } from '../api/types.ts'
import { termLabel } from '../model/academicTerm.ts'
import { AlertIcon } from './AssessmentIcons.tsx'
import styles from './AddSchoolAssessmentModal.module.css'
import { Modal } from './Modal.tsx'
import { PersonalDetailsFields } from './PersonalDetailsFields.tsx'
import { SubjectPicker, type SubjectChoice } from './SubjectPicker.tsx'
import { emptyPersonalDetails, personalDetailsPayload, submissionError, typeLabelError, weightError, type PersonalDetailsValue } from '../model/personalDetails.ts'

interface AddSchoolAssessmentModalProps {
  context: AcademicContext
  /** 과목별 목록에서 열면 해당 과목을 미리 선택한다 */
  initialSubjectId?: string
  /** 같은 학기에 이미 있는 과제명 (중복 가능성 안내용, 자동 병합하지 않는다) */
  existingTitles: string[]
  onClose: () => void
  onCreated: (created: SchoolAssessment) => void
}

type FieldErrors = Partial<Record<'title' | 'subjectId' | 'newSubjectName' | 'deadlineDate' | 'evaluationDate' | 'weightPercent' | 'form', string>>

const reasonMessages: Record<string, Record<string, string>> = {
  title: { required: '수행평가 이름을 입력해 주세요.' },
  subjectId: { required: '과목을 선택해 주세요.', unknown: '선택한 학기에 없는 과목이에요.' },
  newSubjectName: { invalid: '과목 이름을 확인해 주세요. (50자 이하)', not_allowed: '과목을 다시 선택해 주세요.' },
  deadlineDate: { format: '날짜 형식을 확인해 주세요.' },
  evaluationDate: { format: '날짜 형식을 확인해 주세요.' },
  weightPercent: { range: '0~100 사이 숫자로 입력해 주세요.', type: '0~100 사이 숫자로 입력해 주세요.' },
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko')
}

// ST-03 등록 B — 직접 입력 (assessment-student.md §6, api-contract.md §12 POST).
// 제목·과목만 필수다. 마감일·설명은 선택이며, 학교가 공개하지 않은 값을 채워 넣지 않는다.
// A27-UX: 평가 유형·평가일·제출 마감·반영 비율·제출물·수행 내용·진행 상태·개인 메모를 Section으로 나눠 입력한다(§12 DRAFT, 모두 선택).
// A27-UX 학생(2026-11-19): 과목은 검색형 Dropdown. 사이드바에 없는 과목 후보를 고르면 저장할 때 서버가 같은 트랜잭션에서 내 과목으로 더한다(§12-a).
function AddSchoolAssessmentModalForm({
  context,
  initialSubjectId,
  existingTitles,
  onClose,
  onCreated,
}: AddSchoolAssessmentModalProps) {
  const ids = { title: useId(), subject: useId() }
  const titleRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)

  const [title, setTitle] = useState('')
  const initialSubject = context.subjects.find((subject) => subject.subjectId === initialSubjectId)
  const [subject, setSubject] = useState<SubjectChoice | null>(
    initialSubject ? { kind: 'enrolled', subjectId: initialSubject.subjectId, name: initialSubject.name } : null,
  )
  const [details, setDetails] = useState<PersonalDetailsValue>(() => ({ ...emptyPersonalDetails(), status: 'BEFORE_START' }))
  const [titleTouched, setTitleTouched] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)

  const trimmedTitle = title.trim()
  const canSubmit = trimmedTitle !== '' && subject !== null && !submitting && !weightError(details.weightPercent) && !typeLabelError(details) && !submissionError(details)
  const isDirty =
    title !== '' ||
    (subject?.kind === 'enrolled' ? subject.subjectId : subject?.name ?? '') !== (initialSubject?.subjectId ?? '') ||
    JSON.stringify({ ...details, status: undefined }) !== JSON.stringify({ ...emptyPersonalDetails(), status: undefined }) ||
    details.status !== 'BEFORE_START'
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
        if (field === 'title' || field === 'subjectId' || field === 'newSubjectName' || field === 'deadlineDate' || field === 'evaluationDate' || field === 'weightPercent') {
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
    if (trimmedTitle === '' || subject === null) {
      setErrors({
        title: trimmedTitle === '' ? reasonMessages.title.required : undefined,
        subjectId: subject === null ? reasonMessages.subjectId.required : undefined,
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
        // §12-a: 수강 과목은 ID, 사이드바에 없는 과목은 이름(서버가 같은 트랜잭션에서 내 과목으로 더함)
        subjectId: subject.kind === 'enrolled' ? subject.subjectId : null,
        newSubjectName: subject.kind === 'new' ? subject.name : null,
        academicYear: context.academicYear,
        semester: context.semester,
        ...personalDetailsPayload(details),
        status: details.status ?? 'BEFORE_START',
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
              이 학기에 같은 이름의 수행평가가 이미 있어요.
            </p>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label} id={`${ids.subject}-label`}>
            과목 <span className={styles.required} aria-hidden="true">*</span>
            <span className="lh-visually-hidden">(필수)</span>
          </span>
          <SubjectPicker
            context={context}
            value={subject}
            disabled={submitting}
            invalid={Boolean(errors.subjectId ?? errors.newSubjectName)}
            describedBy={`${ids.subject}-hint${errors.subjectId ?? errors.newSubjectName ? ` ${ids.subject}-error` : ''}`}
            onChange={(next) => {
              setSubject(next)
              if (errors.subjectId || errors.newSubjectName) setErrors((previous) => ({ ...previous, subjectId: undefined, newSubjectName: undefined }))
            }}
          />
          {/* 새 과목을 고르면 SubjectPicker가 '내 과목 목록에도 추가' 안내를 보이므로 일반 안내는 숨긴다 */}
          <p id={`${ids.subject}-hint`} className={styles.hint} hidden={subject?.kind === 'new'}>
            내 수강 과목에서 고르거나, {context.grade}학년 과목을 검색해 고를 수 있어요.
          </p>
          {(errors.subjectId ?? errors.newSubjectName) && (
            <p id={`${ids.subject}-error`} className={styles.fieldError}>
              {errors.subjectId ?? errors.newSubjectName}
            </p>
          )}
        </div>

        <PersonalDetailsFields
          value={details}
          onChange={(patch) => setDetails((previous) => ({ ...previous, ...patch }))}
          disabled={submitting}
          errors={{ deadlineDate: errors.deadlineDate, evaluationDate: errors.evaluationDate, weightPercent: errors.weightPercent }}
          showStatus
        />
      </form>
    </Modal>
  )
}

/** 관리자 읽기 전용 보기(P-28)에서는 입력 폼 대신 안내만 연다 */
export function AddSchoolAssessmentModal(props: Parameters<typeof AddSchoolAssessmentModalForm>[0]) {
  return isAssessmentReadOnlyView() ? <ReadOnlyBlockedModal onClose={props.onClose} /> : <AddSchoolAssessmentModalForm {...props} />
}
