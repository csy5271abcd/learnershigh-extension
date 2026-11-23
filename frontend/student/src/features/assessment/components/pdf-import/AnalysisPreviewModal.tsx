import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  AnalysisPreviewError,
  analysisPreviewMaxBytes,
  checkAnalyzerHealth,
  fileSha256,
  previewExtensions,
  requestAnalysisPreview,
  sniffFormat,
  type AnalyzerHealth,
  type PreviewFailureKind,
  type PreviewFormat,
} from '../../api/dev/analysisPreviewClient.ts'
import { savePreview } from '../../model/analysisPreviewSession.ts'
import { formatBytes } from '../../model/assessmentDetailView.ts'
import { analysisPreviewResultPath } from '../../routes/paths.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, FileIcon, InfoIcon, UploadIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import styles from './pdfImport.module.css'
import previewStyles from './analysisPreview.module.css'

// 평가계획서 가져오기 — 개발용 분석 미리보기 (2026-11-11, 개발 Flag 전용).
// - 이 Modal은 **파일 선택·검증·분석 요청·실패 안내**만 한다. 성공하면 Modal을 닫고 결과 전체 페이지
//   (`/assessment/school-assessments/analysis-preview/:previewId`)로 이동한다. 결과 본문은 Modal에 그리지 않는다.
// - 실제 파일(PDF·HWP·HWPX)을 계정 B 로컬 분석기에 보내고 실제 결과를 보여준다. 성공을 Mock 결과로 대신하지 않는다.
// - 결과는 저장하지 않는다: 학생 수행평가 생성·평가계획서 Revision·관리자 확정 상태 전환 없음. 공식 평가정보로 표시하지 않는다.
// - 기본 시연 환경(Flag OFF)에서는 이 Modal이 아니라 기존 "평가계획 PDF 가져오기" Modal이 열린다.

interface Selected {
  file: File
  extension: PreviewFormat
  sniffed: PreviewFormat | 'UNKNOWN'
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'analyzing' }
  | { kind: 'failure'; error: AnalysisPreviewError }

const failureTitles: Record<PreviewFailureKind, string> = {
  CONNECTION: '분석기 연결 실패',
  UNSUPPORTED: '지원하지 않는 문서',
  EXTRACTION: '원문 추출 실패',
  TOO_LARGE: '파일이 너무 커요',
  BUSY: '분석기가 다른 문서를 분석 중이에요',
  ANALYSIS: '분석 실패',
  REQUEST: '분석 요청 오류',
}

const failureHelp: Record<PreviewFailureKind, string> = {
  CONNECTION: '지금 분석 서비스에 연결하지 못했어요. 잠시 뒤 다시 시도하거나 직접 추가해 주세요.',
  UNSUPPORTED: '파일 내용이 PDF·HWP·HWPX가 아니에요(확장자만 바꾼 파일, 암호화 문서 포함). 원본 파일을 다시 받아 선택해 주세요.',
  EXTRACTION: '파일이 손상됐거나 안전 검사에 걸려 원문을 읽지 못했어요. 다른 파일로 시도해 주세요.',
  TOO_LARGE: '20MB 이하 파일만 분석할 수 있어요.',
  BUSY: '잠시 후 다시 시도해 주세요.',
  ANALYSIS: '분석기가 결과를 만들지 못했어요. 같은 파일로 다시 시도하거나 직접 추가해 주세요.',
  REQUEST: '요청을 처리하지 못했어요. 잠시 뒤 다시 시도하거나 직접 추가해 주세요.',
}

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''



interface AnalysisPreviewModalProps {
  onClose: () => void
  onManualAdd: () => void
  /** 학교 공통 평가계획서(공식, §10-1)를 고르는 기존 가져오기 화면으로 바꾼다 */
  onUseOfficialPlans: () => void
}

export function AnalysisPreviewModal({ onClose, onManualAdd, onUseOfficialPlans }: AnalysisPreviewModalProps) {
  const navigate = useNavigate()
  const inputId = useId()
  const [health, setHealth] = useState<AnalyzerHealth>()
  const [selected, setSelected] = useState<Selected>()
  const [fileError, setFileError] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const busyRef = useRef(false)
  const abortRef = useRef<AbortController>(undefined)

  useEffect(() => {
    let alive = true
    void checkAnalyzerHealth().then((result) => alive && setHealth(result))
    return () => {
      alive = false
      abortRef.current?.abort()
    }
  }, [])

  const busy = phase.kind === 'checking' || phase.kind === 'analyzing'

  const chooseFile = async (file: File | undefined) => {
    if (busy || !file) return
    setPhase({ kind: 'idle' })
    setSelected(undefined)
    const extension = previewExtensions[extensionOf(file.name)]
    if (!extension) {
      setFileError('PDF·HWP·HWPX 파일만 분석할 수 있어요.')
      return
    }
    if (file.size === 0) {
      setFileError('빈 파일이에요.')
      return
    }
    if (file.size > analysisPreviewMaxBytes) {
      setFileError(`20MB 이하 파일만 분석할 수 있어요. (선택한 파일 ${formatBytes(file.size)})`)
      return
    }
    setPhase({ kind: 'checking' })
    const sniffed = await sniffFormat(file).catch(() => 'UNKNOWN' as const)
    setPhase({ kind: 'idle' })
    // 확장자와 내용 서명이 다르면 보내기 전에 막는다. 최종 형식 판별은 분석기가 파일 내용으로 다시 한다.
    if (sniffed !== extension) {
      setFileError(
        sniffed === 'UNKNOWN'
          ? `확장자는 .${extension.toLowerCase()}지만 파일 내용이 PDF·HWP·HWPX가 아니에요.`
          : `확장자(.${extension.toLowerCase()})와 파일 내용(${sniffed})이 달라요. 원본 파일을 선택해 주세요.`,
      )
      return
    }
    setFileError(undefined)
    setSelected({ file, extension, sniffed })
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length > 1) {
      setFileError('파일은 한 번에 하나만 선택할 수 있어요.')
      return
    }
    void chooseFile(event.dataTransfer.files[0])
  }

  const analyze = async () => {
    if (!selected || busyRef.current) return
    busyRef.current = true
    abortRef.current = new AbortController()
    setPhase({ kind: 'analyzing' })
    try {
      const [result, localSha256] = await Promise.all([
        requestAnalysisPreview(selected.file, abortRef.current.signal),
        fileSha256(selected.file).catch(() => null),
      ])
      const entry = savePreview({ fileName: selected.file.name, fileSize: selected.file.size, localSha256, result })
      onClose()
      navigate(analysisPreviewResultPath(entry.previewId))
    } catch (caught) {
      if (abortRef.current.signal.aborted) return
      const error = caught instanceof AnalysisPreviewError ? caught : new AnalysisPreviewError('ANALYSIS', 0, 'UNKNOWN', String(caught), null)
      setPhase({ kind: 'failure', error })
    } finally {
      busyRef.current = false
    }
  }

  return (
    <Modal
      title="평가계획서 가져오기"
      description="PDF·HWP·HWPX 평가계획서를 자동 분석해요. 분석이 끝나면 결과 페이지로 이동해요. 결과는 저장되지 않아요."
      wide
      onRequestClose={() => {
        if (!busy) onClose()
      }}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={busy}>
            닫기
          </button>
          <button type="button" className={formStyles.primaryButton} disabled={!selected || busy} aria-busy={busy} onClick={() => void analyze()}>
            {phase.kind === 'analyzing' ? '분석 중…' : phase.kind === 'failure' ? '다시 분석' : '분석 시작'}
          </button>
        </>
      }
    >
      <p className={previewStyles.devBanner} data-testid="analysis-preview-banner">
        <InfoIcon size={14} />
        <span>
          개발용 분석 미리보기 · 로컬 분석기 {health?.reachable ? `연결됨 (기본 ${health.defaultAnalyzerVersion ?? '버전 미확인'})` : health ? '연결 안 됨' : '확인 중…'} · 공식 평가정보가
          아니며 저장되지 않아요.
        </span>
      </p>

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
              id={inputId}
              type="file"
              accept=".pdf,.hwp,.hwpx,application/pdf"
              className="lh-visually-hidden"
              disabled={busy}
              aria-describedby={fileError ? `${inputId}-error` : `${inputId}-hint`}
              onChange={(event) => {
                void chooseFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            {selected ? (
              <div className={styles.fileCard} data-testid="analysis-preview-file">
                <FileIcon size={22} className={styles.pdfIcon} />
                <span className={styles.planText}>
                  <span className={styles.planName}>{selected.file.name}</span>
                  <span className={styles.planMeta}>
                    {selected.extension} · {formatBytes(selected.file.size)} · 내용 확인: {selected.sniffed}
                  </span>
                </span>
                <span className={styles.fileActions}>
                  <label htmlFor={inputId} className={styles.textButton} aria-disabled={busy}>
                    바꾸기
                  </label>
                  <button
                    type="button"
                    className={styles.textButton}
                    disabled={busy}
                    onClick={() => {
                      setSelected(undefined)
                      setPhase({ kind: 'idle' })
                    }}
                  >
                    선택 취소
                  </button>
                </span>
              </div>
            ) : (
              <label htmlFor={inputId} className={styles.dropLabel}>
                <UploadIcon size={22} className={styles.pdfIcon} />
                <span className={styles.dropTitle}>평가계획서 파일을 끌어다 놓거나 선택해 주세요</span>
                <span id={`${inputId}-hint`} className={styles.dropHint}>
                  PDF · HWP · HWPX · 20MB 이하 · 형식은 확장자가 아니라 파일 내용으로 확인해요
                </span>
              </label>
            )}
          </div>
          {fileError && (
            <p id={`${inputId}-error`} className={formStyles.fieldError} role="alert">
              {fileError}
            </p>
          )}

          {phase.kind === 'analyzing' && (
            <p className={previewStyles.progress} role="status">
              분석 중이에요. 문서에 따라 수십 초 걸릴 수 있어요…
            </p>
          )}
          {phase.kind === 'failure' && <FailureBox error={phase.error} onManualAdd={() => (onClose(), onManualAdd())} />}
          <button type="button" className={styles.textButton} disabled={busy} onClick={onUseOfficialPlans} data-testid="use-official-plans">
            학교 공통 평가계획서에서 고르기 (관리자 확인 자료)
          </button>
        </div>

        <aside className={styles.guide} aria-labelledby="analysis-guide-title">
          <p id="analysis-guide-title" className={styles.guideTitle}>
            <InfoIcon size={16} />
            분석 미리보기 안내
          </p>
          <ul className={styles.guideList}>
            <li>파일은 이 PC의 로컬 분석기로만 보내요. 외부 서버나 AI 서비스로 보내지 않아요.</li>
            <li>규칙 기반 문서 구조 분석이에요(AI·LLM 호출 없음). 결과는 후보일 뿐이고 관리자 확인 전이에요.</li>
            <li>결과는 저장되지 않고, 수행평가 목록·공식 평가정보에 자동으로 들어가지 않아요.</li>
            <li>문서에 없는 날짜·배점은 비워 둬요. 근거 위치(PDF 쪽, HWP·HWPX 표 위치)를 함께 보여줘요.</li>
          </ul>
        </aside>
      </div>
    </Modal>
  )
}

function FailureBox({ error, onManualAdd }: { error: AnalysisPreviewError; onManualAdd: () => void }) {
  return (
    <div className={styles.errorBox} role="alert" data-testid="analysis-preview-failure" data-kind={error.kind}>
      <p>
        <AlertIcon size={16} /> <strong>{failureTitles[error.kind]}</strong> · {error.message} ({error.code}
        {error.httpStatus ? ` · HTTP ${error.httpStatus}` : ''})
      </p>
      {error.response?.source?.detectedFormat && (
        <p>
          분석기가 확인한 형식: {error.response.source.detectedFormat} · 크기 {formatBytes(error.response.source.sizeBytes ?? 0)}
        </p>
      )}
      <p>{failureHelp[error.kind]}</p>
      <button type="button" className={styles.textButton} onClick={onManualAdd}>
        수행평가 직접 추가하기
      </button>
    </div>
  )
}
