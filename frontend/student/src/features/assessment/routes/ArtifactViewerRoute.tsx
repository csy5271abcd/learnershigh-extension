import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toApiError, type ApiError } from '../api/apiError.ts'
import { compareArtifactVersions, downloadArtifactVersion, listArtifactVersions, previewArtifactVersion } from '../api/assessmentDetailApi.ts'
import type { ArtifactComparison, ArtifactVersion } from '../api/types.ts'
import { ChevronLeftIcon, DownloadIcon } from '../components/AssessmentIcons.tsx'
import { ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { fileTypeLabel, formatBytes, formatDateTime } from '../model/assessmentDetailView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import styles from './ArtifactViewerRoute.module.css'

// 결과물 앱 안 미리보기·두 버전 비교 (2026-11-11, api-contract.md §25-1·§26).
// - 미리보기는 서버가 소유권·형식·SHA-256을 확인한 PDF·PNG·JPEG·GIF만 받는다. Blob URL은 화면을 떠나거나 버전을 바꾸면 해제한다.
// - HTML·SVG·문서(HWP·DOCX·PPTX 등)는 앱 안에서 열지 않는다 → 파일 정보와 내려받기만.
// - 비교는 파일 내용 비교기가 없어 메타데이터 차이만 보여준다(가짜 "변경 문장"을 만들지 않는다). 원본 두 파일은 바뀌지 않는다.
// - 관리자 "학생 화면 보기"에서도 같은 화면이 읽기 전용으로 열린다(조회만, 서버가 담당 범위 확인).

const previewable = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif'])

const fieldLabels: Record<string, string> = {
  fileName: '파일 이름',
  contentType: '파일 형식',
  sizeBytes: '크기',
  sha256: '파일 지문(SHA-256)',
  uploadedAt: '올린 시각',
  changeNote: '변경 메모',
}

function showValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '없음'
  if (field === 'sizeBytes' && typeof value === 'number') return formatBytes(value)
  if (field === 'uploadedAt' && typeof value === 'string') return formatDateTime(value)
  if (field === 'sha256' && typeof value === 'string') return `${value.slice(0, 16)}…`
  return String(value)
}

export function ArtifactViewerRoute() {
  const { artifactId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const versions = useApiQuery(`artifact-viewer:${artifactId}`, () => listArtifactVersions(artifactId))
  const items = useMemo(() => [...(versions.data?.items ?? [])].sort((a, b) => a.versionNumber - b.versionNumber), [versions.data])
  const latest = items.at(-1)
  const primaryId = params.get('v') ?? latest?.versionId ?? ''
  const compareId = params.get('compare')
  const primary = items.find((version) => version.versionId === primaryId) ?? latest
  const other = compareId ? items.find((version) => version.versionId === compareId) : undefined

  const setParam = (name: string, value: string | null) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: true },
    )

  if (versions.status === 'error' && versions.error) {
    return (
      <main className={styles.page}>
        <ErrorState title="결과물을 불러오지 못했어요" error={versions.error} onRetry={versions.retry} />
      </main>
    )
  }
  if (!versions.data) {
    return (
      <main className={styles.page}>
        <LoadingRows rows={3} label="결과물을 불러오는 중" />
      </main>
    )
  }

  // 비교: 왼쪽 = 이전 버전, 오른쪽 = 나중 버전
  const [left, right] = other && primary ? [other, primary].sort((a, b) => a.versionNumber - b.versionNumber) : [primary, undefined]

  return (
    <main className={styles.page} data-testid="artifact-viewer">
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <button type="button" className={styles.back} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }} onClick={() => navigate(-1)}>
            <ChevronLeftIcon size={14} /> 돌아가기
          </button>
          <h1 className={styles.title}>{right ? '결과물 버전 비교' : '결과물 미리보기'}</h1>
          <p className={styles.meta}>원본 파일은 바뀌지 않아요. 피드백 요청에 쓴 이전 버전도 그대로 남아 있어요.</p>
        </div>
        <div className={styles.controls}>
          <label className={styles.meta}>
            {right ? '나중 버전 ' : '버전 '}
            <select className={styles.select} value={primary?.versionId ?? ''} aria-label="보여 줄 버전" data-testid="viewer-version" onChange={(event) => setParam('v', event.target.value)}>
              {items.map((version) => (
                <option key={version.versionId} value={version.versionId}>
                  v{version.versionNumber} · {version.file.fileName}
                </option>
              ))}
            </select>
          </label>
          {items.length >= 2 && (
            <label className={styles.meta}>
              비교할 버전{' '}
              <select
                className={styles.select}
                value={other?.versionId ?? ''}
                aria-label="비교할 버전"
                data-testid="viewer-compare"
                onChange={(event) => setParam('compare', event.target.value || null)}
              >
                <option value="">비교 안 함</option>
                {items
                  .filter((version) => version.versionId !== primary?.versionId)
                  .map((version) => (
                    <option key={version.versionId} value={version.versionId}>
                      v{version.versionNumber} · {version.file.fileName}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {items.length === 0 && <p className={styles.meta}>올린 파일이 없어요.</p>}
      {right && left && <ComparisonTable artifactId={artifactId} from={left} to={right} />}
      <div className={styles.panes} data-compare={right ? 'true' : 'false'}>
        {left && <VersionPane key={left.versionId} artifactId={artifactId} version={left} label={right ? '이전 버전' : undefined} />}
        {right && <VersionPane key={right.versionId} artifactId={artifactId} version={right} label="나중 버전" />}
      </div>
      <p className={styles.meta}>
        <Link to=".." relative="path" onClick={(event) => { event.preventDefault(); navigate(-1) }}>
          이전 화면으로
        </Link>
      </p>
    </main>
  )
}

function ComparisonTable({ artifactId, from, to }: { artifactId: string; from: ArtifactVersion; to: ArtifactVersion }) {
  const [state, setState] = useState<{ data?: ArtifactComparison; error?: ApiError }>({})
  useEffect(() => {
    let active = true
    compareArtifactVersions(artifactId, from.versionId, to.versionId).then(
      (data) => active && setState({ data }),
      (error: unknown) => active && setState({ error: toApiError(error) }),
    )
    return () => {
      active = false
    }
  }, [artifactId, from.versionId, to.versionId])
  const changed = new Set(state.data?.comparison.changes.map((change) => change.field) ?? [])
  const rows: { field: string; from: unknown; to: unknown }[] = [
    { field: 'fileName', from: from.file.fileName, to: to.file.fileName },
    { field: 'contentType', from: from.file.contentType, to: to.file.contentType },
    { field: 'sizeBytes', from: from.file.sizeBytes, to: to.file.sizeBytes },
    { field: 'uploadedAt', from: from.uploadedAt, to: to.uploadedAt },
    { field: 'changeNote', from: from.changeNote, to: to.changeNote },
  ]
  const sha = state.data?.comparison.changes.find((change) => change.field === 'sha256')
  return (
    <section className={styles.diff} aria-label="파일 정보 비교" data-testid="viewer-diff">
      <h2 className={styles.diffTitle}>
        v{from.versionNumber} → v{to.versionNumber} 파일 정보 비교
      </h2>
      {state.error && <p className={styles.meta} role="alert">비교 정보를 불러오지 못했어요: {state.error.message}</p>}
      {state.data && (
        <p className={styles.meta} data-testid="viewer-diff-mode">
          {state.data.comparison.mode === 'METADATA_ONLY'
            ? '파일 내용(문장) 자동 비교는 지원하지 않아요. 아래 파일 정보와 두 원본을 나란히 확인해 주세요.'
            : state.data.comparison.reason}
        </p>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">항목</th>
            <th scope="col">v{from.versionNumber}</th>
            <th scope="col">v{to.versionNumber}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} data-changed={changed.has(row.field) ? 'true' : 'false'}>
              <th scope="row">{fieldLabels[row.field]}</th>
              <td>{showValue(row.field, row.from)}</td>
              <td className={changed.has(row.field) ? styles.changed : undefined}>{showValue(row.field, row.to)}</td>
            </tr>
          ))}
          {state.data && (
            <tr data-changed={sha ? 'true' : 'false'}>
              <th scope="row">{fieldLabels.sha256}</th>
              <td colSpan={2} className={sha ? styles.changed : undefined}>
                {sha ? '두 파일의 내용이 달라요(지문 다름).' : '두 파일의 내용이 같아요(지문 같음).'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

function VersionPane({ artifactId, version, label }: { artifactId: string; version: ArtifactVersion; label?: string }) {
  const supported = previewable.has(version.file.contentType)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [zoom, setZoom] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!supported) return
    let active = true
    previewArtifactVersion(artifactId, version.versionId).then(
      (blob) => {
        if (!active) return
        // 서버가 보낸 형식만 쓴다. 허용 형식이 아니면 열지 않는다.
        if (!previewable.has(blob.type)) {
          setError(toApiError(new Error('미리보기 형식이 올바르지 않아요.')))
          return
        }
        const next = URL.createObjectURL(blob)
        urlRef.current = next
        setUrl(next)
      },
      (cause: unknown) => active && setError(toApiError(cause)),
    )
    return () => {
      active = false
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [artifactId, version.versionId, supported])

  const download = () => {
    if (downloading) return
    setDownloading(true)
    downloadArtifactVersion(artifactId, version.versionId)
      .then((blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = version.file.fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      })
      .catch((cause: unknown) => setError(toApiError(cause)))
      .finally(() => setDownloading(false))
  }

  const isImage = version.file.contentType.startsWith('image/')
  return (
    <section className={styles.pane} aria-label={`${label ?? ''} v${version.versionNumber} ${version.file.fileName}`} data-testid="viewer-pane" data-version-id={version.versionId}>
      <div className={styles.paneHead}>
        <div>
          <p className={styles.paneTitle}>
            {label ? `${label} · ` : ''}v{version.versionNumber} · {version.file.fileName}
          </p>
          <p className={styles.meta}>
            {fileTypeLabel(version.file.fileName)} · {formatBytes(version.file.sizeBytes)} · {formatDateTime(version.uploadedAt)}
            {version.changeNote ? ` · ${version.changeNote}` : ''}
          </p>
        </div>
        <div className={styles.controls}>
          {isImage && supported && (
            <>
              <button type="button" className={styles.button} aria-label="축소" onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))}>
                −
              </button>
              <span className={styles.meta} data-testid="viewer-zoom">
                {Math.round(zoom * 100)}%
              </span>
              <button type="button" className={styles.button} aria-label="확대" onClick={() => setZoom((value) => Math.min(4, value + 0.25))}>
                +
              </button>
              <button type="button" className={styles.button} onClick={() => setZoom(1)}>
                화면 맞춤
              </button>
            </>
          )}
          <button type="button" className={styles.button} aria-busy={downloading} onClick={download}>
            <DownloadIcon size={15} /> 내려받기
          </button>
        </div>
      </div>
      {!supported ? (
        <div className={styles.unsupported} data-testid="viewer-unsupported">
          <strong>이 형식({fileTypeLabel(version.file.fileName)})은 앱 안 미리보기를 지원하지 않아요.</strong>
          <span>안전하게 변환할 수 있는 도구가 아직 없어요. 내려받아 해당 프로그램에서 열어 주세요.</span>
        </div>
      ) : error ? (
        <div className={styles.unsupported} role="alert" data-testid="viewer-error">
          <strong>미리보기를 열지 못했어요.</strong>
          <span>{error.message}</span>
        </div>
      ) : !url ? (
        <LoadingRows rows={2} label="미리보기를 불러오는 중" />
      ) : isImage ? (
        <div className={styles.imageBox} data-testid="viewer-image-box">
          <img
            className={styles.image}
            src={url}
            alt={`${version.file.fileName} 미리보기`}
            data-testid="viewer-image"
            style={zoom === 1 ? { maxWidth: '100%' } : { width: `${zoom * 100}%`, maxWidth: 'none' }}
          />
        </div>
      ) : (
        // PDF: 브라우저 PDF 보기(스크롤·확대 내장). 서버가 형식·SHA를 확인한 application/pdf Blob만 연다.
        <iframe className={styles.frame} src={url} title={`${version.file.fileName} PDF 미리보기`} data-testid="viewer-pdf" />
      )}
    </section>
  )
}
