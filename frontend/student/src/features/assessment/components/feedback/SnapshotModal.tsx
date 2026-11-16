import { useRef } from 'react'
import { Link } from 'react-router'
import { formatBytes, formatDateTime, fileTypeLabel } from '../../model/assessmentDetailView.ts'
import type { FeedbackListEntry } from '../../model/feedbackListView.ts'
import { schoolAssessmentFeedbackPath } from '../../routes/paths.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { FileIcon, NoteIcon } from '../AssessmentIcons.tsx'
import { NoteBlockView } from '../detail/NoteSection.tsx'
import { Modal } from '../Modal.tsx'
import styles from './feedback.module.css'

interface SnapshotModalProps {
  entry: FeedbackListEntry
  onClose: () => void
}

// 요청 당시 보낸 자료 (feedback §8: "당시 노트·파일 버전과 관리자 의견 확인").
// 요청 Snapshot이 가리키는 Revision·Version을 그대로 보여주고, 이후 바뀐 최신 버전과 섞지 않는다 (§21·31).
// 파일 미리보기·다운로드는 저장소 결정 전이라 Metadata만 보여준다 (OD: File Storage).
export function SnapshotModal({ entry, onClose }: SnapshotModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { request, assessment, noteRevision, latestRevisionNumber, files } = entry

  return (
    <Modal
      title="요청 당시 보낸 자료"
      description="피드백을 요청한 순간의 노트와 파일 버전이에요. 이후에 수정해도 바뀌지 않아요."
      onRequestClose={onClose}
      initialFocusRef={closeRef}
      footer={
        <>
          {assessment && (
            <Link to={schoolAssessmentFeedbackPath(assessment.assessmentId)} className={`${formStyles.ghostButton} ${styles.linkButton}`}>
              수행평가로 가기
            </Link>
          )}
          <button ref={closeRef} type="button" className={formStyles.primaryButton} onClick={onClose}>
            닫기
          </button>
        </>
      }
    >
      <p className={styles.snapshotLead}>
        {assessment ? `${assessment.title} · ` : ''}
        {formatDateTime(request.requestedAt)} 요청. 요청한 뒤에 노트를 고치거나 새 파일을 올려도 이 자료는 바뀌지 않아요.
      </p>

      <section className={styles.snapshotSection} aria-labelledby="snapshot-note-heading">
        <h3 id="snapshot-note-heading" className={styles.snapshotHeading}>
          <NoteIcon size={14} />
          {noteRevision ? `탐구 노트 v${noteRevision.revisionNumber}` : '탐구 노트'}
          {noteRevision && <span className={styles.meta}>{formatDateTime(noteRevision.savedAt)} 저장</span>}
          {noteRevision && latestRevisionNumber !== undefined && latestRevisionNumber !== noteRevision.revisionNumber && (
            <span className={styles.latestHint}>지금 노트는 v{latestRevisionNumber}</span>
          )}
        </h3>
        {noteRevision ? (
          <div className={styles.snapshotNote}>
            {noteRevision.blocks.map((block) => (
              <NoteBlockView key={block.blockId} block={block} />
            ))}
          </div>
        ) : (
          <p className={styles.snapshotMissing}>요청한 노트 버전을 찾을 수 없어요.</p>
        )}
      </section>

      <section className={styles.snapshotSection} aria-labelledby="snapshot-files-heading">
        <h3 id="snapshot-files-heading" className={styles.snapshotHeading}>
          <FileIcon size={14} />
          결과 파일 {files.length}개
        </h3>
        {files.length === 0 ? (
          <p className={styles.snapshotMissing}>결과 파일 없이 노트만 보냈어요.</p>
        ) : (
          <ul className={styles.snapshotFiles}>
            {files.map((file) => (
              <li key={file.versionId}>
                {file.artifact && file.version ? (
                  <>
                    <span className={styles.snapshotFileTitle}>
                      {file.artifact.title} v{file.version.versionNumber}
                      {file.latestVersionNumber !== undefined && file.latestVersionNumber !== file.version.versionNumber && (
                        <span className={styles.latestHint}>지금 최신은 v{file.latestVersionNumber}</span>
                      )}
                    </span>
                    <span className={styles.meta}>
                      {file.version.file.fileName} · {fileTypeLabel(file.version.file.fileName)} ·{' '}
                      {formatBytes(file.version.file.sizeBytes)} · {formatDateTime(file.version.uploadedAt)} 업로드
                    </span>
                  </>
                ) : (
                  <span className={styles.snapshotMissing}>파일 버전 정보를 찾을 수 없어요.</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className={styles.modalHint}>파일 미리보기와 내려받기는 파일 저장소가 정해진 뒤에 제공돼요.</p>
      </section>
    </Modal>
  )
}
