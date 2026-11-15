import { useEffect, useState } from 'react'
import { downloadPlanRevision } from '../api/assessmentAdminApi.ts'
import type { PlanFileMeta } from '../api/types.ts'
import { PlanOriginalViewer } from '../components/PlanOriginalViewer.tsx'
import type { StructureFocus } from '../components/PlanStructureViewer.tsx'
import { formatBytes } from './reviewModel.ts'
import styles from './review.module.css'

// 왼쪽 원문 영역: 얇은 막대(파일명·쪽 수·내려받기·전체 화면) + 기존 PDF Viewer(쪽 이동·확대·폭 맞춤). 카드·겹친 회색 상자 없음.
// HWP·HWPX(A10)는 Viewer가 원본 구조(문단·표)를 직접 그린다 — PDF 변환 없음.
export function SourcePane({ planId, revisionId, file, page, onPageChange, focus = null }: { planId: string; revisionId: string; file: PlanFileMeta | null | undefined; page: number; onPageChange: (page: number) => void; focus?: StructureFocus | null }) {
  const [fullscreen, setFullscreen] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const download = () => {
    if (!file?.available) return
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
    <section className={styles.source} data-fullscreen={fullscreen ? 'true' : undefined} aria-label="평가계획서 원문" data-testid="review-source-pane">
      <div className={styles.paneBar}>
        <strong title={file?.fileName}>원문</strong>
        <span className={styles.tiny}>{file ? `${file.documentFormat} · ${formatBytes(file.sizeBytes)}${file.pageCount ? ` · ${file.pageCount}쪽` : ''}` : '정보 없음'}</span>
        <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={download} disabled={!file?.available} data-testid="review-source-download">
          내려받기
        </button>
        <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => setFullscreen((value) => !value)} aria-pressed={fullscreen} disabled={!file?.previewAvailable && !file?.structurePreviewAvailable} data-testid="review-source-fullscreen">
          {fullscreen ? '닫기' : '전체 화면'}
        </button>
      </div>
      {downloadError && (
        <p role="alert" className={styles.statusText} data-tone="danger" style={{ margin: '8px 16px 0' }}>
          {downloadError}
        </p>
      )}
      <div className={styles.sourceBody}>
        <PlanOriginalViewer bare planId={planId} revisionId={revisionId} file={file} page={page} onPageChange={onPageChange} focus={focus} />
      </div>
    </section>
  )
}
