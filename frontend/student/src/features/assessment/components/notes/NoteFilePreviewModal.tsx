import { useEffect, useRef, useState } from 'react'
import { downloadNoteAttachment, previewNoteAttachment } from '../../api/assessmentDetailApi.ts'
import { Modal } from '../Modal.tsx'
import { PdfViewer } from '../university/PdfViewer.tsx'
import styles from './notes.module.css'

// A28-48: 학생 탐구 노트 첨부 바로 미리보기(관리자 피드백 화면 A28-44 와 같은 규칙).
// - 이미지(PNG·JPEG·GIF·WEBP): 화면 맞춤·확대·축소·원래 크기. PDF: 대학별 자료와 같은 pdf.js 뷰어(쪽 이동·확대·축소·폭 맞춤).
// - 그 밖(HWP·HWPX·DOC·DOCX·PPT·PPTX·XLS·XLSX): 학생 첨부용 변환기가 없어 '미리보기 미지원 · 내려받기'(빈 화면으로 속이지 않음).
// - 서버 미리보기 API(§26-1, 본인 첨부만·SHA 재확인)에서 받은 바이트를 이 브라우저 임시 주소로만 쓰고 닫으면 해제한다.
//   관리자 '학생 화면 보기'에서는 같은 함수가 읽기 전용 student-view 경로로 간다.

const images = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const notePreviewKind = (mimeType: string | null | undefined): 'image' | 'pdf' | 'none' =>
  mimeType === 'application/pdf' ? 'pdf' : images.has(mimeType ?? '') ? 'image' : 'none'

const zooms = [0.25, 0.5, 0.75, 1, 1.5, 2, 3]

function saveBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
}

export function NoteFilePreviewModal({ attachmentId, fileName, mimeType, onClose }: { attachmentId: string; fileName: string; mimeType: string; onClose: () => void }) {
  const kind = notePreviewKind(mimeType)
  const [loaded, setLoaded] = useState<{ kind: 'loading' } | { kind: 'ready'; url: string } | { kind: 'error'; message: string }>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string>()
  const idRef = useRef(attachmentId)
  useEffect(() => {
    idRef.current = attachmentId
  })

  useEffect(() => {
    if (kind === 'none') return
    let cancelled = false
    let created: string | null = null
    previewNoteAttachment(idRef.current).then(
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

  const download = () => {
    setActionError(undefined)
    downloadNoteAttachment(attachmentId).then(
      (blob) => saveBlob(blob, fileName),
      (cause: unknown) => setActionError(cause instanceof Error ? cause.message : '파일을 내려받지 못했어요.'),
    )
  }
  const step = (direction: 1 | -1) => {
    const current = zoom === 'fit' ? 1 : zoom
    const index = zooms.findIndex((value) => value >= current)
    setZoom(zooms[Math.min(zooms.length - 1, Math.max(0, (index < 0 ? zooms.length - 1 : index) + direction))])
  }

  return (
    <Modal
      title={fileName}
      description="탐구 노트 첨부 파일 미리보기"
      wide
      fill={kind === 'pdf'}
      onRequestClose={onClose}
      footer={
        <>
          {actionError && (
            <span className={styles.mathError} role="alert">
              {actionError}
            </span>
          )}
          <button type="button" className={styles.tinyButton} onClick={download} data-testid="note-preview-download">
            내려받기
          </button>
          <button type="button" className={styles.tinyButton} onClick={onClose} data-testid="note-preview-close">
            닫기
          </button>
        </>
      }
    >
      <div data-testid="note-preview" data-kind={kind} data-state={kind === 'none' ? 'unsupported' : loaded.kind}>
        {kind === 'none' ? (
          <p className={styles.mediaCaption} data-testid="note-preview-unsupported">
            이 형식은 앱 안 미리보기를 지원하지 않아요 · 내려받아 확인
          </p>
        ) : loaded.kind === 'loading' ? (
          <p className={styles.mediaCaption} role="status">
            파일을 불러오는 중…
          </p>
        ) : loaded.kind === 'error' ? (
          <p className={styles.mathError} role="alert" data-testid="note-preview-error">
            미리보기를 열지 못했어요. {loaded.message}{' '}
            <button type="button" className={styles.tinyButton} onClick={() => setAttempt((value) => value + 1)}>
              다시 시도
            </button>
          </p>
        ) : kind === 'pdf' ? (
          <PdfViewer url={loaded.url} title={fileName} expectedPageCount={0} page={page} onPageChange={setPage} contained />
        ) : (
          <div>
            <div role="group" aria-label="이미지 배율" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <button type="button" className={styles.tinyButton} onClick={() => step(-1)} aria-label="축소" data-testid="note-preview-zoom-out">
                −
              </button>
              <span aria-live="polite" data-testid="note-preview-zoom">
                {zoom === 'fit' ? '화면 맞춤' : `${Math.round(zoom * 100)}%`}
              </span>
              <button type="button" className={styles.tinyButton} onClick={() => step(1)} aria-label="확대" data-testid="note-preview-zoom-in">
                +
              </button>
              <button type="button" className={styles.tinyButton} onClick={() => setZoom('fit')}>
                화면 맞춤
              </button>
              <button type="button" className={styles.tinyButton} onClick={() => setZoom(1)}>
                원래 크기
              </button>
            </div>
            <div style={{ maxHeight: '66vh', overflow: 'auto', textAlign: 'center', borderRadius: 8 }}>
              <img
                src={loaded.url}
                alt={`${fileName} 미리보기`}
                data-testid="note-preview-image"
                style={zoom === 'fit' ? { maxWidth: '100%', maxHeight: '64vh', objectFit: 'contain' } : { transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
