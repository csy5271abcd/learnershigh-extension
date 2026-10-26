import { useRef, useState } from 'react'
import { getNoteRevision } from '../../api/assessmentDetailApi.ts'
import { listResources } from '../../api/resourcesApi.ts'
import type { NoteBlock, StudentResource } from '../../api/types.ts'
import { formatDateTime } from '../../model/assessmentDetailView.ts'
import { resourceMetaLine } from '../../model/resourceLibraryView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { InfoIcon, SearchIcon } from '../AssessmentIcons.tsx'
import { NoteBlocksView } from '../detail/NoteSection.tsx'
import enrichmentStyles from '../enrichment/enrichment.module.css'
import { Modal } from '../Modal.tsx'
import { ResourceTypeIcon } from '../resources/ResourceTypeIcon.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './notes.module.css'

// 노트 편집기에서 여는 Modal 모음: 과거 Revision 보기, 저장 충돌 비교, 자료함 자료 고르기.

interface RevisionPreviewModalProps {
  noteId: string
  revisionId: string
  /** 지금 편집기의 기준 Revision (현재 버전 표시용) */
  currentRevisionId: string | undefined
  onClose: () => void
  onRestoreUnavailable: () => void
}

// 과거 Revision 열람 (§21 GET .../revisions/{revisionId}). 읽기 전용이며 현재 편집 내용을 바꾸지 않는다.
// 복원은 정책 미정(§21·§61)이라 버튼만 두고 실행하지 않는다 (Mockup AE-DETAIL-04 "복원").
export function RevisionPreviewModal({ noteId, revisionId, currentRevisionId, onClose, onRestoreUnavailable }: RevisionPreviewModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const revision = useApiQuery(`note-revision|${noteId}|${revisionId}`, () => getNoteRevision(noteId, revisionId))
  const data = revision.data?.revisionId === revisionId ? revision.data : undefined
  const isCurrent = revisionId === currentRevisionId
  return (
    <Modal
      title={data ? `탐구 노트 v${data.revisionNumber}` : '탐구 노트 버전'}
      description="저장된 버전을 읽기만 할 수 있어요. 지금 편집 중인 내용은 바뀌지 않아요."
      wide
      onRequestClose={onClose}
      initialFocusRef={closeRef}
      footer={
        <>
          {!isCurrent && (
            <button type="button" className={formStyles.ghostButton} aria-disabled="true" onClick={onRestoreUnavailable}>
              이 버전으로 복원
            </button>
          )}
          <button ref={closeRef} type="button" className={formStyles.primaryButton} onClick={onClose}>
            닫기
          </button>
        </>
      }
    >
      {revision.status === 'error' && revision.error ? (
        <ErrorState title="이 버전을 불러오지 못했어요" error={revision.error} onRetry={revision.retry} />
      ) : !data ? (
        <LoadingRows rows={3} label="노트 버전을 불러오는 중" />
      ) : (
        <div className={styles.editor}>
          <p className={`${styles.banner}`} data-tone="info">
            {isCurrent ? '현재 버전이에요.' : '과거 버전이에요. 바뀌지 않고 그대로 남아 있어요.'} {formatDateTime(data.savedAt)} 저장 · {data.title}
          </p>
          <NoteBlocksView blocks={data.blocks} />
          {data.blocks.length === 0 && <p className={styles.hint}>비어 있는 버전이에요.</p>}
        </div>
      )}
    </Modal>
  )
}

interface ConflictCompareModalProps {
  noteId: string
  latestRevisionId: string
  mine: NoteBlock[]
  onClose: () => void
  onSaveMine: () => void
  onLoadLatest: () => void
}

// 저장 충돌 비교 (§20 409 RESOURCE_VERSION_CONFLICT). 자동 병합·강제 덮어쓰기는 하지 않고 학생이 고른다.
// "내 내용으로 새 버전 저장"은 최신 저장본 위에 새 Revision을 더한다 (다른 저장본은 이력에 그대로 남는다).
export function ConflictCompareModal({ noteId, latestRevisionId, mine, onClose, onSaveMine, onLoadLatest }: ConflictCompareModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const latest = useApiQuery(`note-revision|${noteId}|${latestRevisionId}`, () => getNoteRevision(noteId, latestRevisionId))
  const data = latest.data?.revisionId === latestRevisionId ? latest.data : undefined
  return (
    <Modal
      title="저장된 최신 버전과 비교"
      description="다른 곳에서 먼저 저장된 버전이 있어요. 내 입력은 그대로 있어요."
      wide
      onRequestClose={onClose}
      initialFocusRef={closeRef}
      footer={
        confirmDiscard ? (
          <div className={formStyles.confirm} role="alert">
            <span>지금 입력한 내용이 사라지고 최신 버전으로 바뀌어요.</span>
            <button type="button" className={formStyles.ghostButton} onClick={() => setConfirmDiscard(false)}>
              취소
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={onLoadLatest}>
              최신 버전 불러오기
            </button>
          </div>
        ) : (
          <>
            <button ref={closeRef} type="button" className={formStyles.ghostButton} onClick={onClose}>
              닫기
            </button>
            <button type="button" className={formStyles.ghostButton} onClick={() => setConfirmDiscard(true)}>
              최신 버전 불러오기
            </button>
            <button type="button" className={formStyles.primaryButton} onClick={onSaveMine}>
              내 내용으로 새 버전 저장
            </button>
          </>
        )
      }
    >
      <div className={styles.compare}>
        <section className={styles.compareColumn} aria-label="저장된 최신 버전">
          <p className={styles.compareLabel}>{data ? `저장된 최신 v${data.revisionNumber} · ${formatDateTime(data.savedAt)}` : '저장된 최신 버전'}</p>
          {latest.status === 'error' && latest.error ? (
            <ErrorState title="최신 버전을 불러오지 못했어요" error={latest.error} onRetry={latest.retry} />
          ) : data ? (
            <NoteBlocksView blocks={data.blocks} />
          ) : (
            <LoadingRows rows={2} label="최신 버전을 불러오는 중" />
          )}
        </section>
        <section className={styles.compareColumn} aria-label="내 입력">
          <p className={styles.compareLabel}>지금 내 입력 (저장 안 됨)</p>
          <NoteBlocksView blocks={mine} />
        </section>
      </div>
    </Modal>
  )
}

interface ResourcePickerModalProps {
  onClose: () => void
  onPick: (resource: StudentResource) => void
}

// 자료함에서 노트에 넣을 자료 고르기 (§22 목록 재사용). 같은 resourceId를 링크 카드로 노트에 넣는다.
// 저장 방식은 §23 대신 §20 PUT(편집기가 블록을 만들어 본문째 저장)을 쓴다 (§23 본문이 허용한 방식, MM-34).
export function ResourcePickerModal({ onClose, onPick }: ResourcePickerModalProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const resources = useApiQuery(`note-picker|${query.trim()}`, () => listResources({ query: query.trim() || undefined, page: 0, size: 50 }))
  const items = resources.data?.items ?? []
  const selected = items.find((item) => item.resourceId === selectedId)
  return (
    <Modal
      title="자료함에서 자료 넣기"
      description="고른 자료의 제목·출처·링크가 노트에 링크 카드로 들어가요. 원문은 복사하지 않아요."
      onRequestClose={onClose}
      initialFocusRef={searchRef}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose}>
            취소
          </button>
          <button type="button" className={formStyles.primaryButton} disabled={!selected} onClick={() => selected && onPick(selected)}>
            노트에 넣기
          </button>
        </>
      }
    >
      <div className={formStyles.form}>
        <label className={`${enrichmentStyles.search} ${styles.pickerSearch}`}>
          <SearchIcon size={16} className={enrichmentStyles.searchIcon} />
          <span className="lh-visually-hidden">내 자료 검색</span>
          <input ref={searchRef} type="search" value={query} placeholder="자료명, 메모, 태그로 찾기" onChange={(event) => setQuery(event.target.value)} />
        </label>
        {resources.status === 'error' && resources.error ? (
          <ErrorState title="내 자료를 불러오지 못했어요" error={resources.error} onRetry={resources.retry} />
        ) : !resources.data ? (
          <LoadingRows rows={3} label="내 자료를 불러오는 중" />
        ) : items.length === 0 ? (
          <EmptyState title={query ? '검색어와 맞는 자료가 없어요' : '자료함이 비어 있어요'} description="자료함에서 먼저 자료를 추가해 주세요." />
        ) : (
          <ul className={styles.pickerList} aria-label="내 자료">
            {items.map((item) => (
              <li key={item.resourceId}>
                <button type="button" className={styles.pickerItem} aria-pressed={item.resourceId === selectedId} onClick={() => setSelectedId(item.resourceId)}>
                  <ResourceTypeIcon type={item.type} />
                  <span>
                    <span className={styles.linkTitle}>{item.title}</span>
                    <span className={styles.linkUrl}>{resourceMetaLine(item)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.hint}>
          <InfoIcon size={12} /> 링크 카드는 지금 노트 맨 아래에 들어가요. 넣은 뒤 ⋮⋮ 메뉴로 위치를 옮길 수 있어요.
        </p>
      </div>
    </Modal>
  )
}
