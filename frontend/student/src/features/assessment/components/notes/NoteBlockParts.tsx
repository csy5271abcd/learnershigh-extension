import { Link } from 'react-router'
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

export function FileMeta({ file, previewUrl, isImage }: { file: NonNullable<NoteBlockAttrs['file']>; previewUrl: string | undefined; isImage: boolean }) {
  return (
    <div className={styles.fileBlock}>
      {isImage && previewUrl && <img className={styles.imagePreview} src={previewUrl} alt={`${file.name} 미리보기`} />}
      <div className={styles.fileMeta}>
        <span className={styles.linkType}>{isImage ? '이미지' : file.mimeType === 'application/pdf' ? 'PDF' : '파일'}</span>
        <span className={styles.fileName}>{file.name}</span>
        <span className={styles.linkUrl}>{formatFileSize(file.size)}</span>
        {previewUrl && !isImage && (
          <a className={styles.fileOpen} href={previewUrl} target="_blank" rel="noreferrer noopener">
            새 탭에서 미리보기 ↗
          </a>
        )}
      </div>
      <p className={styles.mediaCaption}>
        {previewUrl
          ? '미리보기는 이 화면에서만 보여요. 파일 자체는 서버에 저장되지 않고, 노트에는 파일 이름·크기만 남아요.'
          : '파일 이름·크기만 기록돼 있어요. 파일 자체는 저장되지 않았어요 (파일 저장소 미정).'}
      </p>
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
