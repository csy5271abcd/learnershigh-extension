import { useRef } from 'react'
import { isMockDataSource } from '../../api/dataSource.ts'
import type { FeedbackRequest } from '../../api/types.ts'
import { formatDateTime } from '../../model/assessmentDetailView.ts'
import { Modal } from '../Modal.tsx'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import styles from './detail.module.css'
import type { SelectedArtifactVersion } from './FeedbackTab.tsx'

interface FeedbackSentModalProps {
  assessmentTitle: string
  request: FeedbackRequest
  noteRevisionNumber: number | undefined
  versions: SelectedArtifactVersion[]
  onClose: () => void
}

// 피드백 요청 완료 (Mockup SA-DETAIL-13). 표시 값은 모두 §31 응답의 Snapshot에서 가져온다.
export function FeedbackSentModal({ assessmentTitle, request, noteRevisionNumber, versions, onClose }: FeedbackSentModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  return (
    <Modal
      title="피드백 요청이 완료되었습니다."
      onRequestClose={onClose}
      initialFocusRef={confirmRef}
      footer={
        <button ref={confirmRef} type="button" className={formStyles.primaryButton} onClick={onClose}>
          확인
        </button>
      }
    >
      <p className={styles.sentLead}>
        탐구 노트{versions.length > 0 ? '와 수행평가 결과물이' : '가'} 선생님께 전달되었습니다.
        <br />
        답변이 도착하면 선생님 피드백 메뉴에서 확인할 수 있어요.
      </p>
      <dl className={styles.sentSummary}>
        <div>
          <dt>수행평가</dt>
          <dd>{assessmentTitle}</dd>
        </div>
        <div>
          <dt>요청 시각</dt>
          <dd>{formatDateTime(request.requestedAt)}</dd>
        </div>
        <div>
          <dt>보낸 자료</dt>
          <dd>
            탐구 노트 v{noteRevisionNumber ?? '?'}
            {versions.length > 0 ? ` · 결과 파일 ${versions.length}` : ''}
          </dd>
        </div>
        {versions.length > 0 && (
          <div>
            <dt>결과 파일</dt>
            <dd>
              {versions.map(({ artifact, version }) => (
                <span key={version.versionId} className={styles.sentFile}>
                  {artifact.title} v{version.versionNumber} ({version.file.fileName})
                </span>
              ))}
            </dd>
          </div>
        )}
        <div>
          <dt>상태</dt>
          <dd className={styles.sentStatus}>{request.status === 'PENDING' ? '답변 대기' : '답변 완료'}</dd>
        </div>
      </dl>
      {isMockDataSource && <p className={styles.modalNote}>시연용 화면이에요. 실제로 전송되지 않아요.</p>}
    </Modal>
  )
}
