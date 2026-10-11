import { useLayoutEffect, useRef, useState } from 'react'
import { mentorAffiliation } from '../model/format.ts'
import { recordAreaLabel, recordAreas, recordGrades, recordPeriodText, recordReviewedLabel } from '../model/records.ts'
import type { MentorRecord, RecordArea, RecordGrade } from '../model/types.ts'
// 검색창 / Chip / Select / 초기화는 Mentor List와 같은 모양을 쓴다.
import controlStyles from './MentorListControls.module.css'
import styles from './RecordParts.module.css'

/** 검수 상태는 색이 아니라 글자로 보여준다. (검수 상태 Enum 없음: OD-05) */
export function RecordReviewedBadge() {
  return (
    <span className={styles.reviewed}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {recordReviewedLabel}
    </span>
  )
}

export interface RecordListFilters {
  query: string
  grade?: RecordGrade
  area?: RecordArea
}

interface RecordListControlsProps {
  filters: RecordListFilters
  onChange: (filters: RecordListFilters) => void
}

// 검색(과목 / 활동, 기록 문장, Mentor, 영역, 연결 활동) + 학년 Chip + 영역 Select + 초기화
export function RecordListControls({ filters, onChange }: RecordListControlsProps) {
  // 입력 중인 값은 Local State로 두고, 바깥(URL) 값이 바뀌면(초기화 / Back) 따라간다.
  const [draft, setDraft] = useState(filters.query)
  const [syncedQuery, setSyncedQuery] = useState(filters.query)
  if (filters.query !== syncedQuery) {
    setSyncedQuery(filters.query)
    setDraft(filters.query)
  }

  const hasFilter = Boolean(filters.query.trim() || filters.grade || filters.area)

  const chipsRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const chips = chipsRef.current
    const selected = chips?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!chips || !selected || chips.scrollWidth <= chips.clientWidth) return
    chips.scrollLeft = selected.offsetLeft - (chips.clientWidth - selected.offsetWidth) / 2
  }, [filters.grade])

  const changeQuery = (value: string) => {
    setDraft(value)
    onChange({ ...filters, query: value })
  }

  return (
    <div className={controlStyles.controls}>
      <div className={controlStyles.search}>
        <label htmlFor="mentor-record-search" className="lh-visually-hidden">
          Record 검색
        </label>
        <svg className={controlStyles.searchIcon} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          id="mentor-record-search"
          type="search"
          className={controlStyles.searchInput}
          value={draft}
          placeholder="과목, 활동, Mentor 이름"
          autoComplete="off"
          onChange={(event) => changeQuery(event.target.value)}
        />
        {draft && (
          <button type="button" className={controlStyles.clearButton} aria-label="검색어 지우기" onClick={() => changeQuery('')}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className={controlStyles.filters}>
        <div ref={chipsRef} role="group" aria-label="학년" className={controlStyles.chips}>
          <button
            type="button"
            className={controlStyles.chip}
            aria-pressed={!filters.grade}
            onClick={() => onChange({ ...filters, grade: undefined })}
          >
            전체 학년
          </button>
          {recordGrades.map((grade) => (
            <button
              key={grade.id}
              type="button"
              className={controlStyles.chip}
              aria-pressed={filters.grade === grade.id}
              onClick={() => onChange({ ...filters, grade: filters.grade === grade.id ? undefined : grade.id })}
            >
              {grade.label}
            </button>
          ))}
        </div>

        <label className={controlStyles.selectLabel}>
          <span className="lh-visually-hidden">학교생활기록부 영역</span>
          <select
            className={`${controlStyles.select} ${filters.area ? controlStyles.selectActive : ''}`}
            value={filters.area ?? ''}
            onChange={(event) =>
              onChange({ ...filters, area: recordAreas.find((area) => area.id === event.target.value)?.id })
            }
          >
            <option value="">영역 전체</option>
            {recordAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilter && (
          <button type="button" className={controlStyles.resetButton} onClick={() => onChange({ query: '' })}>
            초기화
          </button>
        )}
      </div>
    </div>
  )
}

interface RecordCardProps {
  record: MentorRecord
  onSelect: (contentId: string) => void
}

// Record Card: 학년 · 영역 / 제목 / 기록 미리보기 / 연결 활동 / 검수 표시 / Mentor
// 제목 Button이 Card 전체 Click 영역이 된다. (Card 안에 다른 Button / Link를 두지 않는다)
export function RecordCard({ record, onSelect }: RecordCardProps) {
  const { mentor } = record
  return (
    <article className={styles.card}>
      <p className={styles.cardMeta}>
        <span className={styles.kind}>Record</span>
        <span>
          {recordPeriodText(record)} · {recordAreaLabel(record.area)}
        </span>
      </p>
      <h3 className={styles.cardTitle}>
        <button type="button" className={styles.cardButton} onClick={() => onSelect(record.contentId)}>
          {record.title}
        </button>
      </h3>
      <p className={styles.preview}>{record.recordText}</p>
      <p className={styles.linked}>
        <span className={styles.linkedLabel}>연결 활동</span> {record.linkedActivity.title}
      </p>
      <div className={styles.cardFooter}>
        <RecordReviewedBadge />
        <p className={styles.mentor}>
          {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
        </p>
      </div>
    </article>
  )
}
