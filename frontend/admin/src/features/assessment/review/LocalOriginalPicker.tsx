import { useRef, useState } from 'react'
import { fileSizeLabel } from '../model/adminFormat.ts'
import type { HashState } from './ConfirmStep.tsx'
import styles from './review.module.css'

// A25 최종 확정 '원본 대조' 파일 선택 카드 (Daglo 업로드 카드 패턴). 대조 규칙은 바뀌지 않는다:
// 고른 파일은 서버로 보내지 않고 이 브라우저에서 SHA-256을 계산해 등록 문서와 같은지만 본다(ReviewWorkspace.pickFile).
// 같지 않거나 고르지 않으면 확정 조건(blockers)이 그대로 막는다. 파일 고르기 버튼 + 끌어 놓기 둘 다 같은 처리로 간다.
export function LocalOriginalPicker({ hash, onPickFile, format = 'PDF', inputId }: { hash: HashState; onPickFile: (file: File | undefined) => void; format?: 'PDF' | 'HWP' | 'HWPX'; inputId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const picked = hash.status === 'match' || hash.status === 'mismatch' ? hash : null
  const open = () => inputRef.current?.click()

  return (
    <div
      className={styles.pickCard}
      data-state={hash.status}
      data-dragging={dragging || undefined}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files?.[0]
        if (file) onPickFile(file)
      }}
      data-testid="review-local-pdf-card"
    >
      <input
        ref={inputRef}
        className={styles.pickInput}
        type="file"
        id={inputId}
        accept={format === 'PDF' ? 'application/pdf,.pdf' : format === 'HWP' ? '.hwp' : '.hwpx'}
        onChange={(event) => {
          onPickFile(event.target.files?.[0])
          event.target.value = ''
        }}
        data-testid="review-local-pdf"
        aria-label={`학교 원본 ${format} 고르기`}
        tabIndex={-1}
      />
      <span className={styles.pickIcon} data-format={format} aria-hidden="true">
        {format}
      </span>
      <div className={styles.pickBody}>
        {picked ? (
          <>
            <strong className={styles.pickName} title={picked.fileName}>
              {picked.fileName}
            </strong>
            <span className={styles.pickMeta}>{fileSizeLabel(picked.sizeBytes)}</span>
          </>
        ) : (
          <>
            <strong className={styles.pickName}>{hash.status === 'computing' ? '원본과 비교하는 중…' : `학교 원본 ${format} 파일을 골라 주세요`}</strong>
            <span className={styles.pickMeta}>여기로 끌어 놓아도 돼요 · 파일은 서버로 보내지 않아요</span>
          </>
        )}
        {hash.status === 'computing' && <span className={styles.pickProgress} role="progressbar" aria-label="원본 비교 중" />}
        <p className={styles.pickStatus} data-tone={hash.status === 'mismatch' || hash.status === 'error' ? 'danger' : hash.status === 'match' ? 'ok' : undefined} role="status" data-testid="review-hash-status">
          {hash.status === 'none' && `원본 ${format} 파일을 골라 주세요.`}
          {hash.status === 'computing' && '확인 중…'}
          {hash.status === 'match' && `같은 파일이에요 · ${hash.fileName}`}
          {hash.status === 'mismatch' && `등록 문서와 다른 파일이에요 · ${hash.fileName} — 이 파일로는 확정할 수 없어요`}
          {hash.status === 'error' && `확인하지 못했어요 · ${hash.message}`}
        </p>
      </div>
      <button type="button" className={`${styles.button} ${styles.small}`} onClick={open} disabled={hash.status === 'computing'} data-testid="review-local-pdf-pick">
        {picked || hash.status === 'error' ? '다른 파일 선택' : '파일 선택'}
      </button>
    </div>
  )
}
