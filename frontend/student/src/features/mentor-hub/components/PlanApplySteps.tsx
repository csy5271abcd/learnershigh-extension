import { useEffect, useRef } from 'react'
import { finalItems, findLibraryItem, type PlanApplyDraft } from '../model/planApply.ts'
import type {
  ExistingLibraryItemView,
  MentorPlanItem,
  PlanApplyPreviewResult,
  PlanConflictResolution,
  PlanTimeSlot,
} from '../model/types.ts'
import styles from './MentorPlanApplyDialog.module.css'

const slotText = (slot: PlanTimeSlot) => `${slot.start}–${slot.end}`
const shortDate = (date: string) => {
  const [, month, day] = date.split('-').map(Number)
  return `${month}/${day}`
}

interface DraftProps {
  draft: PlanApplyDraft
  onDraftChange: (draft: PlanApplyDraft) => void
}

// ---------- 1. 시작일 ----------

export function StartDateStep({ draft, onDraftChange, weekLabel }: DraftProps & { weekLabel: string }) {
  return (
    <div className={styles.field}>
      <label htmlFor="plan-apply-start-date" className={styles.fieldLabel}>
        적용 시작일
      </label>
      <input
        id="plan-apply-start-date"
        type="date"
        className={styles.dateInput}
        value={draft.startDate}
        aria-describedby="plan-apply-start-date-help"
        onChange={(event) => onDraftChange({ ...draft, startDate: event.target.value })}
      />
      <p id="plan-apply-start-date-help" className={styles.help}>
        고른 날짜부터 {weekLabel} 계획이 요일에 맞춰 내 주간계획에 들어가요.
      </p>
    </div>
  )
}

// ---------- 2. 항목 선택 ----------

export function ItemsStep({ draft, onDraftChange, items }: DraftProps & { items: MentorPlanItem[] }) {
  const allRef = useRef<HTMLInputElement>(null)
  const selectedCount = items.filter((item) => draft.selectedItemIds.includes(item.itemId)).length
  const allSelected = items.length > 0 && selectedCount === items.length

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selectedCount > 0 && !allSelected
  }, [selectedCount, allSelected])

  if (items.length === 0) return <p className={styles.notice}>이 주차에 가져올 항목이 없어요.</p>

  const toggle = (itemId: string, checked: boolean) =>
    onDraftChange({
      ...draft,
      // Plan 순서를 유지한다.
      selectedItemIds: items
        .map((item) => item.itemId)
        .filter((id) => (id === itemId ? checked : draft.selectedItemIds.includes(id))),
    })

  return (
    <fieldset className={styles.fieldset}>
      <legend className="lh-visually-hidden">가져올 항목</legend>
      <label className={styles.checkAll}>
        <input
          ref={allRef}
          type="checkbox"
          checked={allSelected}
          onChange={(event) =>
            onDraftChange({ ...draft, selectedItemIds: event.target.checked ? items.map((item) => item.itemId) : [] })
          }
        />
        <span>전체 선택</span>
        <span className={styles.count}>
          {selectedCount} / {items.length}
        </span>
      </label>
      <ul className={styles.rows}>
        {items.map((item) => (
          <li key={item.itemId}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={draft.selectedItemIds.includes(item.itemId)}
                onChange={(event) => toggle(item.itemId, event.target.checked)}
              />
              <span className={styles.day}>{item.day}</span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{item.task}</span>
                <span className={styles.rowMeta}>
                  {item.subject}
                  {item.memo && ` · ${item.memo}`}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

// ---------- 3. 교재 연결 ----------

interface LibraryStepProps extends DraftProps {
  items: MentorPlanItem[]
  libraryItems: ExistingLibraryItemView[]
}

export function LibraryStep({ draft, onDraftChange, items, libraryItems }: LibraryStepProps) {
  const selected = items.filter((item) => draft.selectedItemIds.includes(item.itemId))
  const subjects = [...new Set(libraryItems.map((item) => item.subject))]

  const map = (itemId: string, libraryItemId: string) => {
    const next = { ...draft.libraryMappings }
    if (libraryItemId) next[itemId] = libraryItemId
    else delete next[itemId]
    onDraftChange({ ...draft, libraryMappings: next })
  }

  return (
    <ul className={styles.rows}>
      {selected.map((item) => {
        const mapped = findLibraryItem(libraryItems, draft.libraryMappings[item.itemId])
        const selectId = `plan-apply-library-${item.itemId}`
        return (
          <li key={item.itemId} className={styles.libraryRow}>
            <span className={styles.day}>{item.day}</span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{item.task}</span>
              <span className={styles.rowMeta}>{item.subject}</span>
            </span>
            <span className={styles.libraryControl}>
              <label htmlFor={selectId} className="lh-visually-hidden">
                {item.task} 교재
              </label>
              <select
                id={selectId}
                className={styles.select}
                value={mapped?.libraryItemId ?? ''}
                onChange={(event) => map(item.itemId, event.target.value)}
              >
                <option value="">연결하지 않음</option>
                {subjects.map((subject) => (
                  <optgroup key={subject} label={subject}>
                    {libraryItems
                      .filter((library) => library.subject === subject)
                      .map((library) => (
                        <option key={library.libraryItemId} value={library.libraryItemId}>
                          {library.title} ({library.type})
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <span className={styles.status} data-tone={mapped ? 'positive' : 'neutral'}>
                {mapped ? '연결됨' : '미연결'}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// ---------- 4. 충돌 확인·수정 ----------

interface ConflictsStepProps extends DraftProps {
  items: MentorPlanItem[]
  preview: PlanApplyPreviewResult
}

export function ConflictsStep({ draft, onDraftChange, items, preview }: ConflictsStepProps) {
  const resolve = (itemId: string, resolution: PlanConflictResolution) =>
    onDraftChange({ ...draft, resolutions: { ...draft.resolutions, [itemId]: resolution } })

  return (
    <ul className={styles.cards}>
      {preview.resolvedItems.map((placed) => {
        const item = items.find((candidate) => candidate.itemId === placed.mentorItemId)
        if (!item) return null
        const conflict = preview.conflicts.find((candidate) => candidate.mentorItemId === item.itemId)
        const resolution = draft.resolutions[item.itemId]
        const slot = conflict && resolution === 'move' ? conflict.suggestedSlot : placed.slot
        const status = !conflict ? '가능' : resolution ? '해결' : 'Conflict'

        return (
          <li key={item.itemId} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.day}>{item.day}</span>
              <span className={styles.time}>{slotText(slot)}</span>
              <span className={styles.cardTitle}>{item.task}</span>
              <span className={styles.status} data-tone={status === 'Conflict' ? 'negative' : 'positive'}>
                {status}
              </span>
            </div>
            {conflict && (
              <div className={styles.cardBody}>
                <p className={styles.existing}>
                  기존 일정 · {conflict.existingSchedule.title} {slotText(conflict.existingSchedule.slot)}
                </p>
                <fieldset className={styles.segmented}>
                  <legend className="lh-visually-hidden">{item.task} 해결 방법</legend>
                  {(
                    [
                      ['move', `${slotText(conflict.suggestedSlot)}로 옮기기`],
                      ['exclude', '이번 항목 빼기'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className={styles.segment}>
                      <input
                        type="radio"
                        name={`plan-apply-resolution-${item.itemId}`}
                        value={value}
                        checked={resolution === value}
                        onChange={() => resolve(item.itemId, value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ---------- 5. 추가 (최종 확인) ----------

interface ReviewStepProps {
  draft: PlanApplyDraft
  items: MentorPlanItem[]
  libraryItems: ExistingLibraryItemView[]
  preview: PlanApplyPreviewResult
  sourceLabel: string
}

export function ReviewStep({ draft, items, libraryItems, preview, sourceLabel }: ReviewStepProps) {
  const rows = finalItems(preview, draft)
  const excluded = preview.resolvedItems.length - rows.length

  return (
    <>
      {rows.length > 0 ? (
        <ul className={styles.reviewRows}>
          {rows.map((placed) => {
            const item = items.find((candidate) => candidate.itemId === placed.mentorItemId)
            if (!item) return null
            const library = findLibraryItem(libraryItems, draft.libraryMappings[item.itemId])
            return (
              <li key={item.itemId} className={styles.reviewRow}>
                <span className={styles.reviewDay}>
                  <span className={styles.day}>{item.day}</span>
                  <span className={styles.rowMeta}>{shortDate(placed.date)}</span>
                </span>
                <span className={styles.time}>{slotText(placed.slot)}</span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{item.task}</span>
                  <span className={styles.rowMeta}>{library ? library.title : `${item.subject} · 교재 미연결`}</span>
                </span>
                <span className={styles.sourceBadge}>출처 Mentor Plan</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={styles.notice}>추가할 항목이 없어요. 이전 단계에서 옮길 항목을 고르거나 항목을 다시 골라주세요.</p>
      )}
      {excluded > 0 && <p className={styles.help}>뺀 항목 {excluded}개는 추가하지 않아요.</p>}
      <p className={styles.sourceNotice}>
        출처({sourceLabel})가 계획 항목에 함께 저장돼요. 계획표에서 Mentor Plan 출처로 표시돼요. Mentor가 나중에 Plan을
        고쳐도 지금 추가한 계획은 바뀌지 않아요.
      </p>
    </>
  )
}
