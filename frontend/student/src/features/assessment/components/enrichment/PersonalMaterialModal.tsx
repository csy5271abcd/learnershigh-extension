import { useId, useRef, useState, type FormEvent } from 'react'
import { toApiError } from '../../api/apiError.ts'
import { createPersonalMockExamMaterial } from '../../api/enrichmentApi.ts'
import type { PersonalMockExamMaterial } from '../../api/types.ts'
import { mockExamSubjects } from '../../model/enrichmentView.ts'
import { attachScreenshot, screenshotAccept, screenshotFileProblem } from '../../model/mockExamScreenshotStore.ts'
import { formatFileSize } from '../../model/noteEditorModel.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, ChevronDownIcon, InfoIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import styles from './enrichment.module.css'

interface PersonalMaterialModalProps {
  onClose: () => void
  /** `screenshot`: 이 화면에서만 붙인 스크린샷 종류 (없으면 undefined) */
  onCreated: (material: PersonalMockExamMaterial, screenshot: 'image' | 'pdf' | undefined) => void
}

type FieldErrors = Partial<Record<'subjectId' | 'sourceUrl' | 'file' | 'form', string>>

const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value))

// 내 지문 등록 (Mockup AE-MOCK-01 "내 지문 등록" 버튼, inquiry §4, api-contract.md §17 POST my-mock-exam-materials).
// 화면 Mockup이 없어 기존 Assessment Modal 형식을 쓴다. 입력 필드는 §17 예시 그대로다.
// 파일 업로드(sourceFileRef)는 저장소가 정해지지 않아 서버에 보내지 않는다. 스크린샷·PDF는 이 화면에서만 미리보고 영역을 표시하며,
// 출처 확인을 위해 원문 링크는 그대로 필수다 (2026-10-27 사용자 요청 B). 입력한 링크가 실제로 열리는지는 확인하지 않는다.
// 등록한 자료는 본인만 보는 개인 자료이며 공개 탐구 카드로 바뀌지 않는다.
export function PersonalMaterialModal({ onClose, onCreated }: PersonalMaterialModalProps) {
  const ids = { year: useId(), month: useId(), grade: useId(), subject: useId(), question: useId(), url: useId(), note: useId(), file: useId() }
  const urlRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [screenshot, setScreenshot] = useState<File>()
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
      if (screenshot) attachScreenshot(material.materialId, screenshot)
      onCreated(material, screenshot ? (screenshot.type === 'application/pdf' ? 'pdf' : 'image') : undefined)
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
          출처 링크는 꼭 남겨 주세요. 등록한 자료는 나만 보며 다른 학생에게 공개되지 않아요. 스크린샷·PDF는 서버에 저장되지 않고 이 화면에서만 미리보기·영역 표시에 써요.
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
          <span id={ids.file} className={formStyles.label}>
            스크린샷·PDF (선택)
          </span>
          <input
            ref={fileRef}
            type="file"
            accept={screenshotAccept}
            className="lh-visually-hidden"
            aria-labelledby={ids.file}
            disabled={submitting}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              const problem = screenshotFileProblem(file)
              setErrors((previous) => ({ ...previous, file: problem ?? undefined }))
              if (!problem) setScreenshot(file)
            }}
          />
          <span className={styles.connectRow}>
            <button type="button" className={formStyles.ghostButton} disabled={submitting} aria-describedby={`${ids.file}-hint`} onClick={() => fileRef.current?.click()}>
              {screenshot ? '다른 파일 고르기' : '파일 고르기'}
            </button>
            {screenshot && (
              <button type="button" className={formStyles.ghostButton} disabled={submitting} onClick={() => setScreenshot(undefined)}>
                빼기
              </button>
            )}
          </span>
          <p id={`${ids.file}-hint`} className={errors.file ? formStyles.fieldError : formStyles.hint}>
            {errors.file ?? (screenshot ? `${screenshot.name} · ${formatFileSize(screenshot.size)} · 등록 뒤 영역을 표시할 수 있어요 · 글자 인식(OCR)은 하지 않아요` : 'PNG·JPG·WEBP·PDF, 20MB 이하 · 글자 인식(OCR)은 하지 않아요')}
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
