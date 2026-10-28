import { useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { createArtifact, uploadArtifactVersion } from '../../api/assessmentDetailApi.ts'
import { toApiError } from '../../api/apiError.ts'
import { isMockDataSource } from '../../api/dataSource.ts'
import type { Artifact, ArtifactVersion } from '../../api/types.ts'
import { formatBytes } from '../../model/assessmentDetailView.ts'
import { AlertIcon, UploadIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import styles from './detail.module.css'

interface UploadArtifactModalProps {
  sourceId: string
  /** 새 버전을 올릴 기존 결과물. 없으면 새 결과물 등록 */
  target?: { artifact: Artifact; latest: ArtifactVersion | undefined }
  onClose: () => void
  onUploaded: (version: ArtifactVersion, artifact: Artifact) => void
}

// 지원 고려 형식 (assessment-inquiry.md §8-1, Mockup SA-DETAIL-07). 실제 허용·용량 제한은 File Provider 결정 후 서버가 검증한다.
const acceptedTypes = '.pdf,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xlsx,image/*'

// 결과 파일 등록 / 새 버전 (Mockup SA-DETAIL-07, api-contract.md §24 POST + §25 POST).
// 새 결과물은 Artifact 생성 후 v1을 올린다. 업로드가 실패하면 Version을 만들지 않고, 재시도 때 같은 Artifact에 올린다.
export function UploadArtifactModal({ sourceId, target, onClose, onUploaded }: UploadArtifactModalProps) {
  const ids = { title: useId(), file: useId(), note: useId() }
  const titleRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [changeNote, setChangeNote] = useState('')
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  // 첫 시도에서 Artifact 생성만 성공했다면 재시도는 그 Artifact에 버전을 올린다 (결과물 중복 생성 방지).
  const [createdArtifact, setCreatedArtifact] = useState<Artifact>()

  const isNewArtifact = !target
  const canSubmit = (!isNewArtifact || title.trim() !== '') && file !== null && !submitting

  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    setFile(picked)
    setError(undefined)
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files[0])
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || submittingRef.current || !file) return
    submittingRef.current = true
    setSubmitting(true)
    setError(undefined)
    try {
      const artifact =
        target?.artifact ??
        createdArtifact ??
        (await createArtifact({ sourceType: 'SCHOOL_ASSESSMENT', sourceId, title: title.trim(), kind: null }))
      if (!target) setCreatedArtifact(artifact)
      const version = await uploadArtifactVersion(artifact.artifactId, {
        file,
        changeNote: changeNote.trim() || undefined,
        expectedLatestVersionId: target?.latest?.versionId,
      })
      onUploaded(version, artifact)
    } catch (caught) {
      const apiError = toApiError(caught)
      setError(
        apiError.code === 'RESOURCE_VERSION_CONFLICT'
          ? '그사이 다른 버전이 먼저 올라왔어요. 창을 닫고 버전 목록을 확인한 뒤 다시 올려 주세요.'
          : `${apiError.message} 선택한 파일과 입력한 내용은 그대로 있어요. (${apiError.code})`,
      )
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isNewArtifact ? '결과 파일 등록' : `${target.artifact.title} 새 버전`}
      description={isNewArtifact ? undefined : `현재 최신은 v${target.latest?.versionNumber ?? 0}이에요. 이전 버전은 그대로 남아요.`}
      onRequestClose={() => {
        if (!submitting) onClose()
      }}
      initialFocusRef={isNewArtifact ? titleRef : undefined}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button
            type="submit"
            form="upload-artifact-form"
            className={formStyles.primaryButton}
            disabled={!canSubmit}
            aria-busy={submitting}
          >
            {submitting ? '올리는 중…' : '올리기'}
          </button>
        </>
      }
    >
      <form id="upload-artifact-form" className={formStyles.form} noValidate onSubmit={onSubmit}>
        {error && (
          <p className={formStyles.formError} role="alert">
            <AlertIcon size={16} />
            {error}
          </p>
        )}
        {isNewArtifact ? (
          <div className={formStyles.field}>
            <label htmlFor={ids.title} className={formStyles.label}>
              결과물 이름 <span className={formStyles.required} aria-hidden="true">*</span>
              <span className="lh-visually-hidden">(필수)</span>
            </label>
            <input
              ref={titleRef}
              id={ids.title}
              className={formStyles.input}
              value={title}
              placeholder="예: 실험 보고서, 발표자료"
              autoComplete="off"
              disabled={submitting || createdArtifact !== undefined}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
        ) : (
          <p className={styles.modalNote}>
            {target.artifact.title}의 v{(target.latest?.versionNumber ?? 0) + 1}로 올라가요. 이전 버전은 그대로 남아요.
          </p>
        )}

        <div className={formStyles.field}>
          <span className="lh-visually-hidden" id={`${ids.file}-label`}>
            파일 (필수)
          </span>
          <label
            className={styles.dropZone}
            data-dragging={dragging}
            htmlFor={ids.file}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <UploadIcon size={20} />
            {file ? (
              <>
                <span className={styles.dropTitle}>{file.name}</span>
                <span className={styles.dropHint}>{formatBytes(file.size)} · 다른 파일을 고르려면 다시 선택하세요</span>
              </>
            ) : (
              <>
                <span className={styles.dropTitle}>파일을 끌어다 놓거나 선택해 주세요</span>
                <span className={styles.dropHint}>PDF · HWP · HWPX · DOCX · DOC · PPTX · PPT · XLSX · 이미지</span>
              </>
            )}
          </label>
          <input
            ref={fileInputRef}
            id={ids.file}
            type="file"
            accept={acceptedTypes}
            className="lh-visually-hidden"
            aria-labelledby={`${ids.file}-label`}
            disabled={submitting}
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
        </div>

        <div className={formStyles.field}>
          <label htmlFor={ids.note} className={formStyles.label}>
            버전 설명 <span className={styles.optional}>선택</span>
          </label>
          <input
            id={ids.note}
            className={formStyles.input}
            value={changeNote}
            placeholder="예: 결과 해석 보완"
            autoComplete="off"
            disabled={submitting}
            onChange={(event) => setChangeNote(event.target.value)}
          />
        </div>
        {isMockDataSource && (
          <p className={styles.modalNote}>시연용 화면이에요. 파일 이름·크기만 기록되고 실제 파일은 저장되지 않아요.</p>
        )}
      </form>
    </Modal>
  )
}
