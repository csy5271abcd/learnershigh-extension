import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AlertIcon, ChevronLeftIcon, ChevronRightIcon, LinkIcon } from '../AssessmentIcons.tsx'
import { openPdfDocument } from './pdfjsLoader.ts'
import styles from './university.module.css'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; pdf: PDFDocumentProxy }
  | { kind: 'error'; reason: 'MISSING' | 'CHANGED' | 'CORRUPT' | 'UNAVAILABLE' }

const zoomSteps = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
/** 폭 맞춤의 최대 배율 (넓은 화면에서 글자가 지나치게 커지지 않게) */
const maxFitScale = 1.6

interface PdfViewerProps {
  url: string
  /** 화면 낭독용 문서 이름 */
  title: string
  /** Manifest의 쪽 수 (실제 파일과 다르면 안내한다) */
  expectedPageCount: number
  /** 현재 쪽 (PDF 물리 쪽, 1부터). 상위가 URL에 둔다 */
  page: number
  onPageChange: (page: number) => void
}

const errorText: Record<'MISSING' | 'CHANGED' | 'CORRUPT' | 'UNAVAILABLE', { title: string; body: string }> = {
  MISSING: { title: '원본 PDF 파일을 찾을 수 없어요', body: '목록에는 있지만 개발 환경 폴더에 파일이 없어요. 다른 자료는 계속 볼 수 있어요.' },
  CHANGED: { title: '원본 파일이 목록과 달라요', body: '파일 내용이 바뀌어 문항 위치가 맞지 않을 수 있어 열지 않았어요. 자료 목록을 다시 확인해야 해요.' },
  CORRUPT: { title: 'PDF를 열 수 없어요', body: '파일이 손상되었거나 PDF 형식이 아니에요. 다른 자료는 계속 볼 수 있어요.' },
  UNAVAILABLE: { title: 'PDF를 불러오지 못했어요', body: '잠시 뒤 다시 시도해 주세요.' },
}

// 대학별 기출 PDF 원문 뷰어 (pdf.js 캔버스, 한 쪽씩). 원문을 바꾸거나 글자를 따로 복사해 두지 않는다.
// 직접 구현: 이전·다음, 쪽 번호 이동, 확대·축소·폭 맞춤, 키보드(←→ PageUp/PageDown), 로딩·오류 구분.
// 브라우저 기본 PDF 뷰어는 "새 탭에서 열기"로만 쓴다 (인쇄·검색 등은 그 뷰어 기능).
export function PdfViewer({ url, title, expectedPageCount, page, onPageChange }: PdfViewerProps) {
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [stageWidth, setStageWidth] = useState(0)
  const [rendering, setRendering] = useState(true)
  const [renderError, setRenderError] = useState(false)
  const [pageInput, setPageInput] = useState(String(page))
  const [syncedPage, setSyncedPage] = useState(page)
  const [fitScale, setFitScale] = useState(1)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  if (syncedPage !== page) {
    setSyncedPage(page)
    setPageInput(String(page))
  }

  // 문서 열기: 먼저 개발 서버 상태(없음 404 / 변경 409)를 확인하고, 그다음 pdf.js로 연다.
  useEffect(() => {
    let cancelled = false
    let pdf: PDFDocumentProxy | undefined
    let task: Awaited<ReturnType<typeof openPdfDocument>> | undefined
    const run = async () => {
      let head: Response
      try {
        head = await fetch(url, { method: 'HEAD', cache: 'no-store' })
      } catch {
        if (!cancelled) setLoad({ kind: 'error', reason: 'UNAVAILABLE' })
        return
      }
      if (!head.ok) {
        if (!cancelled) setLoad({ kind: 'error', reason: head.status === 404 ? 'MISSING' : head.status === 409 ? 'CHANGED' : 'UNAVAILABLE' })
        return
      }
      try {
        task = await openPdfDocument(url)
        pdf = await task.promise
        if (cancelled) {
          void pdf.destroy()
          return
        }
        setLoad({ kind: 'ready', pdf })
      } catch (error) {
        if (cancelled) return
        const name = error instanceof Error ? error.name : ''
        setLoad({ kind: 'error', reason: name === 'InvalidPDFException' ? 'CORRUPT' : name === 'MissingPDFException' ? 'MISSING' : 'UNAVAILABLE' })
      }
    }
    void run()
    return () => {
      cancelled = true
      void task?.destroy()
    }
  }, [url, attempt])

  // 폭 맞춤용 너비
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver((entries) => setStageWidth(Math.floor(entries[0].contentRect.width)))
    observer.observe(stage)
    return () => observer.disconnect()
  }, [load.kind])

  const pdf = load.kind === 'ready' ? load.pdf : undefined
  const pageCount = pdf?.numPages ?? expectedPageCount
  const currentPage = Math.min(Math.max(1, page), pageCount)

  // 쪽 그리기. 쪽·배율·너비가 바뀌면 이전 그리기를 취소한다.
  useEffect(() => {
    if (!pdf || stageWidth <= 0) return
    let cancelled = false
    let renderTask: RenderTask | undefined
    const run = async () => {
      setRendering(true)
      setRenderError(false)
      try {
        const pdfPage = await pdf.getPage(currentPage)
        if (cancelled) return
        const base = pdfPage.getViewport({ scale: 1 })
        const fit = Math.min(maxFitScale, Math.max(0.3, (stageWidth - 32) / base.width))
        setFitScale(fit)
        const scale = zoom === 'fit' ? fit : zoom
        const viewport = pdfPage.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) return
        const outputScale = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        renderTask = pdfPage.render({
          canvas,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        })
        await renderTask.promise
        if (!cancelled) setRendering(false)
      } catch (error) {
        if (cancelled || (error instanceof Error && error.name === 'RenderingCancelledException')) return
        setRenderError(true)
        setRendering(false)
      }
    }
    void run()
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, currentPage, zoom, stageWidth])

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(1, next), pageCount)
    setPageInput(String(clamped))
    if (clamped !== currentPage) onPageChange(clamped)
  }

  const scale = zoom === 'fit' ? fitScale : zoom
  const zoomOut = () => setZoom([...zoomSteps].reverse().find((step) => step < scale - 0.01) ?? zoomSteps[0])
  const zoomIn = () => setZoom(zoomSteps.find((step) => step > scale + 0.01) ?? zoomSteps[zoomSteps.length - 1])

  const onStageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) return
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault()
      goTo(currentPage + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault()
      goTo(currentPage - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      goTo(1)
    } else if (event.key === 'End') {
      event.preventDefault()
      goTo(pageCount)
    }
  }

  if (load.kind === 'error') {
    const text = errorText[load.reason]
    return (
      <div className={styles.viewerState} role="alert">
        <AlertIcon size={20} />
        <p className={styles.viewerStateTitle}>{text.title}</p>
        <p className={styles.viewerStateBody}>{text.body}</p>
        {load.reason === 'UNAVAILABLE' && (
          <button
            type="button"
            className={styles.outlineButton}
            onClick={() => {
              setLoad({ kind: 'loading' })
              setAttempt((value) => value + 1)
            }}
          >
            다시 시도
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.viewerToolbar} role="toolbar" aria-label="PDF 보기 도구">
        <div className={styles.toolbarGroup}>
          <button type="button" className={styles.iconButton} aria-label="이전 쪽" disabled={!pdf || currentPage <= 1} onClick={() => goTo(currentPage - 1)}>
            <ChevronLeftIcon size={16} />
          </button>
          <label className={styles.pageField}>
            <span className="lh-visually-hidden">쪽 번호</span>
            <input
              inputMode="numeric"
              value={pageInput}
              disabled={!pdf}
              aria-describedby="pdf-page-total"
              onChange={(event) => setPageInput(event.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') goTo(Number(pageInput) || currentPage)
              }}
              onBlur={() => goTo(Number(pageInput) || currentPage)}
            />
          </label>
          <span id="pdf-page-total" className={styles.pageTotal}>
            / {pageCount}쪽
          </span>
          <button type="button" className={styles.iconButton} aria-label="다음 쪽" disabled={!pdf || currentPage >= pageCount} onClick={() => goTo(currentPage + 1)}>
            <ChevronRightIcon size={16} />
          </button>
        </div>
        <div className={styles.toolbarGroup}>
          <button type="button" className={styles.iconButton} aria-label="축소" disabled={!pdf || scale <= zoomSteps[0] + 0.01} onClick={zoomOut}>
            −
          </button>
          <span className={styles.zoomValue} aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button type="button" className={styles.iconButton} aria-label="확대" disabled={!pdf || scale >= zoomSteps[zoomSteps.length - 1] - 0.01} onClick={zoomIn}>
            +
          </button>
          <button type="button" className={styles.textButton} aria-pressed={zoom === 'fit'} disabled={!pdf} onClick={() => setZoom('fit')}>
            폭 맞춤
          </button>
        </div>
        <a className={styles.textButton} href={`${url}#page=${currentPage}`} target="_blank" rel="noreferrer">
          새 탭에서 열기
          <LinkIcon size={12} />
        </a>
      </div>

      {pdf && pdf.numPages !== expectedPageCount && (
        <p className={styles.viewerNotice} role="status">
          <AlertIcon size={13} /> 파일의 쪽 수({pdf.numPages}쪽)가 자료 목록({expectedPageCount}쪽)과 달라요. 문항 위치가 맞지 않을 수 있어요.
        </p>
      )}

      <div
        ref={stageRef}
        className={styles.viewerStage}
        tabIndex={0}
        role="region"
        aria-label={`${title} PDF 원문, ${currentPage}쪽`}
        aria-busy={!pdf || rendering}
        onKeyDown={onStageKeyDown}
      >
        {!pdf ? (
          <p className={styles.viewerLoading} role="status">
            PDF를 불러오는 중…
          </p>
        ) : (
          <>
            {renderError ? (
              <p className={styles.viewerLoading} role="alert">
                이 쪽을 그리지 못했어요. 다른 쪽으로 이동하거나 새 탭에서 열어 보세요.
              </p>
            ) : (
              rendering && (
                <p className={styles.viewerLoadingOverlay} role="status">
                  {currentPage}쪽을 그리는 중…
                </p>
              )
            )}
            <canvas ref={canvasRef} className={styles.pageCanvas} role="img" aria-label={`${title} ${currentPage}쪽`} data-page={currentPage} data-rendered={!rendering && !renderError ? 'true' : 'false'} />
          </>
        )}
      </div>
    </div>
  )
}
