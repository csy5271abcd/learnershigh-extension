import { useEffect, useRef, type ReactNode } from 'react'
import {
  criteriaPointsTotal,
  emptyCriterion,
  filledCriteria,
  formatFileSize,
  guideFileAccept,
  performanceTypeOptions,
  taskCreateFieldId,
  taskCreateSteps,
  taskStartingPointOptions,
  type GuideFileReadState,
  type TaskCreateDraft,
  type TaskCreateErrors,
  type TaskCreateField,
  type TaskCreateStep,
} from '../model/taskCreate.ts'
import { deadlineCountdown, formatDeadline } from '../model/tasks.ts'
import styles from './TaskCreateWizard.module.css'

interface TaskCreateWizardProps {
  step: TaskCreateStep
  draft: TaskCreateDraft
  onDraftChange: (draft: TaskCreateDraft) => void
  errors: TaskCreateErrors
  onFieldEdit: (field: TaskCreateField) => void
  fileState: GuideFileReadState
  fileTypeError?: string
  onGuideFileSelect: (file: File) => void
  onGuideFileRemove: () => void
  subjectOptions: string[]
  /** D-day 기준일 (School Fixture snapshotDate) */
  snapshotDate: string
  submitting: boolean
  submitFailed: boolean
  onNext: () => void
  onPrevious: () => void
  onSubmit: () => void
  /** 취소 / 닫기 / ESC. 작성 중이면 호출 측이 확인 Dialog를 띄운다. */
  onRequestClose: () => void
}

// 수행평가 등록 Modal (TaskRegister-01 ~ 05 Mockup): 안내문 → 기본 정보 → 평가 기준 → 확인
// Native <dialog> showModal: 배경 조작 차단 / Focus 가두기. Backdrop Click으로는 닫지 않는다. (작성 내용 보호)
// 학생이 직접 입력한다. AI가 안내문 / 평가 기준을 대신 쓰지 않는다.
export function TaskCreateWizard(props: TaskCreateWizardProps) {
  const { step, onRequestClose } = props
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepIndex = taskCreateSteps.findIndex((item) => item.id === step)
  const current = taskCreateSteps[stepIndex]

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  // 열 때 / 단계가 바뀔 때 단계 제목으로 Focus를 옮긴다.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="task-create-heading"
      aria-describedby="task-create-step-position"
      onCancel={(event) => {
        // ESC: 바로 닫지 않고 호출 측이 작성 중 여부를 확인한다.
        event.preventDefault()
        onRequestClose()
      }}
    >
      <div className={styles.surface}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h2 id="task-create-heading" ref={headingRef} tabIndex={-1} className={styles.title}>
              {current.title}
            </h2>
            <button type="button" className={styles.close} aria-label="수행평가 등록 닫기" onClick={onRequestClose}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p id="task-create-step-position" className="lh-visually-hidden">
            {taskCreateSteps.length}단계 중 {stepIndex + 1}단계, {current.label}
          </p>
          {/* 등록 단계 표시. 이동 버튼이 아니다. (Mockup에 단계 건너뛰기 근거 없음) */}
          <ol className={styles.steps} aria-label="등록 단계">
            {taskCreateSteps.map((item, index) => {
              const state = index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'upcoming'
              return (
                <li key={item.id} className={styles.step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                  <span className={styles.stepBar} aria-hidden="true" />
                  <span className={styles.stepLabel}>
                    {item.label}
                    <span className="lh-visually-hidden">
                      {' '}
                      ({index + 1} / {taskCreateSteps.length}, {state === 'done' ? '완료' : state === 'current' ? '현재 단계' : '남은 단계'})
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </header>

        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (step === 'confirm') props.onSubmit()
            else props.onNext()
          }}
        >
          <div className={styles.body}>
            {step === 'guide' && <GuideStep {...props} />}
            {step === 'basic' && <BasicStep {...props} />}
            {step === 'criteria' && <CriteriaStep {...props} />}
            {step === 'confirm' && <ConfirmStep {...props} />}
          </div>

          {step === 'confirm' && props.submitFailed && (
            <p className={styles.submitError} role="alert">
              수행평가를 등록하지 못했어요. 입력한 내용은 그대로 있어요. 다시 등록해주세요.
            </p>
          )}

          <div className={styles.footer}>
            {step === 'guide' ? (
              <button type="button" className={styles.secondaryButton} onClick={onRequestClose}>
                취소
              </button>
            ) : (
              <button type="button" className={styles.secondaryButton} onClick={props.onPrevious} disabled={props.submitting}>
                이전
              </button>
            )}
            {step === 'confirm' ? (
              <button type="submit" className={styles.primaryButton} disabled={props.submitting}>
                {props.submitting ? '등록 중…' : '등록하기'}
              </button>
            ) : (
              // 아직 채우지 않은 단계는 옅게 보이지만, 누르면 무엇이 필요한지 알려준다.
              <button type="submit" className={styles.primaryButton} data-inactive={!stepLooksComplete(step, props) || undefined}>
                다음
              </button>
            )}
          </div>
        </form>
      </div>
    </dialog>
  )
}

function stepLooksComplete(step: TaskCreateStep, { draft, fileState }: TaskCreateWizardProps): boolean {
  if (step === 'guide') return draft.guideMode === 'file' ? Boolean(draft.guideFile) && fileState.status !== 'reading' : Boolean(draft.guideText.trim())
  if (step === 'basic') return Boolean(draft.title.trim() && draft.subject && draft.deadlineDate)
  return true
}

// ---------- 공통 ----------

function FieldError({ field, errors }: { field: TaskCreateField; errors: TaskCreateErrors }) {
  if (!errors[field]) return null
  return (
    <p id={`${taskCreateFieldId(field)}-error`} className={styles.error}>
      {errors[field]}
    </p>
  )
}

const errorProps = (field: TaskCreateField, errors: TaskCreateErrors) => ({
  'aria-invalid': Boolean(errors[field]),
  'aria-describedby': errors[field] ? `${taskCreateFieldId(field)}-error` : undefined,
})

function ChoiceGroup({
  legend,
  name,
  description,
  options,
  value,
  onChange,
  error,
  fieldId,
}: {
  legend: string
  name: string
  description?: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  error?: ReactNode
  fieldId?: string
}) {
  return (
    <fieldset className={styles.fieldset} id={fieldId} tabIndex={fieldId ? -1 : undefined}>
      <legend className={styles.label}>{legend}</legend>
      {description && <p className={styles.hint}>{description}</p>}
      <div className={styles.chips}>
        {options.map((option) => (
          <label key={option.value} className={styles.chip}>
            <input
              type="radio"
              name={name}
              className="lh-visually-hidden"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error}
    </fieldset>
  )
}

// ---------- 1. 안내문 (TaskRegister-01) ----------

function GuideStep({ draft, onDraftChange, errors, onFieldEdit, fileState, fileTypeError, onGuideFileSelect, onGuideFileRemove }: TaskCreateWizardProps) {
  const reading = fileState.status === 'reading' ? fileState : null
  const shownName = reading?.fileName ?? draft.guideFile?.fileName
  return (
    <>
      {/* 입력 방식 전환은 다른 방식의 입력을 지우지 않는다. 다음 단계 검사는 지금 고른 방식을 본다. */}
      <fieldset className={styles.segmented}>
        <legend className="lh-visually-hidden">안내문 입력 방식</legend>
        {(['file', 'text'] as const).map((mode) => (
          <label key={mode} className={styles.segment}>
            <input
              type="radio"
              name="task-create-guide-mode"
              className="lh-visually-hidden"
              checked={draft.guideMode === mode}
              onChange={() => onDraftChange({ ...draft, guideMode: mode })}
            />
            <span>{mode === 'file' ? '파일 올리기' : '직접 입력'}</span>
          </label>
        ))}
      </fieldset>

      {draft.guideMode === 'file' ? (
        <div className={styles.field}>
          <span id="task-create-guide-file-label" className={styles.label}>
            안내문 파일
          </span>
          <div
            id={taskCreateFieldId('guideFile')}
            tabIndex={-1}
            className={styles.fileBox}
            data-empty={!shownName || undefined}
            aria-labelledby="task-create-guide-file-label"
            {...errorProps('guideFile', errors)}
          >
            {shownName ?? '예: 2학기 생명과학Ⅰ 수행평가 안내문.pdf'}
          </div>

          {/* 파일 준비 진행률: 브라우저에서 파일을 읽은 비율 (Wizard 단계 표시와 다른 막대) */}
          {reading && (
            <div className={styles.fileProgress}>
              <p className={styles.fileProgressText}>
                안내문을 준비하고 있어요 <span className={styles.fileProgressPercent}>{reading.percent}%</span>
              </p>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label={`${reading.fileName} 파일 준비`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={reading.percent}
                aria-valuetext={`${reading.fileName} 파일 준비 ${reading.percent}%`}
              >
                <span className={styles.progressFill} style={{ width: `${reading.percent}%` }} />
              </div>
            </div>
          )}

          {!reading && draft.guideFile && (
            <p className={styles.fileReady}>
              준비 완료 · {formatFileSize(draft.guideFile.sizeBytes)}
            </p>
          )}

          {fileState.status === 'error' && (
            <p className={styles.error} role="alert">
              {fileState.fileName} 파일을 읽지 못했어요. 다른 파일을 다시 선택해주세요.
            </p>
          )}
          {fileTypeError && (
            <p className={styles.error} role="alert">
              {fileTypeError}
            </p>
          )}

          <div className={styles.fileActions}>
            <label className={styles.fileButton}>
              <input
                type="file"
                className="lh-visually-hidden"
                accept={guideFileAccept}
                aria-describedby="task-create-guide-file-hint"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  // 같은 파일을 다시 골라도 change가 일어나도록 값을 비운다.
                  event.target.value = ''
                  if (file) {
                    onGuideFileSelect(file)
                    onFieldEdit('guideFile')
                  }
                }}
              />
              <span>{draft.guideFile || reading ? '다른 파일 올리기' : '파일 올리기'}</span>
            </label>
            {draft.guideFile && !reading && (
              <button type="button" className={styles.textButton} aria-label={`${draft.guideFile.fileName} 빼기`} onClick={onGuideFileRemove}>
                빼기
              </button>
            )}
            <span id="task-create-guide-file-hint" className={styles.hint}>
              pdf, docx, txt, png, jpg, jpeg
            </span>
          </div>
          <FieldError field="guideFile" errors={errors} />
        </div>
      ) : (
        <div className={styles.field}>
          <label htmlFor={taskCreateFieldId('guideText')} className={styles.label}>
            안내문 내용
          </label>
          <textarea
            id={taskCreateFieldId('guideText')}
            className={`${styles.input} ${styles.textarea}`}
            rows={7}
            value={draft.guideText}
            placeholder="받은 안내문의 과제 요건, 조건, 참고 사항을 적어요."
            {...errorProps('guideText', errors)}
            onChange={(event) => {
              onDraftChange({ ...draft, guideText: event.target.value })
              onFieldEdit('guideText')
            }}
          />
          <FieldError field="guideText" errors={errors} />
        </div>
      )}
    </>
  )
}

// ---------- 2. 기본 정보 (TaskRegister-02 / 03) ----------

function BasicStep({ draft, onDraftChange, errors, onFieldEdit, subjectOptions }: TaskCreateWizardProps) {
  return (
    <>
      <div className={styles.field}>
        <label htmlFor={taskCreateFieldId('title')} className={styles.label}>
          과제 제목
        </label>
        <input
          id={taskCreateFieldId('title')}
          type="text"
          className={styles.input}
          value={draft.title}
          placeholder="예: 광고 속 설득 전략 분석 발표"
          autoComplete="off"
          {...errorProps('title', errors)}
          onChange={(event) => {
            onDraftChange({ ...draft, title: event.target.value })
            onFieldEdit('title')
          }}
        />
        <FieldError field="title" errors={errors} />
      </div>

      <ChoiceGroup
        legend="과목"
        name="task-create-subject"
        fieldId={taskCreateFieldId('subject')}
        options={subjectOptions.map((subject) => ({ value: subject, label: subject }))}
        value={draft.subject}
        onChange={(subject) => {
          onDraftChange({ ...draft, subject })
          onFieldEdit('subject')
        }}
        error={<FieldError field="subject" errors={errors} />}
      />

      <ChoiceGroup
        legend="형태"
        name="task-create-type"
        options={performanceTypeOptions.map((type) => ({ value: type, label: type }))}
        value={draft.performanceType}
        onChange={(performanceType) => onDraftChange({ ...draft, performanceType })}
      />

      <ChoiceGroup
        legend="지금 어디까지 했나요?"
        name="task-create-starting-point"
        description="지금까지 진행한 정도를 알려주세요."
        options={taskStartingPointOptions.map((option) => ({ value: option.id, label: option.label }))}
        value={draft.startingPoint}
        onChange={(value) => onDraftChange({ ...draft, startingPoint: value as TaskCreateDraft['startingPoint'] })}
      />

      <div className={styles.field}>
        <label htmlFor={taskCreateFieldId('deadlineDate')} className={styles.label}>
          마감일
        </label>
        <input
          id={taskCreateFieldId('deadlineDate')}
          type="date"
          className={styles.input}
          value={draft.deadlineDate}
          {...errorProps('deadlineDate', errors)}
          onChange={(event) => {
            onDraftChange({ ...draft, deadlineDate: event.target.value })
            onFieldEdit('deadlineDate')
          }}
        />
        <FieldError field="deadlineDate" errors={errors} />
      </div>
    </>
  )
}

// ---------- 3. 평가 기준 (TaskRegister-04) ----------

function CriteriaStep({ draft, onDraftChange, errors, onFieldEdit }: TaskCreateWizardProps) {
  const pendingFocus = useRef<string>(undefined)
  useEffect(() => {
    if (!pendingFocus.current) return
    document.getElementById(pendingFocus.current)?.focus()
    pendingFocus.current = undefined
  })

  const updateRow = (rowId: string, patch: Partial<TaskCreateDraft['criteria'][number]>) =>
    onDraftChange({ ...draft, criteria: draft.criteria.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)) })

  const addRow = () => {
    const nextNumber = Math.max(0, ...draft.criteria.map((row) => Number(row.rowId.replace('criterion-', '')) || 0)) + 1
    const rowId = `criterion-${nextNumber}`
    // 새 Row의 기준 이름으로 Focus를 옮긴다.
    pendingFocus.current = `task-create-criterion-${rowId}-name`
    onDraftChange({ ...draft, criteria: [...draft.criteria, emptyCriterion(rowId)] })
  }

  return (
    <>
      <div className={styles.fieldset} role="group" aria-labelledby="task-create-criteria-label">
        <div className={styles.criteriaHeader}>
          <span id="task-create-criteria-label" className={styles.label}>
            평가 기준
          </span>
          <p className={styles.total} aria-live="polite">
            합계 {criteriaPointsTotal(draft)}점
          </p>
        </div>
        <ol className={styles.criteria}>
          {draft.criteria.map((row, index) => {
            const pointsField = `criterion-${row.rowId}-points` as const
            return (
              <li key={row.rowId} className={styles.criterionRow}>
                <label htmlFor={`task-create-criterion-${row.rowId}-name`} className="lh-visually-hidden">
                  평가 기준 {index + 1} 이름
                </label>
                <input
                  id={`task-create-criterion-${row.rowId}-name`}
                  type="text"
                  className={styles.input}
                  value={row.name}
                  placeholder="예: 분석 정확성"
                  autoComplete="off"
                  onChange={(event) => updateRow(row.rowId, { name: event.target.value })}
                />
                <label htmlFor={taskCreateFieldId(pointsField)} className="lh-visually-hidden">
                  평가 기준 {index + 1} 배점
                </label>
                <input
                  id={taskCreateFieldId(pointsField)}
                  type="text"
                  inputMode="numeric"
                  className={`${styles.input} ${styles.pointsInput}`}
                  value={row.points}
                  placeholder="배점"
                  {...errorProps(pointsField, errors)}
                  onChange={(event) => {
                    updateRow(row.rowId, { points: event.target.value })
                    onFieldEdit(pointsField)
                  }}
                />
                <button
                  type="button"
                  className={styles.textButton}
                  aria-label={`평가 기준 ${index + 1} 삭제`}
                  onClick={() => onDraftChange({ ...draft, criteria: draft.criteria.filter((item) => item.rowId !== row.rowId) })}
                >
                  삭제
                </button>
                <div className={styles.criterionError}>
                  <FieldError field={pointsField} errors={errors} />
                </div>
              </li>
            )
          })}
        </ol>
        <button type="button" className={styles.addButton} onClick={addRow}>
          항목 추가
        </button>
      </div>

      <div className={styles.field}>
        <label htmlFor="task-create-deliverable" className={styles.label}>
          제출물
        </label>
        <input
          id="task-create-deliverable"
          type="text"
          className={styles.input}
          value={draft.deliverable}
          placeholder="예: A4 보고서 자료 PDF 파일"
          autoComplete="off"
          onChange={(event) => onDraftChange({ ...draft, deliverable: event.target.value })}
        />
      </div>
    </>
  )
}

// ---------- 4. 확인 (TaskRegister-05) ----------

function ConfirmStep({ draft, snapshotDate }: TaskCreateWizardProps) {
  const criteria = filledCriteria(draft)
  const rows: [string, string][] = [
    ['안내문', draft.guideMode === 'file' ? (draft.guideFile?.fileName ?? '') : '직접 입력'],
    ['과제', draft.title.trim()],
    ['과목 · 형태', [draft.subject, draft.performanceType].filter(Boolean).join(' · ')],
    ['마감', draft.deadlineDate ? `${formatDeadline(draft.deadlineDate)} · ${deadlineCountdown(draft.deadlineDate, snapshotDate)}` : ''],
    [
      '평가 기준',
      criteria.length > 0
        ? criteria.map((item) => (item.points === null ? item.name : `${item.name} ${item.points}점`)).join(' · ')
        : '입력하지 않음',
    ],
    ['제출물', draft.deliverable.trim() || '입력하지 않음'],
  ]
  return (
    <div className={styles.summary}>
      <dl className={styles.summaryList}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.summaryRow}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.summaryNote}>등록하면 안내문 등록 단계가 끝나고 주제 선정부터 시작해요.</p>
    </div>
  )
}
