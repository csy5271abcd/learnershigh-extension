import { useId, useRef, useState } from 'react'
import { addNotice, noticeAccept, noticeFileProblem, removeNotice, useNotices } from '../../model/assessmentNoticeStore.ts'
import { formatFileSize } from '../../model/noteEditorModel.ts'
import { AlertIcon, CloseIcon, FileIcon, ImageIcon } from '../AssessmentIcons.tsx'
import styles from './notice.module.css'

// 안내문·첨부 (Mockup SA-DETAIL-01). 속성 목록 아래, 결과물 위에 둔다.
// 학교가 준 안내문 사진·PDF를 학생이 이 화면에서 미리보는 영역이다. 서버에 저장되지 않는다(계약·저장소 없음, MM-49).
// 안내문이 없을 때 지어낸 안내문을 보여주지 않는다.
export function NoticeAttachments({ assessmentId, assessmentTitle }: { assessmentId: string; assessmentTitle: string }) {
  const notices = useNotices(assessmentId)
  const inputRef = useRef<HTMLInputElement>(null)
  const headingId = useId()
  const [error, setError] = useState<string>()

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        안내문·첨부
      </h2>
      <input
        ref={inputRef}
        type="file"
        accept={noticeAccept}
        className="lh-visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          const problem = noticeFileProblem(file)
          setError(problem ?? undefined)
          if (!problem) addNotice(assessmentId, file)
        }}
      />
      <ul className={styles.grid} aria-label={`${assessmentTitle} 안내문 목록`}>
        {notices.map((notice) => {
          const isImage = notice.mimeType.startsWith('image/')
          return (
            <li key={notice.attachmentId} className={styles.card}>
              <a href={notice.previewUrl} target="_blank" rel="noreferrer noopener" className={styles.thumb} aria-label={`${notice.name} 새 탭에서 보기`}>
                <span className={styles.kind}>{isImage ? '사진' : 'PDF'}</span>
                {isImage ? <img src={notice.previewUrl} alt="" className={styles.image} /> : <FileIcon size={28} />}
              </a>
              <span className={styles.name} title={notice.name}>
                {notice.name}
              </span>
              <span className={styles.meta}>{formatFileSize(notice.size)} · 이 화면에서만 보여요</span>
              <button type="button" className={styles.remove} aria-label={`${notice.name} 빼기`} onClick={() => removeNotice(assessmentId, notice.attachmentId)}>
                <CloseIcon size={13} />
              </button>
            </li>
          )
        })}
        <li>
          <button type="button" className={styles.add} onClick={() => inputRef.current?.click()}>
            <ImageIcon size={18} />
            안내문 사진·PDF 추가
          </button>
        </li>
      </ul>
      {error && (
        <p className={styles.error} role="alert">
          <AlertIcon size={13} />
          {error}
        </p>
      )}
      <p className={styles.note}>
        {notices.length === 0 ? '등록된 안내문이 없어요. ' : ''}안내문 파일은 서버에 저장되지 않고 이 화면에서만 미리볼 수 있어요 (새로고침하면 사라져요).
      </p>
    </section>
  )
}
