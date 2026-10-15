import { useState } from 'react'
import type { CaseMaterialPreview } from '../fixtures/types.ts'
import { Badge, ModalDialog } from './AdminUi.tsx'
import ui from './AdminUi.module.css'
import styles from './AdminFilePreview.module.css'
import { availabilityLabel, forceFileError, formatLabelOf, hasNativePreview, parseCsv, previewAvailability, previewKind, useFileText, type PreviewFile } from './filePreview.ts'

/*
 * Admin 공통 파일 미리보기 (Task Evidence · Version 제출본 · Activity 자료 · Mentor Case 자료가 같이 쓴다)
 * 판정 순서는 Student 미리보기(EvidenceDialogs.tsx previewKind)와 같다:
 *   1. 미리보기를 지원하지 않는 형식(DOCX · XLSX · ZIP · HWP · PPTX 등) → "미리보기를 지원하지 않아요"
 *   2. 지원 형식(이미지 · PDF · CSV · Text)인데 원본이 없음 → "원본 파일이 아직 준비되지 않아 미리볼 수 없어요"
 *   3. 원본을 불러오지 못함 → "파일을 불러오지 못했어요" + 다시 시도
 * - Mentor Case 자료는 Student Case가 쓰는 표시용 View Model(slides · document · table)이 있으면 그 내용을 그대로 보여준다.
 * - 원본이 없는데 내용을 만들어 보여주지 않는다. 다운로드는 원본이 있을 때만 한다.
 * - 개발용 ?fixture=file-error 로 불러오기 실패를 재현한다.
 */

export function AvailabilityBadge({ file }: { file: PreviewFile }) {
  const value = previewAvailability(file)
  return <Badge tone={value === 'available' ? 'accent' : undefined}>{availabilityLabel[value]}</Badge>
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.notice} role="alert">
      <p className={ui.noticeTitle}>파일을 불러오지 못했어요.</p>
      <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} onClick={onRetry}>
        다시 시도
      </button>
    </div>
  )
}

function TextBody({ file, kind }: { file: PreviewFile; kind: 'text' | 'csv' }) {
  const { state, retry } = useFileText(file.backing)
  if (state.status === 'loading') return <p className={ui.muted}>파일을 불러오는 중이에요.</p>
  if (state.status === 'error') return <LoadError onRetry={retry} />
  if (kind === 'csv') {
    const rows = parseCsv(state.text)
    return (
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${file.name} 표`}>
        <table className={styles.table}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => (rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return <pre className={styles.text}>{state.text}</pre>
}

function MediaBody({ file, kind }: { file: PreviewFile; kind: 'image' | 'pdf' }) {
  const [failed, setFailed] = useState(forceFileError())
  const [attempt, setAttempt] = useState(0)
  if (failed)
    return (
      <LoadError
        onRetry={() => {
          setFailed(false)
          setAttempt((value) => value + 1)
        }}
      />
    )
  const src = `${file.backing!.url}${attempt ? `#retry-${attempt}` : ''}`
  return kind === 'image' ? (
    <img className={styles.image} src={src} alt={`${file.name} 미리보기`} onError={() => setFailed(true)} />
  ) : (
    <iframe className={styles.frame} src={src} title={`${file.name} 미리보기`} />
  )
}

/** Mentor Case 자료 표시용 View Model (Student Case Preview와 같은 내용) */
function ViewModelBody({ preview, name }: { preview: CaseMaterialPreview; name: string }) {
  if (preview.kind === 'table') {
    return (
      <div className={ui.list}>
        <p className={ui.cellMain}>{preview.title}</p>
        {preview.description && <p className={ui.muted}>{preview.description}</p>}
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${name} 표`}>
          <table className={styles.table}>
            <thead>
              <tr>
                {preview.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.footnote && <p className={ui.cellSub}>{preview.footnote}</p>}
      </div>
    )
  }
  return (
    <ol className={styles.pages} aria-label={`${name} ${preview.kind === 'slides' ? 'Slide' : 'Page'} ${preview.pages.length}장`}>
      {preview.pages.map((page) => (
        <li key={page.pageNumber} className={styles.page}>
          <p className={ui.cellSub}>
            {preview.kind === 'slides' ? 'Slide' : 'Page'} {page.pageNumber}
          </p>
          <h3 className={ui.subTitle}>{page.title}</h3>
          {page.lead && <p className={ui.cellMain}>{page.lead}</p>}
          {page.body && <p>{page.body}</p>}
          {page.paragraphs?.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {page.bullets && (
            <ul className={styles.bullets}>
              {page.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
          {page.footnote && <p className={ui.cellSub}>{page.footnote}</p>}
        </li>
      ))}
    </ol>
  )
}

export function PreviewBody({ file, mode = 'auto' }: { file: PreviewFile; /** original: 원본 우선 · summary: Case 표시용 내용 */ mode?: 'auto' | 'original' | 'summary' }) {
  const useOriginal = hasNativePreview(file) && (mode === 'original' || (mode === 'auto' && !file.viewModel) || (mode === 'auto' && previewKind(file.name) === 'pdf'))
  if (file.viewModel && !useOriginal) {
    return (
      <div className={ui.list}>
        {previewKind(file.name) === 'unsupported' && (
          <p className={ui.cellSub}>
            {formatLabelOf(file)} 원본은 Browser 미리보기를 지원하지 않아요. 아래는 Student Case 화면과 같은 표시용 내용이에요. (원본 변환 미리보기 아님)
          </p>
        )}
        <ViewModelBody preview={file.viewModel} name={file.name} />
      </div>
    )
  }
  const kind = previewKind(file.name)
  if (kind === 'unsupported')
    return (
      <div className={styles.notice}>
        <p className={ui.noticeTitle}>이 파일 형식은 미리보기를 지원하지 않아요. ({formatLabelOf(file)})</p>
        <p>{file.backing ? '원본 파일을 내려받아 확인할 수 있어요.' : '원본 파일도 아직 준비되지 않아 내려받을 수 없어요.'}</p>
      </div>
    )
  if (!file.backing)
    return (
      <div className={styles.notice}>
        <p className={ui.noticeTitle}>원본 파일이 아직 준비되지 않아 미리볼 수 없어요.</p>
        <p>파일 이름만 기록되어 있어요. (File Storage 연결 전)</p>
      </div>
    )
  if (kind === 'image' || kind === 'pdf') return <MediaBody file={file} kind={kind} />
  return <TextBody file={file} kind={kind} />
}

/** 다운로드: 원본이 있고 공개 가능한 자료만. 아니면 이유와 함께 막는다. */
export function DownloadAction({ file }: { file: PreviewFile }) {
  if (file.backing && file.downloadable !== false)
    return (
      <a className={`${ui.secondaryButton} ${ui.smallButton} ${styles.download}`} href={file.backing.url} download={file.name}>
        원본 다운로드<span className="lh-visually-hidden">: {file.name}</span>
      </a>
    )
  const reason = file.downloadable === false ? '공개하지 않는 원본이라 내려받을 수 없어요.' : '원본 파일이 아직 준비되지 않아 내려받을 수 없어요.'
  return (
    <span className={styles.downloadBox}>
      <button type="button" className={`${ui.secondaryButton} ${ui.smallButton}`} disabled aria-describedby={`download-reason-${file.name}`}>
        원본 다운로드
      </button>
      <span id={`download-reason-${file.name}`} className={ui.cellSub}>
        {reason}
      </span>
    </span>
  )
}

export function FilePreviewDialog({ file, onClose }: { file: PreviewFile | null; onClose: () => void }) {
  const [mode, setMode] = useState<'original' | 'summary'>('original')
  const [shownFile, setShownFile] = useState<PreviewFile | null>(file)
  if (shownFile !== file) {
    setShownFile(file)
    setMode('original')
  }
  const both = file !== null && Boolean(file.viewModel) && hasNativePreview(file)
  return (
    <ModalDialog open={file !== null} title={file ? file.name : ''} onClose={onClose} wide>
      {file && (
        <div className={styles.dialogBody}>
          <div className={styles.meta}>
            {file.role && (
              <span className={styles.roleChip} data-accent={file.roleAccent || undefined}>
                {file.role}
              </span>
            )}
            <Badge>{formatLabelOf(file)}</Badge>
            <AvailabilityBadge file={file} />
            {file.subtitle && <span className={ui.muted}>{file.subtitle}</span>}
          </div>
          {both && (
            <div className={ui.segment} role="group" aria-label="미리보기 방식">
              <button type="button" className={ui.segmentItem} aria-pressed={mode === 'original'} onClick={() => setMode('original')}>
                원본 {formatLabelOf(file)}
              </button>
              <button type="button" className={ui.segmentItem} aria-pressed={mode === 'summary'} onClick={() => setMode('summary')}>
                Case 표시 내용
              </button>
            </div>
          )}
          <PreviewBody file={file} mode={both ? mode : 'auto'} />
          <div className={ui.dialogActions}>
            <DownloadAction file={file} />
            <button type="button" className={ui.secondaryButton} onClick={onClose}>
              닫기<span className="lh-visually-hidden">: {file.name} 미리보기</span>
            </button>
          </div>
        </div>
      )}
    </ModalDialog>
  )
}

/** 파일 목록 한 줄: 이름(누르면 미리보기) · 형식 · 미리보기 상태 · 부제 */
export function FileList({ files, onOpen, emptyText, label }: { files: PreviewFile[]; onOpen: (file: PreviewFile) => void; emptyText: string; label: string }) {
  if (files.length === 0) return <p className={ui.muted}>{emptyText}</p>
  return (
    <ul className={styles.fileList} aria-label={label}>
      {files.map((file) => (
        <li key={`${file.name}-${file.subtitle ?? ''}`} className={styles.fileRow}>
          <span className={styles.format} aria-hidden="true">
            {formatLabelOf(file)}
          </span>
          <span className={styles.fileText}>
            {file.role && (
              <span className={styles.roleChip} data-accent={file.roleAccent || undefined}>
                {file.role}
              </span>
            )}
            <button type="button" className={ui.linkButton} onClick={() => onOpen(file)}>
              {file.name}
              <span className="lh-visually-hidden"> 열기 ({formatLabelOf(file)} · {availabilityLabel[previewAvailability(file)]})</span>
            </button>
            {file.subtitle && <span className={ui.cellSub}>{file.subtitle}</span>}
          </span>
          <AvailabilityBadge file={file} />
        </li>
      ))}
    </ul>
  )
}
