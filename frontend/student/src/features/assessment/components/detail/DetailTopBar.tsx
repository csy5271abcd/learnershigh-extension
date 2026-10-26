import { useId, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router'
import { listNoteRevisions } from '../../api/assessmentDetailApi.ts'
import { assessmentToday } from '../../api/runtimeInfo.ts'
import { formatRelativeDateTime } from '../../model/assessmentDetailView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { schoolAssessmentsPath, subjectAssessmentsPath } from '../../routes/paths.ts'
import { ChatIcon, ChevronLeftIcon, HistoryIcon, MoreIcon } from '../AssessmentIcons.tsx'
import { RevisionPreviewModal } from '../notes/NoteModals.tsx'
import { ErrorState } from '../StateViews.tsx'
import styles from './detail.module.css'
import { usePopover } from './usePopover.ts'

export type MoreMenuItem = {
  label: string
  icon: ComponentType<{ size?: number }>
  danger?: boolean
} & (
  /** 실행할 수 없는 항목: 누르면 사유를 안내한다 */
  | { reason: string; to?: never }
  /** 다른 화면으로 이동하는 항목 */
  | { to: string; reason?: never }
)

interface DetailTopBarProps {
  title: string | undefined
  subjectId: string | undefined
  subjectName: string
  noteId: string | undefined
  onBack: () => void
  /** 없으면 피드백 요청 버튼을 숨긴다 (심화 탐구 상세 Mockup AE-DETAIL에는 없음) */
  onRequestFeedback?: () => void
  onUnavailable: (message: string) => void
  /** Breadcrumb 첫 단계 (기본: 학교 수행평가) */
  root?: { label: string; path: string; subjectPath: (subjectId: string) => string; backLabel: string }
  menuItems?: MoreMenuItem[]
  /** 노트 저장 상태 (Mockup "자동 저장됨" 자리) */
  saveStatus?: ReactNode
  /** 지금 편집기의 기준 Revision. 바뀌면 수정 이력을 다시 불러온다. */
  currentRevisionId?: string
  /** 저장 안 된 변경이 있으면 이력에 안내한다 */
  hasUnsavedChanges?: boolean
}

// 상세 상단 바 (Mockup SA-DETAIL-01·12·14): 뒤로·Breadcrumb / 수정 이력 / 선생님께 피드백 요청 / 더보기.
// Mockup의 "자동 저장됨" 표시는 노트 저장 기능이 없어 표시하지 않는다 (저장되지 않는데 저장됨으로 보이지 않게).
export function DetailTopBar({
  title,
  subjectId,
  subjectName,
  noteId,
  onBack,
  onRequestFeedback,
  onUnavailable,
  root = { label: '학교 수행평가', path: schoolAssessmentsPath, subjectPath: subjectAssessmentsPath, backLabel: '학교 수행평가로 돌아가기' },
  menuItems = [],
  saveStatus,
  currentRevisionId,
  hasUnsavedChanges = false,
}: DetailTopBarProps) {
  return (
    <div className={styles.topBar}>
      <button type="button" className={styles.iconButton} aria-label={root.backLabel} onClick={onBack}>
        <ChevronLeftIcon size={18} />
      </button>
      <nav aria-label="현재 위치" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link to={root.path}>{root.label}</Link>
          </li>
          {title && subjectId && (
            <>
              <li>
                <Link to={root.subjectPath(subjectId)}>{subjectName}</Link>
              </li>
              <li aria-current="page">{title}</li>
            </>
          )}
        </ol>
      </nav>
      <div className={styles.topActions}>
        {saveStatus}
        <RevisionHistory
          noteId={noteId}
          currentRevisionId={currentRevisionId}
          hasUnsavedChanges={hasUnsavedChanges}
          onUnavailable={onUnavailable}
        />
        {onRequestFeedback && (
          <button type="button" className={styles.outlineButton} onClick={onRequestFeedback}>
            <ChatIcon size={15} />
            선생님께 피드백 요청
          </button>
        )}
        <MoreMenu items={menuItems} onUnavailable={onUnavailable} />
      </div>
    </div>
  )
}

interface RevisionHistoryProps {
  noteId: string | undefined
  currentRevisionId: string | undefined
  hasUnsavedChanges: boolean
  onUnavailable: (message: string) => void
}

const restoreReason = '이전 버전 복원은 정책이 정해지기 전이라 아직 할 수 없어요. 과거 버전은 바뀌지 않고 그대로 남아 있어요.'

function RevisionHistory({ noteId, currentRevisionId, hasUnsavedChanges, onUnavailable }: RevisionHistoryProps) {
  const { open, setOpen, close, rootRef, triggerRef } = usePopover()
  const panelId = useId()
  const [previewId, setPreviewId] = useState<string>()
  return (
    <div ref={rootRef} className={styles.popoverRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.textButton}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <HistoryIcon size={15} />
        수정 이력
      </button>
      {open && (
        <div id={panelId} className={`${styles.popover} ${styles.revisionPopover}`} role="dialog" aria-label="노트 수정 이력">
          {noteId ? (
            <RevisionList
              noteId={noteId}
              currentRevisionId={currentRevisionId}
              hasUnsavedChanges={hasUnsavedChanges}
              onOpen={(revisionId) => {
                close(false)
                setPreviewId(revisionId)
              }}
              onRestore={() => onUnavailable(restoreReason)}
            />
          ) : (
            <p className={styles.popoverHint}>아직 저장된 노트가 없어요.</p>
          )}
        </div>
      )}
      {noteId && previewId && (
        <RevisionPreviewModal
          noteId={noteId}
          revisionId={previewId}
          currentRevisionId={currentRevisionId}
          onClose={() => setPreviewId(undefined)}
          onRestoreUnavailable={() => onUnavailable(restoreReason)}
        />
      )}
    </div>
  )
}

// §21 Revision 목록. 과거 Revision은 바뀌지 않는다. 되돌리기(복원)는 계약 미확정이라 제공하지 않는다 (§21·§61).
interface RevisionListProps {
  noteId: string
  currentRevisionId: string | undefined
  hasUnsavedChanges: boolean
  onOpen: (revisionId: string) => void
  onRestore: () => void
}

function RevisionList({ noteId, currentRevisionId, hasUnsavedChanges, onOpen, onRestore }: RevisionListProps) {
  // 저장할 때마다 기준 Revision이 바뀌므로 key에 넣어 새 이력을 불러온다.
  const revisions = useApiQuery(`note-revisions|${noteId}|${currentRevisionId ?? ''}`, () => listNoteRevisions(noteId))
  if (revisions.status === 'error' && revisions.error) {
    return <ErrorState title="수정 이력을 불러오지 못했어요" error={revisions.error} onRetry={revisions.retry} />
  }
  if (!revisions.data) return <p className={styles.popoverHint}>불러오는 중…</p>
  const today = assessmentToday()
  return (
    <>
      <p className={styles.popoverHint}>
        저장된 노트 버전이에요. 이전 버전은 바뀌지 않고 그대로 남아요. 눌러서 읽어 볼 수 있어요.
        {hasUnsavedChanges ? ' 지금 편집 중인 내용은 아직 저장되지 않았어요.' : ''}
      </p>
      <ol className={styles.revisionList}>
        {revisions.data.items.map((revision, index) => (
          <li key={revision.revisionId} className={styles.revisionItem}>
            <button type="button" className={styles.revisionOpen} onClick={() => onOpen(revision.revisionId)}>
              <span className={styles.revisionTime}>{formatRelativeDateTime(revision.savedAt, today)}</span>
              <span className={styles.revisionMeta}>
                v{revision.revisionNumber}
                {index === 0 ? ' · 현재 버전' : ''}
              </span>
            </button>
            {index > 0 && (
              <button type="button" className={styles.revisionRestore} aria-disabled="true" onClick={onRestore}>
                복원
              </button>
            )}
          </li>
        ))}
      </ol>
    </>
  )
}


// 더보기 메뉴 (Mockup SA-DETAIL-14). 이동 항목은 Link, 나머지는 다음 단계·정책 확정 대상이라 실행 대신 사유를 안내한다.
function MoreMenu({ items, onUnavailable }: { items: MoreMenuItem[]; onUnavailable: (message: string) => void }) {
  const { open, setOpen, close, rootRef, triggerRef } = usePopover()
  const menuId = useId()
  return (
    <div ref={rootRef} className={styles.popoverRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.iconButton}
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon size={18} />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label="더보기" className={`${styles.popover} ${styles.moreMenu}`}>
          {items.map(({ label, icon: Icon, reason, to, danger }) =>
            to ? (
              <Link key={label} to={to} role="menuitem" className={styles.menuItem} onClick={() => close(false)}>
                <Icon size={16} />
                {label}
              </Link>
            ) : (
            <button
              key={label}
              type="button"
              role="menuitem"
              aria-disabled="true"
              className={styles.menuItem}
              data-danger={danger}
              onClick={() => {
                close(true)
                onUnavailable(reason ?? '')
              }}
            >
              <Icon size={16} />
              {label}
              <span className={styles.menuItemNote}>준비 중</span>
            </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
