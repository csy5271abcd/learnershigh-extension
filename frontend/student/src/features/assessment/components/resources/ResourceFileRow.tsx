import { useRef, useState } from 'react'
import { toApiError } from '../../api/apiError.ts'
import { attachResourceFile, detachResourceFile, downloadResourceFile, previewResourceFile } from '../../api/resourcesApi.ts'
import type { StudentResource } from '../../api/types.ts'
import { acceptFor, fileSizeText, localFileProblem } from '../../model/resourceLibraryView.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import styles from './resources.module.css'

// A27-UX 자료 상세의 첨부 파일 (§22-1 DRAFT): 내려받기 · 바로 보기(PDF·이미지만, 원본 그대로) · 바꾸기 · 빼기.
// HWP·Office 문서는 앱 안 미리보기를 제공한다고 표시하지 않는다(내려받기만).
export function ResourceFileRow({ resource, readOnly, onChanged, notify }: { resource: StudentResource; readOnly: boolean; onChanged: () => void; notify: (tone: 'success' | 'error' | 'info', text: string) => void }) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const file = resource.file
  const save = (blob: Blob, name: string) => {
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = name
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
  }
  const run = async (action: () => Promise<unknown>, success?: string) => {
    if (busy) return
    setBusy(true)
    try {
      await action()
      if (success) notify('success', success)
    } catch (error) {
      notify('error', toApiError(error).message)
    } finally {
      setBusy(false)
    }
  }
  const replace = (picked: File | undefined) => {
    if (!picked) return
    const problem = localFileProblem(picked, resource.type === 'PDF' || resource.type === 'IMAGE' ? resource.type : 'FILE')
    if (problem) {
      notify('error', problem)
      return
    }
    void run(async () => {
      await attachResourceFile(resource.resourceId, picked)
      onChanged()
    }, '파일을 올렸어요.')
  }
  return (
    <div className={styles.fileBox} data-testid="resource-file">
      {file ? (
        <>
          <div className={styles.fileRow}>
            <span className={styles.fileName} title={file.fileName}>
              {file.fileName}
            </span>
            <span className={styles.fileMeta}>
              {file.fileName.split('.').pop()?.toUpperCase()} · {fileSizeText(file.sizeBytes)}
            </span>
          </div>
          <div className={styles.fileActions}>
            <button type="button" className={formStyles.ghostButton} disabled={busy} onClick={() => run(async () => save(await downloadResourceFile(resource.resourceId), file.fileName))} data-testid="resource-file-download">
              내려받기
            </button>
            {file.previewAvailable && (
              <button
                type="button"
                className={formStyles.ghostButton}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const blob = await previewResourceFile(resource.resourceId)
                    window.open(URL.createObjectURL(blob), '_blank', 'noopener')
                  })
                }
                data-testid="resource-file-preview"
              >
                바로 보기
              </button>
            )}
            {!readOnly && (
              <>
                <button type="button" className={formStyles.ghostButton} disabled={busy} onClick={() => inputRef.current?.click()}>
                  바꾸기
                </button>
                <button
                  type="button"
                  className={formStyles.ghostButton}
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm('첨부 파일을 뺄까요? 자료 정보는 그대로 남아요.')) return
                    void run(async () => {
                      await detachResourceFile(resource.resourceId)
                      onChanged()
                    }, '첨부 파일을 뺐어요.')
                  }}
                  data-testid="resource-file-remove"
                >
                  빼기
                </button>
              </>
            )}
          </div>
          {!file.previewAvailable && <p className={styles.fileHint}>이 형식은 앱에서 바로 볼 수 없어요. 내려받아 확인해 주세요.</p>}
        </>
      ) : readOnly ? (
        <p className={styles.fileHint}>첨부 파일 없음</p>
      ) : (
        <div className={styles.fileRow}>
          <span className={styles.fileHint}>첨부 파일 없음</span>
          <button type="button" className={formStyles.ghostButton} disabled={busy} onClick={() => inputRef.current?.click()} data-testid="resource-file-add">
            {busy ? '올리는 중…' : '파일 올리기'}
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={acceptFor(resource.type === 'PDF' || resource.type === 'IMAGE' ? resource.type : 'FILE')}
        onChange={(event) => {
          replace(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </div>
  )
}
