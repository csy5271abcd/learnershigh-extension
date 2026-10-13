import { useEffect, useRef, useState, type ReactNode } from 'react'
import { fileExtensionLabel, formatFileSize, type GuideFileReadState } from '../model/taskCreate.ts'
import { processCategories } from '../model/taskDetail.ts'
import type { TaskEvidence, TaskProcessCategory } from '../model/types.ts'
import styles from './EvidenceParts.module.css'

// ---------- 공통 Modal Shell (Native <dialog>: 배경 차단 / Focus 가두기 / ESC) ----------
// Evidence와 Version 제출 / 미리보기가 같이 쓴다.

export function DialogShell({
  labelledBy,
  onCancel,
  className,
  children,
}: {
  labelledBy: string
  onCancel: () => void
  className?: string
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    // 열기 전 Focus를 기억했다가, 닫힐 때(Unmount 포함) Focus가 갈 곳을 잃었으면 돌려준다.
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
    return () => {
      if (dialog?.open) dialog.close()
      const lost = !document.activeElement || document.activeElement === document.body || dialog?.contains(document.activeElement)
      if (lost && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${className ?? ''}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      {children}
    </dialog>
  )
}

// ---------- 자료 추가 ----------

interface EvidenceAddDialogProps {
  /** 어디에 올리는 자료인지 (예: Task 제목 · 과목 · 단계 / Activity 이름 · 유형) */
  context: string
  file: File | null
  fileState: GuideFileReadState
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  /** Task 과정 자료만: 단계 Tag. 없으면(Activity) 단계 Tag를 묻지 않는다. */
  stageTag?: TaskProcessCategory
  onStageTagChange?: (tag: TaskProcessCategory) => void
  error?: string
  submitting: boolean
  submitFailed: boolean
  onSubmit: () => void
  onClose: () => void
}

// 자료 추가: 파일 선택 → 브라우저에서 파일 준비(실제 진행률) → 단계 Tag → 추가하기
// 서버 Upload가 아니다. (File Storage 미정) 진행률은 브라우저가 파일을 읽은 비율이다.
export function EvidenceAddDialog({
  context,
  file,
  fileState,
  onFileSelect,
  onFileRemove,
  stageTag,
  onStageTagChange,
  error,
  submitting,
  submitFailed,
  onSubmit,
  onClose,
}: EvidenceAddDialogProps) {
  const reading = fileState.status === 'reading' ? fileState : null
  return (
    <DialogShell labelledBy="evidence-add-heading" onCancel={() => !submitting && onClose()}>
      <form
        className={styles.dialogSurface}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className={styles.dialogHeader}>
          <h2 id="evidence-add-heading" className={styles.dialogTitle} tabIndex={-1} data-autofocus>
            자료 추가
          </h2>
          <p className={styles.dialogContext}>
            {context}
          </p>
        </header>

        <div className={styles.dialogBody}>
          <div className={styles.field}>
            <span id="evidence-file-label" className={styles.label}>
              파일
            </span>
            <div
              id="evidence-file-box"
              tabIndex={-1}
              className={styles.fileBox}
              data-empty={!(file || reading) || undefined}
              aria-labelledby="evidence-file-label"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'evidence-file-error' : undefined}
            >
              {reading?.fileName ?? file?.name ?? '예: 하천_현장조사사진.zip'}
            </div>

            {/* 파일 준비 진행률 (브라우저에서 읽은 비율) */}
            {reading && (
              <div className={styles.progress}>
                <p className={styles.progressText}>
                  자료를 준비하고 있어요 <span className={styles.progressPercent}>{reading.percent}%</span>
                </p>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-label={`${reading.fileName} 준비`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={reading.percent}
                  aria-valuetext={`${reading.fileName} 준비 ${reading.percent}%`}
                >
                  <span className={styles.progressFill} style={{ width: `${reading.percent}%` }} />
                </div>
              </div>
            )}
            {!reading && file && (
              <p className={styles.fileReady}>
                준비 완료 · {fileExtensionLabel(file.name)} · {formatFileSize(file.size)}
              </p>
            )}
            {fileState.status === 'error' && (
              <p className={styles.error} role="alert">
                {fileState.fileName} 파일을 읽지 못했어요. 다른 파일을 다시 선택해주세요.
              </p>
            )}

            <div className={styles.fileActions}>
              <label className={styles.fileButton}>
                <input
                  type="file"
                  className="lh-visually-hidden"
                  onChange={(event) => {
                    const picked = event.target.files?.[0]
                    event.target.value = ''
                    if (picked) onFileSelect(picked)
                  }}
                />
                <span>{file || reading ? '다른 파일 선택' : '파일 선택'}</span>
              </label>
              {file && !reading && (
                <button type="button" className={styles.textButton} aria-label={`${file.name} 빼기`} onClick={onFileRemove}>
                  빼기
                </button>
              )}
            </div>
            {error && (
              <p id="evidence-file-error" className={styles.error}>
                {error}
              </p>
            )}
          </div>

          {stageTag && onStageTagChange && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>어느 단계 자료인가요?</legend>
            <div className={styles.chips}>
              {processCategories.map((category) => (
                <label key={category.id} className={styles.chip}>
                  <input
                    type="radio"
                    name="evidence-stage-tag"
                    className="lh-visually-hidden"
                    checked={stageTag === category.id}
                    onChange={() => onStageTagChange(category.id)}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>
            <p className={styles.hint}>단계 Tag는 자료를 정리하는 표시예요. 수행평가 단계는 바뀌지 않아요.</p>
          </fieldset>
          )}
        </div>

        {submitFailed && (
          <p className={styles.submitError} role="alert">
            자료를 추가하지 못했어요. 고른 파일{stageTag ? '과 단계는' : '은'} 그대로 있어요. 다시 추가해주세요.
          </p>
        )}

        <div className={styles.dialogFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" className={styles.primaryButton} disabled={submitting} data-inactive={!file || Boolean(reading) || undefined}>
            {submitting ? '추가 중…' : '추가하기'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

// ---------- 미리보기 ----------

type PreviewKind = 'image' | 'pdf' | 'text' | 'csv' | 'unsupported'

const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
const textExtensions = ['txt', 'py', 'md', 'json']

function previewKind(fileName: string): PreviewKind {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (imageExtensions.includes(extension)) return 'image'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'csv') return 'csv'
  if (textExtensions.includes(extension)) return 'text'
  return 'unsupported'
}

/** 간단한 CSV 표시: 줄 / 쉼표로만 나눈다. (따옴표 안 쉼표는 지원하지 않는다) */
const parseCsv = (text: string) =>
  text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .slice(0, 200)
    .map((line) => line.split(','))

/**
 * 이번 Session에 고른 이미지 / PDF를 Object URL로 보여준다. 닫히면(Unmount) Object URL을 해제한다.
 * PDF는 브라우저 내장 Viewer가 그린다. (새 Viewer Package 없음)
 */
function ObjectUrlPreview({ file, kind, name }: { file: File; kind: 'image' | 'pdf'; name: string }) {
  const imageRef = useRef<HTMLImageElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const element = kind === 'image' ? imageRef.current : frameRef.current
    if (!element) return
    const url = URL.createObjectURL(file)
    element.src = url
    return () => {
      element.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [file, kind])
  return kind === 'image' ? (
    <img ref={imageRef} className={styles.previewImage} alt={`${name} 미리보기`} />
  ) : (
    <iframe ref={frameRef} className={styles.previewFrame} title={`${name} 미리보기`} />
  )
}

function PreviewBody({ fileName, file }: { fileName: string; file?: File }) {
  const kind = previewKind(fileName)
  const [text, setText] = useState<string>()

  useEffect(() => {
    if (!file || (kind !== 'text' && kind !== 'csv')) return
    let active = true
    file.text().then((value) => active && setText(value))
    return () => {
      active = false
    }
  }, [file, kind])

  if (kind === 'unsupported') {
    return <p className={styles.previewNotice}>미리보기를 지원하지 않는 파일이에요. ({fileExtensionLabel(fileName)})</p>
  }
  if (!file) {
    return <p className={styles.previewNotice}>이 자료의 원본 파일이 아직 준비되지 않아 미리볼 수 없어요.</p>
  }
  if (kind === 'image' || kind === 'pdf') return <ObjectUrlPreview file={file} kind={kind} name={fileName} />
  if (text === undefined) return null
  if (kind === 'csv') {
    const rows = parseCsv(text)
    return (
      <div className={styles.previewTableScroll} tabIndex={0} role="region" aria-label={`${fileName} 표`}>
        <table className={styles.previewTable}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return <pre className={styles.previewText}>{text}</pre>
}

// 미리보기 Dialog: Header(형식 · 파일 이름 · 단계 Tag · 닫기) + 내용. Evidence 요구에 Download가 없어 두지 않는다.
export function EvidencePreviewDialog({ evidence, onClose }: { evidence: TaskEvidence; onClose: () => void }) {
  const tag = processCategories.find((category) => category.id === evidence.stageTag)
  return <FilePreviewDialog fileName={evidence.fileName} file={evidence.file} subtitle={tag?.label} onClose={onClose} />
}

/** 파일 미리보기 공통 Dialog (Evidence / Version). subtitle은 단계 Tag나 Version 정보다. */
export function FilePreviewDialog({
  fileName,
  file,
  subtitle,
  onClose,
}: {
  fileName: string
  file?: File
  subtitle?: string
  onClose: () => void
}) {
  return (
    <DialogShell labelledBy="evidence-preview-heading" onCancel={onClose} className={styles.previewDialog}>
      <div className={styles.dialogSurface}>
        <header className={styles.previewHeader}>
          <span className={styles.previewType} aria-hidden="true">
            {fileExtensionLabel(fileName)}
          </span>
          <div className={styles.previewTitleBox}>
            <h2 id="evidence-preview-heading" className={styles.previewTitle}>
              {fileName}
            </h2>
            {subtitle && <p className={styles.hint}>{subtitle}</p>}
          </div>
          <button type="button" className={styles.closeButton} aria-label="미리보기 닫기" onClick={onClose} data-autofocus>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className={styles.previewBody}>
          <PreviewBody fileName={fileName} file={file} />
        </div>
      </div>
    </DialogShell>
  )
}

// ---------- 삭제 확인 ----------

export function EvidenceDeleteDialog({
  evidence,
  description,
  deleting,
  onConfirm,
  onClose,
}: {
  evidence: Pick<TaskEvidence, 'fileName'>
  /** 삭제하면 어디에서 사라지는지 (없으면 수행평가 자료 기준 문장) */
  description?: string
  deleting: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <DialogShell labelledBy="evidence-delete-heading" onCancel={() => !deleting && onClose()} className={styles.confirmDialog}>
      <div className={styles.confirmSurface}>
        <h2 id="evidence-delete-heading" className={styles.confirmTitle}>
          자료를 삭제할까요?
        </h2>
        <p className={styles.confirmText}>
          {description ?? `${evidence.fileName}을(를) 삭제하면 이 수행평가 자료와 School Evidence에서 함께 사라져요.`}
        </p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={deleting} data-autofocus>
            취소
          </button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm} disabled={deleting}>
            {deleting ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </div>
    </DialogShell>
  )
}
