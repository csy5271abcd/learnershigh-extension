import { useEffect, useState } from 'react'
import { downloadPlanRevision, previewPlanRevision } from '../api/assessmentAdminApi.ts'
import type { PlanFileMeta } from '../api/types.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { AlertIcon, InfoIcon, PdfViewer } from './canonicalUi.ts'

// 평가계획서 원문 Viewer (S-4, 2026-11-13). 서버가 보관한 원문을 인증된 API로 받아 서비스 안에서 보여 준다.
// - PDF: 미리보기 바이트를 받아 blob 주소로 pdf.js Viewer(Student PdfViewer 재사용: 쪽 이동·확대·축소·폭 맞춤)에 넘긴다.
//   Mock Header 인증은 iframe src에 붙일 수 없어 fetch로 받는다.
// - HWP·HWPX: 원문은 보관·내려받기만 된다. 검증된 변환 엔진이 없어 서비스 안 미리보기는 아직 없다(완료로 표시하지 않음).
// - 원문을 보관하지 않은 이전 등록분: 없는 파일을 만들어 보여 주지 않는다.
// 근거 쪽 이동: 상위가 page를 바꾸면 그 쪽으로 이동한다(분석 결과의 PDF 쪽 근거).

/** 받은 결과는 어느 Revision 것인지(key)와 함께 둔다. key가 지금 Revision과 다르면 "불러오는 중"으로 본다. */
type Loaded = { key: string; kind: 'ready'; url: string } | { key: string; kind: 'error'; message: string }

export function PlanOriginalViewer({
  planId,
  revisionId,
  file,
  page,
  onPageChange,
}: {
  planId: string
  revisionId: string
  file: PlanFileMeta | null | undefined
  page: number
  onPageChange: (page: number) => void
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const canPreview = Boolean(file?.available && file.previewAvailable)
  const key = `${planId}/${revisionId}`
  const preview = loaded && loaded.key === key ? loaded : null

  useEffect(() => {
    if (!canPreview) return
    let cancelled = false
    let created: string | null = null
    previewPlanRevision(planId, revisionId).then(
      (blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setLoaded({ key: `${planId}/${revisionId}`, kind: 'ready', url: created })
      },
      (cause: Error) => {
        if (!cancelled) setLoaded({ key: `${planId}/${revisionId}`, kind: 'error', message: cause.message })
      },
    )
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [planId, revisionId, canPreview])

  const download = () => {
    if (!file) return
    setDownloadError(null)
    downloadPlanRevision(planId, revisionId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = file.fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => setDownloadError(`원문을 내려받지 못했어요. ${cause.message}`),
    )
  }

  return (
    <section className={styles.box} aria-label="평가계획서 원문" data-testid="plan-original-viewer">
      <div className={styles.studentLine}>
        <span className={styles.label} style={{ margin: 0 }}>
          원문 {file ? `· ${file.documentFormat}` : ''}
        </span>
        {file?.available && (
          <button type="button" className={styles.secondaryButton} onClick={download} data-testid="plan-original-download">
            원본 내려받기
          </button>
        )}
      </div>
      {file?.available && (
        <p className={styles.muted} style={{ margin: '4px 0 8px' }} data-testid="plan-original-meta">
          {file.fileName} · {formatBytes(file.sizeBytes)}
          {file.pageCount ? ` · ${file.pageCount}쪽` : ''} · SHA-256 {file.checksum.slice(0, 12)}…
        </p>
      )}
      {downloadError && (
        <p className={styles.formError} role="alert">
          <AlertIcon size={15} /> {downloadError}
        </p>
      )}
      {!file ? (
        <p className={styles.muted} data-testid="plan-original-unknown">
          <InfoIcon size={14} /> 원문 정보를 받지 못했어요. (시연 데이터에는 실제 원문 파일이 없어요)
        </p>
      ) : !file.available ? (
        <p className={styles.muted} data-testid="plan-original-missing">
          <InfoIcon size={14} /> 이 개정본은 원문 파일을 보관하지 않던 시기(2026-11-13 이전)에 등록되었어요. 원문을 다시 등록하면 여기서 볼 수 있어요.
        </p>
      ) : !file.previewAvailable ? (
        <p className={styles.mockNotice} data-testid="plan-original-no-preview">
          <InfoIcon size={14} /> {file.documentFormat} 원문은 서버에 그대로 보관되어 있어요. 표·병합 셀·수식 레이아웃을 보존하는 변환 엔진을 검증하는 중이라
          서비스 안 미리보기는 아직 제공하지 않아요. 원본을 내려받아 확인해 주세요.
        </p>
      ) : preview?.kind === 'ready' ? (
        <PdfViewer url={preview.url} title={file.fileName} expectedPageCount={file.pageCount ?? 0} page={page} onPageChange={onPageChange} />
      ) : preview?.kind === 'error' ? (
        <p className={styles.formError} role="alert" data-testid="plan-original-error">
          <AlertIcon size={15} /> 원문을 불러오지 못했어요. {preview.message}
        </p>
      ) : (
        <p className={styles.muted}>원문을 불러오는 중…</p>
      )}
    </section>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
