import { useId, useRef, useState, type FormEvent } from 'react'
import { toApiError, type ApiError } from '../../api/apiError.ts'
import { createEnrichmentTask } from '../../api/enrichmentApi.ts'
import type { EnrichmentSourceReference, EnrichmentTask, SchoolAssessment, SubjectRef } from '../../api/types.ts'
import { sourceTypeLabels } from '../../model/enrichmentView.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, ChevronDownIcon, InfoIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import styles from './enrichment.module.css'
import universityStyles from '../university/university.module.css'

export interface CreateEnrichmentPrefill {
  title?: string
  goal?: string
  subjectId?: string
  /** §18 sourceReference(제안 계약, DRAFT). 출발 자료를 Task에 추적 가능하게 남긴다. */
  sourceReference?: EnrichmentSourceReference
  /** 출발 자료 이름 (안내 표시용, 저장하지 않는다) */
  sourceTitle?: string
  /**
   * 출처 상세 (대학 기출 PDF, P-25). 원문 데이터(문서·문항·쪽·개념 칸)에서 온 값만 넣는다. 저장하지 않는다.
   * examples는 LearnersHigh가 쓴 학생용 탐구 방향 예시이며 대학 공식 추천이 아니다.
   */
  sourceDetails?: { lines: string[]; concepts: string[]; examples?: string[] }
  /** Modal 제목·목표 칸 이름을 출발 자료에 맞게 바꿀 때 (저장 필드는 같은 §18 title·goal) */
  modalTitle?: string
  goalLabel?: string
  goalPlaceholder?: string
}

interface CreateEnrichmentModalProps {
  subjects: SubjectRef[]
  /** 연결 후보: 선택 학기의 학교 수행평가 (§12 목록 응답) */
  assessments: SchoolAssessment[]
  prefill?: CreateEnrichmentPrefill
  onClose: () => void
  onCreated: (task: EnrichmentTask) => void
}

type FieldErrors = Partial<Record<'title' | 'subjectId' | 'form', string>>

const reasonMessages: Record<string, Record<string, string>> = {
  title: { required: '탐구 주제를 입력해 주세요.' },
  subjectId: { required: '관련 과목을 골라 주세요.', unknown: '이 학기에 없는 과목이에요. 다시 골라 주세요.' },
}

// 나만의 심화 탐구 만들기 (Mockup AE-LIST-02, inquiry §3 직접 생성, api-contract.md §18 POST).
// 학교 수행평가 연결은 선택이다. 관리자 승인·마감 입력을 요구하지 않는다. 만들면 진행 중 상태로 시작한다.
export function CreateEnrichmentModal({ subjects, assessments, prefill, onClose, onCreated }: CreateEnrichmentModalProps) {
  const ids = { title: useId(), goal: useId(), subject: useId(), related: useId() }
  const titleRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const initialSubjectId = subjects.some((subject) => subject.subjectId === prefill?.subjectId) ? (prefill?.subjectId ?? '') : ''
  const [title, setTitle] = useState(prefill?.title ?? '')
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [goal, setGoal] = useState(prefill?.goal ?? '')
  const [relatedAssessmentId, setRelatedAssessmentId] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)

  const trimmedTitle = title.trim()
  const canSubmit = trimmedTitle !== '' && subjectId !== '' && !submitting
  const isDirty =
    title !== (prefill?.title ?? '') ||
    subjectId !== initialSubjectId ||
    goal !== (prefill?.goal ?? '') ||
    relatedAssessmentId !== ''

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
        if (field === 'title' || field === 'subjectId') next[field] = reasonMessages[field]?.[reason] ?? `입력값을 확인해 주세요. (${reason})`
        else next.form = `${error.message} (${field})`
      }
      setErrors(next)
      return
    }
    setErrors({ form: `${error.message} 입력한 내용은 그대로 있어요. 다시 시도해 주세요. (${error.code})` })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
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
      const task = await createEnrichmentTask({
        title: trimmedTitle,
        subjectId,
        goal: goal.trim() || null,
        relatedAssessmentId: relatedAssessmentId || null,
        catalogTaskId: null,
        status: 'IN_PROGRESS',
        deadlineDate: null,
        sourceReference: prefill?.sourceReference ?? null,
      })
      onCreated(task)
    } catch (error) {
      applyServerError(toApiError(error))
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={prefill?.modalTitle ?? '나만의 심화 탐구 만들기'}
      description="학교 수행평가와 별개로 스스로 정한 주제를 탐구해요."
      compact
      onRequestClose={requestClose}
      initialFocusRef={titleRef}
      footer={
        confirmingClose ? (
          <div className={formStyles.confirm} role="alert">
            <span>작성 중인 내용이 사라져요. 닫을까요?</span>
            <button type="button" className={formStyles.ghostButton} onClick={() => setConfirmingClose(false)}>
              계속 작성
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={onClose}>
              닫기
            </button>
          </div>
        ) : (
          <>
            <button type="button" className={formStyles.ghostButton} onClick={requestClose} disabled={submitting}>
              취소
            </button>
            <button
              type="submit"
              form="create-enrichment-form"
              className={formStyles.primaryButton}
              disabled={!canSubmit}
              aria-busy={submitting}
            >
              {submitting ? '만드는 중…' : '만들고 시작'}
            </button>
          </>
        )
      }
    >
      <form id="create-enrichment-form" className={formStyles.form} noValidate onSubmit={onSubmit}>
        {errors.form && (
          <p className={formStyles.formError} role="alert">
            <AlertIcon size={16} />
            {errors.form}
          </p>
        )}
        {prefill?.sourceReference && prefill.sourceDetails && (
          <section className={universityStyles.currentBox} aria-label="출처">
            <p className={universityStyles.infoLabel}>출처</p>
            {prefill.sourceDetails.lines.map((line) => (
              <p key={line} className={universityStyles.currentLine}>
                {line}
              </p>
            ))}
            {prefill.sourceDetails.concepts.length > 0 && (
              <>
                <p className={universityStyles.infoLabel}>핵심 개념 (원문 표기)</p>
                <ul className={universityStyles.conceptChips}>
                  {prefill.sourceDetails.concepts.map((concept) => (
                    <li key={concept}>{concept}</li>
                  ))}
                </ul>
              </>
            )}
            {prefill.sourceDetails.examples && prefill.sourceDetails.examples.length > 0 && (
              <div className={universityStyles.exampleBox}>
                <span className={universityStyles.exampleLabel}>탐구 방향 예시</span>
                {prefill.sourceDetails.examples.map((example) => (
                  <p key={example}>{example}</p>
                ))}
                <span className={universityStyles.exampleHint}>LearnersHigh가 쓴 학습용 예시예요. 대학이 추천한 주제가 아니에요. 주제와 질문은 직접 정해 주세요.</span>
              </div>
            )}
            <p className={universityStyles.mutedText}>원문은 복사하지 않고 문서·쪽만 출처로 연결해요.</p>
          </section>
        )}
        {prefill?.sourceReference && !prefill.sourceDetails && (
          <p className={styles.sourceNote}>
            <InfoIcon size={14} />
            출발 자료: {sourceTypeLabels[prefill.sourceReference.type]}
            {prefill.sourceTitle ? ` · ${prefill.sourceTitle}` : ''}. 원문은 복사하지 않고 출처만 연결해요.
          </p>
        )}

        <div className={formStyles.field}>
          <label htmlFor={ids.title} className={formStyles.label}>
            탐구 주제 <span className={formStyles.required} aria-hidden="true">*</span>
            <span className="lh-visually-hidden">(필수)</span>
          </label>
          <input
            ref={titleRef}
            id={ids.title}
            className={formStyles.input}
            value={title}
            placeholder="예: 중화열을 이용한 손난로 만들기"
            autoComplete="off"
            required
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${ids.title}-error` : undefined}
            disabled={submitting}
            onChange={(event) => {
              setTitle(event.target.value)
              if (errors.title) setErrors((previous) => ({ ...previous, title: undefined }))
            }}
          />
          {errors.title && (
            <p id={`${ids.title}-error`} className={formStyles.fieldError}>
              {errors.title}
            </p>
          )}
        </div>

        <fieldset className={formStyles.field} aria-describedby={errors.subjectId ? `${ids.subject}-error` : undefined}>
          <legend className={formStyles.label}>
            관련 과목 <span className={formStyles.required} aria-hidden="true">*</span>
            <span className="lh-visually-hidden">(필수)</span>
          </legend>
          {subjects.length === 0 ? (
            <p className={formStyles.fieldWarning}>이 학기에 등록된 과목이 없어요. 학교·학업 정보에서 과목을 확인해 주세요.</p>
          ) : (
            <div className={`${formStyles.chips} ${styles.inkChips}`}>
              {subjects.map((subject) => (
                <label key={subject.subjectId} className={formStyles.chip}>
                  <input
                    type="radio"
                    name="enrichmentSubjectId"
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
            <p id={`${ids.subject}-error`} className={formStyles.fieldError}>
              {errors.subjectId}
            </p>
          )}
        </fieldset>

        <div className={formStyles.field}>
          <label htmlFor={ids.goal} className={formStyles.label}>
            {prefill?.goalLabel ?? '탐구 목표'}
          </label>
          <textarea
            id={ids.goal}
            className={formStyles.textarea}
            value={goal}
            rows={3}
            placeholder={prefill?.goalPlaceholder ?? '무엇을 알아보고 싶은지 한두 문장으로 적어 보세요. 나중에 바꿔도 돼요.'}
            disabled={submitting}
            onChange={(event) => setGoal(event.target.value)}
          />
        </div>

        <div className={formStyles.field}>
          <label htmlFor={ids.related} className={formStyles.label}>
            연결할 학교 수행평가 (선택)
          </label>
          <span className={styles.selectWrap}>
            <select
              id={ids.related}
              className={styles.select}
              value={relatedAssessmentId}
              disabled={submitting}
              onChange={(event) => setRelatedAssessmentId(event.target.value)}
            >
              <option value="">연결 안 함</option>
              {assessments.map((assessment) => (
                <option key={assessment.assessmentId} value={assessment.assessmentId}>
                  {assessment.title}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={16} className={styles.selectChevron} />
          </span>
        </div>
      </form>
    </Modal>
  )
}
