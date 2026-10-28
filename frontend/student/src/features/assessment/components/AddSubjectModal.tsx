import { useId, useRef, useState, type FormEvent } from 'react'
import { createStudentSubject, updateAcademicContext } from '../api/academicContextApi.ts'
import { toApiError } from '../api/apiError.ts'
import type { AcademicContext, SubjectRef } from '../api/types.ts'
import { termLabel } from '../model/academicTerm.ts'
import {
  cleanSubjectName,
  subjectNameKey,
  subjectNameMaxLength,
  subjectNameMessages,
  subjectNameProblem,
  type SubjectNameProblem,
} from '../model/subjectName.ts'
import formStyles from './AddSchoolAssessmentModal.module.css'
import { AlertIcon, InfoIcon } from './AssessmentIcons.tsx'
import { Modal } from './Modal.tsx'
import styles from './AddSubjectModal.module.css'

interface AddSubjectModalProps {
  /** 과목을 추가할 학업 Context (학교·학년도·학년·학기) */
  context: AcademicContext
  /** 다른 학기에서 쓰던 과목 (model/subjectName.ts subjectCandidates) */
  candidates: SubjectRef[]
  onClose: () => void
  onAdded: (subject: SubjectRef, origin: 'CREATED' | 'OTHER_TERM') => void
}

// 과목 추가 (2026-10-28). 학교·학업 정보와 Sidebar "+"가 이 Modal 하나를 쓴다.
// - 다른 학기에서 쓰던 과목 고르기 → §9-2 PUT subjectIds (계약 범위, 같은 subjectId 재사용)
// - 이름 직접 입력 → createStudentSubject (P-26 PROPOSED, Mock 전용·이 브라우저에 저장)
// 학교 공식 개설 과목 목록이 없으므로 추천 과목을 만들어 보여주지 않는다.
export function AddSubjectModal({ context, candidates, onClose, onAdded }: AddSubjectModalProps) {
  const ids = { name: useId(), hint: useId(), error: useId() }
  const inputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<SubjectRef>()
  const [problem, setProblem] = useState<SubjectNameProblem>()
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  // 입력한 이름이 다른 학기 과목과 같으면 그 과목(같은 subjectId)을 쓴다 — 같은 과목을 이름만 같게 새로 만들지 않는다.
  const typedMatch = candidates.find((candidate) => cleanSubjectName(name) && subjectNameKey(candidate.name) === subjectNameKey(cleanSubjectName(name)))
  const target = picked ?? typedMatch
  const canSubmit = !submitting

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    const localProblem = target ? null : subjectNameProblem(name, context.subjects)
    if (localProblem) {
      setProblem(localProblem)
      inputRef.current?.focus()
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setProblem(undefined)
    setFormError(undefined)
    try {
      if (target) {
        await updateAcademicContext({
          schoolId: context.school.schoolId,
          academicYear: context.academicYear,
          grade: context.grade,
          semester: context.semester,
          subjectIds: [...context.subjects.map((subject) => subject.subjectId), target.subjectId],
        })
        onAdded({ subjectId: target.subjectId, name: target.name }, 'OTHER_TERM')
      } else {
        const subject = await createStudentSubject({
          schoolId: context.school.schoolId,
          academicYear: context.academicYear,
          grade: context.grade,
          semester: context.semester,
          name: cleanSubjectName(name),
        })
        onAdded(subject, 'CREATED')
      }
    } catch (error) {
      const apiError = toApiError(error)
      const reason = apiError.fieldReasons().name as SubjectNameProblem | undefined
      if (reason && reason in subjectNameMessages) setProblem(reason)
      else setFormError(`${apiError.message} 입력한 과목명은 그대로 있어요. (${apiError.code})`)
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="과목 추가"
      description="공부할 과목을 이 학기에 추가해요."
      compact
      onRequestClose={() => {
        if (!submitting) onClose()
      }}
      initialFocusRef={inputRef}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" form="add-subject-form" className={formStyles.primaryButton} disabled={!canSubmit} aria-busy={submitting}>
            {submitting ? '추가하는 중…' : '추가'}
          </button>
        </>
      }
    >
      <form id="add-subject-form" className={formStyles.form} noValidate onSubmit={submit}>
        <p className={styles.intro}>공부할 과목을 추가해 보세요.</p>
        <p className={styles.term}>
          <span className={styles.termLabel}>현재 학업 정보</span>
          {context.school.name} · {termLabel(context)}
        </p>

        {formError && (
          <p className={formStyles.formError} role="alert">
            <AlertIcon size={16} />
            {formError}
          </p>
        )}

        <div className={formStyles.field}>
          <label htmlFor={ids.name} className={formStyles.label}>
            과목 이름
          </label>
          <input
            ref={inputRef}
            id={ids.name}
            className={formStyles.input}
            value={picked ? picked.name : name}
            placeholder="예: 인공지능 기초, 물리학Ⅱ, 데이터 과학"
            autoComplete="off"
            maxLength={subjectNameMaxLength * 2}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? ids.error : ids.hint}
            disabled={submitting}
            onChange={(event) => {
              setPicked(undefined)
              setName(event.target.value)
              if (problem) setProblem(undefined)
            }}
          />
          {problem ? (
            <p id={ids.error} className={formStyles.fieldError} role="alert">
              {subjectNameMessages[problem]}
            </p>
          ) : (
            <p id={ids.hint} className={styles.hint}>
              목록에 없는 과목도 이름을 직접 적어 추가할 수 있어요. ({subjectNameMaxLength}자까지)
            </p>
          )}
        </div>

        {candidates.length > 0 && (
          <fieldset className={formStyles.field}>
            <legend className={formStyles.label}>다른 학기에서 쓰던 과목에서 고를 수도 있어요</legend>
            <div className={styles.candidates}>
              {candidates.map((candidate) => (
                <button
                  key={candidate.subjectId}
                  type="button"
                  className={styles.candidate}
                  aria-pressed={target?.subjectId === candidate.subjectId}
                  disabled={submitting}
                  onClick={() => {
                    setPicked(picked?.subjectId === candidate.subjectId ? undefined : candidate)
                    setName('')
                    setProblem(undefined)
                  }}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <p className={styles.notice}>
          <InfoIcon size={13} />
          직접 입력한 과목은 학교가 개설한 공식 과목이 아니라 내가 추가한 학습용 과목으로 표시돼요. 시연용(Mock) 데이터라 서버가 아니라 이 브라우저에만 저장돼요.
        </p>
      </form>
    </Modal>
  )
}
