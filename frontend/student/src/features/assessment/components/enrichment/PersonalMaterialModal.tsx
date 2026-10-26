import { useId, useRef, useState, type FormEvent } from 'react'
import { toApiError } from '../../api/apiError.ts'
import { createPersonalMockExamMaterial } from '../../api/enrichmentApi.ts'
import type { PersonalMockExamMaterial } from '../../api/types.ts'
import { mockExamSubjects } from '../../model/enrichmentView.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, ChevronDownIcon, InfoIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import styles from './enrichment.module.css'

interface PersonalMaterialModalProps {
  onClose: () => void
  onCreated: (material: PersonalMockExamMaterial) => void
}

type FieldErrors = Partial<Record<'subjectId' | 'sourceUrl' | 'form', string>>

const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value))

// 내 지문 등록 (Mockup AE-MOCK-01 "내 지문 등록" 버튼, inquiry §4, api-contract.md §17 POST my-mock-exam-materials).
// 화면 Mockup이 없어 기존 Assessment Modal 형식을 쓴다. 입력 필드는 §17 예시 그대로다.
// 파일 업로드(sourceFileRef)는 저장소가 정해지지 않아 링크만 받는다. 입력한 링크가 실제로 열리는지는 확인하지 않는다.
// 등록한 자료는 본인만 보는 개인 자료이며 공개 탐구 카드로 바뀌지 않는다.
export function PersonalMaterialModal({ onClose, onCreated }: PersonalMaterialModalProps) {
  const ids = { year: useId(), month: useId(), grade: useId(), subject: useId(), question: useId(), url: useId(), note: useId() }
  const urlRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [academicYear, setAcademicYear] = useState('')
  const [examMonth, setExamMonth] = useState('')
  const [grade, setGrade] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [questionNumber, setQuestionNumber] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = subjectId !== '' && sourceUrl.trim() !== '' && !submitting

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    const url = sourceUrl.trim()
    const next: FieldErrors = {}
    if (subjectId === '') next.subjectId = '과목을 골라 주세요.'
    if (url === '') next.sourceUrl = '원문 링크를 입력해 주세요.'
    else if (!/^https?:\/\//.test(url)) next.sourceUrl = 'http:// 또는 https://로 시작하는 주소를 입력해 주세요.'
    if (Object.keys(next).length > 0) {
      setErrors(next)
      if (next.sourceUrl) urlRef.current?.focus()
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setErrors({})
    try {
      const material = await createPersonalMockExamMaterial({
        academicYear: toNumberOrNull(academicYear),
        examMonth: toNumberOrNull(examMonth),
        grade: toNumberOrNull(grade),
        subjectId,
        questionNumber: questionNumber.trim() || null,
        sourceUrl: url,
        sourceFileRef: null,
        personalNote: personalNote.trim() || null,
      })
      onCreated(material)
    } catch (error) {
      const apiError = toApiError(error)
      setErrors({ form: `${apiError.message} 입력한 내용은 그대로 있어요. (${apiError.code})` })
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="내 지문 등록"
      description="공부하면서 본 지문의 출처를 내 탐구 자료로 남겨요. 나만 볼 수 있어요."
      compact
      onRequestClose={() => !submitting && onClose()}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button
            type="submit"
            form="personal-material-form"
            className={formStyles.primaryButton}
            disabled={!canSubmit}
            aria-busy={submitting}
          >
            {submitting ? '등록 중…' : '등록'}
          </button>
        </>
      }
    >
      <form id="personal-material-form" className={formStyles.form} noValidate onSubmit={onSubmit}>
        <p className={styles.sourceNote}>
          <InfoIcon size={14} />
          지문 원문은 올리지 말고 출처 링크만 남겨 주세요. 등록한 자료는 나만 보며 다른 학생에게 공개되지 않아요. 파일 올리기는 준비 중이에요.
        </p>
        {errors.form && (
          <p className={formStyles.formError} role="alert">
            <AlertIcon size={16} />
            {errors.form}
          </p>
        )}
        <div className={styles.connectRow}>
          <div className={formStyles.field}>
            <label htmlFor={ids.year} className={formStyles.label}>
              학년도
            </label>
            <input id={ids.year} className={formStyles.input} inputMode="numeric" placeholder="2026" value={academicYear} disabled={submitting} onChange={(event) => setAcademicYear(event.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
          <div className={formStyles.field}>
            <label htmlFor={ids.month} className={formStyles.label}>
              시행 월
            </label>
            <input id={ids.month} className={formStyles.input} inputMode="numeric" placeholder="9" value={examMonth} disabled={submitting} onChange={(event) => setExamMonth(event.target.value.replace(/\D/g, '').slice(0, 2))} />
          </div>
          <div className={formStyles.field}>
            <label htmlFor={ids.grade} className={formStyles.label}>
              학년
            </label>
            <input id={ids.grade} className={formStyles.input} inputMode="numeric" placeholder="1" value={grade} disabled={submitting} onChange={(event) => setGrade(event.target.value.replace(/\D/g, '').slice(0, 1))} />
          </div>
        </div>
        <div className={styles.connectRow}>
          <div className={formStyles.field}>
            <label htmlFor={ids.subject} className={formStyles.label}>
              과목 <span className={formStyles.required} aria-hidden="true">*</span>
              <span className="lh-visually-hidden">(필수)</span>
            </label>
            <span className={styles.selectWrap}>
              <select
                id={ids.subject}
                className={styles.select}
                value={subjectId}
                disabled={submitting}
                aria-invalid={errors.subjectId ? true : undefined}
                onChange={(event) => {
                  setSubjectId(event.target.value)
                  setErrors((previous) => ({ ...previous, subjectId: undefined }))
                }}
              >
                <option value="">과목 선택</option>
                {mockExamSubjects.map((subject) => (
                  <option key={subject.subjectId} value={subject.subjectId}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={16} className={styles.selectChevron} />
            </span>
            {errors.subjectId && <p className={formStyles.fieldError}>{errors.subjectId}</p>}
          </div>
          <div className={formStyles.field}>
            <label htmlFor={ids.question} className={formStyles.label}>
              문항 번호
            </label>
            <input id={ids.question} className={formStyles.input} placeholder="15" value={questionNumber} disabled={submitting} onChange={(event) => setQuestionNumber(event.target.value.slice(0, 10))} />
          </div>
        </div>
        <div className={formStyles.field}>
          <label htmlFor={ids.url} className={formStyles.label}>
            원문 링크 <span className={formStyles.required} aria-hidden="true">*</span>
            <span className="lh-visually-hidden">(필수)</span>
          </label>
          <input
            ref={urlRef}
            id={ids.url}
            type="url"
            className={formStyles.input}
            placeholder="https://"
            value={sourceUrl}
            disabled={submitting}
            aria-invalid={errors.sourceUrl ? true : undefined}
            aria-describedby={`${ids.url}-hint`}
            onChange={(event) => {
              setSourceUrl(event.target.value)
              setErrors((previous) => ({ ...previous, sourceUrl: undefined }))
            }}
          />
          <p id={`${ids.url}-hint`} className={errors.sourceUrl ? formStyles.fieldError : formStyles.hint}>
            {errors.sourceUrl ?? '시험 기관의 공식 게시처 링크를 권장해요. 링크가 열리는지는 확인하지 않아요.'}
          </p>
        </div>
        <div className={formStyles.field}>
          <label htmlFor={ids.note} className={formStyles.label}>
            탐구 메모
          </label>
          <textarea id={ids.note} className={formStyles.textarea} rows={3} placeholder="이 지문에서 더 알아보고 싶은 점" value={personalNote} disabled={submitting} onChange={(event) => setPersonalNote(event.target.value)} />
        </div>
      </form>
    </Modal>
  )
}
