import { useState } from 'react'
import { listEnrichmentTasks } from '../../api/enrichmentApi.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { Modal } from '../Modal.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './university.module.css'

interface NoteTargetModalProps {
  /** 넣을 출처 한 줄 (확인용) */
  sourceLine: string
  onClose: () => void
  onPick: (taskId: string) => void
}

// "현재 쪽을 노트에 추가" — 어느 심화 탐구 노트에 출처 카드를 넣을지 고른다 (§18 목록).
// 고르면 그 탐구 상세로 이동해 기존 노트 편집기가 카드를 넣고 자동 저장한다 (원문은 복사하지 않는다).
export function NoteTargetModal({ sourceLine, onClose, onPick }: NoteTargetModalProps) {
  const tasks = useApiQuery('ae-uni-note-targets', () => listEnrichmentTasks({ page: 0, size: 100 }))
  const [selected, setSelected] = useState('')
  const items = tasks.data?.items ?? []

  return (
    <Modal
      title="어느 탐구 노트에 넣을까요?"
      description={sourceLine}
      compact
      onRequestClose={onClose}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose}>
            취소
          </button>
          <button type="button" className={formStyles.primaryButton} disabled={!selected} onClick={() => onPick(selected)}>
            노트에 출처 카드 넣기
          </button>
        </>
      }
    >
      {tasks.status === 'error' && tasks.error ? (
        <ErrorState title="내 탐구를 불러오지 못했어요" error={tasks.error} onRetry={tasks.retry} />
      ) : !tasks.data ? (
        <LoadingRows rows={3} label="내 탐구를 불러오는 중" />
      ) : items.length === 0 ? (
        <EmptyState title="아직 시작한 심화 탐구가 없어요" description="이 화면의 '심화 탐구 시작'으로 먼저 탐구를 만들어 보세요." />
      ) : (
        <ul className={styles.pickerList} aria-label="내 심화 탐구">
          {items.map((task) => (
            <li key={task.taskId}>
              <button
                type="button"
                className={styles.pickerOption}
                aria-pressed={selected === task.taskId}
                onClick={() => setSelected(task.taskId)}
              >
                {task.title}
                {task.goal && <small>{task.goal}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
