import { fileExtensionLabel, formatFileSize, type GuideFileReadState } from '../model/taskCreate.ts'
import { taskStageNames } from '../model/tasks.ts'
import type { StudentTaskSummary } from '../model/types.ts'
import { versionSubmitLabel } from '../model/version.ts'
import { DialogShell } from './EvidenceDialogs.tsx'
import styles from './EvidenceParts.module.css'

interface VersionSubmitDialogProps {
  task: StudentTaskSummary
  versionNumber: number
  file: File | null
  fileState: GuideFileReadState
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  error?: string
  submitting: boolean
  submitFailed: boolean
  onSubmit: () => void
  onClose: () => void
}

// Version 제출 (Task Detail 위 Modal, TaskRegister / Evidence Dialog 체계):
// 어떤 Task의 몇 번째 Version인지 → 파일 선택 → 브라우저에서 파일 준비(실제 진행률) → 제출하기.
// 서버 Upload가 아니다. (File Storage 미정) 제출하면 AI 사전 점검이 바로 시작된다. AI 분석에는 진행률을 만들지 않는다.
export function VersionSubmitDialog({
  task,
  versionNumber,
  file,
  fileState,
  onFileSelect,
  onFileRemove,
  error,
  submitting,
  submitFailed,
  onSubmit,
  onClose,
}: VersionSubmitDialogProps) {
  const reading = fileState.status === 'reading' ? fileState : null
  const label = `V${versionNumber}`
  return (
    <DialogShell labelledBy="version-submit-heading" onCancel={() => !submitting && onClose()}>
      <form
        className={styles.dialogSurface}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className={styles.dialogHeader}>
          <h2 id="version-submit-heading" className={styles.dialogTitle} tabIndex={-1} data-autofocus>
            {versionSubmitLabel(versionNumber)}
          </h2>
          <p className={styles.dialogContext}>
            {task.title} · {task.subject} · {task.currentStage}단계 {taskStageNames[task.currentStage]}
          </p>
        </header>

        <div className={styles.dialogBody}>
          <div className={styles.field}>
            <span id="version-file-label" className={styles.label}>
              {label} 파일
            </span>
            <div
              id="version-file-box"
              tabIndex={-1}
              className={styles.fileBox}
              data-empty={!(file || reading) || undefined}
              aria-labelledby="version-file-label"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'version-file-error' : undefined}
            >
              {reading?.fileName ?? file?.name ?? '예: 항생제_내성_포스터_초안.pdf'}
            </div>

            {/* 파일 준비 진행률 (브라우저에서 읽은 비율) */}
            {reading && (
              <div className={styles.progress}>
                <p className={styles.progressText}>
                  파일을 준비하고 있어요 <span className={styles.progressPercent}>{reading.percent}%</span>
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
              <p id="version-file-error" className={styles.error}>
                {error}
              </p>
            )}
          </div>
          <p className={styles.hint}>
            제출하면 {label}로 저장되고 AI 사전 점검이 바로 시작돼요. 이전에 낸 버전은 그대로 남아요.
            {versionNumber > 1 && task.currentStage === 6 && ' 수행평가는 7단계 Revision으로 넘어가요.'}
          </p>
        </div>

        {submitFailed && (
          <p className={styles.submitError} role="alert">
            {label}을 제출하지 못했어요. 고른 파일은 그대로 있어요. 다시 제출해주세요.
          </p>
        )}

        <div className={styles.dialogFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" className={styles.primaryButton} disabled={submitting} data-inactive={!file || Boolean(reading) || undefined}>
            {submitting ? '제출 중…' : '제출하기'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
