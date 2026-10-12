import { fileExtensionLabel } from '../model/taskCreate.ts'
import { processCategories } from '../model/taskDetail.ts'
import { formatDeadline } from '../model/tasks.ts'
import type { TaskEvidence } from '../model/types.ts'
import styles from './EvidenceParts.module.css'

interface EvidenceTableProps {
  items: TaskEvidence[]
  onPreview: (evidence: TaskEvidence, trigger: HTMLElement) => void
  onDelete: (evidence: TaskEvidence, trigger: HTMLElement) => void
  /** 삭제에 실패한 자료 id (그 줄 아래에 이유를 보여준다) */
  deleteErrorId?: string
}

const tagLabel = (item: TaskEvidence) => processCategories.find((category) => category.id === item.stageTag)?.tag ?? ''

// Evidence 표 (Evidence-00 / TasksDetail-04 Mockup): 파일 | 형식 | 단계 | 날짜 | 상태 | 미리보기 · 삭제
// Task Detail 과정 자료 Tab과 School Evidence 목록이 같은 표를 쓴다. 좁은 화면에서는 줄마다 세로 Card로 바뀐다.
export function EvidenceTable({ items, onPreview, onDelete, deleteErrorId }: EvidenceTableProps) {
  return (
    <div className={styles.table} role="table" aria-label="자료 목록">
      <div className={styles.headRow} role="row">
        <span role="columnheader">파일</span>
        <span role="columnheader">형식</span>
        <span role="columnheader">단계</span>
        <span role="columnheader">날짜</span>
        <span role="columnheader">상태</span>
        <span role="columnheader">
          <span className="lh-visually-hidden">동작</span>
        </span>
      </div>
      {items.map((item) => (
        <div key={item.evidenceId} className={styles.row} role="row">
          <span role="cell" className={styles.fileCell}>
            <span className={styles.fileIcon} aria-hidden="true" />
            <span className={styles.fileName}>{item.fileName}</span>
            {deleteErrorId === item.evidenceId && (
              <span className={styles.rowError} role="alert">
                {item.fileName}을(를) 삭제하지 못했어요. 파일은 그대로 있어요. 다시 시도해주세요.
              </span>
            )}
          </span>
          <span role="cell" className={styles.metaCell}>
            <span className={styles.mobileLabel}>형식 </span>
            {fileExtensionLabel(item.fileName)}
          </span>
          <span role="cell" className={styles.metaCell}>
            <span className={styles.mobileLabel}>단계 </span>
            <span className={styles.tag}>{tagLabel(item)}</span>
          </span>
          <span role="cell" className={styles.metaCell}>
            <span className={styles.mobileLabel}>날짜 </span>
            {formatDeadline(item.createdAt.slice(0, 10))}
          </span>
          <span role="cell" className={styles.metaCell}>
            <span className={styles.mobileLabel}>상태 </span>
            <span className={styles.done}>완료</span>
          </span>
          <span role="cell" className={styles.actionCell}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`${item.fileName} 미리보기`}
              aria-haspopup="dialog"
              onClick={(event) => onPreview(item, event.currentTarget)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`${item.fileName} 삭제`}
              aria-haspopup="dialog"
              onClick={(event) => onDelete(item, event.currentTarget)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M9 5h11v14H9l-6-7 6-7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m12 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}
