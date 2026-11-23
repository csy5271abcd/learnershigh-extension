import { useId, useMemo, useRef, useState } from 'react'
import { courseCandidatesFor, matchesQuery } from '../model/courseCatalog.ts'
import { subjectOptionLabel } from '../model/subjectOptionLabel.ts'
import styles from './subjectSearchSelect.module.css'

// A27-UX 학업 과목 Searchable Select (Combobox). 과목명으로 찾아 고르고, 내부 subjectId는 value로만 쓴다(화면에 보이지 않음).
// 과목명이 비슷해도 자동으로 고르지 않는다. 목록에 없는 기존 값은 '목록에 없는 과목'으로만 보여 준다(확정 시 서버가 거절).
//
// A27-UX 관리자 추가 수정: catalogGrade를 주면 범용 고등학교 과목 후보(model/courseCatalog — 1학년 / 2·3학년 통합)를 함께 찾을 수 있다.
// - 화면에는 과목명만 보인다(근거·출처 표시 없음).
// - **고를 수 있는 것은 문서 슬롯의 학교 과목(options, subjectId)뿐이다.** 학교 과목에 같은 이름이 없는 후보는
//   '연결 가능한 학교 과목 없음 · 관리자 확인 필요'로 보이고 고를 수 없다(임의 ID를 만들거나 비슷한 과목으로 바꾸지 않는다).
// - 후보와 학교 과목은 이름이 **정확히 같을 때만** 같은 것으로 보고 후보 줄을 숨긴다(검색 별칭으로 합치지 않는다).
export interface SubjectOption {
  subjectId: string
  name: string
}

export function SubjectSearchSelect({
  options,
  value,
  onChange,
  label,
  testId,
  context,
  catalogGrade,
}: {
  options: readonly SubjectOption[]
  value: string
  onChange: (subjectId: string) => void
  label: string
  testId?: string
  /** 목록 머리에 붙는 학년·학기 문맥 (예: "고1 · 1학기") */
  context?: string
  /** 범용 과목 후보를 함께 보일 문서 학년 (생략하면 학교 과목만) */
  catalogGrade?: number | null
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((item) => item.subjectId === value) ?? null
  const shown = selected ? subjectOptionLabel(options, selected) : value ? '목록에 없는 과목' : ''
  const filtered = useMemo(() => options.filter((item) => matchesQuery(query, [item.name])), [options, query])
  const unavailable = useMemo(() => {
    if (catalogGrade === undefined) return []
    const schoolNames = new Set(options.map((item) => item.name.trim()))
    return courseCandidatesFor(catalogGrade).filter((item) => !schoolNames.has(item.name) && matchesQuery(query, [item.name, ...(item.rawNames ?? [])]))
  }, [options, query, catalogGrade])

  const choose = (item: SubjectOption | null) => {
    onChange(item?.subjectId ?? '')
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={styles.root} data-testid={testId}>
      <input
        ref={inputRef}
        className={styles.input}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
        placeholder="과목명으로 찾기"
        value={open ? query : shown}
        data-unlinked={!value || undefined}
        onFocus={() => {
          setOpen(true)
          setActive(0)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          // 키보드 이동·Enter는 고를 수 있는 학교 과목만 오간다(연결할 수 없는 후보는 건너뛴다)
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          } else if (event.key === 'Enter' && open) {
            event.preventDefault()
            if (filtered[active]) choose(filtered[active])
          } else if (event.key === 'Escape') {
            setOpen(false)
            setQuery('')
          }
        }}
      />
      {open && (
        <ul id={listId} className={styles.list} role="listbox" aria-label={`${label} 목록`}>
          {context && (
            <li className={styles.context} aria-hidden="true">
              {context} 학업 과목
            </li>
          )}
          {filtered.length === 0 && unavailable.length === 0 ? (
            <li className={styles.empty}>&lsquo;{query}&rsquo;와 맞는 과목이 없어요</li>
          ) : (
            filtered.map((item, index) => (
              <li
                key={item.subjectId}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={item.subjectId === value}
                data-active={index === active || undefined}
                className={styles.option}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(item)
                }}
                onMouseEnter={() => setActive(index)}
                data-testid="subject-option"
                data-subject-id={item.subjectId}
              >
                {subjectOptionLabel(options, item)}
                {item.subjectId === value && <span className={styles.check}>선택됨</span>}
              </li>
            ))
          )}
          {filtered.length === 0 && unavailable.length > 0 && (
            <li className={styles.empty} data-testid="subject-option-none">
              이 학년·학기 학교 과목 중에는 맞는 과목이 없어요
            </li>
          )}
          {unavailable.length > 0 && (
            <li className={styles.groupLabel} aria-hidden="true">
              연결 가능한 학교 과목 없음
            </li>
          )}
          {unavailable.map((item) => (
            <li
              key={`candidate-${item.band}-${item.name}`}
              role="option"
              aria-selected={false}
              aria-disabled="true"
              className={styles.unavailable}
              title="이 학교·학년·학기 학업 과목에 없어 연결할 수 없어요. 관리자 확인이 필요해요."
              onMouseDown={(event) => event.preventDefault()}
              data-testid="subject-candidate-unavailable"
            >
              {item.name}
              <span className={styles.check}>관리자 확인 필요</span>
            </li>
          ))}
          {value && (
            <li
              role="option"
              aria-selected={false}
              className={styles.clear}
              onMouseDown={(event) => {
                event.preventDefault()
                choose(null)
              }}
            >
              연결 해제
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
