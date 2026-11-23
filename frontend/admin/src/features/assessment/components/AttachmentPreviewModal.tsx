import { useEffect, useRef, useState } from 'react'
import styles from '../styles/assessmentAdmin.module.css'
import { AlertIcon, Modal, PdfViewer } from './canonicalUi.ts'
import { openBlob, saveBlob } from '../model/blobActions.ts'
import { previewKindOf, type PreviewKind } from '../model/attachmentPreview.ts'

// A28-44: 관리자 피드백 상세에서 학생이 요청 당시 낸 파일을 같은 화면에서 바로 본다(읽기 전용).
// - 이미지(PNG·JPEG·GIF·WEBP): 화면 맞춤 · 확대 · 축소 · 원래 크기. PDF: 기존 pdf.js 뷰어(쪽 이동·확대·축소·폭 맞춤) 재사용.
// - 그 밖(HWP·HWPX·DOC·DOCX·PPT·PPTX·XLS·XLSX): 학생 첨부용 변환 경로가 서버에 없어 '미리보기 미지원 · 내려받기'만(빈 화면으로 속이지 않음).
// - 바이트는 서버 미리보기 API(SHA 재확인·nosniff)에서 받아 이 브라우저 임시 주소(object URL)로만 쓰고, 닫으면 해제한다.
// - 미리보기는 피드백 상태·Snapshot 을 바꾸지 않는다(GET 만).

type Loaded = { kind: 'loading' } | { kind: 'ready'; url: string } | { kind: 'error'; message: string }

const zooms = [0.25, 0.5, 0.75, 1, 1.5, 2, 3]

export function AttachmentPreviewModal({
  fileName,
  contentType,
  load,
  download,
  onClose,
}: {
  fileName: string
  contentType: string
  /** 서버 미리보기(이미지·PDF만 호출) */
  load: () => Promise<Blob>
  /** 서버 원본 내려받기 */
  download: () => Promise<Blob>
  onClose: () => void
}) {
  const kind: PreviewKind = previewKindOf(contentType)
  const [loaded, setLoaded] = useState<Loaded>(kind === 'none' ? { kind: 'error', message: '' } : { kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  // 호출 측은 매 렌더마다 새 함수를 넘기므로 최신 함수만 기억하고, 다시 부르는 시점은 attempt 로 정한다
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (kind === 'none') return
    let cancelled = false
    let created: string | null = null
    loadRef.current().then(
      (blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setLoaded({ kind: 'ready', url: created })
      },
      (cause: unknown) => !cancelled && setLoaded({ kind: 'error', message: cause instanceof Error ? cause.message : '파일을 불러오지 못했어요.' }),
    )
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [kind, attempt])

  const run = (action: () => Promise<void>) => {
    setActionError(null)
    action().catch((cause: unknown) => setActionError(cause instanceof Error ? cause.message : '파일을 받지 못했어요.'))
  }
  const step = (direction: 1 | -1) => {
    const current = zoom === 'fit' ? 1 : zoom
    const index = zooms.findIndex((value) => value >= current)
    const next = zooms[Math.min(zooms.length - 1, Math.max(0, (index < 0 ? zooms.length - 1 : index) + direction))]
    setZoom(next)
  }

  return (
    <Modal
      title={fileName}
      description="학생이 피드백 요청 때 낸 파일(읽기 전용)"
      wide
      fill={kind === 'pdf'}
      onRequestClose={onClose}
      footer={
        <>
          {actionError && (
            <span className={styles.formError} role="alert">
              {actionError}
            </span>
          )}
          {loaded.kind === 'ready' && (
            <button type="button" className={styles.secondaryButton} onClick={() => run(async () => openBlob(await load()))} data-testid="attachment-preview-newtab">
              새 탭에서 열기
            </button>
          )}
          <button type="button" className={styles.secondaryButton} onClick={() => run(async () => saveBlob(await download(), fileName))} data-testid="attachment-preview-download">
            내려받기
          </button>
          <button type="button" className={styles.primaryButton} onClick={onClose} data-testid="attachment-preview-close">
            닫기
          </button>
        </>
      }
    >
      <div data-testid="attachment-preview" data-kind={kind} data-state={loaded.kind}>
        {kind === 'none' ? (
          <p className={styles.muted} data-testid="attachment-preview-unsupported">
            {contentTypeLabel(contentType)} · 앱 안 미리보기 미지원 · 내려받아 확인
          </p>
        ) : loaded.kind === 'loading' ? (
          <p className={styles.muted} role="status">
            파일을 불러오는 중…
          </p>
        ) : loaded.kind === 'error' ? (
          <div className={styles.formError} role="alert" data-testid="attachment-preview-error">
            <AlertIcon size={15} /> 미리보기를 열지 못했어요. {loaded.message}
            <button type="button" className={styles.linkButton} onClick={() => setAttempt((value) => value + 1)}>
              다시 시도
            </button>
          </div>
        ) : kind === 'pdf' ? (
          <PdfViewer url={loaded.url} title={fileName} expectedPageCount={0} page={page} onPageChange={setPage} contained />
        ) : (
          <div>
            <div className={styles.actions} role="group" aria-label="이미지 배율" style={{ marginBottom: 8 }}>
              <button type="button" className={styles.secondaryButton} onClick={() => step(-1)} aria-label="축소" data-testid="attachment-preview-zoom-out">
                −
              </button>
              <span aria-live="polite" data-testid="attachment-preview-zoom">
                {zoom === 'fit' ? '화면 맞춤' : `${Math.round(zoom * 100)}%`}
              </span>
              <button type="button" className={styles.secondaryButton} onClick={() => step(1)} aria-label="확대" data-testid="attachment-preview-zoom-in">
                +
              </button>
              <button type="button" className={styles.linkButton} onClick={() => setZoom('fit')}>
                화면 맞춤
              </button>
              <button type="button" className={styles.linkButton} onClick={() => setZoom(1)}>
                원래 크기
              </button>
            </div>
            <div style={{ maxHeight: '68vh', overflow: 'auto', textAlign: 'center', background: 'var(--as-color-surface-subtle, #f5f6f8)', borderRadius: 8 }}>
              <img
                src={loaded.url}
                alt={`${fileName} 미리보기`}
                data-testid="attachment-preview-image"
                style={zoom === 'fit' ? { maxWidth: '100%', maxHeight: '66vh', objectFit: 'contain' } : { width: 'auto', transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function contentTypeLabel(contentType: string) {
  if (contentType.includes('hwp')) return 'HWP·HWPX 문서'
  if (contentType.includes('word') || contentType === 'application/msword') return 'Word 문서'
  if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'PowerPoint 문서'
  if (contentType.includes('sheet') || contentType.includes('excel')) return 'Excel 문서'
  return contentType || '이 형식'
}
