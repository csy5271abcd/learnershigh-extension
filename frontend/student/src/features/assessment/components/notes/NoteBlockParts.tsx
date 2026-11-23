import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { downloadNoteAttachment, previewNoteAttachment } from '../../api/assessmentDetailApi.ts'
import { isMockDataSource } from '../../api/dataSource.ts'
import { NoteFilePreviewModal } from './NoteFilePreviewModal.tsx'
import type { NoteBlockAttrs } from '../../api/types.ts'
import { chartData, formatFileSize, isHttpUrl, mathSyntaxError, urlHost, youtubeEmbedUrl } from '../../model/noteEditorModel.ts'
import { resourceTypeLabel } from '../../model/resourceLibraryView.ts'
import { resourceDetailPath } from '../../routes/paths.ts'
import { LinkIcon } from '../AssessmentIcons.tsx'
import styles from './notes.module.css'

// 편집기와 읽기 전용 화면(Revision·Snapshot·비교·템플릿 미리보기)이 같이 쓰는 블록 표시 조각.
// 외부 주소는 형식만 확인하고 열리는지 확인하지 않는다. 지도·수식 렌더러·OCR은 연결하지 않았다.

export function ResourceCard({ resource, fallbackTitle, withDetailLink }: { resource: NoteBlockAttrs['resource']; fallbackTitle: string; withDetailLink: boolean }) {
  return (
    <div className={styles.linkCard}>
      <span className={styles.linkIcon} aria-hidden="true">
        <LinkIcon size={14} />
      </span>
      <span>
        <span className={styles.linkMeta}>
          {resource && <span className={styles.linkType}>{resourceTypeLabel(resource.type)}</span>}
          {resource?.sourceName ?? '출처 미입력'}
          <span className={styles.linkKind}>내 자료함</span>
        </span>
        <span className={styles.linkTitle}>{resource?.title ?? fallbackTitle}</span>
        {resource?.sourceUrl ? (
          <span className={styles.linkUrl}>{resource.sourceUrl} · 직접 입력한 링크 (열리는지 확인 안 됨)</span>
        ) : (
          <span className={styles.linkUrl}>링크 없음</span>
        )}
      </span>
      <span className={styles.linkActions}>
        {resource?.sourceUrl && isHttpUrl(resource.sourceUrl) && (
          <a href={resource.sourceUrl} target="_blank" rel="noreferrer noopener">
            원문 열기 ↗
          </a>
        )}
        {resource && withDetailLink && <Link to={resourceDetailPath(resource.resourceId)}>자료 보기</Link>}
      </span>
    </div>
  )
}

export function WebLinkCard({ url, title, kind = '링크' }: { url: string; title?: string; kind?: string }) {
  const valid = isHttpUrl(url)
  return (
    <div className={styles.linkCard}>
      <span className={styles.linkIcon} aria-hidden="true">
        <LinkIcon size={14} />
      </span>
      <span>
        <span className={styles.linkMeta}>
          <span className={styles.linkType}>{kind}</span>
          {valid ? urlHost(url) : '주소 형식 확인 필요'}
        </span>
        <span className={styles.linkTitle}>{title?.trim() || (valid ? urlHost(url) : url)}</span>
        <span className={styles.linkUrl}>{url} · 열리는지 확인 안 됨</span>
      </span>
      <span className={styles.linkActions}>
        {valid && (
          <a href={url} target="_blank" rel="noreferrer noopener">
            열기 ↗
          </a>
        )}
      </span>
    </div>
  )
}

/** 동영상: YouTube 주소만 youtube-nocookie로 삽입하고, 그 밖은 링크 카드 */
export function VideoView({ url, title, embed }: { url: string; title?: string; embed: boolean }) {
  const embedUrl = youtubeEmbedUrl(url)
  if (embedUrl && embed) {
    return (
      <figure className={styles.videoFrame}>
        <iframe
          src={embedUrl}
          title={title?.trim() || 'YouTube 동영상'}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="encrypted-media; picture-in-picture; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
        <figcaption className={styles.mediaCaption}>YouTube 삽입 · {urlHost(url)}</figcaption>
      </figure>
    )
  }
  return <WebLinkCard url={url} title={title} kind={embedUrl ? 'YouTube' : '동영상 링크'} />
}

export function MapCard({ place, url }: { place: string; url?: string }) {
  const valid = url ? isHttpUrl(url) : false
  return (
    <div className={styles.linkCard}>
      <span className={styles.linkIcon} aria-hidden="true">
        📍
      </span>
      <span>
        <span className={styles.linkMeta}>
          <span className={styles.linkType}>장소</span>
          지도 API 미연결 · 위치를 확인하지 않았어요
        </span>
        <span className={styles.linkTitle}>{place.trim() || '장소 이름 없음'}</span>
        {url && <span className={styles.linkUrl}>{url}</span>}
      </span>
      <span className={styles.linkActions}>
        {valid && url && (
          <a href={url} target="_blank" rel="noreferrer noopener">
            지도 링크 열기 ↗
          </a>
        )}
      </span>
    </div>
  )
}

/** A28-41 §26-1: 앱 안에서 바로 그릴 수 있는 형식(서버 미리보기 허용 목록과 같다) */
const previewableTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'])

function saveBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
}

/**
 * 노트 이미지·파일 블록 표시. A28-41: attachmentId 가 있으면 서버에 저장된 파일 — 이미지는 서버 미리보기로 그리고,
 * 열기(이미지·PDF)·내려받기를 준다. attachmentId 가 없으면 이전 방식(이름·크기만)이라 파일이 없다는 사실을 그대로 알린다.
 * previewUrl 은 업로드 중 이 화면에서만 쓰는 임시 미리보기다.
 */
export function FileMeta({ file, previewUrl, isImage, pending = false }: { file: NonNullable<NoteBlockAttrs['file']>; previewUrl: string | undefined; isImage: boolean; pending?: boolean }) {
  const stored = Boolean(file.attachmentId)
  const previewable = previewableTypes.has(file.mimeType)
  const [serverUrl, setServerUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const [previewing, setPreviewing] = useState(false)
  useEffect(() => {
    if (!file.attachmentId || !isImage || !previewable || isMockDataSource) return
    let cancelled = false
    let url: string | undefined
    previewNoteAttachment(file.attachmentId).then(
      (blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setServerUrl(url)
      },
      (cause: unknown) => !cancelled && setError(cause instanceof Error ? cause.message : '이미지를 불러오지 못했어요.'),
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file.attachmentId, isImage, previewable])
  const shown = serverUrl ?? previewUrl
  const open = () => {
    if (!file.attachmentId) return
    setError(undefined)
    previewNoteAttachment(file.attachmentId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        window.open(href, '_blank', 'noopener,noreferrer')
        window.setTimeout(() => URL.revokeObjectURL(href), 60_000)
      },
      (cause: unknown) => setError(cause instanceof Error ? cause.message : '파일을 열지 못했어요.'),
    )
  }
  const download = () => {
    if (!file.attachmentId) return
    setError(undefined)
    downloadNoteAttachment(file.attachmentId).then(
      (blob) => saveBlob(blob, file.name),
      (cause: unknown) => setError(cause instanceof Error ? cause.message : '파일을 내려받지 못했어요.'),
    )
  }
  return (
    <div className={styles.fileBlock} data-testid="note-file" data-stored={stored ? 'true' : 'false'}>
      {isImage && shown && (
        // A28-48: 이미지를 누르면 같은 화면 미리보기 창(저장된 첨부만)
        <img
          className={styles.imagePreview}
          src={shown}
          alt={`${file.name} 미리보기`}
          onClick={stored ? () => setPreviewing(true) : undefined}
          style={stored ? { cursor: 'zoom-in' } : undefined}
        />
      )}
      <div className={styles.fileMeta}>
        <span className={styles.linkType}>{isImage ? '이미지' : file.mimeType === 'application/pdf' ? 'PDF' : '파일'}</span>
        <span className={styles.fileName}>{file.name}</span>
        <span className={styles.linkUrl}>{formatFileSize(file.size)}</span>
        {stored && (
          <button type="button" className={styles.fileOpen} onClick={() => setPreviewing(true)} data-testid="note-file-preview">
            미리보기
          </button>
        )}
        {stored && previewable && (
          <button type="button" className={styles.fileOpen} onClick={open} data-testid="note-file-open">
            새 탭 ↗
          </button>
        )}
        {stored && (
          <button type="button" className={styles.fileOpen} onClick={download} data-testid="note-file-download">
            내려받기
          </button>
        )}
      </div>
      <p className={styles.mediaCaption} data-testid="note-file-status">
        {pending
          ? '서버에 저장하는 중…'
          : stored
            ? previewable
              ? '서버에 저장됨'
              : '서버에 저장됨 · 앱 안 미리보기 미지원 형식(내려받아 확인)'
            : isMockDataSource
              ? '시연 화면 · 파일 이름·크기만 기록(파일 저장 안 됨)'
              : '이전 첨부 · 파일이 저장되지 않아 열 수 없어요. 다시 첨부해 주세요.'}
      </p>
      {error && (
        <p className={styles.mathError} role="alert">
          {error}
        </p>
      )}
      {previewing && file.attachmentId && (
        <NoteFilePreviewModal attachmentId={file.attachmentId} fileName={file.name} mimeType={file.mimeType} onClose={() => setPreviewing(false)} />
      )}
    </div>
  )
}

export function MathView({ source }: { source: string }) {
  const error = mathSyntaxError(source)
  return (
    <div className={styles.mathView}>
      <pre className={styles.mathSource}>{source || ' '}</pre>
      {error ? (
        <p className={styles.mathError} role="note">
          수식 확인 필요: {error}
        </p>
      ) : (
        <p className={styles.mediaCaption}>수식 렌더러가 연결되지 않아 LaTeX 원문으로 보여요.</p>
      )}
    </div>
  )
}

const chartWidth = 320
const barHeight = 22
const barGap = 8
const labelWidth = 90

/** 표 값으로 그리는 가로 막대 미리보기 (SVG, 라이브러리 없음). 같은 값을 표로도 보여 접근성을 지킨다. */
export function ChartPreview({ rows, title }: { rows: string[][] | undefined; title: string }) {
  const { data, invalid } = chartData(rows)
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 0)
  const height = data.length * (barHeight + barGap)
  const valueHeader = rows?.[0]?.[1]?.trim() || '값'
  return (
    <figure className={styles.chart}>
      {data.length === 0 ? (
        <p className={styles.mediaCaption}>표에 항목과 숫자 값을 넣으면 막대 그래프로 보여요.</p>
      ) : (
        <svg
          className={styles.chartSvg}
          viewBox={`0 0 ${chartWidth} ${height}`}
          role="img"
          aria-label={`${title || '차트'}: ${data.map((item) => `${item.label} ${item.value}`).join(', ')}`}
        >
          {data.map((item, index) => {
            const y = index * (barHeight + barGap)
            const width = max === 0 ? 0 : (Math.abs(item.value) / max) * (chartWidth - labelWidth - 50)
            return (
              <g key={`${item.label}-${index}`}>
                <text x={labelWidth - 6} y={y + barHeight / 2 + 4} textAnchor="end" className={styles.chartLabel}>
                  {item.label.length > 8 ? `${item.label.slice(0, 8)}…` : item.label}
                </text>
                <rect x={labelWidth} y={y} width={Math.max(width, 1)} height={barHeight} rx="3" className={styles.chartBar} data-negative={item.value < 0} />
                <text x={labelWidth + width + 6} y={y + barHeight / 2 + 4} className={styles.chartValue}>
                  {item.value.toLocaleString('ko-KR')}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      <figcaption className={styles.mediaCaption}>
        막대 그래프 미리보기 · 기준: 표의 "{valueHeader}" 열
        {invalid.length > 0 && ` · 숫자가 아니라 뺀 항목: ${invalid.join(', ')}`}
      </figcaption>
    </figure>
  )
}
