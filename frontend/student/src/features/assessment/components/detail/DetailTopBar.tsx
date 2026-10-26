import { useId, type ComponentType } from 'react'
import { Link } from 'react-router'
import { listNoteRevisions } from '../../api/assessmentDetailApi.ts'
import { assessmentToday } from '../../api/runtimeInfo.ts'
import { formatRelativeDateTime } from '../../model/assessmentDetailView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { schoolAssessmentsPath, subjectAssessmentsPath } from '../../routes/paths.ts'
import {
  BulbIcon,
  ChatIcon,
  ChevronLeftIcon,
  DownloadIcon,
  HistoryIcon,
  MoreIcon,
  SlidersIcon,
  SproutIcon,
  TrashIcon,
} from '../AssessmentIcons.tsx'
import { ErrorState } from '../StateViews.tsx'
import styles from './detail.module.css'
import { usePopover } from './usePopover.ts'

interface DetailTopBarProps {
  title: string | undefined
  subjectId: string | undefined
  subjectName: string
  noteId: string | undefined
  onBack: () => void
  onRequestFeedback: () => void
  onUnavailable: (message: string) => void
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
}: DetailTopBarProps) {
  return (
    <div className={styles.topBar}>
      <button type="button" className={styles.iconButton} aria-label="학교 수행평가로 돌아가기" onClick={onBack}>
        <ChevronLeftIcon size={18} />
      </button>
      <nav aria-label="현재 위치" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link to={schoolAssessmentsPath}>학교 수행평가</Link>
          </li>
          {title && subjectId && (
            <>
              <li>
                <Link to={subjectAssessmentsPath(subjectId)}>{subjectName}</Link>
              </li>
              <li aria-current="page">{title}</li>
            </>
          )}
        </ol>
      </nav>
      <div className={styles.topActions}>
        <RevisionHistory noteId={noteId} />
        <button type="button" className={styles.outlineButton} onClick={onRequestFeedback}>
          <ChatIcon size={15} />
          선생님께 피드백 요청
        </button>
        <MoreMenu onUnavailable={onUnavailable} />
      </div>
    </div>
  )
}

function RevisionHistory({ noteId }: { noteId: string | undefined }) {
  const { open, setOpen, rootRef, triggerRef } = usePopover()
  const panelId = useId()
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
          {noteId ? <RevisionList noteId={noteId} /> : <p className={styles.popoverHint}>아직 저장된 노트가 없어요.</p>}
        </div>
      )}
    </div>
  )
}

// §21 Revision 목록. 과거 Revision은 바뀌지 않는다. 되돌리기(복원)는 계약 미확정이라 제공하지 않는다 (§21·§61).
function RevisionList({ noteId }: { noteId: string }) {
  const revisions = useApiQuery(`note-revisions|${noteId}`, () => listNoteRevisions(noteId))
  if (revisions.status === 'error' && revisions.error) {
    return <ErrorState title="수정 이력을 불러오지 못했어요" error={revisions.error} onRetry={revisions.retry} />
  }
  if (!revisions.data) return <p className={styles.popoverHint}>불러오는 중…</p>
  const today = assessmentToday()
  return (
    <>
      <p className={styles.popoverHint}>저장된 노트 버전이에요. 이전 버전은 바뀌지 않고 그대로 남아요.</p>
      <ol className={styles.revisionList}>
        {revisions.data.items.map((revision, index) => (
          <li key={revision.revisionId}>
            <span className={styles.revisionTime}>{formatRelativeDateTime(revision.savedAt, today)}</span>
            <span className={styles.revisionMeta}>
              v{revision.revisionNumber}
              {index === 0 ? ' · 현재 버전' : ''}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

const moreItems: { label: string; icon: ComponentType<{ size?: number }>; reason: string; danger?: boolean }[] = [
  { label: '평가 정보 수정', icon: SlidersIcon, reason: '평가 정보 수정은 수정 가능한 항목이 계약으로 정해진 뒤 제공돼요.' },
  { label: '심화 탐구로 이어가기', icon: BulbIcon, reason: '심화 탐구 화면과 함께 제공될 예정이에요.' },
  { label: '성장 기록에 남기기', icon: SproutIcon, reason: '성장 기록 화면과 함께 제공될 예정이에요.' },
  { label: '노트 내보내기', icon: DownloadIcon, reason: '노트 내보내기는 아직 지원하지 않아요.' },
  { label: '삭제', icon: TrashIcon, reason: '삭제·휴지통 정책이 확정되기 전이라 아직 삭제할 수 없어요.', danger: true },
]

// 더보기 메뉴 (Mockup SA-DETAIL-14). 항목은 모두 다음 단계·정책 확정 대상이라 실행 대신 사유를 안내한다.
function MoreMenu({ onUnavailable }: { onUnavailable: (message: string) => void }) {
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
          {moreItems.map(({ label, icon: Icon, reason, danger }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              aria-disabled="true"
              className={styles.menuItem}
              data-danger={danger}
              onClick={() => {
                close(true)
                onUnavailable(reason)
              }}
            >
              <Icon size={16} />
              {label}
              <span className={styles.menuItemNote}>준비 중</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
