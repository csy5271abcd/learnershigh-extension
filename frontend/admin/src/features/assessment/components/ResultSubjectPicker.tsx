import { useId, useMemo, useRef, useState } from 'react'
import { matchesQuery } from '../model/courseCatalog.ts'
import styles from './resultSubjectPicker.module.css'

// [06] A27-UX 분석 결과 조회: 과목 칩 띠 대신 검색형 단일 과목 선택. '과목 n/전체'를 함께 보인다(실제 결과 집합으로 계산).
// 상태 표시(제외됨·미연결·확정 n)는 데이터 상태일 뿐 출처 표시가 아니다. 읽기 전용 화면이라 고르는 것은 '보기'만 바꾼다.
export interface ResultSubjectEntry {
  index: number
  name: string
  /** 원문 학년 등 같은 이름 구분용 보조 글 */
  detail?: string | null
  status: 'excluded' | 'unlinked' | 'linked'
  confirmedCount: number
}

const statusText = (entry: ResultSubjectEntry) =>
  entry.status === 'excluded' ? '제외됨' : entry.status === 'unlinked' ? '학업 과목 미연결' : entry.confirmedCount > 0 ? `확정 ${entry.confirmedCount}` : '확정 전'

export function ResultSubjectPicker({ entries, value, onChange }: { entries: ResultSubjectEntry[]; value: number; onChange: (index: number) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const position = entries.findIndex((entry) => entry.index === value)
  const current = entries[position] ?? entries[0]
  const filtered = useMemo(() => entries.filter((entry) => matchesQuery(query, [entry.name])), [entries, query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }
  const choose = (entry: ResultSubjectEntry) => {
    onChange(entry.index)
    close()
  }
  const toggle = () => {
    if (open) return close()
    setOpen(true)
    setActive(Math.max(0, filtered.findIndex((entry) => entry.index === value)))
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  if (!current) return null
  return (
    <div className={styles.root} data-testid="result-subject-picker">
      <span className={styles.count} data-testid="result-subject-count">
        과목 <b>{position + 1}</b>/{entries.length}
      </span>
      <div className={styles.field}>
        <button type="button" className={styles.trigger} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={toggle} data-testid="result-subject-trigger">
          <span className={styles.triggerName}>{current.name}</span>
          {current.detail && <span className={styles.meta}>{current.detail}</span>}
          <span className={styles.status} data-status={current.status}>
            {statusText(current)}
          </span>
          <span className={styles.chevron} aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <div className={styles.popover}>
            <input
              ref={inputRef}
              className={styles.search}
              role="combobox"
              aria-label="과목 찾기"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              placeholder="과목명으로 찾기"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onBlur={() => window.setTimeout(close, 150)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActive((index) => Math.max(index - 1, 0))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  if (filtered[active]) choose(filtered[active])
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  close()
                }
              }}
              data-testid="result-subject-search"
            />
            <ul id={listId} className={styles.list} role="listbox" aria-label="과목">
              {filtered.length === 0 ? (
                <li className={styles.empty}>&lsquo;{query}&rsquo;와 맞는 과목이 없어요</li>
              ) : (
                filtered.map((entry, index) => (
                  <li
                    key={entry.index}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={entry.index === value}
                    data-active={index === active || undefined}
                    data-status={entry.status}
                    className={styles.option}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      choose(entry)
                    }}
                    onMouseEnter={() => setActive(index)}
                    data-testid="archive-subject"
                  >
                    <span className={styles.optionName}>
                      <span className={styles.optionIndex}>{entries.indexOf(entry) + 1}</span>
                      {entry.name}
                      {entry.detail && <span className={styles.meta}>{entry.detail}</span>}
                    </span>
                    <span className={styles.status} data-status={entry.status}>
                      {statusText(entry)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
