import type { AssessmentNote, NoteBlock } from '../../api/types.ts'
import { formatDateTime } from '../../model/assessmentDetailView.ts'
import type { QueryResult } from '../../model/useApiQuery.ts'
import { InfoIcon, LinkIcon, NoteIcon, TemplateIcon } from '../AssessmentIcons.tsx'
import noteStyles from '../notes/notes.module.css'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './detail.module.css'

interface NoteSectionProps {
  notes: QueryResult<{ items: AssessmentNote[] }>
  onOpenTemplates: () => void
}

// 탐구 노트 (Mockup SN-DETAIL-01: 상세 페이지 하단에 포함, api-contract.md §20).
// Editor 라이브러리·블록 형식이 정해지기 전(OD-A05)이라 저장된 최신 Revision을 읽기 전용으로 보여준다.
// 편집·자동저장·Revision 생성은 동작하는 것처럼 표시하지 않는다.
export function NoteSection({ notes, onOpenTemplates }: NoteSectionProps) {
  const note = notes.data?.items[0]
  return (
    <section className={`${styles.section} ${styles.noteSection}`} aria-labelledby="note-heading">
      <div className={styles.sectionHeader}>
        <h2 id="note-heading" className={styles.sectionTitle}>
          <NoteIcon size={15} />
          탐구 노트
          {note && <span className={styles.sectionCount}>v{note.revisionNumber}</span>}
        </h2>
        <button type="button" className={styles.smallOutlineButton} onClick={onOpenTemplates}>
          <TemplateIcon size={14} />
          템플릿 선택
        </button>
      </div>

      <p className={styles.editorNotice}>
        <InfoIcon size={14} />
        {note
          ? `노트 편집기는 준비 중이에요. 마지막으로 저장된 v${note.revisionNumber}(${formatDateTime(note.savedAt)} 저장)을 보여 드려요.`
          : '노트 편집기는 준비 중이에요. 편집기가 연결되면 여기에서 바로 쓸 수 있어요.'}
      </p>

      {notes.status === 'loading' && <LoadingRows rows={3} label="탐구 노트를 불러오는 중" />}
      {notes.status === 'error' && notes.error && (
        <ErrorState title="탐구 노트를 불러오지 못했어요" error={notes.error} onRetry={notes.retry} />
      )}
      {notes.data && !note && (
        <p className={styles.emptyBox}>아직 작성한 탐구 노트가 없어요. 조사한 내용·생각·시행착오를 기록하는 공간이에요.</p>
      )}
      {note && (
        <article className={styles.noteBody} aria-label={note.title}>
          {note.blocks.map((block) => (
            <NoteBlockView key={block.blockId} block={block} />
          ))}
        </article>
      )}
    </section>
  )
}

/**
 * 읽기 전용 블록 (과거 Revision·피드백 Snapshot·비교). 계약 예시의 HEADING·PARAGRAPH 외 유형은
 * Stage 4 Mock 임시 형식(MM-33)으로 보여주고, 모르는 type은 내용을 잃지 않게 본문으로 보여준다.
 */
export function NoteBlockView({ block, number }: { block: NoteBlock; number?: number }) {
  if (block.type === 'HEADING') return <h3 className={styles.noteHeading}>{block.text}</h3>
  if (block.type === 'BULLET' || block.type === 'NUMBERED' || block.type === 'CHECKLIST') {
    const marker = block.type === 'BULLET' ? '•' : block.type === 'NUMBERED' ? `${number ?? 1}.` : block.attrs?.checked ? '☑' : '☐'
    return (
      <p className={noteStyles.readList}>
        <span aria-hidden="true">{marker}</span>
        <span>
          {block.type === 'CHECKLIST' && <span className="lh-visually-hidden">{block.attrs?.checked ? '완료: ' : '미완료: '}</span>}
          {block.text}
        </span>
      </p>
    )
  }
  if (block.type === 'QUOTE') return <blockquote className={noteStyles.readQuote}>{block.text}</blockquote>
  if (block.type === 'TABLE') {
    return (
      <table className={noteStyles.readTable}>
        <tbody>
          {(block.attrs?.rows ?? []).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (block.type === 'RESOURCE_LINK') {
    const resource = block.attrs?.resource
    return (
      <div className={noteStyles.linkCard}>
        <span className={noteStyles.linkIcon} aria-hidden="true">
          <LinkIcon size={14} />
        </span>
        <span>
          <span className={noteStyles.linkMeta}>{resource?.sourceName ?? '출처 미입력'}</span>
          <span className={noteStyles.linkTitle}>{resource?.title ?? block.text}</span>
          {resource?.sourceUrl && <span className={noteStyles.linkUrl}>{resource.sourceUrl}</span>}
        </span>
      </div>
    )
  }
  if (block.text === '') return <p className={styles.noteEmptyParagraph} aria-hidden="true" />
  return <p className={styles.noteParagraph}>{block.text}</p>
}

/** 블록 목록 (번호 목록은 연속된 NUMBERED끼리 1부터 센다) */
export function NoteBlocksView({ blocks }: { blocks: NoteBlock[] }) {
  const numbers = blocks.reduce<number[]>((acc, block, index) => {
    acc.push(block.type === 'NUMBERED' ? (index > 0 ? acc[index - 1] : 0) + 1 : 0)
    return acc
  }, [])
  return (
    <>
      {blocks.map((block, index) => (
        <NoteBlockView key={block.blockId} block={block} number={numbers[index] || undefined} />
      ))}
    </>
  )
}
