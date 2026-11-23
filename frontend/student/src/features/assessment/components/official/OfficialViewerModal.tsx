import { useEffect, useState } from 'react'
import { previewOfficialFile } from '../../api/evaluationPlansApi.ts'
import { ApiError } from '../../api/apiError.ts'
import type { StudentOfficialPlan } from '../../api/types.ts'
import { Modal } from '../Modal.tsx'
import { PdfViewer } from '../university/PdfViewer.tsx'
import styles from './OfficialDocuments.module.css'

// A28-06 학생 공식 원본 Viewer(앱 안). 관리자 원문 보기와 같은 pdf.js Viewer(쪽 이동·확대·축소·폭 맞춤·새 탭)를 쓴다.
// - PDF: 원본 그대로. HWP·HWPX: 서버 변환기로 만든 '미리보기용 PDF'(원본 아님 — 줄바꿈·쪽 나눔이 다를 수 있다고 알린다).
// - 서버가 학생 학교·칸·SHA 를 다시 확인한다(관리자 API 를 쓰지 않음). 실패하면 원인과 내려받기를 보인다.
// - 문서를 바꾸면 이전 문서 Blob 주소를 해제하고 새로 받는다(잔상 없음). 닫으면 목록 화면 스크롤은 그대로다(Modal).

type Doc = StudentOfficialPlan['documents'][number]

type State = { kind: 'loading' } | { kind: 'ready'; url: string } | { kind: 'error'; message: string }

function failureText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 415) return '이 원본은 앱 안 미리보기를 쓸 수 없어요(변환기 미설정). 내려받아 한글 프로그램에서 확인해 주세요.'
    if (cause.status === 503 || cause.code === 'PLAN_PREVIEW_PREPARING') return cause.message || 'PDF 변환기를 준비하고 있어요. 잠시 후 다시 열어 주세요.'
    if (cause.status === 422) return `미리보기로 바꾸지 못했어요. 내려받아 확인해 주세요.${cause.message ? ` (${cause.message})` : ''}`
    if (cause.status === 404) return '원본을 찾지 못했어요. 목록을 새로 고쳐 주세요.'
    if (cause.status === 409) return '원본 파일 확인(무결성)에 실패해 열지 않았어요.'
    return cause.message || '원본을 열지 못했어요.'
  }
  return '원본을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.'
}

export function OfficialViewerModal({ slot, doc, onClose, onDownload }: { slot: StudentOfficialPlan; doc: Doc; onClose: () => void; onDownload: () => void }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [page, setPage] = useState(1)
  const converted = doc.documentFormat !== 'PDF'

  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    // 문서가 바뀌면 상위가 key 로 다시 만든다(처음 상태 = loading, 1쪽) — 이전 문서 잔상 없음
    previewOfficialFile(slot.academicYear, slot.semester, doc.sourceDocumentId, slot.grade).then(
      (blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'application/pdf' }))
        setState({ kind: 'ready', url })
      },
      (cause: unknown) => !cancelled && setState({ kind: 'error', message: failureText(cause) }),
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [slot.academicYear, slot.semester, slot.grade, doc.sourceDocumentId])

  return (
    <Modal
      title={doc.fileName}
      description={`${slot.academicYear}학년도 고${slot.grade ?? ''} ${slot.semester}학기 · 학교알리미 공식 원본 · ${doc.documentFormat}`}
      wide
      fill
      onRequestClose={onClose}
      footer={
        <>
          <button type="button" className={styles.action} onClick={onDownload} data-testid="official-viewer-download">
            원본 내려받기
          </button>
          <button type="button" className={styles.action} onClick={onClose} data-testid="official-viewer-close">
            닫기
          </button>
        </>
      }
    >
      <div className={styles.viewer} data-testid="official-viewer" data-format={doc.documentFormat}>
        {converted && (
          <p className={styles.viewerNote} data-testid="official-viewer-converted">
            {doc.documentFormat} 원본을 미리보기용 PDF로 바꿔 보여 드려요. 줄바꿈·쪽 나눔이 원본과 다를 수 있어요. 정확한 내용은 원본을 내려받아 확인해 주세요.
          </p>
        )}
        {state.kind === 'loading' && (
          <p className={styles.viewerNote} role="status">
            {converted ? '미리보기를 만드는 중이에요(처음 한 번은 시간이 걸릴 수 있어요)…' : '원본을 불러오는 중이에요…'}
          </p>
        )}
        {state.kind === 'error' && (
          <p className={styles.error} role="alert" data-testid="official-viewer-error">
            {state.message}
          </p>
        )}
        {state.kind === 'ready' && <PdfViewer url={state.url} title={converted ? `${doc.fileName} (미리보기 변환)` : doc.fileName} expectedPageCount={0} page={page} onPageChange={setPage} contained />}
      </div>
    </Modal>
  )
}
