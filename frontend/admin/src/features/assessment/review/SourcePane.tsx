import { useEffect, useState } from 'react'
import { downloadPlanRevision } from '../api/assessmentAdminApi.ts'
import type { PlanFileMeta } from '../api/types.ts'
import { PlanOriginalViewer } from '../components/PlanOriginalViewer.tsx'
import { formatBytes } from './reviewModel.ts'
import styles from './review.module.css'

// 왼쪽 원문 영역: 얇은 막대(파일명·쪽 수·내려받기·전체 화면) + 기존 PDF Viewer(쪽 이동·확대·폭 맞춤). 카드·겹친 회색 상자 없음.
// HWP·HWPX는 검증된 변환 엔진이 없어 미리보기를 만들지 않는다(가짜 미리보기 없음 — Viewer가 안내만 한다).
export function SourcePane({ planId, revisionId, file, page, onPageChange }: { planId: string; revisionId: string; file: PlanFileMeta | null | undefined; page: number; onPageChange: (page: number) => void }) {
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
        <button type="button" className={`${styles.buttonGhost} ${styles.small}`} onClick={() => setFullscreen((value) => !value)} aria-pressed={fullscreen} disabled={!file?.previewAvailable} data-testid="review-source-fullscreen">
          {fullscreen ? '닫기' : '전체 화면'}
        </button>
      </div>
      {downloadError && (
        <p role="alert" className={styles.statusText} data-tone="danger" style={{ margin: '8px 16px 0' }}>
          {downloadError}
        </p>
      )}
      <div className={styles.sourceBody}>
        <PlanOriginalViewer bare planId={planId} revisionId={revisionId} file={file} page={page} onPageChange={onPageChange} />
      </div>
    </section>
  )
}
