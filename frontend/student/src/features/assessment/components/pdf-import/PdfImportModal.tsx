import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router'
import { toApiError } from '../../api/apiError.ts'
import { listEvaluationPlans, requestEvaluationPlanAnalysis, uploadEvaluationPlan } from '../../api/evaluationPlansApi.ts'
import type { EvaluationPlan, EvaluationPlanUpload } from '../../api/types.ts'
import { formatBytes } from '../../model/assessmentDetailView.ts'
import { useAssessmentWorkspace } from '../../model/assessmentWorkspace.ts'
import { mockPdfPolicy } from '../../model/pdfImportPolicy.ts'
import { planContextIssue, planTermLabel, reviewStatusLabel, validatePdfFile } from '../../model/pdfImportView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { pdfImportReviewPath } from '../../routes/paths.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, CheckIcon, FileIcon, InfoIcon, UploadIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './pdfImport.module.css'

type Selection = { kind: 'plan'; plan: EvaluationPlan } | { kind: 'file'; file: File }

type Phase =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'requesting' }
  | { kind: 'uploadError'; message: string }
  | { kind: 'analysisError'; message: string; engineMissing: boolean }

interface PdfImportModalProps {
  onClose: () => void
  /** 분석을 쓸 수 없을 때 직접 추가로 넘어간다 (기존 수행평가 추가 Modal) */
  onManualAdd: () => void
}

// 평가계획 PDF 가져오기 (Mockup SA-LIST-02). 학교 수행평가 목록과 Assessment 홈이 같은 Modal을 연다.
// 왼쪽: 내 PDF 선택(끌어 놓기·선택) + 학교 공통 평가계획서(§10-1, 시연 데이터). 오른쪽: 가져오기 안내.
// 공통 문서는 분석 요청(§11 POST) 뒤 결과 검토 화면으로 간다. 내 PDF는 업로드(§10-2, Mock: 메타데이터만) 후
// 분석 요청을 보내지만 분석 엔진이 없어 실패로 끝난다 — 임의 결과를 내 PDF의 추출값처럼 보여주지 않는다.
export function PdfImportModal({ onClose, onManualAdd }: PdfImportModalProps) {
  const { selectedContext } = useAssessmentWorkspace()
  const navigate = useNavigate()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<Selection>()
  const [fileError, setFileError] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [showPrevious, setShowPrevious] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [upload, setUpload] = useState<{ file: File; result: EvaluationPlanUpload }>()
  const busyRef = useRef(false)
  const [previewUrl, setPreviewUrl] = useState<string>()
  const previewUrlRef = useRef<string>(undefined)

  // 내 PDF 미리보기는 브라우저 Blob URL로만 연다 (서버로 보내지 않음). 바꾸거나 선택을 취소하거나 닫으면 정리한다.
  const selectedFile = selection?.kind === 'file' ? selection.file : undefined
  const replacePreview = (file: File | undefined) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = file ? URL.createObjectURL(file) : undefined
    setPreviewUrl(previewUrlRef.current)
  }
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  const contextKey = selectedContext ? `${selectedContext.school.schoolId}|${selectedContext.academicYear}|${selectedContext.grade}|${selectedContext.semester}` : 'none'
  const plans = useApiQuery(`pdf-plans|${contextKey}`, () =>
    selectedContext
      ? listEvaluationPlans({ schoolId: selectedContext.school.schoolId, academicYear: selectedContext.academicYear, grade: selectedContext.grade, semester: selectedContext.semester })
      : Promise.resolve({ items: [] }),
  )
  const previousPlans = useApiQuery(showPrevious && selectedContext ? `pdf-plans-prev|${contextKey}` : 'pdf-plans-prev|off', () =>
    showPrevious && selectedContext
      ? listEvaluationPlans({ schoolId: selectedContext.school.schoolId, academicYear: selectedContext.academicYear - 1, grade: selectedContext.grade, semester: selectedContext.semester })
      : Promise.resolve({ items: [] }),
  )

  const busy = phase.kind === 'uploading' || phase.kind === 'requesting'
  const selectedIssue = selection?.kind === 'plan' && selectedContext ? planContextIssue(selection.plan, selectedContext) : null
  const canAnalyze = Boolean(selectedContext && selection && !busy && !(selectedIssue?.kind === 'otherSchool'))

  const chooseFile = (file: File | undefined) => {
    if (busy || !file) return
    setPhase({ kind: 'idle' })
    setUpload(undefined)
    const error = validatePdfFile(file)
    setFileError(error ?? undefined)
    setSelection(error ? undefined : { kind: 'file', file })
    replacePreview(error ? undefined : file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length > 1) {
      setFileError('PDF는 한 번에 하나만 선택할 수 있어요.')
      return
    }
    chooseFile(event.dataTransfer.files[0])
  }

  const startAnalysis = async (documentRevisionId: string, plan?: EvaluationPlan) => {
    setPhase({ kind: 'requesting' })
    try {
      await requestEvaluationPlanAnalysis(documentRevisionId)
      onClose()
      navigate(pdfImportReviewPath(documentRevisionId), { state: { plan } })
    } catch (caught) {
      const error = toApiError(caught)
      setPhase({
        kind: 'analysisError',
        message: `${error.message} (${error.code})`,
        engineMissing: error.details?.reason === 'MOCK_NO_ANALYSIS_ENGINE',
      })
    }
  }

  const analyze = async () => {
    if (!selectedContext || !selection || busyRef.current) return
    busyRef.current = true
    try {
      if (selection.kind === 'plan') {
        await startAnalysis(selection.plan.documentRevisionId, selection.plan)
        return
      }
      // 이미 올린 같은 파일이면 다시 올리지 않고 분석 요청만 다시 보낸다.
      let current = upload?.file === selection.file ? upload.result : undefined
      if (!current) {
        setPhase({ kind: 'uploading' })
        try {
          current = await uploadEvaluationPlan({
            file: selection.file,
            schoolId: selectedContext.school.schoolId,
            academicYear: selectedContext.academicYear,
            grade: selectedContext.grade,
            semester: selectedContext.semester,
          })
          setUpload({ file: selection.file, result: current })
        } catch (caught) {
          const error = toApiError(caught)
          setPhase({ kind: 'uploadError', message: `${error.message} (${error.code})` })
          return
        }
      }
      await startAnalysis(current.documentRevisionId)
    } finally {
      busyRef.current = false
    }
  }

  const planRow = (plan: EvaluationPlan) => {
    const issue = selectedContext ? planContextIssue(plan, selectedContext) : null
    const selected = selection?.kind === 'plan' && selection.plan.documentRevisionId === plan.documentRevisionId
    return (
      <li key={plan.documentRevisionId}>
        <button
          type="button"
          className={styles.planRow}
          aria-pressed={selected}
          disabled={busy}
          onClick={() => {
            setFileError(undefined)
            setPhase({ kind: 'idle' })
            setSelection({ kind: 'plan', plan })
            replacePreview(undefined)
          }}
        >
          <FileIcon size={16} className={styles.pdfIcon} />
          <span className={styles.planText}>
            <span className={styles.planName}>{plan.fileName}</span>
            <span className={styles.planMeta}>
              {planTermLabel(plan)} · {reviewStatusLabel(plan.reviewStatus)} · 시연 데이터
            </span>
            {issue && (
              <span className={styles.planIssue} data-kind={issue.kind}>
                <AlertIcon size={12} />
                {issue.message}
              </span>
            )}
          </span>
          {selected && <CheckIcon size={16} className={styles.planCheck} />}
        </button>
      </li>
    )
  }

  return (
    <Modal
      title="평가계획 PDF 가져오기"
      description="PDF를 고르면 과목별 수행평가 후보를 확인할 수 있어요."
      wide
      onRequestClose={() => {
        if (!busy) onClose()
      }}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={busy}>
            취소
          </button>
          <button type="button" className={formStyles.primaryButton} disabled={!canAnalyze} aria-busy={busy} onClick={() => void analyze()}>
            {phase.kind === 'uploading' ? '올리는 중…' : phase.kind === 'requesting' ? '분석 요청 중…' : '분석하기'}
          </button>
        </>
      }
    >
      {!selectedContext ? (
        <p className={styles.notice}>학교·학업 정보를 먼저 확인해 주세요. 학기를 알아야 맞는 평가계획서를 찾을 수 있어요.</p>
      ) : (
        <div className={styles.modalGrid}>
          <div className={styles.modalMain}>
            <div
              className={styles.dropzone}
              data-dragging={dragging}
              onDragOver={(event) => {
                event.preventDefault()
                if (!busy) setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept="application/pdf,.pdf"
                className="lh-visually-hidden"
                disabled={busy}
                aria-describedby={fileError ? `${inputId}-error` : `${inputId}-hint`}
                onChange={(event) => {
                  chooseFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              {selectedFile ? (
                <div className={styles.fileCard}>
                  <FileIcon size={22} className={styles.pdfIcon} />
                  <span className={styles.planText}>
                    <span className={styles.planName}>{selectedFile.name}</span>
                    <span className={styles.planMeta}>
                      {formatBytes(selectedFile.size)} · 내 PDF (나만 볼 수 있어요)
                      {upload?.file === selectedFile && ' · 올림(시연, 내용 저장 안 됨)'}
                    </span>
                  </span>
                  <span className={styles.fileActions}>
                    {previewUrl && (
                      <a href={previewUrl} target="_blank" rel="noreferrer" className={styles.textButton}>
                        미리보기
                      </a>
                    )}
                    <label htmlFor={inputId} className={styles.textButton} aria-disabled={busy}>
                      바꾸기
                    </label>
                    <button
                      type="button"
                      className={styles.textButton}
                      disabled={busy}
                      onClick={() => {
                        setSelection(undefined)
                        replacePreview(undefined)
                      }}
                    >
                      선택 취소
                    </button>
                  </span>
                </div>
              ) : (
                <label htmlFor={inputId} className={styles.dropLabel}>
                  <UploadIcon size={22} className={styles.pdfIcon} />
                  <span className={styles.dropTitle}>PDF 파일을 끌어다 놓거나 선택해 주세요</span>
                  <span id={`${inputId}-hint`} className={styles.dropHint}>
                    교과별(학년별) 교수·학습 및 평가계획 · 시연 기준 최대 {mockPdfPolicy.maxPagesLabel} · {Math.round(mockPdfPolicy.maxBytes / 1024 / 1024)}MB 이하
                  </span>
                </label>
              )}
            </div>
            {fileError && (
              <p id={`${inputId}-error`} className={formStyles.fieldError} role="alert">
                {fileError}
              </p>
            )}

            <p className={styles.listLabel}>학교 공통 평가계획서 · 시연 데이터</p>
            {plans.status === 'error' && plans.error ? (
              <ErrorState title="공통 평가계획서를 불러오지 못했어요" error={plans.error} onRetry={plans.retry} />
            ) : !plans.data ? (
              <LoadingRows rows={2} label="공통 평가계획서를 불러오는 중" />
            ) : plans.data.items.length === 0 ? (
              <p className={styles.notice}>이 학기에 등록된 공통 평가계획서가 없어요. 내 PDF를 선택하거나 직접 추가해 주세요.</p>
            ) : (
              <ul className={styles.planList}>{plans.data.items.map(planRow)}</ul>
            )}
            {!showPrevious ? (
              <button type="button" className={styles.textButton} onClick={() => setShowPrevious(true)}>
                작년 평가계획서 보기 (참고용)
              </button>
            ) : previousPlans.status === 'error' && previousPlans.error ? (
              <ErrorState title="작년 평가계획서를 불러오지 못했어요" error={previousPlans.error} onRetry={previousPlans.retry} />
            ) : previousPlans.data && previousPlans.data.items.length > 0 ? (
              <ul className={styles.planList} aria-label="작년 평가계획서">
                {previousPlans.data.items.map(planRow)}
              </ul>
            ) : previousPlans.data ? (
              <p className={styles.notice}>작년 공통 평가계획서가 없어요.</p>
            ) : (
              <LoadingRows rows={1} label="작년 평가계획서를 불러오는 중" />
            )}

            {phase.kind === 'uploadError' && (
              <p className={formStyles.formError} role="alert">
                <AlertIcon size={16} />
                파일을 올리지 못했어요. {phase.message} 다시 "분석하기"를 누르면 다시 올려요.
              </p>
            )}
            {phase.kind === 'analysisError' && (
              <div className={styles.errorBox} role="alert">
                <p>
                  <AlertIcon size={16} /> {phase.message}
                </p>
                {phase.engineMissing ? (
                  <p>
                    지금은 화면 시연 단계라 선택한 PDF의 내용을 분석하지 않아요. 파일은 서버에 저장되지 않았어요. PDF를 보면서 직접 추가하거나, 학교 공통
                    평가계획서(시연)로 분석 결과 화면을 확인할 수 있어요.
                  </p>
                ) : (
                  <p>다시 "분석하기"를 누르거나 직접 추가할 수 있어요.</p>
                )}
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => {
                    onClose()
                    onManualAdd()
                  }}
                >
                  수행평가 직접 추가하기
                </button>
              </div>
            )}
          </div>

          <aside className={styles.guide} aria-labelledby="pdf-guide-title">
            <p id="pdf-guide-title" className={styles.guideTitle}>
              <InfoIcon size={16} />
              가져오기 안내
            </p>
            <ul className={styles.guideList}>
              <li>학교알리미 → 공시정보 → 교과별(학년별) 교수·학습 및 평가계획에서 PDF를 받을 수 있어요.</li>
              <li>과목별 수행평가, 반영비율, 평가 기준을 찾아 후보로 보여줘요. 지필평가는 따로 구분하고 수행평가 목록에 넣지 않아요.</li>
              <li>공시 자료는 작년 것일 수 있어요. 등록 전에 꼭 확인하고 고쳐 주세요.</li>
              <li>문서에 날짜가 없으면 날짜를 지어내지 않고 비워 둬요.</li>
              <li>지금은 시연 단계예요. 내 PDF는 서버에 저장되지 않고 내용도 분석되지 않아요.</li>
            </ul>
          </aside>
        </div>
      )}
    </Modal>
  )
}
