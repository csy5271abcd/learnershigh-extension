import { useState } from 'react'
import { getNoteRevision, listNoteRevisions } from '../../api/assessmentDetailApi.ts'
import type { AssessmentNote } from '../../api/types.ts'
import { formatDateTime } from '../../model/assessmentDetailView.ts'
import { useApiQuery, type QueryResult } from '../../model/useApiQuery.ts'
import { NoteIcon, TemplateIcon } from '../AssessmentIcons.tsx'
import { NoteBlocksView } from '../detail/NoteSection.tsx'
import detailStyles from '../detail/detail.module.css'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './notes.module.css'

interface NoteReadOnlyViewProps {
  notes: QueryResult<{ items: AssessmentNote[] }>
}

// 관리자 "학생 화면 보기"용 탐구 노트 (P-28). 학생 노트 편집기(NoteEditor)와 같은 틀·같은 클래스(머리글·제목 줄·본문)를 쓰고,
// 본문은 학생 블록 렌더러(NoteBlocksView)로 저장본을 그대로 보여준다. 편집·자동저장·블록 추가·재정렬은 없다.
// 편집기 머리글의 단축키 안내 자리에는 Revision 선택(§21 GET)을 두고, "템플릿 선택"은 같은 자리에 비활성으로 둔다.
export function NoteReadOnlyView({ notes }: NoteReadOnlyViewProps) {
  const note = notes.data?.items[0]
  const [revisionId, setRevisionId] = useState<string>()
  const revisions = useApiQuery(`readonly-revisions|${note?.noteId ?? 'none'}`, () =>
    note ? listNoteRevisions(note.noteId) : Promise.resolve({ items: [] }),
  )
  const selectedId = revisionId ?? note?.revisionId
  const isLatest = !note || selectedId === note.revisionId
  const past = useApiQuery(`readonly-revision|${note?.noteId ?? 'none'}|${isLatest ? 'latest' : selectedId}`, () =>
    note && selectedId && !isLatest ? getNoteRevision(note.noteId, selectedId) : Promise.resolve(null),
  )
  const shown = isLatest ? note : past.data
  const shownNumber = isLatest ? note?.revisionNumber : past.data?.revisionNumber

  return (
    <section className={`${detailStyles.section} ${detailStyles.noteSection} ${styles.editor}`} aria-labelledby="note-heading">
      <div className={styles.header}>
        <h2 id="note-heading" className={detailStyles.sectionTitle}>
          <NoteIcon size={15} />
          탐구 노트
          {shownNumber !== undefined && <span className={detailStyles.sectionCount}>v{shownNumber}</span>}
        </h2>
        <div className={styles.headerRight}>
          {note && revisions.data && revisions.data.items.length > 0 && (
            <select className={styles.hint} value={selectedId} onChange={(event) => setRevisionId(event.target.value)} aria-label="노트 Revision 선택" data-testid="readonly-revision-select">
              {[...revisions.data.items]
                .sort((a, b) => b.revisionNumber - a.revisionNumber)
                .map((revision) => (
                  <option key={revision.revisionId} value={revision.revisionId}>
                    v{revision.revisionNumber} · {formatDateTime(revision.savedAt)}
                    {revision.revisionId === note.revisionId ? ' (최신)' : ''}
                  </option>
                ))}
            </select>
          )}
          <button type="button" className={detailStyles.smallOutlineButton} disabled title="관리자 읽기 전용 보기에서는 사용할 수 없어요">
            <TemplateIcon size={14} />
            템플릿 선택
          </button>
        </div>
      </div>

      {notes.status === 'loading' && <LoadingRows rows={3} label="탐구 노트를 불러오는 중" />}
      {notes.status === 'error' && notes.error && <ErrorState title="탐구 노트를 불러오지 못했어요" error={notes.error} onRetry={notes.retry} />}
      {notes.data && !note && <p className={detailStyles.emptyBox}>학생이 아직 저장한 탐구 노트가 없어요.</p>}
      {!isLatest && past.status === 'loading' && <LoadingRows rows={2} label="이전 Revision을 불러오는 중" />}
      {!isLatest && past.status === 'error' && past.error && <ErrorState title="이전 Revision을 불러오지 못했어요" error={past.error} onRetry={past.retry} />}
      {shown && (
        <>
          {/* 편집기 제목 줄과 같은 모양 (읽기 전용) */}
          <input className={styles.titleInput} value={shown.title} readOnly aria-label="노트 제목" />
          <article className={detailStyles.noteBody} aria-label={shown.title} data-testid="readonly-note-body">
            <NoteBlocksView blocks={shown.blocks} />
          </article>
        </>
      )}
      {/* 편집기 본문 아래 빈 영역과 같은 높이 (읽기 전용이라 눌러도 새 줄을 만들지 않는다) */}
      <div className={styles.tail} aria-hidden="true" />
    </section>
  )
}
