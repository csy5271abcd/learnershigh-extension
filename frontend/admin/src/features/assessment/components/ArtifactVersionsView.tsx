import { useEffect, useState } from 'react'
import { adminRecordsHttpConnected, compareArtifactVersions, downloadArtifactVersion, previewArtifactVersion } from '../api/assessmentAdminApi.ts'
import type { AdminArtifact, ArtifactComparison } from '../api/types.ts'
import { dateTimeLabel, fileSizeLabel } from '../model/adminFormat.ts'
import { useCommand } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { AlertIcon, FileIcon } from './canonicalUi.ts'

// AD-12 결과 파일·버전 이력 (읽기 전용) + AD-13 두 버전 비교 (§36·37).
// 결과물마다 버전 순서가 따로다. 미리보기를 지원하지 않는 형식(HWP·DOCX·PPTX)은 미리보기가 되는 것처럼 보이지 않게 메타데이터만 보인다.
// http(2026-11-11): 열람 = 앱 안 미리보기(PDF·이미지만, 서버가 담당 범위·SHA 확인), 다운로드 = 원본. 학생 원본은 읽기 전용이다.
// Mock에는 실제 파일이 없어 열리지 않는다.
export function ArtifactVersionsView({ artifacts, highlightVersionIds }: { artifacts: AdminArtifact[]; highlightVersionIds?: string[] }) {
  if (artifacts.length === 0) return <p className={styles.muted}>등록한 결과 파일이 없어요.</p>
  return (
    <div className={styles.stack}>
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.artifactId} artifact={artifact} highlightVersionIds={highlightVersionIds} />
      ))}
    </div>
  )
}

function ArtifactCard({ artifact, highlightVersionIds }: { artifact: AdminArtifact; highlightVersionIds?: string[] }) {
  const versions = artifact.versions
  const [from, setFrom] = useState(versions.length >= 2 ? versions[versions.length - 2].versionId : '')
  const [to, setTo] = useState(versions.length >= 2 ? versions[versions.length - 1].versionId : '')
  const [result, setResult] = useState<ArtifactComparison | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const { run, pending } = useCommand()
  const download = (versionId: string, fileName: string) =>
    downloadArtifactVersion(artifact.artifactId, versionId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => setError(`내려받지 못했어요. ${cause.message}`),
    )

  const compare = async () => {
    setError(null)
    const outcome = await run(() => compareArtifactVersions(artifact.artifactId, from, to))
    if (!outcome) return
    if (outcome.ok) setResult(outcome.value)
    else {
      setResult(null)
      setError(`${outcome.error.message} (${outcome.error.code})`)
    }
  }

  return (
    <section className={styles.artifactCard} aria-label={`결과물 ${artifact.title}`}>
      <div className={styles.artifactHead}>
        <strong>
          <FileIcon size={15} /> {artifact.title}
        </strong>
        <span className={styles.hint}>버전 {versions.length}개 · 학생 원본</span>
        {versions.length >= 2 && (
          <button type="button" className={`${styles.inkButton} ${styles.smallButton}`} aria-expanded={compareOpen} onClick={() => setCompareOpen((value) => !value)}>
            버전 비교
          </button>
        )}
      </div>
      <ul className={styles.listPlain}>
        {[...versions].reverse().map((version) => (
          <li key={version.versionId} className={styles.artifactRow} aria-current={highlightVersionIds?.includes(version.versionId) ? 'true' : undefined}>
            <span className={styles.artifactVersion}>v{version.versionNumber}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className={styles.cellTitle} style={{ fontWeight: 500, fontSize: 13 }}>
                {version.file.fileName}
                {highlightVersionIds?.includes(version.versionId) && (
                  <span className={styles.badge} data-tone="primary" style={{ marginLeft: 6 }}>
                    요청에 포함
                  </span>
                )}
              </span>
              <span className={styles.cellSub}>
                {version.changeNote ? `${version.changeNote} · ` : ''}
                {fileSizeLabel(version.file.sizeBytes)} · {dateTimeLabel(version.uploadedAt)} · {version.previewSupported ? '미리보기 지원 형식' : '미리보기 미지원 형식'}
              </span>
            </span>
            <span className={styles.actions} style={{ flexWrap: 'nowrap' }}>
              <button
                type="button"
                className={`${styles.secondaryButton} ${styles.smallButton}`}
                disabled={!adminRecordsHttpConnected || !version.previewSupported}
                aria-pressed={previewId === version.versionId}
                data-testid="admin-artifact-preview"
                title={!adminRecordsHttpConnected ? '시연 데이터에는 실제 파일이 없어요' : version.previewSupported ? '앱 안에서 열어요(읽기 전용)' : '이 형식은 앱 안 미리보기를 지원하지 않아요. 다운로드해 주세요'}
                onClick={() => setPreviewId((current) => (current === version.versionId ? null : version.versionId))}
              >
                열람
              </button>
              <button
                type="button"
                className={`${styles.ghostButton} ${styles.smallButton}`}
                disabled={!adminRecordsHttpConnected}
                title={adminRecordsHttpConnected ? '원본 내려받기' : '시연 데이터에는 실제 파일이 없어요'}
                onClick={() => void download(version.versionId, version.file.fileName)}
              >
                다운로드
              </button>
            </span>
            {previewId === version.versionId && (
              <InlinePreview artifactId={artifact.artifactId} versionId={version.versionId} fileName={version.file.fileName} contentType={version.file.contentType} />
            )}
          </li>
        ))}
      </ul>
      {versions.length >= 2 ? (
        compareOpen && (
        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--as-color-line)' }}>
          <div className={styles.toolbar}>
            <label className={styles.checkRow}>
              이전
              <select className={styles.select} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="비교할 이전 버전">
                {versions.map((version) => (
                  <option key={version.versionId} value={version.versionId}>
                    v{version.versionNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.checkRow}>
              이후
              <select className={styles.select} value={to} onChange={(event) => setTo(event.target.value)} aria-label="비교할 이후 버전">
                {versions.map((version) => (
                  <option key={version.versionId} value={version.versionId}>
                    v{version.versionNumber}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={compare} disabled={pending || from === to} title={from === to ? '서로 다른 두 버전을 골라 주세요' : undefined}>
              {pending ? '비교 중…' : '두 버전 비교'}
            </button>
          </div>
          {error && (
            <p className={styles.formError} role="alert">
              <AlertIcon size={15} /> {error}
            </p>
          )}
          {result && (
            <div className={styles.boxSubtle} role="region" aria-label="버전 비교 결과">
              <p className={styles.muted} style={{ marginBottom: 6 }}>
                {result.comparison.mode === 'METADATA_ONLY' ? '파일 정보 비교' : '본문 비교'} · {result.comparison.reason}
              </p>
              {result.comparison.changes.length === 0 ? (
                <p className={styles.notePara}>파일 정보에 달라진 점이 없어요.</p>
              ) : (
                <table className={styles.noteTable}>
                  <tbody>
                    {result.comparison.changes.map((change) => (
                      <tr key={change.field}>
                        <td style={{ width: 96, fontWeight: 600 }}>{change.field}</td>
                        <td>{change.field === '크기' ? fileSizeLabel(Number(change.from)) : change.field === '업로드 시각' ? dateTimeLabel(change.from) : change.from}</td>
                        <td>{change.field === '크기' ? fileSizeLabel(Number(change.to)) : change.field === '업로드 시각' ? dateTimeLabel(change.to) : change.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
        )
      ) : (
        <p className={styles.hint} style={{ margin: '0 14px 12px' }}>
          버전이 하나뿐이라 비교할 수 없어요.
        </p>
      )}
    </section>
  )
}

/** 앱 안 미리보기(읽기 전용). Blob URL은 닫거나 버전을 바꾸면 해제한다. PDF는 브라우저 PDF 보기(스크롤·확대), 이미지는 폭 맞춤 */
function InlinePreview({ artifactId, versionId, fileName, contentType }: { artifactId: string; versionId: string; fileName: string; contentType: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let created: string | null = null
    previewArtifactVersion(artifactId, versionId).then(
      (blob) => {
        if (!active) return
        if (!['application/pdf', 'image/png', 'image/jpeg', 'image/gif'].includes(blob.type)) {
          setError('미리보기 형식이 올바르지 않아요.')
          return
        }
        created = URL.createObjectURL(blob)
        setUrl(created)
      },
      (cause: Error) => active && setError(cause.message),
    )
    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [artifactId, versionId])
  return (
    <div style={{ flexBasis: '100%', marginTop: 8 }} data-testid="admin-inline-preview">
      {error ? (
        <p className={styles.formError} role="alert">
          미리보기를 열지 못했어요: {error}
        </p>
      ) : !url ? (
        <p className={styles.muted}>미리보기를 불러오는 중…</p>
      ) : contentType.startsWith('image/') ? (
        <div style={{ maxHeight: 520, overflow: 'auto', background: 'var(--as-color-fill, #f0f0f2)' }}>
          <img src={url} alt={`${fileName} 미리보기`} style={{ display: 'block', maxWidth: '100%', margin: '0 auto' }} />
        </div>
      ) : (
        <iframe src={url} title={`${fileName} PDF 미리보기`} style={{ width: '100%', height: 560, border: '1px solid var(--as-color-line)' }} />
      )}
    </div>
  )
}
