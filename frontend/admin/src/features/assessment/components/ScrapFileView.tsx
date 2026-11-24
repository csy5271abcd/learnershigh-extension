import { useEffect, useRef, useState } from 'react'
import { attachScrapFile, detachScrapFile, downloadScrapFile, previewScrapFile } from '../api/assessmentAdminApi.ts'
import type { ReferenceScrap } from '../api/types.ts'
import { nextToastId } from '../model/adminFormat.ts'
import { fileSizeText, SCRAP_FILE_ACCEPT, scrapFileKind, scrapFileKindLabel, scrapFileProblem, type ScrapFileKind } from '../model/scrapFiles.ts'
import { useCommand } from '../model/useRemote.ts'
import styles from '../routes/scrapModal.module.css'
import admin from '../styles/assessmentAdmin.module.css'
import { FileIcon, ImageIcon, Modal, PlayIcon, type ToastMessage } from './canonicalUi.ts'

// A27-UX §43-1 관리자 참고자료 업로드 파일 한 줄: 유형 태그·사진 썸네일·이름·크기 + 미리보기(PDF·사진·MP4/WEBM)·내려받기·바꾸기·빼기.
// 파일은 관리자 전용(학생 Endpoint 없음). 미리보기를 지원하지 않는 형식(MOV·HWP·오피스)은 사실대로 안내하고 내려받기를 준다.
export function ScrapFileView({ scrap, onChanged, onToast }: { scrap: ReferenceScrap; onChanged: () => void; onToast: (toast: ToastMessage) => void }) {
  const file = scrap.file
  const kind: ScrapFileKind = file ? scrapFileKind(file.contentType) : 'file'
  const [thumb, setThumb] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string } | 'loading' | { error: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { run, pending } = useCommand()

  // 사진만 작은 썸네일을 서버 미리보기(관리자 인증)로 읽는다. 실패하면 아이콘으로 둔다(오류를 숨기지 않고 태그는 그대로)
  useEffect(() => {
    if (!file || kind !== 'image' || !file.previewAvailable) return
    let url: string | null = null
    let cancelled = false
    previewScrapFile(scrap.scrapId).then(
      (blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setThumb(url)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [scrap.scrapId, file, kind])

  useEffect(
    () => () => {
      if (preview && typeof preview === 'object' && 'url' in preview) URL.revokeObjectURL(preview.url)
    },
    [preview],
  )

  if (!file) return null

  const openPreview = () => {
    setPreview('loading')
    previewScrapFile(scrap.scrapId).then(
      (blob) => setPreview({ url: URL.createObjectURL(blob) }),
      (cause: Error) => setPreview({ error: `미리보기를 열지 못했어요. ${cause.message}` }),
    )
  }
  const download = () =>
    downloadScrapFile(scrap.scrapId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = file.fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => onToast({ id: nextToastId(), tone: 'error', text: `파일을 내려받지 못했어요. ${cause.message}` }),
    )
  const replace = async (next: File | undefined) => {
    if (!next) return
    const problem = scrapFileProblem(next)
    if (problem) {
      onToast({ id: nextToastId(), tone: 'error', text: problem })
      return
    }
    const outcome = await run(() => attachScrapFile(scrap.scrapId, next))
    if (!outcome) return
    if (outcome.ok) {
      onToast({ id: nextToastId(), tone: 'success', text: `'${next.name}'(으)로 바꿨어요.` })
      onChanged()
    } else onToast({ id: nextToastId(), tone: 'error', text: outcome.error.message })
  }
  const detach = async () => {
    const outcome = await run(() => detachScrapFile(scrap.scrapId))
    if (!outcome) return
    if (outcome.ok) {
      onToast({ id: nextToastId(), tone: 'success', text: '파일 연결을 뺐어요. 링크는 그대로예요.' })
      onChanged()
    } else onToast({ id: nextToastId(), tone: 'error', text: outcome.error.message })
  }

  return (
    <div className={styles.fileRow} data-testid="scrap-file">
      <span className={styles.fileThumb} data-kind={kind} aria-hidden="true">
        {thumb ? <img src={thumb} alt="" /> : kind === 'video' ? <PlayIcon size={18} /> : kind === 'image' ? <ImageIcon size={18} /> : <FileIcon size={18} />}
      </span>
      <span className={styles.fileText}>
        <span className={styles.fileName} title={file.fileName}>
          {file.fileName}
        </span>
        <span className={styles.fileMeta}>
          <span className={styles.fileTag} data-kind={kind}>
            {scrapFileKindLabel[kind]}
          </span>
          {fileSizeText(file.sizeBytes)} · 관리자 전용
        </span>
      </span>
      <span className={styles.fileActions}>
        {file.previewAvailable ? (
          <button type="button" className={`${admin.secondaryButton} ${admin.smallButton}`} onClick={openPreview} data-testid="scrap-file-preview">
            {kind === 'video' ? '재생' : '미리보기'}
          </button>
        ) : (
          <span className={styles.fileMeta} title="이 형식은 앱 안 미리보기를 지원하지 않아요. 내려받아 확인해 주세요.">
            미리보기 없음
          </span>
        )}
        <button type="button" className={`${admin.secondaryButton} ${admin.smallButton}`} onClick={download} data-testid="scrap-file-download">
          내려받기
        </button>
        <button type="button" className={`${admin.secondaryButton} ${admin.smallButton}`} onClick={() => inputRef.current?.click()} disabled={pending} data-testid="scrap-file-replace">
          바꾸기
        </button>
        {scrap.sourceUrl && (
          <button type="button" className={`${admin.ghostButton} ${admin.smallButton}`} onClick={detach} disabled={pending} data-testid="scrap-file-detach">
            파일 빼기
          </button>
        )}
        <input ref={inputRef} type="file" accept={SCRAP_FILE_ACCEPT} hidden onChange={(event) => void replace(event.target.files?.[0])} aria-label={`${scrap.title} 파일 바꾸기`} />
      </span>

      {preview && (
        <Modal title={file.fileName} wide onRequestClose={() => setPreview(null)} footer={<button type="button" className={admin.secondaryButton} onClick={() => setPreview(null)}>닫기</button>}>
          {preview === 'loading' ? (
            <p className={admin.muted} aria-busy="true">
              불러오는 중이에요.
            </p>
          ) : 'error' in preview ? (
            <p className={admin.formError} role="alert">
              {preview.error}
            </p>
          ) : kind === 'video' ? (
            <video className={styles.previewMedia} src={preview.url} controls preload="metadata" data-testid="scrap-preview-video" />
          ) : kind === 'image' ? (
            <img className={styles.previewMedia} src={preview.url} alt={scrap.title} data-testid="scrap-preview-image" />
          ) : (
            <iframe className={styles.previewFrame} src={preview.url} title={file.fileName} data-testid="scrap-preview-pdf" />
          )}
        </Modal>
      )}
    </div>
  )
}
