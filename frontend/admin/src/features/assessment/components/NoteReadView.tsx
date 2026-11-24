import { useState } from 'react'
import { downloadNoteAttachment, previewNoteAttachment } from '../api/assessmentAdminApi.ts'
import { openBlob, saveBlob } from '../model/blobActions.ts'
import { AttachmentPreviewModal } from './AttachmentPreviewModal.tsx'
import type { NoteBlock } from '../api/types.ts'
import styles from '../styles/assessmentAdmin.module.css'
// A27-UX(계정 B): 학생 노트 인라인 서식(attrs.marks)을 학생 화면과 같은 렌더러로 그린다. 서식이 없으면 글 그대로
import { InlineText } from '../../../../../student/src/features/assessment/components/notes/InlineText.tsx'

interface NoteReadViewProps {
  blocks: NoteBlock[]
  /** 피드백 작성 화면에서 블록별 의견을 달 때만 (학생 본문은 바꾸지 않는다) */
  onCommentBlock?: (block: NoteBlock) => void
  commentedBlockIds?: Set<string>
}

const safeUrl = (url: string | undefined) => (url && /^https?:\/\//.test(url) ? url : undefined)

// 학생 탐구 노트 읽기 전용 렌더러 (AD-11, §35 GET만). 편집 기능이 없다.
// Student Notion형 편집기의 블록 형식을 그대로 읽어 보여준다. 표시를 지원하지 않는 형식은 원문 텍스트만 보인다 (블록 Schema 미확정, API-OD-A04).
export function NoteReadView({ blocks, onCommentBlock, commentedBlockIds }: NoteReadViewProps) {
  if (blocks.length === 0) return <p className={styles.muted}>노트에 작성한 내용이 없어요.</p>
  return (
    <div className={styles.note}>
      {blocks.map((block) => (
        <div key={block.blockId} className={styles.noteBlock} data-commentable={onCommentBlock && block.text.trim() ? 'true' : undefined} data-commented={commentedBlockIds?.has(block.blockId) ? 'true' : undefined}>
          <BlockBody block={block} />
          {onCommentBlock && block.text.trim() && (
            <button type="button" className={`${styles.secondaryButton} ${styles.smallButton} ${styles.noteBlockAction}`} onClick={() => onCommentBlock(block)} aria-label={`이 블록에 의견 달기: ${block.text.slice(0, 30)}`}>
              의견
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function BlockBody({ block }: { block: NoteBlock }) {
  const attrs = block.attrs ?? {}
  const text = <InlineText text={block.text} marks={(attrs as { marks?: unknown }).marks} />
  switch (block.type) {
    case 'HEADING':
      return (
        <h3 className={styles.noteHeading} data-level={attrs.level ?? 1}>
          {attrs.emoji ? `${attrs.emoji} ` : ''}
          {text}
        </h3>
      )
    case 'BULLET':
    case 'NUMBERED':
      return (
        <p className={styles.notePara} style={{ paddingLeft: 18 + (attrs.indent ?? 0) * 16 }}>
          {`${block.type === 'BULLET' ? '•' : '–'} `}
          {text}
        </p>
      )
    case 'CHECKLIST':
      return (
        <p className={styles.notePara}>
          <span aria-label={attrs.checked ? '완료' : '미완료'}>{attrs.checked ? '☑' : '☐'}</span> {text}
        </p>
      )
    case 'QUOTE':
      return <blockquote className={styles.noteQuote}>{text}</blockquote>
    case 'CALLOUT':
    case 'TOGGLE':
      return (
        <p className={styles.noteCallout}>
          {attrs.emoji ? `${attrs.emoji} ` : ''}
          {text}
          {attrs.body ? `\n${attrs.body}` : ''}
        </p>
      )
    case 'CODE':
    case 'MATH':
    case 'SQL':
    case 'HTML':
    case 'CSS':
      return <pre className={styles.noteCode}>{attrs.body ?? block.text}</pre>
    case 'DIVIDER':
      return <hr className={styles.noteDivider} />
    case 'TABLE':
    case 'CHART':
      return attrs.rows && attrs.rows.length > 0 ? (
        <div className={styles.tableWrap}>
          {block.text && <p className={styles.muted}>{block.text}</p>}
          <table className={styles.noteTable}>
            <tbody>
              {attrs.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} style={rowIndex === 0 ? { fontWeight: 600 } : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.notePara}>{block.text}</p>
      )
    case 'RESOURCE_LINK':
    case 'LINK':
    case 'VIDEO':
    case 'MAP': {
      const url = safeUrl(attrs.resource?.sourceUrl ?? attrs.url ?? undefined)
      const title = attrs.resource?.title ?? (block.text || attrs.place || attrs.url || '링크')
      return (
        <div className={styles.noteCard}>
          <span>
            <span className={styles.badge}>{block.type === 'RESOURCE_LINK' ? attrs.resource?.type ?? '자료' : block.type === 'VIDEO' ? '영상' : block.type === 'MAP' ? '지도' : '링크'}</span>{' '}
            {title}
            {attrs.resource?.sourceName && <span className={styles.cellSub}>{attrs.resource.sourceName}</span>}
          </span>
          {url && (
            <a className={styles.linkButton} href={url} target="_blank" rel="noreferrer noopener">
              원문 열기 ↗
            </a>
          )}
        </div>
      )
    }
    case 'IMAGE':
    case 'FILE':
    case 'PDF':
      // A28-41 §26-1: attachmentId 가 있으면 서버 Storage 의 파일(요청 당시 Revision 이 가리키는 그 파일)을 읽기 전용으로 연다.
      // 없으면 이전 방식(이름·크기만)이라 파일 자체가 없다 — 학생이 다시 첨부해야 한다.
      return <AttachmentCard type={block.type} name={attrs.file?.name ?? block.text ?? '첨부'} file={attrs.file} />
    case 'EXAM_SOURCE':
      return (
        <div className={styles.noteCard}>
          <span>
            <span className={styles.badge}>대학별 기출</span> {attrs.examSource?.label ?? block.text}
          </span>
          {attrs.examSource && <span className={styles.muted}>{attrs.examSource.pageStart}쪽</span>}
        </div>
      )
    default:
      return <p className={styles.notePara}>{text}</p>
  }
}

const previewableTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'])

function AttachmentCard({ type, name, file }: { type: string; name: string; file: { name: string; size: number; mimeType: string; attachmentId?: string } | undefined }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const attachmentId = file?.attachmentId
  const run = (action: () => Promise<void>) => {
    if (pending) return
    setPending(true)
    setError(null)
    action().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '파일을 열지 못했어요.')).finally(() => setPending(false))
  }
  return (
    <div className={styles.noteCard} data-testid="admin-note-file" data-stored={attachmentId ? 'true' : 'false'}>
      <span>
        <span className={styles.badge}>{type === 'IMAGE' ? '이미지' : type === 'PDF' || file?.mimeType === 'application/pdf' ? 'PDF' : '파일'}</span> {name}
      </span>
      {attachmentId ? (
        <span className={styles.actions}>
          <button type="button" className={styles.linkButton} onClick={() => setPreviewing(true)} data-testid="admin-note-file-preview">
            미리보기
          </button>
          {previewableTypes.has(file?.mimeType ?? '') && (
            <button type="button" className={styles.linkButton} disabled={pending} onClick={() => run(async () => openBlob(await previewNoteAttachment(attachmentId)))} data-testid="admin-note-file-open">
              새 탭 ↗
            </button>
          )}
          <button type="button" className={styles.linkButton} disabled={pending} onClick={() => run(async () => saveBlob(await downloadNoteAttachment(attachmentId), file?.name ?? name))} data-testid="admin-note-file-download">
            내려받기
          </button>
        </span>
      ) : (
        <span className={styles.muted}>이전 첨부 · 파일 미저장(학생이 다시 첨부해야 열람 가능)</span>
      )}
      {previewing && attachmentId && (
        <AttachmentPreviewModal
          fileName={file?.name ?? name}
          contentType={file?.mimeType ?? ''}
          load={() => previewNoteAttachment(attachmentId)}
          download={() => downloadNoteAttachment(attachmentId)}
          onClose={() => setPreviewing(false)}
        />
      )}
      {error && (
        <span className={styles.formError} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
