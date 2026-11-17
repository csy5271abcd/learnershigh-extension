import type { AssessmentNote, NoteBlock } from '../../api/types.ts'
import { formatDateTime } from '../../model/assessmentDetailView.ts'
import type { QueryResult } from '../../model/useApiQuery.ts'
import { codeLanguages, headingLevel, listNumbers } from '../../model/noteEditorModel.ts'
import { InfoIcon, NoteIcon, TemplateIcon } from '../AssessmentIcons.tsx'
import { ChartPreview, FileMeta, MapCard, MathView, ResourceCard, VideoView, WebLinkCard } from '../notes/NoteBlockParts.tsx'
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
 * 읽기 전용 블록 (과거 Revision·피드백 Snapshot·비교·템플릿 미리보기). 계약 예시의 HEADING·PARAGRAPH 외 유형은
 * Mock 임시 형식(MM-33, P-22)으로 보여주고, 모르는 type은 내용을 잃지 않게 본문으로 보여준다.
 * 동영상은 읽기 화면에서 삽입하지 않고 링크 카드로, 파일은 이름·크기만 보여준다 (파일 본문은 저장되지 않음).
 * `showPlaceholders`: 템플릿 미리보기에서 빈 칸의 안내 문구를 흐리게 보여준다 (학생 내용이 아님).
 */
export function NoteBlockView({ block, number, showPlaceholders = false }: { block: NoteBlock; number?: number; showPlaceholders?: boolean }) {
  const attrs = block.attrs
  const indent = attrs?.indent ? { paddingLeft: attrs.indent * 24 } : undefined
  const placeholder = showPlaceholders && block.text === '' && attrs?.placeholder ? <span className={noteStyles.readPlaceholder}>{attrs.placeholder}</span> : null
  switch (block.type) {
    case 'HEADING': {
      const level = headingLevel(block)
      return (
        <h3 className={styles.noteHeading} data-level={level}>
          {block.text || placeholder}
        </h3>
      )
    }
    case 'BULLET':
    case 'NUMBERED':
    case 'CHECKLIST': {
      const marker = block.type === 'BULLET' ? '•' : block.type === 'NUMBERED' ? `${number ?? 1}.` : attrs?.checked ? '☑' : '☐'
      return (
        <p className={noteStyles.readList} style={indent}>
          <span aria-hidden="true">{marker}</span>
          <span>
            {block.type === 'CHECKLIST' && <span className="lh-visually-hidden">{attrs?.checked ? '완료: ' : '미완료: '}</span>}
            {block.text || placeholder}
          </span>
        </p>
      )
    }
    case 'QUOTE':
      return <blockquote className={noteStyles.readQuote}>{block.text || placeholder}</blockquote>
    case 'CALLOUT':
      return (
        <div className={noteStyles.callout}>
          <span aria-hidden="true">{attrs?.emoji ?? '💡'}</span>
          <p className={styles.noteParagraph}>{block.text || placeholder}</p>
        </div>
      )
    case 'TOGGLE':
      return (
        <details className={noteStyles.readToggle} open>
          <summary>{block.text || placeholder || '토글'}</summary>
          {attrs?.body && <p className={styles.noteParagraph}>{attrs.body}</p>}
        </details>
      )
    case 'CODE':
      return (
        <div className={noteStyles.codeBlock}>
          <span className={noteStyles.mediaCaption}>{codeLanguages.find((item) => item.value === attrs?.language)?.label ?? '코드'}</span>
          <pre className={noteStyles.mathSource}>{block.text}</pre>
        </div>
      )
    case 'MATH':
      return <MathView source={block.text} />
    case 'DIVIDER':
      return <hr className={noteStyles.readDivider} />
    case 'TABLE':
      return (
        <table className={noteStyles.readTable}>
          <tbody>
            {(attrs?.rows ?? []).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'CHART':
      return (
        <div className={noteStyles.chartBlock}>
          {block.text && <p className={styles.noteParagraph}>{block.text}</p>}
          <ChartPreview rows={attrs?.rows} title={block.text} />
        </div>
      )
    case 'RESOURCE_LINK':
      return <ResourceCard resource={attrs?.resource} fallbackTitle={block.text || '참고자료 (아직 고르지 않음)'} withDetailLink={false} />
    case 'LINK':
      return attrs?.url ? <WebLinkCard url={attrs.url} title={block.text} /> : <p className={noteStyles.mediaCaption}>링크 주소 없음</p>
    case 'VIDEO':
      return attrs?.url ? <VideoView url={attrs.url} title={block.text} embed={false} /> : <p className={noteStyles.mediaCaption}>동영상 주소 없음</p>
    case 'MAP':
      return <MapCard place={attrs?.place ?? ''} url={attrs?.url} />
    case 'IMAGE':
    case 'FILE':
      return attrs?.file?.name ? (
        <FileMeta file={attrs.file} previewUrl={undefined} isImage={block.type === 'IMAGE'} />
      ) : (
        <p className={noteStyles.mediaCaption}>{block.type === 'IMAGE' ? '이미지' : '파일'}을 아직 고르지 않았어요.</p>
      )
    default:
      if (block.text === '') return placeholder ? <p className={styles.noteParagraph}>{placeholder}</p> : <p className={styles.noteEmptyParagraph} aria-hidden="true" />
      return <p className={styles.noteParagraph}>{block.text}</p>
  }
}

/** 블록 목록 (번호 목록은 같은 들여쓰기의 연속된 NUMBERED끼리 1부터 센다) */
export function NoteBlocksView({ blocks, showPlaceholders = false }: { blocks: NoteBlock[]; showPlaceholders?: boolean }) {
  const numbers = listNumbers(blocks)
  return (
    <>
      {blocks.map((block, index) => (
        <NoteBlockView key={block.blockId} block={block} number={numbers[index] || undefined} showPlaceholders={showPlaceholders} />
      ))}
    </>
  )
}
