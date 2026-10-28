import { useId, useState } from 'react'
import type { Artifact, ArtifactVersion } from '../../api/types.ts'
import { fileTypeLabel, formatBytes, formatDateTime, latestVersion } from '../../model/assessmentDetailView.ts'
import type { QueryResult } from '../../model/useApiQuery.ts'
import { ChevronDownIcon, DownloadIcon, EyeIcon, FileIcon, HistoryIcon, UploadIcon } from '../AssessmentIcons.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './detail.module.css'

export interface ArtifactWithVersions {
  artifact: Artifact
  /** 최신순 */
  versions: ArtifactVersion[]
}

interface ArtifactSectionProps {
  artifacts: QueryResult<ArtifactWithVersions[]>
  /** artifactId → 피드백에 보낼 versionId (UI 선택 상태. 기본은 최신) */
  selectedVersions: Record<string, string>
  onSelectVersion: (artifactId: string, versionId: string) => void
  onRegister: () => void
  onNewVersion: (artifact: Artifact, latest: ArtifactVersion | undefined) => void
  onUnavailable: (message: string) => void
}

// 수행평가 결과물 (Mockup SA-DETAIL-01 하단, api-contract.md §24·25).
// 탐구 노트(NoteRevision)와 별개인 제출용 파일이며, 결과물마다 버전 번호가 따로 증가하고 이전 버전은 지워지지 않는다.
export function ArtifactSection({
  artifacts,
  selectedVersions,
  onSelectVersion,
  onRegister,
  onNewVersion,
  onUnavailable,
}: ArtifactSectionProps) {
  const count = artifacts.data?.length
  return (
    <section className={styles.section} aria-labelledby="artifact-heading">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="artifact-heading" className={styles.sectionTitle}>
            <FileIcon size={15} />
            수행평가 결과물
            {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
          </h2>
          <p className={styles.sectionDescription}>
            탐구 노트와 별도로, 학교에 낼 파일을 버전별로 보관해요. 이전 버전은 지워지지 않아요.
          </p>
        </div>
        <button type="button" className={styles.outlineButton} onClick={onRegister}>
          <UploadIcon size={15} />
          결과 파일 등록
        </button>
      </div>

      {artifacts.status === 'loading' && <LoadingRows rows={1} label="결과물을 불러오는 중" />}
      {artifacts.status === 'error' && artifacts.error && (
        <ErrorState title="결과물을 불러오지 못했어요" error={artifacts.error} onRetry={artifacts.retry} />
      )}
      {artifacts.data && artifacts.data.length === 0 && (
        <p className={styles.emptyBox}>아직 등록한 결과 파일이 없어요. 학교에 낼 보고서·발표자료를 올려 두면 버전별로 보관돼요.</p>
      )}
      {artifacts.data && artifacts.data.length > 0 && (
        <ul className={styles.artifactList}>
          {artifacts.data.map(({ artifact, versions }) => (
            <ArtifactCard
              key={artifact.artifactId}
              artifact={artifact}
              versions={versions}
              selectedVersionId={selectedVersions[artifact.artifactId]}
              onSelectVersion={(versionId) => onSelectVersion(artifact.artifactId, versionId)}
              onNewVersion={() => onNewVersion(artifact, latestVersion(versions))}
              onUnavailable={onUnavailable}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

interface ArtifactCardProps {
  artifact: Artifact
  versions: ArtifactVersion[]
  selectedVersionId: string | undefined
  onSelectVersion: (versionId: string) => void
  onNewVersion: () => void
  onUnavailable: (message: string) => void
}

function ArtifactCard({ artifact, versions, selectedVersionId, onSelectVersion, onNewVersion, onUnavailable }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false)
  const historyId = useId()
  const latest = latestVersion(versions)
  const selected = versions.find((version) => version.versionId === selectedVersionId) ?? latest
  const shown = selected ?? latest

  return (
    <li className={styles.artifactCard}>
      <div className={styles.artifactRow}>
        <span className={styles.fileTile} aria-hidden="true">
          <FileIcon size={18} />
        </span>
        <div className={styles.artifactText}>
          <p className={styles.artifactTitle}>
            {artifact.title}
            {shown && (
              <span className={styles.blueBadge}>
                피드백 대상 v{shown.versionNumber}
                {shown.versionId === latest?.versionId ? ' (최신)' : ''}
              </span>
            )}
          </p>
          {shown ? (
            <>
              <p className={styles.fileName}>{shown.file.fileName}</p>
              <p className={styles.fileMeta}>
                v{shown.versionNumber} · {fileTypeLabel(shown.file.fileName)} · {formatBytes(shown.file.sizeBytes)} ·{' '}
                {formatDateTime(shown.uploadedAt)}
                {shown.changeNote ? ` · ${shown.changeNote}` : ''}
              </p>
            </>
          ) : (
            <p className={styles.fileMeta}>올린 파일이 없어요. 새 버전으로 파일을 올려 주세요.</p>
          )}
        </div>
        <div className={styles.artifactActions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`${artifact.title} 미리보기`}
            aria-disabled="true"
            onClick={() => onUnavailable('파일 미리보기는 파일 저장소가 연결된 뒤 제공돼요. (시연 데이터에는 실제 파일이 없어요)')}
          >
            <EyeIcon size={17} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`${artifact.title} 내려받기`}
            aria-disabled="true"
            onClick={() => onUnavailable('원본 내려받기는 파일 저장소가 연결된 뒤 제공돼요.')}
          >
            <DownloadIcon size={17} />
          </button>
          <button type="button" className={styles.smallOutlineButton} onClick={onNewVersion}>
            새 버전
          </button>
        </div>
      </div>
      <button
        type="button"
        className={styles.artifactFooter}
        aria-expanded={expanded}
        aria-controls={historyId}
        onClick={() => setExpanded((value) => !value)}
      >
        <HistoryIcon size={14} />
        버전 기록 {versions.length}개 · 피드백에 보낼 버전을 고를 수 있어요
        <ChevronDownIcon size={15} className={expanded ? styles.chevronOpen : styles.chevron} />
      </button>
      <div id={historyId} hidden={!expanded} className={styles.versionList}>
        <fieldset>
          <legend className="lh-visually-hidden">{artifact.title} 피드백에 보낼 버전</legend>
          {versions.map((version) => (
            <label key={version.versionId} className={styles.versionRow}>
              <input
                type="radio"
                name={`version-${artifact.artifactId}`}
                checked={version.versionId === shown?.versionId}
                onChange={() => onSelectVersion(version.versionId)}
              />
              <span className={styles.versionNumber}>v{version.versionNumber}</span>
              <span className={styles.versionText}>
                <span className={styles.versionFile}>{version.file.fileName}</span>
                <span className={styles.fileMeta}>
                  {fileTypeLabel(version.file.fileName)} · {formatBytes(version.file.sizeBytes)} · {formatDateTime(version.uploadedAt)}
                  {version.changeNote ? ` · ${version.changeNote}` : ''}
                </span>
              </span>
              {version.versionId === latest?.versionId && <span className={styles.grayBadge}>최신</span>}
            </label>
          ))}
        </fieldset>
      </div>
    </li>
  )
}
