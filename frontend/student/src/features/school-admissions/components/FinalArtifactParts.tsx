import { formatDateTime } from '../model/taskDetail.ts'
import { canChangeParentShare, parentShareStatusText } from '../model/finalArtifact.ts'
import type { TaskFinalArtifact, TaskFinalArtifactState, TaskVersion } from '../model/types.ts'
import { DialogShell } from './EvidenceDialogs.tsx'
import dialogStyles from './EvidenceParts.module.css'
import styles from './FinalArtifactParts.module.css'

// ---------- 최종 제출 확인 ----------

interface FinalSubmitDialogProps {
  /** 최종본이 될 Version (선생님이 최종 제출 준비라고 한 최근 Version) */
  version: TaskVersion
  submitting: boolean
  failed: boolean
  onConfirm: () => void
  onClose: () => void
}

// 최종 제출은 되돌리기 어려워 한 번 더 확인한다. 새 파일을 올리지 않고 최근 Version을 최종본으로 정한다.
export function FinalSubmitDialog({ version, submitting, failed, onConfirm, onClose }: FinalSubmitDialogProps) {
  return (
    <DialogShell labelledBy="final-submit-heading" onCancel={() => !submitting && onClose()} className={dialogStyles.confirmDialog}>
      <div className={dialogStyles.confirmSurface}>
        <h2 id="final-submit-heading" className={dialogStyles.confirmTitle}>
          최종 제출할까요?
        </h2>
        <dl className={styles.selected}>
          <dt>최종본</dt>
          <dd>
            {version.label} · {version.fileName}
          </dd>
        </dl>
        <p className={dialogStyles.confirmText} id="final-submit-description">
          최종 제출하면 수행평가가 완료되고 더 이상 수정본을 낼 수 없어요. 지금까지의 버전 · 피드백 · 수정 기록 · 과정 자료는 그대로 남아요.
        </p>
        {failed && (
          <p className={styles.error} role="alert">
            최종 제출하지 못했어요. 수행평가는 그대로예요. 다시 시도해주세요.
          </p>
        )}
        <div className={dialogStyles.confirmActions}>
          <button type="button" className={dialogStyles.secondaryButton} onClick={onClose} disabled={submitting} data-autofocus>
            취소
          </button>
          <button
            type="button"
            className={dialogStyles.primaryButton}
            onClick={onConfirm}
            disabled={submitting}
            aria-describedby="final-submit-description"
          >
            {submitting ? '최종 제출 중…' : '최종 제출'}
          </button>
        </div>
      </div>
    </DialogShell>
  )
}

// ---------- 최종 결과물 + 학부모 공유 ----------

interface FinalArtifactSectionProps {
  state: TaskFinalArtifactState
  /** 최종 제출을 마친(8단계) 수행평가인지. 완료 전에는 최종 결과물 영역을 두지 않는다. */
  completed: boolean
  onPreview: (artifact: TaskFinalArtifact, trigger: HTMLElement) => void
  onShareChange: (consented: boolean) => void
  sharePending: boolean
  shareFailed: boolean
  onReload: () => void
}

/**
 * 완료 Task의 최종 결과물 (Overview). 미리보기 + 학부모 공유 동의.
 * 공유 동의는 Parent Report 첨부 "후보"가 될 뿐, 바로 보내지 않는다.
 * 공유 대상은 최종 결과물 하나뿐이다. (초안 / 수정 기록 / AI 사전 점검 / 선생님 피드백은 공유하지 않는다)
 */
export function FinalArtifactSection({
  state,
  completed,
  onPreview,
  onShareChange,
  sharePending,
  shareFailed,
  onReload,
}: FinalArtifactSectionProps) {
  if (!completed) return null
  if (state.status === 'error') {
    return (
      <section className={styles.section} aria-labelledby="task-final-heading">
        <h3 id="task-final-heading" className={styles.title}>
          최종 결과물
        </h3>
        <div className={styles.notice} role="alert">
          <p>최종 결과물을 불러오지 못했어요.</p>
          <button type="button" className={styles.textButton} onClick={onReload}>
            다시 시도
          </button>
        </div>
      </section>
    )
  }
  if (state.status === 'none') {
    // 완료됐지만 최종 결과물 파일 정보가 없는 수행평가 (TaskFinalArtifact는 선택). 미리보기 / 학부모 공유는 열지 않는다.
    return (
      <section className={styles.section} aria-labelledby="task-final-heading">
        <h3 id="task-final-heading" className={styles.title}>
          최종 결과물
        </h3>
        <p className={styles.meta}>최종 결과물 파일 정보가 없어요. 그래서 미리보기와 학부모 공유를 할 수 없어요.</p>
      </section>
    )
  }
  const artifact = state.data
  const editable = canChangeParentShare(artifact.parentShareStatus)
  const consented = artifact.parentShareStatus !== 'not_shared'
  return (
    <section className={styles.section} aria-labelledby="task-final-heading">
      <h3 id="task-final-heading" className={styles.title}>
        최종 결과물
      </h3>
      <div className={styles.file}>
        <span className={styles.type} aria-hidden="true">
          {artifact.type}
        </span>
        <div className={styles.fileText}>
          <p className={styles.fileName}>{artifact.fileName}</p>
          <p className={styles.meta}>
            {artifact.sourceVersionLabel} 최종본 · {formatDateTime(artifact.createdAt)} 최종 제출
          </p>
        </div>
        <button
          type="button"
          className={styles.textButton}
          aria-label={`${artifact.fileName} 최종 결과물 미리보기`}
          aria-haspopup="dialog"
          onClick={(event) => onPreview(artifact, event.currentTarget)}
        >
          미리보기
        </button>
      </div>

      <div className={styles.share}>
        <label className={styles.switch} data-pending={sharePending || undefined}>
          <input
            type="checkbox"
            role="switch"
            checked={consented}
            disabled={!editable || sharePending}
            aria-describedby="task-final-share-status task-final-share-note"
            onChange={(event) => onShareChange(event.target.checked)}
          />
          <span>최종 결과물을 학부모 리포트에 공유 허용</span>
        </label>
        <p id="task-final-share-status" className={styles.shareStatus}>
          {sharePending ? '저장 중…' : parentShareStatusText[artifact.parentShareStatus]}
        </p>
        <p id="task-final-share-note" className={styles.meta}>
          공유를 허용해도 바로 전송되지 않아요. 학원에서 학부모 리포트에 첨부할지 검토해요. 초안 · 수정 기록 · AI 사전 점검 · 선생님
          피드백은 공유되지 않아요.
        </p>
        {shareFailed && (
          <p className={styles.error} role="alert">
            공유 설정을 저장하지 못했어요. 설정은 그대로예요. 다시 시도해주세요.
          </p>
        )}
      </div>
    </section>
  )
}
