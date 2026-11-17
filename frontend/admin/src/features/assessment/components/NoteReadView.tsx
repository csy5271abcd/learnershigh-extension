import type { NoteBlock } from '../api/types.ts'
import styles from '../styles/assessmentAdmin.module.css'

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
        <div key={block.blockId} className={styles.noteBlock} data-commented={commentedBlockIds?.has(block.blockId) ? 'true' : undefined}>
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
  switch (block.type) {
    case 'HEADING':
      return (
        <h3 className={styles.noteHeading} data-level={attrs.level ?? 1}>
          {attrs.emoji ? `${attrs.emoji} ` : ''}
          {block.text}
        </h3>
      )
    case 'BULLET':
    case 'NUMBERED':
      return <p className={styles.notePara} style={{ paddingLeft: 18 + (attrs.indent ?? 0) * 16 }}>{`${block.type === 'BULLET' ? '•' : '–'} ${block.text}`}</p>
    case 'CHECKLIST':
      return (
        <p className={styles.notePara}>
          <span aria-label={attrs.checked ? '완료' : '미완료'}>{attrs.checked ? '☑' : '☐'}</span> {block.text}
        </p>
      )
    case 'QUOTE':
      return <blockquote className={styles.noteQuote}>{block.text}</blockquote>
    case 'CALLOUT':
    case 'TOGGLE':
      return (
        <p className={styles.noteCallout}>
          {attrs.emoji ? `${attrs.emoji} ` : ''}
          {block.text}
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
      // 학생이 노트에 붙인 파일 본문은 Storage가 없어 Admin에서 열 수 없다 (API-OD-A03). 메타데이터만 보인다.
      return (
        <div className={styles.noteCard}>
          <span>
            <span className={styles.badge}>{block.type === 'IMAGE' ? '이미지' : block.type === 'PDF' ? 'PDF' : '파일'}</span> {attrs.file?.name ?? block.text ?? '첨부'}
          </span>
          <span className={styles.muted}>원본 열람은 Storage 연동 뒤 지원</span>
        </div>
      )
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
      return <p className={styles.notePara}>{block.text}</p>
  }
}
